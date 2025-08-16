from pydantic import BaseModel
from typing import Optional

class AudioUpload(BaseModel):
    file: bytes

class AgentChatResponse(BaseModel):
    transcription: Optional[str] = None
    response: Optional[str] = None
    audio_url: Optional[str] = None
    error: Optional[str] = None