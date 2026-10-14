// ═══════════════════════════════════════════════════════════════
//  NexusOS Pro — Web Audio Synthesizer v3.0
//  Zero external audio files. Pure sine/triangle oscillator tones.
// ═══════════════════════════════════════════════════════════════

class SoundFX {
  constructor() {
    this.enabled = localStorage.getItem('nexus_sound') !== 'false';
    this._ctx = null;
  }

  _getCtx() {
    if (!this._ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this._ctx = new AC();
    }
    if (this._ctx?.state === 'suspended') this._ctx.resume();
    return this._ctx;
  }

  _play(freq, type = 'sine', duration = 0.06, volume = 0.08, freqEnd) {
    if (!this.enabled) return;
    const ctx = this._getCtx();
    if (!ctx) return;

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    const t    = ctx.currentTime;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + duration);

    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('nexus_sound', this.enabled ? 'true' : 'false');
    if (this.enabled) this.click();
    return this.enabled;
  }

  // Subtle nav/tab click
  click() {
    this._play(900, 'sine', 0.045, 0.07, 500);
  }

  // Confirmation pop
  pop() {
    this._play(360, 'triangle', 0.07, 0.1, 700);
  }

  // Success chime (C–E–G arpeggio)
  success() {
    if (!this.enabled) return;
    const ctx = this._getCtx();
    if (!ctx) return;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      const t    = ctx.currentTime + i * 0.08;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  // Soft warning
  warn() {
    this._play(280, 'sawtooth', 0.18, 0.055, 220);
  }

  // Error buzz
  error() {
    this._play(180, 'square', 0.15, 0.04, 120);
  }
}

window.sound = new SoundFX();
