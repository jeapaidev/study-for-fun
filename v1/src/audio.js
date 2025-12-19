// audio.js - Sound effects using Web Audio API

let alarmAudioContext = null;
let alarmOscillators = [];
let alarmGainNode = null;
let alarmIntervalId = null;
let alarmTimeoutId = null;

/**
 * Play annoying fire alarm sound (loops until stopped)
 * This creates a very uncomfortable siren sound
 */
export function playAlarmSound() {
  try {
    // Stop any existing alarm first
    stopAlarmSound();

    alarmAudioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    alarmGainNode = alarmAudioContext.createGain();
    alarmGainNode.connect(alarmAudioContext.destination);

    // Play the alarm pattern repeatedly
    const playAlarmCycle = () => {
      // Create a harsh siren effect (alternating high-low tones rapidly)
      const freq1 = 1200; // High frequency
      const freq2 = 800; // Low frequency

      const oscillator1 = alarmAudioContext.createOscillator();
      const oscillator2 = alarmAudioContext.createOscillator();

      oscillator1.connect(alarmGainNode);
      oscillator2.connect(alarmGainNode);

      // Square wave for harsh sound
      oscillator1.type = "square";
      oscillator2.type = "square";

      const now = alarmAudioContext.currentTime;

      // Rapidly alternate between frequencies (0.25s each)
      oscillator1.frequency.setValueAtTime(freq1, now);
      oscillator1.frequency.setValueAtTime(freq2, now + 0.25);
      oscillator1.frequency.setValueAtTime(freq1, now + 0.5);
      oscillator1.frequency.setValueAtTime(freq2, now + 0.75);

      oscillator2.frequency.setValueAtTime(freq2, now);
      oscillator2.frequency.setValueAtTime(freq1, now + 0.25);
      oscillator2.frequency.setValueAtTime(freq2, now + 0.5);
      oscillator2.frequency.setValueAtTime(freq1, now + 0.75);

      // Loud and constant volume
      alarmGainNode.gain.setValueAtTime(0.5, now);

      oscillator1.start(now);
      oscillator2.start(now);
      oscillator1.stop(now + 1);
      oscillator2.stop(now + 1);

      alarmOscillators.push(oscillator1, oscillator2);
    };

    // Play immediately and then every second
    playAlarmCycle();
    alarmIntervalId = setInterval(playAlarmCycle, 1000);

    // Auto-stop after 5 minutes (300 seconds)
    alarmTimeoutId = setTimeout(() => {
      stopAlarmSound();
      // Dispatch custom event to notify the UI
      window.dispatchEvent(new CustomEvent("alarmAutoStopped"));
    }, 300000);
  } catch (e) {
    console.warn("Audio playback not supported:", e.message);
  }
}

/**
 * Stop the alarm sound
 */
export function stopAlarmSound() {
  if (alarmIntervalId) {
    clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }

  if (alarmTimeoutId) {
    clearTimeout(alarmTimeoutId);
    alarmTimeoutId = null;
  }

  if (alarmOscillators.length > 0) {
    alarmOscillators.forEach((osc) => {
      try {
        osc.stop();
      } catch (e) {
        // Oscillator might already be stopped
      }
    });
    alarmOscillators = [];
  }

  if (alarmAudioContext) {
    try {
      alarmAudioContext.close();
    } catch (e) {
      // Context might already be closed
    }
    alarmAudioContext = null;
  }

  alarmGainNode = null;
}

/**
 * Check if alarm is currently playing
 * @returns {boolean}
 */
export function isAlarmPlaying() {
  return alarmIntervalId !== null;
}

/**
 * Play a success sound (for completing study sessions)
 */
export function playSuccessSound() {
  try {
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();

    // Three ascending notes for success
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, index) => {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = freq;
        oscillator.type = "sine";

        const now = audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.2, now + 0.02);
        gainNode.gain.linearRampToValueAtTime(0.2, now + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.15);

        oscillator.start(now);
        oscillator.stop(now + 0.15);
      }, index * 100);
    });
  } catch (e) {
    console.warn("Audio playback not supported:", e.message);
  }
}
