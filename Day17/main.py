import os
import wave
import logging
import asyncio
import threading
from datetime import datetime

import pyaudio
import assemblyai as aai
from fastapi import FastAPI, WebSocket, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from assemblyai.streaming.v3 import (
    StreamingClient,
    StreamingClientOptions,
    StreamingParameters,
    StreamingEvents,
)

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
AAI_API_KEY = os.getenv("AAI_API_KEY")
if not AAI_API_KEY:
    raise RuntimeError("Missing AAI_API_KEY environment variable.")
aai.settings.api_key = AAI_API_KEY

# Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
log = logging.getLogger("day17")

# FastAPI app
app = FastAPI(title="AI Voice Agent - Day 17")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

# Static + templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Uploads
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Audio config
SAMPLE_RATE = 16000
CHANNELS = 1
FORMAT = pyaudio.paInt16
FRAMES_PER_BUFFER = 1600  # Increased to 100 ms for stability

# Utility to save audio
def save_wav(frames: list[bytes]) -> str | None:
    if not frames:
        return None
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = os.path.join(UPLOAD_DIR, f"recorded_audio_{ts}.wav")
    with wave.open(path, "wb") as wf:
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(b"".join(frames))
    return path

# Routes
@app.get("/")
async def index(request: Request):
    log.info("Serving index page")
    return templates.TemplateResponse("index.html", {"request": request})

@app.websocket("/ws")
async def ws_handler(websocket: WebSocket):
    await websocket.accept()
    log.info("WebSocket connected")

    py_audio: pyaudio.PyAudio | None = None
    mic_stream: pyaudio.Stream | None = None
    audio_thread: threading.Thread | None = None
    stop_event = threading.Event()
    recorded_frames: list[bytes] = []
    frames_lock = threading.Lock()

    loop = asyncio.get_running_loop()
    queue: asyncio.Queue[str] = asyncio.Queue()

    # Buffer to collect all transcripts
    all_transcripts = []
    final_transcript = None

    # Forward and log transcript text
    async def forward_event(client, message):
        try:
            if message.type == "Turn" and message.transcript:
                transcript_text = message.transcript.strip()
                all_transcripts.append(transcript_text)  # Collect all transcripts
                log.info(f"Transcription: {transcript_text}")  # Log partial transcript
                await websocket.send_text(transcript_text)  # Send to UI
                if hasattr(message, "turn_is_formatted") and message.turn_is_formatted:
                    final_transcript = transcript_text  # Store formatted final transcript
                    log.info(f"Final Formatted Transcription: {final_transcript}")
            elif message.type == "error":
                error_msg = f"Error: {str(message)}"
                log.error(error_msg)
                await websocket.send_text(error_msg)
            # Ignore other events (Begin, Termination)
        except Exception as e:
            log.error(f"forward_event error: {e}")

    client = StreamingClient(
        StreamingClientOptions(api_key=AAI_API_KEY, api_host="streaming.assemblyai.com")
    )
    client.on(StreamingEvents.Begin, lambda client, message: loop.call_soon_threadsafe(
        lambda: asyncio.run_coroutine_threadsafe(forward_event(client, message), loop)))
    client.on(StreamingEvents.Turn, lambda client, message: loop.call_soon_threadsafe(
        lambda: asyncio.run_coroutine_threadsafe(forward_event(client, message), loop)))
    client.on(StreamingEvents.Termination, lambda client, message: loop.call_soon_threadsafe(
        lambda: asyncio.run_coroutine_threadsafe(forward_event(client, message), loop)))
    client.on(StreamingEvents.Error, lambda client, message: loop.call_soon_threadsafe(
        lambda: asyncio.run_coroutine_threadsafe(forward_event(client, message), loop)))

    client.connect(StreamingParameters(sample_rate=SAMPLE_RATE, format_turns=True))

    async def pump_queue():
        try:
            while True:
                msg = await queue.get()
                await websocket.send_text(msg)
                queue.task_done()
        except Exception:
            pass

    queue_task = asyncio.create_task(pump_queue())

    def stream_audio():
        nonlocal mic_stream, py_audio
        log.info("Starting audio streaming thread")
        try:
            py_audio = pyaudio.PyAudio()
            mic_stream = py_audio.open(
                input=True,
                format=FORMAT,
                channels=CHANNELS,
                rate=SAMPLE_RATE,
                frames_per_buffer=FRAMES_PER_BUFFER,
            )
            while not stop_event.is_set():
                try:
                    data = mic_stream.read(FRAMES_PER_BUFFER, exception_on_overflow=False)
                    with frames_lock:
                        recorded_frames.append(data)
                    client.stream(data)
                except IOError as e:
                    log.warning(f"Audio read error: {e}, retrying...")
                    time.sleep(0.01)  # Brief pause to recover
        except Exception as e:
            log.error(f"Audio thread error: {e}")
            asyncio.run_coroutine_threadsafe(queue.put(f"Transcription error: {e}"), loop)
        finally:
            try:
                if mic_stream:
                    if mic_stream.is_active():
                        mic_stream.stop_stream()
                    mic_stream.close()
            except Exception:
                pass
            mic_stream = None
            if py_audio:
                try:
                    py_audio.terminate()
                except Exception:
                    pass
                py_audio = None
            log.info("Audio streaming thread ended")

    try:
        while True:
            try:
                msg = await websocket.receive_text()
            except Exception:
                break

            if msg == "start":
                if audio_thread and audio_thread.is_alive():
                    await websocket.send_text("Already transcribing")
                    continue
                stop_event.clear()
                with frames_lock:
                    recorded_frames.clear()
                all_transcripts.clear()  # Reset transcript buffer
                final_transcript = None  # Reset final transcript
                audio_thread = threading.Thread(target=stream_audio, daemon=True)
                audio_thread.start()
                await websocket.send_text("Started transcription")

            elif msg == "stop":
                stop_event.set()
                if audio_thread and audio_thread.is_alive():
                    audio_thread.join(timeout=5.0)  # Increased timeout
                with frames_lock:
                    saved = save_wav(recorded_frames.copy())
                    recorded_frames.clear()
                if final_transcript:
                    await websocket.send_text(final_transcript)  # Send final transcript first
                elif all_transcripts:
                    await websocket.send_text(all_transcripts[-1])  # Send last transcript if no formatted one
                await websocket.send_text(
                    "Stopped transcription"
                    + (f" (saved: {os.path.basename(saved)})" if saved else "")
                )

            else:
                await websocket.send_text(f"Unknown command: {msg}")

            await asyncio.sleep(0.01)

    finally:
        stop_event.set()
        if audio_thread and audio_thread.is_alive():
            audio_thread.join(timeout=5.0)
        client.disconnect(terminate=True)
        queue_task.cancel()
        log.info("WebSocket closed")