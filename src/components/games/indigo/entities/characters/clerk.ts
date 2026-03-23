import * as THREE from 'three';
import { Character, type CharacterConfig } from '../character';

/**
 * The Clerk — compact, contained figure behind a counter at the Motel.
 *
 * Geometry: short, compact cone body, sphere head, flat plane counter
 * in front, with numerous small cube "keys" floating around them.
 * Slightly unsettling stillness.
 */

const KEY_COUNT = 12;
const KEY_ORBIT_RADIUS = 2.0;

export class Clerk extends Character {
  private keys: THREE.Mesh[] = [];
  private keyPhases: number[] = [];

  constructor(config: Omit<CharacterConfig, 'id' | 'name'> & Partial<Pick<CharacterConfig, 'id' | 'name'>>) {
    super({
      id: 'clerk',
      name: 'The Clerk',
      presenceRadius: 5,
      idleRotationSpeed: 0.0003, // Nearly still — unsettling
      hoverAmplitude: 0.02, // Barely perceptible
      hoverFrequency: 0.08,
      ...config,
    });
  }

  protected buildGeometry(): void {
    // Body: short, compact cone
    const body = this.createPart(new THREE.ConeGeometry(0.5, 2.0, 6));
    body.position.y = 1.0;
    this.group.add(body);

    // Head: sphere, slightly larger relative to body (unsettling proportion)
    const head = this.createPart(new THREE.SphereGeometry(0.32, 8, 6));
    head.position.y = 2.3;
    this.group.add(head);

    // Counter: flat wide plane in front
    const counter = this.createPart(new THREE.BoxGeometry(3.0, 0.9, 0.6));
    counter.position.set(0, 0.45, 1.2);
    this.group.add(counter);

    // Floating keys: small cubes orbiting at various heights
    for (let i = 0; i < KEY_COUNT; i++) {
      const key = this.createPart(new THREE.BoxGeometry(0.12, 0.06, 0.04));
      const phase = (i / KEY_COUNT) * Math.PI * 2 + Math.random() * 0.5;
      this.keyPhases.push(phase);

      const height = 1.5 + (i % 4) * 0.5 + Math.random() * 0.3;
      const radius = KEY_ORBIT_RADIUS * (0.7 + Math.random() * 0.6);
      key.position.set(
        Math.cos(phase) * radius,
        height,
        Math.sin(phase) * radius
      );
      // Random rotation for each key
      key.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

      this.keys.push(key);
      this.group.add(key);
    }
  }

  update(delta: number, elapsed: number): void {
    super.update(delta, elapsed);

    // Animate floating keys — very slow independent orbits
    if (this.state === 'idle') {
      for (let i = 0; i < this.keys.length; i++) {
        // Each key drifts at its own pace
        const speed = 0.15 + (i % 3) * 0.08;
        this.keyPhases[i] += speed * delta;
        const phase = this.keyPhases[i];

        const height = 1.5 + (i % 4) * 0.5 + Math.sin(elapsed * 0.3 + i) * 0.15;
        const radius = KEY_ORBIT_RADIUS * (0.7 + (i % 5) * 0.12);
        this.keys[i].position.set(
          Math.cos(phase) * radius,
          height,
          Math.sin(phase) * radius
        );
        // Slow tumble
        this.keys[i].rotation.y += delta * 0.3;
      }
    }
  }
}
