/**
 * InputManager — captures and smooths all player input for The Indigo Frequency.
 *
 * Desktop: WASD/arrows for movement, mouse for look, E/Space to interact.
 * Mobile: virtual joystick for movement, gyroscope for look, tap to interact.
 * All raw values are heavily smoothed before consumption.
 */

export type InputState = {
  /** Movement vector (x = strafe, z = forward/back), normalized, smoothed */
  movement: { x: number; z: number };
  /** Look delta since last frame in radians, smoothed */
  look: { x: number; y: number };
  /** True on the frame the interact button is pressed */
  interact: boolean;
  /** True while any movement input is active */
  isMoving: boolean;
};

type Vec2 = { x: number; y: number };

const SMOOTHING = 0.08; // Movement lerp factor per frame (lower = dreamier)
const LOOK_SMOOTHING = 0.12;
const MOUSE_SENSITIVITY = 0.002;
const GYRO_SENSITIVITY = 0.015;
const DEADZONE = 0.1;
const JOYSTICK_RADIUS = 50; // pixels

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class InputManager {
  // --- public smoothed state ---
  readonly state: InputState = {
    movement: { x: 0, z: 0 },
    look: { x: 0, y: 0 },
    interact: false,
    isMoving: false,
  };

  // --- raw targets before smoothing ---
  private rawMovement: Vec2 = { x: 0, y: 0 };
  private rawLook: Vec2 = { x: 0, y: 0 };
  private interactPressed = false;

  // --- keyboard tracking ---
  private keys = new Set<string>();

  // --- mouse state ---
  private pointerLocked = false;

  // --- touch / joystick ---
  private joystickTouchId: number | null = null;
  private joystickOrigin: Vec2 | null = null;
  private joystickOverlay: HTMLDivElement | null = null;
  private joystickKnob: HTMLDivElement | null = null;

  // --- gyroscope ---
  private gyroPermission: 'granted' | 'denied' | 'pending' = 'pending';
  private lastGyroBeta: number | null = null;
  private lastGyroGamma: number | null = null;

  // --- element ref ---
  private el: HTMLElement;
  private disposed = false;

  // --- bound handlers (for cleanup) ---
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundClick: (e: MouseEvent) => void;
  private boundPointerLockChange: () => void;
  private boundTouchStart: (e: TouchEvent) => void;
  private boundTouchMove: (e: TouchEvent) => void;
  private boundTouchEnd: (e: TouchEvent) => void;
  private boundDeviceOrientation: (e: DeviceOrientationEvent) => void;
  private boundContextMenu: (e: Event) => void;

  /** Is this a touch-primary device? */
  readonly isMobile: boolean;

  constructor(element: HTMLElement) {
    this.el = element;
    this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Bind all handlers
    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundClick = this.onClick.bind(this);
    this.boundPointerLockChange = this.onPointerLockChange.bind(this);
    this.boundTouchStart = this.onTouchStart.bind(this);
    this.boundTouchMove = this.onTouchMove.bind(this);
    this.boundTouchEnd = this.onTouchEnd.bind(this);
    this.boundDeviceOrientation = this.onDeviceOrientation.bind(this);
    this.boundContextMenu = (e: Event) => e.preventDefault();

    this.attach();
  }

  // ---- Lifecycle ----

  private attach() {
    // Keyboard (always listen on window for key events)
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);

    // Mouse look via pointer lock
    this.el.addEventListener('click', this.boundClick);
    document.addEventListener('pointerlockchange', this.boundPointerLockChange);
    document.addEventListener('mousemove', this.boundMouseMove);

    // Touch
    this.el.addEventListener('touchstart', this.boundTouchStart, { passive: false });
    this.el.addEventListener('touchmove', this.boundTouchMove, { passive: false });
    this.el.addEventListener('touchend', this.boundTouchEnd);
    this.el.addEventListener('touchcancel', this.boundTouchEnd);

    // Prevent right-click menu on game canvas
    this.el.addEventListener('contextmenu', this.boundContextMenu);

    // Gyroscope
    this.requestGyro();

    // Build mobile joystick overlay (hidden until touch)
    if (this.isMobile) {
      this.createJoystickOverlay();
    }
  }

  dispose() {
    this.disposed = true;

    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    this.el.removeEventListener('click', this.boundClick);
    document.removeEventListener('pointerlockchange', this.boundPointerLockChange);
    document.removeEventListener('mousemove', this.boundMouseMove);
    this.el.removeEventListener('touchstart', this.boundTouchStart);
    this.el.removeEventListener('touchmove', this.boundTouchMove);
    this.el.removeEventListener('touchend', this.boundTouchEnd);
    this.el.removeEventListener('touchcancel', this.boundTouchEnd);
    this.el.removeEventListener('contextmenu', this.boundContextMenu);
    window.removeEventListener('deviceorientation', this.boundDeviceOrientation);

    if (document.pointerLockElement === this.el) {
      document.exitPointerLock();
    }

    if (this.joystickOverlay?.parentElement) {
      this.joystickOverlay.parentElement.removeChild(this.joystickOverlay);
    }
  }

  // ---- Update (call once per frame) ----

  update(dt: number) {
    if (this.disposed) return;

    // Build raw movement from keys
    this.updateKeyboardMovement();

    // Smooth toward raw values
    const factor = 1 - Math.pow(1 - SMOOTHING, dt * 60);
    const lookFactor = 1 - Math.pow(1 - LOOK_SMOOTHING, dt * 60);

    this.state.movement.x = lerp(this.state.movement.x, this.rawMovement.x, factor);
    this.state.movement.z = lerp(this.state.movement.z, this.rawMovement.y, factor);

    this.state.look.x = lerp(this.state.look.x, this.rawLook.x, lookFactor);
    this.state.look.y = lerp(this.state.look.y, this.rawLook.y, lookFactor);

    // Decay look input toward zero (mouse deltas are per-frame impulses)
    this.rawLook.x *= 0.7;
    this.rawLook.y *= 0.7;

    // Apply deadzone
    const moveLen = Math.sqrt(
      this.state.movement.x ** 2 + this.state.movement.z ** 2
    );
    this.state.isMoving = moveLen > DEADZONE;

    if (!this.state.isMoving) {
      this.state.movement.x = lerp(this.state.movement.x, 0, factor * 2);
      this.state.movement.z = lerp(this.state.movement.z, 0, factor * 2);
    }

    // Clamp movement magnitude to 1
    if (moveLen > 1) {
      this.state.movement.x /= moveLen;
      this.state.movement.z /= moveLen;
    }

    // Consume interact
    this.state.interact = this.interactPressed;
    this.interactPressed = false;
  }

  // ---- Keyboard ----

  private onKeyDown(e: KeyboardEvent) {
    // Don't capture if user is typing in an input
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    )
      return;

    this.keys.add(e.code);

    if (e.code === 'KeyE' || e.code === 'Space') {
      this.interactPressed = true;
      e.preventDefault();
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.code);
  }

  private updateKeyboardMovement() {
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;

    // Normalize diagonal
    const len = Math.sqrt(x * x + y * y);
    if (len > 0) {
      x /= len;
      y /= len;
    }

    // Only override raw movement from keyboard if no joystick active
    if (this.joystickTouchId === null) {
      this.rawMovement.x = x;
      this.rawMovement.y = y;
    }
  }

  // ---- Mouse ----

  private onClick() {
    if (!this.pointerLocked && !this.isMobile) {
      this.el.requestPointerLock();
    }
  }

  private onPointerLockChange() {
    this.pointerLocked = document.pointerLockElement === this.el;
  }

  private onMouseMove(e: MouseEvent) {
    if (!this.pointerLocked) return;
    this.rawLook.x += e.movementX * MOUSE_SENSITIVITY;
    this.rawLook.y += e.movementY * MOUSE_SENSITIVITY;
  }

  // ---- Touch / Virtual Joystick ----

  private createJoystickOverlay() {
    // Container for the virtual joystick — covers left 40% of screen
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; left: 0; bottom: 0;
      width: 40%; height: 50%;
      z-index: 20; pointer-events: none;
    `;

    const knob = document.createElement('div');
    knob.style.cssText = `
      position: absolute; width: 60px; height: 60px;
      border-radius: 50%;
      border: 2px solid rgba(107, 63, 160, 0.4);
      background: rgba(107, 63, 160, 0.15);
      pointer-events: none; display: none;
      transform: translate(-50%, -50%);
      transition: opacity 0.2s;
    `;
    overlay.appendChild(knob);

    this.el.appendChild(overlay);
    this.joystickOverlay = overlay;
    this.joystickKnob = knob;
  }

  private onTouchStart(e: TouchEvent) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const x = touch.clientX;
      const screenW = window.innerWidth;

      // Left 40% of screen: joystick
      if (x < screenW * 0.4 && this.joystickTouchId === null) {
        e.preventDefault();
        this.joystickTouchId = touch.identifier;
        this.joystickOrigin = { x: touch.clientX, y: touch.clientY };

        if (this.joystickKnob) {
          this.joystickKnob.style.display = 'block';
          this.joystickKnob.style.left = `${touch.clientX}px`;
          this.joystickKnob.style.top = `${touch.clientY}px`;
        }
      }
      // Right side: tap to interact
      else if (x >= screenW * 0.6) {
        this.interactPressed = true;
      }
    }
  }

  private onTouchMove(e: TouchEvent) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      if (touch.identifier === this.joystickTouchId && this.joystickOrigin) {
        e.preventDefault();
        const dx = touch.clientX - this.joystickOrigin.x;
        const dy = touch.clientY - this.joystickOrigin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const clamped = Math.min(dist, JOYSTICK_RADIUS);
        const angle = Math.atan2(dy, dx);

        const normX = (clamped / JOYSTICK_RADIUS) * Math.cos(angle);
        const normY = (clamped / JOYSTICK_RADIUS) * Math.sin(angle);

        this.rawMovement.x = normX;
        this.rawMovement.y = normY;

        // Update knob position
        if (this.joystickKnob) {
          this.joystickKnob.style.left = `${this.joystickOrigin.x + normX * JOYSTICK_RADIUS}px`;
          this.joystickKnob.style.top = `${this.joystickOrigin.y + normY * JOYSTICK_RADIUS}px`;
        }
      }
    }
  }

  private onTouchEnd(e: TouchEvent) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === this.joystickTouchId) {
        this.joystickTouchId = null;
        this.joystickOrigin = null;
        this.rawMovement.x = 0;
        this.rawMovement.y = 0;

        if (this.joystickKnob) {
          this.joystickKnob.style.display = 'none';
        }
      }
    }
  }

  // ---- Gyroscope ----

  private async requestGyro() {
    // iOS 13+ requires explicit permission
    const DeviceOrientationEvent = window.DeviceOrientationEvent as typeof globalThis.DeviceOrientationEvent & {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
      try {
        const result = await DeviceOrientationEvent.requestPermission();
        this.gyroPermission = result;
      } catch {
        this.gyroPermission = 'denied';
      }
    } else {
      // Non-iOS or older — just listen
      this.gyroPermission = 'granted';
    }

    if (this.gyroPermission === 'granted') {
      window.addEventListener('deviceorientation', this.boundDeviceOrientation);
    }
  }

  private onDeviceOrientation(e: DeviceOrientationEvent) {
    if (!this.isMobile) return;

    const beta = e.beta ?? 0; // front-back tilt (-180..180)
    const gamma = e.gamma ?? 0; // left-right tilt (-90..90)

    if (this.lastGyroBeta !== null && this.lastGyroGamma !== null) {
      const dBeta = (beta - this.lastGyroBeta) * GYRO_SENSITIVITY;
      const dGamma = (gamma - this.lastGyroGamma) * GYRO_SENSITIVITY;

      // Map gyro to look: gamma = yaw, beta = pitch
      this.rawLook.x += dGamma;
      this.rawLook.y += dBeta;
    }

    this.lastGyroBeta = beta;
    this.lastGyroGamma = gamma;
  }
}
