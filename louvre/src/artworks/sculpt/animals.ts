/**
 * The animals and the Assyrian bulls: Coustou's rearing marble horse with its groom, the granite
 * sphinx of Tanis, and the two lamassu of Khorsabad.
 */
import * as THREE from 'three';
import type { Rng } from '../../core/rng';
import { Statue, blob, groundAo, ribbon, roughSurface, tube, type Vec3 } from './kit';
import { boxes, humanoid, pose, rockBase, skeleton, wing } from './humanoid';

/* ------------------------------------------------------------------------------------- */
/* The Marly Horses — one group of the pair, 355 cm high                                   */
/* ------------------------------------------------------------------------------------- */
const marlyHorse = (_r: Rng): THREE.Group => {
  const s = new Statue();
  const stone = 'marble.blanc-carrare';
  // the rock base the group stands on
  rockBase(s, 2.05, 1.15, 0.5, 'stone.limestone-warm');

  // the horse rears up and to the front; hind legs planted on the rock at z = -0.35
  const hind: Vec3 = [0.02, 0.5, -0.42];
  const croup: Vec3 = [0.02, 1.24, -0.24];
  const barrel: Vec3 = [0.0, 1.62, 0.18];
  const chest: Vec3 = [0.0, 2.02, 0.5];
  const crest: Vec3 = [0.0, 2.62, 0.42];
  const poll: Vec3 = [0.0, 3.02, 0.62];
  const muzzle: Vec3 = [0.02, 2.84, 1.02];
  s.add(tube([croup, barrel, chest], 0, {
    segments: 14,
    radiiX: [0.46, 0.52, 0.46],
    radiiY: [0.54, 0.58, 0.5],
  }), stone);
  // neck and head
  s.add(tube([chest, crest, poll], 0, {
    segments: 12,
    radiiX: [0.34, 0.26, 0.19],
    radiiY: [0.42, 0.34, 0.22],
  }), stone);
  const head = blob(0.17, 0.2, 0.22, 12, 3, 0.05);
  head.translate(poll[0], poll[1] - 0.06, poll[2] + 0.12);
  s.add(head, stone);
  s.add(tube([poll, muzzle], 0, { segments: 10, radiiX: [0.16, 0.11], radiiY: [0.16, 0.1] }), stone);
  // ears
  for (const side of [-1, 1]) {
    s.add(tube([[side * 0.09, 3.06, 0.6], [side * 0.12, 3.2, 0.56]], 0, { segments: 6, radiiX: [0.04, 0.02], radiiY: [0.05, 0.02] }), stone);
  }
  // mane: a crest of marble locks down the neck
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const from: Vec3 = [0, 2.56 - t * 0.72, 0.34 + t * 0.06];
    const to: Vec3 = [0.02, 2.44 - t * 0.72, 0.24 + t * 0.06];
    const lock = ribbon([from, [(from[0] + to[0]) / 2 + 0.1, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2], to], [0.12, 0.1, 0.05], { folds: 1, foldAmp: 0.02 });
    groundAo(lock, 3.5, 0.6);
    s.add(lock, stone);
  }
  // hind legs planted, forelegs raised and bent
  for (const side of [-1, 1]) {
    s.add(tube([[side * 0.28, 1.14, -0.3], [side * 0.3, 0.72, -0.36], [side * 0.32, 0.5, -0.2], [side * 0.34, 0.5, 0.02]], 0, {
      segments: 9,
      radiiX: [0.18, 0.12, 0.09, 0.1],
      radiiY: [0.2, 0.13, 0.09, 0.09],
    }), stone);
    s.add(tube([[side * 0.26, 2.0, 0.52], [side * 0.32, 1.82, 0.9], [side * 0.3, 1.62, 1.12]], 0, {
      segments: 9,
      radiiX: [0.14, 0.1, 0.08],
      radiiY: [0.16, 0.11, 0.08],
    }), stone);
    // hoof
    const hoof = blob(0.1, 0.07, 0.11, 8, 5, 0.08);
    hoof.translate(side * 0.3, 1.58, 1.16);
    s.add(hoof, stone);
  }
  // tail: a thick sweep thrown back
  s.add(tube([[0.0, 1.3, -0.48], [0.0, 1.05, -0.78], [0.02, 0.86, -0.98]], 0, {
    segments: 9,
    radiiX: [0.13, 0.16, 0.2],
    radiiY: [0.1, 0.12, 0.16],
  }), stone);

  // the groom behind the horse, leaning back against the rope
  const groomStatue = new Statue();
  const GH = 1.86;
  const gbase = skeleton(GH, 'male');
  const gsk = pose(gbase, {
    pelvis: [-0.2, 0.5 * GH, -0.86],
    spine: [-0.18, 0.6 * GH, -0.76],
    chest: [-0.16, 0.71 * GH, -0.66],
    neck: [-0.15, 0.83 * GH, -0.62],
    head: [-0.14, 0.92 * GH, -0.6],
    shoulderL: [-0.34, 0.8 * GH, -0.68],
    shoulderR: [0.03, 0.8 * GH, -0.64],
    elbowL: [-0.3, 0.98 * GH, -0.5],
    handL: [-0.2, 1.06 * GH, -0.3],
    elbowR: [0.12, 0.94 * GH, -0.52],
    handR: [0.06, 1.04 * GH, -0.34],
    hipL: [-0.28, 0.5 * GH, -0.84],
    hipR: [-0.12, 0.5 * GH, -0.86],
    kneeL: [-0.3, 0.28 * GH, -0.62],
    kneeR: [-0.12, 0.28 * GH, -0.7],
    ankleL: [-0.34, 0.05 * GH, -0.42],
    ankleR: [-0.1, 0.05 * GH, -0.56],
  });
  humanoid(groomStatue, { height: GH, sk: gsk, stone, hair: 'curls', headTurn: 0.4, seed: 101, rough: 0.003 });
  // the rope from his hands to the horse's neck
  const rope = tube([[-0.2, 1.06 * GH, -0.3], [0.0, 2.3, 0.2]], 0.012, { segments: 5, caps: false });
  s.add(rope, stone);
  const groom = groomStatue.build('marly-groom');
  const group = new THREE.Group();
  group.add(s.build('marly-horse'), groom);
  return group;
};

/* ------------------------------------------------------------------------------------- */
/* The Great Sphinx of Tanis — 183 cm high, 480 cm long                                    */
/* ------------------------------------------------------------------------------------- */
const greatSphinx = (_r: Rng): THREE.Group => {
  const s = new Statue();
  const granite = 'stone.granite-grey';
  // the slab it lies on
  s.add(boxes([[1.5, 0.16, 4.5, 0, 0.08, 0]]), 'stone.limestone-warm');
  const y0 = 0.16;
  // body: rump at -2.0, shoulders at +0.9
  s.add(tube(
    [
      [0, y0 + 0.52, -2.05],
      [0, y0 + 0.6, -1.3],
      [0, y0 + 0.66, -0.4],
      [0, y0 + 0.72, 0.4],
      [0, y0 + 0.7, 0.92],
    ],
    0,
    { segments: 14, radiiX: [0.42, 0.56, 0.64, 0.66, 0.6], radiiY: [0.46, 0.58, 0.66, 0.68, 0.6] },
  ), granite);
  // haunches
  const haunch = blob(0.62, 0.5, 0.7, 12, 7, 0.05);
  haunch.translate(0, y0 + 0.62, -1.7);
  s.add(haunch, granite);
  // forelegs stretched forward, paws flat on the slab
  for (const side of [-1, 1]) {
    s.add(tube(
      [
        [side * 0.34, y0 + 0.44, 0.86],
        [side * 0.38, y0 + 0.3, 1.5],
        [side * 0.38, y0 + 0.16, 2.02],
      ],
      0,
      { segments: 9, radiiX: [0.19, 0.16, 0.15], radiiY: [0.2, 0.16, 0.13] },
    ), granite);
    const paw = blob(0.17, 0.1, 0.22, 10, 9, 0.05);
    paw.translate(side * 0.38, y0 + 0.1, 2.16);
    s.add(paw, granite);
  }
  // chest and the nemes headdress with the human face
  const chest = blob(0.6, 0.5, 0.4, 12, 11, 0.05);
  chest.translate(0, y0 + 0.72, 0.96);
  s.add(chest, granite);
  const head = blob(0.32, 0.36, 0.32, 12, 13, 0.04);
  head.translate(0, y0 + 1.26, 1.08);
  s.add(head, granite);
  // nemes: the striped headcloth, a wide trapezoid falling to the shoulders
  const nemes = tube(
    [
      [0, y0 + 1.56, 1.02],
      [0, y0 + 1.2, 1.0],
      [0, y0 + 0.94, 0.9],
    ],
    0,
    { segments: 12, radiiX: [0.4, 0.52, 0.56], radiiY: [0.34, 0.36, 0.3] },
  );
  s.add(nemes, granite);
  // the face: a nose wedge and the false beard
  const nose = blob(0.06, 0.12, 0.08, 8, 15, 0.04);
  nose.translate(0, y0 + 1.26, 1.38);
  s.add(nose, granite);
  const beard = boxGeoLocal(0.16, 0.34, 0.1);
  beard.translate(0, y0 + 0.98, 1.34);
  s.add(beard, granite);
  // uraeus and the ears
  for (const side of [-1, 1]) {
    const ear = blob(0.1, 0.12, 0.06, 8, 17, 0.05);
    ear.translate(side * 0.34, y0 + 1.24, 1.06);
    s.add(ear, granite);
  }
  // tail curled along the flank
  s.add(tube([[0, y0 + 0.6, -2.1], [0.3, y0 + 0.4, -1.9], [0.5, y0 + 0.22, -1.4]], 0, {
    segments: 8,
    radiiX: [0.1, 0.1, 0.07],
    radiiY: [0.1, 0.1, 0.07],
  }), granite);
  return s.build('great-sphinx');
};

function boxGeoLocal(w: number, h: number, d: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
  return g;
}

/* ------------------------------------------------------------------------------------- */
/* The Lamassu of Khorsabad — a pair, 436 cm across, 420 cm high                           */
/* ------------------------------------------------------------------------------------- */
function bull(stone: string, seed: number): Statue {
  const s = new Statue();
  const baseH = 0.34;
  s.add(boxes([[1.9, baseH, 0.92, 0, baseH / 2, 0]]), 'stone.limestone-pale');
  const y0 = baseH;
  // the body as a high-relief mass, taller than it is deep
  s.add(tube(
    [
      [0, y0 + 1.0, -0.16],
      [0, y0 + 1.5, -0.12],
      [0, y0 + 1.98, -0.08],
      [0, y0 + 2.36, -0.04],
    ],
    0,
    { segments: 14, radiiX: [0.62, 0.7, 0.66, 0.5], radiiY: [0.42, 0.5, 0.46, 0.36] },
  ), stone);
  // four legs, column-like, the front pair advancing
  for (let i = 0; i < 4; i++) {
    const side = i < 2 ? -1 : 1;
    const front = i % 2 === 0 ? 1 : -1;
    const z = front > 0 ? 0.16 : -0.3;
    s.add(tube([[side * 0.34, y0 + 1.05, z], [side * 0.36, y0 + 0.6, z + front * 0.03], [side * 0.36, y0 + 0.06, z + front * 0.06]], 0, {
      segments: 9,
      radiiX: [0.19, 0.16, 0.15],
      radiiY: [0.19, 0.15, 0.14],
    }), stone);
    const hoof = blob(0.16, 0.09, 0.2, 8, seed + i, 0.05);
    hoof.translate(side * 0.36, y0 + 0.05, z + front * 0.1);
    s.add(hoof, stone);
  }
  // the neck rising out of the shoulders and the bearded head
  s.add(tube([[0, y0 + 2.3, 0.02], [0, y0 + 2.72, 0.1], [0, y0 + 2.94, 0.14]], 0, {
    segments: 10,
    radiiX: [0.36, 0.3, 0.26],
    radiiY: [0.34, 0.28, 0.24],
  }), stone);
  const head = blob(0.26, 0.3, 0.26, 12, seed + 3, 0.04);
  head.translate(0, y0 + 3.02, 0.16);
  s.add(head, stone);
  // the square beard of the Assyrian king-god
  const beard = boxGeoLocal(0.34, 0.46, 0.16);
  beard.translate(0, y0 + 2.72, 0.24);
  s.add(beard, stone);
  // the horned crown: three stacked rings and a crest
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.CylinderGeometry(0.24 - i * 0.03, 0.26 - i * 0.03, 0.09, 12);
    ring.translate(0, y0 + 3.26 + i * 0.09, 0.14);
    s.add(ring, stone);
  }
  s.add(tube([[0, y0 + 3.5, 0.14], [0, y0 + 3.7, 0.14]], 0, { segments: 8, radiiX: [0.16, 0.08], radiiY: [0.12, 0.06] }), stone);
  // curled hair and the long ringlets down the chest
  for (let i = 0; i < 5; i++) {
    const x = -0.2 + i * 0.1;
    s.add(tube([[x, y0 + 3.0, 0.2], [x * 1.1, y0 + 2.8, 0.28], [x * 1.05, y0 + 2.5, 0.26]], 0, {
      segments: 6,
      radiiX: [0.05, 0.05, 0.04],
      radiiY: [0.05, 0.05, 0.04],
    }), stone);
  }
  // wings folded along the flanks
  for (const side of [-1, 1]) {
    wing(s, [side * 0.42, y0 + 2.2, -0.2], {
      span: 1.0,
      height: 1.35,
      side: side < 0 ? -1 : 1,
      feathers: 12,
      sweep: 0.35,
      stone,
      seed: seed + 20,
    });
  }
  return s;
}

const lamassu = (_r: Rng): THREE.Group => {
  const group = new THREE.Group();
  const stone = 'stone.limestone-pale';
  const left = bull(stone, 121).build('lamassu-left');
  const right = bull(stone, 131).build('lamassu-right');
  left.position.x = -0.92;
  right.position.x = 0.92;
  group.add(left, right);
  return group;
};

export const ANIMAL_WORKS: Record<string, (r: Rng) => THREE.Group> = {
  'marly-horse': marlyHorse,
  'great-sphinx': greatSphinx,
  'lamassu': lamassu,
};
