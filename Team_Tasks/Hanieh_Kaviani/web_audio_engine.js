/**
 * موتور صوتی فرکانسی با Web Audio API
 * توسعه‌دهنده: هانیه کاویانی
 * ددلاین تحویل: ۵شنبه ۷ آبان ۱۴۰۳
 */

class WebAudioEngine {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.isMuted = false;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    // ساخت نوسان‌ساز برای تولید صدای موتور
    this.engineOsc = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();

    this.engineOsc.type = 'sawtooth'; // موج دندانه‌اره‌ای برای صدای زبر موتور
    this.engineOsc.frequency.setValueAtTime(55, this.ctx.currentTime); // ۵۵ هرتز در حالت درجا
    this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    this.engineOsc.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);
    this.engineOsc.start();
  }

  // تغییر دور موتور و فرکانس بر اساس سرعت
  updateEngineRPM(speed, maxSpeed, isAccelerating) {
    if (!this.ctx || !this.engineOsc) return;

    // محاسبه فرکانس از ۵۵Hz (درجا) تا ۲۸۰Hz (حداکثر دور موتور)
    const ratio = Math.min(1, Math.max(0, speed / (maxSpeed || 180)));
    const targetFreq = 55 + ratio * 200 + (isAccelerating ? 25 : 0);

    this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.08);
  }

  // صدای دریافت سکه
  playCoinChime() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, this.ctx.currentTime); // نت B5
    osc.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.08); // نت E6

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }
}

if (typeof module !== 'undefined') {
  module.exports = WebAudioEngine;
}
