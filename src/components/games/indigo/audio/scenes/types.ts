/**
 * Scene audio configuration types for The Indigo Frequency.
 */

export interface DroneConfig {
  /** Base frequency in Hz for the root oscillator pair */
  baseFreq: number;
  /** Detune amount in cents between the two oscillators */
  detune: number;
  /** Lowpass filter cutoff */
  filterFreq: number;
  /** Filter resonance (Q) */
  filterQ: number;
  /** Harmonic layer frequency (perfect fifth, etc) */
  harmonicFreq: number;
  /** Harmonic layer gain (0-1) */
  harmonicGain: number;
  /** Breathing LFO rate in Hz (cycle period = 1/rate) */
  breathRate: number;
  /** Breathing depth (gain modulation amount) */
  breathDepth: number;
  /** Master drone gain */
  gain: number;
}

export interface AtmosphereConfig {
  /** Scene-specific noise filter center frequency */
  noiseFilterFreq: number;
  /** Noise filter Q */
  noiseFilterQ: number;
  /** Noise gain level */
  noiseGain: number;
  /** Noise filter type */
  noiseFilterType: BiquadFilterType;
  /** Reverb duration */
  reverbDuration: number;
  /** Reverb decay */
  reverbDecay: number;
  /** Delay time in seconds */
  delayTime: number;
  /** Delay feedback (0-1) */
  delayFeedback: number;
  /** Delay wet level */
  delayWet: number;
}

export interface SceneAudioConfig {
  name: string;
  drone: DroneConfig;
  atmosphere: AtmosphereConfig;
  /** Optional custom setup function called after base layers are created */
  customSetup?: (ctx: AudioContext, destination: AudioNode) => CleanupFn;
}

export type CleanupFn = () => void;
