// Main Game Engine — Optimized 60FPS Pipeline, Cached HUD, Cyber Abilities & Gameplay Juice

class GameEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d', { alpha: false });

    this.viewW = window.innerWidth || 1280;
    this.viewH = window.innerHeight || 720;

    this.road = {
      width: 380,
      lanes: 4,
      laneWidth: 380 / 4,
      x: 0,
      baseX: 0,
      getCurve: (y) => this.getRoadCurve(y),
      getX: (y) => this.getRoadX(y),
      getLaneCenter: (laneIndex, y = null) => {
        const checkY = (y !== null) ? y : (this.player && this.player.y ? this.player.y : this.viewH - 190);
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
    this.userSelectedWeather = 'night';
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

    // Impact Juice & Feedback
    this.hitstopTimer = 0;
    this.damageFlash = 0;
    this.empFlash = 0;

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
    this.bgOffset = 0;
    this.lastTime = 0;

    // Performance & Throttling State
    this.lowSpecMode = this.loadLowSpecPreference();
    this.hudAccum = 0;
    this.minimapAccum = 0;
    this.garagePreviewAccum = 0;
    this._hudCache = Object.create(null);
    this._nearMissTimeout = null;
    this._gameOverTimeout = null;

    // Pre-baked Offscreen Caches (zero per-frame gradient/resampling allocations)
    this.skyCache = { night: null, sunset: null, rain: null };
    this.roadGrads = { normal: null, rain: null };
    this.vignetteCache = { slowmo: null, nitro: null };

    this.keys = {
      left: false,
      right: false,
      up: false,
      down: false,
      nitro: false,
      slowmo: false
    };

    this.touchSteerX = null;

    // Load graphical assets
    this.assets = {
      bgNight: new Image(),
      bgSunset: new Image(),
      bgRain: new Image(),
      asphalt: new Image()
    };
    this.asphaltPattern = null;

    this.cacheHudElements();
    this.initWindowEvents();
    this.resizeCanvas();
    this.initAssets();
    this.initGarageUI();

    if (window.particleSystem && typeof window.particleSystem.setLowSpec === 'function') {
      window.particleSystem.setLowSpec(this.lowSpecMode);
    }

    this.setGameState('menu');

    // Optional autostart query param for automated testing
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        setTimeout(() => this.startGame(this.gameMode, 0, false), 120);
      }
    } catch (e) {}
  }

  loadLowSpecPreference() {
    try {
      return localStorage.getItem('neon_highway_lowspec') === '1';
    } catch (e) {
      return false;
    }
  }

  setLowSpecMode(enabled) {
    this.lowSpecMode = !!enabled;
    try {
      localStorage.setItem('neon_highway_lowspec', this.lowSpecMode ? '1' : '0');
    } catch (e) {}
    if (window.particleSystem && typeof window.particleSystem.setLowSpec === 'function') {
      window.particleSystem.setLowSpec(this.lowSpecMode);
    }
    const perfToggle = document.getElementById('perf-toggle');
    if (perfToggle) perfToggle.classList.toggle('on', this.lowSpecMode);
  }

  setGameState(state) {
    this.gameState = state;
    const stateMap = {
      menu: 'title',
      playing: 'playing',
      paused: 'paused',
      game_over: 'gameover',
      garage: 'garage',
      stage_clear: 'stage_clear'
    };
    if (document.body) {
      document.body.dataset.state = stateMap[state] || state;
    }
  }

  initAssets() {
    const bindSky = (img, key) => {
      img.onload = () => {
        this.rebuildSkyCacheKey(key, img);
      };
    };

    bindSky(this.assets.bgNight, 'night');
    bindSky(this.assets.bgSunset, 'sunset');
    bindSky(this.assets.bgRain, 'rain');

    this.assets.asphalt.onload = () => {
      try {
        this.asphaltPattern = this.ctx.createPattern(this.assets.asphalt, 'repeat');
      } catch (e) {}
    };

    this.assets.bgNight.src = 'assets/textures/bg_night.jpg';
    this.assets.bgSunset.src = 'assets/textures/bg_sunset.jpg';
    this.assets.bgRain.src = 'assets/textures/bg_rain.jpg';
    this.assets.asphalt.src = 'assets/textures/asphalt.jpg';
  }

  rebuildSkyCacheKey(key, img) {
    if (!img || !img.complete || img.naturalWidth <= 0) return;
    const w = Math.max(1, this.viewW);
    const h = Math.max(1, this.viewH);
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const octx = off.getContext('2d', { alpha: false });

    // Cover-fit image cleanly without excessive distortion
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const viewRatio = w / h;
    let dw = w;
    let dh = h;
    let dx = 0;
    let dy = 0;
    if (viewRatio > imgRatio) {
      dh = w / imgRatio;
      dy = (h - dh) * 0.5;
    } else {
      dw = h * imgRatio;
      dx = (w - dw) * 0.5;
    }
    octx.drawImage(img, dx, dy, dw, dh);

    // Subtle dark atmospheric tint so road & HUD pop with higher contrast
    octx.fillStyle = key === 'sunset' ? 'rgba(18, 6, 30, 0.28)' : 'rgba(5, 8, 22, 0.38)';
    octx.fillRect(0, 0, w, h);

    this.skyCache[key] = off;
  }

  rebuildAllRenderCaches() {
    const w = Math.max(1, this.viewW);
    const h = Math.max(1, this.viewH);
    const rx = this.road.baseX;
    const rw = this.road.width;

    // 1. Rebuild cached sky offscreens
    if (this.assets) {
      this.rebuildSkyCacheKey('night', this.assets.bgNight);
      this.rebuildSkyCacheKey('sunset', this.assets.bgSunset);
      this.rebuildSkyCacheKey('rain', this.assets.bgRain);
    }

    // 2. Rebuild cached road lighting gradients (0 allocations per frame)
    const rainGrad = this.ctx.createLinearGradient(rx, 0, rx + rw, 0);
    rainGrad.addColorStop(0, 'rgba(8, 12, 24, 0.88)');
    rainGrad.addColorStop(0.5, 'rgba(18, 26, 48, 0.42)');
    rainGrad.addColorStop(1, 'rgba(8, 12, 24, 0.88)');
    this.roadGrads.rain = rainGrad;

    const normalGrad = this.ctx.createLinearGradient(rx, 0, rx + rw, 0);
    normalGrad.addColorStop(0, 'rgba(12, 16, 34, 0.88)');
    normalGrad.addColorStop(0.5, 'rgba(22, 27, 51, 0.28)');
    normalGrad.addColorStop(1, 'rgba(12, 16, 34, 0.88)');
    this.roadGrads.normal = normalGrad;

    // 3. Pre-bake Slow-Mo & Nitro edge vignettes (replaces per-frame radial gradients)
    const buildVignette = (rgbaEdge) => {
      const vc = document.createElement('canvas');
      vc.width = Math.max(256, Math.round(w * 0.5));
      vc.height = Math.max(256, Math.round(h * 0.5));
      const vctx = vc.getContext('2d');
      const cx = vc.width * 0.5;
      const cy = vc.height * 0.5;
      const grad = vctx.createRadialGradient(cx, cy, vc.width * 0.24, cx, cy, vc.width * 0.68);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(1, rgbaEdge);
      vctx.fillStyle = grad;
      vctx.fillRect(0, 0, vc.width, vc.height);
      return vc;
    };

    this.vignetteCache.slowmo = buildVignette('rgba(0, 242, 255, 0.42)');
    this.vignetteCache.nitro = buildVignette('rgba(255, 0, 119, 0.28)');

    // 4. Pre-bake soft radial streetlight asphalt reflection pools
    if (!this.edgeGlowCache) {
      const buildPool = (rgb) => {
        const pc = document.createElement('canvas');
        pc.width = 72;
        pc.height = 72;
        const pctx = pc.getContext('2d');
        const g = pctx.createRadialGradient(36, 36, 2, 36, 36, 34);
        g.addColorStop(0, `rgba(${rgb}, 0.26)`);
        g.addColorStop(0.5, `rgba(${rgb}, 0.09)`);
        g.addColorStop(1, `rgba(${rgb}, 0)`);
        pctx.fillStyle = g;
        pctx.fillRect(0, 0, 72, 72);
        return pc;
      };
      this.edgeGlowCache = {
        cyan: buildPool('0, 242, 255'),
        pink: buildPool('255, 0, 119'),
        yellow: buildPool('255, 230, 0')
      };
    }
  }

  cacheHudElements() {
    const get = (id) => document.getElementById(id);
    this.hudEl = {
      score: get('hud-score-val'),
      speed: get('hud-speed-val'),
      coins: get('hud-coin-val'),
      dist: get('hud-dist-val'),
      healthBar: get('hud-health-bar'),
      healthPct: get('hud-health-pct'),
      nitroBar: get('hud-nitro-bar'),
      nitroPct: get('hud-nitro-pct'),
      cyberBar: get('hud-cyber-bar'),
      cyberPct: get('hud-cyber-pct'),
      badgeSlow: get('badge-slowmo'),
      badgeHack: get('badge-hack'),
      stageBar: get('hud-stage-bar'),
      stageName: get('hud-stage-name'),
      stageDistLeft: get('hud-stage-dist-left'),
      heatEl: get('hud-police-heat'),
      heatStars: get('hud-heat-stars'),
      bombAlert: get('speed-bomb-alert'),
      steeringWheel: document.querySelector('.steering-wheel'),
      gear: get('hud-gear-val'),
      rpm: get('hud-rpm-val'),
      rpmBar: get('hud-rpm-bar'),
      turboVal: get('hud-turbo-val'),
      turboBar: get('hud-turbo-bar'),
      gVal: get('hud-gforce-val'),
      gBar: get('hud-gforce-bar'),
      tireTemp: get('hud-tire-temp'),
      tireGrip: get('hud-tire-grip'),
      scanName: get('scan-target-name'),
      scanDist: get('scan-target-dist'),
      scanStatus: get('scan-target-status'),
      missionTitle: get('hud-active-mission-title'),
      missionBar: get('hud-active-mission-bar'),
      missionCount: get('hud-active-mission-count'),
      envWeather: get('hud-env-weather'),
      comboVal: get('hud-combo-val'),
      nearMissBanner: get('near-miss-banner')
    };

    this.minimapCanvas = get('minimap-canvas');
    this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;
  }

  _setText(el, key, value) {
    if (!el) return;
    const str = String(value);
    if (this._hudCache[key] !== str) {
      this._hudCache[key] = str;
      el.textContent = str;
    }
  }

  _setWidth(el, key, pct) {
    if (!el) return;
    const rounded = Math.round(pct);
    if (this._hudCache[key] !== rounded) {
      this._hudCache[key] = rounded;
      el.style.width = rounded + '%';
    }
  }

  _setColor(el, key, color) {
    if (!el) return;
    if (this._hudCache[key] !== color) {
      this._hudCache[key] = color;
      el.style.color = color;
    }
  }

  getRoadCurve(y) {
    return 0; // Classic straight highway
  }

  getRoadX(y) {
    return this.road.baseX;
  }

  resizeCanvas() {
    const dpr = 1.0;
    const width = window.innerWidth || 1280;
    const height = window.innerHeight || 720;

    this.viewW = width;
    this.viewH = height;

    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (this.assets && this.assets.asphalt && this.assets.asphalt.complete && this.assets.asphalt.naturalWidth > 0) {
      try {
        this.asphaltPattern = this.ctx.createPattern(this.assets.asphalt, 'repeat');
      } catch (e) {}
    }

    const maxRoadW = Math.min(width * 0.92, 440);
    this.road.width = Math.max(300, maxRoadW);
    this.road.laneWidth = this.road.width / this.road.lanes;
    this.road.baseX = Math.round((width - this.road.width) * 0.5);
    this.road.x = this.road.baseX;

    this.rebuildAllRenderCaches();

    if (this.gameState === 'menu' || this.gameState === 'playing') {
      this.player.y = height - 190;
      if (this.player.x === 0) {
        this.player.x = this.road.getLaneCenter(2, this.player.y);
      } else {
        // Keep player clamped within road bounds on viewport resize
        const halfW = this.player.carData ? this.player.carData.width * 0.5 : 22;
        this.player.x = Math.max(
          this.road.baseX + halfW + 6,
          Math.min(this.road.baseX + this.road.width - halfW - 6, this.player.x)
        );
      }
    }
  }

  clearHeldKeys() {
    this.keys.left = false;
    this.keys.right = false;
    this.keys.up = false;
    this.keys.down = false;
    this.keys.nitro = false;
    this.keys.slowmo = false;
    this.touchSteerX = null;
  }

  isAnyMenuModalOpen() {
    const ids = ['controls-modal', 'settings-screen', 'missions-screen'];
    for (let i = 0; i < ids.length; i++) {
      const el = document.getElementById(ids[i]);
      if (el && !el.classList.contains('hidden')) return true;
    }
    return false;
  }

  initWindowEvents() {
    window.addEventListener('resize', () => this.resizeCanvas());

    const handleKey = (e, isDown) => {
      window.soundSystem.init();
      window.soundSystem.resume();

      const code = e.code || '';
      const key = (e.key || '').toLowerCase();
      const keyCode = e.keyCode || e.which || 0;

      // Keyboard start from title screen (when no secondary modal is open)
      if (isDown && !e.repeat && this.gameState === 'menu' && !this.isAnyMenuModalOpen()) {
        if (code === 'Enter' || code === 'Space') {
          e.preventDefault();
          this.startGame(this.gameMode, 0, false);
          return;
        }
      }

      // Close open modals with Escape
      if (isDown && !e.repeat && (code === 'Escape' || key === 'escape' || keyCode === 27)) {
        if (this.gameState === 'menu' && this.isAnyMenuModalOpen()) {
          document.getElementById('controls-modal')?.classList.add('hidden');
          document.getElementById('settings-screen')?.classList.add('hidden');
          document.getElementById('missions-screen')?.classList.add('hidden');
          e.preventDefault();
          return;
        }
      }

      let matched = false;

      // Left: ArrowLeft, A, Persian 'ش'
      if (code === 'ArrowLeft' || code === 'KeyA' || key === 'arrowleft' || key === 'left' || key === 'a' || key === 'ش' || keyCode === 37 || keyCode === 65) {
        this.keys.left = isDown;
        matched = true;
      }
      // Right: ArrowRight, D, Persian 'ی'
      if (code === 'ArrowRight' || code === 'KeyD' || key === 'arrowright' || key === 'right' || key === 'd' || key === 'ی' || keyCode === 39 || keyCode === 68) {
        this.keys.right = isDown;
        matched = true;
      }
      // Up (Gas): ArrowUp, W, Persian 'ص'
      if (code === 'ArrowUp' || code === 'KeyW' || key === 'arrowup' || key === 'up' || key === 'w' || key === 'ص' || keyCode === 38 || keyCode === 87) {
        this.keys.up = isDown;
        matched = true;
      }
      // Down (Brake): ArrowDown, S, Persian 'س'
      if (code === 'ArrowDown' || code === 'KeyS' || key === 'arrowdown' || key === 'down' || key === 's' || key === 'س' || keyCode === 40 || keyCode === 83) {
        this.keys.down = isDown;
        if (isDown && !e.repeat && this.gameState === 'playing') {
          window.soundSystem.playBrake();
        }
        matched = true;
      }
      // Nitro: Spacebar
      if (code === 'Space' || key === ' ' || key === 'space' || key === 'spacebar' || keyCode === 32) {
        this.keys.nitro = isDown;
        matched = true;
      }
      // Cyber-Reflex Bullet-Time: Shift (Left/Right)
      if (code === 'ShiftLeft' || code === 'ShiftRight' || key === 'shift' || keyCode === 16) {
        this.keys.slowmo = isDown;
        matched = true;
      }

      // One-shot actions (ignore key repeat!)
      if (isDown && !e.repeat) {
        // Horn: KeyH, Persian 'ا'
        if (code === 'KeyH' || key === 'h' || key === 'ا' || keyCode === 72) {
          if (this.gameState === 'playing') this.honkHorn();
          matched = true;
        }
        // Cyber-Hack / EMP: KeyE, KeyF, Persian 'ث', 'ب'
        if (code === 'KeyE' || key === 'e' || key === 'ث' || code === 'KeyF' || key === 'f' || key === 'ب' || keyCode === 69 || keyCode === 70) {
          this.triggerCyberHack();
          matched = true;
        }
        // Pause: KeyP, Escape
        if (code === 'KeyP' || key === 'p' || code === 'Escape' || key === 'escape' || keyCode === 27 || keyCode === 80) {
          if (this.gameState === 'playing' || this.gameState === 'paused') {
            this.pauseGame();
            matched = true;
          }
        }
        // Camera: KeyC, Persian 'ز'
        if (code === 'KeyC' || key === 'c' || key === 'ز' || keyCode === 67) {
          if (this.gameState === 'playing') {
            this.cycleCameraMode();
            matched = true;
          }
        }
      }

      if (matched && (this.gameState === 'playing' || this.gameState === 'paused')) {
        e.preventDefault();
      }
    };

    // Single authoritative keyboard listener on window (fixes double-fire bug!)
    window.addEventListener('keydown', (e) => handleKey(e, true));
    window.addEventListener('keyup', (e) => handleKey(e, false));

    window.addEventListener('blur', () => this.clearHeldKeys());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.clearHeldKeys();
        this.lastTime = 0;
      }
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

    // Low-Spec Performance Mode toggle
    const perfToggle = document.getElementById('perf-toggle');
    if (perfToggle) {
      perfToggle.classList.toggle('on', this.lowSpecMode);
      perfToggle.addEventListener('click', () => {
        this.setLowSpecMode(!this.lowSpecMode);
      });
    }
  }

  cycleCameraMode() {
    const wrapper = document.getElementById('canvas-3d-wrapper');
    const dashboard = document.getElementById('hud-dashboard');
    if (!wrapper) return;

    wrapper.classList.remove(this.cameraMode);
    if (this.cameraMode === 'cam-2d') {
      this.cameraMode = 'cam-3d-out';
      dashboard?.classList.add('hidden');
    } else if (this.cameraMode === 'cam-3d-out') {
      this.cameraMode = 'cam-3d-in';
      dashboard?.classList.remove('hidden');
    } else {
      this.cameraMode = 'cam-2d';
      dashboard?.classList.add('hidden');
    }
    wrapper.classList.add(this.cameraMode);
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
      this.hitstopTimer = 0.045;
      this.empFlash = 0.55;
      window.soundSystem.playEmpBlast();
      window.particleSystem.addEmpShockwave(target.x, target.y, '#00f2ff');
      window.particleSystem.addFloatingText('⚡ EMP: POLICE STALLED! +350', target.x, target.y - 35, '#00f2ff');
      this.screenShake = 11;
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
      this.empFlash = 0.25;
      window.soundSystem.playCyberHack();
      window.particleSystem.addHackSparks(target.x, target.y, '#00ffcc');
      window.particleSystem.addFloatingText('⚡ HACK: LANE OVERRIDE! +180', target.x, target.y - 35, '#00ffcc');
      this.screenShake = 5;
    }
  }

  vibrate(pattern) {
    if (this.vibrateEnabled && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  }

  startGame(mode = 'one_way', stageIndex = 0, isEndless = false) {
    if (this._gameOverTimeout) {
      clearTimeout(this._gameOverTimeout);
      this._gameOverTimeout = null;
    }

    this.gameMode = mode;
    this.setGameState('playing');
    this.isEndless = isEndless;
    this.currentStageIndex = (stageIndex !== undefined) ? stageIndex : 0;
    this.stageStartDistance = 0;
    this.stageCompleted = false;

    const stage = this.STAGES[this.currentStageIndex] || this.STAGES[0];
    // Respect user-selected menu weather on Stage 1; later stages enforce stage weather
    this.weather = (this.currentStageIndex === 0 && !isEndless)
      ? (this.userSelectedWeather || stage.weather)
      : stage.weather;
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
    this.player.speed = 85;
    this.player.nitroAmount = 100;
    this.player.health = 100;
    this.player.maxHealth = 100;
    this.player.invulnerableTimer = 0;
    this.player.y = this.viewH - 190;
    this.player.x = this.road.getLaneCenter(2, this.player.y);
    this.player.vx = 0;
    this.player.steerAngle = 0;
    this.player.spinTimer = 0;
    this.player.isNitroActive = false;
    this.clearHeldKeys();

    // Reset Cyber Abilities & Juice Timers
    this.cyberEnergy = 100;
    this.isSlowMo = false;
    this.timeScale = 1.0;
    this.targetTimeScale = 1.0;
    this.targetedVehicle = null;
    this.sessionHacks = 0;
    this.slowmoTime = 0;
    this.ghostTrailTimer = 0;
    this.hitstopTimer = 0;
    this.damageFlash = 0;
    this.empFlash = 0;

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

    this._hudCache = Object.create(null);
    this.hudAccum = 1;
    this.minimapAccum = 1;

    this.traffic.reset(this.gameMode === 'two_way');
    window.particleSystem.clear();
    window.particleSystem.setLowSpec(this.lowSpecMode);
    window.particleSystem.setWeather(this.weather);

    document.getElementById('start-screen')?.classList.add('hidden');
    document.getElementById('game-over-screen')?.classList.add('hidden');
    document.getElementById('garage-screen')?.classList.add('hidden');
    document.getElementById('settings-screen')?.classList.add('hidden');
    document.getElementById('missions-screen')?.classList.add('hidden');
    document.getElementById('controls-modal')?.classList.add('hidden');
    document.getElementById('pause-modal')?.classList.add('hidden');
    document.getElementById('stage-clear-modal')?.classList.add('hidden');
    document.getElementById('hud')?.classList.remove('hidden');

    this.updateHUD();
    this.renderMinimap();

    window.soundSystem.init();
    window.soundSystem.resume();
    window.soundSystem.startMusic();
  }

  stageComplete() {
    this.stageCompleted = true;
    this.setGameState('stage_clear');
    this.player.speed = 0;
    this.clearHeldKeys();

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
      const rewardEl = document.getElementById('stage-reward-coins');
      const desc = document.getElementById('stage-clear-desc');
      if (title) title.textContent = `🏆 ${stage.name} تکمیل شد!`;
      if (rewardEl) rewardEl.textContent = `+${reward} 💰`;
      if (desc) {
        desc.textContent = `مسافت ${(stage.targetDist / 1000).toFixed(1)} کیلومتر را با مهارت پشت سر گذاشتید! آماده مرحله بعد هستید؟`;
      }
      modal.classList.remove('hidden');
    }
  }

  pauseGame() {
    if (this.gameState === 'playing') {
      this.setGameState('paused');
      this.clearHeldKeys();
      window.soundSystem.stopEngine();
      window.soundSystem.setNitro(false);
      window.soundSystem.stopMusic();
      document.getElementById('pause-modal')?.classList.remove('hidden');
    } else if (this.gameState === 'paused') {
      this.setGameState('playing');
      this.lastTime = 0;
      window.soundSystem.startMusic();
      document.getElementById('pause-modal')?.classList.add('hidden');
      this.canvas?.focus();
    }
  }

  gameOver() {
    this.setGameState('game_over');
    this.screenShake = 22;
    this.damageFlash = 0.85;
    this.clearHeldKeys();

    window.soundSystem.stopEngine();
    window.soundSystem.setNitro(false);
    window.soundSystem.stopMusic();
    window.soundSystem.playCrash();
    this.vibrate([120, 60, 220, 60, 320]);

    window.particleSystem.addExplosion(this.player.x, this.player.y);

    window.carManager.addCoins(this.sessionCoins);
    const isNewRecord = window.carManager.updateHighScore(this.score);

    window.missionManager.recordRaceEnd({
      distance: this.distance,
      sessionCoins: this.sessionCoins,
      nearMisses: this.nearMissCount,
      maxSpeed: this.player.stats.topSpeed + (this.player.isNitroActive ? 45 : 0),
      nitroTime: this.nitroTimeUsed
    });

    this._gameOverTimeout = setTimeout(() => {
      if (this.gameState !== 'game_over') return;
      document.getElementById('hud')?.classList.add('hidden');
      document.getElementById('game-over-screen')?.classList.remove('hidden');

      const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };
      setTxt('go-score', Math.floor(this.score).toLocaleString());
      setTxt('go-dist', (this.distance / 1000).toFixed(1) + ' km');
      setTxt('go-misses', this.nearMissCount);
      setTxt('go-coins', '+' + this.sessionCoins);

      const tag = document.getElementById('new-record-tag');
      if (tag) tag.style.display = isNewRecord ? 'inline-block' : 'none';

      this.updateMenuStats();
    }, 650);
  }

  update(rawDelta) {
    const dt = window.SimUtils ? window.SimUtils.clampDelta(rawDelta, 0.05) : Math.min(0.05, rawDelta);

    // Decay screen flashes and shake in real time even during hitstop / game_over
    if (this.damageFlash > 0) this.damageFlash = Math.max(0, this.damageFlash - dt * 2.4);
    if (this.empFlash > 0) this.empFlash = Math.max(0, this.empFlash - dt * 2.2);
    if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - dt * 32);

    if (this.gameState !== 'playing') {
      // Gently scroll menu road at consistent framerate-independent speed
      if (this.gameState === 'menu') {
        this.roadOffset = (this.roadOffset + 220 * dt) % 80;
        this.bgOffset = (this.bgOffset + 22 * dt) % this.viewW;
      } else if (this.gameState === 'garage') {
        this.garagePreviewAccum += dt;
        if (this.garagePreviewAccum >= 0.08) {
          this.garagePreviewAccum = 0;
          this.renderCarPreview();
        }
      } else if (this.gameState === 'game_over') {
        window.particleSystem.update(0, 0, this.viewW, this.viewH, (y) => this.getRoadX(y), dt);
      }
      return;
    }

    // Tactile hitstop on collision / EMP overload
    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      return;
    }

    const car = this.player.carData;
    const stats = this.player.stats;

    // 0. Cyber-Reflex Bullet-Time & Cyber Energy
    if (this.keys.slowmo && this.cyberEnergy > 2) {
      this.isSlowMo = true;
      this.targetTimeScale = 0.35;
      this.slowmoTime = (this.slowmoTime || 0) + dt;
      this.cyberEnergy = Math.max(0, this.cyberEnergy - dt * 18);
      if (this.cyberEnergy <= 0) {
        this.keys.slowmo = false;
        this.isSlowMo = false;
      }
    } else {
      this.isSlowMo = false;
      this.targetTimeScale = 1.0;
      this.cyberEnergy = Math.min(100, this.cyberEnergy + dt * 7.5);
    }

    this.timeScale += (this.targetTimeScale - this.timeScale) * Math.min(1, 12 * dt);
    const delta = dt * this.timeScale;
    const dt60 = delta * 60;

    // Bullet-Time Ghost Trails
    if (this.isSlowMo && !this.lowSpecMode) {
      this.ghostTrailTimer = (this.ghostTrailTimer || 0) + dt;
      if (this.ghostTrailTimer > 0.075) {
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
      window.particleSystem.addNitroFlame(this.player.x - 14, this.player.y + car.length * 0.5, '#00f2ff');
      window.particleSystem.addNitroFlame(this.player.x + 14, this.player.y + car.length * 0.5, '#ff0077');
      if (Math.random() < 0.16) this.vibrate(25);
    } else {
      this.player.isNitroActive = false;
      window.soundSystem.setNitro(false);
      if (this.player.speed > 70) {
        this.player.nitroAmount = Math.min(100, this.player.nitroAmount + delta * 4);
      }
    }

    // Dynamic Vertical (Y) Surging
    const baseY = this.viewH - 190;
    let targetY = baseY;

    if (this.keys.up) {
      this.player.speed = Math.min(targetMaxSpeed, this.player.speed + accelRate * delta);
      targetY = this.player.isNitroActive ? (baseY - 115) : (baseY - 62);
    } else if (this.keys.down) {
      this.player.speed = Math.max(25, this.player.speed - brakeRate * delta);
      targetY = baseY + 50;
      if (!this.lowSpecMode || Math.random() < 0.4) {
        window.particleSystem.addTireSmoke(this.player.x - 16, this.player.y + car.length * 0.5);
        window.particleSystem.addTireSmoke(this.player.x + 16, this.player.y + car.length * 0.5);
      }
    } else if (this.player.isNitroActive) {
      targetY = baseY - 96;
      this.player.speed = Math.min(targetMaxSpeed, this.player.speed + accelRate * 0.8 * delta);
    } else {
      if (this.player.speed > 90) {
        this.player.speed -= naturalDrag * delta;
      } else if (this.player.speed < 85) {
        this.player.speed += accelRate * 0.4 * delta;
      }
    }

    this.player.y += (targetY - this.player.y) * Math.min(1, 5.5 * delta);

    // Rain spray from tires
    if (this.weather === 'rain' && this.player.speed > 60 && (!this.lowSpecMode || Math.random() < 0.35)) {
      window.particleSystem.addWaterSpray(this.player.x - 16, this.player.y + car.length * 0.5);
      window.particleSystem.addWaterSpray(this.player.x + 16, this.player.y + car.length * 0.5);
    }

    window.soundSystem.updateEngine(this.player.speed, stats.topSpeed + 50, this.keys.up, this.keys.down);

    // 2. Responsive Steering Physics
    let steerDir = 0;
    if (this.keys.left) steerDir -= 1;
    if (this.keys.right) steerDir += 1;

    if (steerDir === 0 && this.touchSteerX !== null) {
      const diff = this.touchSteerX - this.player.x;
      if (Math.abs(diff) > 12) steerDir = diff > 0 ? 1 : -1;
    }

    if (this.player.spinTimer > 0) {
      this.player.spinTimer -= delta;
      this.player.steerAngle = Math.sin(this.player.spinTimer * 18) * 0.35;
      this.player.speed *= Math.pow(0.98, dt60);
      window.particleSystem.addTireSmoke(this.player.x, this.player.y + car.length * 0.5);
    } else {
      let handlingBonus = stats.handling;
      if (this.weather === 'rain') handlingBonus *= 0.85;

      const steerSpeed = 260 + handlingBonus * 28;
      const targetVx = steerDir * steerSpeed;

      const steerDelta = this.isSlowMo ? (dt * 0.72) : delta;
      this.player.vx += (targetVx - this.player.vx) * Math.min(1, 16 * steerDelta);
      this.player.x += this.player.vx * steerDelta;

      this.player.steerAngle = (this.player.vx / steerSpeed) * 0.12;

      if (steerDir !== 0 && Math.abs(this.player.vx) > 180 && Math.random() < 0.25) {
        window.particleSystem.addTireSmoke(this.player.x, this.player.y + car.length * 0.5);
      }
    }

    // Road Boundaries
    const currentRoadX = this.road.baseX;
    this.road.x = currentRoadX;
    const roadLeft = currentRoadX + car.width * 0.5 + 6;
    const roadRight = currentRoadX + this.road.width - car.width * 0.5 - 6;
    if (this.player.x < roadLeft) {
      this.player.x = roadLeft;
      this.player.vx = 0;
      this.player.speed = Math.max(30, this.player.speed * Math.pow(0.96, dt60));
      this.screenShake = Math.max(this.screenShake, 4);
      this.vibrate(25);
    } else if (this.player.x > roadRight) {
      this.player.x = roadRight;
      this.player.vx = 0;
      this.player.speed = Math.max(30, this.player.speed * Math.pow(0.96, dt60));
      this.screenShake = Math.max(this.screenShake, 4);
      this.vibrate(25);
    }

    // 3. Framerate-Independent Road Movement & Distance
    const roadSpeedPixels = this.player.speed * 0.18 * dt60;
    this.roadOffset = (this.roadOffset + roadSpeedPixels) % 80;
    this.distance += (this.player.speed * (1000 / 3600)) * delta;
    this.bgOffset = (this.bgOffset + roadSpeedPixels * 0.08) % this.viewW;

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
        this.screenShake = Math.max(this.screenShake, 3);
        if (this.speedBombTimer <= 0) {
          this.gameOver();
          return;
        }
      } else {
        this.speedBombTimer = Math.min(10, this.speedBombTimer + delta * 2);
      }
    }

    this.player.invulnerableTimer = Math.max(0, (this.player.invulnerableTimer || 0) - delta);

    // Dynamic Police Heat calculation
    const currentStage = this.STAGES[this.currentStageIndex] || this.STAGES[0];
    this.heatLevel = window.SimUtils
      ? window.SimUtils.computeHeatLevel(currentStage.baseHeat, this.player.speed, this.nearMissCount)
      : Math.min(5, (currentStage.baseHeat || 0) + (this.player.speed > 135 ? 1 : 0) + (this.player.speed > 185 ? 1 : 0));

    // Stage Distance & Progression check
    if (!this.isEndless && this.gameState === 'playing') {
      const stageDist = this.distance - this.stageStartDistance;
      if (stageDist >= currentStage.targetDist && !this.stageCompleted) {
        this.stageComplete();
        return;
      }
    }

    // 4. Update Traffic, Hazards & Particles
    this.traffic.update(this.player.speed, this.player.y, delta, this.heatLevel, this.player.x);
    window.particleSystem.update(
      this.player.speed * 0.18,
      this.player.speed,
      this.viewW,
      this.viewH,
      (y) => this.getRoadX(y),
      delta
    );

    this.checkCollisionsAndPickups();
    if (this.gameState !== 'playing') return;
    this.checkHazardCollisions();

    // 5. Cyber Auto-Targeting for Hacking / EMP
    let closestDist = Infinity;
    let bestTarget = null;
    const vehicles = this.traffic.vehicles;
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      const distY = this.player.y - v.y;
      const distX = Math.abs(this.player.x - v.x);
      if (distY > 15 && distY < 480 && distX < 140 && distY < closestDist) {
        closestDist = distY;
        bestTarget = v;
      }
    }
    this.targetedVehicle = bestTarget;

    // 6. Throttled HUD & Mission Updates (~16Hz instead of 60Hz DOM thrashing)
    this.hudAccum += dt;
    if (this.hudAccum >= 0.06) {
      this.hudAccum = 0;
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
    }

    this.minimapAccum += dt;
  }

  checkHazardCollisions() {
    const hazards = window.particleSystem.hazards;
    for (let i = hazards.length - 1; i >= 0; i--) {
      const h = hazards[i];
      const dx = this.player.x - h.x;
      const dy = this.player.y - h.y;
      if (dx * dx + dy * dy < 26 * 26) {
        if (h.type === 'oil') {
          this.player.spinTimer = 0.8;
          window.soundSystem.playBrake();
          this.vibrate(60);
          window.particleSystem.addFloatingText('⚠️ SLIP!', this.player.x, this.player.y - 30, '#ffe600');
        } else if (h.type === 'cone') {
          this.player.speed = Math.max(20, this.player.speed - 20);
          this.screenShake = Math.max(this.screenShake, 6);
          window.soundSystem.playBrake();
          this.vibrate(70);
          window.particleSystem.addExplosion(h.x, h.y);
        }
        hazards.splice(i, 1);
      }
    }
  }

  checkCollisionsAndPickups() {
    const car = this.player.carData;
    const pBox = {
      left: this.player.x - car.width * 0.5 + 5,
      right: this.player.x + car.width * 0.5 - 5,
      top: this.player.y - car.length * 0.5 + 6,
      bottom: this.player.y + car.length * 0.5 - 6
    };

    const vehicles = this.traffic.vehicles;
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      const vBox = {
        left: v.x - v.width * 0.5 + 4,
        right: v.x + v.width * 0.5 - 4,
        top: v.y - v.length * 0.5 + 5,
        bottom: v.y + v.length * 0.5 - 5
      };

      const collided = window.SimUtils
        ? window.SimUtils.checkBoxOverlap(pBox, vBox)
        : (pBox.left < vBox.right && pBox.right > vBox.left && pBox.top < vBox.bottom && pBox.bottom > vBox.top);

      if (collided) {
        if (!this.player.invulnerableTimer || this.player.invulnerableTimer <= 0) {
          const relSpeed = Math.abs(this.player.speed - v.speed);
          let damage = Math.floor(18 + relSpeed * 0.25);
          if (v.isOncoming) damage = Math.floor(35 + this.player.speed * 0.22);
          if (v.isPolice) damage += 8;
          damage = Math.min(55, Math.max(15, damage));

          this.player.health = Math.max(0, this.player.health - damage);
          this.player.invulnerableTimer = 0.85;

          this.player.vx = (this.player.x > v.x ? 320 : -320);
          this.player.speed = Math.max(25, this.player.speed * 0.65);
          this.screenShake = 18;
          this.hitstopTimer = 0.055;
          this.damageFlash = 0.72;
          this.vibrate([100, 50, 160]);

          if (window.soundSystem.playDamageHit) {
            window.soundSystem.playDamageHit();
          }

          window.particleSystem.addFloatingText(`-${damage} HP!`, this.player.x, this.player.y - 30, '#ff0033');
          window.particleSystem.addExplosion((this.player.x + v.x) * 0.5, (this.player.y + v.y) * 0.5);

          this.hudAccum = 1; // Immediate HUD refresh on hit

          if (this.player.health <= 0) {
            this.gameOver();
            return;
          }
        }
      }

      if (!v.nearMissGranted && this.player.speed > 75) {
        const near = window.SimUtils
          ? window.SimUtils.isNearMiss(this.player, v, car.width, car.length, 22)
          : (pBox.top < vBox.bottom && pBox.bottom > vBox.top &&
             (Math.abs(this.player.x - v.x) - (car.width * 0.5 + v.width * 0.5)) >= 0 &&
             (Math.abs(this.player.x - v.x) - (car.width * 0.5 + v.width * 0.5)) < 22);

        if (near) {
          v.nearMissGranted = true;
          this.triggerNearMiss(v.x, v.y);
        }
      }
    }

    const pickups = this.traffic.pickups;
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      const dx = this.player.x - p.x;
      const dy = this.player.y - p.y;
      const hitR = p.radius + car.width * 0.5;
      if (dx * dx + dy * dy < hitR * hitR) {
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
        pickups.splice(i, 1);
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
    this.screenShake = Math.max(this.screenShake, 5);

    if (typeof window.particleSystem.addNearMissSparks === 'function') {
      window.particleSystem.addNearMissSparks((this.player.x + vx) * 0.5, (this.player.y + vy) * 0.5);
    }
    window.particleSystem.addFloatingText(`+${bonus} NEAR MISS! x${this.combo}`, this.player.x, this.player.y - 40, '#00f2ff');

    const banner = this.hudEl.nearMissBanner;
    if (banner) {
      banner.textContent = `🔥 NEAR MISS! +${bonus} (x${this.combo})`;
      banner.classList.add('show');
      if (this._nearMissTimeout) clearTimeout(this._nearMissTimeout);
      this._nearMissTimeout = setTimeout(() => banner.classList.remove('show'), 800);
    }
  }

  updateHUD() {
    const h = this.hudEl;

    this._setText(h.score, 'score', Math.floor(this.score));
    this._setText(h.speed, 'speed', Math.floor(this.player.speed));
    this._setText(h.coins, 'coins', this.sessionCoins);
    this._setText(h.dist, 'dist', (this.distance / 1000).toFixed(1) + ' km');

    // Health Bar & Label
    this._setWidth(h.healthBar, 'healthBar', this.player.health);
    this._setText(h.healthPct, 'healthPct', Math.floor(this.player.health) + '%');

    // Nitro Bar & Label
    this._setWidth(h.nitroBar, 'nitroBar', this.player.nitroAmount);
    this._setText(h.nitroPct, 'nitroPct', Math.floor(this.player.nitroAmount) + '%');

    // Cyber Energy & Badges
    this._setWidth(h.cyberBar, 'cyberBar', this.cyberEnergy);
    this._setText(h.cyberPct, 'cyberPct', Math.floor(this.cyberEnergy) + '%');

    if (h.badgeSlow) {
      const slowActive = this.isSlowMo;
      if (this._hudCache.slowActive !== slowActive) {
        this._hudCache.slowActive = slowActive;
        h.badgeSlow.classList.toggle('active', slowActive);
      }
    }
    if (h.badgeHack) {
      const hackReady = this.targetedVehicle !== null && this.cyberEnergy >= 28;
      if (this._hudCache.hackReady !== hackReady) {
        this._hudCache.hackReady = hackReady;
        h.badgeHack.classList.toggle('active', hackReady);
      }
    }

    // Stage Progression HUD
    const stage = this.STAGES[this.currentStageIndex] || this.STAGES[0];
    const stageDist = this.distance - this.stageStartDistance;
    const stagePct = Math.min(100, Math.max(0, (stageDist / stage.targetDist) * 100));
    this._setWidth(h.stageBar, 'stageBar', stagePct);
    this._setText(h.stageName, 'stageName', this.isEndless ? 'حالت بی‌پایان (Endless)' : stage.name);

    if (this.isEndless) {
      this._setText(h.stageDistLeft, 'stageDistLeft', (this.distance / 1000).toFixed(1) + ' km');
    } else {
      const remaining = Math.max(0, stage.targetDist - stageDist);
      this._setText(h.stageDistLeft, 'stageDistLeft', (remaining / 1000).toFixed(1) + ' km باقی‌مانده');
    }

    // Police Heat Indicator
    if (h.heatEl && h.heatStars) {
      if (this._hudCache.heatLevel !== this.heatLevel) {
        this._hudCache.heatLevel = this.heatLevel;
        if (this.heatLevel > 0) {
          h.heatEl.classList.remove('hidden');
          h.heatEl.style.display = 'inline-flex';
          h.heatStars.textContent = '★'.repeat(this.heatLevel) + '☆'.repeat(5 - this.heatLevel);
        } else {
          h.heatEl.style.display = 'none';
        }
      }
    }

    // Speed Bomb Alert
    if (h.bombAlert) {
      if (this.gameMode === 'speed_bomb') {
        if (this._hudCache.bombVisible !== true) {
          this._hudCache.bombVisible = true;
          h.bombAlert.style.display = 'block';
        }
        this._setText(h.bombAlert, 'bombTxt', `💣 BOMB: ${this.speedBombTimer.toFixed(1)}s`);
        this._setColor(h.bombAlert, 'bombCol', this.speedBombTimer < 4 ? '#ff0033' : '#ffaa00');
      } else if (this._hudCache.bombVisible !== false) {
        this._hudCache.bombVisible = false;
        h.bombAlert.style.display = 'none';
      }
    }

    // 1st Person Steering Wheel
    if (this.cameraMode === 'cam-3d-in' && h.steeringWheel) {
      h.steeringWheel.style.transform = `translateX(-50%) rotate(${(this.player.steerAngle * 80).toFixed(1)}deg)`;
    }

    // Left Telemetry Cockpit (using tested SimUtils.computeTelemetry)
    const tel = window.SimUtils
      ? window.SimUtils.computeTelemetry(this.player.speed, this.keys.up, this.player.isNitroActive, this.player.vx)
      : { gear: 1, rpm: 2800, rpmPct: 32, turboBar: 0.4, turboPct: 16, lateralG: 0, lateralGPct: 0 };

    this._setText(h.gear, 'gear', tel.gear);
    this._setText(h.rpm, 'rpm', tel.rpm.toLocaleString());
    this._setWidth(h.rpmBar, 'rpmBar', tel.rpmPct);
    this._setText(h.turboVal, 'turboVal', tel.turboBar.toFixed(1));
    this._setWidth(h.turboBar, 'turboBar', tel.turboPct);
    this._setText(h.gVal, 'gVal', (tel.lateralG >= 0 ? '+' : '') + tel.lateralG.toFixed(2));
    this._setWidth(h.gBar, 'gBar', tel.lateralGPct);

    // Dynamic tire temp & surface grip
    const fTemp = Math.round(74 + this.player.speed * 0.08 + (this.keys.down ? 8 : 0));
    const rTemp = Math.round(78 + this.player.speed * 0.1 + (this.player.isNitroActive ? 9 : 0));
    this._setText(h.tireTemp, 'tireTemp', `F: ${fTemp}°C | R: ${rTemp}°C`);
    this._setText(h.tireGrip, 'tireGrip', this.weather === 'rain' ? '74% WET' : '99% DRY');
    this._setColor(h.tireGrip, 'tireGripCol', this.weather === 'rain' ? '#00f2ff' : '#00ff88');

    // Right Cyber-Scanner Terminal
    if (this.targetedVehicle) {
      const v = this.targetedVehicle;
      this._setText(h.scanName, 'scanName', v.isPolice ? 'گشت ویژه پلیس' : (v.name || v.type.toUpperCase()));
      this._setText(h.scanDist, 'scanDist', Math.floor((this.player.y - v.y) * 0.28) + ' M');
      if (this.cyberEnergy >= 28) {
        this._setText(h.scanStatus, 'scanStatus', v.isPolice ? 'قفل شده: EMP آماده [E]' : 'قفل شده: هک لاین [E]');
        this._setColor(h.scanStatus, 'scanStatusCol', '#00ffcc');
      } else {
        this._setText(h.scanStatus, 'scanStatus', 'کمبود توان سایبری!');
        this._setColor(h.scanStatus, 'scanStatusCol', '#ffaa00');
      }
    } else {
      this._setText(h.scanName, 'scanName', 'در حال اسکن جاده...');
      this._setText(h.scanDist, 'scanDist', '--');
      this._setText(h.scanStatus, 'scanStatus', 'آماده‌باش [E]');
      this._setColor(h.scanStatus, 'scanStatusCol', 'var(--text-dim)');
    }

    // Active Mission Tracker
    if (window.missionManager && window.missionManager.missions) {
      const activeMission = window.missionManager.missions.find(m => !m.completed) || window.missionManager.missions[0];
      if (activeMission) {
        this._setText(h.missionTitle, 'mTitle', activeMission.title);

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
        this._setWidth(h.missionBar, 'mBar', pct);
        this._setText(h.missionCount, 'mCount', `${curVal} / ${activeMission.target}`);
      }
    }

    // Weather & Combo
    this._setText(
      h.envWeather,
      'envWeather',
      this.weather === 'rain' ? 'بارانی شدید' : (this.weather === 'sunset' ? 'غروب آفتاب' : 'شب تاریک')
    );
    this._setText(h.comboVal, 'comboVal', `x${this.combo} ${this.combo > 1 ? 'COMBO!' : 'NORMAL'}`);
    this._setColor(h.comboVal, 'comboCol', this.combo > 2 ? '#ff0077' : '#00f2ff');
  }

  render() {
    const ctx = this.ctx;
    const width = this.viewW;
    const height = this.viewH;

    ctx.save();
    if (this.screenShake > 0.2) {
      const dx = (Math.random() - 0.5) * this.screenShake;
      const dy = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(dx, dy);
    }

    // 1. Pre-baked Sky / Cityscape Margins
    this.renderSky(ctx, width, height);

    // 2. Cyberpunk Roadside Grid, Guardrails & Light Posts
    this.renderEnvironment(ctx, width, height);

    // 3. Highway Asphalt, Neon Edge Reflections & Lane Markings (Zero Clip Overdraw!)
    this.renderRoad(ctx, height);

    // 4. Particles & Weather
    window.particleSystem.render(ctx, this.player.isNitroActive);

    // 5. Traffic Vehicles & Pickups
    this.traffic.render(ctx, this.lowSpecMode);

    // 6. Player Car
    if ((this.gameState === 'playing' || this.gameState === 'menu') && this.cameraMode !== 'cam-3d-in') {
      const car = this.player.carData || window.carManager.getCurrentCar();
      const color = window.carManager.getCarColor(car.id);
      const underglow = window.carManager.getCarUnderglow(car.id);

      if (this.player.invulnerableTimer > 0) {
        ctx.globalAlpha = (Math.floor(this.player.invulnerableTimer * 16) % 2 === 0) ? 0.35 : 0.95;
      }

      drawCar(ctx, this.player.x, this.player.y, car.width, car.length, color, {
        defaultColor: car.defaultColor,
        underglow: underglow,
        isBraking: this.keys.down,
        hasNitro: this.player.isNitroActive,
        style: car.style,
        spriteKey: car.spriteKey,
        headlights: true,
        steerAngle: this.player.steerAngle,
        isPolice: car.style === 'police',
        policeStrobe: Date.now() * 0.01,
        health: this.player.health,
        lowSpec: this.lowSpecMode
      });

      ctx.globalAlpha = 1.0;
    }

    // 7. Cyber Auto-Targeting Reticle & Laser Data Link
    if (this.targetedVehicle && this.gameState === 'playing') {
      const v = this.targetedVehicle;
      const car = this.player.carData;
      ctx.save();

      const beamColor = v.isPolice ? '#ff0055' : '#00f2ff';
      ctx.strokeStyle = beamColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -(Date.now() * 0.04) % 14;
      ctx.beginPath();
      ctx.moveTo(this.player.x, this.player.y - (car ? car.length * 0.5 : 40));
      ctx.lineTo(v.x, v.y + v.length * 0.5);
      ctx.stroke();

      const bx = v.x - v.width * 0.5 - 8;
      const by = v.y - v.length * 0.5 - 8;
      const bw = v.width + 16;
      const bh = v.length + 16;
      const cl = 10;

      ctx.strokeStyle = v.isPolice ? '#ff3366' : '#00ffcc';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(bx, by + cl); ctx.lineTo(bx, by); ctx.lineTo(bx + cl, by);
      ctx.moveTo(bx + bw - cl, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + cl);
      ctx.moveTo(bx, by + bh - cl); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + cl, by + bh);
      ctx.moveTo(bx + bw - cl, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - cl);
      ctx.stroke();

      ctx.font = 'bold 11px "Orbitron", sans-serif';
      ctx.fillStyle = v.isPolice ? '#ff3366' : '#00ffcc';
      ctx.textAlign = 'center';
      ctx.fillText(v.isPolice ? '⚡ [E] EMP OVERLOAD' : '⚡ [E] OVERRIDE', v.x, by - 6);

      ctx.restore();
    }

    // 8. Pre-baked Vignette & Impact Feedback Overlays (Zero Per-Frame Gradient Alloc)
    if (this.gameState === 'playing') {
      // Bullet-Time Cyan Vignette
      if (this.timeScale < 0.95) {
        const intensity = Math.min(1, (1 - this.timeScale) / 0.65);
        if (!this.lowSpecMode && this.vignetteCache.slowmo) {
          ctx.globalAlpha = intensity;
          ctx.drawImage(this.vignetteCache.slowmo, 0, 0, width, height);
          ctx.globalAlpha = 1;
        }
        const scanY = (Date.now() * 0.35) % height;
        ctx.fillStyle = 'rgba(0, 255, 204, 0.14)';
        ctx.fillRect(0, scanY, width, 3);
      }

      // Nitro Tunnel-Vision Vignette
      if (this.player.isNitroActive && !this.lowSpecMode && this.vignetteCache.nitro) {
        ctx.globalAlpha = 0.7;
        ctx.drawImage(this.vignetteCache.nitro, 0, 0, width, height);
        ctx.globalAlpha = 1;
      }
    }

    // Damage Red Edge Flash
    if (this.damageFlash > 0.02) {
      ctx.fillStyle = `rgba(255, 16, 60, ${(this.damageFlash * 0.34).toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = `rgba(255, 20, 70, ${(this.damageFlash * 0.85).toFixed(3)})`;
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, width - 10, height - 10);
    }

    // EMP / Cyber Hack Electric Flash
    if (this.empFlash > 0.02) {
      ctx.fillStyle = `rgba(0, 242, 255, ${(this.empFlash * 0.2).toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();

    // 9. Throttled Docked GPS Minimap Radar (~15Hz)
    if (this.gameState === 'playing' && this.minimapAccum >= 0.066) {
      this.minimapAccum = 0;
      this.renderMinimap();
    }
  }

  renderMinimap() {
    if (!this.minimapCtx || !this.minimapCanvas) return;

    const ctx = this.minimapCtx;
    const mw = this.minimapCanvas.width;
    const mh = this.minimapCanvas.height;

    ctx.clearRect(0, 0, mw, mh);

    // Subtle radar grid
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mw * 0.5, 0); ctx.lineTo(mw * 0.5, mh);
    ctx.moveTo(0, mh * 0.33); ctx.lineTo(mw, mh * 0.33);
    ctx.moveTo(0, mh * 0.66); ctx.lineTo(mw, mh * 0.66);
    ctx.stroke();

    const lookAhead = 2400;
    const playerScreenY = this.player.y;
    const roadW = this.road.width;
    const mapCenterX = mw * 0.5;
    const mapPlayerY = mh - 14;
    const mapRoadW = Math.min(62, mw * 0.32);

    // Highway ribbon
    ctx.fillStyle = 'rgba(0, 242, 255, 0.12)';
    ctx.fillRect(mapCenterX - mapRoadW * 0.5, 6, mapRoadW, mh - 12);

    ctx.strokeStyle = 'rgba(0, 242, 255, 0.72)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(mapCenterX - mapRoadW * 0.5, 6, mapRoadW, mh - 12);

    // Batched lane dividers
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    for (let l = 1; l <= 3; l++) {
      const lx = mapCenterX - mapRoadW * 0.5 + (l / 4) * mapRoadW;
      ctx.moveTo(lx, 6);
      ctx.lineTo(lx, mh - 6);
    }
    ctx.stroke();
    ctx.restore();

    // Traffic blips
    const vehicles = this.traffic && this.traffic.vehicles;
    if (vehicles) {
      for (let i = 0; i < vehicles.length; i++) {
        const v = vehicles[i];
        const relDist = playerScreenY - v.y;
        if (relDist >= -80 && relDist <= lookAhead) {
          const my = mapPlayerY - (relDist / lookAhead) * (mh - 26);
          const laneRatio = (v.laneOffset !== undefined ? v.laneOffset : (v.x - this.road.baseX)) / roadW - 0.5;
          const mx = mapCenterX + laneRatio * mapRoadW;

          ctx.fillStyle = v.isOncoming ? '#ff0055' : (v.isPolice ? '#00e5ff' : '#ffaa00');
          ctx.fillRect(mx - 2.5, my - 2.5, 5, 5);
        }
      }
    }

    // Pickup blips
    const pickups = this.traffic && this.traffic.pickups;
    if (pickups) {
      for (let i = 0; i < pickups.length; i++) {
        const p = pickups[i];
        const relDist = playerScreenY - p.y;
        if (relDist >= 0 && relDist <= lookAhead) {
          const my = mapPlayerY - (relDist / lookAhead) * (mh - 26);
          const laneRatio = ((p.laneOffset || 190) / roadW) - 0.5;
          const mx = mapCenterX + laneRatio * mapRoadW;

          ctx.fillStyle = p.type === 'coin' ? '#ffe600' : (p.type === 'repair' ? '#00ff88' : '#ff0077');
          ctx.fillRect(mx - 2, my - 2, 4, 4);
        }
      }
    }

    // Player arrowhead
    const pLaneRatio = ((this.player.x - this.road.baseX) / roadW) - 0.5;
    const pmx = mapCenterX + pLaneRatio * mapRoadW;

    ctx.fillStyle = '#00f2ff';
    ctx.beginPath();
    ctx.moveTo(pmx, mapPlayerY - 6);
    ctx.lineTo(pmx + 4.5, mapPlayerY + 4);
    ctx.lineTo(pmx, mapPlayerY + 1.5);
    ctx.lineTo(pmx - 4.5, mapPlayerY + 4);
    ctx.closePath();
    ctx.fill();
  }

  renderSky(ctx, width, height) {
    const cached = this.skyCache[this.weather] || this.skyCache.night;
    const rx = this.road.baseX;
    const rw = this.road.width;
    const rightX = rx + rw;
    const rightW = Math.max(0, width - rightX);

    if (cached) {
      // Only blit the visible left & right roadside strips (skips hidden pixels beneath the road!)
      if (rx > 0) {
        ctx.drawImage(cached, 0, 0, rx, height, 0, 0, rx, height);
      }
      if (rightW > 0) {
        ctx.drawImage(cached, rightX, 0, rightW, height, rightX, 0, rightW, height);
      }
    } else {
      ctx.fillStyle = this.weather === 'sunset' ? '#240b36' : '#070913';
      if (rx > 0) ctx.fillRect(0, 0, rx, height);
      if (rightW > 0) ctx.fillRect(rightX, 0, rightW, height);
    }
  }

  renderEnvironment(ctx, width, height) {
    const rx = this.road.baseX;
    const rw = this.road.width;
    const rightEdge = rx + rw;

    // 0. Batched Retro Cyberpunk Grid Lines (single beginPath + stroke!)
    const gridSpacing = 60;
    const gOffset = (this.roadOffset * 1.2) % gridSpacing;
    ctx.strokeStyle = this.weather === 'sunset' ? 'rgba(255, 0, 119, 0.14)' : 'rgba(0, 242, 255, 0.13)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = -gridSpacing + gOffset; y < height + gridSpacing; y += gridSpacing) {
      if (rx > 30) {
        ctx.moveTo(0, y);
        ctx.lineTo(rx - 8, y);
      }
      if (width - rightEdge > 30) {
        ctx.moveTo(rightEdge + 8, y);
        ctx.lineTo(width, y);
      }
    }
    ctx.stroke();

    // 1. Left & Right neon guardrails
    const leftColor = this.weather === 'sunset' ? '#ff0077' : '#00f2ff';
    const rightColor = this.weather === 'sunset' ? '#ffe600' : '#ff0077';

    ctx.lineWidth = 4;
    ctx.strokeStyle = leftColor;
    ctx.beginPath();
    ctx.moveTo(rx, 0);
    ctx.lineTo(rx, height);
    ctx.stroke();

    ctx.strokeStyle = rightColor;
    ctx.beginPath();
    ctx.moveTo(rightEdge, 0);
    ctx.lineTo(rightEdge, height);
    ctx.stroke();

    // 2. Roadside light posts (batched by color)
    const poleSpacing = 160;
    const offset = (this.roadOffset * 2) % poleSpacing;

    ctx.fillStyle = leftColor;
    for (let y = -poleSpacing + offset; y < height + poleSpacing; y += poleSpacing) {
      ctx.fillRect(rx - 22, y, 12, 6);
    }

    ctx.fillStyle = rightColor;
    for (let y = -poleSpacing + offset; y < height + poleSpacing; y += poleSpacing) {
      ctx.fillRect(rightEdge + 10, y, 12, 6);
    }

    // 3. Holographic Roadside Billboards (skipped in Low-Spec mode)
    if (!this.lowSpecMode) {
      const billboardSpacing = 720;
      const bOffset = (this.roadOffset * 1.4) % billboardSpacing;
      const billboardY = -120 + bOffset;

      ctx.font = 'bold 8px "Orbitron", sans-serif';
      ctx.textAlign = 'center';

      if (rx > 125) {
        ctx.fillStyle = 'rgba(10, 15, 35, 0.88)';
        ctx.strokeStyle = '#00f2ff';
        ctx.lineWidth = 2;
        ctx.fillRect(rx - 114, billboardY, 82, 44);
        ctx.strokeRect(rx - 114, billboardY, 82, 44);
        ctx.fillStyle = '#00f2ff';
        ctx.fillText('SHABGARD', rx - 73, billboardY + 19);
        ctx.fillStyle = '#ff0077';
        ctx.fillText('NEON 2077', rx - 73, billboardY + 34);
      }

      if (width - rightEdge > 125) {
        const rby = billboardY + 320;
        ctx.fillStyle = 'rgba(10, 15, 35, 0.88)';
        ctx.strokeStyle = '#ff0077';
        ctx.lineWidth = 2;
        ctx.fillRect(rightEdge + 32, rby, 82, 44);
        ctx.strokeRect(rightEdge + 32, rby, 82, 44);
        ctx.fillStyle = '#ffe600';
        ctx.fillText('TURBO BOOST', rightEdge + 73, rby + 19);
        ctx.fillStyle = '#00ffcc';
        ctx.fillText('N2O SYSTEM', rightEdge + 73, rby + 34);
      }
    }
  }

  renderRoad(ctx, height) {
    const rx = this.road.baseX;
    const rw = this.road.width;

    // 1. Exact-bounds asphalt surface (Zero ctx.clip(), 1x pixel fill instead of 12x!)
    if (this.asphaltPattern && !this.lowSpecMode) {
      ctx.save();
      ctx.translate(rx, this.roadOffset);
      ctx.fillStyle = this.asphaltPattern;
      ctx.fillRect(0, -this.roadOffset, rw, height);
      ctx.restore();
    } else {
      ctx.fillStyle = '#121629';
      ctx.fillRect(rx, 0, rw, height);
    }

    // 2. Cached lighting/vignette gradient over road (0 allocations per frame)
    ctx.fillStyle = this.weather === 'rain' ? this.roadGrads.rain : this.roadGrads.normal;
    ctx.fillRect(rx, 0, rw, height);

    // 3. Soft Scrolling Neon Streetlight Reflections on Asphalt Edges (Normal mode)
    if (!this.lowSpecMode && this.edgeGlowCache) {
      const poleSpacing = 160;
      const offset = (this.roadOffset * 2) % poleSpacing;
      const leftPool = this.weather === 'sunset' ? this.edgeGlowCache.pink : this.edgeGlowCache.cyan;
      const rightPool = this.weather === 'sunset' ? this.edgeGlowCache.yellow : this.edgeGlowCache.pink;

      for (let y = -poleSpacing + offset; y < height + poleSpacing; y += poleSpacing) {
        ctx.drawImage(leftPool, rx - 18, y - 34, 72, 72);
        ctx.drawImage(rightPool, rx + rw - 54, y - 34, 72, 72);
      }
    }

    // 4. Batched Glowing Speed Chevrons
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.28)';
    ctx.lineWidth = 2.5;
    const chevronSpacing = 600;
    const cOffset = (this.roadOffset * 1.5) % chevronSpacing;
    ctx.beginPath();
    for (let y = -chevronSpacing + cOffset; y < height + chevronSpacing; y += chevronSpacing) {
      ctx.moveTo(rx + rw * 0.24, y + 36);
      ctx.lineTo(rx + rw * 0.5, y);
      ctx.lineTo(rx + rw * 0.76, y + 36);
    }
    ctx.stroke();

    // 5. Straight Lane Markings
    const laneW = rw / this.road.lanes;
    ctx.save();
    ctx.lineWidth = 4;

    if (this.gameMode === 'two_way') {
      const centerLx = rx + 2 * laneW;
      ctx.strokeStyle = '#ffe600';
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(centerLx - 3, 0); ctx.lineTo(centerLx - 3, height);
      ctx.moveTo(centerLx + 3, 0); ctx.lineTo(centerLx + 3, height);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.setLineDash([36, 56]);
    ctx.lineDashOffset = -this.roadOffset;
    ctx.beginPath();
    for (let i = 1; i < this.road.lanes; i++) {
      if (this.gameMode === 'two_way' && i === 2) continue;
      const lx = rx + i * laneW;
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, height);
    }
    ctx.stroke();
    ctx.restore();

    // 6. High-speed edge motion lines
    if (this.player.speed > 130 && !this.lowSpecMode) {
      const alpha = Math.min(0.45, (this.player.speed - 130) / 360);
      ctx.fillStyle = this.player.isNitroActive
        ? `rgba(255, 0, 119, ${alpha.toFixed(2)})`
        : `rgba(0, 242, 255, ${alpha.toFixed(2)})`;
      for (let i = 0; i < 6; i++) {
        const y = ((this.roadOffset * 13 + i * 167) % height);
        const len = 55 + (i % 3) * 35;
        ctx.fillRect(rx + 4 + (i % 2) * 5, y, 2, len);
        ctx.fillRect(rx + rw - 11 + (i % 2) * 5, (y + 90) % height, 2, len);
      }
    }
  }

  initGarageUI() {
    this.updateMenuStats();

    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.gameMode = btn.dataset.mode;
      });
    });

    document.querySelectorAll('.weather-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.weather-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.weather = btn.dataset.weather;
        this.userSelectedWeather = btn.dataset.weather;
        window.particleSystem.setWeather(this.weather);
      });
    });

    document.getElementById('btn-play')?.addEventListener('click', () => {
      this.startGame(this.gameMode, 0, false);
    });

    document.getElementById('btn-garage')?.addEventListener('click', () => {
      this.openGarage();
    });

    document.getElementById('btn-close-garage')?.addEventListener('click', () => {
      document.getElementById('garage-screen')?.classList.add('hidden');
      document.getElementById('start-screen')?.classList.remove('hidden');
      this.setGameState('menu');
      this.updateMenuStats();
    });

    document.getElementById('btn-missions')?.addEventListener('click', () => {
      window.missionManager.renderMissionsUI();
      document.getElementById('missions-screen')?.classList.remove('hidden');
    });

    document.getElementById('btn-close-missions')?.addEventListener('click', () => {
      document.getElementById('missions-screen')?.classList.add('hidden');
    });

    document.getElementById('btn-settings')?.addEventListener('click', () => {
      document.getElementById('settings-screen')?.classList.remove('hidden');
    });

    document.getElementById('btn-close-settings')?.addEventListener('click', () => {
      document.getElementById('settings-screen')?.classList.add('hidden');
    });

    document.getElementById('btn-restart')?.addEventListener('click', () => {
      this.startGame(this.gameMode, 0, false);
    });

    document.getElementById('btn-go-garage')?.addEventListener('click', () => {
      document.getElementById('game-over-screen')?.classList.add('hidden');
      this.openGarage();
    });

    document.getElementById('btn-go-home')?.addEventListener('click', () => {
      document.getElementById('game-over-screen')?.classList.add('hidden');
      document.getElementById('start-screen')?.classList.remove('hidden');
      this.setGameState('menu');
      this.updateMenuStats();
    });

    document.getElementById('btn-hud-pause')?.addEventListener('click', () => {
      this.pauseGame();
    });

    document.getElementById('btn-hud-cam')?.addEventListener('click', () => {
      this.cycleCameraMode();
    });

    document.getElementById('btn-resume')?.addEventListener('click', () => {
      this.pauseGame();
    });

    document.getElementById('btn-next-stage')?.addEventListener('click', () => {
      document.getElementById('stage-clear-modal')?.classList.add('hidden');
      const nextStage = this.currentStageIndex + 1;
      if (nextStage < this.STAGES.length) {
        this.startGame(this.gameMode, nextStage, false);
      } else {
        this.startGame(this.gameMode, 0, true);
      }
    });

    document.getElementById('btn-endless-stage')?.addEventListener('click', () => {
      document.getElementById('stage-clear-modal')?.classList.add('hidden');
      this.startGame(this.gameMode, this.currentStageIndex, true);
    });

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
    const coinsEl = document.getElementById('menu-coins');
    const hsEl = document.getElementById('menu-highscore');
    if (coinsEl) coinsEl.textContent = window.carManager.coins.toLocaleString();
    if (hsEl) hsEl.textContent = window.carManager.highScore.toLocaleString();
  }

  openGarage() {
    this.setGameState('garage');
    document.getElementById('start-screen')?.classList.add('hidden');
    document.getElementById('garage-screen')?.classList.remove('hidden');
    this.updateGarageView();
  }

  updateGarageView() {
    const car = window.carManager.getCurrentCar();
    const stats = window.carManager.getEffectiveStats(car);

    const gCoins = document.getElementById('garage-coins-val');
    const cName = document.getElementById('car-name');
    const cClass = document.getElementById('car-class');
    if (gCoins) gCoins.textContent = window.carManager.coins.toLocaleString();
    if (cName) cName.textContent = car.name;
    if (cClass) cClass.textContent = car.category;

    this.setStatBar('stat-speed', stats.topSpeed, 280, `${Math.floor(stats.topSpeed)} km/h`);
    this.setStatBar('stat-accel', stats.accel, 12, `${stats.accel.toFixed(1)}`);
    this.setStatBar('stat-handling', stats.handling, 12, `${stats.handling.toFixed(1)}`);
    this.setStatBar('stat-nitro', stats.nitro, 14, `${stats.nitro.toFixed(1)}s`);

    this.updateUpgradeButton('upgrade-speed', car.id, 'topSpeed');
    this.updateUpgradeButton('upgrade-accel', car.id, 'accel');
    this.updateUpgradeButton('upgrade-handling', car.id, 'handling');
    this.updateUpgradeButton('upgrade-nitro', car.id, 'nitro');

    const actionBtn = document.getElementById('garage-action-btn');
    if (actionBtn) {
      if (car.isUnlocked) {
        actionBtn.textContent = 'انتخاب شده ✓';
        actionBtn.style.background = 'linear-gradient(90deg, #00ff88, #00d0ff)';
      } else {
        actionBtn.textContent = `خرید ماشین (${car.price.toLocaleString()} سکه)`;
        actionBtn.style.background = window.carManager.coins >= car.price
          ? 'linear-gradient(90deg, #ffe600, #ff8800)'
          : 'rgba(255,255,255,0.2)';
      }
    }

    this.syncPaletteActiveStates(car);
    this.renderCarPreview();
  }

  syncPaletteActiveStates(car) {
    const activePaint = window.carManager.getCarColor(car.id);
    const activeGlow = window.carManager.getCarUnderglow(car.id);

    document.querySelectorAll('#paint-palette .color-dot').forEach(dot => {
      dot.classList.toggle('active', dot.dataset.color === activePaint);
    });
    document.querySelectorAll('#underglow-palette .color-dot').forEach(dot => {
      dot.classList.toggle('active', dot.dataset.color === activeGlow);
    });
  }

  setStatBar(elementId, val, max, text) {
    const percent = Math.min(100, (val / max) * 100);
    const row = document.getElementById(elementId);
    if (row) {
      const inner = row.querySelector('.stat-bar-inner');
      const valEl = row.querySelector('.stat-val');
      if (inner) inner.style.width = percent + '%';
      if (valEl) valEl.textContent = text;
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
      btn.textContent = 'MAX';
      btn.disabled = true;
      btn.style.opacity = 0.5;
    } else {
      btn.textContent = `+ (${cost} $) [Lv ${level}/5]`;
      btn.disabled = window.carManager.coins < cost;
      btn.style.opacity = window.carManager.coins >= cost ? 1 : 0.6;
    }
  }

  renderCarPreview() {
    const canvas = document.getElementById('car-preview-canvas');
    if (!canvas || canvas.clientWidth === 0 || canvas.clientHeight === 0) return;

    const targetW = canvas.clientWidth * 2;
    const targetH = canvas.clientHeight * 2;
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const ctx = canvas.getContext('2d');
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    // Sleek neon showroom pad beneath the car
    const cx = canvas.clientWidth * 0.5;
    const cy = canvas.clientHeight * 0.52;
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 52, 66, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    const car = window.carManager.getCurrentCar();
    const color = window.carManager.getCarColor(car.id);
    const underglow = window.carManager.getCarUnderglow(car.id);

    drawCar(ctx, cx, cy, car.width * 1.28, car.length * 1.28, color, {
      defaultColor: car.defaultColor,
      underglow: underglow,
      isBraking: false,
      hasNitro: true,
      style: car.style,
      spriteKey: car.spriteKey,
      headlights: true,
      isPolice: car.style === 'police',
      policeStrobe: Date.now() * 0.01,
      lowSpec: false
    });
  }

  renderColorPalettes() {
    const paintContainer = document.getElementById('paint-palette');
    if (paintContainer) {
      paintContainer.innerHTML = '';
      AVAILABLE_COLORS.forEach(color => {
        const dot = document.createElement('div');
        dot.className = 'color-dot';
        dot.dataset.color = color;
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
        dot.dataset.color = color;
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
      const rawDelta = Math.min(0.05, Math.max(0, (timestamp - this.lastTime) / 1000));
      this.lastTime = timestamp;

      try {
        this.update(rawDelta);
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
