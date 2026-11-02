import { KeyDef, LightingConfig } from '../types/aula';

/**
 * Returns a deterministic pseudo-random hue (0 to 359) for a specific key at a given wave cycle.
 * Ensures every individual key gets a distinct and independent random color.
 */
export function getRandomKeyHue(lightIndex: number, cycle: number): number {
  const hash = Math.abs(
    Math.sin(lightIndex * 37.919 + cycle * 127.31 + 43.17) * 43758.5453
  );
  // Spread evenly across 360 degrees of the color wheel
  return Math.round((hash * 360 + lightIndex * 29) % 360);
}

/**
 * Smoothly interpolates between two hues along the shortest circular path (0-360 degrees).
 */
export function interpolateHue(h1: number, h2: number, t: number): number {
  let diff = (h2 - h1) % 360;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return ((h1 + diff * t) % 360 + 360) % 360;
}

/**
 * Computes the dynamic color for Mode 6 (Renkli Ahenk / Colourful):
 * - Wave of color transitions travels smoothly from RIGHT to LEFT across the keyboard.
 * - Each individual key transitions to its own independent, randomized vibrant color.
 */
export function calculateColourfulKeyColor(
  key: KeyDef,
  t: number,
  config: LightingConfig
): string {
  const bLevel = config.brightness ?? 5;
  if (bLevel === 0) {
    return 'rgb(15, 23, 42)'; // Completely off
  }

  const brightnessFactor = bLevel / 5;
  const speedVal = config.speed ?? 3;
  const speedMult = 0.5 + speedVal * 0.45; // 0.95x to 2.75x

  // Right-to-left distance calculation:
  // Key columns span from 0 (Esc, Caps, Ctrl on the left) to ~22.5 (Numpad on the right).
  // Rightmost keys have travelDist near 0, leftmost keys have travelDist near 23.
  const isReverse = config.direction === 1;
  const travelDist = isReverse ? key.col : Math.max(0, 23 - key.col);

  // Slight subtle organic curvature so the wave ripples naturally across rows
  const rowOffset = (key.row - 2.5) * 0.35;
  const effectiveDist = travelDist + rowOffset;

  // Wave speed & column propagation delay
  const cycleSpeed = speedMult * 0.72; // ~1.4 cycles per second at normal speed
  const colDelay = 0.052; // Propagation delay per column unit (~1.2s to traverse full board)

  // Wave phase progression for this key
  const progress = t * cycleSpeed - effectiveDist * colDelay;

  // Cycle index and progress within the current transition cycle
  const currentCycle = Math.floor(progress);
  const frac = progress - currentCycle; // 0.0 to 1.0

  // Unique random hues for this key in current and next cycles
  const lightIdx = key.lightIndex || Math.round(key.col * 6 + key.row);
  const hue1 = getRandomKeyHue(lightIdx, currentCycle);
  const hue2 = getRandomKeyHue(lightIdx, currentCycle + 1);

  // Smooth Hermite / S-curve interpolation between hues
  const blend = 0.5 - 0.5 * Math.cos(frac * Math.PI);
  const currentHue = interpolateHue(hue1, hue2, blend);

  // Luminous crest pulse as the transition wave passes over this key from right to left
  const crestPulse = Math.sin(frac * Math.PI); // Peaks at 0.5 (midpoint of transition)
  const baseLightness = 50 + 18 * Math.pow(crestPulse, 1.5);
  const finalLightness = Math.round(baseLightness * brightnessFactor);

  return `hsl(${Math.round(currentHue)}, 100%, ${Math.max(6, finalLightness)}%)`;
}
