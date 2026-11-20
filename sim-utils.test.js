const test = require('node:test');
const assert = require('node:assert/strict');
const {
  clampDelta,
  toFrameScale,
  computeTelemetry,
  computeHeatLevel,
  checkBoxOverlap,
  isNearMiss,
  findAlphaBounds
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
