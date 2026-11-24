/**
 * The sculpture toolkit: lofted tubes, deformed spheres, drapery ribbons, and the stone materials.
 *
 * Every sculpture in the library is built from these four primitives plus a joint skeleton
 * (`humanoid`), which is what lets one code path produce a 5.6 m Victory and a 1.5 m Psyche without
 * a second set of eyeballs.
 */
import * as THREE from 'three';
import { mergeAll, bakeAo, boxGeo, smoothstep } from '../../core/geom';
import { mat } from '../../core/materials';

export type Vec3 = [number, number, number];

/* ------------------------------------------------------------------------------------- */
/* Noise                                                                                  */
/* ------------------------------------------------------------------------------------- */

function hash3(x: number, y: number, z: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Value noise in [-1, 1], seeded by a constant offset. */
export function noise3(x: number, y: number, z: number, seed = 0): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const w = zf * zf * (3 - 2 * zf);
  const s = seed * 31;
  const c000 = hash3(xi + s, yi, zi);
  const c100 = hash3(xi + 1 + s, yi, zi);
  const c010 = hash3(xi + s, yi + 1, zi);
  const c110 = hash3(xi + 1 + s, yi + 1, zi);
  const c001 = hash3(xi + s, yi, zi + 1);
  const c101 = hash3(xi + 1 + s, yi, zi + 1);
  const c011 = hash3(xi + s, yi + 1, zi + 1);
  const c111 = hash3(xi + 1 + s, yi + 1, zi + 1);
  const x00 = c000 + (c100 - c000) * u;
  const x10 = c010 + (c110 - c010) * u;
  const x01 = c001 + (c101 - c001) * u;
  const x11 = c011 + (c111 - c011) * u;
  const y0 = x00 + (x10 - x00) * v;
  const y1 = x01 + (x11 - x01) * v;
  return (y0 + (y1 - y0) * w) * 2 - 1;
}

/** Chisel-and-weather the surface: displacement along the normal, plus a coarse undulation. */
export function roughSurface(geo: THREE.BufferGeometry, amp: number, freq = 6, seed = 0): THREE.BufferGeometry {
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  if (!nrm) geo.computeVertexNormals();
  const n = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const coarse = noise3(x * freq * 0.5, y * freq * 0.5, z * freq * 0.5, seed) * 0.65;
    const fine = noise3(x * freq * 2.2, y * freq * 2.2, z * freq * 2.2, seed + 7) * 0.35;
    const d = (coarse + fine) * amp;
    pos.setXYZ(i, x + n.getX(i) * d, y + n.getY(i) * d, z + n.getZ(i) * d);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/** Vertical ambient occlusion: stone is darker at the foot and in the folds. */
export function groundAo(geo: THREE.BufferGeometry, height: number, floor = 0.52): THREE.BufferGeometry {
  return bakeAo(geo, (_x, y) => floor + (1 - floor) * smoothstep(0, height * 0.5, y));
}

/* ------------------------------------------------------------------------------------- */
/* Lofted tubes                                                                           */
/* ------------------------------------------------------------------------------------- */

export interface TubeOptions {
  segments?: number;
  /** Cross-section radii (x = across, y = up-ish) per station; defaults to a circular section. */
  radiiX?: number[];
  radiiY?: number[];
  caps?: boolean;
}

const V = (v: Vec3): THREE.Vector3 => new THREE.Vector3(v[0], v[1], v[2]);

/**
 * A lofted tube through a joint chain, with an elliptical section at each station and
 * parallel-transported frames so a bent limb does not twist.
 */
export function tube(path: Vec3[], radius: number | number[], opts: TubeOptions = {}): THREE.BufferGeometry {
  const seg = opts.segments ?? 12;
  const pts = path.map(V);
  if (pts.length < 2) return new THREE.BufferGeometry();
  const radii = typeof radius === 'number' ? pts.map(() => radius) : radius;
  const rx = opts.radiiX ?? radii;
  const ry = opts.radiiY ?? radii;

  // tangents
  const tangents: THREE.Vector3[] = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    return new THREE.Vector3().subVectors(b, a).normalize();
  });
  // initial frame
  const up = new THREE.Vector3(0, 1, 0);
  const ref = Math.abs(tangents[0].dot(up)) > 0.9 ? new THREE.Vector3(1, 0, 0) : up;
  const normals: THREE.Vector3[] = [];
  const binormals: THREE.Vector3[] = [];
  let n = new THREE.Vector3().crossVectors(tangents[0], ref).normalize();
  for (let i = 0; i < pts.length; i++) {
    if (i > 0) {
      const q = new THREE.Quaternion().setFromUnitVectors(tangents[i - 1], tangents[i]);
      n = n.clone().applyQuaternion(q).normalize();
    }
    normals.push(n.clone());
    binormals.push(new THREE.Vector3().crossVectors(tangents[i], n).normalize());
  }

  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  let run = 0;
  for (let i = 0; i < pts.length; i++) {
    if (i > 0) run += pts[i].distanceTo(pts[i - 1]);
    const a = rx[i] ?? 0.1;
    const b = ry[i] ?? 0.1;
    for (let s = 0; s < seg; s++) {
      const t = (s / seg) * Math.PI * 2;
      const px = pts[i].x + normals[i].x * Math.cos(t) * a + binormals[i].x * Math.sin(t) * b;
      const py = pts[i].y + normals[i].y * Math.cos(t) * a + binormals[i].y * Math.sin(t) * b;
      const pz = pts[i].z + normals[i].z * Math.cos(t) * a + binormals[i].z * Math.sin(t) * b;
      pos.push(px, py, pz);
      uv.push((s / seg) * Math.PI * 2 * ((a + b) / 2), run);
    }
  }
  for (let i = 0; i < pts.length - 1; i++) {
    for (let s = 0; s < seg; s++) {
      const a0 = i * seg + s;
      const a1 = i * seg + ((s + 1) % seg);
      const b0 = (i + 1) * seg + s;
      const b1 = (i + 1) * seg + ((s + 1) % seg);
      idx.push(a0, b0, a1, a1, b0, b1);
    }
  }
  if (opts.caps !== false) {
    // start cap
    const base = pos.length / 3;
    pos.push(pts[0].x, pts[0].y, pts[0].z);
    uv.push(0, 0);
    for (let s = 0; s < seg; s++) idx.push(base, (s + 1) % seg, s);
    // end cap
    const lastRing = (pts.length - 1) * seg;
    const endBase = pos.length / 3;
    const last = pts[pts.length - 1];
    pos.push(last.x, last.y, last.z);
    uv.push(0, 0);
    for (let s = 0; s < seg; s++) idx.push(endBase, lastRing + s, lastRing + ((s + 1) % seg));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 3).fill(1), 3));
  return geo;
}

/** A deformed ellipsoid: heads, muscles, horse flanks, cushion masses. */
export function blob(rx: number, ry: number, rz: number, detail = 14, seed = 1, wobble = 0.06): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, detail, Math.max(8, Math.round(detail * 0.7)));
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const w = 1 + noise3(x * 2.4, y * 2.4, z * 2.4, seed) * wobble;
    pos.setXYZ(i, x * rx * w, y * ry * w, z * rz * w);
  }
  pos.needsUpdate = true;
  const uvs = new Float32Array((pos.count as number) * 2);
  for (let i = 0; i < pos.count; i++) {
    uvs[i * 2] = Math.atan2(pos.getZ(i), pos.getX(i)) * 0.3;
    uvs[i * 2 + 1] = pos.getY(i);
  }
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(pos.count * 3).fill(1), 3));
  return geo;
}

/** A flat ribbon with folds, for drapery and wings: a strip of quads along a path. */
export function ribbon(
  path: Vec3[],
  widths: number[],
  opts: { folds?: number; foldAmp?: number; thickness?: number } = {},
): THREE.BufferGeometry {
  const pts = path.map(V);
  const folds = opts.folds ?? 3;
  const amp = opts.foldAmp ?? 0.03;
  const left: number[] = [];
  const right: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const t = new THREE.Vector3().subVectors(b, a).normalize();
    const side = new THREE.Vector3().crossVectors(t, new THREE.Vector3(0, 1, 0)).normalize();
    const w = widths[Math.min(i, widths.length - 1)] / 2;
    const wobble = Math.sin((i / Math.max(1, pts.length - 1)) * Math.PI * folds) * amp;
    const p = pts[i].clone().add(new THREE.Vector3().crossVectors(side, t).multiplyScalar(wobble));
    left.push(p.x + side.x * w, p.y + side.y * w, p.z + side.z * w);
    right.push(p.x - side.x * w, p.y - side.y * w, p.z - side.z * w);
  }
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    pos.push(left[i * 3], left[i * 3 + 1], left[i * 3 + 2]);
    pos.push(right[i * 3], right[i * 3 + 1], right[i * 3 + 2]);
    uv.push(0, i * 0.1, 1, i * 0.1);
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 3).fill(1), 3));
  return geo;
}

/* ------------------------------------------------------------------------------------- */
/* Assembly                                                                               */
/* ------------------------------------------------------------------------------------- */

/** Collects parts by stone, then merges so a sculpture costs one draw call per stone. */
export class Statue {
  private byStone = new Map<string, THREE.BufferGeometry[]>();

  add(geo: THREE.BufferGeometry, stone: string): this {
    const list = this.byStone.get(stone);
    if (list) list.push(geo);
    else this.byStone.set(stone, [geo]);
    return this;
  }

  /** Place a part with a translation and optional Y rotation. */
  addAt(geo: THREE.BufferGeometry, stone: string, x: number, y: number, z: number, rotY = 0): this {
    if (rotY) geo.rotateY(rotY);
    geo.translate(x, y, z);
    return this.add(geo, stone);
  }

  build(name: string): THREE.Group {
    const group = new THREE.Group();
    group.name = name;
    for (const [stone, geos] of this.byStone) {
      const merged = mergeAll(geos);
      const mesh = new THREE.Mesh(merged, mat(stone));
      mesh.name = name + '/' + stone;
      group.add(mesh);
    }
    return group;
  }
}

/** A plinth with its marble inlay band, the way the Louvre mounts statuary. */
export function plinthGeo(
  w: number,
  d: number,
  h: number,
  opts: { inlay?: number; base?: number } = {},
): { body: THREE.BufferGeometry; cap: THREE.BufferGeometry } {
  const baseH = opts.base ?? h * 0.16;
  const inlayH = opts.inlay ?? h * 0.08;
  const body = mergeAll([
    boxGeo(w, h - baseH, d).translate(0, (h - baseH) / 2 + baseH, 0),
    boxGeo(w * 1.06, baseH, d * 1.06).translate(0, baseH / 2, 0),
  ]);
  const cap = boxGeo(w * 1.04, inlayH, d * 1.04).translate(0, h - inlayH / 2, 0);
  return { body, cap };
}

/** Rounded base slab (for the Psyche group and the freestanding marbles). */
export function roundBase(radius: number, h: number, seg = 28): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(radius, radius * 1.04, h, seg, 1);
  geo.translate(0, h / 2, 0);
  geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 3).fill(1), 3));
  return geo;
}
