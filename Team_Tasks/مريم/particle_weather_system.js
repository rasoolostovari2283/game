/**
 * موتور ذرات و شبیه‌سازی آب‌وهوا (Particle & Visual FX Engine V2.5)
 * توسعه‌دهنده: مریم ناظم‌سادات (توسعه‌دهنده گرافیک و سیستم ذرات)
 * پروژه: Neon Highway - اسپرینت ۲
 */

class ParticleWeatherFX {
  constructor(canvasWidth = 800, canvasHeight = 600) {
    this.width = canvasWidth;
    this.height = canvasHeight;
    this.particles = [];
    this.rainDrops = [];
    this.shockwaves = [];
    this.ghostTrails = [];
    this.weather = 'night';
  }

  setWeather(w) {
    this.weather = w;
    if (w === 'rain') {
      this.initRain(150);
    } else {
      this.rainDrops = [];
    }
  }

  // ۱. دود تایر هنگام ترمز شدید یا لغزش
  addTireSmoke(x, y) {
    for (let i = 0; i < 2; i++) {
      this.particles.push({
        x: x + (Math.random() * 8 - 4),
        y: y,
        vx: (Math.random() - 0.5) * 2.2,
        vy: 1 + Math.random() * 2,
        size: 5 + Math.random() * 5,
        maxSize: 24 + Math.random() * 8,
        life: 1.0,
        decay: 0.022,
        color: 'rgba(210, 225, 235, 0.45)',
        type: 'smoke'
      });
    }
  }

  // ۲. شعله نیترو دوفازی (هسته سفید داغ + هاله نئونی)
  addNitroFlame(x, y, color = '#ff0077') {
    for (let i = 0; i < 4; i++) {
      const isCore = Math.random() < 0.35;
      this.particles.push({
        x: x + (Math.random() * 6 - 3),
        y: y + Math.random() * 8,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 7 + Math.random() * 8,
        size: isCore ? (3 + Math.random() * 3) : (5 + Math.random() * 4),
        maxSize: 12,
        life: 1.0,
        decay: isCore ? 0.06 : 0.04,
        color: isCore ? '#ffffff' : color,
        type: 'fire'
      });
    }
  }

  // ۳. انفجار تصادف (Crash Explosion)
  addExplosion(x, y) {
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 11;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 6,
        life: 1.0,
        decay: 0.02 + Math.random() * 0.025,
        color: Math.random() < 0.4 ? '#ff0055' : (Math.random() < 0.7 ? '#ffaa00' : '#ffffff'),
        type: 'spark'
      });
    }
  }

  // ۴. پالس شوک‌ویو دوگانه الکترومغناطیسی (EMP Expanding Rings)
  addEmpShockwave(x, y, color = '#00f2ff') {
    // حلقه بیرونی فیروزه‌ای
    this.shockwaves.push({
      x: x,
      y: y,
      radius: 10,
      maxRadius: 200,
      expandSpeed: 8,
      life: 1.0,
      decay: 0.035,
      color: color
    });
    // حلقه داخلی سفید فلاش
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
  }

  // ۵. جرقه‌های داده دیجیتال برای هک سایبری (Cyber Hack Sparks)
  addHackSparks(x, y, color = '#00ffcc') {
    for (let i = 0; i < 18; i++) {
      const angle = (Math.random() - 0.5) * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      this.particles.push({
        x: x + (Math.random() * 16 - 8),
        y: y + (Math.random() * 16 - 8),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 2,
        life: 1.0,
        decay: 0.035,
        color: color,
        type: 'spark'
      });
    }
  }

  // ۶. پس‌تصویر رد نئونی اسلوموشن (Ghost Trails)
  addGhostTrail(x, y, width, length, color = '#00f2ff') {
    this.ghostTrails.push({
      x, y, width, length, color,
      alpha: 0.45,
      decay: 0.06
    });
  }

  // ۷. مدیریت باران و اسپلش آب
  initRain(count = 150) {
    this.rainDrops = [];
    for (let i = 0; i < count; i++) {
      this.rainDrops.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        length: 15 + Math.random() * 20,
        speed: 18 + Math.random() * 12,
        alpha: 0.25 + Math.random() * 0.35
      });
    }
  }

  addWaterSplash(x, y) {
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: x + (Math.random() * 8 - 4),
        y: y,
        vx: (Math.random() - 0.5) * 3.5,
        vy: 2 + Math.random() * 4,
        size: 2 + Math.random() * 3,
        life: 0.7,
        decay: 0.04,
        color: 'rgba(200, 240, 255, 0.45)',
        type: 'smoke'
      });
    }
  }

  updateAndRender(ctx, delta, playerSpeed = 80) {
    // رندر باران
    if (this.weather === 'rain' && this.rainDrops.length > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(180, 220, 255, 0.4)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (const d of this.rainDrops) {
        d.y += d.speed + (playerSpeed * 0.08);
        if (d.y > this.height) {
          d.y = -20;
          d.x = Math.random() * this.width;
        }
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - 2, d.y + d.length);
      }
      ctx.stroke();
      ctx.restore();
    }

    // رندر رد زمانی اسلوموشن (Ghost Trails)
    for (let i = this.ghostTrails.length - 1; i >= 0; i--) {
      const g = this.ghostTrails[i];
      g.alpha -= g.decay;
      if (g.alpha <= 0) {
        this.ghostTrails.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.fillStyle = g.color;
      ctx.globalAlpha = g.alpha;
      ctx.shadowColor = g.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.roundRect(g.x - g.width / 2, g.y - g.length / 2, g.width, g.length, 8);
      ctx.fill();
      ctx.restore();
    }

    // رندر شوک‌ویوهای EMP
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.radius += s.expandSpeed;
      s.life -= s.decay;
      if (s.life <= 0 || s.radius >= s.maxRadius) {
        this.shockwaves.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.globalAlpha = s.life;
      ctx.lineWidth = 4 * s.life;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // رندر و به‌روزرسانی ذرات عمومی
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

if (typeof module !== 'undefined') {
  module.exports = ParticleWeatherFX;
}
