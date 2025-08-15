# 🎙️ AI Voice Agent 🚀 — Day 14

---

Welcome to **AI Voice Agent** — my project for the **30 Days of AI Voice Agents challenge** with `#BuildwithMurf 🎙️`.  
It’s an interactive, real-time, voice-powered assistant where you can **speak**, **listen**, and **chat** with AI.

💡 **Powered by**:

- 🧠 **Google Gemini API** for fast, context-aware answers
- 📝 **AssemblyAI** for accurate transcription
- 🔊 **Murf AI** for crystal-clear text-to-speech

---

## ✨ What's New in Day 14

Today was **Refactor Day** — the code got a full makeover!  
Here’s what’s changed:

| Upgrade | Description |
| ------- | ----------- |
| 📂 Modular Structure | Separated services into `/services/` for cleaner code |
| 🛡 Pydantic Schemas | Added `schemas.py` for request/response validation |
| 🧹 Code Cleanup | Removed unused imports, variables, and redundant logic |
| 📝 Logging Upgrade | Clear, consistent logs for debugging |
| 🌐 Public Release | Uploaded to GitHub with updated docs |

---

## 🛠 Tech Stack

| Layer               | Technology                                |
| ------------------- | ----------------------------------------- |
| **Frontend**        | HTML, CSS, JavaScript                     |
| **Backend**         | FastAPI (Python)                          |
| **Speech-to-Text**  | [AssemblyAI](https://www.assemblyai.com/) |
| **AI Reasoning**    | [Google Gemini](https://ai.google.dev/)   |
| **Text-to-Speech**  | [Murf AI](https://murf.ai/)               |
| **Templating**      | Jinja2                                    |
| **Env. Management** | python-dotenv                             |

---

## 📂 Project Structure

```plaintext
ai-voice-agent/
├── main.py              # FastAPI entry point
├── schemas.py           # Pydantic models
├── services/
│   ├── assemblyai.py    # Speech-to-Text
│   ├── gemini.py        # AI reasoning
│   ├── murf.py          # Text-to-Speech
├── templates/
│   └── index.html
├── static/
│   ├── style.css
│   └── favicon.ico
├── uploads/             # Audio uploads
├── .env                 # API keys
├── .gitignore
└── README.md
````

---

## ⚙️ Setup Instructions

1️⃣ **Clone Repository**

```bash
git clone <your-repo-url>
cd ai-voice-agent
```

2️⃣ **Create Virtual Environment**

```bash
python -m venv venv
source venv/bin/activate   # Mac/Linux
venv\Scripts\activate      # Windows
```

3️⃣ **Install Dependencies**

```bash
pip install fastapi uvicorn aiohttp assemblyai python-dotenv google-generativeai
```

4️⃣ **Set Environment Variables** in `.env`

```env
MURF_API_KEY=your_murf_api_key
ASSEMBLYAI_API_KEY=your_assemblyai_api_key
GEMINI_API_KEY=your_gemini_api_key
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

## 📈 Flow Diagram

```plaintext
🎤 User Voice
   ↓
📡 Frontend → FastAPI
   ↓
📝 AssemblyAI (STT)
   ↓
🤖 Gemini API (AI Reply)
   ↓
🔊 Murf AI (TTS)
   ↓
🗣 AI Speaks Back
```

---

## 🌟 Features

| Feature                   | Description                           |
| ------------------------- | ------------------------------------- |
| 🎤 **Voice Recording**    | Record audio directly in browser      |
| 📝 **Speech-to-Text**     | Fast & accurate transcription         |
| 🤖 **Smart AI Responses** | Context-aware answers                 |
| 🔊 **Text-to-Speech**     | High-quality human-like audio         |
| 💬 **Chat View**          | User on right, AI on left             |
| 🧠 **Session Memory**     | Keeps context for better replies      |
| 🔄 **Auto-Recording**     | Starts listening after AI speaks      |
| 📥 **Download Audio**     | Save `.webm` files                    |
| 🗑 **Reset Session**      | Clear chat instantly                  |
| 🚨 **Error Handling**     | Clear error messages + fallback audio |

---

## 🌟 Future Enhancements

* 🎙️ Voice selection for Murf AI
* ⏱ Message timestamps
* 🧩 Smarter intent recognition
* 🔘 Interactive control buttons

---

## 🙌 About Me

I’m a developer driven by curiosity & creativity — blending **code**, **design**, and **AI** into interactive experiences.
This project is part of my journey to push the limits of AI voice tech.
**Follow along** as I build the future, one voice at a time. 🚀

Crafted with ❤️ for **#30DaysOfVoiceAgents** with **Murf AI**.






