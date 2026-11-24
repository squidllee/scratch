export type Vec2 = readonly [number, number];
export type Vec3 = readonly [number, number, number];

/** Axis-aligned box in world metres. */
export interface Aabb {
  min: Vec3;
  max: Vec3;
}

export const EYE_HEIGHT = 1.65;
export const PLAYER_RADIUS = 0.3;

export const aabbContains = (b: Aabb, x: number, y: number, z: number, pad = 0): boolean =>
  x >= b.min[0] - pad && x <= b.max[0] + pad &&
  y >= b.min[1] - pad && y <= b.max[1] + pad &&
  z >= b.min[2] - pad && z <= b.max[2] + pad;

export const aabbCentre = (b: Aabb): Vec3 => [
  (b.min[0] + b.max[0]) / 2,
  (b.min[1] + b.max[1]) / 2,
  (b.min[2] + b.max[2]) / 2,
];

export const aabbVolume = (b: Aabb): number =>
  (b.max[0] - b.min[0]) * (b.max[1] - b.min[1]) * (b.max[2] - b.min[2]);
