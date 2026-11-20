/**
 * سیستم رندرینگ برداری و رویه‌ای خودروها (Procedural Car Renderer)
 * توسعه‌دهنده: مریم ناظم‌سادات
 * ددلاین تحویل: ۵شنبه ۷ آبان ۱۴۰۳
 */

function drawProceduralCar(ctx, x, y, width, length, color, options = {}) {
  const {
    underglow = null,
    isBraking = false,
    hasNitro = false,
    style = 'modern',
    headlights = true,
    steerAngle = 0,
    isPolice = false,
    policeStrobe = 0
  } = options;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(steerAngle);

  const halfW = width / 2;
  const halfL = length / 2;

  // ۱. سایه نرم زیر ماشین (Drop Shadow)
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.roundRect(-halfW - 2, -halfL - 2, width + 4, length + 4, 10);
  ctx.fill();
  ctx.restore();

  // ۲. نور نئونی زیر ماشین (Underglow)
  if (underglow) {
    ctx.save();
    ctx.shadowColor = underglow;
    ctx.shadowBlur = 22;
    ctx.strokeStyle = underglow;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-halfW - 3, -halfL + 6, width + 6, length - 12, 12);
    ctx.stroke();
    ctx.restore();
  }

  // ۳. لاستیک‌ها (Tires)
  ctx.fillStyle = '#111';
  const tireW = 5;
  const tireL = 12;
  // جلو چپ و راست
  ctx.fillRect(-halfW - 2, -halfL + 8, tireW, tireL);
  ctx.fillRect(halfW - 3, -halfL + 8, tireW, tireL);
  // عقب چپ و راست
  ctx.fillRect(-halfW - 2, halfL - 20, tireW, tireL);
  ctx.fillRect(halfW - 3, halfL - 20, tireW, tireL);

  // ۴. بدنه اصلی با گرادیان حجمی
  ctx.save();
  const bodyGrad = ctx.createLinearGradient(-halfW, 0, halfW, 0);
  bodyGrad.addColorStop(0, adjustColorBrightness(color, -25));
  bodyGrad.addColorStop(0.5, color);
  bodyGrad.addColorStop(1, adjustColorBrightness(color, -25));
  ctx.fillStyle = bodyGrad;

  ctx.beginPath();
  ctx.roundRect(-halfW, -halfL, width, length, 8);
  ctx.fill();

  // خطوط متالیک دور بدنه
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // ۵. آینه‌های بغل
  ctx.fillStyle = color;
  ctx.fillRect(-halfW - 4, -halfL + 18, 4, 6);
  ctx.fillRect(halfW, -halfL + 18, 4, 6);

  // ۶. شیشه‌های جلو و عقب با رفلکس نور
  ctx.fillStyle = '#0a101d';
  // شیشه جلو
  ctx.beginPath();
  ctx.roundRect(-halfW + 4, -halfL + 14, width - 8, 14, 4);
  ctx.fill();
  // شیشه عقب
  ctx.beginPath();
  ctx.roundRect(-halfW + 5, halfL - 22, width - 10, 10, 3);
  ctx.fill();

  // خط بازتاب نور مورب روی شیشه جلو
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-halfW + 8, -halfL + 16);
  ctx.lineTo(halfW - 8, -halfL + 26);
  ctx.stroke();
  ctx.restore();

  // ۷. چراغ‌های جلو و ترمز
  if (isBraking) {
    ctx.fillStyle = '#ff0033';
    ctx.shadowColor = '#ff0033';
    ctx.shadowBlur = 15;
    ctx.fillRect(-halfW + 4, halfL - 4, 8, 3);
    ctx.fillRect(halfW - 12, halfL - 4, 8, 3);
  } else {
    ctx.fillStyle = '#aa0022';
    ctx.fillRect(-halfW + 4, halfL - 4, 7, 2);
    ctx.fillRect(halfW - 11, halfL - 4, 7, 2);
  }

  // چراغ جلو
  if (headlights) {
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f2ff';
    ctx.shadowBlur = 10;
    ctx.fillRect(-halfW + 4, -halfL + 1, 7, 3);
    ctx.fillRect(halfW - 11, -halfL + 1, 7, 3);
  }

  // TODO: مریم عزیز - می‌توانی استایل‌های اسپویلر عقب یا خطوط ریسینگ روی کاپوت را اینجا اضافه کنی.

  ctx.restore();
}

function adjustColorBrightness(hex, percent) {
  let num = parseInt(hex.replace('#',''), 16),
      amt = Math.round(2.55 * percent),
      R = (num >> 16) + amt,
      G = (num >> 8 & 0x00FF) + amt,
      B = (num & 0x0000FF) + amt;
  return '#' + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
}

if (typeof module !== 'undefined') {
  module.exports = { drawProceduralCar, adjustColorBrightness };
}
