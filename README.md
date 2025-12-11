# 🎙️ `AI Voice Agent` – `30 Days of Murf AI Voice Agents Challenge 🚀`

Welcome to my AI Voice Agent project, crafted for the 30 Days of AI Voice Agents challenge with #BuildwithMurf! 🌟 This repo is my playground for building a next-level, voice-powered conversational AI that evolves daily with cutting-edge features. From audio transcription to real-time WebSocket streaming, context-aware memory, and future multi-agent systems, this project blends FastAPI, AssemblyAI, Murf AI, and Gemini API to deliver seamless, vibrant voice interactions. 💬 With a sleek UI showcasing user mess

---

## 📖 `About the Project`

This repo documents my **day-by-day progress** in building a **voice-driven AI assistant from scratch**.

Each day Focuses on solving real-world AI challenges like:

* 🎤 **Speech-to-Text (STT)** with AssemblyAI
* 🗣️ **Text-to-Speech (TTS)** with Murf AI
* 🧠 **Conversational Memory**
* 🔄 **Real-Time WebSocket Streaming**
* 🤖 **Context + Multi-Agent experiments**

👉 The ultimate goal: A **Robust, Interactive voice agent** that feels Alive, Responsive, and Production-ready! ⚡

---

## 🔑 `Key Features`


* ✅ **Voice Input/Output** → Record audio → Transcribe with AssemblyAI → Generate replies with Gemini → Synthesize voice with Murf AI
* ✅ **Vibrant UI** → Clean chat layout (blue-purple user bubbles, red-purple AI bubbles)
* ✅ **Session Management** → Per-session chat history for continuity
* ✅ **Optimizations** → Async polling, cached greetings, and reduced latency
* ✅ **WebSockets** → Real-time communication with `/ws` endpoint
* ✅ **Error Handling** → Robust API key, timeout, and invalid input handling
* ✅ **Scalability** → Ready for multi-language & multi-agent setups

---

## 🏗️ `Architecture Overview`

```
[Browser UI]
   │  record audio
   ▼
[FastAPI /agent/chat/{session_id}]   ←—→   WebSocket /ws
   │  save file → transcribe (AssemblyAI)
   │  update chat_history
   │  generate reply (Gemini)
   │  synthesize speech (Murf)
   ▼
JSON { transcription, response, audio_url, error? }
```

---

## 📂 `Repo Structure`

```bash
ai-voice-agent/
├─ day01 … day30/               # Daily progress folders
├─ templates/
│   └─ index.html                # Chat UI
├─ static/
│   ├─ style.css                 # Styles
│   ├─ screenshot_ui.png         # UI screenshot
│   └─ screenshot_websocket.png  # WebSocket screenshot
├─ uploads/                      # Temporary audio storage
├─ services/
│   ├─ assemblyai.py             # Transcription service
│   ├─ murf.py                   # Text-to-speech service
│   └─ gemini.py                 # Gemini AI responses
├─ schemas.py                    # Pydantic models
├─ main.py                       # FastAPI app (routes, WebSocket, caching)
├─ .env                          # API keys (ignored by git)
├─ .gitignore                    # Ignore configs, env, caches
└─ README.md                     # This file
```

---

## 🚀 `Getting Started`

### Prerequisites

* Python 3.10+
* Dependencies:

  ```bash
  fastapi uvicorn aiohttp assemblyai pydantic python-dotenv google-generativeai
  ```
* API Keys → Add to `.env`:

  ```ini
  ASSEMBLYAI_API_KEY=your_assemblyai_key
  MURF_API_KEY=your_murf_key
  GEMINI_API_KEY=your_gemini_key
  ```

### Setup

```bash
# Clone the repo
git clone https://github.com/yourusername/ai-voice-agent.git
cd ai-voice-agent

# Navigate to the latest code
cd day15   # or consolidated folder

# Create venv & install dependencies
python -m venv venv
source venv/bin/activate    # Mac/Linux
venv\Scripts\activate       # Windows

pip install -r requirements.txt

# Run server
uvicorn main:app --reload
```

---

## 🖥️ `Usage`

* **Web UI** → Open: [http://127.0.0.1:8000](http://127.0.0.1:8000)
* **WebSocket** → Connect at: `ws://127.0.0.1:8000/ws`
* **Sessions** → Use `session_id` in requests to maintain context

---

## 📅 `Progress Timeline`

* **Days 01–10** → FastAPI, STT/TTS pipeline, session management
* **Days 11–20** → Gemini integration, memory, async + performance tuning
* **Days 21–30** → WebSockets, streaming, multi-agent extensions

---

## 📸 `Screenshots`

* UI → `static/screenshot_ui.png`
* WebSocket → `static/screenshot_websocket.png`

---

## 🌟 `What’s Next`

* 🎧 Real-time **voice streaming in browser** with WebSockets
* 🗣️ **Multi-lingual conversations**
* 🤖 **Production deployment** for real-world use

---

## 📜 `License`

MIT License — Free to use, extend, and share 🚀

---

## 🙌 `Acknowledgments`

* **Murf AI** → for #30DaysOfVoiceAgents challenge
* **AssemblyAI, Murf AI, Gemini** → for APIs
* **Community (#BuildWithMurf)** → for support & inspiration

---

✨ `Follow my journey` → [LinkedIn](https://www.linkedin.com/in/deepak-mallareddy-1b09b6274/)

#30DaysofVoiceAgents #BuildWithMurf #AI #VoiceAgent #WebSocket

