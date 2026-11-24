import * as THREE from 'three';
import { boxGeo, quadGeo, mergeAll } from '../../core/geom';
import { MANSARD, Y } from './plan';

/**
 * Roofs.
 *
 * The Parisian mansard is the form the Louvre gave the type: a steep 70° lower slope carrying
 * dormers, then a 25° upper slope to the ridge at 28.7 m. On a range deeper than twice the slopes'
 * combined run the two sides never meet, so the roof closes on a flat plateau and that is where
 * the chimney stacks stand — exactly as on the real palace.
 *
 * Every roof surface is a quad mesh oriented by `orientUp`, so a winding mistake cannot produce a
 * hole the sky shows through.
 */

/** Flip any triangle whose normal points down; roof and ground surfaces must face up. */
export function orientUp(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const index = geo.getIndex();
  const pos = geo.attributes.position;
  if (!index || !pos) return geo;
  const idx = index.array as ArrayLike<number>;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const n = new THREE.Vector3();
  const out = geo.index ? new Uint32Array(idx) : new Uint32Array((pos.count));
  for (let i = 0; i < idx.length; i++) out[i] = idx[i] as number;
  for (let t = 0; t < idx.length; t += 3) {
    a.fromBufferAttribute(pos, out[t] as number);
    b.fromBufferAttribute(pos, out[t + 1] as number);
    c.fromBufferAttribute(pos, out[t + 2] as number);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    n.crossVectors(ab, ac);
    if (n.y < 0) {
      const tmp = out[t + 1] as number;
      out[t + 1] = out[t + 2] as number;
      out[t + 2] = tmp;
    }
  }
  geo.setIndex(new THREE.BufferAttribute(out, 1));
  geo.computeVertexNormals();
  return geo;
}

export interface RoofResult {
  geo: THREE.BufferGeometry;
  /** The flat top the roof closes on; chimneys stand here. */
  plateau: { x: [number, number]; z: [number, number]; y: number };
}

const R1 = MANSARD.lowerRun;
const R2 = MANSARD.upperRun;

/**
 * A mansard ring over one rectangular range: eaves at the cornice, a 70° lower slope, a 25° upper
 * slope, closing on a plateau (deep range) or a ridge (narrow range).
 */
export function mansard(x: [number, number], z: [number, number]): RoofResult {
  const e = MANSARD.eaves;
  const ax0 = x[0] + e;
  const ax1 = x[1] - e;
  const az0 = z[0] + e;
  const az1 = z[1] - e;
  const hx = (ax1 - ax0) / 2;
  const hz = (az1 - az0) / 2;

  const i1x = Math.min(R1, hx);
  const i1z = Math.min(R1, hz);
  const lowerY = Y.mansardLower * (Math.min(i1x, i1z) / R1);
  const hx2 = hx - i1x;
  const hz2 = hz - i1z;
  const i2x = Math.min(R2, hx2);
  const i2z = Math.min(R2, hz2);
  const upperY = Y.mansardUpper * (Math.min(i2x, i2z) / R2);
  const topY = Y.cornice + lowerY + upperY;

  const tx0 = ax0 + i1x + i2x;
  const tx1 = ax1 - i1x - i2x;
  const tz0 = az0 + i1z + i2z;
  const tz1 = az1 - i1z - i2z;

  const parts: THREE.BufferGeometry[] = [];
  const y0 = Y.cornice;
  const y1 = Y.cornice + lowerY;
  const y2 = topY;

  // Lower slopes, one per side, mitred at the corners by the lower run in both directions.
  parts.push(quadGeo([ax0, y0, az1], [ax1, y0, az1], [ax1 - i1x, y1, az1 - i1z], [ax0 + i1x, y1, az1 - i1z], [[0, 0], [1, 0], [1, 1], [0, 1]]));
  parts.push(quadGeo([ax1, y0, az0], [ax0, y0, az0], [ax0 + i1x, y1, az0 + i1z], [ax1 - i1x, y1, az0 + i1z], [[0, 0], [1, 0], [1, 1], [0, 1]]));
  parts.push(quadGeo([ax1, y0, az1], [ax1, y0, az0], [ax1 - i1x, y1, az0 + i1z], [ax1 - i1x, y1, az1 - i1z], [[0, 0], [1, 0], [1, 1], [0, 1]]));
  parts.push(quadGeo([ax0, y0, az0], [ax0, y0, az1], [ax0 + i1x, y1, az1 - i1z], [ax0 + i1x, y1, az0 + i1z], [[0, 0], [1, 0], [1, 1], [0, 1]]));

  // Upper slopes from the top of the lower slope to the plateau / ridge.
  parts.push(quadGeo([ax0 + i1x, y1, az1 - i1z], [ax1 - i1x, y1, az1 - i1z], [tx1, y2, tz1], [tx0, y2, tz1], [[0, 0], [1, 0], [1, 1], [0, 1]]));
  parts.push(quadGeo([ax1 - i1x, y1, az0 + i1z], [ax0 + i1x, y1, az0 + i1z], [tx0, y2, tz0], [tx1, y2, tz0], [[0, 0], [1, 0], [1, 1], [0, 1]]));
  parts.push(quadGeo([ax1 - i1x, y1, az1 - i1z], [ax1 - i1x, y1, az0 + i1z], [tx1, y2, tz0], [tx1, y2, tz1], [[0, 0], [1, 0], [1, 1], [0, 1]]));
  parts.push(quadGeo([ax0 + i1x, y1, az0 + i1z], [ax0 + i1x, y1, az1 - i1z], [tx0, y2, tz1], [tx0, y2, tz0], [[0, 0], [1, 0], [1, 1], [0, 1]]));

  // The plateau, when the range is deep enough for the slopes not to meet.
  const w = tx1 - tx0;
  const d = tz1 - tz0;
  if (w > 0.05 && d > 0.05) {
    parts.push(quadGeo([tx0, y2, tz1], [tx1, y2, tz1], [tx1, y2, tz0], [tx0, y2, tz0], [[0, 0], [w, 0], [w, d], [0, d]]));
  }

  const geo = orientUp(mergeAll(parts));
  return { geo, plateau: { x: [tx0, tx1], z: [tz0, tz1], y: y2 } };
}

/**
 * The crown of a pavilion: an attic drum over the cornice, a steep pavilion roof and a lantern.
 * The Pavillon de l'Horloge is the one that reaches the measured 40 m; the court pavilions stop a
 * little lower so the axis stays dominant.
 */
export function pavilionCrown(opts: {
  x: number;
  z: number;
  /** Top of the crown, measured to the finial. */
  top: number;
  /** Height of the cornice it stands on. */
  base?: number;
}): { geo: THREE.BufferGeometry; attic: THREE.BufferGeometry } {
  const base = opts.base ?? Y.cornice;
  const parts: THREE.BufferGeometry[] = [];
  const atticH = 5.2;
  const atticW = opts.x - 1.0;
  const atticD = opts.z - 1.0;
  const attic = boxGeo(atticW, atticH, atticD);
  attic.translate(0, base + atticH / 2, 0);
  // Cornice and string course of the attic.
  const bandTop = boxGeo(atticW + 0.5, 0.34, atticD + 0.5, { skip: ['bottom'] });
  bandTop.translate(0, base + atticH - 0.17, 0);
  parts.push(bandTop);

  // Pavilion roof: a steep hipped cap on a plate 21.5 x 16.5 (Horloge roof frame, spec).
  const plateW = Math.min(atticW - 0.6, 21.5);
  const plateD = Math.min(atticD - 0.6, 16.5);
  const roofBase = base + atticH;
  const lanternH = 3.6;
  const roofTop = opts.top - lanternH - 1.4;
  const hx = plateW / 2;
  const hd = plateD / 2;
  const apex = Math.min(hx, hd) * 0.42;
  const px = Math.max(1.4, hx - apex);
  const pd = Math.max(1.2, hd - apex);
  parts.push(quadGeo([-hx, roofBase, hd], [hx, roofBase, hd], [px, roofTop, pd], [-px, roofTop, pd]));
  parts.push(quadGeo([hx, roofBase, -hd], [-hx, roofBase, -hd], [-px, roofTop, -pd], [px, roofTop, -pd]));
  parts.push(quadGeo([hx, roofBase, hd], [hx, roofBase, -hd], [px, roofTop, -pd], [px, roofTop, pd]));
  parts.push(quadGeo([-hx, roofBase, -hd], [-hx, roofBase, hd], [-px, roofTop, pd], [-px, roofTop, -pd]));
  parts.push(quadGeo([-px, roofTop, pd], [px, roofTop, pd], [px, roofTop, -pd], [-px, roofTop, -pd]));

  // Lantern: a small glazed drum with a domed cap, the pavilion's skylight.
  const lantern = boxGeo(px * 2 - 0.4, lanternH, pd * 2 - 0.4);
  lantern.translate(0, roofTop + lanternH / 2, 0);
  parts.push(lantern);
  const capPts: Array<[number, number]> = [
    [Math.max(0.1, px - 0.2), 0],
    [Math.max(0.1, px - 0.7), 0.7],
    [Math.max(0.1, px - 1.4), 1.3],
    [0.12, 1.4],
  ];
  const dome = new THREE.LatheGeometry(capPts.map(([r, y]) => new THREE.Vector2(r, y)), 10);
  dome.translate(0, roofTop + lanternH, 0);
  parts.push(dome);
  const finial = new THREE.CylinderGeometry(0.06, 0.14, 0.9, 6);
  finial.translate(0, opts.top - 0.45, 0);
  parts.push(finial);

  const geo = orientUp(mergeAll(parts));
  const atticGeo = mergeAll([attic, bandTop]);
  return { geo, attic: atticGeo };
}

/** The Rotonde d'Apollon: a stone drum on the corner where the Petite Galerie meets the Seine wing. */
export function rotunda(radius: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const drumH = Y.cornice;
  const drum = new THREE.CylinderGeometry(radius, radius, drumH, 16, 1, true);
  drum.translate(0, drumH / 2, 0);
  parts.push(drum);
  const cornice = new THREE.CylinderGeometry(radius + 0.45, radius + 0.3, 0.8, 16, 1, true);
  cornice.translate(0, drumH - 0.4, 0);
  parts.push(cornice);
  const attic = new THREE.CylinderGeometry(radius - 0.6, radius - 0.4, 3.0, 16, 1, true);
  attic.translate(0, drumH + 1.5, 0);
  parts.push(attic);
  const domePts: Array<[number, number]> = [
    [radius - 0.6, 0],
    [radius - 0.9, 1.6],
    [radius - 1.8, 3.0],
    [radius - 3.0, 3.9],
    [0.2, 4.4],
  ];
  const dome = new THREE.LatheGeometry(domePts.map(([r, y]) => new THREE.Vector2(Math.max(0.05, r), y)), 16);
  dome.translate(0, drumH + 3.0, 0);
  parts.push(dome);
  return orientUp(mergeAll(parts));
}

/** Chimney stacks along a roof's plateau, drawn from the zone's seeded stream. */
export function chimneyTransforms(
  plateau: { x: [number, number]; z: [number, number]; y: number },
  spacing: number,
  alongX: boolean,
  rng: () => number,
): THREE.Matrix4[] {
  const out: THREE.Matrix4[] = [];
  const end = alongX ? plateau.x : plateau.z;
  const cross = alongX ? plateau.z : plateau.x;
  const span = end[1] - end[0];
  if (span < spacing) return out;
  const count = Math.max(1, Math.floor(span / spacing));
  for (let i = 0; i < count; i++) {
    const a = end[0] + (span / count) * (i + 0.5) + (rng() - 0.5) * 1.2;
    const b = (cross[0] + cross[1]) / 2 + (rng() - 0.5) * Math.min(2.2, (cross[1] - cross[0]) * 0.35);
    const m = new THREE.Matrix4().makeTranslation(alongX ? a : b, plateau.y - 0.1, alongX ? b : a);
    out.push(m);
  }
  return out;
}
