# 📋 Pomodoro Extension - Technical Documentation

## 🏗️ Architecture Overview

### Extension Structure
```
manifest.json           # Extension configuration
background.js          # Service worker (timer logic)
popup/                 # Main UI
├── popup.html
├── popup.js
└── popup.css
content.js            # Audio & site blocking
settings/             # Block sites management
├── settings.html
├── settings.js
└── settings.css
assets/sounds/        # Audio files
```

### Component Communication
The extension uses Chrome's message passing system:

**Popup ↔ Background:** Timer control, settings sync
**Background → Content:** Audio playback, notifications  
**Background → Storage:** Persistent state management

## ⚙️ Core Logic Flow

### 1. Timer Engine (background.js)

**State Management:**
```javascript
let currentTime = 1500;      // Seconds remaining
let currentMode = 'pomodoro'; // pomodoro/shortBreak/longBreak
let currentPhase = 1;        // Pomodoro counter
let isRunning = false;       // Timer active state
```

**Timer Loop:**
```javascript
function tick() {
  if (currentTime <= 0) {
    completeTimer();
  } else {
    currentTime--;
    broadcastState();
  }
}
```

**Phase Transitions:**
- Pomodoro → Short Break (phases 1,2,3,5,6,7...)
- Pomodoro → Long Break (phase 4,8,12... based on interval)
- Break → Next Pomodoro

### 2. UI State Management (popup.js)

**Display Updates:**
```javascript
function updateDisplay() {
  const minutes = Math.floor(currentTime / 60);
  const secs = currentTime % 60;
  document.getElementById('timer').textContent = 
    `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
```

**Theme Management:**
```javascript
function updateTabAppearance() {
  document.body.className = '';
  if (currentMode === 'shortBreak') {
    document.body.classList.add('short-break');
  } else if (currentMode === 'longBreak') {
    document.body.classList.add('long-break');
  }
}
```

### 3. Audio System (content.js)

**Primary Audio Method:**
```javascript
function playActualSoundFile(sound, volume) {
  const audio = new Audio();
  audio.volume = volume / 100;
  const soundFile = `assets/sounds/${sound}.mp3`;
  audio.src = chrome.runtime.getURL(soundFile);
  audio.play();
}
```

**Fallback Chain:**
1. MP3 file playback
2. Web Audio API tones
3. Speech synthesis
4. Chrome notifications

## 💾 Data Storage Strategy

### Chrome Storage Sync (Settings)
```javascript
pomodoroSettings: {
  pomodoroTime: 25,        // Work session duration
  shortBreakTime: 5,       // Short break duration
  longBreakTime: 15,       // Long break duration
  longBreakInterval: 4,    // Long break every N pomodoros
  autoStartBreaks: false,  // Auto-start breaks
  autoStartPomodoros: false, // Auto-start work
  autoCheckTasks: false,   // Auto-complete tasks
  autoSwitchTasks: true,   // Auto-switch tasks
  alarmSound: 'jgb',       // Sound selection
  volume: 50               // Volume level
}
```

### Chrome Storage Local (State)
```javascript
{
  pomodoroTasks: [...],      // Task list
  workSession: "work",       // Current session type
  currentMode: "pomodoro",   // Active timer mode
  currentPhase: 1            // Pomodoro counter
}
```

## 🔄 Message Passing Protocol

### Message Types

**Timer Control:**
```javascript
// START_TIMER
{ action: "START_TIMER", mode: "pomodoro", time: 1500 }

// PAUSE_TIMER
{ action: "PAUSE_TIMER" }

// STOP_TIMER
{ action: "STOP_TIMER" }
```

**State Updates:**
```javascript
// STATE_UPDATE
{
  action: "STATE_UPDATE",
  state: {
    isRunning: true,
    currentTime: 1499,
    mode: "pomodoro",
    phase: 1
  }
}
```

**Audio Control:**
```javascript
// PLAY_ALARM_SOUND
{
  action: "PLAY_ALARM_SOUND",
  sound: "jgb",
  volume: 70
}
```

## 🎵 Audio Implementation Details

### File Mapping
```javascript
const soundFiles = {
  'jgb': 'assets/sounds/jgb.mp3',      // Classic Bell
  'ct': 'assets/sounds/ct.mp3',        // Chimes
  'tac': 'assets/sounds/tac.mp3',      // Notification
  'click': 'assets/sounds/mouse-click.mp3' // Button clicks
};
```

### Volume Control
```javascript
audio.volume = (volume || 50) / 100; // 0-100% to 0.0-1.0
```

### Error Handling
- Try primary audio method
- Fall back to Web Audio API
- Final fallback to notifications
- Log all attempts for debugging

## 🎨 CSS Theme System

### Base Styles
```css
body {
  background: linear-gradient(135deg, #d73527 0%, #c73e1d 100%);
  transition: background 0.5s ease;
}
```

### Mode-Specific Themes
```css
body.short-break {
  background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
}

body.long-break {
  background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
}
```

## 🚫 Website Blocking Logic

### Block Detection
```javascript
function checkIfShouldBlock() {
  const currentUrl = window.location.hostname;
  const blockedSites = getBlockedSites();
  const isWorkSession = getWorkSession() === "work";
  
  if (isWorkSession && blockedSites.includes(currentUrl)) {
    blockPage();
  }
}
```

### Page Replacement
```javascript
function blockPage() {
  document.body.innerHTML = `
    <div class="block-screen">
      <h1>Site Blocked</h1>
      <p>This site is blocked during your focus session.</p>
      <p>Keep focusing! 🎯</p>
    </div>
  `;
}
```

## 🔧 Error Handling Strategies

### Audio Errors
```javascript
audio.play().catch(error => {
  console.log("Primary audio failed:", error);
  fallbackToWebAudio();
});
```

### Storage Errors
```javascript
chrome.storage.sync.get(['settings'], (result) => {
  if (chrome.runtime.lastError) {
    console.error('Storage error:', chrome.runtime.lastError);
    useDefaultSettings();
    return;
  }
  applySettings(result.settings);
});
```

### Message Passing Errors
```javascript
chrome.runtime.sendMessage(message).catch(error => {
  if (!error.message.includes("Receiving end does not exist")) {
    console.error("Message error:", error);
  }
});
```

## 📊 Performance Optimizations

### Memory Management
- Clean up audio objects after playback
- Remove event listeners when not needed
- Clear intervals and timeouts properly

### CPU Efficiency
- Only broadcast updates when popup is open
- Debounce storage operations
- Use efficient DOM updates

### Storage Optimization
- Batch storage writes
- Minimize sync operations
- Use local storage for session data

## 🧪 Debug Features

### Logging System
```javascript
const DEBUG = true;

function debugLog(component, message, data) {
  if (DEBUG) {
    console.log(`[${component}] ${message}`, data);
  }
}
```

### Test Functions
```javascript
// Test audio playback
function testSound(soundName) {
  playActualSoundFile(soundName, 50);
}

// Test storage
function testStorage() {
  chrome.storage.local.get(null, console.log);
}
```

## 🔄 Extension Lifecycle

### Startup Sequence
1. Manifest parsed by Chrome
2. Background script initializes
3. Load settings from storage
4. Initialize timer state
5. Setup message listeners

### Runtime Flow
1. User opens popup
2. Popup requests current state
3. Background sends state data
4. User interacts with controls
5. Messages trigger background actions
6. State updates broadcast to popup

### Shutdown
1. Save current state to storage
2. Clear active timers
3. Clean up listeners
4. Service worker may persist

## 📚 API References

### Chrome APIs Used
- `chrome.storage.sync` - Settings synchronization
- `chrome.storage.local` - Local state management  
- `chrome.runtime` - Message passing, extension URLs
- `chrome.notifications` - System notifications
- `chrome.alarms` - Scheduled tasks
- `chrome.tabs` - Tab information and messaging
- `chrome.action` - Extension badge updates

### Web APIs Used
- **Audio API** - Sound playback
- **Web Audio API** - Fallback audio generation
- **Speech Synthesis** - Text-to-speech fallback
- **DOM API** - UI manipulation
- **Storage API** - Not used (using Chrome storage)

--- 

Chrome storage 


This technical documentation covers the core architecture and implementation details of the Pomodoro extension. For specific function details, refer to the inline code comments. 



