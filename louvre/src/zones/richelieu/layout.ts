/**
 * The Richelieu wing interior, in the measured frame.
 *
 * Every number here comes from `handoffs/louvre/spec/route.json` (rooms, footprints, floors,
 * clear heights) and `coordinates.md` (the zone box). Keep this file the single source of truth:
 * geometry and the room graph both read it, so a room cannot drift out of its declared cell.
 *
 * Zone box: x -84 … +116, y -9.5 … 20.4, z -141 … -70.5.
 *
 * Levels in this wing do not agree, which is the interesting part of building it:
 *   passage 0 · Cour Marly 0 · Cour Puget -4.5 · Cour Khorsabad 0
 *   Richelieu stair 1 at its foot, 7 at its head · Napoleon III salon 7
 * So the wing is stitched together with flights of stone steps, and each flight is a run of thin
 * walkable cells (the engine's floor lookup is 2D: the only way to change level is to change room).
 */

export interface Cell {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  floor: number;
  ceil: number;
}

/** Thickness of the wing's stone walls. */
export const WALL_T = 0.9;

export const ZONE_BOX = { x: [-84, 116] as const, y: [-9.5, 28.7] as const, z: [-141, -70.5] as const };

/** The cornice line: the courtyard walls stop here and the glazed vaults rise above it. */
export const CORNICE = 20.4;

export const passage: Cell = { x0: -30, x1: -16, z0: -122, z1: -70.5, floor: 0, ceil: 5 };
/** Topped at 26.4: Pei's vault is propped on the courtyard cornice and rises 6 m above it. */
export const marly: Cell = { x0: -84, x1: -30, z0: -129, z1: -88, floor: 0, ceil: 26.4 };
/** Floor 4.5 m below the passage and the same 26.4 m top: 30.9 m clear, the tallest room here. */
export const puget: Cell = { x0: -16, x1: 34, z0: -129, z1: -88, floor: -4.5, ceil: 26.4 };
export const khorsabad: Cell = { x0: 34, x1: 66, z0: -129, z1: -88, floor: 0, ceil: 24 };
export const hammurabi: Cell = { x0: 66, x1: 90, z0: -116, z1: -90, floor: 0, ceil: 5.5 };
/** Level-1 stair hall between the passage and the salon; the flight climbs 1 → 7 inside it. */
export const escalier: Cell = { x0: -30, x1: -16, z0: -141, z1: -122, floor: 1, ceil: 17 };
export const salon: Cell = { x0: -60, x1: -30, z0: -141, z1: -122, floor: 7, ceil: 13.5 };

/** Raised terrace at the west end of Cour Marly, where the Marly Horses stand. */
export const marlyTerrace: Cell = { x0: -84, x1: -76, z0: -129, z1: -88, floor: 2, ceil: 26.4 };
/** The stair down from that terrace, 23 m wide, centred on the court's long axis. */
export const MARLY_STAIR_Z: readonly [number, number] = [-120, -97];

/** Raised gallery along Cour Puget's west side, level with the passage. */
export const pugetTerrace: Cell = { x0: -16, x1: -12, z0: -129, z1: -88, floor: 0, ceil: 13.5 };
export const PUGE_STAIR_Z: readonly [number, number] = [-118, -99];
/**
 * Horizontal runs of the two Puget flights: down from the west gallery, up to Khorsabad. The room's
 * `floorAt` ramps between these, and the treads are built to match, so the eye and the stone agree.
 */
export const PUGE_DESCENT_X: readonly [number, number] = [-12.1, -2.1];
export const PUGE_ASCENT_X: readonly [number, number] = [24.1, 34];

/** Bays of the passage arcade: four arched openings into each court. */
export const arcadeBays = (z0: number, z1: number, count: number, width: number): number[] => {
  const pitch = (z1 - z0) / count;
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(z0 + pitch * (i + 0.5));
  return out;
};

// The arcade can only open where the passage and the courts share a length of wall.
export const MARLY_BAYS = arcadeBays(passage.z0, marly.z1, 4, 4.6);
export const PUGET_BAYS = MARLY_BAYS;

/** Passage → escalier door, in the passage's north wall; escalier → salon door at level 1. */
export const ESCALIER_DOOR_X = -23;
export const SALON_DOOR_Z = -138;
export const ESCALIER_FOOT_Z = -124;
export const ESCALIER_HEAD_Z = -136;

/** Widths of the connective flights. */
export const MARLY_STAIR_WIDTH = MARLY_STAIR_Z[1] - MARLY_STAIR_Z[0];

export const centre = (c: Cell): [number, number, number] => [(c.x0 + c.x1) / 2, c.floor, (c.z0 + c.z1) / 2];

/**
 * A flight of stone steps expressed as walkable cells. Each cell is one step of the eye's climb:
 * the engine lifts the camera by `floor` when the walker crosses into the next cell, so bands are
 * kept at least a metre deep (a walker's radius is 0.3 m) and rises at 0.67–0.75 m, which reads as
 * a step rather than a jump.
 */
export interface FlightStep {
  id: string;
  cell: Cell;
}

export function flightUp(id: string, x0: number, x1: number, z0: number, z1: number, from: number, to: number, steps: number, ceil: number): FlightStep[] {
  const out: FlightStep[] = [];
  const run = (x1 - x0) / steps;
  for (let i = 1; i <= steps; i++) {
    out.push({
      id: `${id}-${i}`,
      cell: { x0: x0 + run * (i - 1), x1: x0 + run * i, z0, z1, floor: from + ((to - from) * i) / steps, ceil },
    });
  }
  return out;
}
