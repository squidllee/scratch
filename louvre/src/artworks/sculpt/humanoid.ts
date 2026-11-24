/**
 * The human body as a joint skeleton plus tubes.
 *
 * One parametric body serves all thirteen sculpted figures: Greek goddesses, Michelangelo's slaves,
 * a Canova pair, an athlete in a tree stump, and four French caryatids. A pose is a set of joint
 * positions, so a work is authored by moving knees and elbows, not by remodelling a body.
 */
import * as THREE from 'three';
import { boxGeo, mergeAll } from '../../core/geom';
import { blob, groundAo, roughSurface, ribbon, tube, type Statue, type Vec3 } from './kit';

export type Joint =
  | 'pelvis'
  | 'spine'
  | 'chest'
  | 'neck'
  | 'head'
  | 'shoulderL'
  | 'shoulderR'
  | 'elbowL'
  | 'elbowR'
  | 'handL'
  | 'handR'
  | 'hipL'
  | 'hipR'
  | 'kneeL'
  | 'kneeR'
  | 'ankleL'
  | 'ankleR';

export type Skeleton = Record<Joint, Vec3>;

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const lerpV = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** Default standing skeleton for a figure of `height` metres, facing +Z. */
export function skeleton(height: number, sex: 'female' | 'male' = 'male'): Skeleton {
  const k = height / 1.78;
  const shw = (sex === 'female' ? 0.105 : 0.118) * height;
  const hipw = (sex === 'female' ? 0.085 : 0.078) * height;
  return {
    pelvis: [0, 0.53 * height, 0],
    spine: [0, 0.62 * height, -0.005 * height],
    chest: [0, 0.73 * height, -0.01 * height],
    neck: [0, 0.845 * height, -0.012 * height],
    head: [0, 0.925 * height, -0.004 * height],
    shoulderL: [-shw, 0.815 * height, -0.008 * height],
    shoulderR: [shw, 0.815 * height, -0.008 * height],
    elbowL: [-shw * 1.22, 0.635 * height, 0.01 * height],
    elbowR: [shw * 1.22, 0.635 * height, 0.01 * height],
    handL: [-shw * 1.16, 0.49 * height, 0.05 * height],
    handR: [shw * 1.16, 0.49 * height, 0.05 * height],
    hipL: [-hipw, 0.53 * height, 0],
    hipR: [hipw, 0.53 * height, 0],
    kneeL: [-hipw * 0.95, 0.29 * height, 0.012 * height],
    kneeR: [hipw * 0.95, 0.29 * height, 0.012 * height],
    ankleL: [-hipw * 0.9, 0.045 * height, 0.006 * height],
    ankleR: [hipw * 0.9, 0.045 * height, 0.006 * height],
  };
}

/** Apply a set of joint overrides and return the new skeleton. */
export function pose(base: Skeleton, over: Partial<Skeleton>): Skeleton {
  return { ...base, ...over } as Skeleton;
}

export interface HumanOptions {
  height: number;
  sex?: 'female' | 'male';
  sk: Skeleton;
  stone: string;
  seed?: number;
  /** Hair mass: a bun, a crop, a helmet of curls, or nothing. */
  hair?: 'bun' | 'short' | 'curls' | 'long' | 'none' | 'veil';
  /** Cut the arms at the shoulder (Venus de Milo, Winged Victory). */
  brokenArms?: boolean;
  /** A skirt of drapery from this height down to this height, in metres. */
  skirt?: { top: number; bottom: number; folds?: number; flare?: number; stone?: string };
  /** A mantle or sash from the left shoulder across the body. */
  sash?: { w: number; stone?: string };
  /** Where the head is turned, radians about Y. */
  headTurn?: number;
  /** Extra chisel roughness in metres. */
  rough?: number;
  /** Mute the marble's ground shadow for a figure standing on a plinth. */
  aoFloor?: number;
}

/** Build one body into a Statue. Everything is in metres, soles at y = 0. */
export function humanoid(s: Statue, o: HumanOptions): void {
  const H = o.height;
  const sk = o.sk;
  const stone = o.stone;
  const rough = o.rough ?? 0.004;
  const seed = o.seed ?? 3;
  const female = o.sex === 'female';
  const shw = Math.abs(sk.shoulderR[0]);
  const hipw = Math.abs(sk.hipR[0]);

  const part = (geo: THREE.BufferGeometry): void => {
    if (rough > 0) roughSurface(geo, rough, 5, seed);
    groundAo(geo, H, o.aoFloor ?? 0.5);
    s.add(geo, stone);
  };

  // torso: pelvis -> spine -> chest -> neck
  const torso = tube([sk.pelvis, sk.spine, sk.chest, sk.neck], 0, {
    segments: 14,
    radiiX: [hipw * 1.02, hipw * 0.92, shw * 0.92, shw * 0.42],
    radiiY: [hipw * 0.72, hipw * 0.66, shw * 0.62, shw * 0.3],
  });
  part(torso);
  // pelvis and ribcage masses give the silhouette its human outline
  const pelvis = blob(hipw * 1.02, H * 0.075, hipw * 0.72, 12, seed + 1, 0.05);
  pelvis.translate(sk.pelvis[0], sk.pelvis[1], sk.pelvis[2]);
  part(pelvis);
  const ribcage = blob(shw * 0.95, H * 0.085, shw * 0.66, 14, seed + 2, 0.05);
  ribcage.translate(sk.chest[0], sk.chest[1], sk.chest[2]);
  part(ribcage);
  if (female) {
    for (const side of [-1, 1]) {
      const b = blob(shw * 0.28, H * 0.028, shw * 0.24, 10, seed + 3, 0.08);
      b.translate(sk.chest[0] + side * shw * 0.3, sk.chest[1] - H * 0.015, sk.chest[2] + shw * 0.5);
      part(b);
    }
  }
  // shoulders and trapezius
  for (const [side, key] of [[-1, 'shoulderL'], [1, 'shoulderR']] as const) {
    const p = sk[key];
    const sh = blob(shw * 0.3, shw * 0.26, shw * 0.28, 10, seed + 4 + side, 0.07);
    sh.translate(p[0], p[1], p[2]);
    part(sh);
  }

  // neck and head
  const neck = tube([lerpV(sk.chest, sk.neck, 0.5), sk.head], 0, {
    segments: 10,
    radiiX: [shw * 0.3, shw * 0.26],
    radiiY: [shw * 0.28, shw * 0.24],
  });
  part(neck);
  const headScale = H * 0.062;
  const head = blob(headScale * 0.86, headScale * 1.06, headScale * 0.98, 14, seed + 5, 0.04);
  // face: flatten the front, add a nose ridge and a jaw
  const hp = head.attributes.position;
  for (let i = 0; i < hp.count; i++) {
    const z = hp.getZ(i);
    if (z > 0) hp.setZ(i, z * 0.9);
  }
  hp.needsUpdate = true;
  head.computeVertexNormals();
  head.rotateY(o.headTurn ?? 0);
  head.translate(sk.head[0], sk.head[1], sk.head[2]);
  part(head);
  const nose = blob(headScale * 0.11, headScale * 0.24, headScale * 0.16, 8, seed + 6, 0.05);
  nose.translate(sk.head[0], sk.head[1] - headScale * 0.05, sk.head[2] + headScale * 0.86);
  part(nose);
  const jaw = blob(headScale * 0.62, headScale * 0.4, headScale * 0.62, 10, seed + 7, 0.05);
  jaw.translate(sk.head[0], sk.head[1] - headScale * 0.72, sk.head[2] + headScale * 0.1);
  part(jaw);
  if (o.hair && o.hair !== 'none') {
    const hairZ = o.hair === 'long' ? headScale * 1.5 : headScale * 0.2;
    const hair = blob(headScale * 1.02, headScale * (o.hair === 'curls' ? 1.16 : 1.02), headScale * 1.06, 12, seed + 8, 0.12);
    hair.translate(sk.head[0], sk.head[1] + headScale * 0.22, sk.head[2] - hairZ * 0.5);
    part(hair);
    if (o.hair === 'bun') {
      const bun = blob(headScale * 0.44, headScale * 0.44, headScale * 0.4, 10, seed + 9, 0.1);
      bun.translate(sk.head[0], sk.head[1] + headScale * 0.9, sk.head[2] - headScale * 0.8);
      part(bun);
    }
    if (o.hair === 'long') {
      const fall = ribbon(
        [
          [sk.head[0] - headScale * 0.7, sk.head[1] + headScale * 0.2, sk.head[2] - headScale * 0.7],
          [sk.head[0] - headScale * 0.8, sk.neck[1] - H * 0.05, sk.head[2] - headScale * 0.9],
          [sk.head[0] - headScale * 0.6, sk.neck[1] - H * 0.12, sk.head[2] - headScale * 0.7],
        ],
        [headScale * 0.9, headScale * 1.1, headScale * 0.7],
        { folds: 2, foldAmp: headScale * 0.16 },
      );
      part(fall);
    }
  }

  // arms
  const upperArm = shw * 0.34;
  const foreArm = shw * 0.26;
  const armChain = (key: 'L' | 'R'): void => {
    const sh = sk[key === 'L' ? 'shoulderL' : 'shoulderR'];
    const el = sk[key === 'L' ? 'elbowL' : 'elbowR'];
    const hd = sk[key === 'L' ? 'handL' : 'handR'];
    if (o.brokenArms) {
      // a stump, cut just below the deltoid — the way the Venus is broken
      const stump = tube([sh, lerpV(sh, el, 0.32)], 0, {
        segments: 10,
        radiiX: [upperArm * 1.05, upperArm * 0.9],
        radiiY: [upperArm * 0.95, upperArm * 0.8],
      });
      part(stump);
      return;
    }
    const arm = tube([sh, el, hd], 0, {
      segments: 10,
      radiiX: [upperArm, foreArm, foreArm * 0.62],
      radiiY: [upperArm * 0.94, foreArm * 0.92, foreArm * 0.6],
    });
    part(arm);
    const hand = blob(foreArm * 0.6, foreArm * 0.72, foreArm * 0.42, 8, seed + 11, 0.1);
    hand.translate(hd[0], hd[1], hd[2]);
    part(hand);
  };
  armChain('L');
  armChain('R');

  // legs
  const thigh = hipw * 0.56;
  const calf = hipw * 0.4;
  const legChain = (key: 'L' | 'R'): void => {
    const hip = sk[key === 'L' ? 'hipL' : 'hipR'];
    const knee = sk[key === 'L' ? 'kneeL' : 'kneeR'];
    const ankle = sk[key === 'L' ? 'ankleL' : 'ankleR'];
    const leg = tube([hip, knee, ankle], 0, {
      segments: 10,
      radiiX: [thigh, calf, calf * 0.52],
      radiiY: [thigh * 0.96, calf * 0.92, calf * 0.5],
    });
    part(leg);
    // foot: a wedge pointing +Z
    const foot = boxGeo(calf * 0.9, H * 0.035, H * 0.11);
    foot.translate(0, -H * 0.014, H * 0.03);
    foot.translate(ankle[0], ankle[1], ankle[2]);
    part(foot);
  };
  legChain('L');
  legChain('R');

  // drapery: a flared skirt of overlapping folds
  if (o.skirt) {
    const { top, bottom, folds = 7, flare = 1.35, stone: skirtStone = stone } = o.skirt;
    const steps = 5;
    for (let i = 0; i < folds; i++) {
      const a = (i / folds) * Math.PI * 2;
      const path: Vec3[] = [];
      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        const y = top + (bottom - top) * t;
        const radius = (hipw * 0.95 + (flare - 1) * hipw * t * 1.6) * (0.92 + 0.08 * Math.cos(a * 3));
        path.push([Math.cos(a) * radius, y, Math.sin(a) * radius * 0.8]);
      }
      const width = (Math.PI * 2 * hipw) / folds * 1.5;
      const geo = ribbon(path, new Array(steps + 1).fill(width), { folds: 2, foldAmp: hipw * 0.14 });
      if (rough > 0) roughSurface(geo, rough * 1.4, 4, seed + i);
      groundAo(geo, H, o.aoFloor ?? 0.5);
      s.add(geo, skirtStone);
    }
  }
  if (o.sash) {
    const from = sk.shoulderL;
    const mid: Vec3 = [sk.chest[0] + hipw * 0.2, sk.chest[1] - H * 0.1, sk.chest[2] + shw * 0.42];
    const to: Vec3 = [sk.pelvis[0] + hipw * 0.5, sk.pelvis[1] - H * 0.06, sk.pelvis[2] + hipw * 0.5];
    const geo = ribbon([from, mid, to], [o.sash.w, o.sash.w * 0.9, o.sash.w * 0.7], { folds: 2, foldAmp: 0.02 });
    groundAo(geo, H, o.aoFloor ?? 0.5);
    s.add(geo, o.sash.stone ?? stone);
  }
}

/** A plain square plinth the statue stands on: two stones, marble inlay on top. */
export function mountPlinth(
  s: Statue,
  w: number,
  d: number,
  h: number,
  bodyStone = 'marble.gris-saint-beat',
  capStone = 'marble.noir-marquina',
): void {
  const bodyH = h * 0.86;
  s.add(boxGeo(w, bodyH, d).translate(0, bodyH / 2, 0), bodyStone);
  s.add(boxGeo(w * 1.05, h - bodyH, d * 1.05).translate(0, bodyH + (h - bodyH) / 2, 0), capStone);
}

/** A rough rock base, for the Marly group and Milon. */
export function rockBase(s: Statue, w: number, d: number, h: number, stone = 'stone.limestone-warm'): void {
  const geo = new THREE.CylinderGeometry(w * 0.5, w * 0.62, h, 9, 1);
  geo.translate(0, h / 2, 0);
  geo.scale(1, 1, d / w);
  roughSurface(geo, h * 0.09, 3, 21);
  groundAo(geo, h, 0.45);
  s.add(geo, stone);
}

/** A wing: a curved fan of feathers on a bone, used by Cupid and the Victory. */
export function wing(
  s: Statue,
  root: Vec3,
  opts: {
    span: number;
    height: number;
    side: -1 | 1;
    feathers?: number;
    sweep?: number;
    stone: string;
    seed?: number;
  },
): void {
  const n = opts.feathers ?? 16;
  const span = opts.span;
  const sweep = opts.sweep ?? 0.6;
  const bone: Vec3[] = [
    root,
    [root[0] + opts.side * span * 0.3, root[1] + opts.height * 0.5, root[2] - span * 0.12],
    [root[0] + opts.side * span * 0.62, root[1] + opts.height * 0.86, root[2] - span * 0.2],
    [root[0] + opts.side * span * 0.8, root[1] + opts.height * 0.72, root[2] - span * 0.1],
  ];
  s.add(tube(bone, 0, {
    segments: 8,
    radiiX: [span * 0.06, span * 0.045, span * 0.03, span * 0.015],
    radiiY: [span * 0.05, span * 0.04, span * 0.026, span * 0.012],
  }), opts.stone);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    // feather root walks out along the bone, tip hangs down and back
    const rx = root[0] + opts.side * span * (0.08 + t * 0.74);
    const ry = root[1] + opts.height * (0.24 + Math.sin(t * Math.PI * 0.9) * 0.62);
    const len = span * (0.34 + 0.34 * Math.sin(t * Math.PI * 0.85)) * (1 - t * 0.15);
    const tip: Vec3 = [
      rx + opts.side * len * sweep * 0.5,
      ry - len * 0.62,
      root[2] - len * (0.3 + 0.3 * t),
    ];
    const feather = ribbon(
      [
        [rx, ry, root[2]],
        [rx + opts.side * len * 0.08, ry - len * 0.24, root[2] - len * 0.16],
        tip,
      ],
      [span * 0.05, span * 0.04, span * 0.012],
      { folds: 1, foldAmp: span * 0.012 },
    );
    roughSurface(feather, span * 0.004, 8, (opts.seed ?? 1) + i);
    groundAo(feather, opts.height * 2, 0.6);
    s.add(feather, opts.stone);
  }
}

/** Merge a couple of small boxes into a single geometry (staffs, crosses, swords, plinths). */
export function boxes(parts: Array<[number, number, number, number, number, number]>): THREE.BufferGeometry {
  return mergeAll(parts.map(([w, h, d, x, y, z]) => boxGeo(w, h, d).translate(x, y, z)));
}

export function curvePoints(start: Vec3, end: Vec3, bulge: Vec3, steps = 4): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    out.push([
      start[0] + (end[0] - start[0]) * t + bulge[0] * Math.sin(t * Math.PI),
      start[1] + (end[1] - start[1]) * t + bulge[1] * Math.sin(t * Math.PI),
      start[2] + (end[2] - start[2]) * t + bulge[2] * Math.sin(t * Math.PI),
    ]);
  }
  return out;
}
