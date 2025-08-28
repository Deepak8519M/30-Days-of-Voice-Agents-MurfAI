const apiForm = document.getElementById("apiForm");
const notification = document.getElementById("notification");
const backBtn = document.getElementById("backBtn");
const enableCustomKeys = document.getElementById("enableCustomKeys");
const submitBtn = document.querySelector(".submit-btn");
const inputs = document.querySelectorAll(
  "#apiForm input:not([type='checkbox'])"
);

// Toggle input fields and submit button based on checkbox
enableCustomKeys.addEventListener("change", () => {
  const isEnabled = enableCustomKeys.checked;
  inputs.forEach((input) => (input.disabled = !isEnabled));
  submitBtn.disabled = !isEnabled;
});

// Back button navigation
backBtn.addEventListener("click", () => {
  window.location.href = "/";
});

// Show notification with dynamic gradient based on message type
function showNotification(message, isError = false) {
  notification.textContent = message;
  notification.style.background = isError
    ? "linear-gradient(135deg, #f87171, #dc2626)"
    : "linear-gradient(135deg, #14b8a6, #0d9488)";
  notification.style.display = "block";
  notification.style.animation =
    "slideIn 0.5s ease-in-out, fadeOut 0.5s ease-in-out 4s forwards";
  setTimeout(() => {
    notification.style.display = "none";
  }, 4500);
}

// Handle form submit
apiForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!enableCustomKeys.checked) {
    showNotification("Custom API keys disabled; using .env keys.");
    setTimeout(() => {
      window.location.href = "/";
    }, 2000);
    return;
  }

  // Collect values (trim and check non-empty)
  const aai = document.getElementById("aai_api_key").value.trim();
  const gemini = document.getElementById("gemini_api_key").value.trim();
  const murf = document.getElementById("murf_api_key").value.trim();
  const tavily = document.getElementById("tavily_api_key").value.trim();
  const zapier = document.getElementById("zapier_webhook_url").value.trim();

  if (!aai || !gemini || !murf || !tavily || !zapier) {
    showNotification("Please fill all API keys.", true);
    return;
  }

  const keys = {
    aai_api_key: aai,
    gemini_api_key: gemini,
    murf_api_key: murf,
    tavily_api_key: tavily,
    zapier_webhook_url: zapier,
    override_env: "true", // Set to true when submitting custom keys
  };

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
      showNotification(result.message);
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    }
  } catch (error) {
    console.error("Error submitting keys:", error);
    showNotification("Error submitting API keys ❌", true);
  }
});
