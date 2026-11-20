/**
 * موتور صوتی پیشرفته و سکوئنسر سینث‌ویو (Web Audio Synthesizer & Retro BGM V2.5)
 * توسعه‌دهنده: هانیه کاویانی (مهندس هوش مصنوعی ترافیک، صوت و گیمیفیکیشن)
 * پروژه: Neon Highway - اسپرینت ۲
 */

class WebAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;

    // گره‌های صدای موتور
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;

    // گره‌های نیتروژن
    this.nitroSource = null;
    this.nitroGain = null;

    // وضعیت سکوئنسر موسیقی
    this.musicPlaying = false;
    this.musicStep = 0;
    this.tempo = 124; // تمپوی ۱۲۴ BPM سبک سینث‌ویو
    this.stepTime = (60 / this.tempo) / 4; // نوت‌های یک‌شانزدهم
    this.nextNoteTime = 0;
    this.musicTimer = null;

    this.isMuted = false;
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === "suspended") await this.ctx.resume();
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();

    // باس اصلی خروجی صدا
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    this.musicGain.connect(this.masterGain);

    this.setupEngineSound();
    this.setupNitroSound();

    this.isInitialized = true;
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  setupEngineSound() {
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = "sawtooth";
    this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = "lowpass";
    this.engineFilter.frequency.setValueAtTime(320, this.ctx.currentTime);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain);

    this.engineOsc.start();
  }

  setupNitroSound() {
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.nitroSource = this.ctx.createBufferSource();
    this.nitroSource.buffer = noiseBuffer;
    this.nitroSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    this.nitroGain = this.ctx.createGain();
    this.nitroGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.nitroSource.connect(filter);
    filter.connect(this.nitroGain);
    this.nitroGain.connect(this.sfxGain);

    this.nitroSource.start();
  }

  /**
   * تنظیم داینامیک دور موتور بر اساس سرعت و وضعیت گاز
   */
  updateEngineRPM(speed, maxSpeed = 200, isAccelerating = false) {
    if (!this.ctx || !this.engineOsc || !this.engineGain) return;
    const now = this.ctx.currentTime;
    const ratio = Math.min(1.0, Math.max(0, speed / maxSpeed));

    // زیروبمی موتور همگام با دنده و شتاب بالا می‌رود
    const targetFreq = 48 + ratio * 190 + (isAccelerating ? 20 : 0);
    const targetGain = speed <= 5 ? 0.02 : 0.08 + ratio * 0.12;

    this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.08);
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.1);
  }

  setNitro(active) {
    if (!this.nitroGain || !this.ctx) return;
    this.nitroGain.gain.setTargetAtTime(active ? 0.35 : 0, this.ctx.currentTime, 0.1);
  }

  /**
   * شلیک افکت صوتی انفجار EMP
   */
  playEmpBlast() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // ساب‌بیس سنگین
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.5);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.51);
  }

  /**
   * سکوئنسر زنده موسیقی متن رترو سینث‌ویو (124 BPM Synthwave Sequencer)
   */
  startMusic() {
    if (this.musicPlaying || !this.ctx) return;
    this.musicPlaying = true;
    this.musicStep = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;

    this.musicTimer = setInterval(() => {
      while (this.nextNoteTime < this.ctx.currentTime + 0.15) {
        this.scheduleStep(this.musicStep, this.nextNoteTime);
        this.nextNoteTime += this.stepTime;
        this.musicStep = (this.musicStep + 1) % 32;
      }
    }, 25);
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  scheduleStep(step, time) {
    // ۱. کیک‌درام ساب‌بیس روی ضرب‌های ۱، ۹، ۱۷، ۲۵
    if (step % 8 === 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(130, time);
      osc.frequency.exponentialRampToValueAtTime(35, time + 0.12);
      gain.gain.setValueAtTime(0.4, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.13);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + 0.14);
    }

    // ۲. اسنیر اسنپ روی ضرب‌های ۴ و ۱۲
    if (step % 8 === 4) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, time);
      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + 0.11);
    }

    // ۳. بیس‌لاین غلتان ۱۶ نوت در گام ر مینور (D minor Rolling Bass)
    const bassNotes = [73.4, 73.4, 146.8, 73.4, 65.4, 65.4, 130.8, 65.4];
    const bassFreq = bassNotes[Math.floor(step / 2) % bassNotes.length];
    const bOsc = this.ctx.createOscillator();
    const bGain = this.ctx.createGain();
    bOsc.type = 'sawtooth';
    bOsc.frequency.setValueAtTime(bassFreq, time);
    bGain.gain.setValueAtTime(0.12, time);
    bGain.gain.exponentialRampToValueAtTime(0.01, time + this.stepTime * 1.6);
    bOsc.connect(bGain);
    bGain.connect(this.musicGain);
    bOsc.start(time);
    bOsc.stop(time + this.stepTime * 1.8);
  }
}

if (typeof module !== 'undefined') {
  module.exports = WebAudioEngine;
}
