/**
 * Atmosphere Tuning — The Indigo Frequency
 *
 * Central config mapping emotional_intensity (0..1) to every visual and audio
 * parameter. The emotional arc should feel like an album — each scene flows
 * into the next, building toward resolution.
 *
 * Intensity ranges per scene:
 *   Scene 1 (Radio Tower):  0.10 → 0.20  — sparse, cold, curiosity
 *   Scene 2 (Gas Station):  0.30 → 0.40  — dry warmth, melancholy humor
 *   Scene 3 (The Lake):     0.50 → 0.65  — cold heart, silver depth
 *   Scene 4 (The Motel):    0.70 → 0.85  — warm, unsettling, layered
 *   Scene 5 (The Signal):   0.90 → 1.00  — full pearlescent resolution
 */

import * as THREE from 'three';
import type { SceneId } from './game-state';
import type { FogPreset } from './palette';
import { INDIGO_PALETTE } from './palette';

// ─── Emotional Intensity Ranges Per Scene ────────────────────────────────────

export type IntensityRange = { enter: number; exit: number };

export const SCENE_INTENSITY: Record<SceneId, IntensityRange> = {
  'radio-tower': { enter: 0.10, exit: 0.20 },
  'gas-station': { enter: 0.30, exit: 0.40 },
  'the-lake':    { enter: 0.50, exit: 0.65 },
  'the-motel':   { enter: 0.70, exit: 0.85 },
  'the-signal':  { enter: 0.90, exit: 1.00 },
};

// ─── Visual Parameters ───────────────────────────────────────────────────────

export type VisualParams = {
  /** Bloom pass strength (renderer.bloomPass) */
  bloomStrength: number;
  /** Bloom radius */
  bloomRadius: number;
  /** Chromatic aberration strength */
  chromaticStrength: number;
  /** Film grain intensity */
  filmNoiseIntensity: number;
  /** Mood value passed to shaders (0=cold indigo, 1=warm amber) */
  shaderMood: number;
  /** Sky star density */
  starDensity: number;
  /** Signal flicker intensity */
  signalFlicker: number;
  /** Floating dust mote count */
  dustMoteCount: number;
  /** Dust mote opacity */
  dustMoteOpacity: number;
  /** Dust mote size */
  dustMoteSize: number;
};

/** Interpolate visual parameters from emotional_intensity. */
export function getVisualParams(intensity: number): VisualParams {
  const t = Math.max(0, Math.min(1, intensity));

  return {
    // Bloom builds gently — dream glow increases
    bloomStrength: lerp(0.9, 1.8, t),
    bloomRadius: lerp(0.5, 0.75, t),

    // Chromatic aberration: subtle at start, more prismatic at peak
    chromaticStrength: lerp(0.002, 0.005, t),

    // Film grain decreases slightly as clarity increases
    filmNoiseIntensity: lerp(0.25, 0.12, t),

    // Mood shift: cold → warm → full pearlescent
    // Scene 3 (lake) dips cold, so we use a curve not a line
    shaderMood: moodCurve(t),

    // Stars become denser as you progress
    starDensity: lerp(150, 400, t),

    // Signal flicker grows more active
    signalFlicker: lerp(0.4, 1.5, t),

    // Floating dust motes increase
    dustMoteCount: Math.floor(lerp(0, 60, t)),
    dustMoteOpacity: lerp(0.0, 0.35, t),
    dustMoteSize: lerp(0.03, 0.06, t),
  };
}

// ─── Fog Parameters ──────────────────────────────────────────────────────────

export type FogParams = {
  color: THREE.Color;
  density: number;
};

/** Per-scene fog presets tuned for the emotional arc. */
export const SCENE_FOG: Record<SceneId, FogParams> = {
  'radio-tower': {
    color: new THREE.Color(0x0a0012),
    density: 0.022,
  },
  'gas-station': {
    color: new THREE.Color(0x0a0012),
    density: 0.025,
  },
  'the-lake': {
    // Cool pearlescent mist — the cold heart
    color: new THREE.Color(0x1a1525),
    density: 0.022,
  },
  'the-motel': {
    // Warmer, closer — intimate and unsettling
    color: new THREE.Color(0x120a18),
    density: 0.030,
  },
  'the-signal': {
    // Fog pulls back dramatically — the sky opens
    color: new THREE.Color(0x0a0018),
    density: 0.004,
  },
};

// ─── Audio Parameters ────────────────────────────────────────────────────────

export type AudioParams = {
  /** Master volume multiplier */
  masterVolume: number;
  /** Drone filter cutoff — opens as intensity rises */
  droneFilterOpen: number;
  /** Harmonic complexity — more overtones at higher intensity */
  harmonicGainMultiplier: number;
  /** Noise layer gain — atmosphere thickens */
  noiseGainMultiplier: number;
  /** Reverb wet level — more space at higher intensity */
  reverbWet: number;
};

/** Interpolate audio parameters from emotional_intensity. */
export function getAudioParams(intensity: number): AudioParams {
  const t = Math.max(0, Math.min(1, intensity));

  return {
    masterVolume: lerp(0.7, 0.85, t),
    droneFilterOpen: lerp(0.6, 1.0, t),
    harmonicGainMultiplier: lerp(0.5, 1.0, t),
    noiseGainMultiplier: lerp(0.6, 1.0, t),
    reverbWet: lerp(0.15, 0.35, t),
  };
}

// ─── Camera Parameters ───────────────────────────────────────────────────────

export type CameraParams = {
  /** Walk speed multiplier — very subtle increase */
  walkSpeedMultiplier: number;
  /** Head bob amplitude multiplier — more pronounced at peak */
  bobAmplitudeMultiplier: number;
};

/** Interpolate camera parameters from emotional_intensity. */
export function getCameraParams(intensity: number): CameraParams {
  const t = Math.max(0, Math.min(1, intensity));

  return {
    walkSpeedMultiplier: lerp(1.0, 1.12, t),
    bobAmplitudeMultiplier: lerp(1.0, 1.35, t),
  };
}

// ─── Color Arc ───────────────────────────────────────────────────────────────
//
// Scene 1: Deep indigo, cold. Amber only at horizon.
// Scene 2: Slightly warmer — amber creeps into wireframe highlights.
// Scene 3: Cool silver — the lake scene is the cold heart before the warmth.
// Scene 4: Warm and unsettling — amber and violet mix.
// Scene 5: Full pearlescent — all colors present, resolved.

export type ColorArc = {
  /** Primary wireframe tint */
  primaryTint: THREE.Color;
  /** Secondary accent color */
  accentColor: THREE.Color;
  /** Ambient light intensity */
  ambientIntensity: number;
  /** Ambient light color */
  ambientColor: THREE.Color;
};

export const SCENE_COLORS: Record<SceneId, ColorArc> = {
  'radio-tower': {
    primaryTint: INDIGO_PALETTE.signalViolet.clone(),
    accentColor: new THREE.Color(0x1a0033), // cold deep indigo
    ambientIntensity: 0.12,
    ambientColor: INDIGO_PALETTE.pearlWhite.clone(),
  },
  'gas-station': {
    primaryTint: INDIGO_PALETTE.signalViolet.clone().lerp(INDIGO_PALETTE.duskAmber, 0.15),
    accentColor: INDIGO_PALETTE.duskAmber.clone().multiplyScalar(0.4),
    ambientIntensity: 0.15,
    ambientColor: INDIGO_PALETTE.pearlWhite.clone().lerp(INDIGO_PALETTE.duskAmber, 0.1),
  },
  'the-lake': {
    primaryTint: INDIGO_PALETTE.signalViolet.clone().lerp(INDIGO_PALETTE.pearlWhite, 0.2),
    accentColor: new THREE.Color(0xc0c8d8), // cool silver
    ambientIntensity: 0.18,
    ambientColor: INDIGO_PALETTE.pearlWhite.clone(),
  },
  'the-motel': {
    primaryTint: INDIGO_PALETTE.signalViolet.clone().lerp(INDIGO_PALETTE.duskAmber, 0.3),
    accentColor: INDIGO_PALETTE.duskAmber.clone(),
    ambientIntensity: 0.13,
    ambientColor: INDIGO_PALETTE.duskAmber.clone().lerp(INDIGO_PALETTE.pearlWhite, 0.3),
  },
  'the-signal': {
    primaryTint: INDIGO_PALETTE.pearlWhite.clone().lerp(INDIGO_PALETTE.signalViolet, 0.3),
    accentColor: INDIGO_PALETTE.pearlWhite.clone(),
    ambientIntensity: 0.25,
    ambientColor: INDIGO_PALETTE.pearlWhite.clone(),
  },
};

// ─── Dust Motes (floating particles that increase with intensity) ────────────

export type DustMoteConfig = {
  count: number;
  spreadX: number;
  spreadY: number;
  spreadZ: number;
  color: THREE.Color;
  size: number;
  opacity: number;
  driftSpeed: number;
};

/** Get dust mote configuration based on emotional intensity. */
export function getDustMoteConfig(intensity: number): DustMoteConfig {
  const visual = getVisualParams(intensity);

  return {
    count: visual.dustMoteCount,
    spreadX: 20,
    spreadY: 8,
    spreadZ: 20,
    color: INDIGO_PALETTE.pearlWhite.clone().lerp(INDIGO_PALETTE.signalViolet, 0.3),
    size: visual.dustMoteSize,
    opacity: visual.dustMoteOpacity,
    driftSpeed: lerp(0.1, 0.25, intensity),
  };
}

/**
 * Create dust mote particle system. Call once per scene setup.
 * Returns the Points object and an update function.
 */
export function createDustMotes(
  config: DustMoteConfig,
): { points: THREE.Points; update: (elapsed: number) => void; dispose: () => void } | null {
  if (config.count <= 0) return null;

  const positions = new Float32Array(config.count * 3);
  const phases = new Float32Array(config.count);

  for (let i = 0; i < config.count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * config.spreadX;
    positions[i * 3 + 1] = Math.random() * config.spreadY;
    positions[i * 3 + 2] = (Math.random() - 0.5) * config.spreadZ;
    phases[i] = Math.random() * Math.PI * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: config.color,
    size: config.size,
    transparent: true,
    opacity: config.opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geo, mat);
  points.name = 'dust_motes';

  function update(elapsed: number) {
    const posAttr = geo.attributes.position;
    for (let i = 0; i < config.count; i++) {
      const phase = phases[i];
      let x = posAttr.getX(i);
      let y = posAttr.getY(i);
      let z = posAttr.getZ(i);

      // Gentle drift: upward and slightly horizontal
      x += Math.sin(elapsed * config.driftSpeed + phase * 3) * 0.003;
      y += config.driftSpeed * 0.01;
      z += Math.cos(elapsed * config.driftSpeed * 0.7 + phase * 5) * 0.002;

      // Wrap around when drifting out of bounds
      if (y > config.spreadY) {
        y = 0;
        x = (Math.random() - 0.5) * config.spreadX;
        z = (Math.random() - 0.5) * config.spreadZ;
      }

      posAttr.setXYZ(i, x, y, z);
    }
    posAttr.needsUpdate = true;

    // Gentle opacity flicker
    mat.opacity = config.opacity * (0.7 + Math.sin(elapsed * 0.5) * 0.3);
  }

  function dispose() {
    geo.dispose();
    mat.dispose();
  }

  return { points, update, dispose };
}

// ─── Intra-scene Intensity Ramping ───────────────────────────────────────────

/**
 * Compute the emotional intensity for a given scene and progress within it.
 * @param sceneId - Current scene
 * @param sceneProgress - 0..1, how far through the scene (e.g., fraction of objectives met)
 * @returns The emotional intensity value (0..1)
 */
export function computeIntensity(sceneId: SceneId, sceneProgress: number): number {
  const range = SCENE_INTENSITY[sceneId];
  if (!range) return 0.5;
  const t = Math.max(0, Math.min(1, sceneProgress));
  return range.enter + (range.exit - range.enter) * t;
}

// ─── Transition Timing ──────────────────────────────────────────────────────

/** Recommended transition durations per scene pair. */
export const TRANSITION_HINTS: Record<string, { type: 'fog' | 'signal'; totalDuration: number }> = {
  'radio-tower→gas-station': { type: 'fog', totalDuration: 4.4 },
  'gas-station→the-lake': { type: 'fog', totalDuration: 4.4 },
  'the-lake→the-motel': { type: 'fog', totalDuration: 4.4 },
  'the-motel→the-signal': { type: 'signal', totalDuration: 3.6 },
};

// ─── Utilities ───────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Mood curve: maps intensity 0..1 to shader mood 0..1
 * with a dip at 0.5 (Scene 3, The Lake = cold heart).
 */
function moodCurve(t: number): number {
  // Piecewise: warm up to 0.3, dip cool at 0.5, warm again through to 1.0
  if (t < 0.25) {
    // Scene 1: cold
    return t * 0.4; // 0 → 0.1
  } else if (t < 0.45) {
    // Scene 2: warming
    return 0.1 + (t - 0.25) * 1.0; // 0.1 → 0.3
  } else if (t < 0.65) {
    // Scene 3: cold dip
    return 0.3 - (t - 0.45) * 1.5; // 0.3 → 0.0
  } else if (t < 0.85) {
    // Scene 4: warm and unsettling
    return (t - 0.65) * 2.5; // 0.0 → 0.5
  } else {
    // Scene 5: full pearlescent resolution
    return 0.5 + (t - 0.85) * 3.33; // 0.5 → 1.0
  }
}
