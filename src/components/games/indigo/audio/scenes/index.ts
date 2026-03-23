export { radioTowerConfig } from "./radio-tower";
export { gasStationConfig } from "./gas-station";
export { theLakeConfig } from "./the-lake";
export { theMotelConfig } from "./the-motel";
export { theSignalConfig } from "./the-signal";
export type { SceneAudioConfig, DroneConfig, AtmosphereConfig, CleanupFn } from "./types";

import { radioTowerConfig } from "./radio-tower";
import { gasStationConfig } from "./gas-station";
import { theLakeConfig } from "./the-lake";
import { theMotelConfig } from "./the-motel";
import { theSignalConfig } from "./the-signal";
import type { SceneAudioConfig } from "./types";

export const sceneConfigs: Record<string, SceneAudioConfig> = {
  "radio-tower": radioTowerConfig,
  "gas-station": gasStationConfig,
  "the-lake": theLakeConfig,
  "the-motel": theMotelConfig,
  "the-signal": theSignalConfig,
};
