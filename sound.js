// Simple procedural sound generation (no external audio files needed)

const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playTone(frequency, duration, type = 'sine', volume = 0.1) {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;

  osc.type = type;
  osc.frequency.value = frequency;
  osc.connect(gain);
  gain.connect(audioContext.destination);

  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

  osc.start(now);
  osc.stop(now + duration);
}

function playShootSound() {
  // Quick descending pop
  playTone(240, 0.08, 'square', 0.15);
  playTone(200, 0.1, 'sine', 0.08);
}

function playHitSound() {
  // Harsh beep
  playTone(440, 0.05, 'square', 0.12);
  playTone(520, 0.08, 'sine', 0.1);
}

function playPickupSound() {
  // Ascending chime
  playTone(523.25, 0.1, 'sine', 0.1);
  playTone(659.25, 0.1, 'sine', 0.1);
}

function playBuildSound() {
  // Metallic click
  playTone(1046.5, 0.04, 'triangle', 0.1);
  playTone(880, 0.06, 'sine', 0.08);
}

function playLevelUpSound() {
  // Triumphant ascending tone
  const now = audioContext.currentTime;
  for (let i = 0; i < 3; i++) {
    playTone(440 + i * 110, 0.15, 'sine', 0.12);
  }
}
