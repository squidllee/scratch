import * as THREE from 'three';
import { boxGeo, quadGeo, smoothstep } from '../../core/geom';
import { addPart } from '../../core/merge';
import { balustrade, cofferCeiling, cornice, doorway, pilaster } from '../../core/builders';
import {
  escalier,
  hammurabi,
  MARLY_BAYS,
  passage,
  ESCALIER_DOOR_X,
  ESCALIER_FOOT_Z,
  ESCALIER_HEAD_Z,
  SALON_DOOR_Z,
  PUGET_BAYS,
  salon,
  WALL_T,
} from './layout';
import { plate, put, spot, vaultSurface, type LightFn } from './parts';
import type { Rng } from '../../core/rng';
import { addChandelier, addConsole, addMirror, addPanel, addSconce } from './ornaments';
import { corniceRing, sideWall } from './courts';

/**
 * Passage Richelieu, the Hammurabi room, the Richelieu stair and the Napoleon III Grand Salon.
 *
 * The passage is the wing's spine: a stone gallery between the two courts with five arched bays
 * each side and a daylight slot in its soffit. The stair is the level change between ground and
 * the painting floor, and the salon is the one room in this zone where ornament is worth its
 * triangles.
 */

/** Passage Richelieu: 14 × 51.5 m, 5 m high, a lit slot down the middle of the soffit. */
export function buildPassage(rng: Rng): THREE.Group {
  const g = new THREE.Group();
  const cx = (passage.x0 + passage.x1) / 2;
  const cz = (passage.z0 + passage.z1) / 2;
  const w = passage.x1 - passage.x0;
  const d = passage.z1 - passage.z0;
  const jitter = rng.range(0, 0.02);

  // Light: from the slot overhead, from the arcades, and from the Cour Napoléon end (south).
  const light: LightFn = (x, z) => {
    const across = 1 - 0.34 * smoothstep(1.4, 6.4, Math.abs(x - cx));
    const endGlow = 0.1 * smoothstep(-96, -72, z);
    const bays = 0.08 * Math.max(0, Math.cos((Math.abs(x - cx) / 3) * Math.PI));
    return 0.52 + 0.38 * across + endGlow + bays + jitter;
  };
  put(g, plate({ width: w, depth: d, nx: 7, nz: 42, light }), 'floor.stone-flag', [cx, passage.floor, cz]);

  // West and east walls: the court arcades.
  sideWall(g, passage, {
    side: 'w',
    baseY: 0,
    height: 5,
    material: 'wall.ochre-light',
    openings: MARLY_BAYS.map((at) => ({ at, width: 4.6, head: 4.6, arched: true })),
  });
  sideWall(g, passage, {
    side: 'e',
    baseY: 0,
    height: 5,
    material: 'wall.ochre-light',
    openings: PUGET_BAYS.map((at) => ({ at, width: 4.6, head: 4.6, arched: true })),
  });
  // North end: the stair hall is through this wall.
  sideWall(g, passage, {
    side: 'n',
    baseY: 0,
    height: 5,
    material: 'wall.ochre-light',
    openings: [{ at: ESCALIER_DOOR_X, width: 3.6, head: 4.2, arched: true }],
  });
  // South mouth: open to the Cour Napoléon link.
  sideWall(g, passage, {
    side: 's',
    baseY: 0,
    height: 5,
    material: 'wall.ochre-light',
    openings: [{ at: cx, width: 9.4, head: 4.6, arched: true }],
  });

  // Dress every opening with an arched stone casing.
  for (const at of MARLY_BAYS) put(g, doorway({ width: 4.6, height: 4.6, arched: true, thickness: WALL_T }), 'trim.stone-limestone-warm', [passage.x0, 0, at], Math.PI / 2);
  for (const at of PUGET_BAYS) put(g, doorway({ width: 4.6, height: 4.6, arched: true, thickness: WALL_T }), 'trim.stone-limestone-warm', [passage.x1, 0, at], -Math.PI / 2);
  put(g, doorway({ width: 3.6, height: 4.2, arched: true, thickness: WALL_T }), 'trim.stone-limestone-warm', [ESCALIER_DOOR_X, 0, passage.z0], 0);
  put(g, doorway({ width: 9.4, height: 4.6, arched: true, thickness: WALL_T }), 'trim.stone-limestone-warm', [cx, 0, passage.z1], Math.PI);

  // Soffit: two slabs either side of a glazed slot, with cross beams under them.
  const slot = 1.0;
  const slabW = (w - slot) / 2;
  put(g, boxGeo(slabW, 0.4, d), 'ceiling.plaster-white', [passage.x0 + slabW / 2, 5.2, cz]);
  put(g, boxGeo(slabW, 0.4, d), 'ceiling.plaster-white', [passage.x1 - slabW / 2, 5.2, cz]);
  put(g, boxGeo(slot - 0.1, 0.06, d - 0.2), 'glass.skylight-clear', [cx, 5.16, cz]);
  put(g, quadGeo(
    [cx - slot / 2 + 0.05, 5.26, cz + d / 2 - 0.1],
    [cx + slot / 2 - 0.05, 5.26, cz + d / 2 - 0.1],
    [cx + slot / 2 - 0.05, 5.26, cz - d / 2 + 0.1],
    [cx - slot / 2 + 0.05, 5.26, cz - d / 2 + 0.1],
    [[0, 0], [slot, 0], [slot, d], [0, d]],
  ), 'app.light-card', [0, 0, 0]);
  const beams = 13;
  for (let i = 0; i < beams; i++) {
    const z = passage.z0 + ((i + 0.5) * d) / beams;
    put(g, boxGeo(w - 0.2, 0.26, 0.32), 'trim.stone-limestone-warm', [cx, 5.0 - 0.13, z]);
  }

  // Stone cornice and skirting along both long walls.
  for (const side of [-1, 1]) {
    const x = side < 0 ? passage.x0 : passage.x1;
    const ry = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    put(g, cornice({ length: d, height: 0.34, projection: 0.2, dentils: false }), 'trim.stone-limestone-warm', [x, 4.6, cz], ry);
    put(g, boxGeo(0.1, 0.2, d), 'marble.noir-marquina', [x + side * 0.05, 0.1, cz]);
  }
  return g;
}

/** Room 227: the Code of Hammurabi, one hard light on one black stele. */
export function buildHammurabi(rng: Rng): THREE.Group {
  const g = new THREE.Group();
  const cx = (hammurabi.x0 + hammurabi.x1) / 2;
  const cz = (hammurabi.z0 + hammurabi.z1) / 2;
  const w = hammurabi.x1 - hammurabi.x0;
  const d = hammurabi.z1 - hammurabi.z0;
  const jitter = rng.range(0, 0.02);

  // The stele stands here; the light is a hard cone from above-front.
  const steleX = cx + 1.5;
  const steleZ = cz;
  const light: LightFn = (x, z) => 0.5 + 0.5 * spot(x, z, steleX, steleZ, 8.5, 7.5, 1, 0) + jitter;
  put(g, plate({ width: w, depth: d, nx: 18, nz: 18, light }), 'floor.stone-flag', [cx, 0, cz]);

  sideWall(g, hammurabi, { side: 'n', baseY: 0, height: 5.5, material: 'wall.slate-green' });
  sideWall(g, hammurabi, { side: 's', baseY: 0, height: 5.5, material: 'wall.slate-green' });
  sideWall(g, hammurabi, { side: 'e', baseY: 0, height: 5.5, material: 'wall.slate-green' });

  // Black basalt dado and a plain cornice: the room's only ornament is the stone.
  for (const side of ['n', 's', 'e'] as const) {
    const horizontal = side === 'n' || side === 's';
    const len = horizontal ? w : d;
    const at: [number, number, number] = horizontal
      ? [cx, 0, side === 'n' ? hammurabi.z0 + 0.06 : hammurabi.z1 - 0.06]
      : [hammurabi.x1 - 0.06, 0, cz];
    put(g, boxGeo(horizontal ? len : 0.12, 1.15, horizontal ? 0.12 : len), 'marble.noir-marquina', at);
    put(g, cornice({ length: len, height: 0.26, projection: 0.14, dentils: false }), 'trim.stone-limestone-warm', horizontal ? [cx, 5.24, at[2]] : [at[0], 5.24, cz], horizontal ? (side === 'n' ? 0 : Math.PI) : -Math.PI / 2);
  }

  put(g, cofferCeiling({ width: w, depth: d, baysX: 3, baysZ: 3, beamWidth: 0.34, beamDepth: 0.26, rosettes: false }), 'ceiling.plaster-white', [cx, 5.5, cz]);
  for (const z of [cz - 4.5, cz + 4.5]) {
    put(g, boxGeo(0.62, 0.85, 1.7), 'marble.noir-marquina', [hammurabi.x1 - 0.42, 0.45, z]);
    put(g, boxGeo(0.02, 1.3, 1.62), 'glass.vitrine', [hammurabi.x1 - 0.72, 1.55, z]);
    put(g, boxGeo(0.58, 1.3, 0.06), 'wood.walnut', [hammurabi.x1 - 0.42, 1.55, z - 0.8]);
    put(g, boxGeo(0.58, 1.3, 0.06), 'wood.walnut', [hammurabi.x1 - 0.42, 1.55, z + 0.8]);
    put(g, boxGeo(0.58, 0.06, 1.66), 'wood.walnut', [hammurabi.x1 - 0.42, 2.2, z]);
  }

  // The floor inlay the stele stands on, a stone bench, two vitrines and a band of relief panels:
  // enough real furniture for the room to read as a gallery rather than a dark box.
  put(g, boxGeo(7.2, 0.06, 6.4), 'marble.noir-marquina', [steleX, 0.03, steleZ]);
  put(g, boxGeo(7.6, 0.05, 0.35), 'stone.limestone-pale', [steleX, 0.04, steleZ + 3.3]);
  put(g, boxGeo(7.6, 0.05, 0.35), 'stone.limestone-pale', [steleX, 0.04, steleZ - 3.3]);
  put(g, boxGeo(0.35, 0.05, 6.4), 'stone.limestone-pale', [steleX + 3.75, 0.04, steleZ]);
  put(g, boxGeo(0.35, 0.05, 6.4), 'stone.limestone-pale', [steleX - 3.75, 0.04, steleZ]);
  put(g, boxGeo(2.6, 0.42, 0.55), 'stone.limestone-pale', [cx - 3.5, 0.21, hammurabi.z1 - 0.5]);
  for (const x of [cx - 4.6, cx + 5.2]) {
    put(g, boxGeo(1.7, 0.9, 0.62), 'marble.noir-marquina', [x, 0.45, hammurabi.z1 - 0.42]);
    put(g, boxGeo(1.62, 1.35, 0.02), 'glass.vitrine', [x, 1.6, hammurabi.z1 - 0.72]);
    put(g, boxGeo(0.06, 1.35, 0.58), 'wood.walnut', [x - 0.8, 1.6, hammurabi.z1 - 0.42]);
    put(g, boxGeo(0.06, 1.35, 0.58), 'wood.walnut', [x + 0.8, 1.6, hammurabi.z1 - 0.42]);
    put(g, boxGeo(1.66, 0.06, 0.58), 'wood.walnut', [x, 2.27, hammurabi.z1 - 0.42]);
  }
  for (let i = 0; i < 11; i++) {
    const x = hammurabi.x0 + 1.6 + i * 1.9;
    if (Math.abs(x - steleX) < 3.6) continue;
    put(g, boxGeo(1.2, 0.85, 0.07), 'trim.stone-limestone-warm', [x, 2.9, hammurabi.z0 + 0.09]);
    put(g, boxGeo(1.2, 0.85, 0.07), 'trim.stone-limestone-warm', [x, 2.9, hammurabi.z1 - 0.09]);
  }

  // A single glare-free light panel above the stele, so the room's one bright thing is the stone.
  put(g, quadGeo(
    [steleX - 1.5, 5.4, steleZ + 1.1],
    [steleX + 1.5, 5.4, steleZ + 1.1],
    [steleX + 1.5, 5.4, steleZ - 1.1],
    [steleX - 1.5, 5.4, steleZ - 1.1],
    [[0, 0], [3, 0], [3, 2.2], [0, 2.2]],
  ), 'app.light-card', [0, 0, 0]);
  return g;
}

/** Escalier Richelieu: the stair hall between the passage below and the salon at level 1. */
export function buildEscalier(rng: Rng): THREE.Group {
  const g = new THREE.Group();
  const cx = (escalier.x0 + escalier.x1) / 2;
  const cz = (escalier.z0 + escalier.z1) / 2;
  const w = escalier.x1 - escalier.x0;
  const d = escalier.z1 - escalier.z0;
  const jitter = rng.range(0, 0.02);
  const foot = ESCALIER_FOOT_Z;
  const head = ESCALIER_HEAD_Z;
  const steps = 24;
  const run = (foot - head) / steps;

  const light: LightFn = (x, z) => 0.56 + 0.34 * smoothstep(-122, -141, z) * (1 - 0.22 * Math.abs((x - cx) / (w / 2))) + jitter;
  put(g, plate({ width: w, depth: d, nx: 8, nz: 10, y: escalier.floor, light }), 'floor.marble-checker', [cx, escalier.floor, cz]);

  sideWall(g, escalier, { side: 'n', baseY: 0, height: escalier.ceil, material: 'wall.ochre-light' });
  sideWall(g, escalier, { side: 'e', baseY: 0, height: escalier.ceil, material: 'wall.ochre-light' });
  sideWall(g, escalier, {
    side: 's',
    baseY: 0,
    height: escalier.ceil,
    material: 'wall.ochre-light',
    openings: [{ at: ESCALIER_DOOR_X, width: 3.6, head: 4.2, arched: true }],
  });
  sideWall(g, escalier, {
    side: 'w',
    baseY: 0,
    height: escalier.ceil,
    material: 'wall.ochre-light',
    openings: [{ at: SALON_DOOR_Z, width: 3.2, sill: salon.floor, head: salon.floor + 3.6, arched: true }],
  });
  put(g, doorway({ width: 3.2, height: 3.6, arched: true, thickness: WALL_T }), 'trim.gilt', [escalier.x0, salon.floor, SALON_DOOR_Z], Math.PI / 2);

  // Four shallow risers from the passage door up onto the foot of the flight.
  for (let i = 0; i < 4; i++) {
    put(g, boxGeo(3.6, 0.25, 0.4), 'trim.stone-limestone-warm', [ESCALIER_DOOR_X, 0.125 + 0.25 * i, escalier.z1 - 0.4 - 0.4 * (3 - i)]);
  }

  // The flight: 24 treads rising north from z = -124 (y = 1) to z = -136 (y = 7).
  for (let i = 0; i < steps; i++) {
    const tread = boxGeo(w, 0.25, run + 0.02);
    tread.translate(0, 0.25 * (i + 0.5), -run * (i + 0.5));
    put(g, tread, 'marble.blanc-carrare', [cx, escalier.floor, foot]);
    const nose = boxGeo(w, 0.06, 0.09);
    nose.translate(0, 0.25 * (i + 1) - 0.03, -run * (i + 1) + 0.03);
    put(g, nose, 'marble.rouge-royal', [cx, escalier.floor, foot]);
  }

  // Marble balustrades against the side walls, running up with the flight.
  const angle = Math.atan2(6, foot - head);
  const runLen = (foot - head) / Math.cos(angle);
  for (const side of [-1, 1]) {
    const x = cx + side * (w / 2 - 0.3);
    const b = balustrade({ length: runLen, spacing: 1.1, height: 1.0 });
    b.rotateY(Math.PI / 2);
    b.rotateX(angle);
    put(g, b, 'marble.blanc-carrare', [x, escalier.floor + 1.05, (foot + head) / 2]);
  }

  // Level-1 landing at the head of the flight, with the salon door on its west side.
  put(g, boxGeo(w, 0.5, escalier.z0 - head + 0.05), 'trim.stone-limestone-warm', [cx, 6.75, (escalier.z0 + head) / 2]);
  put(g, balustrade({ length: w - 4, spacing: 1.1, height: 1.0 }), 'marble.blanc-carrare', [cx, 7, head + 0.15]);

  // Blind arcade on the north wall, a string course either side, then the vault and its light well.
  for (const x of [cx - 3.6, cx + 3.6]) {
    put(g, boxGeo(2.6, 6.4, 0.12), 'wall.stone-cream', [x, 6.4, escalier.z0 + 0.06]);
    put(g, boxGeo(1.5, 2.6, 0.14), 'wall.slate-green', [x, 7.4, escalier.z0 + 0.1]);
  }
  for (const side of [-1, 1]) {
    const x = cx + side * (w / 2 - 0.1);
    put(g, boxGeo(0.16, 0.3, d), 'trim.stone-limestone-warm', [x, 4.6, cz]);
    put(g, boxGeo(0.16, 0.3, d), 'trim.stone-limestone-warm', [x, 11.4, cz]);
  }
  put(g, vaultSurface({ width: w - 0.6, span: d - 0.6, rise: 1.1, nx: 8, nz: 9 }), 'ceiling.plaster-white', [cx, escalier.ceil - 1.2, cz]);
  for (let i = 0; i < 5; i++) {
    const z = escalier.z0 + 1.5 + i * ((d - 3) / 5);
    put(g, boxGeo(w - 0.8, 0.26, 0.28), 'trim.stone-limestone-warm', [cx, escalier.ceil - 1.35, z]);
  }
  put(g, boxGeo(4.6, 0.22, 0.4), 'trim.stone-limestone-warm', [cx, escalier.ceil - 0.11, cz + 1.8]);
  put(g, boxGeo(4.6, 0.22, 0.4), 'trim.stone-limestone-warm', [cx, escalier.ceil - 0.11, cz - 1.8]);
  put(g, boxGeo(0.4, 0.22, 3.2), 'trim.stone-limestone-warm', [cx - 2.1, escalier.ceil - 0.11, cz]);
  put(g, boxGeo(0.4, 0.22, 3.2), 'trim.stone-limestone-warm', [cx + 2.1, escalier.ceil - 0.11, cz]);
  put(g, quadGeo(
    [cx - 1.9, escalier.ceil - 0.02, cz + 1.6],
    [cx + 1.9, escalier.ceil - 0.02, cz + 1.6],
    [cx + 1.9, escalier.ceil - 0.02, cz - 1.6],
    [cx - 1.9, escalier.ceil - 0.02, cz - 1.6],
    [[0, 0], [3.8, 0], [3.8, 3.2], [0, 3.2]],
  ), 'app.light-card', [0, 0, 0]);
  return g;
}

/** Appartements Napoleon III, Grand Salon: gilt boiserie, red silk, crystal, parquet, mirrors. */
export function buildSalon(rng: Rng): THREE.Group {
  const g = new THREE.Group();
  const cx = (salon.x0 + salon.x1) / 2;
  const cz = (salon.z0 + salon.z1) / 2;
  const w = salon.x1 - salon.x0;
  const d = salon.z1 - salon.z0;
  const floorY = salon.floor;
  const height = salon.ceil - salon.floor;
  const jitter = rng.range(0, 0.02);

  // Light: two chandeliers plus sconces, all warm, brightest under each chandelier.
  const chandeliers: Array<[number, number]> = [[cx - 5, cz], [cx + 5, cz]];
  const light: LightFn = (x, z) => {
    let v = 0.6;
    for (const [hx, hz] of chandeliers) v += 0.32 * spot(x, z, hx, hz, 8, 7, 1, 0);
    v += 0.14 * (1 - Math.min(1, Math.hypot((x - cx) / (w / 2), (z - cz) / (d / 2))));
    return v + jitter;
  };
  put(g, plate({ width: w, depth: d, nx: 30, nz: 19, y: floorY, light }), 'floor.parquet-versailles', [cx, floorY, cz]);

  sideWall(g, salon, { side: 'n', baseY: floorY, height, material: 'wall.crimson-silk' });
  sideWall(g, salon, { side: 's', baseY: floorY, height, material: 'wall.crimson-silk' });
  sideWall(g, salon, { side: 'w', baseY: floorY, height, material: 'wall.crimson-silk' });
  sideWall(g, salon, {
    side: 'e',
    baseY: floorY,
    height,
    material: 'wall.crimson-silk',
    openings: [{ at: SALON_DOOR_Z, width: 3.2, head: 3.6, arched: true }],
  });
  put(g, doorway({ width: 3.2, height: 3.6, arched: true, thickness: WALL_T }), 'trim.gilt', [salon.x1, floorY, SALON_DOOR_Z], -Math.PI / 2);

  // Boiserie: a gilt dado, red silk panels in gilt frames, and a gilt pilaster on every bay line.
  const northAt = (t: number): [number, number, number] => [salon.x0 + t, floorY, salon.z0 + 0.05];
  const southAt = (t: number): [number, number, number] => [salon.x0 + t, floorY, salon.z1 - 0.05];
  const westAt = (t: number): [number, number, number] => [salon.x0 + 0.05, floorY, salon.z0 + t];
  const eastAt = (t: number): [number, number, number] => [salon.x1 - 0.05, floorY, salon.z0 + t];

  const bayCount = (len: number): number => Math.max(3, Math.round(len / 5));
  const furnishWall = (
    len: number,
    at: (t: number) => [number, number, number],
    ry: number,
    skip: (t: number) => boolean,
  ): void => {
    // Dado along the whole wall.
    const dado = boxGeo(len, 1.15, 0.1);
    put(g, dado, 'trim.gilt', [at(len / 2)[0], floorY + 0.575, at(len / 2)[2]], ry);
    const bays = bayCount(len);
    const pitch = len / bays;
    for (let i = 0; i <= bays; i++) {
      const t = Math.min(len - 0.3, Math.max(0.3, i * pitch));
      if (skip(t)) continue;
      const p = pilaster({ width: 0.52, height: 4.6, depth: 0.13 });
      const atp = at(t);
      const mesh = addPart(g, p, 'trim.gilt') as THREE.Mesh;
      mesh.position.set(atp[0], floorY + 1.15, atp[2]);
      mesh.rotation.y = ry;
    }
    for (let i = 0; i < bays; i++) {
      const t = pitch * (i + 0.5);
      if (skip(t)) continue;
      const atp = at(t);
      addPanel(g, [atp[0], floorY + 1.55, atp[2]], ry, { width: pitch - 1.5, height: 3.5, material: 'wall.crimson-silk' });
    }
    // Entablature: a deep gilt frieze, then the cornice.
    const frieze = boxGeo(len, 0.75, 0.2);
    put(g, frieze, 'trim.gilt', [at(len / 2)[0], floorY + height - 1.05, at(len / 2)[2]], ry);
    const c = cornice({ length: len, height: 0.6, projection: 0.46, dentils: false });
    put(g, c, 'trim.gilt', [at(len / 2)[0], floorY + height - 0.62, at(len / 2)[2]], ry);
  };

  const mirrorT = w / 2;
  const doorT = SALON_DOOR_Z - salon.z0;
  furnishWall(w, northAt, 0, (t) => Math.abs(t - mirrorT) < 2.6);
  furnishWall(w, southAt, Math.PI, (t) => Math.abs(t - mirrorT) < 2.6);
  furnishWall(d, westAt, Math.PI / 2, (t) => Math.abs(t - doorT) < 2.2);
  furnishWall(d, eastAt, -Math.PI / 2, (t) => Math.abs(t - doorT) < 2.2);

  // Mirrors over the consoles on the two long walls.
  addMirror(g, [cx, floorY + 1.7, salon.z0 + 0.14], 0, { width: 2.4, height: 3.3, sill: 1.7 });
  addMirror(g, [cx, floorY + 1.7, salon.z1 - 0.14], Math.PI, { width: 2.4, height: 3.3, sill: 1.7 });
  addConsole(g, [cx, floorY, salon.z0 + 0.36], 0, 2.2);
  addConsole(g, [cx, floorY, salon.z1 - 0.36], Math.PI, 2.2);

  // Coffered ceiling in cream with gilt ribs, and a gilt medallion at the centre.
  put(g, cofferCeiling({ width: w, depth: d, baysX: 6, baysZ: 4, beamWidth: 0.34, beamDepth: 0.3, rosettes: true }), 'ceiling.cream-cove', [cx, salon.ceil, cz]);
  for (let i = 1; i < 6; i++) {
    const x = -w / 2 + (w * i) / 6;
    put(g, boxGeo(0.1, 0.06, d), 'trim.gilt', [cx + x, salon.ceil - 0.34, cz]);
  }
  for (let j = 1; j < 4; j++) {
    const z = -d / 2 + (d * j) / 4;
    put(g, boxGeo(w, 0.06, 0.1), 'trim.gilt', [cx, salon.ceil - 0.34, cz + z]);
  }
  const medallion = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.02, 0),
      new THREE.Vector2(1.1, -0.04),
      new THREE.Vector2(1.5, -0.02),
      new THREE.Vector2(1.7, -0.12),
      new THREE.Vector2(1.2, -0.22),
      new THREE.Vector2(0.02, -0.26),
    ],
    18,
  );
  medallion.rotateX(Math.PI);
  put(g, medallion, 'trim.gilt', [cx, salon.ceil - 0.36, cz]);
  corniceRing(g, salon, salon.ceil - 0.34, 'trim.gilt', 0.34);

  // Two crystal chandeliers and eight wall sconces.
  for (const [hx, hz] of chandeliers) addChandelier(g, [hx, salon.ceil - 0.1, hz], { arms: 8, radius: 1.15, drop: 2.5 });
  const sconceH = salon.ceil - 2.4;
  for (const x of [cx - 10, cx, cx + 10]) {
    addSconce(g, [x, sconceH, salon.z0 + 0.12], 0);
    addSconce(g, [x, sconceH, salon.z1 - 0.12], Math.PI);
  }
  return g;
}

