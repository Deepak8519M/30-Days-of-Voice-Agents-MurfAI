class VoiceAgentUI {
  constructor() {
    this.startBtn = document.getElementById("startBtn");
    this.stopBtn = document.getElementById("stopBtn");
    this.retryBtn = document.getElementById("retryBtn");
    this.status = document.getElementById("status");
    this.connectionStatus = document.getElementById("connectionStatus");
    this.transcription = document.getElementById("transcription");
    this.transcriptionText = document.getElementById("transcriptionText");
    this.spinner = this.transcription.querySelector(".spinner");
    this.websocket = null;
    this.finalTranscript = "";
    this.audioChunks = [];

    console.log("Initializing VoiceAgentUI 🛠️");
    this.setupWebSocket();
    this.setupEventListeners();
  }

  setupWebSocket() {
    console.log("Setting up WebSocket... 🔌");
    this.websocket = new WebSocket("ws://127.0.0.1:8000/ws");
    this.websocket.onopen = () => {
      console.log("WebSocket connected ✅");
      this.status.textContent = "Status: Connected ✅";
      this.connectionStatus.textContent = "Server connected ✅";
      this.retryBtn.style.display = "none";
      this.startBtn.style.display = "inline-block";
      this.stopBtn.style.display = "none";
      this.status.classList.add("connected");
      this.connectionStatus.classList.add("connected");
      this.audioChunks = [];
      console.log("Audio chunks reset on connection 🔄");
    };

    this.websocket.onmessage = (event) => {
      console.log("Received WebSocket message:", event.data);
      try {
        // Try parsing as JSON for audio data
        const message = JSON.parse(event.data);
        if (message.type === "audio") {
          console.log(
            `Received audio chunk 🎵 (Final: ${message.is_final}, Length: ${message.data.length})`
          );
          this.audioChunks.push(message.data);
          console.log(
            `Audio chunk accumulated (Total: ${this.audioChunks.length})`
          );
          if (message.is_final) {
            console.log("All audio chunks received 📦:", this.audioChunks);
          }
          return;
        }
        console.warn("Unexpected JSON message:", message);
      } catch (e) {
        console.log("Processing as text message 📝");
        const message = event.data.trim();
        const timestamp = new Date().toLocaleTimeString();

        if (
          message &&
          !message.startsWith("Started") &&
          !message.startsWith("Stopped") &&
          !message.startsWith("Already") &&
          !message.startsWith("Unknown") &&
          !message.startsWith("Error") &&
          message !== "turn_ended"
        ) {
          this.transcriptionText.textContent = `[${timestamp}] ${message} 📝`;
          this.spinner.style.display = "inline";
        } else if (message === "turn_ended") {
          this.finalTranscript = this.transcriptionText.textContent.replace(
            "📝",
            "📜"
          );
          this.transcriptionText.textContent = this.finalTranscript;
          this.spinner.style.display = "none";
          this.transcription.classList.add("fade-in");
          setTimeout(() => this.transcription.classList.remove("fade-in"), 500);
          console.log("Transcription ended 📜");
        } else if (message.startsWith("Stopped")) {
          this.stopBtn.style.display = "none";
          this.startBtn.style.display = "inline-block";
          this.status.textContent = "Status: Idle ⏳";
          this.spinner.style.display = "none";
          console.log("Transcription stopped 🛑");
        } else if (message.startsWith("Started")) {
          this.startBtn.style.display = "none";
          this.stopBtn.style.display = "inline-block";
          this.status.textContent = "Status: Transcribing... 🎙️";
          this.spinner.style.display = "inline";
          this.finalTranscript = "";
          this.transcriptionText.textContent = "Transcribing... 🎙️";
          this.audioChunks = [];
          console.log("Transcription started 🎙️");
          console.log("Audio chunks reset for new transcription 🔄");
        } else if (message.startsWith("Error")) {
          this.status.textContent = `Status: Error ⚠️`;
          this.status.classList.add("error");
          this.transcriptionText.textContent = "Error occurred 😞";
          this.spinner.style.display = "none";
          console.log("Error occurred ⚠️:", message);
        } else {
          console.warn("Unhandled text message:", message);
        }
      }
    };

    this.websocket.onerror = (error) => {
      console.error("WebSocket error ❌:", error);
      this.status.textContent = "Status: WebSocket connection failed ❌";
      this.connectionStatus.textContent = "Server disconnected 😞";
      this.status.classList.add("error");
      this.connectionStatus.classList.add("error");
      this.transcriptionText.textContent = "Disconnected 😞";
      this.spinner.style.display = "none";
      this.retryBtn.style.display = "inline-block";
      this.startBtn.style.display = "none";
      this.stopBtn.style.display = "none";
    };

    this.websocket.onclose = () => {
      console.log("WebSocket closed 😞");
      this.status.textContent = "Status: Disconnected from server 😞";
      this.connectionStatus.textContent = "Server disconnected 😞";
      this.status.classList.add("error");
      this.connectionStatus.classList.add("error");
      this.transcriptionText.textContent = "Disconnected 😞";
      this.spinner.style.display = "none";
      this.retryBtn.style.display = "inline-block";
      this.startBtn.style.display = "none";
      this.stopBtn.style.display = "none";
    };
  }

  setupEventListeners() {
    this.startBtn.addEventListener("click", () => {
      if (this.websocket.readyState === WebSocket.OPEN) {
        console.log("Sending start command 🎵");
        this.websocket.send("start");
      } else {
        console.error("WebSocket not open ❌");
      }
    });

    this.stopBtn.addEventListener("click", () => {
      if (this.websocket.readyState === WebSocket.OPEN) {
        console.log("Sending stop command 🛑");
        this.websocket.send("stop");
      } else {
        console.error("WebSocket not open ❌");
      }
    });

    this.retryBtn.addEventListener("click", () => {
      console.log("Retrying WebSocket connection 🔄");
      this.websocket.close();
      this.connectionStatus.textContent = "Reconnecting to server... 🔌";
      this.spinner.style.display = "inline";
      this.setupWebSocket();
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("Initializing VoiceAgentUI 🛠️");
  new VoiceAgentUI();
});
