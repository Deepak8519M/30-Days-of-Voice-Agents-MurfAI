let ws = null;
let audioContext = null;
let audioQueue = [];
let isPlaying = false;
let nextStartTime = 0;
let isFirstAudio = true;
let currentChatId = "1";
let currentTranscript = "";
let rippleInterval = null;
let mediaStream = null;
let audioAnalyser = null;
let animationSpeed = 1;

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
const volumeSlider = document.getElementById("volumeSlider");
const animationSpeedSelect = document.getElementById("animationSpeed");

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

// Setup Web Audio API for voice volume detection
async function setupAudioAnalyser() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioContext.createMediaStreamSource(mediaStream);
    audioAnalyser = audioContext.createAnalyser();
    audioAnalyser.fftSize = 256;
    source.connect(audioAnalyser);
    console.log("Audio analyser set up");
  } catch (error) {
    console.error("Error setting up audio analyser:", error);
    status.textContent = "Error: Microphone access denied ❌";
  }
}

// Get voice volume
function getVoiceVolume() {
  if (!audioAnalyser) return 0;
  const dataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
  audioAnalyser.getByteFrequencyData(dataArray);
  const average =
    dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
  return average / 255; // Normalize to 0-1
}

// Update ripple size based on volume
function updateRippleSize() {
  const volume = getVoiceVolume();
  const maxScale = 2.5 + volume * 2; // Scale from 2.5 to 4.5 based on volume
  document.documentElement.style.setProperty("--ripple-scale", maxScale);
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
  const gainNode = audioContext.createGain();
  gainNode.gain.value = volumeSlider.value / 100;
  source.connect(gainNode);
  gainNode.connect(audioContext.destination);

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
      <li data-id="${id}" class="${id === currentChatId ? "active" : ""}">
        Conversation ${id}
        <button class="delete-btn" data-id="${id}">🗑️</button>
      </li>
    `
      )
      .join("");
    document.querySelectorAll("#chatList li").forEach((li) => {
      li.addEventListener("click", (e) => {
        if (e.target.classList.contains("delete-btn")) return;
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
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const chatId = btn.dataset.id;
        await deleteChat(chatId);
      });
    });
  } catch (error) {
    console.error("Error loading chats:", error);
  }
}

// Delete chat
async function deleteChat(chatId) {
  try {
    const res = await fetch(`/delete_chat?chat_id=${chatId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      if (chatId === currentChatId) {
        const chats = await (await fetch("/chats")).json();
        currentChatId = chats.length ? chats[chats.length - 1] : null;
        if (currentChatId) {
          await loadCurrentConversation();
          await fetchChatHistory();
          if (ws) ws.close();
          connectWebSocket();
        } else {
          transcription.innerHTML = "";
          chatHistory.innerHTML =
            "<span class='text'>No chat history yet.</span>";
        }
      }
      await loadChats();
      notification.textContent = "Conversation deleted! 🗑️";
      notification.style.display = "block";
      setTimeout(() => {
        notification.style.display = "none";
      }, 2500);
    } else {
      throw new Error("Failed to delete chat");
    }
  } catch (error) {
    console.error("Error deleting chat:", error);
    notification.textContent = "Error deleting conversation ❌";
    notification.style.display = "block";
    setTimeout(() => {
      notification.style.display = "none";
    }, 2500);
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
        <div class="user-message">${entry.user_query}</div>
        <div class="ai-message">${entry.ai_response}</div>
      `
        )
        .join("");
    }
  } catch (error) {
    console.error("Error loading current conversation:", error);
  }
}

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
  if (!currentChatId) return;
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
          // Trigger ripple effect during audio playback
          const ripples = document.querySelectorAll(".ripple");
          ripples.forEach((ripple) => ripple.classList.add("active"));
        } else if (jsonData.type === "response" && jsonData.data) {
          // Append AI response to transcription
          transcription.innerHTML += `<div class="ai-message">${jsonData.data}</div>`;
          transcription.scrollTop = transcription.scrollHeight;
          // Refresh chat history
          await fetchChatHistory();
          // Reset ripple effect
          const ripples = document.querySelectorAll(".ripple");
          ripples.forEach((ripple) => ripple.classList.remove("active"));
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
      // Start audio analyser and ripple animation
      await setupAudioAnalyser();
      rippleInterval = setInterval(() => {
        updateRippleSize();
        const ripples = document.querySelectorAll(".ripple");
        ripples.forEach((ripple) => {
          ripple.classList.remove("active");
          setTimeout(() => ripple.classList.add("active"), 50);
        });
      }, 1500 / animationSpeed);
    } else if (data === "turn_ended") {
      spinner.style.display = "none";
      status.textContent = "Status: Processing response 🤖";
      listeningModal.style.display = "none";
      if (currentTranscript) {
        transcription.innerHTML += `<div class="user-message">${currentTranscript}</div>`;
        transcription.scrollTop = transcription.scrollHeight;
        currentTranscript = "";
      }
      clearInterval(rippleInterval);
      const ripples = document.querySelectorAll(".ripple");
      ripples.forEach((ripple) => ripple.classList.remove("active"));
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        mediaStream = null;
        audioAnalyser = null;
      }
    } else if (data === "Stopped transcription") {
      status.textContent = "Status: Idle ⏳";
      spinner.style.display = "none";
      listeningModal.style.display = "none";
      // Show notification
      notification.style.display = "block";
      setTimeout(() => {
        notification.style.display = "none";
      }, 2500);
      clearInterval(rippleInterval);
      const ripples = document.querySelectorAll(".ripple");
      ripples.forEach((ripple) => ripple.classList.remove("active"));
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        mediaStream = null;
        audioAnalyser = null;
      }
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
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        mediaStream = null;
        audioAnalyser = null;
      }
    } else if (data === "Already transcribing") {
      status.textContent = "Status: Already transcribing 🎤";
    } else {
      // Update current transcript (but don't display until final)
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
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
      audioAnalyser = null;
    }
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
    transcription.innerHTML += `<div class="user-message">${text}</div>`;
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

volumeSlider.addEventListener("input", () => {
  if (audioContext) {
    const gainNode = audioContext.createGain();
    gainNode.gain.value = volumeSlider.value / 100;
  }
});

animationSpeedSelect.addEventListener("change", () => {
  animationSpeed = parseFloat(animationSpeedSelect.value);
  if (rippleInterval) {
    clearInterval(rippleInterval);
    rippleInterval = setInterval(() => {
      updateRippleSize();
      const ripples = document.querySelectorAll(".ripple");
      ripples.forEach((ripple) => {
        ripple.classList.remove("active");
        setTimeout(() => ripple.classList.add("active"), 50);
      });
    }, 1500 / animationSpeed);
  }
});

// Initialize
initApp();
