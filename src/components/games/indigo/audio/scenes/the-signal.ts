/**
 * Scene 5: The Signal
 * All previous layers converging — building to rich harmonic density.
 * The culmination: shortwave static meets water meets mains hum meets piano.
 * Dense, shimmering, overwhelming.
 */
import type { SceneAudioConfig, CleanupFn } from "./types";
import { createNoiseBuffer, createLFO, createReverb } from "../effects";

function convergenceLayer(
  ctx: AudioContext,
  destination: AudioNode
): CleanupFn {
  const nodes: AudioNode[] = [];
  const timeouts: ReturnType<typeof setTimeout>[] = [];
  let stopped = false;

  // Layer 1: Dense harmonic cluster — multiple detuned oscillators
  const clusterFreqs = [55, 82.5, 110, 165, 220, 330, 440];
  const clusterGain = ctx.createGain();
  clusterGain.gain.value = 0;
  clusterGain.connect(destination);

  for (const freq of clusterFreqs) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq * (0.99 + Math.random() * 0.02);
    g.gain.value = 0.012;
    osc.connect(g);
    g.connect(clusterGain);
    osc.start();
    nodes.push(osc, g);
  }

  // Slow build: fade cluster in over 20 seconds
  clusterGain.gain.setValueAtTime(0, ctx.currentTime);
  clusterGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 20);
  nodes.push(clusterGain);

  // Layer 2: Shortwave ghost — callback from scene 1
  const swNoise = ctx.createBufferSource();
  const swFilter = ctx.createBiquadFilter();
  const swGain = ctx.createGain();

  swNoise.buffer = createNoiseBuffer(ctx, 4);
  swNoise.loop = true;
  swFilter.type = "bandpass";
  swFilter.frequency.value = 2500;
  swFilter.Q.value = 8;
  swGain.gain.value = 0.02;

  swNoise.connect(swFilter);
  swFilter.connect(swGain);
  swGain.connect(destination);
  swNoise.start();

  // Sweep the shortwave filter
  const { lfo: swLFO, lfoGain: swLFOGain } = createLFO(
    ctx, 0.07, 1000, swFilter.frequency
  );
  nodes.push(swNoise, swFilter, swGain, swLFO, swLFOGain);

  // Layer 3: Reversed reverb wash
  const washOsc = ctx.createOscillator();
  const washGain = ctx.createGain();
  const revReverb = createReverb(ctx, 4, 2, true);

  washOsc.type = "sawtooth";
  washOsc.frequency.value = 110;
  washGain.gain.value = 0.02;

  washOsc.connect(revReverb);
  revReverb.connect(washGain);
  washGain.connect(destination);
  washOsc.start();
  nodes.push(washOsc, washGain, revReverb);

  // Layer 4: Morse echo — rapid, overlapping fragments
  function morseFragment() {
    if (stopped) return;

    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const bp = ctx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.value = 500 + Math.random() * 800;
    bp.type = "bandpass";
    bp.frequency.value = osc.frequency.value;
    bp.Q.value = 20;

    const dur = 0.05 + Math.random() * 0.15;
    env.gain.setValueAtTime(0.03, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur + 0.3);

    osc.connect(bp);
    bp.connect(env);
    env.connect(destination);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.5);

    // More frequent than scene 1 — overlapping signals
    const delay = (0.5 + Math.random() * 3) * 1000;
    timeouts.push(setTimeout(morseFragment, delay));
  }

  timeouts.push(setTimeout(morseFragment, 1000));

  // Layer 5: 60Hz hum callback from gas station — louder here
  const hum = ctx.createOscillator();
  const humGain = ctx.createGain();
  hum.type = "sine";
  hum.frequency.value = 60;
  humGain.gain.value = 0.025;
  hum.connect(humGain);
  humGain.connect(destination);
  hum.start();
  nodes.push(hum, humGain);

  return () => {
    stopped = true;
    timeouts.forEach(clearTimeout);
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

export const theSignalConfig: SceneAudioConfig = {
  name: "the-signal",
  drone: {
    baseFreq: 55, // Back to A — full circle
    detune: 6, // More detune for unease
    filterFreq: 300,
    filterQ: 12,
    harmonicFreq: 82.5,
    harmonicGain: 0.1,
    breathRate: 0.12, // ~8 second cycle — faster breathing
    breathDepth: 0.12,
    gain: 0.15, // Loudest drone
  },
  atmosphere: {
    noiseFilterFreq: 600,
    noiseFilterQ: 3,
    noiseGain: 0.025,
    noiseFilterType: "bandpass",
    reverbDuration: 6,
    reverbDecay: 4,
    delayTime: 0.5,
    delayFeedback: 0.6,
    delayWet: 0.45,
  },
  customSetup: convergenceLayer,
};
