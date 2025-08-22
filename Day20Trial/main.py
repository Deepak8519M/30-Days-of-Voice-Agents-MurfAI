import os, json, logging, asyncio, websockets, re
from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pathlib import Path
from dotenv import load_dotenv
import assemblyai as aai
import google.generativeai as genai

# Load environment
load_dotenv()
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MURF_API_KEY = os.getenv("MURF_API_KEY")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

app = FastAPI()
BASE_DIR = Path(__file__).parent
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Initialize Gemini
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel('gemini-1.5-flash')
else:
    gemini_model = None

async def stream_gemini_to_murf(transcript: str):
    if not gemini_model: return
    murf_ws_url = f"wss://api.murf.ai/v1/speech/stream-input?api-key={MURF_API_KEY}&sample_rate=44100&channel_type=MONO&format=WAV"
    try:
        async with websockets.connect(murf_ws_url) as ws:
            # Send voice config
            await ws.send(json.dumps({
                "voice_config": {"voiceId": "en-US-darnell", "style": "Conversational"},
                "context_id": "day20-static-context"
            }))

            # Receive audio in background
            async def receive_audio():
                count = 1
                while True:
                    resp = json.loads(await ws.recv())
                    if "audio" in resp:
                        chunk = resp["audio"]
                        truncated = chunk[:30] + "..." + chunk[-30:] if len(chunk) > 64 else chunk
                        print(f"[Murf][chunk {count}] {truncated}")
                        count += 1
                    if resp.get("final"): break
            recv_task = asyncio.create_task(receive_audio())

            # Stream Gemini text
            loop = asyncio.get_running_loop()
            gem_stream = await loop.run_in_executor(None, lambda: gemini_model.generate_content(transcript, stream=True))
            buffer = ""
            for chunk in gem_stream:
                if chunk.text:
                    buffer += chunk.text
                    sentences = re.split(r'(?<=[.?!])\s+', buffer)
                    for s in sentences[:-1]:
                        await ws.send(json.dumps({"text": s, "end": False}))
                    buffer = sentences[-1]
            if buffer.strip():
                await ws.send(json.dumps({"text": buffer.strip(), "end": True}))

            await recv_task

    except Exception as e:
        logging.error(f"Error streaming to Murf: {e}", exc_info=True)

@app.get("/")
async def home(request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    await websocket.accept()
    if not ASSEMBLYAI_API_KEY:
        await websocket.send_text(json.dumps({"type":"error","message":"AssemblyAI key missing"}))
        await websocket.close()
        return

    client = aai.streaming.v3.StreamingClient(aai.settings.api_key)
    loop = asyncio.get_running_loop()

    def on_turn(event):
        if getattr(event, "end_of_turn", False):
            asyncio.run_coroutine_threadsafe(stream_gemini_to_murf(event.transcript), loop)
            asyncio.run_coroutine_threadsafe(websocket.send_text(json.dumps({"type":"transcription","text":event.transcript})), loop)

    client.on(aai.streaming.v3.StreamingEvents.Turn, on_turn)
    client.connect(aai.streaming.v3.StreamingParameters(sample_rate=16000, format_turns=True))

    try:
        while True:
            msg = await websocket.receive()
            if "bytes" in msg:
                client.stream(msg["bytes"])
            elif msg.get("text") == "EOF":
                break
    except Exception as e:
        logging.error(e)
    finally:
        client.disconnect()
        await websocket.close()
