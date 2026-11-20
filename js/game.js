// Main Game Engine with Weather, Synthwave BGM, Missions, Hazards & Reactive AI

class GameEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    this.road = {
      width: 380,
      lanes: 4,
      laneWidth: 380 / 4,
      x: 0,
      baseX: 0,
      getCurve: (y) => this.getRoadCurve(y),
      getX: (y) => this.getRoadX(y),
      getLaneCenter: (laneIndex, y = null) => {
        const checkY = (y !== null) ? y : (this.player && this.player.y ? this.player.y : window.innerHeight - 190);
        return this.getRoadX(checkY) + (laneIndex + 0.5) * this.road.laneWidth;
      }
    };

    this.traffic = new TrafficManager(this.road);
    this.player = {
      x: 0,
      y: 0,
      vx: 0,
      speed: 0,
      targetSpeed: 0,
      health: 100,
      maxHealth: 100,
      invulnerableTimer: 0,
      nitroAmount: 100,
      maxNitro: 100,
      isNitroActive: false,
      steerAngle: 0,
      spinTimer: 0,
      carData: null,
      stats: null
    };

    // Stage Progression Architecture
    this.STAGES = [
      {
        id: 1,
        name: 'مرحله ۱: نئون توکیو',
        targetDist: 1500,
        weather: 'night',
        baseHeat: 0,
        rewardCoins: 500
      },
      {
        id: 2,
        name: 'مرحله ۲: طوفان ساحلی',
        targetDist: 2200,
        weather: 'rain',
        baseHeat: 1,
        rewardCoins: 800
      },
      {
        id: 3,
        name: 'مرحله ۳: تعقیب کوهستان',
        targetDist: 3000,
        weather: 'sunset',
        baseHeat: 3,
        rewardCoins: 1200
      },
      {
        id: 4,
        name: 'مرحله ۴: هسته نهایی سایبر',
        targetDist: 4000,
        weather: 'night',
        baseHeat: 4,
        rewardCoins: 2500
      }
    ];

    this.currentStageIndex = 0;
    this.stageStartDistance = 0;
    this.stageCompleted = false;
    this.isEndless = false;
    this.heatLevel = 0;

    this.gameMode = 'one_way'; // 'one_way', 'two_way', 'speed_bomb'
    this.weather = 'night'; // 'night', 'rain', 'sunset'
    this.gameState = 'menu'; // 'menu', 'playing', 'paused', 'game_over', 'garage', 'stage_clear'
    this.score = 0;
    this.distance = 0;
    this.sessionCoins = 0;
    this.nearMissCount = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.speedBombTimer = 10;
    this.oncomingTime = 0;
    this.nitroTimeUsed = 0;
    this.screenShake = 0;

    // Cyber Abilities: Bullet-Time (Reflex) & Cyber-Hack / EMP
    this.cyberEnergy = 100;
    this.maxCyberEnergy = 100;
    this.isSlowMo = false;
    this.timeScale = 1.0;
    this.targetTimeScale = 1.0;
    this.targetedVehicle = null;
    this.sessionHacks = 0;
    this.slowmoTime = 0;
    this.ghostTrailTimer = 0;

    this.cameraMode = 'cam-2d'; // cam-2d, cam-3d-out, cam-3d-in
    this.roadOffset = 0;
    this.lastTime = 0;

    this.keys = {
      left: false,
      right: false,
      up: false,
      down: false,
      nitro: false,
      slowmo: false
    };

    this.touchSteerX = null;
    this.initWindowEvents();
    this.resizeCanvas();
    this.initGarageUI();

    // Load graphical assets
    this.assets = {
      bgNight: new Image(),
      bgSunset: new Image(),
      bgRain: new Image(),
      asphalt: new Image()
    };
    this.asphaltPattern = null;
    this.assets.bgNight.src = 'assets/textures/bg_night.jpg';
    this.assets.bgSunset.src = 'assets/textures/bg_sunset.jpg';
    this.assets.bgRain.src = 'assets/textures/bg_rain.jpg';
    this.assets.asphalt.src = 'assets/textures/asphalt.jpg';
    this.assets.asphalt.onload = () => {
      try {
        this.asphaltPattern = this.ctx.createPattern(this.assets.asphalt, 'repeat');
      } catch (e) {}
    };
    this.bgOffset = 0;
  }

  getRoadCurve(y) {
    return 0; // Classic straight highway
  }

  getRoadX(y) {
    return this.road.baseX;
  }

  resizeCanvas() {
    // Solid 60-120 FPS high-performance desktop rasterization (DPR 1.0)
    const dpr = 1.0;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);

    if (this.assets && this.assets.asphalt && this.assets.asphalt.complete) {
      try {
        this.asphaltPattern = this.ctx.createPattern(this.assets.asphalt, 'repeat');
      } catch (e) {}
    }

    const maxRoadW = Math.min(width * 0.92, 440);
    this.road.width = Math.max(300, maxRoadW);
    this.road.laneWidth = this.road.width / this.road.lanes;
    this.road.baseX = (width - this.road.width) / 2;
    this.road.x = this.getRoadX(height - 190);

    if (this.gameState === 'menu' || this.gameState === 'playing') {
      this.player.y = height - 190;
      if (this.player.x === 0) {
        this.player.x = this.road.getLaneCenter(2, this.player.y);
      }
    }
  }

  initWindowEvents() {
    window.addEventListener('resize', () => this.resizeCanvas());

    const handleKey = (e, isDown) => {
      window.soundSystem.init();
      window.soundSystem.resume();

      const code = e.code || '';
      const key = (e.key || '').toLowerCase();
      const keyCode = e.keyCode || e.which || 0;

      let matched = false;

      // Left: ArrowLeft, A, Persian 'ش', keyCode 37, keyCode 65
      if (code === 'ArrowLeft' || code === 'KeyA' || key === 'arrowleft' || key === 'left' || key === 'a' || key === 'ش' || keyCode === 37 || keyCode === 65) {
        this.keys.left = isDown;
        matched = true;
      }
      // Right: ArrowRight, D, Persian 'ی', keyCode 39, keyCode 68
      if (code === 'ArrowRight' || code === 'KeyD' || key === 'arrowright' || key === 'right' || key === 'd' || key === 'ی' || keyCode === 39 || keyCode === 68) {
        this.keys.right = isDown;
        matched = true;
      }
      // Up (Gas): ArrowUp, W, Persian 'ص', keyCode 38, keyCode 87
      if (code === 'ArrowUp' || code === 'KeyW' || key === 'arrowup' || key === 'up' || key === 'w' || key === 'ص' || keyCode === 38 || keyCode === 87) {
        this.keys.up = isDown;
        matched = true;
      }
      // Down (Brake): ArrowDown, S, Persian 'س', keyCode 40, keyCode 83
      if (code === 'ArrowDown' || code === 'KeyS' || key === 'arrowdown' || key === 'down' || key === 's' || key === 'س' || keyCode === 40 || keyCode === 83) {
        this.keys.down = isDown;
        if (isDown && this.gameState === 'playing') {
          window.soundSystem.playBrake();
        }
        matched = true;
      }
      // Nitro: Spacebar, Space, keyCode 32
      if (code === 'Space' || key === ' ' || key === 'space' || key === 'spacebar' || keyCode === 32) {
        this.keys.nitro = isDown;
        matched = true;
      }
      // Horn: KeyH, H, Persian 'ا', keyCode 72
      if ((code === 'KeyH' || key === 'h' || key === 'ا' || keyCode === 72) && isDown) {
        this.honkHorn();
        matched = true;
      }
      // Cyber-Reflex Bullet-Time: Shift (Left/Right)
      if (code === 'ShiftLeft' || code === 'ShiftRight' || key === 'shift' || keyCode === 16) {
        this.keys.slowmo = isDown;
        matched = true;
      }
      // Cyber-Hack / EMP: KeyE, KeyF, Persian 'ث', 'ب'
      if ((code === 'KeyE' || key === 'e' || key === 'ث' || code === 'KeyF' || key === 'f' || key === 'ب' || keyCode === 69 || keyCode === 70) && isDown) {
        this.triggerCyberHack();
        matched = true;
      }
      // Pause: KeyP, Escape, keyCode 27, keyCode 80
      if ((code === 'KeyP' || key === 'p' || code === 'Escape' || key === 'escape' || keyCode === 27 || keyCode === 80) && isDown) {
        this.pauseGame();
        matched = true;
      }
      
      // Camera: KeyC, C, Persian 'ز', keyCode 67
      if ((code === 'KeyC' || key === 'c' || key === 'ز' || keyCode === 67) && isDown) {
        document.getElementById('btn-hud-cam')?.click();
        matched = true;
      }

      if (matched && this.gameState === 'playing') {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', (e) => handleKey(e, true));
    window.addEventListener('keyup', (e) => handleKey(e, false));
    document.addEventListener('keydown', (e) => handleKey(e, true));
    document.addEventListener('keyup', (e) => handleKey(e, false));

    window.addEventListener('blur', () => {
      this.keys.left = false;
      this.keys.right = false;
      this.keys.up = false;
      this.keys.down = false;
      this.keys.nitro = false;
      this.keys.slowmo = false;
    });

    // Touch Screen Steering Drag / Swipe on Canvas
    const handleTouchMove = (e) => {
      if (this.gameState !== 'playing') return;
      const touch = e.touches[0];
      if (touch) {
        this.touchSteerX = touch.clientX;
      }
    };

    this.canvas.addEventListener('touchstart', (e) => {
      window.soundSystem.init();
      window.soundSystem.resume();
      handleTouchMove(e);
    }, { passive: true });

    this.canvas.addEventListener('touchmove', handleTouchMove, { passive: true });
    this.canvas.addEventListener('touchend', () => {
      this.touchSteerX = null;
    }, { passive: true });

    // Desktop Controls Guide Modal Handlers
    document.getElementById('btn-controls-guide')?.addEventListener('click', () => {
      document.getElementById('controls-modal')?.classList.remove('hidden');
    });
    document.getElementById('btn-close-controls')?.addEventListener('click', () => {
      document.getElementById('controls-modal')?.classList.add('hidden');
    });

    // Audio volume controls
    document.getElementById('sfx-slider')?.addEventListener('input', (e) => {
      window.soundSystem.setSfxVolume(parseFloat(e.target.value));
    });

    document.getElementById('music-slider')?.addEventListener('input', (e) => {
      window.soundSystem.setMusicVolume(parseFloat(e.target.value));
    });

    document.getElementById('music-toggle')?.addEventListener('click', (e) => {
      const active = window.soundSystem.toggleMusic();
      e.currentTarget.classList.toggle('on', active);
    });

    // Vibration toggle
    this.vibrateEnabled = true;
    document.getElementById('vibrate-toggle')?.addEventListener('click', (e) => {
      this.vibrateEnabled = !this.vibrateEnabled;
      e.currentTarget.classList.toggle('on', this.vibrateEnabled);
    });
  }

  honkHorn() {
    window.soundSystem.playHorn();
    this.traffic.reactToHorn(this.player.x, this.player.y);
  }

  triggerCyberHack() {
    if (this.gameState !== 'playing') return;

    if (this.cyberEnergy < 28) {
      window.particleSystem.addFloatingText('⚡ LOW CYBER ENERGY!', this.player.x, this.player.y - 40, '#ffaa00');
      return;
    }

    if (!this.targetedVehicle) {
      window.particleSystem.addFloatingText('⚠️ NO TARGET IN RANGE!', this.player.x, this.player.y - 40, '#ff0055');
      return;
    }

    const target = this.targetedVehicle;
    this.cyberEnergy = Math.max(0, this.cyberEnergy - 28);
    this.sessionHacks = (this.sessionHacks || 0) + 1;
    this.vibrate(60);

    if (target.isPolice) {
      // EMP Overload against Police Interceptor
      target.isEmpDisabled = true;
      target.empTimer = 4.5;
      target.speed = 22;
      this.score += 350;
      this.sessionCoins += 5;
      window.soundSystem.playEmpBlast();
      window.particleSystem.addEmpShockwave(target.x, target.y, '#00f2ff');
      window.particleSystem.addFloatingText('⚡ EMP: POLICE STALLED! +350', target.x, target.y - 35, '#00f2ff');
      this.screenShake = 10;
    } else {
      // Autopilot Override against Civilian Traffic
      target.isHacked = true;
      target.hackedTimer = 3.5;
      const roadCenter = this.road.baseX + this.road.width * 0.5;
      target.targetLane = (target.x < roadCenter) ? 0 : 3;
      target.isChangingLane = true;
      target.laneChangeDir = target.targetLane > target.lane ? 1 : -1;
      target.laneChangeProgress = 0;
      target.speed = Math.max(target.speed + 35, 115);
      this.score += 180;
      this.sessionCoins += 2;
      window.soundSystem.playCyberHack();
      window.particleSystem.addHackSparks(target.x, target.y, '#00ffcc');
      window.particleSystem.addFloatingText('⚡ HACK: LANE OVERRIDE! +180', target.x, target.y - 35, '#00ffcc');
      this.screenShake = 5;
    }
  }

  bindTouchButton(id, onDown, onUp) {
    const el = document.getElementById(id);
    if (!el) return;

    let isPressed = false;

    const start = (e) => {
      if (e && e.cancelable) e.preventDefault();
      if (isPressed) return;
      isPressed = true;
      window.soundSystem.init();
      window.soundSystem.resume();
      el.classList.add('active');
      onDown();
    };
    const end = (e) => {
      if (e && e.cancelable) e.preventDefault();
      if (!isPressed) return;
      isPressed = false;
      el.classList.remove('active');
      onUp();
    };

    el.addEventListener('pointerdown', start);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('touchstart', start, { passive: false });
    el.addEventListener('touchend', end, { passive: false });
    el.addEventListener('touchcancel', end, { passive: false });
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', end);
    el.addEventListener('mouseleave', end);
  }

  vibrate(pattern) {
    if (this.vibrateEnabled && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  }

  startGame(mode = 'one_way', stageIndex = 0, isEndless = false) {
    this.gameMode = mode;
    this.gameState = 'playing';
    this.isEndless = isEndless;
    this.currentStageIndex = (stageIndex !== undefined) ? stageIndex : 0;
    this.stageStartDistance = 0;
    this.stageCompleted = false;

    const stage = this.STAGES[this.currentStageIndex] || this.STAGES[0];
    this.weather = stage.weather;
    this.heatLevel = stage.baseHeat;

    // Remove focus from any active button so keyboard isn't hijacked
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    window.focus();
    if (this.canvas) {
      this.canvas.focus();
    }

    this.player.carData = window.carManager.getCurrentCar();
    this.player.stats = window.carManager.getEffectiveStats(this.player.carData);
    this.player.speed = 85; // Instantly start at a thrilling 85 km/h cruising speed!
    this.player.nitroAmount = 100;
    this.player.health = 100;
    this.player.maxHealth = 100;
    this.player.invulnerableTimer = 0;
    this.player.y = (window.innerHeight) - 190;
    this.player.x = this.road.getLaneCenter(2, this.player.y);
    this.player.vx = 0;
    this.player.steerAngle = 0;
    this.player.spinTimer = 0;
    this.touchSteerX = null;

    // Reset keys
    this.keys.left = false;
    this.keys.right = false;
    this.keys.up = false;
    this.keys.down = false;
    this.keys.nitro = false;
    this.keys.slowmo = false;

    // Reset Cyber Abilities
    this.cyberEnergy = 100;
    this.isSlowMo = false;
    this.timeScale = 1.0;
    this.targetTimeScale = 1.0;
    this.targetedVehicle = null;
    this.sessionHacks = 0;
    this.slowmoTime = 0;
    this.ghostTrailTimer = 0;

    this.score = 0;
    this.distance = 0;
    this.sessionCoins = 0;
    this.nearMissCount = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.speedBombTimer = 10;
    this.oncomingTime = 0;
    this.nitroTimeUsed = 0;
    this.screenShake = 0;

    this.traffic.reset(this.gameMode === 'two_way');
    window.particleSystem.clear();
    window.particleSystem.setWeather(this.weather);

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('garage-screen').classList.add('hidden');
    document.getElementById('settings-screen').classList.add('hidden');
    document.getElementById('missions-screen').classList.add('hidden');
    document.getElementById('controls-modal')?.classList.add('hidden');
    const stageClearModal = document.getElementById('stage-clear-modal');
    if (stageClearModal) stageClearModal.classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');

    window.soundSystem.init();
    window.soundSystem.resume();
    window.soundSystem.startMusic();
  }

  stageComplete() {
    this.stageCompleted = true;
    this.gameState = 'stage_clear';
    this.player.speed = 0;

    window.soundSystem.stopEngine();
    window.soundSystem.setNitro(false);
    window.soundSystem.stopMusic();
    if (window.soundSystem.stopPoliceSiren) window.soundSystem.stopPoliceSiren();
    if (window.soundSystem.playStageClear) window.soundSystem.playStageClear();

    const stage = this.STAGES[this.currentStageIndex] || this.STAGES[0];
    const reward = stage.rewardCoins || 500;
    this.sessionCoins += reward;
    window.carManager.addCoins(reward);

    const modal = document.getElementById('stage-clear-modal');
    if (modal) {
      const title = document.getElementById('stage-clear-title');
      const coins = document.getElementById('stage-clear-coins');
      const dist = document.getElementById('stage-clear-dist');
      if (title) title.innerText = `🏆 ${stage.name} تکمیل شد!`;
      if (coins) coins.innerText = `+${reward} سکه`;
      if (dist) dist.innerText = (stage.targetDist / 1000).toFixed(1) + ' km';
      modal.classList.remove('hidden');
    }
  }

  pauseGame() {
    if (this.gameState === 'playing') {
      this.gameState = 'paused';
      window.soundSystem.stopEngine();
      window.soundSystem.stopMusic();
      document.getElementById('pause-modal').classList.remove('hidden');
    } else if (this.gameState === 'paused') {
      this.gameState = 'playing';
      window.soundSystem.startMusic();
      document.getElementById('pause-modal').classList.add('hidden');
    }
  }

  gameOver() {
    this.gameState = 'game_over';
    this.screenShake = 22;

    window.soundSystem.stopEngine();
    window.soundSystem.setNitro(false);
    window.soundSystem.stopMusic();
    window.soundSystem.playCrash();
    this.vibrate([120, 60, 220, 60, 320]);

    window.particleSystem.addExplosion(this.player.x, this.player.y);

    window.carManager.addCoins(this.sessionCoins);
    const isNewRecord = window.carManager.updateHighScore(this.score);

    // Record stats in MissionManager
    window.missionManager.recordRaceEnd({
      distance: this.distance,
      sessionCoins: this.sessionCoins,
      nearMisses: this.nearMissCount,
      maxSpeed: this.player.stats.topSpeed + (this.player.isNitroActive ? 45 : 0),
      nitroTime: this.nitroTimeUsed
    });

    setTimeout(() => {
      document.getElementById('hud').classList.add('hidden');
      document.getElementById('game-over-screen').classList.remove('hidden');

      document.getElementById('go-score').innerText = Math.floor(this.score).toLocaleString();
      document.getElementById('go-dist').innerText = (this.distance / 1000).toFixed(1) + ' km';
      document.getElementById('go-misses').innerText = this.nearMissCount;
      document.getElementById('go-coins').innerText = '+' + this.sessionCoins;

      const tag = document.getElementById('new-record-tag');
      if (tag) tag.style.display = isNewRecord ? 'inline-block' : 'none';

      this.updateMenuStats();
    }, 700);
  }

  update(rawDelta) {
    if (this.gameState !== 'playing') {
      this.roadOffset = (this.roadOffset + 4) % 80;
      return;
    }

    const car = this.player.carData;
    const stats = this.player.stats;

    // 0. Cyber-Reflex Bullet-Time & Cyber Energy
    if (this.keys.slowmo && this.cyberEnergy > 2) {
      this.isSlowMo = true;
      this.targetTimeScale = 0.35;
      this.slowmoTime = (this.slowmoTime || 0) + rawDelta;
      this.cyberEnergy = Math.max(0, this.cyberEnergy - rawDelta * 18);
      if (this.cyberEnergy <= 0) {
        this.keys.slowmo = false;
        this.isSlowMo = false;
      }
    } else {
      this.isSlowMo = false;
      this.targetTimeScale = 1.0;
      this.cyberEnergy = Math.min(100, this.cyberEnergy + rawDelta * 7.5);
    }

    this.timeScale += (this.targetTimeScale - this.timeScale) * 12 * rawDelta;
    const delta = rawDelta * this.timeScale;

    // Bullet-Time Ghost Trails
    if (this.isSlowMo) {
      this.ghostTrailTimer = (this.ghostTrailTimer || 0) + rawDelta;
      if (this.ghostTrailTimer > 0.065) {
        this.ghostTrailTimer = 0;
        window.particleSystem.addGhostTrail(
          this.player.x,
          this.player.y,
          car.width,
          car.length,
          this.player.steerAngle,
          '#00f2ff'
        );
      }
    }
    window.soundSystem.setSlowMotion(this.isSlowMo);

    // 1. Acceleration & Braking Physics
    const accelRate = stats.accel * 32 + 25;
    const brakeRate = stats.braking * 55 + 40;
    const naturalDrag = 15;

    let targetMaxSpeed = stats.topSpeed;

    if (this.keys.nitro && this.player.nitroAmount > 0) {
      this.player.isNitroActive = true;
      targetMaxSpeed += 50;
      this.nitroTimeUsed += delta;
      this.player.nitroAmount = Math.max(0, this.player.nitroAmount - delta * (30 / stats.nitro));
      window.soundSystem.setNitro(true);
      window.particleSystem.addNitroFlame(this.player.x - 14, this.player.y + car.length / 2, '#00f2ff');
      window.particleSystem.addNitroFlame(this.player.x + 14, this.player.y + car.length / 2, '#ff0077');
      if (Math.random() < 0.2) this.vibrate(30);
    } else {
      this.player.isNitroActive = false;
      window.soundSystem.setNitro(false);
      if (this.player.speed > 70) {
        this.player.nitroAmount = Math.min(100, this.player.nitroAmount + delta * 4);
      }
    }

    // Dynamic Vertical (Y) Surging: Visual feedback when pressing Gas / Brake / Nitro
    const baseY = (window.innerHeight) - 190;
    let targetY = baseY;

    if (this.keys.up) {
      this.player.speed = Math.min(targetMaxSpeed, this.player.speed + accelRate * delta);
      targetY = this.player.isNitroActive ? (baseY - 120) : (baseY - 65);
    } else if (this.keys.down) {
      this.player.speed = Math.max(25, this.player.speed - brakeRate * delta);
      targetY = baseY + 55;
      window.particleSystem.addTireSmoke(this.player.x - 16, this.player.y + car.length / 2);
      window.particleSystem.addTireSmoke(this.player.x + 16, this.player.y + car.length / 2);
    } else {
      if (this.player.isNitroActive) {
        targetY = baseY - 100;
        this.player.speed = Math.min(targetMaxSpeed, this.player.speed + accelRate * 0.8 * delta);
      } else {
        // Natural cruising: settle around 85-90 km/h baseline
        if (this.player.speed > 90) {
          this.player.speed -= naturalDrag * delta;
        } else if (this.player.speed < 85) {
          this.player.speed += accelRate * 0.4 * delta;
        }
      }
    }

    // Smooth Y interpolation
    this.player.y += (targetY - this.player.y) * 5.5 * delta;

    // Rain spray from tires
    if (this.weather === 'rain' && this.player.speed > 60) {
      window.particleSystem.addWaterSpray(this.player.x - 16, this.player.y + car.length / 2);
      window.particleSystem.addWaterSpray(this.player.x + 16, this.player.y + car.length / 2);
    }

    window.soundSystem.updateEngine(this.player.speed, stats.topSpeed + 50, this.keys.up, this.keys.down);

    // 2. Responsive Steering Physics
    let steerDir = 0;
    if (this.keys.left) steerDir -= 1;
    if (this.keys.right) steerDir += 1;

    // Optional touch steering fallback only when no keyboard key is pressed
    if (steerDir === 0 && this.touchSteerX !== null) {
      const diff = this.touchSteerX - this.player.x;
      if (Math.abs(diff) > 12) steerDir = diff > 0 ? 1 : -1;
    }

    // Spin effect if oil slick was hit
    if (this.player.spinTimer > 0) {
      this.player.spinTimer -= delta;
      this.player.steerAngle = Math.sin(this.player.spinTimer * 18) * 0.35;
      this.player.speed *= 0.98;
      window.particleSystem.addTireSmoke(this.player.x, this.player.y + car.length / 2);
    } else {
      let handlingBonus = stats.handling; // 5.0 to 10.0
      if (this.weather === 'rain') handlingBonus *= 0.85;

      const steerSpeed = 260 + handlingBonus * 28; // ~380 - 540 px/sec snappy rate
      const targetVx = steerDir * steerSpeed;

      // Snappy, agile lerp (compensated in slow-mo so player has superhuman matrix reflexes)
      const steerDelta = this.isSlowMo ? (rawDelta * 0.72) : delta;
      this.player.vx += (targetVx - this.player.vx) * 16 * steerDelta;
      this.player.x += this.player.vx * steerDelta;

      this.player.steerAngle = (this.player.vx / steerSpeed) * 0.12;

      if (steerDir !== 0 && Math.abs(this.player.vx) > 180) {
        if (Math.random() < 0.3) {
          window.particleSystem.addTireSmoke(this.player.x, this.player.y + car.length / 2);
        }
      }
    }

    // Road Boundaries along straight road
    const currentRoadX = this.road.baseX;
    this.road.x = currentRoadX;
    const roadLeft = currentRoadX + car.width / 2 + 6;
    const roadRight = currentRoadX + this.road.width - car.width / 2 - 6;
    if (this.player.x < roadLeft) {
      this.player.x = roadLeft;
      this.player.vx = 0;
      this.player.speed = Math.max(30, this.player.speed * 0.96);
      this.screenShake = 4;
      this.vibrate(30);
    } else if (this.player.x > roadRight) {
      this.player.x = roadRight;
      this.player.vx = 0;
      this.player.speed = Math.max(30, this.player.speed * 0.96);
      this.screenShake = 4;
      this.vibrate(30);
    }

    // 3. Road Movement & Traffic Update
    const roadSpeedPixels = this.player.speed * 0.18;
    this.roadOffset = (this.roadOffset + roadSpeedPixels) % 80;
    this.distance += (this.player.speed * (1000 / 3600)) * delta;
    this.bgOffset = (this.bgOffset + roadSpeedPixels * 0.1) % window.innerWidth;

    let scoreMultiplier = 1;
    if (this.gameMode === 'two_way' && this.player.x < currentRoadX + this.road.laneWidth * 2) {
      scoreMultiplier = 2.5;
      this.oncomingTime += delta;
    }
    this.score += (this.player.speed * 0.1) * scoreMultiplier * this.combo * delta;

    if (this.comboTimer > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) this.combo = 1;
    }

    // Speed Bomb Mode Check
    if (this.gameMode === 'speed_bomb') {
      if (this.player.speed < 75) {
        this.speedBombTimer -= delta;
        this.screenShake = 3;
        if (this.speedBombTimer <= 0) {
          this.gameOver();
          return;
        }
      } else {
        this.speedBombTimer = Math.min(10, this.speedBombTimer + delta * 2);
      }
    }

    // Invulnerability cooldown after hit
    this.player.invulnerableTimer = Math.max(0, (this.player.invulnerableTimer || 0) - delta);

    // Dynamic Police Heat calculation
    const currentStage = this.STAGES[this.currentStageIndex] || this.STAGES[0];
    let calcHeat = currentStage.baseHeat || 0;
    if (this.player.speed > 135) calcHeat = Math.min(5, calcHeat + 1);
    if (this.player.speed > 185) calcHeat = Math.min(5, calcHeat + 1);
    if (this.nearMissCount >= 3) calcHeat = Math.min(5, calcHeat + 1);
    this.heatLevel = calcHeat;

    // Stage Distance & Progression check
    if (!this.isEndless && this.gameState === 'playing') {
      const stageDist = this.distance - this.stageStartDistance;
      if (stageDist >= currentStage.targetDist && !this.stageCompleted) {
        this.stageComplete();
        return;
      }
    }

    // 4. Update Traffic, Hazards & Check Collisions
    this.traffic.update(this.player.speed, this.player.y, delta, this.heatLevel, this.player.x);
    window.particleSystem.update(roadSpeedPixels, this.player.speed, window.innerWidth, window.innerHeight, (y) => this.getRoadX(y));

    this.checkCollisionsAndPickups();
    this.checkHazardCollisions();

    // 5. Update Cyber Auto-Targeting for Hacking / EMP
    let closestDist = Infinity;
    let bestTarget = null;
    for (const v of this.traffic.vehicles) {
      const distY = this.player.y - v.y; // Positive if v is ahead of player
      const distX = Math.abs(this.player.x - v.x);
      if (distY > 15 && distY < 480 && distX < 140) {
        if (distY < closestDist) {
          closestDist = distY;
          bestTarget = v;
        }
      }
    }
    this.targetedVehicle = bestTarget;

    // Check Missions progress
    window.missionManager.checkMissions({
      nearMisses: this.nearMissCount,
      maxSpeed: this.player.speed,
      oncomingTime: this.oncomingTime,
      sessionCoins: this.sessionCoins,
      distance: this.distance,
      nitroTime: this.nitroTimeUsed,
      sessionHacks: this.sessionHacks,
      slowmoTime: this.slowmoTime
    });

    this.updateHUD();

    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - delta * 30);
    }
  }

  checkHazardCollisions() {
    const car = this.player.carData;
    for (let i = window.particleSystem.hazards.length - 1; i >= 0; i--) {
      const h = window.particleSystem.hazards[i];
      const dist = Math.hypot(this.player.x - h.x, this.player.y - h.y);
      if (dist < 26) {
        if (h.type === 'oil') {
          this.player.spinTimer = 0.8;
          window.soundSystem.playBrake();
          this.vibrate(60);
          window.particleSystem.addFloatingText('⚠️ SLIP!', this.player.x, this.player.y - 30, '#ffe600');
        } else if (h.type === 'cone') {
          this.player.speed = Math.max(20, this.player.speed - 20);
          this.screenShake = 6;
          window.soundSystem.playBrake();
          this.vibrate(70);
          window.particleSystem.addExplosion(h.x, h.y);
        }
        window.particleSystem.hazards.splice(i, 1);
      }
    }
  }

  checkCollisionsAndPickups() {
    const car = this.player.carData;
    const pBox = {
      left: this.player.x - car.width / 2 + 5,
      right: this.player.x + car.width / 2 - 5,
      top: this.player.y - car.length / 2 + 6,
      bottom: this.player.y + car.length / 2 - 6
    };

    for (const v of this.traffic.vehicles) {
      const vBox = {
        left: v.x - v.width / 2 + 4,
        right: v.x + v.width / 2 - 4,
        top: v.y - v.length / 2 + 5,
        bottom: v.y + v.length / 2 - 5
      };

      if (
        pBox.left < vBox.right &&
        pBox.right > vBox.left &&
        pBox.top < vBox.bottom &&
        pBox.bottom > vBox.top
      ) {
        // Durability / Health Damage System
        if (!this.player.invulnerableTimer || this.player.invulnerableTimer <= 0) {
          const relSpeed = Math.abs(this.player.speed - v.speed);
          let damage = Math.floor(18 + relSpeed * 0.25);
          if (v.isOncoming) damage = Math.floor(35 + this.player.speed * 0.22);
          if (v.isPolice) damage += 8; // Police interceptors hit harder
          damage = Math.min(55, Math.max(15, damage));

          this.player.health = Math.max(0, this.player.health - damage);
          this.player.invulnerableTimer = 0.85;

          // Physical lateral bounce away
          this.player.vx = (this.player.x > v.x ? 320 : -320);
          this.player.speed = Math.max(25, this.player.speed * 0.65);
          this.screenShake = 18;
          this.vibrate([100, 50, 160]);

          if (window.soundSystem.playDamageHit) {
            window.soundSystem.playDamageHit();
          }

          window.particleSystem.addFloatingText(`-${damage} HP!`, this.player.x, this.player.y - 30, '#ff0033');
          window.particleSystem.addExplosion(this.player.x, this.player.y);

          // Only trigger Game Over when player health is depleted
          if (this.player.health <= 0) {
            this.gameOver();
            return;
          }
        }
      }

      if (!v.nearMissGranted && this.player.speed > 75) {
        const lateralDist = Math.abs(this.player.x - v.x) - (car.width / 2 + v.width / 2);
        const verticalOverlap = pBox.top < vBox.bottom && pBox.bottom > vBox.top;

        if (verticalOverlap && lateralDist >= 0 && lateralDist < 20) {
          v.nearMissGranted = true;
          this.triggerNearMiss(v.x, v.y);
        }
      }
    }

    for (let i = this.traffic.pickups.length - 1; i >= 0; i--) {
      const p = this.traffic.pickups[i];
      const dist = Math.hypot(this.player.x - p.x, this.player.y - p.y);
      if (dist < p.radius + car.width / 2) {
        if (p.type === 'coin') {
          this.sessionCoins += 10;
          this.score += 250;
          window.soundSystem.playCoin();
          window.particleSystem.addCoinSparkle(p.x, p.y);
          window.particleSystem.addFloatingText('+10 $', p.x, p.y, '#ffe600');
        } else if (p.type === 'nitro') {
          this.player.nitroAmount = Math.min(100, this.player.nitroAmount + 35);
          window.soundSystem.playCoin();
          window.particleSystem.addFloatingText('+NITRO', p.x, p.y, '#ff0077');
        } else if (p.type === 'repair') {
          this.player.health = Math.min(100, this.player.health + 30);
          if (window.soundSystem.playRepair) {
            window.soundSystem.playRepair();
          }
          window.particleSystem.addFloatingText('+30 HP REPAIR!', p.x, p.y, '#00ff88');
        }
        this.traffic.pickups.splice(i, 1);
      }
    }
  }

  triggerNearMiss(vx, vy) {
    this.nearMissCount++;
    this.combo = Math.min(5, this.combo + 1);
    this.comboTimer = 3.5;
    const bonus = 100 * this.combo;
    this.score += bonus;
    this.sessionCoins += 2;

    window.soundSystem.playNearMiss();
    this.vibrate(40);
    this.screenShake = 5;

    window.particleSystem.addFloatingText(`+${bonus} NEAR MISS! x${this.combo}`, this.player.x, this.player.y - 40, '#00f2ff');

    const banner = document.getElementById('near-miss-banner');
    if (banner) {
      banner.innerText = `🔥 NEAR MISS! +${bonus} (x${this.combo})`;
      banner.classList.add('show');
      setTimeout(() => banner.classList.remove('show'), 800);
    }
  }

  updateHUD() {
    document.getElementById('hud-score-val').innerText = Math.floor(this.score);
    document.getElementById('hud-speed-val').innerText = Math.floor(this.player.speed);
    document.getElementById('hud-coin-val').innerText = this.sessionCoins;
    document.getElementById('hud-dist-val').innerText = (this.distance / 1000).toFixed(1) + ' km';

    // Health Bar & Percentage Label
    const healthBar = document.getElementById('hud-health-bar');
    const healthPct = document.getElementById('hud-health-pct');
    if (healthBar) healthBar.style.width = this.player.health + '%';
    if (healthPct) healthPct.innerText = Math.floor(this.player.health) + '%';

    // Nitro Bar & Percentage Label
    const nitroBar = document.getElementById('hud-nitro-bar');
    const nitroPct = document.getElementById('hud-nitro-pct');
    if (nitroBar) nitroBar.style.width = this.player.nitroAmount + '%';
    if (nitroPct) nitroPct.innerText = Math.floor(this.player.nitroAmount) + '%';

    // Cyber Energy Bar & Ability Status Badges
    const cyberBar = document.getElementById('hud-cyber-bar');
    const cyberPct = document.getElementById('hud-cyber-pct');
    if (cyberBar) cyberBar.style.width = Math.floor(this.cyberEnergy) + '%';
    if (cyberPct) cyberPct.innerText = Math.floor(this.cyberEnergy) + '%';

    const badgeSlow = document.getElementById('badge-slowmo');
    if (badgeSlow) {
      badgeSlow.classList.toggle('active', this.isSlowMo);
    }
    const badgeHack = document.getElementById('badge-hack');
    if (badgeHack) {
      badgeHack.classList.toggle('active', this.targetedVehicle !== null && this.cyberEnergy >= 28);
    }

    // Stage Progression HUD
    const stage = this.STAGES[this.currentStageIndex] || this.STAGES[0];
    const stageDist = this.distance - this.stageStartDistance;
    const stagePct = Math.min(100, Math.max(0, (stageDist / stage.targetDist) * 100));
    const stageBar = document.getElementById('hud-stage-bar');
    if (stageBar) stageBar.style.width = stagePct + '%';

    const stageName = document.getElementById('hud-stage-name');
    if (stageName) stageName.innerText = this.isEndless ? 'حالت بی‌پایان (Endless)' : stage.name;

    const stageDistLeft = document.getElementById('hud-stage-dist-left');
    if (stageDistLeft) {
      if (this.isEndless) {
        stageDistLeft.innerText = (this.distance / 1000).toFixed(1) + ' km';
      } else {
        const remaining = Math.max(0, stage.targetDist - stageDist);
        stageDistLeft.innerText = (remaining / 1000).toFixed(1) + ' km باقی‌مانده';
      }
    }

    // Police Heat Indicator
    const heatEl = document.getElementById('hud-police-heat');
    const starsEl = document.getElementById('hud-heat-stars');
    if (heatEl && starsEl) {
      if (this.heatLevel > 0) {
        heatEl.style.display = 'inline-flex';
        starsEl.innerText = '★'.repeat(this.heatLevel) + '☆'.repeat(5 - this.heatLevel);
      } else {
        heatEl.style.display = 'none';
      }
    }

    const bombAlert = document.getElementById('speed-bomb-alert');
    if (bombAlert) {
      if (this.gameMode === 'speed_bomb') {
        bombAlert.style.display = 'block';
        bombAlert.innerText = `💣 BOMB: ${this.speedBombTimer.toFixed(1)}s`;
        bombAlert.style.color = this.speedBombTimer < 4 ? '#ff0033' : '#ffaa00';
      } else {
        bombAlert.style.display = 'none';
      }
    }
    
    // Update steering wheel if in 1st person
    if (this.cameraMode === 'cam-3d-in') {
      const wheel = document.querySelector('.steering-wheel');
      if (wheel) {
        wheel.style.transform = `translateX(-50%) rotate(${this.player.steerAngle * 80}deg)`;
      }
    }

    // 1. Left Telemetry Cockpit Updates
    const spd = this.player.speed;
    let gear = 1;
    if (spd > 230) gear = 7;
    else if (spd > 185) gear = 6;
    else if (spd > 140) gear = 5;
    else if (spd > 95) gear = 4;
    else if (spd > 55) gear = 3;
    else if (spd > 25) gear = 2;

    const gearEl = document.getElementById('hud-gear-val');
    if (gearEl) gearEl.innerText = gear;

    const gearBaseSpeed = [0, 0, 25, 55, 95, 140, 185, 230][gear] || 0;
    const gearMaxSpeed = [0, 30, 60, 100, 145, 190, 235, 280][gear] || 100;
    const gearRatio = Math.max(0, Math.min(1, (spd - gearBaseSpeed) / (gearMaxSpeed - gearBaseSpeed || 1)));
    const rpm = Math.floor(2600 + gearRatio * 5600 + (this.keys.up ? 450 : 0));

    const rpmEl = document.getElementById('hud-rpm-val');
    const rpmBar = document.getElementById('hud-rpm-bar');
    if (rpmEl) rpmEl.innerText = rpm.toLocaleString();
    if (rpmBar) rpmBar.style.width = Math.min(100, (rpm / 8500) * 100) + '%';

    // Turbo PSI
    const turboBar = document.getElementById('hud-turbo-bar');
    const turboVal = document.getElementById('hud-turbo-val');
    const turbo = this.player.isNitroActive ? (2.1 + Math.random() * 0.15) : (this.keys.up ? 1.2 + (spd / 250) * 0.5 : 0.4);
    if (turboVal) turboVal.innerText = turbo.toFixed(1);
    if (turboBar) turboBar.style.width = Math.min(100, (turbo / 2.5) * 100) + '%';

    // Lateral G-Force
    const gVal = document.getElementById('hud-gforce-val');
    const gBar = document.getElementById('hud-gforce-bar');
    const g = (this.player.vx / 380) * 0.85;
    if (gVal) gVal.innerText = (g >= 0 ? '+' : '') + g.toFixed(2);
    if (gBar) gBar.style.width = Math.min(100, Math.abs(g) * 110) + '%';

    // Tire grip
    const gripEl = document.getElementById('hud-tire-grip');
    if (gripEl) {
      gripEl.innerText = this.weather === 'rain' ? '74% WET' : '99% DRY';
      gripEl.style.color = this.weather === 'rain' ? '#00f2ff' : '#00ff88';
    }

    // 2. Right Cyber-Terminal Updates
    const scanName = document.getElementById('scan-target-name');
    const scanDist = document.getElementById('scan-target-dist');
    const scanStatus = document.getElementById('scan-target-status');
    if (this.targetedVehicle) {
      const v = this.targetedVehicle;
      if (scanName) scanName.innerText = v.isPolice ? 'گشت ویژه پلیس' : (v.name || v.type.toUpperCase());
      if (scanDist) scanDist.innerText = Math.floor((this.player.y - v.y) * 0.28) + ' M';
      if (scanStatus) {
        if (this.cyberEnergy >= 28) {
          scanStatus.innerText = v.isPolice ? 'قفل شده: EMP آماده [E]' : 'قفل شده: هک لاین [E]';
          scanStatus.style.color = '#00ffcc';
        } else {
          scanStatus.innerText = 'کمبود توان سایبری!';
          scanStatus.style.color = '#ffaa00';
        }
      }
    } else {
      if (scanName) scanName.innerText = 'در حال اسکن جاده...';
      if (scanDist) scanDist.innerText = '--';
      if (scanStatus) {
        scanStatus.innerText = 'آماده‌باش [E]';
        scanStatus.style.color = 'var(--text-dim)';
      }
    }

    // Active Mission Tracker
    if (window.missionManager && window.missionManager.missions) {
      const activeMission = window.missionManager.missions.find(m => !m.completed) || window.missionManager.missions[0];
      if (activeMission) {
        const mTitle = document.getElementById('hud-active-mission-title');
        const mBar = document.getElementById('hud-active-mission-bar');
        const mCount = document.getElementById('hud-active-mission-count');
        if (mTitle) mTitle.innerText = activeMission.title;

        let curVal = 0;
        if (activeMission.type === 'single_run') {
          if (activeMission.id === 'near_miss_5') curVal = this.nearMissCount;
          else if (activeMission.id === 'speed_200') curVal = Math.floor(this.player.speed);
          else if (activeMission.id === 'coins_40') curVal = this.sessionCoins;
          else if (activeMission.id === 'oncoming_10s') curVal = Math.floor(this.oncomingTime);
          else if (activeMission.id === 'cyber_hack_3') curVal = this.sessionHacks || 0;
          else if (activeMission.id === 'slowmo_dodge') curVal = Math.floor(this.slowmoTime || 0);
        } else {
          curVal = Math.floor(activeMission.progress(window.missionManager.lifetimeStats));
        }

        const pct = Math.min(100, Math.max(0, (curVal / activeMission.target) * 100));
        if (mBar) mBar.style.width = pct + '%';
        if (mCount) mCount.innerText = curVal + ' / ' + activeMission.target;
      }
    }

    // Environment & Combo status
    const envWeather = document.getElementById('hud-env-weather');
    if (envWeather) {
      envWeather.innerText = this.weather === 'rain' ? 'بارانی شدید' : (this.weather === 'sunset' ? 'غروب آفتاب' : 'شب تاریک');
    }
    const comboEl = document.getElementById('hud-combo-val');
    if (comboEl) {
      comboEl.innerText = `x${this.combo} ${this.combo > 1 ? 'COMBO!' : 'NORMAL'}`;
      comboEl.style.color = this.combo > 2 ? '#ff0077' : '#00f2ff';
    }
  }

  render() {
    const ctx = this.ctx;
    const width = window.innerWidth;
    const height = window.innerHeight;

    ctx.save();
    if (this.screenShake > 0) {
      const dx = (Math.random() - 0.5) * this.screenShake;
      const dy = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(dx, dy);
    }

    // 1. Clear background & sky according to weather
    this.renderSky(ctx, width, height);

    // 2. Cyberpunk Background City & Guardrails
    this.renderEnvironment(ctx, width, height);

    // 3. Highway Asphalt & Lane Markings
    this.renderRoad(ctx, height);

    // 4. Particles & Weather
    window.particleSystem.render(ctx);

    // 5. Traffic Vehicles & Pickups
    this.traffic.render(ctx);

    // 6. Player Car with AI Sprites & Damage Feedback
    if ((this.gameState === 'playing' || this.gameState === 'menu') && this.cameraMode !== 'cam-3d-in') {
      const car = this.player.carData || window.carManager.getCurrentCar();
      const color = window.carManager.getCarColor(car.id);
      const underglow = window.carManager.getCarUnderglow(car.id);

      // Flickering opacity during invulnerability after damage
      if (this.player.invulnerableTimer > 0) {
        ctx.globalAlpha = (Math.floor(this.player.invulnerableTimer * 16) % 2 === 0) ? 0.35 : 0.95;
      }

      drawCar(ctx, this.player.x, this.player.y, car.width, car.length, color, {
        underglow: underglow,
        isBraking: this.keys.down,
        hasNitro: this.player.isNitroActive,
        style: car.style,
        spriteKey: car.spriteKey,
        headlights: true,
        steerAngle: this.player.steerAngle,
        isPolice: car.style === 'police',
        policeStrobe: Date.now() / 100,
        health: this.player.health
      });

      ctx.globalAlpha = 1.0;
    }

    // 7. Cyber Auto-Targeting Reticle & Laser Data Link
    if (this.targetedVehicle && this.gameState === 'playing') {
      const v = this.targetedVehicle;
      const car = this.player.carData;
      ctx.save();

      // Pulsing Neon Laser Data Link (High Performance Zero-Blur)
      const beamColor = v.isPolice ? '#ff0055' : '#00f2ff';
      ctx.strokeStyle = beamColor;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -(Date.now() / 25) % 14;
      ctx.beginPath();
      ctx.moveTo(this.player.x, this.player.y - (car ? car.length / 2 : 40));
      ctx.lineTo(v.x, v.y + v.length / 2);
      ctx.stroke();

      // Holographic Target Brackets
      const bx = v.x - v.width / 2 - 8;
      const by = v.y - v.length / 2 - 8;
      const bw = v.width + 16;
      const bh = v.length + 16;
      const cl = 10;

      ctx.strokeStyle = v.isPolice ? '#ff3366' : '#00ffcc';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      // Corners
      ctx.moveTo(bx, by + cl); ctx.lineTo(bx, by); ctx.lineTo(bx + cl, by);
      ctx.moveTo(bx + bw - cl, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + cl);
      ctx.moveTo(bx, by + bh - cl); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + cl, by + bh);
      ctx.moveTo(bx + bw - cl, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - cl);
      ctx.stroke();

      // Target Tag
      ctx.font = 'bold 11px "Orbitron", sans-serif';
      ctx.fillStyle = v.isPolice ? '#ff3366' : '#00ffcc';
      ctx.textAlign = 'center';
      ctx.fillText(v.isPolice ? '⚡ [E] EMP OVERLOAD' : '⚡ [E] OVERRIDE', v.x, by - 6);

      ctx.restore();
    }

    // 8. Cyber-Reflex Matrix Bullet-Time Vignette Overlay
    if (this.timeScale < 0.95 && this.gameState === 'playing') {
      ctx.save();
      const vig = ctx.createRadialGradient(width / 2, height / 2, width * 0.18, width / 2, height / 2, width * 0.72);
      vig.addColorStop(0, 'rgba(0, 242, 255, 0)');
      vig.addColorStop(1, `rgba(0, 242, 255, ${(1 - this.timeScale) * 0.4})`);
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, width, height);

      // Matrix scanline pulses
      const scanY = (Date.now() / 3) % height;
      ctx.fillStyle = 'rgba(0, 255, 204, 0.14)';
      ctx.fillRect(0, scanY, width, 3);
      ctx.restore();
    }

    ctx.restore();

    // 7. Cyberpunk GPS Minimap Radar
    if (this.gameState === 'playing') {
      this.renderMinimap();
    }
  }

  renderMinimap() {
    if (!this.minimapCanvas) {
      this.minimapCanvas = document.getElementById('minimap-canvas');
      if (this.minimapCanvas) {
        this.minimapCtx = this.minimapCanvas.getContext('2d');
      }
    }
    if (!this.minimapCtx || !this.minimapCanvas) return;

    const ctx = this.minimapCtx;
    const mw = this.minimapCanvas.width;
    const mh = this.minimapCanvas.height;

    ctx.clearRect(0, 0, mw, mh);

    // 1. Subtle radar background grid
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mw / 2, 0); ctx.lineTo(mw / 2, mh);
    ctx.moveTo(0, mh * 0.33); ctx.lineTo(mw, mh * 0.33);
    ctx.moveTo(0, mh * 0.66); ctx.lineTo(mw, mh * 0.66);
    ctx.stroke();

    const lookAhead = 2400; // Look 2400px ahead on highway
    const playerScreenY = this.player.y;
    const roadW = this.road.width;
    const mapCenterX = mw / 2;
    const mapPlayerY = mh - 20;

    // 2. Straight Highway Ribbon on minimap
    const mapRoadW = 34; // Road width on minimap
    ctx.save();
    ctx.fillStyle = 'rgba(0, 242, 255, 0.1)';
    ctx.fillRect(mapCenterX - mapRoadW / 2, 8, mapRoadW, mh - 16);

    ctx.strokeStyle = 'rgba(0, 242, 255, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(mapCenterX - mapRoadW / 2, 8, mapRoadW, mh - 16);

    // Subtle lane dividers on radar
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    for (let l = 1; l <= 3; l++) {
      const lx = mapCenterX - mapRoadW / 2 + (l / 4) * mapRoadW;
      ctx.beginPath();
      ctx.moveTo(lx, 8);
      ctx.lineTo(lx, mh - 8);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Traffic vehicles on minimap
    if (this.traffic && this.traffic.vehicles) {
      for (const v of this.traffic.vehicles) {
        const relDist = playerScreenY - v.y;
        if (relDist >= -60 && relDist <= lookAhead) {
          const my = mapPlayerY - (relDist / lookAhead) * (mh - 36);
          const laneRatio = (v.laneOffset !== undefined ? v.laneOffset : (v.x - this.road.baseX)) / roadW - 0.5;
          const mx = mapCenterX + laneRatio * mapRoadW;

          ctx.fillStyle = v.isOncoming ? '#ff0055' : (v.isPolice ? '#00e5ff' : '#ffaa00');
          ctx.beginPath();
          ctx.arc(mx, my, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 4. Pickups on minimap
    if (this.traffic && this.traffic.pickups) {
      for (const p of this.traffic.pickups) {
        const relDist = playerScreenY - p.y;
        if (relDist >= 0 && relDist <= lookAhead) {
          const my = mapPlayerY - (relDist / lookAhead) * (mh - 36);
          const laneRatio = ((p.laneOffset || 190) / roadW) - 0.5;
          const mx = mapCenterX + laneRatio * mapRoadW;

          ctx.fillStyle = p.type === 'coin' ? '#ffe600' : '#ff0077';
          ctx.beginPath();
          ctx.arc(mx, my, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 5. Player marker on minimap (cyan arrowhead)
    const pLaneRatio = ((this.player.x - this.road.baseX) / roadW) - 0.5;
    const pmx = mapCenterX + pLaneRatio * mapRoadW;
    const pmy = mapPlayerY;

    ctx.save();
    ctx.translate(pmx, pmy);
    ctx.fillStyle = '#00f2ff';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 4);
    ctx.lineTo(0, 2);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  renderSky(ctx, width, height) {
    let bgImg = this.assets.bgNight;
    if (this.weather === 'sunset') bgImg = this.assets.bgSunset;
    else if (this.weather === 'rain') bgImg = this.assets.bgRain;

    if (bgImg && bgImg.complete) {
      // Parallax scrolling for background
      const imgWidth = width; // Fill screen horizontally
      // Draw two images side-by-side to allow seamless scrolling
      const offX = this.bgOffset % imgWidth;
      
      // Calculate drawing height to keep aspect ratio if needed, or stretch
      ctx.drawImage(bgImg, -offX, 0, imgWidth, height);
      ctx.drawImage(bgImg, imgWidth - offX, 0, imgWidth, height);
    } else {
      // Fallback if images are not loaded
      if (this.weather === 'sunset') {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#1a052e');
        grad.addColorStop(1, '#ff8800');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.fillStyle = '#070913';
        ctx.fillRect(0, 0, width, height);
      }
    }
  }

  renderEnvironment(ctx, width, height) {
    const rx = this.road.baseX;
    const rw = this.road.width;

    ctx.save();
    // 0. Retro Cyberpunk Grid Lines outside the highway (Left & Right margins)
    ctx.strokeStyle = this.weather === 'sunset' ? 'rgba(255, 0, 119, 0.12)' : 'rgba(0, 242, 255, 0.12)';
    ctx.lineWidth = 1;
    // Horizontal perspective grid lines scrolling backwards
    const gridSpacing = 60;
    const gOffset = (this.roadOffset * 1.2) % gridSpacing;
    for (let y = -gridSpacing + gOffset; y < height + gridSpacing; y += gridSpacing) {
      if (rx > 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(rx - 8, y);
        ctx.stroke();
      }
      if (width - (rx + rw) > 30) {
        ctx.beginPath();
        ctx.moveTo(rx + rw + 8, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    // 1. Left neon guardrail
    const leftColor = this.weather === 'sunset' ? '#ff0077' : '#00f2ff';
    ctx.strokeStyle = leftColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(rx, -30);
    ctx.lineTo(rx, height + 30);
    ctx.stroke();

    // 2. Right neon guardrail
    const rightColor = this.weather === 'sunset' ? '#ffe600' : '#ff0077';
    ctx.strokeStyle = rightColor;
    ctx.beginPath();
    ctx.moveTo(rx + rw, -30);
    ctx.lineTo(rx + rw, height + 30);
    ctx.stroke();

    // 3. Roadside light posts & reflectors along straight edges
    const poleSpacing = 160;
    const offset = this.roadOffset * 2;
    for (let y = -poleSpacing + (offset % poleSpacing); y < height + poleSpacing; y += poleSpacing) {
      ctx.fillStyle = leftColor;
      ctx.fillRect(rx - 22, y, 12, 6);

      ctx.fillStyle = rightColor;
      ctx.fillRect(rx + rw + 10, y, 12, 6);
    }

    // 4. Floating Holographic Billboards on Roadside (Scrolling with speed)
    const billboardSpacing = 720;
    const bOffset = (this.roadOffset * 1.4) % billboardSpacing;
    const billboardY = -200 + bOffset;
    if (rx > 110) {
      // Left Billboard
      ctx.save();
      ctx.fillStyle = 'rgba(10, 15, 35, 0.85)';
      ctx.strokeStyle = '#00f2ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(rx - 110, billboardY, 80, 44);
      ctx.fillRect(rx - 110, billboardY, 80, 44);
      ctx.font = 'bold 8px "Orbitron", sans-serif';
      ctx.fillStyle = '#00f2ff';
      ctx.textAlign = 'center';
      ctx.fillText('CYBER DRIVE', rx - 70, billboardY + 20);
      ctx.fillStyle = '#ff0077';
      ctx.fillText('NEON 2077', rx - 70, billboardY + 34);
      ctx.restore();
    }
    if (width - (rx + rw) > 110) {
      // Right Billboard
      ctx.save();
      ctx.fillStyle = 'rgba(10, 15, 35, 0.85)';
      ctx.strokeStyle = '#ff0077';
      ctx.lineWidth = 2;
      ctx.strokeRect(rx + rw + 30, billboardY + 360, 80, 44);
      ctx.fillRect(rx + rw + 30, billboardY + 360, 80, 44);
      ctx.font = 'bold 8px "Orbitron", sans-serif';
      ctx.fillStyle = '#ffe600';
      ctx.textAlign = 'center';
      ctx.fillText('TURBO BOOST', rx + rw + 70, billboardY + 380);
      ctx.fillStyle = '#00ffcc';
      ctx.fillText('N2O SYSTEM', rx + rw + 70, billboardY + 394);
      ctx.restore();
    }

    ctx.restore();
  }

  renderRoad(ctx, height) {
    const rx = this.road.baseX;
    const rw = this.road.width;
    const width = window.innerWidth;

    ctx.save();

    // 1. Straight road surface
    ctx.save();
    ctx.beginPath();
    ctx.rect(rx, -30, rw, height + 60);
    ctx.clip();

    // Draw cached asphalt texture
    if (this.asphaltPattern) {
      ctx.fillStyle = this.asphaltPattern;
      ctx.translate(rx, this.roadOffset);
      ctx.fillRect(-width, -height * 2, width * 3, height * 4);
      ctx.translate(-rx, -this.roadOffset);
    } else {
      ctx.fillStyle = '#101426';
      ctx.fillRect(0, 0, width, height);
    }

    // Apply lighting/shadow gradient over the asphalt
    const roadGrad = ctx.createLinearGradient(rx, 0, rx + rw, 0);
    if (this.weather === 'rain') {
      roadGrad.addColorStop(0, 'rgba(10, 13, 24, 0.9)');
      roadGrad.addColorStop(0.5, 'rgba(18, 24, 43, 0.5)');
      roadGrad.addColorStop(1, 'rgba(10, 13, 24, 0.9)');
    } else {
      roadGrad.addColorStop(0, 'rgba(16, 20, 38, 0.9)');
      roadGrad.addColorStop(0.5, 'rgba(22, 27, 51, 0.3)');
      roadGrad.addColorStop(1, 'rgba(16, 20, 38, 0.9)');
    }
    ctx.fillStyle = roadGrad;
    ctx.fillRect(rx, 0, rw, height);

    // Glowing speed chevrons
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.35)';
    ctx.lineWidth = 3;
    const chevronSpacing = 600;
    const cOffset = (this.roadOffset * 1.5) % chevronSpacing;
    for (let y = -chevronSpacing + cOffset; y < height + chevronSpacing; y += chevronSpacing) {
      ctx.beginPath();
      ctx.moveTo(rx + rw * 0.2, y + 40);
      ctx.lineTo(rx + rw * 0.5, y);
      ctx.lineTo(rx + rw * 0.8, y + 40);
      ctx.stroke();
    }
    ctx.restore();

    ctx.restore(); // Undo clip

    // 2. Straight Lane Markings
    ctx.save();
    const dashLength = 36;
    const gapLength = 56;
    const laneW = rw / this.road.lanes;

    for (let i = 1; i < this.road.lanes; i++) {
      const lx = rx + i * laneW;
      if (this.gameMode === 'two_way' && i === 2) {
        ctx.strokeStyle = '#ffe600';
        ctx.lineWidth = 4;
        ctx.setLineDash([]);

        // Double yellow line
        [-3, 3].forEach(offset => {
          ctx.beginPath();
          ctx.moveTo(lx + offset, -30);
          ctx.lineTo(lx + offset, height + 30);
          ctx.stroke();
        });
      } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 4;
        ctx.setLineDash([dashLength, gapLength]);
        ctx.lineDashOffset = -this.roadOffset;

        ctx.beginPath();
        ctx.moveTo(lx, -30);
        ctx.lineTo(lx, height + 30);
        ctx.stroke();
      }
    }
    ctx.restore();

    // 3. High-speed motion blur lines along straight edges
    if (this.player.speed > 120) {
      ctx.save();
      ctx.fillStyle = `rgba(0, 242, 255, ${(this.player.speed - 120) / 400})`;
      for (let i = 0; i < 10; i++) {
        const y = Math.random() * height;
        const len = 50 + Math.random() * 150;
        ctx.fillRect(rx + 2 + Math.random() * 10, y, 2, len);
        ctx.fillRect(rx + rw - 14 + Math.random() * 10, y, 2, len);
      }
      ctx.restore();
    }

    ctx.restore();
  }

  initGarageUI() {
    this.updateMenuStats();

    // Mode Selector Buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.gameMode = btn.dataset.mode;
      });
    });

    // Weather Selector Buttons
    document.querySelectorAll('.weather-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.weather-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.weather = btn.dataset.weather;
        window.particleSystem.setWeather(this.weather);
      });
    });

    document.getElementById('btn-play')?.addEventListener('click', () => {
      this.startGame(this.gameMode);
    });

    document.getElementById('btn-garage')?.addEventListener('click', () => {
      this.openGarage();
    });

    document.getElementById('btn-close-garage')?.addEventListener('click', () => {
      document.getElementById('garage-screen').classList.add('hidden');
      document.getElementById('start-screen').classList.remove('hidden');
      this.updateMenuStats();
    });

    // Missions Modal
    document.getElementById('btn-missions')?.addEventListener('click', () => {
      window.missionManager.renderMissionsUI();
      document.getElementById('missions-screen').classList.remove('hidden');
    });

    document.getElementById('btn-close-missions')?.addEventListener('click', () => {
      document.getElementById('missions-screen').classList.add('hidden');
    });

    // Settings Modal
    document.getElementById('btn-settings')?.addEventListener('click', () => {
      document.getElementById('settings-screen').classList.remove('hidden');
    });

    document.getElementById('btn-close-settings')?.addEventListener('click', () => {
      document.getElementById('settings-screen').classList.add('hidden');
    });

    // Game Over Buttons
    document.getElementById('btn-restart')?.addEventListener('click', () => {
      this.startGame(this.gameMode);
    });

    document.getElementById('btn-go-garage')?.addEventListener('click', () => {
      document.getElementById('game-over-screen').classList.add('hidden');
      this.openGarage();
    });

    document.getElementById('btn-go-home')?.addEventListener('click', () => {
      document.getElementById('game-over-screen').classList.add('hidden');
      document.getElementById('start-screen').classList.remove('hidden');
      this.gameState = 'menu';
      this.updateMenuStats();
    });

    document.getElementById('btn-hud-pause')?.addEventListener('click', () => {
      this.pauseGame();
    });
    
    document.getElementById('btn-hud-cam')?.addEventListener('click', () => {
      const wrapper = document.getElementById('canvas-3d-wrapper');
      const dashboard = document.getElementById('hud-dashboard');
      wrapper.classList.remove(this.cameraMode);
      if (this.cameraMode === 'cam-2d') {
        this.cameraMode = 'cam-3d-out';
        dashboard.classList.add('hidden');
      } else if (this.cameraMode === 'cam-3d-out') {
        this.cameraMode = 'cam-3d-in';
        dashboard.classList.remove('hidden');
      } else {
        this.cameraMode = 'cam-2d';
        dashboard.classList.add('hidden');
      }
      wrapper.classList.add(this.cameraMode);
    });

    document.getElementById('btn-resume')?.addEventListener('click', () => {
      this.pauseGame();
    });

    // Stage Clear Modal Buttons
    document.getElementById('btn-next-stage')?.addEventListener('click', () => {
      document.getElementById('stage-clear-modal')?.classList.add('hidden');
      const nextStage = this.currentStageIndex + 1;
      if (nextStage < this.STAGES.length) {
        this.startGame(this.gameMode, nextStage, false);
      } else {
        // Beyond stage 4 -> Endless High-Speed Racing
        this.startGame(this.gameMode, 0, true);
      }
    });

    document.getElementById('btn-endless-stage')?.addEventListener('click', () => {
      document.getElementById('stage-clear-modal')?.classList.add('hidden');
      this.startGame(this.gameMode, this.currentStageIndex, true);
    });

    // Garage navigation buttons
    document.getElementById('garage-prev')?.addEventListener('click', () => {
      const count = window.carManager.cars.length;
      window.carManager.currentCarIndex = (window.carManager.currentCarIndex - 1 + count) % count;
      this.updateGarageView();
    });

    document.getElementById('garage-next')?.addEventListener('click', () => {
      const count = window.carManager.cars.length;
      window.carManager.currentCarIndex = (window.carManager.currentCarIndex + 1) % count;
      this.updateGarageView();
    });

    document.getElementById('garage-action-btn')?.addEventListener('click', () => {
      const idx = window.carManager.currentCarIndex;
      const car = window.carManager.cars[idx];
      if (!car.isUnlocked) {
        if (window.carManager.unlockCar(idx)) {
          window.soundSystem.playCoin();
          this.updateGarageView();
        }
      } else {
        window.carManager.currentCarIndex = idx;
        window.carManager.saveData();
        this.updateGarageView();
      }
    });

    this.renderColorPalettes();
  }

  updateMenuStats() {
    document.getElementById('menu-coins').innerText = window.carManager.coins.toLocaleString();
    document.getElementById('menu-highscore').innerText = window.carManager.highScore.toLocaleString();
  }

  openGarage() {
    this.gameState = 'garage';
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('garage-screen').classList.remove('hidden');
    this.updateGarageView();
  }

  updateGarageView() {
    const car = window.carManager.getCurrentCar();
    const stats = window.carManager.getEffectiveStats(car);

    document.getElementById('garage-coins-val').innerText = window.carManager.coins.toLocaleString();
    document.getElementById('car-name').innerText = car.name;
    document.getElementById('car-class').innerText = car.category;

    this.setStatBar('stat-speed', stats.topSpeed, 280, `${Math.floor(stats.topSpeed)} km/h`);
    this.setStatBar('stat-accel', stats.accel, 12, `${stats.accel.toFixed(1)}`);
    this.setStatBar('stat-handling', stats.handling, 12, `${stats.handling.toFixed(1)}`);
    this.setStatBar('stat-nitro', stats.nitro, 14, `${stats.nitro.toFixed(1)}s`);

    this.updateUpgradeButton('upgrade-speed', car.id, 'topSpeed');
    this.updateUpgradeButton('upgrade-accel', car.id, 'accel');
    this.updateUpgradeButton('upgrade-handling', car.id, 'handling');
    this.updateUpgradeButton('upgrade-nitro', car.id, 'nitro');

    const actionBtn = document.getElementById('garage-action-btn');
    if (car.isUnlocked) {
      actionBtn.innerText = 'انتخاب شده ✓';
      actionBtn.style.background = 'linear-gradient(90deg, #00ff88, #00d0ff)';
    } else {
      actionBtn.innerText = `خرید ماشین (${car.price.toLocaleString()} سکه)`;
      actionBtn.style.background = window.carManager.coins >= car.price ?
        'linear-gradient(90deg, #ffe600, #ff8800)' : 'rgba(255,255,255,0.2)';
    }

    this.renderCarPreview();
  }

  setStatBar(elementId, val, max, text) {
    const percent = Math.min(100, (val / max) * 100);
    const row = document.getElementById(elementId);
    if (row) {
      const inner = row.querySelector('.stat-bar-inner');
      const valEl = row.querySelector('.stat-val');
      if (inner) inner.style.width = percent + '%';
      if (valEl) valEl.innerText = text;
    }
  }

  updateUpgradeButton(btnId, carId, statKey) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    const cost = window.carManager.getUpgradeCost(carId, statKey);
    const level = window.carManager.getUpgradeLevel(carId, statKey);

    btn.onclick = () => {
      if (window.carManager.upgradeStat(carId, statKey)) {
        window.soundSystem.playCoin();
        this.updateGarageView();
      }
    };

    if (cost === null) {
      btn.innerText = 'MAX';
      btn.disabled = true;
      btn.style.opacity = 0.5;
    } else {
      btn.innerText = `+ (${cost} $) [Lv ${level}/5]`;
      btn.disabled = window.carManager.coins < cost;
      btn.style.opacity = window.carManager.coins >= cost ? 1 : 0.6;
    }
  }

  renderCarPreview() {
    const canvas = document.getElementById('car-preview-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.clientWidth * 2;
    canvas.height = canvas.clientHeight * 2;
    ctx.scale(2, 2);

    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    const car = window.carManager.getCurrentCar();
    const color = window.carManager.getCarColor(car.id);
    const underglow = window.carManager.getCarUnderglow(car.id);

    const cx = canvas.clientWidth / 2;
    const cy = canvas.clientHeight / 2;

    drawCar(ctx, cx, cy, car.width * 1.25, car.length * 1.25, color, {
      underglow: underglow,
      isBraking: false,
      hasNitro: true,
      style: car.style,
      spriteKey: car.spriteKey,
      headlights: true,
      isPolice: car.style === 'police',
      policeStrobe: Date.now() / 100
    });
  }

  renderColorPalettes() {
    const paintContainer = document.getElementById('paint-palette');
    if (paintContainer) {
      paintContainer.innerHTML = '';
      AVAILABLE_COLORS.forEach(color => {
        const dot = document.createElement('div');
        dot.className = 'color-dot';
        dot.style.backgroundColor = color;
        dot.onclick = () => {
          const car = window.carManager.getCurrentCar();
          window.carManager.setCarColor(car.id, color);
          this.updateGarageView();
        };
        paintContainer.appendChild(dot);
      });
    }

    const underglowContainer = document.getElementById('underglow-palette');
    if (underglowContainer) {
      underglowContainer.innerHTML = '';
      AVAILABLE_UNDERGLOWS.forEach(color => {
        const dot = document.createElement('div');
        dot.className = 'color-dot';
        dot.style.backgroundColor = color === 'none' ? '#333' : color;
        if (color !== 'none') {
          dot.style.boxShadow = `0 0 8px ${color}`;
        }
        dot.onclick = () => {
          const car = window.carManager.getCurrentCar();
          window.carManager.setCarUnderglow(car.id, color);
          this.updateGarageView();
        };
        underglowContainer.appendChild(dot);
      });
    }
  }

  startLoop() {
    const loop = (timestamp) => {
      if (!this.lastTime) this.lastTime = timestamp;
      const delta = Math.min(0.1, (timestamp - this.lastTime) / 1000);
      this.lastTime = timestamp;

      try {
        this.update(delta);
        this.render();
      } catch (err) {
        console.error('Game loop update/render error:', err);
      }

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

function initGameEngine() {
  if (!window.gameEngine) {
    window.gameEngine = new GameEngine();
    window.gameEngine.startLoop();
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initGameEngine);
} else {
  initGameEngine();
}
