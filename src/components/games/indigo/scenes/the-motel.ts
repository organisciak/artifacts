/**
 * Scene 4: The Motel
 *
 * The most unsettling scene. An L-shaped motel where every door
 * opens to an impossible space. David Lynch lives in these walls.
 *
 * Rooms:
 *   1 — Normal-ish, but the bed is the size of a house
 *   2 — The road extends infinitely inward
 *   3 — The lake in a bathtub
 *   4 — Pure darkness, one distant unreachable light
 *   5 — All previous characters, standing still, facing you
 */

import * as THREE from 'three';
import type { IndigoScene, SceneContext, SceneCharacter, SceneInteractable } from './types';
import type { SceneId } from '../engine/game-state';
import {
  createPearlescentMaterial,
  createWireframeMaterial,
  createGroundMaterial,
  createSkyMaterial,
  createSilhouetteMaterial,
} from '../engine/shaders';
import { INDIGO_PALETTE } from '../engine/palette';
import { TheClerk } from '../entities/characters/the-clerk';
import { registerDialogue } from '../narrative/dialogue-system';
import {
  SCENE_FOG,
  getVisualParams,
  getDustMoteConfig,
  createDustMotes,
  computeIntensity,
} from '../engine/atmosphere';

// ---------------------------------------------------------------------------
// Dialogue registration
// ---------------------------------------------------------------------------

registerDialogue('the-motel', {
  characterId: 'clerk',
  lines: [
    {
      text: 'Every key fits every door / if you turn it slowly enough. / The problem is patience. / Or desire. / They feel similar.',
      pause: 3.5,
      tone: 'hollow',
    },
    {
      text: 'The rooms have been here / longer than the building. / We just put walls around / what was already rooms.',
      pause: 3.0,
      tone: 'cold',
    },
    {
      text: 'You can check out / whenever you like. / That\'s not the hard part. / The hard part is knowing / which side of the door you\'re on.',
      pause: 4.0,
      tone: 'warm',
    },
  ],
  spentLine: 'The doors don\'t lock. / That was never the point.',
}, {
  cameraLookOffset: { x: 0, y: 2.0, z: 0 },
  cameraDistance: 3.5,
  cameraHeight: 1.8,
  textOffset: { x: 0, y: 3.0, z: 0 },
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROOM_COUNT = 5;
const DOOR_WIDTH = 1.2;
const DOOR_HEIGHT = 2.4;
const DOOR_SPACING = 3.2;
const ROOM_DEPTH = 8;
const ROOM_WIDTH = 2.8;
const ROOM_HEIGHT = 2.8;

/** How far the building wing extends along each axis of the L. */
const WING_LENGTH = DOOR_SPACING * 3 + 2;
const WALL_HEIGHT = 3.2;

// ---------------------------------------------------------------------------
// Room state
// ---------------------------------------------------------------------------

type RoomState = {
  isOpen: boolean;
  doorMesh: THREE.Mesh;
  interiorGroup: THREE.Group;
  doorPivot: THREE.Group;
};

// ---------------------------------------------------------------------------
// Scene Implementation
// ---------------------------------------------------------------------------

export class TheMotelScene implements IndigoScene {
  readonly id: SceneId = 'the-motel';
  readonly title = 'The Motel';
  readonly subtitle = 'Every room is already occupied / by what you brought with you.';

  private root = new THREE.Group();
  private clerk!: TheClerk;
  private rooms: RoomState[] = [];
  private roomsOpened = 0;
  private signLetters: THREE.Mesh[] = [];
  private flickerLetterIdx = 3; // 'E' in MOTEL
  private roadGlowActive = false;
  private roadGlowMaterial: THREE.ShaderMaterial | null = null;
  private silhouetteChars: THREE.Group[] = []; // Room 5 character silhouettes
  private dustMotes: { points: THREE.Points; update: (elapsed: number) => void; dispose: () => void } | null = null;

  // ── Lifecycle ────────────────────────────────────────────────────────

  setup(ctx: SceneContext): void {
    this.root.name = 'motel_scene';

    // Apply atmosphere-tuned fog
    const fog = SCENE_FOG['the-motel'];
    ctx.renderer.scene.fog = new THREE.FogExp2(fog.color, fog.density);
    ctx.renderer.scene.background = fog.color.clone();

    this.buildSky();
    this.buildGround();
    this.buildMotelExterior();
    this.buildParkingLot();
    this.buildRoad();
    this.buildMotelSign();
    this.buildRooms();
    this.buildClerk();

    // Dust motes
    const dustConfig = getDustMoteConfig(ctx.gameState.emotionalIntensity);
    const dustResult = createDustMotes(dustConfig);
    if (dustResult) {
      this.dustMotes = dustResult;
      this.root.add(dustResult.points);
    }

    ctx.renderer.scene.add(this.root);
  }

  update(ctx: SceneContext, delta: number, elapsed: number): void {
    // Compute intra-scene emotional intensity
    const sceneProgress = Math.min(this.roomsOpened / 3, 1);
    const intensity = computeIntensity('the-motel', sceneProgress);
    ctx.gameState.setEmotionalIntensity(intensity);

    // Update dust motes
    this.dustMotes?.update(elapsed);

    // Update clerk
    this.clerk.update(delta, elapsed);

    // Flicker the motel sign letter
    if (this.signLetters[this.flickerLetterIdx]) {
      const flicker = Math.sin(elapsed * 8.3) > 0.3 ? 1.0 : 0.15;
      const mat = this.signLetters[this.flickerLetterIdx].material as THREE.ShaderMaterial;
      if (mat.uniforms?.uInnerGlowStrength) {
        mat.uniforms.uInnerGlowStrength.value = flicker * 0.8;
      }
    }

    // Animate room interiors
    this.updateRoomInteriors(elapsed);

    // Road glow after 3 rooms opened
    if (this.roomsOpened >= 3 && !this.roadGlowActive) {
      this.activateRoadGlow();
    }

    if (this.roadGlowMaterial) {
      this.roadGlowMaterial.uniforms.uTime.value = elapsed;
    }

    // Check if player is walking along the glowing road to trigger transition
    if (this.roadGlowActive) {
      const playerPos = ctx.renderer.camera.position;
      if (playerPos.z < -35) {
        ctx.requestTransition('the-signal');
      }
    }
  }

  cleanup(ctx: SceneContext): void {
    ctx.renderer.scene.remove(this.root);
    this.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    this.clerk.dispose();

    if (this.dustMotes) {
      this.dustMotes.dispose();
      this.dustMotes = null;
    }
  }

  getSpawnPoint(): THREE.Vector3 {
    return new THREE.Vector3(0, 0, 12);
  }

  getCharacters(): SceneCharacter[] {
    return [
      {
        id: this.clerk.id,
        name: this.clerk.name,
        position: this.clerk.getWorldPosition(),
        object: this.clerk.group,
      },
    ];
  }

  getInteractables(): SceneInteractable[] {
    const interactables: SceneInteractable[] = [];

    // Office window (for clerk interaction)
    interactables.push({
      id: 'clerk-window',
      position: new THREE.Vector3(-WING_LENGTH + 1.5, 1.5, 2),
      radius: 3,
      object: this.clerk.group,
    });

    // Doors
    for (let i = 0; i < this.rooms.length; i++) {
      const room = this.rooms[i];
      const doorPos = this.getDoorPosition(i);
      interactables.push({
        id: `door-${i + 1}`,
        position: doorPos,
        radius: 2,
        object: room.doorMesh,
        onInteract: () => this.openRoom(i),
      });
    }

    return interactables;
  }

  // ── Environment Construction ─────────────────────────────────────────

  private buildSky(): void {
    const skyGeo = new THREE.SphereGeometry(150, 32, 32);
    const skyMat = createSkyMaterial({ mood: 0.3 });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.name = 'sky';
    this.root.add(sky);
  }

  private buildGround(): void {
    const groundGeo = new THREE.PlaneGeometry(120, 120, 50, 50);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = createGroundMaterial({ mood: 0.2, fadeDistance: 35 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -0.01;
    ground.name = 'ground';
    this.root.add(ground);
  }

  private buildMotelExterior(): void {
    const wireMat = createWireframeMaterial({ mood: 0.2, glowIntensity: 0.8 });

    // L-shaped motel: front wing (along X) and side wing (along -Z)
    // Front wing: rooms 1-3 doors face +Z (toward parking lot / player)
    const frontWing = this.buildWing(WING_LENGTH, WALL_HEIGHT, 4, wireMat);
    frontWing.position.set(0, 0, 0);
    frontWing.name = 'front_wing';
    this.root.add(frontWing);

    // Side wing: rooms 4-5, extends from the left end of front wing
    const sideWing = this.buildWing(WING_LENGTH * 0.7, WALL_HEIGHT, 4, wireMat);
    sideWing.rotation.y = Math.PI / 2;
    sideWing.position.set(-WING_LENGTH + 1, 0, -0.5);
    sideWing.name = 'side_wing';
    this.root.add(sideWing);

    // Flat roof (both wings)
    const roofGeo1 = new THREE.PlaneGeometry(WING_LENGTH * 2, 5);
    roofGeo1.rotateX(-Math.PI / 2);
    const roofMat = createWireframeMaterial({ mood: 0.15, glowIntensity: 0.4 });
    const roof1 = new THREE.Mesh(roofGeo1, roofMat);
    roof1.position.set(0, WALL_HEIGHT, -2);
    roof1.name = 'roof_front';
    this.root.add(roof1);
  }

  private buildWing(
    length: number,
    height: number,
    depth: number,
    mat: THREE.ShaderMaterial,
  ): THREE.Group {
    const wing = new THREE.Group();

    // Back wall
    const backGeo = new THREE.PlaneGeometry(length * 2, height, 12, 4);
    const backWire = new THREE.WireframeGeometry(backGeo);
    const back = new THREE.LineSegments(backWire, mat);
    back.position.set(0, height / 2, -depth);
    wing.add(back);

    // Front wall (with door gaps — actual doors are separate meshes)
    const frontGeo = new THREE.PlaneGeometry(length * 2, height, 12, 4);
    const frontWire = new THREE.WireframeGeometry(frontGeo);
    const front = new THREE.LineSegments(frontWire, mat);
    front.position.set(0, height / 2, 0);
    wing.add(front);

    // Side walls
    for (const side of [-1, 1]) {
      const sideGeo = new THREE.PlaneGeometry(depth, height, 4, 4);
      const sideWire = new THREE.WireframeGeometry(sideGeo);
      const sideWall = new THREE.LineSegments(sideWire, mat);
      sideWall.rotation.y = Math.PI / 2;
      sideWall.position.set(side * length, height / 2, -depth / 2);
      wing.add(sideWall);
    }

    return wing;
  }

  private buildParkingLot(): void {
    // Flat area in front of the motel with faded line markings
    const lotMat = createGroundMaterial({ mood: 0.15, gridScale: 2.0, fadeDistance: 20 });
    const lotGeo = new THREE.PlaneGeometry(20, 10, 10, 5);
    lotGeo.rotateX(-Math.PI / 2);
    const lot = new THREE.Mesh(lotGeo, lotMat);
    lot.position.set(0, 0.01, 6);
    lot.name = 'parking_lot';
    this.root.add(lot);

    // Parking space lines
    const lineMat = createWireframeMaterial({ mood: 0.1, glowIntensity: 0.3, baseOpacity: 0.3 });
    for (let i = 0; i < 5; i++) {
      const lineGeo = new THREE.PlaneGeometry(0.08, 4);
      lineGeo.rotateX(-Math.PI / 2);
      const lineWire = new THREE.WireframeGeometry(lineGeo);
      const line = new THREE.LineSegments(lineWire, lineMat);
      line.position.set(-6 + i * 3, 0.02, 6);
      this.root.add(line);
    }

    // Wheelless car — geometric boxes
    const carGroup = new THREE.Group();
    carGroup.position.set(4, 0, 6.5);
    carGroup.rotation.y = 0.1;

    const carMat = createSilhouetteMaterial({ innerGlowStrength: 0.3, opacity: 0.8 });
    const bodyGeo = new THREE.BoxGeometry(2.2, 0.5, 1.0);
    const body = new THREE.Mesh(bodyGeo, carMat);
    body.position.y = 0.35;
    carGroup.add(body);

    const cabinGeo = new THREE.BoxGeometry(1.0, 0.45, 0.85);
    const cabin = new THREE.Mesh(cabinGeo, carMat);
    cabin.position.set(-0.2, 0.75, 0);
    carGroup.add(cabin);

    // Axle stubs
    for (const x of [-0.65, 0.65]) {
      const axleGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.15, 4);
      const axle = new THREE.Mesh(axleGeo, carMat);
      axle.position.set(x, 0.08, 0);
      axle.rotation.x = Math.PI / 2;
      carGroup.add(axle);
    }

    carGroup.name = 'parked_car';
    this.root.add(carGroup);
  }

  private buildRoad(): void {
    // Road passing by the motel, extending into darkness
    const roadMat = createGroundMaterial({ mood: 0.05, gridScale: 0.5, fadeDistance: 50 });
    const roadGeo = new THREE.PlaneGeometry(6, 100, 6, 40);
    roadGeo.rotateX(-Math.PI / 2);
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.position.set(0, 0.005, -20);
    road.name = 'road';
    this.root.add(road);

    // Center line dashes
    const dashMat = createWireframeMaterial({ mood: 0.1, glowIntensity: 0.5, baseOpacity: 0.4 });
    for (let i = 0; i < 20; i++) {
      const dashGeo = new THREE.PlaneGeometry(0.1, 1.5);
      dashGeo.rotateX(-Math.PI / 2);
      const dashWire = new THREE.WireframeGeometry(dashGeo);
      const dash = new THREE.LineSegments(dashWire, dashMat);
      dash.position.set(0, 0.02, 12 - i * 3.5);
      this.root.add(dash);
    }
  }

  private buildMotelSign(): void {
    // Floating MOTEL sign above the building
    const signGroup = new THREE.Group();
    signGroup.position.set(0, WALL_HEIGHT + 1.5, 0.5);
    signGroup.name = 'motel_sign';

    const letters = ['M', 'O', 'T', 'E', 'L'];
    const signMat = createSilhouetteMaterial({ innerGlowStrength: 0.8, opacity: 0.9 });

    for (let i = 0; i < letters.length; i++) {
      // Each letter is a thin box (abstract placeholder — the glow is what matters)
      const letterGeo = new THREE.BoxGeometry(0.6, 0.9, 0.08);
      const letterMesh = new THREE.Mesh(letterGeo, signMat.clone());
      letterMesh.position.x = (i - 2) * 0.85;
      letterMesh.name = `sign_${letters[i]}`;
      signGroup.add(letterMesh);
      this.signLetters.push(letterMesh);
    }

    // Sign backing plate (wireframe)
    const backingGeo = new THREE.BoxGeometry(5.0, 1.4, 0.05);
    const backingWire = new THREE.WireframeGeometry(backingGeo);
    const backingMat = createWireframeMaterial({ mood: 0.15, glowIntensity: 0.3 });
    const backing = new THREE.LineSegments(backingWire, backingMat);
    backing.position.z = -0.05;
    signGroup.add(backing);

    this.root.add(signGroup);
  }

  // ── Rooms ──────────────────────────────────────────────────────────────

  private getDoorPosition(index: number): THREE.Vector3 {
    // Rooms 0-2 on front wing, rooms 3-4 on side wing
    if (index < 3) {
      const x = -WING_LENGTH + 3 + index * DOOR_SPACING;
      return new THREE.Vector3(x, DOOR_HEIGHT / 2, 0.05);
    } else {
      const offset = (index - 3) * DOOR_SPACING;
      return new THREE.Vector3(-WING_LENGTH + 1.5, DOOR_HEIGHT / 2, -1 - offset);
    }
  }

  private buildRooms(): void {
    for (let i = 0; i < ROOM_COUNT; i++) {
      const doorPos = this.getDoorPosition(i);

      // Door pivot (for swing animation)
      const doorPivot = new THREE.Group();
      doorPivot.position.copy(doorPos);
      doorPivot.position.x -= DOOR_WIDTH / 2; // hinge on left edge

      // Door mesh — dark rectangle
      const doorGeo = new THREE.PlaneGeometry(DOOR_WIDTH, DOOR_HEIGHT);
      const doorMat = createSilhouetteMaterial({ innerGlowStrength: 0.2, opacity: 0.95 });
      const doorMesh = new THREE.Mesh(doorGeo, doorMat);
      doorMesh.position.x = DOOR_WIDTH / 2; // offset from hinge
      doorMesh.name = `door_${i + 1}`;
      doorPivot.add(doorMesh);

      // Room number floating above the door
      const numGeo = new THREE.BoxGeometry(0.25, 0.35, 0.05);
      const numMat = createSilhouetteMaterial({ innerGlowStrength: 0.6 });
      const num = new THREE.Mesh(numGeo, numMat);
      num.position.set(DOOR_WIDTH / 2, DOOR_HEIGHT / 2 + 0.4, 0.1);
      doorPivot.add(num);

      this.root.add(doorPivot);

      // Interior group — hidden until door opens
      const interiorGroup = new THREE.Group();
      interiorGroup.visible = false;
      interiorGroup.name = `room_${i + 1}_interior`;

      // Build the impossible interior
      this.buildRoomInterior(i, interiorGroup, doorPos);
      this.root.add(interiorGroup);

      this.rooms.push({
        isOpen: false,
        doorMesh,
        interiorGroup,
        doorPivot,
      });
    }
  }

  private buildRoomInterior(index: number, group: THREE.Group, doorPos: THREE.Vector3): void {
    // Position interior behind the door
    const interiorOrigin = doorPos.clone();
    interiorOrigin.z -= 0.5; // just behind the wall
    group.position.copy(interiorOrigin);

    switch (index) {
      case 0: this.buildRoom1_GiantBed(group); break;
      case 1: this.buildRoom2_InfiniteRoad(group); break;
      case 2: this.buildRoom3_LakeInBathtub(group); break;
      case 3: this.buildRoom4_Darkness(group); break;
      case 4: this.buildRoom5_AllCharacters(group); break;
    }
  }

  /**
   * Room 1: Normal-ish motel room. But the bed is the size of a house.
   * Wireframe bed frame scaled impossibly large inside a normal room wireframe.
   */
  private buildRoom1_GiantBed(group: THREE.Group): void {
    const wireMat = createWireframeMaterial({ mood: 0.15, glowIntensity: 0.6 });

    // Room shell (wireframe box)
    this.addRoomShell(group, wireMat, ROOM_WIDTH, ROOM_HEIGHT, ROOM_DEPTH);

    // Giant bed — scaled way up. A bed that fills the universe of the room.
    const bedGroup = new THREE.Group();
    bedGroup.position.set(0, 0, -ROOM_DEPTH / 2);

    // Mattress — enormous flat box
    const mattressGeo = new THREE.BoxGeometry(6, 0.8, 8);
    const mattressWire = new THREE.WireframeGeometry(mattressGeo);
    const mattress = new THREE.LineSegments(mattressWire, wireMat);
    mattress.position.y = 1.5;
    bedGroup.add(mattress);

    // Headboard — tall flat plane
    const headGeo = new THREE.PlaneGeometry(6, 4);
    const headWire = new THREE.WireframeGeometry(headGeo);
    const headboard = new THREE.LineSegments(headWire, wireMat);
    headboard.position.set(0, 3.5, -4);
    bedGroup.add(headboard);

    // Bed legs — thick cylinders
    for (const x of [-2.5, 2.5]) {
      for (const z of [-3.5, 3.5]) {
        const legGeo = new THREE.CylinderGeometry(0.15, 0.15, 1.1, 4);
        const legWire = new THREE.WireframeGeometry(legGeo);
        const leg = new THREE.LineSegments(legWire, wireMat);
        leg.position.set(x, 0.55, z);
        bedGroup.add(leg);
      }
    }

    // Pillow — soft box
    const pillowGeo = new THREE.BoxGeometry(2.5, 0.4, 1.5);
    const pillowWire = new THREE.WireframeGeometry(pillowGeo);
    const pillow = new THREE.LineSegments(pillowWire, wireMat);
    pillow.position.set(0, 2.1, -2.5);
    bedGroup.add(pillow);

    group.add(bedGroup);
  }

  /**
   * Room 2: The room IS the road. It extends infinitely inward.
   * Same wireframe road grid from every scene, receding into fog.
   */
  private buildRoom2_InfiniteRoad(group: THREE.Group): void {
    const roadMat = createGroundMaterial({
      mood: 0.05,
      gridScale: 0.5,
      fadeDistance: 60,
      pulseSpeed: 0.3,
    });

    // Long road plane extending deep into the room
    const roadGeo = new THREE.PlaneGeometry(4, 80, 4, 40);
    roadGeo.rotateX(-Math.PI / 2);
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.position.set(0, 0.01, -40);
    group.add(road);

    // Center dashes
    const dashMat = createWireframeMaterial({ mood: 0.1, glowIntensity: 0.4, baseOpacity: 0.3 });
    for (let i = 0; i < 25; i++) {
      const dashGeo = new THREE.PlaneGeometry(0.08, 1.2);
      dashGeo.rotateX(-Math.PI / 2);
      const dashWire = new THREE.WireframeGeometry(dashGeo);
      const dash = new THREE.LineSegments(dashWire, dashMat);
      dash.position.set(0, 0.02, -2 - i * 3);
      group.add(dash);
    }

    // Minimal room frame at the entrance
    const frameMat = createWireframeMaterial({ mood: 0.2, glowIntensity: 0.5 });
    const frameGeo = new THREE.BoxGeometry(ROOM_WIDTH, ROOM_HEIGHT, 0.5);
    const frameWire = new THREE.WireframeGeometry(frameGeo);
    const frame = new THREE.LineSegments(frameWire, frameMat);
    frame.position.set(0, ROOM_HEIGHT / 2, 0);
    group.add(frame);
  }

  /**
   * Room 3: The lake from Scene 3, miniature, sitting in a bathtub wireframe.
   * A tiny contained world inside bathroom geometry.
   */
  private buildRoom3_LakeInBathtub(group: THREE.Group): void {
    const wireMat = createWireframeMaterial({ mood: 0.25, glowIntensity: 0.6 });

    // Room shell
    this.addRoomShell(group, wireMat, ROOM_WIDTH, ROOM_HEIGHT, ROOM_DEPTH);

    // Bathtub — rounded box-ish wireframe
    const tubGroup = new THREE.Group();
    tubGroup.position.set(0, 0.4, -ROOM_DEPTH / 2);

    // Tub body (elongated box)
    const tubGeo = new THREE.BoxGeometry(1.2, 0.6, 2.0);
    const tubWire = new THREE.WireframeGeometry(tubGeo);
    const tub = new THREE.LineSegments(tubWire, wireMat);
    tub.position.y = 0.3;
    tubGroup.add(tub);

    // Feet (small spheres)
    for (const x of [-0.5, 0.5]) {
      for (const z of [-0.7, 0.7]) {
        const footGeo = new THREE.SphereGeometry(0.08, 4, 3);
        const footWire = new THREE.WireframeGeometry(footGeo);
        const foot = new THREE.LineSegments(footWire, wireMat);
        foot.position.set(x, 0, z);
        tubGroup.add(foot);
      }
    }

    // Miniature lake water surface inside the tub
    const lakeMat = createPearlescentMaterial({
      mood: 0.3,
      fresnelPower: 2.0,
      opacity: 0.5,
    });
    const lakeGeo = new THREE.PlaneGeometry(1.0, 1.8);
    lakeGeo.rotateX(-Math.PI / 2);
    const lake = new THREE.Mesh(lakeGeo, lakeMat);
    lake.position.y = 0.5;
    lake.name = 'mini_lake';
    tubGroup.add(lake);

    // Tiny dock
    const dockGeo = new THREE.BoxGeometry(0.3, 0.02, 0.15);
    const dockWire = new THREE.WireframeGeometry(dockGeo);
    const dock = new THREE.LineSegments(dockWire, wireMat);
    dock.position.set(0, 0.52, -0.6);
    tubGroup.add(dock);

    group.add(tubGroup);
  }

  /**
   * Room 4: Darkness. Nothing visible. Then a single distant light
   * that never gets closer. Extreme reverb on footsteps.
   */
  private buildRoom4_Darkness(group: THREE.Group): void {
    // Minimal entry frame so you know there's a room
    const frameMat = createWireframeMaterial({ mood: 0, glowIntensity: 0.3, baseOpacity: 0.2 });
    const frameGeo = new THREE.BoxGeometry(ROOM_WIDTH, ROOM_HEIGHT, 0.3);
    const frameWire = new THREE.WireframeGeometry(frameGeo);
    const frame = new THREE.LineSegments(frameWire, frameMat);
    frame.position.set(0, ROOM_HEIGHT / 2, 0);
    group.add(frame);

    // The distant light — a small glowing sphere, very far away
    const lightGeo = new THREE.SphereGeometry(0.08, 6, 4);
    const lightMat = createSilhouetteMaterial({ innerGlowStrength: 1.2, opacity: 0.9 });
    const distantLight = new THREE.Mesh(lightGeo, lightMat);
    distantLight.position.set(0, 1.5, -50);
    distantLight.name = 'distant_light';
    group.add(distantLight);

    // A secondary, even fainter echo of the light
    const echoGeo = new THREE.SphereGeometry(0.04, 4, 3);
    const echoMat = createSilhouetteMaterial({ innerGlowStrength: 0.5, opacity: 0.4 });
    const echo = new THREE.Mesh(echoGeo, echoMat);
    echo.position.set(0.3, 1.7, -80);
    echo.name = 'distant_light_echo';
    group.add(echo);
  }

  /**
   * Room 5: All previous characters from every scene, standing still,
   * facing the door. They say nothing.
   */
  private buildRoom5_AllCharacters(group: THREE.Group): void {
    const wireMat = createWireframeMaterial({ mood: 0.3, glowIntensity: 0.5 });
    const charMat = createSilhouetteMaterial({ innerGlowStrength: 0.4, opacity: 0.85 });

    // Room shell
    this.addRoomShell(group, wireMat, ROOM_WIDTH * 1.2, ROOM_HEIGHT, ROOM_DEPTH);

    // 4 character silhouettes: Keeper, Traveler, Reflection, Clerk
    // Simplified geometric forms — just the essential shapes, facing the door
    const charConfigs = [
      { name: 'keeper_echo', x: -0.8, bodyH: 3.5, headR: 0.2, bodyR: 0.25 },
      { name: 'traveler_echo', x: -0.25, bodyH: 1.8, headR: 0.25, bodyR: 0.4 },
      { name: 'reflection_echo', x: 0.25, bodyH: 2.6, headR: 0.2, bodyR: 0.3 },
      { name: 'clerk_echo', x: 0.8, bodyH: 2.0, headR: 0.22, bodyR: 0.28 },
    ];

    for (const cfg of charConfigs) {
      const charGroup = new THREE.Group();
      charGroup.position.set(cfg.x, 0, -ROOM_DEPTH / 2);
      charGroup.name = cfg.name;

      // Body: cone
      const bodyGeo = new THREE.ConeGeometry(cfg.bodyR, cfg.bodyH, 6);
      const body = new THREE.Mesh(bodyGeo, charMat);
      body.position.y = cfg.bodyH / 2;
      charGroup.add(body);

      // Head: sphere
      const headGeo = new THREE.SphereGeometry(cfg.headR, 8, 6);
      const head = new THREE.Mesh(headGeo, charMat);
      head.position.y = cfg.bodyH + cfg.headR + 0.1;
      charGroup.add(head);

      group.add(charGroup);
      this.silhouetteChars.push(charGroup);
    }
  }

  // ── Room helpers ──────────────────────────────────────────────────────

  private addRoomShell(
    group: THREE.Group,
    mat: THREE.ShaderMaterial,
    width: number,
    height: number,
    depth: number,
  ): void {
    const shellGeo = new THREE.BoxGeometry(width, height, depth);
    const shellWire = new THREE.WireframeGeometry(shellGeo);
    const shell = new THREE.LineSegments(shellWire, mat);
    shell.position.set(0, height / 2, -depth / 2);
    group.add(shell);
  }

  private openRoom(index: number): void {
    const room = this.rooms[index];
    if (!room || room.isOpen) return;

    room.isOpen = true;
    this.roomsOpened++;

    // Swing door open (rotate around hinge)
    room.doorPivot.rotation.y = -Math.PI / 2.5;

    // Reveal interior
    room.interiorGroup.visible = true;
  }

  // ── Animation updates ─────────────────────────────────────────────────

  private updateRoomInteriors(elapsed: number): void {
    // Room 3: gentle lake water shimmer
    for (const room of this.rooms) {
      if (!room.isOpen) continue;
      const lake = room.interiorGroup.getObjectByName('mini_lake');
      if (lake) {
        lake.position.y = 0.5 + Math.sin(elapsed * 1.5) * 0.01;
      }
    }

    // Room 4: distant light pulses but never approaches
    for (const room of this.rooms) {
      if (!room.isOpen) continue;
      const light = room.interiorGroup.getObjectByName('distant_light') as THREE.Mesh | undefined;
      if (light) {
        const mat = light.material as THREE.ShaderMaterial;
        if (mat.uniforms?.uInnerGlowStrength) {
          mat.uniforms.uInnerGlowStrength.value = 0.8 + Math.sin(elapsed * 0.4) * 0.4;
        }
        // Slight drift — never actually closer
        light.position.x = Math.sin(elapsed * 0.15) * 0.3;
        light.position.y = 1.5 + Math.sin(elapsed * 0.2) * 0.15;
      }
    }

    // Room 5: characters stand perfectly still — that IS the animation.
    // (The stillness is the point. No update needed.)
  }

  // ── The Clerk ──────────────────────────────────────────────────────────

  private buildClerk(): void {
    this.clerk = new TheClerk({
      position: new THREE.Vector3(-WING_LENGTH + 1.5, 0, -0.5),
    });
    this.clerk.addToScene(this.root as unknown as THREE.Scene);

    // Office window glow (warm light behind the clerk)
    const windowGeo = new THREE.PlaneGeometry(1.5, 1.2);
    const windowMat = createPearlescentMaterial({
      mood: 0.8, // warm
      fresnelPower: 1.5,
      opacity: 0.25,
    });
    const windowGlow = new THREE.Mesh(windowGeo, windowMat);
    windowGlow.position.set(-WING_LENGTH + 1.5, 1.8, 0.08);
    windowGlow.name = 'office_window';
    this.root.add(windowGlow);
  }

  // ── Road glow (after 3 rooms opened) ──────────────────────────────────

  private activateRoadGlow(): void {
    this.roadGlowActive = true;

    // Overlay a brighter signal-colored strip on the road
    const glowMat = createWireframeMaterial({
      mood: 0,
      glowIntensity: 2.0,
      baseOpacity: 0.6,
    });
    this.roadGlowMaterial = glowMat;

    const glowGeo = new THREE.PlaneGeometry(3, 60, 3, 20);
    glowGeo.rotateX(-Math.PI / 2);
    const glowWire = new THREE.WireframeGeometry(glowGeo);
    const glow = new THREE.LineSegments(glowWire, glowMat);
    glow.position.set(0, 0.03, -25);
    glow.name = 'road_glow';
    this.root.add(glow);
  }
}
