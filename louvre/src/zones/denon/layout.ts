import type { RoomBox, Hole } from './shell';

/**
 * The measured layout of the Denon wing, level 1, from the spec's `route.json`.
 *
 * Everything in this file is data: room boxes (interior faces), the openings cut between them, and
 * the wall that carries each opening. Both sides of every opening read the same object, so a portal
 * and its doorway can never drift apart.
 */

/**
 * Wall thickness outside a room's interior face.
 *
 * Two rooms that share a boundary each build their own slab on their own side of it, because a room
 * whose walls belong to its neighbour develops holes the moment the neighbour is culled. At 0.15 m
 * a shared boundary adds up to 0.3 m of masonry and the neighbour's slab sits only 15 cm inside this
 * room, which reads as a reveal rather than a step in the wall.
 */
export const T = 0.15;

/** Level 1 floor. */
export const F1 = 7;

export const BOX: Record<string, RoomBox> = {
  'escalier-daru': { x0: 62, x1: 82, z0: 74, z1: 96, y0: 0, h: 18 },
  'galerie-michel-ange': { x0: 32, x1: 62, z0: 74, z1: 96, y0: 0, h: 6.2 },
  'salle-daru': { x0: 32, x1: 62, z0: 74, z1: 92, y0: F1, h: 7.5 },
  'salle-denon': { x0: 2, x1: 32, z0: 74, z1: 92, y0: F1, h: 7.5 },
  'salle-mollien': { x0: -28, x1: 2, z0: 74, z1: 92, y0: F1, h: 7.5 },
  'salle-des-etats': { x0: -68, x1: -28, z0: 74, z1: 91.4, y0: F1, h: 8.5 },
  'galerie-des-sessions': { x0: -68, x1: -48, z0: 91.4, z1: 141, y0: F1, h: 7.5 },
  'grande-galerie': { x0: -172, x1: 96, z0: 141, z1: 154, y0: F1, h: 9.5 },
  'salon-carre': { x0: 96, x1: 116, z0: 141, z1: 154, y0: F1, h: 8.5 },
};

/**
 * Openings, keyed by the boundary they cross. `at` is world x for a north/south wall and world z for
 * an east/west wall.
 */
export const HOLE: Record<string, Hole> = {
  /** Foot of the Daru staircase, from the passage Denon. */
  daruEntry: { at: 72, width: 6, head: 6.4, arched: true },
  /** Stair hall to the Michelangelo gallery, at the foot of the first flight. */
  michelDoor: { at: 77.5, width: 3, head: 4.6, arched: true },
  /** Top landing of the staircase into the Salle Daru. */
  daruLanding: { at: 89.8, width: 3.6, head: 5.2, arched: true },
  daruDenon: { at: 87, width: 4.2, head: 5.4, arched: true },
  denonMollien: { at: 83, width: 4.2, head: 5.4, arched: true },
  mollienEtats: { at: 77.5, width: 4.2, head: 5.4, arched: true },
  etatsSessions: { at: -58, width: 4.4, head: 5.6, arched: true },
  sessionsGg: { at: -58, width: 4.4, head: 5.6, arched: true },
  ggSalon: { at: 147.5, width: 5, head: 6.2, arched: true },
  salonApollon: { at: 147.5, width: 5, head: 6.2, arched: true },
};

/** The Grande Galerie's river wall has no windows; its courtyard wall carries the two doors. */
export const GG_BAY = 5.5;

export interface PortalLink {
  to: string;
  hole: Hole;
  /** 'x' when the opening plane is perpendicular to x, 'z' when perpendicular to z. */
  axis: 'x' | 'z';
  /** Outward normal from the room declaring it. */
  normal: readonly [number, number, number];
  floorY: number;
}

/**
 * Portals, declared from both sides. The geometry of each is the HOLE it shares, so the walker can
 * only leave a room where a doorway was actually cut.
 */
export const PORTALS: Record<string, PortalLink[]> = {
  'escalier-daru': [
    { to: 'galerie-michel-ange', hole: HOLE.michelDoor, axis: 'x', normal: [-1, 0, 0], floorY: 0 },
    { to: 'salle-daru', hole: HOLE.daruLanding, axis: 'x', normal: [-1, 0, 0], floorY: F1 },
  ],
  'galerie-michel-ange': [
    { to: 'escalier-daru', hole: HOLE.michelDoor, axis: 'x', normal: [1, 0, 0], floorY: 0 },
  ],
  'salle-daru': [
    { to: 'escalier-daru', hole: HOLE.daruLanding, axis: 'x', normal: [1, 0, 0], floorY: F1 },
    { to: 'salle-denon', hole: HOLE.daruDenon, axis: 'x', normal: [-1, 0, 0], floorY: F1 },
  ],
  'salle-denon': [
    { to: 'salle-daru', hole: HOLE.daruDenon, axis: 'x', normal: [1, 0, 0], floorY: F1 },
    { to: 'salle-mollien', hole: HOLE.denonMollien, axis: 'x', normal: [-1, 0, 0], floorY: F1 },
  ],
  'salle-mollien': [
    { to: 'salle-denon', hole: HOLE.denonMollien, axis: 'x', normal: [1, 0, 0], floorY: F1 },
    { to: 'salle-des-etats', hole: HOLE.mollienEtats, axis: 'x', normal: [-1, 0, 0], floorY: F1 },
  ],
  'salle-des-etats': [
    { to: 'salle-mollien', hole: HOLE.mollienEtats, axis: 'x', normal: [1, 0, 0], floorY: F1 },
    { to: 'galerie-des-sessions', hole: HOLE.etatsSessions, axis: 'z', normal: [0, 0, 1], floorY: F1 },
  ],
  'galerie-des-sessions': [
    { to: 'salle-des-etats', hole: HOLE.etatsSessions, axis: 'z', normal: [0, 0, -1], floorY: F1 },
    { to: 'grande-galerie', hole: HOLE.sessionsGg, axis: 'z', normal: [0, 0, 1], floorY: F1 },
  ],
  'grande-galerie': [
    { to: 'galerie-des-sessions', hole: HOLE.sessionsGg, axis: 'z', normal: [0, 0, -1], floorY: F1 },
    { to: 'salon-carre', hole: HOLE.ggSalon, axis: 'x', normal: [1, 0, 0], floorY: F1 },
  ],
  'salon-carre': [
    { to: 'grande-galerie', hole: HOLE.ggSalon, axis: 'x', normal: [-1, 0, 0], floorY: F1 },
  ],
};
