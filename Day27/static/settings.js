const apiForm = document.getElementById("apiForm");
const notification = document.getElementById("notification");
const backBtn = document.getElementById("backBtn");
const enableCustomKeys = document.getElementById("enableCustomKeys");
const submitBtn = document.querySelector("button[type='submit']");
const inputs = document.querySelectorAll(
  "#apiForm input:not([type='checkbox'])"
);

// Toggle input fields and submit button
enableCustomKeys.addEventListener("change", () => {
  const isEnabled = enableCustomKeys.checked;
  inputs.forEach((input) => (input.disabled = !isEnabled));
  submitBtn.disabled = !isEnabled;
});

// Back button navigation
backBtn.addEventListener("click", () => {
  window.location.href = "/";
});

// Show notification
function showNotification(message, isError = false) {
  notification.textContent = message;
  notification.className = `notification px-4 py-2 rounded-lg shadow-lg text-white font-semibold ${
    isError ? "bg-red-600" : "bg-teal-600"
  }`;
  notification.style.display = "block";
  setTimeout(() => {
    notification.style.display = "none";
  }, 4500);
}

// Handle form submission
apiForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!enableCustomKeys.checked) {
    showNotification("Custom API keys disabled; using .env keys.");
    setTimeout(() => (window.location.href = "/"), 2000);
    return;
  }

  const keys = {
    aai_api_key: document.getElementById("aai_api_key").value.trim(),
    gemini_api_key: document.getElementById("gemini_api_key").value.trim(),
    murf_api_key: document.getElementById("murf_api_key").value.trim(),
    override_env: "true",
  };

  if (!keys.aai_api_key || !keys.gemini_api_key || !keys.murf_api_key) {
    showNotification("Please fill all API keys.", true);
    return;
  }

  try {
    const response = await fetch("/set_keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(keys),
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
