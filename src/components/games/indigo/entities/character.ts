import * as THREE from 'three';
import { createSilhouetteMaterial, type SilhouetteOptions } from '../engine/shaders';

// ---------------------------------------------------------------------------
// Character — base class for all geometric figures in The Indigo Frequency.
//
// Characters are assemblages of simple primitives: cones, cylinders, spheres.
// They suggest human form without depicting it — shadow puppets made of math.
// ---------------------------------------------------------------------------

export type CharacterConfig = {
  /** Unique ID matching game state tracking */
  id: string;
  /** Display name */
  name: string;
  /** World position */
  position: THREE.Vector3;
  /** Presence radius — audio/visual changes within this range */
  presenceRadius?: number;
  /** Silhouette shader options */
  shaderOptions?: SilhouetteOptions;
  /** Idle rotation speed in radians/sec (very slow) */
  idleRotationSpeed?: number;
  /** Hover amplitude in world units */
  hoverAmplitude?: number;
  /** Hover frequency in Hz */
  hoverFrequency?: number;
};

export type CharacterState = 'idle' | 'interacting';

export abstract class Character {
  readonly id: string;
  readonly name: string;
  readonly presenceRadius: number;

  /** Root Group containing all geometry for this character */
  readonly group: THREE.Group;

  /** Material shared across the character's body parts */
  protected material: THREE.ShaderMaterial;

  /** Current animation state */
  protected state: CharacterState = 'idle';

  // --- Idle animation params ---
  private idleRotationSpeed: number;
  private hoverAmplitude: number;
  private hoverFrequency: number;
  private baseY: number;

  // --- Interaction glow ---
  private baseGlowStrength: number;
  private targetGlowStrength: number;

  constructor(config: CharacterConfig) {
    this.id = config.id;
    this.name = config.name;
    this.presenceRadius = config.presenceRadius ?? 6;

    this.idleRotationSpeed = config.idleRotationSpeed ?? 0.0017; // ~0.1 deg/sec
    this.hoverAmplitude = config.hoverAmplitude ?? 0.15;
    this.hoverFrequency = config.hoverFrequency ?? 0.25;

    // Create the silhouette material
    const shaderOpts = config.shaderOptions ?? {};
    this.material = createSilhouetteMaterial(shaderOpts);
    this.baseGlowStrength = shaderOpts.innerGlowStrength ?? 0.6;
    this.targetGlowStrength = this.baseGlowStrength;

    // Root group
    this.group = new THREE.Group();
    this.group.position.copy(config.position);
    this.group.name = `character_${this.id}`;
    this.baseY = config.position.y;

    // Subclasses build geometry inside buildGeometry()
    this.buildGeometry();
  }

  // --- Abstract: subclasses define their geometry ---

  /** Build the geometric assemblage for this character. Add meshes to this.group. */
  protected abstract buildGeometry(): void;

  // --- Public API ---

  /** Add character to a scene or group. */
  addToScene(parent: THREE.Object3D): void {
    parent.add(this.group);
  }

  /** Remove character from a scene or group. */
  removeFromScene(parent: THREE.Object3D): void {
    parent.remove(this.group);
  }

  /** Per-frame update. Call from scene update(). */
  update(delta: number, elapsed: number): void {
    if (this.state === 'idle') {
      // Very slow rotation
      this.group.rotation.y += this.idleRotationSpeed * delta * 60;

      // Gentle hover (sine wave)
      const hover = Math.sin(elapsed * this.hoverFrequency * Math.PI * 2) * this.hoverAmplitude;
      this.group.position.y = this.baseY + hover;
    }

    // Smooth glow transition
    const currentGlow = this.material.uniforms.uInnerGlowStrength.value as number;
    const glowLerp = 1 - Math.pow(0.92, delta * 60);
    this.material.uniforms.uInnerGlowStrength.value =
      currentGlow + (this.targetGlowStrength - currentGlow) * glowLerp;

    // Update shader time
    this.material.uniforms.uTime.value = elapsed;
  }

  /** Set the mood uniform on this character's material. */
  setMood(mood: number): void {
    this.material.uniforms.uMood.value = mood;
  }

  /** Begin interaction — glow intensifies, idle animation pauses. */
  beginInteraction(): void {
    this.state = 'interacting';
    this.targetGlowStrength = this.baseGlowStrength * 2.5;
  }

  /** End interaction — return to idle. */
  endInteraction(): void {
    this.state = 'idle';
    this.targetGlowStrength = this.baseGlowStrength;
  }

  /** Check if a world position is within this character's presence radius. */
  isInPresence(worldPos: THREE.Vector3): boolean {
    const charPos = new THREE.Vector3();
    this.group.getWorldPosition(charPos);
    return worldPos.distanceTo(charPos) <= this.presenceRadius;
  }

  /** Get world position of the character. */
  getWorldPosition(): THREE.Vector3 {
    const pos = new THREE.Vector3();
    this.group.getWorldPosition(pos);
    return pos;
  }

  /** Dispose geometry and materials. */
  dispose(): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
      }
    });
    this.material.dispose();
  }

  // --- Helper for subclasses ---

  /** Create a mesh with the character's silhouette material. */
  protected createPart(geometry: THREE.BufferGeometry): THREE.Mesh {
    return new THREE.Mesh(geometry, this.material);
  }
}
