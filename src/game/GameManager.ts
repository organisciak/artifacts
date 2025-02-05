/**
 * GameManager class orchestrating the overall game state and mechanics.
 * 
 * Responsibilities:
 * - Game loop management
 * - Fish spawning and lifecycle
 * - Score tracking
 * - Level progression
 * - Collision detection and resolution
 * - Game state persistence
 * 
 * Properties:
 * - currentLevel
 * - score
 * - playerFish
 * - enemyFish[]
 */

import { PlayerFish } from './entities/PlayerFish';
import { EnemyFish, FishSize } from './entities/EnemyFish';

interface GameConfig {
  baseEnemyCount: number;
  spawnMargin: number;
  baseRadius: number;
  playerColor: string;
  spawnInterval: number;    // Base time between spawns in ms
  spawnGhostTime: number;   // How long fish are ghosted in ms
  spawnTweenTime: number;   // How long size animation takes in ms
  minSizeRatio: number;     // Minimum size relative to player
  maxSizeRatio: number;     // Maximum size relative to player
  scoreScaling: number;     // How much score affects size distribution
  minSpawnInterval: number; // Minimum time between spawns
  spawnScoreScaling: number; // How much score affects spawn rate
}

// Add these color constants at the top of the file
const FISH_COLORS = {
  EDIBLE: '#7FB069',    // Soft green for fish we can eat
  NEUTRAL: '#E6AA68',   // Warm orange for similarly-sized fish
  DANGEROUS: '#CA3C25', // Deep red for fish that can eat us
};

// Size multipliers relative to base radius
const SIZE_MULTIPLIERS: Record<FishSize, number> = {
  small: 0.7,
  medium: 1.0,
  large: 1.4
};

export class GameManager {
  private canvas: HTMLCanvasElement;
  private config: GameConfig;
  private playerFish: PlayerFish;
  private enemyFish: EnemyFish[];
  private score: number = 0;
  private level: number = 1;
  private lastSpawnTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.config = {
      baseEnemyCount: 12,
      spawnMargin: 100,
      baseRadius: 15,
      playerColor: '#4A90E2',
      spawnInterval: 3000,
      spawnGhostTime: 1200,
      spawnTweenTime: 500,
      minSizeRatio: 0.5,
      maxSizeRatio: 1.5,
      scoreScaling: 0.00005,
      minSpawnInterval: 800,   // Never spawn faster than 0.8 seconds
      spawnScoreScaling: 0.0001, // Gentle increase in spawn rate with score
    };
    
    this.enemyFish = [];
    this.initializeGame();
  }

  private initializeGame() {
    const dpr = window.devicePixelRatio || 1;
    const visualWidth = this.canvas.width / dpr;
    const visualHeight = this.canvas.height / dpr;

    // Create player fish in center of screen
    this.playerFish = new PlayerFish(
      visualWidth / 2,
      visualHeight / 2,
      this.config.baseRadius,
      this.config.playerColor
    );

    // Clear existing enemies
    this.enemyFish = [];
    
    // Create initial set of enemy fish
    this.spawnInitialEnemies();
  }

  private spawnInitialEnemies() {
    // Distribution of fish sizes (adjust for difficulty)
    const distribution = {
      small: 0.5,    // 50% small
      medium: 0.3,   // 30% medium
      large: 0.2     // 20% large
    };

    const totalEnemies = this.config.baseEnemyCount;
    
    // Spawn fish of each size according to distribution
    Object.entries(distribution).forEach(([size, ratio]) => {
      const count = Math.round(totalEnemies * ratio);
      for (let i = 0; i < count; i++) {
        this.spawnEnemy();
      }
    });
  }

  private getRandomFishSize(): number {
    const playerSize = this.playerFish.radius;
    const scoreMultiplier = 1 + (this.score * this.config.scoreScaling);
    
    // Calculate size bounds relative to player
    const minSize = this.config.minSizeRatio * playerSize;
    const maxSize = this.config.maxSizeRatio * playerSize * scoreMultiplier;
    
    // Count current smaller fish (edible targets)
    const edibleFishCount = this.enemyFish.filter(
      fish => fish.radius < playerSize * 0.9
    ).length;
    
    // If there are very few edible fish, increase chance of spawning smaller ones
    const edibleFishDeficit = Math.max(0, 5 - edibleFishCount); // Want at least 5 edible fish
    const smallFishBias = 0.3 + (edibleFishDeficit * 0.1); // Each missing fish adds 10% bias
    
    // Use multiple random numbers with stronger bias towards smaller fish
    const r1 = Math.random();
    const r2 = Math.random();
    const r3 = Math.random();
    let randomFactor = (r1 + r2 + r3) / 3; // Average of 3 random numbers
    
    // Apply small fish bias
    randomFactor = Math.pow(randomFactor, 1 + smallFishBias); // Bias towards smaller values
    
    // Calculate size with adjusted bias
    const size = minSize + (maxSize - minSize) * randomFactor;
    
    return size;
  }

  private spawnEnemy(targetSize?: number) {
    const dpr = window.devicePixelRatio || 1;
    const visualWidth = this.canvas.width / dpr;
    const visualHeight = this.canvas.height / dpr;
    const margin = this.config.spawnMargin;

    // Decide which edge to spawn from
    const edge = Math.floor(Math.random() * 4);
    let x, y;

    switch (edge) {
      case 0: // top
        x = Math.random() * (visualWidth + 2 * margin) - margin;
        y = -margin;
        break;
      case 1: // right
        x = visualWidth + margin;
        y = Math.random() * (visualHeight + 2 * margin) - margin;
        break;
      case 2: // bottom
        x = Math.random() * (visualWidth + 2 * margin) - margin;
        y = visualHeight + margin;
        break;
      default: // left
        x = -margin;
        y = Math.random() * (visualHeight + 2 * margin) - margin;
        break;
    }

    // Use provided size or generate random one
    const finalTargetSize = targetSize ?? this.getRandomFishSize();
    
    // Determine fish type based on size comparison with player
    const sizeRatio = finalTargetSize / this.playerFish.radius;
    const size: FishSize = 
      sizeRatio < 0.9 ? 'small' :  // Increased from 0.8
      sizeRatio > 1.3 ? 'large' :  // Increased from 1.2
      'medium';

    // Create new enemy fish starting at size 0
    const enemy = new EnemyFish(
      x,
      y,
      0,
      size // Size category now only affects visual appearance
    );

    // Set spawn properties
    enemy.spawnTime = performance.now();
    enemy.targetRadius = finalTargetSize;
    enemy.isGhosted = true;

    // Add initial velocity pointing inward
    const speed = Math.random() * 2 + 1;
    const angle = Math.atan2(visualHeight/2 - y, visualWidth/2 - x);
    enemy.velocityX = Math.cos(angle) * speed;
    enemy.velocityY = Math.sin(angle) * speed;

    this.enemyFish.push(enemy);
  }

  private getCurrentSpawnInterval(): number {
    // Start with base interval
    let interval = this.config.spawnInterval;
    
    // Reduce interval based on score (higher score = faster spawns)
    const scoreMultiplier = 1 / (1 + (this.score * this.config.spawnScoreScaling));
    interval *= scoreMultiplier;
    
    // Reduce interval based on enemy deficit
    const currentEnemies = this.enemyFish.length;
    const targetEnemies = this.config.baseEnemyCount;
    if (currentEnemies < targetEnemies) {
      // Each missing enemy reduces spawn time by 15%
      const deficit = targetEnemies - currentEnemies;
      const deficitMultiplier = Math.pow(0.85, deficit);
      interval *= deficitMultiplier;
    }
    
    // Never go below minimum spawn interval
    return Math.max(this.config.minSpawnInterval, interval);
  }

  // Updated update method implementing eating mechanics
  update() {
    const now = performance.now();

    // Check if it's time to spawn a new fish using dynamic interval
    if (now - this.lastSpawnTime > this.getCurrentSpawnInterval()) {
      this.spawnEnemy();
      this.lastSpawnTime = now;
    }

    // Update spawn animations
    this.enemyFish.forEach(enemy => {
      const spawnAge = now - enemy.spawnTime;
      
      // Update radius during tween period
      if (spawnAge < this.config.spawnTweenTime) {
        const progress = Math.max(0, spawnAge / this.config.spawnTweenTime);
        enemy.radius = Math.max(0.1, enemy.targetRadius * progress);
      } else if (enemy.radius !== enemy.targetRadius) {
        enemy.radius = enemy.targetRadius;
      }

      // Update ghost state
      if (enemy.isGhosted && spawnAge > this.config.spawnGhostTime) {
        enemy.isGhosted = false;
      }
    });

    const canvas = this.canvas;
    
    // Update player
    this.playerFish.update(canvas);

    // Update enemies and their colors based on size comparison
    this.enemyFish.forEach(enemy => {
      enemy.update(canvas);
      
      // Update enemy color based on size comparison with player
      if (enemy.isGhosted) {
        // Ghost fish show their eventual threat level
        if (this.playerFish.radius > enemy.targetRadius * 1.1) {
          enemy.updateColor(FISH_COLORS.EDIBLE);
        } else if (enemy.targetRadius > this.playerFish.radius * 1.1) {
          enemy.updateColor(FISH_COLORS.DANGEROUS);
        } else {
          enemy.updateColor(FISH_COLORS.NEUTRAL);
        }
      } else {
        // Normal fish show current threat level
        if (this.playerFish.radius > enemy.radius * 1.1) {
          enemy.updateColor(FISH_COLORS.EDIBLE);
        } else if (enemy.radius > this.playerFish.radius * 1.1) {
          enemy.updateColor(FISH_COLORS.DANGEROUS);
        } else {
          enemy.updateColor(FISH_COLORS.NEUTRAL);
        }
      }
    });

    // Process collisions between the player and enemy fish
    for (let i = this.enemyFish.length - 1; i >= 0; i--) {
      const enemy = this.enemyFish[i];
      if (enemy.isCollidingWith(this.playerFish)) {
        if (enemy.isGhosted) {
          // Ghost fish just bounce
          enemy.handleCollision(this.playerFish);
        } else {
          // Player eats enemy
          if (this.playerFish.radius > enemy.radius * 1.1) {
            // Increase player size by a fraction of the enemy's size
            this.playerFish.radius += enemy.radius * 0.1;
            // Update score
            this.score += Math.floor(enemy.radius * 10);
            // Remove the enemy fish
            this.enemyFish.splice(i, 1);
          }
          // If the enemy is significantly larger, it eats a chunk out of the player
          else if (enemy.radius > this.playerFish.radius * 1.1) {
            const reduction = this.playerFish.radius * 0.3;
            this.playerFish.radius -= reduction;
            if (this.playerFish.radius < this.config.baseRadius) {
              console.log("Game Over! You were eaten!");
              this.reset();
              return;
            }
          }
          // Otherwise, if sizes are nearly equal, perform an elastic collision bounce
          else {
            enemy.handleCollision(this.playerFish);
          }
        }
      }
    }

    // Process collisions among enemy fish
    for (let i = 0; i < this.enemyFish.length; i++) {
      const fish1 = this.enemyFish[i];
      for (let j = i + 1; j < this.enemyFish.length; j++) {
        const fish2 = this.enemyFish[j];
        if (fish1.isCollidingWith(fish2)) {
          fish1.handleCollision(fish2);
        }
      }
    }

    // TODO: Add scoring
    // TODO: Add difficulty progression
  }

  // Called each frame to render game
  draw(ctx: CanvasRenderingContext2D) {
    // Draw enemies first (player should appear on top)
    this.enemyFish.forEach(enemy => {
      enemy.draw(ctx);
    });

    // Draw player
    this.playerFish.draw(ctx);
  }

  // Public methods for game control
  reset() {
    this.initializeGame();
  }

  getScore(): number {
    return this.score;
  }

  getLevel(): number {
    return this.level;
  }

  // Add this public method to access the player fish
  getPlayerFish(): PlayerFish | null {
    return this.playerFish;
  }
} 