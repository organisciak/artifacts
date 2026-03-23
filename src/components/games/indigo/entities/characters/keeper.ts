import * as THREE from 'three';
import { Character, type CharacterConfig } from '../character';

/**
 * The Keeper — tall, antenna-like presence at the Radio Tower.
 *
 * Geometry: tall narrow cone body, small sphere head, thin vertical antenna
 * protrusion above the head, surrounded by small orbiting spheres (electrons).
 * Authoritative vertical presence.
 */

const ORBIT_COUNT = 5;
const ORBIT_RADIUS = 1.8;
const ORBIT_SPEED = 0.6; // radians per second

export class Keeper extends Character {
  private orbiters: THREE.Mesh[] = [];
  private orbiterAngles: number[] = [];

  constructor(config: Omit<CharacterConfig, 'id' | 'name'> & Partial<Pick<CharacterConfig, 'id' | 'name'>>) {
    super({
      id: 'keeper',
      name: 'The Keeper',
      presenceRadius: 8,
      idleRotationSpeed: 0.001,
      hoverAmplitude: 0.08,
      hoverFrequency: 0.15,
      ...config,
    });
  }

  protected buildGeometry(): void {
    // Body: tall narrow cone
    const body = this.createPart(new THREE.ConeGeometry(0.4, 3.5, 6));
    body.position.y = 1.75;
    this.group.add(body);

    // Head: small sphere
    const head = this.createPart(new THREE.SphereGeometry(0.3, 8, 6));
    head.position.y = 3.7;
    this.group.add(head);

    // Antenna: thin cylinder above head
    const antenna = this.createPart(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 4));
    antenna.position.y = 4.65;
    this.group.add(antenna);

    // Antenna tip: tiny sphere
    const tip = this.createPart(new THREE.SphereGeometry(0.08, 6, 4));
    tip.position.y = 5.45;
    this.group.add(tip);

    // Orbiting spheres (electrons)
    for (let i = 0; i < ORBIT_COUNT; i++) {
      const orb = this.createPart(new THREE.SphereGeometry(0.1, 6, 4));
      const angle = (i / ORBIT_COUNT) * Math.PI * 2;
      this.orbiterAngles.push(angle);
      orb.position.set(
        Math.cos(angle) * ORBIT_RADIUS,
        2.5 + Math.sin(angle * 2) * 0.8,
        Math.sin(angle) * ORBIT_RADIUS
      );
      this.orbiters.push(orb);
      this.group.add(orb);
    }
  }

  update(delta: number, elapsed: number): void {
    super.update(delta, elapsed);

    // Animate orbiting spheres
    if (this.state === 'idle') {
      for (let i = 0; i < this.orbiters.length; i++) {
        this.orbiterAngles[i] += ORBIT_SPEED * delta;
        const angle = this.orbiterAngles[i];
        const heightPhase = angle * 2 + i * 1.2;
        this.orbiters[i].position.set(
          Math.cos(angle) * ORBIT_RADIUS,
          2.5 + Math.sin(heightPhase) * 0.8,
          Math.sin(angle) * ORBIT_RADIUS
        );
      }
    }
  }
}
