/**
 * Scene 1: The Radio Tower
 *
 * A radio tower at twilight. Flat wireframe ground extending to fog, a tall
 * wireframe tower with a pulsing beacon, scattered geometric scrub, a road
 * leading into the fog, and The Keeper standing near the base.
 *
 * This scene teaches the player how to exist in this world.
 * Emotional register: curiosity, solitude, the beauty of an empty landscape at dusk.
 */

import * as THREE from 'three';
import type { IndigoScene, SceneContext, SceneCharacter, SceneInteractable } from './types';
import { TheKeeper } from '../entities/characters/the-keeper';
import {
  createWireframeMaterial,
  createGroundMaterial,
  createSkyMaterial,
  createPearlescentMaterial,
  updateShaderTime,
} from '../engine/shaders';
import { INDIGO_PALETTE } from '../engine/palette';
import { registerDialogue } from '../narrative/dialogue-system';
import type { SceneId } from '../engine/game-state';
import {
  SCENE_FOG,
  getVisualParams,
  getDustMoteConfig,
  createDustMotes,
  computeIntensity,
} from '../engine/atmosphere';

// ─── Constants ──────────────────────────────────────────────────────────────

const TOWER_HEIGHT = 30;
const TOWER_BASE_RADIUS = 1.2;
const TOWER_TOP_RADIUS = 0.3;
const CROSS_BRACE_COUNT = 8;
const BEACON_Y = TOWER_HEIGHT + 0.5;
const KEEPER_POSITION = new THREE.Vector3(-3, 0, -2);
const ROAD_LENGTH = 120;
const ROAD_WIDTH = 3.5;
const ROAD_LINE_GAP = 2.8;
const TRANSITION_Z = -50; // Player crosses this Z to trigger transition

// Scrub vegetation config
const SCRUB_CONFIGS = [
  { pos: new THREE.Vector3(8, 0, -5), scale: 0.8, type: 'cone' as const },
  { pos: new THREE.Vector3(-12, 0, -8), scale: 0.6, type: 'tetra' as const },
  { pos: new THREE.Vector3(15, 0, 3), scale: 0.5, type: 'cone' as const },
  { pos: new THREE.Vector3(-6, 0, 7), scale: 0.7, type: 'tetra' as const },
  { pos: new THREE.Vector3(4, 0, -15), scale: 0.4, type: 'cone' as const },
  { pos: new THREE.Vector3(-18, 0, -3), scale: 0.55, type: 'tetra' as const },
  { pos: new THREE.Vector3(10, 0, 10), scale: 0.65, type: 'cone' as const },
  { pos: new THREE.Vector3(-8, 0, -20), scale: 0.45, type: 'cone' as const },
  { pos: new THREE.Vector3(20, 0, -12), scale: 0.5, type: 'tetra' as const },
  { pos: new THREE.Vector3(-15, 0, 12), scale: 0.6, type: 'cone' as const },
];

// ─── Register dialogue ──────────────────────────────────────────────────────

registerDialogue('radio-tower' as SceneId, {
  characterId: 'keeper',
  lines: [
    { text: 'You arrived on a frequency / I wasn\'t monitoring.', pause: 3.0, tone: 'warm' },
    { text: 'That happens sometimes.', pause: 2.5, tone: 'hollow' },
    { text: 'The dial has more stations / than numbers.', pause: 3.5, tone: 'bright' },
  ],
  spentLine: 'The road remembers / where it leads.',
}, {
  cameraLookOffset: { x: 0, y: 3.0, z: 0 },
  cameraDistance: 5.0,
  cameraHeight: 2.2,
  textOffset: { x: 0, y: 5.0, z: 0 },
});

// ─── Scene Implementation ───────────────────────────────────────────────────

export class RadioTowerScene implements IndigoScene {
  readonly id: SceneId = 'radio-tower';
  readonly title = 'The Radio Tower';
  readonly subtitle = 'You arrived on a frequency';

  // Scene objects
  private sceneGroup = new THREE.Group();
  private keeper: TheKeeper | null = null;
  private beacon: THREE.PointLight | null = null;
  private beaconMesh: THREE.Mesh | null = null;
  private roadGlowMeshes: THREE.Mesh[] = [];
  private roadGlowing = false;

  // Materials (for disposal)
  private materials: THREE.Material[] = [];

  // Dust motes
  private dustMotes: { points: THREE.Points; update: (elapsed: number) => void; dispose: () => void } | null = null;

  // State
  private dialogueComplete = false;
  private transitionTriggered = false;

  setup(ctx: SceneContext): void {
    const { scene } = ctx.renderer;

    // Apply atmosphere-tuned fog
    const fog = SCENE_FOG['radio-tower'];
    scene.fog = new THREE.FogExp2(fog.color, fog.density);
    scene.background = fog.color.clone();

    const visual = getVisualParams(ctx.gameState.emotionalIntensity);

    // --- Sky dome ---
    const skyGeo = new THREE.SphereGeometry(150, 32, 32);
    const skyMat = createSkyMaterial({ starDensity: visual.starDensity, signalFlicker: visual.signalFlicker });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    skyDome.name = 'sky';
    this.materials.push(skyMat);
    this.sceneGroup.add(skyDome);

    // --- Ground grid ---
    const groundGeo = new THREE.PlaneGeometry(200, 200, 80, 80);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = createGroundMaterial({
      gridScale: 0.8,
      fadeDistance: 50,
      pulseSpeed: 0.5,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.name = 'ground';
    this.materials.push(groundMat);
    this.sceneGroup.add(ground);

    // --- Radio tower ---
    this.buildTower();

    // --- Beacon light ---
    this.beacon = new THREE.PointLight(INDIGO_PALETTE.duskAmber, 2, 50, 1.5);
    this.beacon.position.set(0, BEACON_Y, 0);
    this.sceneGroup.add(this.beacon);

    // Beacon mesh (glowing sphere)
    const beaconGeo = new THREE.SphereGeometry(0.25, 8, 6);
    const beaconMat = createPearlescentMaterial({ fresnelPower: 1.5, opacity: 1.0 });
    this.beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    this.beaconMesh.position.set(0, BEACON_Y, 0);
    this.materials.push(beaconMat);
    this.sceneGroup.add(this.beaconMesh);

    // --- Road ---
    this.buildRoad();

    // --- Scrub vegetation ---
    this.buildScrub();

    // --- Horizon amber glow (warm light at horizon, last 10 minutes before dark) ---
    const horizonLight = new THREE.DirectionalLight(INDIGO_PALETTE.duskAmber, 0.15);
    horizonLight.position.set(0, 0.5, -80);
    this.sceneGroup.add(horizonLight);

    // --- The Keeper ---
    this.keeper = new TheKeeper({ position: KEEPER_POSITION.clone() });
    this.keeper.addToScene(this.sceneGroup);

    // Subtle point light to illuminate The Keeper
    const keeperLight = new THREE.PointLight(INDIGO_PALETTE.signalViolet, 1.5, 10, 2);
    keeperLight.position.copy(KEEPER_POSITION).add(new THREE.Vector3(0, 3, 0));
    this.sceneGroup.add(keeperLight);

    // Add scene group to renderer
    scene.add(this.sceneGroup);

    // Dust motes
    const dustConfig = getDustMoteConfig(ctx.gameState.emotionalIntensity);
    const dustResult = createDustMotes(dustConfig);
    if (dustResult) {
      this.dustMotes = dustResult;
      this.sceneGroup.add(dustResult.points);
    }

    // Listen for dialogue completion to trigger road glow
    this.dialogueComplete = ctx.gameState
      .getSceneState(this.id)
      .charactersSpokenTo.has('keeper');
    if (this.dialogueComplete) {
      this.setRoadGlow(true);
    }
  }

  update(ctx: SceneContext, delta: number, elapsed: number): void {
    // Compute intra-scene emotional intensity
    const sceneState = ctx.gameState.getSceneState(this.id);
    const sceneProgress = sceneState.charactersSpokenTo.has('keeper') ? 1 : 0;
    const intensity = computeIntensity('radio-tower', sceneProgress);
    ctx.gameState.setEmotionalIntensity(intensity);

    const visual = getVisualParams(intensity);
    updateShaderTime(this.sceneGroup, elapsed, visual.shaderMood);

    // Update dust motes
    this.dustMotes?.update(elapsed);

    // Update keeper
    this.keeper?.update(delta, elapsed);

    // Beacon pulse: sine-modulated intensity
    if (this.beacon) {
      const pulse = Math.sin(elapsed * 0.8) * 0.5 + 0.5;
      this.beacon.intensity = 1.0 + pulse * 2.0;
    }
    if (this.beaconMesh) {
      const scale = 0.8 + Math.sin(elapsed * 0.8) * 0.2;
      this.beaconMesh.scale.setScalar(scale);
    }

    // Check if dialogue just completed (road starts glowing)
    if (!this.dialogueComplete) {
      const spoken = ctx.gameState
        .getSceneState(this.id)
        .charactersSpokenTo.has('keeper');
      if (spoken) {
        this.dialogueComplete = true;
        this.setRoadGlow(true);
        ctx.gameState.markObjectiveMet(this.id);
      }
    }

    // Road glow animation
    if (this.roadGlowing) {
      for (const mesh of this.roadGlowMeshes) {
        const mat = mesh.material as THREE.ShaderMaterial;
        if (mat.uniforms?.uTime) {
          mat.uniforms.uTime.value = elapsed;
        }
      }
    }

    // Check for scene transition: player walks into fog along the road
    if (this.dialogueComplete && !this.transitionTriggered) {
      const playerZ = ctx.renderer.camera.position.z;
      if (playerZ < TRANSITION_Z) {
        this.transitionTriggered = true;
        ctx.requestTransition('gas-station' as SceneId);
      }
    }
  }

  cleanup(ctx: SceneContext): void {
    const { scene } = ctx.renderer;

    // Remove keeper
    if (this.keeper) {
      this.keeper.removeFromScene(this.sceneGroup);
      this.keeper.dispose();
      this.keeper = null;
    }

    // Remove scene group
    scene.remove(this.sceneGroup);

    // Dispose all geometries and materials
    this.sceneGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
        obj.geometry.dispose();
      }
    });
    for (const mat of this.materials) {
      mat.dispose();
    }
    this.materials = [];
    this.beacon = null;
    this.beaconMesh = null;
    this.roadGlowMeshes = [];

    if (this.dustMotes) {
      this.dustMotes.dispose();
      this.dustMotes = null;
    }
  }

  getSpawnPoint(): THREE.Vector3 {
    return new THREE.Vector3(0, 1.7, 20);
  }

  getCharacters(): SceneCharacter[] {
    if (!this.keeper) return [];
    return [{
      id: 'keeper',
      name: 'The Keeper',
      position: this.keeper.getWorldPosition(),
      object: this.keeper.group,
    }];
  }

  getCharacterInstances() {
    return this.keeper ? [this.keeper] : [];
  }

  getInteractables(): SceneInteractable[] {
    return [];
  }

  // ─── Tower Construction ─────────────────────────────────────────────────

  private buildTower(): void {
    const towerGroup = new THREE.Group();
    towerGroup.name = 'tower';

    const wireMat = createWireframeMaterial({ glowIntensity: 1.0, baseOpacity: 0.7 });
    this.materials.push(wireMat);

    // 4 main vertical legs
    const legCount = 4;
    for (let i = 0; i < legCount; i++) {
      const angle = (i / legCount) * Math.PI * 2;
      const bottomX = Math.cos(angle) * TOWER_BASE_RADIUS;
      const bottomZ = Math.sin(angle) * TOWER_BASE_RADIUS;
      const topX = Math.cos(angle) * TOWER_TOP_RADIUS;
      const topZ = Math.sin(angle) * TOWER_TOP_RADIUS;

      // Leg as a line
      const points = [
        new THREE.Vector3(bottomX, 0, bottomZ),
        new THREE.Vector3(topX, TOWER_HEIGHT, topZ),
      ];
      const legGeo = new THREE.BufferGeometry().setFromPoints(points);
      const leg = new THREE.LineSegments(legGeo, wireMat);
      towerGroup.add(leg);
    }

    // Cross-bracing at intervals
    for (let level = 0; level < CROSS_BRACE_COUNT; level++) {
      const t = (level + 1) / (CROSS_BRACE_COUNT + 1);
      const y = t * TOWER_HEIGHT;
      const radius = TOWER_BASE_RADIUS + (TOWER_TOP_RADIUS - TOWER_BASE_RADIUS) * t;

      // Horizontal ring
      const ringPoints: THREE.Vector3[] = [];
      for (let i = 0; i <= legCount; i++) {
        const angle = (i / legCount) * Math.PI * 2;
        ringPoints.push(new THREE.Vector3(
          Math.cos(angle) * radius,
          y,
          Math.sin(angle) * radius,
        ));
      }
      const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPoints);
      const ringLine = new THREE.Line(ringGeo, wireMat);
      towerGroup.add(ringLine);

      // Diagonal cross-braces between legs at this level
      if (level < CROSS_BRACE_COUNT - 1) {
        const nextT = (level + 2) / (CROSS_BRACE_COUNT + 1);
        const nextY = nextT * TOWER_HEIGHT;
        const nextRadius = TOWER_BASE_RADIUS + (TOWER_TOP_RADIUS - TOWER_BASE_RADIUS) * nextT;

        for (let i = 0; i < legCount; i++) {
          const angle1 = (i / legCount) * Math.PI * 2;
          const angle2 = ((i + 1) / legCount) * Math.PI * 2;

          const bracePoints = [
            new THREE.Vector3(Math.cos(angle1) * radius, y, Math.sin(angle1) * radius),
            new THREE.Vector3(Math.cos(angle2) * nextRadius, nextY, Math.sin(angle2) * nextRadius),
          ];
          const braceGeo = new THREE.BufferGeometry().setFromPoints(bracePoints);
          const brace = new THREE.Line(braceGeo, wireMat);
          towerGroup.add(brace);
        }
      }
    }

    this.sceneGroup.add(towerGroup);
  }

  // ─── Road ───────────────────────────────────────────────────────────────

  private buildRoad(): void {
    const wireMat = createWireframeMaterial({ glowIntensity: 0.6, baseOpacity: 0.4 });
    this.materials.push(wireMat);

    // Two parallel lines extending forward into the fog
    for (const xOffset of [-ROAD_LINE_GAP / 2, ROAD_LINE_GAP / 2]) {
      const points = [
        new THREE.Vector3(xOffset, 0.01, 30),
        new THREE.Vector3(xOffset, 0.01, -ROAD_LENGTH),
      ];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(lineGeo, wireMat);
      line.name = 'road_line';
      this.sceneGroup.add(line);
    }

    // Road glow meshes (hidden until dialogue completes)
    const glowMat = createWireframeMaterial({ glowIntensity: 2.0, baseOpacity: 0.6 });
    this.materials.push(glowMat);

    // Center dashes (like road markings, fading into distance)
    const dashCount = 20;
    const dashLength = 1.5;
    const dashGap = 3.0;
    for (let i = 0; i < dashCount; i++) {
      const z = 10 - i * (dashLength + dashGap);
      const dashPoints = [
        new THREE.Vector3(0, 0.02, z),
        new THREE.Vector3(0, 0.02, z - dashLength),
      ];
      const dashGeo = new THREE.BufferGeometry().setFromPoints(dashPoints);
      const dash = new THREE.Line(dashGeo, glowMat);
      dash.visible = false;
      dash.name = 'road_glow_dash';
      this.roadGlowMeshes.push(dash as unknown as THREE.Mesh);
      this.sceneGroup.add(dash);
    }
  }

  // ─── Scrub vegetation ────────────────────────────────────────────────────

  private buildScrub(): void {
    const scrubMat = createPearlescentMaterial({
      fresnelPower: 4.0,
      opacity: 0.5,
    });
    this.materials.push(scrubMat);

    for (const cfg of SCRUB_CONFIGS) {
      let geo: THREE.BufferGeometry;
      if (cfg.type === 'cone') {
        geo = new THREE.ConeGeometry(0.3 * cfg.scale, 0.8 * cfg.scale, 5);
      } else {
        geo = new THREE.TetrahedronGeometry(0.4 * cfg.scale);
      }
      const mesh = new THREE.Mesh(geo, scrubMat);
      mesh.position.copy(cfg.pos);
      mesh.position.y = (cfg.type === 'cone' ? 0.4 : 0.3) * cfg.scale;
      // Random rotation for variety
      mesh.rotation.y = Math.random() * Math.PI * 2;
      this.sceneGroup.add(mesh);
    }
  }

  // ─── Road glow toggle ────────────────────────────────────────────────────

  private setRoadGlow(on: boolean): void {
    this.roadGlowing = on;
    for (const mesh of this.roadGlowMeshes) {
      mesh.visible = on;
    }
  }
}
