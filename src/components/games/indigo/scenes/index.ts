export type {
  IndigoScene,
  SceneContext,
  SceneCharacter,
  SceneInteractable,
} from './types';

export { registerScene, SceneManager } from '../engine/scene-manager';
export { GameStateManager, SCENE_ORDER, type SceneId } from '../engine/game-state';
export { RadioTowerScene } from './radio-tower';
export { GasStationScene } from './gas-station';

// ─── Scene registration ─────────────────────────────────────────────────────
// Import side-effects: registers scenes with the SceneManager registry.

import { registerScene } from '../engine/scene-manager';
import { RadioTowerScene } from './radio-tower';
import { GasStationScene } from './gas-station';
import { TheMotelScene } from './the-motel';

registerScene('radio-tower', () => new RadioTowerScene());
registerScene('gas-station', () => new GasStationScene());
registerScene('the-motel', () => new TheMotelScene());

// the-lake and the-signal self-register via module side effects
import './the-lake';
import './the-signal';
