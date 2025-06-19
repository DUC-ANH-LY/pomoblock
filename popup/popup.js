import { localizeHtmlPage } from "../utils/translations.js";

document.addEventListener("DOMContentLoaded", () => {
  localizeHtmlPage();
  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const resetBtn = document.getElementById("resetBtn");
  const minutesDisplay = document.getElementById("minutes");
  const secondsDisplay = document.getElementById("seconds");
  const statusDisplay = document.getElementById("status");

  startBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "START_TIMER" });
  });

  pauseBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "PAUSE_TIMER" });
  });

  resetBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "RESET_TIMER" });
  });

  function updateDisplay(state) {
    const minutes = Math.floor(state.currentTime / 60);
    const seconds = state.currentTime % 60;

    minutesDisplay.textContent = minutes.toString().padStart(2, "0");
    secondsDisplay.textContent = seconds.toString().padStart(2, "0");
    statusDisplay.textContent = state.isWorkSession
      ? chrome.i18n.getMessage("workTime")
      : chrome.i18n.getMessage("breakTime");

    startBtn.disabled = state.isRunning;
    pauseBtn.disabled = !state.isRunning;
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "STATE_UPDATE") {
      updateDisplay(message.state);
    }
  });

  chrome.runtime.sendMessage({ action: "GET_STATE" }, (response) => {
    if (response) {
      updateDisplay(response);
    }
  });
});
