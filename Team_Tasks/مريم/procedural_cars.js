/**
 * سیستم رندرینگ رویه‌ای خودروها و کش اسپرایت‌ها (Procedural Cars & Texture Pre-Caching V2.5)
 * توسعه‌دهنده: مریم ناظم‌سادات (توسعه‌دهنده گرافیک و سیستم ذرات)
 * پروژه: Neon Highway - اسپرینت ۲
 */

// کش حافظه برای ذخیره اسپرایت‌های آماده و جلوگیری از افت فریم
const VEHICLE_TEXTURE_CACHE = {};

/**
 * ایجاد بوم آف‌اسکرین برای کش کردن رندرینگ خودرو جهت تضمین ۶۰ تا ۱۲۰ فریم
 */
function createCachedCarCanvas(width, length, color, options = {}) {
  const cacheKey = `${width}_${length}_${color}_${options.style || 'modern'}_${options.underglow || 'none'}`;
  if (VEHICLE_TEXTURE_CACHE[cacheKey]) {
    return VEHICLE_TEXTURE_CACHE[cacheKey];
  }

  const padding = 30;
  const offCanvas = document.createElement('canvas');
  offCanvas.width = width + padding * 2;
  offCanvas.height = length + padding * 2;
  const octx = offCanvas.getContext('2d');

  // رندر ماشین در مرکز بوم حافظه
  drawProceduralCar(octx, offCanvas.width / 2, offCanvas.height / 2, width, length, color, options);

  VEHICLE_TEXTURE_CACHE[cacheKey] = {
    canvas: offCanvas,
    offsetX: offCanvas.width / 2,
    offsetY: offCanvas.height / 2
  };

  return VEHICLE_TEXTURE_CACHE[cacheKey];
}

/**
 * رندر رویه‌ای کامل خودرو به همراه نور چراغ، نئون زیر شاسی و چراغ پلیس
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

  // ۱. مخروط بازتاب نور چراغ‌های جلو روی آسفالت
  if (headlights) {
    ctx.save();
    const beamLength = 140;
    const beamSpread = 32;
    const beamGrad = ctx.createRadialGradient(0, -halfL, 10, 0, -halfL - beamLength, beamSpread * 2);
    beamGrad.addColorStop(0, 'rgba(0, 242, 255, 0.45)');
    beamGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.2)');
    beamGrad.addColorStop(1, 'rgba(0, 242, 255, 0)');

    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(-halfW + 4, -halfL);
    ctx.lineTo(-halfW - beamSpread, -halfL - beamLength);
    ctx.lineTo(halfW + beamSpread, -halfL - beamLength);
    ctx.lineTo(halfW - 4, -halfL);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ۲. سایه نرم زیر بدنه
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.beginPath();
  ctx.roundRect(-halfW - 2, -halfL - 2, width + 4, length + 4, 10);
  ctx.fill();
  ctx.restore();

  // ۳. نور نئونی زیر شاسی (Underglow LED)
  if (underglow) {
    ctx.save();
    ctx.shadowColor = underglow;
    ctx.shadowBlur = 20;
    ctx.strokeStyle = underglow;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-halfW - 3, -halfL + 6, width + 6, length - 12, 12);
    ctx.stroke();
    ctx.restore();
  }

  // ۴. تایرها
  ctx.fillStyle = '#111827';
  const tireW = 5;
  const tireL = 12;
  ctx.fillRect(-halfW - 2, -halfL + 8, tireW, tireL);
  ctx.fillRect(halfW - 3, -halfL + 8, tireW, tireL);
  ctx.fillRect(-halfW - 2, halfL - 20, tireW, tireL);
  ctx.fillRect(halfW - 3, halfL - 20, tireW, tireL);

  // ۵. بدنه اصلی خودرو با گرادیانت ۳ بعدی متالیک
  ctx.save();
  const bodyGrad = ctx.createLinearGradient(-halfW, 0, halfW, 0);
  bodyGrad.addColorStop(0, adjustBrightness(color, -25));
  bodyGrad.addColorStop(0.3, color);
  bodyGrad.addColorStop(0.5, adjustBrightness(color, 25));
  bodyGrad.addColorStop(0.7, color);
  bodyGrad.addColorStop(1, adjustBrightness(color, -25));

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.roundRect(-halfW, -halfL, width, length, 8);
  ctx.fill();

  // لبه متالیک بدنه
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // ۶. شیشه‌های دودی و سقف
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.beginPath();
  ctx.roundRect(-halfW + 4, -halfL + 20, width - 8, length - 42, 6);
  ctx.fill();

  // رفلکس زاویه‌دار شیشه جلو
  ctx.strokeStyle = 'rgba(0, 242, 255, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-halfW + 6, -halfL + 22);
  ctx.lineTo(halfW - 6, -halfL + 22);
  ctx.stroke();

  // ۷. چراغ‌های خطر عقب (قرمز عادی یا ترمز پرنور)
  ctx.save();
  ctx.fillStyle = isBraking ? '#ff0033' : '#aa0022';
  ctx.shadowColor = '#ff0033';
  ctx.shadowBlur = isBraking ? 18 : 6;
  ctx.fillRect(-halfW + 4, halfL - 3, 8, 3);
  ctx.fillRect(halfW - 12, halfL - 3, 8, 3);
  ctx.restore();

  // ۸. چراغ گردان استروب پلیس (فلاش ۹ هرتز قرمز و آبی)
  if (isPolice) {
    ctx.save();
    const isRedActive = Math.sin(policeStrobe * 9) > 0;
    // پایه مشکی نوار چراغ
    ctx.fillStyle = '#000000';
    ctx.fillRect(-12, -8, 24, 6);

    // چراغ قرمز سمت چپ
    ctx.fillStyle = isRedActive ? '#ff0033' : '#440011';
    ctx.shadowColor = '#ff0033';
    ctx.shadowBlur = isRedActive ? 16 : 0;
    ctx.fillRect(-10, -7, 9, 4);

    // چراغ آبی سمت راست
    ctx.fillStyle = !isRedActive ? '#0088ff' : '#001144';
    ctx.shadowColor = '#0088ff';
    ctx.shadowBlur = !isRedActive ? 16 : 0;
    ctx.fillRect(1, -7, 9, 4);
    ctx.restore();
  }

  ctx.restore();
}

function adjustBrightness(hex, percent) {
  let num = parseInt(hex.replace('#', ''), 16);
  let r = Math.min(255, Math.max(0, (num >> 16) + percent));
  let g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
  let b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

if (typeof module !== 'undefined') {
  module.exports = { drawProceduralCar, createCachedCarCanvas };
}
