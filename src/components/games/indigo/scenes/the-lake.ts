import * as THREE from 'three';
import type {
  IndigoScene,
  SceneContext,
  SceneCharacter,
  SceneInteractable,
} from './types';
import { registerScene } from '../engine/scene-manager';
import { registerDialogue } from '../narrative/dialogue-system';
import type { SceneId } from '../engine/game-state';
import { INDIGO_PALETTE } from '../engine/palette';
import {
  createGroundMaterial,
  createWireframeMaterial,
  createSkyMaterial,
  updateShaderTime,
} from '../engine/shaders';
import { TheReflection } from '../entities/characters/the-reflection';
import {
  SCENE_FOG,
  getVisualParams,
  getDustMoteConfig,
  createDustMotes,
  computeIntensity,
} from '../engine/atmosphere';

// ─── Scene Constants ────────────────────────────────────────────────────────

const SCENE_ID: SceneId = 'the-lake';
const LAKE_RADIUS = 35;
const DOCK_LENGTH = 12;
const DOCK_WIDTH = 1.8;
const DOCK_Y = 0.25;
const WATER_Y = 0;

/** Fog tuned by atmosphere system */
const LAKE_FOG = SCENE_FOG['the-lake'];

// ─── Water Reflection Shader ────────────────────────────────────────────────
// The centerpiece: a lake that reflects the WRONG sky.
// Above: deep indigo night.  Below (in the water): warm daylight with clouds.

const WaterReflectionShader = {
  uniforms: {
    uTime: { value: 0 },
    uNightColor: { value: INDIGO_PALETTE.deepIndigo.clone() },
    uDayColorHigh: { value: new THREE.Color(0.55, 0.65, 0.85) }, // Pale day blue
    uDayColorLow: { value: new THREE.Color(0.82, 0.75, 0.65) },  // Warm horizon
    uCloudColor: { value: new THREE.Color(0.92, 0.90, 0.88) },    // Bright cloud white
    uVioletTint: { value: INDIGO_PALETTE.signalViolet.clone() },
    uAmberTint: { value: INDIGO_PALETTE.duskAmber.clone() },
    uWaveAmplitude: { value: 0.08 },
    uWaveFrequency: { value: 2.5 },
    uDistortionStrength: { value: 0.03 },
    uOpacity: { value: 0.88 },
    uFogColor: { value: LAKE_FOG.color.clone() },
    uFogDensity: { value: LAKE_FOG.density },
    uCameraPos: { value: new THREE.Vector3() },
  },
  vertexShader: /* glsl */ `
    uniform float uTime;
    uniform float uWaveAmplitude;
    uniform float uWaveFrequency;

    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying float vDist;

    void main() {
      vUv = uv;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);

      // Gentle wave displacement on Y
      float wave1 = sin(worldPos.x * uWaveFrequency + uTime * 0.8) * uWaveAmplitude;
      float wave2 = sin(worldPos.z * uWaveFrequency * 0.7 + uTime * 0.5) * uWaveAmplitude * 0.6;
      float wave3 = sin((worldPos.x + worldPos.z) * uWaveFrequency * 0.4 + uTime * 1.2) * uWaveAmplitude * 0.3;
      worldPos.y += wave1 + wave2 + wave3;

      vWorldPos = worldPos.xyz;
      vec4 mvPos = viewMatrix * worldPos;
      vDist = -mvPos.z;
      gl_Position = projectionMatrix * mvPos;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform vec3 uNightColor;
    uniform vec3 uDayColorHigh;
    uniform vec3 uDayColorLow;
    uniform vec3 uCloudColor;
    uniform vec3 uVioletTint;
    uniform vec3 uAmberTint;
    uniform float uDistortionStrength;
    uniform float uOpacity;
    uniform vec3 uFogColor;
    uniform float uFogDensity;
    uniform vec3 uCameraPos;

    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying float vDist;

    // Simple hash-based noise
    float hash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    // Layered noise for clouds
    float cloudNoise(vec2 p) {
      float n = noise(p * 0.5) * 0.5;
      n += noise(p * 1.0) * 0.25;
      n += noise(p * 2.0) * 0.125;
      n += noise(p * 4.0) * 0.0625;
      return n;
    }

    vec3 applyFog(vec3 color, float dist) {
      float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
      return mix(color, uFogColor, clamp(fogFactor, 0.0, 1.0));
    }

    void main() {
      // Wave distortion on UV for the reflected image
      vec2 distortedUV = vUv;
      distortedUV.x += sin(vWorldPos.z * 3.0 + uTime * 0.6) * uDistortionStrength;
      distortedUV.y += sin(vWorldPos.x * 2.5 + uTime * 0.4) * uDistortionStrength * 0.8;

      // --- The "wrong" reflection: a warm daylight sky with clouds ---

      // Sky gradient in the reflection: warm day blue at top, horizon warmth at bottom
      float reflectY = distortedUV.y; // 0 = far edge, 1 = near shore
      vec3 reflectedSky = mix(uDayColorHigh, uDayColorLow, reflectY);

      // Clouds: slow-drifting noise shapes
      vec2 cloudUV = distortedUV * 3.0 + vec2(uTime * 0.02, uTime * 0.01);
      float cloud = cloudNoise(cloudUV);
      float cloudMask = smoothstep(0.35, 0.55, cloud);
      reflectedSky = mix(reflectedSky, uCloudColor, cloudMask * 0.7);

      // The reflected "sun" (the moon above appears as a sun below)
      vec2 sunPos = vec2(0.6, 0.3); // position in UV space
      float sunDist = length(distortedUV - sunPos);
      float sunGlow = exp(-sunDist * sunDist * 8.0);
      reflectedSky += uAmberTint * sunGlow * 0.6;

      // Violet tint at the edges — the dream bleeds through
      float edgeDist = length(vWorldPos.xz) / 35.0;
      reflectedSky = mix(reflectedSky, uVioletTint * 0.4, smoothstep(0.5, 1.0, edgeDist));

      // Subtle wave shimmer: bright highlights on wave crests
      float shimmer = sin(vWorldPos.x * 8.0 + uTime * 2.0) *
                      sin(vWorldPos.z * 6.0 + uTime * 1.5);
      shimmer = pow(max(shimmer, 0.0), 3.0) * 0.15;
      reflectedSky += vec3(shimmer) * uCloudColor;

      // Edge darkening near shore
      float shoreFade = smoothstep(0.0, 0.15, reflectY) * smoothstep(1.0, 0.85, reflectY);
      reflectedSky *= 0.7 + 0.3 * shoreFade;

      // Fresnel: more reflective at glancing angles
      vec3 viewDir = normalize(uCameraPos - vWorldPos);
      float fresnel = pow(1.0 - max(dot(viewDir, vec3(0.0, 1.0, 0.0)), 0.0), 3.0);
      float reflectivity = mix(0.3, 0.95, fresnel);

      // Blend between dark water and the reflected scene
      vec3 deepWater = mix(uNightColor, uVioletTint * 0.2, 0.3);
      vec3 finalColor = mix(deepWater, reflectedSky, reflectivity);

      // Apply fog
      finalColor = applyFog(finalColor, vDist);

      gl_FragColor = vec4(finalColor, uOpacity);
    }
  `,
};

// ─── Geometry Builders ──────────────────────────────────────────────────────

function createWaterPlane(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(LAKE_RADIUS * 2, LAKE_RADIUS * 2, 64, 64);
  geo.rotateX(-Math.PI / 2);

  const mat = new THREE.ShaderMaterial({
    uniforms: { ...WaterReflectionShader.uniforms },
    vertexShader: WaterReflectionShader.vertexShader,
    fragmentShader: WaterReflectionShader.fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = WATER_Y;
  mesh.name = 'lake_water';
  return mesh;
}

function createShoreline(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'shoreline';

  const groundMat = createGroundMaterial({
    mood: 0,
    gridScale: 0.8,
    fadeDistance: 30,
    pulseSpeed: 0.4,
  });

  // Ground plane on the near side (player's shore)
  const groundGeo = new THREE.PlaneGeometry(80, 40, 40, 20);
  groundGeo.rotateX(-Math.PI / 2);
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.set(0, -0.02, LAKE_RADIUS + 20); // Behind the player
  group.add(ground);

  // Shore edge: irregular wireframe triangles where land meets water
  const edgeGeo = new THREE.PlaneGeometry(60, 6, 30, 3);
  edgeGeo.rotateX(-Math.PI / 2);

  // Randomize edge vertices for organic shoreline
  const positions = edgeGeo.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const z = positions.getZ(i);
    if (Math.abs(z) < 2) {
      positions.setY(i, positions.getY(i) + (Math.random() - 0.5) * 0.2);
      positions.setX(i, positions.getX(i) + (Math.random() - 0.5) * 0.3);
    }
  }
  positions.needsUpdate = true;

  const edgeMat = createWireframeMaterial({ mood: 0, glowIntensity: 0.8, baseOpacity: 0.5 });
  const edgeWire = new THREE.LineSegments(
    new THREE.WireframeGeometry(edgeGeo),
    edgeMat,
  );
  edgeWire.position.set(0, 0.05, LAKE_RADIUS);
  group.add(edgeWire);

  return group;
}

function createDock(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'dock';

  const plankMat = createWireframeMaterial({
    mood: 0.15,
    glowIntensity: 0.7,
    baseOpacity: 0.65,
  });

  // Dock planks: thin boxes in a row
  const plankCount = Math.floor(DOCK_LENGTH / 0.5);
  for (let i = 0; i < plankCount; i++) {
    const width = DOCK_WIDTH + (Math.random() - 0.5) * 0.15; // Slight irregularity
    const plankGeo = new THREE.BoxGeometry(width, 0.06, 0.4);
    const wireGeo = new THREE.WireframeGeometry(plankGeo);
    const plank = new THREE.LineSegments(wireGeo, plankMat);
    plank.position.set(0, DOCK_Y, LAKE_RADIUS - i * 0.5);

    // Age: slight random rotation
    plank.rotation.y = (Math.random() - 0.5) * 0.02;
    plank.rotation.x = (Math.random() - 0.5) * 0.01;

    group.add(plank);
  }

  // Support posts
  const postMat = createWireframeMaterial({ mood: 0.1, glowIntensity: 0.5, baseOpacity: 0.5 });
  for (let i = 0; i < 6; i++) {
    const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.2, 4);
    const wireGeo = new THREE.WireframeGeometry(postGeo);
    const post = new THREE.LineSegments(wireGeo, postMat);
    const z = LAKE_RADIUS - i * (DOCK_LENGTH / 5);
    const xOffset = i % 2 === 0 ? -DOCK_WIDTH / 2 + 0.1 : DOCK_WIDTH / 2 - 0.1;
    post.position.set(xOffset, DOCK_Y - 0.6, z);
    group.add(post);
  }

  return group;
}

function createReeds(scene: THREE.Scene): THREE.Group {
  const group = new THREE.Group();
  group.name = 'reeds';

  const reedMat = createWireframeMaterial({
    mood: 0,
    glowIntensity: 0.6,
    baseOpacity: 0.45,
  });

  // Clusters along the shoreline
  const clusters = [
    { x: -8, z: LAKE_RADIUS - 1, count: 12 },
    { x: -12, z: LAKE_RADIUS - 2, count: 8 },
    { x: 6, z: LAKE_RADIUS + 0.5, count: 10 },
    { x: 10, z: LAKE_RADIUS - 0.5, count: 7 },
    { x: -4, z: LAKE_RADIUS + 1, count: 5 },
    { x: 15, z: LAKE_RADIUS - 1, count: 6 },
  ];

  for (const cluster of clusters) {
    for (let i = 0; i < cluster.count; i++) {
      const height = 1.5 + Math.random() * 2.0;
      const reedGeo = new THREE.CylinderGeometry(0.015, 0.02, height, 3);
      const wireGeo = new THREE.WireframeGeometry(reedGeo);
      const reed = new THREE.LineSegments(wireGeo, reedMat);

      const x = cluster.x + (Math.random() - 0.5) * 3;
      const z = cluster.z + (Math.random() - 0.5) * 2;
      reed.position.set(x, height / 2 + 0.1, z);

      // Slight random lean
      reed.rotation.x = (Math.random() - 0.5) * 0.1;
      reed.rotation.z = (Math.random() - 0.5) * 0.15;

      // Store initial rotation for sway animation
      reed.userData.baseRotX = reed.rotation.x;
      reed.userData.baseRotZ = reed.rotation.z;
      reed.userData.swayPhase = Math.random() * Math.PI * 2;
      reed.userData.swaySpeed = 0.3 + Math.random() * 0.3;

      group.add(reed);
    }
  }

  return group;
}

function createRowboat(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'rowboat';

  const boatMat = createWireframeMaterial({
    mood: 0.2,
    glowIntensity: 0.6,
    baseOpacity: 0.55,
  });

  // Hull: elongated box narrowed at the ends (approximate with a scaled sphere)
  const hullGeo = new THREE.SphereGeometry(1, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  hullGeo.scale(1.8, 0.4, 0.7);
  const wireGeo = new THREE.WireframeGeometry(hullGeo);
  const hull = new THREE.LineSegments(wireGeo, boatMat);
  hull.rotation.x = Math.PI;
  hull.position.y = 0.15;
  group.add(hull);

  // Gunwale: rim
  const rimGeo = new THREE.TorusGeometry(1.2, 0.03, 4, 8);
  rimGeo.scale(1.5, 1, 0.58);
  rimGeo.rotateX(Math.PI / 2);
  const rimWire = new THREE.WireframeGeometry(rimGeo);
  const rim = new THREE.LineSegments(rimWire, boatMat);
  rim.position.y = 0.35;
  group.add(rim);

  // Seat plank across the middle
  const seatGeo = new THREE.BoxGeometry(0.12, 0.04, 1.1);
  const seatWire = new THREE.WireframeGeometry(seatGeo);
  const seat = new THREE.LineSegments(seatWire, boatMat);
  seat.position.y = 0.28;
  group.add(seat);

  // Position the boat near the dock
  group.position.set(-DOCK_WIDTH - 1.5, WATER_Y, LAKE_RADIUS - 4);
  group.rotation.y = 0.2;

  // Tether line from boat to dock
  const tetherPoints = [
    new THREE.Vector3(-DOCK_WIDTH - 0.3, DOCK_Y, LAKE_RADIUS - 3),
    new THREE.Vector3(-DOCK_WIDTH - 1.0, DOCK_Y - 0.1, LAKE_RADIUS - 3.5),
    new THREE.Vector3(group.position.x + 1.0, 0.35, group.position.z + 0.5),
  ];
  const tetherGeo = new THREE.BufferGeometry().setFromPoints(tetherPoints);
  const tetherMat = new THREE.LineBasicMaterial({
    color: INDIGO_PALETTE.signalViolet,
    transparent: true,
    opacity: 0.3,
  });
  const tether = new THREE.Line(tetherGeo, tetherMat);
  tether.name = 'tether';
  group.add(tether);

  return group;
}

function createFarShore(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'far_shore';

  const treeMat = createWireframeMaterial({
    mood: 0,
    glowIntensity: 0.4,
    baseOpacity: 0.25, // Very faint — barely visible through fog
  });

  // Row of pyramid "trees" across the lake
  for (let i = 0; i < 20; i++) {
    const height = 2 + Math.random() * 3;
    const radius = 0.4 + Math.random() * 0.5;
    const treeGeo = new THREE.ConeGeometry(radius, height, 4);
    const wireGeo = new THREE.WireframeGeometry(treeGeo);
    const tree = new THREE.LineSegments(wireGeo, treeMat);

    const x = -25 + i * 2.5 + (Math.random() - 0.5) * 1.5;
    const z = -LAKE_RADIUS + (Math.random() - 0.5) * 3;
    tree.position.set(x, height / 2, z);
    group.add(tree);
  }

  return group;
}

function createMoon(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'moon';

  // Large pale sphere
  const moonGeo = new THREE.SphereGeometry(3, 16, 12);
  const moonMat = new THREE.MeshBasicMaterial({
    color: INDIGO_PALETTE.pearlWhite,
    transparent: true,
    opacity: 0.35,
  });
  const moon = new THREE.Mesh(moonGeo, moonMat);
  moon.position.set(15, 40, -30);
  group.add(moon);

  // Moon glow: larger transparent sphere
  const glowGeo = new THREE.SphereGeometry(6, 12, 8);
  const glowMat = new THREE.MeshBasicMaterial({
    color: INDIGO_PALETTE.signalViolet,
    transparent: true,
    opacity: 0.08,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.copy(moon.position);
  group.add(glow);

  // Directional light from the moon
  const moonLight = new THREE.DirectionalLight(
    INDIGO_PALETTE.pearlWhite,
    0.2,
  );
  moonLight.position.copy(moon.position);
  moonLight.target.position.set(0, 0, 0);
  group.add(moonLight);
  group.add(moonLight.target);

  return group;
}

function createSky(): THREE.Mesh {
  const skyGeo = new THREE.SphereGeometry(150, 32, 24);
  const skyMat = createSkyMaterial({ mood: 0, starDensity: 250, signalFlicker: 0.6 });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.name = 'sky_dome';
  return sky;
}

// ─── Firefly Particles ──────────────────────────────────────────────────────

function createFireflies(): THREE.Points {
  const count = 40;
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // Scatter near the reeds / shoreline
    positions[i * 3] = (Math.random() - 0.5) * 30;     // x
    positions[i * 3 + 1] = 0.5 + Math.random() * 2.5;  // y
    positions[i * 3 + 2] = LAKE_RADIUS - 3 + (Math.random() - 0.5) * 8; // z
    phases[i] = Math.random() * Math.PI * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

  const mat = new THREE.PointsMaterial({
    color: INDIGO_PALETTE.duskAmber,
    size: 0.12,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geo, mat);
  points.name = 'fireflies';
  return points;
}

// ─── Scene Implementation ───────────────────────────────────────────────────

class TheLakeScene implements IndigoScene {
  readonly id: SceneId = SCENE_ID;
  readonly title = 'The Lake';
  readonly subtitle = 'The water remembers';

  private sceneGroup = new THREE.Group();
  private waterMesh: THREE.Mesh | null = null;
  private fireflies: THREE.Points | null = null;
  private reedsGroup: THREE.Group | null = null;
  private rowboatGroup: THREE.Group | null = null;
  private reflectionCharacter: TheReflection | null = null;
  private dialogueRegistered = false;
  private dustMotes: { points: THREE.Points; update: (elapsed: number) => void; dispose: () => void } | null = null;

  // Transition exit zone
  private exitZoneTriggered = false;

  getSpawnPoint(): THREE.Vector3 {
    return new THREE.Vector3(0, 1.7, LAKE_RADIUS + 8);
  }

  getCharacters(): SceneCharacter[] {
    if (!this.reflectionCharacter) return [];
    return [{
      id: 'reflection',
      name: 'The Reflection',
      position: this.reflectionCharacter.getWorldPosition(),
      object: this.reflectionCharacter.group,
    }];
  }

  getInteractables(): SceneInteractable[] {
    const items: SceneInteractable[] = [];

    // The Reflection character
    if (this.reflectionCharacter) {
      items.push({
        id: 'reflection',
        position: this.reflectionCharacter.getWorldPosition(),
        radius: 7,
        object: this.reflectionCharacter.group,
      });
    }

    // Exit zone: walking back down the dock toward shore
    items.push({
      id: 'exit-to-motel',
      position: new THREE.Vector3(0, 1.7, LAKE_RADIUS + 5),
      radius: 3,
      onInteract: undefined, // Handled in update via proximity
    });

    return items;
  }

  // ─── Setup ──────────────────────────────────────────────────────────────

  setup(ctx: SceneContext): void {
    const { renderer } = ctx;
    const scene = renderer.scene;

    // Apply atmosphere-tuned lake fog
    scene.fog = new THREE.FogExp2(LAKE_FOG.color, LAKE_FOG.density);
    scene.background = LAKE_FOG.color.clone();

    // Sky dome
    const sky = createSky();
    this.sceneGroup.add(sky);

    // Moon
    const moon = createMoon();
    this.sceneGroup.add(moon);

    // Water
    this.waterMesh = createWaterPlane();
    this.sceneGroup.add(this.waterMesh);

    // Shoreline
    const shoreline = createShoreline();
    this.sceneGroup.add(shoreline);

    // Dock
    const dock = createDock();
    this.sceneGroup.add(dock);

    // Reeds
    this.reedsGroup = createReeds(scene);
    this.sceneGroup.add(this.reedsGroup);

    // Far shore trees
    const farShore = createFarShore();
    this.sceneGroup.add(farShore);

    // Rowboat
    this.rowboatGroup = createRowboat();
    this.sceneGroup.add(this.rowboatGroup);

    // Fireflies
    this.fireflies = createFireflies();
    this.sceneGroup.add(this.fireflies);

    // The Reflection — standing at the end of the dock
    this.reflectionCharacter = new TheReflection({
      position: new THREE.Vector3(0, DOCK_Y, LAKE_RADIUS - DOCK_LENGTH + 1),
    });
    this.reflectionCharacter.addToScene(this.sceneGroup);

    // Register dialogue
    if (!this.dialogueRegistered) {
      this.registerDialogueData();
      this.dialogueRegistered = true;
    }

    // Dust motes
    const dustConfig = getDustMoteConfig(ctx.gameState.emotionalIntensity);
    const dustResult = createDustMotes(dustConfig);
    if (dustResult) {
      this.dustMotes = dustResult;
      this.sceneGroup.add(dustResult.points);
    }

    // Add to scene
    scene.add(this.sceneGroup);
  }

  // ─── Update ─────────────────────────────────────────────────────────────

  update(ctx: SceneContext, delta: number, elapsed: number): void {
    const { renderer, gameState } = ctx;

    // Compute intra-scene emotional intensity
    const sceneState = gameState.getSceneState(SCENE_ID);
    const sceneProgress = sceneState.charactersSpokenTo.has('reflection') ? 1 : 0;
    const intensity = computeIntensity(SCENE_ID, sceneProgress);
    gameState.setEmotionalIntensity(intensity);

    const visual = getVisualParams(intensity);
    updateShaderTime(this.sceneGroup, elapsed, visual.shaderMood);

    // Update dust motes
    this.dustMotes?.update(elapsed);

    // Update water shader uniforms
    if (this.waterMesh) {
      const mat = this.waterMesh.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = elapsed;
      mat.uniforms.uCameraPos.value.copy(renderer.camera.position);
    }

    // Animate reeds swaying
    if (this.reedsGroup) {
      this.reedsGroup.traverse((child) => {
        if (child.userData.swayPhase !== undefined) {
          const phase = child.userData.swayPhase as number;
          const speed = child.userData.swaySpeed as number;
          const baseX = child.userData.baseRotX as number;
          const baseZ = child.userData.baseRotZ as number;

          child.rotation.x = baseX + Math.sin(elapsed * speed + phase) * 0.06;
          child.rotation.z = baseZ + Math.sin(elapsed * speed * 0.7 + phase * 1.3) * 0.04;
        }
      });
    }

    // Animate fireflies — random wandering
    if (this.fireflies) {
      const positions = this.fireflies.geometry.getAttribute('position');
      const phases = this.fireflies.geometry.getAttribute('phase');

      for (let i = 0; i < positions.count; i++) {
        const phase = phases.getX(i);
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);

        // Gentle random walk
        const dx = Math.sin(elapsed * 0.3 + phase * 7) * 0.01;
        const dy = Math.sin(elapsed * 0.5 + phase * 3) * 0.005;
        const dz = Math.sin(elapsed * 0.25 + phase * 5) * 0.008;

        positions.setXYZ(i, x + dx, y + dy, z + dz);
      }
      positions.needsUpdate = true;

      // Pulsing opacity
      const mat = this.fireflies.material as THREE.PointsMaterial;
      mat.opacity = 0.4 + Math.sin(elapsed * 1.5) * 0.3;
    }

    // Gentle rowboat bob
    if (this.rowboatGroup) {
      this.rowboatGroup.position.y = WATER_Y + Math.sin(elapsed * 0.4) * 0.06;
      this.rowboatGroup.rotation.z = Math.sin(elapsed * 0.3) * 0.03;
    }

    // Update The Reflection character
    if (this.reflectionCharacter) {
      this.reflectionCharacter.update(delta, elapsed);
    }

    // Check exit zone: after dialogue is complete, walking toward shore triggers transition
    if (
      sceneState.charactersSpokenTo.has('reflection') &&
      !this.exitZoneTriggered
    ) {
      const playerPos = renderer.camera.position;
      const exitZ = LAKE_RADIUS + 5;
      if (playerPos.z > exitZ) {
        this.exitZoneTriggered = true;
        gameState.markObjectiveMet(SCENE_ID);
        ctx.requestTransition('the-motel');
      }
    }
  }

  // ─── Cleanup ────────────────────────────────────────────────────────────

  cleanup(ctx: SceneContext): void {
    const scene = ctx.renderer.scene;

    // Remove character
    if (this.reflectionCharacter) {
      this.reflectionCharacter.removeFromScene(this.sceneGroup);
      this.reflectionCharacter.dispose();
      this.reflectionCharacter = null;
    }

    // Remove scene group (triggers disposal in scene manager)
    scene.remove(this.sceneGroup);

    // Dispose all geometries and materials
    this.sceneGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
      if (obj instanceof THREE.Points) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
      if (obj instanceof THREE.Line) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });

    this.sceneGroup = new THREE.Group();
    this.waterMesh = null;
    this.fireflies = null;
    this.reedsGroup = null;
    this.rowboatGroup = null;
    this.exitZoneTriggered = false;

    if (this.dustMotes) {
      this.dustMotes.dispose();
      this.dustMotes = null;
    }
  }

  // ─── Dialogue ───────────────────────────────────────────────────────────

  private registerDialogueData(): void {
    registerDialogue(SCENE_ID, {
      characterId: 'reflection',
      lines: [
        {
          text: 'I came to see what the lake / would make of my face. / It made something better. / I\'ve been trying to match it since.',
          pause: 3.5,
          tone: 'warm',
        },
        {
          text: 'The water doesn\'t reflect. / It remembers. / These are different things.',
          pause: 3.0,
          tone: 'hollow',
        },
        {
          text: 'Listen — below the surface / there\'s a frequency. / The lake has been singing / since before the tower was built.',
          pause: 3.0,
          tone: 'bright',
        },
      ],
      spentLine: 'The lake still sings. / Can you hear it?',
    }, {
      cameraLookOffset: { x: 0, y: 2.8, z: 0 },
      cameraDistance: 5.0,
      cameraHeight: 1.8,
      textOffset: { x: 0, y: 3.8, z: 0 },
    });
  }
}

// ─── Register ───────────────────────────────────────────────────────────────

registerScene(SCENE_ID, () => new TheLakeScene());

export { TheLakeScene };
