import * as THREE from 'three';
import { balustrade, baseboard, cornice, doorway, pilaster, wall as wallOf } from '../../core/builders';
import { bakeAo, boxGeo, extrudeProfile, mergeAll, quadGeo, smoothstep } from '../../core/geom';
import { addPart } from '../../core/merge';

/**
 * Local helpers for the Sully interiors.
 *
 * Everything in this zone is built in WORLD coordinates (no per-mesh transforms) so baked AO can
 * be a function of the true height above the floor, and so `mergeByMaterial` has nothing to bake.
 * That is the one rule this file exists to hold: primitives are placed by translating them.
 */

export type Face = 'n' | 's' | 'e' | 'w';

/** A wall opening in world coordinates along the wall's own axis. */
export interface Hole {
  /** World coordinate along the wall (x for north/south faces, z for east/west). */
  at: number;
  width: number;
  /** Head above the wall's base, metres. */
  head: number;
  sill?: number;
  arched?: boolean;
}

/** A box centred on a world point. */
export function bx(w: number, h: number, d: number, x: number, y: number, z: number): THREE.BufferGeometry {
  return boxGeo(w, h, d).translate(x, y, z);
}

/** A quad from four world corners. */
export function q(
  a: [number, number, number],
  b: [number, number, number],
  c: [number, number, number],
  d: [number, number, number],
  uvScale = 1,
): THREE.BufferGeometry {
  const w = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * uvScale;
  const h = Math.hypot(c[0] - b[0], c[1] - b[1], c[2] - b[2]) * uvScale;
  return quadGeo(a, b, c, d, [[0, 0], [w, 0], [w, h], [0, h]]);
}

/** Flip a surface's triangles so their normals point toward `inside`. Guards against back-faces. */
export function faceInward(geo: THREE.BufferGeometry, inside: readonly [number, number, number]): THREE.BufferGeometry {
  const pos = geo.attributes.position;
  const idx = geo.index;
  if (!idx) return geo;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  let score = 0;
  const tri = idx.count / 3;
  const step = Math.max(1, Math.floor(tri / 64));
  for (let t = 0; t < tri; t += step) {
    a.fromBufferAttribute(pos, idx.getX(t * 3));
    b.fromBufferAttribute(pos, idx.getX(t * 3 + 1));
    c.fromBufferAttribute(pos, idx.getX(t * 3 + 2));
    n.crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
    const mid = a.clone().add(b).add(c).multiplyScalar(1 / 3);
    score += n.dot(new THREE.Vector3(inside[0] - mid.x, inside[1] - mid.y, inside[2] - mid.z));
  }
  if (score < 0) {
    for (let t = 0; t < tri; t++) {
      const i1 = idx.getX(t * 3 + 1);
      const i2 = idx.getX(t * 3 + 2);
      idx.setX(t * 3 + 1, i2);
      idx.setX(t * 3 + 2, i1);
    }
    idx.needsUpdate = true;
    geo.computeVertexNormals();
  }
  return geo;
}

/**
 * One wall of a room, straddling its plane, with real holes. `from`/`to` are the wall's extents
 * along its own axis; faces n/s run along X, faces e/w along Z.
 */
export function wallOn(
  parent: THREE.Object3D,
  opts: {
    face: Face;
    /** The plane: z for n/s, x for e/w. */
    at: number;
    from: number;
    to: number;
    floorY: number;
    height: number;
    thickness?: number;
    holes?: Hole[];
    mat: string;
    /** Turn off the builder's corner darkening where the wall meets another room. */
    cornerAo?: number;
    /** Extra darkening as a function of height above the floor, for rooms that are meant dark. */
    dim?: (y: number) => number;
  },
): void {
  const mid = (opts.from + opts.to) / 2;
  const length = opts.to - opts.from;
  const t = opts.thickness ?? 0.6;
  const geo = wallPiece(length, opts.height, t, opts.holes ?? [], mid, opts.face, opts.cornerAo);
  if (opts.dim) bakeAo(geo, (_x, y) => opts.dim!(y));
  geo.translate(0, opts.floorY, 0);
  const mesh = addPart(parent, geo, opts.mat);
  if (opts.face === 'n' || opts.face === 's') mesh.position.set(mid, 0, opts.at);
  else mesh.position.set(opts.at, 0, mid);
  mesh.rotation.y = opts.face === 'n' ? 0 : opts.face === 's' ? Math.PI : opts.face === 'w' ? Math.PI / 2 : -Math.PI / 2;
}

/** Raw wall geometry in its own frame: length along X, straddling z = 0, base y = 0. */
function wallPiece(
  length: number,
  height: number,
  thickness: number,
  holes: Hole[],
  mid: number,
  face: Face,
  cornerAo = 0.22,
): THREE.BufferGeometry {
  const local = holes.map((h) => ({
    x: face === 'n' || face === 'e' ? h.at - mid : mid - h.at,
    width: h.width,
    sill: h.sill ?? 0,
    head: h.head,
    arched: h.arched,
  }));
  return wallOf({ length, height, thickness, openings: local, cornerAo });
}

/** A dressed door casing sitting in a wall hole. `plane` is the wall's coordinate on its own
 *  axis (z for n/s faces, x for e/w); `along` is its centre on the other horizontal axis. */
export function doorOn(
  parent: THREE.Object3D,
  opts: { face: Face; plane: number; along: number; floorY: number; width: number; height: number; arched?: boolean; mat: string; thickness?: number },
): void {
  const geo = doorway({ width: opts.width, height: opts.height, thickness: opts.thickness ?? 0.6, arched: opts.arched });
  const mesh = addPart(parent, geo, opts.mat);
  const rot = opts.face === 'n' ? 0 : opts.face === 's' ? Math.PI : opts.face === 'w' ? Math.PI / 2 : -Math.PI / 2;
  mesh.rotation.y = rot;
  if (opts.face === 'n' || opts.face === 's') mesh.position.set(opts.along, opts.floorY, opts.plane);
  else mesh.position.set(opts.plane, opts.floorY, opts.along);
}

/** A running cornice on a face, at a given height, protruding into the room. */
export function corniceOn(
  parent: THREE.Object3D,
  opts: { face: Face; at: number; from: number; to: number; y: number; height?: number; projection?: number; dentils?: boolean; mat: string },
): void {
  const mid = (opts.from + opts.to) / 2;
  const geo = cornice({ length: opts.to - opts.from, height: opts.height, projection: opts.projection, dentils: opts.dentils });
  const mesh = addPart(parent, geo, opts.mat);
  const rot = opts.face === 'n' ? 0 : opts.face === 's' ? Math.PI : opts.face === 'w' ? Math.PI / 2 : -Math.PI / 2;
  mesh.rotation.y = rot;
  if (opts.face === 'n' || opts.face === 's') mesh.position.set(mid, opts.y, opts.at);
  else mesh.position.set(opts.at, opts.y, mid);
}

/** A skirting run on a face. */
export function skirtOn(
  parent: THREE.Object3D,
  opts: { face: Face; at: number; from: number; to: number; y: number; height?: number; thickness?: number; mat: string },
): void {
  const mid = (opts.from + opts.to) / 2;
  const geo = baseboard({ length: opts.to - opts.from, height: opts.height, thickness: opts.thickness });
  const mesh = addPart(parent, geo, opts.mat);
  const rot = opts.face === 'n' ? 0 : opts.face === 's' ? Math.PI : opts.face === 'w' ? Math.PI / 2 : -Math.PI / 2;
  mesh.rotation.y = rot;
  if (opts.face === 'n' || opts.face === 's') mesh.position.set(mid, opts.y, opts.at);
  else mesh.position.set(opts.at, opts.y, mid);
}

/** Engaged pilasters along a face. */
export function pilasterRow(
  parent: THREE.Object3D,
  opts: { face: Face; at: number; positions: number[]; floorY: number; height: number; width?: number; depth?: number; mat: string },
): void {
  for (const p of opts.positions) {
    const geo = pilaster({ width: opts.width ?? 0.9, height: opts.height, depth: opts.depth ?? 0.16 });
    geo.translate(0, opts.floorY, 0);
    const mesh = addPart(parent, geo, opts.mat);
    const rot = opts.face === 'n' ? 0 : opts.face === 's' ? Math.PI : opts.face === 'w' ? Math.PI / 2 : -Math.PI / 2;
    mesh.rotation.y = rot;
    if (opts.face === 'n' || opts.face === 's') mesh.position.set(p, 0, opts.at);
    else mesh.position.set(opts.at, 0, p);
  }
}

/**
 * A coved barrel vault running along Z: a segmental cove from the springing line up to a flat
 * crown panel, which is where a painted ceiling actually is in the Galerie d'Apollon.
 */
export function vaultZ(opts: {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  spring: number;
  crown: number;
  /** Half-width of the flat crown panel. */
  flatHalf: number;
  segments?: number;
  mat: string;
  parent: THREE.Object3D;
  /** Darken toward the springing, where nothing lights the cove. */
  ao?: number;
}): void {
  const cx = (opts.x0 + opts.x1) / 2;
  const half = (opts.x1 - opts.x0) / 2;
  const seg = opts.segments ?? 6;
  const flash = Math.min(opts.flatHalf, half - 0.2);
  const points: Array<[number, number]> = [];
  for (let i = seg; i >= 0; i--) {
    const u = i / seg;
    const x = half - (half - flash) * u;
    const y = opts.spring + (opts.crown - opts.spring) * Math.sin((u * Math.PI) / 2);
    points.push([cx - x, y]);
  }
  for (let i = 0; i <= seg; i++) {
    const u = i / seg;
    const x = half - (half - flash) * u;
    const y = opts.spring + (opts.crown - opts.spring) * Math.sin((u * Math.PI) / 2);
    points.push([cx + x, y]);
  }

  const quads: THREE.BufferGeometry[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [xa, ya] = points[i] as [number, number];
    const [xb, yb] = points[i + 1] as [number, number];
    quads.push(
      q([xa, ya, opts.z0], [xb, yb, opts.z0], [xb, yb, opts.z1], [xa, ya, opts.z1]),
    );
  }
  const geo = mergeAll(quads);
  faceInward(geo, [cx, opts.spring - 4, (opts.z0 + opts.z1) / 2]);
  if (opts.ao) {
    const crown = opts.crown;
    const spring = opts.spring;
    bakeAo(geo, (x, y) => 1 - opts.ao! * (1 - smoothstep(spring, crown, y)));
  }
  addPart(opts.parent, geo, opts.mat);
}

/** Transverse gilt ribs following a vault's profile. */
export function vaultRibs(
  opts: {
    x0: number;
    x1: number;
    spring: number;
    crown: number;
    flatHalf: number;
    /** Z positions of the ribs. */
    at: number[];
    band: number;
    /** How far below the vault surface the rib hangs. */
    depth?: number;
    segments?: number;
    mat: string;
    parent: THREE.Object3D;
  },
): void {
  const cx = (opts.x0 + opts.x1) / 2;
  const half = (opts.x1 - opts.x0) / 2;
  const seg = opts.segments ?? 6;
  const flash = Math.min(opts.flatHalf, half - 0.2);
  const drop = opts.depth ?? 0.16;
  const parts: THREE.BufferGeometry[] = [];
  for (const zc of opts.at) {
    for (const side of [-1, 1]) {
      for (let i = 0; i < seg; i++) {
        const u0 = i / seg;
        const u1 = (i + 1) / seg;
        const x0 = cx + side * (half - (half - flash) * u0);
        const x1 = cx + side * (half - (half - flash) * u1);
        const y0 = opts.spring + (opts.crown - opts.spring) * Math.sin((u0 * Math.PI) / 2);
        const y1 = opts.spring + (opts.crown - opts.spring) * Math.sin((u1 * Math.PI) / 2);
        const za = zc - opts.band / 2;
        const zb = zc + opts.band / 2;
        // Outer face of the rib, hanging below the vault.
        parts.push(q([x0, y0 - drop, za], [x1, y1 - drop, za], [x1, y1 - drop, zb], [x0, y0 - drop, zb]));
        // Two flanks so the rib has thickness when seen at an angle.
        parts.push(q([x0, y0, za], [x0, y0 - drop, za], [x1, y1 - drop, za], [x1, y1, za]));
        parts.push(q([x1, y1, zb], [x1, y1 - drop, zb], [x0, y0 - drop, zb], [x0, y0, zb]));
      }
    }
    // Rib across the flat crown.
    const zw = opts.band;
    parts.push(bx(flash * 2, drop, zw, cx, opts.crown - drop / 2, zc));
  }
  const geo = mergeAll(parts);
  faceInward(geo, [cx, opts.spring - 6, opts.at[0] ?? 0]);
  addPart(opts.parent, geo, opts.mat);
}

/** A shallow dome over an ellipse, hung from a ring at `y0`, with an oculus. Normals face in. */
export function dome(opts: {
  cx: number;
  cz: number;
  rx: number;
  rz: number;
  y0: number;
  rise: number;
  /** Radius (fraction of rx) of the flat top where the lantern sits. */
  flatFraction?: number;
  segments?: number;
  rings?: number;
  mat: string;
  parent: THREE.Object3D;
}): void {
  const seg = opts.segments ?? 16;
  const rings = opts.rings ?? 5;
  const flat = opts.flatFraction ?? 0.22;
  const parts: THREE.BufferGeometry[] = [];
  const point = (ring: number, i: number): [number, number, number] => {
    const u = ring / rings;
    const k = Math.cos((u * Math.PI) / 2) * (1 - flat) + flat;
    const a = (i / seg) * Math.PI * 2;
    return [
      opts.cx + opts.rx * k * Math.cos(a),
      opts.y0 + opts.rise * Math.sin((u * Math.PI) / 2),
      opts.cz + opts.rz * k * Math.sin(a),
    ];
  };
  for (let r = 0; r < rings; r++) {
    for (let i = 0; i < seg; i++) {
      const a = point(r, i);
      const b = point(r, i + 1);
      const c = point(r + 1, i + 1);
      const d = point(r + 1, i);
      parts.push(q(a, b, c, d));
    }
  }
  const geo = mergeAll(parts);
  faceInward(geo, [opts.cx, opts.y0 - 3, opts.cz]);
  addPart(opts.parent, geo, opts.mat);
}

/** A stepped stone plinth on the floor, centred on a world point. */
export function plinthAt(x: number, z: number, w: number, d: number, h: number, y = 0): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(bx(w, h * 0.78, d, x, y + h * 0.39, z));
  parts.push(bx(w + 0.16, h * 0.1, d + 0.16, x, y + h * 0.83, z));
  parts.push(bx(w + 0.07, h * 0.12, d + 0.07, x, y + h * 0.95, z));
  parts.push(bx(w + 0.24, h * 0.06, d + 0.24, x, y + h * 0.03, z));
  return mergeAll(parts);
}

/** A display case: bronze frame, glass box, velvet deck. */
export function vitrineAt(
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
): { frame: THREE.BufferGeometry; glass: THREE.BufferGeometry; deck: THREE.BufferGeometry } {
  const bar = 0.05;
  const frame: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    frame.push(bx(bar, h, bar, x + sx * (w / 2 - bar / 2), y + h / 2, z + sz * (d / 2 - bar / 2)));
  }
  for (const sy of [0, 1]) {
    for (const sz of [-1, 1]) frame.push(bx(w, bar, bar, x, y + sy * (h - bar) + bar / 2, z + sz * (d / 2 - bar / 2)));
    for (const sx of [-1, 1]) frame.push(bx(bar, bar, d, x + sx * (w / 2 - bar / 2), y + sy * (h - bar) + bar / 2, z));
  }
  const glass = mergeAll([
    q([x - w / 2 + bar, y, z + d / 2 - bar], [x + w / 2 - bar, y, z + d / 2 - bar], [x + w / 2 - bar, y + h, z + d / 2 - bar], [x - w / 2 + bar, y + h, z + d / 2 - bar]),
    q([x + w / 2 - bar, y, z + d / 2 - bar], [x + w / 2 - bar, y, z - d / 2 + bar], [x + w / 2 - bar, y + h, z - d / 2 + bar], [x + w / 2 - bar, y + h, z + d / 2 - bar]),
    q([x - w / 2 + bar, y, z - d / 2 + bar], [x - w / 2 + bar, y, z + d / 2 - bar], [x - w / 2 + bar, y + h, z + d / 2 - bar], [x - w / 2 + bar, y + h, z - d / 2 + bar]),
  ]);
  const deck = bx(w - bar * 2, 0.08, d - bar * 2, x, y + 0.04, z);
  return { frame: mergeAll(frame), glass, deck };
}

/** A hanging textile on a wall: cloth panel plus two gilt rods. */
export function hangingAt(
  face: Face,
  at: number,
  along: number,
  y: number,
  w: number,
  h: number,
): { cloth: THREE.BufferGeometry; rod: THREE.BufferGeometry } {
  const off = face === 'n' ? 0.06 : face === 's' ? -0.06 : face === 'w' ? 0.06 : -0.06;
  const x = face === 'n' || face === 's' ? along : at + off;
  const z = face === 'n' || face === 's' ? at + off : along;
  const horizontal = face === 'n' || face === 's';
  const cloth = horizontal ? bx(w, h, 0.04, x, y, z) : bx(0.04, h, w, x, y, z);
  const rod = horizontal ? bx(w + 0.3, 0.07, 0.09, x, y + h / 2 + 0.06, z) : bx(0.09, 0.07, w + 0.3, x, y + h / 2 + 0.06, z);
  return { cloth, rod };
}

/** A pool of light on a floor: an unlit disc that reads as a spot. */
export function lightPool(x: number, y: number, z: number, r: number): THREE.BufferGeometry {
  const geo = new THREE.CircleGeometry(r, 20);
  geo.rotateX(-Math.PI / 2);
  geo.translate(x, y, z);
  return geo;
}

/** A moulding profile swept along a facade in world space. */
export function mouldingAt(
  parent: THREE.Object3D,
  opts: { from: number; to: number; at: number; y: number; profile: Array<readonly [number, number]>; mat: string; alongZ?: boolean },
): void {
  const geo = extrudeProfile(opts.profile, { length: Math.abs(opts.to - opts.from) });
  if (opts.alongZ) geo.rotateY(Math.PI / 2);
  geo.translate(opts.alongZ ? opts.at : (opts.from + opts.to) / 2, opts.y, opts.alongZ ? (opts.from + opts.to) / 2 : opts.at);
  addPart(parent, geo, opts.mat);
}
