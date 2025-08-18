# 🎙️ `AI Voice Agent – Day 17` | `30 Days of Voice Agents Challenge 🚀`

Welcome to **Day 17 of my AI Voice Agent journey**, part of the #BuildWithMurf challenge! 🌟

Today’s focus is on **real-time audio streaming and transcription** using **FastAPI, WebSockets, and AssemblyAI**. This setup allows users to speak into their microphone and receive live transcription updates directly in the browser — a key step toward building **interactive, voice-powered AI agents**. 💬

---

## 📖 `About Day 17`

On this day, I implemented a **live audio transcription feature**:

* 🎤 **Real-time Speech-to-Text (STT)** with AssemblyAI
* 🔄 **WebSocket streaming** for instant UI updates
* 💾 **Audio recording and saving** in `.wav` format
* ⚡ **Error handling & retry mechanism** for robust streaming
* 🖥️ **Responsive front-end** to display live transcription

This feature forms the backbone of any **voice assistant**, enabling **instant feedback** and **dynamic interaction**.

---

## 🔑 `Key Features`

* ✅ **Start/Stop transcription** via Web UI buttons
* ✅ **Live transcription updates** as you speak
* ✅ **Save audio recordings** in `uploads/` folder
* ✅ **Retry mechanism** if WebSocket fails
* ✅ **Responsive UI** – works on mobile & desktop
* ✅ **Robust error handling** for microphone & API issues

---

## 🏗️ `Architecture Overview`

```
[Browser UI]  →  WebSocket (ws://127.0.0.1:8000/ws)  →  [FastAPI Backend]
   │                                             │
   │  record audio                              │  receive audio chunks
   │                                             │
   ▼                                             ▼
[Transcription Box] ← AssemblyAI StreamingClient  →  Server sends partial & final transcript
   │
   ▼
Display live transcription + save .wav file in uploads/
```

---

## 📂 `Project Structure`

```bash
day17-ai-voice-agent/
├─ templates/
│  └─ index.html                # Frontend UI for transcription
├─ static/
│  ├─ style.css                 # CSS styles
│  └─ favicon.ico               # Browser icon
├─ uploads/                      # Saved audio files (.wav)
├─ main.py                       # FastAPI app + WebSocket + streaming logic
├─ requirements.txt              # Python dependencies
├─ .env                          # Environment variables (API key)
└─ README.md                     # This file
```

---

## 🚀 `Getting Started`

### Prerequisites

* Python 3.10+
* Microphone access
* AssemblyAI API key

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Setup Environment Variables

Create a `.env` file with:

```ini
AAI_API_KEY=your_assemblyai_key
```

### Run the Server

```bash
uvicorn main:app --reload
```

Then, open the frontend in your browser at:

```
http://127.0.0.1:8000
```

---

## 🖥️ `Usage`

1. Click **Start Transcription 🎵** to begin streaming your audio.
2. Speak into the microphone – live transcription appears in the **transcription box**.
3. Click **Stop Transcription 🛑** to finish recording. Audio is saved in `uploads/`.
4. If the WebSocket fails, click **Retry 🔄** to reconnect.

---

## 🔧 `Core Code Flow`

### Frontend (`index.html + JS`)

* `VoiceAgentUI` class handles:

  * WebSocket connection (`ws://127.0.0.1:8000/ws`)
  * Button events: start, stop, retry
  * Live transcription display
  * Error handling

### Backend (`main.py`)

* `ws_handler(websocket: WebSocket)`:

  * Accepts connections
  * Streams audio chunks from PyAudio to AssemblyAI
  * Sends partial and final transcripts back to UI
  * Saves recorded audio as `.wav`
  * Handles stop/start/retry commands

* `save_wav(frames)` → Stores audio locally

* `StreamingClient` → AssemblyAI live transcription

---

## 📸 `UI Preview`

**Transcription Box:**

```
[12:45:21] Hello, this is a live transcription 📜
```

**Status Box:**

```
Status: Transcribing... 🎙️
Server: Connected ✅
```

---

## 🌟 `Learning Outcomes`

* Implemented **real-time speech-to-text** with minimal latency
* Learned **WebSocket integration** with frontend & backend
* Managed **threading, async tasks, and event-driven streaming**
* Built a **responsive and interactive transcription UI**

---

## 📜 `License`

MIT License — Free to use, modify, and share 🚀

---

## 🙌 `Acknowledgments`

* **AssemblyAI** – for live transcription API
* **FastAPI** – lightweight backend with WebSocket support
* **#BuildWithMurf** – challenge inspiration & community support

---

✨ `Follow my journey` → [LinkedIn](https://www.linkedin.com/in/deepak-mallareddy-1b09b6274/)

#Day17 #VoiceAgent #AssemblyAI #WebSocket #AI #BuildWithMurf

---



