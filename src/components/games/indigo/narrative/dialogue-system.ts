/**
 * DialogueSystem — orchestrates the full interaction flow for The Indigo Frequency.
 *
 * Flow:
 *   1. Player approaches character → glow intensifies, faint tone
 *   2. Player presses interact → camera reframes theatrically
 *   3. Dialogue plays out word by word — no choices, just witnessing
 *   4. After final line, character dims, camera returns
 *   5. Character is 'spent' — revisiting yields one quiet echo
 */

import * as THREE from 'three';
import type { Character } from '../entities/character';
import type { CameraController, ScriptedMove } from '../engine/camera';
import type { InputState } from '../engine/input';
import type { GameStateManager, SceneId } from '../engine/game-state';
import type { IndigoSynthEngine } from '../audio/synth-engine';
import { DialogueRenderer, type DialogueRendererConfig } from './dialogue-renderer';
import type {
  CharacterDialogue,
  DialogueFraming,
  DialoguePhase,
  DialogueEvent,
} from './types';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Distance at which the interact prompt appears. */
const INTERACTION_RADIUS = 3.0;

/** Duration of the camera reframing move in seconds. */
const REFRAME_DURATION = 1.8;

/** Duration of the camera return move in seconds. */
const RETURN_DURATION = 1.4;

/** Hold time after the final line before camera returns (ms). */
const FINAL_HOLD = 2500;

/** Default framing if none specified per character. */
const DEFAULT_FRAMING: DialogueFraming = {
  cameraLookOffset: { x: 0, y: 2.5, z: 0 },
  cameraDistance: 4.5,
  cameraHeight: 2.0,
  textOffset: { x: 0, y: 3.5, z: 0 },
};

// ─── Registered dialogue data ────────────────────────────────────────────────

/** Per-scene dialogue data, keyed by sceneId then characterId. */
const dialogueRegistry = new Map<string, Map<string, {
  dialogue: CharacterDialogue;
  framing: DialogueFraming;
}>>();

/** Register dialogue data for a character in a scene. */
export function registerDialogue(
  sceneId: SceneId,
  dialogue: CharacterDialogue,
  framing?: Partial<DialogueFraming>,
): void {
  if (!dialogueRegistry.has(sceneId)) {
    dialogueRegistry.set(sceneId, new Map());
  }
  const sceneDialogues = dialogueRegistry.get(sceneId)!;
  sceneDialogues.set(dialogue.characterId, {
    dialogue,
    framing: { ...DEFAULT_FRAMING, ...framing },
  });
}

/** Get dialogue data for a character, or null if not registered. */
export function getDialogue(
  sceneId: SceneId,
  characterId: string,
): { dialogue: CharacterDialogue; framing: DialogueFraming } | null {
  return dialogueRegistry.get(sceneId)?.get(characterId) ?? null;
}

// ─── Dialogue System ─────────────────────────────────────────────────────────

export type DialogueSystemConfig = {
  /** The scene's ID (for looking up dialogue data). */
  sceneId: SceneId;
  /** Characters in the scene that can speak. */
  characters: Character[];
  /** Camera controller for scripted moves. */
  camera: CameraController;
  /** Game state for tracking spent characters. */
  gameState: GameStateManager;
  /** Audio engine for interaction sounds. */
  audio?: IndigoSynthEngine;
  /** Config for the dialogue renderer. */
  rendererConfig: DialogueRendererConfig;
};

export class DialogueSystem {
  private sceneId: SceneId;
  private characters: Character[];
  private camera: CameraController;
  private gameState: GameStateManager;
  private audio?: IndigoSynthEngine;
  private renderer: DialogueRenderer;

  // ─── State ──────────────────────────────────────────────────────────

  private phase: DialoguePhase = 'idle';

  /** The character currently being interacted with. */
  private activeCharacter: Character | null = null;
  private activeDialogue: CharacterDialogue | null = null;
  private activeFraming: DialogueFraming = DEFAULT_FRAMING;

  /** Current line index in the dialogue sequence. */
  private currentLineIndex = 0;

  /** Whether the current line's typewriter effect is complete. */
  private lineComplete = false;

  /** Timestamp when the current line completed. */
  private lineCompleteTime = 0;

  /** The character the player is closest to (for proximity glow). */
  private nearestCharacter: Character | null = null;

  /** Position to return the camera to after interaction. */
  private returnPosition = new THREE.Vector3();
  private returnLookAt = new THREE.Vector3();

  /** Proximity tone cleanup. */
  private proximityCleanup: (() => void) | null = null;

  /** Event listener. */
  private eventListeners: ((event: DialogueEvent) => void)[] = [];

  constructor(config: DialogueSystemConfig) {
    this.sceneId = config.sceneId;
    this.characters = config.characters;
    this.camera = config.camera;
    this.gameState = config.gameState;
    this.audio = config.audio;
    this.renderer = new DialogueRenderer(config.rendererConfig);

    // Wire up renderer callbacks
    this.renderer.onLineComplete = () => {
      this.lineComplete = true;
      this.lineCompleteTime = performance.now();
    };
  }

  // ─── Public API ──────────────────────────────────────────────────────

  /** Subscribe to dialogue events. */
  on(listener: (event: DialogueEvent) => void): () => void {
    this.eventListeners.push(listener);
    return () => {
      this.eventListeners = this.eventListeners.filter((l) => l !== listener);
    };
  }

  /** Current phase of the dialogue system. */
  get currentPhase(): DialoguePhase {
    return this.phase;
  }

  /** Whether the system is currently blocking player movement. */
  get isBlocking(): boolean {
    return (
      this.phase === 'reframing' ||
      this.phase === 'speaking' ||
      this.phase === 'finishing' ||
      this.phase === 'returning'
    );
  }

  /** The character the player can currently interact with (or null). */
  get readyCharacter(): Character | null {
    return this.phase === 'ready' ? this.nearestCharacter : null;
  }

  /**
   * Per-frame update. Call from the scene's update() method.
   * Returns true if the dialogue system is blocking player input.
   */
  update(playerPosition: THREE.Vector3, input: InputState, _delta: number): boolean {
    // Always update renderer screen positioning
    this.renderer.update();

    switch (this.phase) {
      case 'idle':
      case 'approaching':
      case 'ready':
        this.updateProximity(playerPosition, input);
        return false;

      case 'reframing':
        // Camera is moving via scripted move — wait for completion
        return true;

      case 'speaking':
        this.updateSpeaking();
        return true;

      case 'finishing':
        this.updateFinishing();
        return true;

      case 'returning':
        // Camera returning — wait for completion
        return true;
    }
  }

  /** Clean up all resources. Call when leaving the scene. */
  dispose(): void {
    this.renderer.dispose();
    if (this.proximityCleanup) {
      this.proximityCleanup();
      this.proximityCleanup = null;
    }
  }

  // ─── Proximity & Interaction Detection ────────────────────────────────

  private updateProximity(playerPos: THREE.Vector3, input: InputState): void {
    let closest: Character | null = null;
    let closestDist = Infinity;

    for (const char of this.characters) {
      const dist = playerPos.distanceTo(char.getWorldPosition());
      if (dist < char.presenceRadius && dist < closestDist) {
        closest = char;
        closestDist = dist;
      }
    }

    // Handle proximity state transitions
    if (closest && closestDist <= INTERACTION_RADIUS) {
      // Within interaction range
      if (this.phase !== 'ready' || this.nearestCharacter !== closest) {
        this.nearestCharacter = closest;
        this.setPhase('ready');
        this.emit({ type: 'ready', characterId: closest.id });
      }

      // Check for interact press
      if (input.interact) {
        this.beginInteraction(closest, playerPos);
      }
    } else if (closest) {
      // Within presence radius but not interaction radius
      if (this.nearestCharacter !== closest) {
        this.nearestCharacter = closest;
        this.setPhase('approaching');
        this.emit({ type: 'approach', characterId: closest.id });

        // Start proximity tone
        if (this.proximityCleanup) {
          this.proximityCleanup();
        }
        if (this.audio) {
          const normalizedDist = closestDist / closest.presenceRadius;
          this.proximityCleanup = this.audio.playProximityTone(normalizedDist);
        }
      }
    } else {
      // No character nearby
      if (this.phase !== 'idle') {
        this.nearestCharacter = null;
        this.setPhase('idle');
        if (this.proximityCleanup) {
          this.proximityCleanup();
          this.proximityCleanup = null;
        }
      }
    }
  }

  // ─── Interaction Flow ─────────────────────────────────────────────────

  private beginInteraction(character: Character, playerPos: THREE.Vector3): void {
    const isSpent = this.gameState
      .getSceneState(this.sceneId)
      .charactersSpokenTo.has(character.id);

    const data = getDialogue(this.sceneId, character.id);

    // Handle spent characters — show the echo line
    if (isSpent) {
      this.emit({ type: 'spent', characterId: character.id });
      const spentText = data?.dialogue.spentLine ?? '...';
      const charPos = character.getWorldPosition();
      const framing = data?.framing ?? DEFAULT_FRAMING;
      this.renderer.setAnchor(
        new THREE.Vector3(
          charPos.x + framing.textOffset.x,
          charPos.y + framing.textOffset.y,
          charPos.z + framing.textOffset.z,
        ),
      );
      this.renderer.showSpentLine(spentText);
      return;
    }

    if (!data) return;

    // Play interaction ping
    this.audio?.playInteractionPing();

    this.activeCharacter = character;
    this.activeDialogue = data.dialogue;
    this.activeFraming = data.framing;
    this.currentLineIndex = 0;
    this.lineComplete = false;

    // Begin character interaction (glow intensifies)
    character.beginInteraction();

    // Save current camera state for return
    this.returnPosition.copy(this.camera.camera.position);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(
      this.camera.camera.quaternion,
    );
    this.returnLookAt.copy(this.camera.camera.position).addScaledVector(fwd, 10);

    // Set up text anchor
    const charPos = character.getWorldPosition();
    this.renderer.setAnchor(
      new THREE.Vector3(
        charPos.x + this.activeFraming.textOffset.x,
        charPos.y + this.activeFraming.textOffset.y,
        charPos.z + this.activeFraming.textOffset.z,
      ),
    );

    // Clean up proximity tone
    if (this.proximityCleanup) {
      this.proximityCleanup();
      this.proximityCleanup = null;
    }

    this.emit({ type: 'interaction-start', characterId: character.id });

    // Begin camera reframe
    this.setPhase('reframing');
    this.reframeCamera(character, playerPos);
  }

  private reframeCamera(character: Character, playerPos: THREE.Vector3): void {
    const charPos = character.getWorldPosition();
    const framing = this.activeFraming;

    // Compute theatrical camera position:
    // Offset to the side of the player-to-character line, slightly elevated
    const toChar = new THREE.Vector3()
      .subVectors(charPos, playerPos)
      .normalize();
    const side = new THREE.Vector3().crossVectors(toChar, new THREE.Vector3(0, 1, 0)).normalize();

    const cameraTarget = new THREE.Vector3()
      .copy(charPos)
      .addScaledVector(toChar, -framing.cameraDistance)
      .addScaledVector(side, 1.2); // Slight offset for composition
    cameraTarget.y = framing.cameraHeight;

    const lookTarget = new THREE.Vector3(
      charPos.x + framing.cameraLookOffset.x,
      charPos.y + framing.cameraLookOffset.y,
      charPos.z + framing.cameraLookOffset.z,
    );

    const move: ScriptedMove = {
      position: cameraTarget,
      lookAt: lookTarget,
      duration: REFRAME_DURATION,
      easing: 1,
    };

    this.camera.playScriptedMove(move).then(() => {
      // Camera arrived — begin dialogue
      this.setPhase('speaking');
      this.beginLine();
    });
  }

  // ─── Speaking ──────────────────────────────────────────────────────────

  private beginLine(): void {
    if (!this.activeDialogue) return;

    const line = this.activeDialogue.lines[this.currentLineIndex];
    if (!line) {
      this.finishDialogue();
      return;
    }

    this.lineComplete = false;
    this.emit({
      type: 'line-start',
      characterId: this.activeDialogue.characterId,
      lineIndex: this.currentLineIndex,
      text: line.text,
      tone: line.tone,
    });

    this.renderer.addLine(line.text, this.currentLineIndex);
  }

  private updateSpeaking(): void {
    if (!this.lineComplete || !this.activeDialogue) return;

    const line = this.activeDialogue.lines[this.currentLineIndex];
    const holdTime = (line?.pause ?? 2.5) * 1000;
    const elapsed = performance.now() - this.lineCompleteTime;

    if (elapsed >= holdTime) {
      this.emit({
        type: 'line-complete',
        characterId: this.activeDialogue.characterId,
        lineIndex: this.currentLineIndex,
      });

      // Fade out current line
      this.renderer.fadeOutCurrentLine(this.currentLineIndex);

      // Advance to next line
      this.currentLineIndex++;

      if (this.currentLineIndex >= this.activeDialogue.lines.length) {
        this.setPhase('finishing');
      } else {
        // Small delay before next line starts
        setTimeout(() => {
          if (this.phase === 'speaking') {
            this.beginLine();
          }
        }, LINE_FADE_TRANSITION_MS);
      }
    }
  }

  private updateFinishing(): void {
    // Hold briefly then return camera
    const elapsed = performance.now() - this.lineCompleteTime;

    if (elapsed >= FINAL_HOLD) {
      this.finishDialogue();
    }
  }

  private finishDialogue(): void {
    if (!this.activeCharacter || !this.activeDialogue) return;

    // Mark character as spoken to
    this.gameState.markCharacterSpokenTo(
      this.sceneId,
      this.activeCharacter.id,
    );

    // End character interaction (glow dims)
    this.activeCharacter.endInteraction();

    // Clear text
    this.renderer.clear();

    this.emit({
      type: 'dialogue-complete',
      characterId: this.activeDialogue.characterId,
    });

    // Return camera to player position
    this.setPhase('returning');

    const returnMove: ScriptedMove = {
      position: this.returnPosition,
      lookAt: this.returnLookAt,
      duration: RETURN_DURATION,
      easing: 1,
    };

    this.camera.playScriptedMove(returnMove).then(() => {
      this.activeCharacter = null;
      this.activeDialogue = null;
      this.setPhase('idle');
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

  private setPhase(phase: DialoguePhase): void {
    this.phase = phase;
  }

  private emit(event: DialogueEvent): void {
    for (const listener of this.eventListeners) {
      listener(event);
    }
  }
}

/** Gap between line fade-out and next line starting (ms). */
const LINE_FADE_TRANSITION_MS = 400;
