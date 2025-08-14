AI Voice Agent: Day 13 of 30 Days of AI Voice Agents 🎙️
Welcome to my AI Voice Agent, a dazzling creation for the 30 Days of AI Voice Agents challenge with #BuildwithMurf! This project is a conversational powerhouse that lets you speak, listen, and engage with AI in a sleek, ChatGPT-inspired interface. Powered by xAI’s Grok API, it transcribes your voice with AssemblyAI, responds with natural audio via Murf AI, and wraps it all in a vibrant UI with messages dancing across the screen—user queries on the right, AI replies on the left. Day 13 is all about documenting this journey with flair, and I’ve poured my passion into making it shine! 🚀
Project Overview
This AI voice agent is your virtual conversational partner. Speak a question (e.g., “What’s the capital of France?”), and it transcribes your voice, queries Grok for a witty response, and delivers it in crystal-clear audio. The UI is a visual treat: a spacious conversation window with user messages in blue-purple gradients on the right, AI responses in red-purple on the left, and errors in bold red. Features like auto-recording, downloadable audio, and smooth animations make every interaction feel alive. Built to bypass Gemini’s quota limits, this agent is ready to chat without missing a beat! 🌟
Technologies Used 🛠️

Frontend:
HTML/CSS: templates/index.html and static/style.css craft a responsive UI with Urbanist font, vibrant gradients, and slick animations.
JavaScript: Drives voice recording, API calls, and dynamic message rendering.
Remixicon: Adds stylish icons for record, download, and reset buttons.


Backend:
FastAPI: Powers the API server in main.py for audio processing and responses.
Python: Orchestrates logic with libraries like aiohttp, assemblyai, and python-dotenv.


APIs:
AssemblyAI: Transcribes audio to text (ASSEMBLYAI_API_KEY).
Murf AI: Generates natural audio responses (MURF_API_KEY).
xAI Grok API: Delivers conversational AI responses (GROK_API_KEY).


Dependencies: fastapi, uvicorn, aiohttp, assemblyai, python-dotenv.

Architecture 🏗️
The project is a client-server masterpiece:

Frontend (templates/index.html, static/style.css):
Captures audio via the browser’s MediaRecorder API.
Sends recordings to /agent/chat/{session_id} endpoint.
Renders messages in a scrollable transcript-container (user messages right, AI messages left).
Uses JavaScript for real-time updates, auto-recording, and audio playback.


Backend (main.py):
FastAPI server handles audio uploads, transcription, and AI responses.
Saves audio to uploads/.
Transcribes with AssemblyAI, queries Grok API, and generates audio with Murf AI.
Maintains in-memory chat history per session.


API Flow:
User records audio → Frontend sends to backend.
Backend transcribes (AssemblyAI) → Queries Grok → Generates audio (Murf AI).
Frontend displays messages and plays audio.


Error Handling: Gracefully handles API failures with fallback audio.

Features ✨

Voice Interaction: Record queries and hear natural AI responses.
ChatGPT-Like UI: User messages (right, blue-purple), AI responses (left, red-purple), errors (left, red).
Auto-Recording: Starts recording after AI response playback.
Download Audio: Save recordings as agent_recording.webm.
Reset Session: Clear conversation and reset UI.
Animations: Slide-in messages, ripple effects, and pulsing status indicators.
Error Handling: Displays API errors with fallback audio (“I’m having trouble…”).

Project Structure 📂
AiAgentChallenge/DAY12/
├── main.py                 # FastAPI server and API logic
├── templates/
│   └── index.html         # Frontend HTML with JavaScript
├── static/
│   ├── style.css          # Styling for UI
│   └── favicon.ico        # Optional favicon
├── uploads/               # Stores uploaded audio files
├── .env                   # Environment variables
└── README.md              # This documentation

Setup Instructions 🛠️
Get your AI Voice Agent up and running in minutes:

Clone the Repository (or create manually):
git clone <your-repo-url>
cd AiAgentChallenge/DAY12


Create a Virtual Environment:
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows


Install Dependencies:
pip install fastapi uvicorn aiohttp assemblyai python-dotenv


Note: The murf module is assumed to be custom. Replace murf.generate_audio with a placeholder if unavailable (e.g., mock audio URL).


Set Up Environment Variables:

Create a .env file in the root:MURF_API_KEY=your_murf_api_key
ASSEMBLYAI_API_KEY=your_assemblyai_api_key
GROK_API_KEY=your_grok_api_key


Obtain keys:
Murf AI: https://murf.ai
AssemblyAI: https://www.assemblyai.com
Grok API: https://x.ai/api




Create Directories:
mkdir -p templates uploads static


Place Files:

main.py: Root directory.
index.html: templates/ directory.
style.css, favicon.ico: static/ directory.


Run the Server:
uvicorn main:app --reload


Open http://127.0.0.1:8000 in Chrome.
Grant microphone permissions.


Test the Agent:

Click “Start Recording,” ask “What’s the capital of France?” and stop.
Verify: User message (right, blue-purple), AI response (left, red-purple, e.g., “The capital of France is Paris.”), audio playback.
Test “Download Audio,” “Reset,” and error cases (e.g., remove GROK_API_KEY).



Environment Variables 🔑
Set these in .env:

MURF_API_KEY: For Murf AI audio generation.
ASSEMBLYAI_API_KEY: For AssemblyAI transcription.
GROK_API_KEY: For xAI Grok API responses.

Screenshots 📸
Coming Soon: Screenshots of the UI showcasing the conversation window, user messages (right), AI responses (left), and vibrant animations.
Future Enhancements 🌟

Voice selection for Murf AI responses.
Intent recognition for structured queries.
UI upgrades with message timestamps and interactive buttons.

Challenges Overcome 💪

Switched from Gemini to Grok API to dodge 429 quota errors.
Crafted a polished, ChatGPT-like UI with a large conversation window and proper message alignment.

About Me 🙌
I’m a developer fueled by curiosity and creativity, diving headfirst into AI and voice tech! This project is my love letter to innovation, blending code, design, and AI to create something truly magical. Join me on this #30DaysofVoiceAgents adventure as I build the future, one voice at a time! 🚀

Crafted with ❤️ for the #30DaysofVoiceAgents challenge by Murf AI.
