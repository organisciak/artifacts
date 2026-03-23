import * as THREE from 'three';
import { Character, type CharacterConfig } from '../character';
import { createSilhouetteMaterial } from '../../engine/shaders';

// ---------------------------------------------------------------------------
// The Reflection — Lake scene
//
// A figure standing on a dock, mirrored below the water plane with slight
// distortion. Two figures — one real, one reflection — but which is which?
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: Partial<CharacterConfig> = {
  id: 'reflection',
  name: 'The Reflection',
  presenceRadius: 7,
  shaderOptions: { innerGlowStrength: 0.65, opacity: 0.9 },
  hoverAmplitude: 0.04, // very still — contemplative
  hoverFrequency: 0.15,
  idleRotationSpeed: 0.0008,
};

export class TheReflection extends Character {
  private reflectionGroup!: THREE.Group;
  private reflectionMaterial: THREE.ShaderMaterial;

  constructor(config: Partial<CharacterConfig> & { position: THREE.Vector3 }) {
    // Create the reflection material before super() stores it
    const reflectionMat = createSilhouetteMaterial({
      innerGlowStrength: 0.4,
      opacity: 0.55, // more translucent — watery, uncertain
    });
    // Store temporarily — we'll use it in buildGeometry
    // (can't access before super, so we use a class field)
    super({ ...DEFAULT_CONFIG, ...config } as CharacterConfig);
    this.reflectionMaterial = reflectionMat;
    // buildGeometry already ran in super — rebuild reflection with proper material
    this.buildReflection();
  }

  protected buildGeometry(): void {
    // --- Dock: flat plane ---
    const dockGeo = new THREE.BoxGeometry(2.5, 0.08, 1.2);
    const dock = this.createPart(dockGeo);
    dock.position.set(0, 0, 0.3);
    this.group.add(dock);

    // --- Real figure (above water) ---
    this.buildFigure(this.group, 1);
  }

  /** Build the mirrored reflection after material is ready. */
  private buildReflection(): void {
    this.reflectionGroup = new THREE.Group();
    this.reflectionGroup.name = 'reflection_mirror';

    this.buildFigure(this.reflectionGroup, -1, this.reflectionMaterial);

    // Mirror below the dock plane: scale Y by -1
    this.reflectionGroup.scale.y = -1;
    this.reflectionGroup.position.y = -0.16; // slight offset below dock surface

    this.group.add(this.reflectionGroup);
  }

  /** Build a humanoid figure into the target group. dir=1 upright, dir=-1 (ignored, handled by scale). */
  private buildFigure(
    target: THREE.Group,
    _dir: number,
    mat?: THREE.ShaderMaterial,
  ): void {
    const makePart = (geo: THREE.BufferGeometry) =>
      new THREE.Mesh(geo, mat ?? this.material);

    // Body: elongated cone
    const bodyGeo = new THREE.ConeGeometry(0.35, 2.4, 6);
    const body = makePart(bodyGeo);
    body.position.y = 1.5;
    target.add(body);

    // Head: sphere
    const headGeo = new THREE.SphereGeometry(0.22, 8, 6);
    const head = makePart(headGeo);
    head.position.y = 2.95;
    target.add(head);

    // Arms: thin cylinders angled down
    for (const side of [-1, 1]) {
      const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 4);
      const arm = makePart(armGeo);
      arm.position.set(side * 0.4, 1.8, 0);
      arm.rotation.z = side * 0.25;
      target.add(arm);
    }
  }

  override update(delta: number, elapsed: number): void {
    super.update(delta, elapsed);

    if (this.reflectionGroup) {
      // Subtle distortion: the reflection shimmers
      const wobble = Math.sin(elapsed * 0.7) * 0.02;
      this.reflectionGroup.position.x = wobble;
      this.reflectionGroup.scale.x = 1.0 + Math.sin(elapsed * 1.1) * 0.015;

      // Update reflection material time
      this.reflectionMaterial.uniforms.uTime.value = elapsed;
    }
  }

  override dispose(): void {
    super.dispose();
    this.reflectionMaterial.dispose();
  }
}
