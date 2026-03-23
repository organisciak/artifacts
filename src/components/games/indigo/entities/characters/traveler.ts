import * as THREE from 'three';
import { Character, type CharacterConfig } from '../character';

/**
 * The Traveler — weary seated figure at the Gas Station.
 *
 * Geometry: wider base (seated cone), tilted sphere head suggesting weariness,
 * thin cylinders for arms resting on knees. Small geometric car nearby
 * (boxes + cylinders, no wheels — just the suggestion of a vehicle).
 */

export class Traveler extends Character {
  constructor(config: Omit<CharacterConfig, 'id' | 'name'> & Partial<Pick<CharacterConfig, 'id' | 'name'>>) {
    super({
      id: 'traveler',
      name: 'The Traveler',
      presenceRadius: 6,
      idleRotationSpeed: 0.0005,
      hoverAmplitude: 0.05,
      hoverFrequency: 0.12,
      ...config,
    });
  }

  protected buildGeometry(): void {
    // Seated body: wider, shorter cone (base)
    const body = this.createPart(new THREE.ConeGeometry(0.65, 1.8, 6));
    body.position.y = 0.9;
    this.group.add(body);

    // Head: sphere, tilted slightly forward (weariness)
    const head = this.createPart(new THREE.SphereGeometry(0.28, 8, 6));
    head.position.set(0.1, 2.05, 0.15);
    this.group.add(head);

    // Left arm: thin cylinder angled downward
    const leftArm = this.createPart(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 4));
    leftArm.position.set(-0.5, 1.1, 0.25);
    leftArm.rotation.z = 0.6;
    leftArm.rotation.x = -0.3;
    this.group.add(leftArm);

    // Right arm
    const rightArm = this.createPart(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 4));
    rightArm.position.set(0.5, 1.1, 0.25);
    rightArm.rotation.z = -0.6;
    rightArm.rotation.x = -0.3;
    this.group.add(rightArm);

    // --- Geometric car (suggestion of a vehicle) ---
    const carGroup = new THREE.Group();
    carGroup.position.set(3.5, 0, 0.5);

    // Car body: elongated box
    const carBody = this.createPart(new THREE.BoxGeometry(2.4, 0.6, 1.0));
    carBody.position.y = 0.5;
    carGroup.add(carBody);

    // Car cabin: smaller box on top
    const carCabin = this.createPart(new THREE.BoxGeometry(1.2, 0.5, 0.9));
    carCabin.position.set(-0.2, 1.05, 0);
    carGroup.add(carCabin);

    // "Axles" — just cylinders, no wheels
    const frontAxle = this.createPart(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 4));
    frontAxle.rotation.x = Math.PI / 2;
    frontAxle.position.set(0.7, 0.2, 0);
    carGroup.add(frontAxle);

    const rearAxle = this.createPart(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 4));
    rearAxle.rotation.x = Math.PI / 2;
    rearAxle.position.set(-0.7, 0.2, 0);
    carGroup.add(rearAxle);

    this.group.add(carGroup);
  }
}
