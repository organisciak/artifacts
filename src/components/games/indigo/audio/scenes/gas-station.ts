/**
 * Scene 2: The Gas Station
 * Low mains hum, occasional metallic resonance, desolate and industrial.
 */
import type { SceneAudioConfig, CleanupFn } from "./types";

function mainsHumAndMetallic(
  ctx: AudioContext,
  destination: AudioNode
): CleanupFn {
  const nodes: AudioNode[] = [];
  const timeouts: ReturnType<typeof setTimeout>[] = [];
  let stopped = false;

  // 60Hz mains hum with harmonics
  const fundamental = ctx.createOscillator();
  const harmonic2 = ctx.createOscillator();
  const harmonic3 = ctx.createOscillator();
  const humGain = ctx.createGain();

  fundamental.type = "sine";
  fundamental.frequency.value = 60;
  harmonic2.type = "sine";
  harmonic2.frequency.value = 120;
  harmonic3.type = "sine";
  harmonic3.frequency.value = 180;

  const fundGain = ctx.createGain();
  const h2Gain = ctx.createGain();
  const h3Gain = ctx.createGain();
  fundGain.gain.value = 0.04;
  h2Gain.gain.value = 0.02;
  h3Gain.gain.value = 0.01;

  fundamental.connect(fundGain);
  harmonic2.connect(h2Gain);
  harmonic3.connect(h3Gain);
  fundGain.connect(humGain);
  h2Gain.connect(humGain);
  h3Gain.connect(humGain);
  humGain.gain.value = 1;
  humGain.connect(destination);

  fundamental.start();
  harmonic2.start();
  harmonic3.start();

  nodes.push(fundamental, harmonic2, harmonic3, fundGain, h2Gain, h3Gain, humGain);

  // Occasional metallic resonance — sharp bandpass-filtered impulse
  function triggerMetallicPing() {
    if (stopped) return;

    const osc = ctx.createOscillator();
    const bp = ctx.createBiquadFilter();
    const env = ctx.createGain();

    const freq = 400 + Math.random() * 1200;
    osc.type = "square";
    osc.frequency.value = freq;
    bp.type = "bandpass";
    bp.frequency.value = freq;
    bp.Q.value = 20 + Math.random() * 30;

    env.gain.setValueAtTime(0.03 + Math.random() * 0.02, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8 + Math.random() * 1.2);

    osc.connect(bp);
    bp.connect(env);
    env.connect(destination);
    osc.start();
    osc.stop(ctx.currentTime + 2);

    // Schedule next ping (5-15 seconds)
    const delay = (5 + Math.random() * 10) * 1000;
    timeouts.push(setTimeout(triggerMetallicPing, delay));
  }

  timeouts.push(setTimeout(triggerMetallicPing, 3000));

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

export const gasStationConfig: SceneAudioConfig = {
  name: "gas-station",
  drone: {
    baseFreq: 50,
    detune: 2,
    filterFreq: 150,
    filterQ: 6,
    harmonicFreq: 75,
    harmonicGain: 0.04,
    breathRate: 0.08, // ~12.5 second cycle
    breathDepth: 0.06,
    gain: 0.1,
  },
  atmosphere: {
    noiseFilterFreq: 400,
    noiseFilterQ: 1,
    noiseGain: 0.008,
    noiseFilterType: "lowpass",
    reverbDuration: 2.5,
    reverbDecay: 2,
    delayTime: 0.35,
    delayFeedback: 0.3,
    delayWet: 0.2,
  },
  customSetup: mainsHumAndMetallic,
};
