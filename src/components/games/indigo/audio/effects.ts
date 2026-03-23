/**
 * Effects processing chain for The Indigo Frequency.
 * Reverb, delay, filter chains — all native Web Audio API.
 */

/** Create a convolution reverb from a generated impulse response. */
export function createReverb(
  ctx: AudioContext,
  duration = 3,
  decay = 2.5,
  reverse = false
): ConvolverNode {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const impulse = ctx.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = reverse
        ? Math.pow(t / duration, decay)
        : Math.pow(1 - t / duration, decay);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }
  }

  const convolver = ctx.createConvolver();
  convolver.buffer = impulse;
  return convolver;
}

/** Feedback delay with wet/dry mix. Returns { input, output } nodes. */
export function createDelay(
  ctx: AudioContext,
  delayTime = 0.4,
  feedback = 0.45,
  wetLevel = 0.3
): { input: GainNode; output: GainNode } {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const delay = ctx.createDelay(5);
  const feedbackGain = ctx.createGain();
  const wet = ctx.createGain();
  const dry = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  delay.delayTime.value = delayTime;
  feedbackGain.gain.value = feedback;
  wet.gain.value = wetLevel;
  dry.gain.value = 1 - wetLevel;
  filter.type = "lowpass";
  filter.frequency.value = 2000;

  // Dry path
  input.connect(dry);
  dry.connect(output);

  // Wet path with feedback loop
  input.connect(delay);
  delay.connect(filter);
  filter.connect(feedbackGain);
  feedbackGain.connect(delay); // feedback loop
  filter.connect(wet);
  wet.connect(output);

  return { input, output };
}

/** Stereo widener via slight delay on one channel. */
export function createStereoWidth(
  ctx: AudioContext,
  width = 0.012
): { input: GainNode; output: ChannelMergerNode } {
  const input = ctx.createGain();
  const splitter = ctx.createChannelSplitter(2);
  const merger = ctx.createChannelMerger(2);
  const delayL = ctx.createDelay(0.1);
  const delayR = ctx.createDelay(0.1);

  delayL.delayTime.value = 0;
  delayR.delayTime.value = width;

  input.connect(splitter);
  splitter.connect(delayL, 0);
  splitter.connect(delayR, 1);
  delayL.connect(merger, 0, 0);
  delayR.connect(merger, 0, 1);

  return { input, output: merger };
}

/** Create a noise buffer (white noise). Reusable. */
export function createNoiseBuffer(ctx: AudioContext, duration = 2): AudioBuffer {
  const length = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/** LFO helper — returns an oscillator + gain that modulates a target AudioParam. */
export function createLFO(
  ctx: AudioContext,
  frequency: number,
  depth: number,
  targetParam: AudioParam,
  type: OscillatorType = "sine"
): { lfo: OscillatorNode; lfoGain: GainNode } {
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();

  lfo.type = type;
  lfo.frequency.value = frequency;
  lfoGain.gain.value = depth;

  lfo.connect(lfoGain);
  lfoGain.connect(targetParam);
  lfo.start();

  return { lfo, lfoGain };
}
