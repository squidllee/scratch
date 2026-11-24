import * as THREE from 'three';
import { boxGeo, mergeAll, quadGeo, smoothstep } from '../../core/geom';
import { addPart } from '../../core/merge';

/** Thin helpers the Richelieu rooms share: lit surfaces, vaults, flights, windows, plinths. */

export type LightFn = (x: number, z: number) => number;

/** Place a geometry with a material. Returns the mesh so a caller can tag it. */
export function put(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  material: string,
  at: readonly [number, number, number],
  rotationY = 0,
): THREE.Mesh {
  const mesh = addPart(parent, geo, material) as THREE.Mesh;
  mesh.position.set(at[0], at[1], at[2]);
  if (rotationY) mesh.rotation.y = rotationY;
  return mesh;
}

export interface PlateOptions {
  width: number;
  depth: number;
  nx: number;
  nz: number;
  y?: number;
  /** Baked light multiplier per vertex; 1 is fully lit. */
  light?: LightFn;
}

/**
 * A horizontal plate subdivided finely enough that baked light can vary across it. This is where
 * the courts' daylight lives: no realtime shadow, the falloff is in the vertex colours.
 */
export function plate(o: PlateOptions): THREE.BufferGeometry {
  const y = o.y ?? 0;
  const pos: number[] = [];
  const nor: number[] = [];
  const uvs: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= o.nz; j++) {
    const z = -o.depth / 2 + (o.depth * j) / o.nz;
    for (let i = 0; i <= o.nx; i++) {
      const x = -o.width / 2 + (o.width * i) / o.nx;
      pos.push(x, y, z);
      nor.push(0, 1, 0);
      uvs.push(x, z);
      const a = o.light ? clamp01(o.light(x, z)) : 1;
      col.push(a, a, a);
    }
  }
  const row = o.nx + 1;
  for (let j = 0; j < o.nz; j++) {
    for (let i = 0; i < o.nx; i++) {
      const a = j * row + i;
      const b = a + 1;
      const c = a + row + 1;
      const d = a + row;
      idx.push(a, d, c, a, c, b);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  return geo;
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Vertices of a shallow barrel vault: zero rise at the springing, `rise` at the crown. */
export function vaultPoint(t: number, span: number, rise: number): { z: number; y: number } {
  const s = 2 * t - 1;
  return { z: (t - 0.5) * span, y: rise * (1 - s * s) };
}

/** The glazing surface of a vault, as one subdivided sheet. */
export function vaultSurface(o: {
  width: number;
  span: number;
  rise: number;
  nx: number;
  nz: number;
  light?: LightFn;
}): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const uvs: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= o.nz; j++) {
    const p = vaultPoint(j / o.nz, o.span, o.rise);
    for (let i = 0; i <= o.nx; i++) {
      const x = -o.width / 2 + (o.width * i) / o.nx;
      pos.push(x, p.y, p.z);
      uvs.push(x, p.z);
      const a = o.light ? clamp01(o.light(x, p.z)) : 1;
      col.push(a, a, a);
    }
  }
  for (let j = 0; j <= o.nz; j++) {
    const p0 = vaultPoint(j / o.nz, o.span, o.rise);
    const p1 = vaultPoint(Math.min(1, (j + 1) / o.nz), o.span, o.rise);
    const pPrev = vaultPoint(Math.max(0, (j - 1) / o.nz), o.span, o.rise);
    const dz = (j + 1 <= o.nz ? p1.z : p0.z) - (j > 0 ? pPrev.z : p0.z);
    const dy = (j + 1 <= o.nz ? p1.y : p0.y) - (j > 0 ? pPrev.y : p0.y);
    const len = Math.hypot(dz, dy) || 1;
    for (let i = 0; i <= o.nx; i++) nor.push(0, -dz / len, dy / len);
  }
  const row = o.nx + 1;
  for (let j = 0; j < o.nz; j++) {
    for (let i = 0; i < o.nx; i++) {
      const a = j * row + i;
      const b = a + 1;
      const c = a + row + 1;
      const d = a + row;
      idx.push(a, b, c, a, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  return geo;
}

/** A straight bar following the vault curve across z at a fixed x (one truss or glazing bar). */
export function vaultBar(o: {
  span: number;
  rise: number;
  segments: number;
  width: number;
  depth: number;
  x: number;
  y?: number;
}): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < o.segments; i++) {
    const p0 = vaultPoint(i / o.segments, o.span, o.rise);
    const p1 = vaultPoint((i + 1) / o.segments, o.span, o.rise);
    const dz = p1.z - p0.z;
    const dy = p1.y - p0.y;
    const len = Math.hypot(dz, dy);
    const bar = boxGeo(o.width, o.depth, len + o.depth * 0.5);
    bar.rotateX(-Math.atan2(dy, dz));
    bar.translate(o.x, (o.y ?? 0) + (p0.y + p1.y) / 2, (p0.z + p1.z) / 2);
    parts.push(bar);
  }
  return mergeAll(parts);
}

/** A glazing bar running along x, sprung to the vault at one z (one purlin). */
export function vaultPurlin(o: { width: number; span: number; rise: number; z: number; thickness: number }): THREE.BufferGeometry {
  const t = (o.z + o.span / 2) / o.span;
  const p = vaultPoint(t, o.span, o.rise);
  const bar = boxGeo(o.width, o.thickness, o.thickness);
  bar.translate(0, p.y, p.z);
  return bar;
}

export interface FlightOptions {
  /** Steps up, counting from y = 0 locally. */
  steps: number;
  rise: number;
  run: number;
  width: number;
  /** Direction of travel: the flight is built along it, rising. */
  dir: '+x' | '-x' | '+z' | '-z';
}

/** A stone flight with treads and nosings, rising along one axis from y = 0. */
export function stoneFlight(o: FlightOptions): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < o.steps; i++) {
    const tread = boxGeo(o.width, o.rise, o.run + 0.02);
    const nose = boxGeo(o.width, 0.03, 0.05);
    if (o.dir === '+z' || o.dir === '-z') {
      const s = o.dir === '+z' ? 1 : -1;
      tread.rotateY(0);
      tread.translate(0, o.rise * (i + 0.5), s * o.run * (i + 0.5));
      nose.translate(0, o.rise * (i + 1) + 0.015, s * (o.run * (i + 1) - 0.02));
    } else {
      const s = o.dir === '+x' ? 1 : -1;
      tread.rotateY(Math.PI / 2);
      tread.translate(s * o.run * (i + 0.5), o.rise * (i + 0.5), 0);
      nose.rotateY(Math.PI / 2);
      nose.translate(s * (o.run * (i + 1) - 0.02), o.rise * (i + 1) + 0.015, 0);
    }
    parts.push(tread, nose);
  }
  const merged = mergeAll(parts);
  const pos = merged.attributes.position;
  const col = merged.attributes.color as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const a = 0.82 + 0.18 * smoothstep(0, 0.5, pos.getY(i));
    col.setXYZ(i, a, a, a);
  }
  col.needsUpdate = true;
  return merged;
}

/** A solid parapet with a moulded coping; runs along x centred on z = 0. */
export function parapet(o: { length: number; height?: number; thickness?: number }): THREE.BufferGeometry {
  const h = o.height ?? 0.95;
  const t = o.thickness ?? 0.35;
  const parts: THREE.BufferGeometry[] = [];
  const body = boxGeo(o.length, h, t);
  body.translate(0, h / 2, 0);
  parts.push(body);
  const coping = boxGeo(o.length + 0.08, 0.1, t + 0.14);
  coping.translate(0, h + 0.05, 0);
  parts.push(coping);
  const merged = mergeAll(parts);
  const pos = merged.attributes.position;
  const col = merged.attributes.color as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const a = 0.7 + 0.3 * smoothstep(0, 0.7, pos.getY(i));
    col.setXYZ(i, a, a, a);
  }
  col.needsUpdate = true;
  return merged;
}

/**
 * A sculpture plinth: foot, die and cap, with the top at `height`. Built around the origin so the
 * artwork can sit on it at y = height.
 */
export function plinth(o: { width: number; depth: number; height: number; waist?: number }): THREE.BufferGeometry {
  const h = o.height;
  const w = o.width;
  const d = o.depth;
  const waist = o.waist ?? 0.94;
  const parts: THREE.BufferGeometry[] = [];
  const foot = boxGeo(w, h * 0.1, d);
  foot.translate(0, h * 0.05, 0);
  parts.push(foot);
  const die = boxGeo(w * waist, h * 0.78, d * waist);
  die.translate(0, h * 0.1 + h * 0.39, 0);
  parts.push(die);
  const cap = boxGeo(w * 1.04, h * 0.08, d * 1.04);
  cap.translate(0, h * 0.92, 0);
  parts.push(cap);
  const merged = mergeAll(parts);
  const pos = merged.attributes.position;
  const col = merged.attributes.color as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const a = 0.68 + 0.32 * smoothstep(0, 0.45, y) * (1 - 0.12 * smoothstep(h * 0.86, h, y));
    col.setXYZ(i, a, a, a);
  }
  col.needsUpdate = true;
  return merged;
}

/** One window: stone surround and mullions, built in the XY plane with its sill at y = 0. */
export function windowUnit(o: { width: number; height: number; mullions?: number; thickness?: number }): THREE.BufferGeometry {
  const w = o.width;
  const h = o.height;
  const mullions = o.mullions ?? 1;
  const t = o.thickness ?? 0.42;
  const fw = 0.16;
  const parts: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    const jamb = boxGeo(fw, h, t);
    jamb.translate(side * (w / 2 - fw / 2), h / 2, 0);
    parts.push(jamb);
  }
  const head = boxGeo(w, fw, t);
  head.translate(0, h - fw / 2, 0);
  parts.push(head);
  const sill = boxGeo(w + 0.22, 0.12, t + 0.16);
  sill.translate(0, 0.06, 0.04);
  parts.push(sill);
  for (let i = 1; i <= mullions; i++) {
    const m = boxGeo(0.09, h - fw, t * 0.6);
    m.translate(-w / 2 + (w * i) / (mullions + 1), (h - fw) / 2 + fw * 0.3, 0);
    parts.push(m);
  }
  const transom = boxGeo(w - fw, 0.08, t * 0.6);
  transom.translate(0, h * 0.7, 0);
  parts.push(transom);
  return mergeAll(parts);
}

/** The glass behind a window unit, in the same local frame (sill at y = 0). */
export function windowGlass(o: { width: number; height: number; thickness?: number }): THREE.BufferGeometry {
  const w = o.width;
  const h = o.height;
  const t = (o.thickness ?? 0.42) * 0.3;
  return quadGeo(
    [-w / 2 + 0.16, 0.16, -t],
    [w / 2 - 0.16, 0.16, -t],
    [w / 2 - 0.16, h - 0.16, -t],
    [-w / 2 + 0.16, h - 0.16, -t],
    [[0, 0], [w, 0], [w, h], [0, h]],
  );
}

export interface Bay {
  /** Centre of the bay, at the sill. */
  at: readonly [number, number, number];
  rotationY: number;
}

/** Every bay of a wall run, one instanced draw call for all the stone and one merged glass sheet. */
export function windowBays(bays: Bay[], unit: THREE.BufferGeometry, glass: THREE.BufferGeometry): {
  frames: { unit: THREE.BufferGeometry; transforms: THREE.Matrix4[] };
  glass: THREE.BufferGeometry;
} {
  const transforms = bays.map((b) => {
    const m = new THREE.Matrix4().makeRotationY(b.rotationY);
    m.setPosition(b.at[0], b.at[1], b.at[2]);
    return m;
  });
  const glassGeos = bays.map((b) => {
    const g = glass.clone();
    g.rotateY(b.rotationY);
    g.translate(b.at[0], b.at[1], b.at[2]);
    return g;
  });
  return { frames: { unit, transforms }, glass: mergeAll(glassGeos) };
}

/**
 * Re-shade a merged group in place: multiply every vertex colour by a world-space function. This is
 * how a room lit only by its own chandeliers gets its falloff — the same trick the wall builders use
 * for AO, applied after the merge so it can read world height and plan position.
 */
export function bakeShade(
  root: THREE.Object3D,
  fn: (x: number, y: number, z: number) => [number, number, number],
): void {
  root.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || o instanceof THREE.InstancedMesh) return;
    const col = o.geometry.attributes.color as THREE.BufferAttribute | undefined;
    const pos = o.geometry.attributes.position;
    if (!col || !pos) return;
    for (let i = 0; i < pos.count; i++) {
      v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(o.matrixWorld);
      const [r, g, b] = fn(v.x, v.y, v.z);
      col.setXYZ(i, col.getX(i) * r, col.getY(i) * g, col.getZ(i) * b);
    }
    col.needsUpdate = true;
  });
}

/** A hard spotlight baked onto a floor: an elliptical pool with a soft edge. */
export function spot(x: number, z: number, cx: number, cz: number, rx: number, rz: number, peak: number, rest: number): number {
  const d = Math.hypot((x - cx) / rx, (z - cz) / rz);
  return rest + (peak - rest) * (1 - smoothstep(0.35, 1.0, d));
}
