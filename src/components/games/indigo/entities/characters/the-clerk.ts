import * as THREE from 'three';
import { Character, type CharacterConfig } from '../character';

// ---------------------------------------------------------------------------
// The Clerk — Motel scene
//
// Behind a counter (flat plane), with numerous small cube "keys" floating
// around them. Compact, contained, slightly unsettling stillness.
// A figure that has been standing there forever.
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: Partial<CharacterConfig> = {
  id: 'clerk',
  name: 'The Clerk',
  presenceRadius: 5,
  shaderOptions: { innerGlowStrength: 0.45 }, // dimmer — unsettling
  hoverAmplitude: 0.02, // almost no movement — stillness is the point
  hoverFrequency: 0.1,
  idleRotationSpeed: 0.0005, // barely turning
};

const KEY_COUNT = 7;

export class TheClerk extends Character {
  private floatingKeys: THREE.Mesh[] = [];

  constructor(config: Partial<CharacterConfig> & { position: THREE.Vector3 }) {
    super({ ...DEFAULT_CONFIG, ...config } as CharacterConfig);
  }

  protected buildGeometry(): void {
    // Initialize arrays before use
    this.floatingKeys = [];

    // --- Counter: wide flat plane ---
    const counterGeo = new THREE.BoxGeometry(2.8, 0.8, 0.6);
    const counter = this.createPart(counterGeo);
    counter.position.set(0, 0.4, 0.8);
    this.group.add(counter);

    // --- Figure body: compact cylinder (behind counter) ---
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.35, 1.8, 6);
    const body = this.createPart(bodyGeo);
    body.position.y = 1.7;
    this.group.add(body);

    // --- Head: sphere, slightly larger for contained feel ---
    const headGeo = new THREE.SphereGeometry(0.24, 8, 6);
    const head = this.createPart(headGeo);
    head.position.y = 2.85;
    this.group.add(head);

    // --- Shoulders: flat, wide box ---
    const shoulderGeo = new THREE.BoxGeometry(0.9, 0.15, 0.3);
    const shoulders = this.createPart(shoulderGeo);
    shoulders.position.y = 2.5;
    this.group.add(shoulders);

    // --- Floating cube keys ---
    for (let i = 0; i < KEY_COUNT; i++) {
      const keyGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
      const key = this.createPart(keyGeo);
      this.floatingKeys.push(key);
      this.group.add(key);
    }
  }

  override update(delta: number, elapsed: number): void {
    super.update(delta, elapsed);

    // Animate floating keys in a slow orbital cloud
    for (let i = 0; i < this.floatingKeys.length; i++) {
      const key = this.floatingKeys[i];
      const t = elapsed * 0.15 + (i / KEY_COUNT) * Math.PI * 2;
      const radius = 0.8 + (i % 3) * 0.3;
      const yBase = 2.0 + (i % 4) * 0.4;

      key.position.set(
        Math.cos(t + i * 0.7) * radius,
        yBase + Math.sin(elapsed * 0.3 + i * 1.3) * 0.2,
        Math.sin(t + i * 0.7) * radius * 0.6,
      );

      // Slow tumble rotation
      key.rotation.x = elapsed * 0.2 + i;
      key.rotation.y = elapsed * 0.15 + i * 0.5;
    }
  }
}
