import * as THREE from 'three';
import { boxGeo } from '../../core/geom';
import { addPart } from '../../core/merge';
import { mat } from '../../core/materials';
import type { Rng } from '../../core/rng';
import { buildGlassPyramid, PYRAMID } from './pyramid';

/**
 * The inverted pyramid, in the Carrousel du Louvre below the Place du Carrousel: 16 m base,
 * 7 m deep, tip 1.4 m above the concourse floor, hanging from the glass deck the hedges screen.
 *
 * It has no walkable room of its own in route.json — the concourse is a viewing volume reached by
 * the fly camera, and the geometry hangs off the Place du Carrousel cell.
 */

export const INVERTED = {
  x: PYRAMID.inverted.x,
  tipY: PYRAMID.inverted.floorY + PYRAMID.inverted.tipAboveFloor,
  baseY: PYRAMID.inverted.floorY + PYRAMID.inverted.tipAboveFloor + PYRAMID.inverted.height,
  half: PYRAMID.inverted.base / 2,
  concourse: { x0: -147, x1: -113, z0: -15, z1: 15, floorY: -9, ceilY: -4.5 },
} as const;

export function buildInverted(rng: Rng): THREE.Group {
  const group = new THREE.Group();
  group.name = 'pyramid/inverted';

  // --- the concourse -----------------------------------------------------
  const { x0, x1, z0, z1, floorY, ceilY } = INVERTED.concourse;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;

  const floorGeo = boxGeo(x1 - x0, 0.4, z1 - z0);
  floorGeo.translate(cx, floorY - 0.2, cz);
  group.add(new THREE.Mesh(floorGeo, mat('floor.hall-napoleon-stone')));

  // Ceiling with the light well the pyramid hangs through.
  const well = INVERTED.half * 2 + 1.4;
  const pieces = [
    { x0, x1, z0, z1: cz - well / 2 },
    { x0, x1, z0: cz + well / 2, z1 },
    { x0, x1: cx - well / 2, z0: cz - well / 2, z1: cz + well / 2 },
    { x0: cx + well / 2, x1, z0: cz - well / 2, z1: cz + well / 2 },
  ];
  for (const piece of pieces) {
    const w = piece.x1 - piece.x0;
    const d = piece.z1 - piece.z0;
    if (w <= 0.01 || d <= 0.01) continue;
    const geo = boxGeo(w, 0.34, d);
    geo.translate((piece.x0 + piece.x1) / 2, ceilY + 0.17, (piece.z0 + piece.z1) / 2);
    group.add(new THREE.Mesh(geo, mat('ceiling.plaster-white')));
  }

  // Walls, with a light wash so the concourse is not a black box.
  const wallHeight = ceilY - floorY;
  const wallGeo = (length: number): THREE.BufferGeometry => boxGeo(length, wallHeight, 0.5);
  const sides: Array<{ length: number; x: number; z: number; rotation: number }> = [
    { length: z1 - z0, x: x0, z: cz, rotation: Math.PI / 2 },
    { length: z1 - z0, x: x1, z: cz, rotation: -Math.PI / 2 },
    { length: x1 - x0, x: cx, z: z0, rotation: 0 },
    { length: x1 - x0, x: cx, z: z1, rotation: Math.PI },
  ];
  for (const side of sides) {
    const mesh = new THREE.Mesh(wallGeo(side.length), mat('wall.stone-cream'));
    mesh.position.set(side.x, floorY + wallHeight / 2, side.z);
    mesh.rotation.y = side.rotation;
    group.add(mesh);
  }

  // Light cards washing the walls, and the void above.
  for (const side of [-1, 1]) {
    const wash = boxGeo(x1 - x0 - 3, 0.12, 0.16);
    wash.translate(cx, ceilY - 0.2, cz + side * (well / 2 + 0.35));
    addPart(group, wash, 'app.light-card');
  }

  // --- the inverted pyramid ---------------------------------------------
  const pyramid = buildGlassPyramid({
    apex: new THREE.Vector3(INVERTED.x, INVERTED.tipY, 0),
    half: INVERTED.half,
    baseY: INVERTED.baseY,
    courses: PYRAMID.inverted.courses,
    rng,
  });
  group.add(pyramid.group);

  // The steel caisson that carries it: a 13.3 m square frame under the deck.
  const caissonHalf = 6.65;
  const steel = mat('stone.granite-grey');
  for (const [w, d, ox, oz] of [
    [caissonHalf * 2 + 0.4, 0.4, 0, caissonHalf],
    [caissonHalf * 2 + 0.4, 0.4, 0, -caissonHalf],
    [0.4, caissonHalf * 2, caissonHalf, 0],
    [0.4, caissonHalf * 2, -caissonHalf, 0],
  ] as const) {
    const geo = boxGeo(w, 0.5, d);
    geo.translate(INVERTED.x + ox, INVERTED.baseY + 0.32, oz);
    group.add(new THREE.Mesh(geo, steel));
  }
  // Four corner members tying the caisson back to the deck.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const geo = boxGeo(0.28, 0.9, 0.28);
      geo.translate(INVERTED.x + sx * caissonHalf, INVERTED.baseY + 0.5, sz * caissonHalf);
      group.add(new THREE.Mesh(geo, steel));
    }
  }

  return group;
}
