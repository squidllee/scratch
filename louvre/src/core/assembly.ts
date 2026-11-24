import * as THREE from 'three';
import type { RoomDef, RoomPortal } from './culling';
import type { SpawnPoint } from './controls';
import type { Zone } from '../zones/types';

/**
 * Assembly: turning five independently built zones into one museum.
 *
 * Every zone declares only its own rooms, so a portal naming another zone's room resolved to
 * nothing when that zone stood alone. Here the rooms are unioned into one graph keyed by room id:
 * the culler walks a corridor from the Hall Napoléon into the Denon wing because both ends of the
 * doorway are in the same map. Duplicate ids are reported rather than silently overwritten,
 * because a shadowed room is a room whose objects never get culled.
 */
export interface Assembly {
  rooms: RoomDef[];
  /** Room id -> the object the culler hides. One entry per room across every zone. */
  roomObjects: Map<string, THREE.Object3D>;
  roomToZone: Map<string, string>;
  /** Spawn points, namespaced `<zone>/<id>` so two zones may both have a `cour-carree`. */
  spawns: SpawnPoint[];
  zones: Zone[];
  /** Rooms declared by more than one zone: the second zone's copy is dropped. */
  duplicateRooms: string[];
  /** Room ids two zones both map an object for. */
  duplicateObjects: string[];
}

export function assemble(zones: Zone[]): Assembly {
  const rooms: RoomDef[] = [];
  const roomObjects = new Map<string, THREE.Object3D>();
  const roomToZone = new Map<string, string>();
  const spawns: SpawnPoint[] = [];
  const duplicateRooms: string[] = [];
  const duplicateObjects: string[] = [];
  const seenRoom = new Set<string>();
  const seenSpawn = new Set<string>();

  for (const zone of zones) {
    for (const room of zone.rooms) {
      if (seenRoom.has(room.id)) {
        duplicateRooms.push(room.id + ' (kept by ' + (roomToZone.get(room.id) ?? '?') + ', redeclared by ' + zone.id + ')');
        continue;
      }
      seenRoom.add(room.id);
      rooms.push(room);
      roomToZone.set(room.id, zone.id);
    }

    for (const [id, obj] of zone.roomGroups) {
      if (roomObjects.has(id)) duplicateObjects.push(id + ' (' + zone.id + ')');
      else roomObjects.set(id, obj);
    }

    for (const spawn of zone.spawnPoints) {
      const id = zone.id + '/' + spawn.id;
      if (seenSpawn.has(id)) continue;
      seenSpawn.add(id);
      spawns.push({ ...spawn, id });
    }
  }

  return { rooms, roomObjects, roomToZone, spawns, zones, duplicateRooms, duplicateObjects };
}

export interface PortalAudit {
  rooms: number;
  portals: number;
  /** Portals whose far room is in no zone: the door opens onto nothing. */
  unresolved: Array<{ from: string; to: string; zone: string }>;
  /** Portals with no reciprocal on the far side. */
  oneWay: Array<{ from: string; to: string }>;
  /** Portals whose two ends belong to different zones: the ones assembly is here to prove. */
  crossZone: Array<{ from: string; to: string; fromZone: string; toZone: string }>;
}

/**
 * A portal is real only if its far room exists. This is the check a single zone cannot make and
 * the reason the museum looked walkable per zone and was not walkable assembled: every cross-zone
 * door was a name with no room behind it.
 */
export function auditPortals(rooms: readonly RoomDef[], roomToZone: ReadonlyMap<string, string>): PortalAudit {
  const byId = new Map(rooms.map((r) => [r.id, r]));
  const audit: PortalAudit = { rooms: rooms.length, portals: 0, unresolved: [], oneWay: [], crossZone: [] };
  for (const room of rooms) {
    for (const portal of room.portals ?? []) {
      audit.portals++;
      const far = byId.get(portal.to);
      if (!far) {
        audit.unresolved.push({ from: room.id, to: portal.to, zone: roomToZone.get(room.id) ?? '?' });
        continue;
      }
      const fromZone = roomToZone.get(room.id) ?? '?';
      const toZone = roomToZone.get(portal.to) ?? '?';
      if (fromZone !== toZone) audit.crossZone.push({ from: room.id, to: portal.to, fromZone, toZone });
      // Assembly-built connectors (spiral, seam, level link) are one-way by construction: they
      // only need to describe the opening from their own side, because the walker asks the room it
      // is standing in. A zone's own door with no mirror is a real fault.
      const connector = room.id.includes('/');
      const back = (far.portals ?? []).some((p) => p.to === room.id);
      if (!back && !connector) audit.oneWay.push({ from: room.id, to: portal.to });
    }
  }
  return audit;
}

/**
 * Rooms a visitor stands in with no roof over their head, which is when the exterior's façades are
 * worth drawing. The spec is explicit: a court has no `clearHeight_m`, a gallery always has one.
 */
export function openSkyRooms(specRooms: ReadonlyArray<{ id: string; clearHeight_m: number | null }>): Set<string> {
  return new Set(specRooms.filter((r) => r.clearHeight_m === null).map((r) => r.id));
}

export interface ReconcileReport {
  /** Portals added because the spec declares the link and the two rooms share a wall. */
  fromSpec: Array<{ from: string; to: string; width: number }>;
  /** Portals added as the mirror of a one-way declaration. */
  reciprocal: Array<{ from: string; to: string }>;
  /** Spec links between rooms that share no wall: nothing can be opened between them. */
  unbridgeable: Array<{ from: string; to: string; gapM: number }>;
  /** Threshold rooms added across a wall that two wings each built up to from their own side. */
  thresholds: Array<{ room: string; from: string; to: string; gapM: number }>;
}

interface Face {
  axis: 0 | 1 | 2;
  plane: number;
  centre: [number, number, number];
  width: number;
  height: number;
  normal: [number, number, number];
}

/**
 * The door between two rooms, from their boxes.
 *
 * Two rooms that share a wall touch on exactly one axis with a positive overlap on the other two;
 * the doorway is a slice of that shared face. The width is capped because a door is not a missing
 * wall: the culler and the walker both read this as an opening, and a 20 m hole in the east wall of
 * the Hall Napoléon would be a different building.
 */
const FACE_TOLERANCE = 2.5;
const DOOR_MAX_WIDTH = 5;

function sharedFace(a: RoomDef, b: RoomDef): Face | null {
  const overlap = (axis: 0 | 1 | 2): number =>
    Math.min(a.bounds.max[axis], b.bounds.max[axis]) - Math.max(a.bounds.min[axis], b.bounds.min[axis]);

  for (const axis of [0, 2] as const) {
    const touching =
      Math.abs(a.bounds.max[axis] - b.bounds.min[axis]) <= FACE_TOLERANCE ||
      Math.abs(b.bounds.max[axis] - a.bounds.min[axis]) <= FACE_TOLERANCE;
    const across = (axis === 0 ? 2 : 0) as 0 | 2;
    if (!touching || overlap(across) < 1.5) continue;

    const towardsB = (a.bounds.min[axis] + a.bounds.max[axis]) / 2 < (b.bounds.min[axis] + b.bounds.max[axis]) / 2;
    const plane = towardsB ? Math.max(a.bounds.min[axis], Math.min(a.bounds.max[axis], b.bounds.min[axis])) : Math.min(a.bounds.max[axis], Math.max(b.bounds.min[axis], b.bounds.max[axis]));
    const tangentCentre = (Math.max(a.bounds.min[across], b.bounds.min[across]) + Math.min(a.bounds.max[across], b.bounds.max[across])) / 2;
    const floor = Math.max(a.bounds.min[1], b.bounds.min[1]);
    const head = Math.min(a.bounds.max[1], b.bounds.max[1]);
    const height = Math.max(2.4, Math.min(head - floor, 6));
    const centre: [number, number, number] = [0, 0, 0];
    centre[axis] = plane;
    centre[across] = tangentCentre;
    centre[1] = floor + height / 2;
    const normal: [number, number, number] = [0, 0, 0];
    normal[axis] = towardsB ? 1 : -1;
    return { axis, plane, centre, width: Math.min(overlap(across), DOOR_MAX_WIDTH), height, normal };
  }

  // Stacked rooms: the roof of one is the floor of the next, so the opening is a stairwell.
  const stacked =
    Math.abs(a.bounds.max[1] - b.bounds.min[1]) <= FACE_TOLERANCE ||
    Math.abs(b.bounds.max[1] - a.bounds.min[1]) <= FACE_TOLERANCE;
  if (stacked && overlap(0) > 1.5 && overlap(2) > 1.5) {
    const up = (a.bounds.min[1] + a.bounds.max[1]) / 2 < (b.bounds.min[1] + b.bounds.max[1]) / 2;
    const plane = up ? b.bounds.min[1] : a.bounds.min[1];
    return {
      axis: 1,
      plane,
      centre: [
        (Math.max(a.bounds.min[0], b.bounds.min[0]) + Math.min(a.bounds.max[0], b.bounds.max[0])) / 2,
        plane,
        (Math.max(a.bounds.min[2], b.bounds.min[2]) + Math.min(a.bounds.max[2], b.bounds.max[2])) / 2,
      ],
      width: Math.min(overlap(0), overlap(2), DOOR_MAX_WIDTH),
      height: Math.min(3, Math.max(1.6, Math.abs(a.bounds.min[1] - b.bounds.min[1]))),
      normal: [0, up ? 1 : -1, 0],
    };
  }

  return null;
}

const gapBetween = (a: RoomDef, b: RoomDef): number => {
  // Per axis: no overlap means the distance between the two nearest faces, not zero. Taking
  // `max(0, lo - hi)` here reports every separated pair as joined.
  const d = (axis: 0 | 1 | 2): number => {
    const lo = Math.max(a.bounds.min[axis], b.bounds.min[axis]);
    const hi = Math.min(a.bounds.max[axis], b.bounds.max[axis]);
    return lo > hi ? lo - hi : 0;
  };
  return Math.round(Math.hypot(d(0), d(1), d(2)) * 10) / 10;
};

const MAX_SEAM_GAP = 6;

/**
 * A room filling the wall two neighbours each stopped at.
 *
 * The threshold is as wide as the two rooms' shared extents and as tall as the shorter of the two,
 * with a doorway on each end face and solid sides, so it is a passage and not a third room.
 */
function bridgeGap(
  a: RoomDef,
  b: RoomDef,
  aId: string,
  bId: string,
  width = 4,
): { room: RoomDef; toFrom: Face; toTo: Face } | null {
  const gapOf = (axis: 0 | 1 | 2): number => {
    const lo = Math.max(a.bounds.min[axis], b.bounds.min[axis]);
    const hi = Math.min(a.bounds.max[axis], b.bounds.max[axis]);
    return lo > hi ? lo - hi : 0;
  };
  // The seam is horizontal: the larger of the two plan gaps is the axis to bridge.
  const axis: 0 | 2 = gapOf(0) >= gapOf(2) ? 0 : 2;
  if (gapOf(axis) <= 0.01) return null;
  const across = (axis === 0 ? 2 : 0) as 0 | 2;

  // Where the two rooms come closest: the seam runs between those faces. Rooms that meet at a
  // corner (the passage and the Daru hall) have no shared extent at all, so the band is centred on
  // the corner and is as wide as the doorway that was declared there.
  const nearA = Math.min(Math.max(a.bounds.min[axis], b.bounds.min[axis]), a.bounds.max[axis], b.bounds.max[axis]);
  const nearB = Math.max(Math.min(a.bounds.max[axis], b.bounds.max[axis]), a.bounds.min[axis], b.bounds.min[axis]);
  const nearAcrossA = Math.min(Math.max(a.bounds.min[across], b.bounds.min[across]), a.bounds.max[across]);
  const nearAcrossB = Math.min(Math.max(b.bounds.min[across], a.bounds.min[across]), b.bounds.max[across]);
  const acrossCentre = (nearAcrossA + nearAcrossB) / 2;
  const half = Math.max(2, width / 2);

  const min: [number, number, number] = [0, Math.min(a.bounds.min[1], b.bounds.min[1]) - 0.1, 0];
  const max: [number, number, number] = [0, Math.max(a.bounds.min[1], b.bounds.min[1]) + 2.4, 0];
  min[axis] = Math.min(nearA, nearB);
  max[axis] = Math.max(nearA, nearB);
  min[across] = acrossCentre - half;
  max[across] = acrossCentre + half;

  const seam: RoomDef = { id: 'seam/' + aId + '~' + bId, bounds: { min, max }, portals: [] };
  const toFrom = sharedFace(seam, a);
  const toTo = sharedFace(seam, b);
  if (!toFrom || !toTo) return null;
  return { room: seam, toFrom, toTo };
}

/**
 * Repair the unioned portal graph.
 *
 * Two failures only show up once the wings are one building. A zone declared a door it could not
 * finish — `salon-carre -> rotonde-apollon` points at another wing's room, so the zone wrote the
 * name and nothing else — and the graph needs that door to be walkable in both directions. And a
 * portal declared one way only leaves the walker able to enter a room and unable to leave it,
 * because the walker reads openings from the room it is standing in.
 *
 * The spec is the authority for WHICH links exist (`route.json`'s 35 pairs); the geometry is the
 * authority for where the opening is. Both are applied here rather than guessed.
 */
export function reconcilePortals(
  rooms: RoomDef[],
  specPortals: ReadonlyArray<{ from: string; to: string }>,
): ReconcileReport {
  const byId = new Map(rooms.map((r) => [r.id, r]));
  const report: ReconcileReport = { fromSpec: [], reciprocal: [], unbridgeable: [], thresholds: [] };

  const has = (from: string, to: string): boolean =>
    (byId.get(from)?.portals ?? []).some((p) => p.to === to);

  const add = (from: string, to: string, face: Face): void => {
    const room = byId.get(from);
    if (!room) return;
    room.portals = room.portals ?? [];
    room.portals.push({ to, centre: face.centre, width: face.width, height: face.height, normal: face.normal });
  };

  const mirror = (face: Face): Face => ({
    ...face,
    normal: [-face.normal[0], -face.normal[1], -face.normal[2]],
  });

  for (const link of specPortals) {
    const a = byId.get(link.from);
    const b = byId.get(link.to);
    if (!a || !b) continue;
    const ab = has(link.from, link.to);
    const ba = has(link.to, link.from);
    if (ab && ba) continue;

    if (ab || ba) {
      // One side declared it; give the other side the mirror of what was built.
      const declared = ab
        ? (a.portals ?? []).find((p) => p.to === link.to)!
        : (b.portals ?? []).find((p) => p.to === link.from)!;
      const face: Face = {
        axis: 1,
        plane: declared.centre[1],
        centre: [declared.centre[0], declared.centre[1], declared.centre[2]],
        width: declared.width,
        height: declared.height,
        normal: [0, 0, 0],
      };
      add(ab ? link.to : link.from, ab ? link.from : link.to, mirror(face));
      report.reciprocal.push(ab ? { from: link.to, to: link.from } : { from: link.from, to: link.to });
      continue;
    }

    const face = sharedFace(a, b);
    if (!face) {
      // Two wings each stop at their own box edge, so the door between them opens onto a gap the
      // thickness of the wall. CONTRACT.md §5's answer is a thin threshold room that spans the
      // opening and is joined to both sides, which is what the visitor walks through.
      const gap = gapBetween(a, b);
      const threshold = gap <= MAX_SEAM_GAP ? bridgeGap(a, b, link.from, link.to) : null;
      if (threshold) {
        rooms.push(threshold.room);
        byId.set(threshold.room.id, threshold.room);
        add(threshold.room.id, link.from, threshold.toFrom);
        add(link.from, threshold.room.id, mirror(threshold.toFrom));
        add(threshold.room.id, link.to, threshold.toTo);
        add(link.to, threshold.room.id, mirror(threshold.toTo));
        report.thresholds.push({ room: threshold.room.id, from: link.from, to: link.to, gapM: gap });
      } else {
        report.unbridgeable.push({ from: link.from, to: link.to, gapM: gap });
      }
      continue;
    }
    add(link.from, link.to, face);
    add(link.to, link.from, mirror(face));
    report.fromSpec.push({ from: link.from, to: link.to, width: Math.round(face.width * 100) / 100 });
  }

  // Anything still one-way gets its reciprocal from the same opening, so a visitor who walks in
  // can walk out: the walker tests openings against the room it is currently in.
  for (const room of rooms) {
    for (const portal of [...(room.portals ?? [])]) {
      const far = byId.get(portal.to);
      if (!far || far.id === room.id) continue;
      if ((far.portals ?? []).some((p) => p.to === room.id)) continue;
      const face: Face = {
        axis: 1,
        plane: portal.centre[1],
        centre: [portal.centre[0], portal.centre[1], portal.centre[2]],
        width: portal.width,
        height: portal.height,
        normal: portal.normal ? [-portal.normal[0], -portal.normal[1], -portal.normal[2]] : [0, 0, 0],
      };
      add(far.id, room.id, face);
      report.reciprocal.push({ from: far.id, to: room.id });
    }
  }

  return report;
}

export interface LevelLink {
  room: string;
  kind: 'helix' | 'ramp' | 'threshold';
  from: string;
  to: string;
  riseM: number;
}

export interface SpiralSpec {
  outer: number;
  width: number;
  top: number;
  bottom: number;
  turns: number;
  power: number;
}

/**
 * A walkable surface for the pyramid's stone spiral.
 *
 * The pyramid zone builds the spiral — fifty treads winding 1.25 turns from the courtyard landing
 * down to the Hall Napoléon — but a stair that exists only as geometry cannot be climbed: the
 * courtyard's floor is the highest surface at or below the eye, so the eye never falls the nine
 * metres into the hall and the undercroft is unreachable on foot. This room is that stair's floor,
 * derived from the same plan (`SPIRAL`, exported by the pyramid) so collision sits on the stone.
 *
 * The inverse of the squircle: the tread ring is a rounded square, so a point's angle is recovered
 * by raising its coordinates to the same power the plan raised the cosine to. A point on the ring
 * is visited twice by 1.25 turns, so the two candidate heights are resolved against the eye.
 */
export function helixRoom(id: string, spec: SpiralSpec, links: [string, string]): RoomDef {
  const ring = spec.outer - spec.width / 2;
  const total = Math.PI * 2 * spec.turns;
  const k = spec.power / 2;
  const height = (t: number): number => spec.top + (spec.bottom - spec.top) * (t / total);
  return {
    id,
    bounds: {
      min: [-spec.outer - 1, spec.bottom - 0.1, -spec.outer - 1],
      max: [spec.outer + 1, spec.top + 2.2, spec.outer + 1],
    },
    floorAt: (x, z, eyeY = spec.top + 1.65) => {
      const r = Math.hypot(x, z);
      if (r < ring - spec.width / 2 - 0.5) return spec.bottom;
      if (r > spec.outer + 0.5) return spec.top;
      const theta = Math.atan2(
        Math.sign(z) * Math.pow(Math.abs(z / ring), k),
        Math.sign(x) * Math.pow(Math.abs(x / ring), k),
      );
      const angle = theta < 0 ? theta + Math.PI * 2 : theta;
      const candidates = [angle, angle + Math.PI * 2]
        .filter((t) => t <= total + 0.05)
        .map(height);
      const below = candidates.filter((h) => h <= eyeY + 0.5);
      if (below.length) return Math.max(...below);
      return Math.min(...candidates);
    },
    portals: links.map((to): RoomPortal => ({
      to,
      centre: [0, spec.top + 1, 0],
      width: spec.width,
      height: 2.4,
      normal: [0, 0, 0],
    })),
  };
}

/**
 * A ramp across a level change the two wings disagree about.
 *
 * The spec puts the Hall Napoléon at −9 m and the Denon wing's ground floor at 0, and joins them
 * with a doorway rather than a stair, so a visitor leaving the passage arrives at a wall of air.
 * The ramp spans the seam and hands the eye from one level to the other; every one built here is
 * reported, because it is a connector the zones did not build.
 */
export function rampRoom(
  id: string,
  lower: RoomDef,
  upper: RoomDef,
  face: Face,
  links: [string, string],
): RoomDef | null {
  const rise = Math.abs(upper.bounds.min[1] - lower.bounds.min[1]);
  const axis = face.axis === 2 ? 2 : 0;
  const run = Math.min(rise * 1.8, 14);
  const lo = face.plane - run / 2;
  const hi = face.plane + run / 2;
  const loFloor = lower.bounds.min[1];
  const hiFloor = upper.bounds.min[1];
  const min: [number, number, number] = [0, Math.min(loFloor, hiFloor) - 0.1, 0];
  const max: [number, number, number] = [0, Math.max(loFloor, hiFloor) + 2.2, 0];
  min[axis] = lo;
  max[axis] = hi;
  const across = (axis === 0 ? 2 : 0) as 0 | 2;
  const centreAcross = face.centre[across];
  const half = Math.max(1.6, face.width / 2);
  min[across] = centreAcross - half;
  max[across] = centreAcross + half;
  const down = upper.bounds.min[1] > lower.bounds.min[1];
  return {
    id,
    bounds: { min, max },
    floorAt: (x, z) => {
      const t = Math.min(1, Math.max(0, (((axis === 0 ? x : z) - lo) / (hi - lo))));
      return down ? hiFloor + (loFloor - hiFloor) * t : loFloor + (hiFloor - loFloor) * t;
    },
    portals: links.map((to): RoomPortal => ({
      to,
      centre: face.centre,
      width: face.width,
      height: 2.6,
      normal: face.normal,
    })),
  };
}

/**
 * Build the walkable connectors the wings left out.
 *
 * Two kinds. A **threshold** spans a seam: two wings each stopped at their own box edge, so the
 * doorway between them opens onto a strip of no-room and the walker falls out of the world. That
 * strip is bridged whatever the heights are, because it is a hole and not a design choice. A
 * **ramp** spans a level change between two rooms that do touch, and is only built where no stair
 * of the zones' own already serves the pair.
 */
export function addLevelLinks(
  rooms: RoomDef[],
  options: { spiral?: { id: string; spec: SpiralSpec; links: [string, string] } } = {},
): LevelLink[] {
  const links: LevelLink[] = [];
  const built = new Set<string>();
  const pairKey = (a: string, b: string): string => [a, b].sort().join('~');

  if (options.spiral) {
    const room = helixRoom(options.spiral.id, options.spiral.spec, options.spiral.links);
    rooms.push(room);
    built.add(pairKey(options.spiral.links[0], options.spiral.links[1]));
    links.push({
      room: room.id,
      kind: 'helix',
      from: options.spiral.links[0],
      to: options.spiral.links[1],
      riseM: Math.round(Math.abs(options.spiral.spec.top - options.spiral.spec.bottom) * 10) / 10,
    });
  }

  // A seam: the two rooms do not touch, and the doorway between them is in the gap.
  for (const room of [...rooms]) {
    for (const portal of room.portals ?? []) {
      const far = rooms.find((r) => r.id === portal.to);
      if (!far) continue;
      const key = pairKey(room.id, far.id);
      if (built.has(key)) continue;
      const gap = gapBetween(room, far);
      if (gap <= 0.01 || gap > MAX_SEAM_GAP) continue;
      const bridged = bridgeGap(room, far, room.id, far.id, Math.max(4, portal.width));
      if (!bridged) continue;
      // The threshold carries the level too: its floor is a ramp between the two when they differ.
      const rise = Math.abs(far.bounds.min[1] - room.bounds.min[1]);
      if (rise > 1.5) {
        const lower = room.bounds.min[1] < far.bounds.min[1] ? room : far;
        const upper = lower === room ? far : room;
        const axis = (bridged.toFrom.axis === 2 ? 2 : 0) as 0 | 2;
        const lo = bridged.room.bounds.min[axis];
        const hi = bridged.room.bounds.max[axis];
        const down = bridged.toFrom.plane < bridged.toTo.plane;
        bridged.room.floorAt = (x, z) => {
          const along = axis === 0 ? x : z;
          const t = Math.min(1, Math.max(0, (down ? along - lo : hi - along) / Math.max(0.01, hi - lo)));
          return upper.bounds.min[1] + (lower.bounds.min[1] - upper.bounds.min[1]) * t;
        };
        const min = [bridged.room.bounds.min[0], Math.min(room.bounds.min[1], far.bounds.min[1]) - 0.1, bridged.room.bounds.min[2]] as [number, number, number];
        const max = [bridged.room.bounds.max[0], upper.bounds.min[1] + 2.4, bridged.room.bounds.max[2]] as [number, number, number];
        bridged.room.bounds = { min, max };
      } else {
        const min = [bridged.room.bounds.min[0], Math.min(room.bounds.min[1], far.bounds.min[1]) - 0.1, bridged.room.bounds.min[2]] as [number, number, number];
        bridged.room.bounds = { min, max: bridged.room.bounds.max };
      }
      rooms.push(bridged.room);
      built.add(key);
      const faceFrom = bridged.toFrom;
      const faceTo = bridged.toTo;
      const push = (from: string, to: string, face: Face): void => {
        const target = rooms.find((r) => r.id === from);
        if (!target) return;
        target.portals = target.portals ?? [];
        target.portals.push({ to, centre: face.centre, width: face.width, height: face.height, normal: face.normal });
      };
      // A doorway declared from one wing into another has no opening to sit in until the seam
      // exists, so its centre is wherever the zone guessed. Now that the mouth is known, the
      // declared portal is moved onto it: the walker and the tour both follow portal centres.
      const rePoint = (owner: RoomDef, target: string, face: Face): void => {
        const declared = (owner.portals ?? []).find((p) => p.to === target);
        if (!declared) return;
        declared.centre = face.centre;
        declared.width = Math.min(declared.width, face.width + 0.4);
        declared.height = Math.min(declared.height, face.height);
      };
      rePoint(room, far.id, faceFrom);
      rePoint(far, room.id, faceTo);
      push(bridged.room.id, room.id, faceFrom);
      push(bridged.room.id, far.id, faceTo);
      push(room.id, bridged.room.id, { ...faceFrom, normal: [-faceFrom.normal[0], -faceFrom.normal[1], -faceFrom.normal[2]] });
      push(far.id, bridged.room.id, { ...faceTo, normal: [-faceTo.normal[0], -faceTo.normal[1], -faceTo.normal[2]] });
      links.push({
        room: bridged.room.id,
        kind: rise > 1.5 ? 'ramp' : 'threshold',
        from: room.id,
        to: far.id,
        riseM: Math.round(rise * 10) / 10,
      });
    }
  }

  // A level change between rooms that do touch, where no stair of the wing's own serves the pair.
  for (const room of [...rooms]) {
    for (const portal of room.portals ?? []) {
      const far = rooms.find((r) => r.id === portal.to);
      if (!far || far.floorAt || room.floorAt) continue;
      const rise = Math.abs(far.bounds.min[1] - room.bounds.min[1]);
      if (rise <= 1.5) continue;
      const key = pairKey(room.id, far.id);
      if (built.has(key)) continue;
      const face = sharedFace(room, far);
      if (!face) continue;
      const lower = room.bounds.min[1] < far.bounds.min[1] ? room : far;
      const upper = lower === room ? far : room;
      const ramp = rampRoom('link/' + key, lower, upper, face, [room.id, far.id]);
      if (!ramp) continue;
      built.add(key);
      rooms.push(ramp);
      links.push({ room: ramp.id, kind: 'ramp', from: room.id, to: far.id, riseM: Math.round(rise * 10) / 10 });
    }
  }
  return links;
}
