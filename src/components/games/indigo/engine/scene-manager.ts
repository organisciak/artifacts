import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import type { IndigoScene, SceneContext } from '../scenes/types';
import type { IndigoRenderer } from './renderer';
import { GameStateManager, type SceneId } from './game-state';
import { INDIGO_PALETTE, type FogPreset, lerpFog, applyFog, FOG_PRESETS } from './palette';
import type { CameraController } from './camera';
import { DialogueSystem } from '../narrative/dialogue-system';
import { DialogueRenderer } from '../narrative/dialogue-renderer';
import type { InputState } from './input';

// ─── Transition Types ────────────────────────────────────────────────────────

export type TransitionType = 'fog' | 'signal';

/** Transition phase controls rendering behavior during transitions. */
type TransitionPhase =
  | 'none'          // no transition active
  | 'fade-out'      // dissolving current scene
  | 'void'          // pure color/static pause between scenes
  | 'fade-in';      // revealing new scene

interface TransitionState {
  type: TransitionType;
  phase: TransitionPhase;
  /** Progress 0..1 within current phase */
  progress: number;
  /** Total elapsed time in the current phase */
  elapsed: number;
  /** Duration of the current phase in seconds */
  duration: number;
  /** Text to show during the void phase (title/subtitle) */
  voidTitle?: string;
  voidSubtitle?: string;
}

// ─── Static/Noise Shader for The Signal transition ───────────────────────────

const StaticNoiseShader = {
  uniforms: {
    tDiffuse: { value: null },
    uAmount: { value: 0 }, // 0 = scene visible, 1 = full static
    uTime: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uAmount;
    uniform float uTime;
    varying vec2 vUv;

    // Simple hash for noise
    float hash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec4 scene = texture2D(tDiffuse, vUv);

      // Animated static noise
      float n = hash(vUv * 800.0 + uTime * 43.758);
      // Tint noise with indigo
      vec3 noiseColor = mix(
        vec3(0.1, 0.0, 0.2),  // dark indigo
        vec3(0.42, 0.25, 0.63), // signal violet
        n
      );

      // Scanlines
      float scanline = sin(vUv.y * 600.0 + uTime * 10.0) * 0.5 + 0.5;
      noiseColor *= 0.7 + 0.3 * scanline;

      gl_FragColor = vec4(mix(scene.rgb, noiseColor, uAmount), 1.0);
    }
  `,
};

// ─── Timing ──────────────────────────────────────────────────────────────────

/** Phase durations in seconds */
const FOG_TIMING = {
  fadeOut: 1.4,
  void: 1.6,
  fadeIn: 1.4,
} as const;

const SIGNAL_TIMING = {
  fadeOut: 1.2,
  void: 1.2,
  fadeIn: 1.2,
} as const;

// ─── Fog presets for the void ────────────────────────────────────────────────

const VOID_FOG: FogPreset = {
  color: INDIGO_PALETTE.deepIndigo.clone(),
  near: 0.1,
  far: 2,
  density: 0.8,
};

// ─── Scene Registry ──────────────────────────────────────────────────────────

/** Map of scene IDs to scene constructors/instances. */
const sceneRegistry = new Map<SceneId, () => IndigoScene>();

/** Register a scene class with the manager. */
export function registerScene(id: SceneId, factory: () => IndigoScene): void {
  sceneRegistry.set(id, factory);
}

// ─── SceneManager ────────────────────────────────────────────────────────────

export class SceneManager {
  private currentScene: IndigoScene | null = null;
  private renderer: IndigoRenderer;
  private gameState: GameStateManager;
  private cameraController: CameraController;

  /** Dialogue system for current scene */
  private dialogueSystem: DialogueSystem | null = null;
  private dialogueRenderer: DialogueRenderer | null = null;

  private transition: TransitionState = {
    type: 'fog',
    phase: 'none',
    progress: 0,
    elapsed: 0,
    duration: 0,
  };

  /** Saved fog preset from the scene before transition */
  private preFog: FogPreset | null = null;

  /** Shader pass for The Signal transition (lazy-created) */
  private staticPass: THREE.ShaderMaterial | null = null;
  private staticPassUniforms: Record<string, { value: unknown }> | null = null;

  /** Pending scene to load during void phase */
  private pendingSceneId: SceneId | null = null;

  /** Callback invoked when transition void phase starts (for audio crossfade). */
  onTransitionVoid: ((from: SceneId | null, to: SceneId) => void) | null = null;

  /** Callback invoked when a transition completes. */
  onTransitionComplete: ((sceneId: SceneId) => void) | null = null;

  /** Callback for overlay UI (title text during void). */
  onVoidText: ((title?: string, subtitle?: string) => void) | null = null;

  /** Callback to clear void text. */
  onVoidTextClear: (() => void) | null = null;

  /** Callback when dialogue state changes (for UI). */
  onDialogueStateChange: ((inDialogue: boolean) => void) | null = null;

  /** Container element for dialogue renderer */
  public container: HTMLElement | null = null;

  /** Audio engine for dialogue sounds */
  public audio: any | null = null; // IndigoSynthEngine type

  constructor(renderer: IndigoRenderer, gameState: GameStateManager, cameraController: CameraController) {
    this.renderer = renderer;
    this.gameState = gameState;
    this.cameraController = cameraController;
  }

  // ─── Public API ────────────────────────────────────────────────────────

  /** Setup dialogue system for a scene. */
  private setupDialogueSystem(sceneId: SceneId, scene: IndigoScene): void {
    // Clean up previous dialogue system
    if (this.dialogueRenderer) {
      this.dialogueRenderer.dispose();
      this.dialogueRenderer = null;
    }
    this.dialogueSystem = null;

    // Only create if we have a container
    if (!this.container) {
      console.warn('[SceneManager] No container for dialogue renderer');
      return;
    }

    const characterInstances = scene.getCharacterInstances();
    if (characterInstances.length === 0) {
      // No characters in scene, skip dialogue system
      return;
    }

    // Create dialogue renderer
    this.dialogueRenderer = new DialogueRenderer({
      container: this.container,
      camera: this.renderer.camera,
    });

    // Create dialogue system
    this.dialogueSystem = new DialogueSystem({
      sceneId,
      characters: characterInstances,
      camera: this.cameraController,
      gameState: this.gameState,
      audio: this.audio,
      rendererConfig: {
        container: this.container,
        camera: this.renderer.camera,
      },
    });

    // Wire up dialogue events
    this.dialogueSystem.on((event) => {
      if (event.type === 'interaction-start') {
        this.onDialogueStateChange?.(true);
        // Set anchor for text rendering (character position)
        const char = characterInstances.find(c => c.id === event.characterId);
        if (char && this.dialogueRenderer) {
          this.dialogueRenderer.setAnchor(char.getWorldPosition());
        }
      } else if (event.type === 'dialogue-complete') {
        this.onDialogueStateChange?.(false);
        this.dialogueRenderer?.clear();
      } else if (event.type === 'line-start') {
        // Add line to renderer
        this.dialogueRenderer?.addLine(event.text, event.lineIndex);
      }
    });
  }

  /** Get the context object passed to scenes. */
  private getContext(): SceneContext {
    return {
      renderer: this.renderer,
      gameState: this.gameState,
      requestTransition: (to: SceneId) => this.transitionTo(to),
    };
  }

  /** Load a scene immediately (no transition). Used for initial load. */
  async loadScene(sceneId: SceneId): Promise<void> {
    // Clean up current
    if (this.currentScene) {
      this.currentScene.cleanup(this.getContext());
    }

    // Clear the Three.js scene of user objects (keep lights/fog)
    this.clearSceneObjects();

    const scene = this.createScene(sceneId);
    if (!scene) {
      throw new Error(`No scene registered for id: ${sceneId}`);
    }

    await scene.setup(this.getContext());

    // Set camera to spawn point
    const spawn = scene.getSpawnPoint();
    this.renderer.camera.position.copy(spawn);

    // Register scene characters as POIs for interaction
    const characters = scene.getCharacters();
    const pois = characters.map(char => ({
      position: char.position,
      radius: 3.0, // INTERACTION_RADIUS from dialogue system
      label: 'listen',
    }));
    this.cameraController.setPointsOfInterest(pois);

    // Create dialogue system for this scene
    this.setupDialogueSystem(sceneId, scene);

    this.currentScene = scene;
    this.gameState.setCurrentScene(sceneId);
  }

  /** Begin a transition to a new scene. */
  transitionTo(sceneId: SceneId, type?: TransitionType): void {
    if (this.transition.phase !== 'none') return; // already transitioning

    // Determine transition type: radio tower scenes use "signal", others use "fog"
    const transType = type ?? this.pickTransitionType(sceneId);
    const timing = transType === 'signal' ? SIGNAL_TIMING : FOG_TIMING;

    this.pendingSceneId = sceneId;

    // Snapshot current fog for lerping
    if (this.renderer.scene.fog instanceof THREE.FogExp2) {
      this.preFog = {
        color: (this.renderer.scene.fog as THREE.FogExp2).color.clone(),
        near: 1,
        far: 80,
        density: (this.renderer.scene.fog as THREE.FogExp2).density,
      };
    } else {
      this.preFog = { ...FOG_PRESETS.default };
    }

    this.transition = {
      type: transType,
      phase: 'fade-out',
      progress: 0,
      elapsed: 0,
      duration: timing.fadeOut,
      voidTitle: undefined,
      voidSubtitle: undefined,
    };
  }

  /** Called every frame from the game loop. */
  update(delta: number, elapsed: number, input?: InputState): void {
    // Update transition
    if (this.transition.phase !== 'none') {
      this.updateTransition(delta);
    }

    // Update dialogue system
    if (this.dialogueSystem && input) {
      const playerPos = this.renderer.camera.position;
      this.dialogueSystem.update(playerPos, input, delta);
    }

    // Update dialogue renderer
    if (this.dialogueRenderer) {
      this.dialogueRenderer.update(delta);
    }

    // Update current scene
    if (this.currentScene) {
      this.currentScene.update(this.getContext(), delta, elapsed);
    }

    // Update static noise shader time
    if (this.staticPassUniforms) {
      this.staticPassUniforms.uTime.value = elapsed;
    }
  }

  /** Whether a transition is currently playing. */
  get isTransitioning(): boolean {
    return this.transition.phase !== 'none';
  }

  /** Current transition progress info (for UI overlays). */
  get transitionInfo(): Readonly<TransitionState> {
    return this.transition;
  }

  /** The active scene instance. */
  get activeScene(): IndigoScene | null {
    return this.currentScene;
  }

  /** Dispose the scene manager. */
  dispose(): void {
    if (this.currentScene) {
      this.currentScene.cleanup(this.getContext());
      this.currentScene = null;
    }
    this.staticPass?.dispose();
    this.staticPass = null;
    this.staticPassUniforms = null;
  }

  // ─── Transition Logic ──────────────────────────────────────────────────

  private updateTransition(delta: number): void {
    const t = this.transition;
    t.elapsed += delta;
    t.progress = Math.min(t.elapsed / t.duration, 1);

    if (t.type === 'fog') {
      this.updateFogTransition(t);
    } else {
      this.updateSignalTransition(t);
    }

    // Phase complete → advance
    if (t.progress >= 1) {
      this.advancePhase();
    }
  }

  private updateFogTransition(t: TransitionState): void {
    if (!this.preFog) return;

    // Ease function: smooth step
    const eased = smoothstep(t.progress);

    switch (t.phase) {
      case 'fade-out':
        // Increase fog density to dissolve the world into indigo mist
        lerpFog(this.renderer.scene, this.preFog, VOID_FOG, eased);
        break;

      case 'void':
        // Stay in the void — pure color
        applyFog(this.renderer.scene, VOID_FOG);
        break;

      case 'fade-in': {
        // Recede fog to reveal new scene
        const targetFog = this.getSceneFog();
        lerpFog(this.renderer.scene, VOID_FOG, targetFog, eased);
        break;
      }
    }
  }

  private updateSignalTransition(t: TransitionState): void {
    const eased = smoothstep(t.progress);
    const amount = t.phase === 'fade-out' ? eased
      : t.phase === 'void' ? 1
      : 1 - eased;

    this.setStaticAmount(amount);
  }

  private advancePhase(): void {
    const t = this.transition;
    const timing = t.type === 'signal' ? SIGNAL_TIMING : FOG_TIMING;

    switch (t.phase) {
      case 'fade-out': {
        // Enter the void — swap scenes
        const fromId = this.currentScene?.id ?? null;

        // Cleanup old scene
        if (this.currentScene) {
          this.currentScene.cleanup(this.getContext());
          this.currentScene = null;
        }
        this.clearSceneObjects();

        // Get the pending scene's title for the void display
        if (this.pendingSceneId) {
          const pendingScene = this.createScene(this.pendingSceneId);
          if (pendingScene) {
            t.voidTitle = pendingScene.title;
            t.voidSubtitle = pendingScene.subtitle;
          }
          // Notify audio to crossfade
          this.onTransitionVoid?.(fromId, this.pendingSceneId);
          // Notify UI to show void text
          this.onVoidText?.(t.voidTitle, t.voidSubtitle);
        }

        // Transition to void phase
        t.phase = 'void';
        t.progress = 0;
        t.elapsed = 0;
        t.duration = timing.void;
        break;
      }

      case 'void': {
        // Load the new scene
        if (this.pendingSceneId) {
          const scene = this.createScene(this.pendingSceneId);
          if (scene) {
            scene.setup(this.getContext());
            const spawn = scene.getSpawnPoint();
            this.renderer.camera.position.copy(spawn);

            // Register scene characters as POIs for interaction
            const characters = scene.getCharacters();
            const pois = characters.map(char => ({
              position: char.position,
              radius: 3.0, // INTERACTION_RADIUS from dialogue system
              label: 'listen',
            }));
            this.cameraController.setPointsOfInterest(pois);

            // Setup dialogue system for new scene
            this.setupDialogueSystem(this.pendingSceneId, scene);

            this.currentScene = scene;
            this.gameState.setCurrentScene(this.pendingSceneId);
          }
        }

        // Clear void text
        this.onVoidTextClear?.();

        // Transition to fade-in
        t.phase = 'fade-in';
        t.progress = 0;
        t.elapsed = 0;
        t.duration = timing.fadeIn;
        break;
      }

      case 'fade-in': {
        // Transition complete
        t.phase = 'none';
        t.progress = 0;
        t.elapsed = 0;

        // Clean up signal static
        if (t.type === 'signal') {
          this.setStaticAmount(0);
        }

        this.pendingSceneId = null;
        this.preFog = null;

        if (this.currentScene) {
          this.onTransitionComplete?.(this.currentScene.id);
        }
        break;
      }
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

  private createScene(sceneId: SceneId): IndigoScene | null {
    const factory = sceneRegistry.get(sceneId);
    return factory ? factory() : null;
  }

  /** Remove all user-added objects from the Three.js scene, preserving lights and fog. */
  private clearSceneObjects(): void {
    const scene = this.renderer.scene;
    const toRemove: THREE.Object3D[] = [];

    scene.traverse((obj) => {
      // Keep lights, cameras, and the scene itself
      if (
        obj === scene ||
        obj instanceof THREE.Light ||
        obj instanceof THREE.Camera
      ) {
        return;
      }
      // Only remove top-level children (traverse walks depth-first)
      if (obj.parent === scene) {
        toRemove.push(obj);
      }
    });

    for (const obj of toRemove) {
      scene.remove(obj);
      // Dispose geometry and materials
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
  }

  /** Pick transition type based on scene IDs. */
  private pickTransitionType(toSceneId: SceneId): TransitionType {
    const fromId = this.currentScene?.id;
    // Use The Signal for radio tower bookend scenes
    if (fromId === 'radio-tower' || toSceneId === 'radio-tower' ||
        fromId === 'the-signal' || toSceneId === 'the-signal') {
      return 'signal';
    }
    return 'fog';
  }

  /** Get the fog preset for the current/pending scene, falling back to default. */
  private getSceneFog(): FogPreset {
    // Scenes can declare their own fog; for now fall back to default
    return FOG_PRESETS.default;
  }

  /** Set the static noise amount (0 = off, 1 = full static). */
  private setStaticAmount(amount: number): void {
    if (this.staticPassUniforms) {
      this.staticPassUniforms.uAmount.value = amount;
    }
  }

  /**
   * Install the static noise shader pass into the composer's pipeline.
   * Call once after creating the renderer.
   */
  installStaticPass(): void {
    const pass = new ShaderPass(StaticNoiseShader);
    // Insert before the output pass (last pass)
    const passes = this.renderer.composer.passes;
    const insertIdx = Math.max(passes.length - 1, 0);
    this.renderer.composer.insertPass(pass, insertIdx);
    this.staticPass = pass.material;
    this.staticPassUniforms = pass.uniforms;
  }
}

// ─── Utility ─────────────────────────────────────────────────────────────────

/** Hermite smoothstep for eased transitions. */
function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}
