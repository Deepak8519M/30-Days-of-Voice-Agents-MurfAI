from fastapi import FastAPI, WebSocket, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import os
import time
import logging
import assemblyai as aai
import pyaudio
import wave
import asyncio
from datetime import datetime
import threading

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# AssemblyAI API key
aai.settings.api_key = "f01ea92c29a444b0b107acd83dae82b0"

app = FastAPI(title="AI Voice Agent - Day 17")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Create uploads directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Audio Configuration
FRAMES_PER_BUFFER = 800  # 50ms of audio (0.05s * 16000Hz)
SAMPLE_RATE = 16000
CHANNELS = 1
FORMAT = pyaudio.paInt16

# Global variables for audio stream
audio = None
stream = None
audio_thread = None
stop_event = threading.Event()
recorded_frames = []
recording_lock = threading.Lock()

# Save WAV file
def save_wav_file():
    if not recorded_frames:
        logger.info("No audio data recorded.")
        return
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = os.path.join(UPLOAD_DIR, f"recorded_audio_{timestamp}.wav")
    try:
        with wave.open(filename, 'wb') as wf:
            wf.setnchannels(CHANNELS)
            wf.setsampwidth(2)  # 16-bit = 2 bytes
            wf.setframerate(SAMPLE_RATE)
            with recording_lock:
                wf.writeframes(b''.join(recorded_frames))
        logger.info(f"Audio saved to: {filename}")
        logger.info(f"Duration: {len(recorded_frames) * FRAMES_PER_BUFFER / SAMPLE_RATE:.2f} seconds")
    except Exception as e:
        logger.error(f"Error saving WAV file: {e}")

# WebSocket endpoint with AssemblyAI Universal-Streaming
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    global audio, stream, audio_thread, recorded_frames
    await websocket.accept()
    logger.info("WebSocket connected")

    # Get the current event loop
    loop = asyncio.get_event_loop()

    # Thread-safe queue for transcription messages
    message_queue = asyncio.Queue()

    def on_data(transcript):
        logger.info(f"Transcription: {transcript.text}")
        if transcript.text:
            asyncio.run_coroutine_threadsafe(
                message_queue.put(f"Transcription: {transcript.text}"),
                loop
            )

    def on_error(error):
        logger.error(f"Transcription error: {error}")
        asyncio.run_coroutine_threadsafe(
            message_queue.put(f"Transcription error: {str(error)}"),
            loop
        )

    # Initialize AssemblyAI real-time transcriber
    transcriber = aai.RealtimeTranscriber(
        sample_rate=SAMPLE_RATE,
        encoding=aai.AudioEncoding.pcm_s16le,
        on_data=on_data,
        on_error=on_error
    )
    transcriber.connect()

    # Initialize PyAudio
    audio = pyaudio.PyAudio()
    try:
        stream = audio.open(
            input=True,
            frames_per_buffer=FRAMES_PER_BUFFER,
            channels=CHANNELS,
            format=FORMAT,
            rate=SAMPLE_RATE,
        )
        logger.info("Microphone stream opened successfully.")
    except Exception as e:
        logger.error(f"Error opening microphone stream: {e}")
        await websocket.send_text(f"Error: Microphone access failed: {str(e)}")
        transcriber.close()
        await websocket.close()
        return

    # Start audio streaming thread
    def stream_audio():
        logger.info("Starting audio streaming...")
        while not stop_event.is_set():
            try:
                audio_data = stream.read(FRAMES_PER_BUFFER, exception_on_overflow=False)
                with recording_lock:
                    recorded_frames.append(audio_data)
                transcriber.stream(audio_data)
            except Exception as e:
                logger.error(f"Error streaming audio: {e}")
                break
        logger.info("Audio streaming stopped.")

    audio_thread = threading.Thread(target=stream_audio)
    audio_thread.daemon = True

    # Task to process queued messages
    async def process_queue():
        while True:
            message = await message_queue.get()
            await websocket.send_text(message)
            message_queue.task_done()

    queue_task = asyncio.create_task(process_queue())

    try:
        while True:
            message = await websocket.receive_text()
            if message == "start":
                stop_event.clear()
                with recording_lock:
                    recorded_frames.clear()
                audio_thread.start()
                await websocket.send_text("Started transcription")
            elif message == "stop":
                stop_event.set()
                if audio_thread.is_alive():
                    audio_thread.join(timeout=1.0)
                save_wav_file()
                await websocket.send_text("Stopped transcription")
            await asyncio.sleep(0.1)
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        await websocket.send_text(f"WebSocket error: {str(e)}")
    finally:
        stop_event.set()
        transcriber.close()
        if stream and stream.is_active():
            stream.stop_stream()
        if stream:
            stream.close()
        if audio:
            audio.terminate()
        save_wav_file()
        with recording_lock:
            recorded_frames.clear()
        queue_task.cancel()
        await websocket.close()
        logger.info("WebSocket closed")

@app.get("/")
async def serve_index(request: Request):
    logger.info("Serving index page")
    return templates.TemplateResponse("index.html", {"request": request})