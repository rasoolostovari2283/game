// High-Performance Visual FX, Batched Weather, Hazards & Capped Particle System

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.skidMarks = [];
    this.floatingTexts = [];
    this.rainDrops = [];
    this.puddles = [];
    this.hazards = [];
    this.speedLines = [];
    this.shockwaves = [];
    this.ghostTrails = [];
    this.weather = 'night';
    this.lowSpec = false;
    this.maxParticles = 140;

    this.initSpeedLines();
  }

  setLowSpec(enabled) {
    this.lowSpec = !!enabled;
    this.maxParticles = this.lowSpec ? 55 : 140;
    this.initSpeedLines();
    if (this.weather === 'rain') {
      this.initRain();
    }
  }

  _pushParticle(p) {
    if (this.particles.length >= this.maxParticles) {
      // Reuse oldest slot to prevent unbounded GC spikes
      this.particles[0] = p;
      return;
    }
    this.particles.push(p);
  }

  initSpeedLines() {
    this.speedLines = [];
    const count = this.lowSpec ? 14 : 28;
    const w = window.innerWidth || 1280;
    const h = window.innerHeight || 720;
    for (let i = 0; i < count; i++) {
      this.speedLines.push({
        x: Math.random() * w,
        y: Math.random() * h * 2 - h,
        length: 40 + Math.random() * 85,
        speedMultiplier: 1.6 + Math.random() * 1.5,
        alpha: 0.1 + Math.random() * 0.2
      });
    }
  }

  setWeather(w) {
    this.weather = w;
    if (w === 'rain') {
      this.initRain();
      this.initPuddles();
    } else {
      this.rainDrops = [];
      this.puddles = [];
    }
  }

  initRain() {
    this.rainDrops = [];
    const count = this.lowSpec ? 55 : 110;
    const w = window.innerWidth || 1280;
    const h = window.innerHeight || 720;
    for (let i = 0; i < count; i++) {
      this.rainDrops.push({
        x: Math.random() * w,
        y: Math.random() * h,
        length: 14 + Math.random() * 18,
        speed: 15 + Math.random() * 10
      });
    }
  }

  initPuddles() {
    this.puddles = [];
    for (let i = 0; i < 5; i++) {
      this.puddles.push({
        x: (Math.random() - 0.5) * 200,
        y: Math.random() * 1000,
        rx: 24 + Math.random() * 22,
        ry: 9 + Math.random() * 7
      });
    }
  }

  addNitroFlame(x, y, color = '#ff0077') {
    const count = this.lowSpec ? 1 : 3;
    for (let i = 0; i < count; i++) {
      this._pushParticle({
        x: x + (Math.random() * 6 - 3),
        y: y + Math.random() * 8,
        vx: (Math.random() - 0.5) * 1.4,
        vy: 6 + Math.random() * 7,
        size: 3 + Math.random() * 3.5,
        maxSize: 8,
        life: 1.0,
        decay: 0.065 + Math.random() * 0.04,
        color: Math.random() < 0.3 ? '#ffffff' : color,
        type: 'fire'
      });
    }
  }

  addWaterSpray(x, y) {
    if (this.lowSpec && Math.random() < 0.5) return;
    const count = this.lowSpec ? 1 : 2;
    for (let i = 0; i < count; i++) {
      this._pushParticle({
        x: x + (Math.random() * 8 - 4),
        y: y,
        vx: (Math.random() - 0.5) * 3.5,
        vy: 3 + Math.random() * 4,
        size: 2 + Math.random() * 2.5,
        maxSize: 6,
        life: 0.65,
        decay: 0.035 + Math.random() * 0.02,
        color: 'rgba(200, 240, 255, 0.45)',
        type: 'smoke'
      });
    }
  }

  addTireSmoke(x, y) {
    const count = this.lowSpec ? 1 : 2;
    for (let i = 0; i < count; i++) {
      this._pushParticle({
        x: x + (Math.random() * 8 - 4),
        y: y,
        vx: (Math.random() - 0.5) * 2.2,
        vy: 1 + Math.random() * 2,
        size: 5 + Math.random() * 4,
        maxSize: 18 + Math.random() * 8,
        life: 0.9,
        decay: 0.03 + Math.random() * 0.015,
        color: 'rgba(200, 210, 225, 0.42)',
        type: 'smoke'
      });
    }
  }

  addNearMissSparks(x, y) {
    const count = this.lowSpec ? 8 : 16;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 6.5;
      this._pushParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.2 + Math.random() * 2.5,
        maxSize: 5,
        life: 1.0,
        decay: 0.05 + Math.random() * 0.03,
        color: Math.random() < 0.5 ? '#00f2ff' : '#ffffff',
        type: 'spark'
      });
    }
  }

  addExplosion(x, y) {
    this._pushParticle({
      x, y, vx: 0, vy: 0, size: 18, maxSize: 58, life: 1.0, decay: 0.08, color: '#ffffff', type: 'flash'
    });
    const count = this.lowSpec ? 22 : 42;
    const colors = ['#ff0055', '#ffaa00', '#ffea00', '#ffffff', '#333333'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 11;
      const isSmoke = Math.random() < 0.3;
      this._pushParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 7,
        maxSize: isSmoke ? 22 : 11,
        life: 1.0,
        decay: 0.02 + Math.random() * 0.02,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: isSmoke ? 'smoke' : 'fire'
      });
    }
  }

  addCoinSparkle(x, y) {
    const count = this.lowSpec ? 6 : 12;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4;
      this._pushParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.5 + Math.random() * 2.5,
        maxSize: 6,
        life: 1.0,
        decay: 0.045 + Math.random() * 0.02,
        color: '#ffe600',
        type: 'spark'
      });
    }
  }

  addFloatingText(text, x, y, color = '#00f2ff') {
    if (this.floatingTexts.length >= 10) {
      this.floatingTexts.shift();
    }
    this.floatingTexts.push({
      text,
      x,
      y,
      vy: -1.6,
      life: 1.0,
      decay: 0.022,
      color
    });
  }

  addSkid(x1, y1, x2, y2) {
    this.skidMarks.push({ x1, y1, x2, y2, life: 1.0, decay: 0.01 });
    if (this.skidMarks.length > (this.lowSpec ? 30 : 60)) {
      this.skidMarks.shift();
    }
  }

  addEmpShockwave(x, y, color = '#00f2ff') {
    this.shockwaves.push({
      x, y, radius: 12, maxRadius: 210, expandSpeed: 8.5, life: 1.0, decay: 0.035, color
    });
    this.shockwaves.push({
      x, y, radius: 4, maxRadius: 125, expandSpeed: 5.5, life: 1.0, decay: 0.045, color: '#ffffff'
    });
    const count = this.lowSpec ? 10 : 22;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      this._pushParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.5 + Math.random() * 3,
        maxSize: 6,
        life: 1.0,
        decay: 0.035 + Math.random() * 0.02,
        color: Math.random() < 0.5 ? '#00f2ff' : '#ffffff',
        type: 'spark'
      });
    }
  }

  addHackSparks(x, y, color = '#00ffcc') {
    const count = this.lowSpec ? 8 : 16;
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() - 0.5) * Math.PI * 2;
      const speed = 2 + Math.random() * 5.5;
      this._pushParticle({
        x: x + (Math.random() * 20 - 10),
        y: y + (Math.random() * 20 - 10),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.5 + Math.random() * 2.5,
        maxSize: 6,
        life: 1.0,
        decay: 0.045 + Math.random() * 0.03,
        color: Math.random() < 0.6 ? color : '#00f2ff',
        type: 'cyber'
      });
    }
  }

  addGhostTrail(x, y, width, length, steerAngle, color = '#00f2ff', spriteKey = null) {
    if (this.ghostTrails.length >= 6) this.ghostTrails.shift();
    this.ghostTrails.push({
      x, y, width, length, steerAngle, color, spriteKey, life: 0.65, decay: 0.05
    });
  }

  spawnHazard(roadX, roadW, playerY) {
    if (this.hazards.length >= 4) return;
    const type = Math.random() < 0.5 ? 'oil' : 'cone';
    const offset = 30 + Math.random() * (roadW - 60);
    const y = playerY - 950;
    this.hazards.push({
      type,
      offset,
      x: roadX + offset,
      y,
      width: type === 'oil' ? 36 : 22,
      height: type === 'oil' ? 24 : 22,
      active: true
    });
  }

  update(roadSpeed, playerSpeed, width, height, getRoadX = null, delta = 1 / 60) {
    const dt60 = Math.max(0.1, Math.min(2.5, delta * 60));

    // 1. Update Rain (zero per-drop splash allocations for rock-solid FPS)
    if (this.weather === 'rain') {
      const slant = (playerSpeed / 100) * 3.5 * dt60;
      const drops = this.rainDrops;
      for (let i = 0; i < drops.length; i++) {
        const drop = drops[i];
        drop.y += (drop.speed + roadSpeed * 0.45) * dt60;
        drop.x -= slant;
        if (drop.y > height) {
          drop.y = -drop.length;
          drop.x = Math.random() * (width + 180);
        }
      }

      for (let i = 0; i < this.puddles.length; i++) {
        const pud = this.puddles[i];
        pud.y += roadSpeed * dt60;
        if (pud.y > height + 50) {
          pud.y = -100;
          pud.x = (Math.random() - 0.5) * 220;
        }
      }
    }

    // 2. Update Hazards
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      h.y += roadSpeed * dt60;
      if (getRoadX && h.offset !== undefined) {
        h.x = getRoadX(h.y) + h.offset;
      }
      if (h.y > height + 200) {
        this.hazards[i] = this.hazards[this.hazards.length - 1];
        this.hazards.pop();
      }
    }

    // 3. Update Skid marks
    for (let i = this.skidMarks.length - 1; i >= 0; i--) {
      const s = this.skidMarks[i];
      s.y1 += roadSpeed * dt60;
      s.y2 += roadSpeed * dt60;
      s.life -= s.decay * dt60;
      if (s.life <= 0 || s.y1 > height + 200) {
        this.skidMarks[i] = this.skidMarks[this.skidMarks.length - 1];
        this.skidMarks.pop();
      }
    }

    // 4. Update Particles (O(1) swap-and-pop removal)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt60;
      p.y += (p.vy + roadSpeed * 0.4) * dt60;
      p.life -= p.decay * dt60;

      if (p.type === 'smoke') {
        if (p.size < p.maxSize) p.size += 0.35 * dt60;
      } else if (p.type === 'flash') {
        if (p.size < p.maxSize) p.size += 5.5 * dt60;
      } else {
        p.size = Math.max(0, p.size - 0.05 * dt60);
      }

      if (p.life <= 0 || p.size <= 0) {
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
      }
    }

    // 5. Update Floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt60;
      ft.life -= ft.decay * dt60;
      if (ft.life <= 0) {
        this.floatingTexts[i] = this.floatingTexts[this.floatingTexts.length - 1];
        this.floatingTexts.pop();
      }
    }

    // 6. Update Speed Lines
    for (let i = 0; i < this.speedLines.length; i++) {
      const line = this.speedLines[i];
      line.y += roadSpeed * line.speedMultiplier * dt60;
      if (line.y > height) {
        line.y = -line.length - Math.random() * height;
        line.x = Math.random() * width;
      }
    }

    // 7. Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.y += roadSpeed * 0.4 * dt60;
      sw.radius += sw.expandSpeed * dt60;
      sw.life -= sw.decay * dt60;
      if (sw.life <= 0 || sw.radius >= sw.maxRadius) {
        this.shockwaves[i] = this.shockwaves[this.shockwaves.length - 1];
        this.shockwaves.pop();
      }
    }

    // 8. Update Ghost Trails
    for (let i = this.ghostTrails.length - 1; i >= 0; i--) {
      const gt = this.ghostTrails[i];
      gt.y += roadSpeed * 0.15 * dt60;
      gt.life -= gt.decay * dt60;
      if (gt.life <= 0) {
        this.ghostTrails[i] = this.ghostTrails[this.ghostTrails.length - 1];
        this.ghostTrails.pop();
      }
    }
  }

  render(ctx, nitroActive = false) {
    // 0. Ghost Trails (under vehicles)
    if (this.ghostTrails.length > 0) {
      ctx.save();
      for (let i = 0; i < this.ghostTrails.length; i++) {
        const gt = this.ghostTrails[i];
        ctx.save();
        ctx.translate(gt.x, gt.y);
        if (gt.steerAngle) ctx.rotate(gt.steerAngle);
        ctx.globalAlpha = Math.max(0, gt.life * 0.32);
        ctx.fillStyle = gt.color || '#00f2ff';
        ctx.beginPath();
        ctx.roundRect(-gt.width / 2, -gt.length / 2, gt.width, gt.length, 10);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    // 1. Skid marks (batched)
    if (this.skidMarks.length > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(15, 15, 22, 0.48)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      for (let i = 0; i < this.skidMarks.length; i++) {
        const s = this.skidMarks[i];
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 2. Road hazards
    if (this.hazards.length > 0) {
      ctx.save();
      for (let i = 0; i < this.hazards.length; i++) {
        const h = this.hazards[i];
        if (h.type === 'oil') {
          ctx.fillStyle = 'rgba(10, 10, 18, 0.86)';
          ctx.beginPath();
          ctx.ellipse(h.x, h.y, h.width / 2, h.height / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(0, 242, 255, 0.45)';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          ctx.fillStyle = '#222';
          ctx.fillRect(h.x - 11, h.y + 6, 22, 6);
          ctx.fillStyle = '#ff5500';
          ctx.beginPath();
          ctx.moveTo(h.x, h.y - 12);
          ctx.lineTo(h.x - 9, h.y + 6);
          ctx.lineTo(h.x + 9, h.y + 6);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(h.x - 4, h.y - 3);
          ctx.lineTo(h.x + 4, h.y - 3);
          ctx.lineTo(h.x + 6, h.y + 1);
          ctx.lineTo(h.x - 6, h.y + 1);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // 3. Particles (minimal state changes)
    if (this.particles.length > 0) {
      ctx.save();
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 4. Floating texts
    if (this.floatingTexts.length > 0) {
      ctx.save();
      ctx.font = '900 15px "Orbitron", sans-serif';
      ctx.textAlign = 'center';
      for (let i = 0; i < this.floatingTexts.length; i++) {
        const ft = this.floatingTexts[i];
        ctx.globalAlpha = Math.max(0, ft.life);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
      }
      ctx.restore();
    }

    // 5. Batched Rain (1 draw call instead of 150!)
    if (this.weather === 'rain' && this.rainDrops.length > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(180, 225, 255, 0.5)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i < this.rainDrops.length; i++) {
        const drop = this.rainDrops[i];
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 4, drop.y + drop.length);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 6. Batched Speed Lines (1 draw call instead of 30!)
    if (this.speedLines.length > 0) {
      ctx.save();
      ctx.lineWidth = nitroActive ? 2.0 : 1.3;
      ctx.strokeStyle = nitroActive ? 'rgba(0, 242, 255, 0.28)' : 'rgba(255, 255, 255, 0.14)';
      ctx.beginPath();
      const mult = nitroActive ? 1.55 : 1.0;
      for (let i = 0; i < this.speedLines.length; i++) {
        const line = this.speedLines[i];
        ctx.moveTo(line.x, line.y);
        ctx.lineTo(line.x, line.y + line.length * mult);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 7. Shockwaves
    if (this.shockwaves.length > 0) {
      ctx.save();
      for (let i = 0; i < this.shockwaves.length; i++) {
        const sw = this.shockwaves[i];
        ctx.globalAlpha = Math.max(0, sw.life);
        ctx.strokeStyle = sw.color || '#00f2ff';
        ctx.lineWidth = Math.max(1, 3.5 * sw.life);
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  clear() {
    this.particles = [];
    this.skidMarks = [];
    this.floatingTexts = [];
    this.hazards = [];
    this.shockwaves = [];
    this.ghostTrails = [];
  }
}

window.particleSystem = new ParticleSystem();
