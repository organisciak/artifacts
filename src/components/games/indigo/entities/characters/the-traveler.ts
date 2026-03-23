import * as THREE from 'three';
import { Character, type CharacterConfig } from '../character';

// ---------------------------------------------------------------------------
// The Traveler — Gas Station scene
//
// Seated form with a wider base, tilted sphere-head suggesting weariness.
// A small geometric car shape sits nearby — boxes + cylinders, no wheels.
// Someone resting at the edge of nowhere.
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: Partial<CharacterConfig> = {
  id: 'traveler',
  name: 'The Traveler',
  presenceRadius: 6,
  shaderOptions: { innerGlowStrength: 0.55 },
  hoverAmplitude: 0.06, // subtler — seated, weary
  hoverFrequency: 0.2,
};

export class TheTraveler extends Character {
  constructor(config: Partial<CharacterConfig> & { position: THREE.Vector3 }) {
    super({ ...DEFAULT_CONFIG, ...config } as CharacterConfig);
  }

  protected buildGeometry(): void {
    // --- Seated torso: wide, squat cone ---
    const torsoGeo = new THREE.ConeGeometry(0.55, 1.6, 6);
    const torso = this.createPart(torsoGeo);
    torso.position.y = 1.2;
    this.group.add(torso);

    // --- Head: sphere, tilted slightly to one side ---
    const headGeo = new THREE.SphereGeometry(0.28, 8, 6);
    const head = this.createPart(headGeo);
    head.position.set(0.08, 2.3, 0);
    head.rotation.z = 0.2; // tilt — weariness
    this.group.add(head);

    // --- Wide base/seat: flattened cylinder ---
    const seatGeo = new THREE.CylinderGeometry(0.7, 0.8, 0.3, 6);
    const seat = this.createPart(seatGeo);
    seat.position.y = 0.3;
    this.group.add(seat);

    // --- Legs: two short cylinders extending forward ---
    for (const side of [-0.25, 0.25]) {
      const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 4);
      const leg = this.createPart(legGeo);
      leg.position.set(side, 0.15, 0.4);
      leg.rotation.x = Math.PI / 2.5; // angled forward — seated
      this.group.add(leg);
    }

    // --- Arms: thin cylinders resting on knees ---
    for (const side of [-1, 1]) {
      const armGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.9, 4);
      const arm = this.createPart(armGeo);
      arm.position.set(side * 0.45, 1.3, 0.15);
      arm.rotation.x = 0.5;
      arm.rotation.z = side * 0.3;
      this.group.add(arm);
    }

    // --- Geometric car: nearby prop ---
    const carGroup = new THREE.Group();
    carGroup.position.set(-2.0, 0.0, 1.5);
    carGroup.rotation.y = 0.3;

    // Car body: flat box
    const carBodyGeo = new THREE.BoxGeometry(2.0, 0.5, 0.9);
    const carBody = this.createPart(carBodyGeo);
    carBody.position.y = 0.35;
    carGroup.add(carBody);

    // Car cabin: smaller box on top
    const cabinGeo = new THREE.BoxGeometry(0.9, 0.4, 0.75);
    const cabin = this.createPart(cabinGeo);
    cabin.position.set(-0.2, 0.7, 0);
    carGroup.add(cabin);

    // Axle stubs: short cylinders (no wheels, just geometric suggestion)
    for (const xOff of [-0.6, 0.6]) {
      const axleGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.1, 4);
      const axle = this.createPart(axleGeo);
      axle.position.set(xOff, 0.08, 0);
      axle.rotation.x = Math.PI / 2;
      carGroup.add(axle);
    }

    this.group.add(carGroup);
  }
}
