import * as THREE from 'three';

/**
 * Pearlescent indigo color palette for The Indigo Frequency.
 * Colors shift subtly over time to create an iridescent, pearlescent feel.
 */

// Core named colors
export const INDIGO_PALETTE = {
  deepIndigo:   new THREE.Color(0x1a0033),
  pearlWhite:   new THREE.Color(0xe8dff5),
  signalViolet: new THREE.Color(0x6b3fa0),
  duskAmber:    new THREE.Color(0xd4a574),
  voidBlack:    new THREE.Color(0x0a0012),
} as const;

// Hex values for CSS / non-Three usage
export const INDIGO_HEX = {
  deepIndigo:   '#1a0033',
  pearlWhite:   '#e8dff5',
  signalViolet: '#6b3fa0',
  duskAmber:    '#d4a574',
  voidBlack:    '#0a0012',
} as const;

// Fog presets per scene mood
export type FogPreset = {
  color: THREE.Color;
  near: number;
  far: number;
  density: number; // for exponential fog
};

export const FOG_PRESETS: Record<string, FogPreset> = {
  default: {
    color: new THREE.Color(0x0a0012),
    near: 1,
    far: 80,
    density: 0.025,
  },
  deepVoid: {
    color: new THREE.Color(0x050008),
    near: 0.5,
    far: 50,
    density: 0.04,
  },
  amberDusk: {
    color: new THREE.Color(0x1a0f05),
    near: 2,
    far: 100,
    density: 0.018,
  },
  pearlMist: {
    color: new THREE.Color(0x1a1525),
    near: 1,
    far: 60,
    density: 0.03,
  },
};

// Wireframe material colors that shift over time for pearlescent effect
const pearlShiftColors = [
  INDIGO_PALETTE.signalViolet,
  INDIGO_PALETTE.pearlWhite,
  INDIGO_PALETTE.duskAmber,
  INDIGO_PALETTE.signalViolet,
];

/**
 * Get a pearlescent color that shifts over time.
 * @param t - Time value (typically elapsed seconds * speed)
 * @param baseColor - Optional base color to blend with
 * @returns Interpolated THREE.Color
 */
export function getPearlescentColor(t: number, baseColor?: THREE.Color): THREE.Color {
  const cycleT = ((t % 1) + 1) % 1; // normalize to 0..1
  const segmentCount = pearlShiftColors.length - 1;
  const segment = Math.floor(cycleT * segmentCount);
  const segmentT = (cycleT * segmentCount) - segment;

  const from = pearlShiftColors[segment];
  const to = pearlShiftColors[Math.min(segment + 1, segmentCount)];

  const result = new THREE.Color().copy(from).lerp(to, segmentT);

  if (baseColor) {
    result.lerp(baseColor, 0.3);
  }

  return result;
}

/**
 * Apply fog to a scene based on a preset.
 */
export function applyFog(scene: THREE.Scene, preset: FogPreset): void {
  scene.fog = new THREE.FogExp2(preset.color, preset.density);
  scene.background = preset.color.clone();
}

/**
 * Smoothly transition fog between two presets.
 */
export function lerpFog(
  scene: THREE.Scene,
  from: FogPreset,
  to: FogPreset,
  t: number
): void {
  const color = new THREE.Color().copy(from.color).lerp(to.color, t);
  const density = from.density + (to.density - from.density) * t;
  scene.fog = new THREE.FogExp2(color, density);
  scene.background = color.clone();
}
