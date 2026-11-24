import * as THREE from 'three';
import { bakeAo, boxGeo, mergeAll, smoothstep } from '../../core/geom';
import { addPart } from '../../core/merge';
import { cornice, floor } from '../../core/builders';
import type { Hole } from './geo';
import { bx, corniceOn, faceInward, q, skirtOn, wallOn } from './geo';
import { ROOMS } from './layout';

/**
 * The Cour Carrée and Perrault's hall — the court is a light well, so most of this file is one
 * façade generator used four times with a different elevation on each side.
 *
 * Elevation, from the real rhythm in `geometry.md` §9 (25 bays of 4.5 m over the 112.5 m face):
 *   - a rusticated base to 6.4 m, banded, no openings (the blind ground floor of the ring);
 *   - level 1 windows 1.6 x 2.8, sill 7.7, between giant pilasters every third bay;
 *   - level 2 windows 1.3 x 1.9, sill 14.2;
 *   - string courses at 6.9 and 13.6, cornice at 20.4.
 * The south range also gets a clerestory row at 4.4-6.2 for the sculpture rooms behind it, whose
 * ceilings are 6.4 m: without that row those rooms would have no daylight at all.
 */

const CORNICE_Y = 20.4;
const STRING_1 = 6.9;
const STRING_2 = 13.6;
const BAY = 4.5;

type Side = 'n' | 's' | 'e' | 'w';

/** A box whose width runs along the façade's axis and whose depth runs along its normal. */
function faceBox(
  side: Side,
  at: number,
  along: number,
  y: number,
  w: number,
  h: number,
  d: number,
  offset: number,
): THREE.BufferGeometry {
  const inward = side === 'n' ? 1 : side === 's' ? -1 : side === 'w' ? 1 : -1;
  if (side === 'n' || side === 's') return bx(w, h, d, along, y, at + inward * offset);
  return bx(d, h, w, at + inward * offset, y, along);
}

/** A single glazed pane sitting in the wall's plane. */
function faceQuad(side: Side, at: number, along: number, y0: number, y1: number, w: number): THREE.BufferGeometry {
  const inward = side === 'n' ? 1 : side === 's' ? -1 : side === 'w' ? 1 : -1;
  const off = inward * 0.18;
  if (side === 'n' || side === 's') {
    const z = at + off;
    const a: [number, number, number] = [along - w / 2, y0, z];
    const b: [number, number, number] = [along + w / 2, y0, z];
    const c: [number, number, number] = [along + w / 2, y1, z];
    const d: [number, number, number] = [along - w / 2, y1, z];
    return inward > 0 ? q(a, b, c, d) : q(b, a, d, c);
  }
  const x = at + off;
  const a: [number, number, number] = [x, y0, along + w / 2];
  const b: [number, number, number] = [x, y0, along - w / 2];
  const c: [number, number, number] = [x, y1, along - w / 2];
  const d: [number, number, number] = [x, y1, along + w / 2];
  return inward > 0 ? q(a, b, c, d) : q(b, a, d, c);
}

interface Clerestory {
  /** Bays whose centres fall inside this range get one tall opening instead of the two window rows. */
  range: [number, number];
  sill: number;
  head: number;
  width: number;
}

interface FacadeSpec {
  side: Side;
  at: number;
  from: number;
  to: number;
  /** Extra holes measured in world heights (the pavilion arch, the perrault arch). */
  extras?: Array<{ at: number; width: number; sillY: number; headY: number; arched?: boolean }>;
  /** Bay windows suppressed over these ranges. */
  blocked?: Array<[number, number]>;
  /** Tall openings that reach rooms too low for the level-1 row. */
  clerestories?: Clerestory[];
}

const GROUND_TOP = 6.4;

function facade(parent: THREE.Object3D, spec: FacadeSpec): void {
  const holes: Hole[] = [];
  const glass: THREE.BufferGeometry[] = [];
  const stone: THREE.BufferGeometry[] = [];
  const bays = Math.round((spec.to - spec.from) / BAY);
  const bayW = (spec.to - spec.from) / bays;
  const centres: number[] = [];
  for (let i = 0; i < bays; i++) centres.push(spec.from + bayW * (i + 0.5));

  const blocked = spec.blocked ?? [];
  const isBlocked = (c: number): boolean => blocked.some(([a, b]) => c >= a && c <= b);

  const rows: Array<{ width: number; sill: number; head: number }> = [
    { width: 1.6, sill: 7.7, head: 10.5 },
    { width: 1.3, sill: 14.2, head: 16.1 },
  ];

  const dress = (c: number, width: number, sill: number, head: number): void => {
    holes.push({ at: c, width, sill, head });
    glass.push(faceQuad(spec.side, spec.at, c, sill + 0.05, head - 0.05, width - 0.08));
    stone.push(faceBox(spec.side, spec.at, c, sill - 0.08, width + 0.5, 0.16, 1.0, 0.12));
    stone.push(faceBox(spec.side, spec.at, c, head + 0.08, width + 0.4, 0.16, 0.9, 0.1));
  };

  for (const c of centres) {
    if (isBlocked(c)) continue;
    const tall = (spec.clerestories ?? []).find((k) => c >= k.range[0] && c <= k.range[1]);
    if (tall) {
      dress(c, tall.width, tall.sill, tall.head);
      continue;
    }
    for (const r of rows) dress(c, r.width, r.sill, r.head);
  }

  const extras = spec.extras ?? [];
  for (const e of extras) {
    holes.push({ at: e.at, width: e.width, sill: e.sillY, head: e.headY, arched: e.arched });
  }

  wallOn(parent, {
    face: spec.side,
    at: spec.at,
    from: spec.from,
    to: spec.to,
    floorY: 0,
    height: CORNICE_Y,
    thickness: 0.9,
    holes,
    mat: 'stone.limestone-warm',
    cornerAo: 0,
  });

  if (glass.length) addPart(parent, mergeAll(glass), 'glass.skylight-clear');
  if (stone.length) addPart(parent, mergeAll(stone), 'trim.stone-limestone-warm');

  // Rusticated band joints: shallow beads every 1.15 m up to the string course.
  const beads: THREE.BufferGeometry[] = [];
  for (let y = 1.15; y < GROUND_TOP; y += 1.15) {
    beads.push(faceBox(spec.side, spec.at, (spec.from + spec.to) / 2, y, spec.to - spec.from, 0.09, 0.16, 0.08));
  }
  // Giant pilasters every third bay, from the level-1 string course into the attic.
  const pilasters: THREE.BufferGeometry[] = [];
  for (let i = 1; i < bays; i += 3) {
    const c = spec.from + bayW * i;
    pilasters.push(faceBox(spec.side, spec.at, c, (STRING_1 + 19.9) / 2, 0.82, 19.9 - STRING_1, 0.34, 0.17));
    pilasters.push(faceBox(spec.side, spec.at, c, STRING_1 + 0.16, 1.02, 0.22, 0.5, 0.25));
    pilasters.push(faceBox(spec.side, spec.at, c, 19.72, 1.06, 0.32, 0.55, 0.27));
  }
  // String courses.
  for (const y of [STRING_1, STRING_2]) {
    pilasters.push(faceBox(spec.side, spec.at, (spec.from + spec.to) / 2, y, spec.to - spec.from, 0.26, 0.5, 0.25));
  }
  const trim = mergeAll([...beads, ...pilasters]);
  bakeAo(trim, (x, y, z) => 0.82 + 0.18 * smoothstep(0, 2.2, y));
  addPart(parent, trim, 'trim.stone-limestone-warm');

  // The cornice that carries the roofline the exterior zone sits on.
  const corn = cornice({ length: spec.to - spec.from, height: 0.62, projection: 0.52, dentils: true });
  const rot = spec.side === 'n' ? 0 : spec.side === 's' ? Math.PI : spec.side === 'w' ? Math.PI / 2 : -Math.PI / 2;
  corn.rotateY(rot);
  const mid = (spec.from + spec.to) / 2;
  if (spec.side === 'n' || spec.side === 's') corn.translate(mid, CORNICE_Y - 0.62, spec.at);
  else corn.translate(spec.at, CORNICE_Y - 0.62, mid);
  addPart(parent, corn, 'trim.stone-limestone-warm');

  // Attic band closing the wall into the cornice.
  addPart(
    parent,
    faceBox(spec.side, spec.at, mid, 19.95, spec.to - spec.from, 0.5, 0.16, 0.08),
    'stone.limestone-pale',
  );
}

/** The paving: a granite cross between four fields of setts. */
function paving(parent: THREE.Object3D): void {
  const b = ROOMS['cour-carree'];
  const w = b.x[1] - b.x[0];
  const d = b.z[1] - b.z[0];
  const cx = (b.x[0] + b.x[1]) / 2;
  const cz = (b.z[0] + b.z[1]) / 2;
  const field = floor({ width: w, depth: d, thickness: 0.4, edgeFalloff: 2.6 });
  field.translate(cx, 0.02, cz);
  addPart(parent, field, 'floor.pave-granite');

  const parts: THREE.BufferGeometry[] = [];
  const band = 1.7;
  parts.push(bx(w, 0.1, band, cx, 0.05, cz));
  parts.push(bx(band, 0.1, d, cx, 0.05, cz));
  // Outer margin, two slabs deep.
  for (const s of [-1, 1]) {
    parts.push(bx(w - 2.4, 0.08, 1.2, cx, 0.04, cz + s * (d / 2 - 0.9)));
    parts.push(bx(1.2, 0.08, d - 2.4, cx + s * (w / 2 - 0.9), 0.04, cz));
  }
  addPart(parent, mergeAll(parts), 'stone.granite-grey');
}

/** The open sky over the court. */
function sky(parent: THREE.Object3D): void {
  const b = ROOMS['cour-carree'];
  const pad = 2;
  const geo = q(
    [b.x[0] - pad, 20.2, b.z[0] - pad],
    [b.x[1] + pad, 20.2, b.z[0] - pad],
    [b.x[1] + pad, 20.2, b.z[1] + pad],
    [b.x[0] - pad, 20.2, b.z[1] + pad],
  );
  geo.computeVertexNormals();
  faceInward(geo, [(b.x[0] + b.x[1]) / 2, 0, (b.z[0] + b.z[1]) / 2]);
  // Dimmed in vertex colour: an emissive sky at full palette value blows the façades out under
  // ACES, and the court reads as a light well only if the stone has something to be darker than.
  bakeAo(geo, () => 0.6);
  addPart(parent, geo, 'context.sky-day');
}

export function buildCourCarree(g: THREE.Group): void {
  paving(g);
  sky(g);

  const b = ROOMS['cour-carree'];

  // West: the Lescot wing and the Pavillon de l'Horloge's court face, pierced by its arch.
  facade(g, {
    side: 'w',
    at: b.x[0],
    from: b.z[0],
    to: b.z[1],
    extras: [{ at: 0, width: 5.5, sillY: 0, headY: 8.5, arched: true }],
    blocked: [[-14.5, 14.5]],
    // The Henri II stair hall (14 m) and the Caryatides (8.5 m) get tall openings instead of the
    // level-1 and level-2 rows, because those rows sit above their ceilings.
    clerestories: [
      { range: [14, 30], sill: 6.4, head: 12.2, width: 2.2 },
      { range: [30, 55], sill: 5.0, head: 8.1, width: 2.2 },
    ],
  });

  // East: Perrault. Plain base, the arch into his hall.
  facade(g, {
    side: 'e',
    at: b.x[1],
    from: b.z[0],
    to: b.z[1],
    extras: [{ at: 0, width: 5, sillY: 0, headY: 5.5, arched: true }],
    blocked: [[-3.6, 3.6]],
  });

  // North: the Lemercier wing. Its level-2 windows light the level-2 corridor and Dutch rooms.
  facade(g, {
    side: 'n',
    at: b.z[0],
    from: b.x[0],
    to: b.x[1],
  });

  // South: the sculpture range, with the clerestory that actually reaches those rooms.
  facade(g, {
    side: 's',
    at: b.z[1],
    from: b.x[0],
    to: b.x[1],
    clerestories: [
      { range: [ROOMS['salle-grec-346'].x[0], ROOMS['sphinx-crypt'].x[1]], sill: 4.4, head: 6.2, width: 2.0 },
    ],
  });

  // The pavilion arch's dressed casing, seen from the court.
  const casing = cornice({ length: 8.4, height: 0.5, projection: 0.4, dentils: false });
  casing.rotateY(Math.PI / 2);
  casing.translate(b.x[0] + 0.5, 8.6, 0);
  addPart(g, casing, 'trim.stone-limestone-warm');
}

export function buildPerrault(g: THREE.Group): void {
  const b = ROOMS['salle-perrault'];
  const court = ROOMS['cour-carree'];

  // The court's east façade already builds x = 252.25 between z = -56.25 and 56.25; these are the
  // two returns beyond the court's corners.
  for (const [z0, z1] of [
    [b.z[0], court.z[0]],
    [court.z[1], b.z[1]],
  ] as Array<[number, number]>) {
    wallOn(g, {
      face: 'w',
      at: b.x[0],
      from: z0,
      to: z1,
      floorY: 0,
      height: b.y1,
      thickness: 0.9,
      mat: 'wall.stone-grey',
    });
  }

  // The east wall: a screen of piers with the daylight slots between them, so the hall reads as
  // deep shade with light coming in horizontal bars.
  const bays = 17;
  const bayW = (b.z[1] - b.z[0]) / bays;
  const holes: Hole[] = [];
  const piers: THREE.BufferGeometry[] = [];
  const cards: THREE.BufferGeometry[] = [];
  for (let i = 0; i < bays; i++) {
    const c = b.z[0] + bayW * (i + 0.5);
    if (Math.abs(c) < bayW * 0.6) continue;
    holes.push({ at: c, width: 4.0, sill: 1.3, head: 5.7, arched: true });
    cards.push(bx(0.06, 3.6, 4.4, b.x[1] - 0.24, 3.35, c));
  }
  wallOn(g, {
    face: 'e',
    at: b.x[1],
    from: b.z[0],
    to: b.z[1],
    floorY: 0,
    height: b.y1,
    thickness: 0.9,
    holes,
    mat: 'wall.stone-grey',
  });
  // Engaged half-columns on the piers facing the hall.
  for (let i = 0; i < bays; i++) {
    const c = b.z[0] + bayW * (i + 0.5);
    if (Math.abs(c) < bayW * 0.6) continue;
    for (const s of [-1, 1]) {
      const z = c + s * 2.55;
      piers.push(bx(0.34, 6.1, 0.62, b.x[1] - 0.6, 3.05, z));
      piers.push(bx(0.5, 0.22, 0.84, b.x[1] - 0.62, 0.11, z));
      piers.push(bx(0.52, 0.28, 0.9, b.x[1] - 0.62, 6.0, z));
    }
  }
  addPart(g, mergeAll(piers), 'wall.stone-grey');
  addPart(g, mergeAll(cards), 'app.light-card');

  addPart(g, floor({ width: b.x[1] - b.x[0], depth: b.z[1] - b.z[0] }).translate(
    (b.x[0] + b.x[1]) / 2,
    0.015,
    (b.z[0] + b.z[1]) / 2,
  ), 'floor.stone-flag');

  // Flat ceiling with three long beams.
  const ceil = boxGeo(b.x[1] - b.x[0], 0.35, b.z[1] - b.z[0]);
  ceil.translate((b.x[0] + b.x[1]) / 2, b.y1 + 0.175, (b.z[0] + b.z[1]) / 2);
  const beams: THREE.BufferGeometry[] = [];
  for (const z of [-30, 0, 30]) beams.push(bx(b.x[1] - b.x[0], 0.42, 0.5, (b.x[0] + b.x[1]) / 2, b.y1 - 0.21, z));
  addPart(g, mergeAll([ceil, ...beams]), 'ceiling.plaster-white');

  corniceOn(g, { face: 'w', at: b.x[0] + 0.02, from: b.z[0], to: b.z[1], y: b.y1 - 0.5, height: 0.5, projection: 0.3, dentils: false, mat: 'trim.stone-limestone-warm' });
  corniceOn(g, { face: 'e', at: b.x[1] - 0.02, from: b.z[0], to: b.z[1], y: b.y1 - 0.5, height: 0.5, projection: 0.3, dentils: false, mat: 'trim.stone-limestone-warm' });
  skirtOn(g, { face: 'w', at: b.x[0], from: b.z[0], to: b.z[1], y: 0, height: 0.28, thickness: 0.07, mat: 'stone.limestone-warm' });
}
