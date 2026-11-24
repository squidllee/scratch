import * as THREE from 'three';
import { boxGeo, extrudeProfile, mergeAll, smoothstep } from '../geom';
import type { ProfilePoint } from '../geom';

export type ColumnOrder = 'doric' | 'ionic' | 'corinthian' | 'plain';

export interface ColumnOptions {
  /** Total height including base and capital. */
  height: number;
  /** Shaft radius at the base, metres. */
  radius: number;
  order?: ColumnOrder;
  /** Radial segments; 20 reads as fluted under flat shading without a big triangle bill. */
  segments?: number;
}

function lathe(profile: [number, number][], segments: number): THREE.BufferGeometry {
  const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y));
  const geo = new THREE.LatheGeometry(pts, segments);
  geo.computeVertexNormals();
  return geo;
}

/**
 * A classical column standing on y = 0: plinth, moulded base, tapered shaft with entasis,
 * and a capital whose profile changes with the order.
 */
export function column(opts: ColumnOptions): THREE.BufferGeometry {
  const order = opts.order ?? 'corinthian';
  const r = opts.radius;
  const seg = opts.segments ?? 20;
  const h = opts.height;
  const plinthH = h * 0.032;
  const baseH = h * 0.038;
  const capH = order === 'plain' ? h * 0.03 : h * 0.085;
  const shaftH = h - plinthH - baseH - capH;
  const parts: THREE.BufferGeometry[] = [];

  const plinth = boxGeo(r * 2.7, plinthH, r * 2.7);
  plinth.translate(0, plinthH / 2, 0);
  parts.push(plinth);

  const base = lathe(
    [
      [r * 1.3, 0],
      [r * 1.3, baseH * 0.32],
      [r * 1.18, baseH * 0.42],
      [r * 1.22, baseH * 0.58],
      [r * 1.06, baseH * 0.82],
      [r, baseH],
    ],
    seg,
  );
  base.translate(0, plinthH, 0);
  parts.push(base);

  const shaft = new THREE.CylinderGeometry(r * 0.87, r, shaftH, seg, 1, false);
  shaft.translate(0, plinthH + baseH + shaftH / 2, 0);
  parts.push(shaft);

  const capitalY = plinthH + baseH + shaftH;
  if (order === 'doric') {
    const echinus = lathe(
      [
        [r * 0.87, 0],
        [r * 1.02, capH * 0.28],
        [r * 1.16, capH * 0.52],
        [r * 1.3, capH * 0.62],
        [r * 1.3, capH * 0.68],
      ],
      seg,
    );
    echinus.translate(0, capitalY, 0);
    parts.push(echinus);
    const abacus = boxGeo(r * 2.9, capH * 0.32, r * 2.9);
    abacus.translate(0, capitalY + capH * 0.84, 0);
    parts.push(abacus);
  } else if (order === 'ionic' || order === 'corinthian') {
    const bell = lathe(
      [
        [r * 0.87, 0],
        [r * 0.95, capH * 0.22],
        [r * 1.12, capH * 0.45],
        [r * 1.34, capH * 0.66],
        [r * 1.36, capH * 0.74],
      ],
      seg,
    );
    bell.translate(0, capitalY, 0);
    parts.push(bell);
    if (order === 'corinthian') {
      const leafCount = 8;
      for (let i = 0; i < leafCount; i++) {
        const a = (i / leafCount) * Math.PI * 2;
        const leaf = boxGeo(r * 0.34, capH * 0.5, r * 0.12);
        leaf.translate(0, capH * 0.26, r * 1.16);
        leaf.rotateY(a);
        leaf.translate(Math.sin(a) * 0, capitalY, 0);
        parts.push(leaf);
      }
    } else {
      for (const side of [-1, 1]) {
        const volute = new THREE.TorusGeometry(r * 0.34, r * 0.11, 6, 10);
        volute.rotateY(Math.PI / 2);
        volute.translate(side * r * 1.18, capitalY + capH * 0.52, 0);
        parts.push(volute);
      }
    }
    const abacus = boxGeo(r * 2.85, capH * 0.22, r * 2.85);
    abacus.translate(0, capitalY + capH * 0.9, 0);
    parts.push(abacus);
  } else {
    const cap = boxGeo(r * 2.4, capH, r * 2.4);
    cap.translate(0, capitalY + capH / 2, 0);
    parts.push(cap);
  }

  const merged = mergeAll(parts);
  const pos = merged.attributes.position;
  const col = merged.attributes.color as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const a = 0.8 + 0.2 * smoothstep(0, 0.9, pos.getY(i));
    col.setXYZ(i, a, a, a);
  }
  col.needsUpdate = true;
  geoAoRim(merged, 0.06);
  return merged;
}

/** Slight darkening where a solid meets its plinth, so columns sit on the floor. */
function geoAoRim(geo: THREE.BufferGeometry, amount: number): void {
  const col = geo.attributes.color as THREE.BufferAttribute;
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  if (!nrm) return;
  for (let i = 0; i < pos.count; i++) {
    const ny = nrm.getY(i);
    if (ny < -0.5 && pos.getY(i) < 0.3) {
      const k = 1 - amount;
      col.setXYZ(i, col.getX(i) * k, col.getY(i) * k, col.getZ(i) * k);
    }
  }
  col.needsUpdate = true;
}

export interface PilasterOptions {
  /** Face width in metres. */
  width: number;
  height: number;
  /** How far it stands proud of the wall plane. Defaults 0.16. */
  depth?: number;
  order?: ColumnOrder;
}

/** A flattened column engaged with a wall: shaft, moulded base and capital. Faces +Z from z = 0. */
export function pilaster(opts: PilasterOptions): THREE.BufferGeometry {
  const { width, height } = opts;
  const d = opts.depth ?? 0.16;
  const baseH = height * 0.05;
  const capH = height * 0.075;
  const shaftH = height - baseH - capH;
  const parts: THREE.BufferGeometry[] = [];

  const shaft = boxGeo(width, shaftH, d);
  shaft.translate(0, baseH + shaftH / 2, d / 2);
  parts.push(shaft);
  // Flute grooves: three shallow recesses reading as shadow lines under flat shading.
  for (let i = 0; i < 4; i++) {
    const x = -width / 2 + (width * (i + 0.5)) / 4;
    const g = boxGeo(width * 0.055, shaftH * 0.94, 0.05);
    g.translate(x, baseH + shaftH / 2, d - 0.005);
    parts.push(g);
  }

  const baseProfile: ProfilePoint[] = [
    [0, 0],
    [d * 1.7, 0],
    [d * 1.7, baseH * 0.3],
    [d * 1.25, baseH * 0.45],
    [d * 1.3, baseH * 0.62],
    [d * 1.0, baseH * 0.88],
    [d, baseH],
    [0, baseH],
  ];
  const base = extrudeProfile(baseProfile, { length: width * 1.08 });
  parts.push(base);

  const capProfile: ProfilePoint[] = [
    [0, 0],
    [d * 1.02, 0],
    [d * 1.12, capH * 0.2],
    [d * 1.45, capH * 0.38],
    [d * 1.6, capH * 0.55],
    [d * 1.6, capH * 0.72],
    [d * 1.85, capH * 0.86],
    [d * 1.85, capH],
    [0, capH],
  ];
  const cap = extrudeProfile(capProfile, { length: width * 1.12 });
  cap.translate(0, baseH + shaftH, 0);
  parts.push(cap);

  const merged = mergeAll(parts);
  const pos = merged.attributes.position;
  const col = merged.attributes.color as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const a = 0.82 + 0.18 * smoothstep(0, 0.8, pos.getY(i));
    col.setXYZ(i, a, a, a);
  }
  col.needsUpdate = true;
  return merged;
}

export interface BalustradeOptions {
  length: number;
  /** Height from floor to top of the handrail. Defaults 1.05. */
  height?: number;
  /** Distance between baluster centres. Defaults 0.22. */
  spacing?: number;
  /** Rail thickness in metres. Defaults 0.12. */
  railWidth?: number;
}

/**
 * A stone balustrade along X: plinth, vase balusters, moulded handrail. One geometry, one
 * material, merged — the baluster repetition lives inside the merge so a 40 m balustrade is
 * still a single draw call.
 */
export function balustrade(opts: BalustradeOptions): THREE.BufferGeometry {
  const h = opts.height ?? 1.05;
  const spacing = opts.spacing ?? 0.22;
  const railW = opts.railWidth ?? 0.12;
  const parts: THREE.BufferGeometry[] = [];

  const plinthH = h * 0.11;
  const plinth = boxGeo(opts.length, plinthH, railW * 1.5);
  plinth.translate(0, plinthH / 2, 0);
  parts.push(plinth);

  const railH = h * 0.11;
  const rail = boxGeo(opts.length, railH, railW * 1.6);
  rail.translate(0, h - railH / 2, 0);
  parts.push(rail);
  const capProfile: ProfilePoint[] = [
    [0, 0],
    [railW * 0.85, 0],
    [railW * 0.85, railH * 0.3],
    [railW, railH * 0.55],
    [railW * 0.8, railH * 0.8],
    [railW * 0.55, railH],
    [0, railH],
  ];
  const cap = extrudeProfile(capProfile, { length: opts.length });
  cap.translate(0, h - railH, railW * 0.3);
  parts.push(cap);

  const balusterH = h - plinthH - railH;
  const balusterProfile: [number, number][] = [
    [0.055, 0],
    [0.075, 0.04],
    [0.052, 0.14],
    [0.048, 0.26],
    [0.088, 0.52],
    [0.082, 0.68],
    [0.046, 0.82],
    [0.072, 0.94],
    [0.062, 1],
  ];
  const scaled = balusterProfile.map(([r, y]) => [r * (h / 1.05), y * balusterH] as [number, number]);
  const unit = lathe(scaled, 8);
  const count = Math.max(1, Math.floor(opts.length / spacing));
  const step = opts.length / count;
  for (let i = 0; i < count; i++) {
    const b = unit.clone();
    b.translate(-opts.length / 2 + step * (i + 0.5), plinthH, 0);
    parts.push(b);
  }
  unit.dispose();

  return mergeAll(parts);
}
