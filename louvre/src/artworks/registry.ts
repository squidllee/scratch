/**
 * The artwork registry: id -> factory, and the one `createArtwork(def, ctx)` entry point.
 *
 * Unknown ids return `null` rather than throwing, so a zone that names an artwork the library does
 * not have degrades to the core placeholder instead of taking the museum down.
 */
import * as THREE from 'three';
import type { Rng } from '../core/rng';
import { ARTWORK_BY_ID, ARTWORK_IDS, type ArtworkDef } from './catalog';
import type { ArtworkContext, ArtworkSpec } from './types';
import { buildPainting } from './paint/index';
import { HUMAN_WORKS } from './sculpt/figures';
import { ANIMAL_WORKS } from './sculpt/animals';
import { OBJECT_WORKS } from './sculpt/objects';

const SCULPTORS: Record<string, (r: Rng) => THREE.Group> = {
  ...HUMAN_WORKS,
  ...ANIMAL_WORKS,
  ...OBJECT_WORKS,
};

/** Works whose built object already carries the spec's dimensions, including its case. */
const NO_FIT = new Set(['crown-of-louis-xv']);

/**
 * Scale a sculpture to the real height in the spec and put its base on the origin, so a zone can
 * drop it at the floor point without arithmetic. Widths follow the model's proportions.
 */
function fitToHeight(obj: THREE.Group, targetHeight: number): THREE.Group {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const h = box.max.y - box.min.y;
  if (!(h > 0.01)) return obj;
  const k = targetHeight / h;
  const cx = (box.min.x + box.max.x) / 2;
  const cz = (box.min.z + box.max.z) / 2;
  obj.scale.multiplyScalar(k);
  obj.position.set(-cx * k, -box.min.y * k, -cz * k);
  // The wrapper stays at the origin with no rotation, so `placeArtwork` still puts the work at the
  // spec's position: an artwork's origin is the point it touches the floor or wall.
  const wrap = new THREE.Group();
  wrap.add(obj);
  return wrap;
}

/** Every id this library can build. */
export const FACTORY_IDS: readonly string[] = ARTWORK_IDS;

/** True when the library has real art for this id. */
export function hasArtwork(id: string): boolean {
  return ARTWORK_BY_ID.has(id);
}

/** The catalog entry for an id, or undefined. */
export function artworkDef(id: string): ArtworkDef | undefined {
  return ARTWORK_BY_ID.get(id);
}

/**
 * Build one artwork at the origin, facing +Z.
 *
 * Paintings: the canvas centre sits at the origin on the wall plane, the frame extends out in +Z.
 * Sculptures: the base contact point is the origin, the work rises in +Y.
 * Returns null for an unknown id; it never throws.
 */
export function createArtwork(def: ArtworkSpec, ctx: ArtworkContext): THREE.Object3D | null {
  const entry = ARTWORK_BY_ID.get(def.id);
  if (!entry) return null;
  const target: ArtworkDef = { ...entry, sizeCm: def.sizeCm };
  const r = ctx.rng;
  let obj: THREE.Group;
  if (SCULPTORS[entry.build]) {
    obj = SCULPTORS[entry.build](r);
    if (!NO_FIT.has(entry.id)) fitToHeight(obj, def.sizeCm[1] / 100);
  } else if (entry.kind === 'painting' || entry.kind === 'ceiling-painting') {
    obj = buildPainting(target, r);
  } else {
    return null;
  }
  obj.name = 'artwork/' + entry.id;
  obj.userData.artworkId = entry.id;
  obj.userData.artworkKind = entry.kind;
  return obj;
}

/** Register every work into the core artwork library, so zones place by id and get real art. */
export function registerAll(register: (id: string, factory: (spec: ArtworkSpec, ctx: ArtworkContext) => THREE.Object3D) => void): void {
  for (const id of ARTWORK_IDS) {
    register(id, (spec, ctx) => {
      const built = createArtwork({ ...spec, id }, ctx);
      if (built) return built;
      throw new Error('artworks: failed to build "' + id + '"');
    });
  }
}
