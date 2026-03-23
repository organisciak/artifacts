"use client";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Fish } from '@/game/entities/Fish';
// import { ScoreBoard } from './fish/ScoreBoard';
import { GameHUD } from './fish/GameHUD';
import { GameManager } from '@/game/GameManager';

const FishGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const audioContextRef = useRef<AudioContext>();
  const fishRef = useRef<Fish[]>([]);
  const gameManagerRef = useRef<GameManager>();
  
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [motionPermission, setMotionPermission] = useState(false);
  const [debugMotion, setDebugMotion] = useState({ x: 0, y: 0 });
  const [useAccelerometer, setUseAccelerometer] = useState(false);
  const [accelerometerAvailable, setAccelerometerAvailable] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [showDebug, setShowDebug] = useState(false);

  const colors = [
    '#E63946', // Vermillion red
    '#457B9D', // Steel blue
    '#1D3557', // Prussian blue
    '#2A9D8F', // Persian green
    '#F4A261', // Sandy brown
  ];

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
                  
    if (isIOS && typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      setShowPermissionDialog(true);
    } else {
      // For non-iOS devices, assume permission is granted
      setMotionPermission(true);
    }
  }, []);

  // Check if accelerometer is available on mount
  useEffect(() => {
    const checkAccelerometer = () => {
      if (typeof DeviceMotionEvent !== 'undefined' && 
          typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        setAccelerometerAvailable(true);
      } else if (window.DeviceMotionEvent) {
        // Test if we actually get motion data (some devices report having the API but don't work)
        const testHandler = (e: DeviceMotionEvent) => {
          if (e.accelerationIncludingGravity?.x !== null) {
            setAccelerometerAvailable(true);
          }
          window.removeEventListener('devicemotion', testHandler);
        };
        window.addEventListener('devicemotion', testHandler, { once: true });
      }
    };
    
    checkAccelerometer();
  }, []);

  const requestMotionPermission = async () => {
    try {
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        const granted = permission === 'granted';
        setUseAccelerometer(granted);
        setMotionPermission(granted);
      } else {
        setUseAccelerometer(true);
        setMotionPermission(true);
      }
      setShowPermissionDialog(false);
    } catch (error) {
      console.error('Error requesting motion permission:', error);
      setUseAccelerometer(false);
      setMotionPermission(false);
      setShowPermissionDialog(false);
    }
  };

  const initializeGame = useCallback(() => {
    if (!canvasRef.current) return;
    
    // Create new GameManager instance
    gameManagerRef.current = new GameManager(canvasRef.current);
    // Ensure the game starts paused if not in fullscreen
    if (!document.fullscreenElement) {
      gameManagerRef.current.pause();
      setIsPaused(true);
    }
  }, []);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const playCollisionSound = useCallback((velocity) => {
    if (!soundEnabled || !audioContextRef.current) return;

    const oscillator = audioContextRef.current.createOscillator();
    const gain = audioContextRef.current.createGain();
    const filter = audioContextRef.current.createBiquadFilter();

    const baseFreq = 220;
    const maxFreq = 880;
    const freqScale = Math.min(velocity / 10, 1);
    const frequency = baseFreq + (maxFreq - baseFreq) * freqScale;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
    filter.Q.setValueAtTime(1, audioContextRef.current.currentTime);

    const volume = Math.min(Math.abs(velocity) / 20, 1) * 0.3;
    gain.gain.setValueAtTime(volume, audioContextRef.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContextRef.current.currentTime + 0.1
    );

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(audioContextRef.current.destination);

    oscillator.start();
    oscillator.stop(audioContextRef.current.currentTime + 0.1);
  }, [soundEnabled]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      // Use GameManager for updates and drawing
      if (gameManagerRef.current) {
        gameManagerRef.current.update();
        gameManagerRef.current.draw(ctx);

        // TODO: Move collision sound handling into GameManager
        // For now, we'll skip the collision checks here since GameManager will handle them
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [playCollisionSound]);

  // Update motion handling useEffect
  useEffect(() => {
    if (!gameManagerRef.current) return;
    
    if (!motionPermission || !useAccelerometer) {
      // Reset gravity when not using accelerometer
      const playerFish = gameManagerRef.current.getPlayerFish();
      if (playerFish) {
        playerFish.gravityX = 0;
        playerFish.gravityY = 0;
      }
      return;
    }

    const handleMotion = (event: DeviceMotionEvent) => {
      const accelerationScale = 0.1;
      const x = event.accelerationIncludingGravity?.x ?? 0;
      const y = event.accelerationIncludingGravity?.y ?? 0;

      setDebugMotion({ x, y });

      const playerFish = gameManagerRef.current?.getPlayerFish();
      if (playerFish) {
        playerFish.gravityX = -x * accelerationScale;
        playerFish.gravityY = y * accelerationScale;
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [motionPermission, useAccelerometer]);

  // Update pointer handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (useAccelerometer) return;
      
      const point = getCanvasPoint(e);
      if (!point) return;

      const playerFish = gameManagerRef.current?.getPlayerFish();
      if (playerFish) {
        playerFish.updatePointerTarget(point.x, point.y);
      }
    };

    const handlePointerUp = () => {
      const playerFish = gameManagerRef.current?.getPlayerFish();
      if (playerFish) {
        playerFish.updatePointerTarget(null, null);
      }
    };

    // Add both mouse and touch event listeners
    canvas.addEventListener('mousemove', handlePointerMove);
    canvas.addEventListener('mouseup', handlePointerUp);
    canvas.addEventListener('touchmove', handlePointerMove);
    canvas.addEventListener('touchend', handlePointerUp);

    return () => {
      // Clean up event listeners
      canvas.removeEventListener('mousemove', handlePointerMove);
      canvas.removeEventListener('mouseup', handlePointerUp);
      canvas.removeEventListener('touchmove', handlePointerMove);
      canvas.removeEventListener('touchend', handlePointerUp);
    };
  }, [useAccelerometer]);

  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Set the canvas internal dimensions with DPR scaling
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // Set CSS size to maintain visual dimensions
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    
    // Scale the context to match DPR
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    updateCanvasSize();

    const resizeObserver = new ResizeObserver(updateCanvasSize);
    resizeObserver.observe(canvas.parentElement);

    return () => resizeObserver.disconnect();
  }, [updateCanvasSize]);

  const getCanvasPoint = (e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    
    return {
      x: ((clientX - rect.left) / rect.width) * (canvas.width / dpr),
      y: ((clientY - rect.top) / rect.height) * (canvas.height / dpr)
    };
  };

  // Remove the standalone full screen toggle from the UI.
  // The controlToggle remains for motion control.
  const controlToggle = (
    <button
      onClick={() => {
        if (!useAccelerometer && !motionPermission) {
          requestMotionPermission();
        } else {
          setUseAccelerometer(!useAccelerometer);
        }
      }}
      disabled={!accelerometerAvailable}
      className={`px-4 py-2 rounded-lg ${
        !accelerometerAvailable 
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-blue-500 hover:bg-blue-600 text-white'
      }`}
    >
      {accelerometerAvailable 
        ? `Use ${useAccelerometer ? 'Touch Controls' : 'Motion Controls'}`
        : 'Motion Controls Unavailable'
      }
    </button>
  );

  // Listen for full-screen changes. If the game leaves full screen, then pause the game.
  useEffect(() => {
    const handleFullScreenChange = () => {
      if (!document.fullscreenElement) {
        if (gameManagerRef.current) {
          gameManagerRef.current.pause();
        }
        setIsPaused(true);
      }
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  return (
    <div className="w-full h-full">
      <div className="relative bg-gray-100 h-[80vh]">
        <canvas
          ref={canvasRef}
          className="w-full h-full bg-slate-50"
          style={{
            touchAction: 'none',
            cursor: useAccelerometer ? 'default' : `url('/cursors/worm.svg') 12 12, auto`
          }}
        />
        {/* Debug overlay */}
        {showDebug && (
          <div className="absolute top-0 left-0 bg-black/50 text-white p-2 text-sm">
            Motion: {debugMotion.x.toFixed(2)}, {debugMotion.y.toFixed(2)}
            <br />
            Permission: {motionPermission ? 'Granted' : 'Not Granted'}
          </div>
        )}
        {/* Paused overlay */}
        {isPaused && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Button 
              className="text-2xl px-8 py-6 bg-blue-500 hover:bg-blue-600 transition-colors"
              onClick={() => {
                if (!document.fullscreenElement) {
                  const container = canvasRef.current?.parentElement;
                  if (container) {
                    container.requestFullscreen().then(() => {
                      if (gameManagerRef.current) {
                        gameManagerRef.current.resume();
                        setIsPaused(false);
                      }
                    }).catch(err => console.error("Error entering fullscreen", err));
                  }
                } else {
                  if (gameManagerRef.current) {
                    gameManagerRef.current.resume();
                    setIsPaused(true);
                  }
                }
              }}
            >
              Play Game
            </Button>
          </div>
        )}
        {/* Scoreboard not yet implemented <ScoreBoard score={0} level={1} /> */}
      </div>

      <div className="space-y-4 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              id="sound-toggle"
              checked={soundEnabled}
              onCheckedChange={setSoundEnabled}
            />
            <Label htmlFor="sound-toggle">Sound Effects</Label>
          </div>
          <div className="flex items-center gap-2">
            {controlToggle}
          </div>
        </div>

        <div className="flex gap-4">
          <Button onClick={initializeGame}>
            Reset Game
          </Button>
          <Button
            onClick={() => {
              // If not in full-screen mode, request fullscreen first.
              if (!document.fullscreenElement) {
                const container = canvasRef.current?.parentElement;
                if (container) {
                  container.requestFullscreen().then(() => {
                    if (gameManagerRef.current) {
                      gameManagerRef.current.resume();
                      setIsPaused(false);
                    }
                  }).catch(err => console.error("Error entering fullscreen", err));
                }
              } else {
                if (gameManagerRef.current) {
                  if (isPaused) {
                    gameManagerRef.current.resume();
                    setIsPaused(false);
                  } else {
                    gameManagerRef.current.pause();
                    setIsPaused(true);
                  }
                }
              }
            }}
          >
            {isPaused ? 'Play' : 'Pause Game'}
          </Button>
        </div>
      </div>

      <GameHUD />

      <AlertDialog open={showPermissionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enable Device Motion</AlertDialogTitle>
            <AlertDialogDescription>
              This game uses your device&apos;s accelerometer to control swimming.
              Please allow access to motion sensors for the best experience.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel onClick={() => setShowPermissionDialog(false)}>
              Continue Without Motion
            </AlertDialogCancel>
            <AlertDialogAction onClick={requestMotionPermission}>
              Enable Motion Sensors
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FishGame;