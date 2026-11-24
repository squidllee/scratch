import * as THREE from 'three';
import { mat } from '../../core/materials';
import type { Rng } from '../../core/rng';
import { faceLattice, faceLines, pyramidCounts, type FaceCoord, type PyramidCounts } from './lattice';
import { pyramidMaterials } from './materials';

/**
 * The Glass Pyramid, the three satellite pyramids and the inverted pyramid: one lattice at three
 * scales. Everything here is measured work — 35.42 m base, 21.64 m height, 673 panes — and the
 * counts are asserted at build time so a drifting lattice fails loudly instead of quietly.
 */

export const PYRAMID = {
  /** Measured: Structurae, Wikipedia FR ("base carrée de 35,42 m de côté", 21,64 m). */
  base: 35.42,
  height: 21.64,
  /** Courses of the lattice. 18 gives the Louvre's 153 rhombi + 18 triangles a face. */
  courses: 18,
  /** The entrance face carries 9 fewer rhombi and 2 fewer triangles (160 panes). */
  entranceFace: 1,
  /** 5 m tall, on the north, south and east sides of the main pyramid. */
  satellites: {
    height: 5,
    courses: 4,
    /** On the north, east and south sides: they light the entrances to the three wings. */
    positions: [
      [0, -32],
      [32, 0],
      [0, 32],
    ] as ReadonlyArray<readonly [number, number]>,
  },
  /** 16 m base, 7 m deep, tip 1.4 m above the Carrousel floor, 130 m west of the pyramid. */
  inverted: { base: 16, height: 7, courses: 7, x: -130, tipAboveFloor: 1.4, floorY: -9 },
  /** Anodised aluminium lattice members (the real frame is 105 t of it). */
  mullion: { width: 0.055, depth: 0.075 },
} as const;

export interface FaceSpec {
  name: string;
  base0: THREE.Vector3;
  base1: THREE.Vector3;
  apex: THREE.Vector3;
  normal: THREE.Vector3;
  entrance: boolean;
}

const HALF_TURN = [0, 1, 2, 3] as const;

/** Four faces of a square-based pyramid: base ring at `baseY`, apex at `apex`. */
export function pyramidFaces(apex: THREE.Vector3, half: number, baseY: number, entranceFace = -1): FaceSpec[] {
  const corners = [
    new THREE.Vector3(-half, baseY, -half),
    new THREE.Vector3(half, baseY, -half),
    new THREE.Vector3(half, baseY, half),
    new THREE.Vector3(-half, baseY, half),
  ];
  const names = ['north', 'east', 'south', 'west'];
  const centre = new THREE.Vector3(apex.x, (apex.y + baseY) * 0.33, apex.z);
  return HALF_TURN.map((index) => {
    const base0 = (corners[index] as THREE.Vector3).clone();
    const base1 = (corners[(index + 1) % 4] as THREE.Vector3).clone();
    const normal = new THREE.Vector3()
      .subVectors(base1, base0)
      .cross(new THREE.Vector3().subVectors(apex, base0))
      .normalize();
    const mid = base0.clone().add(base1).multiplyScalar(0.5).add(apex).multiplyScalar(1 / 3);
    if (normal.dot(mid.sub(centre)) < 0) normal.negate();
    return { name: names[index] as string, base0, base1, apex: apex.clone(), normal, entrance: index === entranceFace };
  });
}

/** Face coordinates (a, c) in lattice units -> world point on the face plane. */
export function facePoint(face: FaceSpec, a: number, c: number, courses: number): THREE.Vector3 {
  const s = a / courses;
  const t = c / courses;
  return new THREE.Vector3()
    .addScaledVector(face.base0, s)
    .addScaledVector(face.base1, t)
    .addScaledVector(face.apex, 1 - s - t);
}

/**
 * The entrance opening's outline: the edges of removed panes that no other removed pane shares.
 * Mullions crossing inside this outline are dropped, so the door reads as an opening rather than a
 * lattice screen over a hole.
 */
function holeOutline(courses: number): Array<[THREE.Vector2, THREE.Vector2]> {
  const open = faceLattice(courses, true);
  const kept = new Set(open.cells.map((cell) => cell.i + ':' + cell.j));
  const removed = faceLattice(courses, false).cells.filter((cell) => !kept.has(cell.i + ':' + cell.j));
  const seen = new Map<string, { a: FaceCoord; b: FaceCoord; count: number }>();
  const key = ([a, c]: FaceCoord): string => a + ':' + c;
  for (const cell of removed) {
    for (let i = 0; i < cell.verts.length; i++) {
      const p = cell.verts[i] as FaceCoord;
      const q = cell.verts[(i + 1) % cell.verts.length] as FaceCoord;
      const id = [key(p), key(q)].sort().join('|');
      const hit = seen.get(id);
      if (hit) hit.count++;
      else seen.set(id, { a: p, b: q, count: 1 });
    }
  }
  return [...seen.values()].filter((e) => e.count === 1).map((e) => [new THREE.Vector2(e.a[0], e.a[1]), new THREE.Vector2(e.b[0], e.b[1])]);
}

function insideHole(outline: Array<[THREE.Vector2, THREE.Vector2]>, point: THREE.Vector2): boolean {
  let inside = false;
  for (const [a, b] of outline) {
    if (a.y > point.y !== b.y > point.y) {
      const x = ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
      if (point.x < x) inside = !inside;
    }
  }
  return inside;
}

export interface GlassPyramid {
  group: THREE.Group;
  counts: PyramidCounts;
}

/**
 * Build one glass pyramid: panes in a single mesh, mullion lattice in a second, granite kerb at the
 * base. The satellites and the inverted pyramid are this same function at other scales.
 */
export function buildGlassPyramid(opts: {
  apex: THREE.Vector3;
  half: number;
  baseY: number;
  courses: number;
  entranceFace?: number;
  rng: Rng;
  kerb?: boolean;
}): GlassPyramid {
  const { apex, half, baseY, courses, rng } = opts;
  const entranceFace = opts.entranceFace ?? -1;
  const faces = pyramidFaces(apex, half, baseY, entranceFace);
  const materials = pyramidMaterials();
  const group = new THREE.Group();
  group.name = 'pyramid/glass-' + courses;

  const outline = entranceFace >= 0 ? holeOutline(courses) : [];

  // --- panes -------------------------------------------------------------
  const pos: number[] = [];
  const uv: number[] = [];
  const col: number[] = [];
  const index: number[] = [];
  const counts = pyramidCounts(courses, entranceFace);
  const yLow = Math.min(apex.y, baseY);
  const ySpan = Math.max(1e-3, Math.abs(apex.y - baseY));

  for (const face of faces) {
    const lattice = faceLattice(courses, face.entrance);
    for (const cell of lattice.cells) {
      const verts = cell.verts.map(([a, c]) => facePoint(face, a, c, courses));
      const first = pos.length / 3;
      const tint = 0.955 + rng.range(0, 0.075);
      for (const v of verts) {
        pos.push(v.x, v.y, v.z);
        uv.push(v.x * 0.4, (v.y + v.z) * 0.4);
        const height = THREE.MathUtils.clamp((v.y - yLow) / ySpan, 0, 1);
        const t = tint * (0.93 + 0.12 * height);
        col.push(t, t, t * 1.012);
      }
      for (let t = 1; t + 1 < verts.length; t++) index.push(first, first + t, first + t + 1);
    }
  }

  const paneGeo = new THREE.BufferGeometry();
  paneGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  paneGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  paneGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  paneGeo.setIndex(index);
  paneGeo.computeVertexNormals();
  const panes = new THREE.Mesh(paneGeo, materials.glass);
  panes.name = 'pyramid/panes';
  group.add(panes);

  // --- mullions ----------------------------------------------------------
  const bars = new THREE.Group();
  bars.name = 'pyramid/mullions';
  const { width, depth } = PYRAMID.mullion;
  for (const face of faces) {
    for (const line of faceLines(courses)) {
      const from = facePoint(face, line.from[0], line.from[1], courses);
      const to = facePoint(face, line.to[0], line.to[1], courses);
      const span = new THREE.Vector3().subVectors(to, from);
      const length = span.length();
      if (length < 1e-4) continue;
      // Break long members so the entrance opening can cut them.
      const pieces = Math.max(1, Math.ceil(length / 3));
      for (let piece = 0; piece < pieces; piece++) {
        const t0 = piece / pieces;
        const t1 = (piece + 1) / pieces;
        const mid = new THREE.Vector2(
          THREE.MathUtils.lerp(line.from[0], line.to[0], (t0 + t1) / 2),
          THREE.MathUtils.lerp(line.from[1], line.to[1], (t0 + t1) / 2),
        );
        if (outline.length > 0 && insideHole(outline, mid)) continue;
        const p0 = from.clone().addScaledVector(span, t0);
        const p1 = from.clone().addScaledVector(span, t1);
        addBar(bars, p0, p1, width, depth, face.normal, materials.mullion, 0.012);
      }
    }
  }

  // --- base kerb ---------------------------------------------------------
  if (opts.kerb !== false) {
    const kerbH = Math.max(0.14, Math.min(0.24, half * 0.013));
    const kerbW = Math.max(0.2, Math.min(0.42, half * 0.022));
    const granite = mat('stone.granite-grey');
    for (const face of faces) {
      const dir = new THREE.Vector3().subVectors(face.base1, face.base0).normalize();
      const outward = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
      if (outward.dot(face.normal) > 0) outward.negate();
      const centreLine = face.base0.clone().add(face.base1).multiplyScalar(0.5);
      const edgeLength = face.base1.distanceTo(face.base0);
      const gap = face.entrance ? half * 0.28 : 0;
      const runs: Array<[number, number]> = gap > 0 ? [[-edgeLength / 2, -gap], [gap, edgeLength / 2]] : [[-edgeLength / 2, edgeLength / 2]];
      for (const [t0, t1] of runs) {
        const p0 = centreLine.clone().addScaledVector(dir, t0).addScaledVector(outward, kerbW * 0.5);
        const p1 = centreLine.clone().addScaledVector(dir, t1).addScaledVector(outward, kerbW * 0.5);
        p0.y = baseY + kerbH * 0.5;
        p1.y = baseY + kerbH * 0.5;
        addBar(bars, p0, p1, kerbH, kerbW, outward, granite, kerbW * 0.5);
      }
    }
  }

  group.add(bars);
  return { group, counts };
}

/** One rectangular member between two points, aligned to a face normal. */
export function addBar(
  parent: THREE.Object3D,
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  width: number,
  depth: number,
  normal: THREE.Vector3,
  material: THREE.Material,
  proud: number,
): THREE.Object3D | null {
  const dir = new THREE.Vector3().subVectors(p1, p0);
  const length = dir.length();
  if (length < 1e-4) return null;
  const t = dir.clone().normalize();
  const n = normal.clone().normalize();
  n.addScaledVector(t, -n.dot(t)).normalize();
  // Right-handed: s x n = t. (t x n, n, t) has determinant -1, and setFromRotationMatrix on a
  // reflection silently produces a skew, which is how a 35 m kerb ends up standing on end.
  const s = new THREE.Vector3().crossVectors(n, t);
  const mesh = new THREE.Mesh(unitBox(), material);
  mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(s, n, t));
  mesh.position.copy(p0).add(p1).multiplyScalar(0.5).addScaledVector(n, proud);
  mesh.scale.set(width, depth, length);
  parent.add(mesh);
  return mesh;
}

let box: THREE.BoxGeometry | null = null;
function unitBox(): THREE.BoxGeometry {
  box ??= new THREE.BoxGeometry(1, 1, 1);
  return box;
}

/** Fail the build if the lattice stops matching the published pane counts. */
export function assertPaneCounts(): PyramidCounts {
  const main = pyramidCounts(PYRAMID.courses, PYRAMID.entranceFace);
  if (main.panes !== 673 || main.rhombi !== 603 || main.triangles !== 70) {
    throw new Error(
      'pyramid lattice is wrong: ' + main.rhombi + ' rhombi + ' + main.triangles + ' triangles = ' + main.panes +
        ', published 603 + 70 = 673',
    );
  }
  const satellite = pyramidCounts(PYRAMID.satellites.courses);
  if (satellite.rhombi !== 24 || satellite.triangles !== 16) {
    throw new Error('satellite lattice is wrong: expected 24 rhombi + 16 triangles a pyramid');
  }
  const inverted = pyramidCounts(PYRAMID.inverted.courses);
  if (inverted.rhombi !== 84 || inverted.triangles !== 28) {
    throw new Error('inverted pyramid lattice is wrong: expected 84 rhombi + 28 triangles');
  }
  return main;
}

/** Pane counts for the capture report, satellites included the way louvre.fr counts them. */
export function paneReport(): Record<string, unknown> {
  const main = pyramidCounts(PYRAMID.courses, PYRAMID.entranceFace);
  const satellite = pyramidCounts(PYRAMID.satellites.courses);
  const inverted = pyramidCounts(PYRAMID.inverted.courses);
  return {
    main: { rhombi: main.rhombi, triangles: main.triangles, panes: main.panes, perFace: main.perFace, courses: PYRAMID.courses },
    satellites: {
      each: { rhombi: satellite.rhombi, triangles: satellite.triangles, panes: satellite.panes, courses: PYRAMID.satellites.courses },
      allThree: { rhombi: satellite.rhombi * 3, triangles: satellite.triangles * 3 },
    },
    inverted: { rhombi: inverted.rhombi, triangles: inverted.triangles, panes: inverted.panes, courses: PYRAMID.inverted.courses },
    courtyardTotalIncludingSatellites: {
      rhombi: main.rhombi + satellite.rhombi * 3,
      triangles: main.triangles + satellite.triangles * 3,
      note: 'louvre.fr publishes 675 diamonds + 118 triangles for the courtyard, satellites included',
    },
  };
}
