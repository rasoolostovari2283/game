// Pure simulation, telemetry, collision, and sprite-cropping helpers
// Compatible with both browser (window.SimUtils) and Node.js unit tests (module.exports)

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SimUtils = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function clampDelta(rawSeconds, maxDelta = 0.05) {
    if (!Number.isFinite(rawSeconds) || rawSeconds < 0) return 0;
    return Math.min(maxDelta, rawSeconds);
  }

  function toFrameScale(deltaSeconds) {
    return clampDelta(deltaSeconds) * 60;
  }

  function computeTelemetry(speedKmh, isAccelerating, isNitroActive, lateralVx) {
    const spd = Math.max(0, Number(speedKmh) || 0);
    let gear = 1;
    if (spd > 230) gear = 7;
    else if (spd > 185) gear = 6;
    else if (spd > 140) gear = 5;
    else if (spd > 95) gear = 4;
    else if (spd > 55) gear = 3;
    else if (spd > 25) gear = 2;

    const gearBase = [0, 0, 25, 55, 95, 140, 185, 230][gear] || 0;
    const gearMax = [0, 30, 60, 100, 145, 190, 235, 280][gear] || 100;
    const ratio = Math.max(0, Math.min(1, (spd - gearBase) / (gearMax - gearBase || 1)));
    const rpm = Math.round(
      2100 + gear * 260 + ratio * 4600 + (isAccelerating ? 450 : 0) + (isNitroActive ? 1400 : 0)
    );
    const rpmPct = Math.min(100, Math.round((rpm / 9000) * 100));

    const turboBar = isNitroActive
      ? 2.2
      : (isAccelerating ? Number((1.1 + (spd / 260) * 0.65).toFixed(1)) : 0.4);
    const turboPct = Math.min(100, Math.round((turboBar / 2.5) * 100));

    const lateralG = Number((((Number(lateralVx) || 0) / 380) * 0.85).toFixed(2));
    const lateralGPct = Math.min(100, Math.round(Math.abs(lateralG) * 110));

    return {
      gear,
      rpm,
      rpmPct,
      turboBar,
      turboPct,
      lateralG,
      lateralGPct
    };
  }

  function computeHeatLevel(baseHeat, speedKmh, nearMissCount) {
    let heat = Math.max(0, Math.floor(baseHeat || 0));
    if (speedKmh > 135) heat += 1;
    if (speedKmh > 185) heat += 1;
    if (nearMissCount >= 3) heat += 1;
    return Math.min(5, heat);
  }

  function checkBoxOverlap(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }

  function isNearMiss(player, vehicle, carWidth, carLength, threshold = 22) {
    if (!player || !vehicle || player.speed <= 75) return false;
    const pTop = player.y - carLength * 0.5 + 6;
    const pBottom = player.y + carLength * 0.5 - 6;
    const vTop = vehicle.y - vehicle.length * 0.5 + 5;
    const vBottom = vehicle.y + vehicle.length * 0.5 - 5;
    if (!(pTop < vBottom && pBottom > vTop)) return false;
    const lateralDist = Math.abs(player.x - vehicle.x) - (carWidth * 0.5 + vehicle.width * 0.5);
    return lateralDist >= 0 && lateralDist < threshold;
  }

  function findAlphaBounds(rgbaData, width, height, alphaThreshold = 20) {
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width * 4;
      for (let x = 0; x < width; x++) {
        if (rgbaData[rowOffset + x * 4 + 3] > alphaThreshold) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) {
      return { x: 0, y: 0, width, height, empty: true };
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      empty: false
    };
  }

  // -------------------------------------------------------------
  // SERIOUS GAME PHYSICS & TELEMETRY EVALUATION
  // -------------------------------------------------------------

  function computeStoppingDistance(speedKmh, weather = 'night', reactionTimeSec = 0.8) {
    const spd = Math.max(0, Number(speedKmh) || 0);
    const v = spd / 3.6; // m/s
    const mu = weather === 'rain' ? 0.42 : (weather === 'sunset' ? 0.78 : 0.80);
    const tr = Math.max(0.2, Number(reactionTimeSec) || 0.8);
    const dReaction = v * tr;
    const dBraking = (v * v) / (2 * mu * 9.81);
    const dTotal = dReaction + dBraking;

    return {
      speedKmh: spd,
      speedMs: Number(v.toFixed(1)),
      frictionCoeff: mu,
      reactionTimeSec: tr,
      reactionDistanceM: Number(dReaction.toFixed(1)),
      brakingDistanceM: Number(dBraking.toFixed(1)),
      totalStoppingDistanceM: Number(dTotal.toFixed(1))
    };
  }

  function computeSafeDistanceThreshold(speedKmh, weather = 'night') {
    const spd = Math.max(0, Number(speedKmh) || 0);
    const v = spd / 3.6;
    const timeGapSec = weather === 'rain' ? 3.6 : 2.0;
    const safeDistanceM = v * timeGapSec;
    // Conversion to canvas pixel units (approx 3.2px per meter)
    const safeDistancePx = Math.max(90, Math.round(safeDistanceM * 3.2));

    return {
      timeGapSec,
      safeDistanceM: Number(safeDistanceM.toFixed(1)),
      safeDistancePx
    };
  }

  function computeEcoTelemetry(speedKmh, rpm = 2500, isAccelerating = false, isBraking = false, isNitroActive = false) {
    const spd = Math.max(0, Number(speedKmh) || 0);
    if (isNitroActive) {
      return { ecoScore: 15, fuelRateL100: 24.5, co2Gkm: 390, status: 'تزریق حداکثری نیتروژن (مصرف بحرانی)' };
    }
    if (spd < 5) {
      return { ecoScore: 80, fuelRateL100: 1.2, co2Gkm: 25, status: 'درجا / توقف' };
    }

    let ecoScore = 85;
    let fuelRate = 6.2;
    let co2 = 145;

    if (isAccelerating) {
      if (rpm > 5500) {
        ecoScore = 35;
        fuelRate = 18.0;
        co2 = 310;
      } else if (rpm > 4000) {
        ecoScore = 55;
        fuelRate = 12.5;
        co2 = 230;
      } else {
        ecoScore = 75;
        fuelRate = 8.5;
        co2 = 175;
      }
    } else if (isBraking) {
      ecoScore = 70;
      fuelRate = 3.5;
      co2 = 75;
    } else {
      // Cruising
      if (spd >= 70 && spd <= 110 && rpm >= 2000 && rpm <= 3200) {
        ecoScore = 96;
        fuelRate = 5.1;
        co2 = 118;
      } else {
        ecoScore = 82;
        fuelRate = 7.0;
        co2 = 155;
      }
    }

    return {
      ecoScore: Math.max(10, Math.min(100, Math.round(ecoScore))),
      fuelRateL100: Number(fuelRate.toFixed(1)),
      co2Gkm: Math.round(co2),
      status: ecoScore >= 80 ? 'رانندگی بهینه و سبز' : (ecoScore >= 50 ? 'رانندگی استاندارد' : 'شتاب‌گیری پرمصرف')
    };
  }

  function evaluateDriverSafetyGrade(stats = {}) {
    const reactionTimes = Array.isArray(stats.reactionTimes) ? stats.reactionTimes : [];
    const avgReactionMs = reactionTimes.length > 0
      ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
      : 350;

    let reactionScore = 100;
    if (avgReactionMs > 750) reactionScore = 50;
    else if (avgReactionMs > 550) reactionScore = 68;
    else if (avgReactionMs > 400) reactionScore = 82;
    else if (avgReactionMs > 320) reactionScore = 92;

    const safeDistanceAdherence = Math.max(0, Math.min(100, Number(stats.safeDistanceAdherencePct) || 85));
    const ecoAvg = Math.max(0, Math.min(100, Number(stats.ecoScoreAvg) || 75));
    const hazardsTotal = Math.max(0, Number(stats.hazardsTotal) || 0);
    const hazardsDetected = Math.max(0, Number(stats.hazardsDetected) || 0);
    const hazardSuccessRate = hazardsTotal > 0 ? (hazardsDetected / hazardsTotal) * 100 : 90;
    const violations = Math.max(0, Number(stats.violationsCount) || 0);

    // Weighted Formula:
    // Reaction: 25%, Safe Distance: 30%, Hazard Perception: 25%, Eco: 20% - Penalties
    let composite = (reactionScore * 0.25) +
                    (safeDistanceAdherence * 0.30) +
                    (hazardSuccessRate * 0.25) +
                    (ecoAvg * 0.20) -
                    (violations * 4.5);

    composite = Math.max(10, Math.min(100, Math.round(composite)));

    let ratingTitle = 'راننده نیازمند تمرین و آموزش تدافعی';
    let ratingColor = '#ff3366';
    let gradeLetter = 'C';

    if (composite >= 90) {
      ratingTitle = 'راننده فوق‌حرفه‌ای و تدافعی (Master Defensive Driver)';
      ratingColor = '#00ff88';
      gradeLetter = 'A+';
    } else if (composite >= 78) {
      ratingTitle = 'راننده هوشیار و محتاط (Competent Driver)';
      ratingColor = '#00e5ff';
      gradeLetter = 'A';
    } else if (composite >= 65) {
      ratingTitle = 'راننده متوسط شهری (Average Driver)';
      ratingColor = '#ffcc00';
      gradeLetter = 'B';
    }

    return {
      safetyScore: composite,
      gradeLetter,
      ratingTitle,
      ratingColor,
      avgReactionMs,
      reactionScore,
      safeDistanceAdherence,
      ecoAvg,
      hazardSuccessRate: Math.round(hazardSuccessRate),
      hazardsTotal,
      hazardsDetected,
      violationsCount: violations
    };
  }

  return {
    clampDelta,
    toFrameScale,
    computeTelemetry,
    computeHeatLevel,
    checkBoxOverlap,
    isNearMiss,
    findAlphaBounds,
    computeStoppingDistance,
    computeSafeDistanceThreshold,
    computeEcoTelemetry,
    evaluateDriverSafetyGrade
  };
});
