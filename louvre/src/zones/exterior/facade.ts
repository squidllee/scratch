import * as THREE from 'three';
import { wall } from '../../core/builders';
import type { Opening } from '../../core/builders/types';
import { boxGeo } from '../../core/geom';
import { mat } from '../../core/materials';
import { exteriorMaterial, ROOF_ZINC } from './parts';
import { DORMER, MANSARD, WINDOW, Y, type RunSpec, type RunStyle } from './plan';
import {
  CORNICE_BAND,
  STRING_COURSE,
  balustradeRun,
  corniceRun,
  dormerUnit,
  nicheUnit,
  pedimentUnit,
  pilasterUnit,
  plinthRun,
  statueUnit,
  stringCourse,
  windowPane,
  windowUnit,
  type InstanceSink,
} from './parts';
import { pavilionCrown } from './roof';

/**
 * One elevation, built from the plan.
 *
 * A run lays bays along a straight building line and stacks three storeys of openings on it: a
 * base storey in pale stone, two upper storeys in warm stone, pilasters on the bay divisions, a
 * moulded string course at each floor, the main cornice, and a balustrade. Everything repeated —
 * windows, panes, pilasters, pediments, dormers, niches, statues — goes into the zone-wide
 * instance sink, so a window on the Rivoli front costs one more instance and no draw call.
 */

export interface RunFrame {
  length: number;
  bay: number;
  /** Local -> world. */
  matrix: THREE.Matrix4;
  /** World coordinate along the run -> local u. */
  toLocal: (worldAlong: number) => number;
}

const WALL_T = 0.55;
/** The outer face stands 60 mm proud of the building line so no plane is coincident with an interior. */
const WALL_FACE = 0.06;
const WALL_CENTRE = WALL_FACE + WALL_T / 2;
/** Local z of a façade's stone face, where mouldings and frames attach. */
export const FACE_Z = WALL_FACE + WALL_T;

const STONE_BASE = 'stone.limestone-pale';
const STONE = 'stone.limestone-warm';
const TRIM = 'trim.stone-limestone-warm';
const PANE = 'marble.noir-marquina';

interface StyleOpts {
  pilasters: 'paired' | 'single' | 'none';
  pediments: boolean;
  balcony: boolean;
  /** 1 = every bay, 0.5 = every other bay, 0 = none. */
  dormers: number;
  balustrade: boolean;
  niches: boolean;
}

const STYLES: Record<RunStyle, StyleOpts> = {
  court: { pilasters: 'paired', pediments: true, balcony: false, dormers: 1, balustrade: true, niches: true },
  seafront: { pilasters: 'paired', pediments: false, balcony: true, dormers: 1, balustrade: true, niches: false },
  plain: { pilasters: 'single', pediments: false, balcony: false, dormers: 0.5, balustrade: true, niches: false },
  inner: { pilasters: 'none', pediments: false, balcony: false, dormers: 0, balustrade: false, niches: false },
};

export function runFrame(run: RunSpec): RunFrame {
  const length = Math.abs(run.to - run.from);
  const mid = (run.from + run.to) / 2;
  let ry = 0;
  let sign = 1;
  if (run.axis === 'x') {
    ry = run.out === 1 ? 0 : Math.PI;
    sign = run.out === 1 ? 1 : -1;
  } else {
    ry = run.out === 1 ? Math.PI / 2 : -Math.PI / 2;
    sign = run.out === 1 ? -1 : 1;
  }
  const cx = run.axis === 'x' ? mid : run.line;
  const cz = run.axis === 'x' ? run.line : mid;
  const matrix = new THREE.Matrix4().makeRotationY(ry);
  matrix.setPosition(cx, 0, cz);
  return { length, bay: length / run.bays, matrix, toLocal: (worldAlong: number) => (worldAlong - mid) * sign };
}

function ledgeBox(length: number): THREE.BufferGeometry {
  const g = boxGeo(length, 0.22, 0.7, { skip: ['back', 'bottom'] });
  return g;
}

function openingsFor(bays: number, bay: number, w: number, sill: number, head: number, slabBase: number): Opening[] {
  const out: Opening[] = [];
  for (let i = 0; i < bays; i++) {
    out.push({ x: (i - (bays - 1) / 2) * bay, width: w, sill: sill - slabBase, head: head - slabBase });
  }
  return out;
}

export interface RunBuild {
  group: THREE.Group;
  frame: RunFrame;
}

export function buildRun(run: RunSpec, sink: InstanceSink): RunBuild {
  const opts = STYLES[run.style];
  const frame = runFrame(run);
  const L = frame.length;
  const bay = frame.bay;
  const storeys = run.storeys ?? 3;
  const group = new THREE.Group();
  group.name = 'run:' + run.id;
  group.matrixAutoUpdate = false;
  group.matrix.copy(frame.matrix);

  const add = (geo: THREE.BufferGeometry, material: string): void => {
    group.add(new THREE.Mesh(geo, mat(material)));
  };
  /**
   * Instances go into one zone-wide mesh per element, so their transforms must be world matrices:
   * everything built here is in the run's local frame and is premultiplied by the run frame.
   */
  const inst = (key: string, unit: THREE.BufferGeometry, material: string, local: THREE.Matrix4): void => {
    sink.add(key, unit, material, local.premultiply(frame.matrix));
  };

  // --- ground storey ---------------------------------------------------------
  const base = wall({
    length: L,
    height: Y.storey2,
    thickness: WALL_T,
    openings: openingsFor(run.bays, bay, WINDOW.l0.w, WINDOW.l0.sill, WINDOW.l0.head, 0),
    cornerAo: 0.1,
  });
  base.translate(0, 0, WALL_CENTRE);
  add(base, STONE_BASE);
  add(plinthRun(L).translate(0, 0, FACE_Z), STONE_BASE);

  // --- upper storeys ---------------------------------------------------------
  const upperOpenings: Opening[] = [];
  if (storeys >= 2) upperOpenings.push(...openingsFor(run.bays, bay, WINDOW.l1.w, WINDOW.l1.sill, WINDOW.l1.head, Y.storey2));
  if (storeys >= 3) upperOpenings.push(...openingsFor(run.bays, bay, WINDOW.l2.w, WINDOW.l2.sill, WINDOW.l2.head, Y.storey2));
  const upperH = storeys >= 3 ? Y.cornice - Y.storey2 - CORNICE_BAND.height : Y.cornice - Y.storey2 - 0.6;
  const upper = wall({ length: L, height: upperH, thickness: WALL_T, openings: upperOpenings, cornerAo: 0.1 });
  upper.translate(0, Y.storey2, WALL_CENTRE);
  add(upper, STONE);
  if (storeys < 3) {
    const parapetH = Y.cornice - Y.storey2 - upperH;
    const parapet = wall({ length: L, height: parapetH, thickness: WALL_T, cornerAo: 0.05 });
    parapet.translate(0, Y.storey2 + upperH, WALL_CENTRE);
    add(parapet, STONE);
  }

  // --- horizontals -----------------------------------------------------------
  if (storeys >= 2) add(stringCourse(L).translate(0, Y.storey2 - STRING_COURSE.height * 0.7, FACE_Z), TRIM);
  if (storeys >= 3) add(stringCourse(L).translate(0, Y.storey3 - STRING_COURSE.height * 0.7, FACE_Z), TRIM);
  if (opts.balcony) {
    add(ledgeBox(L).translate(0, Y.storey2 + 0.11, FACE_Z), TRIM);
    add(balustradeRun(L, { height: 0.92, spacing: 0.8 }).translate(0, Y.storey2 + 0.22, FACE_Z), TRIM);
  }

  // --- main cornice and the balustrade on top of it ---------------------------
  add(corniceRun(L).translate(0, Y.cornice - CORNICE_BAND.height, FACE_Z), TRIM);
  if (opts.balustrade) add(balustradeRun(L, { height: 1.05 }).translate(0, Y.cornice, FACE_Z), TRIM);

  // --- windows ---------------------------------------------------------------
  const w0 = windowUnit({ w: WINDOW.l0.w, h: WINDOW.l0.head - WINDOW.l0.sill, frame: 0.22, dressed: true });
  const w1 = windowUnit({ w: WINDOW.l1.w, h: WINDOW.l1.head - WINDOW.l1.sill, frame: 0.2, dressed: opts.pediments });
  const w2 = windowUnit({ w: WINDOW.l2.w, h: WINDOW.l2.head - WINDOW.l2.sill, frame: 0.16, dressed: opts.pediments });
  const p0 = windowPane(WINDOW.l0.w, WINDOW.l0.head - WINDOW.l0.sill);
  const p1 = windowPane(WINDOW.l1.w, WINDOW.l1.head - WINDOW.l1.sill);
  const p2 = windowPane(WINDOW.l2.w, WINDOW.l2.head - WINDOW.l2.sill);
  const ped = pedimentUnit(WINDOW.l2.w + 0.7, 0.66);

  for (let i = 0; i < run.bays; i++) {
    const u = (i - (run.bays - 1) / 2) * bay;
    const at = (yCentre: number, dz = 0): THREE.Matrix4 =>
      new THREE.Matrix4().makeTranslation(u, yCentre, FACE_Z + dz);
    const y0 = (WINDOW.l0.sill + WINDOW.l0.head) / 2;
    const y1 = (WINDOW.l1.sill + WINDOW.l1.head) / 2;
    const y2 = (WINDOW.l2.sill + WINDOW.l2.head) / 2;
    inst('win-l0', w0, TRIM, at(y0));
    inst('pane-l0', p0, PANE, at(y0, -0.05));
    if (storeys >= 2) {
      inst('win-l1', w1, TRIM, at(y1));
      inst('pane-l1', p1, PANE, at(y1, -0.05));
    }
    if (storeys >= 3) {
      inst('win-l2', w2, TRIM, at(y2));
      inst('pane-l2', p2, PANE, at(y2, -0.05));
      if (opts.pediments) inst('pediment', ped, TRIM, at(WINDOW.l2.head + 0.62, 0.13));
    }
  }

  // --- pilasters on the bay divisions ----------------------------------------
  if (opts.pilasters !== 'none') {
    const h = Y.cornice - CORNICE_BAND.height - 0.9;
    const single = pilasterUnit(0.68, h, 0.26);
    const pair = pilasterUnit(0.36, h, 0.22);
    for (let j = 0; j <= run.bays; j++) {
      const u = -L / 2 + j * bay;
      if (opts.pilasters === 'single') {
        inst('pilaster', single, TRIM, new THREE.Matrix4().makeTranslation(u, 0.9, FACE_Z));
      } else {
        const off = bay / 2 - WINDOW.l0.w / 2 - 0.62;
        for (const side of [-1, 1]) {
          if (Math.abs(u + side * off) > L / 2 - 0.1) continue;
          inst('pilaster-pair', pair, TRIM, new THREE.Matrix4().makeTranslation(u + side * off, 0.9, FACE_Z));
        }
      }
    }
  }

  // --- niches with statues on the court elevations ---------------------------
  if (opts.niches) {
    const niche = nicheUnit(1.5, 2.4);
    const figure = statueUnit(2.1);
    for (let i = 1; i < run.bays; i += 3) {
      const u = (i - (run.bays - 1) / 2) * bay;
      if (Math.abs(u) > L / 2 - 2) continue;
      inst('niche', niche, STONE_BASE, new THREE.Matrix4().makeTranslation(u, 4.9, FACE_Z - 0.02));
      inst('statue', figure, TRIM, new THREE.Matrix4().makeTranslation(u, 2.5, FACE_Z - 0.4));
    }
  }

  // --- dormers on the mansard ------------------------------------------------
  if (opts.dormers > 0 && !run.noDormers) {
    const step = opts.dormers >= 1 ? 1 : 2;
    const unit = dormerUnit(DORMER.w, DORMER.h, DORMER.depth);
    // Dormer base 0.9 m up the lower slope; its front stands on the slope plane.
    const baseY = Y.cornice + 0.9;
    const wFront = -MANSARD.eaves + (baseY - Y.cornice) / Math.tan((MANSARD.lowerDeg * Math.PI) / 180);
    for (let i = 0; i < run.bays; i += step) {
      const u = (i - (run.bays - 1) / 2) * bay;
      if (Math.abs(u) > L / 2 - 1.2) continue;
      inst('dormer', unit, STONE, new THREE.Matrix4().makeTranslation(u, baseY, wFront - DORMER.depth));
    }
  }

  return { group, frame };
}

/**
 * A pavilion: a three-bay avant-corps standing proud of the wing, its returns, its own cornice and
 * a crown above the roofline. The Cour Napoléon pavilions are what make the elevation read as the
 * Louvre rather than as a long bar of windows.
 */
export interface PavilionSpec {
  id: string;
  axis: 'x' | 'z';
  /** The wing's building line. */
  line: number;
  out: 1 | -1;
  /** Centre of the pavilion in world coordinates along the run axis. */
  centre: number;
  width: number;
  /** How far the front stands proud of the wing's building line. */
  project: number;
  /** Depth of the pavilion block behind its front. */
  depth: number;
  /** Height to the finial. The measured pavilion height is about 40 m. */
  top: number;
  figures?: boolean;
  layer: 'courts' | 'outer';
}

export function buildPavilion(spec: PavilionSpec, sink: InstanceSink): THREE.Group {
  const frontLine = spec.axis === 'x' ? spec.line + spec.out * spec.project : spec.line + spec.out * spec.project;
  const run: RunSpec = {
    id: spec.id,
    axis: spec.axis,
    line: frontLine,
    from: spec.centre - spec.width / 2,
    to: spec.centre + spec.width / 2,
    out: spec.out,
    bays: 3,
    style: 'court',
    layer: 'courts',
    noDormers: true,
  };
  const front = buildRun(run, sink);
  const group = front.group;
  const blockDepth = Math.max(spec.depth, spec.project + 2.5);

  // The block behind the front face gives the pavilion mass above the wing cornice. It runs from
  // just behind the façade wall back into the range, and overhangs the façade by 100 mm a side so
  // the corner between the two is closed without a return wall.
  const block = boxGeo(spec.width + 0.2, Y.cornice, blockDepth);
  block.translate(0, Y.cornice / 2, -blockDepth / 2 + 0.04);
  group.add(new THREE.Mesh(block, mat(STONE)));

  const crown = pavilionCrown({ x: spec.width, z: blockDepth, top: spec.top });
  const crownMesh = new THREE.Mesh(crown.geo, exteriorMaterial(ROOF_ZINC));
  crownMesh.position.set(0, 0, -blockDepth / 2);
  group.add(crownMesh);
  const atticMesh = new THREE.Mesh(crown.attic, mat(STONE));
  atticMesh.position.set(0, 0, -blockDepth / 2);
  group.add(atticMesh);

  if (spec.figures) {
    const unit = statueUnit(2.6);
    for (let i = 0; i < 5; i++) {
      const u = (i - 2) * (spec.width / 6.5);
      const m = new THREE.Matrix4().makeTranslation(u, Y.cornice + 5.2 + 1.3, FACE_Z - 0.15);
      m.premultiply(front.frame.matrix);
      sink.add('statue', unit, TRIM, m);
    }
  }

  return group;
}
