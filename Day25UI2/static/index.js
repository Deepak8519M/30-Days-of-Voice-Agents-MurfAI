let ws = null;
let audioContext = null;
let audioQueue = [];
let isPlaying = false;
let nextStartTime = 0;
let isFirstAudio = true;
let finalTranscript = null;

const SAMPLE_RATE = 44100;
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const retryBtn = document.getElementById("retryBtn");
const status = document.getElementById("status");
const chatWindow = document.getElementById("chatWindow");
const chatHistory = document.getElementById("chatHistory");
const connectionStatus = document.getElementById("connectionStatus");

function connectWebSocket() {
  ws = new WebSocket("ws://" + window.location.host + "/ws");

  ws.onopen = () => {
    console.log("WebSocket opened");
    connectionStatus.textContent = "Connected to the storyteller’s realm! 📚";
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
          if (finalTranscript) {
            appendToChatWindow(finalTranscript, jsonData.data);
          }
          await fetchChatHistory();
        } else {
          console.warn("Invalid JSON message format:", jsonData);
        }
      } catch (e) {
        console.error("Error parsing JSON message:", e);
        status.textContent = "Error: A snag in the tale! ❌";
      }
      return;
    }

    if (data === "Started transcription") {
      status.textContent = "Status: Scribing your words, listener! 🎤";
      finalTranscript = null;
      startBtn.style.display = "none";
      stopBtn.style.display = "inline-block";
      retryBtn.style.display = "none";
    } else if (data === "turn_ended") {
      status.textContent = "Status: Weaving a new chapter! 🤖";
    } else if (data.startsWith("Stopped transcription")) {
      status.textContent = "Status: Paused, awaiting your next tale! ⏳";
      startBtn.style.display = "inline-block";
      stopBtn.style.display = "none";
      retryBtn.style.display = "inline-block";
      if (data.includes("saved")) {
        const filename = data.match(/saved: (.+)$/)[1];
        appendToChatWindow(null, `Your words saved as ${filename}, listener!`);
      }
    } else if (
      data.startsWith("Error:") ||
      data.startsWith("Transcription error:")
    ) {
      status.textContent = `Error: ${data}`;
      startBtn.style.display = "inline-block";
      stopBtn.style.display = "none";
      retryBtn.style.display = "inline-block";
    } else if (data === "Already transcribing") {
      status.textContent = "Status: Already scribing your tale! 🎤";
    } else {
      finalTranscript = data; // Store final formatted transcription
    }
  };

  ws.onclose = () => {
    console.log("WebSocket closed");
    connectionStatus.textContent = "Lost the storyteller’s realm! 🔌";
    connectionStatus.classList.remove("connected");
    startBtn.disabled = true;
    stopBtn.style.display = "none";
    retryBtn.style.display = "inline-block";
    status.textContent = "Status: Stranded from the tale! 🔌";
  };

  ws.onerror = () => {
    connectionStatus.textContent =
      "Trouble reaching the storyteller’s realm! ❌";
    connectionStatus.classList.remove("connected");
    startBtn.disabled = true;
  };
}

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

function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

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
    status.textContent = "Error: Trouble voicing the tale! ❌";
  }
}

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
      status.textContent = "Status: Tale woven and told! ✅";
    } else {
      playNextAudio();
    }
  };
}

function appendToChatWindow(userQuery, aiResponse) {
  if (!userQuery && !aiResponse) return;

  const chatEntry = document.createElement("div");
  chatEntry.className = "chat-entry";

  if (userQuery) {
    const userDiv = document.createElement("div");
    userDiv.className = "user-query";
    userDiv.textContent = `Listener: ${userQuery}`;
    chatEntry.appendChild(userDiv);
  }

  if (aiResponse) {
    const aiDiv = document.createElement("div");
    aiDiv.className = "ai-response";
    aiDiv.textContent = `Storyteller: ${aiResponse}`;
    chatEntry.appendChild(aiDiv);
  }

  chatWindow.appendChild(chatEntry);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  if (chatWindow.querySelector(".text")) {
    chatWindow.removeChild(chatWindow.querySelector(".text"));
  }
}

async function fetchChatHistory() {
  try {
    const response = await fetch("/chat_history");
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
                  <div class="user-query">Listener: ${entry.user_query}</div>
                  <div class="ai-response">Storyteller: ${
                    entry.ai_response
                  }</div>
                </div>
              `
            )
            .join("")
        : "<span class='text'>No tales in the chronicles yet, listener!</span>";
    } else {
      chatHistory.innerHTML =
        "<span class='text'>Error loading the chronicles!</span>";
    }
  } catch (error) {
    console.error("Error fetching chat history:", error);
    chatHistory.innerHTML =
      "<span class='text'>Error loading the chronicles!</span>";
  }
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
    status.textContent = "Status: Returning to the tale... 🔄";
  }
});

connectWebSocket();
fetchChatHistory();
