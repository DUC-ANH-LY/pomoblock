document.getElementById("getMotivation").addEventListener("click", async () => {
  try {
    const fetchApi = await fetch("https://zenquotes.io/api/quotes");
    const quotes = await fetchApi.json();

    const randomIndex = Math.floor(Math.random() * quotes.length);

    // console.log("AUTHOR", quotes;

    document.getElementById("motivationText").textContent =
      quotes[randomIndex].q;
  } catch (error) {
    console.error("Error getting motivation:", error);
    document.getElementById("motivationText").textContent =
      "Stay focused and productive! You've got this!";
  }
});

document.getElementById("getVideo").addEventListener("click", async () => {
  try {
    console.log("🎯 Requesting motivation boost...");

    // Send message to background script to show notification
    const response = await chrome.runtime.sendMessage({
      action: "INJECT_VIDEO"
    });

    if (response && response.success) {
      console.log("✅ Motivation boost sent successfully");

      // Show feedback in the panel
      const motivationText = document.getElementById("motivationText");
      motivationText.textContent = "🎯 Motivation boost sent! Check your notifications.";
      motivationText.style.color = "#4caf50";

      // Reset after 3 seconds
      setTimeout(() => {
        motivationText.style.color = "";
        motivationText.textContent = "";
      }, 3000);

    } else {
      console.log("⚠️ Motivation boost may have failed");
    }

  } catch (error) {
    console.error("❌ Error sending motivation boost:", error);

    // Show user-friendly error message
    const motivationText = document.getElementById("motivationText");
    motivationText.textContent = "Unable to send motivation boost. Please try again.";
    motivationText.style.color = "#ff6b6b";

    // Reset color after 3 seconds
    setTimeout(() => {
      motivationText.style.color = "";
    }, 3000);
  }
});
