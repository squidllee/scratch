import { roomFloorAt, type RoomDef, type RoomPortal } from './culling';
import type { TourWaypoint } from './controls';

/**
 * The guided tour, built from the measured route instead of from hand-placed camera points.
 *
 * `route.json` gives an ordered list of rooms — the walk a visitor actually makes: Cour Napoléon,
 * down under the pyramid, east to the Daru staircase, the Salle des États, 268 m of Grande Galerie,
 * the Galerie d'Apollon, the courts of the Richelieu wing. The zones supply the geometry and the
 * portals, not the itinerary.
 *
 * Between one room and the next the spline is threaded through the doors that join them, read from
 * the assembled room graph rather than guessed. Where the route hops a room that is not its
 * neighbour — the spec notes step 14 comes back "along the Caryatides" — the leg is walked through
 * the graph instead of flown through the wall. A tour that cuts corners through masonry is the
 * symptom of a portal graph with a hole in it, so every leg that could not be routed is reported.
 */

export interface RouteStep {
  n: number;
  room: string;
  note?: string;
}

export interface BuiltTour {
  waypoints: TourWaypoint[];
  /** Route legs with no path through the room graph: the spline goes through a wall. */
  unrouted: Array<{ from: string; to: string }>;
  /** Waypoints that landed on a room id no zone declared. */
  unknownRooms: string[];
  /** Legs walked through intermediate rooms rather than door-to-door. */
  detours: Array<{ from: string; to: string; via: string[] }>;
  lengthM: number;
}

const EYE = 1.65;
const HOLD_MS = 900;

export interface Hop {
  to: string;
  portal: RoomPortal;
}

/** Breadth-first walk of the room graph. Returns the doorways to cross, or null if there is none. */
export function findPath(byId: ReadonlyMap<string, RoomDef>, from: string, to: string): Hop[] | null {
  if (from === to) return [];
  const parent = new Map<string, { room: string; portal: RoomPortal }>();
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length) {
    const id = queue.shift() as string;
    for (const portal of byId.get(id)?.portals ?? []) {
      if (seen.has(portal.to) || !byId.has(portal.to)) continue;
      seen.add(portal.to);
      parent.set(portal.to, { room: id, portal });
      if (portal.to === to) {
        const hops: Hop[] = [];
        let cursor = to;
        while (cursor !== from) {
          const step = parent.get(cursor) as { room: string; portal: RoomPortal };
          hops.unshift({ to: cursor, portal: step.portal });
          cursor = step.room;
        }
        return hops;
      }
      queue.push(portal.to);
    }
  }
  return null;
}

/**
 * One waypoint per room, plus one inside every doorway on the way.
 *
 * The eye sits at the room's own floor height — a stair room's `floorAt` is asked at its centre, so
 * the Daru staircase is entered at its foot rather than at its ceiling — and looks at wherever the
 * tour goes next, so the camera turns before it arrives instead of after.
 */
export function buildTour(route: readonly RouteStep[], rooms: readonly RoomDef[]): BuiltTour {
  const byId = new Map(rooms.map((r) => [r.id, r]));
  const points: Array<{ position: [number, number, number]; room: string; door?: boolean }> = [];
  const unrouted: Array<{ from: string; to: string }> = [];
  const unknownRooms: string[] = [];
  const detours: Array<{ from: string; to: string; via: string[] }> = [];

  const roomPoint = (room: RoomDef) => {
    const cx = (room.bounds.min[0] + room.bounds.max[0]) / 2;
    const cz = (room.bounds.min[2] + room.bounds.max[2]) / 2;
    return { position: [cx, roomFloorAt(room, cx, cz) + EYE, cz] as [number, number, number], room: room.id };
  };

  const push = (p: { position: [number, number, number]; room: string; door?: boolean }) => {
    const last = points[points.length - 1];
    if (last && Math.hypot(last.position[0] - p.position[0], last.position[2] - p.position[2]) < 0.6) return;
    points.push(p);
  };

  for (let i = 0; i < route.length; i++) {
    const step = route[i] as RouteStep;
    const room = byId.get(step.room);
    if (!room) {
      unknownRooms.push(step.room);
      continue;
    }
    push(roomPoint(room));

    const next = route[i + 1];
    if (!next) break;
    if (!byId.has(next.room)) continue;
    if (next.room === room.id) continue;

    const hops = findPath(byId, room.id, next.room);
    if (!hops) {
      unrouted.push({ from: room.id, to: next.room });
      continue;
    }
    if (hops.length > 1) detours.push({ from: room.id, to: next.room, via: hops.map((h) => h.to) });
    const floor = roomFloorAt(room, room.bounds.min[0], room.bounds.min[2]);
    for (const hop of hops) {
      push({
        position: [
          hop.portal.centre[0],
          Math.max(hop.portal.centre[1], floor + EYE),
          hop.portal.centre[2],
        ],
        room: hop.to,
        door: true,
      });
    }
  }

  const waypoints: TourWaypoint[] = points.map((p, i) => {
    const ahead = points[i + 1] ?? points[i - 1];
    const lookAt: [number, number, number] = ahead
      ? [
          ahead.position[0] + (ahead.position[0] - p.position[0]) * 0.25,
          ahead.position[1] + (ahead.position[1] - p.position[1]) * 0.25,
          ahead.position[2] + (ahead.position[2] - p.position[2]) * 0.25,
        ]
      : [p.position[0], p.position[1], p.position[2] - 6];
    return {
      position: p.position,
      lookAt,
      holdMs: p.door ? 0 : HOLD_MS,
      label: p.door ? undefined : p.room,
    };
  });

  let lengthM = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1] as { position: [number, number, number] };
    const b = points[i] as { position: [number, number, number] };
    lengthM += Math.hypot(b.position[0] - a.position[0], b.position[1] - a.position[1], b.position[2] - a.position[2]);
  }

  return { waypoints, unrouted, unknownRooms, detours, lengthM: Math.round(lengthM * 10) / 10 };
}
