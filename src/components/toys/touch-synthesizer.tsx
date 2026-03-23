"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertBadge } from '../ui/alert-badge';

const WAVEFORMS = ['sine', 'square', 'sawtooth', 'triangle'];
const COLORS = {
  'sine': '#3B82F6',     // blue-500
  'sawtooth': '#EF4444', // red-500
  'square': '#8B5CF6',   // purple-500
  'triangle': '#10B981'  // emerald-500
};
const BG_COLORS = {
  'sine': 'bg-blue-500',
  'sawtooth': 'bg-red-500',
  'square': 'bg-purple-500',
  'triangle': 'bg-emerald-500'
};

const MODES = ['Waveform', 'Spectrum', 'Lissajous', 'Circular'];

const TouchSynthesizer = () => {
  const [audioContext, setAudioContext] = useState(null);
  const [activePoints, setActivePoints] = useState(new Map());
  const [visualizationMode, setVisualizationMode] = useState('Waveform');
  const [autoCycle, setAutoCycle] = useState(true);
  
  const touchPadRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const nodesRef = useRef(new Map());
  const waveformCountRef = useRef(0);
  const lastMovementRef = useRef(new Map());

  // Add new mouse-specific state
  const [isMouseDown, setIsMouseDown] = useState(false);
  const MOUSE_ID = 'mouse'; // Special ID for mouse interactions

  // Add double-click prevention
  const clickTimeoutRef = useRef(null);
  const DOUBLE_CLICK_DELAY = 300; // milliseconds

  useEffect(() => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    setAudioContext(ctx);

    // Set up stuck note detection
    const checkStuckNotes = () => {
      const now = Date.now();
      const stuckTouchIds = [];

      // Check for any nodes that exist but aren't in activePoints
      nodesRef.current.forEach((node, touchId) => {
        if (!lastMovementRef.current.has(touchId) || 
            now - lastMovementRef.current.get(touchId).timestamp > 2000) {
          stuckTouchIds.push(touchId);
        }
      });

      // Remove any stuck notes
      if (stuckTouchIds.length > 0) {
        stuckTouchIds.forEach(id => {
          removeSound(id);
          lastMovementRef.current.delete(id);
          setActivePoints(points => {
            const newPoints = new Map(points);
            newPoints.delete(id);
            return newPoints;
          });
        });
      }
    };

    // Check for stuck notes more frequently
    const stuckNoteInterval = setInterval(checkStuckNotes, 500);

    return () => {
      // Clean up all active sounds when component unmounts
      nodesRef.current.forEach((_, id) => removeSound(id));
      ctx.close();
      clearInterval(stuckNoteInterval);
    };
  }, []);

  // Handle canvas animation
  useEffect(() => {
    if (!canvasRef.current || !audioContext) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (visualizationMode === 'Waveform') {
        drawWaveforms(ctx, canvas);
      } else if (visualizationMode === 'Spectrum') {
        drawSpectrum(ctx, canvas);
      } else if (visualizationMode === 'Lissajous') {
        drawLissajous(ctx, canvas);
      } else if (visualizationMode === 'Circular') {
        drawCircular(ctx, canvas);
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [visualizationMode, audioContext]);

  const drawWaveforms = (ctx, canvas) => {
    const activeNodes = Array.from(nodesRef.current.entries());
    if (activeNodes.length === 0) return;

    activeNodes.forEach(([id, nodes]) => {
      const dataArray = new Float32Array(nodes.analyzer.frequencyBinCount);
      nodes.analyzer.getFloatTimeDomainData(dataArray);
      
      ctx.beginPath();
      ctx.strokeStyle = COLORS[nodes.waveform];
      ctx.lineWidth = 2;
      
      const sliceWidth = canvas.width / dataArray.length;
      let x = 0;

      for (let i = 0; i < dataArray.length; i++) {
        const y = (dataArray[i] * canvas.height / 2) + canvas.height / 2;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }

      ctx.stroke();
    });
  };

  const drawSpectrum = (ctx, canvas) => {
    const activeNodes = Array.from(nodesRef.current.entries());
    if (activeNodes.length === 0) return;

    activeNodes.forEach(([id, nodes]) => {
      const dataArray = new Uint8Array(nodes.analyzer.frequencyBinCount);
      nodes.analyzer.getByteFrequencyData(dataArray);
      
      const barWidth = canvas.width / dataArray.length;
      let x = 0;
      
      ctx.fillStyle = COLORS[nodes.waveform];
      ctx.globalAlpha = 0.3;

      for (let i = 0; i < dataArray.length; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth;
      }
    });
    
    ctx.globalAlpha = 1;
  };

  const drawLissajous = (ctx, canvas) => {
    const activeNodes = Array.from(nodesRef.current.entries());
    if (activeNodes.length === 0) return;

    activeNodes.forEach(([id, nodes]) => {
      const dataArray = new Float32Array(nodes.analyzer.frequencyBinCount);
      nodes.analyzer.getFloatTimeDomainData(dataArray);
      
      ctx.beginPath();
      ctx.strokeStyle = COLORS[nodes.waveform];
      ctx.lineWidth = 2;
      
      for (let i = 0; i < dataArray.length; i++) {
        const x = (dataArray[i] * canvas.width / 4) + canvas.width / 2;
        const y = (dataArray[(i + 10) % dataArray.length] * canvas.height / 4) + canvas.height / 2;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
    });
  };

  const drawCircular = (ctx, canvas) => {
    const activeNodes = Array.from(nodesRef.current.entries());
    if (activeNodes.length === 0) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 3;

    activeNodes.forEach(([id, nodes]) => {
      const dataArray = new Float32Array(nodes.analyzer.frequencyBinCount);
      nodes.analyzer.getFloatTimeDomainData(dataArray);
      
      ctx.beginPath();
      ctx.strokeStyle = COLORS[nodes.waveform];
      ctx.lineWidth = 2;
      
      for (let i = 0; i < dataArray.length; i++) {
        const angle = (i / dataArray.length) * Math.PI * 2;
        const amplitude = dataArray[i] * radius / 2;
        const r = radius + amplitude;
        
        const x = centerX + r * Math.cos(angle);
        const y = centerY + r * Math.sin(angle);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.closePath();
      ctx.stroke();
    });
  };

  const getNextWaveform = () => {
    const waveform = WAVEFORMS[waveformCountRef.current % WAVEFORMS.length];
    waveformCountRef.current += 1;
    return waveform;
  };

  const createSound = (id, x, y) => {
    if (!audioContext) return;
    
    const osc = audioContext.createOscillator();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    const analyzer = audioContext.createAnalyser();
    
    analyzer.fftSize = 2048;
    
    const waveform = getNextWaveform();
    osc.type = waveform;
    filter.type = 'lowpass';
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(analyzer);
    analyzer.connect(audioContext.destination);
    
    gain.gain.setValueAtTime(0, audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.1);
    
    const position = updateSoundParameters(x, y, { osc, filter }, id);
    
    osc.start();
    nodesRef.current.set(id, { osc, filter, gain, analyzer, waveform });
    return { ...position, waveform };
  };

  const updateSoundParameters = (x, y, nodes, touchId) => {
    const rect = touchPadRef.current.getBoundingClientRect();
    const normalizedX = (x - rect.left) / rect.width;
    const normalizedY = 1 - ((y - rect.top) / rect.height);
    
    const frequency = 100 * Math.pow(20, normalizedX);
    const filterFreq = 200 * Math.pow(40, normalizedY);
    
    nodes.osc.frequency.setValueAtTime(frequency, audioContext.currentTime);
    nodes.filter.frequency.setValueAtTime(filterFreq, audioContext.currentTime);
    
    // Update last movement timestamp and position
    lastMovementRef.current.set(touchId, {
      timestamp: Date.now(),
      x: normalizedX,
      y: normalizedY
    });
    
    return { x: normalizedX, y: normalizedY };
  };

  const removeSound = (id) => {
    if (!audioContext || !nodesRef.current.has(id)) return;
    
    const nodes = nodesRef.current.get(id);
    const currentTime = audioContext.currentTime;
    
    try {
      nodes.gain.gain.cancelScheduledValues(currentTime);
      nodes.gain.gain.setValueAtTime(nodes.gain.gain.value, currentTime);
      nodes.gain.gain.linearRampToValueAtTime(0, currentTime + 0.1);
      
      setTimeout(() => {
        try {
          nodes.osc.stop();
          nodes.osc.disconnect();
          nodes.filter.disconnect();
          nodes.gain.disconnect();
          nodes.analyzer.disconnect();
        } catch (e) {
          console.warn('Error cleaning up audio nodes:', e);
        }
        nodesRef.current.delete(id);
      }, 200);
    } catch (e) {
      console.warn('Error ramping down gain:', e);
      // Clean up nodes even if ramping fails
      try {
        nodes.osc.stop();
        nodes.osc.disconnect();
        nodes.filter.disconnect();
        nodes.gain.disconnect();
        nodes.analyzer.disconnect();
      } catch (innerError) {
        console.warn('Error in cleanup after gain error:', innerError);
      }
      nodesRef.current.delete(id);
    }
  };

  // Update existing handlers and add mouse handlers
  const handleStart = (x, y, id) => {
    const newPoints = new Map(activePoints);
    
    if (!activePoints.has(id)) {
      const pointData = createSound(id, x, y);
      newPoints.set(id, pointData);
    }
    
    setActivePoints(newPoints);
  };

  const handleMove = (x, y, id) => {
    const newPoints = new Map(activePoints);
    
    if (nodesRef.current.has(id)) {
      const nodes = nodesRef.current.get(id);
      const position = updateSoundParameters(x, y, nodes, id);
      newPoints.set(id, { ...position, waveform: nodes.waveform });
    }
    
    setActivePoints(newPoints);
  };

  const handleEnd = (id) => {
    const newPoints = new Map(activePoints);
    
    removeSound(id);
    newPoints.delete(id);
    
    setActivePoints(newPoints);

    if (newPoints.size === 0 && autoCycle) {
      setTimeout(() => {
        const currentIndex = MODES.indexOf(visualizationMode);
        const nextIndex = (currentIndex + 1) % MODES.length;
        setVisualizationMode(MODES[nextIndex]);
      }, 300);
    }
  };

  // Touch event handlers now use the common handlers
  const handleTouchStart = (e) => {
    e.preventDefault();
    
    // Clear any existing timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      return;
    }

    Array.from(e.touches).forEach(touch => {
      handleStart(touch.clientX, touch.clientY, touch.identifier);
    });

    // Set timeout to detect double taps
    clickTimeoutRef.current = setTimeout(() => {
      clickTimeoutRef.current = null;
    }, DOUBLE_CLICK_DELAY);
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    Array.from(e.touches).forEach(touch => {
      handleMove(touch.clientX, touch.clientY, touch.identifier);
    });
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    Array.from(e.changedTouches).forEach(touch => {
      handleEnd(touch.identifier);
    });
  };

  // Mouse event handlers
  const handleMouseDown = (e) => {
    e.preventDefault(); // Prevent double-click text selection
    
    // Clear any existing timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      return;
    }

    setIsMouseDown(true);
    handleStart(e.clientX, e.clientY, MOUSE_ID);

    // Set timeout to detect double clicks
    clickTimeoutRef.current = setTimeout(() => {
      clickTimeoutRef.current = null;
    }, DOUBLE_CLICK_DELAY);
  };

  const handleMouseMove = (e) => {
    if (isMouseDown) {
      handleMove(e.clientX, e.clientY, MOUSE_ID);
    }
  };

  const handleMouseUp = () => {
    if (isMouseDown) {
      setIsMouseDown(false);
      handleEnd(MOUSE_ID);
    }
  };

  // Add mouse event cleanup effect
  useEffect(() => {
    // Handle mouse up outside the component
    const handleGlobalMouseUp = () => {
      if (isMouseDown) {
        setIsMouseDown(false);
        handleEnd(MOUSE_ID);
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isMouseDown]);

  // Clean up the timeout in useEffect
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Multi-Digital Theremin</CardTitle>
        <div className="text-sm text-gray-500 mt-1">Try playing with multiple fingers. A demonstration of the Web Audio API. <AlertBadge message="If the audio hangs, just refresh!" /></div>
      </CardHeader>
      <CardContent className="space-y-4">
        
        
        <div 
          ref={touchPadRef}
          className="w-full h-96 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg relative touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {Array.from(activePoints).map(([id, pos]) => (
            <div 
              key={id}
              className={`absolute w-8 h-8 ${BG_COLORS[pos.waveform]} rounded-full opacity-50 transform -translate-x-1/2 -translate-y-1/2`}
              style={{ 
                left: `${pos.x * 100}%`, 
                top: `${(1 - pos.y) * 100}%` 
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                {pos.waveform[0].toUpperCase()}
              </div>
            </div>
          ))}
          
          <div className="absolute bottom-2 left-2 text-sm text-gray-600">
            ← Frequency →
          </div>
          <div className="absolute left-2 top-1/2 -rotate-90 text-sm text-gray-600">
            ← Filter Cutoff →
          </div>
        </div>

        <div className="relative">
          <canvas 
            ref={canvasRef}
            width={800}
            height={200}
            className="w-full h-48 bg-gray-50 rounded-lg"
          />
          <div className="absolute top-2 left-2 text-xs text-gray-500">
            {visualizationMode} Visualization
          </div>
        </div>
        
        <div className="flex flex-col gap-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Label htmlFor="auto-cycle" className="text-sm text-gray-600">Auto-cycle visualizations</Label>
              <Switch
                id="auto-cycle"
                checked={autoCycle}
                onCheckedChange={setAutoCycle}
              />
            </div>
            <div className="flex gap-1">
              {MODES.map((mode) => (
                <Button
                  key={mode}
                  onClick={() => setVisualizationMode(mode)}
                  variant={visualizationMode === mode ? "default" : "outline"}
                  size="sm"
                  className="whitespace-nowrap text-xs px-2 py-1 h-auto"
                >
                  {mode}
                </Button>
              ))}
            </div>
          </div>
        
          <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-4 sm:justify-center">
            {WAVEFORMS.map((waveform) => (
              <div key={waveform} className="flex items-center gap-2">
                <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full ${BG_COLORS[waveform]}`} />
                <span className="text-xs sm:text-sm text-gray-600 capitalize">{waveform}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TouchSynthesizer;