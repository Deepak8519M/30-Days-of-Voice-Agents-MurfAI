let ws = null;
let audioContext = null;
let audioQueue = [];
let isPlaying = false;
let nextStartTime = 0;
let isFirstAudio = true;

const SAMPLE_RATE = 44100; // Murf output sample rate
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const retryBtn = document.getElementById("retryBtn");
const status = document.getElementById("status");
const transcriptionText = document.getElementById("transcriptionText");
const chatHistory = document.getElementById("chatHistory");
const spinner = document.querySelector(".spinner");
const connectionStatus = document.getElementById("connectionStatus");
const sessionList = document.getElementById("session-list");
const newSessionBtn = document.querySelector(".new-session-btn");

// Session management
let sessions = JSON.parse(localStorage.getItem("sessions")) || [];
let activeSessionId = localStorage.getItem("activeSessionId") || null;

function createNewSession() {
  console.log("Attempting to create new chat");
  if (!newSessionBtn) {
    console.error("newSessionBtn not found");
    return;
  }
  const sessionId = Date.now().toString();
  sessions.push({
    id: sessionId,
    name: `Chat ${sessions.length + 1}`,
    transcript: "",
    history: [],
  });
  localStorage.setItem("sessions", JSON.stringify(sessions));
  setActiveSession(sessionId);
  renderSessions();
}

function setActiveSession(sessionId) {
  activeSessionId = sessionId;
  localStorage.setItem("activeSessionId", activeSessionId);
  const session = sessions.find((s) => s.id === sessionId);
  if (session) {
    transcriptionText.textContent =
      session.transcript || "Waiting for transcription... ⏳";
    renderChatHistory(session.history);
  }
  renderSessions();
}

function renderSessions() {
  sessionList.innerHTML = "";
  sessions.forEach((session) => {
    const li = document.createElement("li");
    li.textContent = session.name;
    li.dataset.sessionId = session.id;
    if (session.id === activeSessionId) li.classList.add("active");
    li.addEventListener("click", () => setActiveSession(session.id));
    sessionList.appendChild(li);
  });
}

function renderChatHistory(history) {
  chatHistory.innerHTML = history.length
    ? history
        .map(
          (entry) => `
        <div class="chat-entry">
          <div class="timestamp">${new Date(
            entry.timestamp
          ).toLocaleString()}</div>
          <div class="user-query">You: ${entry.user_query}</div>
          <div class="ai-response">AI: ${entry.ai_response}</div>
        </div>
      `
        )
        .join("")
    : "<span class='text'>No chat history yet.</span>";
}

function updateSessionData(transcript, response) {
  if (!activeSessionId) return;
  const session = sessions.find((s) => s.id === activeSessionId);
  if (session) {
    session.transcript = transcript || session.transcript; // Preserve existing transcript
    if (response) {
      session.history.push({
        timestamp: new Date().toISOString(),
        user_query: transcript || "",
        ai_response: response,
      });
    }
    localStorage.setItem("sessions", JSON.stringify(sessions));
    setActiveSession(activeSessionId);
  }
}

// Initialize WebSocket connection
function connectWebSocket() {
  ws = new WebSocket("ws://" + window.location.host + "/ws");

  ws.onopen = () => {
    console.log("WebSocket opened");
    connectionStatus.textContent = "Connected to server ✅";
    connectionStatus.classList.add("connected");
    startBtn.disabled = false;
  };

  ws.onmessage = async (event) => {
    const data = event.data;
    console.log("WebSocket message received:", data.substring(0, 100) + "...");

    if (data.startsWith("{")) {
      try {
        const jsonData = JSON.parse(data);
        if (jsonData.type === "audio" && jsonData.data) {
          console.log(
            "Audio chunk received, is_final:",
            jsonData.is_final,
            "length:",
            jsonData.data.length
          );
          await queueAudio(jsonData.data, jsonData.is_final);
        } else if (jsonData.type === "response" && jsonData.data) {
          transcriptionText.textContent += `\nAI: ${jsonData.data}`;
          updateSessionData(transcriptionText.textContent, jsonData.data);
          await fetchChatHistory();
        }
      } catch (e) {
        console.error("Error parsing JSON message:", e);
        status.textContent = "Error: Invalid data received ❌";
      }
    } else {
      // Handle text messages (transcription)
      if (
        data !== "turn_ended" &&
        !data.startsWith("Stopped transcription") &&
        !data.startsWith("Error:")
      ) {
        transcriptionText.textContent = data || transcriptionText.textContent; // Update with live transcription
        updateSessionData(data);
      }
      if (data === "Started transcription") {
        status.textContent = "Status: Transcribing 🎤";
        spinner.style.display = "inline-block";
        transcriptionText.textContent = "";
        startBtn.style.display = "none";
        stopBtn.style.display = "inline-block";
        retryBtn.style.display = "none";
      } else if (data === "turn_ended") {
        spinner.style.display = "none";
        status.textContent = "Status: Processing response 🤖";
      } else if (data.startsWith("Stopped transcription")) {
        status.textContent = "Status: Idle ⏳";
        spinner.style.display = "none";
        startBtn.style.display = "inline-block";
        stopBtn.style.display = "none";
        retryBtn.style.display = "inline-block";
        if (data.includes("saved")) {
          const filename = data.match(/saved: (.+)$/)[1];
          transcriptionText.textContent += `\nAudio saved as ${filename}`;
        }
        updateSessionData(transcriptionText.textContent);
      } else if (
        data.startsWith("Error:") ||
        data.startsWith("Transcription error:")
      ) {
        status.textContent = `Error: ${data}`;
        spinner.style.display = "none";
        startBtn.style.display = "inline-block";
        stopBtn.style.display = "none";
        retryBtn.style.display = "inline-block";
      } else if (data === "Already transcribing") {
        status.textContent = "Status: Already transcribing 🎤";
      }
    }
  };

  ws.onclose = () => {
    console.log("WebSocket closed");
    connectionStatus.textContent = "Disconnected from server 🔌";
    connectionStatus.classList.remove("connected");
    startBtn.disabled = true;
    stopBtn.style.display = "none";
    retryBtn.style.display = "inline-block";
    status.textContent = "Status: Disconnected 🔌";
    spinner.style.display = "none";
  };

  ws.onerror = () => {
    connectionStatus.textContent = "Error connecting to server ❌";
    connectionStatus.classList.remove("connected");
    startBtn.disabled = true;
  };
}

// Initialize AudioContext
function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: SAMPLE_RATE,
    });
    console.log(
      "AudioContext initialized, sampleRate:",
      audioContext.sampleRate
    );
  }
}

// Decode base64 to ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Queue audio chunk (Remove WAV header slicing for PCM)
async function queueAudio(base64Audio, isFinal) {
  try {
    let pcmBuffer = base64ToArrayBuffer(base64Audio);
    // Removed if (isFirstAudio) block since using PCM format
    const int16 = new Int16Array(pcmBuffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    const audioBuffer = audioContext.createBuffer(
      CHANNELS,
      float32.length,
      SAMPLE_RATE
    );
    audioBuffer.copyToChannel(float32, 0);

    console.log(
      "Audio chunk processed, duration:",
      audioBuffer.duration,
      "isFinal:",
      isFinal
    );
    audioQueue.push({ buffer: audioBuffer, isFinal });
    playNextAudio();
  } catch (error) {
    console.error("Error processing audio:", error);
    status.textContent = "Error: Failed to play audio ❌";
  }
}

// Play queued audio chunks
function playNextAudio() {
  if (isPlaying || audioQueue.length === 0) return;

  isPlaying = true;
  const { buffer, isFinal } = audioQueue.shift();
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);

  const currentTime = audioContext.currentTime;
  source.start(Math.max(nextStartTime, currentTime));
  nextStartTime = Math.max(nextStartTime, currentTime) + buffer.duration;

  source.onended = () => {
    isPlaying = false;
    if (isFinal) {
      audioQueue = [];
      nextStartTime = 0;
      isFirstAudio = true;
      console.log("Audio playback complete");
      status.textContent = "Status: Audio playback complete ✅";
    } else {
      playNextAudio();
    }
  };
}

// Fetch and display chat history
async function fetchChatHistory() {
  try {
    const response = await fetch("/chat_history");
    const history = await response.json();
    if (Array.isArray(history)) {
      const session = sessions.find((s) => s.id === activeSessionId);
      if (session) session.history = history;
      renderChatHistory(session ? session.history : []);
    }
  } catch (error) {
    console.error("Error fetching chat history:", error);
    chatHistory.innerHTML =
      "<span class='text'>Error loading chat history.</span>";
  }
}

// Event listeners and initialization
document.addEventListener("DOMContentLoaded", () => {
  if (!newSessionBtn) {
    console.error("newSessionBtn not found after DOM load");
  } else {
    newSessionBtn.addEventListener("click", createNewSession);
  }

  startBtn.addEventListener("click", () => {
    initAudioContext();
    isFirstAudio = true;
    ws.send("start");
  });

  stopBtn.addEventListener("click", () => {
    ws.send("stop");
  });

  retryBtn.addEventListener("click", () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send("start");
    } else {
      connectWebSocket();
      status.textContent = "Status: Reconnecting... 🔄";
    }
  });

  connectWebSocket();
  if (!activeSessionId && sessions.length > 0) setActiveSession(sessions[0].id);
  else if (!activeSessionId) createNewSession();
  renderSessions();
  fetchChatHistory();
});
