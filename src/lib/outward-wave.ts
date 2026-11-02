import { KeyDef, LightingConfig } from '../types/aula';

// Curated vibrant hues for the single random expanding ring
export const OUTWARD_RING_HUES: number[] = [
  185, // Electric Cyan
  315, // Hot Magenta / Cyber Pink
  125, // Neon Lime / Acid Green
  45,  // Radiant Amber Gold
  275, // Ultra Violet
  205, // Electric Azure Blue
  150, // Vivid Emerald Green
  25,  // Flaming Orange
  95,  // Bright Chartreuse
  340, // Neon Rose
  165, // Bright Aqua / Mint
  225, // Royal Ice Blue
];

/**
 * Returns a deterministic pseudo-random hue for a given expanding ring cycle.
 */
export function getOutwardRingHue(cycle: number): number {
  const hash = Math.abs(Math.sin(cycle * 137.29 + 47.13) * 43758.5453);
  const idx = Math.floor(hash * 13) % OUTWARD_RING_HUES.length;
  return OUTWARD_RING_HUES[idx];
}

/**
 * Smoothly interpolates between two hues along the shortest circular path (0-360 degrees).
 */
export function interpolateCircularHue(h1: number, h2: number, t: number): number {
  let diff = (h2 - h1) % 360;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return ((h1 + diff * t) % 360 + 360) % 360;
}

const CENTER_COL = 11;
const CENTER_ROW = 2.5;

/**
 * Computes the color for Mode 9 (Outward / Dışa Yayılma):
 * - 70% slower propagation speed.
 * - In RGB/Colorful mode: NO dimming/turning off (sönme olmasın).
 * - A single random color wave expands outward from the center and sweeps over the background RGB colors.
 */
export function calculateOutwardKeyColor(
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
  // 70% slower than original 4.5 speed coefficient: 4.5 * 0.30 = 1.35
  const speedMult = 0.5 + speedVal * 0.45;
  const waveSpeed = speedMult * 1.35;

  const dx = key.col - CENTER_COL;
  const dy = (key.row - CENTER_ROW) * 1.8;
  const dist = Math.hypot(dx, dy);

  // RGB / Colorful Mode:
  // "sönme olmasın, rastgele tek bir renk diğerlerinin üstünden geçsin"
  if (config.colorful) {
    const ringInterval = 9.5; // Distance between consecutive outward waves
    const ringThickness = 3.2; // Width of the passing color wave

    const progress = t * waveSpeed;

    // Background continuous RGB hue for this key
    const baseHue = (key.col * 15 + key.row * 24 + t * speedMult * 20) % 360;

    // Check two consecutive expanding rings (current and next)
    const baseCycle = Math.floor(progress / ringInterval);
    let bestWeight = 0;
    let sweepingHue = baseHue;

    for (let c = baseCycle; c <= baseCycle + 1; c++) {
      const ringRadius = progress - c * ringInterval;
      if (ringRadius >= -ringThickness && ringRadius <= 15) {
        const delta = Math.abs(dist - ringRadius);
        if (delta < ringThickness) {
          const cosVal = Math.cos((delta / ringThickness) * (Math.PI / 2));
          const weight = Math.pow(cosVal, 1.8);
          if (weight > bestWeight) {
            bestWeight = weight;
            sweepingHue = getOutwardRingHue(c);
          }
        }
      }
    }

    // Blend from background RGB hue to the single sweeping random ring hue
    const finalHue = interpolateCircularHue(baseHue, sweepingHue, bestWeight);

    // ZERO DIMMING ("sönme olmasın"):
    // Base lightness stays fully active at 52%, and pulses to 68% at the wave crest!
    const baseLightness = 52 + 16 * bestWeight;
    const finalLightness = Math.round(baseLightness * brightnessFactor);

    return `hsl(${Math.round(finalHue)}, 100%, ${Math.max(8, finalLightness)}%)`;
  }

  // Single-color mode: 70% slower outward expansion
  const wave = Math.sin(dist * 0.55 - t * waveSpeed);
  const intensity = 0.25 + 0.75 * Math.pow((wave + 1) / 2, 1.8);

  const baseR = config.r;
  const baseG = config.g;
  const baseB = config.b;

  const red = Math.round(baseR * intensity * brightnessFactor);
  const green = Math.round(baseG * intensity * brightnessFactor);
  const blue = Math.round(baseB * intensity * brightnessFactor);

  return `rgb(${red}, ${green}, ${blue})`;
}
