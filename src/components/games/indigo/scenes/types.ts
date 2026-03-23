import * as THREE from 'three';
import type { SceneId, GameStateManager } from '../engine/game-state';
import type { IndigoRenderer } from '../engine/renderer';
import type { Character } from '../entities/character';

/** Character stub for scene population. */
export interface SceneCharacter {
  id: string;
  name: string;
  position: THREE.Vector3;
  /** Mesh or group added to the Three.js scene */
  object?: THREE.Object3D;
}

/** Interactable object in a scene. */
export interface SceneInteractable {
  id: string;
  position: THREE.Vector3;
  radius: number; // trigger radius for proximity
  object?: THREE.Object3D;
  onInteract?: () => void;
}

/** Context passed to every scene lifecycle method. */
export interface SceneContext {
  renderer: IndigoRenderer;
  gameState: GameStateManager;
  /** Request a scene transition from the SceneManager. */
  requestTransition: (to: SceneId) => void;
}

/**
 * Scene interface — every scene in The Indigo Frequency implements this.
 *
 * Lifecycle:
 *   1. setup()   — Build geometry, lights, characters. Add to renderer.scene.
 *   2. update()  — Called every frame with delta time and elapsed time.
 *   3. cleanup() — Tear down. Remove objects, dispose geometry/materials.
 */
export interface IndigoScene {
  /** Unique scene identifier */
  readonly id: SceneId;

  /** Human-readable name displayed during transitions */
  readonly title: string;

  /** Optional subtitle / poetic fragment shown during fog transition */
  readonly subtitle?: string;

  /** Build the scene's 3D environment. */
  setup(ctx: SceneContext): void | Promise<void>;

  /** Per-frame update. */
  update(ctx: SceneContext, delta: number, elapsed: number): void;

  /** Tear down everything this scene created. */
  cleanup(ctx: SceneContext): void;

  /** Starting camera/player position for this scene. */
  getSpawnPoint(): THREE.Vector3;

  /** Characters present in this scene. */
  getCharacters(): SceneCharacter[];

  /** Get actual Character instances for dialogue system. */
  getCharacterInstances(): Character[];

  /** Interactable objects in this scene. */
  getInteractables(): SceneInteractable[];
}
