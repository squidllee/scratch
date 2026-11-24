/**
 * The three big romantic machines: Géricault's raft, Delacroix's Sardanapalus, and the Apollo
 * ceiling. The first two are built as a diagonal (the raft's motion, the bed's screen-filling
 * diagonal); the ceiling is built as a flat panel with a stucco border, because that is how the
 * Galerie d'Apollon presents it.
 */
import {
  alpha,
  bg,
  chiaroscuro,
  curve,
  ellipse,
  figure,
  fillRect,
  lightPool,
  line,
  mass,
  mix,
  poly,
  scumble,
  shade,
  soft,
  softFocus,
  type FigureDef,
  type Paint,
} from './kit';

/* ------------------------------------------------------------------------------------- */
/* The Raft of the Medusa — 716 x 491 cm                                                 */
/* ------------------------------------------------------------------------------------- */
export function raftOfTheMedusa(p: Paint): void {
  const { W, H, r } = p;
  const skin = '#b98c65';

  bg(p, [
    [0, '#4a4a3c'],
    [0.18, '#6f6a56'],
    [0.3, '#9a9276'],
    [0.36, '#7d7a62'],
    [1, '#232a22'],
  ]);
  // livid light along the horizon and its broken reflections
  fillRect(p, W * 0.3, H * 0.28, W * 0.55, H * 0.04, alpha('#cbc19c', 0.55));
  for (let i = 0; i < 26; i++) {
    const y = H * r.range(0.32, 0.62);
    const x = W * r.range(0, 1);
    line(p, [[x, y], [x + W * r.range(0.01, 0.05), y + r.range(-1, 1)]], alpha('#9a9478', 0.3), Math.max(1, W * 0.002));
  }
  // cloud masses over the horizon
  for (let i = 0; i < 8; i++) {
    mass(p, r.range(W * 0.05, W * 0.95), H * r.range(0.02, 0.24), W * r.range(0.1, 0.24), H * r.range(0.02, 0.06), '#5d5a48', 0.5, 6);
  }
  // the ship that will not see them
  line(p, [[W * 0.865, H * 0.3], [W * 0.868, H * 0.25]], alpha('#d8d0b0', 0.85), Math.max(1, W * 0.003));
  fillRect(p, W * 0.858, H * 0.303, W * 0.024, H * 0.008, alpha('#d8d0b0', 0.85));

  // the sea, dark and churned
  p.c.beginPath();
  p.c.moveTo(0, H * 0.33);
  p.c.quadraticCurveTo(W * 0.4, H * 0.3, W * 0.7, H * 0.35);
  p.c.quadraticCurveTo(W * 0.9, H * 0.38, W, H * 0.36);
  p.c.lineTo(W, H);
  p.c.lineTo(0, H);
  p.c.closePath();
  const sea = p.c.createLinearGradient(0, H * 0.33, 0, H);
  sea.addColorStop(0, '#4b5445');
  sea.addColorStop(0.35, '#2d362b');
  sea.addColorStop(1, '#161d16');
  p.c.fillStyle = sea;
  p.c.fill();
  for (let i = 0; i < 30; i++) {
    const y = H * r.range(0.36, 0.9);
    const x = W * r.range(0, 1);
    curve(p, [[x, y], [x + W * 0.03, y - H * 0.01], [x + W * 0.06, y + H * 0.004]], alpha('#8c8f74', 0.22), Math.max(1, W * 0.0025));
  }

  // the raft: planks in a wedge from the lower left toward the right
  poly(p, [[W * 0.0, H * 0.93], [W * 0.14, H * 0.79], [W * 0.92, H * 0.6], [W * 0.99, H * 0.7], [W * 0.5, H * 1.0], [W * 0.02, H]], '#5c452c');
  for (let i = 0; i < 9; i++) {
    const t = i / 9;
    line(
      p,
      [[W * (0.06 + t * 0.3), H * (0.96 - t * 0.06)], [W * (0.5 + t * 0.48), H * (0.9 - t * 0.1)]],
      alpha(i % 2 === 0 ? '#7d5f3a' : '#3f2e1c', 0.7),
      W * 0.008,
    );
  }
  // mast and the torn sail
  line(p, [[W * 0.15, H * 0.32], [W * 0.17, H * 0.78]], '#4a3722', W * 0.009);
  line(p, [[W * 0.15, H * 0.33], [W * 0.62, H * 0.24]], alpha('#8a7d5e', 0.7), W * 0.004);
  poly(p, [[W * 0.15, H * 0.34], [W * 0.3, H * 0.3], [W * 0.33, H * 0.52], [W * 0.14, H * 0.59]], alpha('#c0b696', 0.55));
  for (let i = 0; i < 4; i++) {
    line(p, [[W * (0.16 + i * 0.045), H * 0.33], [W * (0.15 + i * 0.05), H * 0.57]], alpha('#8d8468', 0.4), W * 0.003);
  }

  // the pyramid of survivors, rising to the right, apex waving a rag.
  const chain: Array<[number, number, number, string]> = [
    [0.36, 0.7, 0.16, '#8a7c5c'],
    [0.4, 0.67, 0.17, '#6f6349'],
    [0.45, 0.63, 0.18, '#a08c62'],
    [0.5, 0.6, 0.18, '#7d6a4a'],
    [0.55, 0.57, 0.17, '#8e7a55'],
    [0.59, 0.54, 0.16, '#6b5c42'],
    [0.63, 0.52, 0.15, '#a5946a'],
  ];
  chain.forEach(([x, y, h, robe]) => {
    figure(p, { x, y, h, pose: 'stand', robe, skin, light: -1, detail: 0.4, lean: -0.06, armUp: 0.5 });
  });
  // the apex: the man who waves
  figure(p, { x: 0.68, y: 0.55, h: 0.19, pose: 'stand', robe: '#9a8560', skin, light: -1, detail: 0.5, armUp: 1, lean: 0.08 });
  line(p, [[W * 0.7, H * 0.4], [W * 0.75, H * 0.32]], alpha('#5c4f38', 0.9), W * 0.012);
  poly(p, [[W * 0.745, H * 0.325], [W * 0.79, H * 0.3], [W * 0.795, H * 0.34], [W * 0.75, H * 0.35]], alpha('#cac0a0', 0.75));
  soft(p, W * 0.74, H * 0.33, W * 0.05, H * 0.05, '#e8dcb0', 0.28);
  // bodies lower down, one despairing father holding a young man
  figure(p, { x: 0.27, y: 0.74, h: 0.15, pose: 'sit', robe: '#6a5a42', skin, light: -1, detail: 0.5 });
  figure(p, { x: 0.22, y: 0.78, h: 0.1, pose: 'sit', robe: skin, skin, nude: true, light: -1, alpha: 0.95 });
  figure(p, { x: 0.1, y: 0.94, h: 0.11, pose: 'recline', robe: skin, skin, nude: true, light: -1, detail: 0.4 });
  figure(p, { x: 0.19, y: 0.98, h: 0.1, pose: 'recline', robe: '#7b6a4c', skin, light: 1 });
  figure(p, { x: 0.42, y: 0.87, h: 0.12, pose: 'recline', robe: '#8d7a58', skin, light: -1 });
  figure(p, { x: 0.5, y: 0.84, h: 0.12, pose: 'sit', robe: '#5f5340', skin, light: -1 });
  // a red cloth and a barrel at the foot of the mast
  poly(p, [[W * 0.3, H * 0.8], [W * 0.4, H * 0.76], [W * 0.42, H * 0.88], [W * 0.32, H * 0.9]], alpha('#7d2b22', 0.8));
  ellipse(p, W * 0.24, H * 0.84, W * 0.03, H * 0.05, '#4a3a24');

  softFocus(p, Math.max(1, W * 0.002), 0.25);
  chiaroscuro(p, 1, 0.3);
}

/* ------------------------------------------------------------------------------------- */
/* The Death of Sardanapalus — 496 x 392 cm                                              */
/* ------------------------------------------------------------------------------------- */
export function deathOfSardanapalus(p: Paint): void {
  const { W, H, r } = p;
  const skin = '#bb8a61';

  bg(p, [
    [0, '#6d4a26'],
    [0.3, '#a06a2e'],
    [0.55, '#8a4a26'],
    [1, '#2c1a10'],
  ]);
  // the fire and smoke behind everything
  lightPool(p, W * 0.62, H * 0.18, W * 0.35, H * 0.25, '#f0b04a', 0.35);
  for (let i = 0; i < 10; i++) {
    mass(p, r.range(W * 0.2, W), H * r.range(0.02, 0.3), W * r.range(0.08, 0.22), H * r.range(0.03, 0.09), '#2f2418', 0.4, 6);
  }
  // the great crimson bed on the diagonal
  p.c.beginPath();
  p.c.moveTo(W * 0.0, H * 0.2);
  p.c.quadraticCurveTo(W * 0.3, H * 0.34, W * 0.58, H * 0.56);
  p.c.lineTo(W * 0.66, H * 0.86);
  p.c.lineTo(W * 0.02, H * 0.9);
  p.c.closePath();
  const bedG = p.c.createLinearGradient(W * 0.1, H * 0.2, W * 0.5, H * 0.9);
  bedG.addColorStop(0, '#a02a24');
  bedG.addColorStop(0.5, '#7a1d1a');
  bedG.addColorStop(1, '#49100f');
  p.c.fillStyle = bedG;
  p.c.fill();
  for (let i = 0; i < 5; i++) {
    curve(
      p,
      [
        [W * (0.06 + i * 0.1), H * (0.32 + i * 0.05)],
        [W * (0.16 + i * 0.1), H * (0.55 + i * 0.05)],
        [W * (0.14 + i * 0.1), H * (0.85)],
      ],
      alpha('#4a1010', 0.35),
      W * 0.02,
    );
  }
  // gold coverlet folds
  for (let i = 0; i < 4; i++) {
    curve(
      p,
      [
        [W * (0.12 + i * 0.09), H * (0.4 + i * 0.05)],
        [W * (0.2 + i * 0.09), H * (0.56 + i * 0.04)],
        [W * (0.24 + i * 0.09), H * (0.72 + i * 0.03)],
      ],
      alpha('#c79a3c', 0.55),
      W * 0.016,
    );
  }

  // the king, reclining at the upper left, propped on one elbow
  figure(p, { x: 0.16, y: 0.36, h: 0.24, pose: 'recline', robe: '#c9a24c', skin, light: -1, detail: 0.7 });
  // his crown and the cup in his hand
  ellipse(p, W * 0.115, H * 0.2, W * 0.022, H * 0.014, '#d8b155');
  ellipse(p, W * 0.23, H * 0.32, W * 0.016, H * 0.014, '#e0bd62');
  // the tall lamp above him, smoking
  line(p, [[W * 0.06, H * 0.02], [W * 0.06, H * 0.16]], '#7a5a2c', W * 0.005);
  ellipse(p, W * 0.06, H * 0.17, W * 0.024, H * 0.016, '#d8a845');
  for (let i = 0; i < 5; i++) {
    mass(p, W * (0.06 + i * 0.01), H * (0.02 + i * 0.008), W * 0.02, H * 0.02, '#3d3020', 0.3, 3);
  }

  // the right half: servants, horses, and the chaos of the destruction
  figure(p, { x: 0.6, y: 0.72, h: 0.26, pose: 'stand', robe: '#8e3a2c', skin, light: 1, detail: 0.5, armUp: 0.4 });
  figure(p, { x: 0.72, y: 0.74, h: 0.3, pose: 'stand', robe: '#b08a3c', skin, light: 1, detail: 0.5, armUp: 0.6 });
  figure(p, { x: 0.86, y: 0.8, h: 0.34, pose: 'stand', robe: '#5f4a2c', skin, light: 1, detail: 0.5 });
  // a woman in white, already fallen, across the bed's foot
  figure(p, { x: 0.46, y: 0.78, h: 0.16, pose: 'swoon', robe: '#e2d9c2', skin, light: -1, detail: 0.5 });
  figure(p, { x: 0.57, y: 0.86, h: 0.14, pose: 'recline', robe: skin, skin, nude: true, light: 1, detail: 0.4 });
  // two horses being brought in at the right: bodies, necks, legs
  const horse = (hx: number, hy: number, s: number, col: string): void => {
    ellipse(p, hx, hy, W * 0.05 * s, H * 0.045 * s, col, -0.2);
    poly(p, [[hx + W * 0.03 * s, hy - H * 0.02 * s], [hx + W * 0.05 * s, hy - H * 0.1 * s], [hx + W * 0.075 * s, hy - H * 0.09 * s], [hx + W * 0.055 * s, hy + H * 0.005 * s]], col);
    ellipse(p, hx + W * 0.075 * s, hy - H * 0.1 * s, W * 0.018 * s, H * 0.016 * s, shade(col, -0.2), 0.3);
    for (let l = 0; l < 4; l++) {
      const lx = hx + W * (l < 2 ? -0.03 : 0.03) * s;
      line(p, [[lx, hy + H * 0.03 * s], [lx + (l % 2 ? W * 0.01 : -W * 0.01) * s, hy + H * 0.11 * s]], col, W * 0.008 * s, 1, 'butt');
    }
    line(p, [[hx - W * 0.045 * s, hy - H * 0.02 * s], [hx - W * 0.06 * s, hy + H * 0.02 * s]], shade(col, -0.3), W * 0.006 * s);
  };
  horse(W * 0.78, H * 0.56, 1.1, '#8a6a42');
  horse(W * 0.93, H * 0.62, 1.2, '#c0a07a');

  // gold vessels at the lower left and a scattering of treasure
  ellipse(p, W * 0.1, H * 0.87, W * 0.04, H * 0.03, '#c9a13e');
  ellipse(p, W * 0.16, H * 0.91, W * 0.03, H * 0.022, '#ddb95c');
  for (let i = 0; i < 12; i++) {
    ellipse(p, W * r.range(0.2, 0.5), H * r.range(0.86, 0.97), W * 0.008, H * 0.006, alpha('#e0bc62', 0.85));
  }
  chiaroscuro(p, 1, 0.34);
}

/* ------------------------------------------------------------------------------------- */
/* Apollo Vanquishing the Python — the Galerie d'Apollon ceiling, 1600 x 800 cm           */
/* ------------------------------------------------------------------------------------- */
export function apolloCeiling(p: Paint): void {
  const { W, H, r } = p;
  // the gilded stucco border: two gilt bands with a rosette in each bay
  bg(p, [
    [0, '#8a6a2e'],
    [0.5, '#a37f36'],
    [1, '#6f5324'],
  ]);
  const band = Math.min(W, H) * 0.075;
  const paintPanel = (): void => {
    p.c.beginPath();
    p.c.roundRect(band, band, W - band * 2, H - band * 2, Math.min(W, H) * 0.08);
    p.c.clip();
  };
  p.c.save();
  paintPanel();
  // the painted ground: warm gold at the edges, blue-green dusk in the middle
  const base = p.c.createRadialGradient(W * 0.6, H * 0.35, Math.min(W, H) * 0.1, W * 0.5, H * 0.5, W * 0.55);
  base.addColorStop(0, '#e0b25a');
  base.addColorStop(0.45, '#a97c3c');
  base.addColorStop(1, '#3f3a24');
  p.c.fillStyle = base;
  p.c.fillRect(band, band, W - band * 2, H - band * 2);

  // Apollo's chariot at the upper right with its rays
  const ax = W * 0.68;
  const ay = H * 0.28;
  for (let i = 0; i < 26; i++) {
    const a = -2.6 + (i / 25) * 2.6;
    const len = Math.min(W, H) * (0.35 + r.range(0, 0.25));
    line(p, [[ax, ay], [ax + Math.cos(a) * len, ay + Math.sin(a) * len]], alpha('#f2d27a', 0.28), W * 0.004);
  }
  lightPool(p, ax, ay, W * 0.28, H * 0.3, '#ffe9a4', 0.55);
  // the sun disc and the chariot
  ellipse(p, ax, ay, W * 0.05, H * 0.06, '#f6dd92');
  ellipse(p, ax, ay, W * 0.032, H * 0.04, '#ffeeae');
  poly(p, [[ax - W * 0.09, ay + H * 0.05], [ax - W * 0.02, ay + H * 0.03], [ax - W * 0.03, ay + H * 0.1], [ax - W * 0.11, ay + H * 0.11]], '#d8ab4e');
  // four horses in profile, running left out of the light
  for (let i = 0; i < 4; i++) {
    const hx = ax - W * (0.1 + i * 0.05);
    const hy = ay + H * (0.03 + (i % 2) * 0.05);
    const s = 1 - i * 0.06;
    ellipse(p, hx, hy, W * 0.042 * s, H * 0.035 * s, alpha('#f0dca6', 0.92), -0.25);
    poly(p, [[hx + W * 0.03 * s, hy - H * 0.02 * s], [hx + W * 0.055 * s, hy - H * 0.075 * s], [hx + W * 0.075 * s, hy - H * 0.065 * s], [hx + W * 0.05 * s, hy + H * 0.005 * s]], alpha('#f6e4b4', 0.95));
    for (let l = 0; l < 4; l++) {
      const lx = hx + W * (l < 2 ? -0.025 : 0.02) * s;
      line(p, [[lx, hy + H * 0.02 * s], [lx - W * 0.03 * s, hy + H * 0.09 * s]], alpha('#e2cb96', 0.9), W * 0.007 * s, 1, 'butt');
    }
  }
  // Apollo himself, small and golden, standing in the chariot
  figure(p, { x: 0.63, y: 0.4, h: 0.13, pose: 'stand', robe: '#f2d489', skin: '#e8bd82', light: 1, detail: 0.5, armUp: 0.9 });

  // the python: a dark coiled serpent in the lower left, beaten into the ground
  for (let i = 0; i < 5; i++) {
    const t = i / 5;
    curve(
      p,
      [
        [W * (0.1 + t * 0.1), H * (0.86 - t * 0.06)],
        [W * (0.24 + t * 0.06), H * (0.7 + t * 0.02)],
        [W * (0.34 + t * 0.05), H * (0.78 + t * 0.03)],
      ],
      alpha('#2c3a26', 0.9),
      W * (0.02 - t * 0.002),
    );
  }
  ellipse(p, W * 0.16, H * 0.8, W * 0.03, H * 0.03, '#26301f', -0.4);
  // naiads and river figures below, in the lower middle
  const figures: Array<[number, number, number, string]> = [
    [0.34, 0.72, 0.16, '#c9a06a'],
    [0.44, 0.76, 0.15, '#a8855c'],
    [0.53, 0.72, 0.14, '#d8b184'],
    [0.26, 0.66, 0.13, '#8e7452'],
  ];
  figures.forEach(([x, y, h, robe]) => {
    figure(p, { x, y, h, pose: 'stand', robe, skin: '#d2a878', light: -1, detail: 0.4, armUp: 0.4 });
  });
  // clouds and water in the lower left corner
  for (let i = 0; i < 6; i++) {
    mass(p, W * r.range(0.12, 0.4), H * r.range(0.78, 0.95), W * r.range(0.06, 0.13), H * r.range(0.03, 0.07), '#6c7a5c', 0.4, 4);
  }
  p.c.restore();

  // the stucco border itself: framing bands, corner scrolls and rosettes
  p.c.save();
  p.c.strokeStyle = '#e3c073';
  p.c.lineWidth = band * 0.34;
  p.c.strokeRect(band * 0.45, band * 0.45, W - band * 0.9, H - band * 0.9);
  p.c.strokeStyle = '#b58c3c';
  p.c.lineWidth = band * 0.12;
  p.c.strokeRect(band * 0.2, band * 0.2, W - band * 0.4, H - band * 0.4);
  const rosette = (x: number, y: number): void => {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ellipse(p, x + Math.cos(a) * band * 0.22, y + Math.sin(a) * band * 0.22, band * 0.14, band * 0.1, alpha('#e8cb84', 0.95), a);
    }
    ellipse(p, x, y, band * 0.12, band * 0.12, '#f0da8e');
  };
  for (let i = 1; i < 6; i++) {
    rosette(W * (i / 6), band * 0.5);
    rosette(W * (i / 6), H - band * 0.5);
  }
  for (let i = 1; i < 3; i++) {
    rosette(band * 0.5, H * (i / 3));
    rosette(W - band * 0.5, H * (i / 3));
  }
  p.c.restore();

}
