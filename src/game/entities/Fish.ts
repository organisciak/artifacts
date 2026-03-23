/**
 * Base Fish class representing common properties and behaviors for all fish entities.
 * 
 * Properties:
 * - position (x, y)
 * - velocity (x, y)
 * - radius (size)
 * - color
 * - collision handling
 * 
 * Methods:
 * - update(): Updates position and state
 * - draw(): Renders the fish
 * - handleCollision(): Basic collision response
 * - isCollidingWith(): Collision detection
 */

export class Fish {
  x: number;
  y: number;
  radius: number;
  color: string;
  velocityX: number;
  velocityY: number;
  friction: number;
  restitution: number;
  lastCollisionTime: number;

  constructor(x: number, y: number, radius: number, color: string) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.velocityX = 0;
    this.velocityY = 0;
    this.friction = 0.99; // Slightly reduced from ball demo for smoother swimming
    this.restitution = 0.7;
    this.lastCollisionTime = 0;
  }

  update(canvas: HTMLCanvasElement) {
    // Update position based on velocity
    this.x += this.velocityX;
    this.y += this.velocityY;

    // Apply friction
    this.velocityX *= this.friction;
    this.velocityY *= this.friction;

    // Get canvas dimensions accounting for DPI
    const dpr = window.devicePixelRatio || 1;
    const visualWidth = canvas.width / dpr;
    const visualHeight = canvas.height / dpr;

    // Basic boundary checking (will be overridden by PlayerFish for stricter bounds)
    if (this.x + this.radius > visualWidth) {
      this.x = visualWidth - this.radius;
      this.velocityX *= -this.restitution;
    }
    if (this.x - this.radius < 0) {
      this.x = this.radius;
      this.velocityX *= -this.restitution;
    }
    if (this.y + this.radius > visualHeight) {
      this.y = visualHeight - this.radius;
      this.velocityY *= -this.restitution;
    }
    if (this.y - this.radius < 0) {
      this.y = this.radius;
      this.velocityY *= -this.restitution;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Main body
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Inner circle (will be replaced with more fish-like details later)
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.6, 0, Math.PI * 2);
    ctx.strokeStyle = `${this.color}80`; // Semi-transparent
    ctx.stroke();
    
    // Motion lines based on velocity
    const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
    if (speed > 0.5) {
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
  }

  isCollidingWith(other: Fish): boolean {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (this.radius + other.radius);
  }

  handleCollision(other: Fish) {
    // Calculate collision angle
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    const angle = Math.atan2(dy, dx);
    
    // Calculate velocity components
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    
    // Rotate velocities
    const vx1 = this.velocityX * cos + this.velocityY * sin;
    const vy1 = this.velocityY * cos - this.velocityX * sin;
    const vx2 = other.velocityX * cos + other.velocityY * sin;
    const vy2 = other.velocityY * cos - other.velocityX * sin;
    
    // Swap the rotated velocities
    this.velocityX = vx2 * cos - vy1 * sin;
    this.velocityY = vy1 * cos + vx2 * sin;
    other.velocityX = vx1 * cos - vy2 * sin;
    other.velocityY = vy2 * cos + vx1 * sin;
    
    // Prevent overlap
    const overlap = (this.radius + other.radius - Math.sqrt(dx * dx + dy * dy)) / 2;
    this.x -= overlap * cos;
    this.y -= overlap * sin;
    other.x += overlap * cos;
    other.y += overlap * sin;
    
    // Update collision timestamp
    const now = performance.now();
    this.lastCollisionTime = now;
    other.lastCollisionTime = now;
  }

  getSpeed(): number {
    return Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
  }

  getDirection(): number {
    return Math.atan2(this.velocityY, this.velocityX);
  }

  updateColor(newColor: string) {
    this.color = newColor;
  }
} 