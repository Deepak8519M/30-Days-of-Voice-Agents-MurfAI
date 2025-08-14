
# 🎙️ AI Voice Agent — Day 13 of 30 Days of AI Voice Agents 🚀

Welcome to my AI Voice Agent, a dazzling creation for the 30 Days of AI Voice Agents challenge with #BuildwithMurf! This project is a conversational powerhouse that lets you speak, listen, and engage with AI in a sleek, ChatGPT-inspired interface. Powered by xAI’s Grok API, it transcribes your voice with AssemblyAI, responds with natural audio via Murf AI, and wraps it all in a vibrant UI with messages dancing across the screen—user queries on the right, AI replies on the left. Day 13 is all about documenting this journey with flair, and I’ve poured my passion into making it shine! 🚀

---

## ✨ Features

- 🎤 **Voice Recording** – Record directly from your browser.
- 📝 **Speech-to-Text** – Accurate transcription via AssemblyAI.
- 🤖 **Smart AI Responses** – Context-aware answers from Google Gemini.
- 🔊 **Text-to-Speech** – Human-like speech via Murf AI.
- 💬 **Live Chat View** – Real-time transcripts and AI replies.
- 📥 **Audio Download** – Save your recordings locally.
- 🧠 **Session Memory** – Keeps context across conversation turns.

---

💡 Powered by:
- 🧠 **xAI’s Grok API** for witty, context-aware answers
- 📝 **AssemblyAI** for lightning-fast transcription
- 🔊 **Murf AI** for crystal-clear text-to-speech

And wrapped in a **vibrant UI** where:
- **User queries** dance on the **right** in blue-purple gradients ✨
- **AI replies** appear on the **left** in red-purple gradients 🔥
- **Errors** pop in bold red for quick visibility 🚨

Today’s focus: **Documenting this journey with flair** ✍️

---

## 🛠 Tech Stack

| Layer         | Technology |
|--------------|------------|
| **Frontend** | HTML, CSS, JavaScript |
| **Backend**  | FastAPI (Python) |
| **Speech-to-Text** | [AssemblyAI](https://www.assemblyai.com/) |
| **AI Reasoning** | [Google Gemini](https://ai.google.dev/) |
| **Text-to-Speech** | [Murf AI](https://murf.ai/) |
| **Templating** | Jinja2 |
| **Env. Management** | python-dotenv |

---

## 🏗 Architecture

**Frontend** (`templates/index.html`, `static/style.css`)
- Captures audio 🎙️ via MediaRecorder API
- Sends to `/agent/chat/{session_id}` 📡
- Displays **user messages** (right) & **AI replies** (left) 💬
- Plays back generated AI audio 🎶

**Backend** (`main.py`)
- Receives audio → Saves to `uploads/` 📂
- Transcribes via AssemblyAI 📝
- Gets AI response from Grok 🤖
- Converts response to audio via Murf 🔊
- Maintains **in-memory chat history** per session 🧠

**Flow Diagram**
```plaintext
🎤 User Voice
   ↓
📡 Frontend → FastAPI
   ↓
📝 AssemblyAI (STT)
   ↓
🤖 Grok API (AI Reply)
   ↓
🔊 Murf AI (TTS)
   ↓
🗣 AI Speaks Back
````

---

## ✨ Features

* 🎤 **Voice Interaction** — Speak and listen to AI responses
* 💬 **ChatGPT-Like UI** — Beautiful gradients & message alignment
* 🔄 **Auto-Recording** — Starts after each AI reply
* 📥 **Download Audio** — Save `.webm` recordings
* 🗑 **Reset Session** — Clear conversation & UI
* 🎨 **Animations** — Sliding messages & pulsing indicators
* 🚨 **Error Handling** — Clear API error messages + fallback audio

---

## 📂 Project Structure

```
📦 AiAgentChallenge/DAY13
 ┣ 📜 main.py           # 🚀 FastAPI backend logic
 ┣ 📂 templates         # 🖼️ Frontend HTML (Jinja2)
 ┃ ┗ 📜 index.html
 ┣ 📂 static            # 🎨 CSS, JS, favicon
 ┃ ┣ 📜 style.css
 ┃ ┗ 📜 favicon.ico
 ┣ 📂 uploads           # 🎙️ Saved audio files
 ┣ 📜 .env              # 🔐 API keys (ignored by Git)
 ┗ 📜 README.md         # 📖 Documentation
```

---

## ⚙️ Setup Instructions

1️⃣ **Clone Repository**

```bash
git clone <your-repo-url>
cd AiAgentChallenge/DAY13
```

2️⃣ **Create Virtual Environment**

```bash
python -m venv venv
source venv/bin/activate   # Mac/Linux
venv\Scripts\activate      # Windows
```

3️⃣ **Install Dependencies**

```bash
pip install fastapi uvicorn aiohttp assemblyai python-dotenv
```

4️⃣ **Set Environment Variables** in `.env`

```env
MURF_API_KEY=your_murf_api_key
ASSEMBLYAI_API_KEY=your_assemblyai_api_key
GROK_API_KEY=your_grok_api_key
```

5️⃣ **Run the Server**

```bash
uvicorn main:app --reload
```

6️⃣ **Open in Browser**

```
http://127.0.0.1:8000
```

---

## 📸 Screenshots

Coming soon:

* Conversation UI
* User messages (right, blue-purple)
* AI responses (left, red-purple)
* Smooth animations in action

---

## 🌟 Future Enhancements

* 🎙️ Voice selection for Murf AI responses
* 🧩 Intent recognition for smarter interactions
* ⏱ Message timestamps
* 🔘 Interactive control buttons

---

## 💪 Challenges Overcome

* Switched from Gemini to Grok API to dodge **429 quota errors**
* Designed **ChatGPT-like UI** with clean message alignment and gradients
* Implemented **fallback audio** for API error resilience

---

## 🙌 About Me

I’m a developer fueled by curiosity & creativity — blending **code**, **design**, and **AI** into magical projects.
This challenge is my journey to push the limits of AI voice tech.
**Join me** as I build the future, one voice at a time! 🚀

Crafted with ❤️ for **#30DaysOfVoiceAgents** with **Murf AI**









