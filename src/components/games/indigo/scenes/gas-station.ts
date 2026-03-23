import * as THREE from 'three';
import type { IndigoScene, SceneContext, SceneCharacter, SceneInteractable } from './types';
import { Traveler } from '../entities';
import { registerDialogue } from '../narrative';
import {
  createPearlescentMaterial,
  createWireframeMaterial,
  createGroundMaterial,
  createSkyMaterial,
  updateShaderTime,
} from '../engine/shaders';
import { INDIGO_PALETTE } from '../engine/palette';
import type { SceneId } from '../engine/game-state';
import {
  SCENE_FOG,
  SCENE_COLORS,
  getVisualParams,
  getDustMoteConfig,
  createDustMotes,
  computeIntensity,
} from '../engine/atmosphere';

// ─── Constants ───────────────────────────────────────────────────────────────

const SPAWN_POINT = new THREE.Vector3(0, 1.7, 18);

// ─── Dialogue Registration ───────────────────────────────────────────────────

registerDialogue('gas-station', {
  characterId: 'traveler',
  lines: [
    {
      text: 'I measured the distance / from here to the mountain / in units of almost. / Thirteen almosts exactly.',
      pause: 3.5,
      tone: 'warm',
    },
    {
      text: 'The car had wheels once. / Or maybe the road had more give. / Either way, I\'m here.',
      pause: 3.0,
      tone: 'hollow',
    },
    {
      text: 'You\'ll find the lake next. / It holds things the sky drops. / Careful what you show it.',
      pause: 2.5,
      tone: 'cold',
    },
  ],
  spentLine: 'Thirteen almosts...',
}, {
  cameraDistance: 5.0,
  cameraHeight: 2.2,
  cameraLookOffset: { x: 0, y: 2.0, z: 0 },
  textOffset: { x: 0, y: 3.8, z: 0 },
});

// ─── Scene Implementation ────────────────────────────────────────────────────

export class GasStationScene implements IndigoScene {
  readonly id: SceneId = 'gas-station';
  readonly title = 'The Gas Station';
  readonly subtitle = 'Everything hums here.';

  // ─── Scene objects tracked for cleanup ─────────────────────────────────
  private sceneObjects: THREE.Object3D[] = [];
  private materials: THREE.Material[] = [];

  // ─── Characters & interactables ────────────────────────────────────────
  private traveler: Traveler | null = null;

  // ─── Animated elements ─────────────────────────────────────────────────
  private moths: { mesh: THREE.Mesh; phase: number; speed: number; radius: number; yOffset: number }[] = [];
  private pumpParticles: THREE.Points[] = [];
  private roadUnlocked = false;
  private roadGlow: THREE.Mesh | null = null;
  private roadGlowMaterial: THREE.MeshBasicMaterial | null = null;
  private dustMotes: { points: THREE.Points; update: (elapsed: number) => void; dispose: () => void } | null = null;

  // ─── Lifecycle ─────────────────────────────────────────────────────────

  setup(ctx: SceneContext): void {
    const scene = ctx.renderer.scene;

    // Apply atmosphere-tuned fog
    const fog = SCENE_FOG['gas-station'];
    scene.fog = new THREE.FogExp2(fog.color, fog.density);
    scene.background = fog.color.clone();

    // Check if the objective was already met (returning to scene)
    this.roadUnlocked = ctx.gameState.isObjectiveMet('gas-station');

    this.buildSky(scene, ctx);
    this.buildGround(scene, ctx);
    this.buildRoad(scene, ctx);
    this.buildStation(scene, ctx);
    this.buildPumps(scene);
    this.buildCar(scene, ctx);
    this.buildOverheadLight(scene);
    this.buildMoths(scene);
    this.buildHorizon(scene, ctx);
    this.buildTraveler(scene, ctx);

    // Add atmosphere dust motes
    const dustConfig = getDustMoteConfig(ctx.gameState.emotionalIntensity);
    const dustResult = createDustMotes(dustConfig);
    if (dustResult) {
      this.dustMotes = dustResult;
      this.addToScene(scene, dustResult.points);
    }

    if (this.roadUnlocked) {
      this.showRoadGlow(scene);
    }
  }

  update(ctx: SceneContext, delta: number, elapsed: number): void {
    // Compute intra-scene emotional intensity ramp
    const sceneState = ctx.gameState.getSceneState('gas-station');
    const objectivesDone = sceneState.charactersSpokenTo.has('traveler') ? 1 : 0;
    const sceneProgress = objectivesDone;
    const intensity = computeIntensity('gas-station', sceneProgress);
    ctx.gameState.setEmotionalIntensity(intensity);

    // Get atmosphere-driven mood for shaders
    const visual = getVisualParams(intensity);
    updateShaderTime(ctx.renderer.scene, elapsed, visual.shaderMood);

    // Update character
    this.traveler?.update(delta, elapsed);

    // Animate moths
    this.updateMoths(elapsed);

    // Animate pump heat shimmer particles
    this.updatePumpParticles(elapsed);

    // Animate dust motes
    this.dustMotes?.update(elapsed);

    // Animate road glow pulse
    if (this.roadGlowMaterial && this.roadUnlocked) {
      this.roadGlowMaterial.opacity = 0.15 + Math.sin(elapsed * 0.8) * 0.08;
    }

    // Check if dialogue just unlocked progression
    if (!this.roadUnlocked && sceneState.charactersSpokenTo.has('traveler')) {
      this.roadUnlocked = true;
      ctx.gameState.markObjectiveMet('gas-station');
      this.showRoadGlow(ctx.renderer.scene);
    }
  }

  cleanup(ctx: SceneContext): void {
    const scene = ctx.renderer.scene;

    // Remove character
    if (this.traveler) {
      this.traveler.removeFromScene(scene);
      this.traveler.dispose();
      this.traveler = null;
    }

    // Remove all scene objects
    for (const obj of this.sceneObjects) {
      scene.remove(obj);
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments || child instanceof THREE.Points) {
          child.geometry.dispose();
        }
      });
    }
    this.sceneObjects = [];

    // Dispose materials
    for (const mat of this.materials) {
      mat.dispose();
    }
    this.materials = [];

    this.moths = [];
    this.pumpParticles = [];
    this.roadGlow = null;
    this.roadGlowMaterial = null;

    // Dispose dust motes
    if (this.dustMotes) {
      this.dustMotes.dispose();
      this.dustMotes = null;
    }
  }

  getSpawnPoint(): THREE.Vector3 {
    return SPAWN_POINT.clone();
  }

  getCharacters(): SceneCharacter[] {
    if (!this.traveler) return [];
    return [{
      id: 'traveler',
      name: 'The Traveler',
      position: this.traveler.getWorldPosition(),
      object: this.traveler.group,
    }];
  }

  getInteractables(): SceneInteractable[] {
    return [];
  }

  // ─── Scene Construction ────────────────────────────────────────────────

  private addToScene(scene: THREE.Scene, obj: THREE.Object3D): void {
    scene.add(obj);
    this.sceneObjects.push(obj);
  }

  private trackMaterial(mat: THREE.Material): void {
    this.materials.push(mat);
  }

  // --- Sky dome ---

  private buildSky(scene: THREE.Scene, ctx: SceneContext): void {
    const visual = getVisualParams(ctx.gameState.emotionalIntensity);
    const skyMat = createSkyMaterial({ mood: visual.shaderMood, starDensity: visual.starDensity, signalFlicker: visual.signalFlicker });
    this.trackMaterial(skyMat);

    const skyGeo = new THREE.SphereGeometry(180, 32, 32);
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.name = 'sky';
    this.addToScene(scene, sky);
  }

  // --- Ground plane: cracked asphalt ---

  private buildGround(scene: THREE.Scene, ctx: SceneContext): void {
    const visual = getVisualParams(ctx.gameState.emotionalIntensity);
    const groundMat = createGroundMaterial({
      mood: visual.shaderMood,
      gridScale: 1.2,
      fadeDistance: 50,
      pulseSpeed: 0.3,
    });
    this.trackMaterial(groundMat);

    // Main ground — large plane with displaced vertices for "cracked" feel
    const groundGeo = new THREE.PlaneGeometry(120, 120, 60, 60);
    groundGeo.rotateX(-Math.PI / 2);

    // Displace vertices for cracks/irregularity
    const posAttr = groundGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      // Subtle noise displacement
      const noise = Math.sin(x * 0.7) * Math.cos(z * 0.5) * 0.08
        + Math.sin(x * 2.3 + z * 1.7) * 0.03;
      posAttr.setY(i, noise);
    }
    posAttr.needsUpdate = true;
    groundGeo.computeVertexNormals();

    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.name = 'ground';
    this.addToScene(scene, ground);
  }

  // --- Road through the scene ---

  private buildRoad(scene: THREE.Scene, ctx: SceneContext): void {
    const visual = getVisualParams(ctx.gameState.emotionalIntensity);
    const roadMat = createWireframeMaterial({ mood: visual.shaderMood, glowIntensity: 0.8, baseOpacity: 0.5 });
    this.trackMaterial(roadMat);

    // Road: narrow plane running north-south through the station
    const roadGeo = new THREE.PlaneGeometry(6, 120, 6, 60);
    roadGeo.rotateX(-Math.PI / 2);
    // Raise road slightly above ground
    const roadPosAttr = roadGeo.attributes.position;
    for (let i = 0; i < roadPosAttr.count; i++) {
      roadPosAttr.setY(i, 0.02);
    }
    roadPosAttr.needsUpdate = true;

    const road = new THREE.LineSegments(
      new THREE.WireframeGeometry(roadGeo),
      roadMat,
    );
    road.name = 'road';
    this.addToScene(scene, road);

    // Center line — dashed suggestion
    const centerGeo = new THREE.BufferGeometry();
    const centerVerts: number[] = [];
    for (let z = -55; z < 55; z += 3) {
      centerVerts.push(0, 0.04, z, 0, 0.04, z + 1.5);
    }
    centerGeo.setAttribute('position', new THREE.Float32BufferAttribute(centerVerts, 3));

    const centerMat = new THREE.LineBasicMaterial({
      color: INDIGO_PALETTE.duskAmber,
      transparent: true,
      opacity: 0.25,
    });
    this.trackMaterial(centerMat);

    const centerLine = new THREE.LineSegments(centerGeo, centerMat);
    centerLine.name = 'centerLine';
    this.addToScene(scene, centerLine);
  }

  // --- Station building ---

  private buildStation(scene: THREE.Scene, ctx: SceneContext): void {
    const visual = getVisualParams(ctx.gameState.emotionalIntensity);
    const stationMat = createPearlescentMaterial({ mood: visual.shaderMood, opacity: 0.85 });
    this.trackMaterial(stationMat);

    const stationGroup = new THREE.Group();
    stationGroup.position.set(-8, 0, 0);
    stationGroup.name = 'station';

    // Main building box
    const buildingGeo = new THREE.BoxGeometry(6, 3.5, 5);
    const building = new THREE.Mesh(buildingGeo, stationMat);
    building.position.y = 1.75;
    stationGroup.add(building);

    // Flat roof overhang
    const roofGeo = new THREE.BoxGeometry(8, 0.15, 6);
    const roof = new THREE.Mesh(roofGeo, stationMat);
    roof.position.y = 3.6;
    stationGroup.add(roof);

    // Window — glowing plane
    const windowMat = new THREE.MeshBasicMaterial({
      color: INDIGO_PALETTE.duskAmber,
      transparent: true,
      opacity: 0.35,
    });
    this.trackMaterial(windowMat);

    const windowGeo = new THREE.PlaneGeometry(2.0, 1.2);
    const windowPane = new THREE.Mesh(windowGeo, windowMat);
    windowPane.position.set(3.01, 2.2, 0);
    windowPane.rotation.y = Math.PI / 2;
    stationGroup.add(windowPane);

    // Door — darker rectangle
    const doorMat = new THREE.MeshBasicMaterial({
      color: INDIGO_PALETTE.voidBlack,
      transparent: true,
      opacity: 0.8,
    });
    this.trackMaterial(doorMat);

    const doorGeo = new THREE.PlaneGeometry(1.2, 2.5);
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(3.01, 1.25, -1.5);
    door.rotation.y = Math.PI / 2;
    stationGroup.add(door);

    // Wireframe outline of the building for that geometric feel
    const buildingWire = new THREE.LineSegments(
      new THREE.EdgesGeometry(buildingGeo),
      new THREE.LineBasicMaterial({ color: INDIGO_PALETTE.signalViolet, transparent: true, opacity: 0.4 }),
    );
    buildingWire.position.y = 1.75;
    stationGroup.add(buildingWire);

    this.addToScene(scene, stationGroup);
  }

  // --- Gas pumps ---

  private buildPumps(scene: THREE.Scene): void {
    const pumpMat = createPearlescentMaterial({ opacity: 0.9 });
    this.trackMaterial(pumpMat);

    for (const xOff of [-1.5, 1.5]) {
      const pumpGroup = new THREE.Group();
      pumpGroup.position.set(-4 + xOff, 0, 4);
      pumpGroup.name = `pump_${xOff > 0 ? 'right' : 'left'}`;

      // Pump body — tall rectangular prism
      const bodyGeo = new THREE.BoxGeometry(0.6, 1.8, 0.4);
      const body = new THREE.Mesh(bodyGeo, pumpMat);
      body.position.y = 0.9;
      pumpGroup.add(body);

      // Pump top — small display area
      const topGeo = new THREE.BoxGeometry(0.5, 0.3, 0.35);
      const top = new THREE.Mesh(topGeo, pumpMat);
      top.position.y = 2.0;
      pumpGroup.add(top);

      // Nozzle — small cylinder extending out
      const nozzleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 4);
      const nozzle = new THREE.Mesh(nozzleGeo, pumpMat);
      nozzle.position.set(0.35, 1.4, 0);
      nozzle.rotation.z = Math.PI / 3;
      pumpGroup.add(nozzle);

      // Wireframe outline
      const wireEdge = new THREE.LineSegments(
        new THREE.EdgesGeometry(bodyGeo),
        new THREE.LineBasicMaterial({ color: INDIGO_PALETTE.signalViolet, transparent: true, opacity: 0.5 }),
      );
      wireEdge.position.y = 0.9;
      pumpGroup.add(wireEdge);

      this.addToScene(scene, pumpGroup);

      // Heat shimmer particles above pump
      this.buildPumpShimmer(scene, pumpGroup.position);
    }
  }

  private buildPumpShimmer(scene: THREE.Scene, pumpPos: THREE.Vector3): void {
    const count = 30;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = pumpPos.x + (Math.random() - 0.5) * 0.4;
      positions[i * 3 + 1] = pumpPos.y + 2.2 + Math.random() * 1.5;
      positions[i * 3 + 2] = pumpPos.z + (Math.random() - 0.5) * 0.4;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: INDIGO_PALETTE.signalViolet,
      size: 0.04,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.trackMaterial(mat);

    const points = new THREE.Points(geo, mat);
    points.name = 'pumpShimmer';
    this.addToScene(scene, points);
    this.pumpParticles.push(points);
  }

  // --- The wheelless car (separate from character for placement control) ---

  private buildCar(scene: THREE.Scene, ctx: SceneContext): void {
    const visual = getVisualParams(ctx.gameState.emotionalIntensity);
    const carMat = createPearlescentMaterial({ mood: visual.shaderMood, opacity: 0.85 });
    this.trackMaterial(carMat);

    const carGroup = new THREE.Group();
    carGroup.position.set(6, 0, -2);
    carGroup.rotation.y = -0.15;
    carGroup.name = 'wheelless_car';

    // Car body
    const bodyGeo = new THREE.BoxGeometry(3.2, 0.7, 1.4);
    const body = new THREE.Mesh(bodyGeo, carMat);
    body.position.y = 0.45;
    carGroup.add(body);

    // Cabin
    const cabinGeo = new THREE.BoxGeometry(1.6, 0.55, 1.2);
    const cabin = new THREE.Mesh(cabinGeo, carMat);
    cabin.position.set(-0.3, 1.05, 0);
    carGroup.add(cabin);

    // Axle stubs — no wheels, just geometric suggestion that something is missing
    for (const xOff of [-1.0, 1.0]) {
      const axleGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.6, 4);
      const axle = new THREE.Mesh(axleGeo, carMat);
      axle.position.set(xOff, 0.12, 0);
      axle.rotation.x = Math.PI / 2;
      carGroup.add(axle);
    }

    // Wireframe edges for that clean geometric look
    const bodyWire = new THREE.LineSegments(
      new THREE.EdgesGeometry(bodyGeo),
      new THREE.LineBasicMaterial({ color: INDIGO_PALETTE.signalViolet, transparent: true, opacity: 0.35 }),
    );
    bodyWire.position.y = 0.45;
    carGroup.add(bodyWire);

    const cabinWire = new THREE.LineSegments(
      new THREE.EdgesGeometry(cabinGeo),
      new THREE.LineBasicMaterial({ color: INDIGO_PALETTE.signalViolet, transparent: true, opacity: 0.35 }),
    );
    cabinWire.position.set(-0.3, 1.05, 0);
    carGroup.add(cabinWire);

    this.addToScene(scene, carGroup);
  }

  // --- Overhead light + spotlight ---

  private buildOverheadLight(scene: THREE.Scene): void {
    // Light pole
    const poleMat = createPearlescentMaterial({ opacity: 0.7 });
    this.trackMaterial(poleMat);

    const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, 6, 4);
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(-4, 3, 4);
    pole.name = 'lightPole';
    this.addToScene(scene, pole);

    // Light fixture — small box at top
    const fixtureGeo = new THREE.BoxGeometry(0.6, 0.1, 0.4);
    const fixtureMat = new THREE.MeshBasicMaterial({
      color: INDIGO_PALETTE.pearlWhite,
      transparent: true,
      opacity: 0.6,
    });
    this.trackMaterial(fixtureMat);

    const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
    fixture.position.set(-4, 6.05, 4);
    fixture.name = 'lightFixture';
    this.addToScene(scene, fixture);

    // Spotlight cone
    const spotlight = new THREE.SpotLight(
      INDIGO_PALETTE.pearlWhite,
      0.8,
      20,
      Math.PI / 5,
      0.5,
      1.5,
    );
    spotlight.position.set(-4, 6, 4);
    spotlight.target.position.set(-4, 0, 4);
    this.addToScene(scene, spotlight);
    this.addToScene(scene, spotlight.target);

    // Subtle point light for ambient fill near the pumps
    const fillLight = new THREE.PointLight(INDIGO_PALETTE.duskAmber, 0.15, 15);
    fillLight.position.set(-4, 4, 4);
    this.addToScene(scene, fillLight);
  }

  // --- Moths orbiting the light ---

  private buildMoths(scene: THREE.Scene): void {
    const mothMat = new THREE.MeshBasicMaterial({
      color: INDIGO_PALETTE.pearlWhite,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    this.trackMaterial(mothMat);

    const lightPos = new THREE.Vector3(-4, 6, 4);

    for (let i = 0; i < 8; i++) {
      const mothGeo = new THREE.BufferGeometry();
      // Tiny triangle
      const verts = new Float32Array([
        0, 0, 0,
        0.06, 0.03, 0,
        0.03, 0.06, 0,
      ]);
      mothGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      mothGeo.computeVertexNormals();

      const moth = new THREE.Mesh(mothGeo, mothMat);
      moth.position.copy(lightPos);
      moth.name = `moth_${i}`;
      this.addToScene(scene, moth);

      this.moths.push({
        mesh: moth,
        phase: Math.random() * Math.PI * 2,
        speed: 0.8 + Math.random() * 1.2,
        radius: 0.4 + Math.random() * 0.8,
        yOffset: (Math.random() - 0.5) * 0.6,
      });
    }
  }

  private updateMoths(elapsed: number): void {
    const lightPos = new THREE.Vector3(-4, 6, 4);

    for (const moth of this.moths) {
      const angle = elapsed * moth.speed + moth.phase;
      // Erratic path: combine two orbits at different frequencies
      const erratic = Math.sin(elapsed * moth.speed * 2.3 + moth.phase) * 0.3;
      const r = moth.radius + erratic;

      moth.mesh.position.set(
        lightPos.x + Math.cos(angle) * r,
        lightPos.y + moth.yOffset + Math.sin(elapsed * 1.7 + moth.phase) * 0.15,
        lightPos.z + Math.sin(angle) * r,
      );

      // Rotate moth to face direction of travel
      moth.mesh.rotation.z = angle;
    }
  }

  // --- Pump heat shimmer animation ---

  private updatePumpParticles(elapsed: number): void {
    for (const points of this.pumpParticles) {
      const posAttr = points.geometry.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        let y = posAttr.getY(i);
        y += 0.003; // slow upward drift
        // Reset particles that drift too high
        if (y > 5) {
          y = 2.2 + Math.random() * 0.3;
        }
        posAttr.setY(i, y);

        // Subtle horizontal wobble
        const x = posAttr.getX(i);
        posAttr.setX(i, x + Math.sin(elapsed * 2 + i) * 0.001);
      }
      posAttr.needsUpdate = true;
    }
  }

  // --- Distant horizon ---

  private buildHorizon(scene: THREE.Scene, ctx: SceneContext): void {
    const visual = getVisualParams(ctx.gameState.emotionalIntensity);
    const horizonMat = createWireframeMaterial({ mood: visual.shaderMood, glowIntensity: 0.3, baseOpacity: 0.2 });
    this.trackMaterial(horizonMat);

    // Distant mountain suggestion — jagged line of triangles
    const mountainGroup = new THREE.Group();
    mountainGroup.position.set(0, 0, -60);
    mountainGroup.name = 'horizon';

    const peaks = 12;
    for (let i = 0; i < peaks; i++) {
      const height = 3 + Math.random() * 8;
      const width = 6 + Math.random() * 8;
      const triGeo = new THREE.BufferGeometry();
      const x = (i - peaks / 2) * 10 + (Math.random() - 0.5) * 4;

      const verts = new Float32Array([
        x - width / 2, 0, 0,
        x + width / 2, 0, 0,
        x + (Math.random() - 0.5) * 2, height, 0,
      ]);
      triGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));

      const wireGeo = new THREE.WireframeGeometry(triGeo);
      const peak = new THREE.LineSegments(wireGeo, horizonMat);
      mountainGroup.add(peak);
    }

    this.addToScene(scene, mountainGroup);
  }

  // --- The Traveler character ---

  private buildTraveler(scene: THREE.Scene, ctx: SceneContext): void {
    const visual = getVisualParams(ctx.gameState.emotionalIntensity);
    // Position near the wheelless car — seated on the hood
    this.traveler = new Traveler({
      position: new THREE.Vector3(5, 0, -2),
      shaderOptions: { mood: visual.shaderMood, innerGlowStrength: 0.55 },
    });
    this.traveler.setMood(visual.shaderMood);
    this.traveler.addToScene(scene);
  }

  // --- Road glow (post-dialogue unlock) ---

  private showRoadGlow(scene: THREE.Scene): void {
    if (this.roadGlow) return;

    // Glowing strip on the road leading away — progression hint
    const glowGeo = new THREE.PlaneGeometry(4, 30);
    glowGeo.rotateX(-Math.PI / 2);

    const glowMat = new THREE.MeshBasicMaterial({
      color: INDIGO_PALETTE.signalViolet,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.trackMaterial(glowMat);

    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(0, 0.05, -25);
    glow.name = 'roadGlow';

    this.addToScene(scene, glow);
    this.roadGlow = glow;
    this.roadGlowMaterial = glowMat;
  }
}
