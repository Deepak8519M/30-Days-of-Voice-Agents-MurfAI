from fastapi import FastAPI, WebSocket, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import os
import time
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Voice Agent - Day 16")

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

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connected")
    file_path = os.path.join(UPLOAD_DIR, f"audio_{int(time.time())}.webm")
    try:
        with open(file_path, "wb") as audio_file:
            while True:
                data = await websocket.receive_bytes()
                logger.info(f"Received chunk: {len(data)} bytes")
                audio_file.write(data)
                await websocket.send_text(f"Received chunk: {len(data)} bytes")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
    finally:
        await websocket.close()
        logger.info("WebSocket closed")

@app.get("/")
async def serve_index(request: Request):
    logger.info("Serving index page")
    return templates.TemplateResponse("index.html", {"request": request})