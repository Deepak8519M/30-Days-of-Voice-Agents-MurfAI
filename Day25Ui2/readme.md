# 🎙️ `AI Voice Agent – Day 25 | 30 Days of Voice Agents Challenge 🚀`

Welcome to **Day 17 of my AI Voice Agent journey**, part of the #BuildWithMurf challenge! 🌟

Today’s focus is on **real-time audio streaming and transcription** using **FastAPI, WebSockets, and AssemblyAI**. This feature allows users to **speak directly into their microphone** and receive **live transcription updates in the browser**. It’s a core step toward building **interactive, voice-powered AI assistants** that feel responsive and dynamic. 💬

---

## 📖 About Day 17

On Day 17, I implemented a **live audio transcription system** with the following capabilities:

* 🎤 **Real-time Speech-to-Text (STT)** using AssemblyAI
* 🔄 **WebSocket streaming** for instant transcription updates
* 💾 **Recording and saving audio** in `.wav` format
* ⚡ **Error handling & retry mechanisms** for robust streaming
* 🖥️ **Responsive front-end** for displaying live transcription

This setup lays the foundation for any **voice assistant**, enabling **immediate feedback** and **dynamic interaction**.

---

## 🔑 Key Features

* ✅ Start/Stop transcription directly from the Web UI
* ✅ Live transcription updates as you speak
* ✅ Save audio recordings in `uploads/` for later reference
* ✅ Retry mechanism for reconnecting WebSocket on failure
* ✅ Fully responsive UI – works seamlessly on mobile and desktop
* ✅ Robust error handling for microphone and API issues

---

## 🏗️ Architecture Overview

```text
[Browser UI]  →  WebSocket (ws://127.0.0.1:8000/ws)  →  [FastAPI Backend]
   │                                             │
   │  Record audio                               │  Receive audio chunks
   │                                             │
   ▼                                             ▼
[Transcription Box] ← AssemblyAI StreamingClient  →  Server sends partial & final transcripts
   │
   ▼
Display live transcription + save .wav file in uploads/
```

This architecture allows **real-time communication** between the browser and backend while continuously updating the transcription box.

---

## 📂 Project Structure

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
└─ README.md                     # Project documentation
```

---

## 🚀 Step-by-Step Setup

Follow these steps to **run the Day 17 project locally**:

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/yourusername/day17-ai-voice-agent.git
cd day17-ai-voice-agent
```

### 2️⃣ Create & Activate Python Virtual Environment

```bash
# Mac/Linux
python3 -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
venv\Scripts\activate
```

### 3️⃣ Install Dependencies

```bash
pip install -r requirements.txt
```

**`requirements.txt` includes:**

```
fastapi==0.112.0
uvicorn[standard]==0.30.3
assemblyai>=0.36.0
pyaudio==0.2.14
ffmpeg-python==0.2.0
pydub==0.25.1
numpy==1.26.4
python-dotenv==1.0.1
```

### 4️⃣ Set Up Environment Variables

Create a `.env` file in the project root with your **AssemblyAI API key**:

```ini
AAI_API_KEY=your_assemblyai_api_key
```

> ⚠️ Make sure your API key is valid, otherwise the transcription will not work.

### 5️⃣ Run the FastAPI Server

```bash
uvicorn main:app --reload
```

Server will run at:

```
http://127.0.0.1:8000
```

---

## 🖥️ Usage Instructions

1. Open the browser at: `http://127.0.0.1:8000`
2. Click **Start Transcription 🎵** to begin streaming audio.
3. Speak into the microphone – live transcription updates appear in the **transcription box**.
4. Click **Stop Transcription 🛑** to end recording. Audio is automatically saved in `uploads/`.
5. If the WebSocket disconnects, click **Retry 🔄** to reconnect.

---

## 🔧 Core Code Flow

### Frontend (`index.html + JS`)

* Handles:

  * WebSocket connection (`ws://127.0.0.1:8000/ws`)
  * Button events: start, stop, retry
  * Live transcription display
  * Error handling

### Backend (`main.py`)

* `ws_handler(websocket: WebSocket)`:

  * Accepts WebSocket connections
  * Streams audio chunks from PyAudio to AssemblyAI
  * Sends partial and final transcripts to the UI
  * Saves audio as `.wav` files in `uploads/`
  * Handles stop/start/retry commands

* `save_wav(frames)` → Stores recorded audio locally

* `StreamingClient` → AssemblyAI live transcription

---

## 📸 UI Preview

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

## 🌟 Learning Outcomes

* Built **real-time speech-to-text** with minimal latency
* Learned **WebSocket integration** between frontend & backend
* Managed **threading, async tasks, and event-driven streaming**
* Developed a **responsive and interactive transcription UI**

---

## 📜 License

MIT License — Free to use, modify, and share 🚀

---

## 🙌 Acknowledgments

* **AssemblyAI** – live transcription API
* **FastAPI** – backend framework with WebSocket support
* **#BuildWithMurf** – challenge inspiration & community support

---

✨ `Follow my journey` → [LinkedIn](https://www.linkedin.com/in/deepak-mallareddy-1b09b6274/)

#Day17 #VoiceAgent #AssemblyAI #WebSocket #AI #BuildWithMurf

---

