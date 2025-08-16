
from fastapi import FastAPI, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from dotenv import load_dotenv
import os
import shutil
import logging
from services.assemblyai import AssemblyAIService
from services.murf import MurfService
from services.gemini import GeminiService  # Updated import
from schemas import AgentChatResponse

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
MURF_API_KEY = os.getenv("MURF_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")  # Updated to Gemini

# Initialize services
assemblyai_service = AssemblyAIService(ASSEMBLYAI_API_KEY) if ASSEMBLYAI_API_KEY else None
murf_service = MurfService(MURF_API_KEY) if MURF_API_KEY else None
gemini_service = GeminiService(GEMINI_API_KEY) if GEMINI_API_KEY else None  # Updated to Gemini

app = FastAPI(title="AI Voice Agent")

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

# In-memory chat history
chat_history = {}

# Create uploads directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/")
async def serve_index(request: Request):
    logger.info("Serving index page")
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/agent/chat/{session_id}", response_model=AgentChatResponse)
async def agent_chat(session_id: str, file: UploadFile):
    logger.info(f"Processing agent chat for session: {session_id}")
    try:
        if not file.content_type.startswith("audio/"):
            logger.error("Invalid file type uploaded")
            return AgentChatResponse(error="Invalid file type. Please upload an audio file.", audio_url=murf_service.generate_fallback_audio() if murf_service else None)

        if not assemblyai_service:
            logger.error("AssemblyAI API key not configured")
            return AgentChatResponse(error="AssemblyAI API key not configured.", audio_url=murf_service.generate_fallback_audio() if murf_service else None)

        if not gemini_service:
            logger.error("Gemini API key not configured")
            return AgentChatResponse(error="Gemini API key not configured.", audio_url=murf_service.generate_fallback_audio() if murf_service else None)

        # Save audio file
        file_location = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_location, "wb") as f:
            shutil.copyfileobj(file.file, f)
        logger.info(f"Audio file saved: {file_location}")

        # Transcribe audio
        transcription_result = await assemblyai_service.transcribe_audio(file_location)
        if "error" in transcription_result:
            logger.error(f"Transcription error: {transcription_result['error']}")
            return AgentChatResponse(error=transcription_result["error"], audio_url=murf_service.generate_fallback_audio() if murf_service else None)
        transcription = transcription_result["transcription"]

        # Update chat history
        if session_id not in chat_history:
            chat_history[session_id] = []
        chat_history[session_id].append({"role": "user", "content": transcription})

        # Generate Gemini response
        gemini_result = await gemini_service.generate_response(transcription, chat_history[session_id])
        if "error" in gemini_result:
            logger.error(f"Gemini error: {gemini_result['error']}")
            return AgentChatResponse(transcription=transcription, error=gemini_result["error"], audio_url=murf_service.generate_fallback_audio() if murf_service else None)
        llm_response = gemini_result["response"]
        chat_history[session_id].append({"role": "assistant", "content": llm_response})

        if not murf_service:
            logger.error("Murf API key not configured")
            return AgentChatResponse(transcription=transcription, response=llm_response, error="Murf API key not configured.", audio_url=murf_service.generate_fallback_audio() if murf_service else None)

        # Generate audio
        audio_result = murf_service.generate_audio(llm_response)
        if "error" in audio_result:
            logger.error(f"Audio generation error: {audio_result['error']}")
            return AgentChatResponse(transcription=transcription, response=llm_response, error=audio_result["error"], audio_url=murf_service.generate_fallback_audio() if murf_service else None)

        logger.info("Agent chat processed successfully")
        return AgentChatResponse(transcription=transcription, response=llm_response, audio_url=audio_result["audio_url"])
    except Exception as e:
        logger.error(f"Unexpected error in agent_chat: {str(e)}")
        return AgentChatResponse(error=f"Unexpected error: {str(e)}", audio_url=murf_service.generate_fallback_audio() if murf_service else None)
