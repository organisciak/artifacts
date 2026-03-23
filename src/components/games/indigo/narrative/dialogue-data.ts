/**
 * Dialogue data for The Indigo Frequency.
 *
 * Import this module to register all dialogue with the dialogue system.
 * Each character speaks once, in stanzas — poetry, not conversation.
 */

import { registerDialogue } from './dialogue-system';
import type { CharacterDialogue } from './types';

// ─── Scene 1: Radio Tower — The Keeper ──────────────────────────────────────

const keeperDialogue: CharacterDialogue = {
  characterId: 'keeper',
  lines: [
    {
      text: 'You found the frequency./Not many do.',
      pause: 3.0,
      tone: 'warm',
    },
    {
      text: 'Most pass through static/and call it silence./But you stopped./You turned the dial.',
      pause: 3.5,
      tone: 'warm',
    },
    {
      text: 'There are voices/between the stations—/not lost, just waiting/for someone to listen.',
      pause: 3.5,
      tone: 'bright',
    },
    {
      text: 'Follow the signal south./Past the last lit window./You will know the road/by its quiet.',
      pause: 3.0,
      tone: 'hollow',
    },
  ],
  spentLine: 'The signal holds. Go.',
};

registerDialogue('radio-tower', keeperDialogue, {
  cameraDistance: 5.5,
  cameraHeight: 3.0,
  textOffset: { x: 0, y: 5.0, z: 0 },
});

// ─── Scene 2: Gas Station — The Traveler ────────────────────────────────────

const travelerDialogue: CharacterDialogue = {
  characterId: 'traveler',
  lines: [
    {
      text: 'I have been driving/for longer than the road/has existed.',
      pause: 3.5,
      tone: 'cold',
    },
    {
      text: 'Funny thing about distance—/it only matters/if you plan to stop./I never planned to stop.',
      pause: 3.5,
      tone: 'cold',
    },
    {
      text: 'But the engine cooled./The headlights found this place/instead of the horizon./Sometimes the journey/chooses the pause.',
      pause: 4.0,
      tone: 'warm',
    },
    {
      text: 'There is a lake ahead./It does not move./That is the frightening part./Go see what it holds still.',
      pause: 3.0,
      tone: 'hollow',
    },
  ],
  spentLine: 'Still here. Still stopped.',
};

registerDialogue('gas-station', travelerDialogue, {
  cameraDistance: 4.0,
  cameraHeight: 1.8,
  textOffset: { x: 0, y: 3.0, z: 0 },
});

// ─── Scene 3: The Lake — The Reflection ─────────────────────────────────────

const reflectionDialogue: CharacterDialogue = {
  characterId: 'reflection',
  lines: [
    {
      text: 'You expected your face./What you got/was the shape of a question.',
      pause: 3.5,
      tone: 'bright',
    },
    {
      text: 'Water remembers/what the sky forgets./Every cloud that passed here/left a fingerprint/on the dark.',
      pause: 4.0,
      tone: 'warm',
    },
    {
      text: 'Look closer./Not at the surface—/through it./There is a sound beneath/that has your name/in its teeth.',
      pause: 4.0,
      tone: 'hollow',
    },
    {
      text: 'The frequency lives/where the water meets itself./You carried it here./Now let it carry you.',
      pause: 3.0,
      tone: 'bright',
    },
  ],
  spentLine: 'The water remembers.',
};

registerDialogue('the-lake', reflectionDialogue, {
  cameraDistance: 4.5,
  cameraHeight: 1.5,
  textOffset: { x: 0, y: 3.5, z: 0 },
});

// ─── Scene 4: The Motel — The Clerk ────────────────────────────────────────

const clerkDialogue: CharacterDialogue = {
  characterId: 'clerk',
  lines: [
    {
      text: 'Every room is occupied./Every room is empty./These are not contradictions.',
      pause: 3.5,
      tone: 'cold',
    },
    {
      text: 'The doors were here first./Then the walls./Then the building/grew around them/like bark around a nail.',
      pause: 4.0,
      tone: 'hollow',
    },
    {
      text: 'I keep the keys/for guests who never arrive/and guests who never leave./You are both.',
      pause: 3.5,
      tone: 'cold',
    },
    {
      text: 'Your room has always/been ready./The door is the one/that sounds like leaving./Go through it.',
      pause: 3.0,
      tone: 'warm',
    },
  ],
  spentLine: 'Your key is in your hand.',
};

registerDialogue('the-motel', clerkDialogue, {
  cameraDistance: 3.5,
  cameraHeight: 2.0,
  textOffset: { x: 0, y: 3.5, z: 0 },
});

// ─── Scene 5: The Signal — The Signal ───────────────────────────────────────

const signalDialogue: CharacterDialogue = {
  characterId: 'signal',
  lines: [
    {
      text: 'You turned the dial/in a dark room./You followed a road/that had no name.',
      pause: 3.5,
      tone: 'warm',
    },
    {
      text: 'You sat with a stranger/who forgot how to stop./You looked into water/and the water looked back.',
      pause: 3.5,
      tone: 'warm',
    },
    {
      text: 'You took a key/from someone who keeps/what cannot be kept./Each door opened inward.',
      pause: 3.5,
      tone: 'bright',
    },
    {
      text: 'This is what a frequency is—/not sound, not silence,/but the distance between them/where meaning lives.',
      pause: 4.0,
      tone: 'bright',
    },
    {
      text: 'You were never searching/for the signal./The signal/was searching for someone/who would hold still/long enough to hear.',
      pause: 4.5,
      tone: 'warm',
    },
    {
      text: 'Now the dial rests./The static clears./Between the stations—/that space, that breath—/you were always there.',
      pause: 4.0,
      tone: 'hollow',
    },
  ],
  spentLine: 'The frequency holds.',
};

registerDialogue('the-signal', signalDialogue, {
  cameraDistance: 6.0,
  cameraHeight: 3.5,
  cameraLookOffset: { x: 0, y: 3.5, z: 0 },
  textOffset: { x: 0, y: 6.0, z: 0 },
});

// ─── Chapter Titles ─────────────────────────────────────────────────────────

export const CHAPTER_TITLES: Record<string, { title: string; subtitle: string }> = {
  'radio-tower': {
    title: 'Station One: The Keeper',
    subtitle: 'Between the dial and the dark',
  },
  'gas-station': {
    title: 'Station Two: The Traveler',
    subtitle: 'Where the road forgets its name',
  },
  'the-lake': {
    title: 'Station Three: The Reflection',
    subtitle: 'What the water holds still',
  },
  'the-motel': {
    title: 'Station Four: The Clerk',
    subtitle: 'Every door sounds like leaving',
  },
  'the-signal': {
    title: 'Station Five: The Signal',
    subtitle: 'The space between stations',
  },
};

// ─── End Screen ─────────────────────────────────────────────────────────────

export const END_SCREEN = {
  title: 'The Indigo Frequency',
  lines: [
    'You found the frequency.',
    'Between the static and the silence,',
    'you held still long enough to hear.',
    '',
    'The signal thanks you for listening.',
  ],
  attribution: 'A game about the spaces between.',
};
