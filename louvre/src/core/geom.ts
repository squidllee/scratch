import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Geometry primitives shared by every builder.
 *
 * Two rules every geometry in this project obeys:
 *  1. UVs are in METRES, not 0..1, so a 40 m wall and a 2 m pilaster show the same stone at the
 *     same scale. Materials set `texture.repeat = 1 / tileMetres`.
 *  2. Every geometry carries a `color` attribute holding baked ambient occlusion (linear RGB,
 *     white = fully lit). Materials all use `vertexColors`, so AO is free at render time.
 */

export type ProfilePoint = readonly [number, number];

const WHITE = new THREE.Color(1, 1, 1);

function ensureColor(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const n = geo.attributes.position.count;
  if (!geo.attributes.color) {
    const arr = new Float32Array(n * 3);
    arr.fill(1);
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  }
  return geo;
}

/** Add a color attribute filled with white (skip if one already exists). */
export const withColor = ensureColor;

/**
 * Bake AO by multiplying a shading factor into every vertex colour.
 * `fn` receives the local vertex position and its normal.
 */
export function bakeAo(
  geo: THREE.BufferGeometry,
  fn: (x: number, y: number, z: number, nx: number, ny: number, nz: number) => number,
): THREE.BufferGeometry {
  ensureColor(geo);
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  const col = geo.attributes.color as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nx = nrm ? nrm.getX(i) : 0;
    const ny = nrm ? nrm.getY(i) : 1;
    const nz = nrm ? nrm.getZ(i) : 0;
    const a = Math.max(0, Math.min(1, fn(x, y, z, nx, ny, nz)));
    col.setXYZ(i, col.getX(i) * a, col.getY(i) * a, col.getZ(i) * a);
  }
  col.needsUpdate = true;
  return geo;
}

/** Smooth step, used for AO falloffs. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export interface BoxOptions {
  /** Metres of UV per unit of surface, applied to every face. Defaults to 1. */
  uvScale?: number;
  /** Omit faces by tag; used to save triangles where a face is never seen. */
  skip?: Array<'front' | 'back' | 'left' | 'right' | 'top' | 'bottom'>;
}

/**
 * Axis-aligned box centred on the origin, UVs in metres. This is the workhorse: walls, jambs,
 * lintels, plinths and steps are all boxes with differing proportions.
 */
export function boxGeo(w: number, h: number, d: number, opts: BoxOptions = {}): THREE.BufferGeometry {
  const s = opts.uvScale ?? 1;
  const skip = new Set(opts.skip ?? []);
  const hw = w / 2;
  const hh = h / 2;
  const hd = d / 2;
  const pos: number[] = [];
  const nor: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];

  const face = (
    a: number[], b: number[], c: number[], e: number[],
    n: [number, number, number],
    u0: number, v0: number, u1: number, v1: number,
  ): void => {
    const base = pos.length / 3;
    const pts = [a, b, c, e];
    const uvv = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
    for (let i = 0; i < 4; i++) {
      const p = pts[i] as number[];
      pos.push(p[0], p[1], p[2]);
      nor.push(n[0], n[1], n[2]);
      const uv = uvv[i] as number[];
      uvs.push((uv[0] as number) * s, (uv[1] as number) * s);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  if (!skip.has('front')) face([-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd], [0, 0, 1], 0, 0, w, h);
  if (!skip.has('back')) face([hw, -hh, -hd], [-hw, -hh, -hd], [-hw, hh, -hd], [hw, hh, -hd], [0, 0, -1], 0, 0, w, h);
  if (!skip.has('right')) face([hw, -hh, hd], [hw, -hh, -hd], [hw, hh, -hd], [hw, hh, hd], [1, 0, 0], 0, 0, d, h);
  if (!skip.has('left')) face([-hw, -hh, -hd], [-hw, -hh, hd], [-hw, hh, hd], [-hw, hh, -hd], [-1, 0, 0], 0, 0, d, h);
  if (!skip.has('top')) face([-hw, hh, hd], [hw, hh, hd], [hw, hh, -hd], [-hw, hh, -hd], [0, 1, 0], 0, 0, w, d);
  if (!skip.has('bottom')) face([-hw, -hh, -hd], [hw, -hh, -hd], [hw, -hh, hd], [-hw, -hh, hd], [0, -1, 0], 0, 0, w, d);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  return ensureColor(geo);
}

/** A single quad from four ordered corners (counter-clockwise when seen from the front). */
export function quadGeo(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  c: readonly [number, number, number],
  d: readonly [number, number, number],
  uvs?: readonly [number, number][],
): THREE.BufferGeometry {
  const uv = uvs ?? [[0, 0], [1, 0], [1, 1], [0, 1]];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...d], 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv.flat(), 2));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  geo.computeVertexNormals();
  return ensureColor(geo);
}

export interface ExtrudeOptions {
  /** Extrude along +X, centred on the origin, this many metres long. */
  length: number;
  /** Set false to keep the profile flat (a moulding that never shows its ends). Defaults true. */
  caps?: boolean;
  /** Multiply UVs (metres by default). */
  uvScale?: number;
}

/**
 * Extrude a 2D profile along +X.
 *
 * Profile coordinates: `x` is the outward direction (world +Z after build) and `y` is up
 * (world +Y). So a cornice profile starts at (0, 0) against the wall and steps out in +x as it
 * climbs. The result is a solid whose faces are faceted (flat normals), which is what carved
 * stone and gilded moulding should look like.
 */
export function extrudeProfile(profile: readonly ProfilePoint[], opts: ExtrudeOptions): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const first = profile[0] as ProfilePoint;
  shape.moveTo(first[0], first[1]);
  for (let i = 1; i < profile.length; i++) {
    const p = profile[i] as ProfilePoint;
    shape.lineTo(p[0], p[1]);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: opts.length,
    bevelEnabled: false,
    curveSegments: 1,
    steps: 1,
  });
  // Extruded along +Z in profile space; rotate so it extrudes along +X and the profile's
  // outward axis becomes +Z.
  geo.rotateY(-Math.PI / 2);
  geo.translate(opts.length / 2, 0, 0);
  if (opts.caps === false) {
    // Drop the two end caps: they are the only triangles whose X is at either extreme and whose
    // normal points along X.
    geo.deleteAttribute('uv');
    geo.computeVertexNormals();
  }
  const s = opts.uvScale ?? 1;
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) * s + pos.getZ(i) * s;
    uv[i * 2 + 1] = pos.getY(i) * s + pos.getZ(i) * s;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (!geo.attributes.normal) geo.computeVertexNormals();
  return ensureColor(geo);
}

/** Translate in place and return the geometry, for readable builder composition. */
export function at(geo: THREE.BufferGeometry, x: number, y: number, z: number): THREE.BufferGeometry {
  geo.translate(x, y, z);
  return geo;
}

export function rotated(geo: THREE.BufferGeometry, rx: number, ry: number, rz: number): THREE.BufferGeometry {
  if (rx) geo.rotateX(rx);
  if (ry) geo.rotateY(ry);
  if (rz) geo.rotateZ(rz);
  return geo;
}

/** Merge a list of geometries that already share the same attribute layout. */
export function mergeAll(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (geos.length === 0) return new THREE.BufferGeometry();
  if (geos.length === 1) return geos[0] as THREE.BufferGeometry;
  const trimmed = geos.map((g) => {
    const copy = g.clone();
    for (const key of Object.keys(copy.attributes)) {
      if (key !== 'position' && key !== 'normal' && key !== 'uv' && key !== 'color') {
        copy.deleteAttribute(key);
      }
    }
    if (!copy.attributes.uv) copy.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(copy.attributes.position.count * 2), 2));
    ensureColor(copy);
    if (!copy.index) {
      const idx = new Uint32Array(copy.attributes.position.count);
      for (let i = 0; i < idx.length; i++) idx[i] = i;
      copy.setIndex(new THREE.BufferAttribute(idx, 1));
    }
    return copy;
  });
  const merged = mergeGeometries(trimmed, false);
  if (!merged) throw new Error('mergeAll: incompatible geometry attributes');
  for (const g of trimmed) g.dispose();
  return merged;
}

/** Triangle count of a geometry. */
export function triangleCount(geo: THREE.BufferGeometry): number {
  if (geo.index) return geo.index.count / 3;
  return geo.attributes.position.count / 3;
}

export const white = WHITE;
