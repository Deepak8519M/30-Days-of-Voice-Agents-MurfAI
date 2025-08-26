let ws = null;
let audioContext = null;
let audioQueue = [];
let isPlaying = false;
let nextStartTime = 0;
let isFirstAudio = true;
let currentChatId = "1";
let currentTranscript = "";
let rippleInterval = null;

const SAMPLE_RATE = 44100; // Murf output sample rate
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;

const startBtn = document.getElementById("micBtn");
const stopBtn = document.getElementById("stopListening");
const status = document.getElementById("status");
const transcription = document.getElementById("transcription");
const chatHistory = document.getElementById("chatHistory");
const spinner = document.querySelector(".spinner");
const connectionStatus = document.getElementById("connectionStatus");
const newChatBtn = document.getElementById("newChatBtn");
const chatList = document.getElementById("chatList");
const notification = document.getElementById("notification");
const listeningModal = document.getElementById("listeningModal");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const uploadForm = document.getElementById("uploadForm");
const fileInput = document.getElementById("fileInput");

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
          id === currentChatId ? "active " : ""
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
        loadCurrentConversation();
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

// Load current conversation into transcription
async function loadCurrentConversation() {
  try {
    const response = await fetch(`/chat_history?chat_id=${currentChatId}`);
    const history = await response.json();
    if (Array.isArray(history)) {
      transcription.innerHTML = history
        .map(
          (entry) => `
        <div class="user-message ">${entry.user_query}</div>
        <div class="ai-message ">${entry.ai_response}</div>
      `
        )
        .join("");
    }
  } catch (error) {
    console.error("Error loading current conversation:", error);
  }
}

// Handle file upload
uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(uploadForm);
  try {
    const response = await fetch("/upload", {
      method: "POST",
      body: formData,
    });
    const result = await response.json();
    notification.textContent = result.message;
    notification.style.display = "block";
    setTimeout(() => (notification.style.display = "none"), 2500);
    transcription.innerHTML += `<div class="ai-message ">${result.message}</div>`;
    transcription.scrollTop = transcription.scrollHeight;
  } catch (error) {
    notification.textContent = "Error uploading file ❌";
    notification.style.display = "block";
    setTimeout(() => (notification.style.display = "none"), 2500);
  }
});

// Initialize app
async function initApp() {
  try {
    let res = await fetch("/chats");
    let chats = await res.json();
    if (!chats.length) {
      res = await fetch("/new_chat", { method: "POST" });
      const data = await res.json();
      currentChatId = data.chat_id;
    } else {
      currentChatId = chats[chats.length - 1];
    }
    await loadChats();
    await loadCurrentConversation();
    await fetchChatHistory();
    connectWebSocket();
  } catch (error) {
    console.error("Error initializing app:", error);
  }
}

// Initialize WebSocket connection
function connectWebSocket() {
  ws = new WebSocket(
    `ws://${window.location.host}/ws?chat_id=${currentChatId}`
  );

  ws.onopen = () => {
    console.log("WebSocket opened");
    connectionStatus.textContent = "Connected to server ✅";
    connectionStatus.classList.add("connected");
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
          const ripples = document.querySelectorAll(".ripple");
          ripples.forEach((ripple) => ripple.classList.add("active"));
        } else if (jsonData.type === "response" && jsonData.data) {
          transcription.innerHTML += `<div class="ai-message ">${jsonData.data}</div>`;
          transcription.scrollTop = transcription.scrollHeight;
          await fetchChatHistory();
          const ripples = document.querySelectorAll(".ripple");
          ripples.forEach((ripple) => ripple.classList.remove("active"));
        } else if (jsonData.type === "search" && jsonData.data) {
          transcription.innerHTML += `<div class="search-result">${jsonData.data}</div>`;
          transcription.scrollTop = transcription.scrollHeight;
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
      currentTranscript = "";
      listeningModal.style.display = "flex";
      rippleInterval = setInterval(() => {
        const ripples = document.querySelectorAll(".ripple");
        ripples.forEach((ripple) => {
          ripple.classList.remove("active");
          setTimeout(() => ripple.classList.add("active"), 50);
        });
      }, 1500);
    } else if (data === "turn_ended") {
      spinner.style.display = "none";
      status.textContent = "Status: Processing response 🤖";
      listeningModal.style.display = "none";
      if (currentTranscript) {
        transcription.innerHTML += `<div class="user-message ">${currentTranscript}</div>`;
        transcription.scrollTop = transcription.scrollHeight;
        currentTranscript = "";
      }
      clearInterval(rippleInterval);
      const ripples = document.querySelectorAll(".ripple");
      ripples.forEach((ripple) => ripple.classList.remove("active"));
    } else if (data === "Stopped transcription") {
      status.textContent = "Status: Idle ⏳";
      spinner.style.display = "none";
      listeningModal.style.display = "none";
      notification.style.display = "block";
      setTimeout(() => (notification.style.display = "none"), 2500);
      clearInterval(rippleInterval);
      const ripples = document.querySelectorAll(".ripple");
      ripples.forEach((ripple) => ripple.classList.remove("active"));
    } else if (
      data.startsWith("Error:") ||
      data.startsWith("Transcription error:")
    ) {
      status.textContent = `Error: ${data}`;
      spinner.style.display = "none";
      listeningModal.style.display = "none";
      clearInterval(rippleInterval);
      const ripples = document.querySelectorAll(".ripple");
      ripples.forEach((ripple) => ripple.classList.remove("active"));
    } else if (data === "Already transcribing") {
      status.textContent = "Status: Already transcribing 🎤";
    } else {
      currentTranscript = data;
    }
  };

  ws.onclose = () => {
    console.log("WebSocket closed");
    connectionStatus.textContent = "Disconnected from server 🔌";
    connectionStatus.classList.remove("connected");
    status.textContent = "Status: Disconnected 🔌";
    spinner.style.display = "none";
    clearInterval(rippleInterval);
  };

  ws.onerror = () => {
    connectionStatus.textContent = "Error connecting to server ❌";
    connectionStatus.classList.remove("connected");
    clearInterval(rippleInterval);
  };
}

// Event listeners
startBtn.addEventListener("click", () => {
  initAudioContext();
  isFirstAudio = true;
  listeningModal.style.display = "flex";
  ws.send("start");
});

stopBtn.addEventListener("click", () => {
  ws.send("stop");
});

sendBtn.addEventListener("click", () => {
  const text = chatInput.value.trim();
  if (text) {
    transcription.innerHTML += `<div class="user-message ">${text}</div>`;
    transcription.scrollTop = transcription.scrollHeight;
    ws.send(`text:${text}`);
    chatInput.value = "";
    status.textContent = "Status: Processing response 🤖";
  }
});

chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendBtn.click();
  }
});

newChatBtn.addEventListener("click", async () => {
  const res = await fetch("/new_chat", { method: "POST" });
  const data = await res.json();
  currentChatId = data.chat_id;
  await loadChats();
  await loadCurrentConversation();
  await fetchChatHistory();
  if (ws) ws.close();
  connectWebSocket();
});

// Initialize
initApp();
