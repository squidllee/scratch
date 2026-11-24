import * as THREE from 'three';
import { rng } from '../../core/rng';

/**
 * Zone-local procedural textures. Two of them:
 *
 *  - the Cour Napoléon's paving. The real court is 650,000 sandstone and granite setts, laid in a
 *    running bond with granite mixed through it. A 2.4 m tile at 1024 px gives 24 x 24 setts of
 *    10 cm, which is the real sett size and still resolves at 1.65 m eye height.
 *  - a ripple normal map for the pools and the fountains.
 *
 * Both are drawn once, from the seeded RNG, at load time.
 */

const PAVING_TILE_M = 2.4;
const PAVING_PX = 1024;

export interface LocalTexture {
  texture: THREE.Texture;
  bytes: number;
}

function canvasOf(size: number): { ctx: CanvasRenderingContext2D; canvas: HTMLCanvasElement } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable; cannot generate zone textures');
  return { ctx, canvas };
}

/** Sandstone and granite setts in a running bond, with chipped arrises and dark joints. */
export function pavingTexture(): LocalTexture {
  const { ctx, canvas } = canvasOf(PAVING_PX);
  const r = rng('pyramid/paving');
  const rows = 24;
  const cell = PAVING_PX / rows;

  ctx.fillStyle = '#6f6a60';
  ctx.fillRect(0, 0, PAVING_PX, PAVING_PX);

  // Drawn near-white on purpose: the palette colour (floor.pave-granite) is the art direction and
  // this map only modulates it. Two mid-greys multiplied give an asphalt-black courtyard.
  for (let row = 0; row < rows; row++) {
    const offset = (row % 2) * cell * 0.5;
    for (let col = -1; col < rows; col++) {
      const x = col * cell + offset;
      const y = row * cell;
      const granite = r.chance(0.34);
      const tone = granite ? r.range(0.7, 0.86) : r.range(0.92, 1.0);
      const warm = granite ? 0.97 : 1.02;
      const rr = Math.round(Math.min(255, 250 * tone * warm));
      const gg = Math.round(Math.min(255, 250 * tone));
      const bb = Math.round(Math.min(255, 250 * tone / warm));
      const inset = r.range(0.6, 1.8);
      ctx.fillStyle = 'rgb(' + rr + ',' + gg + ',' + bb + ')';
      ctx.fillRect(x + inset, y + inset, cell - inset * 2, cell - inset * 2);

      // Sett face: a soft band of wear, then a little speckle.
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = r.chance(0.5) ? '#ffffff' : '#8c8c8c';
      ctx.beginPath();
      ctx.ellipse(x + cell * r.range(0.3, 0.7), y + cell * r.range(0.3, 0.7), cell * 0.32, cell * 0.22, r.range(0, 3), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      for (let s = 0; s < 3; s++) {
        ctx.globalAlpha = r.range(0.05, 0.16);
        ctx.fillStyle = r.chance(0.5) ? '#ffffff' : '#7d7a72';
        ctx.fillRect(x + r.range(2, cell - 4), y + r.range(2, cell - 4), r.range(1, 3), r.range(1, 3));
      }
      ctx.globalAlpha = 1;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1 / PAVING_TILE_M, 1 / PAVING_TILE_M);
  texture.anisotropy = 8;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return { texture, bytes: PAVING_PX * PAVING_PX * 4 * 1.34 };
}

const RIPPLE_TILE_M = 2.2;

/** A tileable ripple field, converted to a tangent-space normal map. */
export function rippleNormal(): LocalTexture {
  const size = 256;
  const { ctx, canvas } = canvasOf(size);
  const r = rng('pyramid/ripples');
  const waves = Array.from({ length: 7 }, () => ({
    kx: Math.round(r.range(1, 4)) * (r.chance(0.5) ? 1 : -1),
    ky: Math.round(r.range(1, 4)),
    phase: r.range(0, Math.PI * 2),
    amp: r.range(0.16, 0.42),
  }));

  const height = (u: number, v: number): number => {
    let h = 0;
    for (const w of waves) h += Math.sin((u * w.kx + v * w.ky) * Math.PI * 2 + w.phase) * w.amp;
    return h;
  };

  const image = ctx.createImageData(size, size);
  const step = 1 / size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const dx = height(u + step, v) - height(u - step, v);
      const dy = height(u, v + step) - height(u, v - step);
      const nx = -dx * 2.2;
      const ny = -dy * 2.2;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz);
      const i = (y * size + x) * 4;
      image.data[i] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      image.data[i + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      image.data[i + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1 / RIPPLE_TILE_M, 1 / RIPPLE_TILE_M);
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return { texture, bytes: size * size * 4 * 1.34 };
}
