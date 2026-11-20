// Audio Synthesizer with Procedural Retro Synthwave BGM & Dynamic SFX
class SoundSystem {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.musicEnabled = true;
    this.sfxVolume = 0.8;
    this.musicVolume = 0.5;

    // Master gains
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;

    // Engine sound nodes
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;

    // Nitro sound nodes
    this.nitroSource = null;
    this.nitroGain = null;
    this.nitroFilter = null;

    // Music sequencer state
    this.musicPlaying = false;
    this.musicTimer = null;
    this.musicStep = 0;
    this.tempo = 124; // 124 BPM synthwave
    this.stepTime = (60 / this.tempo) / 4; // 16th notes
    this.nextNoteTime = 0;

    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Master audio bus setup
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.initialized = true;
      this.setupEngineSound();
      this.setupNitroSound();
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setupEngineSound() {
    if (!this.ctx) return;
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(280, this.ctx.currentTime);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain);

    this.engineOsc.start();
  }

  setupNitroSound() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.nitroSource = this.ctx.createBufferSource();
    this.nitroSource.buffer = noiseBuffer;
    this.nitroSource.loop = true;

    this.nitroFilter = this.ctx.createBiquadFilter();
    this.nitroFilter.type = 'bandpass';
    this.nitroFilter.frequency.setValueAtTime(800, this.ctx.currentTime);
    this.nitroFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    this.nitroGain = this.ctx.createGain();
    this.nitroGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.nitroSource.connect(this.nitroFilter);
    this.nitroFilter.connect(this.nitroGain);
    this.nitroGain.connect(this.sfxGain);

    this.nitroSource.start();
  }

  updateEngine(speed, maxSpeed, isAccelerating, isBraking) {
    if (!this.ctx || !this.enabled || !this.engineGain) return;
    const ratio = Math.max(0, Math.min(1, speed / maxSpeed));
    const targetFreq = 48 + ratio * 155 + (isAccelerating ? 28 : 0);
    const targetFilter = 220 + ratio * 850 + (isAccelerating ? 160 : 0);
    const targetGain = 0.08 + ratio * 0.14;

    const t = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, t, 0.1);
    this.engineFilter.frequency.setTargetAtTime(targetFilter, t, 0.1);
    this.engineGain.gain.setTargetAtTime(targetGain, t, 0.1);
  }

  stopEngine() {
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    }
  }

  setNitro(active) {
    if (!this.ctx || !this.enabled || !this.nitroGain) return;
    const t = this.ctx.currentTime;
    if (active) {
      this.nitroGain.gain.setTargetAtTime(0.25, t, 0.08);
      this.nitroFilter.frequency.setTargetAtTime(1400, t, 0.1);
    } else {
      this.nitroGain.gain.setTargetAtTime(0, t, 0.15);
    }
  }

  playNearMiss() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(650, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.25);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  playCoin() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    [987.77, 1318.51].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.07);

      gain.gain.setValueAtTime(0.22, t + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.07 + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + idx * 0.07);
      osc.stop(t + idx * 0.07 + 0.22);
    });
  }

  playBrake() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200 + Math.random() * 200, t);
    osc.frequency.linearRampToValueAtTime(800, t + 0.2);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.linearRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.21);
  }

  playHorn() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    [392, 493.88].forEach(freq => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, t);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.linearRampToValueAtTime(0.01, t + 0.35);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.36);
    });
  }

  playCrash() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    // Low sub impact
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.55);

    gain.gain.setValueAtTime(0.75, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.55);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.56);

    // Noise explosion burst
    const bufferSize = this.ctx.sampleRate * 0.7;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.18));
    }
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.65, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.7);

    noiseSource.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noiseSource.start(t);
  }

  playDamageHit() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.35);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.36);
  }

  playRepair() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);
      gain.gain.setValueAtTime(0.2, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.05 + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.26);
    });
  }

  playStageClear() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.09);
      gain.gain.setValueAtTime(0.32, t + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.09 + 0.42);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + idx * 0.09);
      osc.stop(t + idx * 0.09 + 0.44);
    });
  }

  startPoliceSiren() {
    if (!this.ctx || !this.enabled || this.policeSirenActive) return;
    this.policeSirenActive = true;
    const t = this.ctx.currentTime;

    this.sirenOsc = this.ctx.createOscillator();
    this.sirenGain = this.ctx.createGain();
    this.sirenLfo = this.ctx.createOscillator();
    this.sirenLfoGain = this.ctx.createGain();

    this.sirenOsc.type = 'sawtooth';
    this.sirenOsc.frequency.setValueAtTime(750, t);

    this.sirenLfo.frequency.setValueAtTime(2.2, t);
    this.sirenLfoGain.gain.setValueAtTime(320, t);
    this.sirenLfo.connect(this.sirenOsc.frequency);

    this.sirenGain.gain.setValueAtTime(0.01, t);
    this.sirenGain.gain.linearRampToValueAtTime(0.18, t + 0.4);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1500, t);

    this.sirenOsc.connect(filter);
    filter.connect(this.sirenGain);
    this.sirenGain.connect(this.sfxGain);

    this.sirenOsc.start();
    this.sirenLfo.start();
  }

  stopPoliceSiren() {
    if (!this.policeSirenActive || !this.ctx) return;
    this.policeSirenActive = false;
    if (this.sirenGain) {
      try {
        this.sirenGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
        setTimeout(() => {
          try {
            if (this.sirenOsc) this.sirenOsc.stop();
            if (this.sirenLfo) this.sirenLfo.stop();
          } catch (e) {}
        }, 320);
      } catch (e) {}
    }
  }

  // --- Procedural 80s Retro Synthwave Background Music Sequencer ---
  startMusic() {
    if (!this.musicEnabled || this.musicPlaying || !this.ctx) return;
    this.musicPlaying = true;
    this.musicStep = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.scheduleMusicLoop();
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  scheduleMusicLoop() {
    if (!this.musicPlaying || !this.ctx) return;

    // Lookahead scheduler (schedules notes ahead of time for jitter-free audio)
    while (this.nextNoteTime < this.ctx.currentTime + 0.15) {
      this.playMusicStep(this.musicStep, this.nextNoteTime);
      this.nextNoteTime += this.stepTime;
      this.musicStep = (this.musicStep + 1) % 32; // 32 steps (2 bars)
    }

    this.musicTimer = setTimeout(() => this.scheduleMusicLoop(), 35);
  }

  playMusicStep(step, time) {
    if (!this.musicEnabled || !this.ctx) return;

    // 1. Kick Drum on beats 0, 4, 8, 12, 16, 20, 24, 28 (Four-on-the-floor)
    if (step % 4 === 0) {
      this.triggerKick(time);
    }

    // 2. Snare on beats 4, 12, 20, 28
    if (step % 8 === 4) {
      this.triggerSnare(time);
    }

    // 3. Hi-hat on off-beats (2, 6, 10, 14, ...)
    if (step % 2 === 1) {
      this.triggerHiHat(time);
    }

    // 4. Synthwave Rolling Bassline (16th notes with octave jumps)
    // Key: D minor (D1: 36.7Hz, F1: 43.6Hz, G1: 49.0Hz, A1: 55.0Hz, C2: 65.4Hz, D2: 73.4Hz)
    const bassPatterns = [
      73.4, 73.4, 146.8, 73.4,  // D2 D2 D3 D2
      73.4, 73.4, 146.8, 73.4,  // D2 D2 D3 D2
      65.4, 65.4, 130.8, 65.4,  // C2 C2 C3 C2
      55.0, 55.0, 110.0, 55.0   // A1 A1 A2 A1
    ];
    const bassFreq = bassPatterns[Math.floor(step / 2) % bassPatterns.length];
    this.triggerBass(bassFreq, time);

    // 5. Retro Arpeggio Melody Lead (D minor / F major Cyberpunk pentatonic)
    const leadNotes = [
      293.66, 349.23, 440.00, 523.25, 587.33, 440.00, 349.23, 293.66,
      329.63, 392.00, 493.88, 587.33, 659.25, 493.88, 392.00, 329.63
    ];
    if (step % 2 === 0) {
      const noteIdx = (Math.floor(step / 2)) % leadNotes.length;
      this.triggerLead(leadNotes[noteIdx], time);
    }
  }

  triggerKick(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.12);

    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.13);

    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.14);
  }

  triggerSnare(time) {
    // Noise snap
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.04));

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(900, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.22, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    noise.start(time);
  }

  triggerHiHat(time) {
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    noise.start(time);
  }

  triggerBass(freq, time) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, time);
    filter.frequency.exponentialRampToValueAtTime(140, time + this.stepTime);

    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + this.stepTime * 0.9);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + this.stepTime);
  }

  triggerLead(freq, time) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, time);

    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.005, time + this.stepTime * 1.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + this.stepTime * 1.9);
  }

  playCyberHack() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    // Cyber data glitch chirp
    [540, 880, 1320, 1760, 2200].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t + idx * 0.035);
      gain.gain.setValueAtTime(0.14, t + idx * 0.035);
      gain.gain.exponentialRampToValueAtTime(0.005, t + idx * 0.035 + 0.07);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + idx * 0.035);
      osc.stop(t + idx * 0.035 + 0.075);
    });
  }

  playEmpBlast() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    // Heavy sub bass shockwave punch + electrical fuzz
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.5);

    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.51);

    // High frequency zap
    const zap = this.ctx.createOscillator();
    const zapGain = this.ctx.createGain();
    zap.type = 'square';
    zap.frequency.setValueAtTime(2400, t);
    zap.frequency.exponentialRampToValueAtTime(400, t + 0.25);
    zapGain.gain.setValueAtTime(0.2, t);
    zapGain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
    zap.connect(zapGain);
    zapGain.connect(this.sfxGain);
    zap.start(t);
    zap.stop(t + 0.26);
  }

  setSlowMotion(active) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    if (this.engineOsc) {
      if (active) {
        this.engineOsc.frequency.setTargetAtTime(35, t, 0.15);
        if (this.engineFilter) this.engineFilter.frequency.setTargetAtTime(140, t, 0.15);
      }
    }
  }

  setSfxVolume(val) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }

  setMusicVolume(val) {
    this.musicVolume = Math.max(0, Math.min(1, val));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    }
  }

  toggleSound() {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.stopEngine();
      this.setNitro(false);
      this.stopMusic();
    } else {
      if (this.musicEnabled) this.startMusic();
    }
    return this.enabled;
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (this.musicEnabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
    return this.musicEnabled;
  }
}

window.soundSystem = new SoundSystem();
