/**
 * Painting assembly: canvas resolution planning, the painted surface as a texture, and the frame.
 *
 * Resolution follows the real size of the thing. A 21 x 24 cm Vermeer does not need the texels a
 * 9.94 x 6.77 m Veronese does, and the Veronese is seen from twelve metres away, so texels per
 * centimetre fall as area rises. The whole library's texture bill is asserted in
 * `verify/verify-gallery.mjs` against the 24 MB budget.
 */
import * as THREE from 'three';
import { pictureFrame } from '../../core/builders';
import { addParts } from '../../core/merge';
import { boxGeo, mergeAll } from '../../core/geom';
import type { Rng } from '../../core/rng';
import type { ArtworkDef } from '../catalog';
import { cachedMaterial, recordTexture, textureBytes as ledgerBytes, textureLedger as ledgerRecords, type TextureRecord } from '../textures';
import { alpha, canvasWeave, craquelure, grain, varnish, type Paint } from './kit';
import { belleJardiniere, sainteAnne, virginOfTheRocks } from './works-devotional';
import { astronomer, grandeOdalisque, lacemaker, monaLisa } from './works-hero';
import { coronation, liberty, oathOfTheHoratii, weddingAtCana } from './works-history';
import { apolloCeiling, deathOfSardanapalus, raftOfTheMedusa } from './works-romantic';

type Composition = (p: Paint) => void;

const COMPOSITIONS: Record<string, Composition> = {
  'mona-lisa': monaLisa,
  'wedding-at-cana': weddingAtCana,
  coronation,
  'oath-of-the-horatii': oathOfTheHoratii,
  'grande-odalisque': grandeOdalisque,
  liberty,
  'raft-of-the-medusa': raftOfTheMedusa,
  'death-of-sardanapalus': deathOfSardanapalus,
  lacemaker,
  astronomer,
  'virgin-of-the-rocks': virginOfTheRocks,
  'sainte-anne': sainteAnne,
  'belle-jardiniere': belleJardiniere,
  'apollo-ceiling': apolloCeiling,
};

/** Where each work's finish sits: a Leonardo has more varnish and softness than a Vermeer. */
const FINISH: Record<string, { varnish: number; craquelure: number; weave: number }> = {
  'mona-lisa': { varnish: 0.2, craquelure: 0.7, weave: 0.06 },
  'wedding-at-cana': { varnish: 0.17, craquelure: 0.45, weave: 0.05 },
  coronation: { varnish: 0.18, craquelure: 0.4, weave: 0.05 },
  'oath-of-the-horatii': { varnish: 0.15, craquelure: 0.6, weave: 0.06 },
  'grande-odalisque': { varnish: 0.14, craquelure: 0.45, weave: 0.05 },
  liberty: { varnish: 0.16, craquelure: 0.5, weave: 0.06 },
  'raft-of-the-medusa': { varnish: 0.18, craquelure: 0.55, weave: 0.06 },
  'death-of-sardanapalus': { varnish: 0.17, craquelure: 0.5, weave: 0.05 },
  lacemaker: { varnish: 0.12, craquelure: 0.9, weave: 0.1 },
  astronomer: { varnish: 0.14, craquelure: 0.5, weave: 0.06 },
  'virgin-of-the-rocks': { varnish: 0.22, craquelure: 0.55, weave: 0.05 },
  'sainte-anne': { varnish: 0.24, craquelure: 0.7, weave: 0.06 },
  'belle-jardiniere': { varnish: 0.16, craquelure: 0.45, weave: 0.06 },
  'apollo-ceiling': { varnish: 0.14, craquelure: 0.35, weave: 0.05 },
};

export type { TextureRecord };
export const textureLedger = ledgerRecords;
export const textureBytes = ledgerBytes;

/**
 * Texels per centimetre, falling with area: small panels get a dense weave, the great machines are
 * seen from across the room and do not need it.
 */
export function texelDensity(areaCm2: number): number {
  if (areaCm2 <= 5000) return 5;
  if (areaCm2 <= 40000) return 2.8;
  if (areaCm2 <= 150000) return 1.4;
  if (areaCm2 <= 400000) return 1.0;
  return 0.8;
}

/**
 * Canvas size in pixels for a painted surface of `sizeCm` centimetres.
 *
 * Texels per centimetre fall with area, because the big machines are seen from across a room; the
 * long side is floored at 224 px so a 21 cm Vermeer is still sampled finely, and capped at 1024 so
 * no single work can eat the library's texture budget.
 */
export function canvasPlan(sizeCm: readonly [number, number]): { width: number; height: number } {
  const [wCm, hCm] = sizeCm;
  const density = texelDensity(wCm * hCm);
  const longCm = Math.max(wCm, hCm);
  const targetLong = Math.max(224, Math.min(1024, longCm * density));
  const pxPerCm = targetLong / longCm;
  const round4 = (v: number): number => Math.max(48, Math.round(v / 4) * 4);
  return { width: round4(wCm * pxPerCm), height: round4(hCm * pxPerCm) };
}

function makeCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('artworks: 2D canvas unavailable, cannot paint "' + width + 'x' + height + '"');
  return { canvas, ctx };
}

/** Paint one work onto its own canvas. Deterministic for a given id. */
export function paintSurface(def: ArtworkDef, r: Rng): { canvas: HTMLCanvasElement; width: number; height: number } {
  const plan = canvasPlan(def.sizeCm);
  const { canvas, ctx } = makeCanvas(plan.width, plan.height);
  const compose = COMPOSITIONS[def.build];
  if (!compose) throw new Error('artworks: no composition registered for "' + def.build + '"');
  const p: Paint = { c: ctx, W: plan.width, H: plan.height, r: r.fork('compose') };
  compose(p);
  // The universal finish, applied here so every work ends the same way and no composition forgets it.
  const finish = FINISH[def.build] ?? { varnish: 0.16, craquelure: 0.5, weave: 0.05 };
  canvasWeave(p, finish.weave, 3);
  craquelure(p, finish.craquelure);
  grain(p, 0.035);
  varnish(p, finish.varnish);
  // A last photographic scumble: dust and age, never quite flat.
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = alpha('#c9a45f', 0.1);
  ctx.fillRect(0, 0, plan.width, plan.height);
  ctx.restore();
  return { canvas, width: plan.width, height: plan.height };
}

/** The painted surface as a material, cached per work id so two placements share one texture. */
export function paintingMaterial(def: ArtworkDef, r: Rng): THREE.MeshStandardMaterial {
  return cachedMaterial('painting:' + def.id, () => {
    const { canvas, width, height } = paintSurface(def, r);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = 8;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    recordTexture(def.id, width, height, 'painting');
    return new THREE.MeshStandardMaterial({
      name: 'artwork/' + def.id,
      map: texture,
      roughness: 0.58,
      metalness: 0.04,
      vertexColors: true,
    });
  });
}

const FRAME_MATERIAL: Record<string, string> = {
  gilt: 'wood.gilt-frame',
  'gilt-dark': 'gold.bronze-tarnished',
  'dark-wood': 'wood.walnut',
};

/** One painted work: a moulded frame at the wall plane, the canvas set inside it. */
export function buildPainting(def: ArtworkDef, r: Rng): THREE.Group {
  const [wCm, hCm] = def.sizeCm;
  const w = wCm / 100;
  const h = hCm / 100;
  const border = def.frame?.border ?? Math.min(w, h) * 0.06;
  const style = def.frame?.style ?? 'gilt';
  const depth = Math.min(0.14, Math.max(0.06, border * 0.85));

  const group = new THREE.Group();
  group.name = 'artwork/' + def.id;
  group.userData.artworkId = def.id;

  // pictureFrame's opening is `width` x (`height` - 2 * border), and its stiles stand outside the
  // declared width, so the outer size comes out as (width + 2b) x height. Passing the canvas width
  // and the canvas height plus two borders gives an opening exactly the painted size and an even
  // border on all four sides.
  const frame = pictureFrame({
    width: w,
    height: h + border * 2,
    borderWidth: border,
    depth,
  });
  const frameMat = FRAME_MATERIAL[style] ?? 'wood.gilt-frame';
  addParts(group, frame, frameMat, { 'wood.gilt-frame': frameMat });

  // A dark-wood frame gets its inner gilt fillet, which is what makes it read as period.
  if (style === 'dark-wood') {
    const fillet = 0.014;
    const strips = [
      boxGeo(w + fillet * 2, fillet, fillet * 0.8).translate(0, h / 2 + fillet / 2, fillet * 0.4),
      boxGeo(w + fillet * 2, fillet, fillet * 0.8).translate(0, -h / 2 - fillet / 2, fillet * 0.4),
      boxGeo(fillet, h, fillet * 0.8).translate(-w / 2 - fillet / 2, 0, fillet * 0.4),
      boxGeo(fillet, h, fillet * 0.8).translate(w / 2 + fillet / 2, 0, fillet * 0.4),
    ];
    const filletMesh = new THREE.Mesh(mergeAll(strips), new THREE.MeshStandardMaterial({
      name: 'artwork/' + def.id + '/fillet',
      color: new THREE.Color().setHex(0xb9932f, THREE.SRGBColorSpace),
      roughness: 0.35,
      metalness: 0.8,
      vertexColors: true,
    }));
    group.add(filletMesh);
  }

  // the painted surface, exactly the real painted size, 2 cm back inside the moulding
  const geo = new THREE.PlaneGeometry(w, h);
  geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 3).fill(1), 3));
  const canvasMesh = new THREE.Mesh(geo, paintingMaterial(def, r));
  canvasMesh.position.z = 0.022;
  canvasMesh.name = 'canvas';
  group.add(canvasMesh);
  return group;
}

/** Which ids this module can paint. */
export function paintedIds(): string[] {
  return Object.keys(COMPOSITIONS);
}
