import * as THREE from 'three';
import { Character, type CharacterConfig } from '../character';

/**
 * The Signal — the composite finale character.
 *
 * All previous character geometries combined and overlapping into one form.
 * Larger. Glowing brighter. The convergence of every figure encountered.
 *
 * Geometry: layered composition of Keeper (antenna + orbiters),
 * Traveler (seated base), Reflection (contemplative arms), and
 * Clerk (floating keys). All scaled up and merged into a single entity.
 */

const ORBIT_COUNT = 8;  // More orbiters than the Keeper
const ORBIT_RADIUS = 2.5;
const KEY_COUNT = 8;
const KEY_RADIUS = 3.0;

export class Signal extends Character {
  private orbiters: THREE.Mesh[] = [];
  private orbiterAngles: number[] = [];
  private keys: THREE.Mesh[] = [];
  private keyPhases: number[] = [];

  constructor(config: Omit<CharacterConfig, 'id' | 'name'> & Partial<Pick<CharacterConfig, 'id' | 'name'>>) {
    super({
      id: 'signal',
      name: 'The Signal',
      presenceRadius: 12, // Larger presence
      idleRotationSpeed: 0.003,
      hoverAmplitude: 0.25,
      hoverFrequency: 0.1,
      shaderOptions: {
        innerGlowStrength: 1.0, // Much brighter
        opacity: 0.98,
      },
      ...config,
    });
  }

  protected buildGeometry(): void {
    const scale = 1.4; // Larger than any individual character

    // --- Keeper layer: tall cone + antenna ---
    const keeperBody = this.createPart(new THREE.ConeGeometry(0.4 * scale, 3.5 * scale, 6));
    keeperBody.position.y = 1.75 * scale;
    this.group.add(keeperBody);

    const antenna = this.createPart(new THREE.CylinderGeometry(0.05 * scale, 0.05 * scale, 2.0 * scale, 4));
    antenna.position.y = 4.9 * scale;
    this.group.add(antenna);

    const antennaTip = this.createPart(new THREE.SphereGeometry(0.12 * scale, 6, 4));
    antennaTip.position.y = 6.0 * scale;
    this.group.add(antennaTip);

    // --- Traveler layer: wider base overlapping ---
    const travelerBase = this.createPart(new THREE.ConeGeometry(0.7 * scale, 1.5 * scale, 6));
    travelerBase.position.y = 0.75 * scale;
    this.group.add(travelerBase);

    // --- Reflection layer: contemplative arms ---
    const leftArm = this.createPart(new THREE.CylinderGeometry(0.05 * scale, 0.05 * scale, 1.3 * scale, 4));
    leftArm.position.set(-0.6 * scale, 2.2 * scale, 0);
    leftArm.rotation.z = 0.35;
    this.group.add(leftArm);

    const rightArm = this.createPart(new THREE.CylinderGeometry(0.05 * scale, 0.05 * scale, 1.3 * scale, 4));
    rightArm.position.set(0.6 * scale, 2.2 * scale, 0);
    rightArm.rotation.z = -0.35;
    this.group.add(rightArm);

    // --- Composite head: larger sphere (all characters share this) ---
    const head = this.createPart(new THREE.SphereGeometry(0.4 * scale, 10, 8));
    head.position.y = 3.8 * scale;
    this.group.add(head);

    // --- Keeper orbiters (more of them, larger orbit) ---
    for (let i = 0; i < ORBIT_COUNT; i++) {
      const orb = this.createPart(new THREE.SphereGeometry(0.12 * scale, 6, 4));
      const angle = (i / ORBIT_COUNT) * Math.PI * 2;
      this.orbiterAngles.push(angle);
      orb.position.set(
        Math.cos(angle) * ORBIT_RADIUS,
        3.0 * scale + Math.sin(angle * 2) * 1.0,
        Math.sin(angle) * ORBIT_RADIUS
      );
      this.orbiters.push(orb);
      this.group.add(orb);
    }

    // --- Clerk keys (floating around the composite form) ---
    for (let i = 0; i < KEY_COUNT; i++) {
      const key = this.createPart(new THREE.BoxGeometry(0.15, 0.08, 0.05));
      const phase = (i / KEY_COUNT) * Math.PI * 2;
      this.keyPhases.push(phase);
      const height = 1.0 + (i % 3) * 1.2;
      key.position.set(
        Math.cos(phase) * KEY_RADIUS,
        height,
        Math.sin(phase) * KEY_RADIUS
      );
      key.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      this.keys.push(key);
      this.group.add(key);
    }
  }

  update(delta: number, elapsed: number): void {
    super.update(delta, elapsed);

    // Orbiters
    for (let i = 0; i < this.orbiters.length; i++) {
      this.orbiterAngles[i] += 0.5 * delta;
      const angle = this.orbiterAngles[i];
      this.orbiters[i].position.set(
        Math.cos(angle) * ORBIT_RADIUS,
        3.0 * 1.4 + Math.sin(angle * 2 + i) * 1.0,
        Math.sin(angle) * ORBIT_RADIUS
      );
    }

    // Keys
    for (let i = 0; i < this.keys.length; i++) {
      this.keyPhases[i] += 0.12 * delta;
      const phase = this.keyPhases[i];
      const height = 1.0 + (i % 3) * 1.2 + Math.sin(elapsed * 0.2 + i) * 0.2;
      this.keys[i].position.set(
        Math.cos(phase) * KEY_RADIUS,
        height,
        Math.sin(phase) * KEY_RADIUS
      );
      this.keys[i].rotation.y += delta * 0.2;
    }
  }
}
