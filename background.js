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
    case "GET_MOTIVATION":
      getMotivationalPhrase().then(sendResponse);
      return true;
    case "INJECT_VIDEO":
      injectMotivationalVideo();
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
  switch(mode) {
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
  
  switch(currentMode) {
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
    chrome.action.setBadgeText({text: ''});
  }, 5000);
}

async function playAlarmSound(sound, volume) {
  try {
    console.log("Playing alarm sound:", sound, "Volume:", volume);
    
    // Get current active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tabs[0]) {
      // Handle custom sound
      if (sound === 'custom' && settings.customSoundData) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "PLAY_CUSTOM_ALARM",
          soundData: settings.customSoundData,
          volume: volume / 100
        });
      } else {
        // Use predefined sounds
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "PLAY_ALARM",
          sound: sound,
          volume: volume / 100
        });
      }
    }
  } catch (error) {
    console.error("Error playing alarm sound:", error);
    // Fallback to system notification sound
    playFallbackAlarm(sound, volume);
  }
}

function playFallbackAlarm(sound, volume) {
  // Create multiple notification alerts as fallback
  const alertCount = 3;
  let alertIndex = 0;
  
  function createAlert() {
    if (alertIndex < alertCount) {
      const notificationId = `alarm-${Date.now()}-${alertIndex}`;
      chrome.notifications.create(notificationId, {
        type: "basic",
        iconUrl: "assets/icon-128.png",
        title: `🔔 Timer Alert ${alertIndex + 1}/${alertCount}`,
        message: `${sound.toUpperCase()} alarm - Session completed!`,
        priority: 2,
        requireInteraction: false
      });
      
      // Clear notification after 2 seconds and create next one
      setTimeout(() => {
        chrome.notifications.clear(notificationId);
        alertIndex++;
        if (alertIndex < alertCount) {
          setTimeout(createAlert, 300); // 300ms delay between alerts
        }
      }, 2000);
    }
  }
  
  createAlert();
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
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "SHOW_MOTIVATION" });
    }
  } catch (error) {
    console.error("Error injecting motivational video:", error);
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

