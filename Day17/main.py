from fastapi import FastAPI, WebSocket, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import os
import time
import logging
import assemblyai as aai
from pydub import AudioSegment
import io
import numpy as np
import ffmpeg
import asyncio

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

# Validate WebM file using ffprobe
def is_valid_webm(data: bytes) -> bool:
    try:
        with open("temp.webm", "wb") as temp_file:
            temp_file.write(data)
        ffmpeg.probe("temp.webm")
        os.remove("temp.webm")
        return True
    except Exception as e:
        logger.error(f"ffprobe validation failed: {str(e)}")
        return False

# WebSocket endpoint with AssemblyAI Universal-Streaming
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connected")

    # --- Sync callbacks for AssemblyAI ---
    def on_data(transcript):
        logger.info(f"Transcription: {transcript.text}")
        if transcript.text:
            asyncio.create_task(websocket.send_text(f"Transcription: {transcript.text}"))

    def on_error(error):
        logger.error(f"Transcription error: {error}")
        asyncio.create_task(websocket.send_text(f"Transcription error: {str(error)}"))

    # Initialize AssemblyAI real-time transcriber
    transcriber = aai.RealtimeTranscriber(
        sample_rate=16000,
        encoding=aai.AudioEncoding.pcm_s16le,
        # model="universal",   # ✅ use Universal model
        on_data=on_data,
        on_error=on_error,
    )
    transcriber.connect()

    file_path = os.path.join(UPLOAD_DIR, f"audio_{int(time.time())}.webm")
    buffer = io.BytesIO()  # Buffer for WebM chunks
    try:
        with open(file_path, "wb") as audio_file:
            while True:
                data = await websocket.receive_bytes()
                logger.info(f"Received chunk: {len(data)} bytes")
                buffer.write(data)
                audio_file.write(data)

                # Process buffered audio when enough data is collected
                buffer.seek(0)
                if is_valid_webm(buffer.getvalue()):
                    try:
                        audio = AudioSegment.from_file(buffer, format="webm")
                        audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)  # 16kHz, mono, 16-bit
                        pcm_data = np.array(audio.get_array_of_samples(), dtype=np.int16).tobytes()
                        transcriber.stream(pcm_data)
                        await websocket.send_text(f"Received chunk: {len(data)} bytes")
                    except Exception as e:
                        logger.error(f"Audio conversion error: {str(e)}")
                        await websocket.send_text(f"Error processing audio: {str(e)}")
                else:
                    logger.warning("Invalid WebM chunk, skipping")
                    await websocket.send_text("Invalid WebM chunk, please continue recording")
                buffer.seek(0, io.SEEK_END)  # Move to end for next write
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        await websocket.send_text(f"WebSocket error: {str(e)}")
    finally:
        transcriber.close()
        await websocket.close()
        logger.info("WebSocket closed")
        if os.path.exists("temp.webm"):
            os.remove("temp.webm")

@app.get("/")
async def serve_index(request: Request):
    logger.info("Serving index page")
    return templates.TemplateResponse("index.html", {"request": request})
