from fastapi import FastAPI, File, UploadFile, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import os
import shutil
import requests
import assemblyai as aai
import time
import google.generativeai as genai
import uuid

# Load environment variables
load_dotenv()
MURF_API_KEY = os.getenv("MURF_API_KEY")
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Configure AssemblyAI
if ASSEMBLYAI_API_KEY:
    aai.settings.api_key = ASSEMBLYAI_API_KEY

app = FastAPI(title="Day 11 - AI Voice Agent")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Create uploads directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# In-memory chat history
chat_history = {}

# Fallback audio generation function
def generate_fallback_audio():
    if not MURF_API_KEY:
        return None
    try:
        url = "https://api.murf.ai/v1/speech/generate"
        headers = {
            "accept": "application/json",
            "api-key": MURF_API_KEY,
            "Content-Type": "application/json"
        }
        payload = {
            "voiceId": "en-IN-aarav",
            "text": "I'm having trouble connecting right now."
        }
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code == 200:
            return response.json().get("audioFile")
        return None
    except Exception:
        return None

@app.post("/upload-audio")
async def upload_audio(file: UploadFile = File(...)):
    try:
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
    except Exception as e:
        return {"error": f"Failed to upload audio: {str(e)}"}

@app.get("/voices")
def list_voices():
    if not MURF_API_KEY:
        return {"error": "Murf API key not configured."}
    try:
        url = "https://api.murf.ai/v1/speech/voices"
        headers = {
            "accept": "application/json",
            "api-key": MURF_API_KEY
        }
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            return {"error": f"Failed to fetch voices: {response.text}"}
        return response.json()
    except requests.exceptions.RequestException as e:
        return {"error": f"Failed to connect to Murf API: {str(e)}"}

@app.post("/generate-audio")
def generate_audio(text: str = Body(..., embed=True), voiceId: str = Body(..., embed=True)):
    if not MURF_API_KEY:
        return {
            "error": "Murf API key not configured.",
            "audio_url": generate_fallback_audio()
        }
    try:
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
            return {
                "error": f"Failed to generate audio: {response.text}",
                "audio_url": generate_fallback_audio()
            }
        audio_url = response.json().get("audioFile")
        if not audio_url:
            return {
                "error": "No audio file returned from Murf API",
                "audio_url": generate_fallback_audio()
            }
        return {"audio_url": audio_url}
    except requests.exceptions.RequestException as e:
        return {
            "error": f"Failed to connect to Murf API: {str(e)}",
            "audio_url": generate_fallback_audio()
        }

@app.post("/transcribe")
async def transcribe_audio(filename: str = Body(..., embed=True)):
    if not ASSEMBLYAI_API_KEY:
        return {"error": "AssemblyAI API key not configured."}
    try:
        audio_path = os.path.join(UPLOAD_DIR, filename)
        if not os.path.exists(audio_path):
            return {"error": "File not found."}

        headers = {"authorization": ASSEMBLYAI_API_KEY}
        with open(audio_path, "rb") as f:
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
                return {"transcription": result["text"]}
            elif result["status"] == "error":
                return {"error": f"Transcription failed: {result['error']}"}
            time.sleep(2)
        return {"error": "Transcription timed out."}
    except requests.exceptions.RequestException as e:
        return {"error": f"Failed to connect to AssemblyAI: {str(e)}"}

@app.post("/tts/echo")
async def tts_echo(file: UploadFile = File(...)):
    try:
        if not file.content_type.startswith("audio/"):
            return {
                "error": "Invalid file type. Please upload an audio file.",
                "audio_url": generate_fallback_audio()
            }

        file_location = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_location, "wb") as f:
            shutil.copyfileobj(file.file, f)

        if not ASSEMBLYAI_API_KEY:
            return {
                "error": "AssemblyAI API key not configured.",
                "audio_url": generate_fallback_audio()
            }

        headers = {"authorization": ASSEMBLYAI_API_KEY}
        with open(file_location, "rb") as f:
            upload_response = requests.post(
                "https://api.assemblyai.com/v2/upload",
                headers=headers,
                data=f
            )
        if upload_response.status_code != 200:
            return {
                "error": f"Failed to upload audio to AssemblyAI: {upload_response.text}",
                "audio_url": generate_fallback_audio()
            }

        upload_url = upload_response.json()["upload_url"]
        transcript_response = requests.post(
            "https://api.assemblyai.com/v2/transcript",
            headers=headers,
            json={"audio_url": upload_url}
        )
        if transcript_response.status_code != 200:
            return {
                "error": f"Failed to start transcription job: {transcript_response.text}",
                "audio_url": generate_fallback_audio()
            }

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
                return {
                    "error": f"Transcription failed: {result['error']}",
                    "audio_url": generate_fallback_audio()
                }
            time.sleep(2)
        else:
            return {
                "error": "Transcription timed out.",
                "audio_url": generate_fallback_audio()
            }

        if not MURF_API_KEY:
            return {
                "error": "Murf API key not configured.",
                "transcription": transcription,
                "audio_url": generate_fallback_audio()
            }

        murf_url = "https://api.murf.ai/v1/speech/generate"
        murf_headers = {
            "accept": "application/json",
            "api-key": MURF_API_KEY,
            "Content-Type": "application/json"
        }
        murf_payload = {
            "voiceId": "en-IN-aarav",
            "text": transcription
        }
        murf_response = requests.post(murf_url, json=murf_payload, headers=murf_headers)
        if murf_response.status_code != 200:
            return {
                "error": f"Failed to generate audio with Murf: {murf_response.text}",
                "transcription": transcription,
                "audio_url": generate_fallback_audio()
            }

        audio_url = murf_response.json().get("audioFile")
        if not audio_url:
            return {
                "error": "No audio file returned from Murf API",
                "transcription": transcription,
                "audio_url": generate_fallback_audio()
            }

        return {
            "transcription": transcription,
            "audio_url": audio_url
        }
    except requests.exceptions.RequestException as e:
        return {
            "error": f"Failed to connect to API: {str(e)}",
            "audio_url": generate_fallback_audio()
        }

@app.post("/llm/query")
async def llm_query(file: UploadFile = File(...)):
    try:
        if not GEMINI_API_KEY:
            return {
                "error": "Gemini API key not configured.",
                "audio_url": generate_fallback_audio()
            }

        if not file.content_type.startswith("audio/"):
            return {
                "error": "Invalid file type. Please upload an audio file.",
                "audio_url": generate_fallback_audio()
            }

        file_location = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_location, "wb") as f:
            shutil.copyfileobj(file.file, f)

        if not ASSEMBLYAI_API_KEY:
            return {
                "error": "AssemblyAI API key not configured.",
                "audio_url": generate_fallback_audio()
            }

        headers = {"authorization": ASSEMBLYAI_API_KEY}
        with open(file_location, "rb") as f:
            upload_response = requests.post(
                "https://api.assemblyai.com/v2/upload",
                headers=headers,
                data=f
            )
        if upload_response.status_code != 200:
            return {
                "error": f"Failed to upload audio to AssemblyAI: {upload_response.text}",
                "audio_url": generate_fallback_audio()
            }

        upload_url = upload_response.json()["upload_url"]
        transcript_response = requests.post(
            "https://api.assemblyai.com/v2/transcript",
            headers=headers,
            json={"audio_url": upload_url}
        )
        if transcript_response.status_code != 200:
            return {
                "error": f"Failed to start transcription job: {transcript_response.text}",
                "audio_url": generate_fallback_audio()
            }

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
                return {
                    "error": f"Transcription failed: {result['error']}",
                    "audio_url": generate_fallback_audio()
                }
            time.sleep(2)
        else:
            return {
                "error": "Transcription timed out.",
                "audio_url": generate_fallback_audio()
            }

        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")
        try:
            prompt = f"Respond concisely in under 2000 characters to this query: {transcription}"
            response = model.generate_content(prompt)
            llm_response = response.text
        except Exception as e:
            return {
                "error": f"Failed to generate response from Gemini: {str(e)}",
                "transcription": transcription,
                "audio_url": generate_fallback_audio()
            }

        if not MURF_API_KEY:
            return {
                "error": "Murf API key not configured.",
                "transcription": transcription,
                "response": llm_response,
                "audio_url": generate_fallback_audio()
            }

        murf_url = "https://api.murf.ai/v1/speech/generate"
        murf_headers = {
            "accept": "application/json",
            "api-key": MURF_API_KEY,
            "Content-Type": "application/json"
        }
        murf_payload = {
            "voiceId": "en-IN-aarav",
            "text": llm_response
        }
        murf_response = requests.post(murf_url, json=murf_payload, headers=murf_headers)
        if murf_response.status_code != 200:
            return {
                "error": f"Failed to generate audio with Murf: {murf_response.text}",
                "transcription": transcription,
                "response": llm_response,
                "audio_url": generate_fallback_audio()
            }

        audio_url = murf_response.json().get("audioFile")
        if not audio_url:
            return {
                "error": "No audio file returned from Murf API",
                "transcription": transcription,
                "response": llm_response,
                "audio_url": generate_fallback_audio()
            }

        return {
            "transcription": transcription,
            "response": llm_response,
            "audio_url": audio_url
        }
    except requests.exceptions.RequestException as e:
        return {
            "error": f"Failed to connect to API: {str(e)}",
            "audio_url": generate_fallback_audio()
        }

@app.post("/agent/chat/{session_id}")
async def agent_chat(session_id: str, file: UploadFile = File(...)):
    try:
        if not GEMINI_API_KEY:
            return {
                "error": "Gemini API key not configured.",
                "audio_url": generate_fallback_audio()
            }

        if not file.content_type.startswith("audio/"):
            return {
                "error": "Invalid file type. Please upload an audio file.",
                "audio_url": generate_fallback_audio()
            }

        file_location = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_location, "wb") as f:
            shutil.copyfileobj(file.file, f)

        if not ASSEMBLYAI_API_KEY:
            return {
                "error": "AssemblyAI API key not configured.",
                "audio_url": generate_fallback_audio()
            }

        headers = {"authorization": ASSEMBLYAI_API_KEY}
        with open(file_location, "rb") as f:
            upload_response = requests.post(
                "https://api.assemblyai.com/v2/upload",
                headers=headers,
                data=f
            )
        if upload_response.status_code != 200:
            return {
                "error": f"Failed to upload audio to AssemblyAI: {upload_response.text}",
                "audio_url": generate_fallback_audio()
            }

        upload_url = upload_response.json()["upload_url"]
        transcript_response = requests.post(
            "https://api.assemblyai.com/v2/transcript",
            headers=headers,
            json={"audio_url": upload_url}
        )
        if transcript_response.status_code != 200:
            return {
                "error": f"Failed to start transcription job: {transcript_response.text}",
                "audio_url": generate_fallback_audio()
            }

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
                return {
                    "error": f"Transcription failed: {result['error']}",
                    "audio_url": generate_fallback_audio()
                }
            time.sleep(2)
        else:
            return {
                "error": "Transcription timed out.",
                "audio_url": generate_fallback_audio()
            }

        if session_id not in chat_history:
            chat_history[session_id] = []
        chat_history[session_id].append({"role": "user", "content": transcription})

        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")
        try:
            prompt = "You are a helpful AI voice agent. Respond concisely in under 2000 characters.\n"
            for msg in chat_history[session_id]:
                prompt += f"{msg['role']}: {msg['content']}\n"
            response = model.generate_content(prompt)
            llm_response = response.text
        except Exception as e:
            return {
                "error": f"Failed to generate response from Gemini: {str(e)}",
                "transcription": transcription,
                "audio_url": generate_fallback_audio()
            }

        chat_history[session_id].append({"role": "assistant", "content": llm_response})

        if not MURF_API_KEY:
            return {
                "error": "Murf API key not configured.",
                "transcription": transcription,
                "response": llm_response,
                "audio_url": generate_fallback_audio()
            }

        murf_url = "https://api.murf.ai/v1/speech/generate"
        murf_headers = {
            "accept": "application/json",
            "api-key": MURF_API_KEY,
            "Content-Type": "application/json"
        }
        murf_payload = {
            "voiceId": "en-IN-aarav",
            "text": llm_response
        }
        murf_response = requests.post(murf_url, json=murf_payload, headers=murf_headers)
        if murf_response.status_code != 200:
            return {
                "error": f"Failed to generate audio with Murf: {murf_response.text}",
                "transcription": transcription,
                "response": llm_response,
                "audio_url": generate_fallback_audio()
            }

        audio_url = murf_response.json().get("audioFile")
        if not audio_url:
            return {
                "error": "No audio file returned from Murf API",
                "transcription": transcription,
                "response": llm_response,
                "audio_url": generate_fallback_audio()
            }

        return {
            "transcription": transcription,
            "response": llm_response,
            "audio_url": audio_url
        }
    except requests.exceptions.RequestException as e:
        return {
            "error": f"Failed to connect to API: {str(e)}",
            "audio_url": generate_fallback_audio()
        }