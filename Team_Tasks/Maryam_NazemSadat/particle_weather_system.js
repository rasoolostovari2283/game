/**
 * موتور ذرات و شبیه‌سازی آب‌وهوا (Particle & Weather FX)
 * توسعه‌دهنده: مریم ناظم‌سادات
 * ددلاین تحویل: ۵شنبه ۷ آبان ۱۴۰۳
 */

class ParticleWeatherFX {
  constructor() {
    this.particles = [];
    this.rainDrops = [];
  }

  // اضافه کردن دود لاستیک با انبساط داینامیک
  addTireSmoke(x, y) {
    for (let i = 0; i < 2; i++) {
      this.particles.push({
        x: x + (Math.random() * 8 - 4),
        y: y,
        vx: (Math.random() - 0.5) * 2.5,
        vy: 1 + Math.random() * 2,
        size: 5 + Math.random() * 5,
        maxSize: 22 + Math.random() * 8, // انبساط تدریجی دود
        life: 1.0,
        decay: 0.025,
        color: 'rgba(200, 210, 220, 0.5)',
        type: 'smoke'
      });
    }
  }

  // اضافه کردن شعله نیترو با هسته داغ
  addNitroFlame(x, y, color = '#ff0077') {
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: x + (Math.random() * 6 - 3),
        y: y + Math.random() * 8,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 6 + Math.random() * 8,
        size: 3 + Math.random() * 4,
        life: 1.0,
        decay: 0.06,
        color: Math.random() < 0.3 ? '#ffffff' : color, // هسته سفید
        type: 'fire'
      });
    }
  }

  // به‌روزرسانی فیزیک ذرات
  update(roadSpeed) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy + roadSpeed * 0.4;
      p.life -= p.decay;

      if (p.type === 'smoke') {
        if (p.size < p.maxSize) p.size += 0.4; // رشد دود
      } else {
        p.size = Math.max(0, p.size - 0.05);
      }

      if (p.life <= 0 || p.size <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  // رندر ذرات روی بوم نقاشی
  render(ctx) {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

if (typeof module !== 'undefined') {
  module.exports = ParticleWeatherFX;
}
