let ws = null;
let audioContext = null;
let audioQueue = [];
let isPlaying = false;
let nextStartTime = 0;
let isFirstAudio = true;
let currentChatId = "1";
let rippleInterval = null;
let lastUserMessage = null;

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
const settingsBtn = document.getElementById("settingsBtn");

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
  // Resume AudioContext if suspended
  if (audioContext.state === "suspended") {
    audioContext.resume().then(() => {
      console.log("AudioContext resumed");
    });
  }
}

// Decode base64 to ArrayBuffer
function base64ToArrayBuffer(base64) {
  try {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (error) {
    console.error("Error decoding base64:", error);
    return null;
  }
}

// Queue audio chunk
async function queueAudio(base64Audio, isFinal) {
  try {
    if (!base64Audio) {
      console.error("Empty audio data received");
      status.textContent = "Error: No audio data received ❌";
      return;
    }
    let pcmBuffer = base64ToArrayBuffer(base64Audio);
    if (!pcmBuffer) {
      console.error("Failed to decode audio data");
      status.textContent = "Error: Failed to decode audio data ❌";
      return;
    }
    if (isFirstAudio) {
      console.log("First audio chunk: skipping 44-byte WAV header");
      pcmBuffer = pcmBuffer.slice(44);
      isFirstAudio = false;
    }

    const int16 = new Int16Array(pcmBuffer);
    if (int16.length === 0) {
      console.error("Empty audio buffer after conversion");
      status.textContent = "Error: Empty audio buffer ❌";
      return;
    }
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
    }
    playNextAudio();
  };
}

// Append user message to transcription
function appendUserMessage(text, isFinal) {
  // Remove previous user message if it exists
  if (lastUserMessage) {
    lastUserMessage.remove();
    lastUserMessage = null;
  }
  const message = document.createElement("div");
  message.classList.add("user-message");
  if (!isFinal) {
    message.classList.add("temporary");
    message.textContent = text + " (transcribing...)";
  } else {
    message.textContent = text;
  }
  transcription.appendChild(message);
  lastUserMessage = message;
  transcription.scrollTop = transcription.scrollHeight;
}

// Append AI message to transcription
function appendAIMessage(text) {
  const message = document.createElement("div");
  message.classList.add("ai-message");
  message.textContent = text;

  const speakBtn = document.createElement("button");
  speakBtn.classList.add("speak-btn", "glossy");
  speakBtn.innerHTML = "🔊";
  speakBtn.title = "Speak this message";
  speakBtn.addEventListener("click", async () => {
    try {
      if (ws && ws.readyState === WebSocket.OPEN) {
        status.textContent = "Status: Generating audio 🎵";
        ws.send(`speak:${text}`);
        initAudioContext();
        isFirstAudio = true;
      } else {
        showNotification("WebSocket not connected ❌");
        status.textContent = "Status: Error ❌";
      }
    } catch (error) {
      console.error("Error triggering speech:", error);
      showNotification("Error generating audio ❌");
      status.textContent = "Status: Error ❌";
    }
  });

  message.appendChild(speakBtn);
  transcription.appendChild(message);
  transcription.scrollTop = transcription.scrollHeight;
}

// Append search result to transcription
function appendSearchResult(text) {
  const message = document.createElement("div");
  message.classList.add("search-result", "message-glossy");
  message.textContent = text;
  transcription.appendChild(message);
  transcription.scrollTop = transcription.scrollHeight;
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
          id === currentChatId ? "active glossy" : "glossy"
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
    showNotification("Error loading chats ❌");
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
    showNotification("Error loading chat history ❌");
  }
}

// Load current conversation into transcription
async function loadCurrentConversation() {
  try {
    const response = await fetch(`/chat_history?chat_id=${currentChatId}`);
    const history = await response.json();
    if (Array.isArray(history)) {
      transcription.innerHTML =
        '<span class="spinner" style="display: none">⏳</span>';
      lastUserMessage = null;
      history.forEach((entry) => {
        appendUserMessage(entry.user_query, true);
        appendAIMessage(entry.ai_response);
        lastUserMessage = null; // Reset after each pair
      });
    }
  } catch (error) {
    console.error("Error loading current conversation:", error);
    showNotification("Error loading conversation ❌");
  }
}

// Show notification with gradient animation
function showNotification(message) {
  notification.textContent = message;
  notification.style.background = "linear-gradient(135deg, #ff6b00, #ffa500)";
  notification.style.display = "block";
  notification.style.animation =
    "slideIn 0.5s ease-in-out, fadeOut 0.5s ease-in-out 2s forwards";
  setTimeout(() => {
    notification.style.display = "none";
  }, 2500);
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
    console.log(
      "WebSocket message received:",
      event.data.substring(0, 100) + "..."
    );

    try {
      const jsonData = JSON.parse(event.data);
      if (jsonData.type === "user_message" && jsonData.data) {
        appendUserMessage(jsonData.data, jsonData.is_final);
      } else if (jsonData.type === "audio" && jsonData.data) {
        console.log(
          "Audio chunk received, is_final:",
          jsonData.is_final,
          "length:",
          jsonData.data.length
        );
        initAudioContext();
        await queueAudio(jsonData.data, jsonData.is_final);
        const ripples = document.querySelectorAll(".ripple");
        ripples.forEach((ripple) => ripple.classList.add("active"));
      } else if (jsonData.type === "response" && jsonData.data) {
        appendAIMessage(jsonData.data);
        await fetchChatHistory();
        const ripples = document.querySelectorAll(".ripple");
        ripples.forEach((ripple) => ripple.classList.remove("active"));
      } else if (jsonData.type === "search" && jsonData.data) {
        appendSearchResult(jsonData.data);
        await fetchChatHistory();
        const ripples = document.querySelectorAll(".ripple");
        ripples.forEach((ripple) => ripple.classList.remove("active"));
      } else if (jsonData.type === "zapier" && jsonData.data) {
        showNotification(jsonData.data);
        appendAIMessage(jsonData.data);
        await fetchChatHistory();
      } else if (jsonData.type === "error" && jsonData.data) {
        showNotification(`Error: ${jsonData.data}`);
        status.textContent = `Error: ${jsonData.data}`;
        const ripples = document.querySelectorAll(".ripple");
        ripples.forEach((ripple) => ripple.classList.remove("active"));
      } else if (jsonData.type === "info" && jsonData.data) {
        showNotification(jsonData.data);
      } else if (jsonData.type === "turn_ended") {
        status.textContent = "Status: Processing response 🤖";
        spinner.style.display = "none";
        listeningModal.style.display = "none";
        clearInterval(rippleInterval);
        const ripples = document.querySelectorAll(".ripple");
        ripples.forEach((ripple) => ripple.classList.remove("active"));
      } else if (jsonData.type === "speak_audio" && jsonData.data) {
        console.log(
          "Speak audio chunk received, is_final:",
          jsonData.is_final,
          "length:",
          jsonData.data.length
        );
        initAudioContext();
        await queueAudio(jsonData.data, jsonData.is_final);
      } else {
        console.warn("Invalid JSON message format:", jsonData);
      }
    } catch (e) {
      // Handle legacy text messages
      const data = event.data;
      if (data === "Started transcription") {
        status.textContent = "Status: Transcribing 🎤";
        spinner.style.display = "inline-block";
        listeningModal.style.display = "flex";
        rippleInterval = setInterval(() => {
          const ripples = document.querySelectorAll(".ripple");
          ripples.forEach((ripple) => {
            ripple.classList.remove("active");
            setTimeout(() => ripple.classList.add("active"), 50);
          });
        }, 1500);
      } else if (data === "Stopped transcription") {
        status.textContent = "Status: Idle ⏳";
        spinner.style.display = "none";
        listeningModal.style.display = "none";
        showNotification("Transcription stopped ✅");
        clearInterval(rippleInterval);
        const ripples = document.querySelectorAll(".ripple");
        ripples.forEach((ripple) => ripple.classList.remove("active"));
      } else if (data === "Already transcribing") {
        status.textContent = "Status: Already transcribing 🎤";
        showNotification("Already transcribing!");
      } else if (
        data.startsWith("Error:") ||
        data.startsWith("Transcription error:")
      ) {
        status.textContent = `Error: ${data}`;
        spinner.style.display = "none";
        listeningModal.style.display = "none";
        showNotification(`Error: ${data}`);
        clearInterval(rippleInterval);
        const ripples = document.querySelectorAll(".ripple");
        ripples.forEach((ripple) => ripple.classList.remove("active"));
      } else {
        console.warn("Unhandled text message:", data);
      }
    }
  };

  ws.onclose = () => {
    console.log("WebSocket closed");
    connectionStatus.textContent = "Disconnected from server 🔌";
    connectionStatus.classList.remove("connected");
    status.textContent = "Status: Disconnected 🔌";
    spinner.style.display = "none";
    clearInterval(rippleInterval);
    setTimeout(connectWebSocket, 5000);
  };

  ws.onerror = () => {
    console.error("WebSocket error");
    connectionStatus.textContent = "Error connecting to server ❌";
    connectionStatus.classList.remove("connected");
    status.textContent = "Status: Error ❌";
    clearInterval(rippleInterval);
  };
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
    showNotification(result.message);
    appendAIMessage(result.message);
    fileInput.value = "";
  } catch (error) {
    console.error("Error uploading file:", error);
    showNotification("Error uploading file ❌");
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
    showNotification("Error initializing app ❌");
  }
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  // Start microphone
  startBtn.addEventListener("click", () => {
    initAudioContext();
    isFirstAudio = true;
    lastUserMessage = null; // Reset user message
    listeningModal.style.display = "flex";
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send("start");
    } else {
      showNotification("WebSocket not connected ❌");
    }
  });

  // Stop microphone
  stopBtn.addEventListener("click", () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send("stop");
    }
  });

  // Send text query
  sendBtn.addEventListener("click", () => {
    const text = chatInput.value.trim();
    if (text && ws && ws.readyState === WebSocket.OPEN) {
      appendUserMessage(text, true);
      ws.send(`text:${text}`);
      chatInput.value = "";
      status.textContent = "Status: Processing response 🤖";
    } else if (!ws || ws.readyState !== WebSocket.OPEN) {
      showNotification("WebSocket not connected ❌");
    }
  });

  // Send text query on Enter key
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendBtn.click();
    }
  });

  // New chat
  newChatBtn.addEventListener("click", async () => {
    try {
      const res = await fetch("/new_chat", { method: "POST" });
      const data = await res.json();
      currentChatId = data.chat_id;
      transcription.innerHTML =
        '<span class="spinner" style="display: none">⏳</span>';
      lastUserMessage = null;
      await loadChats();
      await loadCurrentConversation();
      await fetchChatHistory();
      if (ws) ws.close();
      connectWebSocket();
    } catch (error) {
      console.error("Error creating new chat:", error);
      showNotification("Error creating new chat ❌");
    }
  });

  // Navigate to settings page
  settingsBtn.addEventListener("click", () => {
    window.location.href = "/settings";
  });

  // Initialize app
  initApp();
});
