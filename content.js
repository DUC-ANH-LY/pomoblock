chrome.storage.onChanged.addListener(function (changes, areaName) {
  if (changes.workSession) {
    const { oldValue, newValue } = changes.workSession;
    if (oldValue !== newValue) {
      checkIfShouldBlock();
    }
  }
});

async function checkIfShouldBlock() {
  const { workSession } = await chrome.storage.local.get(["workSession"]);

  if (workSession !== "work") {
    return;
  }

  chrome.storage.local.get(["blockedSites"], (result) => {
    const blockedSites = result.blockedSites || [];
    const currentUrl = window.location.hostname;

    if (blockedSites.some((blockedSite) => currentUrl.includes(blockedSite))) {
      document.body.innerHTML = `
        <div style="text-align: center; padding: 50px; background: #f2f2f2;">
          <h1>Site Blocked</h1>
          <p>This site is blocked during your focus session.</p>
          <p>Keep focusing! 🎯</p>
        </div>
      `;
    }
  });
}

checkIfShouldBlock();

function createMotivationalVideo() {
  const videoContainer = document.createElement("div");
  videoContainer.style.cssText = `
    position: fixed;
    bottom: -20px;
    right: 0px;
    z-index: 999999;
    background: transparent;
  `;

  const video = document.createElement("video");
  video.autoplay = true;
  video.style.cssText = `
    width: 660px;
    height: 400px;
    border-radius: 4px;
    visibility: visible;
  `;
  video.src = chrome.runtime.getURL("assets/do-it.webm");

  videoContainer.appendChild(video);

  document.body.appendChild(videoContainer);
  video.play();

  video.addEventListener("ended", () => {
    videoContainer.remove();
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "SHOW_VIDEO") {
    createMotivationalVideo();
  }
});
