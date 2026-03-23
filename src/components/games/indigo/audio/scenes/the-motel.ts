/**
 * Scene 4: The Motel
 * Detuned piano-like tones (FM synthesis), creaking (noise bursts), room tone.
 * Think Twin Peaks — haunted, intimate, slightly wrong.
 */
import type { SceneAudioConfig, CleanupFn } from "./types";
import { createNoiseBuffer } from "../effects";

function fmPianoAndCreaks(
  ctx: AudioContext,
  destination: AudioNode
): CleanupFn {
  const nodes: AudioNode[] = [];
  const timeouts: ReturnType<typeof setTimeout>[] = [];
  let stopped = false;

  // FM synthesis "piano" — carrier + modulator for bell/piano-like timbre
  // Plays occasional detuned notes, like a distant piano in the next room
  const pianoNotes = [261.6, 293.7, 329.6, 392.0, 440.0]; // C4, D4, E4, G4, A4

  function playPianoNote() {
    if (stopped) return;

    const freq = pianoNotes[Math.floor(Math.random() * pianoNotes.length)];
    // Slight detuning for that "wrong" Twin Peaks feel
    const detunedFreq = freq * (0.98 + Math.random() * 0.04);

    const carrier = ctx.createOscillator();
    const modulator = ctx.createOscillator();
    const modGain = ctx.createGain();
    const env = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // FM: modulator modulates carrier frequency
    carrier.type = "sine";
    carrier.frequency.value = detunedFreq;
    modulator.type = "sine";
    modulator.frequency.value = detunedFreq * 2; // 2:1 ratio for piano-like harmonics
    modGain.gain.value = detunedFreq * 1.5; // Modulation index

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);

    // Envelope: quick attack, medium decay
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 2);

    env.gain.setValueAtTime(0, ctx.currentTime);
    env.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.01);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3);

    carrier.connect(filter);
    filter.connect(env);
    env.connect(destination);

    carrier.start();
    modulator.start();
    carrier.stop(ctx.currentTime + 3.5);
    modulator.stop(ctx.currentTime + 3.5);

    // Next note in 4-12 seconds
    const delay = (4 + Math.random() * 8) * 1000;
    timeouts.push(setTimeout(playPianoNote, delay));
  }

  timeouts.push(setTimeout(playPianoNote, 2000));

  // Creaking sounds — short filtered noise bursts with pitch sweep
  function triggerCreak() {
    if (stopped) return;

    const noise = ctx.createBufferSource();
    const bp = ctx.createBiquadFilter();
    const env = ctx.createGain();

    noise.buffer = createNoiseBuffer(ctx, 0.5);
    bp.type = "bandpass";
    const startFreq = 200 + Math.random() * 400;
    bp.frequency.setValueAtTime(startFreq, ctx.currentTime);
    bp.frequency.exponentialRampToValueAtTime(startFreq * 2, ctx.currentTime + 0.3);
    bp.Q.value = 15 + Math.random() * 10;

    env.gain.setValueAtTime(0.02 + Math.random() * 0.015, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    noise.connect(bp);
    bp.connect(env);
    env.connect(destination);
    noise.start();
    noise.stop(ctx.currentTime + 0.4);

    // Next creak in 8-20 seconds
    const delay = (8 + Math.random() * 12) * 1000;
    timeouts.push(setTimeout(triggerCreak, delay));
  }

  timeouts.push(setTimeout(triggerCreak, 5000));

  // Room tone — very quiet broadband noise
  const roomNoise = ctx.createBufferSource();
  const roomFilter = ctx.createBiquadFilter();
  const roomGain = ctx.createGain();

  roomNoise.buffer = createNoiseBuffer(ctx, 4);
  roomNoise.loop = true;
  roomFilter.type = "lowpass";
  roomFilter.frequency.value = 300;
  roomGain.gain.value = 0.008;

  roomNoise.connect(roomFilter);
  roomFilter.connect(roomGain);
  roomGain.connect(destination);
  roomNoise.start();

  nodes.push(roomNoise, roomFilter, roomGain);

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

export const theMotelConfig: SceneAudioConfig = {
  name: "the-motel",
  drone: {
    baseFreq: 58, // Between Bb1 and B1 — slightly off
    detune: 5,
    filterFreq: 180,
    filterQ: 7,
    harmonicFreq: 87,
    harmonicGain: 0.05,
    breathRate: 0.085,
    breathDepth: 0.07,
    gain: 0.09,
  },
  atmosphere: {
    noiseFilterFreq: 350,
    noiseFilterQ: 1.5,
    noiseGain: 0.006,
    noiseFilterType: "lowpass",
    reverbDuration: 3.5,
    reverbDecay: 2.5,
    delayTime: 0.45,
    delayFeedback: 0.4,
    delayWet: 0.3,
  },
  customSetup: fmPianoAndCreaks,
};
