import * as THREE from 'three';
import type { RoomDef } from '../core/culling';
import type { SpawnPoint } from '../core/controls';
import type { Rng } from '../core/rng';
import type { ArtworkLibrary } from '../artworks/types';

/** The five zone ids. Fixed: the registry and the tour reference them by name. */
export type ZoneId = 'pyramid' | 'exterior' | 'denon' | 'sully' | 'richelieu';

/** The proof gallery. Ships with the foundation and is expected to be deleted at integration. */
export const EXAMPLE_ZONE = 'example';

export type AnyZoneId = ZoneId | typeof EXAMPLE_ZONE;

export interface ZoneContext {
  /** Seeded stream for the zone. `ctx.rng()` is stable for this zone id across runs. */
  rng: (label?: string) => Rng;
  /** Artwork factories, looked up by id. Never construct an artwork inline. */
  artworks: ArtworkLibrary;
  /** The renderer's device pixel ratio cap, for LOD decisions. */
  pixelRatio: number;
}

/**
 * A zone is one wing of the museum: its own geometry, its own rooms, its own spawn points.
 * The engine adds `group` to the scene, culls by `rooms`, and never inspects a zone's internals.
 */
export interface Zone {
  id: AnyZoneId;
  /** Rooms for portal culling and walk collision. Must cover all walkable interior space. */
  rooms: RoomDef[];
  /** All of this zone's geometry. Steam: merge by material, one sub-group per room. */
  group: THREE.Group;
  /**
   * Per-room geometry, for portal culling: the engine hides a room's object when its cell is not
   * active. Optional — a zone without it is drawn whole whenever any of its rooms is active.
   */
  roomGroups?: Map<string, THREE.Object3D>;
  /** Named viewpoints. The tour and the capture harness address these by id. */
  spawnPoints: SpawnPoint[];
  /** Optional per-frame work (animated water, flickering light, exhibit turntables). */
  update?(dt: number, camera: THREE.PerspectiveCamera): void;
  /** Release every geometry and texture this zone allocated. */
  dispose(): void;
}

export type ZoneFactory = (ctx: ZoneContext) => Zone | Promise<Zone>;
