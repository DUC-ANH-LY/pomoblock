// Offscreen document for audio playback
console.log("🎵 Offscreen audio document loaded");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("🎵 Offscreen received message:", request.action);

    if (request.action === "PLAY_OFFSCREEN_ALARM") {
        playOffscreenAlarm(request.sound, request.volume, request.customSoundData)
            .then(() => {
                console.log("✅ Offscreen alarm played successfully");
                sendResponse({ success: true });
            })
            .catch((error) => {
                console.error("❌ Offscreen alarm failed:", error);
                sendResponse({ success: false, error: error.message });
            });

        return true; // Keep message channel open for async response
    }

    sendResponse({ success: false, error: "Unknown action" });
});

async function playOffscreenAlarm(sound, volume, customSoundData) {
    try {
        console.log("🔔 Playing offscreen alarm:", sound, "at volume:", volume);

        // If custom sound is provided
        if (sound === 'custom' && customSoundData) {
            return await playCustomSound(customSoundData, volume);
        }

        // Play predefined sound
        return await playPredefinedSound(sound, volume);

    } catch (error) {
        console.error("❌ Offscreen alarm error:", error);
        // Fallback to generated sound
        return await playGeneratedSound(volume);
    }
}

async function playCustomSound(soundData, volume) {
    return new Promise((resolve, reject) => {
        try {
            const audio = new Audio();
            audio.volume = Math.min(Math.max((volume || 50) / 100, 0), 1);
            audio.src = soundData;

            audio.onload = () => {
                console.log("✅ Custom sound loaded");
            };

            audio.oncanplaythrough = () => {
                audio.play().then(() => {
                    console.log("✅ Custom sound played");
                    resolve();
                }).catch(reject);
            };

            audio.onerror = (e) => {
                console.error("❌ Custom sound error:", e);
                reject(new Error("Custom sound failed to load"));
            };

        } catch (error) {
            reject(error);
        }
    });
}

async function playPredefinedSound(sound, volume) {
    return new Promise((resolve, reject) => {
        try {
            const audio = new Audio();
            audio.volume = Math.min(Math.max((volume || 50) / 100, 0), 1);

            // Map sound names to actual files
            let soundFile;
            switch (sound) {
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
                    soundFile = 'assets/sounds/jgb.mp3'; // Default fallback
            }

            const fullUrl = chrome.runtime.getURL(soundFile);
            console.log("🎵 Loading sound file:", fullUrl);
            audio.src = fullUrl;

            audio.onload = () => {
                console.log("✅ Predefined sound loaded");
            };

            audio.oncanplaythrough = () => {
                audio.play().then(() => {
                    console.log("✅ Predefined sound played:", soundFile);
                    resolve();
                }).catch(reject);
            };

            audio.onerror = (e) => {
                console.error("❌ Predefined sound error:", e);
                reject(new Error(`Sound file ${soundFile} failed to load`));
            };

            // Set a timeout to prevent hanging
            setTimeout(() => {
                if (audio.readyState < 4) { // If not ready to play
                    reject(new Error("Sound loading timeout"));
                }
            }, 3000);

        } catch (error) {
            reject(error);
        }
    });
}

async function playGeneratedSound(volume) {
    return new Promise((resolve, reject) => {
        try {
            console.log("🎵 Playing generated fallback sound");

            const audioContext = new (window.AudioContext || window.webkitAudioContext)();

            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }

            // Play a sequence of beeps
            const frequencies = [800, 1000, 800]; // Alarm-like pattern
            let currentBeep = 0;

            function playBeep() {
                if (currentBeep >= frequencies.length) {
                    console.log("✅ Generated sound sequence completed");
                    resolve();
                    return;
                }

                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.value = frequencies[currentBeep];
                oscillator.type = 'sine';

                const adjustedVolume = Math.min(Math.max((volume || 50) / 100, 0), 1) * 0.3;
                gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(adjustedVolume, audioContext.currentTime + 0.05);
                gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);

                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.3);

                currentBeep++;

                // Schedule next beep
                setTimeout(playBeep, 400);
            }

            playBeep();

        } catch (error) {
            reject(error);
        }
    });
} 