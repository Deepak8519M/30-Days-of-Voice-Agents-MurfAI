document.addEventListener("DOMContentLoaded", () => {
  let audioContext,
    source,
    processor,
    isRecording = false,
    socket = null;
  const recordBtn = document.getElementById("recordBtn");
  const statusDisplay = document.getElementById("statusDisplay");
  const transcriptionHistory = document.getElementById("transcriptionHistory");
  const clearBtn = document.getElementById("clearBtn");
  const clearBtnContainer = document.getElementById("clearBtnContainer");

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Audio recording not supported.");
      return;
    }

    isRecording = true;
    statusDisplay.textContent = "Connecting...";
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    socket = new WebSocket(`${wsProtocol}//${window.location.host}/ws`);

    socket.onopen = async () => {
      statusDisplay.textContent = "Connected. Speak now...";
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000,
      });
      source = audioContext.createMediaStreamSource(stream);
      processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          pcmData[i] =
            Math.max(-1, Math.min(1, input[i])) < 0
              ? input[i] * 0x8000
              : input[i] * 0x7fff;
        }
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(pcmData.buffer);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "transcription") {
        addToHistory(data.text);
      } else if (data.type === "error") {
        statusDisplay.textContent = `Error: ${data.message}`;
      } else if (data.type === "status") {
        statusDisplay.textContent = data.message;
      }
    };

    socket.onerror = () => {
      statusDisplay.textContent = "WebSocket error";
      stopRecording(false);
    };

    socket.onclose = () => stopRecording(false);
  };

  const stopRecording = (sendEOF = true) => {
    if (!isRecording) return;
    isRecording = false;

    if (processor) processor.disconnect();
    if (source) source.disconnect();
    if (audioContext) audioContext.close();

    if (socket?.readyState === WebSocket.OPEN && sendEOF) socket.send("EOF");
    if (socket) socket.close();
  };

  const addToHistory = (text) => {
    const div = document.createElement("div");
    div.textContent = text;
    div.className = "transcript-item";
    transcriptionHistory.appendChild(div);
    clearBtnContainer.classList.remove("hidden");
    transcriptionHistory.scrollTop = transcriptionHistory.scrollHeight;
  };

  clearBtn.addEventListener("click", () => {
    transcriptionHistory.innerHTML = "";
    clearBtnContainer.classList.add("hidden");
  });

  recordBtn.addEventListener("click", () => {
    isRecording ? stopRecording() : startRecording();
  });

  window.addEventListener("beforeunload", () => {
    if (isRecording) stopRecording();
  });
});
