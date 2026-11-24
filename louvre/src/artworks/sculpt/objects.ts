/**
 * The two objects: the basalt stele of Hammurabi (its relief and its cuneiform are a generated
 * texture, because 2 000 wedge marks are cheaper as pixels than as triangles) and the crown of
 * Louis XV in its case.
 */
import * as THREE from 'three';
import type { Rng } from '../../core/rng';
import { rng as makeRng } from '../../core/rng';
import { Statue, blob } from './kit';
import { boxes } from './humanoid';
import { cachedMaterial, recordTexture } from '../textures';

/* ------------------------------------------------------------------------------------- */
/* The Code of Hammurabi — 225 x 79 x 47 cm                                               */
/* ------------------------------------------------------------------------------------- */
function steleFace(r: Rng): HTMLCanvasElement {
  const W = 288;
  const H = 800;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d');
  if (!c) throw new Error('artworks: no 2D context for the stele face');
  // basalt ground: near-black with a faint warm mottle
  c.fillStyle = '#171614';
  c.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) {
    const g = c.createRadialGradient(r.range(0, W), r.range(0, H), 0, r.range(0, W), r.range(0, H), r.range(4, 26));
    g.addColorStop(0, r.chance(0.5) ? 'rgba(60,58,52,0.16)' : 'rgba(8,8,7,0.22)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  }
  // the relief panel at the head: Shamash enthroned on the left, Hammurabi standing at the right
  const panelTop = H * 0.05;
  const panelH = H * 0.24;
  c.fillStyle = 'rgba(90,86,78,0.5)';
  c.fillRect(W * 0.08, panelTop, W * 0.84, panelH);
  // Shamash: seated, with the staff-and-ring, rays behind
  c.fillStyle = '#b7b0a0';
  c.beginPath();
  c.ellipse(W * 0.33, panelTop + panelH * 0.2, W * 0.045, panelH * 0.08, 0, 0, Math.PI * 2);
  c.fill();
  c.fillRect(W * 0.28, panelTop + panelH * 0.28, W * 0.1, panelH * 0.46);
  c.fillRect(W * 0.24, panelTop + panelH * 0.7, W * 0.18, panelH * 0.1);
  for (let i = 0; i < 7; i++) {
    c.strokeStyle = 'rgba(190,183,168,0.55)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(W * 0.33, panelTop + panelH * 0.2);
    const a = -2.3 + i * 0.28;
    c.lineTo(W * 0.33 + Math.cos(a) * W * 0.13, panelTop + panelH * 0.2 + Math.sin(a) * panelH * 0.4);
    c.stroke();
  }
  // Hammurabi: standing, robed, right arm raised
  c.fillStyle = '#a9a294';
  c.beginPath();
  c.ellipse(W * 0.66, panelTop + panelH * 0.24, W * 0.04, panelH * 0.075, 0, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.moveTo(W * 0.6, panelTop + panelH * 0.34);
  c.lineTo(W * 0.73, panelTop + panelH * 0.34);
  c.lineTo(W * 0.75, panelTop + panelH * 0.82);
  c.lineTo(W * 0.58, panelTop + panelH * 0.82);
  c.closePath();
  c.fill();
  c.strokeStyle = '#a9a294';
  c.lineWidth = W * 0.022;
  c.beginPath();
  c.moveTo(W * 0.72, panelTop + panelH * 0.4);
  c.lineTo(W * 0.82, panelTop + panelH * 0.26);
  c.stroke();
  // shadow line under the panel
  c.fillStyle = 'rgba(0,0,0,0.45)';
  c.fillRect(W * 0.06, panelTop + panelH, W * 0.88, 4);

  // forty-four columns of cuneiform, drawn as wedge clusters
  const cols = 10;
  const colW = (W * 0.86) / cols;
  const textTop = panelTop + panelH + H * 0.03;
  const rowH = 9;
  for (let col = 0; col < cols; col++) {
    const x0 = W * 0.07 + col * colW;
    for (let row = 0; row < Math.floor((H * 0.97 - textTop) / rowH); row++) {
      const y = textTop + row * rowH;
      if (r.chance(0.12)) continue;
      const marks = r.int(2, 4);
      for (let m = 0; m < marks; m++) {
        const mx = x0 + 3 + m * (colW / 4);
        c.fillStyle = 'rgba(150,144,128,' + r.range(0.35, 0.7) + ')';
        c.beginPath();
        c.moveTo(mx, y);
        c.lineTo(mx + 4, y + 1.5);
        c.lineTo(mx + 1, y + 3);
        c.closePath();
        c.fill();
        if (r.chance(0.5)) {
          c.fillRect(mx + 1, y + 3.4, 4, 1);
        }
      }
    }
  }
  // wear: the base is chipped and pale
  const wear = c.createLinearGradient(0, H * 0.88, 0, H);
  wear.addColorStop(0, 'rgba(120,110,92,0)');
  wear.addColorStop(1, 'rgba(122,112,94,0.5)');
  c.fillStyle = wear;
  c.fillRect(0, H * 0.88, W, H * 0.12);
  return canvas;
}

const hammurabiStele = (r: Rng): THREE.Group => {
  const s = new Statue();
  const w = 0.79;
  const h = 2.25;
  const d = 0.47;
  const baseH = 0.16;
  const stone = 'marble.portor';

  // the slab, with a rounded top, extruded along Z
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(w / 2, h - w * 0.42);
  shape.quadraticCurveTo(w / 2, h - baseH * 0.2, 0, h - baseH * 0.15);
  shape.quadraticCurveTo(-w / 2, h - baseH * 0.2, -w / 2, h - w * 0.42);
  shape.closePath();
  const slab = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 1, curveSegments: 8 });
  slab.translate(0, baseH, -d / 2);
  slab.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(slab.attributes.position.count * 3).fill(1), 3));
  s.add(slab, stone);
  // a rougher footing
  s.add(boxes([[w * 1.06, baseH, d * 1.06, 0, baseH / 2, 0]]), 'stone.limestone-warm');

  // the inscribed face
  const material = cachedMaterial('hammurabi:face', () => {
    const canvas = steleFace(makeRng('artwork/hammurabi/face'));
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    recordTexture('hammurabi:face', canvas.width, canvas.height, 'relief');
    return new THREE.MeshStandardMaterial({
      name: 'artwork/hammurabi/face',
      map: tex,
      roughness: 0.5,
      metalness: 0.05,
      vertexColors: true,
    });
  });
  const faceGeo = new THREE.PlaneGeometry(w - 0.05, h - w * 0.44 - 0.04);
  faceGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(faceGeo.attributes.position.count * 3).fill(1), 3));
  const faceMesh = new THREE.Mesh(faceGeo, material);
  faceMesh.position.set(0, baseH + (h - w * 0.44 - 0.04) / 2, d / 2 - 0.004);
  const group = s.build('hammurabi');
  group.add(faceMesh);
  void r;
  return group;
};

/* ------------------------------------------------------------------------------------- */
/* The Crown of Louis XV — 24 cm, in a 60 x 50 x 40 cm case                               */
/* ------------------------------------------------------------------------------------- */
const crownOfLouisXv = (_r: Rng): THREE.Group => {
  const group = new THREE.Group();
  const caseW = 0.6;
  const caseD = 0.4;
  const caseH = 0.5;
  const baseH = 0.07;

  // the case: stone foot, glass box, thin frame edges
  const s = new Statue();
  s.add(boxes([
    [caseW, baseH, caseD, 0, baseH / 2, 0],
    [caseW * 0.98, 0.012, caseD * 0.98, 0, baseH + 0.006, 0],
  ]), 'stone.limestone-pale');
  group.add(s.build('crown-case-base'));

  const glass = boxes([
    [caseW, caseH - baseH, 0.008, 0, (caseH + baseH) / 2, caseD / 2],
    [caseW, caseH - baseH, 0.008, 0, (caseH + baseH) / 2, -caseD / 2],
    [0.008, caseH - baseH, caseD, caseW / 2, (caseH + baseH) / 2, 0],
    [0.008, caseH - baseH, caseD, -caseW / 2, (caseH + baseH) / 2, 0],
    [caseW, 0.008, caseD, 0, caseH, 0],
  ]);
  const glassMesh = new THREE.Mesh(glass, new THREE.MeshStandardMaterial({
    name: 'artwork/crown/case',
    color: new THREE.Color().setHex(0xf4f6f4, THREE.SRGBColorSpace),
    roughness: 0.06,
    metalness: 0,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    vertexColors: true,
    side: THREE.DoubleSide,
  }));
  group.add(glassMesh);

  // velvet cushion on its mount
  const c = new Statue();
  const cushionY = baseH + 0.11;
  const cushion = blob(0.16, 0.05, 0.14, 14, 5, 0.08);
  cushion.translate(0, cushionY, 0);
  c.add(cushion, 'marble.portor');
  c.add(boxes([[0.1, 0.06, 0.09, 0, baseH + 0.03, 0]]), 'gold.bronze-tarnished');

  // the crown itself: band, eight arches, a crimson cap, pearls, fleur-de-lis
  const bandY = cushionY + 0.06;
  const radius = 0.088;
  const band = new THREE.CylinderGeometry(radius, radius * 0.98, 0.05, 20, 1, true);
  band.translate(0, bandY, 0);
  band.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(band.attributes.position.count * 3).fill(1), 3));
  c.add(band, 'gold.leaf');
  const rim = new THREE.TorusGeometry(radius, 0.009, 6, 24);
  rim.rotateX(Math.PI / 2);
  rim.translate(0, bandY + 0.025, 0);
  c.add(rim, 'gold.leaf');
  // pearls and stones on the band
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const pearl = blob(0.008, 0.008, 0.008, 6, i, 0.05);
    pearl.translate(Math.cos(a) * radius, bandY + 0.012, Math.sin(a) * radius);
    c.add(pearl, i % 4 === 0 ? 'marble.blanc-carrare' : 'gold.bronze-tarnished');
  }
  // eight arches meeting at the centre
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const blocks: Array<[number, number, number, number, number, number]> = [];
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      const r0 = radius * (1 - t * 0.92);
      blocks.push([0.014, 0.016, 0.014, Math.cos(a) * r0, bandY + 0.025 + Math.sin(t * Math.PI * 0.5) * 0.1, Math.sin(a) * r0]);
    }
    c.add(boxes(blocks), 'gold.leaf');
  }
  // the crimson cap inside the arches
  const cap = blob(radius * 0.88, 0.07, radius * 0.88, 12, 9, 0.04);
  cap.translate(0, bandY + 0.06, 0);
  c.add(cap, 'marble.rouge-royal');
  // the apex: a fleur-de-lis cross
  c.add(boxes([
    [0.012, 0.06, 0.012, 0, bandY + 0.17, 0],
    [0.04, 0.012, 0.012, 0, bandY + 0.18, 0],
    [0.012, 0.012, 0.04, 0, bandY + 0.18, 0],
  ]), 'gold.leaf');
  const crown = c.build('crown');
  group.add(crown);
  return group;
};

export const OBJECT_WORKS: Record<string, (r: Rng) => THREE.Group> = {
  'hammurabi-stele': hammurabiStele,
  'crown-of-louis-xv': crownOfLouisXv,
};
