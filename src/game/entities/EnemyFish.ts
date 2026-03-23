/**
 * EnemyFish class extending the base Fish class with AI-driven behavior.
 * 
 * Additional Properties:
 * - personality: 'lazy' | 'aggressive' | 'erratic'
 * - behaviorState
 * - targetPosition
 * - calories (value when eaten)
 * 
 * Additional Methods:
 * - updateAI(): Handles autonomous movement
 * - checkEdgeBehavior(): Handles movement beyond screen bounds
 * - calculateNextPosition(): Determines next position based on personality
 */

import { Fish } from './Fish';

export type FishSize = 'small' | 'medium' | 'large';

interface EnemyFishConfig {
  size: FishSize;
  calories: number;
}

const FISH_SIZE_CONFIG: Record<FishSize, EnemyFishConfig> = {
  small: {
    size: 'small',
    calories: 10
  },
  medium: {
    size: 'medium',
    calories: 25
  },
  large: {
    size: 'large',
    calories: 50
  }
};

// Size multipliers relative to base radius
const SIZE_MULTIPLIERS: Record<FishSize, number> = {
  small: 0.7,
  medium: 1.0,
  large: 1.4
};

// Color schemes for different sizes
const SIZE_COLORS: Record<FishSize, string> = {
  small: '#7FB069',  // Soft green for small fish
  medium: '#E6AA68', // Warm orange for medium fish
  large: '#CA3C25'   // Deep red for large fish
};

export class EnemyFish extends Fish {
  readonly size: FishSize;
  readonly calories: number;
  baseRadius: number;
  spawnTime: number = 0;
  targetRadius: number = 0;
  isGhosted: boolean = true;

  constructor(x: number, y: number, baseRadius: number, size: FishSize) {
    // Calculate actual radius based on size multiplier
    const actualRadius = baseRadius * SIZE_MULTIPLIERS[size];
    const color = SIZE_COLORS[size];
    
    super(x, y, actualRadius, color);
    
    this.size = size;
    this.baseRadius = baseRadius;
    this.calories = FISH_SIZE_CONFIG[size].calories;
  }

  // Override draw method to add size-specific visual elements
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    
    // Apply ghost effect if spawning
    if (this.isGhosted) {
      ctx.globalAlpha = 0.5;
    }

    // Rotate context based on movement direction
    const angle = Math.atan2(this.velocityY, this.velocityX);
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);
    ctx.translate(-this.x, -this.y);

    // Main body
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `${this.color}40`; // Semi-transparent fill
    ctx.fill();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Size indicator rings
    const ringCount = this.size === 'small' ? 1 : this.size === 'medium' ? 2 : 3;
    for (let i = 1; i <= ringCount; i++) {
      ctx.beginPath();
      ctx.arc(
        this.x, 
        this.y, 
        this.radius * (0.4 + i * 0.2), 
        0, 
        Math.PI * 2
      );
      ctx.strokeStyle = `${this.color}60`;
      ctx.stroke();
    }

    // Motion trails (if moving)
    const speed = this.getSpeed();
    if (speed > 0.5) {
      const lineLength = Math.min(speed * 2, this.radius);
      
      // Draw motion lines based on size
      for (let i = 0; i < ringCount + 1; i++) {
        ctx.beginPath();
        const offsetY = (i - ringCount/2) * (this.radius * 0.3);
        ctx.moveTo(this.x - this.radius - lineLength, this.y + offsetY);
        ctx.lineTo(this.x - this.radius, this.y + offsetY);
        ctx.strokeStyle = `${this.color}30`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // Override update to add size-specific movement characteristics
  update(canvas: HTMLCanvasElement) {
    super.update(canvas);

    // Adjust friction based on size
    this.friction = this.size === 'large' ? 0.985 : 
                   this.size === 'medium' ? 0.99 : 
                   0.995; // Small fish are more agile
  }

  isEdible(otherRadius: number): boolean {
    // Fish can't be eaten while spawning/ghosted
    if (this.isGhosted || this.radius < this.targetRadius) {
      return false;
    }
    return otherRadius > this.radius * 1.2;
  }

  isDangerous(otherRadius: number): boolean {
    // Fish can't damage while spawning/ghosted
    if (this.isGhosted || this.radius < this.targetRadius) {
      return false;
    }
    return this.radius > otherRadius * 1.2;
  }
} 