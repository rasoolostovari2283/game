/**
 * ماژول تخصصی فیزیک خودرو، کنترل و اصطکاک (Vehicle Physics & Dynamics Engine V2.5)
 * توسعه‌دهنده: احسان کاظمی (مهندس فیزیک و استقرار دسکتاپ)
 * پروژه: Neon Highway - اسپرینت ۲
 */

class VehiclePhysicsEngine {
  constructor(road = null) {
    this.road = road || {
      width: 380,
      baseX: 200,
      getX: (y) => 200
    };

    this.player = {
      x: 0,
      y: 0,
      vx: 0,
      speed: 85,             // سرعت فعلی بر حسب کیلومتر بر ساعت
      targetSpeed: 85,
      steerAngle: 0,         // زاویه چرخش بصری بدنه
      spinTimer: 0,          // تایمر لغزش روی روغن
      isNitroActive: false,
      nitroAmount: 100,
      maxNitro: 100,
      gForce: 0              // مقدار شتاب جانبی برای نمایش در تله‌متری
    };

    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false,
      nitro: false,
      slowmo: false
    };

    this.timeScale = 1.0;
  }

  /**
   * به روزرسانی فریم به فریم محاسبات فیزیک
   * @param {number} delta - زمان دلتا بر حسب ثانیه
   * @param {object} carStats - مشخصات ارتقایافته خودرو
   * @param {string} weather - شرایط جوی ('night', 'rain', 'sunset')
   * @param {number} timeScale - ضریب اتساع زمان (در حالت اسلوموشن برابر 0.35)
   */
  updatePhysics(delta, carStats, weather = 'night', timeScale = 1.0) {
    this.timeScale = timeScale;
    const effectiveDelta = delta * timeScale;

    // ۱. فرمول‌بندی نرخ شتاب، ترمز و درگ آیرودینامیک
    const accelRate = (carStats.accel || 5.0) * 32 + 25;
    const brakeRate = (carStats.braking || 5.0) * 55 + 40;
    const naturalDrag = 15;

    let targetMaxSpeed = carStats.topSpeed || 140;

    // ۲. سیستم نیتروژن مایع
    if (this.keys.nitro && this.player.nitroAmount > 0) {
      this.player.isNitroActive = true;
      targetMaxSpeed += 50; // بوست ۵۰ کیلومتری
      const nitroDrainRate = 30 / (carStats.nitro || 5.0);
      this.player.nitroAmount = Math.max(0, this.player.nitroAmount - effectiveDelta * nitroDrainRate);
    } else {
      this.player.isNitroActive = false;
      // بازسازی خودکار تدریجی نیترو در سرعت‌های کروز
      if (this.player.speed > 70) {
        this.player.nitroAmount = Math.min(100, this.player.nitroAmount + effectiveDelta * 4.5);
      }
    }

    // ۳. مدیریت شتاب خطی و ترمز
    if (this.keys.up) {
      this.player.speed = Math.min(targetMaxSpeed, this.player.speed + accelRate * effectiveDelta);
    } else if (this.keys.down) {
      this.player.speed = Math.max(25, this.player.speed - brakeRate * effectiveDelta);
    } else {
      // درگ طبیعی در صورت رها بودن پدال گاز
      if (this.player.isNitroActive) {
        this.player.speed = Math.min(targetMaxSpeed, this.player.speed + accelRate * 0.8 * effectiveDelta);
      } else {
        if (this.player.speed > 90) {
          this.player.speed -= naturalDrag * effectiveDelta;
        } else if (this.player.speed < 85) {
          this.player.speed += accelRate * 0.35 * effectiveDelta;
        }
      }
    }

    // ۴. اعمال اثرات شرایط جوی بارانی (Rain Handling & Braking Penalty)
    let handling = carStats.handling || 6.0;
    if (weather === 'rain') {
      handling *= 0.85; // ۱۵٪ کاهش چسبندگی در باران
    }

    // ۵. فیزیک لغزش روی لکه روغن (Hazard Spin)
    if (this.player.spinTimer > 0) {
      this.player.spinTimer -= effectiveDelta;
      this.player.steerAngle = Math.sin(this.player.spinTimer * 18) * 0.35;
      this.player.speed *= 0.985;
      this.player.vx *= 0.92;
      this.player.x += this.player.vx * effectiveDelta;
    } else {
      // ۶. محاسبه فرمان‌دهی نرم با اینرسی خطی (Lerp)
      let steerDir = 0;
      if (this.keys.left) steerDir -= 1;
      if (this.keys.right) steerDir += 1;

      const steerSpeed = 260 + handling * 28;
      const targetVx = steerDir * steerSpeed;

      // در زمان اسلوموشن، ضریب فرمان‌پذیری تقویت می‌شود تا حس رفلکس ماتریسی به بازیکن منتقل شود
      const steerDelta = (this.timeScale < 0.9) ? (delta * 0.72) : effectiveDelta;

      this.player.vx += (targetVx - this.player.vx) * 16 * steerDelta;
      this.player.x += this.player.vx * steerDelta;
      this.player.steerAngle = (this.player.vx / steerSpeed) * 0.12;

      // محاسبه شتاب جانبی (G-Force) برای نمایش در رادار تله‌متری
      this.player.gForce = (this.player.vx / steerSpeed) * 1.2;
    }

    // ۷. کلمپ عرضی و ممانعت از خروج خودرو از مرزهای آسفالت جاده
    if (this.road) {
      const roadLeft = (this.road.getX ? this.road.getX(this.player.y) : this.road.baseX) + 18;
      const roadRight = roadLeft + this.road.width - 36;
      this.player.x = Math.max(roadLeft, Math.min(roadRight, this.player.x));
    }
  }

  /**
   * تحریک لغزش خودرو بر اثر برخورد با لکه روغن
   */
  triggerHazardSlip() {
    this.player.spinTimer = 0.8;
  }
}

if (typeof module !== 'undefined') {
  module.exports = VehiclePhysicsEngine;
}
