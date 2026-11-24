import * as THREE from 'three';
import { boxGeo, smoothstep } from '../../core/geom';
import { addPart, addParts } from '../../core/merge';
import { cornice, doorway, wall } from '../../core/builders';
import {
  CORNICE,
  khorsabad,
  marly,
  marlyTerrace,
  puget,
  pugetTerrace,
  PUGE_ASCENT_X,
  PUGE_DESCENT_X,
  WALL_T,
} from './layout';
import {
  parapet,
  plate,
  put,
  stoneFlight,
  windowBays,
  windowGlass,
  windowUnit,
  type Bay,
} from './parts';
import { glazedRoof } from './roof';
import type { Rng } from '../../core/rng';

/**
 * The three glazed courts. Their scale is the point, so the geometry budget goes into the roof
 * structure and the walls that carry it, and the ornament that matters is the daylight: every
 * floor, terrace and plinth top here is shaded by a baked function of distance from the glazing,
 * because nothing in this project casts a realtime shadow.
 */

export interface WallSide {
  side: 'n' | 's' | 'e' | 'w';
  baseY: number;
  height: number;
  material: string;
  openings?: Array<{ at: number; width: number; sill?: number; head: number; arched?: boolean }>;
  thickness?: number;
}

/** Place one wall of an axis-aligned cell, with its interior face exactly on the room bounds. */
export function sideWall(parent: THREE.Object3D, cell: { x0: number; x1: number; z0: number; z1: number }, o: WallSide): void {
  const t = o.thickness ?? WALL_T;
  const cx = (cell.x0 + cell.x1) / 2;
  const cz = (cell.z0 + cell.z1) / 2;
  const localX = (at: number): number => {
    if (o.side === 'n') return at - cx;
    if (o.side === 's') return cx - at;
    if (o.side === 'w') return cz - at;
    return at - cz;
  };
  const horizontal = o.side === 'n' || o.side === 's';
  const length = horizontal ? cell.x1 - cell.x0 : cell.z1 - cell.z0;
  const geo = wall({
    length: length + t * 2,
    height: o.height,
    thickness: t,
    cornerAo: 0.24,
    openings: (o.openings ?? []).map((op) => ({
      x: localX(op.at),
      width: op.width,
      sill: op.sill ?? 0,
      head: op.head,
      arched: op.arched,
    })),
  });
  const at: [number, number, number] =
    o.side === 'n' ? [cx, o.baseY, cell.z0 - t / 2]
    : o.side === 's' ? [cx, o.baseY, cell.z1 + t / 2]
    : o.side === 'w' ? [cell.x0 - t / 2, o.baseY, cz]
    : [cell.x1 + t / 2, o.baseY, cz];
  const rotationY = o.side === 'n' ? 0 : o.side === 's' ? Math.PI : o.side === 'w' ? Math.PI / 2 : -Math.PI / 2;
  addPart(parent, geo, o.material).position.set(at[0], at[1], at[2]);
  const mesh = parent.children[parent.children.length - 1] as THREE.Mesh;
  mesh.rotation.y = rotationY;
}

/** Where a bay sits in world space on a cell side, and which way its window faces. */
function bayOn(cell: { x0: number; x1: number; z0: number; z1: number }, side: 'n' | 's' | 'e' | 'w', along: number, y: number): Bay {
  const at: [number, number, number] =
    side === 'n' ? [along, y, cell.z0] : side === 's' ? [along, y, cell.z1] : side === 'w' ? [cell.x0, y, along] : [cell.x1, y, along];
  return { at, rotationY: side === 'n' ? 0 : side === 's' ? Math.PI : side === 'w' ? Math.PI / 2 : -Math.PI / 2 };
}

const bayCentres = (a: number, b: number, count: number): number[] => {
  const pitch = (b - a) / count;
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(a + pitch * (i + 0.5));
  return out;
};

const smoothBand = (z: number, period: number, amp: number): number => 1 - amp * (0.5 + 0.5 * Math.sin((z / period) * Math.PI * 2));

/** A perimeter cornice ring at a given height, standing proud inside the cell. */
function corniceRing(parent: THREE.Object3D, cell: { x0: number; x1: number; z0: number; z1: number }, y: number, material: string, size = 0.5): void {
  const cx = (cell.x0 + cell.x1) / 2;
  const cz = (cell.z0 + cell.z1) / 2;
  const w = cell.x1 - cell.x0;
  const d = cell.z1 - cell.z0;
  const runs: Array<{ length: number; at: [number, number, number]; ry: number }> = [
    { length: w, at: [cx, y, cell.z0], ry: 0 },
    { length: w, at: [cx, y, cell.z1], ry: Math.PI },
    { length: d, at: [cell.x0, y, cz], ry: Math.PI / 2 },
    { length: d, at: [cell.x1, y, cz], ry: -Math.PI / 2 },
  ];
  for (const r of runs) {
    const g = cornice({ length: r.length, height: size, projection: size * 0.62, dentils: false });
    put(parent, g, material, r.at, r.ry);
  }
}

/** The level-1 gallery that runs all round a court: a stone ledge with a parapet above it. */
function galleryRing(parent: THREE.Object3D, cell: { x0: number; x1: number; z0: number; z1: number }, y: number, ledge: number, material: string): void {
  const w = cell.x1 - cell.x0;
  const d = cell.z1 - cell.z0;
  const cx = (cell.x0 + cell.x1) / 2;
  const cz = (cell.z0 + cell.z1) / 2;
  const slab = (width: number, depth: number, at: [number, number, number]): void => {
    put(parent, boxGeo(width, 0.55, depth), material, at);
  };
  slab(w, ledge, [cx, y - 0.28, cell.z0 + ledge / 2]);
  slab(w, ledge, [cx, y - 0.28, cell.z1 - ledge / 2]);
  slab(ledge, d - ledge * 2, [cell.x0 + ledge / 2, y - 0.28, cz]);
  slab(ledge, d - ledge * 2, [cell.x1 - ledge / 2, y - 0.28, cz]);
  const rail = (length: number, at: [number, number, number], ry: number): void => {
    put(parent, parapet({ length, height: 0.92, thickness: 0.3 }), material, at, ry);
  };
  rail(w - ledge * 2, [cx, y, cell.z0 + ledge], 0);
  rail(w - ledge * 2, [cx, y, cell.z1 - ledge], 0);
  rail(d - ledge * 2, [cell.x0 + ledge, y, cz], Math.PI / 2);
  rail(d - ledge * 2, [cell.x1 - ledge, y, cz], Math.PI / 2);
  corniceRing(parent, { x0: cell.x0 + ledge, x1: cell.x1 - ledge, z0: cell.z0 + ledge, z1: cell.z1 - ledge }, y - 0.56, material, 0.3);
}

/** Two storeys of tall stone windows on the walls that face a court. */
function courtWindows(
  parent: THREE.Object3D,
  cell: { x0: number; x1: number; z0: number; z1: number },
  sides: Array<'n' | 's' | 'e' | 'w'>,
  storeys: Array<{ sill: number; head: number; bay: number }>,
  material: string,
): void {
  const bays: Bay[] = [];
  const spans: Record<'n' | 's' | 'e' | 'w', number> = {
    n: cell.x1 - cell.x0,
    s: cell.x1 - cell.x0,
    e: cell.z1 - cell.z0,
    w: cell.z1 - cell.z0,
  };
  const pitch = storeys[0]?.bay ?? 4.5;
  for (const side of sides) {
    const horizontal = side === 'n' || side === 's';
    const a = horizontal ? cell.x0 : cell.z0;
    const b = horizontal ? cell.x1 : cell.z1;
    const count = Math.max(3, Math.round(spans[side] / pitch));
    for (const st of storeys) {
      for (const along of bayCentres(a, b, count)) bays.push(bayOn(cell, side, along, st.sill));
    }
  }
  if (bays.length === 0) return;
  const w = 2.4;
  const heightBySill = new Map<number, number>();
  for (const st of storeys) heightBySill.set(st.sill, st.head - st.sill);
  const groups = [...heightBySill.entries()];
  for (const [sill, height] of groups) {
    const subset = bays.filter((b) => Math.abs(b.at[1] - sill) < 0.001);
    const parts = windowBays(subset, windowUnit({ width: w, height, mullions: 2 }), windowGlass({ width: w, height }));
    addParts(parent, { [material]: parts.frames, 'glass.skylight-clear': parts.glass });
  }
}

/** Cour Marly: 54 × 41 m under a 54 × 42.61 m glazed roof, with the Marly Horses on a raised terrace. */
export function buildMarly(rng: Rng): THREE.Group {
  const g = new THREE.Group();
  const cx = (marly.x0 + marly.x1) / 2;
  const cz = (marly.z0 + marly.z1) / 2;
  const w = marly.x1 - marly.x0;
  const d = marly.z1 - marly.z0;
  const jitter = rng.range(0, 0.02);

  const daylight = (x: number, z: number): number => {
    const r = Math.hypot((x - cx) / (w / 2), (z - cz) / (d / 2));
    const core = 1 - smoothstep(0.12, 1.05, r);
    const louvre = smoothBand(z, 2.15, 0.035) * smoothBand(x, 2.15, 0.035);
    const terrazza = 1 + 0.07 * smoothstep(-74, -84, x);
    return (0.7 + 0.3 * core) * louvre * terrazza + jitter;
  };

  put(g, plate({ width: w, depth: d, nx: 36, nz: 28, light: daylight }), 'floor.marble-checker', [cx, marly.floor, cz]);

  sideWall(g, marly, { side: 'n', baseY: 0, height: CORNICE, material: 'wall.ochre-light', openings: marlyWindowHoles(marly, 'n') });
  sideWall(g, marly, { side: 's', baseY: 0, height: CORNICE, material: 'wall.ochre-light', openings: marlyWindowHoles(marly, 's') });
  sideWall(g, marly, { side: 'w', baseY: 0, height: CORNICE, material: 'wall.ochre-light', openings: marlyWindowHoles(marly, 'w') });
  courtWindows(
    g,
    marly,
    ['n', 's', 'w'],
    [{ sill: 7.9, head: 11.5, bay: 4.5 }, { sill: 13.6, head: 16.8, bay: 4.5 }, { sill: 17.6, head: 19.9, bay: 4.5 }],
    'trim.stone-limestone-warm',
  );

  galleryRing(g, marly, 7.4, 3.1, 'trim.stone-limestone-warm');

  // The courtyard cornice the Pei vault is propped on.
  corniceRing(g, marly, CORNICE - 0.55, 'trim.stone-limestone-warm', 0.55);

  // Raised terrace at the west end and the flight down from it.
  const t = marlyTerrace;
  const tw = t.x1 - t.x0;
  const td = t.z1 - t.z0;
  put(g, boxGeo(tw, t.floor, td), 'trim.stone-limestone-warm', [t.x0 + tw / 2, t.floor / 2, cz]);
  put(g, plate({ width: tw, depth: td, nx: 10, nz: 20, y: t.floor, light: (x, z) => daylight(x, z) * 1.02 }), 'floor.marble-checker', [t.x0 + tw / 2, t.floor, cz]);
  // The flight runs the full width of the court: a terrace reached by a broad flight, which is also
  // what lets the walker's floorAt ramp (a pure function of x) agree with the treads everywhere.
  const step = stoneFlight({ steps: 8, rise: 0.25, run: 0.5, width: td, dir: '-x' });
  put(g, step, 'trim.stone-limestone-warm', [t.x1 + 4, 0, cz]);

  glazedRoof(g, { cell: marly, spring: CORNICE, rise: marly.ceil - CORNICE, trusses: 12, purlins: 8, segments: 14 });
  return g;
}

function marlyWindowHoles(cell: { x0: number; x1: number; z0: number; z1: number }, side: 'n' | 's' | 'w'): Array<{ at: number; width: number; sill: number; head: number }> {
  const horizontal = side === 'n' || side === 's';
  const a = horizontal ? cell.x0 : cell.z0;
  const b = horizontal ? cell.x1 : cell.z1;
  const count = Math.max(3, Math.round((b - a) / 4.5));
  const out: Array<{ at: number; width: number; sill: number; head: number }> = [];
  for (const along of bayCentres(a, b, count)) {
    out.push({ at: along, width: 2.4, sill: 7.9, head: 11.5 });
    out.push({ at: along, width: 2.4, sill: 13.6, head: 16.8 });
    out.push({ at: along, width: 2.4, sill: 17.6, head: 19.9 });
  }
  return out;
}

/** Cour Puget: 50 × 41 m, its floor 4.5 m below the passage, three terraces, Milo in the pit. */
export function buildPuget(rng: Rng): THREE.Group {
  const g = new THREE.Group();
  const cx = (puget.x0 + puget.x1) / 2;
  const cz = (puget.z0 + puget.z1) / 2;
  const w = puget.x1 - puget.x0;
  const d = puget.z1 - puget.z0;
  const jitter = rng.range(0, 0.02);

  const daylight = (x: number, z: number): number => {
    const r = Math.hypot((x - cx) / (w / 2), (z - cz) / (d / 2));
    const core = 1 - smoothstep(0.1, 1.05, r);
    const louvre = smoothBand(z, 2.15, 0.03);
    // The lower terrace, deeper in the court, stays cooler and dimmer than the west gallery.
    const depth = smoothstep(0, 1, (x - puget.x0) / (puget.x1 - puget.x0));
    return (0.62 + 0.32 * core) * louvre * (0.92 + 0.11 * (1 - depth)) + jitter;
  };

  put(g, plate({ width: w, depth: d, nx: 34, nz: 28, light: daylight }), 'floor.marble-checker', [cx, puget.floor, cz]);

  sideWall(g, puget, { side: 'n', baseY: puget.floor, height: CORNICE - puget.floor, material: 'wall.ochre-light', openings: pugetWindowHoles('n') });
  sideWall(g, puget, { side: 's', baseY: puget.floor, height: CORNICE - puget.floor, material: 'wall.ochre-light', openings: pugetWindowHoles('s') });
  // East wall: shared with Cour Khorsabad, with the opening between the two courts.
  sideWall(g, puget, {
    side: 'e',
    baseY: puget.floor,
    height: CORNICE - puget.floor,
    material: 'wall.ochre-light',
    openings: [...pugetWindowHoles('e'), { at: -108.5, width: 8, sill: 4.5, head: 9.4 }],
  });
  courtWindows(
    g,
    puget,
    ['n', 's', 'e'],
    [
      { sill: 2.9, head: 6.4, bay: 4.5 },
      { sill: 8.2, head: 11.2, bay: 4.5 },
      { sill: 14.6, head: 19.0, bay: 4.5 },
    ],
    'trim.stone-limestone-warm',
  );

  galleryRing(g, puget, 6.2, 2.6, 'trim.stone-limestone-warm');
  corniceRing(g, puget, CORNICE - 0.5, 'trim.stone-limestone-warm', 0.5);

  // West gallery at passage level, and the flight down into the court.
  const pt = pugetTerrace;
  put(g, boxGeo(pt.x1 - pt.x0, 4.5, d), 'trim.stone-limestone-warm', [(pt.x0 + pt.x1) / 2, puget.floor + 2.25, cz]);
  put(g, plate({ width: pt.x1 - pt.x0, depth: d, nx: 6, nz: 20, y: pugetTerrace.floor, light: (x, z) => daylight(x, z) }), 'floor.marble-checker', [(pt.x0 + pt.x1) / 2, pugetTerrace.floor, cz]);
  // Both flights run the full depth of the court, so the walker's floorAt ramp is a function of x
  // alone: a terraced court with continuous steps rather than two staircases in a wall.
  const down = stoneFlight({ steps: 18, rise: 0.25, run: 0.55, width: d, dir: '-x' });
  put(g, down, 'trim.stone-limestone-warm', [PUGE_DESCENT_X[1], puget.floor, cz]);
  const up = stoneFlight({ steps: 18, rise: 0.25, run: 0.55, width: d, dir: '+x' });
  put(g, up, 'trim.stone-limestone-warm', [PUGE_ASCENT_X[0], puget.floor, cz]);

  glazedRoof(g, { cell: puget, spring: CORNICE, rise: puget.ceil - CORNICE, trusses: 11, purlins: 7, segments: 12 });
  return g;
}

function pugetWindowHoles(side: 'n' | 's' | 'e'): Array<{ at: number; width: number; sill: number; head: number }> {
  const horizontal = side === 'n' || side === 's';
  const a = horizontal ? puget.x0 : puget.z0;
  const b = horizontal ? puget.x1 : puget.z1;
  const count = Math.max(3, Math.round((b - a) / 4.5));
  const out: Array<{ at: number; width: number; sill: number; head: number }> = [];
  for (const along of bayCentres(a, b, count)) {
    out.push({ at: along, width: 2.4, sill: 2.9, head: 6.4 });
    out.push({ at: along, width: 2.4, sill: 8.2, head: 11.2 });
    out.push({ at: along, width: 2.4, sill: 14.6, head: 19.0 });
  }
  return out;
}

/** Cour Khorsabad: 32 × 41 m under a lower glazed roof, the lamassu guarding both doorways. */
export function buildKhorsabad(rng: Rng): THREE.Group {
  const g = new THREE.Group();
  const cx = (khorsabad.x0 + khorsabad.x1) / 2;
  const cz = (khorsabad.z0 + khorsabad.z1) / 2;
  const w = khorsabad.x1 - khorsabad.x0;
  const d = khorsabad.z1 - khorsabad.z0;
  const jitter = rng.range(0, 0.02);

  const daylight = (x: number, z: number): number => {
    const r = Math.hypot((x - cx) / (w / 2), (z - cz) / (d / 2));
    const core = 1 - smoothstep(0.1, 1.05, r);
    return (0.78 + 0.2 * core) * smoothBand(x, 3.1, 0.02) + jitter;
  };

  put(g, plate({ width: w, depth: d, nx: 26, nz: 28, light: daylight }), 'floor.stone-flag', [cx, khorsabad.floor, cz]);

  sideWall(g, khorsabad, { side: 'n', baseY: 0, height: CORNICE, material: 'wall.slate-green', openings: khorHoles('n') });
  sideWall(g, khorsabad, { side: 's', baseY: 0, height: CORNICE, material: 'wall.slate-green', openings: khorHoles('s') });
  sideWall(g, khorsabad, {
    side: 'w',
    baseY: 0,
    height: CORNICE,
    material: 'wall.slate-green',
    openings: [...khorHoles('w'), { at: -108.5, width: 8, head: 4.9 }],
  });
  // East wall: shared with the Hammurabi room, with the door through to it.
  sideWall(g, khorsabad, {
    side: 'e',
    baseY: 0,
    height: CORNICE,
    material: 'wall.slate-green',
    openings: [{ at: -103, width: 4.2, head: 4.4, arched: true }],
  });
  put(g, doorway({ width: 4.2, height: 4.4, arched: true }), 'trim.stone-limestone-warm', [khorsabad.x1, 0, -103], -Math.PI / 2);

  courtWindows(
    g,
    khorsabad,
    ['n', 's', 'w'],
    [{ sill: 5.4, head: 9.6, bay: 5 }, { sill: 12.4, head: 16.6, bay: 5 }],
    'trim.stone-limestone-warm',
  );
  galleryRing(g, khorsabad, 4.6, 2.4, 'trim.stone-limestone-warm');
  corniceRing(g, khorsabad, CORNICE - 0.45, 'trim.stone-limestone-warm', 0.45);

  // The two lamassu doorways: a threshold band of stone across the court floor.
  put(g, boxGeo(2.2, 0.08, 40.4), 'trim.stone-limestone-warm', [khorsabad.x0 + 1.1, 0.04, cz]);

  glazedRoof(g, { cell: khorsabad, spring: CORNICE, rise: khorsabad.ceil - CORNICE, trusses: 8, purlins: 5, segments: 9 });
  return g;
}

function khorHoles(side: 'n' | 's' | 'w'): Array<{ at: number; width: number; sill: number; head: number }> {
  const horizontal = side === 'n' || side === 's';
  const a = horizontal ? khorsabad.x0 : khorsabad.z0;
  const b = horizontal ? khorsabad.x1 : khorsabad.z1;
  const count = Math.max(2, Math.round((b - a) / 5));
  const out: Array<{ at: number; width: number; sill: number; head: number }> = [];
  for (const along of bayCentres(a, b, count)) {
    out.push({ at: along, width: 2.4, sill: 5.4, head: 9.6 });
    out.push({ at: along, width: 2.4, sill: 12.4, head: 16.6 });
  }
  return out;
}

export { corniceRing, bayCentres };
