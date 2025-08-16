import requests
import logging

logger = logging.getLogger(__name__)

class MurfService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.murf.ai/v1/speech/generate"

    def generate_audio(self, text: str, voice_id: str = "en-IN-aarav") -> dict:
        logger.info(f"Generating audio for text: {text[:50]}...")
        try:
            headers = {
                "accept": "application/json",
                "api-key": self.api_key,
                "Content-Type": "application/json"
            }
            payload = {"voiceId": voice_id, "text": text}
            response = requests.post(self.base_url, json=payload, headers=headers)
            if response.status_code != 200:
                logger.error(f"Audio generation failed: {response.text}")
                return {"error": f"Failed to generate audio: {response.text}"}
            audio_url = response.json().get("audioFile")
            if not audio_url:
                logger.error("No audio file returned from Murf API")
                return {"error": "No audio file returned from Murf API"}
            logger.info(f"Audio generated: {audio_url}")
            return {"audio_url": audio_url}
        except Exception as e:
            logger.error(f"Murf API error: {str(e)}")
            return {"error": f"Failed to connect to Murf API: {str(e)}"}

    def generate_fallback_audio(self) -> str:
        logger.info("Generating fallback audio")
        try:
            result = self.generate_audio("I'm having trouble connecting right now.")
            return result.get("audio_url") if "audio_url" in result else None
        except Exception as e:
            logger.error(f"Fallback audio error: {str(e)}")
            return None