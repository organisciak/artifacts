"use client";
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Pause, Play, ArrowLeft, Download } from 'lucide-react';
import { useImageExport } from '@/hooks/useImageExport';
import ToysNav from '@/components/toys/nav';
import { Footer } from '@/components/ui/footer';
import { AlertBadge } from '@/components/ui/alert-badge';

const MeditativeFractals = () => {
  const CANVAS_SIZE = 1600;
  const MIN_BRANCH_SIZE = 2;
  const TRANSITION_DURATION = 1000;
  const animationRef = useRef();
  const lastUpdateRef = useRef(Date.now());

  // Pre-calculate constants
  const SINE_LOOKUP = useMemo(() => {
    const table = new Float32Array(360);
    const factor = Math.PI / 180;
    for (let i = 0; i < 360; i++) {
      table[i] = Math.sin(i * factor);
    }
    return table;
  }, []);

  const COSINE_LOOKUP = useMemo(() => {
    const table = new Float32Array(360);
    const factor = Math.PI / 180;
    for (let i = 0; i < 360; i++) {
      table[i] = Math.cos(i * factor);
    }
    return table;
  }, []);

  // Fast trigonometry lookup
  const fastSin = useCallback((angle) => {
    const idx = ((angle * 180 / Math.PI) % 360) | 0; // Using bitwise OR for faster integer conversion
    return SINE_LOOKUP[idx >= 0 ? idx : idx + 360];
  }, [SINE_LOOKUP]);

  const fastCos = useCallback((angle) => {
    const idx = ((angle * 180 / Math.PI) % 360) | 0;
    return COSINE_LOOKUP[idx >= 0 ? idx : idx + 360];
  }, [COSINE_LOOKUP]);

  const [state, setState] = useState({
    isAnimating: true,
    showControls: false,
    paramHistory: [],
    targetParams: null,
    transitionStartTime: null,
    lastChangeTime: Date.now()
  });

  const [params, setParams] = useState({
    depth: { value: 4, min: 2, max: 6, step: 1, animated: true },
    branches: { value: 5, min: 3, max: 7, step: 1, animated: true },
    rotation: { value: 0.4, min: 0, max: 1, step: 0.01, animated: true },
    scale: { value: 0.7, min: 0.4, max: 0.9, step: 0.01, animated: true },
    curl: { value: 0.5, min: 0, max: 1, step: 0.01, animated: true },
    flow: { value: 0.3, min: 0, max: 1, step: 0.01, animated: true }
  });

  const { exportSvgAsImage } = useImageExport();

  const handleExport = useCallback(() => {
    const svg = document.querySelector('#meditative-fractal-svg');
    if (!svg) return;
    
    exportSvgAsImage(svg, {
      filename: 'fractal.png',
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      backgroundColor: 'white'
    });
  }, [exportSvgAsImage]);

  // Optimize branch generation with StringBuilder pattern
  const generateBranch = useCallback((x, y, size, angle, depth, time) => {
    if (depth <= 0 || size < MIN_BRANCH_SIZE) return '';

    const pathParts = [];
    const branchCount = params.branches.value | 0; // Force integer
    const baseRotation = Math.PI * 2 * params.rotation.value;
    const flowOffset = fastSin(time * 2) * params.flow.value * 20;
    const curlAmount = params.curl.value * Math.PI * 0.5;
    const newSize = size * params.scale.value;
    const opacity = 0.2 + (depth / 7) * 0.5;
    const strokeWidth = Math.max(1, depth);

    for (let i = 0; i < branchCount; i++) {
      const branchAngle = angle + (i / branchCount) * Math.PI * 2 + baseRotation + time;
      const cosAngle = fastCos(branchAngle);
      const sinAngle = fastSin(branchAngle);
      
      const x1 = x + cosAngle * flowOffset;
      const y1 = y + sinAngle * flowOffset;
      const x2 = x1 + fastCos(branchAngle + curlAmount) * newSize;
      const y2 = y1 + fastSin(branchAngle + curlAmount) * newSize;
      
      // Use array join for better string concatenation
      pathParts.push(
        ['<path d="M', x1, y1,
         'Q', (x1 + cosAngle * newSize * 0.7),
         (y1 + sinAngle * newSize * 0.7),
         x2, y2,
         '" stroke="black" stroke-width="', strokeWidth,
         '" stroke-opacity="', opacity,
         '" fill="none"/>'].join(' ')
      );

      if (depth > 1) {
        pathParts.push(generateBranch(x2, y2, newSize, branchAngle, depth - 1, time + 0.1));
      }
    }

    return pathParts.join('');
  }, [params, fastSin, fastCos]);

  const generatePattern = useCallback((time) => {
    return generateBranch(
      CANVAS_SIZE/2, 
      CANVAS_SIZE/2, 
      CANVAS_SIZE/4, 
      0, 
      Math.floor(params.depth.value), 
      time
    );
  }, [params, generateBranch]);

  const generateRandomParams = useCallback(() => {
    const newParams = {};
    Object.entries(params).forEach(([key, param]) => {
      if (param.animated) {
        newParams[key] = param.min + Math.random() * (param.max - param.min);
      } else {
        newParams[key] = param.value;
      }
    });
    return newParams;
  }, [params]);

  const animate = useCallback(() => {
    const now = Date.now();
    if (now - lastUpdateRef.current < 16) { // Cap at ~60fps
      animationRef.current = requestAnimationFrame(animate);
      return;
    }
    lastUpdateRef.current = now;
    
    const { targetParams, transitionStartTime, lastChangeTime } = state;
    const timeSinceLastChange = now - lastChangeTime;
    
    if (targetParams && transitionStartTime) {
      const progress = Math.min((now - transitionStartTime) / TRANSITION_DURATION, 1);
      // Optimized easing calculation
      const easeProgress = progress < 0.5 
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      setParams(prev => {
        const newParams = { ...prev };
        for (const [key, targetValue] of Object.entries(targetParams)) {
          newParams[key] = { 
            ...prev[key], 
            value: prev[key].value + (targetValue - prev[key].value) * easeProgress 
          };
        }
        return newParams;
      });

      if (progress === 1) {
        setState(s => ({
          ...s,
          paramHistory: [...s.paramHistory, params],
          targetParams: null,
          transitionStartTime: null,
          lastChangeTime: now
        }));
      }
    } else if (timeSinceLastChange >= TRANSITION_DURATION) {
      setState(s => ({
        ...s,
        targetParams: generateRandomParams(),
        transitionStartTime: now
      }));
    }
    
    if (state.isAnimating) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [state, params, generateRandomParams]);

  useEffect(() => {
    if (state.isAnimating) {
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animationRef.current);
  }, [state.isAnimating, animate]);

  const goBack = useCallback(() => {
    if (state.paramHistory.length === 0) return;
    const prevParams = state.paramHistory[state.paramHistory.length - 1];
    setParams(prev => {
      const newParams = { ...prev };
      for (const [key, value] of Object.entries(prevParams)) {
        newParams[key] = { ...prev[key], value };
      }
      return newParams;
    });
    setState(s => ({ ...s, paramHistory: s.paramHistory.slice(0, -1) }));
  }, [state.paramHistory]);

  // Memo-ize the controls rendering to prevent unnecessary re-renders
  const renderControls = useMemo(() => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Object.entries(params).map(([name, param]) => (
        <div key={name} className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium capitalize">{name}</label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={param.animated}
                onChange={() => setParams(prev => ({
                  ...prev,
                  [name]: { ...param, animated: !param.animated }
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-500">
                {param.value.toFixed(2)}
              </span>
            </div>
          </div>
          <input
            type="range"
            value={param.value}
            onChange={e => setParams(prev => ({
              ...prev,
              [name]: { ...param, value: Number(e.target.value) }
            }))}
            min={param.min}
            max={param.max}
            step={param.step}
            className="w-full"
          />
        </div>
      ))}
    </div>
  ), [params]);

  // Add a new state for tracking hydration
  const [isHydrated, setIsHydrated] = useState(false);

  // Add useEffect to mark component as hydrated
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return (
    <div className="h-auto w-fill bg-gray-50" onClick={e => {
      if (!e.target.closest('button') && !e.target.closest('input')) {
        setState(s => ({ ...s, showControls: !s.showControls }));
      }
    }}>
      <div className="w-full h-full relative">
        <Card className="w-full h-full">
          <CardContent className="p-0 h-full">
            <svg
              id="meditative-fractal-svg"
              viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
              className="w-full h-full"
              preserveAspectRatio="xMidYMid slice"
              style={{ background: 'radial-gradient(circle, #fff 0%, #f0f0f0 100%)' }}
            >
              <g dangerouslySetInnerHTML={{ 
                __html: generatePattern(isHydrated ? Date.now() * 0.001 : 0) 
              }} />
            </svg>
          </CardContent>
        </Card>
      </div>

      <div className="fixed top-4 right-4 flex gap-2 z-20">
        <button
          onClick={() => setState(s => ({ ...s, isAnimating: !s.isAnimating }))}
          className="bg-white/80 backdrop-blur-sm p-2 rounded-full hover:bg-white/90 shadow-lg"
        >
          {state.isAnimating ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
        </button>
        {!state.isAnimating && state.paramHistory.length > 0 && (
          <button 
            onClick={goBack} 
            className="bg-white/80 backdrop-blur-sm p-2 rounded-full hover:bg-white/90 shadow-lg"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        )}
        <button onClick={handleExport} className="bg-white/80 backdrop-blur-sm p-2 rounded-full hover:bg-white/90 shadow-lg">
          <Download className="w-6 h-6" />

        </button>
      </div>

      <div 
        className={`fixed bottom-0 left-0 right-0 transition-transform duration-300 transform ${
          state.showControls ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="max-w-6xl mx-auto p-4">
          <Card className="w-full bg-white/90 backdrop-blur-sm shadow-lg">
            <CardContent className="p-6">
              {renderControls}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default function EasyFractalsPage() {
  return (
    <main>
      <div className="container mx-auto px-4 py-2 space-y-2">
        <ToysNav />
        <AlertBadge message="Best on faster devices" />
      </div>
      <MeditativeFractals />
      <Footer />
    </main>
  );
}