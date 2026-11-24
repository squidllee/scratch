import * as THREE from 'three';
import { colorOf } from '../../core/palette';
import { rng, type Rng } from '../../core/rng';

/**
 * Materials this zone has to own.
 *
 * Everything else comes from the palette through `mat()`. These four cannot: glass has to carry a
 * reflection environment (the palette's glass is a flat tint), and the palette has no metal, water
 * or foliage. `scripts/check.mjs` still governs them — every texture is drawn in code at load
 * time, from the seeded RNG, and nothing is fetched.
 */

const CUBE_SIZE = 128;

/** One face of the sky cube: a vertical gradient with a warm horizon and a soft cloud break. */
function skyFace(kind: 'side' | 'top' | 'bottom', seed: string): HTMLCanvasElement {
  const r: Rng = rng('pyramid/sky/' + kind + '/' + seed);
  const canvas = document.createElement('canvas');
  canvas.width = CUBE_SIZE;
  canvas.height = CUBE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable; cannot build the reflection sky');

  if (kind === 'top') {
    ctx.fillStyle = '#6f88a8';
    ctx.fillRect(0, 0, CUBE_SIZE, CUBE_SIZE);
    ctx.globalAlpha = 0.18;
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = '#c8d3df';
      const w = r.range(6, 34);
      ctx.beginPath();
      ctx.ellipse(r.range(0, CUBE_SIZE), r.range(0, CUBE_SIZE), w, w * 0.45, r.range(0, 3), 0, Math.PI * 2);
      ctx.fill();
    }
    return canvas;
  }

  if (kind === 'bottom') {
    const grad = ctx.createLinearGradient(0, 0, 0, CUBE_SIZE);
    grad.addColorStop(0, '#8d8677');
    grad.addColorStop(1, '#4a4740');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CUBE_SIZE, CUBE_SIZE);
    return canvas;
  }

  // Side faces: zenith at the top of the image, horizon at the middle, ground below.
  const grad = ctx.createLinearGradient(0, 0, 0, CUBE_SIZE);
  grad.addColorStop(0, '#6f88a8');
  grad.addColorStop(0.34, '#a8bccd');
  grad.addColorStop(0.5, '#ded8c9');
  grad.addColorStop(0.56, '#b9b2a2');
  grad.addColorStop(1, '#5f5b53');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CUBE_SIZE, CUBE_SIZE);

  // Clouds: horizontal smears just above the horizon, where a glass roof picks them up.
  ctx.globalAlpha = 0.22;
  for (let i = 0; i < 18; i++) {
    ctx.fillStyle = r.chance(0.6) ? '#f2eee4' : '#c9cfd6';
    const y = r.range(4, CUBE_SIZE * 0.42);
    ctx.beginPath();
    ctx.ellipse(r.range(0, CUBE_SIZE), y, r.range(10, 46), r.range(2, 8), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // A low sun: one warm blob per face, offset so the four faces are not identical.
  ctx.globalAlpha = 0.5;
  const sun = ctx.createRadialGradient(CUBE_SIZE * 0.72, CUBE_SIZE * 0.4, 2, CUBE_SIZE * 0.72, CUBE_SIZE * 0.4, CUBE_SIZE * 0.3);
  sun.addColorStop(0, '#fff4dd');
  sun.addColorStop(1, 'rgba(255,244,221,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, CUBE_SIZE, CUBE_SIZE);
  return canvas;
}

let skyCube: THREE.CubeTexture | null = null;

/** The reflection environment for glass and water: a Paris sky with a warm horizon. */
export function reflectionSky(): THREE.CubeTexture {
  if (skyCube) return skyCube;
  const faces = [
    skyFace('side', 'px'),
    skyFace('side', 'nx'),
    skyFace('top', 'py'),
    skyFace('bottom', 'ny'),
    skyFace('side', 'pz'),
    skyFace('side', 'nz'),
  ];
  const cube = new THREE.CubeTexture(faces as unknown as HTMLImageElement[]);
  cube.colorSpace = THREE.SRGBColorSpace;
  cube.needsUpdate = true;
  skyCube = cube;
  return cube;
}

interface LocalMaterial {
  material: THREE.MeshStandardMaterial;
  dispose(): void;
}

function local(name: string, spec: THREE.MeshStandardMaterialParameters, texture?: THREE.Texture): LocalMaterial {
  const material = new THREE.MeshStandardMaterial({
    name,
    vertexColors: true,
    ...spec,
  });
  return {
    material,
    dispose(): void {
      material.dispose();
      texture?.dispose();
    },
  };
}

export interface PyramidMaterials {
  glass: THREE.MeshStandardMaterial;
  mullion: THREE.MeshStandardMaterial;
  water: THREE.MeshStandardMaterial;
  hedge: THREE.MeshStandardMaterial;
  deckGlass: THREE.MeshStandardMaterial;
  bronze: THREE.MeshStandardMaterial;
  dispose(): void;
}

let cached: PyramidMaterials | null = null;

/** Reflection environment: one cube, shared by every transparent surface in the zone. */
export function pyramidMaterials(): PyramidMaterials {
  if (cached) return cached;
  const sky = reflectionSky();

  // The glass has to read as a sheet of glass against a bright Paris sky, so it is tinted darker
  // than the sky it reflects: at metalness 0.62 and opacity 0.34 the panes mirrored the sky within
  // 3 luminance levels and the pyramid disappeared (measured, see reports/DEF-5.md).
  const glass = local('pyramid/glass', {
    color: new THREE.Color().setHex(colorOf('glass.pyramid-tint'), THREE.SRGBColorSpace).multiplyScalar(0.46),
    metalness: 0.34,
    roughness: 0.07,
    envMap: sky,
    envMapIntensity: 0.9,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    side: THREE.DoubleSide,
    emissive: new THREE.Color(0x55636f),
    emissiveIntensity: 0.1,
  });

  // Aluminium that reads as dark bars against the sky, which is how the real lattice photographs.
  const mullion = local('pyramid/anodised-aluminium', {
    color: new THREE.Color(0x8d939a),
    metalness: 0.68,
    roughness: 0.44,
    envMap: sky,
    envMapIntensity: 0.5,
  });

  const water = local('pyramid/water', {
    color: new THREE.Color(0x2c3f3a),
    metalness: 0.72,
    roughness: 0.06,
    envMap: sky,
    envMapIntensity: 1.15,
  });

  const hedge = local('pyramid/hedge', {
    color: new THREE.Color(0x2f4630),
    roughness: 0.96,
    metalness: 0,
  });

  const deckGlass = local('pyramid/deck-glass', {
    color: new THREE.Color().setHex(colorOf('glass.skylight-clear'), THREE.SRGBColorSpace),
    metalness: 0.4,
    roughness: 0.08,
    envMap: sky,
    envMapIntensity: 1.2,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const bronze = local('pyramid/bronze', {
    color: new THREE.Color().setHex(colorOf('gold.bronze-tarnished'), THREE.SRGBColorSpace),
    metalness: 0.82,
    roughness: 0.42,
    envMap: sky,
    envMapIntensity: 0.7,
  });

  cached = {
    glass: glass.material,
    mullion: mullion.material,
    water: water.material,
    hedge: hedge.material,
    deckGlass: deckGlass.material,
    bronze: bronze.material,
    dispose(): void {
      glass.dispose();
      mullion.dispose();
      water.dispose();
      hedge.dispose();
      deckGlass.dispose();
      bronze.dispose();
      skyCube?.dispose();
      skyCube = null;
      cached = null;
    },
  };
  return cached;
}
