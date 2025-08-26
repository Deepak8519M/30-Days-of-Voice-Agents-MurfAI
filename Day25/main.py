import os
import wave
import json
import logging
import asyncio
import threading
import time
from datetime import datetime
from typing import Optional, List, Dict

import pyaudio
import assemblyai as aai
from fastapi import FastAPI, WebSocket, Request, Query, WebSocketException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from assemblyai.streaming.v3 import (
    StreamingClient,
    StreamingClientOptions,
    StreamingParameters,
    StreamingEvents,
)
from google.generativeai import GenerativeModel, configure
import websockets
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
AAI_API_KEY = os.getenv("AAI_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MURF_API_KEY = os.getenv("MURF_API_KEY")
MURF_WS_URL = os.getenv("MURF_WS_URL", "wss://api.murf.ai/v1/speech/stream-input")
if not AAI_API_KEY or not GEMINI_API_KEY or not MURF_API_KEY:
    raise RuntimeError("Missing AAI_API_KEY, GEMINI_API_KEY, or MURF_API_KEY environment variable.")
aai.settings.api_key = AAI_API_KEY
configure(api_key=GEMINI_API_KEY)

# Logging
logging.basicConfig(level=logging.DEBUG, format="%(asctime)s - %(levelname)s - %(message)s")
log = logging.getLogger("day24")

# FastAPI app
app = FastAPI(title="AI Voice Agent - Day 24: Storyteller Persona")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static + templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Uploads
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Chat directory
CHAT_DIR = "chats"
os.makedirs(os.path.join(UPLOAD_DIR, CHAT_DIR), exist_ok=True)

# Audio config
SAMPLE_RATE = 16000
CHANNELS = 1
FORMAT = pyaudio.paInt16
FRAMES_PER_BUFFER = 1600

def get_chat_file(chat_id: str) -> str:
    return os.path.join(UPLOAD_DIR, CHAT_DIR, f"{chat_id}.json")

# Utility to save audio
def save_wav(frames: List[bytes]) -> Optional[str]:
    if not frames:
        return None
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = os.path.join(UPLOAD_DIR, f"recorded_audio_{ts}.wav")
    with wave.open(path, "wb") as wf:
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(b"".join(frames))
    return path

# Utility to save chat history
def save_chat_history(chat_id: str, user_query: str, ai_response: str) -> bool:
    try:
        file = get_chat_file(chat_id)
        history = []
        if os.path.exists(file):
            with open(file, "r") as f:
                history = json.load(f)
        entry = {
            "timestamp": datetime.now().isoformat(),
            "user_query": user_query,
            "ai_response": ai_response,
        }
        history.append(entry)
        with open(file, "w") as f:
            json.dump(history, f, indent=2)
        log.info(f"Chat history saved for {chat_id}: {entry}")
        return True
    except Exception as e:
        log.error(f"Failed to save chat history for {chat_id}: {e}")
        return False

# List chats
@app.get("/chats")
async def list_chats():
    try:
        chats = [f.split('.')[0] for f in os.listdir(os.path.join(UPLOAD_DIR, CHAT_DIR)) if f.endswith('.json')]
        return sorted(chats, key=lambda x: int(x) if x.isdigit() else 0)
    except Exception as e:
        log.error(f"Failed to list chats: {e}")
        return []

# Create new chat
@app.post("/new_chat")
async def new_chat():
    try:
        chats = await list_chats()
        new_id = str(max([int(c) for c in chats if c.isdigit()] or [0]) + 1)
        file = get_chat_file(new_id)
        with open(file, "w") as f:
            json.dump([], f)
        return {"chat_id": new_id}
    except Exception as e:
        log.error(f"Failed to create new chat: {e}")
        return {"error": str(e)}

# Utility to get chat history
@app.get("/chat_history")
async def get_chat_history(chat_id: str = Query("1")):
    try:
        file = get_chat_file(chat_id)
        if os.path.exists(file):
            with open(file, "r") as f:
                return json.load(f)
        return []
    except Exception as e:
        log.error(f"Failed to read chat history for {chat_id}: {e}")
        return {"error": str(e)}

# Static context_id
CONTEXT_ID = "storyteller_context_24"

# Initialize Gemini model with Storyteller persona
model = GenerativeModel(
    model_name="gemini-2.0-flash",
    system_instruction="You are a wise and gentle guide. Your tone is calm, clear, and comforting, like a thoughtful elder or a trusted friend. You explain things in a simple way, sometimes using small analogies or everyday examples if they help. Keep responses natural and conversational — never too formal, never dramatic, and not motivational. The goal is to make the user feel relaxed, understood, and stress-free, while still giving useful and thoughtful answers. "
)

async def stream_gemini_response(chat_id: str, transcript: str, websocket: WebSocket) -> Optional[str]:
    try:
        response = await asyncio.to_thread(
            model.generate_content,
            transcript,
            stream=True
        )
        accumulated_response = ""
        murf_ws_url = f"{MURF_WS_URL}?api_key={MURF_API_KEY}&context_id={CONTEXT_ID}&format=WAV&sample_rate=44100&channel_type=MONO"
        log.info(f"Attempting WebSocket connection to: {murf_ws_url}")
        async with websockets.connect(murf_ws_url) as murf_ws:
            await murf_ws.send(json.dumps({"init": True}))
            voice_config = {"voice_config": {"voiceId": "en-IN-alia", "style": "Narration"}}
            await murf_ws.send(json.dumps(voice_config))
            log.info(f"Sent voice config: {voice_config}")
            for chunk in response:
                if chunk.text:
                    content = chunk.text
                    accumulated_response += content
                    log.info(f"Sending to Murf: {content}")
                    await murf_ws.send(json.dumps({"text": content}))
                    murf_response = await murf_ws.recv()
                    log.info(f"Received from Murf: {murf_response[:100]}...")
                    murf_data = json.loads(murf_response)
                    base64_audio = murf_data.get("audio", "")
                    is_final = murf_data.get("is_final", False) if "is_final" in murf_data else False
                    if base64_audio:
                        try:
                            await websocket.send_json({
                                "type": "audio",
                                "data": base64_audio,
                                "is_final": is_final
                            })
                            log.info(f"Sent base64 audio to client (Final: {is_final}, Length: {len(base64_audio)})")
                        except Exception as e:
                            log.error(f"Failed to send audio to client: {e}")
                    if is_final:
                        break
            while True:
                try:
                    murf_response = await asyncio.wait_for(murf_ws.recv(), timeout=5.0)
                    log.info(f"Received additional from Murf: {murf_response[:100]}...")
                    murf_data = json.loads(murf_response)
                    base64_audio = murf_data.get("audio", "")
                    is_final = murf_data.get("is_final", False)
                    if base64_audio:
                        await websocket.send_json({
                            "type": "audio",
                            "data": base64_audio,
                            "is_final": is_final
                        })
                        log.info(f"Sent additional base64 audio to client (Final: {is_final}, Length: {len(base64_audio)})")
                    if is_final:
                        break
                except asyncio.TimeoutError:
                    log.warning("Timeout waiting for additional Murf audio, assuming complete")
                    break
        if accumulated_response:
            save_chat_history(chat_id, transcript, accumulated_response)
            await websocket.send_json({
                "type": "response",
                "data": accumulated_response
            })
        log.info("Gemini Response Complete.")
        return accumulated_response
    except websockets.exceptions.ConnectionClosedError as e:
        log.error(f"Murf WebSocket connection closed: {e}")
    except websockets.exceptions.InvalidStatusCode as e:
        log.error(f"Murf WebSocket error: HTTP {e.status_code} - {e.reason}")
    except Exception as e:
        log.error(f"Murf WebSocket error: {e}")
    return None

# Routes
@app.get("/")
async def index(request: Request):
    log.info("Sending index page")
    return templates.TemplateResponse("index.html", {"request": request})

@app.websocket("/ws")
async def ws_handler(websocket: WebSocket, chat_id: str = Query(...)):
    if not chat_id:
        raise WebSocketException(code=400, reason="Missing chat_id")
    file = get_chat_file(chat_id)
    if not os.path.exists(file):
        raise WebSocketException(code=403, reason="Chat ID does not exist")
    await websocket.accept()
    log.info(f"WebSocket connected for chat_id: {chat_id}")

    py_audio: Optional[pyaudio.PyAudio] = None
    mic_stream: Optional[pyaudio.Stream] = None
    audio_thread: Optional[threading.Thread] = None
    stop_event = threading.Event()
    recorded_frames: List[bytes] = []
    frames_lock = threading.Lock()

    loop = asyncio.get_running_loop()
    queue: asyncio.Queue[str] = asyncio.Queue()

    all_transcripts = []
    final_transcript = None

    async def forward_event(client, message):
        nonlocal final_transcript
        try:
            if message.type == "Turn" and message.transcript:
                transcript_text = message.transcript.strip()
                all_transcripts.append(transcript_text)
                log.info(f"Live Transcription: {transcript_text}")
                if hasattr(message, "turn_is_formatted") and message.turn_is_formatted:
                    final_transcript = transcript_text
                    log.info(f"Final Formatted Transcription: {final_transcript}")
                    await websocket.send_text(final_transcript)
            elif message.type == "Termination":
                log.info("Turn ended detected")
                if final_transcript or all_transcripts:
                    await websocket.send_text("turn_ended")
                    if final_transcript:
                        await stream_gemini_response(chat_id, final_transcript, websocket)
            elif message.type == "error":
                error_msg = f"Error: {str(message)}"
                log.error(error_msg)
                await websocket.send_text(error_msg)
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
                    time.sleep(0.01)
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
                log.info(f"Received client command: {msg}")
            except Exception as e:
                log.error(f"WebSocket receive error: {e}")
                break

            if msg == "start":
                if audio_thread and audio_thread.is_alive():
                    await websocket.send_text("Already transcribing")
                    continue
                stop_event.clear()
                with frames_lock:
                    recorded_frames.clear()
                all_transcripts.clear()
                final_transcript = None
                audio_thread = threading.Thread(target=stream_audio, daemon=True)
                audio_thread.start()
                await websocket.send_text("Started transcription")

            elif msg == "stop":
                stop_event.set()
                if audio_thread and audio_thread.is_alive():
                    audio_thread.join(timeout=5.0)

                if final_transcript or all_transcripts:
                    await websocket.send_text("turn_ended")
                    if final_transcript:
                        await stream_gemini_response(chat_id, final_transcript, websocket)

                with frames_lock:
                    save_wav(recorded_frames.copy())
                    recorded_frames.clear()

                await websocket.send_text("Stopped transcription")

            elif msg.startswith("text:"):
                transcript = msg[5:].strip()
                if transcript:
                    await stream_gemini_response(chat_id, transcript, websocket)

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