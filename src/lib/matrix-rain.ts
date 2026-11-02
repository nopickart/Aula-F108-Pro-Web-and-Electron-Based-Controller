import { KeyDef, LightingConfig } from '../types/aula';

// Helper for safe positive modulo
export function safeMod(val: number, m: number): number {
  return ((val % m) + m) % m;
}

// Physical column tracks across the 108-key Aula F108 Pro keyboard
export const KEY_TRACK_MAP: Record<string, number> = {
  // Track 0: Far-left modifier stack
  esc: 0,
  grave: 0,
  tab: 0,
  capslock: 0,
  lshift: 0,
  lctrl: 0,

  // Track 1: Left pinky column
  '1': 1,
  q: 1,
  a: 1,
  z: 1,
  lwin: 1,

  // Track 2: Left ring finger column
  f1: 2,
  '2': 2,
  w: 2,
  s: 2,
  x: 2,
  lalt: 2,

  // Track 3: Left middle finger column
  f2: 3,
  '3': 3,
  e: 3,
  d: 3,
  c: 3,

  // Track 4: Left index primary
  f3: 4,
  '4': 4,
  r: 4,
  f: 4,
  v: 4,

  // Track 5: Left index reach
  f4: 5,
  '5': 5,
  t: 5,
  g: 5,
  b: 5,

  // Track 6: Right index reach
  f5: 6,
  '6': 6,
  y: 6,
  h: 6,
  n: 6,

  // Track 7: Right index primary
  f6: 7,
  '7': 7,
  u: 7,
  j: 7,
  m: 7,

  // Track 8: Right middle finger
  f7: 8,
  '8': 8,
  i: 8,
  k: 8,
  comma: 8,

  // Track 9: Right ring finger
  f8: 9,
  '9': 9,
  o: 9,
  l: 9,
  dot: 9,
  ralt: 9,

  // Track 10: Right pinky primary
  f9: 10,
  '0': 10,
  p: 10,
  semicolon: 10,
  slash: 10,
  fn: 10,

  // Track 11: Right reach / punctuation
  f10: 11,
  minus: 11,
  lbracket: 11,
  quote: 11,
  menu: 11,

  // Track 12: Enter / Right edge of main block
  f11: 12,
  equal: 12,
  rbracket: 12,
  enter: 12,
  rshift: 12,
  rctrl: 12,

  // Track 13: Backspace & Backslash
  f12: 13,
  backspace: 13,
  backslash: 13,

  // Track 14: Navigation column 1 (PrtSc, Ins, Del, Left)
  printscreen: 14,
  insert: 14,
  delete: 14,
  left: 14,

  // Track 15: Navigation column 2 (ScrLk, Home, End, Up, Down)
  scrolllock: 15,
  home: 15,
  end: 15,
  up: 15,
  down: 15,

  // Track 16: Navigation column 3 (Pause, PgUp, PgDn, Right)
  pause: 16,
  pageup: 16,
  pagedown: 16,
  right: 16,

  // Track 17: Numpad col 1
  numlock: 17,
  num7: 17,
  num4: 17,
  num1: 17,
  num0: 17,

  // Track 18: Numpad col 2
  numslash: 18,
  num8: 18,
  num5: 18,
  num2: 18,

  // Track 19: Numpad col 3
  numstar: 19,
  num9: 19,
  num6: 19,
  num3: 19,
  numdot: 19,

  // Track 20: Numpad col 4 (Minus, Plus, Enter)
  numminus: 20,
  numplus: 20,
  numenter: 20,
};

export const TOTAL_TRACKS = 21;

// Curated cyberpunk & matrix hues for each column track
export const TRACK_HUES: number[] = [
  135, // 0: Classic Matrix Neon Green (Esc stack)
  182, // 1: Cyber Cyan (1-Q-A-Z)
  148, // 2: Emerald Green (F1-2-W-S-X)
  280, // 3: Cyber Violet / Purple (F2-3-E-D-C)
  205, // 4: Neon Azure Blue (F3-4-R-F-V)
  120, // 5: Matrix Acid Lime (F4-5-T-G-B)
  320, // 6: Cyber Magenta / Neon Pink (F5-6-Y-H-N)
  165, // 7: Deep Aqua / Teal (F6-7-U-J-M)
  45,  // 8: Neon Amber / Cyber Gold (F7-8-I-K-comma)
  140, // 9: Spring Jade Green (F8-9-O-L-dot)
  260, // 10: Deep Royal Purple (F9-0-P-;)
  195, // 11: Electric Sky Blue (F10-[-')
  95,  // 12: Electric Lime Chartreuse (F11-Enter-RShift)
  335, // 13: Neon Rose (F12-Backspace)
  160, // 14: Mint Green (PrtSc-Ins-Del-Left)
  275, // 15: Neon Orchid (ScrLk-Home-End-Up-Down)
  125, // 16: Toxic Matrix Green (Pause-PgUp-PgDn-Right)
  218, // 17: Deep Ice Blue (Numpad 1)
  50,  // 18: Radiant Cyber Gold (Numpad 2)
  175, // 19: Turquoise (Numpad 3)
  145, // 20: Bright Emerald (Numpad 4)
];

// Curated vibrant neon palette for random leader drop (head) colors in RGB mode
export const RANDOM_HEAD_HUES: number[] = [
  135, // Neon Matrix Green
  185, // Electric Cyan
  315, // Hot Magenta / Cyber Pink
  280, // Ultra Violet
  45,  // Radiant Amber Gold
  205, // Electric Blue
  25,  // Flaming Orange
  95,  // Acid Lime
  155, // Vivid Emerald
  345, // Neon Rose
  165, // Bright Aqua / Mint
  225, // Royal Ice Blue
];

/**
 * Converts RGB (0-255) to HSL [hue (0-360), saturation (0-100), lightness (0-100)]
 */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / d + 4;
        break;
    }
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

/**
 * Returns deterministic pseudo-random leader drop (head) properties for a given drop cycle.
 * - In RGB mode: randomizes across curated vibrant neon colors and white flares.
 * - In Non-RGB mode (RGB tiki kapalı): strictly adheres to the user's selected color,
 *   randomizing drop head intensity between radiant neon bursts and incandescent highlights.
 */
export function getDropHeadProperties(
  trk: number,
  cycle: number,
  defaultTrackHue: number,
  isColorful: boolean = true,
  baseSat: number = 100
): { headHue: number; headSat: number; headLightness: number; isWhite: boolean } {
  // Deterministic pseudo-random hash unique to this drop in this column track
  const hash = Math.abs(Math.sin(trk * 73.15 + cycle * 127.89 + 17.42) * 43758.5453);
  const rnd = hash % 1.0;

  if (isColorful) {
    // RGB Mode: ~15% chance of white-hot diamond flare, 85% randomized vibrant neon colors
    const isWhite = rnd < 0.15;
    if (isWhite) {
      return {
        headHue: defaultTrackHue,
        headSat: 100,
        headLightness: 96,
        isWhite: true,
      };
    }

    const hueIdx = Math.floor(hash * 13) % RANDOM_HEAD_HUES.length;
    const headHue = RANDOM_HEAD_HUES[hueIdx];
    const headLightness = 66 + Math.round((hash * 100) % 11);

    return {
      headHue,
      headSat: 100,
      headLightness,
      isWhite: false,
    };
  }

  // Non-RGB Mode (Tek Renk): Strictly within the user-selected color family!
  // Randomize between an incandescent white-hot flash (~25%) and a super-bright neon punch (~75%) of the selected color
  const isFlash = rnd < 0.25;
  if (isFlash) {
    return {
      headHue: defaultTrackHue,
      headSat: Math.round(baseSat * 0.25), // Tinted bright highlight
      headLightness: 96,
      isWhite: true,
    };
  }

  // Intense vivid head punch strictly in the selected color
  const headLightness = 72 + Math.round((hash * 100) % 14); // 72% to 85% lightness
  return {
    headHue: defaultTrackHue,
    headSat: baseSat,
    headLightness,
    isWhite: false,
  };
}

/**
 * Returns the track indices associated with a key.
 * Wide keys like the spacebar span multiple column tracks.
 */
export function getKeyTracks(key: KeyDef): number[] {
  if (key.code === 'space') {
    return [3, 4, 5, 6, 7, 8, 9];
  }
  const mapped = KEY_TRACK_MAP[key.code];
  if (mapped !== undefined) {
    return [mapped];
  }
  return [Math.max(0, Math.min(TOTAL_TRACKS - 1, Math.round(key.col)))];
}

export interface DropSampleResult {
  intensity: number;
  isHead: boolean;
  hue: number;
  sat: number;
  headHue: number;
  headSat: number;
  headLightness: number;
}

/**
 * Evaluates the matrix rain drop status for a specific track at a given key row and time.
 * - In RGB mode: tracks follow multi-colored cyberpunk hues gliding over time with randomized vibrant heads.
 * - In Non-RGB mode: tracks strictly follow the user's selected single color (baseR, baseG, baseB)
 *   with matching phosphor trails and energetic highlights of that same color!
 */
export function sampleTrackDrop(
  trk: number,
  row: number,
  t: number,
  speedMult: number,
  isColorful: boolean,
  baseR: number,
  baseG: number,
  baseB: number
): DropSampleResult {
  // Speed variations per column track so they fall at differing tempos
  const speedVariation = 0.85 + 0.35 * (((trk * 7 + 3) % 7) / 6); // ~0.85x to 1.20x
  const speed = speedMult * 3.2 * speedVariation; // ~2.7 to 3.8 rows per second

  // Asynchronous staggered start delays and non-uniform cycle heights
  const trackDelay = safeMod(trk * 3.618 + 1.234, 6.5);
  const cycleLength = 7.6 + ((trk * 11 + 5) % 5) * 0.7; // 7.6 to 10.4 rows
  const tailLength = 3.2; // Length of glowing code tail

  // Calculate stream head positions: primary drop and interleaved secondary drop
  const drop1Progress = t * speed + trackDelay;
  const drop2Progress = t * speed + trackDelay + cycleLength * 0.5;

  const drop1Y = safeMod(drop1Progress, cycleLength) - 1.8;
  const drop2Y = safeMod(drop2Progress, cycleLength) - 1.8;

  const cycle1 = Math.floor(drop1Progress / cycleLength);
  const cycle2 = Math.floor(drop2Progress / cycleLength);

  let trackHue: number;
  let trackSat: number;

  if (isColorful) {
    // Dynamic rainbow matrix: columns slowly glide across colors
    trackHue = TRACK_HUES[trk % TRACK_HUES.length];
    trackHue = safeMod(trackHue + t * speedMult * 18, 360);
    trackSat = 100;
  } else {
    // Single base color selected: strictly adhere to the chosen color!
    const [userHue, userSat] = rgbToHsl(baseR, baseG, baseB);
    trackHue = userHue;
    trackSat = userSat;
  }

  const head1Props = getDropHeadProperties(trk, cycle1, trackHue, isColorful, trackSat);
  const head2Props = getDropHeadProperties(trk, cycle2, trackHue, isColorful, trackSat);

  let bestIntensity = 0;
  let isHead = false;
  let chosenHeadHue = trackHue;
  let chosenHeadSat = trackSat;
  let chosenHeadLightness = 72;

  // Test both drops in the column and take the dominant influence
  const testDrops = [
    { y: drop1Y, headProps: head1Props },
    { y: drop2Y, headProps: head2Props },
  ];

  for (const { y: dropY, headProps } of testDrops) {
    const dy = dropY - row;
    if (dy >= 0 && dy < tailLength) {
      if (dy < 0.6) {
        // Leading droplet: active decoding glyph with vibrant color or energetic highlight!
        bestIntensity = Math.max(bestIntensity, 1.0);
        isHead = true;
        chosenHeadHue = headProps.headHue;
        chosenHeadSat = headProps.headSat;
        chosenHeadLightness = headProps.headLightness;
      } else {
        // Trailing code stream: smooth exponential fade with digital shimmer
        const trailFrac = (dy - 0.6) / (tailLength - 0.6);
        const baseFade = Math.pow(1 - trailFrac, 1.35);
        // Fast digital code shimmer (flickering decoding character effect)
        const shimmer = 0.88 + 0.12 * Math.sin(t * 26 + trk * 4.3 + row * 2.1);
        const curIntensity = baseFade * shimmer;
        if (curIntensity > bestIntensity) {
          bestIntensity = curIntensity;
          isHead = false;
        }
      }
    }
  }

  return {
    intensity: bestIntensity,
    isHead,
    hue: trackHue,
    sat: trackSat,
    headHue: chosenHeadHue,
    headSat: chosenHeadSat,
    headLightness: chosenHeadLightness,
  };
}

/**
 * Computes the final CSS color string for any key during Mode 5 (Matrix Rain).
 */
export function calculateMatrixRainKeyColor(
  key: KeyDef,
  t: number,
  config: LightingConfig
): string {
  const bLevel = config.brightness ?? 5;
  if (bLevel === 0) {
    return 'rgb(15, 23, 42)'; // Fully dark
  }

  const brightnessFactor = bLevel / 5;
  const speedVal = config.speed ?? 3;
  const speedMult = 0.5 + speedVal * 0.45; // 0.95x to 2.75x

  const baseR = config.r;
  const baseG = config.g;
  const baseB = config.b;
  const isColorful = config.colorful;

  const tracks = getKeyTracks(key);

  let bestIntensity = 0;
  let isHead = false;
  let activeHue = 135;
  let activeSat = 100;
  let activeHeadHue = 135;
  let activeHeadSat = 100;
  let activeHeadLightness = 72;

  // For multi-row keys (like numplus, numenter)
  const rowsToTest = (key.height || 1) === 2 ? [key.row, key.row + 1] : [key.row];

  for (const trk of tracks) {
    for (const r of rowsToTest) {
      const sample = sampleTrackDrop(trk, r, t, speedMult, isColorful, baseR, baseG, baseB);
      if (sample.intensity > bestIntensity) {
        bestIntensity = sample.intensity;
        isHead = sample.isHead;
        activeHue = sample.hue;
        activeSat = sample.sat;
        activeHeadHue = sample.headHue;
        activeHeadSat = sample.headSat;
        activeHeadLightness = sample.headLightness;
      }
    }
  }

  // 1. Leading Head: Vibrant head color (not always white; respects chosen color in single-color mode)
  if (isHead) {
    const finalLightness = Math.round(activeHeadLightness * (0.45 + 0.55 * brightnessFactor));
    return `hsl(${Math.round(activeHeadHue)}, ${activeHeadSat}%, ${finalLightness}%)`;
  }

  // 2. Trailing Phosphor Stream: Deep vibrant saturated cyber color with power fade
  if (bestIntensity > 0.05) {
    const lightness = Math.max(14, Math.round((16 + 54 * bestIntensity) * brightnessFactor));
    return `hsl(${Math.round(activeHue)}, ${activeSat}%, ${lightness}%)`;
  }

  // 3. Ambient Baseline: Deep space cyber dark with subtle atmospheric presence
  const ambientLightness = Math.max(5, Math.round(7 * brightnessFactor));
  const ambientSat = Math.min(activeSat, 70);
  return `hsl(${Math.round(activeHue)}, ${ambientSat}%, ${ambientLightness}%)`;
}
