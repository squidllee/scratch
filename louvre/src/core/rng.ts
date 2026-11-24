/**
 * Seeded PRNG. Everything procedural in the project draws from this and never from Math.random
 * (scripts/check.mjs fails the build if Math.random appears in src/).
 */
export interface Rng {
  /** Uniform float in [0, 1). */
  (): number;
  range(min: number, max: number): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  chance(p: number): boolean;
  pick<T>(items: readonly T[]): T;
  /** Approximately normal, mean 0, sd 1. */
  gauss(): number;
  /** A child generator derived from this seed and a label; independent of how many values this one has drawn. */
  fork(label: string | number): Rng;
}

function hashString(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

export function rng(seed: number | string): Rng {
  const seedKey = String(seed);
  let a = typeof seed === 'number' ? seed >>> 0 : hashString(seedKey);
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const r = next as Rng;
  r.range = (min, max) => min + (max - min) * next();
  r.int = (min, max) => min + Math.floor(next() * (max - min + 1));
  r.chance = (p) => next() < p;
  r.pick = (items) => items[Math.floor(next() * items.length)] as never;
  r.gauss = () => {
    let s = 0;
    for (let i = 0; i < 6; i++) s += next();
    return (s - 3) * 1.4142;
  };
  r.fork = (label) => rng(seedKey + '/' + label);
  return r;
}
