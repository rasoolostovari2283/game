// Visual FX, Rain Particles, Road Hazards & Particle System

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.skidMarks = [];
    this.floatingTexts = [];
    this.rainDrops = [];
    this.puddles = [];
    this.hazards = []; // Oil slicks and Traffic cones
    this.speedLines = [];
    this.shockwaves = []; // EMP and Hack shockwaves
    this.ghostTrails = []; // Cyber-Reflex Bullet-Time afterimages
    this.weather = 'night'; // 'night', 'rain', 'sunset'

    this.initRain();
    this.initSpeedLines();
  }

  initSpeedLines() {
    this.speedLines = [];
    const count = 30;
    for (let i = 0; i < count; i++) {
      this.speedLines.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight * 2 - window.innerHeight,
        length: 40 + Math.random() * 80,
        speedMultiplier: 1.5 + Math.random() * 1.5,
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
    const count = 150;
    for (let i = 0; i < count; i++) {
      this.rainDrops.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        length: 15 + Math.random() * 20,
        speed: 16 + Math.random() * 10,
        alpha: 0.2 + Math.random() * 0.4
      });
    }
  }

  initPuddles() {
    this.puddles = [];
    for (let i = 0; i < 6; i++) {
      this.puddles.push({
        x: (Math.random() - 0.5) * 200,
        y: Math.random() * 1000,
        rx: 25 + Math.random() * 25,
        ry: 10 + Math.random() * 8
      });
    }
  }

  // Nitro flame particles
  addNitroFlame(x, y, color = '#ff0077') {
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: x + (Math.random() * 6 - 3),
        y: y + Math.random() * 8,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 6 + Math.random() * 8,
        size: 3 + Math.random() * 4,
        maxSize: 8,
        life: 1.0,
        decay: 0.06 + Math.random() * 0.04,
        color: Math.random() < 0.3 ? '#ffffff' : color, // White hot core
        glow: true,
        type: 'fire'
      });
    }
  }

  // Water spray from wheels when driving in rain
  addWaterSpray(x, y) {
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: x + (Math.random() * 8 - 4),
        y: y,
        vx: (Math.random() - 0.5) * 4,
        vy: 3 + Math.random() * 5,
        size: 2 + Math.random() * 3,
        maxSize: 6,
        life: 0.7,
        decay: 0.03 + Math.random() * 0.02,
        color: 'rgba(200, 240, 255, 0.5)',
        glow: false,
        type: 'smoke' // Expands like smoke
      });
    }
  }

  // Hard steering or braking tire smoke
  addTireSmoke(x, y) {
    for (let i = 0; i < 2; i++) {
      this.particles.push({
        x: x + (Math.random() * 8 - 4),
        y: y,
        vx: (Math.random() - 0.5) * 2.5,
        vy: 1 + Math.random() * 2,
        size: 5 + Math.random() * 5,
        maxSize: 20 + Math.random() * 10, // Smoke billows out
        life: 1.0,
        decay: 0.025 + Math.random() * 0.015,
        color: 'rgba(200, 210, 220, 0.5)',
        glow: false,
        type: 'smoke'
      });
    }
  }

  // Crash explosion particles
  addExplosion(x, y) {
    // Core flash
    this.particles.push({
      x: x, y: y, vx: 0, vy: 0, size: 20, maxSize: 60, life: 1.0, decay: 0.08, color: '#ffffff', glow: true, type: 'flash'
    });
    // Fire/Debris
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 12;
      const colors = ['#ff0055', '#ffaa00', '#ffea00', '#ffffff', '#333333'];
      const isSmoke = Math.random() < 0.3;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 8,
        maxSize: isSmoke ? 25 : 12,
        life: 1.0,
        decay: 0.015 + Math.random() * 0.02,
        color: colors[Math.floor(Math.random() * colors.length)],
        glow: !isSmoke,
        type: isSmoke ? 'smoke' : 'fire'
      });
    }
  }

  // Coin collect sparkles
  addCoinSparkle(x, y) {
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 3,
        life: 1.0,
        decay: 0.04 + Math.random() * 0.02,
        color: '#ffe600',
        glow: true
      });
    }
  }

  // Floating text
  addFloatingText(text, x, y, color = '#00f2ff') {
    this.floatingTexts.push({
      text: text,
      x: x,
      y: y,
      vy: -1.5,
      life: 1.0,
      decay: 0.022,
      color: color
    });
  }

  addSkid(x1, y1, x2, y2) {
    this.skidMarks.push({
      x1, y1, x2, y2,
      life: 1.0,
      decay: 0.008
    });
    if (this.skidMarks.length > 80) {
      this.skidMarks.shift();
    }
  }

  // EMP expanding electric shockwave
  addEmpShockwave(x, y, color = '#00f2ff') {
    this.shockwaves.push({
      x: x,
      y: y,
      radius: 12,
      maxRadius: 200,
      expandSpeed: 8,
      life: 1.0,
      decay: 0.035,
      color: color
    });
    // Secondary inner pulse
    this.shockwaves.push({
      x: x,
      y: y,
      radius: 4,
      maxRadius: 120,
      expandSpeed: 5,
      life: 1.0,
      decay: 0.045,
      color: '#ffffff'
    });
    // Electric discharge sparks
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.5 + Math.random() * 3.5,
        life: 1.0,
        decay: 0.03 + Math.random() * 0.02,
        color: Math.random() < 0.5 ? '#00f2ff' : '#ffffff',
        glow: true,
        type: 'spark'
      });
    }
  }

  // Cyber Hack digital data sparks
  addHackSparks(x, y, color = '#00ffcc') {
    for (let i = 0; i < 22; i++) {
      const angle = (Math.random() - 0.5) * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      this.particles.push({
        x: x + (Math.random() * 20 - 10),
        y: y + (Math.random() * 20 - 10),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 3,
        life: 1.0,
        decay: 0.04 + Math.random() * 0.03,
        color: Math.random() < 0.6 ? color : '#00f2ff',
        glow: true,
        type: 'cyber'
      });
    }
  }

  // Cyber-Reflex Bullet-Time Ghost Trail Afterimage
  addGhostTrail(x, y, width, length, steerAngle, color = '#00f2ff', spriteKey = null) {
    this.ghostTrails.push({
      x: x,
      y: y,
      width: width,
      length: length,
      steerAngle: steerAngle,
      color: color,
      spriteKey: spriteKey,
      life: 0.65,
      decay: 0.05
    });
  }

  // Spawn dynamic road hazards (Oil slicks, traffic cones)
  spawnHazard(roadX, roadW, playerY) {
    if (this.hazards.length >= 4) return;
    const type = Math.random() < 0.5 ? 'oil' : 'cone';
    const offset = 30 + Math.random() * (roadW - 60);
    const y = playerY - 950;
    this.hazards.push({
      type: type,
      offset: offset,
      x: roadX + offset,
      y: y,
      width: type === 'oil' ? 36 : 22,
      height: type === 'oil' ? 24 : 22,
      active: true
    });
  }

  update(roadSpeed, playerSpeed, width, height, getRoadX = null) {
    // 1. Update Rain
    if (this.weather === 'rain') {
      const slant = (playerSpeed / 100) * 4;
      for (const drop of this.rainDrops) {
        drop.y += drop.speed + roadSpeed * 0.5;
        drop.x -= slant;
        if (drop.y > height) {
          // Spawn splash
          for(let i=0; i<2; i++) {
            this.particles.push({
              x: drop.x + (Math.random()*4 - 2),
              y: height - Math.random()*20,
              vx: (Math.random() - 0.5) * 2,
              vy: -1 - Math.random() * 2,
              size: 1 + Math.random() * 2,
              maxSize: 3,
              life: 0.5,
              decay: 0.05,
              color: 'rgba(200, 230, 255, 0.6)',
              glow: false,
              type: 'water'
            });
          }
          drop.y = -drop.length;
          drop.x = Math.random() * (width + 200);
        }
      }

      // Update puddles
      for (const pud of this.puddles) {
        pud.y += roadSpeed;
        if (pud.y > height + 50) {
          pud.y = -100;
          pud.x = (Math.random() - 0.5) * 220;
        }
      }
    }

    // 2. Update Hazards
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      h.y += roadSpeed;
      if (getRoadX && h.offset !== undefined) {
        h.x = getRoadX(h.y) + h.offset;
      }
      if (h.y > height + 200) {
        this.hazards.splice(i, 1);
      }
    }

    // 3. Update Skid marks
    for (let i = this.skidMarks.length - 1; i >= 0; i--) {
      const s = this.skidMarks[i];
      s.y1 += roadSpeed;
      s.y2 += roadSpeed;
      s.life -= s.decay;
      if (s.life <= 0 || s.y1 > 1200) {
        this.skidMarks.splice(i, 1);
      }
    }

    // 4. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy + roadSpeed * 0.4;
      p.life -= p.decay;
      
      if (p.type === 'smoke') {
        // Smoke expands as it fades
        if (p.size < p.maxSize) {
          p.size += 0.4;
        }
      } else if (p.type === 'flash') {
        // Flash expands very quickly
        if (p.size < p.maxSize) {
          p.size += 6.0;
        }
      } else {
        // Default fire/sparks shrink
        p.size = Math.max(0, p.size - 0.05);
      }

      if (p.life <= 0 || p.size <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 5. Update Floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.life -= ft.decay;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // 6. Update Speed Lines
    for (const line of this.speedLines) {
      line.y += roadSpeed * line.speedMultiplier;
      if (line.y > height) {
        line.y = -line.length - Math.random() * height;
        line.x = Math.random() * width;
      }
    }

    // 7. Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.y += roadSpeed * 0.4;
      sw.radius += sw.expandSpeed;
      sw.life -= sw.decay;
      if (sw.life <= 0 || sw.radius >= sw.maxRadius) {
        this.shockwaves.splice(i, 1);
      }
    }

    // 8. Update Ghost Trails (Bullet Time)
    for (let i = this.ghostTrails.length - 1; i >= 0; i--) {
      const gt = this.ghostTrails[i];
      gt.y += roadSpeed * 0.15;
      gt.life -= gt.decay;
      if (gt.life <= 0) {
        this.ghostTrails.splice(i, 1);
      }
    }
  }

  render(ctx) {
    // 0. Render Ghost Trails (under vehicles - zero-blur fast rendering)
    if (this.ghostTrails.length > 0) {
      ctx.save();
      for (const gt of this.ghostTrails) {
        ctx.save();
        ctx.translate(gt.x, gt.y);
        ctx.rotate(gt.steerAngle || 0);
        ctx.globalAlpha = Math.max(0, gt.life * 0.35);
        ctx.fillStyle = gt.color || '#00f2ff';
        ctx.fillRect(-gt.width / 2, -gt.length / 2, gt.width, gt.length);
        ctx.restore();
      }
      ctx.restore();
    }
    // 1. Render skid marks
    ctx.save();
    for (const s of this.skidMarks) {
      ctx.strokeStyle = `rgba(18, 18, 22, ${s.life * 0.55})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    }
    ctx.restore();

    // 2. Render road hazards (Oil slicks / Cones)
    ctx.save();
    for (const h of this.hazards) {
      if (h.type === 'oil') {
        // Oil slick with rainbow sheen
        ctx.save();
        ctx.fillStyle = 'rgba(10, 10, 15, 0.85)';
        ctx.beginPath();
        ctx.ellipse(h.x, h.y, h.width / 2, h.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(0, 242, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      } else {
        // Traffic Cone
        ctx.save();
        // Base
        ctx.fillStyle = '#222';
        ctx.fillRect(h.x - 11, h.y + 6, 22, 6);
        // Orange Cone
        ctx.fillStyle = '#ff5500';
        ctx.beginPath();
        ctx.moveTo(h.x, h.y - 12);
        ctx.lineTo(h.x - 9, h.y + 6);
        ctx.lineTo(h.x + 9, h.y + 6);
        ctx.closePath();
        ctx.fill();
        // White reflective stripe
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(h.x - 4, h.y - 3);
        ctx.lineTo(h.x + 4, h.y - 3);
        ctx.lineTo(h.x + 6, h.y + 1);
        ctx.lineTo(h.x - 6, h.y + 1);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();

    // 3. Render particles (Zero blur, ultra-fast 60 FPS)
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 4. Render floating texts
    ctx.save();
    ctx.font = '900 16px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    for (const ft of this.floatingTexts) {
      ctx.globalAlpha = Math.max(0, ft.life);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.restore();

    // 5. Render Rain (if active)
    if (this.weather === 'rain') {
      ctx.save();
      ctx.strokeStyle = 'rgba(180, 220, 255, 0.55)';
      ctx.lineWidth = 1.5;
      for (const drop of this.rainDrops) {
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 4, drop.y + drop.length);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 6. Render Speed Lines
    ctx.save();
    ctx.lineWidth = 1.5;
    for (const line of this.speedLines) {
      const opacity = line.alpha;
      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.beginPath();
      ctx.moveTo(line.x, line.y);
      ctx.lineTo(line.x, line.y + line.length);
      ctx.stroke();
    }
    ctx.restore();

    // 7. Render EMP & Cyber Shockwaves (Crisp zero-blur alpha rings)
    if (this.shockwaves.length > 0) {
      ctx.save();
      for (const sw of this.shockwaves) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, sw.life);
        ctx.strokeStyle = sw.color || '#00f2ff';
        ctx.lineWidth = 3.5 * sw.life;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
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
