let timer = null;
let isRunning = false;
let isWorkSession = true;
const DEFAULT_TIME = 10;
let currentTime = DEFAULT_TIME;

const DEFAULT_SETTINGS = {
  workDuration: DEFAULT_TIME,
  shortBreakDuration: 5 * 60,
  longBreakDuration: 15 * 60,
  pomodorosUntilLongBreak: 4,
  currentPomodoros: 0,
};

chrome.storage.local.set({ workSession: !isWorkSession ? "work" : "break" });

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "START_TIMER":
      startTimer();
      break;
    case "PAUSE_TIMER":
      pauseTimer();
      break;
    case "RESET_TIMER":
      resetTimer();
      break;
    case "GET_STATE":
      sendResponse({ isRunning, currentTime, isWorkSession });
      break;
    case "GET_MOTIVATION":
      getMotivationalPhrase().then(sendResponse);
      return true;
    case "INJECT_VIDEO":
      injectMotivationalVideo();
      return true;
  }
  return true;
});

async function takeScreenshot() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      const screenshot = await chrome.tabs.captureVisibleTab();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      await chrome.downloads.download({
        url: screenshot,
        filename: `pomodoro-screenshot-${timestamp}.png`,
      });
    }
  } catch (error) {
    console.error("Screenshot error:", error);
  }
}

function startTimer() {
  if (!isRunning) {
    if (isWorkSession) {
      takeScreenshot();
    }

    chrome.storage.local.set({ workSession: isWorkSession ? "work" : "break" });

    isRunning = true;
    timer = setInterval(tick, 1000);

    broadcastState();
  }
}

function pauseTimer() {
  if (isRunning) {
    isRunning = false;
    clearInterval(timer);
    broadcastState();
  }
}

function resetTimer() {
  const settings = DEFAULT_SETTINGS;
  currentTime = isWorkSession
    ? settings.workDuration
    : settings.shortBreakDuration;
  isRunning = false;
  clearInterval(timer);
  broadcastState();
}

function tick() {
  if (currentTime <= 0) {
    switchSession();
  } else {
    currentTime--;
    broadcastState();
  }
}

function switchSession() {
  const settings = DEFAULT_SETTINGS;
  isWorkSession = !isWorkSession;
  takeScreenshot();

  if (!isWorkSession) {
    settings.currentPomodoros++;
    const isLongBreak =
      settings.currentPomodoros % settings.pomodorosUntilLongBreak === 0;
    currentTime = isLongBreak
      ? settings.longBreakDuration
      : settings.shortBreakDuration;
    chrome.storage.local.set({ workSession: "break" });
  } else {
    chrome.storage.local.set({ workSession: "work" });
    currentTime = settings.workDuration;
  }

  showNotification();
  broadcastState();
}

function showNotification() {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "assets/icon-32.png",
    title: "Pomodoro Timer",
    message: isWorkSession ? "Time to focus!" : "Take a break!",
    priority: 2,
  });
}

async function broadcastState() {
  try {
    await chrome.runtime.sendMessage({
      action: "STATE_UPDATE",
      state: { isRunning, currentTime, isWorkSession },
    });
  } catch (error) {
    console.log("ERR__");
    if (!error.message.includes("Receiving end does not exist")) {
      console.error("Error broadcasting state:", error);
    }
  }
}
