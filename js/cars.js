// Car Catalog, Stats, Customization & Procedural Canvas Rendering

const CAR_CATALOG = [
  {
    id: 'cyber_hatch',
    name: 'Cyber Hatch',
    category: 'اسپرت شهری',
    price: 0,
    isUnlocked: true,
    width: 44,
    length: 84,
    baseStats: {
      topSpeed: 140,
      accel: 5.5,
      handling: 6.5,
      braking: 6.0,
      nitro: 5.0
    },
    defaultColor: '#00f2ff',
    defaultUnderglow: '#00f2ff',
    style: 'hatchback',
    spriteKey: 'cyber_hatch'
  },
  {
    id: 'street_muscle',
    name: 'Muscle GT 69',
    category: 'ماسل کلاسیک',
    price: 800,
    isUnlocked: false,
    width: 46,
    length: 90,
    baseStats: {
      topSpeed: 165,
      accel: 7.2,
      handling: 5.8,
      braking: 6.5,
      nitro: 6.0
    },
    defaultColor: '#ff5500',
    defaultUnderglow: '#ff3300',
    style: 'muscle',
    spriteKey: 'muscle_gt'
  },
  {
    id: 'tokyo_drift',
    name: 'Tokyo RX-Drift',
    category: 'تیونینگ ژاپنی',
    price: 1800,
    isUnlocked: false,
    width: 46,
    length: 88,
    baseStats: {
      topSpeed: 190,
      accel: 8.0,
      handling: 8.5,
      braking: 7.8,
      nitro: 7.0
    },
    defaultColor: '#ff0077',
    defaultUnderglow: '#ff0077',
    style: 'tuner',
    spriteKey: 'tokyo_drift'
  },
  {
    id: 'police_interceptor',
    name: 'Interceptor V8',
    category: 'گشت پلیس ویژه',
    price: 3200,
    isUnlocked: false,
    width: 48,
    length: 94,
    baseStats: {
      topSpeed: 215,
      accel: 8.8,
      handling: 8.0,
      braking: 8.5,
      nitro: 8.0
    },
    defaultColor: '#1a202c',
    defaultUnderglow: '#0066ff',
    style: 'police',
    spriteKey: 'police_interceptor'
  },
  {
    id: 'hyper_2077',
    name: 'Hyper Cyber 2077',
    category: 'سوپراسپرت آینده',
    price: 5500,
    isUnlocked: false,
    width: 48,
    length: 96,
    baseStats: {
      topSpeed: 250,
      accel: 9.8,
      handling: 9.5,
      braking: 9.2,
      nitro: 10.0
    },
    defaultColor: '#ffe600',
    defaultUnderglow: '#ffe600',
    style: 'hyper',
    spriteKey: 'hyper_2077'
  }
];

// AI Vehicle Sprites System (Chroma-keyed transparency & high-res rendering)
const SPRITE_SOURCES = {
  cyber_hatch: 'assets/cars/cyber_hatch.jpg',
  muscle_gt: 'assets/cars/muscle_gt.jpg',
  tokyo_drift: 'assets/cars/tokyo_drift.jpg',
  police_interceptor: 'assets/cars/police_interceptor.jpg',
  hyper_2077: 'assets/cars/hyper_2077.jpg',
  traffic_sedan: 'assets/cars/traffic_sedan.jpg',
  traffic_suv: 'assets/cars/traffic_suv.jpg',
  traffic_truck: 'assets/cars/traffic_truck.jpg'
};

const CAR_PROCESSED_SPRITES = {};
window.CAR_SPRITES = CAR_PROCESSED_SPRITES;

const UNDERGLOW_CACHE = {};
const TINTED_SPRITE_CACHE = {};
let HEADLIGHT_BEAM_CACHE = null;

function getHeadlightBeamSprite() {
  if (HEADLIGHT_BEAM_CACHE) return HEADLIGHT_BEAM_CACHE;
  const c = document.createElement('canvas');
  c.width = 160;
  c.height = 240;
  const gctx = c.getContext('2d');

  const drawCone = (originX) => {
    const grad = gctx.createRadialGradient(originX, 232, 4, originX, 118, 128);
    grad.addColorStop(0, 'rgba(215, 250, 255, 0.36)');
    grad.addColorStop(0.45, 'rgba(130, 225, 255, 0.14)');
    grad.addColorStop(1, 'rgba(0, 200, 255, 0)');
    gctx.fillStyle = grad;
    gctx.beginPath();
    gctx.moveTo(originX - 8, 236);
    gctx.lineTo(originX - 58, 0);
    gctx.lineTo(originX + 58, 0);
    gctx.lineTo(originX + 8, 236);
    gctx.closePath();
    gctx.fill();
  };

  drawCone(54);
  drawCone(106);

  HEADLIGHT_BEAM_CACHE = c;
  return c;
}

function getUnderglowSprite(color) {
  if (!color || color === 'none') return null;
  if (UNDERGLOW_CACHE[color]) return UNDERGLOW_CACHE[color];

  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 224;
  const gctx = c.getContext('2d');

  gctx.save();
  gctx.translate(64, 112);
  gctx.scale(1, 1.75);
  const grad = gctx.createRadialGradient(0, 0, 14, 0, 0, 62);
  grad.addColorStop(0, color);
  grad.addColorStop(0.55, color);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  gctx.globalAlpha = 0.42;
  gctx.fillStyle = grad;
  gctx.beginPath();
  gctx.arc(0, 0, 62, 0, Math.PI * 2);
  gctx.fill();
  gctx.restore();

  UNDERGLOW_CACHE[color] = c;
  return c;
}

function getTintedCarSprite(key, baseSprite, color, defaultColor) {
  if (!baseSprite || !color || !defaultColor || color.toLowerCase() === defaultColor.toLowerCase()) {
    return baseSprite;
  }
  const cacheKey = `${key}_${color.toLowerCase()}`;
  if (TINTED_SPRITE_CACHE[cacheKey]) return TINTED_SPRITE_CACHE[cacheKey];

  const c = document.createElement('canvas');
  c.width = baseSprite.width || 128;
  c.height = baseSprite.height || 256;
  const tctx = c.getContext('2d');

  tctx.drawImage(baseSprite, 0, 0, c.width, c.height);

  // Subtle color-blend tint masked strictly to the car's alpha silhouette
  tctx.globalCompositeOperation = 'source-atop';
  tctx.globalAlpha = 0.42;
  tctx.fillStyle = color;
  tctx.fillRect(0, 0, c.width, c.height);

  tctx.globalCompositeOperation = 'source-over';
  tctx.globalAlpha = 1;

  TINTED_SPRITE_CACHE[cacheKey] = c;
  return c;
}

function initCarSprites() {
  for (const [key, src] of Object.entries(SPRITE_SOURCES)) {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      try {
        // 1. Downscale source to 384px max dimension first for fast CPU chroma-keying
        const maxDim = 384;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const workW = Math.max(32, Math.round(img.width * scale));
        const workH = Math.max(32, Math.round(img.height * scale));

        const off = document.createElement('canvas');
        off.width = workW;
        off.height = workH;
        const octx = off.getContext('2d', { willReadFrequently: true });
        octx.drawImage(img, 0, 0, workW, workH);

        const imgData = octx.getImageData(0, 0, workW, workH);
        const data = imgData.data;

        // 2. Smoothly key out solid black studio background
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const maxVal = Math.max(r, g, b);
          if (maxVal < 22) {
            data[i + 3] = 0;
          } else if (maxVal < 52) {
            data[i + 3] = Math.floor(((maxVal - 22) / 30) * 255);
          }
        }
        octx.putImageData(imgData, 0, 0);

        // 3. Auto-crop transparent padding so car fills hitbox cleanly with zero boxy margins
        const bounds = window.SimUtils
          ? window.SimUtils.findAlphaBounds(data, workW, workH, 28)
          : { x: 0, y: 0, width: workW, height: workH, empty: false };

        const pad = 2;
        const sx = Math.max(0, bounds.x - pad);
        const sy = Math.max(0, bounds.y - pad);
        const sw = Math.min(workW - sx, bounds.width + pad * 2);
        const sh = Math.min(workH - sy, bounds.height + pad * 2);

        // 4. Pack tightly into GPU-friendly 128x256 texture
        const targetW = 128;
        const targetH = 256;
        const optCanvas = document.createElement('canvas');
        optCanvas.width = targetW;
        optCanvas.height = targetH;
        const optCtx = optCanvas.getContext('2d');
        optCtx.imageSmoothingEnabled = true;
        optCtx.imageSmoothingQuality = 'high';
        optCtx.drawImage(off, sx, sy, sw, sh, 0, 0, targetW, targetH);

        CAR_PROCESSED_SPRITES[key] = optCanvas;
      } catch (e) {
        CAR_PROCESSED_SPRITES[key] = img;
      }
    };
    img.onerror = () => {
      console.warn('Could not load sprite for', key, src);
    };
  }
}
initCarSprites();

const AVAILABLE_COLORS = [
  '#00f2ff', // Cyan
  '#ff0077', // Pink
  '#ffe600', // Yellow
  '#00ff88', // Green
  '#ff4400', // Orange
  '#9d00ff', // Violet
  '#ffffff', // White
  '#111625'  // Stealth Black
];

const AVAILABLE_UNDERGLOWS = [
  '#00f2ff',
  '#ff0077',
  '#00ff88',
  '#ffe600',
  '#9d00ff',
  'none'
];

class CarManager {
  constructor() {
    this.cars = JSON.parse(JSON.stringify(CAR_CATALOG));
    this.currentCarIndex = 0;
    this.coins = 0;
    this.highScore = 0;
    this.upgrades = {};
    this.customColors = {};
    this.customUnderglows = {};
    this.loadData();
  }

  loadData() {
    try {
      const saved = localStorage.getItem('neon_highway_save_v1');
      if (saved) {
        const data = JSON.parse(saved);
        this.coins = data.coins || 0;
        this.highScore = data.highScore || 0;
        this.currentCarIndex = data.currentCarIndex || 0;
        this.upgrades = data.upgrades || {};
        this.customColors = data.customColors || {};
        this.customUnderglows = data.customUnderglows || {};
        if (data.unlocked) {
          data.unlocked.forEach(id => {
            const car = this.cars.find(c => c.id === id);
            if (car) car.isUnlocked = true;
          });
        }
      }
    } catch (e) {
      console.warn('LocalStorage error', e);
    }
  }

  saveData() {
    try {
      const unlockedIds = this.cars.filter(c => c.isUnlocked).map(c => c.id);
      const data = {
        coins: this.coins,
        highScore: this.highScore,
        currentCarIndex: this.currentCarIndex,
        unlocked: unlockedIds,
        upgrades: this.upgrades,
        customColors: this.customColors,
        customUnderglows: this.customUnderglows
      };
      localStorage.setItem('neon_highway_save_v1', JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage save error', e);
    }
  }

  getCurrentCar() {
    return this.cars[this.currentCarIndex];
  }

  getCarColor(carId) {
    return this.customColors[carId] || this.cars.find(c => c.id === carId)?.defaultColor || '#00f2ff';
  }

  getCarUnderglow(carId) {
    return this.customUnderglows[carId] || this.cars.find(c => c.id === carId)?.defaultUnderglow || '#00f2ff';
  }

  setCarColor(carId, color) {
    this.customColors[carId] = color;
    this.saveData();
  }

  setCarUnderglow(carId, color) {
    this.customUnderglows[carId] = color;
    this.saveData();
  }

  getUpgradeLevel(carId, statKey) {
    if (!this.upgrades[carId]) this.upgrades[carId] = {};
    return this.upgrades[carId][statKey] || 0;
  }

  getUpgradeCost(carId, statKey) {
    const level = this.getUpgradeLevel(carId, statKey);
    if (level >= 5) return null;
    return (level + 1) * 200;
  }

  upgradeStat(carId, statKey) {
    const cost = this.getUpgradeCost(carId, statKey);
    if (cost !== null && this.coins >= cost) {
      this.coins -= cost;
      if (!this.upgrades[carId]) this.upgrades[carId] = {};
      this.upgrades[carId][statKey] = (this.upgrades[carId][statKey] || 0) + 1;
      this.saveData();
      return true;
    }
    return false;
  }

  getEffectiveStats(car) {
    const u = this.upgrades[car.id] || {};
    const speedBoost = (u.topSpeed || 0) * 10;
    const accelBoost = (u.accel || 0) * 0.4;
    const handlingBoost = (u.handling || 0) * 0.35;
    const brakingBoost = (u.braking || 0) * 0.4;
    const nitroBoost = (u.nitro || 0) * 0.8;

    return {
      topSpeed: car.baseStats.topSpeed + speedBoost,
      accel: car.baseStats.accel + accelBoost,
      handling: car.baseStats.handling + handlingBoost,
      braking: car.baseStats.braking + brakingBoost,
      nitro: car.baseStats.nitro + nitroBoost
    };
  }

  unlockCar(index) {
    const car = this.cars[index];
    if (car && !car.isUnlocked && this.coins >= car.price) {
      this.coins -= car.price;
      car.isUnlocked = true;
      this.currentCarIndex = index;
      this.saveData();
      return true;
    }
    return false;
  }

  addCoins(amount) {
    this.coins += amount;
    this.saveData();
  }

  updateHighScore(score) {
    if (score > this.highScore) {
      this.highScore = Math.floor(score);
      this.saveData();
      return true;
    }
    return false;
  }
}

// High-Performance Realistic Vehicle Renderer (Auto-Cropped Sprites + Cached FX)
function drawCar(ctx, x, y, width, length, color, options = {}) {
  const {
    underglow = '#00f2ff',
    isBraking = false,
    hasNitro = false,
    style = 'hatchback',
    spriteKey = null,
    headlights = true,
    steerAngle = 0,
    isPolice = false,
    policeStrobe = 0,
    health = 100,
    defaultColor = null,
    turnSignal = 0,
    lowSpec = false
  } = options;

  ctx.save();
  ctx.translate(x, y);
  if (steerAngle !== 0) {
    ctx.rotate(steerAngle);
  }

  const halfW = width * 0.5;
  const halfL = length * 0.5;

  // 0. Sleek Elliptical Ground Shadow (Matches car silhouette, zero blocky box)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
  ctx.beginPath();
  ctx.ellipse(0, 4, halfW * 0.94, halfL * 0.98, 0, 0, Math.PI * 2);
  ctx.fill();

  // 1. Soft Elliptical Neon Underglow (Pre-rendered sprite cache — 1 drawImage call!)
  if (underglow && underglow !== 'none') {
    const glowSprite = getUnderglowSprite(underglow);
    if (glowSprite) {
      ctx.drawImage(glowSprite, -halfW - 14, -halfL - 12, width + 28, length + 24);
    }
  }

  // 2. Cached Volumetric Headlight Cones (Zero per-frame radial gradient allocation!)
  if (headlights && !lowSpec) {
    const beam = getHeadlightBeamSprite();
    const beamW = width * 3.1;
    const beamH = 235;
    ctx.drawImage(beam, -beamW * 0.5, -halfL - beamH + 8, beamW, beamH);
  }

  // 3. Resolve AI Sprite Key & Apply Custom Paint Tint if selected
  let resolvedKey = spriteKey || style || 'cyber_hatch';
  if (resolvedKey === 'hatchback') resolvedKey = 'cyber_hatch';
  else if (resolvedKey === 'muscle') resolvedKey = 'muscle_gt';
  else if (resolvedKey === 'tuner' || resolvedKey === 'sports') resolvedKey = 'tokyo_drift';
  else if (resolvedKey === 'police') resolvedKey = 'police_interceptor';
  else if (resolvedKey === 'hyper') resolvedKey = 'hyper_2077';
  else if (resolvedKey === 'sedan') resolvedKey = 'traffic_sedan';
  else if (resolvedKey === 'suv') resolvedKey = 'traffic_suv';
  else if (resolvedKey === 'truck') resolvedKey = 'traffic_truck';

  const rawSprite = CAR_PROCESSED_SPRITES[resolvedKey];
  const sprite = rawSprite ? getTintedCarSprite(resolvedKey, rawSprite, color, defaultColor) : null;

  if (sprite && (sprite.complete === undefined || sprite.complete || sprite instanceof HTMLCanvasElement)) {
    ctx.drawImage(sprite, -halfW, -halfL, width, length);
  } else {
    ctx.fillStyle = color || '#00f2ff';
    ctx.beginPath();
    ctx.roundRect(-halfW, -halfL, width, length, 10);
    ctx.fill();
  }

  // 4. Crisp Headlight Bulbs
  ctx.fillStyle = 'rgba(0, 242, 255, 0.35)';
  ctx.fillRect(-halfW + 4, -halfL - 1, 10, 5);
  ctx.fillRect(halfW - 14, -halfL - 1, 10, 5);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-halfW + 6, -halfL, 6, 2.5);
  ctx.fillRect(halfW - 12, -halfL, 6, 2.5);

  // 5. Dynamic Taillights / Brake Glow
  if (isBraking) {
    ctx.fillStyle = 'rgba(255, 0, 50, 0.45)';
    ctx.fillRect(-halfW + 2, halfL - 5, 14, 9);
    ctx.fillRect(halfW - 16, halfL - 5, 14, 9);
  }
  ctx.fillStyle = isBraking ? '#ff1144' : '#aa0018';
  ctx.fillRect(-halfW + 5, halfL - 3, 9, 3.5);
  ctx.fillRect(halfW - 14, halfL - 3, 9, 3.5);

  // 5b. Turn-signal amber blinker for lane-changing traffic
  if (turnSignal !== 0 && (Math.floor(Date.now() / 160) % 2 === 0)) {
    const bx = turnSignal < 0 ? -halfW + 1 : halfW - 6;
    ctx.fillStyle = '#ffbb00';
    ctx.fillRect(bx, -halfL + 4, 5, 6);
    ctx.fillRect(bx, halfL - 10, 5, 6);
  }

  // 6. Police Strobe Roof Lightbar
  if (isPolice) {
    const strobeTick = Math.floor((policeStrobe || Date.now() / 90) % 2) === 0;
    const barY = -halfL + length * 0.42;
    ctx.fillStyle = '#111622';
    ctx.fillRect(-15, barY, 30, 6);

    if (strobeTick) {
      ctx.fillStyle = 'rgba(0, 229, 255, 0.38)';
      ctx.fillRect(-19, barY - 3, 21, 12);
      ctx.fillStyle = '#00e5ff';
    } else {
      ctx.fillStyle = '#0033aa';
    }
    ctx.fillRect(-13, barY + 1, 12, 4);

    if (!strobeTick) {
      ctx.fillStyle = 'rgba(255, 0, 68, 0.38)';
      ctx.fillRect(-2, barY - 3, 21, 12);
      ctx.fillStyle = '#ff0044';
    } else {
      ctx.fillStyle = '#660011';
    }
    ctx.fillRect(1, barY + 1, 12, 4);
  }

  // 7. Nitro Dual Jet Flames
  if (hasNitro) {
    const flicker = Math.random() * 10;
    ctx.fillStyle = 'rgba(0, 242, 255, 0.42)';
    ctx.beginPath();
    ctx.moveTo(-halfW + 8, halfL);
    ctx.lineTo(-halfW + 17, halfL);
    ctx.lineTo(-halfW + 12.5, halfL + 24 + flicker);
    ctx.closePath();
    ctx.moveTo(halfW - 17, halfL);
    ctx.lineTo(halfW - 8, halfL);
    ctx.lineTo(halfW - 12.5, halfL + 24 + flicker);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ff0077';
    ctx.beginPath();
    ctx.moveTo(-halfW + 10, halfL);
    ctx.lineTo(-halfW + 15, halfL);
    ctx.lineTo(-halfW + 12.5, halfL + 15 + flicker * 0.6);
    ctx.closePath();
    ctx.moveTo(halfW - 15, halfL);
    ctx.lineTo(halfW - 10, halfL);
    ctx.lineTo(halfW - 12.5, halfL + 15 + flicker * 0.6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-halfW + 11, halfL, 3, 5);
    ctx.fillRect(halfW - 14, halfL, 3, 5);
  }

  // 8. Low-Health Engine Smoke & Sparks
  if (health < 50) {
    const smokeAlpha = ((50 - health) / 50) * 0.45;
    ctx.fillStyle = `rgba(30, 30, 38, ${smokeAlpha})`;
    ctx.beginPath();
    ctx.arc((Math.random() - 0.5) * 8, -halfL + 14, 6 + Math.random() * 5, 0, Math.PI * 2);
    ctx.fill();

    if (health < 25) {
      ctx.fillStyle = Math.random() < 0.5 ? '#ffe600' : '#ff3300';
      ctx.fillRect(-6 + Math.random() * 12, -halfL + 8 + Math.random() * 10, 3, 3);
      ctx.fillRect(-6 + Math.random() * 12, -halfL + 8 + Math.random() * 10, 3, 3);
    }
  }

  ctx.restore();
}

function adjustColor(color, amount) {
  if (!color || color.indexOf('#') !== 0) return color;
  let num = parseInt(color.slice(1), 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00FF) + amount;
  let b = (num & 0x0000FF) + amount;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

window.carManager = new CarManager();
