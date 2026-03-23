import * as THREE from 'three';
import { InputManager, type InputState } from './input';

/**
 * CameraController — the player's eyes in The Indigo Frequency.
 *
 * No avatar. The camera IS the player. Movement is slow, deliberate, meditative.
 * Like walking through a field at dusk in a dream you know you're dreaming.
 *
 * Features:
 * - Smooth interpolated movement (never snaps)
 * - Gentle head bob while walking (sine wave on Y)
 * - Cinematic reframing near points of interest
 * - Scripted camera movements for scene transitions
 * - Scene entry: slow drift from establishing shot to start position
 */

export type PointOfInterest = {
  position: THREE.Vector3;
  /** Camera pull-back distance when framing this POI */
  frameDistance?: number;
  /** Vertical offset for the composed shot */
  frameHeightOffset?: number;
  /** Radius within which the camera begins reframing */
  radius?: number;
  /** Label shown as interaction hint */
  label?: string;
};

export type ScriptedMove = {
  /** Target position */
  position: THREE.Vector3;
  /** Target look-at point */
  lookAt: THREE.Vector3;
  /** Duration in seconds */
  duration: number;
  /** Easing (0 = linear, 1 = ease-in-out). Default 1 */
  easing?: number;
};

export type CameraControllerConfig = {
  camera: THREE.PerspectiveCamera;
  /** Walk speed in units/second (keep slow — dream pace) */
  walkSpeed?: number;
  /** Head bob amplitude in units */
  bobAmplitude?: number;
  /** Head bob frequency in Hz */
  bobFrequency?: number;
  /** Camera height above ground */
  eyeHeight?: number;
  /** Max pitch up/down in radians */
  maxPitch?: number;
  /** Position smoothing factor (lower = dreamier) */
  positionSmoothing?: number;
  /** Rotation smoothing factor */
  rotationSmoothing?: number;
};

// Smooth ease-in-out for scripted moves
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function lerpScalar(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class CameraController {
  readonly camera: THREE.PerspectiveCamera;

  // --- Movement ---
  private targetPosition = new THREE.Vector3();
  private currentPosition = new THREE.Vector3();
  private velocity = new THREE.Vector3();

  // --- Rotation ---
  private yaw = 0; // horizontal rotation
  private pitch = 0; // vertical rotation
  private targetYaw = 0;
  private targetPitch = 0;

  // --- Head bob ---
  private bobPhase = 0;
  private bobOffset = 0;

  // --- Config ---
  private walkSpeed: number;
  private bobAmplitude: number;
  private bobFrequency: number;
  private eyeHeight: number;
  private maxPitch: number;
  private positionSmoothing: number;
  private rotationSmoothing: number;

  // --- Points of interest ---
  private pois: PointOfInterest[] = [];
  private activePoi: PointOfInterest | null = null;
  private poiInfluence = 0; // 0..1 blending toward POI framing

  // --- Scripted movement ---
  private scriptedMoves: ScriptedMove[] = [];
  private scriptProgress = 0;
  private scriptStartPos = new THREE.Vector3();
  private scriptStartLookAt = new THREE.Vector3();
  private isScripted = false;
  private onScriptComplete: (() => void) | null = null;

  // --- Scene entry ---
  private isEntering = false;
  private entryStartPos = new THREE.Vector3();
  private entryEndPos = new THREE.Vector3();
  private entryLookAt = new THREE.Vector3();
  private entryDuration = 0;
  private entryElapsed = 0;

  // --- Bounds ---
  private boundsMin: THREE.Vector3 | null = null;
  private boundsMax: THREE.Vector3 | null = null;

  // --- Helpers ---
  private forward = new THREE.Vector3();
  private right = new THREE.Vector3();

  constructor(config: CameraControllerConfig) {
    this.camera = config.camera;
    this.walkSpeed = config.walkSpeed ?? 2.5; // Slow — dream pace
    this.bobAmplitude = config.bobAmplitude ?? 0.04;
    this.bobFrequency = config.bobFrequency ?? 1.6;
    this.eyeHeight = config.eyeHeight ?? 1.7;
    this.maxPitch = config.maxPitch ?? Math.PI * 0.42;
    this.positionSmoothing = config.positionSmoothing ?? 0.06;
    this.rotationSmoothing = config.rotationSmoothing ?? 0.08;

    // Initialize from current camera state
    this.currentPosition.copy(this.camera.position);
    this.targetPosition.copy(this.camera.position);

    // Extract initial yaw/pitch from camera
    const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
    this.yaw = euler.y;
    this.pitch = euler.x;
    this.targetYaw = this.yaw;
    this.targetPitch = this.pitch;
  }

  // ---- Public API ----

  /** Register points of interest for cinematic reframing. */
  setPointsOfInterest(pois: PointOfInterest[]) {
    this.pois = pois;
  }

  /** Set world bounds the camera cannot leave. */
  setBounds(min: THREE.Vector3, max: THREE.Vector3) {
    this.boundsMin = min.clone();
    this.boundsMax = max.clone();
  }

  /** Clear world bounds. */
  clearBounds() {
    this.boundsMin = null;
    this.boundsMax = null;
  }

  /** Teleport camera immediately (no interpolation). */
  teleport(position: THREE.Vector3, lookAt?: THREE.Vector3) {
    this.currentPosition.copy(position);
    this.targetPosition.copy(position);
    this.camera.position.copy(position);

    if (lookAt) {
      const dir = new THREE.Vector3().subVectors(lookAt, position).normalize();
      this.yaw = Math.atan2(dir.x, dir.z);
      this.pitch = Math.asin(-dir.y);
      this.targetYaw = this.yaw;
      this.targetPitch = this.pitch;
    }
  }

  /**
   * Begin a scene entry — slow cinematic drift from an establishing shot
   * to the player's starting position.
   */
  startSceneEntry(
    from: THREE.Vector3,
    to: THREE.Vector3,
    lookAt: THREE.Vector3,
    duration = 4.0
  ) {
    this.isEntering = true;
    this.entryStartPos.copy(from);
    this.entryEndPos.copy(to);
    this.entryLookAt.copy(lookAt);
    this.entryDuration = duration;
    this.entryElapsed = 0;

    // Place camera at start immediately
    this.camera.position.copy(from);
    this.camera.lookAt(lookAt);
  }

  /**
   * Queue a scripted camera movement (for dramatic moments / scene transitions).
   * Movements play sequentially. Player input is suppressed during scripted moves.
   */
  addScriptedMove(move: ScriptedMove) {
    this.scriptedMoves.push(move);
    if (!this.isScripted && this.scriptedMoves.length === 1) {
      this.beginNextScriptedMove();
    }
  }

  /** Promise-based version of scripted moves. */
  playScriptedMove(move: ScriptedMove): Promise<void> {
    return new Promise((resolve) => {
      this.onScriptComplete = resolve;
      this.addScriptedMove(move);
    });
  }

  /** Get the current active point of interest (if any). */
  getActivePoi(): PointOfInterest | null {
    return this.activePoi;
  }

  /** Get the distance to the nearest POI, or Infinity if none. */
  getNearestPoiDistance(): number {
    if (this.pois.length === 0) return Infinity;
    let minDist = Infinity;
    for (const poi of this.pois) {
      const d = this.currentPosition.distanceTo(poi.position);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  // ---- Main update (call once per frame) ----

  update(input: InputState, dt: number) {
    // Scene entry takes full priority
    if (this.isEntering) {
      this.updateSceneEntry(dt);
      return;
    }

    // Scripted moves next
    if (this.isScripted) {
      this.updateScriptedMove(dt);
      return;
    }

    // --- Normal player-driven movement ---

    // Update look direction from input
    this.targetYaw -= input.look.x;
    this.targetPitch -= input.look.y;
    this.targetPitch = Math.max(
      -this.maxPitch,
      Math.min(this.maxPitch, this.targetPitch)
    );

    // Smooth rotation
    const rotFactor = 1 - Math.pow(1 - this.rotationSmoothing, dt * 60);
    this.yaw = lerpScalar(this.yaw, this.targetYaw, rotFactor);
    this.pitch = lerpScalar(this.pitch, this.targetPitch, rotFactor);

    // Build forward/right vectors from yaw (ignore pitch for movement)
    this.forward.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    // Movement target
    this.velocity.set(0, 0, 0);
    if (input.isMoving) {
      this.velocity
        .addScaledVector(this.forward, -input.movement.z)
        .addScaledVector(this.right, input.movement.x);
      this.velocity.normalize().multiplyScalar(this.walkSpeed);
    }

    this.targetPosition.addScaledVector(this.velocity, dt);

    // Clamp to bounds
    if (this.boundsMin && this.boundsMax) {
      this.targetPosition.x = Math.max(
        this.boundsMin.x,
        Math.min(this.boundsMax.x, this.targetPosition.x)
      );
      this.targetPosition.z = Math.max(
        this.boundsMin.z,
        Math.min(this.boundsMax.z, this.targetPosition.z)
      );
    }

    // Smooth position
    const posFactor = 1 - Math.pow(1 - this.positionSmoothing, dt * 60);
    this.currentPosition.lerp(this.targetPosition, posFactor);

    // Head bob
    if (input.isMoving) {
      this.bobPhase += dt * this.bobFrequency * Math.PI * 2;
      this.bobOffset = Math.sin(this.bobPhase) * this.bobAmplitude;
    } else {
      // Gently return to neutral
      this.bobOffset *= 0.95;
      this.bobPhase = 0;
    }

    // POI reframing
    this.updatePoiInfluence(dt);

    // Apply to camera
    this.camera.position.set(
      this.currentPosition.x,
      this.eyeHeight + this.bobOffset,
      this.currentPosition.z
    );

    // Build camera quaternion from yaw + pitch
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    const baseQuat = new THREE.Quaternion().setFromEuler(euler);

    // If near a POI, blend toward a composed framing angle
    if (this.activePoi && this.poiInfluence > 0.01) {
      const poiQuat = this.computePoiFraming(this.activePoi);
      baseQuat.slerp(poiQuat, this.poiInfluence * 0.3); // Subtle influence, not a takeover
    }

    this.camera.quaternion.copy(baseQuat);
  }

  // ---- Scene Entry ----

  private updateSceneEntry(dt: number) {
    this.entryElapsed += dt;
    const t = Math.min(this.entryElapsed / this.entryDuration, 1);
    const eased = easeInOut(t);

    // Interpolate position
    this.camera.position.lerpVectors(
      this.entryStartPos,
      this.entryEndPos,
      eased
    );

    // Always look at the focal point
    this.camera.lookAt(this.entryLookAt);

    if (t >= 1) {
      this.isEntering = false;

      // Sync internal state to final position
      this.currentPosition.copy(this.entryEndPos);
      this.targetPosition.copy(this.entryEndPos);

      const euler = new THREE.Euler().setFromQuaternion(
        this.camera.quaternion,
        'YXZ'
      );
      this.yaw = euler.y;
      this.pitch = euler.x;
      this.targetYaw = this.yaw;
      this.targetPitch = this.pitch;
    }
  }

  // ---- Scripted Moves ----

  private beginNextScriptedMove() {
    if (this.scriptedMoves.length === 0) {
      this.isScripted = false;
      if (this.onScriptComplete) {
        this.onScriptComplete();
        this.onScriptComplete = null;
      }
      return;
    }

    this.isScripted = true;
    this.scriptProgress = 0;
    this.scriptStartPos.copy(this.camera.position);

    // Compute current look-at from camera direction
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(
      this.camera.quaternion
    );
    this.scriptStartLookAt
      .copy(this.camera.position)
      .addScaledVector(dir, 10);
  }

  private updateScriptedMove(dt: number) {
    const move = this.scriptedMoves[0];
    if (!move) return;

    this.scriptProgress += dt / move.duration;
    const raw = Math.min(this.scriptProgress, 1);
    const t = (move.easing ?? 1) > 0 ? easeInOut(raw) : raw;

    // Interpolate position
    this.camera.position.lerpVectors(this.scriptStartPos, move.position, t);

    // Interpolate look-at
    const lookTarget = new THREE.Vector3().lerpVectors(
      this.scriptStartLookAt,
      move.lookAt,
      t
    );
    this.camera.lookAt(lookTarget);

    if (raw >= 1) {
      this.scriptedMoves.shift();

      // Sync internal state
      this.currentPosition.copy(move.position);
      this.targetPosition.copy(move.position);
      const euler = new THREE.Euler().setFromQuaternion(
        this.camera.quaternion,
        'YXZ'
      );
      this.yaw = euler.y;
      this.pitch = euler.x;
      this.targetYaw = this.yaw;
      this.targetPitch = this.pitch;

      this.beginNextScriptedMove();
    }
  }

  // ---- POI Influence ----

  private updatePoiInfluence(dt: number) {
    let closest: PointOfInterest | null = null;
    let closestDist = Infinity;

    for (const poi of this.pois) {
      const dist = this.currentPosition.distanceTo(poi.position);
      const radius = poi.radius ?? 8;
      if (dist < radius && dist < closestDist) {
        closest = poi;
        closestDist = dist;
      }
    }

    const targetInfluence = closest
      ? 1 - closestDist / (closest.radius ?? 8)
      : 0;

    // Smooth blending
    const blendSpeed = 0.03;
    const factor = 1 - Math.pow(1 - blendSpeed, dt * 60);
    this.poiInfluence = lerpScalar(this.poiInfluence, targetInfluence, factor);

    this.activePoi = this.poiInfluence > 0.01 ? closest : null;
  }

  private computePoiFraming(poi: PointOfInterest): THREE.Quaternion {
    const frameDistance = poi.frameDistance ?? 4;
    const heightOffset = poi.frameHeightOffset ?? 0.5;

    // Direction from player to POI
    const toTarget = new THREE.Vector3()
      .subVectors(poi.position, this.currentPosition)
      .normalize();

    // Composed look point: slightly above the POI, pulled back
    const lookPoint = poi.position
      .clone()
      .add(new THREE.Vector3(0, heightOffset, 0));

    // A virtual "ideal camera" position for this composed shot
    const idealPos = lookPoint
      .clone()
      .addScaledVector(toTarget, -frameDistance);
    idealPos.y = this.eyeHeight + 0.3; // Slightly above normal eye height

    // Compute quaternion for this ideal framing
    const tempCam = new THREE.Object3D();
    tempCam.position.copy(this.camera.position);
    tempCam.lookAt(lookPoint);

    return tempCam.quaternion.clone();
  }
}
