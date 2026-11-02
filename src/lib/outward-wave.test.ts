import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getOutwardRingHue,
  interpolateCircularHue,
  calculateOutwardKeyColor,
} from './outward-wave';
import { ALL_KEYS } from './aula-constants';
import { LightingConfig } from '../types/aula';

test('getOutwardRingHue produces varied random hues across cycles', () => {
  const hues = [0, 1, 2, 3, 4, 5, 6].map((c) => getOutwardRingHue(c));
  const uniqueHues = new Set(hues);
  assert.ok(uniqueHues.size >= 4, `Expected distinct hues across wave cycles, got ${uniqueHues.size}`);
});

test('interpolateCircularHue correctly interpolates across 360 wrap', () => {
  const result = interpolateCircularHue(350, 10, 0.5);
  assert.ok(result === 0 || Math.abs(result - 360) < 1e-4 || Math.abs(result - 0) < 1e-4);
});

test('RGB mode has zero dimming (sönme olmasın) - keys stay illuminated at high lightness', () => {
  const configRgb: LightingConfig = {
    mode: 9,
    r: 0,
    g: 255,
    b: 255,
    brightness: 5,
    speed: 3,
    direction: 0,
    colorful: true,
  };

  // Sample across 20 distinct time steps and multiple keys
  for (let t = 0; t < 10; t += 0.5) {
    for (const key of ALL_KEYS) {
      const color = calculateOutwardKeyColor(key, t, configRgb);
      const match = color.match(/hsl\((\d+),\s*100%,\s*(\d+)%\)/);
      assert.ok(match, `Key ${key.code} at t=${t} must be valid HSL: ${color}`);
      const lightness = parseInt(match[2], 10);
      // Key must never dim or shut off ("sönme olmasın"): lightness stays >= 50%
      assert.ok(
        lightness >= 50,
        `Key ${key.code} at t=${t} dimmed too low (${lightness}% < 50%), violates "sönme olmasın"`
      );
    }
  }
});

test('single random color sweeps over the background when wave passes', () => {
  const configRgb: LightingConfig = {
    mode: 9,
    r: 0,
    g: 255,
    b: 255,
    brightness: 5,
    speed: 3,
    direction: 0,
    colorful: true,
  };

  // Center key (G at row 3, col 5.75) has distance near 5 from center (11, 2.5)
  const centerKey = ALL_KEYS.find((k) => k.code === 'g')!;
  assert.ok(centerKey);

  // Sample colors over time for this key - it should experience hue changes as the sweeping ring passes over it
  const colors = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0].map((t) =>
    calculateOutwardKeyColor(centerKey, t, configRgb)
  );

  const uniqueColors = new Set(colors);
  assert.ok(uniqueColors.size >= 4, 'Center key must transition hues as random color ring passes over it');
});

test('brightness 0 turns Mode 9 completely dark', () => {
  const configOff: LightingConfig = {
    mode: 9,
    r: 0,
    g: 255,
    b: 255,
    brightness: 0,
    speed: 3,
    direction: 0,
    colorful: true,
  };

  const key = ALL_KEYS[0];
  const color = calculateOutwardKeyColor(key, 1.0, configOff);
  assert.equal(color, 'rgb(15, 23, 42)');
});
