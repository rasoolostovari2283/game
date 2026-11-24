const test = require('node:test');
const assert = require('node:assert/strict');
const {
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
} = require('./js/sim-utils.js');

test('clampDelta caps large frame spikes and guards invalid inputs', () => {
  assert.equal(clampDelta(0.016), 0.016);
  assert.equal(clampDelta(0.25), 0.05);
  assert.equal(clampDelta(-1), 0);
  assert.equal(clampDelta(NaN), 0);
  assert.equal(Math.round(toFrameScale(1 / 60) * 100) / 100, 1);
  assert.equal(Math.round(toFrameScale(1 / 120) * 100) / 100, 0.5);
});

test('computeTelemetry scales gear, RPM, turbo, and lateral G consistently', () => {
  const cruise = computeTelemetry(90, false, false, 0);
  assert.equal(cruise.gear, 3);
  assert.equal(cruise.turboBar, 0.4);
  assert.equal(cruise.lateralG, 0);

  const nitro = computeTelemetry(245, true, true, 380);
  assert.equal(nitro.gear, 7);
  assert.equal(nitro.turboBar, 2.2);
  assert.equal(nitro.lateralG, 0.85);
  assert.ok(nitro.rpm > cruise.rpm);
});

test('computeHeatLevel ramps up and caps at 5 stars', () => {
  assert.equal(computeHeatLevel(0, 80, 0), 0);
  assert.equal(computeHeatLevel(1, 150, 1), 2);
  assert.equal(computeHeatLevel(3, 210, 5), 5);
});

test('checkBoxOverlap and isNearMiss detect collisions and close passes accurately', () => {
  const a = { left: 10, right: 50, top: 100, bottom: 180 };
  const b = { left: 40, right: 80, top: 120, bottom: 200 };
  const c = { left: 60, right: 100, top: 120, bottom: 200 };
  assert.equal(checkBoxOverlap(a, b), true);
  assert.equal(checkBoxOverlap(a, c), false);

  const player = { x: 100, y: 200, speed: 120 };
  const closeCar = { x: 155, y: 205, width: 44, length: 82 };
  const farCar = { x: 220, y: 205, width: 44, length: 82 };
  assert.equal(isNearMiss(player, closeCar, 44, 84, 22), true);
  assert.equal(isNearMiss(player, farCar, 44, 84, 22), false);
});

test('findAlphaBounds tightly crops non-transparent car silhouette', () => {
  const w = 10;
  const h = 10;
  const data = new Uint8ClampedArray(w * h * 4);
  const setPixel = (x, y, a) => {
    const idx = (y * w + x) * 4;
    data[idx] = 255;
    data[idx + 1] = 255;
    data[idx + 2] = 255;
    data[idx + 3] = a;
  };
  setPixel(3, 2, 255);
  setPixel(6, 8, 255);

  const bounds = findAlphaBounds(data, w, h, 20);
  assert.deepEqual(bounds, { x: 3, y: 2, width: 4, height: 7, empty: false });
});

test('computeStoppingDistance reflects physics reaction and wet road friction', () => {
  const dry100 = computeStoppingDistance(100, 'night', 0.8);
  assert.equal(dry100.speedMs, 27.8);
  assert.equal(dry100.frictionCoeff, 0.80);
  assert.ok(dry100.totalStoppingDistanceM > 60 && dry100.totalStoppingDistanceM < 85);

  const wet100 = computeStoppingDistance(100, 'rain', 0.8);
  assert.equal(wet100.frictionCoeff, 0.42);
  assert.ok(wet100.totalStoppingDistanceM > dry100.totalStoppingDistanceM * 1.3);
});

test('computeSafeDistanceThreshold enforces 2-second and 3.6-second rain rules', () => {
  const drySafe = computeSafeDistanceThreshold(108, 'night');
  assert.equal(drySafe.timeGapSec, 2.0);
  assert.equal(drySafe.safeDistanceM, 60.0);
  assert.ok(drySafe.safeDistancePx >= 190);

  const rainSafe = computeSafeDistanceThreshold(108, 'rain');
  assert.equal(rainSafe.timeGapSec, 3.6);
  assert.equal(rainSafe.safeDistanceM, 108.0);
  assert.ok(rainSafe.safeDistancePx > drySafe.safeDistancePx);
});

test('computeEcoTelemetry rewards cruising and penalizes harsh nitro/revs', () => {
  const cruise = computeEcoTelemetry(90, 2400, false, false, false);
  assert.ok(cruise.ecoScore >= 90);
  assert.ok(cruise.fuelRateL100 < 6.0);

  const aggressive = computeEcoTelemetry(40, 6200, true, false, false);
  assert.ok(aggressive.ecoScore <= 45);

  const nitro = computeEcoTelemetry(220, 7500, true, false, true);
  assert.equal(nitro.ecoScore, 15);
  assert.ok(nitro.fuelRateL100 > 20);
});

test('evaluateDriverSafetyGrade calculates comprehensive academic score and rating', () => {
  const excellent = evaluateDriverSafetyGrade({
    reactionTimes: [280, 310, 290],
    safeDistanceAdherencePct: 95,
    ecoScoreAvg: 88,
    hazardsDetected: 4,
    hazardsTotal: 4,
    violationsCount: 0
  });
  assert.ok(excellent.safetyScore >= 90);
  assert.equal(excellent.gradeLetter, 'A+');

  const flawed = evaluateDriverSafetyGrade({
    reactionTimes: [680, 750],
    safeDistanceAdherencePct: 40,
    ecoScoreAvg: 45,
    hazardsDetected: 1,
    hazardsTotal: 3,
    violationsCount: 5
  });
  assert.ok(flawed.safetyScore < 60);
});
