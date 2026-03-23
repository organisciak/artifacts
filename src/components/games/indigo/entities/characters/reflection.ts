import * as THREE from 'three';
import { Character, type CharacterConfig } from '../character';
import { createSilhouetteMaterial } from '../../engine/shaders';

/**
 * The Reflection — figure on a dock at the Lake.
 *
 * Two figures: one "real" above the water plane, one reflected below
 * with slight distortion. But which is which?
 *
 * Geometry: standing pose — cone body, sphere head, thin arm cylinders
 * slightly outward as if contemplating the water.
 */

export class Reflection extends Character {
  private reflectedGroup: THREE.Group;
  private reflectedMaterial: THREE.ShaderMaterial;

  constructor(config: Omit<CharacterConfig, 'id' | 'name'> & Partial<Pick<CharacterConfig, 'id' | 'name'>>) {
    super({
      id: 'reflection',
      name: 'The Reflection',
      presenceRadius: 7,
      idleRotationSpeed: 0.0008,
      hoverAmplitude: 0.06,
      hoverFrequency: 0.18,
      ...config,
    });

    // The reflected copy is built after super (which calls buildGeometry)
    this.reflectedMaterial = createSilhouetteMaterial({
      innerGlowStrength: 0.4, // Dimmer, more ghostly
      opacity: 0.6,
    });
    this.reflectedGroup = new THREE.Group();
    this.buildReflection();
    this.group.add(this.reflectedGroup);
  }

  protected buildGeometry(): void {
    // --- "Real" figure above water ---

    // Body: standing cone
    const body = this.createPart(new THREE.ConeGeometry(0.45, 2.8, 6));
    body.position.y = 1.4;
    this.group.add(body);

    // Head
    const head = this.createPart(new THREE.SphereGeometry(0.26, 8, 6));
    head.position.y = 3.05;
    this.group.add(head);

    // Arms — slightly outward, contemplative
    const leftArm = this.createPart(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 4));
    leftArm.position.set(-0.55, 1.8, 0);
    leftArm.rotation.z = 0.35;
    this.group.add(leftArm);

    const rightArm = this.createPart(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 4));
    rightArm.position.set(0.55, 1.8, 0);
    rightArm.rotation.z = -0.35;
    this.group.add(rightArm);

    // Dock: a thin horizontal plane beneath the figure
    const dock = this.createPart(new THREE.BoxGeometry(2.0, 0.08, 1.0));
    dock.position.y = 0.04;
    this.group.add(dock);
  }

  private buildReflection(): void {
    // Mirror of the figure, flipped on Y and slightly distorted
    const mat = this.reflectedMaterial;

    const body = new THREE.Mesh(new THREE.ConeGeometry(0.48, 2.8, 6), mat);
    body.position.y = -1.4;
    body.scale.y = -1; // Flip vertically
    this.reflectedGroup.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), mat);
    head.position.y = -3.05;
    this.reflectedGroup.add(head);

    const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 4), mat);
    leftArm.position.set(-0.58, -1.8, 0);
    leftArm.rotation.z = 0.4; // Slightly different angle — is it the same?
    this.reflectedGroup.add(leftArm);

    const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 4), mat);
    rightArm.position.set(0.58, -1.8, 0);
    rightArm.rotation.z = -0.4;
    this.reflectedGroup.add(rightArm);
  }

  update(delta: number, elapsed: number): void {
    super.update(delta, elapsed);

    // Reflection distortion: subtle wave on the mirrored group
    this.reflectedMaterial.uniforms.uTime.value = elapsed;
    const wave = Math.sin(elapsed * 0.7) * 0.03;
    this.reflectedGroup.position.x = wave;
    this.reflectedGroup.scale.x = 1 + Math.sin(elapsed * 1.1) * 0.02;
  }

  dispose(): void {
    super.dispose();
    this.reflectedMaterial.dispose();
    this.reflectedGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
      }
    });
  }
}
