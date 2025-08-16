# 🎙️ `AI Voice Agent` – `30 Days of Voice Agents Challenge 🚀`

Welcome to my **AI Voice Agent project**, built as part of the **30 Days of AI Voice Agents Challenge with #BuildwithMurf!** 🌟

This repository showcases my journey to create a **cutting-edge, voice-powered conversational AI**, evolving daily with new features — from audio transcription and text-to-speech, to memory, real-time streaming, and multi-agent systems.

With a vibrant UI (user messages appear right in **blue-purple**, AI responses on the left in **red-purple**), this project blends **FastAPI, AssemblyAI, Murf AI, and Gemini API** to deliver seamless, real-time voice interactions. 💬

---

## 📖 About the Project

This repository documents my **end-to-end progress over 30 days**, where I’ve been building a **voice-driven AI agent from scratch**.

Each day introduces new functionality, tackling real-world AI challenges such as:

* Speech-to-text (STT)
* Text-to-speech (TTS)
* Conversational memory
* Real-time WebSocket streaming
* Personalization and context handling
* Multi-agent experiments

The ultimate goal?
👉 A **robust, interactive voice agent** that feels alive, responsive, and production-ready! ⚡

---

## 🔑 Key Features (Progress Highlights)

* 🎤 **Voice Input & Output** → Record audio, transcribe with AssemblyAI, generate smart responses with Gemini API, and synthesize natural voices with Murf AI.
* 🎨 **Vibrant UI** → Clean chat layout with **blue-purple user bubbles** and **red-purple AI bubbles**.
* 📚 **Session Management** → Persistent chat history stored per session.
* ⚡ **Performance Optimizations** → Cached greetings, async transcription, and faster response times.
* 🔄 **WebSocket Streaming** → Real-time messaging via `/ws` endpoint, tested with Postman.
* 🌍 **Scalability** → External API integrations, multi-language support, and personality tuning.
* 🛡️ **Error Handling** → Robust checks for invalid audio, API key issues, and timeouts.

---

## 📂 Repo Structure

```
ai-voice-agent/
├── day01/ … day30/   # Daily progress folders
├── main/             # Core project (latest stable build)
│   ├── main.py       # FastAPI server
│   ├── schemas.py    # Pydantic models
│   ├── services/     # AssemblyAI, Murf AI, Gemini integration
│   ├── templates/    # index.html (UI)
│   ├── static/       # style.css, screenshots
│   ├── uploads/      # User audio files
├── .env              # API keys (not tracked)
├── .gitignore        # Ignore .env, __pycache__, etc.
└── README.md         # This file
```

---

## 🚀 Getting Started

### Prerequisites

* Python 3.10+
* Dependencies: `fastapi`, `uvicorn`, `aiohttp`, `assemblyai`, `pydantic`, `python-dotenv`, `google-generativeai`
* API Keys: AssemblyAI, Murf AI, Gemini API (add them to `.env`)

### Setup

```bash
# Clone the repo
git clone https://github.com/yourusername/ai-voice-agent.git
cd ai-voice-agent

# Navigate to latest stable day
cd day30   # or main/ if consolidated

# Create venv & install dependencies
python -m venv venv
source venv/bin/activate   # (Linux/Mac)
venv\Scripts\activate      # (Windows)

pip install -r requirements.txt
```

Add API keys to `.env`:

```ini
ASSEMBLYAI_API_KEY=your_assemblyai_key
MURF_API_KEY=your_murf_key
GEMINI_API_KEY=your_gemini_key
```

Run the server:

```bash
uvicorn main:app --reload
```

---

## 🖥️ Usage

* **UI** → Open [http://127.0.0.1:8000](http://127.0.0.1:8000) to interact with the voice agent.
* **WebSocket** → Connect to `ws://127.0.0.1:8000/ws` for real-time echo/streaming.
* **Sessions** → Conversations are tracked per `session_id`.

---

## 🛠️ Progress Timeline

* **Days 01–10** → Foundations: FastAPI setup, STT + TTS integration, session chat.
* **Days 11–20** → Smarter AI: Gemini integration, memory handling, performance boosts.
* **Days 21–30** → Advanced: Real-time WebSockets, multi-agent experiments, personalization, polish.

---

## 📸 Screenshots

* UI → `static/screenshot_ui.png`
* WebSocket Echo → `static/screenshot_websocket.png`

---

## 🌟 What’s Next?

Beyond Day 30:

* 🎧 Real-time voice streaming into the browser via WebSockets.
* 🗣️ Multi-lingual conversations.
* 🤖 Deployable, production-ready AI voice assistant.

---

## 📜 License

MIT License. Free to use and extend.

---

## 🙌 Acknowledgments

* **Murf AI** → For the awesome #30DaysOfVoiceAgents challenge.
* **AssemblyAI, Murf AI, Gemini** → For their powerful APIs.
* **Community + #BuildwithMurf** → For ideas and inspiration.

---

✨ Follow my journey on **LinkedIn/Twitter/GitHub** → \[https://www.linkedin.com/in/deepak-mallareddy-1b09b6274/]
#30DaysofVoiceAgents #BuildwithMurf #AI #VoiceAgent #WebSocket
