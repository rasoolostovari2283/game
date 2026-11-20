/**
 * سیستم هوش مصنوعی ترافیک اتوبان (Traffic AI Manager)
 * توسعه‌دهنده: هانیه کاویانی
 * ددلاین تحویل: ۵شنبه ۷ آبان ۱۴۰۳
 */

class TrafficAIManager {
  constructor() {
    this.vehicles = [];
    this.lanes = [120, 220, 320, 420]; // مراکز ۴ خط عبور اتوبان
  }

  // تولید خودروی ترافیکی جدید در موقعیت مناسب
  spawnVehicle(playerY, isTwoWay = false) {
    const laneIndex = Math.floor(Math.random() * this.lanes.length);
    const isOncoming = isTwoWay && laneIndex < 2; // لاین‌های مخالف در حالت دوطرفه

    const speed = isOncoming ? (60 + Math.random() * 40) : (45 + Math.random() * 35);
    const length = Math.random() < 0.2 ? 110 : 68; // کامیون یا سواری

    this.vehicles.push({
      x: this.lanes[laneIndex],
      y: playerY - 1100, // اسپاون خارج از دید بالای دوربین
      width: 38,
      length: length,
      speed: speed,
      isOncoming: isOncoming,
      nearMissGranted: false,
      changingLane: false,
      targetLaneX: null
    });
  }

  // واکنش هوشمند ترافیک به بوق زدن بازیکن
  reactToHorn(playerX, playerY) {
    for (const v of this.vehicles) {
      const lateralDist = Math.abs(playerX - v.x);
      const verticalDist = playerY - v.y;

      // اگر خودرو جلوی پلیر با فاصله کمتر از 350 پیکسل باشد
      if (lateralDist < 50 && verticalDist > 0 && verticalDist < 350 && !v.changingLane) {
        // تغییر لاین به لاین مجاور برای باز کردن مسیر
        v.changingLane = true;
        const shiftRight = v.x < 300;
        v.targetLaneX = shiftRight ? v.x + 100 : v.x - 100;
      }
    }
  }

  // به‌روزرسانی موقعیت خودروها
  update(playerSpeed, delta) {
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      const relativeSpeed = v.isOncoming ? (playerSpeed + v.speed) : (playerSpeed - v.speed);
      v.y += relativeSpeed * 0.18;

      // نرمال‌سازی تغییر لاین
      if (v.changingLane && v.targetLaneX !== null) {
        v.x += (v.targetLaneX - v.x) * 4 * delta;
        if (Math.abs(v.targetLaneX - v.x) < 2) {
          v.changingLane = false;
        }
      }
    }
  }
}

if (typeof module !== 'undefined') {
  module.exports = TrafficAIManager;
}
