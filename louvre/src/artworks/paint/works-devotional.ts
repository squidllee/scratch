/**
 * The three devotional panels: the Madonna groups by Leonardo and Raphael. They share one draped
 * figure builder, because the museum hangs them ten metres apart and they must look like the same
 * kind of object seen by different hands.
 */
import {
  alpha,
  bg,
  chiaroscuro,
  curve,
  ellipse,
  fillRect,
  foliage,
  lightPool,
  line,
  mass,
  mix,
  poly,
  scumble,
  shade,
  soft,
  softFocus,
  type Paint,
} from './kit';
import { face } from './face';

interface RobedOptions {
  cx: number;
  /** Baseline (bottom of the gown) in canvas pixels. */
  base: number;
  /** Head width in pixels. The body follows the head at 7.5 heads. */
  headW: number;
  gown: string;
  mantle: string;
  skin: string;
  hair: string;
  veil?: string;
  turn?: number;
  light?: number;
  /** Draw the mantle falling over this side: -1 left, +1 right. */
  mantleSide?: number;
  close?: number;
  /** Extra hand target (canvas px) for a reaching gesture. */
  reach?: [number, number];
  sfumato?: number;
}

/** A robed standing or seated figure: gown, mantle, head, hands. */
function robed(p: Paint, o: RobedOptions): void {
  const headH = o.headW * 1.32;
  const bodyH = headH * 6.2;
  const top = o.base - bodyH;
  const shoulderY = top + headH * 1.15;
  const hipY = o.base - bodyH * 0.42;
  const shoulderW = o.headW * 1.15;
  const hipW = o.headW * 1.5;
  const light = o.light ?? -1;
  const turn = o.turn ?? 0;

  // shadow mass behind, offset away from the light.
  soft(p, o.cx - light * o.headW * 0.3, o.base - bodyH * 0.3, o.headW * 1.5, bodyH * 0.42, shade(o.gown, -0.6), 0.35);

  // gown
  p.c.beginPath();
  p.c.moveTo(o.cx - shoulderW * 0.86, shoulderY);
  p.c.quadraticCurveTo(o.cx - hipW * 0.9, hipY, o.cx - hipW * (1 + (o.close ?? 0) * 0.3), o.base);
  p.c.lineTo(o.cx + hipW * 1.02, o.base);
  p.c.quadraticCurveTo(o.cx + hipW * 0.86, hipY, o.cx + shoulderW * 0.9, shoulderY);
  p.c.quadraticCurveTo(o.cx, shoulderY - o.headW * 0.3, o.cx - shoulderW * 0.86, shoulderY);
  p.c.closePath();
  const gg = p.c.createLinearGradient(o.cx + light * shoulderW, 0, o.cx - light * shoulderW, 0);
  gg.addColorStop(0, shade(o.gown, 0.2));
  gg.addColorStop(0.5, o.gown);
  gg.addColorStop(1, shade(o.gown, -0.44));
  p.c.fillStyle = gg;
  p.c.fill();
  for (let i = 0; i < 6; i++) {
    const t = (i / 5 - 0.5) * 2;
    curve(
      p,
      [
        [o.cx + t * shoulderW * 0.7, shoulderY + headH * 0.05],
        [o.cx + t * hipW * 0.7, hipY],
        [o.cx + t * hipW * 0.95, o.base],
      ],
      alpha(shade(o.gown, -0.5), 0.3),
      o.headW * 0.06,
    );
  }
  // hands emerging from the gown
  const handY = hipY + (o.base - hipY) * 0.18;
  ellipse(p, o.cx - light * o.headW * 0.16, handY, o.headW * 0.2, o.headW * 0.13, shade(o.skin, -0.06), light * 0.2);
  ellipse(p, o.cx + light * o.headW * 0.24, handY + o.headW * 0.05, o.headW * 0.18, o.headW * 0.12, shade(o.skin, -0.16), -light * 0.2);

  // mantle: a broad sweep over one shoulder and around the knees.
  const side = o.mantleSide ?? -1;
  p.c.beginPath();
  p.c.moveTo(o.cx + side * shoulderW * 0.55, shoulderY - o.headW * 0.1);
  p.c.quadraticCurveTo(o.cx + side * hipW * 1.4, hipY * 0.98, o.cx + side * hipW * 1.5, o.base + o.headW * 0.1);
  p.c.lineTo(o.cx + side * hipW * 0.1, o.base + o.headW * 0.12);
  p.c.quadraticCurveTo(o.cx + side * hipW * 0.2, hipY * 1.04, o.cx - side * shoulderW * 0.2, shoulderY);
  p.c.closePath();
  const mg = p.c.createLinearGradient(o.cx - side * hipW, top, o.cx + side * hipW, o.base);
  mg.addColorStop(0, shade(o.mantle, 0.12));
  mg.addColorStop(0.6, o.mantle);
  mg.addColorStop(1, shade(o.mantle, -0.4));
  p.c.fillStyle = mg;
  p.c.fill();
  for (let i = 0; i < 4; i++) {
    const t = i / 4;
    curve(
      p,
      [
        [o.cx + side * (shoulderW * 0.4 + t * hipW * 0.3), shoulderY + headH * 0.2],
        [o.cx + side * (hipW * 0.7 + t * hipW * 0.4), hipY],
        [o.cx + side * (hipW * 0.8 + t * hipW * 0.4), o.base],
      ],
      alpha(shade(o.mantle, -0.5), 0.34),
      o.headW * 0.08,
    );
  }
  // neck and bosom
  poly(
    p,
    [
      [o.cx - o.headW * 0.24, shoulderY - headH * 0.32],
      [o.cx + o.headW * 0.24, shoulderY - headH * 0.32],
      [o.cx + o.headW * 0.34, shoulderY + headH * 0.12],
      [o.cx - o.headW * 0.34, shoulderY + headH * 0.12],
    ],
    o.skin,
  );

  face(p, {
    cx: o.cx + turn * o.headW * 0.1,
    cy: top + headH * 0.62,
    w: o.headW,
    skin: o.skin,
    light,
    turn,
    hair: o.hair,
    veil: o.veil,
    sfumato: o.sfumato ?? 0.45,
  });

  if (o.reach) {
    p.c.strokeStyle = shade(o.skin, -0.04);
    p.c.lineCap = 'round';
    p.c.lineWidth = o.headW * 0.34;
    p.c.beginPath();
    p.c.moveTo(o.cx + light * o.headW * 0.6, shoulderY + headH * 0.2);
    p.c.quadraticCurveTo(
      (o.cx + o.reach[0]) / 2 + light * o.headW * 0.2,
      (shoulderY + o.reach[1]) / 2,
      o.reach[0],
      o.reach[1],
    );
    p.c.stroke();
    ellipse(p, o.reach[0], o.reach[1], o.headW * 0.24, o.headW * 0.16, shade(o.skin, 0.04), -0.3);
  }
}

/** A small child, nude or lightly draped, seated or leaning. */
function infant(
  p: Paint,
  x: number,
  y: number,
  headW: number,
  skin: string,
  hair: string,
  opts: { lean?: number; sitting?: boolean; sfumato?: number } = {},
): void {
  const h = headW * 1.32;
  const s = (opts.lean ?? 0) * 0.2;
  p.c.save();
  p.c.translate(x, y);
  p.c.rotate(s);
  // body
  p.c.beginPath();
  p.c.moveTo(-headW * 0.5, -h * 0.4);
  p.c.quadraticCurveTo(-headW * 0.9, h * 1.4, -headW * 0.5, h * 2.4);
  p.c.lineTo(headW * 0.62, h * 2.4);
  p.c.quadraticCurveTo(headW * 1.0, h * 1.2, headW * 0.5, -h * 0.4);
  p.c.closePath();
  const bgd = p.c.createLinearGradient(-headW, 0, headW, h);
  bgd.addColorStop(0, shade(skin, 0.2));
  bgd.addColorStop(1, shade(skin, -0.36));
  p.c.fillStyle = bgd;
  p.c.fill();
  // legs
  ellipse(p, -headW * 0.05, h * 2.2, headW * 1.05, h * 0.32, shade(skin, -0.1));
  face(p, { cx: 0, cy: 0, w: headW, skin, light: -1, hair, young: 1, sfumato: opts.sfumato ?? 0.3 });
  p.c.restore();
}

/* ------------------------------------------------------------------------------------- */
/* The Virgin of the Rocks — 122 x 199 cm                                                */
/* ------------------------------------------------------------------------------------- */
export function virginOfTheRocks(p: Paint): void {
  const { W, H, r } = p;
  const skin = '#cba37f';
  bg(p, [
    [0, '#4b4433'],
    [0.35, '#6a5c3f'],
    [1, '#241d13'],
  ]);
  // the cave mouth: pale water and misty peaks through the rock
  p.c.beginPath();
  p.c.moveTo(W * 0.18, H * 0.02);
  p.c.lineTo(W * 0.82, H * 0.02);
  p.c.quadraticCurveTo(W * 0.76, H * 0.2, W * 0.66, H * 0.26);
  p.c.quadraticCurveTo(W * 0.5, H * 0.32, W * 0.34, H * 0.27);
  p.c.quadraticCurveTo(W * 0.22, H * 0.2, W * 0.18, H * 0.02);
  p.c.closePath();
  const dist = p.c.createLinearGradient(0, 0, 0, H * 0.34);
  dist.addColorStop(0, '#a9bcc0');
  dist.addColorStop(0.5, '#8fa9ae');
  dist.addColorStop(1, '#c3cdc2');
  p.c.fillStyle = dist;
  p.c.fill();
  // far peaks
  for (let i = 0; i < 4; i++) {
    const baseX = W * (0.24 + i * 0.14);
    p.c.beginPath();
    p.c.moveTo(baseX - W * 0.08, H * 0.24);
    p.c.lineTo(baseX, H * (0.15 - i * 0.008) + r.range(-4, 4));
    p.c.lineTo(baseX + W * 0.09, H * 0.25);
    p.c.closePath();
    p.c.fillStyle = alpha('#7e96a0', 0.55);
    p.c.fill();
  }
  // still water in the far distance
  fillRect(p, W * 0.2, H * 0.24, W * 0.6, H * 0.05, alpha('#b8c8c4', 0.6));
  // rock walls, left and right, blocking the opening
  mass(p, W * 0.02, H * 0.2, W * 0.26, H * 0.3, '#6d5c3a', 0.9, 8);
  mass(p, W * 0.98, H * 0.24, W * 0.24, H * 0.34, '#5d4d31', 0.9, 8);
  mass(p, W * 0.5, H * 0.02, W * 0.5, H * 0.08, '#54462d', 0.85, 6);
  // stalactite shelves and moss
  for (let i = 0; i < 7; i++) {
    const x = W * (0.1 + i * 0.13);
    mass(p, x, H * (0.06 + r.range(0, 0.05)), W * 0.07, H * 0.05, '#3f3524', 0.7, 4);
  }
  foliage(p, W * 0.06, H * 0.72, W * 0.16, H * 0.1, '#3f5230', 0.75);
  foliage(p, W * 0.94, H * 0.78, W * 0.14, H * 0.1, '#354427', 0.7);

  // the angel at the left, kneeling and pointing right
  robed(p, {
    cx: W * 0.24,
    base: H * 0.86,
    headW: W * 0.115,
    gown: '#7a3b32',
    mantle: '#5a2b2a',
    skin,
    hair: '#5c4225',
    turn: 0.4,
    mantleSide: 1,
    sfumato: 0.55,
    reach: [W * 0.44, H * 0.66],
  });
  // the angel's wing
  poly(p, [[W * 0.14, H * 0.52], [W * 0.02, H * 0.42], [W * 0.06, H * 0.62], [W * 0.16, H * 0.66]], alpha('#6b5340', 0.85));
  for (let i = 0; i < 5; i++) {
    line(
      p,
      [[W * 0.15, H * (0.54 + i * 0.022)], [W * (0.03 + i * 0.006), H * (0.44 + i * 0.03)]],
      alpha('#3f3225', 0.45),
      Math.max(1, W * 0.005),
    );
  }

  // Madonna at the centre: blue mantle over a red gown, the child at her knee.
  robed(p, {
    cx: W * 0.5,
    base: H * 0.9,
    headW: W * 0.15,
    gown: '#8a3a2c',
    mantle: '#2f4f7a',
    skin,
    hair: '#6b4a2a',
    turn: -0.2,
    mantleSide: 1,
    sfumato: 0.6,
    reach: [W * 0.6, H * 0.66],
  });
  infant(p, W * 0.6, H * 0.62, W * 0.075, shade(skin, 0.06), '#7a5a30', { lean: 0.3, sfumato: 0.5 });
  // the infant Baptist at the right, praying
  robed(p, {
    cx: W * 0.76,
    base: H * 0.84,
    headW: W * 0.1,
    gown: '#6f6b4a',
    mantle: '#4a4a30',
    skin,
    hair: '#7a5a2c',
    turn: -0.3,
    mantleSide: -1,
    sfumato: 0.55,
  });
  // his reed cross
  line(p, [[W * 0.82, H * 0.72], [W * 0.86, H * 0.92]], '#6a5330', Math.max(1.2, W * 0.01));
  line(p, [[W * 0.80, H * 0.78], [W * 0.9, H * 0.76]], '#6a5330', Math.max(1.2, W * 0.01));
  // light falling from the opening onto the faces
  lightPool(p, W * 0.5, H * 0.3, W * 0.4, H * 0.25, '#e8e4c8', 0.3);
  lightPool(p, W * 0.4, H * 0.45, W * 0.3, H * 0.2, '#f2ead0', 0.16);
  softFocus(p, Math.max(1.5, W * 0.006), 0.55);
  scumble(p, '#9aa89a', 0.1, 16);
}

/* ------------------------------------------------------------------------------------- */
/* The Virgin and Child with Saint Anne — 130 x 168 cm                                   */
/* ------------------------------------------------------------------------------------- */
export function sainteAnne(p: Paint): void {
  const { W, H } = p;
  const skin = '#c9a077';
  bg(p, [
    [0, '#8fa3ab'],
    [0.22, '#a9b6b2'],
    [0.34, '#7d8a72'],
    [1, '#3d3a25'],
  ]);
  // the far mountains and the river valley
  for (let i = 0; i < 3; i++) {
    p.c.beginPath();
    p.c.moveTo(W * (0.3 + i * 0.2), H * 0.2);
    p.c.lineTo(W * (0.42 + i * 0.2), H * (0.09 + i * 0.02));
    p.c.lineTo(W * (0.56 + i * 0.2), H * 0.21);
    p.c.closePath();
    p.c.fillStyle = alpha('#6f8794', 0.55 - i * 0.1);
    p.c.fill();
  }
  fillRect(p, W * 0.34, H * 0.26, W * 0.62, H * 0.05, alpha('#a9bcb6', 0.5));
  // trees at the left and a rise of ground
  foliage(p, W * 0.14, H * 0.36, W * 0.2, H * 0.14, '#415234', 0.8);
  foliage(p, W * 0.06, H * 0.5, W * 0.16, H * 0.12, '#37472c', 0.85);
  p.c.beginPath();
  p.c.moveTo(0, H * 0.52);
  p.c.quadraticCurveTo(W * 0.4, H * 0.46, W, H * 0.56);
  p.c.lineTo(W, H);
  p.c.lineTo(0, H);
  p.c.closePath();
  p.c.fillStyle = p.c.createLinearGradient(0, H * 0.5, 0, H);
  (p.c.fillStyle as CanvasGradient).addColorStop(0, '#6b6a44');
  (p.c.fillStyle as CanvasGradient).addColorStop(1, '#3a3520');
  p.c.fill();

  // Saint Anne seated behind, her head higher and to the left of the Virgin's.
  robed(p, {
    cx: W * 0.42,
    base: H * 0.84,
    headW: W * 0.13,
    gown: '#7d6a3f',
    mantle: '#4e5c3c',
    skin,
    hair: '#6b5330',
    turn: 0.25,
    mantleSide: -1,
    sfumato: 0.55,
  });
  // the Virgin in front, reaching down to the child
  robed(p, {
    cx: W * 0.54,
    base: H * 0.9,
    headW: W * 0.125,
    gown: '#7b3a2c',
    mantle: '#31517c',
    skin,
    hair: '#6f4c28',
    veil: '#2b2318',
    turn: -0.3,
    mantleSide: -1,
    sfumato: 0.5,
    reach: [W * 0.36, H * 0.74],
  });
  // the child with the lamb
  infant(p, W * 0.34, H * 0.7, W * 0.068, shade(skin, 0.08), '#7a5a2c', { lean: -0.2, sfumato: 0.4 });
  ellipse(p, W * 0.24, H * 0.83, W * 0.075, H * 0.045, '#cfc4a8');
  ellipse(p, W * 0.19, H * 0.8, W * 0.03, H * 0.025, '#b8ac90');
  lightPool(p, W * 0.4, H * 0.45, W * 0.4, H * 0.3, '#f0e6c4', 0.2);
  softFocus(p, Math.max(1.4, W * 0.005), 0.45);
  chiaroscuro(p, -1, 0.22);
}

/* ------------------------------------------------------------------------------------- */
/* The Belle Jardinière — 80 x 122 cm                                                    */
/* ------------------------------------------------------------------------------------- */
export function belleJardiniere(p: Paint): void {
  const { W, H } = p;
  const skin = '#d3a67c';
  bg(p, [
    [0, '#b7c2bc'],
    [0.26, '#a9b7ab'],
    [0.44, '#6f7f5e'],
    [1, '#3a3a22'],
  ]);
  // hazy hills and a river band
  for (let i = 0; i < 3; i++) {
    p.c.beginPath();
    p.c.moveTo(0, H * (0.2 + i * 0.05));
    p.c.quadraticCurveTo(W * 0.35, H * (0.16 + i * 0.05), W * 0.7, H * (0.22 + i * 0.05));
    p.c.quadraticCurveTo(W * 0.9, H * (0.25 + i * 0.05), W, H * (0.21 + i * 0.05));
    p.c.lineTo(W, H * (0.4 + i * 0.05));
    p.c.lineTo(0, H * (0.4 + i * 0.05));
    p.c.closePath();
    p.c.fillStyle = alpha('#7e949a', 0.4 - i * 0.1);
    p.c.fill();
  }
  fillRect(p, W * 0.4, H * 0.3, W * 0.6, H * 0.035, alpha('#c3cfc6', 0.6));
  // dark trees behind the figures
  foliage(p, W * 0.18, H * 0.32, W * 0.2, H * 0.14, '#33421f', 0.85);
  foliage(p, W * 0.84, H * 0.3, W * 0.18, H * 0.13, '#2e3c1e', 0.85);
  // meadow with flowers
  p.c.beginPath();
  p.c.moveTo(0, H * 0.62);
  p.c.quadraticCurveTo(W * 0.5, H * 0.58, W, H * 0.64);
  p.c.lineTo(W, H);
  p.c.lineTo(0, H);
  p.c.closePath();
  p.c.fillStyle = p.c.createLinearGradient(0, H * 0.6, 0, H);
  (p.c.fillStyle as CanvasGradient).addColorStop(0, '#6f7442');
  (p.c.fillStyle as CanvasGradient).addColorStop(1, '#33341c');
  p.c.fill();
  for (let i = 0; i < 26; i++) {
    const x = p.r.range(W * 0.05, W * 0.95);
    const y = p.r.range(H * 0.66, H * 0.98);
    const col = p.r.pick(['#d8c46a', '#c96a5a', '#e3dcc0', '#8ea060']);
    soft(p, x, y, W * 0.012, W * 0.012, col, 0.6);
  }

  // Madonna, calm and frontal in daylight
  robed(p, {
    cx: W * 0.52,
    base: H * 0.92,
    headW: W * 0.19,
    gown: '#a33b2c',
    mantle: '#2f4f7c',
    skin,
    hair: '#7a5528',
    veil: '#332a1c',
    turn: -0.25,
    mantleSide: -1,
    sfumato: 0.25,
    reach: [W * 0.38, H * 0.73],
  });
  // the Christ child leaning against her knee with the reed cross
  infant(p, W * 0.35, H * 0.7, W * 0.09, shade(skin, 0.1), '#8a6634', { lean: -0.25, sfumato: 0.2 });
  line(p, [[W * 0.29, H * 0.74], [W * 0.24, H * 0.92]], '#7a6234', Math.max(1.2, W * 0.008));
  line(p, [[W * 0.26, H * 0.78], [W * 0.32, H * 0.77]], '#7a6234', Math.max(1.2, W * 0.008));
  // the infant Baptist at the right
  infant(p, W * 0.7, H * 0.76, W * 0.075, shade(skin, 0.04), '#7a5a2c', { lean: 0.2, sfumato: 0.2 });
  poly(p, [[W * 0.66, H * 0.82], [W * 0.76, H * 0.8], [W * 0.78, H * 0.94], [W * 0.64, H * 0.95]], '#6d5c34');
  lightPool(p, W * 0.3, H * 0.45, W * 0.35, H * 0.3, '#f6edc9', 0.22);
  chiaroscuro(p, -1, 0.16);
}
