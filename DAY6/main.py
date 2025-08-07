from fastapi import FastAPI, File, UploadFile, Body
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import shutil
import requests

# Load environment variables from .env
load_dotenv()
MURF_API_KEY = os.getenv("MURF_API_KEY")

# Initialize FastAPI app
app = FastAPI(title="Day 6 - AI Voice Agent")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Upload directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Upload audio
@app.post("/upload-audio")
async def upload_audio(file: UploadFile = File(...)):
    file_location = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_location, "wb") as f:
        shutil.copyfileobj(file.file, f)

    return {
        "filename": file.filename,
        "file_size": os.path.getsize(file_location),
        "content_type": file.content_type
    }

# Get available voices
@app.get("/voices")
def list_voices():
    url = "https://api.murf.ai/v1/speech/voices"
    headers = {
        "accept": "application/json",
        "api-key": MURF_API_KEY
    }
    response = requests.get(url, headers=headers)
    return response.json()

# Generate audio using Murf API
@app.post("/generate-audio")
def generate_audio(text: str = Body(..., embed=True), voiceId: str = Body(..., embed=True)):
    url = "https://api.murf.ai/v1/speech/generate"
    headers = {
        "accept": "application/json",
        "api-key": MURF_API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "voiceId": voiceId,
        "text": text
    }
    response = requests.post(url, json=payload, headers=headers)

    if response.status_code != 200:
        return {"error": response.text}

    return {"audio_url": response.json().get("audioFile")}
