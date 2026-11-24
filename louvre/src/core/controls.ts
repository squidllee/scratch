import * as THREE from 'three';
import { EYE_HEIGHT, PLAYER_RADIUS } from './types';
import { pickFloorAt, type RoomDef } from './culling';

export type ControlMode = 'walk' | 'tour' | 'fly';

export interface SpawnPoint {
  id: string;
  /** Eye position in world metres (already at eye height if you want — walk mode uses floor + eye). */
  position: readonly [number, number, number];
  lookAt: readonly [number, number, number];
  label?: string;
}

/**
 * One point on the guided tour. A measured route (route.json) maps onto this directly:
 * `{ position, lookAt }` plus optional `fov` and `holdMs`.
 */
export interface TourWaypoint {
  position: readonly [number, number, number];
  lookAt: readonly [number, number, number];
  /** Vertical field of view in degrees at this waypoint; interpolated between waypoints. */
  fov?: number;
  /** Dwell at this waypoint for this many milliseconds before moving on. Defaults 0. */
  holdMs?: number;
  label?: string;
}

export interface ControlsOptions {
  camera: THREE.PerspectiveCamera;
  domElement: HTMLElement;
  /** Every room, with its portals. The walker stays inside the union and only passes through openings. */
  colliders: RoomDef[];
  spawn: SpawnPoint;
  tour: TourWaypoint[];
  /** Called when the camera changed and the frame must be redrawn. */
  onChange: () => void;
  /** Called when the mode or pause state changes, so the HUD can update. */
  onModeChange?: (mode: ControlMode, paused: boolean) => void;
  /** Metres per second for the tour. Defaults 2.6. */
  tourSpeed?: number;
}

function portalAxis(room: RoomDef, portal: { centre: readonly [number, number, number]; normal?: readonly [number, number, number] }): 'x' | 'z' {
  if (portal.normal) return Math.abs(portal.normal[0]) >= Math.abs(portal.normal[2]) ? 'x' : 'z';
  const b = room.bounds;
  const dx = Math.min(Math.abs(portal.centre[0] - b.min[0]), Math.abs(b.max[0] - portal.centre[0]));
  const dz = Math.min(Math.abs(portal.centre[2] - b.min[2]), Math.abs(b.max[2] - portal.centre[2]));
  return dx < dz ? 'x' : 'z';
}

function insideRoom(room: RoomDef, x: number, z: number, radius: number): boolean {
  const b = room.bounds;
  if (x < b.min[0] - radius || x > b.max[0] + radius) return false;
  if (z < b.min[2] - radius || z > b.max[2] + radius) return false;
  const portals = room.portals ?? [];
  const midX = (b.min[0] + b.max[0]) / 2;
  const midZ = (b.min[2] + b.max[2]) / 2;

  const open = (axis: 'x' | 'z', sign: number, tangent: number): boolean =>
    portals.some((p) => {
      if (portalAxis(room, p) !== axis) return false;
      const along = axis === 'x' ? p.centre[0] : p.centre[2];
      const faceSign = Math.sign((axis === 'x' ? along - midX : along - midZ));
      if (faceSign !== sign) return false;
      const across = axis === 'x' ? p.centre[2] : p.centre[0];
      return Math.abs(tangent - across) <= p.width / 2;
    });

  if (x > b.max[0] - radius && !open('x', 1, z)) return false;
  if (x < b.min[0] + radius && !open('x', -1, z)) return false;
  if (z > b.max[2] - radius && !open('z', 1, x)) return false;
  if (z < b.min[2] + radius && !open('z', -1, x)) return false;
  return true;
}

const WALK_SPEED = 3.1;
const RUN_SPEED = 6.2;
const ACCEL = 14;
const FRICTION = 10;
const EYE = EYE_HEIGHT;

/**
 * Three ways to see the museum:
 *  - walk: pointer-locked first person with collision against room bounds (the default).
 *  - tour: a spline flight along the route at a readable pace, pausable and restartable.
 *  - fly: unconstrained debug camera.
 *
 * Keys are printed in the on-screen help (see index.html) and reported by `keyHelp`.
 */
export class Controls {
  mode: ControlMode = 'walk';
  paused = false;
  camera: THREE.PerspectiveCamera;
  readonly keys = new Set<string>();

  private dom: HTMLElement;
  private colliders: RoomDef[];
  private onChange: () => void;
  private onModeChange?: (mode: ControlMode, paused: boolean) => void;
  private velocity = new THREE.Vector3();
  private yaw = 0;
  private pitch = 0;
  private eye = new THREE.Vector3();
  private tourCurve: THREE.CatmullRomCurve3 | null = null;
  private lookCurve: THREE.CatmullRomCurve3 | null = null;
  private waypoints: TourWaypoint[] = [];
  /** Normalised arc-length position of each waypoint on the spline. */
  private waypointU: number[] = [];
  private held = new Set<number>();
  private holdRemaining = 0;
  private baseFov = 62;
  private tourLength = 0;
  private tourU = 0;
  private tourSpeed: number;
  private lookTarget = new THREE.Vector3();
  private tourLook = new THREE.Vector3();
  private hoverY = EYE;
  private disposed = false;

  constructor(opts: ControlsOptions) {
    this.camera = opts.camera;
    this.dom = opts.domElement;
    this.colliders = opts.colliders;
    this.onChange = opts.onChange;
    this.onModeChange = opts.onModeChange;
    this.tourSpeed = opts.tourSpeed ?? 2.6;
    this.baseFov = opts.camera.fov;
    if (opts.tour.length > 1) this.setTour(opts.tour);
    this.setSpawn(opts.spawn);

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.dom.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
  }

  static keyHelp(): string[] {
    return [
      'walk: click to capture the mouse · W A S D move · Shift run · Esc release',
      'tour: play/pause with Space · R restart',
      '1 walk · 2 tour · 3 fly (W A S D + Q E)',
      'H hud · C culling debug',
    ];
  }

  setColliders(colliders: RoomDef[]): void {
    this.colliders = colliders;
  }

  /**
   * Replace the tour path. Integration feeds the measured route here:
   *   controls.setTour(route.rooms.map(r => ({ position: r.eye, lookAt: r.lookAt, fov: r.fov, holdMs: r.holdMs })))
   */
  setTour(waypoints: TourWaypoint[]): void {
    if (waypoints.length < 2) return;
    this.waypoints = waypoints;
    this.tourCurve = new THREE.CatmullRomCurve3(waypoints.map((w) => new THREE.Vector3(...w.position)), false, 'catmullrom', 0.35);
    this.lookCurve = new THREE.CatmullRomCurve3(waypoints.map((w) => new THREE.Vector3(...w.lookAt)), false, 'catmullrom', 0.35);
    this.tourLength = this.tourCurve.getLength();
    this.waypointU = this.solveWaypointU();
    this.tourU = 0;
    this.held.clear();
    this.holdRemaining = 0;
  }

  /** Where each waypoint sits along the spline, by nearest sample in arc-length space. */
  private solveWaypointU(): number[] {
    const curve = this.tourCurve;
    if (!curve) return [];
    const samples = 400;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= samples; i++) points.push(curve.getPointAt(i / samples));
    return this.waypoints.map((w) => {
      const target = new THREE.Vector3(...w.position);
      let best = 0;
      let bestD = Infinity;
      points.forEach((p, i) => {
        const d = p.distanceToSquared(target);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      return best / samples;
    });
  }

  setSpawn(spawn: SpawnPoint): void {
    // The spawn's own eye height is the reference: the camera has not been placed yet.
    const floor = pickFloorAt(this.colliders, spawn.position[0], spawn.position[2], spawn.position[1]);
    this.eye.set(spawn.position[0], Math.max(spawn.position[1], floor + EYE), spawn.position[2]);
    this.hoverY = this.eye.y;
    this.camera.position.copy(this.eye);
    const target = new THREE.Vector3(spawn.lookAt[0], spawn.lookAt[1], spawn.lookAt[2]);
    this.lookAt(target);
    this.velocity.set(0, 0, 0);
    this.onChange();
  }

  /** Put the camera anywhere, looking anywhere; used by the capture harness. */
  setCamera(position: readonly [number, number, number], lookAt: readonly [number, number, number]): void {
    this.mode = 'fly';
    this.eye.set(position[0], position[1], position[2]);
    this.camera.position.copy(this.eye);
    this.lookAt(new THREE.Vector3(lookAt[0], lookAt[1], lookAt[2]));
    this.onModeChange?.(this.mode, this.paused);
    this.onChange();
  }

  private lookAt(target: THREE.Vector3): void {
    const dir = target.clone().sub(this.camera.position);
    if (dir.lengthSq() < 1e-6) return;
    this.yaw = Math.atan2(-dir.x, -dir.z);
    this.pitch = Math.asin(THREE.MathUtils.clamp(dir.y / dir.length(), -1, 1));
    this.applyRotation();
  }

  private applyRotation(): void {
    this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
  }

  setMode(mode: ControlMode): void {
    if (mode === this.mode) return;
    if (this.mode === 'walk' && document.pointerLockElement === this.dom) document.exitPointerLock();
    this.mode = mode;
    this.velocity.set(0, 0, 0);
    if (mode === 'tour') this.tourU = 0;
    if (mode === 'walk') {
      const floor = this.floorAt(this.camera.position.x, this.camera.position.z);
      this.eye.set(this.camera.position.x, floor + EYE, this.camera.position.z);
      this.camera.position.copy(this.eye);
      const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
      this.yaw = euler.y;
      this.pitch = euler.x;
    }
    this.onModeChange?.(this.mode, this.paused);
    this.onChange();
  }

  /**
   * Standing height at (x, z). Rooms may declare a `floorAt` function for stairs and ramps; a flat
   * room falls back to its own floor level. Vertical movement is never a zone's job — a zone
   * that moves the camera itself fights this and loses.
   */
  floorAt(x: number, z: number): number {
    return pickFloorAt(this.colliders, x, z, this.camera.position.y);
  }

  /**
   * Collision: a point is walkable when it stands inside some room, kept a body's radius off every
   * closed face. A face with a portal covering the point is open, so you walk through doorways and
   * never through walls.
   */
  walkable(x: number, z: number, radius = PLAYER_RADIUS): boolean {
    for (const room of this.colliders) {
      if (insideRoom(room, x, z, radius)) return true;
    }
    return false;
  }

  update(dt: number): boolean {
    if (this.mode === 'walk') return this.updateWalk(dt);
    if (this.mode === 'fly') return this.updateFly(dt);
    return this.updateTour(dt);
  }

  private updateWalk(dt: number): boolean {
    const forward = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
    const strafe = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    const running = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const speed = running ? RUN_SPEED : WALK_SPEED;

    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    const wish = new THREE.Vector3(-sin * forward + cos * strafe, 0, -cos * forward - sin * strafe);
    if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(speed);

    const blend = 1 - Math.exp(-ACCEL * dt);
    this.velocity.x += (wish.x - this.velocity.x) * blend;
    this.velocity.z += (wish.z - this.velocity.z) * blend;
    if (wish.lengthSq() === 0) {
      const damp = Math.exp(-FRICTION * dt);
      this.velocity.x *= damp;
      this.velocity.z *= damp;
    }

    let moved = false;
    const nx = this.camera.position.x + this.velocity.x * dt;
    const nz = this.camera.position.z + this.velocity.z * dt;
    const x = this.camera.position.x;
    const z = this.camera.position.z;

    // Axis-separated slide so you rub along a wall instead of sticking to it.
    if (this.walkable(nx, z)) {
      this.camera.position.x = nx;
      moved = true;
    } else {
      this.velocity.x = 0;
    }
    if (this.walkable(this.camera.position.x, nz)) {
      this.camera.position.z = nz;
      moved = true;
    } else {
      this.velocity.z = 0;
    }

    const floor = this.floorAt(this.camera.position.x, this.camera.position.z);
    const targetY = floor + EYE;
    // Smooth the step between rooms of different floor height.
    const dy = targetY - this.camera.position.y;
    if (Math.abs(dy) > 0.001) {
      this.camera.position.y += dy * Math.min(1, dt * 9);
      moved = true;
    }
    if (moved) this.onChange();
    return moved;
  }

  private updateFly(dt: number): boolean {
    const boost = this.keys.has('ShiftLeft') ? 4 : 1;
    const speed = 9 * boost;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const move = new THREE.Vector3();
    if (this.keys.has('KeyW')) move.add(forward);
    if (this.keys.has('KeyS')) move.sub(forward);
    if (this.keys.has('KeyD')) move.add(right);
    if (this.keys.has('KeyA')) move.sub(right);
    if (this.keys.has('KeyE')) move.y += 1;
    if (this.keys.has('KeyQ')) move.y -= 1;
    if (move.lengthSq() === 0) return false;
    move.normalize().multiplyScalar(speed * dt);
    this.camera.position.add(move);
    this.onChange();
    return true;
  }

  private updateTour(dt: number): boolean {
    if (!this.tourCurve || !this.lookCurve) return false;
    if (this.paused) return false;

    // A waypoint can ask the camera to dwell before moving on.
    if (this.holdRemaining > 0) {
      this.holdRemaining = Math.max(0, this.holdRemaining - dt);
      this.onChange();
      return true;
    }

    const du = this.tourLength > 0 ? (this.tourSpeed * dt) / this.tourLength : 0;
    const before = this.tourU;
    this.tourU = Math.min(1, this.tourU + du);
    this.applyWaypointFov();
    this.waypointU.forEach((u, i) => {
      const holdMs = this.waypoints[i]?.holdMs ?? 0;
      if (holdMs <= 0 || this.held.has(i)) return;
      if (before <= u && this.tourU >= u - 1e-6) {
        this.held.add(i);
        this.holdRemaining = holdMs / 1000;
      }
    });
    this.tourCurve.getPointAt(this.tourU, this.eye);
    this.lookCurve.getPointAt(this.tourU, this.tourLook);
    this.camera.position.copy(this.eye);
    this.lookTarget.copy(this.tourLook);
    // Eased look: turn toward the new target rather than snapping.
    const desired = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().lookAt(this.camera.position, this.lookTarget, new THREE.Vector3(0, 1, 0)),
    );
    this.camera.quaternion.slerp(desired, 1 - Math.exp(-4 * dt));
    this.onChange();
    if (this.tourU >= 1) {
      this.paused = true;
      this.onModeChange?.(this.mode, this.paused);
    }
    return true;
  }

  /**
   * Step the tour forward without a browser frame loop and report where it got to.
   * The capture harness uses this to prove the guided path is continuous and error-free.
   */
  tourProgressAfter(seconds: number): { x: number; y: number; z: number; u: number } {
    const mode = this.mode;
    const paused = this.paused;
    this.mode = 'tour';
    this.paused = false;
    const steps = Math.max(1, Math.ceil(seconds * 60));
    for (let i = 0; i < steps; i++) this.updateTour(1 / 60);
    const out = {
      x: Math.round(this.camera.position.x * 100) / 100,
      y: Math.round(this.camera.position.y * 100) / 100,
      z: Math.round(this.camera.position.z * 100) / 100,
      u: Math.round(this.tourU * 1000) / 1000,
    };
    this.mode = mode;
    this.paused = paused;
    return out;
  }

  /** Vertical FOV for the current spline position, interpolated between waypoints. */
  private applyWaypointFov(): void {
    const n = this.waypoints.length;
    if (n === 0) return;
    let lo = 0;
    for (let i = 0; i < n; i++) if ((this.waypointU[i] ?? 0) <= this.tourU) lo = i;
    const hi = Math.min(n - 1, lo + 1);
    const uLo = this.waypointU[lo] ?? 0;
    const uHi = this.waypointU[hi] ?? 1;
    const t = uHi > uLo ? Math.min(1, Math.max(0, (this.tourU - uLo) / (uHi - uLo))) : 0;
    const fovLo = this.waypoints[lo]?.fov ?? this.baseFov;
    const fovHi = this.waypoints[hi]?.fov ?? this.baseFov;
    const fov = fovLo + (fovHi - fovLo) * t;
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }

  restartTour(): void {
    this.tourU = 0;
    this.held.clear();
    this.holdRemaining = 0;
    this.paused = false;
    this.onModeChange?.(this.mode, this.paused);
    this.onChange();
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Digit1') this.setMode('walk');
    else if (e.code === 'Digit2') this.setMode('tour');
    else if (e.code === 'Digit3') this.setMode('fly');
    else if (e.code === 'Space' && this.mode === 'tour') {
      this.paused = !this.paused;
      this.onModeChange?.(this.mode, this.paused);
      e.preventDefault();
    } else if (e.code === 'KeyR' && this.mode === 'tour') {
      this.restartTour();
    }
    this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private onMouseDown = (): void => {
    if (this.mode === 'walk' && document.pointerLockElement !== this.dom) {
      void this.dom.requestPointerLock();
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (this.mode !== 'walk' && this.mode !== 'fly') return;
    if (document.pointerLockElement !== this.dom) return;
    this.yaw -= e.movementX * 0.0022;
    this.pitch = THREE.MathUtils.clamp(this.pitch - e.movementY * 0.0022, -1.45, 1.45);
    this.applyRotation();
    this.onChange();
  };

  private onPointerLockChange = (): void => {
    this.onModeChange?.(this.mode, this.paused);
  };

  get pointerLocked(): boolean {
    return document.pointerLockElement === this.dom;
  }

  get cameraYawPitch(): { yaw: number; pitch: number } {
    return { yaw: this.yaw, pitch: this.pitch };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.dom.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
  }
}
