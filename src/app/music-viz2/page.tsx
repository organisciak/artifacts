'use client';

import { useEffect, useRef, useState } from 'react';
import ToysNav from '@/components/toys/nav';

type ResponsePreset = {
  id: 'spiky' | 'smooth' | 'elastic';
  label: string;
  smoothing: number;
  spike: number;
  ringPower: number;
  zoomBoost: number;
  trail: number;
};

type Bloom = {
  id: number;
  x: number;
  y: number;
  radius: number;
  growth: number;
  wobble: number;
  ringPhase: number;
  thickness: number;
  alpha: number;
  color: { r: number; g: number; b: number };
};

const responsePresets: ResponsePreset[] = [
  {
    id: 'spiky',
    label: 'Spiky EQ',
    smoothing: 0.45,
    spike: 0.9,
    ringPower: 2.2,
    zoomBoost: 1.3,
    trail: 0.14,
  },
  {
    id: 'smooth',
    label: 'Smooth Melt',
    smoothing: 0.86,
    spike: 0.35,
    ringPower: 1.2,
    zoomBoost: 1.05,
    trail: 0.12,
  },
  {
    id: 'elastic',
    label: 'Elastic',
    smoothing: 0.7,
    spike: 0.65,
    ringPower: 1.7,
    zoomBoost: 1.15,
    trail: 0.16,
  },
];

const palette = [
  '#ffd447',
  '#ff9bd4',
  '#7df6f5',
  '#9cf376',
  '#ffc38b',
  '#c9a5ff',
  '#6df0c0',
];

const hexToRgb = (hex: string) => {
  const value = parseInt(hex.replace('#', ''), 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const averageRange = (data: Uint8Array, start: number, end: number) => {
  const safeStart = Math.max(0, start);
  const safeEnd = Math.min(data.length, end);
  if (safeEnd <= safeStart) return 0;

  let sum = 0;
  for (let i = safeStart; i < safeEnd; i++) {
    sum += data[i];
  }
  return sum / (safeEnd - safeStart);
};

export default function MusicViz2Page() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presetId, setPresetId] = useState<ResponsePreset['id']>('spiky');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [solidFill, setSolidFill] = useState(true);

  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const freqDataRef = useRef<Uint8Array | null>(null);
  const presetRef = useRef<ResponsePreset>(responsePresets[0]);
  const bloomsRef = useRef<Bloom[]>([]);
  const nextIdRef = useRef(0);
  const colorIndexRef = useRef(0);
  const beatFloorRef = useRef(0);
  const lastBeatSignalRef = useRef(0);
  const bpmEstimateRef = useRef<number | null>(null);
  const beatTimesRef = useRef<number[]>([]);
  const lastBeatAtRef = useRef<number | null>(null);
  const eqRef = useRef({ low: 0, mid: 0, high: 0, overall: 0 });
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const lastTimeRef = useRef<number | null>(null);
  const spawnTimerRef = useRef(0);
  const solidFillRef = useRef(true);
  const isListeningRef = useRef(false);
  const beatCooldownRef = useRef(0);

  const getNextColor = () => {
    const idx = colorIndexRef.current % palette.length;
    colorIndexRef.current = (colorIndexRef.current + 3) % palette.length;
    const base = hexToRgb(palette[idx]);
    const boost = 1.08 + Math.random() * 0.24;
    return {
      r: Math.min(255, base.r * boost),
      g: Math.min(255, base.g * boost),
      b: Math.min(255, base.b * boost),
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const applyTempoPreset = (
      preset: ResponsePreset,
      bpm: number | null
    ): ResponsePreset => {
      const tempo = bpm ? clamp(0, (bpm - 90) / 70, 1) : 0;
      return {
        ...preset,
        smoothing: clamp(0.45, preset.smoothing - 0.08 * tempo, 0.92),
        spike: preset.spike + 0.3 * tempo,
        ringPower: preset.ringPower + 0.25 * tempo,
        zoomBoost: preset.zoomBoost * (1 + 0.28 * tempo),
        trail: clamp(0.08, preset.trail * (1 - 0.12 * tempo) + 0.02 * tempo, 0.2),
      };
    };

    const resize = () => {
      const { clientWidth, clientHeight } = canvas;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = clientWidth * dpr;
      canvas.height = clientHeight * dpr;
      sizeRef.current = { width: clientWidth, height: clientHeight, dpr };
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const spawnBloom = () => {
      const { width, height } = sizeRef.current;
      const color = getNextColor();
      const spread = Math.min(width, height) * 0.12;
      bloomsRef.current.push({
        id: nextIdRef.current++,
        x: width / 2 + (Math.random() - 0.5) * spread,
        y: height / 2 + (Math.random() - 0.5) * spread,
        radius: 12 + Math.random() * 24,
        growth: 60 + Math.random() * 120,
        wobble: 0.2 + Math.random() * 0.6,
        ringPhase: Math.random() * Math.PI * 2,
        thickness: 1.2 + Math.random() * 1.6,
        alpha: 1,
        color,
      });
    };

    for (let i = 0; i < 8; i++) {
      spawnBloom();
    }

    const animate = (now: number) => {
      animationRef.current = requestAnimationFrame(animate);
      const lastTime = lastTimeRef.current ?? now;
      const delta = Math.min(0.05, (now - lastTime) / 1000);
      lastTimeRef.current = now;
      const preset = applyTempoPreset(presetRef.current, bpmEstimateRef.current);
      const { width, height, dpr } = sizeRef.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = `rgba(5, 10, 18, ${preset.trail})`;
      ctx.fillRect(0, 0, width, height);

      let beatSignal = 0;

      if (analyserRef.current && freqDataRef.current) {
        const data = freqDataRef.current;
        analyserRef.current.smoothingTimeConstant = preset.smoothing;
        analyserRef.current.getByteFrequencyData(data);
        const low = averageRange(data, 2, 24) / 255;
        const mid = averageRange(data, 24, 80) / 255;
        const high = averageRange(data, 80, 160) / 255;
        const overall =
          (averageRange(data, 0, data.length) / 255 + low + mid + high) / 4;

        beatSignal =
          low * 1.15 +
          mid * 0.3 +
          high * 0.65 +
          overall * 0.5;

        const lerp = preset.smoothing;
        eqRef.current.low = lerpValue(eqRef.current.low, Math.pow(low, preset.ringPower), lerp);
        eqRef.current.mid = lerpValue(eqRef.current.mid, mid, lerp * 0.8);
        eqRef.current.high = lerpValue(eqRef.current.high, high, lerp * 0.7);
        eqRef.current.overall = lerpValue(eqRef.current.overall, overall, 0.22);
      } else {
        eqRef.current.low *= 0.94;
        eqRef.current.mid *= 0.94;
        eqRef.current.high *= 0.94;
        eqRef.current.overall *= 0.9;
      }

      const eq = eqRef.current;
      const diag = Math.sqrt(width * width + height * height) * 0.6;
      const zoom = 1 + eq.low * preset.zoomBoost;
      const spawnInterval = clamp(0.28, 0.95 - eq.overall * 0.45, 1);
      spawnTimerRef.current += delta;
      beatCooldownRef.current = Math.max(0, beatCooldownRef.current - delta);

      beatFloorRef.current = lerpValue(
        beatFloorRef.current || beatSignal,
        beatSignal,
        0.04
      );
      const beatDelta = beatSignal - lastBeatSignalRef.current;
      lastBeatSignalRef.current = beatSignal;
      const floor = beatFloorRef.current;
      const headroom = Math.max(0, beatSignal - floor);
      const ratio = Math.min(4, beatSignal / (floor + 0.08));
      const beatEnergy = headroom * 0.8 + Math.max(0, beatDelta) * 0.8;
      const beatThreshold = 0.025 + floor * 0.34;
      const hasEnergy = beatSignal > 0.02 || eq.overall > 0.025;
      const quiet = beatSignal < 0.012 && eq.overall < 0.018;
      if (lastBeatAtRef.current && now / 1000 - lastBeatAtRef.current > 3) {
        bpmEstimateRef.current = null;
      }
      const nowSeconds = now / 1000;
      const sinceBeat = lastBeatAtRef.current
        ? nowSeconds - lastBeatAtRef.current
        : Infinity;
      if (bpmEstimateRef.current) {
        if (sinceBeat > 0.6 && sinceBeat < 2.5) {
          bpmEstimateRef.current = lerpValue(
            bpmEstimateRef.current,
            bpmEstimateRef.current * 0.92,
            0.2
          );
        } else if (sinceBeat >= 2.5) {
          bpmEstimateRef.current = null;
        }
      }
      const allowBeatSpawn =
        isListeningRef.current && analyserRef.current && beatCooldownRef.current <= 0;

      if (allowBeatSpawn && hasEnergy) {
        const hasBeat =
          beatEnergy > beatThreshold ||
          ratio > 1.18 ||
          (beatDelta > 0.025 && headroom > 0.02);
        const minGapReached = spawnTimerRef.current >= 0.1;
        const staleForTooLong = spawnTimerRef.current >= 0.7 && !quiet;
        if (hasBeat && minGapReached) {
          spawnTimerRef.current = 0;
          const beatSeconds = now / 1000;
          const times = beatTimesRef.current;
          times.push(beatSeconds);
          if (times.length > 12) times.shift();
          if (times.length >= 4) {
            const intervals: number[] = [];
            for (let i = 1; i < times.length; i++) {
              const diff = times[i] - times[i - 1];
              if (diff > 0.25 && diff < 1.8) {
                intervals.push(diff);
              }
            }
            if (intervals.length >= 3) {
              intervals.sort((a, b) => a - b);
              const mid = intervals[Math.floor(intervals.length / 2)];
              const bpmRaw = 60 / mid;
              const clamped = clamp(70, bpmRaw, 180);
              if (Number.isFinite(clamped)) {
                const prev = bpmEstimateRef.current ?? clamped;
                bpmEstimateRef.current = lerpValue(prev, clamped, 0.25);
              }
            }
          }
          const bpm = bpmEstimateRef.current;
          const targetCooldown = bpm
            ? clamp(0.08, (60 / bpm) * 0.5, 0.26)
            : 0.2 + Math.random() * 0.18;
          beatCooldownRef.current = targetCooldown;
          const burstCount =
            beatEnergy > beatThreshold * 1.8 || ratio > 1.55 ? 2 : 1;
          for (let b = 0; b < burstCount; b++) {
            spawnBloom();
          }
          if (beatEnergy > beatThreshold * 2.2 && Math.random() > 0.35) {
            spawnBloom();
          }
          lastBeatAtRef.current = beatSeconds;
        } else if (staleForTooLong) {
          spawnTimerRef.current = 0;
          beatCooldownRef.current = 0.18;
          spawnBloom();
        }
      } else if (spawnTimerRef.current >= spawnInterval) {
        spawnTimerRef.current = 0;
        spawnBloom();
        if (eq.low > 0.75 && Math.random() > 0.45) {
          spawnBloom();
        }
      }

      bloomsRef.current.forEach((bloom) => {
        bloom.radius += (bloom.growth * 0.6 + eq.overall * 220 * zoom) * delta;
        bloom.ringPhase += (0.6 + eq.high * 2.2) * delta;
      });

      const blooms = bloomsRef.current;
      const survivors: Bloom[] = [];
      for (let i = 0; i < blooms.length; i++) {
        const bloom = blooms[i];
        bloom.alpha = Math.max(
          0,
          1 - bloom.radius / (diag * (0.7 + eq.overall * 0.4))
        );
        drawBloom(ctx, bloom, eq, preset, solidFillRef.current);
        if (!(bloom.radius > diag * 1.4 || bloom.alpha < 0.05)) {
          survivors.push(bloom);
        }
      }
      bloomsRef.current = survivors;
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    const nextPreset =
      responsePresets.find((preset) => preset.id === presetId) ??
      responsePresets[0];
    presetRef.current = nextPreset;
    if (analyserRef.current) {
      analyserRef.current.smoothingTimeConstant = nextPreset.smoothing;
    }
  }, [presetId]);

  useEffect(() => {
    solidFillRef.current = solidFill;
  }, [solidFill]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    const element = containerRef.current;
    if (!element) return;
    if (!document.fullscreenElement) {
      element.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = presetRef.current.smoothing;
      source.connect(analyser);
      analyserRef.current = analyser;
      freqDataRef.current = new Uint8Array(analyser.frequencyBinCount);
      bpmEstimateRef.current = null;
      beatTimesRef.current = [];
      lastBeatAtRef.current = null;
      setIsListening(true);
      setError(null);
    } catch (err) {
      setError('Could not access microphone. Please allow microphone access.');
      console.error('Microphone error:', err);
    }
  };

  const stopListening = () => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    freqDataRef.current = null;
    setIsListening(false);
  };

  return (
    <div
      ref={containerRef}
      onDoubleClick={toggleFullscreen}
      className="relative h-screen w-full overflow-hidden bg-slate-950 text-white"
    >
      <canvas ref={canvasRef} className="h-full w-full" />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,213,71,0.05),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(201,165,255,0.06),transparent_35%),radial-gradient(circle_at_70%_80%,rgba(126,244,192,0.05),transparent_35%)]" />

      <div className="absolute top-4 left-4 z-10 space-y-3">
        <ToysNav variant="mono" tone="emerald" />
        {isListening && (
          <div className="space-y-2">
            <button
              onClick={stopListening}
              className="pointer-events-auto border-emerald-300 text-emerald-200 bg-emerald-300/10 hover:bg-emerald-300/20 px-5 py-3 font-mono text-xs tracking-[0.08em] border transition-all shadow-lg"
            >
              [ STOP LISTENING ]
            </button>
            {isFullscreen && (
              <p className="font-mono text-[11px] text-slate-400">
                double-click to exit fullscreen
              </p>
            )}
          </div>
        )}
      </div>

      {!isListening && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="pointer-events-auto space-y-3 text-center">
            <button
              onClick={startListening}
              className="mx-auto rounded-full border-2 border-amber-300 bg-amber-300/15 px-8 py-4 font-mono text-sm uppercase tracking-[0.14em] text-amber-100 shadow-lg shadow-amber-500/20 transition-all hover:-translate-y-0.5 hover:border-amber-200 hover:text-white hover:shadow-amber-300/40"
            >
              [ START MICROPHONE ]
            </button>
            {error && (
              <p className="max-w-xs font-mono text-xs text-red-300">
                {error}
              </p>
            )}
            <p className="font-mono text-[11px] text-slate-300/80">
              (beats wake the rings)
            </p>
          </div>
        </div>
      )}

      <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setShowControls((prev) => !prev)}
          className="pointer-events-auto rounded-full border-2 border-white/15 bg-slate-900/70 px-4 py-2 font-mono text-sm uppercase tracking-[0.14em] text-slate-200 backdrop-blur transition-all hover:border-emerald-300/70 hover:text-white hover:shadow-[0_0_20px_rgba(52,211,153,0.18)]"
        >
          {showControls ? '[ HIDE ]' : '[ PARAMS ]'}
        </button>

        {showControls && (
          <div className="w-72 rounded-xl border border-white/10 bg-slate-900/85 p-4 font-mono text-sm shadow-2xl shadow-emerald-500/15 backdrop-blur">
            <div className="text-xs text-emerald-200">{'// PARAMETERS'}</div>
            <p className="mb-3 text-[11px] uppercase tracking-[0.12em] text-slate-300">
              Ring response
            </p>
            <div className="space-y-2">
              {responsePresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setPresetId(preset.id)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                    presetId === preset.id
                      ? 'border-emerald-300 bg-emerald-300/15 text-white shadow-[0_0_0_1px_rgba(52,211,153,0.25)]'
                      : 'border-white/10 text-slate-200 hover:border-white/30 hover:bg-white/5'
                  }`}
                >
                  <span className="text-[12px] uppercase tracking-[0.12em]">
                    {preset.label}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    s:{preset.smoothing.toFixed(2)} z:{preset.zoomBoost.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <div className="pr-3">
                <p className="text-[12px] uppercase tracking-[0.12em] text-slate-200">
                  Solid fill
                </p>
                <p className="text-[11px] text-slate-400">
                  Opaque cores with ghosted edges.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSolidFill((prev) => !prev)}
                className={`h-9 w-20 rounded-full border text-[12px] uppercase tracking-[0.12em] transition-colors ${
                  solidFill
                    ? 'border-emerald-300 bg-emerald-300/20 text-white shadow-[0_0_0_1px_rgba(52,211,153,0.35)]'
                    : 'border-white/15 bg-slate-900 text-slate-200 hover:border-white/30 hover:bg-white/5'
                }`}
              >
                {solidFill ? 'On' : 'Off'}
              </button>
            </div>
            <p className="mt-3 text-[11px] text-slate-400">
              Pick a response curve to change how low/mid/high peaks drive the rings.
            </p>
          </div>
        )}
      </div>

      <div className="absolute bottom-4 left-4 z-10 space-y-1 font-mono text-[11px] text-slate-200/80">
        <p>{'// double-click for fullscreen'}</p>
      </div>
    </div>
  );
}

const clamp = (min: number, value: number, max: number) =>
  Math.min(max, Math.max(min, value));

const lerpValue = (from: number, to: number, t: number) =>
  from + (to - from) * t;

const drawBloom = (
  ctx: CanvasRenderingContext2D,
  bloom: Bloom,
  eq: { low: number; mid: number; high: number; overall: number },
  preset: ResponsePreset,
  solidFill: boolean
) => {
  ctx.save();
  ctx.translate(bloom.x, bloom.y);
  ctx.rotate(bloom.ringPhase * 0.1);
  ctx.globalAlpha = bloom.alpha;

  const { r, g, b } = bloom.color;
  const ringBase = bloom.radius * (1.15 + eq.mid * 0.4);

  // Core fill
  const coreGradient = ctx.createRadialGradient(
    0,
    0,
    bloom.radius * 0.18,
    0,
    0,
    bloom.radius * 1.1
  );
  coreGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.95)`);
  coreGradient.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, 0.35)`);
  coreGradient.addColorStop(1, 'rgba(5, 10, 18, 0)');

  ctx.fillStyle = coreGradient;
  ctx.beginPath();
  ctx.arc(0, 0, bloom.radius * 1.05, 0, Math.PI * 2);
  ctx.fill();

  if (solidFill) {
    const fillRadius = ringBase * 0.98;
    const fillAlpha = clamp(0.72, 0.92 + eq.overall * 0.2, 1);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${fillAlpha})`;
    ctx.beginPath();
    ctx.arc(0, 0, fillRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Outer ring
  const spikes = 42;
  const spikeEnergy =
    Math.pow(eq.low, preset.ringPower) * (0.7 + preset.spike) +
    eq.high * 0.3;

  ctx.beginPath();
  for (let i = 0; i <= spikes; i++) {
    const angle = (i / spikes) * Math.PI * 2;
    const wobble = Math.sin(angle * 4 + bloom.ringPhase * 1.2) * bloom.wobble;
    const radial =
      ringBase *
      (1 +
        spikeEnergy * (0.4 + Math.sin(angle * 6 + bloom.ringPhase) * 0.25) +
        wobble * 0.18);
    const px = Math.cos(angle) * radial;
    const py = Math.sin(angle) * radial;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();

  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.55 + eq.overall * 0.3})`;
  ctx.lineWidth = bloom.thickness + eq.high * 4 + preset.spike * 0.8;
  ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.6)`;
  ctx.shadowBlur = 10 + eq.overall * 24;
  ctx.globalCompositeOperation = 'lighter';
  ctx.stroke();

  // Accent arcs
  const arcRadius = ringBase * (1.05 + eq.high * 0.5);
  ctx.lineWidth = 0.8 + eq.high * 2.5;
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.25 + eq.overall * 0.2})`;
  ctx.beginPath();
  const sweep = Math.PI * (0.4 + eq.mid * 0.7);
  ctx.arc(0, 0, arcRadius, bloom.ringPhase * 0.8, bloom.ringPhase * 0.8 + sweep);
  ctx.stroke();

  ctx.restore();
};
