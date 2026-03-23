/**
 * Scene 3: The Lake
 * Gentle water-like sounds (filtered noise with slow modulation),
 * reversed reverb effect, peaceful yet uncanny.
 */
import type { SceneAudioConfig, CleanupFn } from "./types";
import { createNoiseBuffer, createLFO, createReverb } from "../effects";

function waterAndReversedReverb(
  ctx: AudioContext,
  destination: AudioNode
): CleanupFn {
  const nodes: AudioNode[] = [];

  // Water-like texture: bandpass-filtered noise with slow amplitude modulation
  const waterNoise = ctx.createBufferSource();
  const waterFilter = ctx.createBiquadFilter();
  const waterGain = ctx.createGain();
  const waterFilter2 = ctx.createBiquadFilter();

  waterNoise.buffer = createNoiseBuffer(ctx, 4);
  waterNoise.loop = true;

  // Main water filter — gentle lapping
  waterFilter.type = "bandpass";
  waterFilter.frequency.value = 600;
  waterFilter.Q.value = 3;

  // Second filter for more organic shape
  waterFilter2.type = "lowpass";
  waterFilter2.frequency.value = 1200;
  waterFilter2.Q.value = 1;

  waterGain.gain.value = 0.025;

  waterNoise.connect(waterFilter);
  waterFilter.connect(waterFilter2);
  waterFilter2.connect(waterGain);
  waterGain.connect(destination);
  waterNoise.start();

  // Slow modulation on filter frequency — waves lapping
  const { lfo: waterLFO, lfoGain: waterLFOGain } = createLFO(
    ctx, 0.15, 300, waterFilter.frequency
  );

  // Amplitude modulation on water — gentle swell
  const { lfo: ampLFO, lfoGain: ampLFOGain } = createLFO(
    ctx, 0.08, 0.015, waterGain.gain
  );

  nodes.push(
    waterNoise, waterFilter, waterFilter2, waterGain,
    waterLFO, waterLFOGain, ampLFO, ampLFOGain
  );

  // Reversed reverb shimmer — a delicate sine tone through reversed convolver
  const shimmerOsc = ctx.createOscillator();
  const shimmerGain = ctx.createGain();
  const reversedReverb = createReverb(ctx, 3, 1.5, true);

  shimmerOsc.type = "sine";
  shimmerOsc.frequency.value = 440;
  shimmerGain.gain.value = 0.015;

  shimmerOsc.connect(reversedReverb);
  reversedReverb.connect(shimmerGain);
  shimmerGain.connect(destination);
  shimmerOsc.start();

  // Very slow vibrato on shimmer
  const { lfo: shimmerLFO, lfoGain: shimmerLFOGain } = createLFO(
    ctx, 0.03, 5, shimmerOsc.frequency
  );

  nodes.push(shimmerOsc, shimmerGain, reversedReverb, shimmerLFO, shimmerLFOGain);

  return () => {
    nodes.forEach((n) => {
      try {
        if ("stop" in n && typeof (n as OscillatorNode).stop === "function") {
          (n as OscillatorNode).stop();
        }
        n.disconnect();
      } catch {
        // already stopped
      }
    });
  };
}

export const theLakeConfig: SceneAudioConfig = {
  name: "the-lake",
  drone: {
    baseFreq: 65, // Low C
    detune: 4,
    filterFreq: 250,
    filterQ: 10,
    harmonicFreq: 97.5, // Perfect fifth
    harmonicGain: 0.08,
    breathRate: 0.09, // ~11 second cycle
    breathDepth: 0.1,
    gain: 0.1,
  },
  atmosphere: {
    noiseFilterFreq: 500,
    noiseFilterQ: 2,
    noiseGain: 0.01,
    noiseFilterType: "lowpass",
    reverbDuration: 5,
    reverbDecay: 3.5,
    delayTime: 0.55,
    delayFeedback: 0.55,
    delayWet: 0.4,
  },
  customSetup: waterAndReversedReverb,
};
