/**
 * PlayerFish class extending the base Fish class with player-specific behavior.
 * 
 * Additional Properties:
 * - invincibilityTimer
 * - score
 * - inputState
 * 
 * Additional Methods:
 * - handleInput(): Processes accelerometer/touch input
 * - grow(): Increases size when eating smaller fish
 * - shrink(): Reduces size when hit by larger fish
 * - checkBoundaries(): Keeps player within game bounds
 */

import { Fish } from './Fish';

export class PlayerFish extends Fish {
  gravityX: number;
  gravityY: number;
  maxSpeed: number;
  targetX: number | null = null;
  targetY: number | null = null;
  accelerationScale = 0.0002;
  invincibilityEndTime: number = 0;
  readonly INVINCIBILITY_DURATION = 2000; // 2 seconds of invincibility

  constructor(x: number, y: number, radius: number, color: string) {
    super(x, y, radius, color);
    this.gravityX = 0;
    this.gravityY = 0;
    this.maxSpeed = 15; // Cap maximum speed
    this.friction = 0.98; // Slightly different friction for player control
  }

  updatePointerTarget(x: number, y: number) {
    this.targetX = x;
    this.targetY = y;
  }

  update(canvas: HTMLCanvasElement) {
    if (this.targetX !== null && this.targetY !== null) {
      // Calculate direction and distance to target
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Calculate acceleration based on distance (with a maximum)
      const acceleration = Math.min(distance * this.accelerationScale, this.maxSpeed);
      
      // Apply acceleration in the direction of the target
      if (distance > 0) {
        this.velocityX += (dx / distance) * acceleration;
        this.velocityY += (dy / distance) * acceleration;
      }
    } else {
      // Use accelerometer controls
      this.velocityX += this.gravityX;
      this.velocityY += this.gravityY;
    }

    // Cap maximum speed
    const currentSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
    if (currentSpeed > this.maxSpeed) {
      const scale = this.maxSpeed / currentSpeed;
      this.velocityX *= scale;
      this.velocityY *= scale;
    }

    // Get canvas dimensions accounting for DPI
    const dpr = window.devicePixelRatio || 1;
    const visualWidth = canvas.width / dpr;
    const visualHeight = canvas.height / dpr;

    // Strict boundary checking for player fish
    // Instead of bouncing, we'll stop at the edges
    this.x = Math.max(this.radius, Math.min(visualWidth - this.radius, this.x + this.velocityX));
    this.y = Math.max(this.radius, Math.min(visualHeight - this.radius, this.y + this.velocityY));

    // Apply friction
    this.velocityX *= this.friction;
    this.velocityY *= this.friction;
  }

  isInvincible(): boolean {
    return performance.now() < this.invincibilityEndTime;
  }

  makeInvincible() {
    this.invincibilityEndTime = performance.now() + this.INVINCIBILITY_DURATION;
  }

  // Override draw method to make player fish visually distinct
  draw(ctx: CanvasRenderingContext2D) {
    // Save context state
    ctx.save();
    
    // Add flashing effect during invincibility
    if (this.isInvincible()) {
      const flashRate = 200; // Flash every 200ms
      const shouldShow = Math.floor(performance.now() / flashRate) % 2 === 0;
      ctx.globalAlpha = shouldShow ? 1 : 0.3;
    }

    // Rotate context based on movement direction
    const angle = Math.atan2(this.velocityY, this.velocityX);
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);
    ctx.translate(-this.x, -this.y);

    // Main body (slightly more opaque than regular fish)
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `${this.color}40`; // Semi-transparent fill
    ctx.fill();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner details
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.6, 0, Math.PI * 2);
    ctx.strokeStyle = `${this.color}80`;
    ctx.stroke();

    // Motion lines (behind the fish)
    const speed = this.getSpeed();
    if (speed > 0.5) {
      const lineLength = Math.min(speed * 3, this.radius);
      
      // Draw 3 motion lines
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        const offsetY = i * this.radius * 0.3;
        ctx.moveTo(this.x - this.radius - lineLength, this.y + offsetY);
        ctx.lineTo(this.x - this.radius, this.y + offsetY);
        ctx.strokeStyle = `${this.color}40`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Restore context state
    ctx.restore();
  }
} 