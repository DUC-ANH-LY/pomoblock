let timer = null;
let isRunning = false;
let currentMode = 'pomodoro'; // 'pomodoro', 'shortBreak', 'longBreak'
let currentPhase = 1;
let currentTime = 25 * 60; // Default 25 minutes

// Default settings
let settings = {
  pomodoroTime: 25,
  shortBreakTime: 5,
  longBreakTime: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  autoCheckTasks: false,
  autoSwitchTasks: true,
  alarmSound: 'jgb',
  volume: 50,
  customSoundData: null,
  customSoundName: null,
  sessionCounters: {
    pomodoro: 0,
    shortBreak: 0,
    longBreak: 0
  }
};

// Load settings on startup
chrome.storage.sync.get(['pomodoroSettings'], (result) => {
  if (result.pomodoroSettings) {
    settings = { ...settings, ...result.pomodoroSettings };
  }
  console.log("Loaded settings:", settings);
});

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.pomodoroSettings) {
    settings = { ...settings, ...changes.pomodoroSettings.newValue };
    console.log("Settings updated:", settings);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "START_TIMER":
      startTimer(request.mode, request.time);
      break;
    case "PAUSE_TIMER":
      pauseTimer();
      break;
    case "RESET_TIMER":
      resetTimer();
      break;
    case "GET_STATE":
      sendResponse({
        isRunning,
        currentTime,
        mode: currentMode,
        phase: currentPhase
      });
      break;
    case "PLAY_ALARM":
      playAlarmSound(request.sound, request.volume);
      break;
    case "PLAY_OFFSCREEN_ALARM":
      // This is handled by offscreen document
      break;
    case "TEST_ALARM_SOUND":
      playAlarmSound(request.sound || settings.alarmSound, request.volume || settings.volume);
      sendResponse({ success: true });
      break;
    case "GET_MOTIVATION":
      getMotivationalPhrase().then(sendResponse);
      return true;
    case "INJECT_VIDEO":
      injectMotivationalVideo().then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        console.error("Video injection failed:", error);
        sendResponse({ success: false, error: error.message });
      });
      return true;
  }
  return true;
});



function startTimer(mode, time) {
  if (!isRunning) {
    if (mode) currentMode = mode;
    if (time) currentTime = time;



    chrome.storage.local.set({
      workSession: currentMode === 'pomodoro' ? "work" : "break",
      currentMode: currentMode,
      currentPhase: currentPhase
    });

    isRunning = true;
    console.log("start timer", timer);
    timer = setInterval(tick, 1000);
    // Update blocking rules when timer starts
    updateBlockingRules();

    broadcastState();
  }
}

function pauseTimer() {
  console.log('⏸️ pauseTimer called, isRunning:', isRunning);
  if (isRunning) {
    isRunning = false;
    clearInterval(timer);
    console.log('⏸️ Timer paused, isRunning now:', isRunning);

    // Update blocking rules when timer pauses (disable blocking)
    updateBlockingRules();

    broadcastState();
  }
}

function resetTimer() {
  currentTime = getTimeForMode(currentMode);
  isRunning = false;
  clearInterval(timer);

  // Update blocking rules when timer resets (disable blocking)
  updateBlockingRules();

  broadcastState();
}

function getTimeForMode(mode) {
  switch (mode) {
    case 'pomodoro':
      return Math.round(settings.pomodoroTime * 60);
    case 'shortBreak':
      return Math.round(settings.shortBreakTime * 60);
    case 'longBreak':
      return Math.round(settings.longBreakTime * 60);
    default:
      return Math.round(settings.pomodoroTime * 60);
  }
}

function tick() {
  console.log("tick", currentTime);
  if (currentTime <= 0) {
    completeTimer();
  } else {
    currentTime--;
    broadcastState();
  }
}

function completeTimer() {
  isRunning = false;
  clearInterval(timer);

  // Update blocking rules when timer completes (disable blocking)
  updateBlockingRules();


  // Play alarm sound first - use current settings
  console.log("Timer complete - using alarm sound:", settings.alarmSound);
  playAlarmSound(settings.alarmSound, settings.volume);

  // Show notification with a slight delay to ensure alarm plays first
  setTimeout(() => {
    showNotification();
  }, 100);

  // Broadcast timer completion
  broadcastTimerComplete();

  // Handle automatic phase switching
  handlePhaseTransition();
}

function handlePhaseTransition() {
  // Update session counters based on completed mode
  if (currentMode === 'pomodoro') {
    settings.sessionCounters.pomodoro++;
    // Pomodoro finished, determine break type
    const isLongBreak = currentPhase % settings.longBreakInterval === 0;
    currentMode = isLongBreak ? 'longBreak' : 'shortBreak';
    currentTime = getTimeForMode(currentMode);

    if (settings.autoStartBreaks) {
      startTimer(currentMode, currentTime);
    } else {
      // Update blocking rules if not auto-starting
      updateBlockingRules();
    }
  } else {
    // Update break counters
    if (currentMode === 'shortBreak') {
      settings.sessionCounters.shortBreak++;
    } else if (currentMode === 'longBreak') {
      settings.sessionCounters.longBreak++;
    }

    // Break finished, switch to pomodoro
    currentPhase++;
    currentMode = 'pomodoro';
    currentTime = getTimeForMode(currentMode);

    if (settings.autoStartPomodoros) {
      startTimer(currentMode, currentTime);
    } else {
      // Update blocking rules if not auto-starting
      updateBlockingRules();
    }
  }

  // Save updated session counters
  chrome.storage.sync.set({ pomodoroSettings: settings });

  // Update storage and broadcast new state
  chrome.storage.local.set({
    workSession: currentMode === 'pomodoro' ? "work" : "break",
    currentMode: currentMode,
    currentPhase: currentPhase
  });

  broadcastState();
}

function showNotification() {
  let title = "🍅 Pomofocus - Session Complete!";
  let message = "";

  switch (currentMode) {
    case 'pomodoro':
      message = "🎉 Great job! Time for a break. You've completed a focus session!";
      break;
    case 'shortBreak':
      message = "⚡ Break's over! Ready to focus? Let's get back to work!";
      break;
    case 'longBreak':
      message = "💪 Long break's over! You're refreshed and ready to be productive!";
      break;
  }

  const notificationId = `pomodoro-${Date.now()}`;

  chrome.notifications.create(notificationId, {
    type: "basic",
    iconUrl: "assets/icon-128.png",
    title: title,
    message: message,
    priority: 2,
    requireInteraction: true, // Keep notification visible until user interacts
  });

  // Clear the notification after 10 seconds if user doesn't interact
  setTimeout(() => {
    chrome.notifications.clear(notificationId);
  }, 10000);

  // Also show a badge on the extension icon
  chrome.action.setBadgeText({
    text: currentMode === 'pomodoro' ? '✓' : '⏰'
  });
  chrome.action.setBadgeBackgroundColor({
    color: currentMode === 'pomodoro' ? '#4CAF50' : '#FF9800'
  });

  // Clear badge after 5 seconds
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
  }, 5000);
}

async function playAlarmSound(sound, volume) {
  try {
    console.log("🔔 Playing alarm sound:", sound, "Volume:", volume);

    // Method 1: Try content script in active tab first
    let soundPlayed = await tryContentScriptSound(sound, volume);

    if (!soundPlayed) {
      // Method 2: Try offscreen document
      soundPlayed = await tryOffscreenSound(sound, volume);
    }

    if (!soundPlayed) {
      // Method 3: Fallback to enhanced notifications
      console.log("⚠️ Fallback to notification sound");
      playFallbackAlarm(sound, volume);
    }

  } catch (error) {
    console.error("❌ Error in playAlarmSound:", error);
    // Final fallback to notifications
    playFallbackAlarm(sound, volume);
  }
}

async function tryContentScriptSound(sound, volume) {
  try {
    // Get current active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tabs && tabs[0] && tabs[0].url && !tabs[0].url.startsWith('chrome://')) {
      console.log("🎵 Trying content script sound on tab:", tabs[0].url);

      // Check if we can send messages to this tab
      const response = await chrome.tabs.sendMessage(tabs[0].id, {
        action: sound === 'custom' && settings.customSoundData ? "PLAY_CUSTOM_ALARM" : "PLAY_ALARM",
        sound: sound,
        soundData: settings.customSoundData,
        volume: volume / 100
      });

      if (response && response.success) {
        console.log("✅ Content script sound played successfully");
        return true;
      }
    } else {
      console.log("⚠️ No suitable active tab found for content script");
    }
  } catch (error) {
    console.log("⚠️ Content script sound failed:", error.message);
  }

  return false;
}

async function tryOffscreenSound(sound, volume) {
  try {
    // Check if offscreen document exists
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });

    if (existingContexts.length === 0) {
      // Create offscreen document for audio
      await chrome.offscreen.createDocument({
        url: chrome.runtime.getURL('offscreen.html'),
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Playing timer alarm sounds'
      });
      console.log("🎵 Created offscreen document for audio");
    }

    // Send message to offscreen document
    const response = await chrome.runtime.sendMessage({
      action: "PLAY_OFFSCREEN_ALARM",
      sound: sound,
      volume: volume,
      customSoundData: settings.customSoundData
    });

    if (response && response.success) {
      console.log("✅ Offscreen sound played successfully");
      return true;
    }

  } catch (error) {
    console.log("⚠️ Offscreen sound failed:", error.message);
  }

  return false;
}

function playFallbackAlarm(sound, volume) {
  console.log("🔔 Playing fallback notification alarm");

  // Create a more prominent notification with sound
  const notificationId = `alarm-${Date.now()}`;

  chrome.notifications.create(notificationId, {
    type: "basic",
    iconUrl: "assets/icon-128.png",
    title: "🍅 Pomodoro Timer - Session Complete!",
    message: `Timer finished! Time for your ${currentMode === 'pomodoro' ? 'break' : 'next session'}.`,
    priority: 2,
    requireInteraction: true,  // Keep notification visible until user interaction
    silent: false  // Allow system notification sound
  });

  // Create additional visual alerts
  let blinkCount = 0;
  const maxBlinks = 6;

  const blinkInterval = setInterval(() => {
    blinkCount++;

    if (blinkCount <= maxBlinks) {
      // Update badge to create visual alert
      chrome.action.setBadgeText({ text: blinkCount % 2 === 0 ? "⏰" : "" });
      chrome.action.setBadgeBackgroundColor({ color: "#ff4444" });
    } else {
      // Clear blinking and notification after alerts
      clearInterval(blinkInterval);
      chrome.action.setBadgeText({ text: "" });

      // Auto-clear notification after 10 seconds if user hasn't interacted
      setTimeout(() => {
        chrome.notifications.clear(notificationId);
      }, 10000);
    }
  }, 500);
}

async function broadcastState() {
  try {
    await chrome.runtime.sendMessage({
      action: "STATE_UPDATE",
      state: {
        isRunning,
        currentTime,
        mode: currentMode,
        phase: currentPhase
      }
    });
  } catch (error) {
    // Ignore connection errors when popup is closed
    if (!error.message.includes("Receiving end does not exist")) {
      console.error("Error broadcasting state:", error);
    }
  }
}

async function broadcastTimerComplete() {
  try {
    await chrome.runtime.sendMessage({
      action: "TIMER_COMPLETE",
      mode: currentMode,
      phase: currentPhase
    });
  } catch (error) {
    // Ignore connection errors when popup is closed
    if (!error.message.includes("Receiving end does not exist")) {
      console.error("Error broadcasting timer complete:", error);
    }
  }
}

// Legacy functions for compatibility with existing code

async function getMotivationalPhrase() {
  const phrases = [
    "You're doing great! Keep going!",
    "Stay focused and productive!",
    "Every minute counts!",
    "You've got this!",
    "Focus is your superpower!",
    "Great work on your productivity!",
    "Time to get things done!",
    "You're making progress!"
  ];

  return phrases[Math.floor(Math.random() * phrases.length)];
}

async function injectMotivationalVideo() {
  try {
    console.log("🎬 Showing motivational notification...");

    // Get a random motivational phrase
    const motivationalPhrase = await getMotivationalPhrase();

    // Show motivational notification
    const notificationId = `motivation-${Date.now()}`;

    chrome.notifications.create(notificationId, {
      type: "basic",
      iconUrl: "assets/icon-128.png",
      title: "🎯 Motivation Boost!",
      message: motivationalPhrase,
      priority: 1,
      requireInteraction: false,
      silent: false
    });

    // Auto-clear notification after 5 seconds
    setTimeout(() => {
      chrome.notifications.clear(notificationId);
    }, 5000);

    console.log("✅ Motivational notification shown successfully");
    return { success: true };

  } catch (error) {
    console.error("❌ Error showing motivational notification:", error);
    throw error;
  }
}
// Declarative Net Request Blocking for immediate site blocking
let blockedSites = [];

// Load blocked sites on startup
chrome.storage.local.get(['blockedSites'], (result) => {
  blockedSites = result.blockedSites || [];
  console.log('Loaded blocked sites:', blockedSites);
  updateBlockingRules();
});

// Listen for storage changes to update blocking state
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.blockedSites) {
    blockedSites = changes.blockedSites.newValue || [];
    console.log('Updated blocked sites:', blockedSites);
    updateBlockingRules();
  }
});

// Function to check if blocking should be active
function shouldBlock() {
  // Only block when Pomodoro timer is running and in work mode
  const result = isRunning && currentMode === 'pomodoro' && blockedSites.length > 0;
  console.log('shouldBlock check:', {
    isRunning,
    currentMode,
    blockedSitesCount: blockedSites.length,
    result
  });
  return result;
}

async function updateBlockingRules() {
  console.log('🔧 updateBlockingRules called');
  try {
    // Remove all existing rules first
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const ruleIdsToRemove = existingRules.map(rule => rule.id);

    console.log('📝 Existing rules to remove:', ruleIdsToRemove.length);

    if (ruleIdsToRemove.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIdsToRemove
      });
      console.log('🗑️ Removed existing rules');
    }

    // Add new blocking rules only when Pomodoro is actively running
    if (shouldBlock()) {
      const newRules = [];

      blockedSites.forEach((site, index) => {
        const cleanSite = site.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
        const blockedPageUrl = chrome.runtime.getURL('blocked.html') + '?site=' + encodeURIComponent(cleanSite);

        // Create rules for both www and non-www versions
        newRules.push({
          id: index * 2 + 1,
          priority: 1,
          action: {
            type: "redirect",
            redirect: { url: blockedPageUrl }
          },
          condition: {
            urlFilter: `*://${cleanSite}/*`,
            resourceTypes: ["main_frame"]
          }
        });

        newRules.push({
          id: index * 2 + 2,
          priority: 1,
          action: {
            type: "redirect",
            redirect: { url: blockedPageUrl }
          },
          condition: {
            urlFilter: `*://www.${cleanSite}/*`,
            resourceTypes: ["main_frame"]
          }
        });
      });

      if (newRules.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          addRules: newRules
        });
        console.log('Added blocking rules for active Pomodoro session:', newRules.length);
      }
    } else {
      console.log('Blocking disabled - Pomodoro not running or not in work mode');
    }

    console.log('Blocking rules updated successfully');
  } catch (error) {
    console.error('Error updating blocking rules:', error);
  }
}

// Initialize timer state on startup
chrome.storage.local.get(['currentMode', 'currentPhase'], (result) => {
  if (result.currentMode) {
    currentMode = result.currentMode;
  }
  if (result.currentPhase) {
    currentPhase = result.currentPhase;
  }
  currentTime = getTimeForMode(currentMode);
});

