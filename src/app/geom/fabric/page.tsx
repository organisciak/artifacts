'use client';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Pause, Play, ArrowLeft, Download } from 'lucide-react';
import { useImageExport } from '@/hooks/useImageExport';
import ToysNav from '@/components/toys/nav';
import { Footer } from '@/components/ui/footer';

const FabricFlow = () => {
  const CANVAS_SIZE = 1600;
  const animationRef = useRef(0);
  const [time, setTime] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);

  const [state, setState] = useState({
    isAnimating: false,
    showControls: false,
    paramHistory: [],
    targetParams: null,
    transitionStartTime: null,
    lastChangeTime: Date.now()
  });

  const [params, setParams] = useState({
    gridSize: { value: 20, min: 6, max: 30, step: 1, animated: false },
    flow: { value: 0.5, min: 0.1, max: 0.9, step: 0.01, animated: true },
    tension: { value: 0.6, min: 0.2, max: 0.9, step: 0.01, animated: true },
    wave: { value: 0.4, min: 0, max: 1, step: 0.01, animated: true },
    ripple: { value: 0.47, min: 0, max: 1, step: 0.01, animated: false },
    chaos: { value: 0.28, min: 0, max: 1, step: 0.01, animated: true },
    dotSize: { value: 0.25, min: 0.1, max: 1, step: 0.01, animated: false }
  });

  // Modify the getPointNoise function to use seeded values initially
  const noiseRef = useRef({});
  const getPointNoise = useCallback((key) => {
    if (!noiseRef.current[key] && isHydrated) {
      noiseRef.current[key] = {
        x: Math.random() * 1000,
        y: Math.random() * 1000
      };
    }
    // Return default values before hydration
    return noiseRef.current[key] || { x: 0, y: 0 };
  }, [isHydrated]);

  const generateRandomParams = useCallback(() => 
    Object.entries(params).reduce((acc, [key, param]) => ({
      ...acc,
      [key]: param.animated ? param.min + Math.random() * (param.max - param.min) : param.value
    }), {}), [params]);

  const generatePoints = useCallback((time) => {
    const grid = Math.floor(params.gridSize.value);
    const offset = CANVAS_SIZE * 0.2;  // 20% offset for pattern
    const points = [];
    const cellSize = (CANVAS_SIZE * 1.4) / grid;
    const triangleHeight = cellSize * Math.sqrt(3) / 2;

    for (let row = 0; row <= grid; row++) {
      const rowOffset = (row % 2) * (cellSize / 2);
      for (let col = 0; col <= grid; col++) {
        const baseX = col * cellSize + rowOffset - offset;
        const baseY = row * triangleHeight - offset;
        
        // Get individual point noise
        const noise = getPointNoise(`${row}-${col}`);
        const chaosX = Math.sin(time + noise.x) * cellSize * 0.3 * params.chaos.value;
        const chaosY = Math.cos(time + noise.y) * cellSize * 0.3 * params.chaos.value;
        
        // Add flowing motion
        const flowX = Math.sin(time + row * params.flow.value) * cellSize * 0.3;
        const flowY = Math.cos(time * 0.7 + col * params.flow.value) * cellSize * 0.3;
        
        // Add rippling effect
        const centerX = CANVAS_SIZE / 2;
        const centerY = CANVAS_SIZE / 2;
        const distance = Math.sqrt(Math.pow(baseX - centerX, 2) + Math.pow(baseY - centerY, 2));
        const ripple = Math.sin(distance * params.ripple.value - time * 2) * cellSize * 0.2;
        
        // Add wave motion
        const wave = Math.sin(col * params.wave.value + time) * cellSize * 0.4;
        
        points.push({
          x: baseX + flowX + ripple + chaosX,
          y: baseY + flowY + wave + chaosY,
          key: `${row}-${col}`
        });
      }
    }

    return points;
  }, [params, getPointNoise]);

  const generatePattern = useCallback((time) => {
    if (!isHydrated) return '';
    const points = generatePoints(time);
    const grid = Math.floor(params.gridSize.value);
    const elements = [];
    const rowLength = grid + 1;

    // Generate triangles
    for (let row = 0; row < grid; row++) {
      for (let col = 0; col < grid; col++) {
        const topLeft = points[row * rowLength + col];
        const topRight = points[row * rowLength + col + 1];
        const bottom = points[(row + 1) * rowLength + col];
        const bottomRight = points[(row + 1) * rowLength + col + 1];

        // Draw two triangles for each grid cell
        if (row % 2 === 0) {
          elements.push(`
            <path 
              d="M ${topLeft.x} ${topLeft.y} L ${topRight.x} ${topRight.y} L ${bottom.x} ${bottom.y} Z"
              stroke="black"
              stroke-width="1"
              fill="none"
              opacity="${0.1 + params.tension.value * 0.2}"
            />
            <path 
              d="M ${topRight.x} ${topRight.y} L ${bottomRight.x} ${bottomRight.y} L ${bottom.x} ${bottom.y} Z"
              stroke="black"
              stroke-width="1"
              fill="none"
              opacity="${0.1 + params.tension.value * 0.2}"
            />
          `);
        } else {
          elements.push(`
            <path 
              d="M ${topLeft.x} ${topLeft.y} L ${topRight.x} ${topRight.y} L ${bottomRight.x} ${bottomRight.y} Z"
              stroke="black"
              stroke-width="1"
              fill="none"
              opacity="${0.1 + params.tension.value * 0.2}"
            />
            <path 
              d="M ${topLeft.x} ${topLeft.y} L ${bottomRight.x} ${bottomRight.y} L ${bottom.x} ${bottom.y} Z"
              stroke="black"
              stroke-width="1"
              fill="none"
              opacity="${0.1 + params.tension.value * 0.2}"
            />
          `);
        }
      }
    }

    // Draw points
    points.forEach(point => {
      elements.push(`
        <circle 
          cx="${point.x}" 
          cy="${point.y}" 
          r="${4 * params.dotSize.value}"
          fill="black"
          opacity="0.6"
        />
      `);
    });

    return elements.join('');
  }, [params, generatePoints, isHydrated]);

  const animate = useCallback(() => {
    const now = Date.now();
    setTime(now * 0.001);
    
    const { targetParams, transitionStartTime, lastChangeTime } = state;
    if (state.targetParams && state.transitionStartTime) {
      const progress = Math.min((now - transitionStartTime) / 9000, 1);
      const easeProgress = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      setParams(prev => {
        const newParams = { ...prev };
        Object.entries(targetParams).forEach(([key, targetValue]) => {
          newParams[key] = { ...prev[key], value: prev[key].value + (targetValue - prev[key].value) * easeProgress };
        });
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
    } else {
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

  useEffect(() => {
    setIsHydrated(true);
    setState(s => ({ ...s, isAnimating: true }));
  }, []);

  const goBack = useCallback(() => {
    if (state.paramHistory.length === 0) return;
    const prevParams = state.paramHistory[state.paramHistory.length - 1];
    setParams(prev => Object.entries(prev).reduce((acc, [key, param]) => ({
      ...acc, [key]: { ...param, value: prevParams[key].value }
    }), {}));
    setState(s => ({ ...s, paramHistory: s.paramHistory.slice(0, -1) }));
  }, [state.paramHistory]);

  const { exportSvgAsImage } = useImageExport();

  const handleExport = useCallback(() => {
    const svg = document.querySelector('#fabric-flow-svg');
    if (!svg) return;
    
    exportSvgAsImage(svg as SVGElement, {
      filename: 'fabric-flow.png',
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      backgroundColor: '#f0f0f0'
    });
  }, [exportSvgAsImage]);

  return (
    <div className="h-screen w-screen bg-gray-50" onClick={e => {
      if (!e.target.closest('button') && !e.target.closest('input')) {
        setState(s => ({ ...s, showControls: !s.showControls }));
      }
    }}>
      {isHydrated ? (
        <div className="w-full h-full relative">
          <Card className="w-full h-full">
            <CardContent className="p-0 h-full">
              <svg
                id="fabric-flow-svg"
                viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
                className="w-full h-full"
                preserveAspectRatio="xMidYMid slice"
                style={{ background: 'radial-gradient(circle, #fff 0%, #f0f0f0 100%)' }}
              >
                <g dangerouslySetInnerHTML={{ 
                  __html: generatePattern(time) 
                }} />
              </svg>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="w-full h-full relative" />
      )}

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
        <button 
          onClick={handleExport} 
          className="bg-white/80 backdrop-blur-sm p-2 rounded-full hover:bg-white/90 shadow-lg"
        >
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default function FabricFlowPage() {
  return (
    <main>
      <div className="container mx-auto px-4 py-2 space-y-2">
        <ToysNav />
      </div>
      <FabricFlow />
      <Footer />
    </main>
  );
}