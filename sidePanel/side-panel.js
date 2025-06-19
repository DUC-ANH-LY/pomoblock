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
  }
});

document.getElementById("getVideo").addEventListener("click", async () => {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "SHOW_VIDEO",
      });
    }
  });
});
