import * as THREE from 'three';
import { wall } from '../../core/builders';
import { boxGeo, quadGeo, mergeAll } from '../../core/geom';
import { mat } from '../../core/materials';
import { COLONNADE, Y } from './plan';
import { balustradeRun, corniceRun, giantColumn, pedestalRun, type InstanceSink } from './parts';

/**
 * Perrault's Colonnade: 183 m of coupled Corinthian columns two storeys high over a plain
 * rusticated ground floor, closed by a balustrade, with the central bays carrying a pediment.
 *
 * It is the one elevation in the composition that is all one order, so it gets the triangles the
 * wings spend on pilasters and dormers: 54 giant columns, and the pediment over the middle.
 */

const T = {
  stylobate: 1.15,
  orderBase: Y.storey2 + 1.2,
  orderTop: 19.0,
  entablature: Y.cornice,
  baseHead: 5.4,
  winSill: 9.9,
  winHead: 14.4,
} as const;

export function buildColonnade(sink: InstanceSink): THREE.Group {
  const L = COLONNADE.length;
  const bay = COLONNADE.bay;
  const group = new THREE.Group();
  group.name = 'colonnade';
  group.matrixAutoUpdate = false;
  // Faces +X (east, toward the street), so local +Z is world +X.
  group.matrix.copy(new THREE.Matrix4().makeRotationY(Math.PI / 2));
  group.matrix.setPosition(COLONNADE.x, 0, (COLONNADE.z0 + COLONNADE.z1) / 2);

  const add = (geo: THREE.BufferGeometry, material: string): void => {
    group.add(new THREE.Mesh(geo, mat(material)));
  };

  const u = (i: number): number => (i - (COLONNADE.bays - 1) / 2) * bay;
  const inst = (key: string, unit: THREE.BufferGeometry, material: string, local: THREE.Matrix4): void => {
    sink.add(key, unit, material, local.premultiply(group.matrix));
  };

  // --- rusticated ground floor ----------------------------------------------
  const baseOpenings = [];
  for (let i = 0; i < COLONNADE.bays; i++) {
    baseOpenings.push({ x: u(i), width: 2.2, sill: 0.6, head: T.baseHead, arched: true });
  }
  const baseWall = wall({ length: L, height: Y.storey2 + 1.2, thickness: 0.7, openings: baseOpenings, cornerAo: 0.08 });
  baseWall.translate(0, 0, 0.35);
  add(baseWall, 'stone.limestone-pale');
  // Rustication joints every 1.2 m.
  for (let j = 1; j <= 4; j++) {
    const joint = boxGeo(L, 0.06, 0.1, { skip: ['back', 'bottom'] });
    joint.translate(0, 1.2 * j, 0.75);
    add(joint, 'stone.limestone-pale');
  }

  // --- upper wall with its tall windows -------------------------------------
  const winOpenings = [];
  for (let i = 0; i < COLONNADE.bays; i++) {
    winOpenings.push({ x: u(i), width: 1.5, sill: T.winSill, head: T.winHead });
  }
  const upperWall = wall({
    length: L,
    height: T.orderTop - Y.storey2 - 1.2,
    thickness: 0.7,
    openings: winOpenings.map((o) => ({ ...o, sill: o.sill - (Y.storey2 + 1.2), head: o.head - (Y.storey2 + 1.2) })),
    cornerAo: 0.08,
  });
  upperWall.translate(0, Y.storey2 + 1.2, 0.35);
  add(upperWall, 'stone.limestone-warm');

  // --- stylobate and the coupled giant order --------------------------------
  const stylobate = boxGeo(L + 1.0, T.stylobate, 1.9, { skip: ['back'] });
  stylobate.translate(0, T.stylobate / 2, 0.95);
  add(stylobate, 'stone.limestone-pale');

  const colH = T.orderTop - T.orderBase;
  const column = giantColumn(colH, 0.62);
  for (let i = 0; i <= COLONNADE.bays; i++) {
    const centre = i <= 0 ? u(0) - bay / 2 + 0.9 : i >= COLONNADE.bays ? u(COLONNADE.bays - 1) + bay / 2 - 0.9 : (u(i - 1) + u(i)) / 2;
    for (const side of [-1, 1]) {
      const offset = side * 0.86;
      const x = centre + offset;
      if (Math.abs(x) > L / 2 - 0.9) continue;
      inst('colonnade-column', column, 'stone.limestone-warm', new THREE.Matrix4().makeTranslation(x, T.orderBase, 1.55));
    }
  }

  // --- entablature: architrave, frieze, heavy cornice with dentils -----------
  add(pedestalRun(L, 0.55, 1.0).translate(0, T.orderTop, 0.6), 'trim.stone-limestone-warm');
  add(corniceRun(L, { dentils: true, scale: 1.35 }).translate(0, T.entablature - 0.8 * 1.35, 0.9), 'trim.stone-limestone-warm');
  add(balustradeRun(L, { height: 1.15, spacing: 0.7 }).translate(0, Y.cornice, 0.85), 'trim.stone-limestone-warm');

  // --- the central pediment -------------------------------------------------
  const pedW = COLONNADE.pedimentLength;
  const pedRise = 3.4;
  const pedParts: THREE.BufferGeometry[] = [];
  const slab = boxGeo(pedW, 0.9, 1.2, { skip: ['back', 'bottom'] });
  slab.translate(0, Y.cornice + 0.45, 0.6);
  pedParts.push(slab);
  // Two raking edges and the tympanum they frame.
  for (const side of [-1, 1]) {
    const rakeLen = Math.hypot(pedW / 2, pedRise);
    const rake = boxGeo(rakeLen, 0.55, 1.1, { skip: ['back', 'bottom'] });
    rake.rotateZ(-side * Math.atan2(pedRise, pedW / 2));
    rake.translate((side * pedW) / 4, Y.cornice + 0.9 + pedRise / 2, 0.6);
    pedParts.push(rake);
  }
  const tympanum = new THREE.BufferGeometry();
  tympanum.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([-pedW / 2, Y.cornice + 0.9, 1.05, pedW / 2, Y.cornice + 0.9, 1.05, 0, Y.cornice + 0.9 + pedRise, 1.05], 3),
  );
  tympanum.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, pedW, 0, pedW / 2, pedRise], 2));
  tympanum.setIndex([0, 1, 2]);
  tympanum.computeVertexNormals();
  pedParts.push(tympanum);
  add(mergeAll(pedParts), 'trim.stone-limestone-warm');

  // --- the two end pavilions, standing proud of the order -------------------
  for (const side of [-1, 1]) {
    const x = side * (L / 2 - 1.4);
    const block = boxGeo(2.8, Y.cornice + 1.15, 1.4);
    block.translate(x, (Y.cornice + 1.15) / 2, 1.0);
    add(block, 'stone.limestone-warm');
    const cap = quadGeo(
      [x - 1.5, Y.cornice + 1.15, 1.8],
      [x + 1.5, Y.cornice + 1.15, 1.8],
      [x + 1.5, Y.cornice + 1.15, 0.2],
      [x - 1.5, Y.cornice + 1.15, 0.2],
    );
    add(cap, 'stone.limestone-pale');
  }

  return group;
}
