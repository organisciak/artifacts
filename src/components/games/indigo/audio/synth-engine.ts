/**
 * The Indigo Frequency — Web Audio Synthesizer Engine
 *
 * All synthesis via native Web Audio API. No samples, no libraries.
 * Designed for a meditative ambient game inspired by Brian Eno and
 * Angelo Badalamenti's Twin Peaks score.
 *
 * Architecture:
 *   Drone Layer → Effects → Master Gain
 *   Atmosphere Layer → Effects → Master Gain
 *   Reactive Layer → Effects → Master Gain
 *   Scene Custom Layer → Master Gain
 *   Master Gain → Destination
 */

import {
  createReverb,
  createDelay,
  createNoiseBuffer,
  createLFO,
  createStereoWidth,
} from "./effects";
import { sceneConfigs, type SceneAudioConfig, type CleanupFn } from "./scenes";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SceneName =
  | "radio-tower"
  | "gas-station"
  | "the-lake"
  | "the-motel"
  | "the-signal";

interface ActiveDrone {
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  harmonicOsc: OscillatorNode;
  filter: BiquadFilterNode;
  harmonicFilter: BiquadFilterNode;
  droneGain: GainNode;
  harmonicGain: GainNode;
  breathLFO: OscillatorNode;
  breathLFOGain: GainNode;
}

interface ActiveAtmosphere {
  noiseSource: AudioBufferSourceNode;
  noiseFilter: BiquadFilterNode;
  noiseGain: GainNode;
  reverb: ConvolverNode;
  delay: { input: GainNode; output: GainNode };
}

// ─── Engine ──────────────────────────────────────────────────────────────────

export class IndigoSynthEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentScene: SceneName | null = null;

  // Active nodes for current scene
  private activeDrone: ActiveDrone | null = null;
  private activeAtmosphere: ActiveAtmosphere | null = null;
  private customCleanup: CleanupFn | null = null;

  // Reactive audio nodes
  private movementNoise: AudioBufferSourceNode | null = null;
  private movementFilter: BiquadFilterNode | null = null;
  private movementGain: GainNode | null = null;

  // Noise buffer (shared, reusable)
  private noiseBuffer: AudioBuffer | null = null;

  // Stereo width
  private stereoWidth: { input: GainNode; output: ChannelMergerNode } | null = null;

  // Crossfade duration in seconds
  private readonly CROSSFADE_TIME = 3;

  /** Is the engine initialized and running? */
  get isRunning(): boolean {
    return this.ctx !== null && this.ctx.state === "running";
  }

  get audioContext(): AudioContext | null {
    return this.ctx;
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────

  /** Initialize audio context. Must be called from a user interaction handler. */
  async init(): Promise<void> {
    if (this.ctx) return;

    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8;

    // Stereo width
    this.stereoWidth = createStereoWidth(this.ctx, 0.01);
    this.stereoWidth.output.connect(this.ctx.destination);

    // Master gain → stereo width → destination
    this.masterGain.connect(this.stereoWidth.input);

    // Shared noise buffer
    this.noiseBuffer = createNoiseBuffer(this.ctx, 4);

    // Set up persistent movement noise (reactive layer)
    this.setupMovementNoise();

    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
  }

  /** Tear down everything. Call when leaving the game. */
  destroy(): void {
    this.cleanupScene();
    this.cleanupMovementNoise();

    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }

    this.masterGain = null;
    this.stereoWidth = null;
    this.noiseBuffer = null;
    this.currentScene = null;
  }

  /** Resume audio context (after browser suspension). */
  async resume(): Promise<void> {
    if (this.ctx?.state === "suspended") {
      await this.ctx.resume();
    }
  }

  /** Suspend audio context (e.g., when tab hidden). */
  async suspend(): Promise<void> {
    if (this.ctx?.state === "running") {
      await this.ctx.suspend();
    }
  }

  // ─── Scene Transitions ────────────────────────────────────────────────

  /** Crossfade to a new scene. */
  async setScene(scene: SceneName): Promise<void> {
    if (!this.ctx || !this.masterGain) {
      throw new Error("Engine not initialized. Call init() first.");
    }

    if (this.currentScene === scene) return;

    const config = sceneConfigs[scene];
    if (!config) {
      throw new Error(`Unknown scene: ${scene}`);
    }

    // Fade out current scene
    if (this.currentScene) {
      await this.fadeOutScene();
    }

    // Build new scene
    this.buildDrone(config);
    this.buildAtmosphere(config);

    if (config.customSetup) {
      this.customCleanup = config.customSetup(this.ctx, this.masterGain);
    }

    this.currentScene = scene;

    // Fade in new scene
    this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(
      0.8,
      this.ctx.currentTime + this.CROSSFADE_TIME
    );
  }

  private async fadeOutScene(): Promise<void> {
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(0, now + this.CROSSFADE_TIME);

    // Wait for fade, then clean up
    await new Promise((resolve) =>
      setTimeout(resolve, this.CROSSFADE_TIME * 1000)
    );

    this.cleanupScene();
  }

  private cleanupScene(): void {
    // Drone
    if (this.activeDrone) {
      const d = this.activeDrone;
      [d.osc1, d.osc2, d.harmonicOsc, d.breathLFO].forEach((osc) => {
        try {
          osc.stop();
        } catch {
          /* already stopped */
        }
      });
      [
        d.osc1, d.osc2, d.harmonicOsc, d.filter, d.harmonicFilter,
        d.droneGain, d.harmonicGain, d.breathLFO, d.breathLFOGain,
      ].forEach((n) => {
        try { n.disconnect(); } catch { /* ok */ }
      });
      this.activeDrone = null;
    }

    // Atmosphere
    if (this.activeAtmosphere) {
      const a = this.activeAtmosphere;
      try { a.noiseSource.stop(); } catch { /* ok */ }
      [
        a.noiseSource, a.noiseFilter, a.noiseGain, a.reverb,
        a.delay.input, a.delay.output,
      ].forEach((n) => {
        try { n.disconnect(); } catch { /* ok */ }
      });
      this.activeAtmosphere = null;
    }

    // Custom scene layer
    if (this.customCleanup) {
      this.customCleanup();
      this.customCleanup = null;
    }
  }

  // ─── Drone Layer ──────────────────────────────────────────────────────

  private buildDrone(config: SceneAudioConfig): void {
    if (!this.ctx || !this.masterGain) return;
    const { drone } = config;

    // Two detuned sine oscillators for beating frequency
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = "sine";
    osc2.type = "sine";
    osc1.frequency.value = drone.baseFreq;
    osc2.frequency.value = drone.baseFreq;
    osc2.detune.value = drone.detune;

    // Lowpass filter with resonance for warmth
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = drone.filterFreq;
    filter.Q.value = drone.filterQ;

    // Drone gain
    const droneGain = this.ctx.createGain();
    droneGain.gain.value = drone.gain;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(droneGain);
    droneGain.connect(this.masterGain);

    // Harmonic layer — quiet sawtooth at a fifth above, heavily filtered
    const harmonicOsc = this.ctx.createOscillator();
    harmonicOsc.type = "sawtooth";
    harmonicOsc.frequency.value = drone.harmonicFreq;

    const harmonicFilter = this.ctx.createBiquadFilter();
    harmonicFilter.type = "lowpass";
    harmonicFilter.frequency.value = drone.harmonicFreq * 1.5;
    harmonicFilter.Q.value = 4;

    const harmonicGainNode = this.ctx.createGain();
    harmonicGainNode.gain.value = drone.harmonicGain;

    harmonicOsc.connect(harmonicFilter);
    harmonicFilter.connect(harmonicGainNode);
    harmonicGainNode.connect(this.masterGain);

    // Breathing LFO on drone gain
    const { lfo: breathLFO, lfoGain: breathLFOGain } = createLFO(
      this.ctx,
      drone.breathRate,
      drone.breathDepth,
      droneGain.gain
    );

    // Start everything
    osc1.start();
    osc2.start();
    harmonicOsc.start();

    this.activeDrone = {
      osc1,
      osc2,
      harmonicOsc,
      filter,
      harmonicFilter,
      droneGain,
      harmonicGain: harmonicGainNode,
      breathLFO,
      breathLFOGain,
    };
  }

  // ─── Atmosphere Layer ─────────────────────────────────────────────────

  private buildAtmosphere(config: SceneAudioConfig): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const { atmosphere } = config;

    // Filtered noise texture
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;
    noiseSource.loop = true;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = atmosphere.noiseFilterType;
    noiseFilter.frequency.value = atmosphere.noiseFilterFreq;
    noiseFilter.Q.value = atmosphere.noiseFilterQ;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = atmosphere.noiseGain;

    // Reverb
    const reverb = createReverb(
      this.ctx,
      atmosphere.reverbDuration,
      atmosphere.reverbDecay
    );

    // Delay
    const delay = createDelay(
      this.ctx,
      atmosphere.delayTime,
      atmosphere.delayFeedback,
      atmosphere.delayWet
    );

    // Signal chain: noise → filter → gain → delay → reverb → master
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(delay.input);
    delay.output.connect(reverb);
    reverb.connect(this.masterGain);

    noiseSource.start();

    this.activeAtmosphere = {
      noiseSource,
      noiseFilter,
      noiseGain,
      reverb,
      delay,
    };
  }

  // ─── Reactive Audio ───────────────────────────────────────────────────

  private setupMovementNoise(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2000;
    filter.Q.value = 3;

    const gain = this.ctx.createGain();
    gain.gain.value = 0; // Silent until player moves

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start();

    this.movementNoise = noise;
    this.movementFilter = filter;
    this.movementGain = gain;
  }

  private cleanupMovementNoise(): void {
    if (this.movementNoise) {
      try { this.movementNoise.stop(); } catch { /* ok */ }
      try { this.movementNoise.disconnect(); } catch { /* ok */ }
    }
    if (this.movementFilter) {
      try { this.movementFilter.disconnect(); } catch { /* ok */ }
    }
    if (this.movementGain) {
      try { this.movementGain.disconnect(); } catch { /* ok */ }
    }
    this.movementNoise = null;
    this.movementFilter = null;
    this.movementGain = null;
  }

  /**
   * Call on player movement. Speed is normalized 0-1.
   * Increases wind/static texture proportional to movement speed.
   */
  onPlayerMove(speed: number): void {
    if (!this.ctx || !this.movementGain) return;
    const target = Math.min(speed, 1) * 0.04;
    this.movementGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
  }

  /** Call when player stops moving. Fades out movement texture. */
  onPlayerStop(): void {
    if (!this.ctx || !this.movementGain) return;
    this.movementGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
  }

  /**
   * Proximity tone — bell-like tone that emerges as player nears an object.
   * distance: 0 (touching) to 1 (far away).
   * Returns a cleanup function to stop the tone.
   */
  playProximityTone(distance: number): CleanupFn {
    if (!this.ctx || !this.masterGain) return () => {};

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    // Pitch mapped to distance: closer = higher
    const freq = 800 - distance * 500; // 800Hz close, 300Hz far
    osc.type = "sine";
    osc.frequency.value = freq;

    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = 8;

    // Volume inversely proportional to distance
    const vol = Math.max(0, (1 - distance)) * 0.06;
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start();

    return () => {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.5);
      setTimeout(() => {
        try { osc.stop(); } catch { /* ok */ }
        try { osc.disconnect(); } catch { /* ok */ }
        try { filter.disconnect(); } catch { /* ok */ }
        try { gain.disconnect(); } catch { /* ok */ }
      }, 600);
    };
  }

  /**
   * Update the pitch/volume of a proximity tone based on new distance.
   * For efficiency, call this instead of creating new tones each frame.
   */
  updateProximityTone(
    osc: OscillatorNode,
    gain: GainNode,
    filter: BiquadFilterNode,
    distance: number
  ): void {
    if (!this.ctx) return;
    const freq = 800 - distance * 500;
    const vol = Math.max(0, (1 - distance)) * 0.06;
    osc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
    filter.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
    gain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.1);
  }

  /**
   * Interaction sound — resonant metallic ping when triggering dialogue.
   * One-shot, self-cleaning.
   */
  playInteractionPing(): void {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    const delay = this.ctx.createDelay(1);
    const delayFeedback = this.ctx.createGain();
    const delayFilter = this.ctx.createBiquadFilter();

    // Metallic ping: high sine with bandpass
    osc.type = "sine";
    osc.frequency.value = 1200 + Math.random() * 400;

    filter.type = "bandpass";
    filter.frequency.value = osc.frequency.value;
    filter.Q.value = 12;

    // Quick attack, long release
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.5);

    // Metallic delay feedback
    delay.delayTime.value = 0.12;
    delayFeedback.gain.value = 0.4;
    delayFilter.type = "lowpass";
    delayFilter.frequency.value = 3000;

    // Chain
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    // Feedback delay on the ping
    filter.connect(delay);
    delay.connect(delayFilter);
    delayFilter.connect(delayFeedback);
    delayFeedback.connect(delay);
    delayFilter.connect(gain);

    osc.start();
    osc.stop(this.ctx.currentTime + 2);

    // Self-cleanup after decay
    setTimeout(() => {
      [osc, filter, gain, delay, delayFeedback, delayFilter].forEach((n) => {
        try { n.disconnect(); } catch { /* ok */ }
      });
    }, 2500);
  }

  // ─── Master Volume ────────────────────────────────────────────────────

  /** Set master volume (0-1). */
  setMasterVolume(volume: number): void {
    if (!this.ctx || !this.masterGain) return;
    this.masterGain.gain.setTargetAtTime(
      Math.max(0, Math.min(1, volume)),
      this.ctx.currentTime,
      0.1
    );
  }

  /** Get current scene name. */
  getCurrentScene(): SceneName | null {
    return this.currentScene;
  }
}
