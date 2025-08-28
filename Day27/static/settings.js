const apiForm = document.getElementById("apiForm");
const notification = document.getElementById("notification");
const backBtn = document.getElementById("backBtn");

// Back button navigation
backBtn.addEventListener("click", () => {
  window.location.href = "/";
});

// Handle form submit
apiForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Collect values (trim and check non-empty)
  const aai = document.getElementById("aai_api_key").value.trim();
  const gemini = document.getElementById("gemini_api_key").value.trim();
  const murf = document.getElementById("murf_api_key").value.trim();
  const tavily = document.getElementById("tavily_api_key").value.trim();
  const zapier = document.getElementById("zapier_webhook_url").value.trim();

  if (!aai || !gemini || !murf || !tavily || !zapier) {
    showNotification("Please fill all API keys.");
    return;
  }

  const keys = {
    aai_api_key: aai,
    gemini_api_key: gemini,
    murf_api_key: murf,
    tavily_api_key: tavily,
    zapier_webhook_url: zapier,
  };

  try {
    const response = await fetch("/set_keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(keys),
    });

    if (response.ok) {
      showNotification("API keys submitted successfully! ✅");
      // Optional: Clear form or redirect after delay
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } else {
      showNotification("Error submitting API keys ❌");
    }
  } catch (error) {
    console.error("Error submitting keys:", error);
    showNotification("Error submitting API keys ❌");
  }
});

// Show notification (reuses main logic, premium gradient)
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
