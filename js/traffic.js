// Traffic Vehicle AI, Lane Changes, Horn Reaction & Police Pursuit Engine

const TRAFFIC_TYPES = [
  { type: 'sedan', spriteKey: 'traffic_sedan', name: 'Sedan', width: 44, length: 82, speedBase: 70, weight: 35, color: '#3a7bd5' },
  { type: 'suv', spriteKey: 'traffic_suv', name: 'SUV', width: 48, length: 88, speedBase: 65, weight: 25, color: '#b91d47' },
  { type: 'truck', spriteKey: 'traffic_truck', name: 'Truck', width: 52, length: 140, speedBase: 50, weight: 20, color: '#e3a21a' },
  { type: 'sports', spriteKey: 'tokyo_drift', name: 'Sports', width: 46, length: 84, speedBase: 90, weight: 15, color: '#00a300' },
  { type: 'police', spriteKey: 'police_interceptor', name: 'Police Interceptor', width: 48, length: 90, speedBase: 115, weight: 10, color: '#111827', isPolice: true }
];

class TrafficManager {
  constructor(road) {
    this.road = road;
    this.vehicles = [];
    this.pickups = [];
    this.spawnTimer = 0;
    this.pickupTimer = 0;
    this.hazardTimer = 0;
    this.policeSpawnTimer = 0;
    this.twoWayMode = false;
    this.heatLevel = 0;

    this.repairIcon = new Image();
    this.repairIcon.src = 'assets/pickups/pickup_repair.jpg';
  }

  reset(twoWay = false) {
    this.vehicles = [];
    this.pickups = [];
    this.spawnTimer = 0;
    this.pickupTimer = 0;
    this.hazardTimer = 0;
    this.policeSpawnTimer = 0;
    this.twoWayMode = twoWay;
    this.heatLevel = 0;

    // Pre-populate 2 initial traffic cars ahead so highway is immediately active
    const playerY = window.innerHeight - 190;
    this.spawnInitialVehicle(playerY - 350, twoWay ? 2 : 1, 0);
    this.spawnInitialVehicle(playerY - 620, 3, 1);
  }

  spawnInitialVehicle(y, lane, typeIndex = 0) {
    const chosenType = TRAFFIC_TYPES[typeIndex] || TRAFFIC_TYPES[0];
    const laneOffset = (lane + 0.5) * this.road.laneWidth;
    const laneX = (this.road.getX ? this.road.getX(y) : this.road.x) + laneOffset;
    this.vehicles.push({
      id: Math.random().toString(36).substr(2, 9),
      type: chosenType.type,
      spriteKey: chosenType.spriteKey,
      width: chosenType.width,
      length: chosenType.length,
      x: laneX,
      y: y,
      laneOffset: laneOffset,
      speed: 68,
      color: chosenType.color,
      lane: lane,
      isOncoming: false,
      isPolice: false,
      isChangingLane: false,
      laneChangeCooldown: 3.0,
      nearMissGranted: false,
      steerAngle: 0
    });
  }

  update(playerSpeed, playerY, delta, heatLevel = 0, playerX = 0) {
    this.heatLevel = heatLevel;
    const dt60 = Math.max(0.1, Math.min(2.5, delta * 60));

    // 1. Vehicle Spawning
    this.spawnTimer += delta;
    const minSpawnInterval = Math.max(0.55, 1.7 - (playerSpeed / 240));
    if (this.spawnTimer > minSpawnInterval) {
      this.spawnVehicle(playerY);
      this.spawnTimer = 0;
    }

    // 2. Police Pursuit Interceptor Spawning (When Heat >= 2)
    if (this.heatLevel >= 2) {
      this.policeSpawnTimer += delta;
      const policeInterval = Math.max(3.5, 9.0 - this.heatLevel * 1.2);
      if (this.policeSpawnTimer > policeInterval) {
        this.spawnPoliceInterceptor(playerY, playerSpeed, playerX);
        this.policeSpawnTimer = 0;
      }
    }

    // 3. Pickup Spawning (Coins, Nitro & Repair Wrench)
    this.pickupTimer += delta;
    if (this.pickupTimer > 2.0) {
      this.spawnPickup(playerY);
      this.pickupTimer = 0;
    }

    // 4. Road Hazard Spawning (Oil slicks, traffic cones)
    this.hazardTimer += delta;
    if (this.hazardTimer > 3.8) {
      const hazardY = playerY - 950;
      const roadX = this.road.getX ? this.road.getX(hazardY) : this.road.x;
      window.particleSystem.spawnHazard(roadX, this.road.width, playerY);
      this.hazardTimer = 0;
    }

    // Pre-index police units once per frame instead of filtering inside the loop
    let policeSlot = 0;

    // 5. Update Traffic Vehicles & Police Pursuit AI
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];

      // Tactical Police Pursuit AI (Separated flanking positions, no stacking)
      if (v.isPolice) {
        const policeIndex = policeSlot++;
        const laneW = this.road.laneWidth;
        const currentRoadX = this.road.getX ? this.road.getX(v.y) : this.road.x;
        const playerLaneOffset = playerX - currentRoadX;

        const preferLeft = playerLaneOffset > (this.road.width * 0.5);
        let targetOffset;
        if (policeIndex === 0) {
          targetOffset = preferLeft ? (playerLaneOffset - laneW * 0.9) : (playerLaneOffset + laneW * 0.9);
        } else {
          targetOffset = preferLeft ? (playerLaneOffset + laneW * 0.9) : (playerLaneOffset - laneW * 0.9);
        }

        targetOffset = Math.max(0.55 * laneW, Math.min(3.45 * laneW, targetOffset));
        v.laneOffset += (targetOffset - v.laneOffset) * Math.min(1, 1.6 * delta);
        v.lane = Math.floor(v.laneOffset / laneW);

        if (v.y > playerY + 60) {
          v.speed = Math.max(v.speed, playerSpeed + 22);
        } else if (v.y < playerY - 180) {
          v.speed = Math.max(60, playerSpeed - 15);
        } else {
          v.speed = playerSpeed + (policeIndex === 0 ? 3 : -3);
        }
      }

      // Safe Following Distance: Detect vehicle ahead in same lane & brake/overtake
      if (!v.isOncoming) {
        let vehicleAhead = null;
        let closestDist = 240;

        for (let j = 0; j < this.vehicles.length; j++) {
          const other = this.vehicles[j];
          if (other === v || other.isOncoming) continue;
          const distY = v.y - other.y;
          if (distY > 0 && distY < closestDist && Math.abs(v.laneOffset - other.laneOffset) < this.road.laneWidth * 0.75) {
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

      let relativeSpeed = playerSpeed - v.speed;
      if (v.isOncoming) {
        relativeSpeed = playerSpeed + v.speed;
      } else {
        relativeSpeed = v.isPolice ? (playerSpeed - v.speed) : Math.max(14, playerSpeed - v.speed);
      }

      v.y += relativeSpeed * 0.16 * dt60;
      if (v.laneOffset === undefined) {
        v.laneOffset = (v.lane + 0.5) * this.road.laneWidth;
      }

      // AI Lane changing
      if (v.isHacked) {
        v.hackedTimer = (v.hackedTimer || 3.0) - delta;
        v.speed = Math.max(v.speed, 112);
        if (v.hackedTimer <= 0) {
          v.isHacked = false;
        } else {
          const targetOffset = (v.targetLane !== undefined
            ? (v.targetLane + 0.5) * this.road.laneWidth
            : (v.laneOffset < this.road.width * 0.5 ? 0.5 * this.road.laneWidth : 3.5 * this.road.laneWidth));
          v.laneOffset += (targetOffset - v.laneOffset) * Math.min(1, 4.5 * delta);
          if (Math.random() < 0.16 * dt60) {
            window.particleSystem.addHackSparks(v.x, v.y);
          }
        }
      } else if (v.isEmpDisabled) {
        v.empTimer = (v.empTimer || 4.0) - delta;
        v.speed = Math.max(18, v.speed * Math.pow(0.94, dt60));
        v.policeStrobe = 0;
        if (v.empTimer <= 0) {
          v.isEmpDisabled = false;
        } else if (Math.random() < 0.2 * dt60) {
          window.particleSystem.addHackSparks(v.x, v.y, '#00f2ff');
        }
      } else if (v.laneChangeCooldown > 0) {
        v.laneChangeCooldown -= delta;
      } else if (!v.isChangingLane && Math.random() < 0.006 * dt60) {
        this.tryLaneChange(v);
      }

      if (v.isChangingLane) {
        const step = 2.2 * dt60;
        v.laneOffset += v.laneChangeDir * step;
        v.laneChangeProgress += step;
        if (v.laneChangeProgress >= this.road.laneWidth) {
          v.isChangingLane = false;
          v.lane = v.targetLane;
          v.laneOffset = (v.lane + 0.5) * this.road.laneWidth;
          v.laneChangeCooldown = 3.5;
        }
      }

      const roadX = this.road.getX ? this.road.getX(v.y) : this.road.x;
      v.x = roadX + v.laneOffset;
      v.steerAngle = v.isOncoming ? Math.PI : (v.isChangingLane ? v.laneChangeDir * 0.09 : 0);

      if (v.isPolice) {
        v.policeStrobe = (v.policeStrobe || 0) + delta * 9;
      }

      if (v.y > playerY + 1200 || v.y < playerY - 2000) {
        this.vehicles.splice(i, 1);
      }
    }

    // 6. Anti-Overlap & Vehicle-to-Vehicle Separation Physics Pass
    for (let i = 0; i < this.vehicles.length; i++) {
      for (let j = i + 1; j < this.vehicles.length; j++) {
        const v1 = this.vehicles[i];
        const v2 = this.vehicles[j];

        const dx = v1.x - v2.x;
        const dy = v1.y - v2.y;
        const minDistX = (v1.width + v2.width) * 0.5 + 8;
        const minDistY = (v1.length + v2.length) * 0.5 + 18;

        if (Math.abs(dx) < minDistX && Math.abs(dy) < minDistY) {
          const overlapX = minDistX - Math.abs(dx);
          const overlapY = minDistY - Math.abs(dy);

          const pushDirX = dx >= 0 ? 1 : -1;
          const pushX = (overlapX * 0.5 + 1) * pushDirX;
          v1.laneOffset += pushX * 0.6;
          v2.laneOffset -= pushX * 0.6;
          v1.x += pushX * 0.6;
          v2.x -= pushX * 0.6;

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

    const minOffset = 0.5 * this.road.laneWidth;
    const maxOffset = (this.road.lanes - 0.5) * this.road.laneWidth;
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      v.laneOffset = Math.max(minOffset, Math.min(maxOffset, v.laneOffset));
    }

    // 7. Update Pickups
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.y += playerSpeed * 0.12 * dt60;
      if (p.laneOffset !== undefined && this.road.getX) {
        p.x = this.road.getX(p.y) + p.laneOffset;
      }
      p.rotation = (p.rotation || 0) + delta * 3;

      if (p.y > playerY + 1200) {
        this.pickups.splice(i, 1);
      }
    }
  }

  // Reactive AI: When player honks, nearby cars move out of the way!
  reactToHorn(playerX, playerY) {
    for (const v of this.vehicles) {
      if (v.isOncoming) continue;
      const distY = v.y - playerY;
      // If car is ahead of player (up to 320px ahead) and in a nearby lane
      if (distY < 0 && distY > -320 && Math.abs(v.x - playerX) < 60) {
        if (!v.isChangingLane) {
          // Attempt urgent lane switch to right or left
          const targetLane = v.lane === 0 ? 1 : (v.lane === 3 ? 2 : (playerX > v.x ? v.lane - 1 : v.lane + 1));
          if (targetLane >= (this.twoWayMode ? 2 : 0) && targetLane <= 3) {
            v.isChangingLane = true;
            v.targetLane = targetLane;
            v.laneChangeDir = targetLane > v.lane ? 1 : -1;
            v.laneChangeProgress = 0;
            v.speed += 8; // speed up slightly to clear path
            window.particleSystem.addFloatingText('⚠️ MOVING!', v.x, v.y - 20, '#ffe600');
          }
        }
      }
    }
  }

  spawnVehicle(playerY) {
    if (this.vehicles.length >= 9) return;

    const rand = Math.random() * 100;
    let accum = 0;
    let chosenType = TRAFFIC_TYPES[0];
    for (const t of TRAFFIC_TYPES) {
      accum += t.weight;
      if (rand <= accum) {
        chosenType = t;
        break;
      }
    }

    // Try available lanes to find one that isn't blocked
    const laneCandidates = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    const spawnY = playerY - 700;
    let chosenLane = -1;
    let chosenOffset = 0;
    let chosenIsOncoming = false;

    for (const lane of laneCandidates) {
      const isOncoming = this.twoWayMode && (lane === 0 || lane === 1);
      if (chosenType.type === 'truck' && this.twoWayMode && isOncoming) continue;

      const laneOffset = (lane + 0.5) * this.road.laneWidth;
      const isBlocked = this.vehicles.some(v => {
        return Math.abs((v.laneOffset || 0) - laneOffset) < 55 && Math.abs(v.y - spawnY) < 280;
      });

      if (!isBlocked) {
        chosenLane = lane;
        chosenOffset = laneOffset;
        chosenIsOncoming = isOncoming;
        break;
      }
    }

    if (chosenLane === -1) return; // All lanes blocked at this distance, wait for next tick

    const laneX = (this.road.getX ? this.road.getX(spawnY) : this.road.x) + chosenOffset;
    const speed = chosenType.speedBase + (Math.random() * 16 - 8);

    this.vehicles.push({
      id: Math.random().toString(36).substr(2, 9),
      type: chosenType.type,
      spriteKey: chosenType.spriteKey,
      width: chosenType.width,
      length: chosenType.length,
      x: laneX,
      y: spawnY,
      laneOffset: chosenOffset,
      speed: speed,
      color: chosenType.color,
      lane: chosenLane,
      isOncoming: chosenIsOncoming,
      isPolice: chosenType.isPolice || false,
      isChangingLane: false,
      laneChangeCooldown: 2.5 + Math.random() * 3,
      nearMissGranted: false,
      steerAngle: chosenIsOncoming ? Math.PI : 0
    });
  }

  spawnPoliceInterceptor(playerY, playerSpeed, playerX) {
    const policeCount = this.vehicles.filter(v => v.isPolice).length;
    // Limit to max 1 police at heat 2, max 2 at heat >= 3
    const maxPolice = this.heatLevel >= 3 ? 2 : 1;
    if (policeCount >= maxPolice) return;

    const spawnFromBehind = policeCount === 0 ? (Math.random() < 0.6) : true;
    const spawnY = spawnFromBehind ? (playerY + 460) : (playerY - 820);

    const laneCandidates = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    let chosenLane = -1;
    let chosenOffset = 0;

    for (const lane of laneCandidates) {
      if (this.twoWayMode && (lane === 0 || lane === 1)) continue; // Never spawn police on oncoming lane
      const offset = (lane + 0.5) * this.road.laneWidth;
      const isBlocked = this.vehicles.some(v => Math.abs((v.laneOffset || 0) - offset) < 55 && Math.abs(v.y - spawnY) < 280);
      if (!isBlocked) {
        chosenLane = lane;
        chosenOffset = offset;
        break;
      }
    }

    if (chosenLane === -1) return; // Area occupied, retry next interval

    const laneX = (this.road.getX ? this.road.getX(spawnY) : this.road.x) + chosenOffset;

    this.vehicles.push({
      id: 'cop_' + Math.random().toString(36).substr(2, 7),
      type: 'police',
      spriteKey: 'police_interceptor',
      width: 48,
      length: 90,
      x: laneX,
      y: spawnY,
      laneOffset: chosenOffset,
      speed: spawnFromBehind ? (playerSpeed + 28) : Math.max(70, playerSpeed - 12),
      color: '#111827',
      lane: chosenLane,
      isOncoming: false,
      isPolice: true,
      isChangingLane: false,
      laneChangeCooldown: 2.0,
      nearMissGranted: false,
      steerAngle: 0,
      policeStrobe: 0
    });

    // Alert player of incoming interceptor
    const alert = document.getElementById('police-alert-banner');
    if (alert) {
      alert.classList.add('show');
      setTimeout(() => alert.classList.remove('show'), 2200);
    }
    if (window.soundSystem && window.soundSystem.startPoliceSiren) {
      window.soundSystem.startPoliceSiren();
    }
  }

  tryLaneChange(vehicle) {
    if (vehicle.isOncoming || vehicle.isChangingLane) return;
    const currentLane = vehicle.lane;
    const possibleLanes = [];
    if (currentLane > (this.twoWayMode ? 2 : 0)) possibleLanes.push(currentLane - 1);
    if (currentLane < 3) possibleLanes.push(currentLane + 1);

    if (possibleLanes.length === 0) return;
    const targetLane = possibleLanes[Math.floor(Math.random() * possibleLanes.length)];
    const targetOffset = (targetLane + 0.5) * this.road.laneWidth;

    const isOccupied = this.vehicles.some(v => v !== vehicle && Math.abs((v.laneOffset || 0) - targetOffset) < 55 && Math.abs(v.y - vehicle.y) < 220);
    if (!isOccupied) {
      vehicle.isChangingLane = true;
      vehicle.targetLane = targetLane;
      vehicle.laneChangeDir = targetLane > currentLane ? 1 : -1;
      vehicle.laneChangeProgress = 0;
      vehicle.laneChangeCooldown = 3.5;
    }
  }

  spawnPickup(playerY) {
    if (this.pickups.length >= 7) return;
    const lane = Math.floor(Math.random() * 4);
    const spawnY = playerY - 800;
    const laneOffset = (lane + 0.5) * this.road.laneWidth;
    const laneX = (this.road.getX ? this.road.getX(spawnY) : this.road.x) + laneOffset;

    const rand = Math.random();
    let type = 'coin';
    let radius = 14;

    if (rand < 0.22) {
      type = 'repair'; // Repair Wrench (+30 HP)
      radius = 16;
    } else if (rand < 0.48) {
      type = 'nitro'; // Nitrous Bottle
      radius = 16;
    }

    this.pickups.push({
      type: type,
      x: laneX,
      y: spawnY,
      laneOffset: laneOffset,
      radius: radius,
      rotation: 0
    });
  }

  render(ctx, lowSpec = false) {
    // 1. Render Pickups
    for (let i = 0; i < this.pickups.length; i++) {
      const p = this.pickups[i];
      ctx.save();
      ctx.translate(p.x, p.y);

      if (p.type === 'coin') {
        const scaleX = Math.cos(p.rotation);
        ctx.scale(scaleX, 1);
        ctx.fillStyle = 'rgba(255, 230, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius + 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffe600';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius * 0.7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px "Orbitron", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 1);
      } else if (p.type === 'nitro') {
        ctx.fillStyle = 'rgba(255, 0, 119, 0.35)';
        ctx.beginPath();
        ctx.roundRect(-11, -17, 22, 34, 8);
        ctx.fill();

        ctx.fillStyle = '#ff0077';
        ctx.beginPath();
        ctx.roundRect(-8, -14, 16, 28, 6);
        ctx.fill();

        ctx.fillStyle = '#00f2ff';
        ctx.fillRect(-5, -18, 10, 5);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px "Orbitron", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('N2O', 0, 1);
      } else if (p.type === 'repair') {
        const pulse = 1 + Math.sin(p.rotation * 2) * 0.12;
        ctx.scale(pulse, pulse);

        ctx.fillStyle = 'rgba(0, 255, 136, 0.35)';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius + 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0a1a18';
        ctx.fillRect(-8, -3, 16, 6);
        ctx.fillRect(-3, -8, 6, 16);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px "Orbitron", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('HP', 0, 0);
      }
      ctx.restore();
    }

    // 2. Render Traffic Vehicles with Auto-Cropped Sprites & Cached FX
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      drawCar(ctx, v.x, v.y, v.width, v.length, v.color, {
        defaultColor: v.color,
        underglow: v.isHacked ? '#00ffcc' : (v.isPolice ? (v.isEmpDisabled ? 'none' : '#0066ff') : 'none'),
        style: v.type,
        spriteKey: v.spriteKey || v.type,
        headlights: v.isOncoming,
        steerAngle: v.steerAngle !== undefined ? v.steerAngle : (v.isOncoming ? Math.PI : 0),
        isPolice: v.isPolice,
        policeStrobe: v.isEmpDisabled ? 0 : (v.policeStrobe || 0),
        turnSignal: v.isChangingLane ? v.laneChangeDir : 0,
        lowSpec
      });

      if (v.isHacked) {
        ctx.save();
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 2;
        ctx.strokeRect(v.x - v.width / 2 - 4, v.y - v.length / 2 - 4, v.width + 8, v.length + 8);

        ctx.font = 'bold 10px "Orbitron", sans-serif';
        ctx.fillStyle = '#00ffcc';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ HACKED', v.x, v.y - v.length / 2 - 8);
        ctx.restore();
      } else if (v.isEmpDisabled) {
        ctx.save();
        ctx.strokeStyle = '#ff0055';
        ctx.lineWidth = 2;
        ctx.strokeRect(v.x - v.width / 2 - 4, v.y - v.length / 2 - 4, v.width + 8, v.length + 8);

        ctx.strokeStyle = '#00f2ff';
        ctx.beginPath();
        ctx.moveTo(v.x - v.width / 2 + Math.random() * 10, v.y - v.length / 4);
        ctx.lineTo(v.x + (Math.random() - 0.5) * 20, v.y);
        ctx.lineTo(v.x + v.width / 2 - Math.random() * 10, v.y + v.length / 4);
        ctx.stroke();

        ctx.font = 'bold 10px "Orbitron", sans-serif';
        ctx.fillStyle = '#ff3366';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ EMP STALLED', v.x, v.y - v.length / 2 - 8);
        ctx.restore();
      }
    }
  }
}

window.TrafficManager = TrafficManager;
