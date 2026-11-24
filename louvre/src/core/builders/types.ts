import * as THREE from 'three';

/** A single instanced repetition: one unit geometry drawn at many transforms. */
export interface InstancedParts {
  unit: THREE.BufferGeometry;
  transforms: THREE.Matrix4[];
}

export type Part = THREE.BufferGeometry | InstancedParts;

/**
 * Builders return either a single BufferGeometry (the zone picks the material) or a record of
 * parts keyed by PALETTE material name, for the few that need two materials at once (glazed
 * windows, skylights, picture frames). Use `addParts` to place them.
 */
export type BuildParts = Record<string, Part>;

export function isInstanced(p: Part): p is InstancedParts {
  return (p as InstancedParts).unit !== undefined;
}

export interface Opening {
  /** Centre on the wall's X axis, metres from the wall centre. */
  x: number;
  width: number;
  /** Bottom of the opening above the wall base. Defaults 0. */
  sill?: number;
  /** Top of the opening above the wall base. */
  head: number;
  /** Semicircular head; the arch springs at `head - width / 2`. */
  arched?: boolean;
}
