import * as THREE from 'three';
import type { Aabb } from './types';

/** A doorway or opening between two rooms. Directed: declared on the room you are in. */
export interface RoomPortal {
  /** Id of the room on the far side. */
  to: string;
  /** Centre of the opening in world metres. */
  centre: readonly [number, number, number];
  /** Clear width and height of the opening. */
  width: number;
  height: number;
  /** Normal of the opening plane, pointing out of this room. Optional; used for a cheap facing test. */
  normal?: readonly [number, number, number];
}

export interface RoomDef {
  id: string;
  /** Interior bounds in world metres. Used for camera containment and fallback distance culling. */
  bounds: Aabb;
  portals?: RoomPortal[];
  /**
   * Walkable floor height at (x, z) in metres. Defaults to `bounds.min[1]`, which is right for a
   * flat room. Supply a function for stairs, ramps, or a stepped dais: the walker asks this every
   * frame and puts the eye at `height + 1.65 m`, so the camera climbs the stair with you.
   */
  floorAt?: (x: number, z: number) => number;
}

/** The floor height the walker should stand on at (x, z), used by controls and probeable directly. */
export function roomFloorAt(room: RoomDef, x: number, z: number): number {
  return room.floorAt ? room.floorAt(x, z) : room.bounds.min[1];
}

export interface CullerOptions {
  /** Portal hops to follow from the camera's room. Defaults 2. */
  depth?: number;
  /** Skip rooms whose centre is further than this. Defaults 90 m. */
  maxDistance?: number;
}

export interface CullResult {
  active: string[];
  depthOf: Record<string, number>;
  cameraRoom: string | null;
  reason: string;
}

const inside = (b: Aabb, p: THREE.Vector3, pad = 0): boolean =>
  p.x >= b.min[0] - pad && p.x <= b.max[0] + pad &&
  p.y >= b.min[1] - pad && p.y <= b.max[1] + pad &&
  p.z >= b.min[2] - pad && p.z <= b.max[2] + pad;

const centreOf = (b: Aabb): THREE.Vector3 =>
  new THREE.Vector3((b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2);

/**
 * Room-graph cell culling.
 *
 * A zone declares its rooms as bounds plus portals. The engine draws the room the camera stands
 * in, then follows portals outward (default two hops) so the view down a gallery stays populated,
 * and drops everything else. When the camera is outside every room (exterior views, fly camera)
 * it falls back to distance culling from the nearest room.
 */
export class RoomCuller {
  readonly rooms = new Map<string, RoomDef>();
  private readonly depth: number;
  private readonly maxDistance: number;
  private readonly frustum = new THREE.Frustum();
  private readonly projScreen = new THREE.Matrix4();
  private readonly portalBox = new THREE.Box3();
  private readonly tmp = new THREE.Vector3();
  last: CullResult = { active: [], depthOf: {}, cameraRoom: null, reason: 'uninitialised' };

  constructor(rooms: RoomDef[], opts: CullerOptions = {}) {
    for (const r of rooms) this.rooms.set(r.id, r);
    this.depth = opts.depth ?? 2;
    this.maxDistance = opts.maxDistance ?? 90;
  }

  setRooms(rooms: RoomDef[]): void {
    this.rooms.clear();
    for (const r of rooms) this.rooms.set(r.id, r);
  }

  /** Cheap portal test: the opening's box must be inside the view frustum. */
  private portalVisible(camera: THREE.Camera, portal: RoomPortal): boolean {
    const halfW = portal.width / 2;
    const halfH = portal.height / 2;
    this.portalBox.setFromCenterAndSize(
      new THREE.Vector3(portal.centre[0], portal.centre[1], portal.centre[2]),
      new THREE.Vector3(
        Math.max(halfW * 2, 0.5),
        Math.max(halfH * 2, 0.5),
        0.6,
      ),
    );
    return this.frustum.intersectsBox(this.portalBox);
  }

  compute(camera: THREE.PerspectiveCamera): CullResult {
    this.projScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projScreen);

    const pos = camera.position;
    let cameraRoom: string | null = null;
    for (const room of this.rooms.values()) {
      if (inside(room.bounds, pos)) {
        cameraRoom = room.id;
        break;
      }
    }

    const depthOf: Record<string, number> = {};
    const active: string[] = [];

    if (!cameraRoom) {
      // Fallback: distance culling, nearest rooms first.
      const candidates = [...this.rooms.values()]
        .map((r) => ({ id: r.id, d: centreOf(r.bounds).distanceTo(pos) }))
        .filter((c) => c.d <= this.maxDistance)
        .sort((a, b) => a.d - b.d)
        .slice(0, 3);
      for (const c of candidates) {
        active.push(c.id);
        depthOf[c.id] = 0;
      }
      this.last = { active, depthOf, cameraRoom: null, reason: 'distance fallback' };
      return this.last;
    }

    active.push(cameraRoom);
    depthOf[cameraRoom] = 0;
    let frontier = [cameraRoom];
    for (let d = 1; d <= this.depth; d++) {
      const next: string[] = [];
      for (const id of frontier) {
        const room = this.rooms.get(id);
        if (!room?.portals) continue;
        for (const portal of room.portals) {
          if (depthOf[portal.to] !== undefined) continue;
          if (!this.rooms.has(portal.to)) continue;
          const far = this.rooms.get(portal.to) as RoomDef;
          if (centreOf(far.bounds).distanceTo(pos) > this.maxDistance) continue;
          if (!this.portalVisible(camera, portal)) continue;
          depthOf[portal.to] = d;
          active.push(portal.to);
          next.push(portal.to);
        }
      }
      if (next.length === 0) break;
      frontier = next;
    }

    // Always keep the room the camera is in, even if bounds are odd.
    this.last = { active, depthOf, cameraRoom, reason: 'room graph' };
    return this.last;
  }

  /** Apply the last computed result to a room -> object map (each zone room gets a group). */
  apply(objects: Map<string, THREE.Object3D>, result: CullResult = this.last): void {
    for (const [id, obj] of objects) obj.visible = result.depthOf[id] !== undefined;
  }

  /** Debug overlay data: which cells are drawn and why. */
  describe(): string[] {
    const r = this.last;
    if (r.active.length === 0) return ['cells: none'];
    return r.active.map((id) => {
      const d = r.depthOf[id] ?? 0;
      return 'cell ' + id + (d === 0 ? ' (camera)' : ' (portal -' + d + ')');
    });
  }
}

/** Shared singleton so the HUD and the engine agree on the active cell set. */
export const cullerInfo: { active: string[]; reason: string } = { active: [], reason: 'idle' };
