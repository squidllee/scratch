import * as THREE from 'three';
import { boxGeo, mergeAll, quadGeo } from '../../core/geom';
import { addPart, addParts } from '../../core/merge';
import {
  baseboard,
  ceiling,
  cornice,
  doorway,
  floor,
  moulding,
  pictureFrame,
  skylight,
  wall,
  windowRow,
} from '../../core/builders';
import type { Opening } from '../../core/builders/types';
import type { ArtworkSpec } from '../../artworks/types';
import { placeArtwork } from '../../artworks/library';

/**
 * The Denon wing's shell vocabulary.
 *
 * Every room in this zone is an axis-aligned box of interior faces, so walls are placed with their
 * room-facing surface exactly on that box and their masonry outside it. Shared boundaries take half
 * the 0.6 m palace wall on each side (0.3 m per room), so two neighbours never overlap and neither
 * intrudes into the other: the two halves together are the measured wall.
 *
 * Openings are always given in WORLD metres along the wall they sit in, never in wall-local
 * coordinates, because a portal has to line up with the opening on the far side of the wall.
 */

export type Side = 'n' | 's' | 'e' | 'w';

export interface RoomBox {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  /** Floor level, world y. */
  y0: number;
  /** Clear height above the floor. */
  h: number;
}

export const midX = (b: RoomBox): number => (b.x0 + b.x1) / 2;
export const midZ = (b: RoomBox): number => (b.z0 + b.z1) / 2;
export const width = (b: RoomBox): number => b.x1 - b.x0;
export const depth = (b: RoomBox): number => b.z1 - b.z0;
export const top = (b: RoomBox): number => b.y0 + b.h;

/** An opening cut through a wall, positioned in world metres along that wall. */
export interface Hole {
  /** World x for a north/south wall, world z for an east/west wall. */
  at: number;
  width: number;
  /** Above the floor. Defaults 0. */
  sill?: number;
  /** Above the floor. */
  head: number;
  arched?: boolean;
  /** Dress the opening with a stone surround. Defaults true. */
  casing?: boolean;
}

export interface SideSpec {
  /** Masonry thickness outside the room face. */
  t: number;
  holes?: Hole[];
}

export interface Frame {
  side: Side;
  rot: number;
  /** Unit normal pointing into the room. */
  nx: number;
  nz: number;
  /** World position of the wall plane (at the box face). */
  px: number;
  pz: number;
  /** World tangent coordinate of the wall's centre. */
  ct: number;
  /** +1 when increasing world tangent is increasing wall-local x. */
  dir: 1 | -1;
  /** Interior span along the tangent. */
  length: number;
}

export function frameOf(b: RoomBox, side: Side): Frame {
  switch (side) {
    case 'n':
      return { side, rot: 0, nx: 0, nz: 1, px: midX(b), pz: b.z0, ct: midX(b), dir: 1, length: width(b) };
    case 's':
      return { side, rot: Math.PI, nx: 0, nz: -1, px: midX(b), pz: b.z1, ct: midX(b), dir: -1, length: width(b) };
    case 'e':
      return { side, rot: -Math.PI / 2, nx: -1, nz: 0, px: b.x1, pz: midZ(b), ct: midZ(b), dir: 1, length: depth(b) };
    case 'w':
      return { side, rot: Math.PI / 2, nx: 1, nz: 0, px: b.x0, pz: midZ(b), ct: midZ(b), dir: -1, length: depth(b) };
  }
}

/** Place a wall-plane object at world tangent `t`, height `y`, pushed `out` metres into the room. */
export function put(obj: THREE.Object3D, f: Frame, t: number, y: number, out = 0): void {
  if (f.side === 'n' || f.side === 's') obj.position.set(t, y, f.pz + f.nz * out);
  else obj.position.set(f.px + f.nx * out, y, t);
  obj.rotation.y = f.rot;
}

const SIDES: Side[] = ['n', 's', 'e', 'w'];

export interface WallMats {
  wall: string;
  casing: string;
}

/** Floor slab whose walking surface is the room's floor. */
export function slabFloor(g: THREE.Group, b: RoomBox, mat: string): void {
  const m = addPart(g, floor({ width: width(b), depth: depth(b) }), mat);
  m.position.set(midX(b), b.y0, midZ(b));
}

/**
 * The four walls, their openings and their stone surrounds.
 * `sides` may omit a side, but a room that omits one gets a hole to the void when its neighbour is
 * culled, so every room here builds all four.
 */
export function walls(g: THREE.Group, b: RoomBox, sides: Partial<Record<Side, SideSpec>>, mats: WallMats): void {
  for (const side of SIDES) {
    const spec = sides[side];
    if (!spec) continue;
    const f = frameOf(b, side);
    const holes = spec.holes ?? [];
    const openings: Opening[] = holes.map((h) => ({
      x: f.dir * (h.at - f.ct),
      width: h.width,
      sill: h.sill ?? 0,
      head: h.head,
      arched: h.arched,
    }));
    const mesh = addPart(g, wall({ length: f.length, height: b.h, thickness: spec.t, openings }), mats.wall);
    put(mesh, f, f.ct, b.y0, -spec.t / 2);
    for (const h of holes) {
      if (h.casing === false) continue;
      const trim = doorway({ width: h.width, height: h.head, thickness: spec.t, arched: h.arched });
      put(addPart(g, trim, mats.casing), f, h.at, b.y0 + (h.sill ?? 0), 0);
    }
  }
}

/** Split a wall run into the pieces left between full-height openings. */
function runs(start: number, end: number, holes: Hole[]): Array<[number, number]> {
  const cuts = holes
    .filter((h) => (h.sill ?? 0) < 0.4)
    .map((h) => [h.at - h.width / 2, h.at + h.width / 2] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const out: Array<[number, number]> = [];
  let cursor = start;
  for (const [a, c] of cuts) {
    if (a > cursor) out.push([cursor, Math.min(a, end)]);
    cursor = Math.max(cursor, c);
  }
  if (cursor < end) out.push([cursor, end]);
  return out.filter(([a, c]) => c - a > 0.12);
}

/** Skirting boards, broken at every door. */
export function skirting(g: THREE.Group, b: RoomBox, sides: Partial<Record<Side, SideSpec>>, mat: string, h = 0.24): void {
  for (const side of SIDES) {
    const spec = sides[side];
    if (!spec) continue;
    const f = frameOf(b, side);
    const a = f.ct - f.length / 2;
    for (const [s, e] of runs(a, a + f.length, spec.holes ?? [])) {
      put(addPart(g, baseboard({ length: e - s, height: h, thickness: 0.06 }), mat), f, (s + e) / 2, b.y0, 0);
    }
  }
}

/** A cornice along the named walls, at the foot of the ceiling. */
export function corniceOn(
  g: THREE.Group,
  b: RoomBox,
  sides: Side[],
  mat: string,
  opts: { height?: number; projection?: number; dentils?: boolean } = {},
): void {
  const ch = opts.height ?? 0.55;
  for (const side of sides) {
    const f = frameOf(b, side);
    const geo = cornice({ length: f.length, height: ch, projection: opts.projection ?? 0.34, dentils: opts.dentils ?? false });
    put(addPart(g, geo, mat), f, f.ct, top(b) - ch, 0);
  }
}

/** A cornice round the whole room. */
export function corniceRing(
  g: THREE.Group,
  b: RoomBox,
  mat: string,
  opts: { height?: number; projection?: number; dentils?: boolean } = {},
): void {
  corniceOn(g, b, SIDES, mat, opts);
}

/** A continuous horizontal band (picture rail, dado cap) along the named walls. */
export function bandOn(
  g: THREE.Group,
  b: RoomBox,
  sides: Side[],
  mat: string,
  y: number,
  h: number,
  out: number,
): void {
  const profile: Array<[number, number]> = [
    [0, 0],
    [out * 0.45, 0],
    [out, h * 0.35],
    [out, h * 0.7],
    [out * 0.6, h],
    [0, h],
  ];
  for (const side of sides) {
    const f = frameOf(b, side);
    put(addPart(g, moulding({ length: f.length, profile }), mat), f, f.ct, y, 0);
  }
}

/** A band round every wall of the room. */
export function band(g: THREE.Group, b: RoomBox, mat: string, y: number, h: number, out: number): void {
  bandOn(g, b, SIDES, mat, y, h, out);
}

/** Pilasters spaced along one or more walls, stopping under the cornice. */
export function pilasterRun(
  g: THREE.Group,
  b: RoomBox,
  sides: Side[],
  opts: { pitch: number; w: number; h: number; d: number; mat: string; from?: number; to?: number },
): void {
  for (const side of sides) {
    const f = frameOf(b, side);
    const from = opts.from ?? f.ct - f.length / 2 + opts.pitch / 2;
    const to = opts.to ?? f.ct + f.length / 2;
    const geo = simplePilaster(opts.w, opts.h, opts.d);
    for (let t = from; t < to - 0.1; t += opts.pitch) {
      put(addPart(g, geo.clone(), opts.mat), f, t, b.y0, 0);
    }
    geo.dispose();
  }
}

/** A flat pilaster: shaft, base and capital in three boxes. Long galleries do not need fluting. */
export function simplePilaster(w: number, h: number, d: number): THREE.BufferGeometry {
  const capH = Math.min(0.4, h * 0.05);
  const baseH = Math.min(0.34, h * 0.045);
  const parts: THREE.BufferGeometry[] = [];
  const shaft = boxGeo(w, h - capH - baseH, d);
  shaft.translate(0, baseH + (h - capH - baseH) / 2, d / 2);
  parts.push(shaft);
  const base = boxGeo(w * 1.2, baseH, d * 1.6);
  base.translate(0, baseH / 2, d * 0.8);
  parts.push(base);
  const cap = boxGeo(w * 1.14, capH, d * 1.5);
  cap.translate(0, h - capH / 2, d * 0.75);
  parts.push(cap);
  return mergeAll(parts);
}

/** Flat ceiling with optional cross beams. */
export function flatCeiling(g: THREE.Group, b: RoomBox, mat: string, beams = 0): void {
  const m = addPart(g, ceiling({ width: width(b), depth: depth(b), beams }), mat);
  m.position.set(midX(b), top(b), midZ(b));
}

/**
 * Lefuel's top-lit room: two plaster fields with a glazed strip between them, running along X.
 */
export function stripCeiling(g: THREE.Group, b: RoomBox, mat: string, strip: number, minHeight = 0): void {
  const w = width(b);
  const d = depth(b);
  const field = (d - strip) / 2;
  for (const sign of [-1, 1]) {
    const m = addPart(g, ceiling({ width: w, depth: field }), mat);
    m.position.set(midX(b), top(b), midZ(b) + sign * (strip / 2 + field / 2));
  }
  const sky = skylight({ width: w - 1.2, depth: strip, bars: Math.max(6, Math.round(w / 2.2)) });
  const sg = new THREE.Group();
  addParts(sg, sky);
  sg.position.set(midX(b), top(b), midZ(b));
  g.add(sg);
  void minHeight;
}

/** A shallow curved band (vault rib, arch ring) spanning `span` in X, apex `rise` above its ends. */
export function arcBand(opts: { span: number; rise: number; depth: number; width: number; segs?: number }): THREE.BufferGeometry {
  const { span, rise, depth, width: bw } = opts;
  const segs = opts.segs ?? 14;
  const yAt = (x: number): number => rise * (1 - ((2 * x) / span) ** 2);
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < segs; i++) {
    const x0 = -span / 2 + (span * i) / segs;
    const x1 = -span / 2 + (span * (i + 1)) / segs;
    const y0 = yAt(x0);
    const y1 = yAt(x1);
    const len = Math.hypot(x1 - x0, y1 - y0) + 0.01;
    const box = boxGeo(len, depth, bw);
    box.rotateZ(Math.atan2(y1 - y0, x1 - x0));
    box.translate((x0 + x1) / 2, (y0 + y1) / 2, 0);
    parts.push(box);
  }
  return mergeAll(parts);
}

/** A run of tall windows cut through one wall (frames instanced, one shared glass sheet). */
export function windows(
  g: THREE.Group,
  f: Frame,
  b: RoomBox,
  opts: { bays: number; bayWidth: number; spacing: number; sill: number; head: number; t: number },
): void {
  const row = windowRow({
    bays: opts.bays,
    bayWidth: opts.bayWidth,
    spacing: opts.spacing,
    sillHeight: opts.sill,
    headHeight: opts.head,
    thickness: opts.t,
    mullions: 1,
  });
  const holder = new THREE.Group();
  addParts(holder, row);
  put(holder, f, f.ct, b.y0, 0.03);
  g.add(holder);
}

/** A gilt frame with a blank canvas, centred at world `t` on the wall, `y` above the floor. */
export function hangFrame(
  g: THREE.Group,
  f: Frame,
  t: number,
  y: number,
  size: { w: number; h: number },
): void {
  const parts = pictureFrame({ width: size.w, height: size.h, canvas: true });
  const holder = new THREE.Group();
  addParts(holder, parts);
  put(holder, f, t, y, 0.01);
  g.add(holder);
}

/** Place an artwork by id exactly where the spec says it hangs. */
export function hang(g: THREE.Group, spec: ArtworkSpec): void {
  placeArtwork(g, spec);
}

/**
 * Place a sculpture by id and sit it on the floor.
 *
 * A factory's origin is its own business — the base of the marble or the centre of its bounding box
 * — so the object is measured after it is created and shifted until its lowest point touches
 * `groundY`. That is the only way to be sure a 5.57 m Nike stands on her landing whichever way the
 * artwork thread builds her.
 */
export function stand(g: THREE.Group, spec: ArtworkSpec, groundY: number): void {
  const obj = placeArtwork(g, spec);
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  if (Number.isFinite(box.min.y)) obj.position.y += groundY - box.min.y;
}

export interface BenchSpec {
  x: number;
  z: number;
  len: number;
  along: 'x' | 'z';
  mat?: string;
}

/** A museum bench: a padded seat on two stone feet. */
export function bench(g: THREE.Group, b: RoomBox, spec: BenchSpec): void {
  const mat = spec.mat ?? 'wood.walnut';
  const seat = 0.46;
  const w = spec.along === 'x' ? spec.len : 0.62;
  const d = spec.along === 'x' ? 0.62 : spec.len;
  const parts: THREE.BufferGeometry[] = [];
  const top = boxGeo(w, 0.09, d);
  top.translate(0, seat, 0);
  parts.push(top);
  for (const s of [-1, 1]) {
    const foot = boxGeo(spec.along === 'x' ? 0.22 : 0.5, seat, spec.along === 'x' ? 0.5 : 0.22);
    foot.translate(
      spec.along === 'x' ? s * (spec.len / 2 - 0.35) : 0,
      seat / 2,
      spec.along === 'x' ? 0 : s * (spec.len / 2 - 0.35),
    );
    parts.push(foot);
  }
  const m = addPart(g, mergeAll(parts), mat);
  m.position.set(spec.x, b.y0, spec.z);
}

/** A stone plinth for a sculpture, top at `topY`. */
export function plinth(g: THREE.Group, x: number, z: number, b: RoomBox, opts: { w: number; d: number; h: number; mat?: string; round?: boolean }): void {
  const mat = opts.mat ?? 'marble.gris-saint-beat';
  const parts: THREE.BufferGeometry[] = [];
  const body = opts.round
    ? new THREE.CylinderGeometry(opts.w / 2, opts.w / 2 * 1.06, opts.h, 20)
    : boxGeo(opts.w, opts.h, opts.d);
  body.translate(0, opts.h / 2, 0);
  parts.push(body);
  const cap = opts.round
    ? new THREE.CylinderGeometry(opts.w / 2 * 1.05, opts.w / 2 * 1.05, 0.06, 20)
    : boxGeo(opts.w * 1.06, 0.06, opts.d * 1.06);
  cap.translate(0, opts.h + 0.03, 0);
  parts.push(cap);
  const m = addPart(g, mergeAll(parts), mat);
  m.position.set(x, b.y0, z);
}

/** A glass vitrine: a sealed case standing off a wall face. */
export function vitrine(g: THREE.Group, centre: [number, number, number], size: [number, number, number]): void {
  const [w, h, d] = size;
  const parts: THREE.BufferGeometry[] = [];
  const q = (p: number[]): void => {
    parts.push(quadGeo(
      [p[0], p[1], p[2]],
      [p[3], p[4], p[5]],
      [p[6], p[7], p[8]],
      [p[9], p[10], p[11]],
      [[0, 0], [1, 0], [1, 1], [0, 1]],
    ));
  };
  const hx = w / 2;
  const hy = h / 2;
  const hz = d / 2;
  q([-hx, -hy, hz, hx, -hy, hz, hx, hy, hz, -hx, hy, hz]);
  q([hx, -hy, -hz, -hx, -hy, -hz, -hx, hy, -hz, hx, hy, -hz]);
  q([hx, -hy, hz, hx, -hy, -hz, hx, hy, -hz, hx, hy, hz]);
  q([-hx, -hy, -hz, -hx, -hy, hz, -hx, hy, hz, -hx, hy, -hz]);
  const m = addPart(g, mergeAll(parts), 'glass.vitrine');
  m.position.set(centre[0], centre[1], centre[2]);
}

export { boxGeo, mergeAll };

/** One room's geometry, before and after merging. */
export interface RoomPart {
  /** Pre-merge groups. Each becomes one merged sub-group of the room. */
  raw: THREE.Group[];
  /** Runs after merging, for anything that must not be flattened into the room's materials. */
  dress?: (merged: THREE.Group[]) => void;
}
