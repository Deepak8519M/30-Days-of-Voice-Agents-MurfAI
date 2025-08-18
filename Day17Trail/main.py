import os, wave, threading, asyncio, logging, time
from datetime import datetime
import pyaudio
from fastapi import FastAPI, WebSocket, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from assemblyai.streaming.v3 import StreamingClient, StreamingClientOptions, StreamingParameters, StreamingEvents
from dotenv import load_dotenv

# Load API key
load_dotenv()
AAI_API_KEY = os.getenv("AAI_API_KEY")
if not AAI_API_KEY:
    raise RuntimeError("Missing AAI_API_KEY")

# Logging
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("day17")

# FastAPI setup
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Audio config
SAMPLE_RATE = 16000
CHANNELS = 1
FORMAT = pyaudio.paInt16
FRAMES_PER_BUFFER = 1600

def save_wav(frames):
    if not frames: return None
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = os.path.join(UPLOAD_DIR,f"audio_{ts}.wav")
    with wave.open(path,"wb") as wf:
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(b"".join(frames))
    return path

@app.get("/")
async def index(request: Request):
    return templates.TemplateResponse("index.html",{"request":request})

@app.websocket("/ws")
async def ws_handler(websocket: WebSocket):
    await websocket.accept()
    py_audio = pyaudio.PyAudio()
    mic_stream = None
    stop_event = threading.Event()
    recorded_frames = []

    loop = asyncio.get_running_loop()

    async def send_final(client, msg):
        try:
            if msg.type == "Termination" and msg.transcript:
                await websocket.send_text(f"Final:{msg.transcript}")
        except Exception as e:
            log.error(f"send_final error: {e}")

    client = StreamingClient(StreamingClientOptions(api_key=AAI_API_KEY))
    client.on(StreamingEvents.Turn, lambda c,m: None)  # ignore partial
    client.on(StreamingEvents.Termination, lambda c,m: loop.call_soon_threadsafe(lambda: asyncio.create_task(send_final(c,m))))
    client.connect(StreamingParameters(sample_rate=SAMPLE_RATE, format_turns=True))

    def audio_thread_func():
        nonlocal mic_stream
        mic_stream = py_audio.open(input=True,format=FORMAT,channels=CHANNELS,
                                   rate=SAMPLE_RATE,frames_per_buffer=FRAMES_PER_BUFFER)
        while not stop_event.is_set():
            data = mic_stream.read(FRAMES_PER_BUFFER,exception_on_overflow=False)
            recorded_frames.append(data)
            client.stream(data)
        mic_stream.stop_stream()
        mic_stream.close()
        py_audio.terminate()

    try:
        while True:
            msg = await websocket.receive_text()
            if msg=="start":
                stop_event.clear()
                recorded_frames.clear()
                t = threading.Thread(target=audio_thread_func,daemon=True)
                t.start()
                await websocket.send_text("Started transcription")
            elif msg=="stop":
                stop_event.set()
                saved = save_wav(recorded_frames.copy())
                recorded_frames.clear()
                await websocket.send_text(f"Stopped transcription (saved: {saved})" if saved else "Stopped transcription")
            else:
                await websocket.send_text(f"Unknown command: {msg}")
            await asyncio.sleep(0.01)
    finally:
        stop_event.set()
        client.disconnect(terminate=True)
