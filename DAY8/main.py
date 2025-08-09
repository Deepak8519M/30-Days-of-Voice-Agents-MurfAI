from fastapi import FastAPI, File, UploadFile, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import os
import shutil
import requests
import assemblyai as aai
import time
import google.generativeai as genai  # Added for Gemini API

# Load environment variables
load_dotenv()
MURF_API_KEY = os.getenv("MURF_API_KEY")
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")  # Added for Gemini API

# Configure AssemblyAI
aai.settings.api_key = ASSEMBLYAI_API_KEY

app = FastAPI(title="Day 8 - AI Voice Agent")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (e.g., style.css, dropdown.png, favicon.ico)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Create uploads directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/upload-audio")
async def upload_audio(file: UploadFile = File(...)):
    # Validate file type
    if not file.content_type.startswith("audio/"):
        return {"error": "Invalid file type. Please upload an audio file."}

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
    if response.status_code != 200:
        return {"error": f"Failed to fetch voices: {response.text}"}
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
        return {"error": f"Failed to generate audio: {response.text}"}

    return {"audio_url": response.json().get("audioFile")}

@app.post("/transcribe")
async def transcribe_audio(filename: str = Body(..., embed=True)):
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
        return {"error": f"Failed to upload audio to AssemblyAI: {upload_response.text}"}

    upload_url = upload_response.json()["upload_url"]

    # Step 2: Start the transcription job
    transcript_response = requests.post(
        "https://api.assemblyai.com/v2/transcript",
        headers=headers,
        json={"audio_url": upload_url}
    )

    if transcript_response.status_code != 200:
        return {"error": f"Failed to start transcription job: {transcript_response.text}"}

    transcript_id = transcript_response.json()["id"]

    # Step 3: Poll for the result
    max_attempts = 30
    for _ in range(max_attempts):
        polling_response = requests.get(
            f"https://api.assemblyai.com/v2/transcript/{transcript_id}",
            headers=headers
        )
        result = polling_response.json()
        if result["status"] == "completed":
            return {"transcription": result["text"]}
        elif result["status"] == "error":
            return {"error": f"Transcription failed: {result['error']}"}
        time.sleep(2)  # Wait 2 seconds before next poll

    return {"error": "Transcription timed out."}

@app.post("/tts/echo")
async def tts_echo(file: UploadFile = File(...)):
    # Validate file type
    if not file.content_type.startswith("audio/"):
        return {"error": "Invalid file type. Please upload an audio file."}

    # Save the uploaded audio file
    file_location = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_location, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Step 1: Transcribe with AssemblyAI
    headers = {
        "authorization": ASSEMBLYAI_API_KEY
    }
    with open(file_location, "rb") as f:
        upload_response = requests.post(
            "https://api.assemblyai.com/v2/upload",
            headers=headers,
            data=f
        )

    if upload_response.status_code != 200:
        return {"error": f"Failed to upload audio to AssemblyAI: {upload_response.text}"}

    upload_url = upload_response.json()["upload_url"]

    transcript_response = requests.post(
        "https://api.assemblyai.com/v2/transcript",
        headers=headers,
        json={"audio_url": upload_url}
    )

    if transcript_response.status_code != 200:
        return {"error": f"Failed to start transcription job: {transcript_response.text}"}

    transcript_id = transcript_response.json()["id"]

    max_attempts = 30
    for _ in range(max_attempts):
        polling_response = requests.get(
            f"https://api.assemblyai.com/v2/transcript/{transcript_id}",
            headers=headers
        )
        result = polling_response.json()
        if result["status"] == "completed":
            transcription = result["text"]
            break
        elif result["status"] == "error":
            return {"error": f"Transcription failed: {result['error']}"}
        time.sleep(2)
    else:
        return {"error": "Transcription timed out."}

    # Step 2: Generate audio with Murf API
    murf_url = "https://api.murf.ai/v1/speech/generate"
    murf_headers = {
        "accept": "application/json",
        "api-key": MURF_API_KEY,
        "Content-Type": "application/json"
    }
    murf_payload = {
        "voiceId": "en-IN-aarav",  # Using a free-tier Murf voice
        "text": transcription
    }
    murf_response = requests.post(murf_url, json=murf_payload, headers=murf_headers)

    if murf_response.status_code != 200:
        return {"error": f"Failed to generate audio with Murf: {murf_response.text}"}

    audio_url = murf_response.json().get("audioFile")
    if not audio_url:
        return {"error": "No audio file returned from Murf API"}

    return {
        "transcription": transcription,
        "audio_url": audio_url
    }

@app.post("/llm/query")
def llm_query(text: str = Body(..., embed=True)):
    if not GEMINI_API_KEY:
        return {"error": "Gemini API key not configured."}

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")
    try:
        response = model.generate_content(text)
        return {"response": response.text}
    except Exception as e:
        return {"error": f"Failed to generate response from Gemini: {str(e)}"}