import * as THREE from 'three';
import { boxGeo, extrudeProfile, mergeAll, quadGeo, smoothstep, type ProfilePoint } from '../geom';
import type { BuildParts, Opening } from './types';

const baseAo = (y: number): number => 0.68 + 0.32 * smoothstep(0, 1.2, y);

/** Corner darkening: 0 at a corner, 1 in open space. */
const cornerAo = (distToEdge: number, falloff = 0.9, amount = 0.22): number =>
  1 - amount * (1 - smoothstep(0, falloff, distToEdge));

function planUv(geo: THREE.BufferGeometry, scale = 1): THREE.BufferGeometry {
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nz = nrm ? Math.abs(nrm.getZ(i)) : 1;
    uv[i * 2] = (nz > 0.6 ? x : x + z) * scale;
    uv[i * 2 + 1] = (y + (nz > 0.6 ? 0 : z)) * scale;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

export interface WallOptions {
  length: number;
  height: number;
  /** Wall thickness in metres; the wall straddles z = 0. Defaults 0.5. */
  thickness?: number;
  openings?: Opening[];
  /** Vertical corner darkening amount, 0 disables. Defaults 0.22. */
  cornerAo?: number;
}

/**
 * A wall slab lying in the XY plane, straddling z = 0, rising from y = 0 to y = height.
 * Openings are cut for real (triangulated holes), so a doorway is a hole in the wall rather than
 * a gap between two boxes.
 */
export function wall(opts: WallOptions): THREE.BufferGeometry {
  const { length, height } = opts;
  const thickness = opts.thickness ?? 0.5;
  const openings = opts.openings ?? [];
  const shape = new THREE.Shape();
  shape.moveTo(-length / 2, 0);
  shape.lineTo(length / 2, 0);
  shape.lineTo(length / 2, height);
  shape.lineTo(-length / 2, height);
  shape.closePath();

  for (const o of openings) {
    const hw = o.width / 2;
    const sill = o.sill ?? 0;
    const hole = new THREE.Path();
    hole.moveTo(o.x - hw, sill);
    if (o.arched) {
      const spring = o.head - hw;
      hole.lineTo(o.x - hw, spring);
      hole.absarc(o.x, spring, hw, Math.PI, 0, true);
    } else {
      hole.lineTo(o.x - hw, o.head);
      hole.lineTo(o.x + hw, o.head);
    }
    hole.lineTo(o.x + hw, sill);
    hole.closePath();
    shape.holes.push(hole);
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 10,
    steps: 1,
  });
  geo.translate(0, 0, -thickness / 2);
  geo.computeVertexNormals();
  planUv(geo, 1);

  const cornerAmount = opts.cornerAo ?? 0.22;
  const col = new Float32Array(geo.attributes.position.count * 3);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const dEdge = Math.min(x + length / 2, length / 2 - x);
    let a = baseAo(y) * cornerAo(dEdge, 1.1, cornerAmount);
    a *= 1 - 0.16 * smoothstep(height - 0.7, height, y);
    col[i * 3] = a;
    col[i * 3 + 1] = a;
    col[i * 3 + 2] = a;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

export interface FloorOptions {
  width: number;
  depth: number;
  thickness?: number;
  /** Perimeter contact darkening in metres. Defaults 1.1. */
  edgeFalloff?: number;
}

/** A floor slab with its walking surface at y = 0 and its thickness below. */
export function floor(opts: FloorOptions): THREE.BufferGeometry {
  const { width, depth } = opts;
  const thickness = opts.thickness ?? 0.3;
  const falloff = opts.edgeFalloff ?? 1.1;
  const geo = boxGeo(width, thickness, depth);
  geo.translate(0, -thickness / 2, 0);
  const pos = geo.attributes.position;
  const col = geo.attributes.color as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const dx = Math.min(pos.getX(i) + width / 2, width / 2 - pos.getX(i));
    const dz = Math.min(pos.getZ(i) + depth / 2, depth / 2 - pos.getZ(i));
    const d = Math.min(dx, dz);
    const a = 0.74 + 0.26 * smoothstep(0, falloff, d);
    col.setXYZ(i, a, a, a);
  }
  col.needsUpdate = true;
  return geo;
}

export interface CeilingOptions {
  width: number;
  depth: number;
  thickness?: number;
  /** Cross beams spanning the width, count along the depth axis. */
  beams?: number;
}

/** A plain ceiling slab whose finished face is at y = 0 (place it at room height). */
export function ceiling(opts: CeilingOptions): THREE.BufferGeometry {
  const { width, depth } = opts;
  const thickness = opts.thickness ?? 0.3;
  const parts: THREE.BufferGeometry[] = [];
  const slab = boxGeo(width, thickness, depth);
  slab.translate(0, -thickness / 2, 0);
  parts.push(slab);
  const beams = opts.beams ?? 0;
  if (beams > 0) {
    const spacing = depth / (beams + 1);
    for (let i = 1; i <= beams; i++) {
      const b = boxGeo(width, 0.28, 0.3);
      b.translate(0, -thickness - 0.14, -depth / 2 + spacing * i);
      parts.push(b);
    }
  }
  return mergeAll(parts);
}

export interface CofferCeilingOptions {
  width: number;
  depth: number;
  baysX?: number;
  baysZ?: number;
  beamWidth?: number;
  beamDepth?: number;
  slabThickness?: number;
  /** Small carved rosette at each coffer centre. */
  rosettes?: boolean;
}

/**
 * Coffered ceiling: a grid of beams hanging below a slab, with a rosette in each coffer.
 * Its finished (lowest) plane sits at y = -beamDepth, so place it at roomHeight + beamDepth.
 */
export function cofferCeiling(opts: CofferCeilingOptions): THREE.BufferGeometry {
  const baysX = opts.baysX ?? 4;
  const baysZ = opts.baysZ ?? 6;
  const bw = opts.beamWidth ?? 0.34;
  const bd = opts.beamDepth ?? 0.32;
  const st = opts.slabThickness ?? 0.22;
  const parts: THREE.BufferGeometry[] = [];

  const slab = boxGeo(opts.width, st, opts.depth);
  slab.translate(0, st / 2, 0);
  parts.push(slab);

  const innerW = opts.width;
  const innerD = opts.depth;
  for (let i = 0; i <= baysX; i++) {
    const x = -innerW / 2 + (innerW * i) / baysX;
    const b = boxGeo(bw, bd, innerD + 0.01);
    b.translate(x, -bd / 2, 0);
    parts.push(b);
  }
  for (let j = 0; j <= baysZ; j++) {
    const z = -innerD / 2 + (innerD * j) / baysZ;
    const b = boxGeo(innerW + 0.01, bd, bw);
    b.translate(0, -bd / 2, z);
    parts.push(b);
  }

  if (opts.rosettes !== false) {
    const cellW = innerW / baysX;
    const cellD = innerD / baysZ;
    const radius = Math.min(cellW, cellD) * 0.16;
    for (let i = 0; i < baysX; i++) {
      for (let j = 0; j < baysZ; j++) {
        const cx = -innerW / 2 + cellW * (i + 0.5);
        const cz = -innerD / 2 + cellD * (j + 0.5);
        const rosette = new THREE.LatheGeometry(
          [
            new THREE.Vector2(0.0001, 0),
            new THREE.Vector2(radius * 0.7, 0.02),
            new THREE.Vector2(radius, 0.05),
            new THREE.Vector2(radius * 0.55, 0.09),
            new THREE.Vector2(0.0001, 0.1),
          ].reverse(),
          12,
        );
        rosette.rotateX(Math.PI / 2);
        rosette.translate(cx, 0.001, cz);
        // Lathe normals point outward; the visible side is the underside, so flip.
        parts.push(rosette);
      }
    }
  }

  const merged = mergeAll(parts);
  const pos = merged.attributes.position;
  const col = merged.attributes.color as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const dx = Math.min(pos.getX(i) + opts.width / 2, opts.width / 2 - pos.getX(i));
    const dz = Math.min(pos.getZ(i) + opts.depth / 2, opts.depth / 2 - pos.getZ(i));
    const a = 0.78 + 0.22 * smoothstep(0, 0.9, Math.min(dx, dz));
    const lift = 1;
    col.setXYZ(i, col.getX(i) * a * lift, col.getY(i) * a * lift, col.getZ(i) * a * lift);
  }
  col.needsUpdate = true;
  return merged;
}

export interface CorniceOptions {
  length: number;
  /** Overall height of the moulding. Defaults 0.5. */
  height?: number;
  /** How far it stands proud of the wall. Defaults 0.32. */
  projection?: number;
  /** Dentil blocks under the corona. */
  dentils?: boolean;
}

/**
 * A classical cornice: the step-and-ogee profile that separates wall from ceiling.
 * Runs along X, stands off z = 0 into +Z, base at y = 0.
 */
export function cornice(opts: CorniceOptions): THREE.BufferGeometry {
  const h = opts.height ?? 0.5;
  const p = opts.projection ?? 0.32;
  const profile: ProfilePoint[] = [
    [0, 0],
    [0.03, 0],
    [0.03, 0.06],
    [p * 0.28, h * 0.12],
    [p * 0.3, h * 0.2],
    [p * 0.45, h * 0.26],
    [p * 0.58, h * 0.34],
    [p * 0.7, h * 0.42],
    [p * 0.82, h * 0.5],
    [p * 0.95, h * 0.58],
    [p, h * 0.64],
    [p, h * 0.74],
    [p * 0.92, h * 0.78],
    [p * 1.04, h * 0.84],
    [p * 1.04, h * 0.93],
    [p * 0.9, h * 0.97],
    [p * 0.9, h],
    [0, h],
  ];
  const parts: THREE.BufferGeometry[] = [extrudeProfile(profile, { length: opts.length })];
  if (opts.dentils !== false) {
    const spacing = 0.24;
    const count = Math.max(2, Math.floor(opts.length / spacing));
    const step = opts.length / count;
    const dh = h * 0.16;
    const dw = step * 0.55;
    for (let i = 0; i < count; i++) {
      const x = -opts.length / 2 + step * (i + 0.5);
      const d = boxGeo(dw, dh, p * 0.3);
      d.translate(x, h * 0.2 + dh / 2, p * 0.3 + p * 0.15);
      parts.push(d);
    }
  }
  return mergeAll(parts);
}

/** A baseboard / skirting: runs along X, protrudes into +Z, base at y = 0. */
export function baseboard(opts: { length: number; height?: number; thickness?: number }): THREE.BufferGeometry {
  const h = opts.height ?? 0.24;
  const t = opts.thickness ?? 0.05;
  const profile: ProfilePoint[] = [
    [0, 0],
    [t * 0.7, 0],
    [t, 0.03],
    [t, h * 0.82],
    [t * 1.35, h * 0.9],
    [t * 1.35, h],
    [0, h],
  ];
  return extrudeProfile(profile, { length: opts.length });
}

/** Extrude any profile along X; the escape hatch for custom mouldings. */
export function moulding(opts: { length: number; profile: ProfilePoint[] }): THREE.BufferGeometry {
  return extrudeProfile(opts.profile, { length: opts.length });
}

export interface ParquetOptions {
  width: number;
  depth: number;
  /** Width of the border band around the field. Defaults 0.45. */
  border?: number;
  /** Thickness of the finished floor. Defaults 0.03. */
  thickness?: number;
  /** Raised bands crossing the field diagonally (Versailles panels). Defaults 2. */
  crossBands?: number;
}

/**
 * Parquet de Versailles: a bordered field with raised bands crossing it. The boards are painted
 * by the parquet texture (procedural, tiled by metre); the geometry gives the border and bands
 * real relief so grazing light and baked AO read them.
 */
export function parquet(opts: ParquetOptions): THREE.BufferGeometry {
  const { width, depth } = opts;
  const border = opts.border ?? 0.45;
  const t = opts.thickness ?? 0.03;
  const parts: THREE.BufferGeometry[] = [];

  const field = boxGeo(width, t, depth);
  field.translate(0, -t / 2, 0);
  parts.push(field);

  const bt = t * 0.55;
  const band = (w: number, d: number, x: number, z: number): void => {
    const b = boxGeo(w, bt, d);
    b.translate(x, bt / 2 - t * 0.1, z);
    parts.push(b);
  };
  // Border frame, laid as four raised strips just inside the field edge.
  band(width - border * 2, border * 0.5, 0, depth / 2 - border * 0.75);
  band(width - border * 2, border * 0.5, 0, -depth / 2 + border * 0.75);
  band(border * 0.5, depth - border * 2, width / 2 - border * 0.75, 0);
  band(border * 0.5, depth - border * 2, -width / 2 + border * 0.75, 0);
  // Inner margin line.
  const m = border * 1.6;
  band(width - m * 2, 0.06, 0, depth / 2 - m);
  band(width - m * 2, 0.06, 0, -depth / 2 + m);
  band(0.06, depth - m * 2, width / 2 - m, 0);
  band(0.06, depth - m * 2, -width / 2 + m, 0);

  const crossBands = opts.crossBands ?? 2;
  if (crossBands > 0) {
    const innerW = width - border * 3.2;
    const innerD = depth - border * 3.2;
    const stepX = innerW / crossBands;
    const stepZ = innerD / crossBands;
    for (let i = 1; i < crossBands; i++) {
      band(0.07, innerD, -innerW / 2 + stepX * i, 0);
    }
    for (let j = 1; j < crossBands; j++) {
      band(innerW, 0.07, 0, -innerD / 2 + stepZ * j);
    }
  }

  const merged = mergeAll(parts);
  const pos = merged.attributes.position;
  const col = merged.attributes.color as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const dx = Math.min(pos.getX(i) + width / 2, width / 2 - pos.getX(i));
    const dz = Math.min(pos.getZ(i) + depth / 2, depth / 2 - pos.getZ(i));
    const a = 0.72 + 0.28 * smoothstep(0, 1.0, Math.min(dx, dz));
    col.setXYZ(i, a, a, a);
  }
  col.needsUpdate = true;
  return merged;
}

export interface StaircaseOptions {
  steps: number;
  rise: number;
  run: number;
  width: number;
  /** Draw only every nth step as a full box; the rest are simple slabs. Keeps counts honest. */
  solid?: boolean;
}

/** A straight stair flight climbing in +Z, ascending to y = steps * rise. */
export function staircase(opts: StaircaseOptions): THREE.BufferGeometry {
  const { steps, rise, run, width } = opts;
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < steps; i++) {
    const tread = boxGeo(width, rise, run + 0.02);
    tread.translate(0, rise * (i + 0.5), run * (i + 0.5));
    parts.push(tread);
    // Nosing: a small lip that catches light along every tread edge.
    const nose = boxGeo(width, 0.03, 0.04);
    nose.translate(0, rise * (i + 1) + 0.015, run * (i + 1) - 0.01);
    parts.push(nose);
  }
  const merged = mergeAll(parts);
  const pos = merged.attributes.position;
  const col = merged.attributes.color as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const a = 0.82 + 0.18 * smoothstep(0, 0.6, pos.getZ(i) + run * steps * 0.5);
    col.setXYZ(i, a, a, a);
  }
  col.needsUpdate = true;
  return merged;
}

export interface MansardRoofOptions {
  width: number;
  depth: number;
  /** Height of the steep lower slope. */
  lowerHeight?: number;
  /** Height of the shallow upper slope. */
  upperHeight?: number;
  /** Horizontal inset at the top of the lower slope. */
  inset?: number;
}

/**
 * A mansard roof: a steep zinc lower slope with a shallow upper cap, as on the Cour Napoléon
 * pavilions. Base sits at y = 0 and extends y = 0..lowerHeight+upperHeight.
 */
export function mansardRoof(opts: MansardRoofOptions): THREE.BufferGeometry {
  const { width, depth } = opts;
  const lh = opts.lowerHeight ?? 4.2;
  const uh = opts.upperHeight ?? 2.2;
  const inset = opts.inset ?? Math.min(width, depth) * 0.16;
  const parts: THREE.BufferGeometry[] = [];
  const hw = width / 2;
  const hd = depth / 2;
  const iw = hw - inset;
  const id = hd - inset;
  const tw = iw * 0.62;
  const td = id * 0.62;

  const slope = (a: [number, number, number], b: [number, number, number], c: [number, number, number], d: [number, number, number]): void => {
    const w = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const h = Math.hypot(b[1] - a[1], 0) + 0.001;
    parts.push(quadGeo(a, b, c, d, [[0, 0], [w, 0], [w, h], [0, h]]));
  };
  // +Z and -Z lower slopes
  slope([-hw, 0, hd], [hw, 0, hd], [iw, lh, id], [-iw, lh, id]);
  slope([hw, 0, -hd], [-hw, 0, -hd], [-iw, lh, -id], [iw, lh, -id]);
  // +X and -X lower slopes
  slope([hw, 0, hd], [hw, 0, -hd], [iw, lh, -id], [iw, lh, id]);
  slope([-hw, 0, -hd], [-hw, 0, hd], [-iw, lh, id], [-iw, lh, -id]);
  // upper slopes
  slope([iw, lh, id], [-iw, lh, id], [-tw, lh + uh, td], [tw, lh + uh, td]);
  slope([-iw, lh, -id], [iw, lh, -id], [tw, lh + uh, -td], [-tw, lh + uh, -td]);
  slope([iw, lh, -id], [iw, lh, id], [tw, lh + uh, td], [tw, lh + uh, -td]);
  slope([-iw, lh, id], [-iw, lh, -id], [-tw, lh + uh, -td], [-tw, lh + uh, td]);
  parts.push(quadGeo([-tw, lh + uh, td], [tw, lh + uh, td], [tw, lh + uh, -td], [-tw, lh + uh, -td], [[0, 0], [tw * 2, 0], [tw * 2, td * 2], [0, td * 2]]));
  const merged = mergeAll(parts);
  const pos = merged.attributes.position;
  const col = merged.attributes.color as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const a = 0.8 + 0.2 * smoothstep(0, 2.2, pos.getY(i));
    col.setXYZ(i, a, a, a);
  }
  col.needsUpdate = true;
  return merged;
}

export interface SkylightOptions {
  width: number;
  depth: number;
  /** Glazing bars across the short axis. Defaults 5. */
  bars?: number;
  /** Bar thickness in metres. Defaults 0.09. */
  barWidth?: number;
  frameWidth?: number;
}

/**
 * A glazed skylight: bronze glazing bars in a stone kerb with a sheet of glass.
 * Sits at y = 0..-0.16, i.e. slightly proud below the ceiling plane; place it at the opening.
 */
export function skylight(opts: SkylightOptions): BuildParts {
  const { width, depth } = opts;
  const bars = opts.bars ?? 5;
  const bw = opts.barWidth ?? 0.09;
  const fw = opts.frameWidth ?? 0.2;
  const parts: THREE.BufferGeometry[] = [];

  // Kerb
  parts.push(boxGeo(width, 0.16, fw * 2).translate(0, -0.08, depth / 2 - fw));
  parts.push(boxGeo(width, 0.16, fw * 2).translate(0, -0.08, -depth / 2 + fw));
  parts.push(boxGeo(fw * 2, 0.16, depth).translate(width / 2 - fw, -0.08, 0));
  parts.push(boxGeo(fw * 2, 0.16, depth).translate(-width / 2 + fw, -0.08, 0));
  // Longitudinal bars
  for (let i = 0; i <= bars; i++) {
    const x = -width / 2 + fw + ((width - fw * 2) * i) / bars;
    parts.push(boxGeo(bw, 0.1, depth - fw * 2).translate(x, -0.05, 0));
  }
  // Transverse bars
  const trans = Math.max(1, Math.round(bars * (depth / width)));
  for (let j = 1; j < trans; j++) {
    const z = -depth / 2 + fw + ((depth - fw * 2) * j) / trans;
    parts.push(boxGeo(width - fw * 2, 0.08, bw).translate(0, -0.04, z));
  }

  const glass = quadGeo(
    [-width / 2 + fw, -0.1, depth / 2 - fw],
    [width / 2 - fw, -0.1, depth / 2 - fw],
    [width / 2 - fw, -0.1, -depth / 2 + fw],
    [-width / 2 + fw, -0.1, -depth / 2 + fw],
    [[0, 0], [width, 0], [width, depth], [0, depth]],
  );

  return { 'gold.bronze-tarnished': mergeAll(parts), 'glass.skylight-clear': glass };
}

export interface DoorwayOptions {
  width: number;
  height: number;
  thickness?: number;
  /** Arched head with a moulded archivolt. */
  arched?: boolean;
  /** Casing projection into the room. Defaults 0.07. */
  casing?: number;
}

/**
 * A door casing: jambs and a head in dressed stone, standing proud of the wall face.
 * Builds in the XY plane, facing +Z, base at y = 0. Use it inside a wall opening of the same size.
 */
export function doorway(opts: DoorwayOptions): THREE.BufferGeometry {
  const { width, height } = opts;
  const t = opts.thickness ?? 0.3;
  const casing = opts.casing ?? 0.07;
  const parts: THREE.BufferGeometry[] = [];
  const jambW = 0.16;
  for (const side of [-1, 1]) {
    const j = boxGeo(jambW, height, t + casing * 2);
    j.translate(side * (width / 2 + jambW / 2), height / 2, casing);
    parts.push(j);
  }
  if (opts.arched) {
    const r = width / 2 + jambW;
    const arc = new THREE.Shape();
    arc.absarc(0, height - width / 2 - jambW / 2, r, 0, Math.PI, false);
    arc.lineTo(-r, height - width / 2 - jambW / 2 - jambW);
    arc.absarc(0, height - width / 2 - jambW / 2, r - jambW, Math.PI, 0, true);
    arc.closePath();
    const g = new THREE.ExtrudeGeometry(arc, { depth: t + casing * 2, bevelEnabled: false, curveSegments: 12 });
    g.rotateX(0);
    g.translate(0, 0, casing);
    parts.push(g);
  } else {
    const h = boxGeo(width + jambW * 2, jambW, t + casing * 2);
    h.translate(0, height + jambW / 2, casing);
    parts.push(h);
  }
  // Threshold
  const sill = boxGeo(width + jambW * 2, 0.04, t + casing * 2);
  sill.translate(0, 0.02, casing);
  parts.push(sill);
  return mergeAll(parts);
}

export interface ArchOptions {
  /** Clear span of the arch. */
  span: number;
  /** Band width (voussoir thickness) of the arch ring. Defaults 0.3. */
  band?: number;
  thickness?: number;
}

/** A free-standing semicircular arch ring, springing at y = 0, in the XY plane. */
export function arch(opts: ArchOptions): THREE.BufferGeometry {
  const r = opts.span / 2;
  const band = opts.band ?? 0.3;
  const t = opts.thickness ?? 0.4;
  const shape = new THREE.Shape();
  shape.absarc(0, 0, r + band, 0, Math.PI, false);
  shape.lineTo(-r, 0);
  shape.absarc(0, 0, r, Math.PI, 0, true);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 16 });
  geo.translate(0, 0, -t / 2);
  geo.computeVertexNormals();
  planUv(geo, 1);
  const col = new Float32Array(geo.attributes.position.count * 3);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const a = 0.86 + 0.14 * smoothstep(0, r, pos.getY(i));
    col[i * 3] = a;
    col[i * 3 + 1] = a;
    col[i * 3 + 2] = a;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

export interface ArcadeOptions {
  bays: number;
  bayWidth: number;
  /** Pier width between openings. Defaults 0.7. */
  pierWidth?: number;
  height: number;
  thickness?: number;
  /** Height of the arch springing. Defaults height * 0.62. */
  springHeight?: number;
}

/** A nave arcade: a run of semicircular arches carried on piers, built as one pierced wall. */
export function arcade(opts: ArcadeOptions): THREE.BufferGeometry {
  const bay = opts.bayWidth;
  const pier = opts.pierWidth ?? 0.7;
  const length = opts.bays * bay + (opts.bays + 1) * pier;
  const openings: Opening[] = [];
  for (let i = 0; i < opts.bays; i++) {
    openings.push({
      x: -length / 2 + pier + bay / 2 + i * (bay + pier),
      width: bay,
      sill: 0,
      head: (opts.springHeight ?? opts.height * 0.62) + bay / 2,
      arched: true,
    });
  }
  return wall({ length, height: opts.height, thickness: opts.thickness ?? 0.6, openings });
}

export interface WindowRowOptions {
  bays: number;
  bayWidth: number;
  /** Distance between window centres. Defaults bayWidth. */
  spacing?: number;
  sillHeight: number;
  headHeight: number;
  /** Wall thickness the row is cut through. Defaults 0.6. */
  thickness?: number;
  /** Mullion count inside each window (1 = a single central mullion). Defaults 1. */
  mullions?: number;
}

/**
 * A row of tall windows: instanced stone surrounds plus one shared glass sheet per bay.
 * Runs along X centred on the origin, in the plane z = 0, base at y = 0.
 */
export function windowRow(opts: WindowRowOptions): BuildParts {
  const spacing = opts.spacing ?? opts.bayWidth;
  const mullions = opts.mullions ?? 1;
  const t = opts.thickness ?? 0.6;
  const h = opts.headHeight - opts.sillHeight;
  const w = opts.bayWidth;
  const frameW = 0.14;

  const unit: THREE.BufferGeometry[] = [];
  const jl = boxGeo(frameW, h, t * 0.9);
  jl.translate(-w / 2 + frameW / 2, h / 2, 0);
  unit.push(jl);
  const jr = boxGeo(frameW, h, t * 0.9);
  jr.translate(w / 2 - frameW / 2, h / 2, 0);
  unit.push(jr);
  const head = boxGeo(w, frameW, t * 0.9);
  head.translate(0, h - frameW / 2, 0);
  unit.push(head);
  const sill = boxGeo(w + 0.16, frameW, t + 0.14);
  sill.translate(0, frameW / 2, 0.03);
  unit.push(sill);
  for (let i = 1; i <= mullions; i++) {
    const x = -w / 2 + (w * i) / (mullions + 1);
    const m = boxGeo(0.07, h - frameW, t * 0.6);
    m.translate(x, (h - frameW) / 2 + frameW * 0.2, 0);
    unit.push(m);
  }
  const transom = boxGeo(w - frameW, 0.07, t * 0.6);
  transom.translate(0, h * 0.72, 0);
  unit.push(transom);

  const frameUnit = mergeAll(unit);
  const transforms: THREE.Matrix4[] = [];
  for (let i = 0; i < opts.bays; i++) {
    const x = (i - (opts.bays - 1) / 2) * spacing;
    transforms.push(new THREE.Matrix4().makeTranslation(x, opts.sillHeight, 0));
  }

  const glassCount = opts.bays;
  const glassGeos: THREE.BufferGeometry[] = [];
  for (let i = 0; i < glassCount; i++) {
    const x = (i - (opts.bays - 1) / 2) * spacing;
    glassGeos.push(
      quadGeo(
        [x - w / 2 + frameW, opts.sillHeight + frameW, -0.02],
        [x + w / 2 - frameW, opts.sillHeight + frameW, -0.02],
        [x + w / 2 - frameW, opts.headHeight - frameW, -0.02],
        [x - w / 2 + frameW, opts.headHeight - frameW, -0.02],
        [[0, 0], [w, 0], [w, h], [0, h]],
      ),
    );
  }

  return { 'wood.walnut': { unit: frameUnit, transforms }, 'glass.skylight-clear': mergeAll(glassGeos) };
}
