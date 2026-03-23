export type {
  DialogueLine,
  CharacterDialogue,
  DialogueFraming,
  DialoguePhase,
  DialogueEvent,
} from './types';

export {
  DialogueSystem,
  registerDialogue,
  getDialogue,
  type DialogueSystemConfig,
} from './dialogue-system';

export {
  DialogueRenderer,
  type DialogueRendererConfig,
} from './dialogue-renderer';
