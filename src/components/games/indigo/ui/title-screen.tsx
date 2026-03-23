'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { INDIGO_HEX } from '../engine/palette';

/**
 * TitleScreen — the first thing you see.
 *
 * Black. Silence. Then static rises. Text ghosts in.
 * 'The Indigo Frequency' — EB Garamond, pearlescent white.
 * Behind the text: a Three.js scene of animated noise particles,
 * like a detuned television remembering something it once received.
 */

// ─── Static noise shader ─────────────────────────────────────────────────────

const NoiseVertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  uniform float uTime;
  uniform float uIntensity;
  varying float vAlpha;
  varying float vPhase;

  void main() {
    vPhase = aPhase;
    vec3 pos = position;

    // Gentle drift
    pos.x += sin(uTime * 0.3 + aPhase * 6.28) * 0.2;
    pos.y += cos(uTime * 0.2 + aPhase * 4.0) * 0.15;
    pos.z += sin(uTime * 0.15 + aPhase * 3.0) * 0.1;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * (200.0 / -mvPosition.z) * uIntensity;
    gl_Position = projectionMatrix * mvPosition;

    // Distance-based alpha
    float dist = length(mvPosition.xyz);
    vAlpha = smoothstep(50.0, 5.0, dist) * uIntensity;
  }
`;

const NoiseFragmentShader = /* glsl */ `
  uniform float uTime;
  varying float vAlpha;
  varying float vPhase;

  // Simple hash
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    // Circular point
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    if (dist > 0.5) discard;

    // Flicker
    float flicker = hash(vec2(vPhase, floor(uTime * 12.0)));
    float alpha = vAlpha * (0.3 + flicker * 0.7) * smoothstep(0.5, 0.1, dist);

    // Color: mostly pale white-violet, occasional amber
    vec3 color = mix(
      vec3(0.91, 0.87, 0.96),  // pearl white
      vec3(0.42, 0.25, 0.63),  // signal violet
      flicker * 0.4
    );

    gl_FragColor = vec4(color, alpha);
  }
`;

// ─── Particle system setup ───────────────────────────────────────────────────

function createStaticParticles(scene: THREE.Scene): {
  material: THREE.ShaderMaterial;
  dispose: () => void;
} {
  const count = 2000;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 40;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 25;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 5;
    sizes[i] = Math.random() * 3 + 0.5;
    phases[i] = Math.random();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0 },
    },
    vertexShader: NoiseVertexShader,
    fragmentShader: NoiseFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  return {
    material,
    dispose: () => {
      scene.remove(points);
      geometry.dispose();
      material.dispose();
    },
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export type TitleScreenProps = {
  /** Called when the player interacts to start the game. */
  onStart: () => void;
  /** Whether the title screen is visible. */
  visible: boolean;
};

export default function TitleScreen({ onStart, visible }: TitleScreenProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const particlesRef = useRef<{ material: THREE.ShaderMaterial; dispose: () => void } | null>(null);
  const rafRef = useRef<number | null>(null);
  const clockRef = useRef<THREE.Clock | null>(null);

  const [phase, setPhase] = useState<'black' | 'static' | 'title' | 'subtitle' | 'prompt' | 'exiting'>('black');
  const isMobile = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  // ─── Three.js setup ──────────────────────────────────────────────────

  useEffect(() => {
    if (!visible || !canvasRef.current) return;

    const container = canvasRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
    camera.position.set(0, 0, 15);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const particles = createStaticParticles(scene);
    particlesRef.current = particles;

    const clock = new THREE.Clock();
    clockRef.current = clock;

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      particles.material.uniforms.uTime.value = elapsed;
      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    const onResize = () => {
      const rw = container.clientWidth;
      const rh = container.clientHeight;
      camera.aspect = rw / rh;
      camera.updateProjectionMatrix();
      renderer.setSize(rw, rh);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      particles.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      particlesRef.current = null;
      clockRef.current = null;
    };
  }, [visible]);

  // ─── Phased entrance ─────────────────────────────────────────────────

  useEffect(() => {
    if (!visible) {
      setPhase('black');
      return;
    }

    // Phase sequence: black → static → title → subtitle → prompt
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => {
      setPhase('static');
      // Fade in particles
      if (particlesRef.current) {
        particlesRef.current.material.uniforms.uIntensity.value = 0;
      }
    }, 1000));

    timers.push(setTimeout(() => setPhase('title'), 2000));
    timers.push(setTimeout(() => setPhase('subtitle'), 3200));
    timers.push(setTimeout(() => setPhase('prompt'), 4500));

    return () => timers.forEach(clearTimeout);
  }, [visible]);

  // ─── Particle intensity ramp ──────────────────────────────────────────

  useEffect(() => {
    if (!visible || !particlesRef.current) return;

    const target = phase === 'black' ? 0 : phase === 'exiting' ? 1.5 : 0.6;
    let current = particlesRef.current.material.uniforms.uIntensity.value as number;

    const ramp = () => {
      if (!particlesRef.current) return;
      current += (target - current) * 0.03;
      particlesRef.current.material.uniforms.uIntensity.value = current;
      if (Math.abs(current - target) > 0.01) {
        requestAnimationFrame(ramp);
      }
    };
    requestAnimationFrame(ramp);
  }, [phase, visible]);

  // ─── Interaction ──────────────────────────────────────────────────────

  const handleStart = useCallback(() => {
    if (phase !== 'prompt') return;

    setPhase('exiting');

    // Brief swell then resolve
    setTimeout(() => {
      onStart();
    }, 800);
  }, [phase, onStart]);

  useEffect(() => {
    if (!visible || phase !== 'prompt') return;

    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      handleStart();
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, phase, handleStart]);

  // ─── Render ───────────────────────────────────────────────────────────

  if (!visible) return null;

  const showTitle = phase === 'title' || phase === 'subtitle' || phase === 'prompt' || phase === 'exiting';
  const showSubtitle = phase === 'subtitle' || phase === 'prompt' || phase === 'exiting';
  const showPrompt = phase === 'prompt';
  const isExiting = phase === 'exiting';

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center"
      style={{ background: INDIGO_HEX.voidBlack }}
      onClick={phase === 'prompt' ? handleStart : undefined}
      onTouchEnd={phase === 'prompt' ? handleStart : undefined}
    >
      {/* Three.js particle canvas */}
      <div ref={canvasRef} className="absolute inset-0" />

      {/* Text overlay */}
      <div
        className="relative z-10 flex flex-col items-center justify-center gap-6 px-8 text-center select-none"
        style={{
          opacity: isExiting ? 0 : 1,
          transition: 'opacity 0.6s ease',
        }}
      >
        {/* Title */}
        <h1
          className="font-eb-garamond font-normal tracking-widest"
          style={{
            color: INDIGO_HEX.pearlWhite,
            fontSize: 'clamp(2rem, 6vw, 4rem)',
            textShadow: '0 0 30px rgba(107, 63, 160, 0.5), 0 0 60px rgba(26, 0, 51, 0.4)',
            opacity: showTitle ? 1 : 0,
            transform: showTitle ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 1.5s ease, transform 1.5s ease',
          }}
        >
          The Indigo Frequency
        </h1>

        {/* Subtitle */}
        <p
          className="font-eb-garamond italic tracking-wider"
          style={{
            color: INDIGO_HEX.signalViolet,
            fontSize: 'clamp(0.85rem, 2vw, 1.1rem)',
            opacity: showSubtitle ? 0.7 : 0,
            transition: 'opacity 1.2s ease',
          }}
        >
          A transmission in five stations
        </p>

        {/* Start prompt */}
        <p
          className="font-eb-garamond tracking-wider"
          style={{
            color: INDIGO_HEX.pearlWhite,
            fontSize: 'clamp(0.75rem, 1.5vw, 0.9rem)',
            opacity: showPrompt ? 0.45 : 0,
            transition: 'opacity 0.8s ease',
            animation: showPrompt ? 'pulse 3s ease-in-out infinite' : 'none',
          }}
        >
          {isMobile ? 'Tap to tune in' : 'Press any key to tune in'}
        </p>
      </div>
    </div>
  );
}
