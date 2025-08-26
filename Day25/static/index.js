let ws = null;
let audioContext = null;
let audioQueue = [];
let isPlaying = false;
let nextStartTime = 0;
let isFirstAudio = true;
let currentChatId = "1";

const SAMPLE_RATE = 44100; // Murf output sample rate
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const retryBtn = document.getElementById("retryBtn");
const status = document.getElementById("status");
const transcription = document.getElementById("transcription");
const chatHistory = document.getElementById("chatHistory");
const spinner = document.querySelector(".spinner");
const connectionStatus = document.getElementById("connectionStatus");
const newChatBtn = document.getElementById("newChatBtn");
const chatList = document.getElementById("chatList");

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

// Queue audio chunk
async function queueAudio(base64Audio, isFinal) {
  try {
    let pcmBuffer = base64ToArrayBuffer(base64Audio);
    if (isFirstAudio) {
      console.log("First audio chunk: skipping 44-byte WAV header");
      pcmBuffer = pcmBuffer.slice(44);
      isFirstAudio = false;
    }

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

// Load chat list
async function loadChats() {
  try {
    const res = await fetch("/chats");
    const chats = await res.json();
    chatList.innerHTML = chats
      .map(
        (id) => `
      <li data-id="${id}" class="${
          id === currentChatId ? "active" : ""
        }">Conversation ${id}</li>
    `
      )
      .join("");
    document.querySelectorAll("#chatList li").forEach((li) => {
      li.addEventListener("click", () => {
        currentChatId = li.dataset.id;
        document
          .querySelectorAll("#chatList li")
          .forEach((l) => l.classList.remove("active"));
        li.classList.add("active");
        fetchChatHistory();
        if (ws) ws.close();
        connectWebSocket();
      });
    });
  } catch (error) {
    console.error("Error loading chats:", error);
  }
}

// Fetch and display chat history
async function fetchChatHistory() {
  try {
    const response = await fetch(`/chat_history?chat_id=${currentChatId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const history = await response.json();
    if (Array.isArray(history)) {
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
    } else {
      chatHistory.innerHTML =
        "<span class='text'>Error loading chat history.</span>";
    }
  } catch (error) {
    console.error("Error fetching chat history:", error);
    chatHistory.innerHTML =
      "<span class='text'>Error loading chat history.</span>";
  }
}

// Initialize app
async function initApp() {
  try {
    const res = await fetch("/chats");
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    let chats = await res.json();
    if (!chats.length) {
      const newRes = await fetch("/new_chat", { method: "POST" });
      if (!newRes.ok) {
        throw new Error(`HTTP error! status: ${newRes.status}`);
      }
      const data = await newRes.json();
      currentChatId = data.chat_id;
    } else {
      currentChatId = chats[chats.length - 1];
    }
    await loadChats();
    await fetchChatHistory();
    connectWebSocket();
  } catch (error) {
    console.error("Error initializing app:", error);
    status.textContent = "Error: Failed to initialize app ❌";
  }
}

// Initialize WebSocket connection
function connectWebSocket() {
  if (ws) {
    ws.close();
  }
  ws = new WebSocket(
    `ws://${window.location.host}/ws?chat_id=${currentChatId}`
  );

  ws.onopen = () => {
    console.log("WebSocket opened");
    connectionStatus.textContent = "Connected to server ✅";
    connectionStatus.classList.add("connected");
    startBtn.disabled = false;
  };

  ws.onmessage = async (event) => {
    const data = event.data;
    console.log("WebSocket message received:", data.substring(0, 100) + "...");

    // Handle JSON messages (audio or response)
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
          // Append AI response to transcription
          transcription.innerHTML += `<div class="ai-message">${jsonData.data}</div>`;
          // Refresh chat history
          await fetchChatHistory();
        } else {
          console.warn("Invalid JSON message format:", jsonData);
        }
      } catch (e) {
        console.error("Error parsing JSON message:", e);
        status.textContent = "Error: Invalid data received ❌";
      }
      return;
    }

    // Handle text messages
    if (data === "Started transcription") {
      status.textContent = "Status: Transcribing 🎤";
      spinner.style.display = "inline-block";
      transcription.innerHTML = "";
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
        transcription.innerHTML += `<div class="text">Audio saved as ${filename}</div>`;
      }
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
    } else {
      // Append transcription text as user message
      transcription.innerHTML += `<div class="user-message">${data}</div>`;
    }
  };

  ws.onclose = (event) => {
    console.log("WebSocket closed", event.code, event.reason);
    connectionStatus.textContent = "Disconnected from server 🔌";
    connectionStatus.classList.remove("connected");
    startBtn.disabled = true;
    stopBtn.style.display = "none";
    retryBtn.style.display = "inline-block";
    status.textContent = "Status: Disconnected 🔌";
    spinner.style.display = "none";
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
    connectionStatus.textContent = "Error connecting to server ❌";
    connectionStatus.classList.remove("connected");
    startBtn.disabled = true;
  };
}

// Event listeners
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

newChatBtn.addEventListener("click", async () => {
  try {
    const res = await fetch("/new_chat", { method: "POST" });
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    currentChatId = data.chat_id;
    await loadChats();
    await fetchChatHistory();
    connectWebSocket();
  } catch (error) {
    console.error("Error creating new chat:", error);
  }
});

// Initialize
initApp();
