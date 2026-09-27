const STORAGE_KEY = "cybertype.audio.muted";

function readMutedPreference() {
  try { return localStorage.getItem(STORAGE_KEY) === "true"; }
  catch { return false; }
}

export class AudioEngine {
  constructor(toggleButton) {
    this.context = null;
    this.muted = readMutedPreference();
    this.toggleButton = toggleButton;
    this.combo = 0;
    this.lastClick = 0;
    this.updateButton();
    toggleButton.addEventListener("click", () => {
      this.muted = !this.muted;
      try { localStorage.setItem(STORAGE_KEY, String(this.muted)); }
      catch { /* Audio remains usable when browser storage is unavailable. */ }
      this.updateButton();
      if (!this.muted) this.unlock();
    });
  }

  updateButton() {
    this.toggleButton.textContent = this.muted ? "♪̸" : "♪";
    this.toggleButton.setAttribute("aria-label", this.muted ? "Unmute sound" : "Mute sound");
    this.toggleButton.title = this.muted ? "Unmute sound" : "Mute sound";
  }

  unlock() {
    if (!this.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) this.context = new AudioContextClass();
    }
    if (this.context?.state === "suspended") this.context.resume();
  }

  tone(frequency, duration, type = "sine", volume = .035, endFrequency = frequency) {
    if (this.muted) return;
    this.unlock();
    if (!this.context) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  click() {
    if (this.muted) return;
    const now = performance.now();
    if (now - this.lastClick < 24) return;
    this.lastClick = now;
    this.combo += 1;
    this.tone(1500 + Math.random() * 650, .018, "square", .012, 620);
    if (this.combo % 20 === 0) this.streak();
  }

  miss() {
    this.combo = 0;
    this.tone(190, .075, "triangle", .025, 105);
  }

  streak() {
    this.tone(520, .1, "sine", .035, 780);
    window.setTimeout(() => this.tone(780, .13, "sine", .035, 1120), 85);
  }

  complete() {
    this.tone(540, .14, "triangle", .045, 810);
    window.setTimeout(() => this.tone(810, .22, "triangle", .045, 1080), 110);
  }
}