````markdown
# 🎙️ AI Voice Agent — Day 13 of 30 Days of AI Voice Agents 🚀

Welcome to **Day 13** of my #30DaysOfAIVoiceAgents challenge with **#BuildwithMurf**!  
This is **my AI Voice Agent** — a dazzling conversational powerhouse that lets you **speak**, **listen**, and **engage** with AI in a **sleek, ChatGPT-inspired interface**.

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

## 🌟 Project Overview

This AI Voice Agent is your **virtual conversational partner**.  

🎤 Speak a question — for example:
> “What’s the capital of France?”

And here’s what happens:
1. It **transcribes** your voice 🎙️ → 📝 (AssemblyAI)
2. **Queries Grok** for a **witty, precise answer** 🤖
3. **Plays the reply** back to you in **natural-sounding audio** 🎶 (Murf AI)

The UI is **alive**:
- Spacious conversation window 🖼️
- Auto-recording after AI replies 🔄
- Downloadable `.webm` audio 📥
- Smooth animations that make chatting feel magical ✨

---

## 🛠️ Technologies Used

### **Frontend**
- 🎨 **HTML/CSS** — *templates/index.html* + *static/style.css*  
  Responsive design with Urbanist font, vibrant gradients, and subtle animations.
- ⚡ **JavaScript** — Handles recording, API calls, and live message rendering.
- 🎯 **Remixicon** — Stylish icons for record, download, and reset buttons.

### **Backend**
- 🚀 **FastAPI** — API server (*main.py*) for processing audio and responses.
- 🐍 **Python** — Logic orchestration with:
  - `aiohttp`
  - `assemblyai`
  - `python-dotenv`

### **APIs**
- 📝 **AssemblyAI** — Speech-to-text (`ASSEMBLYAI_API_KEY`)
- 🔊 **Murf AI** — Text-to-speech (`MURF_API_KEY`)
- 🧠 **xAI Grok API** — Conversational AI responses (`GROK_API_KEY`)

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

```

---

If you want, I can also make a **LinkedIn-optimized “banner image”** for Day 13 that shows:  
📌 *Your app screenshot + “Day 13: Documentation” title + AI/microphone graphics*.  
It’ll pop in people’s feeds way more than plain text.
```

