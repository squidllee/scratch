import * as THREE from 'three';
import { boxGeo, smoothstep } from '../../core/geom';
import { addPart } from '../../core/merge';
import { mat } from '../../core/materials';
import { wall } from '../../core/builders';
import { PYRAMID } from './pyramid';

/**
 * Hall Napoléon — the entrance hall under the pyramid, floor at y = -9.
 *
 * The room that has to work hardest in this zone: the pyramid's own underside is the ceiling
 * opening, so from the hall you look up through 35.42 m of glass at the sky, and from the courtyard
 * you look down through the same glass at the stone spiral winding into the hall.
 */

export const HALL = {
  /** From route.json: 60 x 42 m, floor -9, 9 m clear. */
  x0: -30,
  x1: 30,
  z0: -21,
  z1: 21,
  floorY: -9,
  /** Finished soffit of the courtyard slab above (the paving is 0.34 m thick). */
  ceilY: -0.44,
  opening: PYRAMID.base,
  wallThickness: 0.6,
  /** Doorways: to the Denon vestibule (south-east) and the Richelieu link (north-west). */
  southOpening: { x: 26, width: 7.4, head: 4.3 },
  northOpening: { x: -23, width: 7.4, head: 3.9 },
} as const;

export interface HallParts {
  group: THREE.Group;
  /** Top of the spiral, for a spawn point. */
  spiralTop: THREE.Vector3;
}

/** Bake a soft daylight pool under the pyramid into a floor's vertex colours. */
function bakeDaylight(geo: THREE.BufferGeometry, inner: number, outer: number): void {
  const pos = geo.attributes.position;
  const col = geo.attributes.color as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const dist = Math.hypot(pos.getX(i), pos.getZ(i));
    const lit = 0.6 + 0.4 * (1 - smoothstep(inner, outer, dist));
    const base = col.getX(i);
    col.setXYZ(i, base * lit, base * lit, base * Math.min(1, lit * 1.02));
  }
  col.needsUpdate = true;
}

/** A slab spanning a rectangle, with a square opening in its middle. */
function slabWithOpening(
  parent: THREE.Object3D,
  rect: { x0: number; x1: number; z0: number; z1: number },
  holeHalf: number,
  thickness: number,
  top: number,
  material: THREE.Material,
): void {
  const hole = { x0: -holeHalf, x1: holeHalf, z0: -holeHalf, z1: holeHalf };
  const pieces = [
    { x0: rect.x0, x1: rect.x1, z0: rect.z0, z1: hole.z0 },
    { x0: rect.x0, x1: rect.x1, z0: hole.z1, z1: rect.z1 },
    { x0: rect.x0, x1: hole.x0, z0: hole.z0, z1: hole.z1 },
    { x0: hole.x1, x1: rect.x1, z0: hole.z0, z1: hole.z1 },
  ];
  for (const piece of pieces) {
    const w = piece.x1 - piece.x0;
    const d = piece.z1 - piece.z0;
    if (w <= 0.01 || d <= 0.01) continue;
    const geo = boxGeo(w, thickness, d);
    geo.translate((piece.x0 + piece.x1) / 2, top - thickness / 2, (piece.z0 + piece.z1) / 2);
    parent.add(new THREE.Mesh(geo, material));
  }
}

/** Right-handed basis whose local Y is `up`, so a box is never skew-flipped. */
function basisOf(xAxis: THREE.Vector3, upAxis: THREE.Vector3): THREE.Matrix4 {
  return new THREE.Matrix4().makeBasis(xAxis, upAxis, new THREE.Vector3().crossVectors(xAxis, upAxis));
}

/** A rounded-square ring: the plan the stone spiral follows inside the pyramid. */
function squircle(angle: number, radius: number, power: number): THREE.Vector2 {
  const e = 2 / power;
  return new THREE.Vector2(
    Math.sign(Math.cos(angle)) * Math.pow(Math.abs(Math.cos(angle)), e) * radius,
    Math.sign(Math.sin(angle)) * Math.pow(Math.abs(Math.sin(angle)), e) * radius,
  );
}

/**
 * The stone spiral: 50 treads winding 1.25 turns from the entrance landing at courtyard level down
 * to the hall floor, with a parapet on the outside and a stringer on the inside. It hangs inside
 * the pyramid's footprint, so from the courtyard it is the thing you see through the glass.
 */
function stoneSpiral(parent: THREE.Object3D): THREE.Vector3 {
  const outer = 15.1;
  const width = 2.25;
  const yTop = 0;
  const yBottom = HALL.floorY;
  const rise = 0.18;
  const steps = Math.round((yTop - yBottom) / rise);
  const turns = 1.25;
  const power = 3.1;
  const stone = mat('stone.limestone-warm');

  const samples = 480;
  let pathLength = 0;
  let previous = squircle(0, outer - width / 2, power);
  for (let i = 1; i <= samples; i++) {
    const p = squircle((i / samples) * Math.PI * 2 * turns, outer - width / 2, power);
    pathLength += p.distanceTo(previous);
    previous = p;
  }
  const treadDepth = pathLength / steps;

  let top = new THREE.Vector3(0, yTop, 0);
  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < steps; i++) {
    const angle = ((i + 0.5) / steps) * Math.PI * 2 * turns;
    const p = squircle(angle, outer - width / 2, power);
    const before = squircle(angle - 0.004, outer - width / 2, power);
    const after = squircle(angle + 0.004, outer - width / 2, power);
    const tangent = new THREE.Vector3(after.x - before.x, 0, after.y - before.y).normalize();
    const radial = new THREE.Vector3(p.x, 0, p.y).normalize();
    // Right-handed basis (radial, up, radial x up): a reflected basis skews the tread.
    const basis = new THREE.Matrix4().makeBasis(radial, up, new THREE.Vector3().crossVectors(radial, up));
    const y = yTop - (i + 1) * rise;

    const tread = new THREE.Mesh(boxGeo(width, 0.2, treadDepth + 0.03), stone);
    tread.position.set(p.x, y + 0.1, p.y);
    tread.quaternion.setFromRotationMatrix(basis);
    parent.add(tread);

    const parapet = new THREE.Mesh(boxGeo(0.2, 1.04, treadDepth + 0.03), stone);
    const edge = p.clone().addScaledVector(new THREE.Vector2(radial.x, radial.z), width / 2 - 0.1);
    parapet.position.set(edge.x, y + 0.62, edge.y);
    parapet.quaternion.setFromRotationMatrix(basis);
    parent.add(parapet);

    if (i === 0) top = new THREE.Vector3(p.x, yTop, p.y);
  }

  // Stringer: a continuous helical wall closing the inside of the stair.
  const inner = outer - width;
  for (let i = 0; i < 200; i++) {
    const a0 = (i / 200) * Math.PI * 2 * turns;
    const a1 = ((i + 1) / 200) * Math.PI * 2 * turns;
    const p0 = squircle(a0, inner, power);
    const p1 = squircle(a1, inner, power);
    const y0 = yTop - (a0 / (Math.PI * 2 * turns)) * (yTop - yBottom);
    const y1 = yTop - (a1 / (Math.PI * 2 * turns)) * (yTop - yBottom);
    const len = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    // Kept shallow at the foot so the stringer never dips below the hall floor slab.
    const seg = new THREE.Mesh(boxGeo(0.24, y0 - y1 + 0.58, len + 0.02), stone);
    seg.position.set((p0.x + p1.x) / 2, y1 + (y0 - y1) / 2 - 0.04, (p0.y + p1.y) / 2);
    seg.quaternion.setFromRotationMatrix(basisOf(new THREE.Vector3(p0.x, 0, p0.y).normalize(), up));
    parent.add(seg);
  }

  return top;
}

export function buildHall(): HallParts {
  const group = new THREE.Group();
  group.name = 'pyramid/hall-napoleon';
  const w = HALL.x1 - HALL.x0;
  const d = HALL.z1 - HALL.z0;

  // --- floor -------------------------------------------------------------
  const floorGeo = boxGeo(w, 0.4, d);
  floorGeo.translate(0, HALL.floorY - 0.2, 0);
  bakeDaylight(floorGeo, 12, 31);
  group.add(new THREE.Mesh(floorGeo, mat('floor.hall-napoleon-stone')));

  for (const x of [-15, 15]) {
    const geo = boxGeo(0.7, 0.03, d - 2);
    geo.translate(x, HALL.floorY + 0.015, 0);
    addPart(group, geo, 'stone.granite-grey');
  }
  for (const z of [-10.5, 10.5]) {
    const geo = boxGeo(w - 2, 0.03, 0.7);
    geo.translate(0, HALL.floorY + 0.015, z);
    addPart(group, geo, 'stone.granite-grey');
  }

  // --- soffit of the courtyard slab, with the pyramid's opening --------
  slabWithOpening(group, { x0: HALL.x0, x1: HALL.x1, z0: HALL.z0, z1: HALL.z1 }, HALL.opening / 2, 0.1, HALL.ceilY, mat('ceiling.plaster-white'));

  // --- walls -------------------------------------------------------------
  const height = HALL.ceilY - HALL.floorY;
  const t = HALL.wallThickness;

  const south = new THREE.Mesh(wall({ length: w + t * 2, height, thickness: t, openings: [HALL.southOpening] }), mat('wall.stone-cream'));
  south.position.set(0, HALL.floorY, HALL.z1 + t / 2);
  group.add(south);

  const north = new THREE.Mesh(wall({ length: w + t * 2, height, thickness: t, openings: [HALL.northOpening] }), mat('wall.stone-cream'));
  north.position.set(0, HALL.floorY, HALL.z0 - t / 2);
  group.add(north);

  for (const side of [-1, 1]) {
    const end = new THREE.Mesh(wall({ length: d + t * 2, height, thickness: t }), mat('wall.stone-cream'));
    end.position.set(side * (w / 2 + t / 2), HALL.floorY, 0);
    end.rotation.y = Math.PI / 2;
    group.add(end);
  }

  // Pilaster ribs on the long walls, and a cove light line at the wall head.
  for (const side of [-1, 1]) {
    for (let x = -24; x <= 24; x += 8) {
      const rib = boxGeo(0.9, height - 0.7, 0.22);
      rib.translate(x, HALL.floorY + (height - 0.7) / 2, side * (d / 2 - 0.11));
      addPart(group, rib, 'wall.stone-cream');
    }
    const cove = boxGeo(w - 1, 0.14, 0.2);
    cove.translate(0, HALL.ceilY - 0.42, side * (d / 2 - 0.16));
    addPart(group, cove, 'app.light-card');
  }
  for (const side of [-1, 1]) {
    const cove = boxGeo(0.2, 0.14, d - 1);
    cove.translate(side * (w / 2 - 0.16), HALL.ceilY - 0.42, 0);
    addPart(group, cove, 'app.light-card');
  }

  // Doorway casings, in dressed stone.
  for (const [opening, z] of [
    [HALL.southOpening, HALL.z1],
    [HALL.northOpening, HALL.z0],
  ] as const) {
    const casing = boxGeo(opening.width + 0.8, 0.35, 0.4);
    casing.translate(opening.x, HALL.floorY + opening.head + 0.15, z);
    addPart(group, casing, 'trim.stone-limestone-warm');
    for (const side of [-1, 1]) {
      const jamb = boxGeo(0.4, opening.head, 0.4);
      jamb.translate(opening.x + side * (opening.width / 2 + 0.2), HALL.floorY + opening.head / 2, z);
      addPart(group, jamb, 'trim.stone-limestone-warm');
    }
  }

  // --- the stone spiral --------------------------------------------------
  const spiralTop = stoneSpiral(group);

  // Entrance landing at courtyard level, from the pyramid's entrance face to the stair head.
  const landing = boxGeo(3.4, 0.3, 5.4);
  landing.translate(HALL.opening / 2 - 5.2, -0.15, 0);
  addPart(group, landing, 'stone.limestone-warm');
  for (const side of [-1, 1]) {
    const rail = boxGeo(3.2, 0.92, 0.15);
    rail.translate(HALL.opening / 2 - 5.2, 0.46, side * 2.6);
    addPart(group, rail, 'stone.limestone-warm');
  }

  // A stone bench along the west wall: the room needs a human-scale reference.
  const bench = boxGeo(0.7, 0.46, 9);
  bench.translate(HALL.x0 + 1.6, HALL.floorY + 0.23, -4);
  addPart(group, bench, 'stone.limestone-warm');

  return { group, spiralTop };
}
