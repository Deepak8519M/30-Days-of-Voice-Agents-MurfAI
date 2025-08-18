from dotenv import load_dotenv
load_dotenv()

import os
import io
import wave
import time
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

# ---------- CONFIG ----------

# 1) Install deps (Windows): 
#    pip install -U assemblyai fastapi uvicorn pyaudio
# 2) Set your key once (PowerShell): 
#    $env:AAI_API_KEY="YOUR_KEY_HERE"
AAI_API_KEY = os.getenv("AAI_API_KEY")
if not AAI_API_KEY:
    raise RuntimeError("Missing AAI_API_KEY environment variable.")

# AssemblyAI SDK
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
FRAMES_PER_BUFFER = 800   # 50 ms

# ---------- UTIL ----------

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

# ---------- ROUTES ----------

@app.get("/")
async def index(request: Request):
    log.info("Serving index page")
    return templates.TemplateResponse("index.html", {"request": request})

@app.websocket("/ws")
async def ws_handler(websocket: WebSocket):
    await websocket.accept()
    log.info("WebSocket connected")

    # State for a single client
    py_audio: pyaudio.PyAudio | None = None
    mic_stream: pyaudio.Stream | None = None
    audio_thread: threading.Thread | None = None
    stop_event = threading.Event()
    recorded_frames: list[bytes] = []
    frames_lock = threading.Lock()

    # Use the running loop for cross-thread posts
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue[str] = asyncio.Queue()

    # ---- AAI realtime callbacks (run in SDK threads) ----
    def on_data(tr: aai.RealtimeTranscript):
        if not getattr(tr, "text", None):
            return
        asyncio.run_coroutine_threadsafe(queue.put(f"Transcription: {tr.text}"), loop)

    def on_error(err: aai.RealtimeError):
        asyncio.run_coroutine_threadsafe(queue.put(f"Transcription error: {err.message}"), loop)

    # Create transcriber using Universal model (prevents deprecation errors)
   

    transcriber = aai.RealtimeTranscriber(
    sample_rate=SAMPLE_RATE,
    encoding=aai.AudioEncoding.pcm_s16le,
    on_data=on_data,
    on_error=on_error,
    )
    try:
        transcriber.connect()
    except Exception as e:
        await websocket.send_text(f"Transcription error: {e}")
        await websocket.close()
        return

    # Task: forward queued messages to the client
    async def pump_queue():
        try:
            while True:
                msg = await queue.get()
                await websocket.send_text(msg)
                queue.task_done()
        except Exception:
            pass  # socket will be closed in finally

    queue_task = asyncio.create_task(pump_queue())

    # Audio streaming worker (runs in a thread)
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
                data = mic_stream.read(FRAMES_PER_BUFFER, exception_on_overflow=False)
                with frames_lock:
                    recorded_frames.append(data)
                transcriber.stream(data)
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
        # Main ws loop: handle start/stop commands
        while True:
            try:
                msg = await websocket.receive_text()
            except Exception:
                break

            if msg == "start":
                # create a FRESH thread each time
                if audio_thread and audio_thread.is_alive():
                    await websocket.send_text("Already transcribing")
                    continue
                stop_event.clear()
                with frames_lock:
                    recorded_frames.clear()
                audio_thread = threading.Thread(target=stream_audio, daemon=True)
                audio_thread.start()
                await websocket.send_text("Started transcription")

            elif msg == "stop":
                stop_event.set()
                if audio_thread and audio_thread.is_alive():
                    audio_thread.join(timeout=2.0)
                # Save wav
                with frames_lock:
                    saved = save_wav(recorded_frames.copy())
                    recorded_frames.clear()
                await websocket.send_text("Stopped transcription" + (f" (saved: {os.path.basename(saved)})" if saved else ""))

            else:
                await websocket.send_text(f"Unknown command: {msg}")

            await asyncio.sleep(0.01)

    finally:
        # Cleanup
        try:
            stop_event.set()
            if audio_thread and audio_thread.is_alive():
                audio_thread.join(timeout=2.0)
        except Exception:
            pass

        try:
            transcriber.close()
        except Exception:
            pass

        try:
            queue_task.cancel()
        except Exception:
            pass

        try:
            await websocket.close()
        except Exception:
            pass

        log.info("WebSocket closed")
