import * as THREE from 'three';
import { colorOf, hexOf, type MaterialName } from './palette';
import { getTexture, type TextureKind } from './textures';

/**
 * The material library. Every surface is looked up by its palette name, never constructed inline,
 * so a zone cannot accidentally allocate a hundred nearly-identical materials (each one is a draw
 * call). Materials are cached by name + override, and every texture is procedural and shared.
 *
 * Rules builders rely on:
 *  - Every material uses vertex colours: baked ambient occlusion rides inside the geometry.
 *  - Every builder emits a `color` attribute (white x AO), even when it has no AO to bake.
 */
export interface MaterialSpec {
  texture?: TextureKind;
  roughness: number;
  metalness?: number;
  flatShading?: boolean;
  /** Tile size in metres; one texture instance per tile size. */
  tile?: number;
  /** Emissive lift for glass and light cards. */
  emissive?: number;
  opacity?: number;
  side?: THREE.Side;
}

const DEFAULTS: MaterialSpec = { roughness: 0.85, metalness: 0 };

const GLASS: MaterialSpec = { roughness: 0.06, opacity: 0.24, emissive: 0.55, side: THREE.DoubleSide };
const MARBLE: MaterialSpec = { texture: 'marble', roughness: 0.24, metalness: 0.03, tile: 2.6 };
const STONE: MaterialSpec = { texture: 'stone', roughness: 0.92, tile: 2.5 };
const PLASTER: MaterialSpec = { texture: 'plaster', roughness: 0.94, tile: 3 };
const GOLD: MaterialSpec = { texture: 'gold', roughness: 0.32, metalness: 0.85, tile: 0.7 };
const OAK: MaterialSpec = { roughness: 0.64, tile: 1.4 };

/** Per-material rendering choices, keyed by the palette names zones use. */
export const MATERIAL_SPECS: Record<string, MaterialSpec> = {
  // walls
  'wall.red-madder': { roughness: 0.88 },
  'wall.red-madder-deep': { roughness: 0.9 },
  'wall.midnight-blue': { roughness: 0.88 },
  'wall.ochre': { roughness: 0.9 },
  'wall.ochre-earth': { roughness: 0.92 },
  'wall.stone-grey': { ...STONE, roughness: 0.94 },
  'wall.slate-green': { roughness: 0.88 },
  'wall.ochre-light': { roughness: 0.9 },
  'wall.crimson-silk': { roughness: 0.78 },
  'wall.apollon-blue': { roughness: 0.86 },
  'wall.egypt-dark': { roughness: 0.92 },
  'wall.white-plaster': { ...PLASTER },
  'wall.stone-cream': { ...STONE },
  'wall.stone-limestone-warm': { ...STONE },

  // floors
  'floor.parquet-versailles': { texture: 'parquet', roughness: 0.5, tile: 2.4 },
  'floor.parquet-poitiers': { texture: 'parquet', roughness: 0.46, tile: 2.0 },
  'floor.marble-checker': { texture: 'marble', roughness: 0.22, metalness: 0.04, tile: 2.4 },
  'floor.stone-flag': { ...STONE, roughness: 0.88, tile: 2 },
  'floor.pave-granite': { texture: 'stone', roughness: 0.8, tile: 1.6 },
  'floor.hall-napoleon-stone': { ...STONE, roughness: 0.62 },

  // ceilings
  'ceiling.plaster-white': { ...PLASTER, roughness: 0.96 },
  'ceiling.cream-cove': { ...PLASTER },
  'ceiling.gold-leaf': { ...GOLD },
  'ceiling.glazed-skylight': { ...GLASS, roughness: 0.08 },

  // trim
  'trim.stone-limestone-warm': { ...STONE },
  'trim.gilt': { ...GOLD },
  'trim.marble-rouge': { ...MARBLE, roughness: 0.2 },
  'trim.wood-oak': { ...OAK },

  // stone
  'stone.limestone-warm': { ...STONE },
  'stone.limestone-pale': { ...STONE, roughness: 0.9 },
  'stone.granite-grey': { ...STONE, roughness: 0.8 },

  // gold
  'gold.leaf': { ...GOLD },
  'gold.bronze-tarnished': { roughness: 0.44, metalness: 0.8 },

  // glass
  'glass.pyramid-tint': { ...GLASS, roughness: 0.1 },
  'glass.skylight-clear': { ...GLASS },
  'glass.vitrine': { ...GLASS, roughness: 0.04, opacity: 0.14, emissive: 0.2 },

  // wood
  'wood.oak': { ...OAK },
  'wood.walnut': { ...OAK, roughness: 0.62 },
  'wood.gilt-frame': { ...GOLD },

  // marble
  'marble.rouge-royal': { ...MARBLE },
  'marble.blanc-carrare': { ...MARBLE, roughness: 0.22 },
  'marble.noir-marquina': { ...MARBLE, roughness: 0.18, metalness: 0.06 },
  'marble.vert-antique': { ...MARBLE, roughness: 0.2 },
  'marble.jaune-bresche': { ...MARBLE, roughness: 0.3 },
  'marble.gris-saint-beat': { ...MARBLE, roughness: 0.32 },
  'marble.pentelic': { ...MARBLE, roughness: 0.26 },
  'marble.portor': { ...MARBLE, roughness: 0.16 },

  // context
  'context.sky-day': { roughness: 1, emissive: 0.3, side: THREE.DoubleSide },
  'context.sky-dusk': { roughness: 1, emissive: 0.2, side: THREE.DoubleSide },
  'context.zinc-roof': { texture: 'zinc', roughness: 0.55, metalness: 0.6, tile: 1.2 },
  'context.slate-roof': { roughness: 0.7, metalness: 0.1 },
  'context.seine-water': { roughness: 0.12, metalness: 0.2 },

  // engine-only
  'app.canvas-placeholder': { roughness: 0.92 },
  'app.light-card': { roughness: 1, emissive: 1.4, side: THREE.DoubleSide },
};

const cache = new Map<string, THREE.MeshStandardMaterial>();

function resolveName(name: string): string {
  if (name in MATERIAL_SPECS || hexOf(name) !== '#808080' || name.startsWith('#')) return name;
  console.warn('[materials] unknown material "' + name + '"; using wall.white-plaster');
  return 'wall.white-plaster';
}

/** Get a cached material by palette name (for example 'wall.red-madder'). */
export function mat(name: MaterialName, override: Partial<MaterialSpec> = {}): THREE.MeshStandardMaterial {
  const key = resolveName(name);
  const spec: MaterialSpec = { ...DEFAULTS, ...(MATERIAL_SPECS[key] ?? {}), ...override };
  const cacheKey = key + '|' + JSON.stringify(override);
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const material = new THREE.MeshStandardMaterial({
    name: key,
    color: new THREE.Color().setHex(colorOf(key), THREE.SRGBColorSpace),
    roughness: spec.roughness,
    metalness: spec.metalness ?? 0,
    vertexColors: true,
    flatShading: spec.flatShading ?? false,
    side: spec.side ?? THREE.FrontSide,
  });
  if (spec.texture) {
    const tile = spec.tile ?? 2;
    material.map = getTexture(spec.texture, spec.texture === 'parquet' && key.includes('poitiers') ? 'b' : 'a', 1 / tile);
  }
  if (spec.opacity !== undefined && spec.opacity < 1) {
    material.transparent = true;
    material.opacity = spec.opacity;
    material.depthWrite = false;
  }
  if (spec.emissive) {
    material.emissive = material.color.clone().multiplyScalar(0.55);
    material.emissiveIntensity = spec.emissive;
  }
  material.needsUpdate = true;
  cache.set(cacheKey, material);
  return material;
}

/**
 * Outdoor override for metals. The palette's metalness values (zinc 0.6, gold 0.85) are right under
 * the museum's interior lighting, but with no environment map in the scene a high-metalness surface
 * has almost nothing to reflect and renders black. The exterior zone uses these instead:
 *
 *   addPart(g, mansardRoof({...}), 'context.zinc-roof')   // interior
 *   mesh.material = outdoorMat('context.zinc-roof')       // exterior
 */
export const OUTDOOR_METAL: Partial<MaterialSpec> = { metalness: 0.08, roughness: 0.62 };

/**
 * Gilt for indoor lighting with no environment map.
 *
 * The palette's gold is metalness 0.85-0.9, which is physically right and renders as coal here: a
 * metal has almost no diffuse response, and with only hemisphere and directional lights there is
 * nothing for it to reflect. Dropping the metalness restores the diffuse response that carries the
 * colour, which is what a viewer reads as gilt under museum light.
 *
 *   goldMat('gold.leaf')            // vault ribs, cornice enrichment
 *   goldMat('wood.gilt-frame')      // picture frames
 */
export const GILT_INTERIOR: Partial<MaterialSpec> = { metalness: 0.32, roughness: 0.42 };

/** Cached gilt material that reads as gold under ambient-only lighting. */
export function goldMat(name: MaterialName = 'gold.leaf', extra: Partial<MaterialSpec> = {}): THREE.MeshStandardMaterial {
  return mat(name, { ...GILT_INTERIOR, ...extra });
}

/** A metal material tuned for an exterior with no environment map. Cached like any other. */
export function outdoorMat(name: MaterialName, extra: Partial<MaterialSpec> = {}): THREE.MeshStandardMaterial {
  return mat(name, { ...OUTDOOR_METAL, ...extra });
}

/** Flat-shaded variant, for carved ornament where facets read as chisel work. */
export function flatMat(name: MaterialName, override: Partial<MaterialSpec> = {}): THREE.MeshStandardMaterial {
  return mat(name, { flatShading: true, roughness: 0.9, ...override });
}

export function materialCacheSize(): number {
  return cache.size;
}
