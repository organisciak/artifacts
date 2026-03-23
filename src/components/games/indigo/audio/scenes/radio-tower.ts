/**
 * Scene 1: The Radio Tower
 * Shortwave static, distant Morse-code-like patterns, eerie transmission feel.
 */
import type { SceneAudioConfig, CleanupFn } from "./types";
import { createNoiseBuffer, createLFO } from "../effects";

function morsePatterns(ctx: AudioContext, destination: AudioNode): CleanupFn {
  const nodes: AudioNode[] = [];
  const timeouts: ReturnType<typeof setTimeout>[] = [];
  let stopped = false;

  // Morse-code oscillator — a distant, ghostly beep
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = "sine";
  osc.frequency.value = 680;
  filter.type = "bandpass";
  filter.frequency.value = 680;
  filter.Q.value = 15;
  gain.gain.value = 0;

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  osc.start();

  nodes.push(osc, gain, filter);

  // Morse-like rhythm: short/long pulses with gaps
  const patterns = [
    [0.08, 0.08, 0.08, 0.3, 0.08, 0.3], // .. . - . -
    [0.3, 0.08, 0.08, 0.3, 0.3],         // - . . - -
    [0.08, 0.3, 0.08, 0.08],             // . - . .
  ];

  function playPattern() {
    if (stopped) return;
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    let offset = 0;
    const volume = 0.02 + Math.random() * 0.03;

    for (const dur of pattern) {
      const startTime = ctx.currentTime + offset;
      gain.gain.setValueAtTime(volume, startTime);
      gain.gain.setValueAtTime(0, startTime + dur);
      offset += dur + 0.08;
    }

    // Schedule next pattern after a pause (3-8 seconds)
    const nextDelay = (3 + Math.random() * 5) * 1000;
    timeouts.push(setTimeout(playPattern, (offset * 1000) + nextDelay));
  }

  // Start after a brief pause
  timeouts.push(setTimeout(playPattern, 2000));

  // Shortwave static sweep — filtered noise with LFO on filter freq
  const noise = ctx.createBufferSource();
  const noiseGain = ctx.createGain();
  const noiseFilter = ctx.createBiquadFilter();

  noise.buffer = createNoiseBuffer(ctx, 4);
  noise.loop = true;
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.value = 3000;
  noiseFilter.Q.value = 5;
  noiseGain.gain.value = 0.015;

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(destination);
  noise.start();

  // Slow sweep on static filter frequency — tuning across bands
  const { lfo, lfoGain } = createLFO(ctx, 0.05, 1500, noiseFilter.frequency);
  nodes.push(noise, noiseGain, noiseFilter, lfo, lfoGain);

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

export const radioTowerConfig: SceneAudioConfig = {
  name: "radio-tower",
  drone: {
    baseFreq: 55, // Low A
    detune: 3,
    filterFreq: 200,
    filterQ: 8,
    harmonicFreq: 82.5, // Perfect fifth above
    harmonicGain: 0.06,
    breathRate: 0.1, // ~10 second cycle
    breathDepth: 0.08,
    gain: 0.12,
  },
  atmosphere: {
    noiseFilterFreq: 800,
    noiseFilterQ: 2,
    noiseGain: 0.02,
    noiseFilterType: "bandpass",
    reverbDuration: 4,
    reverbDecay: 3,
    delayTime: 0.6,
    delayFeedback: 0.5,
    delayWet: 0.35,
  },
  customSetup: morsePatterns,
};
