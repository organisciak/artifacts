import * as THREE from 'three';
import { Character, type CharacterConfig } from '../character';

// ---------------------------------------------------------------------------
// The Keeper — Radio Tower scene
//
// Tall, antenna-like protrusion with small orbiting spheres (like electrons).
// Authoritative vertical presence. A sentinel that watches the signal.
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: Partial<CharacterConfig> = {
  id: 'keeper',
  name: 'The Keeper',
  presenceRadius: 8,
  shaderOptions: { innerGlowStrength: 1.2, opacity: 1.0 }, // Increased glow for visibility
  idleRotationSpeed: 0.001, // slower than default — more solemn
  hoverAmplitude: 0.08,
};

export class TheKeeper extends Character {
  private orbitingSpheres: THREE.Mesh[] = [];

  constructor(config: Partial<CharacterConfig> & { position: THREE.Vector3 }) {
    super({ ...DEFAULT_CONFIG, ...config } as CharacterConfig);
  }

  protected buildGeometry(): void {
    // Initialize orbitingSpheres array (called before field initializers run)
    this.orbitingSpheres = [];
    // --- Main body: tall narrow cone (antenna/tower) ---
    const bodyCone = new THREE.ConeGeometry(0.35, 4.0, 6);
    const body = this.createPart(bodyCone);
    body.position.y = 2.0;
    this.group.add(body);

    // --- Head: small sphere atop the cone ---
    const headGeo = new THREE.SphereGeometry(0.25, 8, 6);
    const head = this.createPart(headGeo);
    head.position.y = 4.3;
    this.group.add(head);

    // --- Antenna spike: thin cylinder above head ---
    const antennaGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 4);
    const antenna = this.createPart(antennaGeo);
    antenna.position.y = 5.4;
    this.group.add(antenna);

    // --- Antenna tip: tiny sphere ---
    const tipGeo = new THREE.SphereGeometry(0.08, 6, 4);
    const tip = this.createPart(tipGeo);
    tip.position.y = 6.4;
    this.group.add(tip);

    // --- Shoulder bars: two thin cylinders ---
    for (const side of [-1, 1]) {
      const barGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.0, 4);
      const bar = this.createPart(barGeo);
      bar.position.set(side * 0.6, 3.6, 0);
      bar.rotation.z = side * 0.3;
      this.group.add(bar);
    }

    // --- Orbiting spheres (electrons) ---
    const orbitCount = 3;
    for (let i = 0; i < orbitCount; i++) {
      const sphereGeo = new THREE.SphereGeometry(0.1, 6, 4);
      const sphere = this.createPart(sphereGeo);
      this.orbitingSpheres.push(sphere);
      this.group.add(sphere);
    }
  }

  override update(delta: number, elapsed: number): void {
    super.update(delta, elapsed);

    // Orbit the electron spheres around the antenna
    const orbitRadius = 1.2;
    const orbitSpeed = 0.4;
    const orbitCenterY = 4.5;

    for (let i = 0; i < this.orbitingSpheres.length; i++) {
      const sphere = this.orbitingSpheres[i];
      const angle = elapsed * orbitSpeed + (i / this.orbitingSpheres.length) * Math.PI * 2;
      const yOffset = Math.sin(elapsed * 0.3 + i * 2.0) * 0.5;

      sphere.position.set(
        Math.cos(angle) * orbitRadius,
        orbitCenterY + yOffset,
        Math.sin(angle) * orbitRadius,
      );
    }
  }
}
