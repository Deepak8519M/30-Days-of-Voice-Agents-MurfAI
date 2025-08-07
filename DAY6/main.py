from fastapi import FastAPI, File, UploadFile, Body
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import shutil
import requests
import assemblyai as aai
import time

# Load environment variables
load_dotenv()
MURF_API_KEY = os.getenv("MURF_API_KEY")
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")

# Configure AssemblyAI
aai.settings.api_key = ASSEMBLYAI_API_KEY

app = FastAPI(title="Day 6 - AI Voice Agent")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/upload-audio")
async def upload_audio(file: UploadFile = File(...)):
    file_location = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_location, "wb") as f:
        shutil.copyfileobj(file.file, f)

    return {
        "filename": file.filename,
        "file_size": os.path.getsize(file_location),
        "content_type": file.content_type,
        "path": file_location
    }

@app.get("/voices")
def list_voices():
    url = "https://api.murf.ai/v1/speech/voices"
    headers = {
        "accept": "application/json",
        "api-key": MURF_API_KEY
    }
    response = requests.get(url, headers=headers)
    return response.json()

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

@app.post("/transcribe")
def transcribe_audio(filename: str = Body(...)):
    audio_path = os.path.join(UPLOAD_DIR, filename)

    if not os.path.exists(audio_path):
        return {"error": "File not found."}

    headers = {
        "authorization": ASSEMBLYAI_API_KEY
    }

    # Step 1: Upload the audio file to AssemblyAI
    with open(audio_path, "rb") as f:
        upload_response = requests.post(
            "https://api.assemblyai.com/v2/upload",
            headers=headers,
            data=f
        )

    if upload_response.status_code != 200:
        return {"error": "Failed to upload audio to AssemblyAI"}

    upload_url = upload_response.json()["upload_url"]

    # Step 2: Start the transcription job
    transcript_response = requests.post(
        "https://api.assemblyai.com/v2/transcript",
        headers=headers,
        json={"audio_url": upload_url}
    )

    if transcript_response.status_code != 200:
        return {"error": "Failed to start transcription job"}

    transcript_id = transcript_response.json()["id"]

    # Step 3: Poll for the result
    while True:
        polling_response = requests.get(
            f"https://api.assemblyai.com/v2/transcript/{transcript_id}",
            headers=headers
        )
        result = polling_response.json()
        if result["status"] == "completed":
            return {"transcription": result["text"]}
        elif result["status"] == "error":
            return {"error": result["error"]}
        time.sleep(2)  # wait 2 seconds before next poll
