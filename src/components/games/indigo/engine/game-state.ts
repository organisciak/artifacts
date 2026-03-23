import type { SceneName } from '../audio/synth-engine';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SceneId =
  | 'radio-tower'
  | 'gas-station'
  | 'the-lake'
  | 'the-motel'
  | 'the-signal';

/** Per-scene state tracking */
export interface SceneState {
  charactersSpokenTo: Set<string>;
  interactionsCompleted: Set<string>;
  objectiveMet: boolean;
}

/** Global game state persisted across sessions */
export interface GameState {
  currentScene: SceneId;
  scenesVisited: SceneId[];
  emotionalIntensity: number; // 0-1 float, increases as you progress
  sceneStates: Record<string, SceneState>;
}

/** Serializable form for localStorage */
interface SerializedGameState {
  currentScene: SceneId;
  scenesVisited: SceneId[];
  emotionalIntensity: number;
  sceneStates: Record<string, {
    charactersSpokenTo: string[];
    interactionsCompleted: string[];
    objectiveMet: boolean;
  }>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'indigo-frequency-save';

/** Scene progression order */
export const SCENE_ORDER: SceneId[] = [
  'radio-tower',
  'gas-station',
  'the-lake',
  'the-motel',
  'the-signal',
];

/** Emotional intensity ramp — each scene's entry point.
 *  Actual intensity ramps within the scene via atmosphere.ts computeIntensity(). */
const INTENSITY_PER_SCENE: Record<SceneId, number> = {
  'radio-tower': 0.10,
  'gas-station': 0.30,
  'the-lake': 0.50,
  'the-motel': 0.70,
  'the-signal': 0.90,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createEmptySceneState(): SceneState {
  return {
    charactersSpokenTo: new Set(),
    interactionsCompleted: new Set(),
    objectiveMet: false,
  };
}

function createDefaultGameState(): GameState {
  return {
    currentScene: 'radio-tower',
    scenesVisited: [],
    emotionalIntensity: 0.1,
    sceneStates: {},
  };
}

function serialize(state: GameState): SerializedGameState {
  const sceneStates: SerializedGameState['sceneStates'] = {};
  for (const [id, ss] of Object.entries(state.sceneStates)) {
    sceneStates[id] = {
      charactersSpokenTo: Array.from(ss.charactersSpokenTo),
      interactionsCompleted: Array.from(ss.interactionsCompleted),
      objectiveMet: ss.objectiveMet,
    };
  }
  return {
    currentScene: state.currentScene,
    scenesVisited: [...state.scenesVisited],
    emotionalIntensity: state.emotionalIntensity,
    sceneStates,
  };
}

function deserialize(data: SerializedGameState): GameState {
  const sceneStates: Record<string, SceneState> = {};
  for (const [id, ss] of Object.entries(data.sceneStates)) {
    sceneStates[id] = {
      charactersSpokenTo: new Set(ss.charactersSpokenTo),
      interactionsCompleted: new Set(ss.interactionsCompleted),
      objectiveMet: ss.objectiveMet,
    };
  }
  return {
    currentScene: data.currentScene,
    scenesVisited: [...data.scenesVisited],
    emotionalIntensity: data.emotionalIntensity,
    sceneStates,
  };
}

// ─── Game State Manager ──────────────────────────────────────────────────────

export class GameStateManager {
  private state: GameState;

  constructor() {
    this.state = createDefaultGameState();
  }

  /** Load state from localStorage. Returns true if a save was found. */
  load(): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as SerializedGameState;
      this.state = deserialize(parsed);
      return true;
    } catch {
      return false;
    }
  }

  /** Persist current state to localStorage. */
  save(): void {
    try {
      const serialized = serialize(this.state);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
    } catch {
      // localStorage may be unavailable (SSR, private browsing quota, etc.)
    }
  }

  /** Clear saved state and reset to defaults. */
  reset(): void {
    this.state = createDefaultGameState();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ok
    }
  }

  // ─── Getters ─────────────────────────────────────────────────────────

  get currentScene(): SceneId {
    return this.state.currentScene;
  }

  get scenesVisited(): readonly SceneId[] {
    return this.state.scenesVisited;
  }

  get emotionalIntensity(): number {
    return this.state.emotionalIntensity;
  }

  /** Get (or create) per-scene state. */
  getSceneState(sceneId: SceneId): SceneState {
    if (!this.state.sceneStates[sceneId]) {
      this.state.sceneStates[sceneId] = createEmptySceneState();
    }
    return this.state.sceneStates[sceneId];
  }

  /** Full snapshot (read-only reference). */
  getSnapshot(): Readonly<GameState> {
    return this.state;
  }

  // ─── Mutations ───────────────────────────────────────────────────────

  /** Transition to a new scene. Updates visited list and emotional intensity. */
  setCurrentScene(sceneId: SceneId): void {
    this.state.currentScene = sceneId;

    if (!this.state.scenesVisited.includes(sceneId)) {
      this.state.scenesVisited.push(sceneId);
    }

    // Emotional intensity ramps with scene progression
    const targetIntensity = INTENSITY_PER_SCENE[sceneId] ?? this.state.emotionalIntensity;
    this.state.emotionalIntensity = Math.max(this.state.emotionalIntensity, targetIntensity);

    this.save();
  }

  /** Mark a character as spoken to in the given scene. */
  markCharacterSpokenTo(sceneId: SceneId, characterId: string): void {
    this.getSceneState(sceneId).charactersSpokenTo.add(characterId);
    this.save();
  }

  /** Mark an interaction as completed in the given scene. */
  markInteractionCompleted(sceneId: SceneId, interactionId: string): void {
    this.getSceneState(sceneId).interactionsCompleted.add(interactionId);
    this.save();
  }

  /** Mark the scene objective as met, unlocking progression. */
  markObjectiveMet(sceneId: SceneId): void {
    this.getSceneState(sceneId).objectiveMet = true;
    this.save();
  }

  /** Check whether a scene's objective is complete. */
  isObjectiveMet(sceneId: SceneId): boolean {
    return this.getSceneState(sceneId).objectiveMet;
  }

  /** Get the next scene in order, or null if at the end. */
  getNextScene(): SceneId | null {
    const idx = SCENE_ORDER.indexOf(this.state.currentScene);
    if (idx < 0 || idx >= SCENE_ORDER.length - 1) return null;
    return SCENE_ORDER[idx + 1];
  }

  /** Check if the player can progress to the next scene. */
  canProgress(): boolean {
    return this.isObjectiveMet(this.state.currentScene) && this.getNextScene() !== null;
  }

  /** Set the emotional intensity directly (used by atmosphere system for intra-scene ramping). */
  setEmotionalIntensity(value: number): void {
    this.state.emotionalIntensity = Math.max(0, Math.min(1, value));
  }

  /** Convert SceneId to the audio engine's SceneName. */
  toAudioSceneName(sceneId: SceneId): SceneName {
    return sceneId as SceneName;
  }
}
