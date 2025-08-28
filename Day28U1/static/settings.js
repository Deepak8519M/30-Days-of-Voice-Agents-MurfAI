const sidebarItems = document.querySelectorAll(".settings-sidebar li");
const cards = document.querySelectorAll(".settings-card");
const apiForm = document.getElementById("apiForm");
const settingsForm = document.querySelector(".settings-main");
const notification = document.getElementById("notification");
const cancelBtn = document.querySelector(".cancel-btn");
const saveBtn = document.querySelector(".settings-footer .save-btn");
const resetBtn = document.querySelector(".reset-btn");
const enableCustomKeys = document.getElementById("enableCustomKeys");
const apiInputs = document.querySelectorAll(
  "#apiForm input[type='password'], #apiForm input[type='text']"
);
const sliders = document.querySelectorAll(".slider");

// Sidebar navigation
sidebarItems.forEach((item) => {
  item.addEventListener("click", () => {
    sidebarItems.forEach((i) => i.classList.remove("active"));
    item.classList.add("active");
    cards.forEach((card) => card.classList.remove("active"));
    const sectionId = item.getAttribute("data-section");
    document.getElementById(sectionId).classList.add("active");
  });
});

// Toggle API inputs
enableCustomKeys.addEventListener("change", () => {
  const isEnabled = enableCustomKeys.checked;
  apiInputs.forEach((input) => (input.disabled = !isEnabled));
});

// Update slider values
sliders.forEach((slider) => {
  const valueSpan = slider.nextElementSibling;
  slider.addEventListener("input", () => {
    valueSpan.textContent =
      slider.name === "micSensitivity"
        ? `${slider.value}%`
        : `${slider.value}x`;
  });
});

// Show notification
function showNotification(message, isError = false) {
  notification.textContent = message;
  notification.className = `notification ${isError ? "bg-red-600" : ""}`;
  notification.style.display = "block";
  const duration =
    parseInt(
      document.querySelector("input[name='notificationDuration']").value
    ) * 1000 || 4000;
  setTimeout(() => {
    notification.style.display = "none";
  }, duration);
}

// API form submission
apiForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const settings = {
    enableCustomKeys: enableCustomKeys.checked,
    aai_api_key: document
      .querySelector("#apiForm input[name='aai_api_key']")
      .value.trim(),
    gemini_api_key: document
      .querySelector("#apiForm input[name='gemini_api_key']")
      .value.trim(),
    murf_api_key: document
      .querySelector("#apiForm input[name='murf_api_key']")
      .value.trim(),
    tavily_api_key: document
      .querySelector("#apiForm input[name='tavily_api_key']")
      .value.trim(),
    zapier_webhook_url: document
      .querySelector("#apiForm input[name='zapier_webhook_url']")
      .value.trim(),
    override_env: enableCustomKeys.checked ? "true" : "false",
  };

  if (
    settings.enableCustomKeys &&
    (!settings.aai_api_key ||
      !settings.gemini_api_key ||
      !settings.murf_api_key ||
      !settings.tavily_api_key)
  ) {
    showNotification("Please fill all required API keys.", true);
    return;
  }

  try {
    const response = await fetch("/set_keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const result = await response.json();
    if (result.error) {
      showNotification(`${result.error} Falling back to .env keys.`, true);
    } else {
      showNotification("API keys saved successfully!");
    }
    setTimeout(() => (window.location.href = "/"), 2000);
  } catch (error) {
    showNotification("Error saving API keys. Falling back to .env keys.", true);
    setTimeout(() => (window.location.href = "/"), 2000);
  }
});

// General settings submission
saveBtn.addEventListener("click", async () => {
  const settings = {
    voiceId: document.querySelector("select[name='voiceId']").value,
    playbackSpeed: parseFloat(
      document.querySelector("input[name='playbackSpeed']").value
    ),
    conversationType: document.querySelector("select[name='conversationType']")
      .value,
    micSensitivity: parseInt(
      document.querySelector("input[name='micSensitivity']").value
    ),
    audioQuality: document.querySelector("select[name='audioQuality']").value,
    autoSaveHistory: document.querySelector("input[name='autoSaveHistory']")
      .checked,
    includeKnowledgeBase: document.querySelector(
      "input[name='includeKnowledgeBase']"
    ).checked,
    enableSearch: document.querySelector("input[name='enableSearch']").checked,
    maxSearchResults: parseInt(
      document.querySelector("input[name='maxSearchResults']").value
    ),
    enableSound: document.querySelector("input[name='enableSound']").checked,
    notificationDuration: parseInt(
      document.querySelector("input[name='notificationDuration']").value
    ),
    theme: document.querySelector("select[name='theme']").value,
    accentColor: document.querySelector("select[name='accentColor']").value,
  };

  try {
    const response = await fetch("/set_settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const result = await response.json();
    if (result.error) {
      showNotification(`Error saving settings: ${result.error}`, true);
    } else {
      showNotification("Settings saved successfully!");
    }
    setTimeout(() => (window.location.href = "/"), 2000);
  } catch (error) {
    showNotification("Error saving settings.", true);
    setTimeout(() => (window.location.href = "/"), 2000);
  }
});

// Cancel button
cancelBtn.addEventListener("click", () => {
  window.location.href = "/";
});

// Reset to defaults
resetBtn.addEventListener("click", async () => {
  try {
    const response = await fetch("/reset_settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reset: true }),
    });
    const result = await response.json();
    if (result.error) {
      showNotification(`Error resetting settings: ${result.error}`, true);
    } else {
      showNotification("Settings reset to defaults!");
      settingsForm.querySelectorAll("input, select").forEach((input) => {
        if (input.type === "checkbox")
          input.checked =
            input.name === "enableSound" ||
            input.name === "autoSaveHistory" ||
            input.name === "includeKnowledgeBase" ||
            input.name === "enableSearch";
        else if (input.type === "range")
          input.value = input.name === "micSensitivity" ? "50" : "1.0";
        else if (input.type === "number")
          input.value = input.name === "notificationDuration" ? "4" : "3";
        else if (input.type === "password" || input.type === "text")
          input.value = "";
        else if (input.tagName === "SELECT")
          input.value = input.options[0].value;
      });
      sliders.forEach((slider) => {
        const valueSpan = slider.nextElementSibling;
        valueSpan.textContent =
          slider.name === "micSensitivity"
            ? `${slider.value}%`
            : `${slider.value}x`;
      });
      enableCustomKeys.dispatchEvent(new Event("change"));
    }
  } catch (error) {
    showNotification("Error resetting settings.", true);
  }
});

// Clear chat history
document.getElementById("clearHistory").addEventListener("click", async () => {
  try {
    const response = await fetch("/clear_chat_history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clear: true }),
    });
    const result = await response.json();
    if (result.error) {
      showNotification(`Error clearing chat history: ${result.error}`, true);
    } else {
      showNotification("Chat history cleared successfully!");
    }
  } catch (error) {
    showNotification("Error clearing chat history.", true);
  }
});

// Clear knowledge base
document
  .getElementById("clearKnowledgeBase")
  .addEventListener("click", async () => {
    try {
      const response = await fetch("/clear_knowledge_base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clear: true }),
      });
      const result = await response.json();
      if (result.error) {
        showNotification(
          `Error clearing knowledge base: ${result.error}`,
          true
        );
      } else {
        showNotification("Knowledge base cleared successfully!");
      }
    } catch (error) {
      showNotification("Error clearing knowledge base.", true);
    }
  });
