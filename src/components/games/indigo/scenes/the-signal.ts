/**
 * Scene 5: The Signal — The Finale
 *
 * The radio tower again, but everything is different. The fog is gone.
 * The sky is vast and clear. All the threads converge.
 * This is the emotional climax.
 */

import * as THREE from 'three';
import type { IndigoScene, SceneContext, SceneCharacter, SceneInteractable } from './types';
import { registerScene } from '../engine/scene-manager';
import { registerDialogue } from '../narrative/dialogue-system';
import {
  createPearlescentMaterial,
  createWireframeMaterial,
  createGroundMaterial,
  createSkyMaterial,
} from '../engine/shaders';
import { INDIGO_PALETTE, getPearlescentColor } from '../engine/palette';
import { Signal } from '../entities/characters/signal';
import {
  SCENE_FOG,
  getVisualParams,
  getDustMoteConfig,
  createDustMotes,
  computeIntensity,
} from '../engine/atmosphere';

// ─── Constants ──────────────────────────────────────────────────────────────

const TOWER_HEIGHT = 32; // Taller than Scene 1
const TOWER_BASE_RADIUS = 1.2;
const TOWER_TOP_RADIUS = 0.3;
const TOWER_SEGMENTS = 8;
const TOWER_POSITION = new THREE.Vector3(0, 0, 0);

const BEACON_POSITION = new THREE.Vector3(0, TOWER_HEIGHT + 1, 0);
const BEACON_COLOR = new THREE.Color(0xffe8c8); // Steady warm light

const CRYSTAL_COUNT = 12;
const CRYSTAL_SPREAD = 25;

const STAR_POINT_COUNT = 300;
const STAR_SPREAD = 120;

const DIORAMA_DISTANCE = 60; // How far back the miniature road stretches
const DIORAMA_SCENE_COUNT = 4;

const SPAWN_POINT = new THREE.Vector3(0, 1.7, 20);

// Signal character position — base of the tower
const SIGNAL_POSITION = new THREE.Vector3(0, 0.5, 4);

// Fog tuned by atmosphere system
const SIGNAL_FOG = SCENE_FOG['the-signal'];

// ─── Dialogue ───────────────────────────────────────────────────────────────

registerDialogue('the-signal', {
  characterId: 'signal',
  lines: [
    {
      text: 'You tuned through static / and found these stations. / Each one a room / in a house with no floor plan.',
      pause: 4,
      tone: 'warm',
    },
    {
      text: 'The road was the hallway. / The lake was the window. / The tower was always / just a way of listening.',
      pause: 4,
      tone: 'bright',
    },
    {
      text: 'Every frequency carries / something someone stopped saying / out loud — a thought released / into the wire, still traveling.',
      pause: 4.5,
      tone: 'hollow',
    },
    {
      text: 'You are that kind of signal now. / Not the tower. Not the road. / The space between stations / where the music lives.',
      pause: 4,
      tone: 'warm',
    },
    {
      text: 'Thank you for listening.',
      pause: 6, // Long hold for the final line
      tone: 'bright',
    },
  ],
  spentLine: 'The frequency hums. / You are still listening.',
}, {
  cameraLookOffset: { x: 0, y: 4.0, z: 0 },
  cameraDistance: 6,
  cameraHeight: 2.5,
  textOffset: { x: 0, y: 6.5, z: 0 },
});

// ─── Scene Implementation ───────────────────────────────────────────────────

class TheSignalScene implements IndigoScene {
  readonly id = 'the-signal' as const;
  readonly title = 'The Signal';
  readonly subtitle = 'All frequencies resolve.';

  // Character
  private signalCharacter: Signal | null = null;

  // Geometry groups for cleanup
  private sceneObjects: THREE.Object3D[] = [];

  // Animated objects
  private crystals: THREE.Mesh[] = [];
  private crystalMaterials: THREE.ShaderMaterial[] = [];
  private towerWireMaterial: THREE.ShaderMaterial | null = null;
  private beaconLight: THREE.PointLight | null = null;
  private groundMesh: THREE.Mesh | null = null;
  private groundMaterial: THREE.ShaderMaterial | null = null;
  private dustMotes: { points: THREE.Points; update: (elapsed: number) => void; dispose: () => void } | null = null;

  // Post-dialogue state
  private dialogueComplete = false;
  private endingPhase: 'none' | 'fog-in' | 'title-card' | 'complete' = 'none';
  private endingElapsed = 0;
  private endingOverlay: HTMLDivElement | null = null;

  // ─── Lifecycle ────────────────────────────────────────────────────────

  setup(ctx: SceneContext): void {
    const { renderer } = ctx;
    const scene = renderer.scene;

    // Apply atmosphere-tuned fog (clear sky — the fog is gone)
    scene.fog = new THREE.FogExp2(SIGNAL_FOG.color, SIGNAL_FOG.density);
    scene.background = SIGNAL_FOG.color.clone();

    const visual = getVisualParams(ctx.gameState.emotionalIntensity);

    // ─── Sky dome (clear, full of stars, deep indigo) ──────────────
    const skyGeo = new THREE.SphereGeometry(150, 32, 32);
    const skyMat = createSkyMaterial({
      starDensity: visual.starDensity,
      signalFlicker: visual.signalFlicker,
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    skyDome.name = 'sky_dome_signal';
    scene.add(skyDome);
    this.sceneObjects.push(skyDome);

    // ─── Ground — breathing, undulating ────────────────────────────
    const groundGeo = new THREE.PlaneGeometry(120, 120, 80, 80);
    groundGeo.rotateX(-Math.PI / 2);
    this.groundMaterial = createGroundMaterial({
      gridScale: 1.2,
      fadeDistance: 50,
      pulseSpeed: 0.4,
    });
    this.groundMesh = new THREE.Mesh(groundGeo, this.groundMaterial);
    this.groundMesh.position.y = -0.5;
    this.groundMesh.name = 'ground_signal';
    scene.add(this.groundMesh);
    this.sceneObjects.push(this.groundMesh);

    // ─── Radio Tower (taller, glowing wireframe) ──────────────────
    this.buildTower(scene);

    // ─── Beacon (steady warm light, not pulsing) ──────────────────
    this.beaconLight = new THREE.PointLight(BEACON_COLOR, 3, 60, 1.5);
    this.beaconLight.position.copy(BEACON_POSITION);
    scene.add(this.beaconLight);
    this.sceneObjects.push(this.beaconLight);

    // Small emissive sphere at beacon
    const beaconGeo = new THREE.SphereGeometry(0.4, 8, 6);
    const beaconMat = new THREE.MeshBasicMaterial({ color: BEACON_COLOR });
    const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    beaconMesh.position.copy(BEACON_POSITION);
    scene.add(beaconMesh);
    this.sceneObjects.push(beaconMesh);

    // ─── Geometric crystals (rotating polyhedra) ──────────────────
    this.buildCrystals(scene);

    // ─── Diorama road (miniature of past scenes) ──────────────────
    this.buildDiorama(scene);

    // ─── Distant geometric shapes on horizon ─────────────────────
    this.buildDistantTowers(scene);

    // ─── The Signal character ─────────────────────────────────────
    this.signalCharacter = new Signal({ position: SIGNAL_POSITION.clone() });
    this.signalCharacter.addToScene(scene);
    this.sceneObjects.push(this.signalCharacter.group);

    // ─── Dust motes ──────────────────────────────────────────────
    const dustConfig = getDustMoteConfig(ctx.gameState.emotionalIntensity);
    const dustResult = createDustMotes(dustConfig);
    if (dustResult) {
      this.dustMotes = dustResult;
      scene.add(dustResult.points);
      this.sceneObjects.push(dustResult.points);
    }

    // ─── Listen for dialogue completion ───────────────────────────
    // The scene triggers ending sequence after dialogue
  }

  update(ctx: SceneContext, delta: number, elapsed: number): void {
    // Compute intra-scene emotional intensity
    const sceneState = ctx.gameState.getSceneState('the-signal');
    const sceneProgress = sceneState.charactersSpokenTo.has('signal') ? 1 : 0;
    const intensity = computeIntensity('the-signal', sceneProgress);
    ctx.gameState.setEmotionalIntensity(intensity);

    // Update dust motes
    this.dustMotes?.update(elapsed);

    // Update character animation
    this.signalCharacter?.update(delta, elapsed);

    // Breathe the ground (gentle vertex displacement)
    this.animateGround(elapsed);

    // Rotate crystals
    this.animateCrystals(elapsed);

    // Update tower wireframe color cycling
    if (this.towerWireMaterial) {
      const color = getPearlescentColor(elapsed * 0.08);
      this.towerWireMaterial.uniforms.uSignalViolet.value.copy(color);
    }

    // Check for dialogue completion → trigger ending
    if (!this.dialogueComplete) {
      const sceneState = ctx.gameState.getSceneState('the-signal');
      if (sceneState.charactersSpokenTo.has('signal')) {
        this.dialogueComplete = true;
        this.startEndingSequence(ctx);
      }
    }

    // Update ending sequence
    if (this.endingPhase !== 'none') {
      this.updateEnding(ctx, delta);
    }
  }

  cleanup(ctx: SceneContext): void {
    const scene = ctx.renderer.scene;

    // Remove all scene objects
    for (const obj of this.sceneObjects) {
      scene.remove(obj);
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
    this.sceneObjects = [];

    // Dispose character
    if (this.signalCharacter) {
      this.signalCharacter.removeFromScene(scene);
      this.signalCharacter.dispose();
      this.signalCharacter = null;
    }

    // Dispose crystal materials
    for (const mat of this.crystalMaterials) {
      mat.dispose();
    }
    this.crystalMaterials = [];
    this.crystals = [];

    // Remove ending overlay
    if (this.endingOverlay?.parentElement) {
      this.endingOverlay.parentElement.removeChild(this.endingOverlay);
      this.endingOverlay = null;
    }

    this.towerWireMaterial = null;
    this.beaconLight = null;
    this.groundMesh = null;
    this.groundMaterial = null;
    this.dialogueComplete = false;
    this.endingPhase = 'none';
    this.endingElapsed = 0;

    if (this.dustMotes) {
      this.dustMotes.dispose();
      this.dustMotes = null;
    }
  }

  getSpawnPoint(): THREE.Vector3 {
    return SPAWN_POINT.clone();
  }

  getCharacters(): SceneCharacter[] {
    if (!this.signalCharacter) return [];
    return [{
      id: 'signal',
      name: 'The Signal',
      position: SIGNAL_POSITION.clone(),
      object: this.signalCharacter.group,
    }];
  }

  getInteractables(): SceneInteractable[] {
    return [{
      id: 'signal-character',
      position: SIGNAL_POSITION.clone(),
      radius: 12,
      object: this.signalCharacter?.group,
      onInteract: undefined, // handled by dialogue system
    }];
  }

  // ─── Tower Construction ───────────────────────────────────────────────

  private buildTower(scene: THREE.Scene): void {
    // Tower frame: tapered cylinder wireframe
    const towerGeo = new THREE.CylinderGeometry(
      TOWER_TOP_RADIUS,
      TOWER_BASE_RADIUS,
      TOWER_HEIGHT,
      TOWER_SEGMENTS,
      20
    );
    const wireGeo = new THREE.WireframeGeometry(towerGeo);
    this.towerWireMaterial = createWireframeMaterial({ glowIntensity: 2.0 });
    const towerWire = new THREE.LineSegments(wireGeo, this.towerWireMaterial);
    towerWire.position.set(
      TOWER_POSITION.x,
      TOWER_POSITION.y + TOWER_HEIGHT / 2,
      TOWER_POSITION.z
    );
    towerWire.name = 'tower_wireframe_signal';
    scene.add(towerWire);
    this.sceneObjects.push(towerWire);

    // Cross-bracing for visual complexity
    const bracingGroup = new THREE.Group();
    bracingGroup.name = 'tower_bracing';
    const bracingCount = 6;
    for (let i = 0; i < bracingCount; i++) {
      const t = (i + 0.5) / bracingCount;
      const y = t * TOWER_HEIGHT;
      const radius = THREE.MathUtils.lerp(TOWER_BASE_RADIUS, TOWER_TOP_RADIUS, t);
      const ringGeo = new THREE.TorusGeometry(radius * 0.9, 0.02, 4, TOWER_SEGMENTS);
      const ringWire = new THREE.WireframeGeometry(ringGeo);
      const ring = new THREE.LineSegments(ringWire, this.towerWireMaterial);
      ring.position.y = y;
      ring.rotation.x = Math.PI / 2;
      bracingGroup.add(ring);
    }
    scene.add(bracingGroup);
    this.sceneObjects.push(bracingGroup);
  }

  // ─── Crystals ─────────────────────────────────────────────────────────

  private buildCrystals(scene: THREE.Scene): void {
    const geometries = [
      new THREE.IcosahedronGeometry(0.5, 0),
      new THREE.OctahedronGeometry(0.6, 0),
      new THREE.TetrahedronGeometry(0.5, 0),
      new THREE.DodecahedronGeometry(0.4, 0),
    ];

    for (let i = 0; i < CRYSTAL_COUNT; i++) {
      const geo = geometries[i % geometries.length];
      const mat = createPearlescentMaterial({
        fresnelPower: 2.5,
        opacity: 0.85,
      });
      this.crystalMaterials.push(mat);

      const crystal = new THREE.Mesh(geo, mat);

      // Scatter around the tower, avoiding the path
      const angle = (i / CRYSTAL_COUNT) * Math.PI * 2 + Math.random() * 0.3;
      const dist = 6 + Math.random() * (CRYSTAL_SPREAD - 6);
      crystal.position.set(
        Math.cos(angle) * dist,
        0.3 + Math.random() * 0.5,
        Math.sin(angle) * dist
      );
      crystal.scale.setScalar(0.5 + Math.random() * 0.8);
      crystal.name = `crystal_${i}`;

      scene.add(crystal);
      this.sceneObjects.push(crystal);
      this.crystals.push(crystal);
    }
  }

  // ─── Diorama (miniature past scenes) ──────────────────────────────────

  private buildDiorama(scene: THREE.Scene): void {
    // A road stretching backward with tiny scene markers
    const roadGroup = new THREE.Group();
    roadGroup.name = 'diorama_road';

    // Road line — thin wireframe plane
    const roadGeo = new THREE.PlaneGeometry(1.5, DIORAMA_DISTANCE, 1, 20);
    roadGeo.rotateX(-Math.PI / 2);
    const roadMat = createWireframeMaterial({ glowIntensity: 0.6, baseOpacity: 0.4 });
    const road = new THREE.LineSegments(new THREE.WireframeGeometry(roadGeo), roadMat);
    road.position.set(0, 0.02, -(DIORAMA_DISTANCE / 2 + 5));
    roadGroup.add(road);

    // Scene markers along the road (tiny geometric symbols)
    const sceneSymbols = [
      { name: 'tower', geo: new THREE.ConeGeometry(0.2, 0.8, 4), z: -10 },
      { name: 'station', geo: new THREE.BoxGeometry(0.5, 0.3, 0.3), z: -25 },
      { name: 'lake', geo: new THREE.SphereGeometry(0.25, 6, 4), z: -40 },
      { name: 'motel', geo: new THREE.BoxGeometry(0.4, 0.25, 0.2), z: -55 },
    ];

    for (const sym of sceneSymbols) {
      const mat = createPearlescentMaterial({ fresnelPower: 2, opacity: 0.7 });
      const mesh = new THREE.Mesh(sym.geo, mat);
      mesh.position.set(0, 0.4, sym.z);
      mesh.scale.setScalar(0.5);
      mesh.name = `diorama_${sym.name}`;
      roadGroup.add(mesh);
      this.crystalMaterials.push(mat); // reuse array for cleanup
    }

    scene.add(roadGroup);
    this.sceneObjects.push(roadGroup);
  }

  // ─── Distant towers on horizon ────────────────────────────────────────

  private buildDistantTowers(scene: THREE.Scene): void {
    const distantGroup = new THREE.Group();
    distantGroup.name = 'distant_towers';

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + 0.3;
      const dist = 80 + Math.random() * 30;
      const height = 8 + Math.random() * 12;

      const geo = new THREE.CylinderGeometry(0.15, 0.4, height, 4, 4);
      const wireGeo = new THREE.WireframeGeometry(geo);
      const mat = createWireframeMaterial({ glowIntensity: 0.5, baseOpacity: 0.3 });
      const tower = new THREE.LineSegments(wireGeo, mat);
      tower.position.set(
        Math.cos(angle) * dist,
        height / 2,
        Math.sin(angle) * dist
      );

      distantGroup.add(tower);
      this.crystalMaterials.push(mat); // cleanup
    }

    scene.add(distantGroup);
    this.sceneObjects.push(distantGroup);
  }

  // ─── Animations ───────────────────────────────────────────────────────

  private animateGround(elapsed: number): void {
    if (!this.groundMesh) return;
    const geo = this.groundMesh.geometry;
    const posAttr = geo.getAttribute('position');
    if (!posAttr) return;

    // Gentle breathing — sine wave on Y
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const dist = Math.sqrt(x * x + z * z);
      const breathe = Math.sin(elapsed * 0.3 + dist * 0.05) * 0.15;
      posAttr.setY(i, breathe);
    }
    posAttr.needsUpdate = true;
    geo.computeVertexNormals();
  }

  private animateCrystals(elapsed: number): void {
    for (let i = 0; i < this.crystals.length; i++) {
      const crystal = this.crystals[i];
      // Slow individual rotation
      crystal.rotation.y = elapsed * (0.1 + i * 0.02);
      crystal.rotation.x = Math.sin(elapsed * 0.15 + i) * 0.3;
      // Gentle bob
      crystal.position.y = 0.3 + Math.sin(elapsed * 0.25 + i * 1.3) * 0.2;
    }
  }

  // ─── Ending Sequence ──────────────────────────────────────────────────

  private startEndingSequence(ctx: SceneContext): void {
    // Delay before the fog starts rolling in
    setTimeout(() => {
      this.endingPhase = 'fog-in';
      this.endingElapsed = 0;
    }, 2000);
  }

  private updateEnding(ctx: SceneContext, delta: number): void {
    this.endingElapsed += delta;

    switch (this.endingPhase) {
      case 'fog-in': {
        // Warm pearlescent fog fills the screen over 8 seconds
        const t = Math.min(this.endingElapsed / 8, 1);
        const eased = t * t * (3 - 2 * t); // smoothstep
        const fogDensity = THREE.MathUtils.lerp(0.004, 0.6, eased);
        const fogColor = new THREE.Color(0x1a1525).lerp(
          new THREE.Color(0xe8dff5), eased * 0.3
        );
        ctx.renderer.scene.fog = new THREE.FogExp2(fogColor, fogDensity);
        ctx.renderer.scene.background = fogColor;

        if (t >= 1) {
          this.endingPhase = 'title-card';
          this.endingElapsed = 0;
          this.showTitleCard(ctx);
        }
        break;
      }

      case 'title-card': {
        // Title card fades in and holds
        const t = Math.min(this.endingElapsed / 3, 1);
        if (this.endingOverlay) {
          this.endingOverlay.style.opacity = String(t);
        }

        // After 8 seconds total on title card, show "Tune again?" prompt
        if (this.endingElapsed > 8 && this.endingOverlay) {
          const prompt = this.endingOverlay.querySelector('[data-restart]');
          if (prompt instanceof HTMLElement) {
            prompt.style.opacity = '1';
            prompt.style.pointerEvents = 'auto';
          }
        }
        break;
      }
    }
  }

  private showTitleCard(ctx: SceneContext): void {
    const container = ctx.renderer.renderer.domElement.parentElement;
    if (!container) return;

    this.endingOverlay = document.createElement('div');
    this.endingOverlay.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(26, 21, 37, 0.85);
      opacity: 0;
      transition: opacity 3s ease;
      z-index: 30;
    `;

    // Title
    const title = document.createElement('h1');
    title.textContent = 'The Indigo Frequency';
    title.style.cssText = `
      font-family: 'EB Garamond', serif;
      font-size: 2.4rem;
      font-weight: 400;
      letter-spacing: 0.12em;
      color: #e8dff5;
      text-shadow: 0 0 20px rgba(107, 63, 160, 0.5), 0 0 40px rgba(26, 0, 51, 0.3);
      margin: 0 0 0.8em;
    `;
    this.endingOverlay.appendChild(title);

    // Subtitle
    const subtitle = document.createElement('p');
    subtitle.textContent = 'You were listening.';
    subtitle.style.cssText = `
      font-family: 'EB Garamond', serif;
      font-size: 1.1rem;
      font-style: italic;
      letter-spacing: 0.08em;
      color: #e8dff5;
      opacity: 0.6;
      margin: 0 0 3em;
    `;
    this.endingOverlay.appendChild(subtitle);

    // Restart prompt (hidden initially)
    const restart = document.createElement('button');
    restart.setAttribute('data-restart', '');
    restart.textContent = 'Tune again?';
    restart.style.cssText = `
      font-family: 'EB Garamond', serif;
      font-size: 1rem;
      letter-spacing: 0.06em;
      color: #e8dff5;
      opacity: 0;
      pointer-events: none;
      background: none;
      border: 1px solid rgba(107, 63, 160, 0.4);
      padding: 0.6em 1.6em;
      border-radius: 2em;
      cursor: pointer;
      transition: opacity 2s ease, background 0.3s ease;
    `;
    restart.addEventListener('mouseenter', () => {
      restart.style.background = 'rgba(107, 63, 160, 0.2)';
    });
    restart.addEventListener('mouseleave', () => {
      restart.style.background = 'none';
    });
    restart.addEventListener('click', () => {
      // Reset game state and return to scene 1
      ctx.gameState.reset();
      ctx.requestTransition('radio-tower');
      // Clean up overlay
      if (this.endingOverlay?.parentElement) {
        this.endingOverlay.style.opacity = '0';
        setTimeout(() => {
          this.endingOverlay?.parentElement?.removeChild(this.endingOverlay!);
          this.endingOverlay = null;
        }, 1000);
      }
    });
    this.endingOverlay.appendChild(restart);

    container.appendChild(this.endingOverlay);
  }
}

// ─── Register ───────────────────────────────────────────────────────────────

registerScene('the-signal', () => new TheSignalScene());

export { TheSignalScene };
