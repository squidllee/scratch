/**
 * Texture accounting for the artwork library.
 *
 * Every canvas this library turns into a GPU texture is registered here, whether it is a painted
 * surface from `paint/` or a relief face from `sculpt/`. The budget report reads this ledger, and
 * the capture harness's own texture counter (core/textures.ts) does not see these because they are
 * per-work, not per-material-tile.
 */
import type * as THREE from 'three';

export interface TextureRecord {
  id: string;
  width: number;
  height: number;
  bytes: number;
  kind: 'painting' | 'relief';
}

const ledger = new Map<string, TextureRecord>();

export function recordTexture(id: string, width: number, height: number, kind: TextureRecord['kind']): void {
  ledger.set(id, { id, width, height, bytes: width * height * 4 * 1.34, kind });
}

export function textureLedger(): TextureRecord[] {
  return [...ledger.values()];
}

export function textureBytes(): number {
  let total = 0;
  for (const rec of ledger.values()) total += rec.bytes;
  return total;
}

const materials = new Map<string, THREE.MeshStandardMaterial>();

/** One material per work id, so two placements of the same work share one texture. */
export function cachedMaterial(id: string, make: () => THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  const hit = materials.get(id);
  if (hit) return hit;
  const made = make();
  materials.set(id, made);
  return made;
}

export function hasMaterial(id: string): boolean {
  return materials.has(id);
}
