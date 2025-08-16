import google.generativeai as genai
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

class GeminiService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        genai.configure(api_key=self.api_key)

    async def generate_response(self, prompt: str, chat_history: List[Dict[str, str]]) -> dict:
        logger.info(f"Generating Gemini response for prompt: {prompt[:50]}...")
        try:
            model = genai.GenerativeModel("gemini-1.5-flash")
            full_prompt = "You are a helpful AI voice agent. Respond concisely in under 2000 characters.\n"
            for msg in chat_history:
                full_prompt += f"{msg['role']}: {msg['content']}\n"
            full_prompt += f"user: {prompt}\n"
            response = model.generate_content(full_prompt)
            if not response.text:
                logger.error("Gemini API returned empty response")
                return {"error": "No response returned from Gemini API"}
            llm_response = response.text
            logger.info(f"Gemini response generated: {llm_response[:50]}...")
            return {"response": llm_response}
        except Exception as e:
            logger.error(f"Gemini API error: {str(e)}")
            return {"error": f"Failed to connect to Gemini API: {str(e)}"}