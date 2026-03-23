"use client"
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Pause, Play, Settings2 } from 'lucide-react';

const TestItem = () => {
  const CANVAS_SIZE = 800;
  const MAX_ITERATIONS = 5;

  const [metaControls, setMetaControls] = useState({
    speed: { value: 0.4, min: 0.1, max: 2, step: 0.1, label: 'Animation Speed' },
    inertia: { value: 0.98, min: 0.9, max: 0.999, step: 0.001, label: 'Inertia' },
    magnitude: { value: 0.1, min: 0.02, max: 2, step: 0.01, label: 'Change Magnitude' }
  });

  const [params, setParams] = useState({
    iterations: { value: 3, min: 1, max: MAX_ITERATIONS, step: 1, animated: false, velocity: 0 },
    angleOffset: { value: 0.5, min: 0, max: 1, step: 0.01, animated: true, velocity: 0 },
    segmentLength: { value: 0.6, min: 0.2, max: 1, step: 0.01, animated: true, velocity: 0 },
    branchingRatio: { value: 0.7, min: 0.3, max: 0.9, step: 0.01, animated: true, velocity: 0 },
    rotationPhase: { value: 0.3, min: 0, max: 1, step: 0.01, animated: true, velocity: 0 },
    complexity: { value: 0.5, min: 0, max: 1, step: 0.01, animated: true, velocity: 0 },
    tileScale: { value: 0.8, min: 0.5, max: 1, step: 0.01, animated: true, velocity: 0 }
  });

  const [isAnimating, setIsAnimating] = useState(true);
  const [showMetaControls, setShowMetaControls] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showHint, setShowHint] = useState(true);
  const [windowSize, setWindowSize] = useState({ width: 1200, height: 800 });
  const animationRef = useRef();
  const lastUpdateRef = useRef(Date.now());

  useEffect(() => {
    const updateSize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHint(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const generateLSystemString = useCallback((iterations, time) => {
    const rules = {
      'F': `F[+F][-F]${params.complexity.value > 0.5 ? '[+F-F]' : ''}`,
      '+': '+',
      '-': '-',
      '[': '[',
      ']': ']'
    };

    let result = 'F';
    for (let i = 0; i < iterations; i++) {
      result = result.split('').map(char => rules[char] || char).join('');
    }
    return result;
  }, [params.complexity]);

  const interpretLSystem = useCallback((lSystemString, time) => {
    const baseAngle = Math.PI * 2 * params.angleOffset.value;
    const rotationOffset = Math.PI * 2 * params.rotationPhase.value * Math.sin(time * 0.5);
    const stack = [];
    const points = [];
    let x = CANVAS_SIZE / 2;
    let y = CANVAS_SIZE / 2;
    let angle = rotationOffset;
    let currentLength = CANVAS_SIZE * 0.4 * params.segmentLength.value * 
                       Math.pow(params.branchingRatio.value, Math.floor(params.iterations.value));

    for (const char of lSystemString) {
      switch (char) {
        case 'F':
          const newX = x + Math.cos(angle) * currentLength * params.tileScale.value;
          const newY = y + Math.sin(angle) * currentLength * params.tileScale.value;
          points.push([x, y, newX, newY]);
          x = newX;
          y = newY;
          break;
        case '+':
          angle += baseAngle;
          break;
        case '-':
          angle -= baseAngle;
          break;
        case '[':
          stack.push([x, y, angle, currentLength]);
          currentLength *= params.branchingRatio.value;
          break;
        case ']':
          [x, y, angle, currentLength] = stack.pop();
          break;
      }
    }
    return points;
  }, [params.angleOffset, params.segmentLength, params.branchingRatio, params.rotationPhase, params.iterations, params.tileScale]);

  const generatePath = useCallback((points, time) => {
    if (points.length === 0) return '';

    const paths = points.map(([x1, y1, x2, y2], index) => {
      const progress = (index / points.length + time) % 1;
      const opacity = 0.2 + 0.6 * Math.sin(progress * Math.PI);
      const width = 1 + 3 * Math.sin(progress * Math.PI);
      
      return `
        <path
          d="M ${x1} ${y1} L ${x2} ${y2}"
          stroke="black"
          stroke-width="${width}"
          stroke-linecap="round"
          opacity="${opacity}"
        />
      `;
    });

    return paths.join('');
  }, []);

  const generatePattern = useCallback((time) => {
    const lSystemString = generateLSystemString(Math.floor(params.iterations.value), time);
    const points = interpretLSystem(lSystemString, time);
    return generatePath(points, time);
  }, [params.iterations, generateLSystemString, interpretLSystem, generatePath]);

  const animate = useCallback(() => {
    const now = Date.now();
    const frameTime = 16 / metaControls.speed.value;
    
    if (now - lastUpdateRef.current > frameTime) {
      lastUpdateRef.current = now;
      
      setParams(prev => {
        const newParams = { ...prev };
        Object.entries(prev).forEach(([key, param]) => {
          if (param.animated) {
            const baseForce = (Math.random() - 0.5) * param.step * 2;
            const scaledForce = baseForce * (metaControls.magnitude.value * metaControls.magnitude.value) * metaControls.speed.value;
            
            let newVelocity = (param.velocity * metaControls.inertia.value) + scaledForce;
            let newValue = param.value + newVelocity;
            
            if (newValue < param.min) {
              newValue = param.min;
              newVelocity = Math.abs(newVelocity) * 0.5;
            }
            if (newValue > param.max) {
              newValue = param.max;
              newVelocity = -Math.abs(newVelocity) * 0.5;
            }
            
            newParams[key] = { ...param, value: newValue, velocity: newVelocity };
          }
        });
        return newParams;
      });
    }
    
    if (isAnimating) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [isAnimating, metaControls]);

  useEffect(() => {
    if (isAnimating) {
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating, animate]);

  const handleCanvasClick = useCallback((e) => {
    if (e.target.closest('button') || e.target.closest('input')) return;
    setShowControls(prev => !prev);
  }, []);

  return (
    <div className="min-h-screen" onClick={handleCanvasClick}>
      <div 
        className="w-full relative"
        style={{ height: windowSize.height }}
      >
        <Card className="w-full h-full">
          <CardContent className="p-0 h-full">
            <div className="bg-black w-full h-full relative">
              <svg
                viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
                className="w-full h-full"
                preserveAspectRatio="xMidYMid slice"
                style={{ background: 'radial-gradient(circle, #fff 0%, #f0f0f0 100%)' }}
              >
                <g dangerouslySetInnerHTML={{ 
                  __html: generatePattern(Date.now() * 0.001) 
                }} />
              </svg>
            </div>
          </CardContent>
        </Card>
      </div>

      <div 
        className={`fixed top-0 left-0 w-full h-full pointer-events-none transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="absolute top-4 right-4 flex gap-2 pointer-events-auto">
          <button
            onClick={() => setShowMetaControls(prev => !prev)}
            className="bg-white/80 backdrop-blur-sm p-2 rounded-full hover:bg-white/90 transition-colors shadow-lg"
          >
            <Settings2 className="w-6 h-6" />
          </button>
          <button
            onClick={() => setIsAnimating(prev => !prev)}
            className="bg-white/80 backdrop-blur-sm p-2 rounded-full hover:bg-white/90 transition-colors shadow-lg"
          >
            {isAnimating ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </button>
        </div>

        <div 
          className={`absolute bottom-20 left-1/2 transform -translate-x-1/2 transition-opacity duration-500 ${
            showHint ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="bg-black/50 text-white px-4 py-2 rounded-full backdrop-blur-sm text-sm">
            Tap the settings icon to adjust pattern parameters
          </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full pointer-events-auto">
          <div className="max-w-6xl mx-auto p-4 space-y-4">
            {showMetaControls && (
              <Card className="w-full bg-white/90 backdrop-blur-sm shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-sm font-medium mb-4">Animation Controls</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Object.entries(metaControls).map(([name, control]) => (
                      <div key={name} className="space-y-2">
                        <div className="flex justify-between">
                          <label className="text-sm font-medium">
                            {control.label}
                          </label>
                          <span className="text-sm text-gray-500">
                            {name === 'magnitude' 
                              ? control.value === 0.02 ? 'Very Fine' 
                                : control.value < 0.2 ? 'Fine'
                                : control.value < 1 ? 'Medium'
                                : control.value < 1.5 ? 'Large'
                                : 'Very Large'
                              : control.value.toFixed(3)}
                          </span>
                        </div>
                        <input
                          type="range"
                          value={control.value}
                          onChange={(e) => setMetaControls(prev => ({
                            ...prev,
                            [name]: { ...control, value: Number(e.target.value) }
                          }))}
                          min={control.min}
                          max={control.max}
                          step={control.step}
                          className="w-full"
                        />
                        {name === 'magnitude' && (
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Fine</span>
                            <span>Coarse</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

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
                              [name]: { ...param, animated: !param.animated, velocity: 0 }
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
                        onChange={(e) => setParams(prev => ({
                          ...prev,
                          [name]: { ...param, value: Number(e.target.value), velocity: 0 }
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
    </div>
  );
};

export default TestItem;