// =====================================================================
// SERIOUS DRIVING SIMULATOR & HAZARD PERCEPTION ASSESSMENT ENGINE
// SafeDrive Cyber-Sim: Academic Serious Game Module
// Team: Rasool Ostovari, Ehsan Kazemi, Maryam Nazemsadat, Haniyeh Kaviani
// =====================================================================

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./sim-utils.js'));
  } else {
    root.SeriousDrivingManager = factory(root.SimUtils);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (SimUtils) {
  class SeriousDrivingManager {
    constructor(game) {
      this.game = game;
      this.enabled = false;
      this.studentName = 'دانشجوی گرامی';

      // Live Assessment Metrics
      this.resetMetrics();

      // Throttled HUD update timer
      this.hudAccum = 0;
      this.dom = null;
      this._lastEcoVal = -1;
      this._lastSafeClass = '';
      this._lastSafeText = '';

      // Hazard Perception Controller
      this.hazardTimer = 0;
      this.hazardInterval = 7.5; // Trigger a hazard every 7-10 seconds
      this.activeHazard = null;
      this.hazardHistory = [];

      // Safe Distance Tracking
      this.nearestAheadVehicle = null;
      this.tailgatingDuration = 0;
      this.safeDistanceAdherenceTimer = 0;
      this.totalDrivingTimer = 0;

      // Eco Tracking
      this.ecoSum = 0;
      this.ecoTicks = 0;
      this.currentEcoScore = 90;

      // Audio cues
      this.lastTailgateWarningTime = 0;
    }

    cacheDom() {
      if (this.dom) return;
      this.dom = {
        hudSerious: document.getElementById('hud-serious-panel'),
        ecoVal: document.getElementById('hud-eco-val'),
        ecoBar: document.getElementById('hud-eco-bar'),
        ecoStatus: document.getElementById('hud-eco-status'),
        safeBadge: document.getElementById('hud-safe-distance-badge'),
        lastMs: document.getElementById('hud-last-reaction-ms'),
        banner: document.getElementById('serious-hazard-banner')
      };
    }

    resetMetrics() {
      this.reactionTimes = [];
      this.hazardsTotal = 0;
      this.hazardsDetected = 0;
      this.hazardHistory = [];
      this.violations = [];
      this.tailgatingDuration = 0;
      this.safeDistanceAdherenceTimer = 0;
      this.totalDrivingTimer = 0;
      this.ecoSum = 0;
      this.ecoTicks = 0;
      this.currentEcoScore = 90;
      this.activeHazard = null;
      this.hazardTimer = 0;
      this.lastTailgateWarningTime = 0;
      this._lastEcoVal = -1;
      this._lastSafeClass = '';
      this._lastSafeText = '';
    }

    startSession(mode = 'serious_test') {
      this.enabled = (mode === 'serious_test');
      this.resetMetrics();
      this.updateHudVisibility();
    }

    updateHudVisibility() {
      this.cacheDom();
      if (this.dom && this.dom.hudSerious) {
        this.dom.hudSerious.style.display = this.enabled ? 'flex' : 'none';
      }
    }

    update(delta, player, vehicles, keys) {
      if (!this.enabled || !player) return;

      this.totalDrivingTimer += delta;

      // 1. Eco-Driving Live Telemetry
      const rpm = player.stats ? (2200 + (player.speed / 240) * 4500) : 3000;
      const isAccelerating = Boolean(keys.up);
      const isBraking = Boolean(keys.down);
      const isNitro = Boolean(player.isNitroActive);

      const ecoData = SimUtils.computeEcoTelemetry(player.speed, rpm, isAccelerating, isBraking, isNitro);
      this.currentEcoScore = ecoData.ecoScore;
      this.ecoSum += ecoData.ecoScore;
      this.ecoTicks += 1;

      // 2. Safe Distance & Two-Second Rule Tracking
      this.updateSafeDistance(delta, player, vehicles);

      // 3. Hazard Perception Cycle
      this.updateHazardCycle(delta, player, vehicles, keys);

      // 4. Throttled DOM updates (Runs at ~10 FPS instead of 60 FPS to prevent reflows!)
      this.hudAccum = (this.hudAccum || 0) + delta;
      if (this.hudAccum >= 0.1) {
        this.hudAccum = 0;
        this.updateEcoHudThrottled(ecoData);
      }
    }

    updateEcoHudThrottled(ecoData) {
      this.cacheDom();
      if (!this.dom) return;

      if (this._lastEcoVal !== ecoData.ecoScore) {
        this._lastEcoVal = ecoData.ecoScore;
        if (this.dom.ecoVal) this.dom.ecoVal.textContent = ecoData.ecoScore + '%';
        if (this.dom.ecoBar) {
          this.dom.ecoBar.style.width = ecoData.ecoScore + '%';
          this.dom.ecoBar.style.background = ecoData.ecoScore >= 80 ? '#00ff88' : (ecoData.ecoScore >= 50 ? '#ffcc00' : '#ff0055');
        }
        if (this.dom.ecoStatus) this.dom.ecoStatus.textContent = ecoData.status;
      }
    }

    updateSafeDistance(delta, player, vehicles) {
      const weather = this.game ? this.game.weather : 'night';
      const safeThreshold = SimUtils.computeSafeDistanceThreshold(player.speed, weather);

      // Find nearest vehicle ahead in the same lane (or very close lateral distance)
      let nearest = null;
      let minDy = Infinity;

      for (let i = 0; i < vehicles.length; i++) {
        const v = vehicles[i];
        if (v.isOncoming) continue;
        const dy = player.y - v.y; // positive means v is ahead of player
        if (dy > 10 && dy < minDy) {
          const dx = Math.abs(player.x - v.x);
          if (dx < (this.game?.road?.laneWidth || 95) * 0.75) {
            minDy = dy;
            nearest = v;
          }
        }
      }

      this.nearestAheadVehicle = nearest;

      this.cacheDom();
      const safeBadge = this.dom ? this.dom.safeBadge : null;
      const safeDistanceMeters = (player.speed / 3.6) * safeThreshold.timeGapSec;

      if (nearest && minDy < 500) {
        const currentDistanceMeters = Math.max(1, (minDy / 3.2)).toFixed(1);
        const isTailgating = minDy < safeThreshold.safeDistancePx * 0.65;

        if (isTailgating && player.speed > 45) {
          this.tailgatingDuration += delta;
          const text = `فاصله خطرناک! (${currentDistanceMeters}m / حداقل: ${safeDistanceMeters.toFixed(0)}m)`;
          if (safeBadge && this._lastSafeText !== text) {
            this._lastSafeText = text;
            safeBadge.className = 'safe-badge badge-danger';
            safeBadge.textContent = text;
          }

          // Sound alert cooldown
          const now = Date.now();
          if (now - this.lastTailgateWarningTime > 2800) {
            this.lastTailgateWarningTime = now;
            this.recordViolation('عدم رعایت فاصله طولی ایمن (قانون ۲ ثانیه)');
            this.showHazardAlert('اخطار: رعایت فاصله طولی ایمن ۲ ثانیه!');
          }
        } else {
          this.safeDistanceAdherenceTimer += delta;
          const text = `فاصله ایمن: ${currentDistanceMeters}m (استاندارد: ${safeDistanceMeters.toFixed(0)}m)`;
          if (safeBadge && this._lastSafeText !== text) {
            this._lastSafeText = text;
            safeBadge.className = 'safe-badge badge-safe';
            safeBadge.textContent = text;
          }
        }
      } else {
        this.safeDistanceAdherenceTimer += delta;
        const text = 'مسیر پیش‌رو باز و ایمن است';
        if (safeBadge && this._lastSafeText !== text) {
          this._lastSafeText = text;
          safeBadge.className = 'safe-badge badge-safe';
          safeBadge.textContent = text;
        }
      }
    }

    updateHazardCycle(delta, player, vehicles, keys) {
      // If a hazard is currently active, evaluate player's reaction
      if (this.activeHazard) {
        this.activeHazard.elapsed += delta;

        const isPlayerReacting = Boolean(keys.down) || (!keys.up && player.speed > 50) || Math.abs(player.vx || 0) > 120;

        if (isPlayerReacting && !this.activeHazard.resolved) {
          const reactionTimeMs = Math.round(this.activeHazard.elapsed * 1000);
          this.activeHazard.resolved = true;
          this.activeHazard.reactionTimeMs = reactionTimeMs;
          this.reactionTimes.push(reactionTimeMs);
          this.hazardsDetected += 1;

          this.showReactionFeedback(reactionTimeMs);
          this.hazardHistory.push({
            type: this.activeHazard.title,
            reactionMs: reactionTimeMs,
            success: true,
            timestamp: new Date().toLocaleTimeString('fa-IR')
          });
        }

        // Hazard timeout after 2.8 seconds
        if (this.activeHazard.elapsed > 2.8) {
          if (!this.activeHazard.resolved) {
            this.activeHazard.resolved = true;
            this.recordViolation(`تأخیر در واکنش به ${this.activeHazard.title}`);
            this.hazardHistory.push({
              type: this.activeHazard.title,
              reactionMs: '> 2500ms',
              success: false,
              timestamp: new Date().toLocaleTimeString('fa-IR')
            });
            this.showHazardAlert(`❌ تأخیر در واکنش! خطر مدیریت نشد.`);
          }

          // Reset brake status on target vehicle
          if (this.activeHazard.vehicle) {
            this.activeHazard.vehicle.isBraking = false;
          }
          this.activeHazard = null;
        }
        return;
      }

      // Check if time to trigger a new hazard
      this.hazardTimer += delta;
      if (this.hazardTimer > this.hazardInterval) {
        this.hazardTimer = 0;
        this.triggerRandomHazard(player, vehicles);
      }
    }

    triggerRandomHazard(player, vehicles) {
      if (!vehicles || vehicles.length === 0) return;

      // Filter suitable vehicles ahead of player
      const aheadVehicles = vehicles.filter(v => !v.isOncoming && (player.y - v.y) > 120 && (player.y - v.y) < 420);
      if (aheadVehicles.length === 0) return;

      const target = aheadVehicles[Math.floor(Math.random() * aheadVehicles.length)];
      const hazardTypes = ['sudden_brake', 'cut_in'];
      const chosen = hazardTypes[Math.floor(Math.random() * hazardTypes.length)];

      if (chosen === 'sudden_brake') {
        target.isBraking = true;
        target.speed = Math.max(20, target.speed * 0.38);
        this.activeHazard = {
          type: 'sudden_brake',
          title: 'ترمز ناگهانی خودروی جلویی',
          vehicle: target,
          elapsed: 0,
          resolved: false
        };
        this.hazardsTotal += 1;
        this.showHazardAlert('⚠️ هشدار خطر: ترمز ناگهانی خودروی جلو! عکس‌العمل نشان دهید!');
      } else if (chosen === 'cut_in') {
        target.isChangingLane = true;
        target.laneChangeDir = (target.lane || 1) > 1 ? -1 : 1;
        this.activeHazard = {
          type: 'cut_in',
          title: 'انحراف ناگهانی بدون راهنما',
          vehicle: target,
          elapsed: 0,
          resolved: false
        };
        this.hazardsTotal += 1;
        this.showHazardAlert('⚠️ هشدار خطر: انحراف ناگهانی خودروی مجاور! فاصله را حفظ کنید!');
      }
    }

    recordViolation(reason) {
      this.violations.push({
        reason,
        time: new Date().toLocaleTimeString('fa-IR')
      });
      // Cap at 20
      if (this.violations.length > 20) this.violations.shift();
    }

    showHazardAlert(msg) {
      const banner = document.getElementById('serious-hazard-banner');
      if (banner) {
        banner.textContent = msg;
        banner.style.display = 'block';
        clearTimeout(this._hazardBannerTimeout);
        this._hazardBannerTimeout = setTimeout(() => {
          banner.style.display = 'none';
        }, 2400);
      }
    }

    showReactionFeedback(ms) {
      let rating = 'خوب';
      let color = '#00ff88';
      if (ms < 350) { rating = 'فوق‌العاده سریع'; color = '#00e5ff'; }
      else if (ms > 600) { rating = 'کند'; color = '#ffaa00'; }

      this.showHazardAlert(`✅ عکس‌العمل ثبت شد: ${ms} میلی‌ثانیه [${rating}]`);

      const lastMsEl = document.getElementById('hud-last-reaction-ms');
      if (lastMsEl) {
        lastMsEl.textContent = `${ms} ms`;
        lastMsEl.style.color = color;
      }
    }

    renderRoadOverlay(ctx, player) {
      if (!this.enabled || !this.nearestAheadVehicle || !player) return;
      if (this.game && this.game.lowSpecMode) return; // Skip in high-fps low-spec mode

      const v = this.nearestAheadVehicle;
      const weather = this.game ? this.game.weather : 'night';
      const safeThreshold = SimUtils.computeSafeDistanceThreshold(player.speed, weather);
      const dy = player.y - v.y;

      if (dy > 40 && dy < safeThreshold.safeDistancePx * 1.4) {
        const isDangerous = dy < safeThreshold.safeDistancePx * 0.65;
        const color = isDangerous ? '#ff0055' : (dy < safeThreshold.safeDistancePx ? '#ffbb00' : '#00ff88');

        // Draw crisp hardware-accelerated boundary brackets (zero font allocations!)
        const boxW = v.width + 24;
        const topY = v.y + v.length * 0.5 + 4;
        const bracketH = Math.min(dy - 12, safeThreshold.safeDistancePx);
        const leftX = v.x - boxW * 0.5;

        ctx.fillStyle = isDangerous ? 'rgba(255, 0, 85, 0.14)' : 'rgba(0, 255, 136, 0.08)';
        ctx.fillRect(leftX, topY, boxW, bracketH);

        ctx.fillStyle = color;
        // Corner markers
        ctx.fillRect(leftX, topY, 8, 2);
        ctx.fillRect(leftX, topY, 2, 8);
        ctx.fillRect(leftX + boxW - 8, topY, 8, 2);
        ctx.fillRect(leftX + boxW - 2, topY, 2, 8);

        ctx.fillRect(leftX, topY + bracketH - 2, 8, 2);
        ctx.fillRect(leftX, topY + bracketH - 8, 2, 8);
        ctx.fillRect(leftX + boxW - 8, topY + bracketH - 2, 8, 2);
        ctx.fillRect(leftX + boxW - 2, topY + bracketH - 8, 2, 8);
      }
    }

    compileFinalReport() {
      const totalSec = Math.max(1, this.totalDrivingTimer);
      const adherencePct = Math.round((this.safeDistanceAdherenceTimer / totalSec) * 100);
      const ecoAvg = this.ecoTicks > 0 ? Math.round(this.ecoSum / this.ecoTicks) : 80;

      const evalData = SimUtils.evaluateDriverSafetyGrade({
        reactionTimes: this.reactionTimes,
        safeDistanceAdherencePct: adherencePct,
        ecoScoreAvg: ecoAvg,
        hazardsDetected: this.hazardsDetected,
        hazardsTotal: this.hazardsTotal,
        violationsCount: this.violations.length
      });

      const weather = this.game ? this.game.weather : 'night';
      const physicsStopping = SimUtils.computeStoppingDistance(this.game?.player?.speed || 95, weather, (evalData.avgReactionMs / 1000));

      return {
        ...evalData,
        weather,
        physicsStopping,
        totalDrivingDurationSec: Math.round(totalSec),
        distanceKm: ((this.game?.distance || 0) / 1000).toFixed(2),
        violations: this.violations,
        hazardHistory: this.hazardHistory,
        studentName: this.studentName,
        date: new Date().toLocaleDateString('fa-IR')
      };
    }
  }

  return SeriousDrivingManager;
});
