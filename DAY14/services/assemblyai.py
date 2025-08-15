import os
import requests
import time
import logging

logger = logging.getLogger(__name__)

class AssemblyAIService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.assemblyai.com/v2"

    async def transcribe_audio(self, file_path: str) -> dict:
        logger.info(f"Starting transcription for file: {file_path}")
        try:
            headers = {"authorization": self.api_key}
            with open(file_path, "rb") as f:
                upload_response = requests.post(f"{self.base_url}/upload", headers=headers, data=f)
            if upload_response.status_code != 200:
                logger.error(f"Upload failed: {upload_response.text}")
                return {"error": f"Failed to upload audio: {upload_response.text}"}

            upload_url = upload_response.json()["upload_url"]
            transcript_response = requests.post(
                f"{self.base_url}/transcript", headers=headers, json={"audio_url": upload_url}
            )
            if transcript_response.status_code != 200:
                logger.error(f"Transcription job failed: {transcript_response.text}")
                return {"error": f"Failed to start transcription: {transcript_response.text}"}

            transcript_id = transcript_response.json()["id"]
            max_attempts = 30
            for attempt in range(max_attempts):
                polling_response = requests.get(f"{self.base_url}/transcript/{transcript_id}", headers=headers)
                result = polling_response.json()
                if result["status"] == "completed":
                    logger.info(f"Transcription completed: {result['text']}")
                    return {"transcription": result["text"]}
                elif result["status"] == "error":
                    logger.error(f"Transcription failed: {result['error']}")
                    return {"error": f"Transcription failed: {result['error']}"}
                time.sleep(2)
            logger.error("Transcription timed out")
            return {"error": "Transcription timed out."}
        except Exception as e:
            logger.error(f"AssemblyAI error: {str(e)}")
            return {"error": f"Failed to connect to AssemblyAI: {str(e)}"}