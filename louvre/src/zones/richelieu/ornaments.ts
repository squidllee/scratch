import * as THREE from 'three';
import { boxGeo, mergeAll, quadGeo, smoothstep } from '../../core/geom';
import { addPart, addParts } from '../../core/merge';
import { cornice } from '../../core/builders';

/**
 * The ornament the Napoleon III apartments are worth spending triangles on: a crystal chandelier
 * on a gilt-bronze frame, wall sconces, gilt consoles, and mirror frames.
 *
 * Nothing here is a light source. The flames are emissive cards (`app.light-card`) and every
 * surface that would be lit by them has its warm falloff baked into vertex colours by its room.
 */

/** A tube along a polyline, as boxes. Cheap, faceted, and right for gilt bronze at 2 m. */
function tube(points: Array<[number, number, number]>, radius: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i] as [number, number, number];
    const b = points[i + 1] as [number, number, number];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const dz = b[2] - a[2];
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-4) continue;
    const box = boxGeo(radius * 2, radius * 2, len + radius);
    const m = new THREE.Matrix4().lookAt(new THREE.Vector3(0, 0, 0), new THREE.Vector3(-dx, -dy, -dz), new THREE.Vector3(0, 1, 0));
    const q = new THREE.Quaternion().setFromRotationMatrix(m);
    box.applyQuaternion(q);
    box.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    parts.push(box);
  }
  return mergeAll(parts);
}

/**
 * Crystal beads as one instanced draw call.
 *
 * The instances are placed in WORLD space on purpose: `mergeByMaterial` re-parents an InstancedMesh
 * to the merged room group without its old parent's transform, so an instanced part built inside a
 * transformed sub-group would collapse onto the world origin.
 */
function placeBeads(
  parent: THREE.Object3D,
  ring: Array<[number, number, number]>,
  size: number,
  at: readonly [number, number, number],
  rotationY = 0,
): void {
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  const transforms = ring.map(([x, y, z]) => {
    const m = new THREE.Matrix4().makeScale(1, 1.7, 1);
    m.setPosition(at[0] + x * cos + z * sin, at[1] + y, at[2] - x * sin + z * cos);
    return m;
  });
  addPart(parent, { unit: new THREE.OctahedronGeometry(size, 0), transforms }, 'glass.vitrine');
}

export interface ChandelierOptions {
  arms: number;
  radius: number;
  /** Distance from the ceiling rose to the bottom finial. */
  drop: number;
}

/** Hang a crystal chandelier from `at` (the ceiling), descending `drop` metres. */
export function addChandelier(parent: THREE.Object3D, at: readonly [number, number, number], o: ChandelierOptions): void {
  const g = new THREE.Group();
  const drop = o.drop;
  const R = o.radius;

  const stem = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.02, 0),
      new THREE.Vector2(0.09, -0.04),
      new THREE.Vector2(0.16, -drop * 0.18),
      new THREE.Vector2(0.07, -drop * 0.34),
      new THREE.Vector2(0.19, -drop * 0.52),
      new THREE.Vector2(0.08, -drop * 0.7),
      new THREE.Vector2(0.02, -drop * 0.86),
    ],
    10,
  );
  addPart(g, stem, 'trim.gilt');

  // The bowl of the body, where the arms gather.
  const bowl = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.02, 0),
      new THREE.Vector2(R * 0.36, 0.04),
      new THREE.Vector2(R * 0.42, -0.08),
      new THREE.Vector2(R * 0.2, -0.2),
      new THREE.Vector2(0.02, -0.26),
    ],
    14,
  );
  bowl.translate(0, -drop * 0.52, 0);
  addPart(g, bowl, 'trim.gilt');

  const armParts: THREE.BufferGeometry[] = [];
  const flameParts: THREE.BufferGeometry[] = [];
  const candleParts: THREE.BufferGeometry[] = [];
  const panParts: THREE.BufferGeometry[] = [];
  const beads: Array<[number, number, number]> = [];
  const armY = -drop * 0.52;
  const tipY = -drop * 0.3;

  for (let i = 0; i < o.arms; i++) {
    const a = (i / o.arms) * Math.PI * 2;
    const sx = Math.sin(a);
    const sz = Math.cos(a);
    const pts: Array<[number, number, number]> = [
      [sx * R * 0.1, armY, sz * R * 0.1],
      [sx * R * 0.5, armY - 0.06, sz * R * 0.5],
      [sx * R * 0.92, armY + 0.1, sz * R * 0.92],
      [sx * R, tipY, sz * R],
    ];
    armParts.push(tube(pts, 0.022));

    // Drip pan, candle, flame.
    const pan = new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.02, 0),
        new THREE.Vector2(0.11, 0.01),
        new THREE.Vector2(0.13, 0.05),
        new THREE.Vector2(0.02, 0.05),
      ],
      10,
    );
    pan.translate(sx * R, tipY, sz * R);
    panParts.push(pan);
    const candle = new THREE.CylinderGeometry(0.032, 0.036, 0.26, 8);
    candle.translate(sx * R, tipY + 0.18, sz * R);
    candleParts.push(candle);
    const flame = quadGeo(
      [sx * R - 0.035, tipY + 0.32, sz * R],
      [sx * R + 0.035, tipY + 0.32, sz * R],
      [sx * R + 0.035, tipY + 0.42, sz * R],
      [sx * R - 0.035, tipY + 0.42, sz * R],
      [[0, 0], [0.07, 0], [0.07, 0.1], [0, 0.1]],
    );
    flameParts.push(flame);

    // Crystal swags: three drops under each arm and a ring around the widest point.
    for (let k = 1; k <= 3; k++) {
      const t = 0.35 + k * 0.17;
      const sag = 0.1 + k * 0.06;
      beads.push([sx * R * (0.25 + t * 0.7), armY - sag, sz * R * (0.25 + t * 0.7)]);
    }
    for (let k = 0; k < 5; k++) {
      const b = a + (k / 5) * ((Math.PI * 2) / o.arms);
      beads.push([Math.sin(b) * R * 0.78, armY - 0.26 - ((k % 3) * 0.03 + (i % 2) * 0.02), Math.cos(b) * R * 0.78]);
    }
  }
  addPart(g, mergeAll(armParts), 'trim.gilt');
  addPart(g, mergeAll(panParts), 'trim.gilt');
  addPart(g, mergeAll(candleParts), 'ceiling.plaster-white');
  addPart(g, mergeAll(flameParts), 'app.light-card');

  // Chains of crystal hanging from the crown down into the bowl.
  const chain: Array<[number, number, number]> = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r = 0.12 + (i % 2) * 0.05;
    chain.push([Math.sin(a) * r, -drop * 0.18 - (i % 3) * 0.09, Math.cos(a) * r]);
  }
  g.position.set(at[0], at[1], at[2]);
  parent.add(g);
  placeBeads(parent, beads, 0.028, at);
  placeBeads(parent, chain, 0.022, at);
}

/** A two-arm gilt sconce, built facing +Z from the wall plane. */
export function addSconce(parent: THREE.Object3D, at: readonly [number, number, number], rotationY: number): void {
  const g = new THREE.Group();
  const body = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.02, 0),
      new THREE.Vector2(0.13, 0.03),
      new THREE.Vector2(0.1, 0.14),
      new THREE.Vector2(0.05, 0.24),
      new THREE.Vector2(0.02, 0.42),
    ],
    10,
  );
  body.rotateX(Math.PI / 2);
  addPart(g, body, 'trim.gilt');
  const arms: THREE.BufferGeometry[] = [];
  const candles: THREE.BufferGeometry[] = [];
  const flames: THREE.BufferGeometry[] = [];
  const beads: Array<[number, number, number]> = [];
  for (const side of [-1, 1]) {
    arms.push(tube([
      [side * 0.06, 0, 0.06],
      [side * 0.22, 0.04, 0.24],
      [side * 0.3, 0.14, 0.34],
    ], 0.018));
    const candle = new THREE.CylinderGeometry(0.026, 0.03, 0.2, 8);
    candle.translate(side * 0.3, 0.24, 0.34);
    candles.push(candle);
    flames.push(quadGeo(
      [side * 0.3 - 0.03, 0.36, 0.34],
      [side * 0.3 + 0.03, 0.36, 0.34],
      [side * 0.3 + 0.03, 0.44, 0.34],
      [side * 0.3 - 0.03, 0.44, 0.34],
      [[0, 0], [0.06, 0], [0.06, 0.08], [0, 0.08]],
    ));
    for (let k = 0; k < 3; k++) beads.push([side * 0.16, 0.02 - k * 0.07, 0.14 + k * 0.03]);
  }
  addPart(g, mergeAll(arms), 'trim.gilt');
  addPart(g, mergeAll(candles), 'ceiling.plaster-white');
  addPart(g, mergeAll(flames), 'app.light-card');
  g.position.set(at[0], at[1], at[2]);
  g.rotation.y = rotationY;
  parent.add(g);
  placeBeads(parent, beads, 0.02, at, rotationY);
}

/** A gilt console table with a marble top, standing on the floor at `at`. */
export function addConsole(parent: THREE.Object3D, at: readonly [number, number, number], rotationY: number, width = 1.9): void {
  const g = new THREE.Group();
  const top = boxGeo(width, 0.06, 0.55);
  top.translate(0, 0.86, 0);
  addPart(g, top, 'marble.rouge-royal');
  const apron = boxGeo(width - 0.18, 0.16, 0.42);
  apron.translate(0, 0.74, 0);
  addPart(g, apron, 'trim.gilt');
  const legs: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.LatheGeometry(
        [
          new THREE.Vector2(0.055, 0),
          new THREE.Vector2(0.075, 0.06),
          new THREE.Vector2(0.04, 0.2),
          new THREE.Vector2(0.06, 0.42),
          new THREE.Vector2(0.035, 0.6),
          new THREE.Vector2(0.05, 0.72),
        ],
        6,
      );
      leg.translate(sx * (width / 2 - 0.2), 0, sz * 0.16);
      legs.push(leg);
    }
  }
  addPart(g, mergeAll(legs), 'trim.gilt');
  const crest = cornice({ length: width - 0.2, height: 0.12, projection: 0.06, dentils: false });
  crest.translate(0, 0.66, 0.16);
  addPart(g, crest, 'trim.gilt');
  g.position.set(at[0], at[1], at[2]);
  g.rotation.y = rotationY;
  parent.add(g);
}

export interface MirrorOptions {
  width: number;
  height: number;
  /** Base of the mirror above the floor plane the frame is measured from. */
  sill: number;
}

/** A mirror in a gilt frame, built facing +Z; the glass is a tinted, slightly emissive panel. */
export function addMirror(parent: THREE.Object3D, at: readonly [number, number, number], rotationY: number, o: MirrorOptions): void {
  const g = new THREE.Group();
  const { width, height } = o;
  const border = 0.24;
  const parts: THREE.BufferGeometry[] = [];
  const rail = (len: number, x: number, y: number, ry: number): void => {
    const b = boxGeo(len, border, 0.14);
    b.rotateY(ry);
    b.translate(x, y, 0.06);
    parts.push(b);
  };
  rail(width + border * 2, 0, height + border / 2, 0);
  rail(width + border * 2, 0, -border / 2, 0);
  rail(height, -width / 2 - border / 2, height / 2, Math.PI / 2);
  rail(height, width / 2 + border / 2, height / 2, Math.PI / 2);
  const frame = mergeAll(parts);
  const pos = frame.attributes.position;
  const col = frame.attributes.color as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const a = 0.72 + 0.28 * smoothstep(0, 0.12, pos.getZ(i));
    col.setXYZ(i, a, a, a);
  }
  col.needsUpdate = true;
  addPart(g, frame, 'trim.gilt');
  const glass = quadGeo(
    [-width / 2, 0, 0.02],
    [width / 2, 0, 0.02],
    [width / 2, height, 0.02],
    [-width / 2, height, 0.02],
    [[0, 0], [width, 0], [width, height], [0, height]],
  );
  addPart(g, glass, 'glass.vitrine');
  g.position.set(at[0], at[1], at[2]);
  g.rotation.y = rotationY;
  parent.add(g);
}

/** A gilt frame moulding around a red silk panel; returns the parts keyed by material. */
export function addPanel(
  parent: THREE.Object3D,
  at: readonly [number, number, number],
  rotationY: number,
  o: { width: number; height: number; material: string; frame?: string },
): void {
  const g = new THREE.Group();
  const silk = quadGeo(
    [-o.width / 2, 0, 0.05],
    [o.width / 2, 0, 0.05],
    [o.width / 2, o.height, 0.05],
    [-o.width / 2, o.height, 0.05],
    [[0, 0], [o.width, 0], [o.width, o.height], [0, o.height]],
  );
  addPart(g, silk, o.material);
  const border = 0.11;
  const parts: THREE.BufferGeometry[] = [];
  const rail = (len: number, x: number, y: number, ry: number): void => {
    const b = boxGeo(len, border, 0.09);
    b.rotateY(ry);
    b.translate(x, y, 0.09);
    parts.push(b);
  };
  rail(o.width + border * 2, 0, o.height + border / 2, 0);
  rail(o.width + border * 2, 0, -border / 2, 0);
  rail(o.height, -o.width / 2 - border / 2, o.height / 2, Math.PI / 2);
  rail(o.height, o.width / 2 + border / 2, o.height / 2, Math.PI / 2);
  addPart(g, mergeAll(parts), o.frame ?? 'trim.gilt');
  g.position.set(at[0], at[1], at[2]);
  g.rotation.y = rotationY;
  parent.add(g);
}

export { addParts };
