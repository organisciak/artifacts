import * as THREE from 'three';
import { INDIGO_PALETTE } from './palette';

// ---------------------------------------------------------------------------
// Shared GLSL helpers
// ---------------------------------------------------------------------------

const GLSL_PALETTE = /* glsl */ `
  // Palette colors as uniforms — injected by factory functions
  uniform vec3 uDeepIndigo;
  uniform vec3 uPearlWhite;
  uniform vec3 uSignalViolet;
  uniform vec3 uDuskAmber;
  uniform vec3 uVoidBlack;

  // Mood 0 = cool indigo (default), 1 = warm amber drift
  uniform float uMood;
  uniform float uTime;
`;

const GLSL_FRESNEL = /* glsl */ `
  // Compute Fresnel factor: 1.0 at glancing angles, 0.0 head-on
  float fresnel(vec3 viewDir, vec3 normal, float power) {
    return pow(1.0 - abs(dot(viewDir, normal)), power);
  }
`;

const GLSL_FOG = /* glsl */ `
  // Exponential fog integration
  uniform vec3 uFogColor;
  uniform float uFogDensity;

  vec3 applyFog(vec3 color, float dist) {
    float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
    return mix(color, uFogColor, clamp(fogFactor, 0.0, 1.0));
  }
`;

// ---------------------------------------------------------------------------
// Shared uniform defaults — call this to get the base uniform block
// ---------------------------------------------------------------------------

function paletteUniforms(mood = 0) {
  return {
    uDeepIndigo:   { value: INDIGO_PALETTE.deepIndigo.clone() },
    uPearlWhite:   { value: INDIGO_PALETTE.pearlWhite.clone() },
    uSignalViolet: { value: INDIGO_PALETTE.signalViolet.clone() },
    uDuskAmber:    { value: INDIGO_PALETTE.duskAmber.clone() },
    uVoidBlack:    { value: INDIGO_PALETTE.voidBlack.clone() },
    uMood:         { value: mood },
    uTime:         { value: 0.0 },
    uFogColor:     { value: INDIGO_PALETTE.voidBlack.clone() },
    uFogDensity:   { value: 0.025 },
  };
}

// ---------------------------------------------------------------------------
// Material option types
// ---------------------------------------------------------------------------

export type PearlescentOptions = {
  mood?: number;
  fresnelPower?: number;
  opacity?: number;
  side?: THREE.Side;
};

export type WireframeMatOptions = {
  mood?: number;
  glowIntensity?: number;
  baseOpacity?: number;
};

export type GroundOptions = {
  mood?: number;
  gridScale?: number;
  fadeDistance?: number;
  pulseSpeed?: number;
};

export type SilhouetteOptions = {
  mood?: number;
  innerGlowStrength?: number;
  opacity?: number;
};

export type SkyOptions = {
  mood?: number;
  starDensity?: number;
  signalFlicker?: number;
};

// ---------------------------------------------------------------------------
// 1. Pearlescent Iridescent Material
//    Fresnel-driven color shift between indigo/violet/pearl/amber.
//    Used for general scene objects, architecture, props.
// ---------------------------------------------------------------------------

export function createPearlescentMaterial(opts: PearlescentOptions = {}): THREE.ShaderMaterial {
  const {
    mood = 0,
    fresnelPower = 3.0,
    opacity = 0.9,
    side = THREE.FrontSide,
  } = opts;

  const uniforms = {
    ...paletteUniforms(mood),
    uFresnelPower: { value: fresnelPower },
    uOpacity:      { value: opacity },
  };

  return new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    side,
    depthWrite: true,
    vertexShader: /* glsl */ `
      ${GLSL_PALETTE}
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying float vDist;

      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vDist = -mvPosition.z;
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      ${GLSL_PALETTE}
      ${GLSL_FRESNEL}
      ${GLSL_FOG}
      uniform float uFresnelPower;
      uniform float uOpacity;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying float vDist;

      void main() {
        float f = fresnel(vViewDir, vNormal, uFresnelPower);

        // Base color: deep indigo at head-on, shifts toward signal violet
        vec3 baseColor = mix(uDeepIndigo, uSignalViolet, f * 0.7);

        // Iridescent layer: pearl white at strong glancing angles
        vec3 iridescentColor = mix(baseColor, uPearlWhite, f * f);

        // Time shimmer: subtle cycling between violet and amber at edges
        float shimmer = sin(uTime * 0.4 + f * 6.2831) * 0.5 + 0.5;
        vec3 shimmerColor = mix(uSignalViolet, uDuskAmber, shimmer);
        iridescentColor = mix(iridescentColor, shimmerColor, f * 0.35);

        // Mood shift: blend toward amber warmth
        vec3 warmShift = mix(iridescentColor, uDuskAmber, uMood * 0.3);
        vec3 finalColor = mix(iridescentColor, warmShift, uMood);

        // Apply fog
        finalColor = applyFog(finalColor, vDist);

        // Edge glow boost for bloom pickup
        float edgeGlow = pow(f, 4.0) * 0.6;
        finalColor += edgeGlow * uPearlWhite;

        gl_FragColor = vec4(finalColor, uOpacity * (0.7 + f * 0.3));
      }
    `,
  });
}

// ---------------------------------------------------------------------------
// 2. Wireframe Material
//    Glowing wireframe lines with soft distance falloff.
//    Used for architectural wireframes, terrain edges, structure outlines.
// ---------------------------------------------------------------------------

export function createWireframeMaterial(opts: WireframeMatOptions = {}): THREE.ShaderMaterial {
  const {
    mood = 0,
    glowIntensity = 1.5,
    baseOpacity = 0.85,
  } = opts;

  const uniforms = {
    ...paletteUniforms(mood),
    uGlowIntensity: { value: glowIntensity },
    uBaseOpacity:    { value: baseOpacity },
  };

  return new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      ${GLSL_PALETTE}
      varying float vDist;
      varying vec3 vWorldPos;

      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vDist = -mvPosition.z;
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      ${GLSL_PALETTE}
      ${GLSL_FOG}
      uniform float uGlowIntensity;
      uniform float uBaseOpacity;
      varying float vDist;
      varying vec3 vWorldPos;

      void main() {
        // Base wireframe color: signal violet with mood shift toward amber
        vec3 coolColor = uSignalViolet;
        vec3 warmColor = mix(uSignalViolet, uDuskAmber, 0.6);
        vec3 lineColor = mix(coolColor, warmColor, uMood);

        // Distance-based intensity falloff (closer = brighter)
        float distFade = 1.0 / (1.0 + vDist * 0.04);

        // Subtle pulse synchronized with time
        float pulse = 0.85 + 0.15 * sin(uTime * 1.2 + vWorldPos.y * 0.5);

        // Pearl highlight on lines
        float pearlFlicker = sin(uTime * 0.7 + vWorldPos.x * 2.0 + vWorldPos.z * 1.5) * 0.5 + 0.5;
        lineColor = mix(lineColor, uPearlWhite, pearlFlicker * 0.2);

        vec3 finalColor = lineColor * uGlowIntensity * distFade * pulse;

        // Apply fog
        finalColor = applyFog(finalColor, vDist);

        float alpha = uBaseOpacity * distFade * pulse;
        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
  });
}

// ---------------------------------------------------------------------------
// 3. Ground / Terrain Material
//    Wireframe grid plane that fades into fog with gentle color pulsing.
//    Applied to a PlaneGeometry with wireframe: true, or as custom grid.
// ---------------------------------------------------------------------------

export function createGroundMaterial(opts: GroundOptions = {}): THREE.ShaderMaterial {
  const {
    mood = 0,
    gridScale = 1.0,
    fadeDistance = 40.0,
    pulseSpeed = 0.8,
  } = opts;

  const uniforms = {
    ...paletteUniforms(mood),
    uGridScale:    { value: gridScale },
    uFadeDistance: { value: fadeDistance },
    uPulseSpeed:   { value: pulseSpeed },
  };

  return new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    wireframe: true,
    vertexShader: /* glsl */ `
      ${GLSL_PALETTE}
      varying vec3 vWorldPos;
      varying float vDist;

      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vec4 mvPosition = viewMatrix * worldPos;
        vDist = -mvPosition.z;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      ${GLSL_PALETTE}
      ${GLSL_FOG}
      uniform float uGridScale;
      uniform float uFadeDistance;
      uniform float uPulseSpeed;
      varying vec3 vWorldPos;
      varying float vDist;

      void main() {
        // Distance fade: grid disappears into fog
        float distFade = 1.0 - smoothstep(0.0, uFadeDistance, vDist);

        // Radial fade from origin
        float radialDist = length(vWorldPos.xz);
        float radialFade = 1.0 - smoothstep(0.0, uFadeDistance * 0.8, radialDist);

        float fade = distFade * radialFade;

        // Base color: deep indigo grid lines
        vec3 gridColor = mix(uDeepIndigo, uSignalViolet, 0.3);

        // Pulsing color wave radiating from center
        float wave = sin(radialDist * uGridScale * 0.3 - uTime * uPulseSpeed) * 0.5 + 0.5;
        gridColor = mix(gridColor, uSignalViolet, wave * 0.4);

        // Mood warmth
        gridColor = mix(gridColor, uDuskAmber, uMood * 0.25 * wave);

        // Apply fog
        gridColor = applyFog(gridColor, vDist);

        float alpha = fade * (0.3 + wave * 0.15);
        gl_FragColor = vec4(gridColor, alpha);
      }
    `,
  });
}

// ---------------------------------------------------------------------------
// 4. Character Silhouette Material
//    Dark, opaque geometric figures with subtle inner Fresnel glow.
//    Used for character entities — think KRZ's shadow-puppet people.
// ---------------------------------------------------------------------------

export function createSilhouetteMaterial(opts: SilhouetteOptions = {}): THREE.ShaderMaterial {
  const {
    mood = 0,
    innerGlowStrength = 0.6,
    opacity = 0.95,
  } = opts;

  const uniforms = {
    ...paletteUniforms(mood),
    uInnerGlowStrength: { value: innerGlowStrength },
    uOpacity:           { value: opacity },
  };

  return new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: true,
    vertexShader: /* glsl */ `
      ${GLSL_PALETTE}
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying float vDist;

      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vDist = -mvPosition.z;
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      ${GLSL_PALETTE}
      ${GLSL_FRESNEL}
      ${GLSL_FOG}
      uniform float uInnerGlowStrength;
      uniform float uOpacity;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying float vDist;

      void main() {
        float f = fresnel(vViewDir, vNormal, 2.5);

        // Core body: nearly void black
        vec3 bodyColor = mix(uVoidBlack, uDeepIndigo, 0.15);

        // Inner glow at edges: signal violet rim light
        vec3 glowColor = mix(uSignalViolet, uPearlWhite, f * 0.3);
        glowColor = mix(glowColor, uDuskAmber, uMood * 0.4);

        vec3 finalColor = mix(bodyColor, glowColor, f * uInnerGlowStrength);

        // Subtle breathing animation on the glow
        float breath = sin(uTime * 0.6) * 0.5 + 0.5;
        finalColor += glowColor * f * breath * 0.15;

        // Apply fog
        finalColor = applyFog(finalColor, vDist);

        // Slightly more transparent at edges for blending with bloom
        float alpha = uOpacity * (1.0 - f * 0.15);
        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
  });
}

// ---------------------------------------------------------------------------
// 5. Sky / Environment Material
//    Gradient sky dome: indigo-to-black with scattered point lights
//    simulating distant stars or radio signals.
//    Apply to a large SphereGeometry(500, 32, 32) with side: BackSide.
// ---------------------------------------------------------------------------

export function createSkyMaterial(opts: SkyOptions = {}): THREE.ShaderMaterial {
  const {
    mood = 0,
    starDensity = 200.0,
    signalFlicker = 1.0,
  } = opts;

  const uniforms = {
    ...paletteUniforms(mood),
    uStarDensity:   { value: starDensity },
    uSignalFlicker: { value: signalFlicker },
  };

  return new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      ${GLSL_PALETTE}
      varying vec3 vWorldPos;
      varying vec3 vNormal;

      void main() {
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${GLSL_PALETTE}
      uniform float uStarDensity;
      uniform float uSignalFlicker;
      varying vec3 vWorldPos;
      varying vec3 vNormal;

      // Hash for pseudo-random stars
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      // 2D noise for star placement
      float starNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      void main() {
        // Vertical gradient: void black at bottom, deep indigo at zenith
        vec3 dir = normalize(vWorldPos);
        float elevation = dir.y; // -1 (nadir) to +1 (zenith)
        float t = clamp(elevation * 0.5 + 0.5, 0.0, 1.0); // 0 at bottom, 1 at top

        // Sky gradient
        vec3 bottomColor = uVoidBlack;
        vec3 midColor = uDeepIndigo;
        vec3 topColor = mix(uDeepIndigo, uSignalViolet, 0.2);

        // Mood shifts the sky warmer
        midColor = mix(midColor, uDuskAmber * 0.15, uMood * 0.4);

        vec3 skyColor = mix(bottomColor, midColor, smoothstep(0.0, 0.4, t));
        skyColor = mix(skyColor, topColor, smoothstep(0.4, 1.0, t));

        // Stars — scattered point lights
        vec2 starUV = dir.xz / (abs(dir.y) + 0.001) * uStarDensity;
        float starVal = hash(floor(starUV));
        float starMask = step(0.985, starVal); // sparse bright stars

        // Star twinkle
        float twinkle = sin(uTime * (2.0 + starVal * 4.0) + starVal * 100.0) * 0.5 + 0.5;
        twinkle = twinkle * twinkle; // sharpen twinkle

        // Star color: mostly pearl white, some signal violet
        vec3 starColor = mix(uPearlWhite, uSignalViolet, step(0.5, fract(starVal * 7.3)));

        // Signal flicker: occasional brighter flash like a distant radio tower
        float signalPhase = sin(uTime * 0.3 + starVal * 50.0);
        float signal = step(0.97, starVal) * step(0.8, signalPhase) * uSignalFlicker;
        vec3 signalColor = mix(uSignalViolet, uDuskAmber, uMood);

        // Only show stars above horizon
        float aboveHorizon = smoothstep(0.1, 0.3, t);

        vec3 finalColor = skyColor;
        finalColor += starColor * starMask * twinkle * aboveHorizon * 0.8;
        finalColor += signalColor * signal * aboveHorizon * 1.5;

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
  });
}

// ---------------------------------------------------------------------------
// Utility: update uTime on all indigo shader materials in a scene
// ---------------------------------------------------------------------------

export function updateShaderTime(scene: THREE.Object3D, time: number, mood?: number): void {
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
      const mat = obj.material;
      if (mat instanceof THREE.ShaderMaterial && mat.uniforms.uTime) {
        mat.uniforms.uTime.value = time;
        if (mood !== undefined && mat.uniforms.uMood) {
          mat.uniforms.uMood.value = mood;
        }
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Utility: sync fog uniforms on all shader materials when fog changes
// ---------------------------------------------------------------------------

export function updateShaderFog(scene: THREE.Object3D, fogColor: THREE.Color, fogDensity: number): void {
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
      const mat = obj.material;
      if (mat instanceof THREE.ShaderMaterial && mat.uniforms.uFogColor) {
        mat.uniforms.uFogColor.value.copy(fogColor);
        mat.uniforms.uFogDensity.value = fogDensity;
      }
    }
  });
}
