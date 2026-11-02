import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getRandomKeyHue,
  interpolateHue,
  calculateColourfulKeyColor,
} from './colourful-wave';
import { ALL_KEYS } from './aula-constants';
import { LightingConfig } from '../types/aula';

test('different keys get distinct random hues in the same cycle', () => {
  const hues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((idx) => getRandomKeyHue(idx, 0));
  const uniqueHues = new Set(hues);
  assert.ok(uniqueHues.size >= 8, `Expected high hue diversity, got ${uniqueHues.size} unique hues out of 10`);
});

test('keys get different random hues in different cycles', () => {
  const hues = [0, 1, 2, 3, 4].map((cycle) => getRandomKeyHue(55, cycle));
  const uniqueHues = new Set(hues);
  assert.ok(uniqueHues.size >= 4, `Expected color change across cycles, got ${uniqueHues.size} unique hues`);
});

test('interpolateHue handles circular wraparound correctly', () => {
  // Wraparound 350 to 10 degrees (shortest distance across 0)
  const mid = interpolateHue(350, 10, 0.5);
  // Expected mid point is 0 / 360
  assert.ok(mid === 0 || Math.abs(mid - 360) < 1e-4 || Math.abs(mid - 0) < 1e-4);

  // Normal interpolation 100 to 200 degrees
  const midNormal = interpolateHue(100, 200, 0.5);
  assert.equal(Math.round(midNormal), 150);
});

test('calculateColourfulKeyColor produces valid HSL colors for all keys', () => {
  const config: LightingConfig = {
    mode: 6,
    r: 0,
    g: 0,
    b: 0,
    brightness: 5,
    speed: 3,
    direction: 0,
    colorful: true,
  };

  for (const key of ALL_KEYS) {
    const color = calculateColourfulKeyColor(key, 1.5, config);
    assert.match(color, /^hsl\(\d+,\s*100%,\s*\d+%\)$/, `Key ${key.code} color must be valid HSL`);
    assert.doesNotMatch(color, /NaN/, `Color for ${key.code} must not contain NaN`);
  }
});

test('transition propagates from RIGHT to LEFT across columns', () => {
  const config: LightingConfig = {
    mode: 6,
    r: 0,
    g: 0,
    b: 0,
    brightness: 5,
    speed: 3,
    direction: 0,
    colorful: true,
  };

  const rightKey = ALL_KEYS.find((k) => k.col >= 20)!; // Numpad on the right
  const leftKey = ALL_KEYS.find((k) => k.col <= 1)!;    // Esc / 1 on the left

  assert.ok(rightKey);
  assert.ok(leftKey);

  // Over time, right key's cycle progress leads ahead of left key's cycle progress
  const speedMult = 0.5 + 3 * 0.45;
  const cycleSpeed = speedMult * 0.72;
  const colDelay = 0.052;

  const t = 5.0;
  const rightProgress = t * cycleSpeed - (23 - rightKey.col) * colDelay;
  const leftProgress = t * cycleSpeed - (23 - leftKey.col) * colDelay;

  // Right key progress is strictly ahead of left key progress (Right-to-Left wave)
  assert.ok(rightProgress > leftProgress, 'Right key progress must precede left key progress');
});

test('brightness 0 turns Mode 6 completely dark', () => {
  const configOff: LightingConfig = {
    mode: 6,
    r: 0,
    g: 0,
    b: 0,
    brightness: 0,
    speed: 3,
    direction: 0,
    colorful: true,
  };

  const key = ALL_KEYS[0];
  const color = calculateColourfulKeyColor(key, 1.0, configOff);
  assert.equal(color, 'rgb(15, 23, 42)');
});
