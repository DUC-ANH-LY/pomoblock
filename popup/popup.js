import { localizeHtmlPage } from "../utils/translations.js";

// Timer state
let currentMode = 'pomodoro';
let currentPhase = 1;
let isRunning = false;
let currentTime = 25 * 60; // 25 minutes in seconds

// Settings
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

// Tasks
let tasks = [];
let currentTaskIndex = 0;

// Temporary settings for pending changes
let tempSettings = {};

document.addEventListener("DOMContentLoaded", () => {
  localizeHtmlPage();
  initializeElements();
  loadSettings();
  loadTasks();
  setupEventListeners();
  updateDisplay();
});

function initializeElements() {
  // Timer elements
  window.minutesDisplay = document.getElementById("minutes");
  window.secondsDisplay = document.getElementById("seconds");
  window.startBtn = document.getElementById("startBtn");
  window.phaseNumber = document.getElementById("phaseNumber");
  window.phaseMessage = document.getElementById("phaseMessage");
  window.timerDisplay = document.querySelector(".timer-display");

  // Tab elements
  window.tabs = document.querySelectorAll('.tab');

  // Settings elements
  window.settingBtn = document.getElementById("settingBtn");
  window.settingsModal = document.getElementById("settingsModal");
  window.closeSettingsBtn = document.getElementById("closeSettingsBtn");
  window.saveSettingsBtn = document.getElementById("saveSettingsBtn");
  window.cancelSettingsBtn = document.getElementById("cancelSettingsBtn");
  window.blocksiteBtn = document.getElementById("blocksiteBtn");

  // Custom sound elements
  window.customSoundSection = document.getElementById("customSoundSection");
  window.customSoundFile = document.getElementById("customSoundFile");
  window.customSoundName = document.getElementById("customSoundName");

  // Task elements
  window.addTaskBtn = document.getElementById("addTaskBtn");
  window.taskModal = document.getElementById("taskModal");
  window.taskInput = document.getElementById("taskInput");
  window.saveTaskBtn = document.getElementById("saveTaskBtn");
  window.cancelTaskBtn = document.getElementById("cancelTaskBtn");
  window.tasksList = document.getElementById("tasksList");
}

function setupEventListeners() {
  // Timer controls
  startBtn.addEventListener("click", () => {
    playClickSound();
    toggleTimer();
  });

  // Tabs
  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchMode(tab.dataset.mode));
  });

  // Settings modal
  settingBtn.addEventListener("click", openSettings);
  closeSettingsBtn.addEventListener("click", closeSettings);
  saveSettingsBtn.addEventListener("click", saveAllSettings);
  cancelSettingsBtn.addEventListener("click", cancelSettings);
  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) closeSettings();
  });

  // Blocksite button
  blocksiteBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("settings/settings.html") });
  });

  // Custom sound handling
  document.getElementById('alarmSound').addEventListener('change', (e) => {
    const customSection = document.getElementById('customSoundSection');
    if (e.target.value === 'custom') {
      customSection.style.display = 'block';
    } else {
      customSection.style.display = 'none';
    }
    settings.alarmSound = e.target.value;
  });

  customSoundFile.addEventListener('change', handleCustomSoundUpload);

  // Settings inputs - store temporary values, don't save immediately

  document.getElementById('pomodoroTime').addEventListener('input', (e) => {
    tempSettings.pomodoroTime = parseFloat(e.target.value);
  });

  document.getElementById('shortBreakTime').addEventListener('input', (e) => {
    tempSettings.shortBreakTime = parseFloat(e.target.value);
  });

  document.getElementById('longBreakTime').addEventListener('input', (e) => {
    tempSettings.longBreakTime = parseFloat(e.target.value);
  });

  document.getElementById('longBreakInterval').addEventListener('input', (e) => {
    tempSettings.longBreakInterval = parseInt(e.target.value);
  });

  // Toggle switches
  document.getElementById('autoStartBreaks').addEventListener('change', (e) => {
    tempSettings.autoStartBreaks = e.target.checked;
  });

  document.getElementById('autoStartPomodoros').addEventListener('change', (e) => {
    tempSettings.autoStartPomodoros = e.target.checked;
  });

  document.getElementById('autoCheckTasks').addEventListener('change', (e) => {
    tempSettings.autoCheckTasks = e.target.checked;
  });

  document.getElementById('autoSwitchTasks').addEventListener('change', (e) => {
    tempSettings.autoSwitchTasks = e.target.checked;
  });

  document.getElementById('alarmSound').addEventListener('change', (e) => {
    tempSettings.alarmSound = e.target.value;
    // Show/hide custom sound section immediately for UX
    const customSection = document.getElementById('customSoundSection');
    if (e.target.value === 'custom') {
      customSection.style.display = 'block';
    } else {
      customSection.style.display = 'none';
    }
  });

  document.getElementById('volume').addEventListener('input', (e) => {
    tempSettings.volume = parseInt(e.target.value);
  });

  // Test sound button
  document.getElementById('testSoundBtn').addEventListener('click', async () => {
    console.log("🔔 Testing alarm sound...");

    // Get current sound selection from temp settings or current settings
    const testSound = tempSettings.alarmSound || settings.alarmSound || 'jgb';
    const testVolume = tempSettings.volume || settings.volume || 50;

    console.log("Testing sound:", testSound, "at volume:", testVolume);

    // Method 1: Try background script with multiple fallbacks
    try {
      const response = await chrome.runtime.sendMessage({
        action: "TEST_ALARM_SOUND",
        sound: testSound,
        volume: testVolume
      });

      if (response && response.success) {
        console.log("✅ Background sound test initiated");
        return; // Background handled it
      }
    } catch (error) {
      console.log("⚠️ Background sound test failed:", error);
    }

    // Method 2: Fallback to popup sound test
    console.log("🎵 Trying popup fallback sound test");
    testSoundInPopup();
  });

  // Task modal
  addTaskBtn.addEventListener("click", openTaskModal);
  saveTaskBtn.addEventListener("click", saveTask);
  cancelTaskBtn.addEventListener("click", closeTaskModal);
  taskModal.addEventListener("click", (e) => {
    if (e.target === taskModal) closeTaskModal();
  });

  taskInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") saveTask();
  });

  taskInput.addEventListener("input", () => {
    saveTaskBtn.disabled = taskInput.value.trim() === "";
  });
}

function toggleTimer() {
  if (isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

function startTimer() {
  isRunning = true;
  startBtn.textContent = "PAUSE";
  startBtn.classList.add("pause");

  // Add timer running animation
  timerDisplay.classList.add("running");

  chrome.runtime.sendMessage({
    action: "START_TIMER",
    mode: currentMode,
    time: currentTime
  });
}

function pauseTimer() {
  isRunning = false;
  startBtn.textContent = "START";
  startBtn.classList.remove("pause");

  // Remove timer running animation
  timerDisplay.classList.remove("running");

  chrome.runtime.sendMessage({ action: "PAUSE_TIMER" });
}

function switchMode(mode) {
  if (isRunning) return; // Don't allow switching while running

  currentMode = mode;

  // Update tab appearance
  updateTabAppearance();

  // Set time based on mode
  switch (mode) {
    case 'pomodoro':
      currentTime = settings.pomodoroTime * 60;
      break;
    case 'shortBreak':
      currentTime = settings.shortBreakTime * 60;
      break;
    case 'longBreak':
      currentTime = settings.longBreakTime * 60;
      break;
  }

  updateDisplay();
}

function updateTabAppearance() {
  tabs.forEach(tab => tab.classList.remove('active'));
  const activeTab = document.querySelector(`[data-mode="${currentMode}"]`);
  if (activeTab) {
    activeTab.classList.add('active');
  }

  // Update body class for color theme
  document.body.className = '';
  if (currentMode === 'shortBreak') {
    document.body.classList.add('short-break');
  } else if (currentMode === 'longBreak') {
    document.body.classList.add('long-break');
  }
  // For pomodoro mode, no additional class (uses default red color)
}

function updateDisplay() {
  const minutes = Math.floor(currentTime / 60);
  const seconds = currentTime % 60;

  minutesDisplay.textContent = minutes.toString().padStart(2, '0');
  secondsDisplay.textContent = seconds.toString().padStart(2, '0');

  // Update phase number based on current mode
  let phaseCount = 1;
  switch (currentMode) {
    case 'pomodoro':
      phaseCount = settings.sessionCounters.pomodoro + 1; // +1 for current session
      break;
    case 'shortBreak':
      phaseCount = settings.sessionCounters.shortBreak + 1;
      break;
    case 'longBreak':
      phaseCount = settings.sessionCounters.longBreak + 1;
      break;
  }
  phaseNumber.textContent = phaseCount;

  // Update phase message based on current mode
  let message = "";
  switch (currentMode) {
    case 'pomodoro':
      message = "Time to focus!";
      break;
    case 'shortBreak':
      message = "Time for a short break!";
      break;
    case 'longBreak':
      message = "Time for a long break!";
      break;
  }
  phaseMessage.textContent = message;

  // Update browser tab title
  document.title = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")} - Pomofocus`;
}

function handleCustomSoundUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type
  const validTypes = ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/mpeg'];
  if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|m4a)$/i)) {
    alert('Please select a valid audio file (MP3, WAV, OGG, M4A)');
    return;
  }

  // Check file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    alert('File size must be less than 10MB');
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    settings.customSoundData = e.target.result;
    settings.customSoundName = file.name;
    customSoundName.textContent = file.name;
    console.log('Custom sound uploaded:', file.name);
  };
  reader.readAsDataURL(file);
}

function saveAllSettings() {
  // Apply temporary settings to actual settings
  Object.assign(settings, tempSettings);

  // Update timer display if needed
  if (tempSettings.pomodoroTime && currentMode === 'pomodoro' && !isRunning) {
    currentTime = settings.pomodoroTime * 60;
    updateDisplay();
  } else if (tempSettings.shortBreakTime && currentMode === 'shortBreak' && !isRunning) {
    currentTime = settings.shortBreakTime * 60;
    updateDisplay();
  } else if (tempSettings.longBreakTime && currentMode === 'longBreak' && !isRunning) {
    currentTime = settings.longBreakTime * 60;
    updateDisplay();
  }

  // Clear temporary settings
  tempSettings = {};

  // Save all settings to storage
  saveSettings();
  closeSettings();
}

function cancelSettings() {
  // Clear temporary settings and reload from storage
  tempSettings = {};
  loadSettings();
  closeSettings();
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

function openSettings() {
  settingsModal.classList.add("show");

  // Clear any temporary settings when opening
  tempSettings = {};

  // Populate settings with current values
  document.getElementById('pomodoroTime').value = settings.pomodoroTime;
  document.getElementById('shortBreakTime').value = settings.shortBreakTime;
  document.getElementById('longBreakTime').value = settings.longBreakTime;
  document.getElementById('longBreakInterval').value = settings.longBreakInterval;
  document.getElementById('autoStartBreaks').checked = settings.autoStartBreaks;
  document.getElementById('autoStartPomodoros').checked = settings.autoStartPomodoros;
  document.getElementById('autoCheckTasks').checked = settings.autoCheckTasks;
  document.getElementById('autoSwitchTasks').checked = settings.autoSwitchTasks;
  document.getElementById('alarmSound').value = settings.alarmSound;
  document.getElementById('volume').value = settings.volume;

  // Handle custom sound section visibility
  const customSection = document.getElementById('customSoundSection');
  if (settings.alarmSound === 'custom') {
    customSection.style.display = 'block';
  } else {
    customSection.style.display = 'none';
  }
}

function closeSettings() {
  settingsModal.classList.remove("show");
}

function openTaskModal() {
  taskModal.classList.add("show");
  taskInput.value = "";
  taskInput.focus();
  saveTaskBtn.disabled = true;
}

function closeTaskModal() {
  taskModal.classList.remove("show");
}

function saveTask() {
  const taskText = taskInput.value.trim();
  if (taskText === "") return;

  const task = {
    id: Date.now(),
    text: taskText,
    completed: false,
    pomodoros: 0
  };

  tasks.push(task);
  saveTasks();
  renderTasks();
  closeTaskModal();
}

function renderTasks() {
  tasksList.innerHTML = "";

  tasks.forEach((task, index) => {
    const taskElement = document.createElement("div");
    taskElement.className = "task-item";

    taskElement.innerHTML = `
      <div class="task-checkbox ${task.completed ? 'checked' : ''}" data-id="${task.id}"></div>
      <div class="task-text ${task.completed ? 'completed' : ''}">${task.text}</div>
      <div class="task-actions">
        <button class="task-action-btn edit-task" data-id="${task.id}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="m18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="task-action-btn delete-task" data-id="${task.id}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3,6 5,6 21,6"/>
            <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"/>
          </svg>
        </button>
      </div>
    `;

    tasksList.appendChild(taskElement);
  });

  // Add event listeners for task actions
  document.querySelectorAll('.task-checkbox').forEach(checkbox => {
    checkbox.addEventListener('click', (e) => {
      const taskId = parseInt(e.target.dataset.id);
      toggleTaskCompletion(taskId);
    });
  });

  document.querySelectorAll('.edit-task').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const taskId = parseInt(e.target.closest('.task-action-btn').dataset.id);
      editTask(taskId);
    });
  });

  document.querySelectorAll('.delete-task').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const taskId = parseInt(e.target.closest('.task-action-btn').dataset.id);
      deleteTask(taskId);
    });
  });
}

function toggleTaskCompletion(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (task) {
    task.completed = !task.completed;
    saveTasks();
    renderTasks();
  }
}

function editTask(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (task) {
    taskInput.value = task.text;
    taskModal.classList.add("show");
    taskInput.focus();
    taskInput.select();

    // Change save button behavior for editing
    saveTaskBtn.onclick = () => {
      const newText = taskInput.value.trim();
      if (newText !== "") {
        task.text = newText;
        saveTasks();
        renderTasks();
        closeTaskModal();
      }
    };
  }
}

function deleteTask(taskId) {
  tasks = tasks.filter(t => t.id !== taskId);
  saveTasks();
  renderTasks();
}

function loadSettings() {
  chrome.storage.sync.get(['pomodoroSettings'], (result) => {
    if (result.pomodoroSettings) {
      settings = { ...settings, ...result.pomodoroSettings };
    }

    // Update UI elements
    document.getElementById('pomodoroTime').value = settings.pomodoroTime;
    document.getElementById('shortBreakTime').value = settings.shortBreakTime;
    document.getElementById('longBreakTime').value = settings.longBreakTime;
    document.getElementById('longBreakInterval').value = settings.longBreakInterval;
    document.getElementById('autoStartBreaks').checked = settings.autoStartBreaks;
    document.getElementById('autoStartPomodoros').checked = settings.autoStartPomodoros;
    document.getElementById('autoCheckTasks').checked = settings.autoCheckTasks;
    document.getElementById('autoSwitchTasks').checked = settings.autoSwitchTasks;
    document.getElementById('alarmSound').value = settings.alarmSound;
    document.getElementById('volume').value = settings.volume;

    // Handle custom sound section visibility
    const customSection = document.getElementById('customSoundSection');
    if (settings.alarmSound === 'custom') {
      customSection.style.display = 'block';
      if (settings.customSoundName) {
        customSoundName.textContent = settings.customSoundName;
      }
    } else {
      customSection.style.display = 'none';
    }

    // Update timer if not running
    if (!isRunning) {
      currentTime = getTimeForMode(currentMode);
      updateDisplay();
    }
  });
}

function saveSettings() {
  chrome.storage.sync.set({ pomodoroSettings: settings });
}

function loadTasks() {
  chrome.storage.local.get(['pomodoroTasks'], (result) => {
    if (result.pomodoroTasks) {
      tasks = result.pomodoroTasks;
      renderTasks();
    }
  });
}

function saveTasks() {
  chrome.storage.local.set({ pomodoroTasks: tasks });
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "STATE_UPDATE") {
    const oldMode = currentMode;
    isRunning = message.state.isRunning;
    currentTime = message.state.currentTime;
    currentMode = message.state.mode || currentMode;

    // Update tab highlighting if mode changed
    if (oldMode !== currentMode) {
      updateTabAppearance();
    }

    if (isRunning) {
      startBtn.textContent = "PAUSE";
      startBtn.classList.add("pause");
    } else {
      startBtn.textContent = "START";
      startBtn.classList.remove("pause");
    }

    updateDisplay();
  }

  if (message.action === "TIMER_COMPLETE") {
    handleTimerComplete();
  }
});

function handleTimerComplete() {
  // Update session counters based on completed mode
  if (currentMode === 'pomodoro') {
    settings.sessionCounters.pomodoro++;
  } else if (currentMode === 'shortBreak') {
    settings.sessionCounters.shortBreak++;
  } else if (currentMode === 'longBreak') {
    settings.sessionCounters.longBreak++;
  }

  // Save updated session counters
  saveSettings();

  // Update display
  updateDisplay();

  // Stop timer animation
  timerDisplay.classList.remove("running");

  // Play alarm sound
  playAlarmSound();

  // Handle task completion if enabled
  if (settings.autoCheckTasks && currentMode === 'pomodoro') {
    if (tasks[currentTaskIndex] && !tasks[currentTaskIndex].completed) {
      toggleTaskCompletion(tasks[currentTaskIndex].id);
    }
  }

  // Auto switch to next task if enabled
  if (settings.autoSwitchTasks && currentMode === 'pomodoro') {
    const nextIncompleteIndex = tasks.findIndex((task, index) =>
      index > currentTaskIndex && !task.completed
    );
    if (nextIncompleteIndex !== -1) {
      currentTaskIndex = nextIncompleteIndex;
      renderTasks();
    }
  }
}

function playAlarmSound() {
  // This would typically play a sound file based on settings.alarmSound
  // For now, we'll use the browser's notification sound
  chrome.runtime.sendMessage({
    action: "PLAY_ALARM",
    sound: settings.alarmSound,
    volume: settings.volume
  });
}

function testSoundInPopup() {
  try {
    console.log("Testing sound directly in popup...");

    // Try playing the actual selected sound file
    const audio = new Audio();
    audio.volume = settings.volume / 100;

    // Map sound names to actual files
    let soundFile;
    switch (settings.alarmSound) {
      case 'jgb':
        soundFile = 'assets/sounds/jgb.mp3';
        break;
      case 'ct':
        soundFile = 'assets/sounds/ct.mp3';
        break;
      case 'tac':
        soundFile = 'assets/sounds/tac.mp3';
        break;
      default:
        soundFile = 'assets/sounds/jgb.mp3';
    }

    audio.src = chrome.runtime.getURL(soundFile);
    audio.play().then(() => {
      console.log("Test sound played successfully:", soundFile);
    }).catch(error => {
      console.log("Test sound failed, trying fallback:", error);

      // Fallback to generated sound
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();

      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      const volume = settings.volume / 100 * 0.3;
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);

      console.log("Fallback sound test completed");
    });

  } catch (error) {
    console.error("Popup sound test failed:", error);
  }
}

function createSimpleWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(offset, samples[i] * 0x7FFF, true);
    offset += 2;
  }

  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
}

function playClickSound() {
  try {
    const audio = new Audio();
    audio.src = chrome.runtime.getURL("assets/sounds/mouse-click.mp3");
    audio.volume = 0.3; // Keep click sound subtle
    audio.play().catch(e => console.log("Click sound failed:", e));
  } catch (error) {
    console.log("Click sound error:", error);
  }
}
// Get initial state from background script
chrome.runtime.sendMessage({ action: "GET_STATE" }, (response) => {
  if (response) {
    isRunning = response.isRunning;
    currentTime = response.currentTime;
    currentMode = response.mode || currentMode;
    currentPhase = response.phase || currentPhase;

    if (isRunning) {
      startBtn.textContent = "PAUSE";
      startBtn.classList.add("pause");
    }

    // Update active tab
    updateTabAppearance();

    updateDisplay();
  }
});

