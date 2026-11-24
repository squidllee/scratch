import * as THREE from 'three';
import { cofferCeiling, pictureFrame, skylight } from '../../core/builders';
import { boxGeo, mergeAll } from '../../core/geom';
import { addPart } from '../../core/merge';
import { bx, corniceOn, doorOn, lightPool, q, skirtOn, vitrineAt, wallOn } from './geo';
import { ROOMS, holesFor } from './layout';

/**
 * Level 2: the invented corridor that reaches the Dutch rooms, and the two small rooms where the
 * Vermeers hang. Deliberately plain — route.json marks the corridor `invented` — with the effort
 * spent on the Lacemaker's wall case and the lantern over the smaller room.
 */

const F = 13.6;

export function buildLevel2Corridor(g: THREE.Group): void {
  const b = ROOMS['sully-l2-corridor'];
  const w = b.x[1] - b.x[0];
  const d = b.z[1] - b.z[0];
  const cx = (b.x[0] + b.x[1]) / 2;
  const cz = (b.z[0] + b.z[1]) / 2;

  addPart(g, boxGeo(w, 0.3, d).translate(cx, F - 0.15, cz), 'floor.parquet-poitiers');
  addPart(g, cofferCeiling({ width: w, depth: d, baysX: 2, baysZ: 10, beamWidth: 0.3, beamDepth: 0.26, rosettes: true }).translate(cx, b.y1 + 0.26, cz), 'ceiling.plaster-white');

  // West and north walls are its own; south carries the stair door from the pavilion. Its east
  // side is the court's west façade above z = -56.25 and the Dutch rooms behind z = -56.25, so
  // only that northern stretch of east wall is built here.
  wallOn(g, { face: 'w', at: b.x[0], from: b.z[0], to: b.z[1], floorY: F, height: b.y1 - F, mat: 'wall.ochre-light' });
  wallOn(g, { face: 'n', at: b.z[0], from: b.x[0], to: b.x[1], floorY: F, height: b.y1 - F, mat: 'wall.ochre-light' });
  // No south wall here: the pavilion's end wall rises the full 20 m on the same plane and carries
  // this corridor's door, so the two would otherwise be coplanar duplicates.
  wallOn(g, {
    face: 'e',
    at: b.x[1],
    from: b.z[0],
    to: ROOMS['dutch-rooms'].z[0],
    floorY: F,
    height: b.y1 - F,
    mat: 'wall.ochre-light',
    holes: holesFor('sully-l2-corridor', 'e'),
  });
  doorOn(g, { face: 's', plane: b.z[1], along: 127.875, floorY: F, width: 3, height: 3.4, mat: 'trim.gilt' });
  doorOn(g, { face: 'e', plane: b.x[1], along: -68, floorY: F, width: 2.6, height: 3.4, mat: 'trim.gilt' });

  // A painted door case at each end and gilt trim, so the corridor does not read as a tube.
  const trim: THREE.BufferGeometry[] = [];
  for (const x of [120, 124, 128, 132, 136]) {
    trim.push(bx(0.5, b.y1 - F - 0.5, 0.12, x, F + (b.y1 - F) / 2, b.z[0] + 0.12));
    trim.push(bx(0.5, b.y1 - F - 0.5, 0.12, x, F + (b.y1 - F) / 2, b.z[1] - 0.12));
  }
  addPart(g, mergeAll(trim), 'trim.gilt');
  corniceOn(g, { face: 'w', at: b.x[0], from: b.z[0], to: b.z[1], y: b.y1 - 0.34, height: 0.34, projection: 0.24, dentils: false, mat: 'trim.gilt' });
  corniceOn(g, { face: 'n', at: b.z[0], from: b.x[0], to: b.x[1], y: b.y1 - 0.34, height: 0.34, projection: 0.24, dentils: false, mat: 'trim.gilt' });
  skirtOn(g, { face: 'w', at: b.x[0], from: b.z[0], to: b.z[1], y: F, height: 0.26, thickness: 0.06, mat: 'trim.wood-oak' });
  skirtOn(g, { face: 'n', at: b.z[0], from: b.x[0], to: b.x[1], y: F, height: 0.26, thickness: 0.06, mat: 'trim.wood-oak' });

  addPart(g, mergeAll([
    bx(0.55, 0.44, 3.4, b.x[0] + 1.2, F + 0.22, -30),
    bx(0.55, 0.44, 3.4, b.x[0] + 1.2, F + 0.22, -46),
  ]), 'trim.wood-oak');

  // Empty frames along the long wall, hung like a print room.
  for (const z of [-22, -33, -44]) {
    const holder = new THREE.Group();
    for (const [mat_, part] of Object.entries(pictureFrame({ width: 1.3, height: 1.7 }))) addPart(holder, part, mat_);
    holder.position.set(b.x[0] + 0.07, F + 1.85, z);
    holder.rotation.y = Math.PI / 2;
    g.add(holder);
  }
}

export function buildDutchRooms(g: THREE.Group): void {
  const b = ROOMS['dutch-rooms'];
  const w = b.x[1] - b.x[0];
  const d = b.z[1] - b.z[0];
  const cx = (b.x[0] + b.x[1]) / 2;
  const cz = (b.z[0] + b.z[1]) / 2;
  const well = { x0: 154, x1: 166, z0: -71, z1: -63 };

  addPart(g, boxGeo(w, 0.3, d).translate(cx, F - 0.15, cz), 'floor.parquet-poitiers');

  // Only north and east are its own: the south wall is the court façade, the west the corridor's.
  wallOn(g, { face: 'n', at: b.z[0], from: b.x[0], to: b.x[1], floorY: F, height: b.y1 - F, mat: 'wall.slate-green' });
  wallOn(g, { face: 'e', at: b.x[1], from: b.z[0], to: b.z[1], floorY: F, height: b.y1 - F, mat: 'wall.slate-green' });

  // Ceiling with a small lantern.
  const t = 0.35;
  const y = b.y1 + t / 2;
  addPart(g, mergeAll([
    boxGeo(w, t, well.z0 - b.z[0]).translate(cx, y, (b.z[0] + well.z0) / 2),
    boxGeo(w, t, b.z[1] - well.z1).translate(cx, y, (well.z1 + b.z[1]) / 2),
    boxGeo(well.x0 - b.x[0], t, well.z1 - well.z0).translate((b.x[0] + well.x0) / 2, y, cz),
    boxGeo(b.x[1] - well.x1, t, well.z1 - well.z0).translate((well.x1 + b.x[1]) / 2, y, cz),
  ]), 'ceiling.plaster-white');
  const sky = skylight({ width: well.x1 - well.x0, depth: well.z1 - well.z0, bars: 4, frameWidth: 0.2 });
  const skyGroup = new THREE.Group();
  for (const [mat_, part] of Object.entries(sky)) addPart(skyGroup, part, mat_);
  skyGroup.position.set((well.x0 + well.x1) / 2, b.y1, (well.z0 + well.z1) / 2);
  g.add(skyGroup);

  corniceOn(g, { face: 'n', at: b.z[0], from: b.x[0], to: b.x[1], y: b.y1 - 0.3, height: 0.3, projection: 0.2, dentils: false, mat: 'trim.wood-oak' });
  corniceOn(g, { face: 'e', at: b.x[1], from: b.z[0], to: b.z[1], y: b.y1 - 0.3, height: 0.3, projection: 0.2, dentils: false, mat: 'trim.wood-oak' });
  skirtOn(g, { face: 'n', at: b.z[0], from: b.x[0], to: b.x[1], y: F, height: 0.24, thickness: 0.06, mat: 'trim.wood-oak' });
  skirtOn(g, { face: 'e', at: b.x[1], from: b.z[0], to: b.z[1], y: F, height: 0.24, thickness: 0.06, mat: 'trim.wood-oak' });
  skirtOn(g, { face: 's', at: b.z[1], from: b.x[0], to: b.x[1], y: F, height: 0.24, thickness: 0.06, mat: 'trim.wood-oak' });

  // The Lacemaker's lit wall case, on a slate-green ground so the picture floats in a dark room.
  const v = vitrineAt(166, F + 1.14, b.z[0] + 0.33, 0.64, 0.64, 0.34);
  addPart(g, v.frame, 'trim.wood-oak');
  addPart(g, v.glass, 'glass.vitrine');
  addPart(g, v.deck, 'wall.slate-green');
  addPart(g, bx(0.74, 0.06, 0.06, 166, F + 1.78, b.z[0] + 0.3), 'trim.wood-oak');
  addPart(g, lightPool(166, F + 0.008, b.z[0] + 1.6, 1.5), 'app.light-card');

  // Two high windows on the back wall: the facade beyond is not modelled, so each is glazed and
  // backed by a light card rather than opening onto a void.
  const windows: THREE.BufferGeometry[] = [];
  const cards: THREE.BufferGeometry[] = [];
  for (const x of [148, 156, 172]) {
    windows.push(bx(1.3, 2.0, 0.12, x, F + 2.5, b.z[0] + 0.1));
    cards.push(bx(1.36, 2.1, 0.06, x, F + 2.5, b.z[0] + 0.02));
  }
  addPart(g, mergeAll(cards), 'app.light-card');
  addPart(g, mergeAll(windows), 'glass.skylight-clear');

  // Oak wainscot to shoulder height, the way these small rooms are actually hung.
  const panels: THREE.BufferGeometry[] = [];
  for (let x = b.x[0] + 1.1; x < b.x[1]; x += 1.9) {
    panels.push(bx(1.72, 0.95, 0.07, x, F + 0.48, b.z[0] + 0.06));
    panels.push(bx(1.72, 0.06, 0.1, x, F + 0.97, b.z[0] + 0.07));
  }
  for (let z = b.z[0] + 1.1; z < b.z[1]; z += 1.9) panels.push(bx(0.07, 0.95, 1.72, b.x[1] - 0.06, F + 0.48, z));
  addPart(g, mergeAll(panels), 'trim.wood-oak');
  addPart(g, bx(2.2, 0.44, 0.6, 158, F + 0.22, b.z[0] + 2.2), 'wall.slate-green');

  // The Astronomer's wall gets a hanging rail; the frame comes with the artwork.
  addPart(g, bx(0.07, 0.07, 3.2, b.x[1] - 0.1, F + 2.15, -68), 'trim.wood-oak');
  const glow = q([well.x0, b.y1 + 0.9, well.z0], [well.x1, b.y1 + 0.9, well.z0], [well.x1, b.y1 + 0.9, well.z1], [well.x0, b.y1 + 0.9, well.z1]);
  glow.computeVertexNormals();
  addPart(g, glow, 'app.light-card');
}
