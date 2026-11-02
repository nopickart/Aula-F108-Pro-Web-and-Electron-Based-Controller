import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KEY_TRACK_MAP,
  getKeyTracks,
  sampleTrackDrop,
  calculateMatrixRainKeyColor,
  TOTAL_TRACKS,
} from './matrix-rain';
import { ALL_KEYS } from './aula-constants';
import { LightingConfig } from '../types/aula';

test('every key in ALL_KEYS is mapped to a valid column track (0 to 20)', () => {
  assert.equal(ALL_KEYS.length, 104);

  for (const key of ALL_KEYS) {
    const tracks = getKeyTracks(key);
    assert.ok(tracks.length > 0, `Key ${key.code} should have at least one track`);
    for (const trk of tracks) {
      assert.ok(trk >= 0 && trk < TOTAL_TRACKS, `Key ${key.code} track ${trk} is within range 0..${TOTAL_TRACKS - 1}`);
    }
  }
});

test('keys in standard vertical columns share the same track', () => {
  // Track 0: Esc stack
  assert.equal(KEY_TRACK_MAP['esc'], 0);
  assert.equal(KEY_TRACK_MAP['grave'], 0);
  assert.equal(KEY_TRACK_MAP['tab'], 0);
  assert.equal(KEY_TRACK_MAP['capslock'], 0);
  assert.equal(KEY_TRACK_MAP['lshift'], 0);
  assert.equal(KEY_TRACK_MAP['lctrl'], 0);

  // Track 2: F1, 2, W, S, X, LAlt
  assert.equal(KEY_TRACK_MAP['f1'], 2);
  assert.equal(KEY_TRACK_MAP['2'], 2);
  assert.equal(KEY_TRACK_MAP['w'], 2);
  assert.equal(KEY_TRACK_MAP['s'], 2);
  assert.equal(KEY_TRACK_MAP['x'], 2);
  assert.equal(KEY_TRACK_MAP['lalt'], 2);
});

test('spacebar spans multiple central columns', () => {
  const spaceKey = ALL_KEYS.find((k) => k.code === 'space');
  assert.ok(spaceKey);
  const tracks = getKeyTracks(spaceKey);
  assert.deepEqual(tracks, [3, 4, 5, 6, 7, 8, 9]);
});

test('in non-RGB mode, tracks strictly follow the user selected color', () => {
  // Test Green (0, 255, 0) -> Hue 120
  const sampleTrack0Green = sampleTrackDrop(0, 0, 1.0, 1.0, false, 0, 255, 0);
  const sampleTrack1Green = sampleTrackDrop(1, 0, 1.0, 1.0, false, 0, 255, 0);
  assert.equal(sampleTrack0Green.hue, 120);
  assert.equal(sampleTrack1Green.hue, 120);

  // Test Red (255, 0, 0) -> Hue 0
  const sampleTrack0Red = sampleTrackDrop(0, 0, 1.0, 1.0, false, 255, 0, 0);
  const sampleTrack5Red = sampleTrackDrop(5, 0, 1.0, 1.0, false, 255, 0, 0);
  assert.equal(sampleTrack0Red.hue, 0);
  assert.equal(sampleTrack5Red.hue, 0);

  // Test Cyan (6, 182, 212) -> Hue 189
  const sampleTrack0Cyan = sampleTrackDrop(0, 0, 1.0, 1.0, false, 6, 182, 212);
  const sampleTrack10Cyan = sampleTrackDrop(10, 0, 1.0, 1.0, false, 6, 182, 212);
  assert.equal(sampleTrack0Cyan.hue, 189);
  assert.equal(sampleTrack10Cyan.hue, 189);
});

test('in RGB mode (colorful: true), tracks have distinct cyberpunk column hues', () => {
  const sampleTrack0 = sampleTrackDrop(0, 0, 0.1, 1.0, true, 0, 255, 0);
  const sampleTrack1 = sampleTrackDrop(1, 0, 0.1, 1.0, true, 0, 255, 0);
  const sampleTrack3 = sampleTrackDrop(3, 0, 0.1, 1.0, true, 0, 255, 0);

  // Distinct hues across different columns in RGB mode
  assert.notEqual(sampleTrack0.hue, sampleTrack1.hue);
  assert.notEqual(sampleTrack1.hue, sampleTrack3.hue);
});

test('calculateMatrixRainKeyColor produces valid CSS HSL colors for all keys', () => {
  const config: LightingConfig = {
    mode: 5,
    r: 0,
    g: 255,
    b: 0,
    brightness: 5,
    speed: 3,
    direction: 0,
    colorful: false,
  };

  for (const key of ALL_KEYS) {
    const color = calculateMatrixRainKeyColor(key, 2.5, config);
    assert.match(color, /^hsl\(\d+,\s*\d+%,\s*\d+%\)$/, `Key ${key.code} color must be valid HSL format`);
    assert.doesNotMatch(color, /NaN/, `Color for ${key.code} must not contain NaN`);
  }
});

test('speed parameter alters drop positions over time', () => {
  const configSlow: LightingConfig = {
    mode: 5,
    r: 0,
    g: 255,
    b: 0,
    brightness: 5,
    speed: 1,
    direction: 0,
    colorful: false,
  };

  const configFast: LightingConfig = {
    ...configSlow,
    speed: 5,
  };

  const key = ALL_KEYS.find((k) => k.code === 'w')!;
  // Over a small time window, fast and slow configurations produce different intensities or states
  const colorsSlow = [0, 0.5, 1.0, 1.5].map((t) => calculateMatrixRainKeyColor(key, t, configSlow));
  const colorsFast = [0, 0.5, 1.0, 1.5].map((t) => calculateMatrixRainKeyColor(key, t, configFast));

  // The fast sequence changes more rapidly than the slow sequence
  assert.notDeepEqual(colorsSlow, colorsFast);
});

test('brightness 0 turns backlight completely dark', () => {
  const configOff: LightingConfig = {
    mode: 5,
    r: 0,
    g: 255,
    b: 0,
    brightness: 0,
    speed: 3,
    direction: 0,
    colorful: false,
  };

  const key = ALL_KEYS[0];
  const color = calculateMatrixRainKeyColor(key, 1.0, configOff);
  assert.equal(color, 'rgb(15, 23, 42)');
});

test('in RGB mode leader drop head colors are randomized across vibrant hues', () => {
  const headColors: { hue: number; lightness: number }[] = [];
  for (let trk = 0; trk < 5; trk++) {
    for (let cycle = 0; cycle < 10; cycle++) {
      const sample = sampleTrackDrop(trk, 0, cycle * 2.5, 1.0, true, 0, 255, 0);
      headColors.push({
        hue: sample.headHue,
        lightness: sample.headLightness,
      });
    }
  }

  // Ensure there are multiple distinct head hues in RGB mode
  const uniqueHues = new Set(headColors.map((h) => h.hue));
  assert.ok(uniqueHues.size >= 5, `Expected at least 5 different head hues in RGB mode, found ${uniqueHues.size}`);
});

test('in non-RGB mode leader drop heads stay in selected color family with dynamic brightness', () => {
  // Test Green (0, 255, 0) -> Hue 120
  const headColors: { hue: number; lightness: number }[] = [];
  for (let trk = 0; trk < 5; trk++) {
    for (let cycle = 0; cycle < 10; cycle++) {
      const sample = sampleTrackDrop(trk, 0, cycle * 2.5, 1.0, false, 0, 255, 0);
      headColors.push({
        hue: sample.headHue,
        lightness: sample.headLightness,
      });
      // All heads must be in the green hue (120)
      assert.equal(sample.headHue, 120, `Head hue ${sample.headHue} must match user selected green (120)`);
    }
  }

  // Lightness varies dynamically (flashes vs deep neon)
  const uniqueLightnesses = new Set(headColors.map((h) => h.lightness));
  assert.ok(uniqueLightnesses.size >= 2, 'Drop heads should have varying brightness levels');
});


