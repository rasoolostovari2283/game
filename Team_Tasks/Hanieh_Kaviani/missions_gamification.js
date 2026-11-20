/**
 * سیستم ماموریت‌ها، امتیازات و پیشرفت گاراژ (Missions & Gamification)
 * توسعه‌دهنده: هانیه کاویانی
 * ددلاین تحویل: ۵شنبه ۷ آبان ۱۴۰۳
 */

class MissionsGamification {
  constructor() {
    this.coins = this.loadCoins();
    this.highScore = this.loadHighScore();
    this.nearMissCount = 0;
  }

  // بررسی شرط سبقت میلی‌متری (Near Miss)
  checkNearMiss(playerX, playerY, pWidth, pLength, trafficX, trafficY, tWidth, tLength, speed) {
    if (speed < 75) return false;

    const lateralDist = Math.abs(playerX - trafficX) - (pWidth / 2 + tWidth / 2);
    const verticalOverlap = (playerY - pLength / 2 < trafficY + tLength / 2) && 
                            (playerY + pLength / 2 > trafficY - tLength / 2);

    // اگر خودروها بسیار نزدیک از کنار هم رد شوند
    if (verticalOverlap && lateralDist >= 0 && lateralDist < 20) {
      this.nearMissCount++;
      this.addCoins(2);
      return true;
    }
    return false;
  }

  loadCoins() {
    return parseInt(localStorage.getItem('neon_highway_coins') || '500', 10);
  }

  addCoins(amount) {
    this.coins += amount;
    localStorage.setItem('neon_highway_coins', this.coins.toString());
  }

  loadHighScore() {
    return parseInt(localStorage.getItem('neon_highway_highscore') || '0', 10);
  }

  updateHighScore(score) {
    if (score > this.highScore) {
      this.highScore = Math.floor(score);
      localStorage.setItem('neon_highway_highscore', this.highScore.toString());
      return true;
    }
    return false;
  }
}

if (typeof module !== 'undefined') {
  module.exports = MissionsGamification;
}
