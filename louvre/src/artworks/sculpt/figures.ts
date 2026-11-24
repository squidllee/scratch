/**
 * The human sculptures: the Greek goddesses, Michelangelo's two slaves, Canova's pair, the
 * Borghese warrior, the Daru staircase's Victory and Goujon's four caryatids.
 *
 * Each work is a skeleton pose plus drapery and props. Proportions come from `skeleton()`; the
 * library scales the finished object to the centimetres in the spec, so these are authored in
 * natural metres and snapped to the real height at the end.
 */
import * as THREE from 'three';
import type { Rng } from '../../core/rng';
import { Statue, blob, roundBase, roughSurface, tube } from './kit';
import { boxes, humanoid, mountPlinth, pose, rockBase, skeleton, wing, type Skeleton } from './humanoid';

const MARBLE = 'marble.pentelic';
const CARMEN = 'marble.blanc-carrare';
const PENTELIC = 'marble.pentelic';

/* ------------------------------------------------------------------------------------- */
/* Venus de Milo — 204 cm incl. plinth                                                    */
/* ------------------------------------------------------------------------------------- */
const venusDeMilo = (_r: Rng): THREE.Group => {
  const s = new Statue();
  const H = 1.9;
  const base = skeleton(H, 'female');
  const sk: Skeleton = pose(base, {
    pelvis: [0.035, 0.53 * H, 0.01],
    spine: [0.02, 0.62 * H, 0],
    chest: [-0.005, 0.73 * H, -0.01],
    neck: [-0.01, 0.845 * H, -0.005],
    head: [-0.015, 0.925 * H, 0.005],
    hipL: [-0.08, 0.53 * H, 0.0],
    hipR: [0.09, 0.545 * H, 0.02],
    kneeL: [-0.075, 0.29 * H, 0.03],
    kneeR: [0.06, 0.3 * H, 0.07],
    ankleL: [-0.1, 0.045 * H, 0.02],
    ankleR: [0.14, 0.045 * H, 0.06],
  });
  humanoid(s, {
    height: H,
    sex: 'female',
    sk,
    stone: MARBLE,
    hair: 'bun',
    brokenArms: true,
    headTurn: -0.3,
    skirt: { top: 0.62 * H, bottom: 0.06 * H, folds: 9, flare: 1.28 },
    sash: { w: 0.11 },
    seed: 11,
    rough: 0.0045,
  });
  mountPlinth(s, 0.9, 0.54, 0.14);
  return s.build('venus-de-milo');
};

/* ------------------------------------------------------------------------------------- */
/* Winged Victory of Samothrace — 557 cm on its socle                                     */
/* ------------------------------------------------------------------------------------- */
const wingedVictory = (_r: Rng): THREE.Group => {
  const s = new Statue();
  const stone = 'marble.pentelic';
  // socle: the modern block the group is mounted on
  s.add(boxes([
    [2.05, 0.9, 1.55, 0, 0.45, 0],
    [1.94, 0.06, 1.45, 0, 0.93, 0],
  ]), 'stone.limestone-warm');
  // the ship's prow: a curved hull with a ram, planked
  const hullTop = 0.93 + 0.62;
  const prow = tube(
    [
      [0, hullTop - 0.1, -1.05],
      [0, hullTop - 0.02, -0.4],
      [0, hullTop + 0.06, 0.25],
      [0.02, hullTop + 0.16, 0.86],
    ],
    0,
    { segments: 12, radiiX: [0.42, 0.52, 0.56, 0.4], radiiY: [0.2, 0.28, 0.3, 0.26] },
  );
  roughSurface(prow, 0.02, 3, 5);
  s.add(prow, stone);
  // the ram's beak at the bow and the oar-banks along the side
  const ram = blob(0.16, 0.14, 0.3, 10, 4, 0.1);
  ram.translate(0.02, hullTop - 0.04, 1.02);
  s.add(ram, stone);
  for (let i = 0; i < 5; i++) {
    const z = -0.8 + i * 0.34;
    s.add(tube([[0.4, hullTop - 0.12, z], [0.56, hullTop - 0.02, z + 0.1]], 0.035, { segments: 6 }), stone);
  }

  // the goddess: striding into the wind, torso turned to her right.
  const H = 2.42;
  const base = skeleton(H, 'female');
  const sk: Skeleton = pose(base, {
    pelvis: [0.0, 0.5 * H, 0.02],
    spine: [0.01, 0.6 * H, 0.06],
    chest: [0.0, 0.71 * H, 0.1],
    neck: [0.01, 0.83 * H, 0.13],
    head: [0.02, 0.91 * H, 0.15],
    shoulderL: [-0.24, 0.8 * H, 0.1],
    shoulderR: [0.24, 0.795 * H, 0.1],
    hipL: [-0.09, 0.5 * H, 0.0],
    hipR: [0.09, 0.51 * H, 0.05],
    kneeL: [-0.09, 0.28 * H, 0.18],
    kneeR: [0.08, 0.3 * H, -0.02],
    ankleL: [-0.1, 0.05 * H, 0.34],
    ankleR: [0.1, 0.06 * H, -0.18],
  });
  const body = new Statue();
  humanoid(body, {
    height: H,
    sex: 'female',
    sk,
    stone,
    hair: 'bun',
    brokenArms: true,
    headTurn: 0.25,
    skirt: { top: 0.6 * H, bottom: 0.03 * H, folds: 10, flare: 1.5 },
    seed: 17,
    rough: 0.004,
    aoFloor: 0.55,
  });
  // the skirt is blown back against the advancing leg: shear the drapery's lower half
  const bodyGroup = body.build('victory-body');
  bodyGroup.rotation.x = -0.06;
  bodyGroup.position.set(0, hullTop - 0.04, 0.1);
  // wings: swept up and back from the shoulders
  const wings = new Statue();
  const shoulderY = hullTop - 0.04 + 0.8 * H;
  wing(wings, [0.12, shoulderY + 0.06, -0.12], { span: 1.92, height: 1.62, side: 1, feathers: 19, sweep: 0.55, stone, seed: 31 });
  wing(wings, [-0.12, shoulderY + 0.06, -0.12], { span: 1.88, height: 1.58, side: -1, feathers: 19, sweep: 0.55, stone, seed: 37 });
  const wingGroup = wings.build('victory-wings');
  wingGroup.rotation.x = -0.14;
  const group = new THREE.Group();
  const socle = s.build('victory-socle');
  group.add(socle, bodyGroup, wingGroup);
  return group;
};

/* ------------------------------------------------------------------------------------- */
/* Diana of Versailles — 201 cm                                                           */
/* ------------------------------------------------------------------------------------- */
const dianaOfVersailles = (_r: Rng): THREE.Group => {
  const s = new Statue();
  const H = 1.78;
  const base = skeleton(H, 'female');
  const sk: Skeleton = pose(base, {
    pelvis: [0, 0.535 * H, 0.02],
    spine: [0.01, 0.62 * H, 0.03],
    chest: [0.02, 0.73 * H, 0.02],
    neck: [0.02, 0.845 * H, 0.01],
    head: [0.03, 0.925 * H, 0.03],
    // striding: right leg forward and straight, left leg trailing
    hipL: [-0.08, 0.53 * H, -0.02],
    hipR: [0.08, 0.535 * H, 0.03],
    kneeL: [-0.09, 0.28 * H, -0.18],
    kneeR: [0.09, 0.29 * H, 0.16],
    ankleL: [-0.12, 0.05 * H, -0.44],
    ankleR: [0.12, 0.05 * H, 0.4],
    // right arm reaching back to the quiver, left holding the bow low
    shoulderL: [-0.19, 0.815 * H, 0.02],
    shoulderR: [0.19, 0.815 * H, 0.01],
    elbowL: [-0.26, 0.65 * H, 0.14],
    handL: [-0.24, 0.5 * H, 0.34],
    elbowR: [0.24, 0.73 * H, -0.1],
    handR: [0.16, 0.83 * H, -0.16],
  });
  humanoid(s, {
    height: H,
    sex: 'female',
    sk,
    stone: CARMEN,
    hair: 'bun',
    headTurn: 0.4,
    skirt: { top: 0.66 * H, bottom: 0.44 * H, folds: 8, flare: 1.3 },
    seed: 23,
    rough: 0.0035,
  });
  // the quiver on her back
  const quiver = tube([[0.16, 0.86 * H, -0.14], [0.3, 0.66 * H, -0.22]], 0, {
    segments: 8,
    radiiX: [0.055, 0.045],
    radiiY: [0.05, 0.04],
  });
  s.add(quiver, CARMEN);
  for (let i = 0; i < 4; i++) {
    s.add(tube([[0.17 + i * 0.012, 0.88 * H, -0.16], [0.2 + i * 0.014, 0.96 * H, -0.19]], 0.006, { segments: 5 }), CARMEN);
  }
  // the deer at her left, small and alert
  const deer = new Statue();
  const dx = -0.58;
  const dz = 0.1;
  deer.add(tube([[dx, 0.62, dz - 0.14], [dx, 0.66, dz + 0.12]], 0, {
    segments: 10,
    radiiX: [0.13, 0.11],
    radiiY: [0.13, 0.1],
  }), CARMEN);
  deer.add(tube([[dx, 0.68, dz + 0.1], [dx - 0.02, 0.86, dz + 0.16]], 0, {
    segments: 8,
    radiiX: [0.06, 0.045],
    radiiY: [0.06, 0.045],
  }), CARMEN);
  const deerHead = blob(0.05, 0.05, 0.09, 10, 9, 0.06);
  deerHead.translate(dx - 0.03, 0.9, dz + 0.22);
  deer.add(deerHead, CARMEN);
  for (let i = 0; i < 2; i++) {
    for (const sx of [-1, 1]) {
      deer.add(tube([[dx + sx * 0.07, 0.56, dz - 0.1 + i * 0.2], [dx + sx * 0.08, 0.06, dz - 0.12 + i * 0.22]], 0.022, { segments: 6 }), CARMEN);
    }
  }
  const deerGroup = deer.build('diana-deer');
  const group = new THREE.Group();
  group.add(s.build('diana'), deerGroup);
  return group;
};

/* ------------------------------------------------------------------------------------- */
/* Borghese Gladiator — 173 cm                                                            */
/* ------------------------------------------------------------------------------------- */
const borgheseGladiator = (_r: Rng): THREE.Group => {
  const s = new Statue();
  const H = 1.6;
  const base = skeleton(H, 'male');
  const sk: Skeleton = pose(base, {
    pelvis: [0, 0.52 * H, -0.1],
    spine: [0.02, 0.6 * H, -0.02],
    chest: [0.04, 0.71 * H, 0.06],
    neck: [0.05, 0.83 * H, 0.1],
    head: [0.06, 0.91 * H, 0.12],
    // lunge: left leg forward and bent, right leg extended back
    hipL: [-0.1, 0.52 * H, -0.04],
    hipR: [0.1, 0.52 * H, -0.16],
    kneeL: [-0.12, 0.3 * H, 0.22],
    kneeR: [0.12, 0.28 * H, -0.5],
    ankleL: [-0.14, 0.05 * H, 0.36],
    ankleR: [0.13, 0.045 * H, -0.72],
    // both arms thrust forward, the shield arm lower
    shoulderL: [-0.2, 0.8 * H, 0.08],
    shoulderR: [0.2, 0.8 * H, 0.1],
    elbowL: [-0.34, 0.72 * H, 0.34],
    handL: [-0.46, 0.68 * H, 0.62],
    elbowR: [0.34, 0.76 * H, 0.4],
    handR: [0.44, 0.72 * H, 0.72],
  });
  humanoid(s, { height: H, sk, stone: PENTELIC, hair: 'curls', headTurn: 0.5, seed: 41, rough: 0.0035 });
  // the torque at the neck and the cloak over the left arm
  const torque = new THREE.TorusGeometry(0.07, 0.012, 6, 16);
  torque.rotateX(Math.PI / 2);
  torque.translate(sk.neck[0], sk.neck[1] + H * 0.01, sk.neck[2]);
  s.add(torque, 'gold.bronze-tarnished');
  const drape = tube([[sk.shoulderL[0], sk.shoulderL[1], sk.shoulderL[2]], [sk.elbowL[0], sk.elbowL[1] - H * 0.18, sk.elbowL[2] - 0.04], [sk.handL[0] - 0.04, sk.handL[1] - H * 0.22, sk.handL[2] - 0.1]], 0, {
    segments: 10,
    radiiX: [0.1, 0.16, 0.1],
    radiiY: [0.13, 0.2, 0.12],
  });
  s.add(drape, PENTELIC);
  mountPlinth(s, 1.5, 1.5, 0.14, 'marble.gris-saint-beat', 'marble.portor');
  return s.build('borghese-gladiator');
};

/* ------------------------------------------------------------------------------------- */
/* The four Caryatids of the musicians' tribune — 280 cm each                             */
/* ------------------------------------------------------------------------------------- */
const caryatids = (_r: Rng): THREE.Group => {
  const group = new THREE.Group();
  const H = 2.62;
  const positions = [-2.0, -0.66, 0.66, 2.0];
  const base = skeleton(H, 'female');
  positions.forEach((x, i) => {
    const s = new Statue();
    const mirror = i < 2 ? 1 : -1;
    const sk: Skeleton = pose(base, {
      pelvis: [0, 0.53 * H, 0],
      spine: [mirror * 0.01, 0.62 * H, 0.005],
      chest: [mirror * 0.015, 0.73 * H, 0],
      neck: [mirror * 0.02, 0.85 * H, 0],
      head: [mirror * 0.02, 0.93 * H, 0],
      // both arms raised to carry the entablature
      shoulderL: [-0.17, 0.815 * H, 0],
      shoulderR: [0.17, 0.815 * H, 0],
      elbowL: [-0.24, 0.93 * H, 0.02],
      elbowR: [0.24, 0.93 * H, 0.02],
      handL: [-0.19, 1.02 * H * 0.965, 0.06],
      handR: [0.19, 1.02 * H * 0.965, 0.06],
    });
    humanoid(s, {
      height: H,
      sex: 'female',
      sk,
      stone: 'stone.limestone-pale',
      hair: 'curls',
      headTurn: mirror * -0.15,
      skirt: { top: 0.64 * H, bottom: 0.02 * H, folds: 9, flare: 1.16 },
      sash: { w: 0.1 },
      seed: 50 + i,
      rough: 0.005,
    });
    // the basket capital on her head
    const cap = new THREE.CylinderGeometry(0.11, 0.075, 0.2, 12);
    cap.translate(0, 1.0 * H + 0.1, 0);
    s.add(cap, 'stone.limestone-pale');
    const figure = s.build('caryatid' + i);
    figure.position.x = x;
    group.add(figure);
  });
  // the entablature they carry
  const ent = new Statue();
  ent.add(boxes([
    [5.2, 0.42, 0.52, 0, 2.98, 0],
    [5.32, 0.1, 0.6, 0, 3.2, 0],
    [5.0, 0.12, 0.46, 0, 2.72, 0],
  ]), 'stone.limestone-pale');
  group.add(ent.build('caryatid-entablature'));
  const plinth = new Statue();
  plinth.add(boxes([[5.4, 0.16, 0.7, 0, 0.08, 0]]), 'stone.limestone-warm');
  group.add(plinth.build('caryatid-plinth'));
  return group;
};

/* ------------------------------------------------------------------------------------- */
/* Dying and Rebellious Slaves — 228 cm and 215 cm                                        */
/* ------------------------------------------------------------------------------------- */
const dyingSlave = (_r: Rng): THREE.Group => {
  const s = new Statue();
  const H = 2.02;
  const base = skeleton(H, 'male');
  const sk: Skeleton = pose(base, {
    pelvis: [0.02, 0.53 * H, 0],
    spine: [0.03, 0.62 * H, 0],
    chest: [0.02, 0.72 * H, -0.02],
    neck: [0.0, 0.84 * H, -0.05],
    head: [-0.02, 0.92 * H, -0.09],
    // right arm bent up behind the head, left across the chest
    shoulderL: [-0.19, 0.81 * H, -0.01],
    shoulderR: [0.2, 0.81 * H, -0.02],
    elbowL: [-0.2, 0.66 * H, 0.12],
    handL: [0.04, 0.73 * H, 0.16],
    elbowR: [0.26, 0.9 * H, -0.06],
    handR: [0.06, 0.98 * H, -0.1],
    // weight on the right leg, left knee slightly bent and forward
    hipL: [-0.08, 0.53 * H, 0.01],
    hipR: [0.08, 0.535 * H, -0.01],
    kneeL: [-0.09, 0.29 * H, 0.09],
    kneeR: [0.08, 0.29 * H, -0.02],
    ankleL: [-0.1, 0.045 * H, 0.14],
    ankleR: [0.09, 0.045 * H, -0.06],
  });
  humanoid(s, { height: H, sk, stone: CARMEN, hair: 'curls', headTurn: -0.2, seed: 61, rough: 0.0035 });
  // the tree-trunk support behind the right leg
  s.add(tube([[0.2, 0.06 * H, -0.1], [0.22, 0.3 * H, -0.12], [0.18, 0.5 * H, -0.1]], 0, {
    segments: 8,
    radiiX: [0.11, 0.09, 0.07],
    radiiY: [0.1, 0.08, 0.06],
  }), CARMEN);
  mountPlinth(s, 0.62, 0.5, 0.24, 'marble.gris-saint-beat', 'marble.portor');
  return s.build('dying-slave');
};

const rebelliousSlave = (_r: Rng): THREE.Group => {
  const s = new Statue();
  const H = 1.92;
  const base = skeleton(H, 'male');
  const sk: Skeleton = pose(base, {
    pelvis: [0, 0.53 * H, 0],
    spine: [-0.02, 0.62 * H, -0.01],
    chest: [-0.03, 0.72 * H, 0.01],
    neck: [-0.02, 0.84 * H, 0.02],
    head: [-0.01, 0.92 * H, 0.03],
    // left arm twisted behind the back, right arm across the chest
    shoulderL: [-0.19, 0.81 * H, 0],
    shoulderR: [0.2, 0.81 * H, 0],
    elbowL: [-0.22, 0.68 * H, -0.1],
    handL: [-0.1, 0.56 * H, -0.22],
    elbowR: [0.22, 0.68 * H, 0.1],
    handR: [-0.02, 0.79 * H, 0.16],
    hipL: [-0.08, 0.53 * H, 0],
    hipR: [0.09, 0.53 * H, 0],
    kneeL: [-0.08, 0.28 * H, 0.04],
    kneeR: [0.1, 0.29 * H, -0.03],
    ankleL: [-0.09, 0.045 * H, 0.08],
    ankleR: [0.12, 0.045 * H, -0.08],
  });
  humanoid(s, { height: H, sk, stone: CARMEN, hair: 'curls', headTurn: 0.55, seed: 71, rough: 0.0035 });
  s.add(tube([[0.18, 0.06 * H, -0.12], [0.2, 0.28 * H, -0.14], [0.16, 0.46 * H, -0.12]], 0, {
    segments: 8,
    radiiX: [0.1, 0.085, 0.06],
    radiiY: [0.09, 0.075, 0.055],
  }), CARMEN);
  mountPlinth(s, 0.58, 0.5, 0.23, 'marble.gris-saint-beat', 'marble.portor');
  return s.build('rebellious-slave');
};

/* ------------------------------------------------------------------------------------- */
/* Psyche Revived by Cupid's Kiss — 155 cm                                                */
/* ------------------------------------------------------------------------------------- */
const psycheRevived = (_r: Rng): THREE.Group => {
  const group = new THREE.Group();
  // Cupid: standing, turned, wings spread, lifting her head with both hands.
  const cupidStatue = new Statue();
  const CH = 1.32;
  const cbase = skeleton(CH, 'male');
  const csk: Skeleton = pose(cbase, {
    pelvis: [0, 0.53 * CH, 0],
    spine: [-0.01, 0.62 * CH, 0.02],
    chest: [-0.02, 0.73 * CH, 0.05],
    neck: [0, 0.845 * CH, 0.06],
    head: [0.02, 0.925 * CH, 0.07],
    shoulderL: [-0.17, 0.815 * CH, 0.05],
    shoulderR: [0.17, 0.815 * CH, 0.05],
    elbowL: [-0.16, 0.78 * CH, 0.22],
    handL: [-0.08, 0.72 * CH, 0.32],
    elbowR: [0.18, 0.78 * CH, 0.2],
    handR: [0.1, 0.72 * CH, 0.3],
    hipL: [-0.07, 0.53 * CH, 0],
    hipR: [0.08, 0.53 * CH, 0.02],
    kneeL: [-0.07, 0.29 * CH, 0.03],
    kneeR: [0.09, 0.29 * CH, -0.05],
  });
  humanoid(cupidStatue, { height: CH, sk: csk, stone: CARMEN, hair: 'curls', headTurn: -0.4, seed: 81, rough: 0.003 });
  wing(cupidStatue, [-0.08, 0.86 * CH, 0.02], { span: 0.62, height: 0.6, side: -1, feathers: 11, sweep: 0.5, stone: CARMEN, seed: 83 });
  wing(cupidStatue, [0.08, 0.86 * CH, 0.02], { span: 0.6, height: 0.58, side: 1, feathers: 11, sweep: 0.5, stone: CARMEN, seed: 85 });
  const cupid = cupidStatue.build('psyche-cupid');
  cupid.position.set(0.2, 0, 0);
  group.add(cupid);

  // Psyche: kneeling, body arcing up, arms rising to his face.
  const pStatue = new Statue();
  const PH = 0.98;
  const pbase = skeleton(PH, 'female');
  const psk: Skeleton = pose(pbase, {
    pelvis: [-0.28, 0.3 * PH + 0.06, 0.02],
    spine: [-0.14, 0.42 * PH + 0.06, 0.06],
    chest: [-0.11, 0.55 * PH + 0.04, 0.08],
    neck: [-0.1, 0.66 * PH + 0.03, 0.09],
    head: [-0.09, 0.73 * PH + 0.02, 0.1],
    // arms up toward his head
    shoulderL: [-0.25, 0.54 * PH + 0.04, 0.08],
    shoulderR: [0.0, 0.55 * PH + 0.04, 0.09],
    elbowL: [-0.28, 0.66 * PH + 0.03, 0.2],
    handL: [-0.16, 0.74 * PH + 0.02, 0.26],
    elbowR: [-0.02, 0.67 * PH + 0.03, 0.2],
    handR: [-0.02, 0.75 * PH + 0.02, 0.26],
    hipL: [-0.26, 0.28 * PH + 0.06, 0],
    hipR: [-0.06, 0.3 * PH + 0.06, 0.02],
    kneeL: [-0.4, 0.09, 0.16],
    kneeR: [-0.06, 0.08, 0.2],
    ankleL: [-0.52, 0.05, -0.06],
    ankleR: [-0.02, 0.04, -0.12],
  });
  humanoid(pStatue, {
    height: PH,
    sex: 'female',
    sk: psk,
    stone: CARMEN,
    hair: 'bun',
    headTurn: 0.7,
    seed: 87,
    rough: 0.003,
    skirt: { top: 0.42 * PH, bottom: 0.06, folds: 7, flare: 1.24 },
  });
  const psyche = pStatue.build('psyche-psyche');
  group.add(psyche);

  const base = new Statue();
  base.add(roundBase(0.62, 0.12, 30), 'marble.gris-saint-beat');
  base.add(roundBase(0.6, 0.03, 30).translate(0, 0.12, 0), 'marble.noir-marquina');
  group.add(base.build('psyche-base'));
  return group;
};

/* ------------------------------------------------------------------------------------- */
/* Milon of Croton — 270 cm                                                               */
/* ------------------------------------------------------------------------------------- */
const miloOfCroton = (_r: Rng): THREE.Group => {
  const s = new Statue();
  const H = 2.0;
  const base = skeleton(H, 'male');
  const sk: Skeleton = pose(base, {
    pelvis: [0.02, 0.52 * H, 0.04],
    spine: [0.04, 0.61 * H, 0.05],
    chest: [0.06, 0.71 * H, 0.04],
    neck: [0.06, 0.83 * H, 0.02],
    head: [0.05, 0.91 * H, 0.0],
    // right arm wedged in the split trunk, left arm flung back
    shoulderL: [-0.19, 0.8 * H, 0.02],
    shoulderR: [0.21, 0.8 * H, 0.04],
    elbowL: [-0.32, 0.72 * H, -0.16],
    handL: [-0.34, 0.66 * H, -0.3],
    elbowR: [0.34, 0.68 * H, 0.18],
    handR: [0.26, 0.52 * H, 0.3],
    hipL: [-0.09, 0.52 * H, 0],
    hipR: [0.09, 0.52 * H, 0.06],
    kneeL: [-0.11, 0.28 * H, 0.16],
    kneeR: [0.1, 0.28 * H, -0.04],
    ankleL: [-0.13, 0.045 * H, 0.24],
    ankleR: [0.11, 0.045 * H, -0.1],
  });
  humanoid(s, { height: H, sk, stone: CARMEN, hair: 'curls', headTurn: 0.35, seed: 91, rough: 0.0035 });
  // the split trunk: a stump with a V notch clamping his right forearm
  const trunkTop = 0.56 * H;
  const trunk = new THREE.CylinderGeometry(0.19, 0.26, trunkTop, 12, 1);
  trunk.translate(0.34, trunkTop / 2, 0.3);
  roughSurface(trunk, 0.03, 4, 13);
  s.add(trunk, CARMEN);
  for (const side of [-1, 1]) {
    const fork = tube([
      [0.34 + side * 0.04, trunkTop - 0.02, 0.3],
      [0.34 + side * 0.1, trunkTop + 0.22 * H, 0.32],
    ], 0, { segments: 7, radiiX: [0.09, 0.05], radiiY: [0.08, 0.04] });
    s.add(fork, CARMEN);
  }
  // the lion pelt draped over the stump, and the club at his feet
  const pelt = blob(0.3, 0.1, 0.26, 10, 15, 0.14);
  pelt.translate(0.3, trunkTop - 0.02, 0.26);
  s.add(pelt, CARMEN);
  s.add(tube([[0.46, 0.06, -0.1], [0.54, 0.14, -0.34]], 0, { segments: 7, radiiX: [0.05, 0.075], radiiY: [0.05, 0.07] }), CARMEN);
  rockBase(s, 0.95, 0.7, 0.22);
  return s.build('milo-of-croton');
};

export const HUMAN_WORKS: Record<string, (r: Rng) => THREE.Group> = {
  'venus-de-milo': venusDeMilo,
  'winged-victory': wingedVictory,
  'diana-of-versailles': dianaOfVersailles,
  'borghese-gladiator': borgheseGladiator,
  'caryatids': caryatids,
  'dying-slave': dyingSlave,
  'rebellious-slave': rebelliousSlave,
  'psyche-revived': psycheRevived,
  'milo-of-croton': miloOfCroton,
};
