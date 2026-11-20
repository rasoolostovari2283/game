/**
 * موتور هوش مصنوعی ترافیک، تعقیب پلیس و فیزیک ضدتداخل (Traffic AI & Anti-Overlap V2.5)
 * توسعه‌دهنده: هانیه کاویانی (مهندس هوش مصنوعی ترافیک و گیمیفیکیشن)
 * پروژه: Neon Highway - اسپرینت ۲
 */

const TRAFFIC_TYPES = [
  { type: 'sedan', name: 'Sedan', width: 44, length: 82, speedBase: 70, weight: 35, color: '#3a7bd5' },
  { type: 'suv', name: 'SUV', width: 48, length: 88, speedBase: 65, weight: 25, color: '#b91d47' },
  { type: 'truck', name: 'Heavy Truck', width: 52, length: 140, speedBase: 50, weight: 20, color: '#e3a21a' },
  { type: 'sports', name: 'Sports Coupe', width: 46, length: 84, speedBase: 90, weight: 15, color: '#00a300' },
  { type: 'police', name: 'Police Interceptor', width: 48, length: 90, speedBase: 115, weight: 10, color: '#111827', isPolice: true }
];

class TrafficAIManager {
  constructor(road = null) {
    this.road = road || {
      width: 380,
      lanes: 4,
      laneWidth: 95,
      baseX: 200,
      getX: (y) => 200
    };

    this.vehicles = [];
    this.pickups = [];
    this.spawnTimer = 0;
    this.policeSpawnTimer = 0;
    this.isTwoWay = false;
    this.heatLevel = 0;
    this.hornRange = 350;
  }

  reset(twoWay = false) {
    this.vehicles = [];
    this.pickups = [];
    this.spawnTimer = 0;
    this.policeSpawnTimer = 0;
    this.isTwoWay = twoWay;
    this.heatLevel = 0;
  }

  setTwoWay(enabled) {
    this.isTwoWay = Boolean(enabled);
  }

  isLaneOncoming(laneIndex) {
    return this.isTwoWay && laneIndex < 2;
  }

  spawnVehicle(playerY = 0) {
    const laneIndex = Math.floor(Math.random() * this.road.lanes);
    const isOncoming = this.isLaneOncoming(laneIndex);

    // انتخاب تصادفی کلاس خودرو بر اساس وزن احتمال
    const rand = Math.random() * 90;
    let chosen = TRAFFIC_TYPES[0];
    let cumulative = 0;
    for (const t of TRAFFIC_TYPES) {
      if (t.isPolice) continue;
      cumulative += t.weight;
      if (rand <= cumulative) {
        chosen = t;
        break;
      }
    }

    const laneOffset = (laneIndex + 0.5) * this.road.laneWidth;
    const spawnY = playerY - 1100;

    // بررسی اولیه جهت جلوگیری از اسپاون بر روی خودروی موجود در همان لاین
    const isSpawnBlocked = this.vehicles.some(v => 
      Math.abs(v.laneOffset - laneOffset) < this.road.laneWidth * 0.7 &&
      Math.abs(v.y - spawnY) < 220
    );

    if (isSpawnBlocked) return null;

    const v = {
      id: Math.random().toString(36).substr(2, 9),
      type: chosen.type,
      name: chosen.name,
      width: chosen.width,
      length: chosen.length,
      color: chosen.color,
      x: (this.road.getX ? this.road.getX(spawnY) : this.road.baseX) + laneOffset,
      y: spawnY,
      laneOffset: laneOffset,
      lane: laneIndex,
      speed: chosen.speedBase + (Math.random() * 20 - 10),
      isOncoming: isOncoming,
      isPolice: false,
      isChangingLane: false,
      laneChangeCooldown: 3.0,
      nearMissGranted: false,
      steerAngle: 0,
      isHacked: false,
      hackedTimer: 0
    };

    this.vehicles.push(v);
    return v;
  }

  /**
   * اسپاون هوشمند گشت پلیس در سطوح خطر (Heat >= 2)
   */
  spawnPoliceInterceptor(playerY, playerSpeed, playerX) {
    const policeCount = this.vehicles.filter(item => item.isPolice).length;
    if (policeCount >= 2) return; // حداکثر ۲ خودروی پلیس هم‌زمان

    const laneW = this.road.laneWidth;
    const roadX = this.road.getX ? this.road.getX(playerY + 400) : this.road.baseX;
    const playerLane = Math.floor((playerX - roadX) / laneW);

    // پلیس از پشت سر وارد می‌شود تا تعقیب کند
    const spawnLane = playerLane > 1 ? 0 : 3;
    const laneOffset = (spawnLane + 0.5) * laneW;

    this.vehicles.push({
      id: 'police_' + Date.now(),
      type: 'police',
      name: 'Police Interceptor',
      width: 48,
      length: 90,
      color: '#111827',
      x: roadX + laneOffset,
      y: playerY + 380, // از پشت سر بازیکن وارد می‌شود
      laneOffset: laneOffset,
      lane: spawnLane,
      speed: playerSpeed + 35,
      isOncoming: false,
      isPolice: true,
      policeStrobe: 0,
      isChangingLane: false,
      laneChangeCooldown: 2.0,
      nearMissGranted: false,
      steerAngle: 0,
      isEmpDisabled: false,
      empTimer: 0
    });
  }

  /**
   * به‌روزرسانی فریم به فریم هوش مصنوعی، دافعه و رفع باگ تداخل
   */
  update(playerSpeed, playerY, delta, heatLevel = 0, playerX = 0) {
    this.heatLevel = heatLevel;

    // ۱. تایمر اسپاون ترافیک شهری
    this.spawnTimer += delta;
    const minSpawnInterval = Math.max(0.6, 1.8 - (playerSpeed / 240));
    if (this.spawnTimer > minSpawnInterval) {
      this.spawnVehicle(playerY);
      this.spawnTimer = 0;
    }

    // ۲. تایمر اسپاون پلیس
    if (this.heatLevel >= 2) {
      this.policeSpawnTimer += delta;
      if (this.policeSpawnTimer > Math.max(4.0, 10.0 - this.heatLevel * 1.5)) {
        this.spawnPoliceInterceptor(playerY, playerSpeed, playerX);
        this.policeSpawnTimer = 0;
      }
    }

    // ۳. پردازش ترافیک و هوش تعقیب
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];

      // هوش تعقیب محاصره‌ای پلیس (Flanking AI)
      if (v.isPolice) {
        v.policeStrobe = (v.policeStrobe || 0) + delta * 9;

        if (v.isEmpDisabled) {
          v.empTimer -= delta;
          v.speed = Math.max(18, v.speed * 0.94);
          if (v.empTimer <= 0) v.isEmpDisabled = false;
        } else {
          // تاکتیک محاصره جناحین
          const policeList = this.vehicles.filter(p => p.isPolice);
          const idx = policeList.indexOf(v);
          const laneW = this.road.laneWidth;
          const roadX = this.road.getX ? this.road.getX(v.y) : this.road.baseX;
          const playerOffset = playerX - roadX;

          let targetOffset;
          if (idx === 0) {
            targetOffset = playerOffset > (this.road.width * 0.5) ? (playerOffset - laneW * 0.9) : (playerOffset + laneW * 0.9);
          } else {
            targetOffset = playerOffset > (this.road.width * 0.5) ? (playerOffset + laneW * 0.9) : (playerOffset - laneW * 0.9);
          }

          targetOffset = Math.max(0.55 * laneW, Math.min(3.45 * laneW, targetOffset));
          v.laneOffset += (targetOffset - v.laneOffset) * 1.8 * delta;

          // تنظیم سرعت تعقیب
          if (v.y > playerY + 50) v.speed = Math.max(v.speed, playerSpeed + 25);
          else if (v.y < playerY - 180) v.speed = Math.max(60, playerSpeed - 15);
          else v.speed = playerSpeed + (idx === 0 ? 4 : -4);
        }
      }

      // حفظ فاصله ایمن ۲۴۰ پیکسلی با خودروی جلویی در همان لاین (Safe Following Buffer)
      if (!v.isOncoming && !v.isPolice) {
        let vehicleAhead = null;
        let closestDist = 240;

        for (const other of this.vehicles) {
          if (other === v || other.isOncoming) continue;
          const distY = v.y - other.y;
          const distX = Math.abs(v.laneOffset - other.laneOffset);
          if (distY > 0 && distY < closestDist && distX < this.road.laneWidth * 0.75) {
            closestDist = distY;
            vehicleAhead = other;
          }
        }

        if (vehicleAhead) {
          if (v.speed >= vehicleAhead.speed) {
            v.speed = Math.max(35, vehicleAhead.speed - 3);
          }
          if (!v.isChangingLane && v.laneChangeCooldown <= 0) {
            this.tryLaneChange(v);
          }
        }
      }

      // حرکت طولی
      let relativeSpeed = playerSpeed - v.speed;
      if (v.isOncoming) relativeSpeed = playerSpeed + v.speed;
      v.y += (relativeSpeed * 0.16);

      // دیسپاون در فواصل دور
      if (v.y > playerY + 1200 || v.y < playerY - 2000) {
        this.vehicles.splice(i, 1);
      }
    }

    // ۴. گام حیاتی فیزیک ضدتداخل (Anti-Overlap & Separation Physics Pass)
    // این بخش مانع فرو رفتن ماشین‌ها در همدیگر می‌شود
    for (let i = 0; i < this.vehicles.length; i++) {
      for (let j = i + 1; j < this.vehicles.length; j++) {
        const v1 = this.vehicles[i];
        const v2 = this.vehicles[j];

        const dx = v1.x - v2.x;
        const dy = v1.y - v2.y;
        const minDistX = (v1.width + v2.width) * 0.5 + 8;
        const minDistY = (v1.length + v2.length) * 0.5 + 18;

        if (Math.abs(dx) < minDistX && Math.abs(dy) < minDistY) {
          // محاسبه هم‌پوشانی و دافعه الاستیک دوطرفه
          const overlapX = minDistX - Math.abs(dx);
          const overlapY = minDistY - Math.abs(dy);

          // دافعه عرضی
          const pushDirX = dx >= 0 ? 1 : -1;
          const pushX = (overlapX * 0.5 + 1) * pushDirX;
          v1.laneOffset += pushX * 0.6;
          v2.laneOffset -= pushX * 0.6;
          v1.x += pushX * 0.6;
          v2.x -= pushX * 0.6;

          // دافعه طولی و ترمز اضطراری
          if (v1.y > v2.y) {
            v1.y += overlapY * 0.5;
            v2.y -= overlapY * 0.5;
            v1.speed = Math.max(30, v1.speed - 15);
            v2.speed += 8;
          } else {
            v2.y += overlapY * 0.5;
            v1.y -= overlapY * 0.5;
            v2.speed = Math.max(30, v2.speed - 15);
            v1.speed += 8;
          }
        }
      }
    }

    // کلمپ کلیه وسایل نقلیه درون مرزهای جاده
    const minOffset = 0.5 * this.road.laneWidth;
    const maxOffset = (this.road.lanes - 0.5) * this.road.laneWidth;
    for (const v of this.vehicles) {
      v.laneOffset = Math.max(minOffset, Math.min(maxOffset, v.laneOffset));
      v.x = (this.road.getX ? this.road.getX(v.y) : this.road.baseX) + v.laneOffset;
    }
  }

  tryLaneChange(v) {
    const currentLane = v.lane;
    const possibleLanes = [];
    if (currentLane > 0) possibleLanes.push(currentLane - 1);
    if (currentLane < this.road.lanes - 1) possibleLanes.push(currentLane + 1);

    for (const targetLane of possibleLanes) {
      const targetOffset = (targetLane + 0.5) * this.road.laneWidth;
      const isClear = !this.vehicles.some(other => 
        other !== v &&
        Math.abs(other.laneOffset - targetOffset) < this.road.laneWidth * 0.8 &&
        Math.abs(other.y - v.y) < 180
      );

      if (isClear) {
        v.isChangingLane = true;
        v.lane = targetLane;
        v.targetOffset = targetOffset;
        v.laneChangeCooldown = 3.5;
        break;
      }
    }
  }

  /**
   * واکنش ترافیک به بوق زدن بازیکن (Horn Reaction)
   */
  reactToHorn(playerX, playerY) {
    const laneW = this.road.laneWidth;
    for (const v of this.vehicles) {
      if (v.isOncoming || v.isPolice) continue;
      const distY = playerY - v.y;
      const distX = Math.abs(playerX - v.x);

      if (distY > 0 && distY < this.hornRange && distX < laneW * 0.8) {
        this.tryLaneChange(v);
      }
    }
  }
}

if (typeof module !== 'undefined') {
  module.exports = TrafficAIManager;
}
