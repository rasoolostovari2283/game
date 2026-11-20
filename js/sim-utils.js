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

  return {
    clampDelta,
    toFrameScale,
    computeTelemetry,
    computeHeatLevel,
    checkBoxOverlap,
    isNearMiss,
    findAlphaBounds
  };
});
