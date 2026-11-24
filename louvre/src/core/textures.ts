import * as THREE from 'three';
import { rng } from './rng';

export type TextureKind = 'parquet' | 'marble' | 'plaster' | 'zinc' | 'gold' | 'stone';

interface TextureRecord {
  texture: THREE.Texture;
  bytes: number;
}

const cache = new Map<string, TextureRecord>();

/** Budget accounting for the perf HUD: every GPU texture the project allocates passes through here. */
export function textureStats(): { count: number; bytes: number; names: string[] } {
  let bytes = 0;
  const names: string[] = [];
  for (const [name, rec] of cache) {
    bytes += rec.bytes;
    names.push(name);
  }
  return { count: cache.size, bytes, names: names.sort() };
}

/**
 * Account a texture the project did not draw itself (a PMREM environment map, for instance) so the
 * HUD's texture budget stays honest.
 */
export function accountTexture(name: string, bytes: number, texture?: THREE.Texture): void {
  cache.set(name, { texture: texture ?? (null as unknown as THREE.Texture), bytes });
}

function makeCanvas(size: number): { ctx: CanvasRenderingContext2D; canvas: HTMLCanvasElement } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable; cannot generate procedural textures');
  return { ctx, canvas };
}

function finish(canvas: HTMLCanvasElement, name: string, repeat: number, aniso = 8): THREE.Texture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = aniso;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  cache.set(name, { texture: tex, bytes: canvas.width * canvas.height * 4 * 1.34 });
  return tex;
}

/** Parquet de Versailles: staggered oak boards with visible grain and end joints. */
function drawParquet(ctx: CanvasRenderingContext2D, size: number, seed: string): void {
  const r = rng(seed);
  ctx.fillStyle = '#7a5433';
  ctx.fillRect(0, 0, size, size);
  const cols = 4;
  const rows = 8;
  const bw = size / cols;
  const bh = size / rows;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const offset = (y % 2) * 0.5 + (y % 4 === 3 ? 0.25 : 0);
      const bx = ((x + offset) % cols) * bw;
      const tone = 0.86 + r.range(0, 0.26);
      const rr = Math.round(168 * tone);
      const gg = Math.round(120 * tone);
      const bb = Math.round(74 * tone);
      ctx.fillStyle = 'rgb(' + rr + ',' + gg + ',' + bb + ')';
      ctx.fillRect(bx + 1, y * bh + 1, bw - 2, bh - 2);
      // grain: long-ish streaks along the board
      ctx.globalAlpha = 0.16;
      for (let g = 0; g < 9; g++) {
        const gy = y * bh + r.range(2, bh - 2);
        ctx.strokeStyle = r.chance(0.5) ? '#5c3d22' : '#c69a68';
        ctx.lineWidth = r.range(0.6, 1.7);
        ctx.beginPath();
        ctx.moveTo(bx + 2, gy);
        ctx.bezierCurveTo(bx + bw * 0.3, gy + r.range(-2, 2), bx + bw * 0.7, gy + r.range(-2, 2), bx + bw - 2, gy);
        ctx.stroke();
      }
      // a knot every so often
      if (r.chance(0.25)) {
        const kx = bx + r.range(bw * 0.25, bw * 0.75);
        const ky = y * bh + r.range(bh * 0.25, bh * 0.75);
        const rad = r.range(1.4, 3.2);
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#4a3018';
        for (let i = 1; i <= 3; i++) {
          ctx.beginPath();
          ctx.ellipse(kx, ky, rad * i, rad * i * 0.5, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }
  }
  // seams
  ctx.strokeStyle = 'rgba(40,26,14,0.65)';
  ctx.lineWidth = 1.5;
  for (let y = 0; y <= rows; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * bh);
    ctx.lineTo(size, y * bh);
    ctx.stroke();
  }
}

/** Carrara-like vein marble: warm ground, soft clouds, sharp dark veins. */
function drawMarble(ctx: CanvasRenderingContext2D, size: number, seed: string): void {
  const r = rng(seed);
  ctx.fillStyle = '#eee9de';
  ctx.fillRect(0, 0, size, size);
  // soft clouds
  for (let i = 0; i < 40; i++) {
    const x = r.range(0, size);
    const y = r.range(0, size);
    const rad = r.range(size * 0.06, size * 0.28);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const dark = r.chance(0.55);
    g.addColorStop(0, dark ? 'rgba(196,190,178,0.5)' : 'rgba(255,253,247,0.6)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  // veins
  for (let v = 0; v < 14; v++) {
    let x = r.range(0, size);
    let y = r.range(0, size);
    ctx.strokeStyle = v % 4 === 0 ? 'rgba(92,92,86,0.42)' : 'rgba(150,146,136,0.3)';
    ctx.lineWidth = r.range(0.6, 2.4);
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < 26; s++) {
      x += r.range(-size * 0.09, size * 0.09);
      y += r.range(-size * 0.05, size * 0.09);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // fine speckle
  for (let i = 0; i < 600; i++) {
    ctx.fillStyle = 'rgba(120,116,106,' + r.range(0.03, 0.1).toFixed(3) + ')';
    ctx.fillRect(r.range(0, size), r.range(0, size), 1.2, 1.2);
  }
}

/** Lime plaster: warm near-white with trowel mottling and faint drag marks. */
function drawPlaster(ctx: CanvasRenderingContext2D, size: number, seed: string): void {
  const r = rng(seed);
  ctx.fillStyle = '#e9e2d4';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 900; i++) {
    const x = r.range(0, size);
    const y = r.range(0, size);
    const rad = r.range(size * 0.01, size * 0.09);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const warm = r.chance(0.5);
    g.addColorStop(0, warm ? 'rgba(226,214,192,0.10)' : 'rgba(252,248,240,0.12)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.06;
  for (let i = 0; i < 160; i++) {
    ctx.strokeStyle = '#b8ab92';
    ctx.lineWidth = r.range(0.5, 1.4);
    const y = r.range(0, size);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y + r.range(-4, 4));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** Standing-seam zinc roof sheeting. */
function drawZinc(ctx: CanvasRenderingContext2D, size: number, seed: string): void {
  const r = rng(seed);
  ctx.fillStyle = '#8e9298';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = 'rgba(' + (r.chance(0.5) ? '120,124,130' : '160,164,170') + ',' + r.range(0.05, 0.18).toFixed(3) + ')';
    ctx.fillRect(r.range(0, size), r.range(0, size), r.range(2, 26), r.range(1, 4));
  }
  const seams = 8;
  for (let i = 0; i <= seams; i++) {
    const x = (i / seams) * size;
    const g = ctx.createLinearGradient(x - 3, 0, x + 3, 0);
    g.addColorStop(0, 'rgba(90,94,100,0.0)');
    g.addColorStop(0.5, 'rgba(70,74,80,0.55)');
    g.addColorStop(1, 'rgba(90,94,100,0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 3, 0, 6, size);
  }
}

/** Burnished gold leaf with soft hammering. */
function drawGold(ctx: CanvasRenderingContext2D, size: number, seed: string): void {
  const r = rng(seed);
  ctx.fillStyle = '#c39b45';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 700; i++) {
    const x = r.range(0, size);
    const y = r.range(0, size);
    const rad = r.range(size * 0.01, size * 0.06);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const bright = r.chance(0.5);
    g.addColorStop(0, bright ? 'rgba(246,222,150,0.34)' : 'rgba(140,104,38,0.26)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Ashlar limestone: coursed blocks with fine joints. */
function drawStone(ctx: CanvasRenderingContext2D, size: number, seed: string): void {
  const r = rng(seed);
  ctx.fillStyle = '#d5cab5';
  ctx.fillRect(0, 0, size, size);
  const rows = 6;
  const rh = size / rows;
  for (let y = 0; y < rows; y++) {
    const blocks = y % 2 === 0 ? 3 : 4;
    const bw = size / blocks;
    for (let x = 0; x < blocks; x++) {
      const tone = 0.94 + r.range(0, 0.12);
      ctx.fillStyle = 'rgb(' + Math.round(213 * tone) + ',' + Math.round(202 * tone) + ',' + Math.round(181 * tone) + ')';
      ctx.fillRect(x * bw + 1, y * rh + 1, bw - 2, rh - 2);
      ctx.globalAlpha = 0.14;
      for (let i = 0; i < 22; i++) {
        ctx.fillStyle = r.chance(0.5) ? '#a89a80' : '#eee6d3';
        ctx.fillRect(x * bw + r.range(2, bw - 6), y * rh + r.range(2, rh - 3), r.range(1, 6), r.range(0.5, 1.6));
      }
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = 'rgba(120,110,92,0.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, y * rh);
    ctx.lineTo(size, y * rh);
    ctx.stroke();
    for (let x = 0; x <= blocks; x++) {
      ctx.beginPath();
      ctx.moveTo(x * bw, y * rh);
      ctx.lineTo(x * bw, (y + 1) * rh);
      ctx.stroke();
    }
  }
}

/**
 * Return a cached procedural texture. Same kind + variant always returns the same GPU texture,
 * so a zone that asks ten times for parquet allocates it once.
 */
export function getTexture(kind: TextureKind, variant = 'a', repeat = 1): THREE.Texture {
  const key = kind + ':' + variant;
  const rec = cache.get(key);
  if (rec) return rec.texture;
  const size = 512;
  const { ctx, canvas } = makeCanvas(size);
  const seed = kind + variant;
  if (kind === 'parquet') drawParquet(ctx, size, seed);
  else if (kind === 'marble') drawMarble(ctx, size, seed);
  else if (kind === 'plaster') drawPlaster(ctx, size, seed);
  else if (kind === 'zinc') drawZinc(ctx, size, seed);
  else if (kind === 'gold') drawGold(ctx, size, seed);
  else drawStone(ctx, size, seed);
  return finish(canvas, key, repeat);
}
