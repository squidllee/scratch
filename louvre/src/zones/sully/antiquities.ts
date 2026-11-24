import * as THREE from 'three';
import { column, skylight } from '../../core/builders';
import { bakeAo, boxGeo, mergeAll } from '../../core/geom';
import { addPart } from '../../core/merge';
import { bx, corniceOn, doorOn, lightPool, plinthAt, q, skirtOn, vaultRibs, vaultZ, wallOn } from './geo';
import { ROOMS, holesFor } from './layout';

/**
 * The south range: room 346, the Venus de Milo's room and the crypt of the Great Sphinx of Tanis.
 *
 * All three look north into the Cour Carrée, whose south façade this zone builds — including the
 * clerestory row at 4.4-6.2 m that is the only daylight these 6.4 m rooms can actually receive.
 */

/** A ceiling slab with a rectangular well in it, and the glazing to sit in the well. */
function ceilingWithWell(
  g: THREE.Group,
  b: { x: readonly [number, number]; z: readonly [number, number]; y1: number },
  well: { x0: number; x1: number; z0: number; z1: number },
  mat: string,
): void {
  const parts: THREE.BufferGeometry[] = [];
  const t = 0.4;
  const cx = (b.x[0] + b.x[1]) / 2;
  const cz = (b.z[0] + b.z[1]) / 2;
  const y = b.y1 + t / 2;
  // North and south strips run the full width; east and west strips fill between them.
  parts.push(boxGeo(b.x[1] - b.x[0], t, well.z0 - b.z[0]).translate(cx, y, (b.z[0] + well.z0) / 2));
  parts.push(boxGeo(b.x[1] - b.x[0], t, b.z[1] - well.z1).translate(cx, y, (well.z1 + b.z[1]) / 2));
  parts.push(boxGeo(well.x0 - b.x[0], t, well.z1 - well.z0).translate((b.x[0] + well.x0) / 2, y, cz));
  parts.push(boxGeo(b.x[1] - well.x1, t, well.z1 - well.z0).translate((well.x1 + b.x[1]) / 2, y, cz));
  addPart(g, mergeAll(parts), mat);
}

export function buildSalleGrec(g: THREE.Group): void {
  const b = ROOMS['salle-grec-346'];
  const w = b.x[1] - b.x[0];
  const d = b.z[1] - b.z[0];
  const cx = (b.x[0] + b.x[1]) / 2;
  const cz = (b.z[0] + b.z[1]) / 2;
  const H = b.y1;

  addPart(g, boxGeo(w, 0.3, d).translate(cx, -0.15, cz), 'floor.stone-flag');
  // North wall is the court façade (built once, with this room's high windows).
  wallOn(g, { face: 's', at: b.z[1], from: b.x[0], to: b.x[1], floorY: 0, height: H, mat: 'wall.stone-grey' });
  wallOn(g, { face: 'e', at: b.x[1], from: b.z[0], to: b.z[1], floorY: 0, height: H, mat: 'wall.stone-grey', holes: holesFor('salle-grec-346', 'e') });
  doorOn(g, { face: 'e', plane: b.x[1], along: 68, floorY: 0, width: 2.6, height: 4.4, arched: true, mat: 'trim.stone-limestone-warm' });

  // Flat plaster ceiling in a deep cove.
  addPart(g, boxGeo(w, 0.4, d).translate(cx, H + 0.2, cz), 'ceiling.plaster-white');
  corniceOn(g, { face: 's', at: b.z[1], from: b.x[0], to: b.x[1], y: H - 0.85, height: 0.85, projection: 0.5, dentils: false, mat: 'ceiling.plaster-white' });
  corniceOn(g, { face: 'e', at: b.x[1], from: b.z[0], to: b.z[1], y: H - 0.85, height: 0.85, projection: 0.5, dentils: false, mat: 'ceiling.plaster-white' });

  // The red marble order the room is trimmed with, and plinths for Roman marbles.
  const order: THREE.BufferGeometry[] = [];
  const plinths: THREE.BufferGeometry[] = [];
  for (const x of [143, 148, 153, 158, 163, 168]) {
    order.push(bx(0.8, H - 1.5, 0.26, x, (H - 1.5) / 2, b.z[1] - 0.13));
    plinths.push(bx(0.95, 0.85, 0.9, x + 2.4, 0.425, b.z[1] - 0.7));
  }
  for (const z of [61, 67, 73, 78]) order.push(bx(0.26, H - 1.5, 0.8, b.x[1] - 0.13, (H - 1.5) / 2, z));
  addPart(g, mergeAll(order), 'trim.marble-rouge');
  addPart(g, mergeAll(plinths), 'marble.blanc-carrare');
  skirtOn(g, { face: 's', at: b.z[1], from: b.x[0], to: b.x[1], y: 0, height: 0.7, thickness: 0.08, mat: 'stone.limestone-warm' });
  skirtOn(g, { face: 'e', at: b.x[1], from: b.z[0], to: b.z[1], y: 0, height: 0.7, thickness: 0.08, mat: 'stone.limestone-warm' });

  // The court-side face gets its own cornice, since that wall is built with the court.
  corniceOn(g, { face: 'n', at: b.z[0], from: b.x[0], to: b.x[1], y: H - 0.85, height: 0.85, projection: 0.5, dentils: false, mat: 'ceiling.plaster-white' });
  addPart(g, mergeAll([
    bx(2.4, 0.44, 0.7, 146, 0.22, b.z[0] + 1.2),
    bx(2.4, 0.44, 0.7, 160, 0.22, b.z[1] - 1.2),
  ]), 'stone.limestone-warm');

  const glow = q([b.x[0] + 2, H - 0.02, b.z[0] + 6], [b.x[1] - 2, H - 0.02, b.z[0] + 6], [b.x[1] - 2, H - 0.02, b.z[0] + 14], [b.x[0] + 2, H - 0.02, b.z[0] + 14]);
  glow.computeVertexNormals();
  addPart(g, glow, 'app.light-card');
}

export function buildVenusRoom(g: THREE.Group): void {
  const b = ROOMS['salle-venus-milo'];
  const w = b.x[1] - b.x[0];
  const d = b.z[1] - b.z[0];
  const cx = (b.x[0] + b.x[1]) / 2;
  const cz = (b.z[0] + b.z[1]) / 2;
  const H = b.y1;
  const well = { x0: 184.5, x1: 191.5, z0: 63.6, z1: 72.6 };

  addPart(g, boxGeo(w, 0.3, d).translate(cx, -0.15, cz), 'floor.stone-flag');
  // West wall is room 346's east wall; north is the court façade.
  wallOn(g, { face: 's', at: b.z[1], from: b.x[0], to: b.x[1], floorY: 0, height: H, mat: 'wall.stone-grey' });
  wallOn(g, { face: 'e', at: b.x[1], from: b.z[0], to: b.z[1], floorY: 0, height: H, mat: 'wall.stone-grey', holes: holesFor('salle-venus-milo', 'e') });
  doorOn(g, { face: 'e', plane: b.x[1], along: 68, floorY: 0, width: 2.6, height: 4.2, arched: true, mat: 'trim.stone-limestone-warm' });

  ceilingWithWell(g, b, well, 'ceiling.plaster-white');
  const sky = skylight({ width: well.x1 - well.x0, depth: well.z1 - well.z0, bars: 6, frameWidth: 0.22 });
  const skyGroup = new THREE.Group();
  for (const [mat_, part] of Object.entries(sky)) {
    addPart(skyGroup, part, mat_);
  }
  skyGroup.position.set((well.x0 + well.x1) / 2, H, (well.z0 + well.z1) / 2);
  g.add(skyGroup);
  const glow = q([well.x0, H + 1.4, well.z0], [well.x1, H + 1.4, well.z0], [well.x1, H + 1.4, well.z1], [well.x0, H + 1.4, well.z1]);
  glow.computeVertexNormals();
  addPart(g, glow, 'app.light-card');

  // "Between the red marble pillars": the room's order is rouge royal.
  const pillars: THREE.BufferGeometry[] = [];
  for (const [x, z] of [
    [178, 61],
    [178, 75],
    [198, 61],
    [198, 75],
  ] as Array<[number, number]>) {
    const c = column({ height: H - 0.5, radius: 0.42, order: 'corinthian', segments: 14 });
    c.translate(x, 0, z);
    pillars.push(c);
  }
  addPart(g, mergeAll(pillars), 'marble.rouge-royal');
  corniceOn(g, { face: 's', at: b.z[1], from: b.x[0], to: b.x[1], y: H - 0.7, height: 0.7, projection: 0.42, dentils: false, mat: 'trim.marble-rouge' });
  skirtOn(g, { face: 's', at: b.z[1], from: b.x[0], to: b.x[1], y: 0, height: 0.7, thickness: 0.08, mat: 'trim.marble-rouge' });

  // The plinth the Venus stands on, and the pool of top light over it.
  addPart(g, plinthAt(188, 68.125, 1.3, 1.3, 0.55), 'marble.blanc-carrare');
  addPart(g, lightPool(188, 0.012, 68.125, 2.9), 'app.light-card');
  addPart(g, plinthAt(196, 62.5, 0.95, 0.95, 0.8), 'marble.blanc-carrare');
  addPart(g, plinthAt(180, 62.5, 0.95, 0.95, 0.8), 'marble.blanc-carrare');
  addPart(g, mergeAll([
    bx(3.2, 0.46, 0.62, 188, 0.23, b.z[1] - 1.3),
    bx(0.62, 0.46, 2.4, b.x[1] - 1.3, 0.23, cz),
  ]), 'stone.limestone-pale');
  corniceOn(g, { face: 'e', at: b.x[1], from: b.z[0], to: b.z[1], y: H - 0.7, height: 0.7, projection: 0.42, dentils: false, mat: 'trim.marble-rouge' });
}

export function buildSphinxCrypt(g: THREE.Group): void {
  const b = ROOMS['sphinx-crypt'];
  const w = b.x[1] - b.x[0];
  const d = b.z[1] - b.z[0];
  const cx = (b.x[0] + b.x[1]) / 2;
  const cz = (b.z[0] + b.z[1]) / 2;
  const H = b.y1;

  const floorGeo = boxGeo(w, 0.3, d).translate(cx, -0.15, cz);
  bakeAo(floorGeo, (x, y, z) => 0.42 + 0.26 * Math.min(1, Math.hypot(x - 222, z - 68.125) / 9));
  addPart(g, floorGeo, 'floor.stone-flag');

  // South and east walls; north is the court façade, west is the Venus room's east wall.
  wallOn(g, { face: 's', at: b.z[1], from: b.x[0], to: b.x[1], floorY: 0, height: H, mat: 'wall.egypt-dark' });
  wallOn(g, { face: 'e', at: b.x[1], from: b.z[0], to: b.z[1], floorY: 0, height: H, mat: 'wall.egypt-dark' });

  // Jointed granite: vertical grooves and a bronze frieze, so the dark walls still carry detail.
  const joints: THREE.BufferGeometry[] = [];
  for (let x = b.x[0] + 2; x < b.x[1]; x += 2.5) joints.push(bx(0.05, H - 0.6, 0.06, x, (H - 0.6) / 2, b.z[1] - 0.03));
  for (let z = b.z[0] + 2; z < b.z[1]; z += 2.5) joints.push(bx(0.06, H - 0.6, 0.05, b.x[1] - 0.03, (H - 0.6) / 2, z));
  joints.push(bx(w, 0.16, 0.1, cx, 3.05, b.z[1] - 0.05));
  joints.push(bx(0.1, 0.16, d, b.x[1] - 0.05, 3.05, cz));
  addPart(g, mergeAll(joints), 'gold.bronze-tarnished');

  // Low stone vault on square piers: 3.6 m to the springing, 5.5 at the crown.
  vaultZ({ x0: b.x[0], x1: b.x[1], z0: b.z[0], z1: b.z[1], spring: 3.6, crown: H, flatHalf: 2.4, segments: 6, mat: 'stone.granite-grey', parent: g, ao: 0.52 });
  vaultRibs({ x0: b.x[0], x1: b.x[1], spring: 3.6, crown: H, flatHalf: 2.4, at: [60.5, 67.1, 73.7, 79.4], band: 0.6, depth: 0.26, segments: 6, mat: 'stone.granite-grey', parent: g });

  const piers: THREE.BufferGeometry[] = [];
  for (const x of [210, 218, 226, 234]) {
    for (const z of [b.z[0] + 1.9, b.z[1] - 1.9]) {
      piers.push(bx(0.95, 3.6, 0.95, x, 1.8, z));
      piers.push(bx(1.2, 0.28, 1.2, x, 3.6, z));
      piers.push(bx(1.15, 0.3, 1.15, x, 0.15, z));
    }
  }
  // Two stelae against the south wall, standing in the dark.
  for (const x of [212.5, 231.5]) {
    piers.push(bx(0.9, 2.3, 0.42, x, 1.15, b.z[1] - 0.75));
    piers.push(bx(1.1, 0.22, 0.62, x, 0.11, b.z[1] - 0.75));
  }
  for (const p of piers) bakeAo(p, (_x, y) => 0.5 + 0.3 * Math.min(1, y / 4));
  addPart(g, mergeAll(piers), 'stone.granite-grey');

  // A warm limestone band where the vault meets the walls: the only warm surface in the room,
  // and the thing the light slot actually catches.
  const band: THREE.BufferGeometry[] = [];
  band.push(bx(w, 0.5, 0.3, cx, 3.45, b.z[1] - 0.15));
  band.push(bx(0.3, 0.5, d, b.x[1] - 0.15, 3.45, cz));
  band.push(bx(2.6, 0.5, 0.3, 209.8, 3.45, b.z[1] - 0.15));
  band.push(bx(2.6, 0.5, 0.3, 234.2, 3.45, b.z[1] - 0.15));
  addPart(g, mergeAll(band), 'stone.limestone-warm');
  addPart(g, mergeAll([
    bx(1.1, 0.5, 0.5, 208, 0.25, 62.5),
    bx(1.1, 0.5, 0.5, 236, 0.25, 62.5),
  ]), 'marble.gris-saint-beat');

  // Two steps up to the sphinx's platform.
  addPart(g, mergeAll([
    bx(7.6, 0.18, 4.2, 222, 0.09, 68.125),
    bx(6.4, 0.18, 3.2, 222, 0.27, 68.125),
  ]), 'stone.limestone-pale');

  // A jointed floor of lighter granite: the slabs pick up the slot's spill and give the dark
  // room a surface with some range in it.
  const slabs: THREE.BufferGeometry[] = [];
  for (let x = b.x[0] + 1.6; x < b.x[1] - 0.4; x += 1.6) slabs.push(bx(0.09, 0.05, d - 0.6, x, 0.025, cz));
  for (let z = b.z[0] + 1.6; z < b.z[1] - 0.4; z += 1.6) slabs.push(bx(w - 0.6, 0.05, 0.09, cx, 0.025, z));
  addPart(g, mergeAll(slabs), 'marble.gris-saint-beat');

  // A painted ochre band on the vault, so the ceiling is not one black curve.
  const paint: THREE.BufferGeometry[] = [];
  for (let z = b.z[0] + 2.6; z < b.z[1] - 1; z += 4.2) paint.push(bx(5.0, 0.05, 2.4, cx, H - 0.06, z));
  addPart(g, mergeAll(paint), 'wall.ochre-earth');

  // The only light: a narrow slot over the sphinx, and the pool it throws.
  const slit = q([216.8, H - 0.06, 64.0], [227.2, H - 0.06, 64.0], [227.2, H - 0.06, 72.2], [216.8, H - 0.06, 72.2]);
  slit.computeVertexNormals();
  addPart(g, slit, 'app.light-card');
  addPart(g, lightPool(222, 0.44, 68.1, 3.9), 'app.light-card');

  // The sphinx's long axis runs east-west here, facing the west door, so the plinth does too.
  addPart(g, plinthAt(222, 68.125, 5.4, 2.3, 0.35, 0.36), 'marble.noir-marquina');
  const rails: THREE.BufferGeometry[] = [];
  for (const x of [211.6, 232.4]) rails.push(bx(0.12, 0.9, 3.2, x, 0.75, 68.1));
  addPart(g, mergeAll(rails), 'gold.bronze-tarnished');
}
