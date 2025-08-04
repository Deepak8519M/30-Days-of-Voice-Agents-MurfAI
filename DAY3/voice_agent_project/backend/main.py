from fastapi import FastAPI, Body
import requests
import os
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables from .env
load_dotenv()

# Get Murf API Key from environment variables
MURF_API_KEY = os.getenv("MURF_API_KEY")

# Create FastAPI application
app = FastAPI(title="Murf TTS API - Day 3")

# Enable CORS so frontend can call backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (you can restrict later)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/generate-audio")
def generate_audio(text: str = Body(..., embed=True)):
    """
    Accepts text from the user, sends it to Murf's TTS API,
    and returns only the generated audio file URL.
    """
    
    # Murf API endpoint
    url = "https://api.murf.ai/v1/speech/generate"

    # Headers including API key
    headers = {
        "accept": "application/json",
        "api-key": MURF_API_KEY,
        "Content-Type": "application/json"
    }

    # Request payload
    payload = {
        "voiceId": "en-IN-rohan",  # Change to your preferred voice ID
        "text": text
    }

    # Send request to Murf API
    response = requests.post(url, json=payload, headers=headers)

    # Error handling
    if response.status_code != 200:
        return {"error": response.text}

    # Extract only the audio file URL
    data = response.json()
    return {"audio_url": data.get("audioFile")}
