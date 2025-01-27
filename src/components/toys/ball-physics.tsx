"use client";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

class Ball {
  x: number;
  y: number;
  radius: number;
  color: string;
  velocityX: number;
  velocityY: number;
  gravityX: number;
  gravityY: number;
  friction: number;
  restitution: number;
  isHeld: boolean;
  lastCollisionTime: number;

  constructor(x: number, y: number, radius: number, color: string) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.velocityX = (Math.random() - 0.5) * 5;
    this.velocityY = 0;
    this.gravityX = 0;
    this.gravityY = 0;
    this.friction = 0.99;
    this.restitution = 0.7;
    this.isHeld = false;
    this.lastCollisionTime = 0;
  }

  update(canvas) {
    if (this.isHeld) return;

    // Apply gravity based on device orientation
    this.velocityX += this.gravityX;
    this.velocityY += this.gravityY;

    this.x += this.velocityX;
    this.y += this.velocityY;
    this.velocityX *= this.friction;
    this.velocityY *= this.friction;

    if (this.x + this.radius > canvas.width) {
      this.x = canvas.width - this.radius;
      this.velocityX *= -this.restitution;
    }
    if (this.x - this.radius < 0) {
      this.x = this.radius;
      this.velocityX *= -this.restitution;
    }
    if (this.y + this.radius > canvas.height) {
      this.y = canvas.height - this.radius;
      this.velocityY *= -this.restitution;
    }
    if (this.y - this.radius < 0) {
      this.y = this.radius;
      this.velocityY *= -this.restitution;
    }
  }

  draw(ctx, scaledX, scaledY, scaledRadius) {
    // Main circle
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Inner concentric circle
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.6, 0, Math.PI * 2);
    ctx.strokeStyle = `${this.color}80`; // Semi-transparent
    ctx.stroke();
    
    // Motion lines based on velocity
    const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
    if (speed > 0.5 && !this.isHeld) {
      const angle = Math.atan2(this.velocityY, this.velocityX);
      const lineLength = Math.min(speed * 3, this.radius);
      
      // Draw 3 motion lines
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        const offsetAngle = angle + (i * Math.PI / 8);
        const startX = this.x - Math.cos(offsetAngle) * (this.radius + lineLength);
        const startY = this.y - Math.sin(offsetAngle) * (this.radius + lineLength);
        const endX = this.x - Math.cos(offsetAngle) * this.radius;
        const endY = this.y - Math.sin(offsetAngle) * this.radius;
        
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = `${this.color}40`; // Very transparent
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    
    // Optional crosshair when held
    if (this.isHeld) {
      const crossSize = this.radius * 1.5;
      ctx.beginPath();
      ctx.moveTo(this.x - crossSize, this.y);
      ctx.lineTo(this.x + crossSize, this.y);
      ctx.moveTo(this.x, this.y - crossSize);
      ctx.lineTo(this.x, this.y + crossSize);
      ctx.strokeStyle = `${this.color}40`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  isPointInside(x, y) {
    const distance = Math.sqrt(
      Math.pow(x - this.x, 2) + Math.pow(y - this.y, 2)
    );
    return distance <= this.radius;
  }
}

const BallPhysics = () => {
  const canvasRef = useRef(null);
  const ballsRef = useRef([]);
  const requestRef = useRef(null);
  const activePointerRef = useRef(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [ballCount, setBallCount] = useState(15);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showPermissionDialog, setShowPermissionDialog] = useState(true);
  const [motionPermission, setMotionPermission] = useState(false);

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

  const requestMotionPermission = async () => {
    try {
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        setMotionPermission(permission === 'granted');
      } else {
        setMotionPermission(true);
      }
      setShowPermissionDialog(false);
    } catch (error) {
      console.error('Error requesting motion permission:', error);
      setMotionPermission(false);
      setShowPermissionDialog(false);
    }
  };

  useEffect(() => {
    if (!motionPermission) return;

    const handleMotion = (event) => {
      const accelerationScale = 0.1;
      const x = event.accelerationIncludingGravity.x * accelerationScale;
      const y = event.accelerationIncludingGravity.y * accelerationScale;

      ballsRef.current.forEach(ball => {
        ball.gravityX = x;
        ball.gravityY = -y;
      });
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [motionPermission]);

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

  const initializeBalls = useCallback(() => {
    const canvas = canvasRef.current;
    const newBalls = [];
    
    for (let i = 0; i < ballCount; i++) {
      const radius = 20 + Math.random() * 20;
      const x = radius + Math.random() * (canvas.width - radius * 2);
      const y = radius + Math.random() * (canvas.height - radius * 2);
      const color = colors[i % colors.length];
      newBalls.push(new Ball(x, y, radius, color));
    }
    
    ballsRef.current = newBalls;
  }, [ballCount, colors]);

  useEffect(() => {
    initializeBalls();
  }, [ballCount, initializeBalls]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ballsRef.current.forEach(ball => {
        ball.update(canvas);
        ball.draw(ctx);
      });

      for (let i = 0; i < ballsRef.current.length; i++) {
        for (let j = i + 1; j < ballsRef.current.length; j++) {
          const ball1 = ballsRef.current[i];
          const ball2 = ballsRef.current[j];
          const dx = (ball2 as Ball).x - (ball1 as Ball).x;
          const dy = (ball2 as Ball).y - (ball1 as Ball).y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < (ball1 as Ball).radius + (ball2 as Ball).radius) {
            const angle = Math.atan2(dy, dx);
            const sin = Math.sin(angle);
            const cos = Math.cos(angle);

            const vx1 = (ball1 as Ball).velocityX * cos + (ball1 as Ball).velocityY * sin;
            const vy1 = (ball1 as Ball).velocityY * cos - (ball1 as Ball).velocityX * sin;
            const vx2 = (ball2 as Ball).velocityX * cos + (ball2 as Ball).velocityY * sin;
            const vy2 = (ball2 as Ball).velocityY * cos - (ball2 as Ball).velocityX * sin;

            const relativeVelocity = Math.sqrt(
              Math.pow((ball1 as Ball).velocityX - (ball2 as Ball).velocityX, 2) +
              Math.pow(ball1.velocityY - ball2.velocityY, 2)
            );

            const now = performance.now();
            if (relativeVelocity > 1 && 
                now - ball1.lastCollisionTime > 50 && 
                now - ball2.lastCollisionTime > 50) {
              playCollisionSound(relativeVelocity);
              ball1.lastCollisionTime = now;
              ball2.lastCollisionTime = now;
            }

            ball1.velocityX = vx2 * cos - vy1 * sin;
            ball1.velocityY = vy1 * cos + vx2 * sin;
            ball2.velocityX = vx1 * cos - vy2 * sin;
            ball2.velocityY = vy2 * cos + vx1 * sin;

            const overlap = (ball1.radius + ball2.radius - distance) / 2;
            ball1.x -= overlap * cos;
            ball1.y -= overlap * sin;
            ball2.x += overlap * cos;
            ball2.y += overlap * sin;
          }
        }
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [playCollisionSound]);

  const getCanvasPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handlePointerDown = (e) => {
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }

    const point = getCanvasPoint(e);
    
    ballsRef.current.forEach(ball => {
      if (ball.isPointInside(point.x, point.y)) {
        ball.isHeld = true;
        activePointerRef.current = {
          id: e.pointerId,
          ball,
          offsetX: point.x - ball.x,
          offsetY: point.y - ball.y
        };
      }
    });
  };

  const handlePointerMove = (e) => {
    if (activePointerRef.current && activePointerRef.current.id === e.pointerId) {
      const point = getCanvasPoint(e);
      const ball = activePointerRef.current.ball;
      
      const newX = point.x - activePointerRef.current.offsetX;
      const newY = point.y - activePointerRef.current.offsetY;
      
      ball.velocityX = newX - ball.x;
      ball.velocityY = newY - ball.y;
      
      ball.x = newX;
      ball.y = newY;
    }
  };

  const handlePointerUp = (e) => {
    if (activePointerRef.current && activePointerRef.current.id === e.pointerId) {
      activePointerRef.current.ball.isHeld = false;
      activePointerRef.current = null;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Accelerometer-based Physics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <AlertDialog open={showPermissionDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Enable Device Motion</AlertDialogTitle>
              <AlertDialogDescription>
                This simulation uses your device's accelerometer to control gravity.
                Please allow access to motion sensors for the best experience.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={requestMotionPermission}>
                Enable Motion Sensors
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="relative bg-gray-100 rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            width={600}
            height={400}
            className="w-full h-96 bg-slate-50 touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="sound-toggle"
                checked={soundEnabled}
                onCheckedChange={setSoundEnabled}
              />
              <Label htmlFor="sound-toggle">Sound Effects</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Number of Balls</Label>
            <Slider 
              value={[ballCount]}
              onValueChange={([value]) => setBallCount(value)}
              min={1}
              max={50}
              step={1}
            />
          </div>

          <Button onClick={initializeBalls}>
            Reset Simulation
          </Button>
        </div>

        <div className="text-sm text-gray-500 space-y-2">
          <p>
            Tilt your device to control gravity! The balls will respond to your device's orientation.
          </p>
          <p>
            Click and drag to interact with the balls. Collisions produce sounds based on impact velocity.
          </p>
          {!motionPermission && (
            <p className="text-amber-500">
              Motion sensors are not enabled. The simulation will work better with accelerometer access.
              You can reload the page to enable motion sensors.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BallPhysics;