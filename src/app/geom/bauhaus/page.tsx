"use client";
import ToysNav from '@/components/toys/nav';
import { Footer } from '@/components/ui/footer';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Pause, Play, ArrowLeft, Download } from 'lucide-react';
import { useImageExport } from '@/hooks/useImageExport';

const BauhausPattern = () => {
  const CANVAS_SIZE = 1600;
  const animationRef = useRef<number>(0);
  
  // Add hydration state
  const [isHydrated, setIsHydrated] = useState(false);

  const [state, setState] = useState({
    isAnimating: false,
    showControls: false,
    showHint: true,
    paramHistory: [],
    targetParams: null,
    transitionStartTime: null,
    lastChangeTime: 0
  });

  const [metaControls] = useState({
    holdTime: { value: 1, min: 0.25, max: 10, step: 0.25 },
    transitionTime: { value: 1, min: 0.2, max: 3, step: 0.1 }
  });

  const [params, setParams] = useState({
    grid: { value: 10, min: 6, max: 20, step: 1, animated: true },
    angle: { value: 0.5, min: 0, max: 1, step: 0.01, animated: true },
    scale: { value: 0.4, min: 0.2, max: 0.5, step: 0.01, animated: true },
    overlap: { value: 0.4, min: 0, max: 0.8, step: 0.01, animated: true },
    shapes: { value: 0.6, min: 0, max: 1, step: 0.01, animated: true },
    rhythm: { value: 0.5, min: 0, max: 1, step: 0.01, animated: true }
  });

  const { exportSvgAsImage } = useImageExport();

  const generateRandomParams = useCallback(() => {
    if (!isHydrated) return {};
    
    return Object.entries(params).reduce((acc, [key, param]) => ({
      ...acc,
      [key]: param.animated ? param.min + Math.random() * (param.max - param.min) : param.value
    }), {});
  }, [params, isHydrated]);

  const generateShape = useCallback((x, y, size, index, time) => {
    const shapeType = Math.sin(index * params.shapes.value * 10 + time);
    const rotation = params.angle.value * Math.PI * 2 + Math.sin(time + index) * params.rhythm.value;
    const scale = params.scale.value * (1 + Math.sin(time + index) * 0.2);
    
    const colors = ['#E72E2E', '#005BBB', '#FDB000', '#000000'];
    const color = colors[index % colors.length];
    
    // Use stepped shapeType based on fixed threshold
    if (Math.floor(shapeType * 2) === 1) {
      // Rectangle
      const width = size * scale;
      const height = size * scale * 0.618; // Golden ratio
      const cx = x - width/2;
      const cy = y - height/2;
      
      return `
        <rect 
          x="${cx}" y="${cy}"
          width="${width}" height="${height}"
          transform="rotate(${rotation * 180/Math.PI} ${x} ${y})"
          fill="${color}"
          opacity="0.85"
        />
      `;
    } else {
      // Circle
      return `
        <circle
          cx="${x}" cy="${y}"
          r="${size * scale * 0.5}"
          fill="${color}"
          opacity="0.85"
        />
      `;
    }
  }, [params]);

  const generatePattern = useCallback((time) => {
    const grid = Math.floor(params.grid.value);
    const cellSize = CANVAS_SIZE / grid;
    const elements = [];
    let index = 0;

    for (let y = 0; y <= grid; y++) {
      for (let x = 0; x <= grid; x++) {
        const baseX = x * cellSize;
        const baseY = y * cellSize;
        const offset = cellSize * params.overlap.value;
        
        // Generate overlapping shapes at grid intersections
        elements.push(generateShape(
          baseX,
          baseY,
          cellSize,
          index++,
          time
        ));

        if (x < grid && y < grid) {
          elements.push(generateShape(
            baseX + offset,
            baseY + offset,
            cellSize,
            index++,
            time
          ));
        }
      }
    }
    
    return elements.join('');
  }, [params, generateShape]);

  const animate = useCallback(() => {
    if (!isHydrated) return;
    
    const now = Date.now();
    const { targetParams, transitionStartTime, lastChangeTime } = state;
    const timeSinceLastChange = (now - lastChangeTime) / 1000;
    
    if (targetParams && transitionStartTime) {
      const progress = Math.min((now - transitionStartTime) / 1000 / metaControls.transitionTime.value, 1);
      const easeProgress = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      setParams(prev => {
        const newParams = { ...prev };
        Object.entries(targetParams).forEach(([key, targetValue]) => {
          newParams[key] = { ...prev[key], value: Number(prev[key].value) + (Number(targetValue) - Number(prev[key].value)) * easeProgress };
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
    } else if (timeSinceLastChange >= metaControls.holdTime.value) {
      setState(s => ({
        ...s,
        targetParams: generateRandomParams(),
        transitionStartTime: now
      }));
    }
    
    if (state.isAnimating) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [state, metaControls, params, generateRandomParams, isHydrated]);

  useEffect(() => {
    if (state.isAnimating) {
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animationRef.current);
  }, [state.isAnimating, animate]);

  // Add hydration effect
  useEffect(() => {
    setIsHydrated(true);
    setState(s => ({ 
      ...s, 
      isAnimating: true,
      lastChangeTime: Date.now()
    }));
  }, []);

  const goBack = useCallback(() => {
    if (state.paramHistory.length === 0) return;
    const prevParams = state.paramHistory[state.paramHistory.length - 1];
    setParams(prev => {
      const newParams = { ...prev };
      Object.entries(prev).forEach(([key, param]) => {
        newParams[key] = { ...param, value: prevParams[key].value };
      });
      return newParams;
    });
    setState(s => ({ ...s, paramHistory: s.paramHistory.slice(0, -1) }));
  }, [state.paramHistory]);

  // Add this effect near other useEffects
  useEffect(() => {
    if (state.showHint) {
      const fadeTimeout = setTimeout(() => {
        setState(s => ({ ...s, showHint: false }));
      }, 15000); // 15 seconds before starting fade
      return () => clearTimeout(fadeTimeout);
    }
  }, [state.showHint]);

  const handleExport = useCallback(() => {
    const svg = document.querySelector('#bauhaus-pattern-svg');
    if (!svg) return;
    
    exportSvgAsImage(svg as SVGElement, {
      filename: 'bauhaus-pattern.png',
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      backgroundColor: '#FAF7F0'
    });
  }, [exportSvgAsImage]);

  return (
    <div className="min-h-screen bg-gray-50" onClick={(e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (!target.closest('button') && !target.closest('input')) {
        setState(s => ({ 
          ...s, 
          showControls: !s.showControls,
          showHint: false // Hide hint on click
        }));
      }
    }}>
      {state.showHint && (
        <div className="fixed inset-0 flex items-top justify-center h-10 z-30 pointer-events-none">
          <div className="bg-white/20 text-gray-500 px-6 py-3 rounded-lg text-sm transition-opacity duration-[2s] hover:opacity-0">
            Click anywhere to see generator settings
          </div>
        </div>
      )}

      <div className="w-full relative h-screen">
        <Card className="w-full h-full">
          <CardContent className="p-0 h-full">
            <div className="w-full h-full">
              <svg
                id="bauhaus-pattern-svg"
                viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
                className="w-full h-full"
                preserveAspectRatio="xMidYMid slice"
                style={{ background: '#FAF7F0' }}
              >
                <g dangerouslySetInnerHTML={{ 
                  __html: isHydrated ? generatePattern(Date.now() * 0.001) : generatePattern(0)
                }} />
              </svg>
            </div>
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

export default function BauhausPage() {
  return (
    <main>
      <div className="container mx-auto px-4 py-2 space-y-2">
        <ToysNav />
      </div>
      <BauhausPattern />
      <Footer />
    </main>
  );
}