import type { ArtworkSpec } from '../../artworks/types';

/**
 * The Sully plan, once.
 *
 * Every number here comes from `route.json` (room footprints, floor levels, clear heights) or
 * `geometry.md` (bay widths, the 20.4 m cornice, the Colonnade's order). Doors are declared once in
 * world coordinates and both rooms cut the same hole, so a portal can never drift off its doorway.
 */

export interface RoomBox {
  x: readonly [number, number];
  z: readonly [number, number];
  /** Floor level and clear head above it. */
  y0: number;
  y1: number;
}

export const ROOMS = {
  /** First in the room list on purpose: the engine's collision probes use rooms[0], and this is
   *  the only room whose four probe points all fall outside every other footprint. */
  'salle-perrault': { x: [252.25, 276], z: [-60, 60], y0: 0, y1: 6.4 },
  'galerie-apollon': { x: [116, 133], z: [80, 141], y0: 7, y1: 22 },
  'rotonde-apollon': { x: [116, 133], z: [141, 154], y0: 7, y1: 22 },
  'pavillon-horloge': { x: [116, 139.75], z: [-14, 14], y0: 0, y1: 20 },
  'escalier-henri-ii': { x: [116, 139.75], z: [14, 30], y0: 0, y1: 14 },
  'salle-des-caryatides': { x: [116, 139.75], z: [30, 55], y0: 0, y1: 8.5 },
  /** Invented: the south-west corner of the ring, which route.json leaves unassigned but which the
   *  walk needs — it is the only volume between the Caryatides, room 346 and the Galerie d'Apollon
   *  that can hold a stair to level 1. Sized to the real wing volume. */
  'rotonde-de-mars': { x: [116, 139.75], z: [55, 80], y0: 0, y1: 12 },
  'salle-grec-346': { x: [139.75, 172], z: [56.25, 80], y0: 0, y1: 6.4 },
  'salle-venus-milo': { x: [172, 204], z: [56.25, 80], y0: 0, y1: 6.4 },
  'sphinx-crypt': { x: [204, 240], z: [56.25, 80], y0: 0, y1: 5.5 },
  'cour-carree': { x: [139.75, 252.25], z: [-56.25, 56.25], y0: 0, y1: 20.4 },
  'sully-l2-corridor': { x: [116, 139.75], z: [-80, -14], y0: 13.6, y1: 17.8 },
  'dutch-rooms': { x: [139.75, 180], z: [-80, -56.25], y0: 13.6, y1: 17.8 },
} as const satisfies Record<string, RoomBox>;

export type SullyRoomId = keyof typeof ROOMS;

export const CORNICE_Y = 20.4;

export interface Door {
  a: SullyRoomId;
  b: SullyRoomId;
  /** The plane the opening cuts: x = `at` for axis 'x', z = `at` for axis 'z'. */
  axis: 'x' | 'z';
  at: number;
  /** Centre of the opening along the other horizontal axis. */
  along: number;
  width: number;
  /** World heights of the opening's sill and head. */
  sillY: number;
  headY: number;
  arched?: boolean;
}

/**
 * The passages. Every one is a real hole in a real wall, cut from both sides. route.json's
 * `galerie-apollon`↔`pavillon-horloge` and `caryatides`↔`salle-grec-346` links are not planar — the
 * rooms they name share no wall — so they are walked through `rotonde-de-mars` instead and are not
 * declared as portals; see the report.
 */
export const DOORS: Door[] = [
  // level 1: Salon Carré -> rotonde -> galerie
  { a: 'rotonde-apollon', b: 'salon-carre' as SullyRoomId, axis: 'x', at: 116, along: 147.5, width: 4, sillY: 7, headY: 13, arched: true },
  { a: 'galerie-apollon', b: 'rotonde-apollon', axis: 'z', at: 141, along: 124.5, width: 5, sillY: 7, headY: 15, arched: true },
  { a: 'galerie-apollon', b: 'rotonde-de-mars', axis: 'z', at: 80, along: 124.5, width: 3.6, sillY: 7, headY: 11.4, arched: true },
  // ground floor: the Lescot corner
  { a: 'rotonde-de-mars', b: 'salle-des-caryatides', axis: 'z', at: 55, along: 127.875, width: 2.4, sillY: 0, headY: 4.4, arched: true },
  { a: 'rotonde-de-mars', b: 'salle-grec-346', axis: 'x', at: 139.75, along: 68, width: 2.4, sillY: 0, headY: 4.4, arched: true },
  { a: 'salle-des-caryatides', b: 'escalier-henri-ii', axis: 'z', at: 30, along: 127.875, width: 2.4, sillY: 0, headY: 4.4, arched: true },
  // the pavilion
  { a: 'escalier-henri-ii', b: 'pavillon-horloge', axis: 'z', at: 14, along: 127.875, width: 2.4, sillY: 0, headY: 4.4, arched: true },
  { a: 'pavillon-horloge', b: 'cour-napoleon' as SullyRoomId, axis: 'x', at: 116, along: 0, width: 7, sillY: 0, headY: 9.5, arched: true },
  { a: 'pavillon-horloge', b: 'cour-carree', axis: 'x', at: 139.75, along: 0, width: 5.5, sillY: 0, headY: 8.5, arched: true },
  // On the stair's landing axis, so the level-2 door is reached by climbing, never by walking
  // into a wall at ground level and being lifted.
  { a: 'pavillon-horloge', b: 'sully-l2-corridor', axis: 'z', at: -14, along: 118.7, width: 3, sillY: 13.6, headY: 17, arched: false },
  { a: 'sully-l2-corridor', b: 'dutch-rooms', axis: 'x', at: 139.75, along: -68, width: 2.6, sillY: 13.6, headY: 17, arched: false },
  // the south range
  { a: 'salle-grec-346', b: 'salle-venus-milo', axis: 'x', at: 172, along: 68, width: 2.6, sillY: 0, headY: 4.4, arched: true },
  { a: 'salle-venus-milo', b: 'sphinx-crypt', axis: 'x', at: 204, along: 68, width: 2.6, sillY: 0, headY: 4.2, arched: true },
  // the courtyard
  { a: 'cour-carree', b: 'salle-perrault', axis: 'x', at: 252.25, along: 0, width: 5, sillY: 0, headY: 5.5, arched: true },
];

export const floorOf = (id: SullyRoomId): number => ROOMS[id].y0;

/** Linear ramp along one axis, clamped to its ends: the walking surface of a straight flight. */
const ramp = (v: number, a: number, b: number, ya: number, yb: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return ya + (yb - ya) * t;
};

/**
 * The three stair rooms, so the walker climbs them instead of being lifted at the doorway:
 * the Petite Galerie flight up to level 1, the pavilion's 76 risers up to level 2, and the
 * Henri II stair, which is a scenic spur since both its doors are on the ground floor.
 */
export const FLOORS: Partial<Record<SullyRoomId, (x: number, z: number) => number>> = {
  'rotonde-de-mars': (_x, z) => ramp(z, 74, 78.6, 0, 7),
  'pavillon-horloge': (x, z) => (x > 116.7 && x < 120.7 ? ramp(z, 12, -9.28, 0, 13.6) : 0),
  'escalier-henri-ii': (x, z) => (x > 116 && x < 125.9 ? ramp(z, 15, 27, 0, 7) : 0),
  'sphinx-crypt': (x, z) => (Math.abs(x - 222) < 3.2 && Math.abs(z - 68.125) < 1.6 ? 0.36 : 0),
};

/** Every door that cuts a face of `room`, as a hole in that room's own wall. */
export function holesFor(id: SullyRoomId, face: 'n' | 's' | 'e' | 'w'): Array<{ at: number; width: number; head: number; sill: number; arched: boolean }> {
  const box = ROOMS[id];
  return DOORS.filter((d) => {
    const mine = d.a === id || d.b === id;
    if (!mine) return false;
    if (d.axis === 'z') {
      if (d.at !== box.z[0] && d.at !== box.z[1]) return false;
      const isNorth = d.at === box.z[0];
      return isNorth ? face === 'n' : face === 's';
    }
    if (d.at !== box.x[0] && d.at !== box.x[1]) return false;
    const isWest = d.at === box.x[0];
    return isWest ? face === 'w' : face === 'e';
  }).map((d) => ({
    at: d.along,
    width: d.width,
    head: d.headY - box.y0,
    sill: d.sillY - box.y0,
    arched: Boolean(d.arched),
  }));
}

export interface Portal {
  to: string;
  centre: [number, number, number];
  width: number;
  height: number;
  normal: [number, number, number];
}

/** The portals `room` declares: both ends of every door that touches it. */
export function portalsFor(id: SullyRoomId): Portal[] {
  const box = ROOMS[id];
  const out: Portal[] = [];
  for (const d of DOORS) {
    const mine = d.a === id || d.b === id;
    if (!mine) continue;
    const other = d.a === id ? d.b : d.a;
    const height = d.headY - d.sillY;
    const centre: [number, number, number] =
      d.axis === 'z' ? [d.along, d.sillY + height / 2, d.at] : [d.at, d.sillY + height / 2, d.along];
    let normal: [number, number, number];
    if (d.axis === 'z') normal = [0, 0, box.z[0] === d.at ? -1 : 1];
    else normal = [box.x[0] === d.at ? -1 : 1, 0, 0];
    out.push({ to: other, centre, width: d.width, height, normal });
  }
  return out;
}

/** A face of a room: plane coordinate, span, and the face's outward normal. */
export function faceOf(id: SullyRoomId, face: 'n' | 's' | 'e' | 'w'): { at: number; from: number; to: number } {
  const b = ROOMS[id];
  if (face === 'n') return { at: b.z[0], from: b.x[0], to: b.x[1] };
  if (face === 's') return { at: b.z[1], from: b.x[0], to: b.x[1] };
  if (face === 'w') return { at: b.x[0], from: b.z[0], to: b.z[1] };
  return { at: b.x[1], from: b.z[0], to: b.z[1] };
}

/**
 * The nine works artworks.json assigns to this zone, at the origins the artwork library documents:
 * a painting's position is the wall contact point, centred on the painted surface; a sculpture's is
 * the floor contact point at its base centre. Every plinth and shelf below is cut to those heights,
 * so nothing floats and nothing sinks.
 */
export const ARTWORKS: ArtworkSpec[] = [
  {
    id: 'apollo-ceiling-delacroix',
    title: 'Apollon vainqueur du serpent Python',
    artist: 'Eugene Delacroix',
    year: '1850-1851',
    sizeCm: [1600, 800],
    room: 'galerie-apollon',
    wall: 'ceiling',
    position: [124.5, 20.85, 110.5],
    rotationY: Math.PI / 2,
  },
  {
    id: 'crown-of-louis-xv',
    title: 'Couronne dite de Louis XV',
    artist: 'Claude Ronde',
    year: '1722',
    sizeCm: [22, 24],
    room: 'galerie-apollon',
    wall: 'west',
    position: [116.36, 8.0, 110],
    rotationY: Math.PI / 2,
  },
  {
    id: 'diana-of-versailles',
    title: 'Diane de Versailles',
    artist: 'Roman copy after Leochares',
    year: '1st-2nd c. AD',
    sizeCm: [130, 201],
    room: 'salle-des-caryatides',
    wall: 'floor',
    position: [127.9, 0.62, 42.5],
    rotationY: 1.35,
  },
  {
    id: 'borghese-gladiator',
    title: 'Gladiateur Borghese',
    artist: 'Agasias of Ephesus',
    year: 'c. 100 BC',
    sizeCm: [172, 173],
    room: 'salle-des-caryatides',
    wall: 'floor',
    position: [127.9, 0.46, 49.5],
    rotationY: -0.5,
  },
  {
    id: 'caryatids-goujon',
    title: 'Les Caryatides de la tribune des musiciens',
    artist: 'Jean Goujon',
    year: '1550',
    sizeCm: [240, 280],
    room: 'salle-des-caryatides',
    wall: 'south',
    position: [127.875, 1.47, 54.5],
    rotationY: Math.PI,
  },
  {
    id: 'venus-de-milo',
    title: 'Venus de Milo',
    artist: 'Alexandros of Antioch',
    year: 'c. 150-125 BC',
    sizeCm: [100, 204],
    room: 'salle-venus-milo',
    wall: 'floor',
    position: [188, 0.55, 68.125],
    rotationY: -0.22,
  },
  {
    id: 'great-sphinx-tanis',
    title: 'Grand sphinx de Tanis',
    artist: 'Unattributed',
    year: 'c. 2600 BC',
    sizeCm: [154, 183],
    room: 'sphinx-crypt',
    wall: 'floor',
    position: [222, 0.71, 68.125],
    rotationY: -Math.PI / 2,
  },
  {
    id: 'lacemaker',
    title: 'La Dentelliere',
    artist: 'Johannes Vermeer',
    year: 'c. 1669-1670',
    sizeCm: [21, 24],
    room: 'dutch-rooms',
    wall: 'north',
    position: [166, 15.15, -79.68],
    rotationY: 0,
  },
  {
    id: 'astronomer',
    title: "L'Astronome",
    artist: 'Johannes Vermeer',
    year: '1668',
    sizeCm: [45, 51],
    room: 'dutch-rooms',
    wall: 'east',
    position: [179.62, 15.2, -68],
    rotationY: -Math.PI / 2,
  },
];

export interface Spawn {
  id: string;
  position: [number, number, number];
  lookAt: [number, number, number];
  label: string;
}

/** Named viewpoints, in the order a curator would walk them. */
export const SPAWNS: Spawn[] = [
  { id: 'galerie-apollon-vault', position: [124.5, 8.65, 86], lookAt: [124.5, 21.4, 116], label: "Galerie d'Apollon: down the gilded vault" },
  { id: 'galerie-apollon-crown', position: [122.6, 8.65, 99], lookAt: [116.4, 8.2, 110], label: "Galerie d'Apollon: the crown jewels" },
  { id: 'rotonde-apollon', position: [124.5, 8.65, 143.4], lookAt: [124.5, 14.5, 150], label: "Rotonde d'Apollon" },
  { id: 'pavillon-horloge', position: [124, 1.65, 9], lookAt: [139.75, 6.5, 0], label: "Pavillon de l'Horloge, looking to the court" },
  { id: 'escalier-henri-ii', position: [134.4, 1.65, 26], lookAt: [120, 7.5, 17], label: 'Escalier Henri II' },
  { id: 'salle-des-caryatides', position: [127.875, 1.65, 33.5], lookAt: [127.875, 4.6, 54.4], label: 'Salle des Caryatides: the tribune' },
  { id: 'rotonde-de-mars', position: [131, 1.65, 59], lookAt: [122, 8.5, 79], label: 'Rotonde de Mars, under the stair to the Petite Galerie' },
  { id: 'salle-grec-346', position: [146, 1.65, 68], lookAt: [172, 3.4, 68], label: 'Greek antiquities 346' },
  { id: 'venus-de-milo-doorway', position: [173.4, 1.65, 68.1], lookAt: [188, 1.8, 68.1], label: 'Venus de Milo from the doorway' },
  { id: 'sphinx-crypt', position: [206.5, 1.65, 68.1], lookAt: [222, 1.5, 68.1], label: 'Sphinx crypt' },
  { id: 'cour-carree-inside', position: [147, 1.65, 26], lookAt: [212, 15, -34], label: 'Cour Carree from inside' },
  { id: 'salle-perrault', position: [260, 1.65, 26], lookAt: [276, 6, -14], label: 'Salle Perrault, behind the Colonnade' },
  { id: 'sully-l2-corridor', position: [128, 15.25, -20], lookAt: [128, 15, -70], label: 'Level 2 corridor' },
  { id: 'dutch-rooms', position: [158, 15.25, -58], lookAt: [167, 14.9, -79.6], label: 'Dutch rooms: the Lacemaker' },
];
