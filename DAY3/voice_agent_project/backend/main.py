from fastapi import FastAPI, Body
import requests
import os
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables
load_dotenv()
MURF_API_KEY = os.getenv("MURF_API_KEY")

# Create FastAPI app
app = FastAPI(title="Murf TTS API - Day 3")

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoint: Get all voices
@app.get("/voices")
def list_voices():
    url = "https://api.murf.ai/v1/speech/voices"
    headers = {"accept": "application/json", "api-key": MURF_API_KEY}
    response = requests.get(url, headers=headers)
    return response.json()

# Endpoint: Generate audio
@app.post("/generate-audio")
def generate_audio(text: str = Body(..., embed=True), voiceId: str = Body(..., embed=True)):
    url = "https://api.murf.ai/v1/speech/generate"
    headers = {"accept": "application/json", "api-key": MURF_API_KEY, "Content-Type": "application/json"}
    payload = {"voiceId": voiceId, "text": text}
    response = requests.post(url, json=payload, headers=headers)

    if response.status_code != 200:
        return {"error": response.text}

    return {"audio_url": response.json().get("audioFile")}
