import * as THREE from 'three';
import type { ArtworkSpec } from '../../artworks/types';
import { addPart } from '../../core/merge';
import { boxGeo, mergeAll } from '../../core/geom';
import { balustrade, cofferCeiling, staircase } from '../../core/builders';
import { BOX, HOLE, T } from './layout';
import {
  band,
  bench,
  corniceRing,
  frameOf,
  midX,
  plinth,
  put,
  simplePilaster,
  slabFloor,
  skirting,
  stand,
  walls,
  windows,
  type RoomPart,
  type SideSpec,
  type Side,
} from './shell';

/**
 * The Escalier Daru and the Michelangelo gallery: the two ground-floor rooms of the wing, and the
 * pair of views that carry the entrance sequence — up the stairs to the Nike, then under the
 * sculpture vault.
 */

export const STAIR = {
  x: 72,
  width: 10,
  z0: 78,
  rise: 7,
  run: 10,
  steps: 28,
  landingZ0: 88,
};

/** Height of the stair surface at a world point, used by the walk assist in update(). */
export function stairHeightAt(x: number, z: number): number | null {
  const half = STAIR.width / 2;
  const inFlight = x >= STAIR.x - half && x <= STAIR.x + half && z >= STAIR.z0 && z <= STAIR.landingZ0;
  if (inFlight) return ((z - STAIR.z0) / STAIR.run) * STAIR.rise;
  const inLanding = z >= STAIR.landingZ0 && z <= 96 && x >= 62 && x <= 82;
  if (inLanding) return STAIR.rise;
  return null;
}

const victory: ArtworkSpec = {
  id: 'winged-victory',
  title: 'Winged Victory of Samothrace (Nike of Samothrace)',
  artist: 'Attributed to Pythokritos of Rhodes',
  year: 'c. 200-190 BC',
  sizeCm: [429, 557],
  room: 'escalier-daru',
  wall: 'landing',
  position: [72, 7, 92],
  rotationY: Math.PI,
};

export function buildEscalierDaru(): RoomPart {
  const b = BOX['escalier-daru'] as (typeof BOX)[string];
  const g = new THREE.Group();
  g.name = 'denon/escalier-daru';
  const sides: Partial<Record<Side, SideSpec>> = {
    n: { t: T, holes: [HOLE.daruEntry] },
    s: {
      t: T,
      holes: [
        { at: 68, width: 2.2, sill: 11.5, head: 15, casing: false },
        { at: 72, width: 2.2, sill: 11.5, head: 15, casing: false },
        { at: 76, width: 2.2, sill: 11.5, head: 15, casing: false },
      ],
    },
    e: { t: T },
    w: { t: T, holes: [HOLE.michelDoor, HOLE.daruLanding] },
  };

  slabFloor(g, b, 'floor.marble-checker');
  walls(g, b, sides, { wall: 'wall.ochre', casing: 'trim.stone-limestone-warm' });
  skirting(g, b, sides, 'trim.stone-limestone-warm', 0.3);
  corniceRing(g, b, 'trim.stone-limestone-warm', { height: 0.8, projection: 0.45 });
  band(g, b, 'trim.stone-limestone-warm', 7.1, 0.22, 0.14);

  // Clerestory: the stair is lit from above, through the high windows on the courtyard side.
  windows(g, frameOf(b, 's'), b, { bays: 3, bayWidth: 2.2, spacing: 4, sill: 11.5, head: 15, t: T });

  // The landing: a solid mass, so the stair reads as climbing a podium rather than a stair to nowhere.
  const lw = b.x1 - b.x0;
  const block = boxGeo(lw, STAIR.rise, 96 - STAIR.landingZ0);
  block.translate(midX(b), STAIR.rise / 2, (STAIR.landingZ0 + 96) / 2);
  const cap = boxGeo(lw + 0.1, 0.3, 96 - STAIR.landingZ0 + 0.1);
  cap.translate(midX(b), STAIR.rise - 0.15, (STAIR.landingZ0 + 96) / 2);
  addPart(g, mergeAll([block, cap]), 'stone.limestone-warm');
  const landing = boxGeo(lw - 0.02, 0.06, 96 - STAIR.landingZ0 - 0.02);
  landing.translate(midX(b), STAIR.rise - 0.03, (STAIR.landingZ0 + 96) / 2);
  addPart(g, landing, 'floor.marble-checker');

  // Three flights' worth of treads in one straight run: 28 risers of 0.25 m over 10 m.
  const flight = staircase({ steps: STAIR.steps, rise: STAIR.rise / STAIR.steps, run: STAIR.run / STAIR.steps, width: STAIR.width });
  addPart(g, flight, 'stone.limestone-pale').position.set(STAIR.x, 0, STAIR.z0);

  // Parapets: a solid sloping band on each side of the flight, and a balustrade across the landing.
  const angle = Math.atan2(STAIR.rise, STAIR.run);
  const len = Math.hypot(STAIR.rise, STAIR.run);
  for (const side of [-1, 1]) {
    const parapet = boxGeo(0.4, 1.1, len + 0.4);
    parapet.rotateX(-angle);
    parapet.translate(STAIR.x + side * (STAIR.width / 2 + 0.2), STAIR.rise / 2 + 0.62, STAIR.z0 + STAIR.run / 2);
    addPart(g, parapet, 'trim.stone-limestone-warm');
  }
  for (const side of [-1, 1]) {
    const rail = balustrade({ length: 4.6, height: 1.05, spacing: 0.34 });
    const m = addPart(g, rail, 'trim.stone-limestone-warm');
    m.position.set(STAIR.x + side * (STAIR.width / 2 + 2.5), STAIR.rise, STAIR.landingZ0);
  }

  // A coffered Renaissance ceiling over the whole well.
  const coffer = cofferCeiling({ width: lw, depth: b.z1 - b.z0, baysX: 5, baysZ: 5, beamWidth: 0.4, beamDepth: 0.4 });
  addPart(g, coffer, 'ceiling.plaster-white').position.set(midX(b), b.y0 + b.h + 0.4, (b.z0 + b.z1) / 2);

  // Engaged pilasters on the side walls, rising the full eighteen metres and keeping clear of the
  // two doorways in the west wall.
  const pil = simplePilaster(1.1, b.h - 0.9, 0.24);
  for (const [side, ts] of [
    ['e', [77, 85, 93]],
    ['w', [80.6, 93.6]],
  ] as Array<[Side, number[]]>) {
    const f = frameOf(b, side);
    for (const t of ts) put(addPart(g, pil.clone(), 'trim.stone-limestone-warm'), f, t, b.y0, 0);
  }
  pil.dispose();
  bench(g, b, { x: 66, z: 82, len: 3.2, along: 'z' });

  return {
    raw: [g],
    dress: (merged) => {
      stand(merged[0] as THREE.Group, victory, STAIR.rise);
    },
  };
}

const dyingSlave: ArtworkSpec = {
  id: 'dying-slave',
  title: 'The Dying Slave',
  artist: 'Michelangelo',
  year: '1513-1515',
  sizeCm: [72, 228],
  room: 'galerie-michel-ange',
  wall: 'north',
  position: [44, 0.9, 75.3],
  rotationY: 0,
};

const rebelliousSlave: ArtworkSpec = {
  id: 'rebellious-slave',
  title: 'The Rebellious Slave',
  artist: 'Michelangelo',
  year: '1513-1515',
  sizeCm: [49, 215],
  room: 'galerie-michel-ange',
  wall: 'north',
  position: [48, 0.9, 75.4],
  rotationY: 0,
};

const psyche: ArtworkSpec = {
  id: 'psyche-revived',
  title: "Psyche Revived by Cupid's Kiss",
  artist: 'Antonio Canova',
  year: '1787-1793',
  sizeCm: [168, 155],
  room: 'galerie-michel-ange',
  wall: 'centre',
  position: [47, 0.62, 85],
  rotationY: 0.7,
};

export function buildGalerieMichelAnge(): RoomPart {
  const b = BOX['galerie-michel-ange'] as (typeof BOX)[string];
  const g = new THREE.Group();
  g.name = 'denon/galerie-michel-ange';
  const sides: Partial<Record<Side, SideSpec>> = {
    n: { t: T },
    s: { t: T },
    e: { t: T, holes: [HOLE.michelDoor] },
    w: { t: T },
  };
  slabFloor(g, b, 'floor.stone-flag');
  walls(g, b, sides, { wall: 'wall.stone-grey', casing: 'trim.stone-limestone-warm' });
  skirting(g, b, sides, 'trim.stone-limestone-warm', 0.26);
  corniceRing(g, b, 'trim.stone-limestone-warm', { height: 0.5, projection: 0.3 });

  // Flat plaster vault between stone ribs every four metres.
  const slab = boxGeo(b.x1 - b.x0, 0.3, b.z1 - b.z0);
  slab.translate(midX(b), b.y0 + b.h + 0.15, (b.z0 + b.z1) / 2);
  addPart(g, slab, 'ceiling.plaster-white');
  const ribs: THREE.BufferGeometry[] = [];
  for (let x = b.x0 + 4; x < b.x1 - 1; x += 4) {
    const rib = boxGeo(0.34, 0.34, b.z1 - b.z0);
    rib.translate(x, b.y0 + b.h - 0.17, (b.z0 + b.z1) / 2);
    ribs.push(rib);
  }
  addPart(g, mergeAll(ribs), 'trim.stone-limestone-warm');

  // Plinths for the two slaves against the north wall.
  plinth(g, 44, 75.3, b, { w: 1.5, d: 1.2, h: 0.9 });
  plinth(g, 48, 75.4, b, { w: 1.5, d: 1.3, h: 0.9 });
  plinth(g, 47, 85, b, { w: 2.2, d: 2.2, h: 0.6, round: true });
  bench(g, b, { x: 38, z: 85, len: 3.4, along: 'z' });
  bench(g, b, { x: 56, z: 85, len: 3.4, along: 'z' });

  return {
    raw: [g],
    dress: (merged) => {
      const m = merged[0] as THREE.Group;
      stand(m, dyingSlave, 0.9);
      stand(m, rebelliousSlave, 0.9);
      stand(m, psyche, 0.62);
    },
  };
}
