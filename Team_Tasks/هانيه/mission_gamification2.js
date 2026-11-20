/**
 * سیستم مأموریت‌ها، اقتصاد و گیمیفیکیشن (Missions & Gamification Engine V2.5)
 * توسعه‌دهنده: هانیه کاویانی (مهندس هوش مصنوعی ترافیک، صوت و گیمیفیکیشن)
 * پروژه: Neon Highway - اسپرینت ۲
 */

const CAREER_MISSIONS = [
  { id: 'near_miss_5', title: 'لایی‌کشی برق‌آسا', desc: 'ثبت ۵ لایی‌کشی میلی‌متری در یک راند', reward: 300, target: 5, type: 'single_run' },
  { id: 'speed_200', title: 'دیوانگی سرعت', desc: 'رسیدن به سرعت ۲۰۰ کیلومتر بر ساعت', reward: 400, target: 200, type: 'single_run' },
  { id: 'oncoming_10s', title: 'خلاف جهت مرگبار', desc: '۱۰ ثانیه رانندگی در لاین مخالف (حالت دو‌طرفه)', reward: 500, target: 10, type: 'single_run' },
  { id: 'coins_40', title: 'کیسه پر از طلا', desc: 'جمع‌آوری ۴۰ سکه در یک راند', reward: 350, target: 40, type: 'single_run' },
  { id: 'total_dist_5k', title: 'سفر در اتوبان', desc: 'طی کردن ۵ کیلومتر مسافت تجمعی', reward: 600, target: 5000, type: 'lifetime' },
  { id: 'nitro_master', title: 'آتش‌افروز اتوبان', desc: '۲۰ ثانیه مصرف تجمعی نیتروژن', reward: 450, target: 20, type: 'lifetime' },
  { id: 'cyber_hack_3', title: 'هکر سایبری اتوبان', desc: '۳ بار هک موفق خودروهای ترافیک یا پلیس', reward: 550, target: 3, type: 'single_run' },
  { id: 'slowmo_dodge', title: 'واکنش ماتریسی', desc: '۶ ثانیه استفاده از اسلوموشن در یک راند', reward: 400, target: 6, type: 'single_run' }
];

class MissionsGamification {
  constructor() {
    this.coins = this.loadCoins();
    this.highScore = this.loadHighScore();
    this.completedMissions = this.loadCompletedMissions();
    this.nearMissCount = 0;
    this.combo = 1;
    this.comboTimer = 0;
  }

  loadCoins() {
    try {
      const saved = localStorage.getItem("neon_highway_coins");
      return saved !== null ? Math.max(0, parseInt(saved, 10)) : 500;
    } catch (e) {
      return 500;
    }
  }

  loadHighScore() {
    try {
      const saved = localStorage.getItem("neon_highway_highscore");
      return saved !== null ? Math.max(0, parseInt(saved, 10)) : 0;
    } catch (e) {
      return 0;
    }
  }

  loadCompletedMissions() {
    try {
      const saved = localStorage.getItem("neon_highway_completed_missions");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  saveData() {
    try {
      localStorage.setItem("neon_highway_coins", String(this.coins));
      localStorage.setItem("neon_highway_highscore", String(this.highScore));
      localStorage.setItem("neon_highway_completed_missions", JSON.stringify(this.completedMissions));
    } catch (e) {
      console.warn("Could not save to localStorage", e);
    }
  }

  addCoins(amount) {
    if (amount <= 0) return this.coins;
    this.coins += Math.floor(amount);
    this.saveData();
    return this.coins;
  }

  spendCoins(amount) {
    if (amount <= 0 || this.coins < amount) return false;
    this.coins -= Math.floor(amount);
    this.saveData();
    return true;
  }

  updateHighScore(score) {
    if (score > this.highScore) {
      this.highScore = Math.floor(score);
      this.saveData();
      return true; // رکورد جدید ثبت شد
    }
    return false;
  }

  /**
   * بررسی لایی‌کشی میلی‌متری (Near-Miss) با ضریب کمبو
   */
  checkNearMiss(playerX, playerY, pWidth, pLength, trafficX, trafficY, tWidth, tLength, playerSpeed) {
    if (playerSpeed < 75) return 0; // لایی‌کشی فقط در سرعت‌های بالا معتبر است

    const distX = Math.abs(playerX - trafficX);
    const distY = Math.abs(playerY - trafficY);

    const minX = (pWidth + tWidth) * 0.5;
    const minY = (pLength + tLength) * 0.5;

    // فاصله خطر میلی‌متری (کمتر از ۱۸ پیکسل فاصله عرضی)
    if (distX > minX && distX < minX + 18 && distY < minY + 15) {
      this.nearMissCount++;
      this.combo = Math.min(5, this.combo + 1); // ارتقای کمبو تا سقف x5
      this.comboTimer = 3.5; // تایمر ۳.۵ ثانیه‌ای زنجیره کمبو

      const scoreEarned = 100 * this.combo;
      this.addCoins(2); // ۲ سکه پاداش آنی لایی‌کشی

      return scoreEarned;
    }

    return 0;
  }

  updateCombo(delta) {
    if (this.comboTimer > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) {
        this.combo = 1; // ریست کمبو
      }
    }
  }
}

if (typeof module !== 'undefined') {
  module.exports = { MissionsGamification, CAREER_MISSIONS };
}
