/**
 * ماژول تخصصی فیزیک خودرو، کنترل و اصطکاک (Vehicle Physics & Dynamics)
 * توسعه‌دهنده: احسان کاظمی
 * ددلاین تحویل: ۵شنبه ۷ آبان ۱۴۰۳
 */

class VehiclePhysicsEngine {
  constructor() {
    this.player = {
      x: 0,
      y: 0,
      vx: 0,
      speed: 85,           // سرعت بر حسب کیلومتر بر ساعت
      steerAngle: 0,       // زاویه انحراف بدنه ماشین در پیچ
      spinTimer: 0,        // تایمر اسپین هنگام افتادن در روغن
      isNitroActive: false,
      nitroAmount: 100
    };

    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false,
      nitro: false
    };
  }

  /**
   * محاسبه فیزیک شتاب، درگ، ترمز و اینرسی حرکت
   * @param {number} delta - زمان دلتا به ثانیه بین دو فریم
   * @param {object} carStats - آمار ارتقاء یافته خودرو (topSpeed, accel, handling, braking, nitro)
   * @param {string} weather - آب‌وهوای جاری (night, rain, sunset)
   */
  updatePhysics(delta, carStats, weather = 'night') {
    // ۱. فرمول‌بندی نرخ شتاب و ترمز
    const accelRate = (carStats.accel || 5.0) * 32 + 25;
    const brakeRate = (carStats.braking || 5.0) * 55 + 40;
    const naturalDrag = 15; // درگ اصطکاک هوا

    let targetMaxSpeed = carStats.topSpeed || 140;

    // ۲. پردازش سیستم نیترو
    if (this.keys.nitro && this.player.nitroAmount > 0) {
      this.player.isNitroActive = true;
      targetMaxSpeed += 50; // بوست ۵۰ کیلومتری نیترو
      this.player.nitroAmount = Math.max(0, this.player.nitroAmount - delta * (30 / (carStats.nitro || 5)));
    } else {
      this.player.isNitroActive = false;
      // بازسازی خودکار تدریجی نیترو در سرعت‌های کروز
      if (this.player.speed > 70) {
        this.player.nitroAmount = Math.min(100, this.player.nitroAmount + delta * 4);
      }
    }

    // ۳. مدیریت پدال گاز و ترمز
    if (this.keys.up) {
      this.player.speed = Math.min(targetMaxSpeed, this.player.speed + accelRate * delta);
    } else if (this.keys.down) {
      this.player.speed = Math.max(25, this.player.speed - brakeRate * delta);
    } else {
      // درگ طبیعی در صورت رها بودن پدال
      if (this.player.isNitroActive) {
        this.player.speed = Math.min(targetMaxSpeed, this.player.speed + accelRate * 0.8 * delta);
      } else {
        if (this.player.speed > 90) {
          this.player.speed -= naturalDrag * delta;
        } else if (this.player.speed < 85) {
          this.player.speed += accelRate * 0.4 * delta;
        }
      }
    }

    // ۴. شبیه‌سازی لغزش روی لکه روغن یا فرمان‌دهی
    if (this.player.spinTimer > 0) {
      this.player.spinTimer -= delta;
      // نوسان تند زاویه ماشین هنگام لغزش
      this.player.steerAngle = Math.sin(this.player.spinTimer * 18) * 0.35;
      this.player.speed *= 0.98;
    } else {
      // محاسبه فرمان‌دهی بر اساس چسبندگی و آب‌وهوا
      let handling = carStats.handling || 6.0;
      if (weather === 'rain') handling *= 0.85; // کاهش چسبندگی در باران

      let steerDir = 0;
      if (this.keys.left) steerDir -= 1;
      if (this.keys.right) steerDir += 1;

      const steerSpeed = 260 + handling * 28; // سرعت انحراف عرضی
      const targetVx = steerDir * steerSpeed;

      // شبیه‌سازی اینرسی فرمان (Lerp)
      this.player.vx += (targetVx - this.player.vx) * 16 * delta;
      this.player.x += this.player.vx * delta;
      this.player.steerAngle = (this.player.vx / steerSpeed) * 0.12;
    }

    // TODO: احسان عزیز - ضرایب ترمزگیری و لغزش در باران را تست کرده و در صورت نیاز تیون کن.
  }

  /**
   * تحریک برخورد با مانع یا لکه روغن
   */
  triggerHazardSlip() {
    this.player.spinTimer = 0.8; // 0.8 ثانیه لغزش
  }
}

if (typeof module !== 'undefined') {
  module.exports = VehiclePhysicsEngine;
}
