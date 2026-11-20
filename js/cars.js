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

function initCarSprites() {
  for (const [key, src] of Object.entries(SPRITE_SOURCES)) {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      try {
        const off = document.createElement('canvas');
        off.width = img.width;
        off.height = img.height;
        const octx = off.getContext('2d');
        octx.drawImage(img, 0, 0);

        const imgData = octx.getImageData(0, 0, off.width, off.height);
        const data = imgData.data;
        // Key out solid black studio background
        for (let i = 0; i < data.length; i += 4) {
          const maxVal = Math.max(data[i], data[i + 1], data[i + 2]);
          if (maxVal < 26) {
            data[i + 3] = 0;
          } else if (maxVal < 48) {
            data[i + 3] = Math.floor(((maxVal - 26) / 22) * 255);
          }
        }
        octx.putImageData(imgData, 0, 0);

        // Pre-downscale to 160x320 for 60 FPS GPU-friendly rendering
        const targetW = 160;
        const targetH = 320;
        const optCanvas = document.createElement('canvas');
        optCanvas.width = targetW;
        optCanvas.height = targetH;
        const optCtx = optCanvas.getContext('2d');
        optCtx.imageSmoothingEnabled = true;
        optCtx.imageSmoothingQuality = 'high';
        optCtx.drawImage(off, 0, 0, targetW, targetH);

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

// AI-Powered Realistic Vehicle Renderer (Top-Down AI Sprites + Dynamic Lighting & FX)
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
    health = 100
  } = options;

  ctx.save();
  ctx.translate(x, y);
  if (steerAngle !== 0) {
    ctx.rotate(steerAngle);
  }

  const halfW = width / 2;
  const halfL = length / 2;

  // 0. Ambient Drop Shadow (Zero blur, crisp layered alpha)
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.roundRect(-halfW - 2, -halfL + 2, width + 4, length + 4, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.beginPath();
  ctx.roundRect(-halfW, -halfL + 4, width, length, 6);
  ctx.fill();
  ctx.restore();

  // 1. Neon Underglow (High-performance layered halo)
  if (underglow && underglow !== 'none') {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = underglow;
    ctx.beginPath();
    ctx.roundRect(-halfW - 5, -halfL - 2, width + 10, length + 4, 14);
    ctx.fill();
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.roundRect(-halfW - 2, -halfL + 1, width + 4, length - 2, 10);
    ctx.fill();
    ctx.restore();
  }

  // 2. Headlights Light Cones
  if (headlights) {
    ctx.save();
    const beamL = 260;
    const beamW = 85;

    let gradL = ctx.createRadialGradient(-halfW + 7, -halfL, 6, -halfW - 10, -halfL - beamL, beamW);
    gradL.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
    gradL.addColorStop(0.25, 'rgba(210, 245, 255, 0.35)');
    gradL.addColorStop(1, 'rgba(0, 242, 255, 0)');
    ctx.fillStyle = gradL;
    ctx.beginPath();
    ctx.moveTo(-halfW + 3, -halfL + 2);
    ctx.lineTo(-halfW + 12, -halfL + 2);
    ctx.lineTo(-halfW + 15 - beamW / 2, -halfL - beamL);
    ctx.lineTo(-halfW - beamW / 2, -halfL - beamL);
    ctx.closePath();
    ctx.fill();

    let gradR = ctx.createRadialGradient(halfW - 7, -halfL, 6, halfW + 10, -halfL - beamL, beamW);
    gradR.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
    gradR.addColorStop(0.25, 'rgba(210, 245, 255, 0.35)');
    gradR.addColorStop(1, 'rgba(0, 242, 255, 0)');
    ctx.fillStyle = gradR;
    ctx.beginPath();
    ctx.moveTo(halfW - 12, -halfL + 2);
    ctx.lineTo(halfW - 3, -halfL + 2);
    ctx.lineTo(halfW + beamW / 2, -halfL - beamL);
    ctx.lineTo(halfW - 15 + beamW / 2, -halfL - beamL);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 3. Resolve AI Sprite Key
  let resolvedKey = spriteKey || style || 'cyber_hatch';
  if (resolvedKey === 'hatchback') resolvedKey = 'cyber_hatch';
  else if (resolvedKey === 'muscle') resolvedKey = 'muscle_gt';
  else if (resolvedKey === 'tuner' || resolvedKey === 'sports') resolvedKey = 'tokyo_drift';
  else if (resolvedKey === 'police') resolvedKey = 'police_interceptor';
  else if (resolvedKey === 'hyper') resolvedKey = 'hyper_2077';
  else if (resolvedKey === 'sedan') resolvedKey = 'traffic_sedan';
  else if (resolvedKey === 'suv') resolvedKey = 'traffic_suv';
  else if (resolvedKey === 'truck') resolvedKey = 'traffic_truck';

  const sprite = CAR_PROCESSED_SPRITES[resolvedKey];

  if (sprite && (sprite.complete === undefined || sprite.complete || sprite instanceof HTMLCanvasElement)) {
    // High-Definition AI Sprite Render (Optimized 160x320)
    ctx.drawImage(sprite, -halfW, -halfL, width, length);
  } else {
    // Procedural Fallback Chassis while asset is preloading
    ctx.save();
    const bodyGrad = ctx.createLinearGradient(-halfW, 0, halfW, 0);
    bodyGrad.addColorStop(0, adjustColor(color, -40));
    bodyGrad.addColorStop(0.5, adjustColor(color, 30));
    bodyGrad.addColorStop(1, adjustColor(color, -40));
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.roundRect(-halfW, -halfL, width, length, 8);
    ctx.fill();
    ctx.restore();
  }

  // 4. Dynamic Headlight Bulbs Glow (Crisp layered alpha)
  ctx.save();
  ctx.fillStyle = 'rgba(0, 242, 255, 0.4)';
  ctx.beginPath();
  ctx.roundRect(-halfW + 2, -halfL - 2, 12, 7, 3);
  ctx.roundRect(halfW - 14, -halfL - 2, 12, 7, 3);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(-halfW + 4, -halfL, 8, 3, 1);
  ctx.roundRect(halfW - 12, -halfL, 8, 3, 1);
  ctx.fill();
  ctx.restore();

  // 5. Dynamic Taillights / Brake Glow
  ctx.save();
  if (isBraking) {
    ctx.fillStyle = 'rgba(255, 0, 50, 0.35)';
    ctx.beginPath();
    ctx.roundRect(-halfW + 1, halfL - 6, 17, 10, 4);
    ctx.roundRect(halfW - 18, halfL - 6, 17, 10, 4);
    ctx.fill();
  }
  ctx.fillStyle = isBraking ? '#ff0033' : '#aa0015';
  ctx.beginPath();
  ctx.roundRect(-halfW + 4, halfL - 3, 11, 4, 1.5);
  ctx.roundRect(halfW - 15, halfL - 3, 11, 4, 1.5);
  ctx.fill();
  ctx.restore();

  // 6. Police Strobe Roof Lightbar
  if (isPolice) {
    const strobeTick = Math.floor((policeStrobe || Date.now() / 90) % 2) === 0;
    ctx.save();
    // Lightbar housing
    ctx.fillStyle = '#111622';
    ctx.beginPath();
    ctx.roundRect(-16, -halfL + length * 0.42, 32, 7, 2);
    ctx.fill();

    // Blue side
    if (strobeTick) {
      ctx.fillStyle = 'rgba(0, 229, 255, 0.4)';
      ctx.fillRect(-18, -halfL + length * 0.42 - 2, 21, 11);
      ctx.fillStyle = '#00e5ff';
    } else {
      ctx.fillStyle = '#0033aa';
    }
    ctx.fillRect(-14, -halfL + length * 0.42 + 1, 13, 5);

    // Red side
    if (!strobeTick) {
      ctx.fillStyle = 'rgba(255, 0, 68, 0.4)';
      ctx.fillRect(-3, -halfL + length * 0.42 - 2, 21, 11);
      ctx.fillStyle = '#ff0044';
    } else {
      ctx.fillStyle = '#660011';
    }
    ctx.fillRect(1, -halfL + length * 0.42 + 1, 13, 5);
    ctx.restore();
  }

  // 7. Nitro Jet Flames
  if (hasNitro) {
    ctx.save();
    // Outer flame aura
    ctx.fillStyle = 'rgba(0, 242, 255, 0.35)';
    ctx.beginPath();
    ctx.moveTo(-halfW + 8, halfL);
    ctx.lineTo(-halfW + 17, halfL);
    ctx.lineTo(-halfW + 12.5, halfL + 22 + Math.random() * 8);
    ctx.closePath();
    ctx.moveTo(halfW - 17, halfL);
    ctx.lineTo(halfW - 8, halfL);
    ctx.lineTo(halfW - 12.5, halfL + 22 + Math.random() * 8);
    ctx.closePath();
    ctx.fill();

    // Inner bright core
    ctx.fillStyle = '#ff0077';
    ctx.beginPath();
    ctx.moveTo(-halfW + 10, halfL);
    ctx.lineTo(-halfW + 15, halfL);
    ctx.lineTo(-halfW + 12.5, halfL + 14 + Math.random() * 6);
    ctx.closePath();
    ctx.moveTo(halfW - 15, halfL);
    ctx.lineTo(halfW - 10, halfL);
    ctx.lineTo(halfW - 12.5, halfL + 14 + Math.random() * 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(-halfW + 12.5, halfL + 4, 3, 0, Math.PI * 2);
    ctx.arc(halfW - 12.5, halfL + 4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 8. Damage Smoke & Engine Sparks (Low Health Visuals)
  if (health < 50) {
    ctx.save();
    const smokeAlpha = (50 - health) / 50;
    ctx.fillStyle = `rgba(30, 30, 35, ${smokeAlpha * 0.4})`;
    ctx.beginPath();
    ctx.arc(0 + (Math.random() - 0.5) * 8, -halfL + 15, 6 + Math.random() * 6, 0, Math.PI * 2);
    ctx.fill();

    if (health < 25) {
      // Fire sparks
      ctx.fillStyle = Math.random() < 0.5 ? '#ffe600' : '#ff3300';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(-6 + Math.random() * 12, -halfL + 8 + Math.random() * 12, 2.5, 2.5);
      }
    }
    ctx.restore();
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
