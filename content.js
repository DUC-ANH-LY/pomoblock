

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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Content script received message:", request.action);
  
  switch (request.action) {
    case "PLAY_ALARM":
      console.log("Playing alarm sound:", request.sound);
      playAlarmSound(request.sound, request.volume);
      sendResponse({ success: true });
      break;
      
    case "PLAY_CUSTOM_ALARM":
      console.log("Playing custom alarm sound");
      playCustomAlarmSound(request.soundData, request.volume);
      sendResponse({ success: true });
      break;
      
    case "PLAY_ALARM_SOUND":
      console.log("Playing alarm sound (legacy):", request.sound);
      playAlarmSound(request.sound, request.volume);
      sendResponse({ success: true });
      break;
      
    case "TEST_ALARM":
      console.log("Testing alarm sound");
      testAlarmSound();
      sendResponse({ success: true });
      break;
      

      
    default:
      console.log("Unknown action:", request.action);
      sendResponse({ success: false, error: "Unknown action" });
  }
  
  return true; // Keep message channel open for async response
});

// Test function to verify alarm works
function testAlarmSound() {
  console.log("Testing alarm sound system...");
  playAlarmSound('jgb', 70);
}

// Function to play alarm sounds with multiple approaches
function playAlarmSound(sound, volume) {
  console.log("Playing alarm sound:", sound, "at volume:", volume);
  
  // Method 1: Try playing actual sound files (most reliable)
  playActualSoundFile(sound, volume);
  
  // // Method 2: Try Web Audio API as backup
  // setTimeout(() => {
  //   playWebAudioSound(sound, volume);
  // }, 100);
  
  // // Method 3: Try SpeechSynthesis as final fallback
  // setTimeout(() => {
  //   playSpeechAlarm(sound);
  // }, 500);
}

function playActualSoundFile(sound, volume) {
  try {
    console.log("=== PLAYING ACTUAL SOUND FILE ===");
    console.log("Sound parameter:", sound);
    console.log("Volume parameter:", volume);
    
    const audio = new Audio();
    audio.volume = (volume || 50) / 100;
    
    // Map sound names to actual files
    let soundFile;
    switch(sound) {
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
        console.log("Unknown sound:", sound, "using default jgb.mp3");
        soundFile = 'assets/sounds/jgb.mp3'; // Default fallback
    }
    
    console.log("Selected sound file:", soundFile);
    const fullUrl = chrome.runtime.getURL(soundFile);
    console.log("Full URL:", fullUrl);
    
    audio.src = fullUrl;
    audio.play().then(() => {
      console.log("✅ Actual sound file played successfully:", soundFile);
    }).catch(error => {
      console.log("❌ Actual sound file failed:", error);
      console.log("Audio element:", audio);
      console.log("Audio src:", audio.src);
      console.log("Audio readyState:", audio.readyState);
    });
    
  } catch (error) {
    console.log("❌ Actual sound file error:", error);
  }
}

function playDataUrlSound(sound, volume) {
  try {
    // Generate simple beep sound as data URL
    const frequency = sound === 'bell' ? 800 : sound === 'chime' ? 600 : 400;
    const sampleRate = 8000;
    const duration = 0.5;
    const samples = sampleRate * duration;
    const data = new Array(samples);
    
    // Generate sine wave
    for (let i = 0; i < samples; i++) {
      data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
    }
    
    // Convert to WAV format
    const wavData = createWavFile(data, sampleRate);
    const audio = new Audio();
    audio.volume = (volume || 50) / 100;
    audio.src = wavData;
    
    // Play multiple times for emphasis
    audio.play().then(() => {
      console.log("Alarm sound played successfully");
      
      // Play second beep
      setTimeout(() => {
        const audio2 = new Audio();
        audio2.volume = (volume || 50) / 100;
        audio2.src = wavData;
        audio2.play().catch(e => console.log("Second beep failed:", e));
      }, 600);
      
    }).catch(error => {
      console.log("Data URL audio failed:", error);
    });
    
  } catch (error) {
    console.log("Data URL sound generation failed:", error);
  }
}

function createWavFile(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  // WAV header
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
  
  // Convert samples to 16-bit PCM
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(offset, samples[i] * 0x7FFF, true);
    offset += 2;
  }
  
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
}

function playWebAudioSound(sound, volume) {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Resume context if suspended (required by browsers)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    const frequency = sound === 'bell' ? 800 : sound === 'chime' ? 600 : 400;
    const duration = 0.3;
    const volumeLevel = (volume || 50) / 100 * 0.3;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volumeLevel, audioContext.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
    
    console.log("Web Audio API sound played");
    
  } catch (error) {
    console.log("Web Audio API failed:", error);
  }
}

function playSpeechAlarm(sound) {
  try {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance();
      utterance.text = `${sound} alarm. Timer completed.`;
      utterance.rate = 1.5;
      utterance.volume = 0.7;
      speechSynthesis.speak(utterance);
      console.log("Speech synthesis alarm played");
    }
  } catch (error) {
    console.log("Speech synthesis failed:", error);
  }
}

function playCustomAlarmSound(soundData, volume = 0.5) {
  console.log("Attempting to play custom alarm sound...");
  
  try {
    // Create audio element from base64 data
    const audio = new Audio();
    audio.src = soundData;
    audio.volume = Math.max(0, Math.min(1, volume));
    
    // Play the custom sound
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log("✅ Custom alarm sound played successfully");
        })
        .catch((error) => {
          console.error("❌ Custom alarm sound failed:", error);
          // Fallback to default alarm
          playAlarmSound('jgb', volume * 100);
        });
    }
    
  } catch (error) {
    console.error("❌ Error creating custom audio:", error);
    // Fallback to default alarm
    playAlarmSound('jgb', volume * 100);
  }
}


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
