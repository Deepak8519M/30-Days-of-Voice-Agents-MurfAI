let ws = null;
let audioContext = null;
let audioQueue = [];
let isPlaying = false;
let nextStartTime = 0;

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const retryBtn = document.getElementById("retryBtn");
const status = document.getElementById("status");
const transcriptionText = document.getElementById("transcriptionText");
const spinner = document.querySelector(".spinner");
const connectionStatus = document.getElementById("connectionStatus");

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
    console.log("WebSocket message received:", data);

    // Handle JSON audio data
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
        } else {
          console.warn("Invalid audio message format:", jsonData);
        }
      } catch (e) {
        console.error("Error parsing JSON message:", e);
        status.textContent = "Error: Invalid audio data received ❌";
      }
      return;
    }

    // Handle text messages
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
      transcriptionText.textContent = data;
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

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
    connectionStatus.textContent = "Error connecting to server ❌";
    connectionStatus.classList.remove("connected");
    startBtn.disabled = true;
  };
}

// Initialize AudioContext
function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    console.log(
      "AudioContext initialized, sampleRate:",
      audioContext.sampleRate
    );
  }
}

// Create WAV header for raw PCM data
function createWavHeader(
  dataLength,
  sampleRate = 16000,
  channels = 1,
  bitsPerSample = 16
) {
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true); // Chunk size
  writeString(view, 8, "WAVE");

  // fmt sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // Sub-chunk size
  view.setUint16(20, 1, true); // Audio format (PCM = 1)
  view.setUint16(22, channels, true); // Number of channels
  view.setUint32(24, sampleRate, true); // Sample rate
  view.setUint32(28, (sampleRate * channels * bitsPerSample) / 8, true); // Byte rate
  view.setUint16(32, (channels * bitsPerSample) / 8, true); // Block align
  view.setUint16(34, bitsPerSample, true); // Bits per sample

  // data sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true); // Data size

  return buffer;
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Decode base64 audio and queue for playback
async function queueAudio(base64Audio, isFinal) {
  try {
    if (!base64Audio || typeof base64Audio !== "string") {
      throw new Error("Invalid base64 audio data");
    }

    console.log("Decoding audio chunk, length:", base64Audio.length);
    const audioData = atob(base64Audio);
    const pcmArray = new Uint8Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      pcmArray[i] = audioData.charCodeAt(i);
    }

    // Assume Murf sends raw PCM; create WAV header
    const wavHeader = createWavHeader(pcmArray.length);
    const wavArray = new Uint8Array(wavHeader.byteLength + pcmArray.length);
    wavArray.set(new Uint8Array(wavHeader), 0);
    wavArray.set(pcmArray, wavHeader.byteLength);

    const audioBuffer = await audioContext.decodeAudioData(wavArray.buffer);
    console.log(
      "Audio decoded, duration:",
      audioBuffer.duration,
      "isFinal:",
      isFinal
    );
    audioQueue.push({ buffer: audioBuffer, isFinal });
    playNextAudio();
  } catch (error) {
    console.error("Error decoding audio:", error);
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
  console.log(
    "Playing audio chunk, duration:",
    buffer.duration,
    "startTime:",
    nextStartTime
  );

  source.onended = () => {
    isPlaying = false;
    if (isFinal) {
      audioQueue = [];
      nextStartTime = 0;
      console.log("Audio playback completed");
      status.textContent = "Status: Audio playback complete ✅";
    } else {
      playNextAudio();
    }
  };
}

// Event listeners
startBtn.addEventListener("click", () => {
  initAudioContext();
  ws.send("start");
  console.log("Start transcription requested");
});

stopBtn.addEventListener("click", () => {
  ws.send("stop");
  console.log("Stop transcription requested");
});

retryBtn.addEventListener("click", () => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send("start");
    console.log("Retry transcription requested");
  } else {
    connectWebSocket();
    status.textContent = "Status: Reconnecting... 🔄";
    console.log("Reconnecting WebSocket");
  }
});

// Initialize
connectWebSocket();
