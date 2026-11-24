import * as THREE from 'three';
import { boxGeo } from '../../core/geom';
import { addPart } from '../../core/merge';
import { mat } from '../../core/materials';
import { wall } from '../../core/builders';

/**
 * The undercroft: the Denon approach and the Richelieu link, both at level -1.
 *
 * Low (4.5 m), stone, lit from the sides rather than from above — the opposite of the hall's
 * daylit void, which is what makes the descent read as going underground.
 */

const LINK_STEPS = 52;
const LINK_RUN = 0.82;

export const PASSAGE = {
  denon: { x0: 30, x1: 62, z0: 21, z1: 70.5, floorY: -9, ceilY: -4.5 },
  /** Joins the hall to the Denon passage; route.json's two footprints only touch at a corner. */
  vestibule: { x0: 22, x1: 30, z0: 21, z1: 30, floorY: -9, ceilY: -4.5 },
  link: { x0: -30, x1: -16, z0: -70, z1: -21, floorY: -9, ceilY: -4.5 },
} as const;

/** The Richelieu link's flight, shared with the courtyard so the paving opening lines up. */
export const LINK_STAIR = {
  steps: LINK_STEPS,
  run: LINK_RUN,
  rise: 9 / LINK_STEPS,
  start: PASSAGE.link.z1 - 0.6,
  end: PASSAGE.link.z1 - 0.6 - LINK_STEPS * LINK_RUN,
} as const;

/** The hole the flight leaves in the courtyard paving. */
export const LINK_SLOT = {
  x0: PASSAGE.link.x0,
  x1: PASSAGE.link.x1,
  z0: LINK_STAIR.end,
  z1: PASSAGE.link.z0,
} as const;

export interface PassageParts {
  denon: THREE.Group;
  vestibule: THREE.Group;
  link: THREE.Group;
}

const SIGN = (rotation: number): number => (rotation === Math.PI || rotation === Math.PI / 2 ? -1 : 1);

interface WallSpec {
  axis: 'x' | 'z';
  at: number;
  from: number;
  to: number;
  height: number;
  floorY: number;
  thickness: number;
  /** Rotation about Y; local +Z becomes the room-facing normal. */
  rotation: number;
  material?: string;
  openings?: Array<{ at: number; width: number; head?: number; sill?: number }>;
  /** Baked dimming for rooms below ground. */
  dim?: number;
}

function placeWall(parent: THREE.Object3D, spec: WallSpec): void {
  const mid = (spec.from + spec.to) / 2;
  const sign = SIGN(spec.rotation);
  const openings = (spec.openings ?? []).map((opening) => ({
    x: sign * (opening.at - mid),
    width: opening.width,
    head: opening.head ?? 2.7,
    sill: opening.sill,
  }));
  const mesh = new THREE.Mesh(
    dim(wall({ length: spec.to - spec.from, height: spec.height, thickness: spec.thickness, openings }), spec.dim ?? 1),
    mat(spec.material ?? 'wall.stone-cream'),
  );
  if (spec.axis === 'x') mesh.position.set(mid, spec.floorY, spec.at);
  else mesh.position.set(spec.at, spec.floorY, mid);
  mesh.rotation.y = spec.rotation;
  parent.add(mesh);
}

/**
 * Baked undercroft dimming. The engine has no shadows, so the sun and the hemisphere light reach
 * underground rooms at full strength; multiplying the vertex colours is how this project makes a
 * room read as below ground (the same mechanism the shared builders use for contact AO).
 */
function dim(geo: THREE.BufferGeometry, factor: number): THREE.BufferGeometry {
  const col = geo.attributes.color as THREE.BufferAttribute | undefined;
  if (!col) return geo;
  for (let i = 0; i < col.count; i++) {
    col.setXYZ(i, col.getX(i) * factor, col.getY(i) * factor, col.getZ(i) * factor);
  }
  col.needsUpdate = true;
  return geo;
}

/** A recessed niche with a glowing card: the passages are lit from the sides. */
function lightNiche(parent: THREE.Object3D, x: number, y: number, z: number, rotationY: number): void {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotationY;
  const recess = boxGeo(1.5, 1.5, 0.24);
  recess.translate(0, 0, 0.12);
  group.add(new THREE.Mesh(recess, mat('wall.stone-limestone-warm')));
  const card = boxGeo(1.22, 1.22, 0.05);
  card.translate(0, 0, 0.1);
  addPart(group, card, 'app.light-card');
  parent.add(group);
}

/** A skirting run along one side of a rectangular room. */
function skirting(parent: THREE.Object3D, axis: 'x' | 'z', at: number, from: number, to: number, y: number): void {
  const len = Math.abs(to - from);
  const geo = axis === 'z' ? boxGeo(0.07, 0.28, len) : boxGeo(len, 0.28, 0.07);
  geo.translate(axis === 'z' ? at : (from + to) / 2, y + 0.14, axis === 'z' ? (from + to) / 2 : at);
  addPart(parent, geo, 'marble.noir-marquina');
}

export function buildPassages(): PassageParts {
  const denon = new THREE.Group();
  denon.name = 'pyramid/passage-denon';
  const vestibule = new THREE.Group();
  vestibule.name = 'pyramid/vestibule-denon';
  const link = new THREE.Group();
  link.name = 'pyramid/passage-richelieu-link';

  // ---------------------------------------------------------------- Denon
  {
    const { x0, x1, z0, z1, floorY, ceilY } = PASSAGE.denon;
    const w = x1 - x0;
    const d = z1 - z0;
    const height = ceilY - floorY;

    const floorGeo = dim(boxGeo(w, 0.35, d), 0.34);
    floorGeo.translate((x0 + x1) / 2, floorY - 0.175, (z0 + z1) / 2);
    denon.add(new THREE.Mesh(floorGeo, mat('floor.hall-napoleon-stone')));

    const ceilGeo = dim(boxGeo(w, 0.3, d), 0.4);
    ceilGeo.translate((x0 + x1) / 2, ceilY + 0.15, (z0 + z1) / 2);
    denon.add(new THREE.Mesh(ceilGeo, mat('ceiling.plaster-white')));

    // Transverse beams and slot lights: a low ceiling needs articulation.
    for (let z = z0 + 4; z < z1 - 1; z += 6) {
      const beam = dim(boxGeo(w, 0.42, 0.5), 0.55);
      beam.translate((x0 + x1) / 2, ceilY - 0.21, z);
      addPart(denon, beam, 'ceiling.plaster-white');
      const slot = boxGeo(2.6, 0.06, 0.16);
      slot.translate((x0 + x1) / 2, ceilY - 0.44, z + 1.6);
      addPart(denon, slot, 'app.light-card');
    }

    placeWall(denon, {
      axis: 'z',
      at: x0,
      from: z0,
      to: z1,
      height,
      floorY,
      thickness: 0.5,
      rotation: Math.PI / 2,
      openings: [{ at: 25.5, width: 8.6, head: 4.0 }],
      dim: 0.46,
    });
    placeWall(denon, { axis: 'z', at: x1, from: z0, to: z1, height, floorY, thickness: 0.5, rotation: -Math.PI / 2, dim: 0.5 });
    placeWall(denon, { axis: 'x', at: z0, from: x0, to: x1, height, floorY, thickness: 0.5, rotation: 0, dim: 0.46 });
    placeWall(denon, {
      axis: 'x',
      at: z1 - 0.25,
      from: x0,
      to: x1,
      height,
      floorY,
      thickness: 0.5,
      rotation: Math.PI,
      openings: [{ at: 46, width: 8.2, head: 4.0 }],
      dim: 0.46,
    });

    for (let z = z0 + 6; z < z1 - 4; z += 9) {
      lightNiche(denon, x0 + 0.14, floorY + 2.3, z, Math.PI / 2);
      lightNiche(denon, x1 - 0.14, floorY + 2.3, z + 4, -Math.PI / 2);
    }

    // The bright band at the far end: the Daru staircase begins past that door.
    const glow = boxGeo(6.4, 0.08, 0.9);
    glow.translate(46, ceilY - 0.58, z1 - 1.1);
    addPart(denon, glow, 'app.light-card');

    // Pilasters and a plinth: a bare box does not read as an undercroft.
    for (const [x, inward] of [
      [x0 + 0.2, 1],
      [x1 - 0.2, -1],
    ] as const) {
      for (let z = z0 + 3.2; z < z1 - 2; z += 5.6) {
        const pilaster = dim(boxGeo(0.5, 3.4, 0.34), 0.58);
        pilaster.translate(x, floorY + 1.7, z);
        addPart(denon, pilaster, 'wall.stone-cream');
        void inward;
      }
      const plinth = dim(boxGeo(0.34, 0.62, d - 0.8), 0.4);
      plinth.translate(x + inward * 0.0, floorY + 0.31, (z0 + z1) / 2);
      addPart(denon, plinth, 'stone.granite-grey');
    }

    skirting(denon, 'z', x0 + 0.3, z0 + 0.6, z1, floorY);
    skirting(denon, 'z', x1 - 0.3, z0 + 0.6, z1, floorY);
    skirting(denon, 'x', z0 + 0.3, x0, x1, floorY);
  }

  // ------------------------------------------------------------ Vestibule
  {
    const { x0, x1, z0, z1, floorY, ceilY } = PASSAGE.vestibule;
    const height = ceilY - floorY;

    const floorGeo = dim(boxGeo(x1 - x0, 0.35, z1 - z0), 0.4);
    floorGeo.translate((x0 + x1) / 2, floorY - 0.175, (z0 + z1) / 2);
    vestibule.add(new THREE.Mesh(floorGeo, mat('floor.hall-napoleon-stone')));
    const ceilGeo = dim(boxGeo(x1 - x0, 0.3, z1 - z0), 0.48);
    ceilGeo.translate((x0 + x1) / 2, ceilY + 0.15, (z0 + z1) / 2);
    vestibule.add(new THREE.Mesh(ceilGeo, mat('ceiling.plaster-white')));

    placeWall(vestibule, { axis: 'z', at: x0, from: z0, to: z1, height, floorY, thickness: 0.5, rotation: Math.PI / 2, dim: 0.52 });
    placeWall(vestibule, { axis: 'x', at: z1, from: x0, to: x1, height, floorY, thickness: 0.5, rotation: Math.PI, dim: 0.52 });

    const glow = boxGeo(1.4, 0.08, 6.4);
    glow.translate((x0 + x1) / 2, ceilY - 0.42, (z0 + z1) / 2);
    addPart(vestibule, glow, 'app.light-card');
  }

  // ------------------------------------------------------- Richelieu link
  {
    const { x0, x1, z0, z1, floorY, ceilY } = PASSAGE.link;
    const height = ceilY - floorY;
    const { steps, rise, run, start, end } = LINK_STAIR;

    const floorGeo = dim(boxGeo(x1 - x0, 0.35, z1 - start), 0.8);
    floorGeo.translate((x0 + x1) / 2, floorY - 0.175, (start + z1) / 2);
    link.add(new THREE.Mesh(floorGeo, mat('floor.hall-napoleon-stone')));

    for (let i = 0; i < steps; i++) {
      const tread = dim(boxGeo(x1 - x0 - 0.9, rise, run + 0.02), 0.92);
      tread.translate((x0 + x1) / 2, floorY + rise * (i + 0.5), start - run * (i + 0.5));
      addPart(link, tread, 'stone.limestone-warm');
      const nosing = dim(boxGeo(x1 - x0 - 0.9, 0.03, 0.05), 0.95);
      nosing.translate((x0 + x1) / 2, floorY + rise * (i + 1) + 0.015, start - run * (i + 1));
      addPart(link, nosing, 'stone.limestone-warm');
    }

    // Landing at paving level, filling the opening in the courtyard.
    const landing = dim(boxGeo(x1 - x0, 0.3, Math.abs(end - z0)), 0.95);
    landing.translate((x0 + x1) / 2, -0.15, (end + z0) / 2);
    addPart(link, landing, 'stone.limestone-warm');

    // Sloped soffit following the flight, so the ceiling clears the climb.
    {
      const length = Math.abs(start - end);
      const slope = Math.atan2(9, length);
      const slab = dim(boxGeo(x1 - x0 + 1, 0.34, Math.hypot(length, 9) + 0.6), 0.72);
      const mesh = new THREE.Mesh(slab, mat('ceiling.plaster-white'));
      mesh.position.set((x0 + x1) / 2, (floorY + 0) / 2 + 4.5, (start + end) / 2);
      mesh.rotation.x = -slope;
      link.add(mesh);
    }

    placeWall(link, { axis: 'z', at: x0, from: z0, to: z1, height, floorY, thickness: 0.5, rotation: Math.PI / 2, dim: 0.86 });
    placeWall(link, { axis: 'z', at: x1, from: z0, to: z1, height, floorY, thickness: 0.5, rotation: -Math.PI / 2, dim: 0.86 });
    placeWall(link, { axis: 'x', at: z0, from: x0, to: x1, height, floorY, thickness: 0.5, rotation: 0, dim: 0.88 });
    // Back wall of the stair well, above the paving line.
    placeWall(link, { axis: 'x', at: z0, from: x0, to: x1, height: 1.3, floorY: 0, thickness: 0.5, rotation: 0 });

    // Parapets down the flight, and railings where the stair breaks the paving.
    for (const x of [x0 + 0.45, x1 - 0.45]) {
      for (let i = 0; i < steps; i += 2) {
        const piece = dim(boxGeo(0.22, 1.0, run * 2 + 0.02), 0.86);
        piece.translate(x, floorY + rise * (i + 1) + 0.5, start - run * (i + 1));
        addPart(link, piece, 'stone.limestone-warm');
      }
    }
    for (const x of [x0 + 0.22, x1 - 0.22]) {
      const rail = dim(boxGeo(0.12, 1.05, Math.abs(z0 - end)), 0.84);
      rail.translate(x, 0.52, (end + z0) / 2);
      addPart(link, rail, 'stone.limestone-warm');
    }

    for (let z = z1 - 6; z > z0 + 6; z -= 9) {
      const lift = (z1 - z) * 0.18;
      lightNiche(link, x0 + 0.14, floorY + 2.1 + lift, z, Math.PI / 2);
      lightNiche(link, x1 - 0.14, floorY + 2.1 + lift, z - 4, -Math.PI / 2);
    }
  }

  return { denon, vestibule, link };
}
