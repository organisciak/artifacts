import * as THREE from 'three';
import { Character, type CharacterConfig } from '../character';

// ---------------------------------------------------------------------------
// The Signal — Finale scene
//
// All previous character geometries combined/overlapping into one composite
// form. Larger. Glowing brighter. A convergence of everyone you've met.
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: Partial<CharacterConfig> = {
  id: 'signal',
  name: 'The Signal',
  presenceRadius: 12, // larger presence
  shaderOptions: { innerGlowStrength: 0.9, opacity: 0.95 }, // brighter
  hoverAmplitude: 0.2,
  hoverFrequency: 0.18,
  idleRotationSpeed: 0.0012,
};

export class TheSignal extends Character {
  private orbitingSpheres: THREE.Mesh[] = [];
  private floatingKeys: THREE.Mesh[] = [];

  constructor(config: Partial<CharacterConfig> & { position: THREE.Vector3 }) {
    super({ ...DEFAULT_CONFIG, ...config } as CharacterConfig);
  }

  protected buildGeometry(): void {
    // Initialize arrays before use
    this.orbitingSpheres = [];
    this.floatingKeys = [];

    const scale = 1.3; // everything is slightly larger

    // =========================================================
    // Keeper geometry: tall cone + antenna + orbiting spheres
    // =========================================================
    const keeperCone = new THREE.ConeGeometry(0.35 * scale, 4.0 * scale, 6);
    const keeperBody = this.createPart(keeperCone);
    keeperBody.position.y = 2.0 * scale;
    this.group.add(keeperBody);

    const antennaGeo = new THREE.CylinderGeometry(0.04 * scale, 0.04 * scale, 1.5 * scale, 4);
    const antenna = this.createPart(antennaGeo);
    antenna.position.y = 5.2 * scale;
    this.group.add(antenna);

    // Orbiting spheres (from Keeper)
    for (let i = 0; i < 3; i++) {
      const sphereGeo = new THREE.SphereGeometry(0.12 * scale, 6, 4);
      const sphere = this.createPart(sphereGeo);
      this.orbitingSpheres.push(sphere);
      this.group.add(sphere);
    }

    // =========================================================
    // Traveler geometry: wide base overlapping the cone
    // =========================================================
    const seatGeo = new THREE.CylinderGeometry(0.7 * scale, 0.85 * scale, 0.3 * scale, 6);
    const seat = this.createPart(seatGeo);
    seat.position.y = 0.3 * scale;
    this.group.add(seat);

    // Traveler legs extending from the base
    for (const side of [-0.25, 0.25]) {
      const legGeo = new THREE.CylinderGeometry(0.08 * scale, 0.08 * scale, 0.8 * scale, 4);
      const leg = this.createPart(legGeo);
      leg.position.set(side * scale, 0.15 * scale, 0.4 * scale);
      leg.rotation.x = Math.PI / 2.5;
      this.group.add(leg);
    }

    // =========================================================
    // Reflection geometry: mirrored arms splayed outward
    // =========================================================
    for (const side of [-1, 1]) {
      const armGeo = new THREE.CylinderGeometry(0.05 * scale, 0.05 * scale, 1.5 * scale, 4);
      const arm = this.createPart(armGeo);
      arm.position.set(side * 0.5 * scale, 2.2 * scale, 0);
      arm.rotation.z = side * 0.4;
      this.group.add(arm);
    }

    // =========================================================
    // Clerk geometry: shoulder box + floating keys
    // =========================================================
    const shoulderGeo = new THREE.BoxGeometry(1.1 * scale, 0.18 * scale, 0.35 * scale);
    const shoulders = this.createPart(shoulderGeo);
    shoulders.position.y = 3.5 * scale;
    this.group.add(shoulders);

    for (let i = 0; i < 5; i++) {
      const keyGeo = new THREE.BoxGeometry(0.14 * scale, 0.14 * scale, 0.14 * scale);
      const key = this.createPart(keyGeo);
      this.floatingKeys.push(key);
      this.group.add(key);
    }

    // =========================================================
    // Composite head: larger sphere — everyone converges
    // =========================================================
    const headGeo = new THREE.SphereGeometry(0.35 * scale, 10, 8);
    const head = this.createPart(headGeo);
    head.position.y = 4.4 * scale;
    this.group.add(head);

    // Antenna tip
    const tipGeo = new THREE.SphereGeometry(0.1 * scale, 6, 4);
    const tip = this.createPart(tipGeo);
    tip.position.y = 6.1 * scale;
    this.group.add(tip);
  }

  override update(delta: number, elapsed: number): void {
    super.update(delta, elapsed);

    const scale = 1.3;

    // Orbiting spheres — faster, wider orbit than Keeper
    const orbitRadius = 1.6 * scale;
    const orbitSpeed = 0.5;
    const orbitCenterY = 4.0 * scale;

    for (let i = 0; i < this.orbitingSpheres.length; i++) {
      const sphere = this.orbitingSpheres[i];
      const angle = elapsed * orbitSpeed + (i / this.orbitingSpheres.length) * Math.PI * 2;
      const yOffset = Math.sin(elapsed * 0.4 + i * 2.0) * 0.6;

      sphere.position.set(
        Math.cos(angle) * orbitRadius,
        orbitCenterY + yOffset,
        Math.sin(angle) * orbitRadius,
      );
    }

    // Floating keys — from Clerk, slightly erratic
    for (let i = 0; i < this.floatingKeys.length; i++) {
      const key = this.floatingKeys[i];
      const t = elapsed * 0.2 + (i / this.floatingKeys.length) * Math.PI * 2;
      const radius = 1.0 * scale + (i % 3) * 0.3;
      const yBase = 2.5 * scale + (i % 3) * 0.5;

      key.position.set(
        Math.cos(t + i * 0.9) * radius,
        yBase + Math.sin(elapsed * 0.35 + i * 1.5) * 0.3,
        Math.sin(t + i * 0.9) * radius * 0.7,
      );

      key.rotation.x = elapsed * 0.25 + i;
      key.rotation.y = elapsed * 0.18 + i * 0.6;
    }
  }
}
