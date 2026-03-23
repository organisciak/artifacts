/**
 * Dialogue and narrative types for The Indigo Frequency.
 *
 * Dialogue here is not conversation. It's poetry — overheard thought.
 * Short stanzas, sharp lines, each word arriving like a quiet bell.
 */

/** A single line of dialogue with timing hints. */
export interface DialogueLine {
  /** The text content. Slashes (/) denote line breaks within a stanza. */
  text: string;
  /** Pause in seconds after this line completes before the next begins. */
  pause: number;
  /** Tone hint for the audio system (e.g., 'warm', 'cold', 'hollow', 'bright'). */
  tone?: string;
}

/** A character's full dialogue sequence. */
export interface CharacterDialogue {
  /** ID matching the character entity. */
  characterId: string;
  /** The stanzas of dialogue, played in order. */
  lines: DialogueLine[];
  /** A single line shown when the character is 'spent' (already spoken). */
  spentLine: string;
}

/** Interaction radius and camera framing for a character's dialogue. */
export interface DialogueFraming {
  /** World-space offset from character for camera target (where to look). */
  cameraLookOffset: { x: number; y: number; z: number };
  /** Distance the camera pulls back to frame the composition. */
  cameraDistance: number;
  /** Vertical offset for the camera position. */
  cameraHeight: number;
  /** Offset above the character where text appears. */
  textOffset: { x: number; y: number; z: number };
}

/** Phase of the dialogue interaction state machine. */
export type DialoguePhase =
  | 'idle'           // No interaction
  | 'approaching'    // Player within presence radius, glow intensifying
  | 'ready'          // Within interaction radius, prompt visible
  | 'reframing'      // Camera moving to theatrical composition
  | 'speaking'       // Dialogue playing out
  | 'finishing'      // Final line holding, about to fade
  | 'returning';     // Camera returning to player control

/** Event emitted by the dialogue system for external listeners. */
export type DialogueEvent =
  | { type: 'approach'; characterId: string }
  | { type: 'ready'; characterId: string }
  | { type: 'interaction-start'; characterId: string }
  | { type: 'line-start'; characterId: string; lineIndex: number; text: string; tone?: string }
  | { type: 'line-complete'; characterId: string; lineIndex: number }
  | { type: 'dialogue-complete'; characterId: string }
  | { type: 'spent'; characterId: string };
