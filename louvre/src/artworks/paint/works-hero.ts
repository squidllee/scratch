/**
 * Single-figure works: the portraits and the two Vermeers. These carry the closest looking, so
 * every one is built around a modelled face and a lit ground rather than a silhouette.
 */
import {
  alpha,
  bg,
  chiaroscuro,
  curve,
  ellipse,
  fillRect,
  lightPool,
  line,
  mass,
  poly,
  scumble,
  shade,
  soft,
  softFocus,
  type Paint,
} from './kit';
import { face } from './face';

/* ------------------------------------------------------------------------------------- */
/* Mona Lisa — 53 x 77 cm                                                                */
/* ------------------------------------------------------------------------------------- */
export function monaLisa(p: Paint): void {
  const { W, H, r } = p;
  const horizonL = H * 0.3;
  const horizonR = H * 0.4;
  const skin = '#c39a74';

  // 1. Underpainting: the panel's warm olive ground, lighter where the sky will be.
  bg(p, [
    [0, '#8e9a92'],
    [0.28, '#93a09a'],
    [0.36, '#77745c'],
    [1, '#241f16'],
  ]);

  // 2. Sky above a horizon that does not meet: left is high, right is low.
  p.c.beginPath();
  p.c.moveTo(0, 0);
  p.c.lineTo(W, 0);
  p.c.lineTo(W, horizonR);
  p.c.quadraticCurveTo(W * 0.72, horizonR - H * 0.02, W * 0.52, horizonL + H * 0.03);
  p.c.quadraticCurveTo(W * 0.28, horizonL - H * 0.01, 0, horizonL);
  p.c.closePath();
  const sky = p.c.createLinearGradient(0, 0, 0, horizonR);
  sky.addColorStop(0, '#7f97a0');
  sky.addColorStop(0.55, '#a9bcbb');
  sky.addColorStop(1, '#d3d8c6');
  p.c.fillStyle = sky;
  p.c.fill();

  // 3. Three ridge lines, each paler as it goes back (aerial perspective).
  const ridges: Array<[number, number, string]> = [
    [0.028, 0.5, '#7d8e8c'],
    [0.018, 0.36, '#93a49c'],
    [0.01, 0.24, '#b3c0b4'],
  ];
  ridges.forEach(([lift, alphaRidge, col], idx) => {
    p.c.beginPath();
    p.c.moveTo(-4, horizonL + H * lift + H * 0.02);
    const peaks = 7 + idx;
    for (let i = 0; i <= peaks; i++) {
      const t = i / peaks;
      const x = -4 + t * (W + 8);
      const y = horizonL + H * lift - Math.sin(t * Math.PI * 2.4 + idx) * H * 0.045 * (1 - idx * 0.3) + r.range(-2, 2);
      p.c.lineTo(x, y + H * 0.012);
      p.c.lineTo(x + W / peaks * 0.4, y + H * 0.05);
    }
    p.c.lineTo(W + 4, horizonR + H * 0.06);
    p.c.lineTo(-4, horizonR + H * 0.06);
    p.c.closePath();
    p.c.fillStyle = alpha(col, alphaRidge);
    p.c.fill();
  });

  // 4. The lake and the winding road.
  ellipse(p, W * 0.13, horizonL + H * 0.06, W * 0.16, H * 0.022, alpha('#cfd8d0', 0.7));
  ellipse(p, W * 0.83, horizonR + H * 0.03, W * 0.13, H * 0.02, alpha('#c6d1c9', 0.55));
  curve(p, [[W * 0.01, H * 0.44], [W * 0.1, H * 0.4], [W * 0.19, H * 0.37], [W * 0.3, H * 0.35]], alpha('#b9b39a', 0.6), Math.max(1.2, W * 0.008));
  // eroded ochre rock at both edges
  mass(p, W * 0.06, H * 0.4, W * 0.12, H * 0.05, '#8a7247', 0.55, 6);
  mass(p, W * 0.95, H * 0.44, W * 0.1, H * 0.06, '#8d7550', 0.5, 6);
  // the pale bridge on the right
  line(p, [[W * 0.78, horizonR + H * 0.01], [W * 0.88, horizonR]], alpha('#cfc8ae', 0.75), Math.max(1, W * 0.007));
  scumble(p, '#c9d6d2', 0.1, 14);

  // 5. The figure: a dark pyramid of dress with the face the only real light in the panel.
  const headCx = W * 0.51;
  const headCy = H * 0.245;
  const headW = W * 0.19;
  // shoulders and body
  p.c.beginPath();
  p.c.moveTo(headCx - headW * 0.62, headCy + headW * 0.95);
  p.c.quadraticCurveTo(W * 0.2, H * 0.42, W * 0.06, H * 1.02);
  p.c.lineTo(W * 0.98, H * 1.02);
  p.c.quadraticCurveTo(W * 0.86, H * 0.44, headCx + headW * 0.6, headCy + headW * 0.95);
  p.c.closePath();
  const dress = p.c.createLinearGradient(W * 0.2, H * 0.4, W * 0.9, H * 0.95);
  dress.addColorStop(0, '#3b3729');
  dress.addColorStop(0.4, '#241f17');
  dress.addColorStop(1, '#12100b');
  p.c.fillStyle = dress;
  p.c.fill();
  // the bodice's low square neckline and the chemise edge
  poly(
    p,
    [
      [headCx - headW * 0.5, headCy + headW * 1.02],
      [headCx - headW * 0.1, headCy + headW * 1.5],
      [headCx + headW * 0.42, headCy + headW * 1.02],
    ],
    '#5a5038',
  );
  // sleeve highlights: two soft bands following the arms
  curve(p, [[W * 0.24, H * 0.62], [W * 0.19, H * 0.76], [W * 0.2, H * 0.92]], alpha('#4b4534', 0.65), W * 0.05);
  curve(p, [[W * 0.78, H * 0.62], [W * 0.83, H * 0.78], [W * 0.82, H * 0.94]], alpha('#4b4534', 0.5), W * 0.05);

  // neck and breast
  poly(p, [[headCx - headW * 0.26, headCy + headW * 0.8], [headCx + headW * 0.26, headCy + headW * 0.8], [headCx + headW * 0.36, headCy + headW * 1.5], [headCx - headW * 0.36, headCy + headW * 1.5]], skin);
  soft(p, headCx + headW * 0.2, headCy + headW * 1.2, headW * 0.4, headW * 0.4, shade(skin, -0.3), 0.5);

  face(p, {
    cx: headCx,
    cy: headCy,
    w: headW,
    skin,
    light: -1,
    turn: -0.16,
    hair: '#2a2116',
    veil: '#191510',
    sfumato: 0.6,
  });

  // hands crossed at the lower left: one over the other, resting on the arm of a chair.
  const handY = H * 0.895;
  const handX = W * 0.36;
  for (let i = 0; i < 2; i++) {
    const hy = handY + i * H * 0.045;
    const hx = handX + i * W * 0.045;
    const hg = p.c.createLinearGradient(hx - W * 0.06, hy, hx + W * 0.08, hy);
    hg.addColorStop(0, shade(skin, 0.14));
    hg.addColorStop(1, shade(skin, -0.34));
    ellipse(p, hx, hy, W * 0.085, H * 0.032, hg, -0.12 + i * 0.12);
    for (let k = 0; k < 4; k++) {
      line(
        p,
        [
          [hx - W * 0.05 + k * W * 0.028, hy + H * 0.006],
          [hx - W * 0.035 + k * W * 0.026, hy + H * 0.026],
        ],
        alpha(shade(skin, -0.45), 0.45),
        Math.max(1, W * 0.004),
      );
    }
  }
  // the chair arm's dark edge under the hands
  fillRect(p, W * 0.2, H * 0.94, W * 0.42, H * 0.03, alpha('#100d08', 0.55));

  // 6. Finish: sfumato, then age.
  softFocus(p, Math.max(1, W * 0.004), 0.4);
}

/* ------------------------------------------------------------------------------------- */
/* Grande Odalisque — 162 x 91 cm                                                        */
/* ------------------------------------------------------------------------------------- */
export function grandeOdalisque(p: Paint): void {
  const { W, H } = p;
  const flesh = '#d9a87f';
  const shadow = '#a8785a';
  const blue = '#2f4468';
  const deepBlue = '#22304a';

  bg(p, [
    [0, '#3c4a5e'],
    [0.45, '#4d5c6c'],
    [1, '#2a3446'],
  ]);
  // curtain in the upper right, heavy folds
  poly(p, [[W * 0.7, 0], [W, 0], [W, H * 0.66], [W * 0.74, H * 0.5]], blue);
  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    curve(
      p,
      [[W * (0.72 + t * 0.26), 0], [W * (0.74 + t * 0.26), H * 0.28], [W * (0.76 + t * 0.26), H * 0.56]],
      alpha(i % 2 === 0 ? shade(blue, 0.24) : deepBlue, 0.6),
      W * 0.012,
    );
  }
  // the divan: blue cushion mass with the sheet under it
  p.c.beginPath();
  p.c.moveTo(0, H * 0.62);
  p.c.quadraticCurveTo(W * 0.3, H * 0.5, W * 0.62, H * 0.58);
  p.c.quadraticCurveTo(W * 0.86, H * 0.62, W, H * 0.56);
  p.c.lineTo(W, H);
  p.c.lineTo(0, H);
  p.c.closePath();
  const divan = p.c.createLinearGradient(0, H * 0.55, 0, H);
  divan.addColorStop(0, '#5c7396');
  divan.addColorStop(0.5, blue);
  divan.addColorStop(1, deepBlue);
  p.c.fillStyle = divan;
  p.c.fill();
  for (let i = 0; i < 9; i++) {
    const x = W * (0.05 + i * 0.11);
    curve(p, [[x, H * 0.62], [x + W * 0.02, H * 0.8], [x + W * 0.01, H]], alpha('#1b2438', 0.3), W * 0.008);
  }
  // white sheet pooled at the left
  mass(p, W * 0.12, H * 0.72, W * 0.2, H * 0.16, '#dfe3e2', 0.65, 5);

  // body: hip mass low left, back sweeping up to the shoulder at the right.
  const hip: [number, number] = [W * 0.3, H * 0.66];
  const shoulder: [number, number] = [W * 0.62, H * 0.44];
  const head: [number, number] = [W * 0.71, H * 0.37];
  p.c.beginPath();
  p.c.moveTo(W * 0.06, H * 0.9);
  p.c.quadraticCurveTo(W * 0.12, H * 0.62, hip[0], hip[1] - H * 0.06);
  p.c.quadraticCurveTo(W * 0.46, H * 0.56, shoulder[0], shoulder[1]);
  p.c.quadraticCurveTo(W * 0.68, H * 0.4, head[0] + W * 0.02, head[1] + H * 0.04);
  p.c.lineTo(head[0] - W * 0.04, head[1] + H * 0.02);
  p.c.quadraticCurveTo(W * 0.66, H * 0.5, W * 0.6, H * 0.56);
  p.c.quadraticCurveTo(W * 0.44, H * 0.68, hip[0] + W * 0.04, hip[1] + H * 0.08);
  p.c.quadraticCurveTo(W * 0.2, H * 0.78, W * 0.14, H * 0.94);
  p.c.closePath();
  const bodyG = p.c.createLinearGradient(W * 0.1, H * 0.4, W * 0.7, H * 0.95);
  bodyG.addColorStop(0, shade(flesh, 0.16));
  bodyG.addColorStop(0.52, flesh);
  bodyG.addColorStop(1, shadow);
  p.c.fillStyle = bodyG;
  p.c.fill();

  // spine hollow and the buttock's shadow, the two shapes that make the pose read.
  curve(p, [[W * 0.32, H * 0.58], [W * 0.46, H * 0.52], [W * 0.58, H * 0.47]], alpha(shadow, 0.55), W * 0.02);
  soft(p, W * 0.34, H * 0.68, W * 0.1, H * 0.09, shade(flesh, -0.28), 0.55);
  soft(p, W * 0.46, H * 0.7, W * 0.12, H * 0.08, shade(flesh, 0.2), 0.35);

  // extended leg to the lower left, and the bent leg under it.
  p.c.beginPath();
  p.c.moveTo(W * 0.24, H * 0.68);
  p.c.quadraticCurveTo(W * 0.14, H * 0.84, W * 0.02, H * 0.95);
  p.c.lineTo(W * 0.06, H);
  p.c.quadraticCurveTo(W * 0.2, H * 0.9, W * 0.32, H * 0.76);
  p.c.closePath();
  const legG = p.c.createLinearGradient(W * 0.02, H * 0.7, W * 0.3, H);
  legG.addColorStop(0, shade(flesh, 0.12));
  legG.addColorStop(1, shade(shadow, -0.1));
  p.c.fillStyle = legG;
  p.c.fill();
  curve(p, [[W * 0.28, H * 0.72], [W * 0.42, H * 0.82], [W * 0.5, H * 0.78]], alpha(shade(flesh, -0.3), 0.7), W * 0.016);
  // arm along the thigh
  p.c.strokeStyle = shade(flesh, -0.1);
  p.c.lineCap = 'round';
  p.c.lineWidth = W * 0.032;
  p.c.beginPath();
  p.c.moveTo(W * 0.6, H * 0.5);
  p.c.quadraticCurveTo(W * 0.52, H * 0.62, W * 0.44, H * 0.68);
  p.c.stroke();
  ellipse(p, W * 0.43, H * 0.69, W * 0.022, H * 0.03, shade(flesh, -0.05));

  // head turned over the shoulder toward us, turban, hair.
  face(p, {
    cx: head[0],
    cy: head[1],
    w: W * 0.1,
    skin: shade(flesh, 0.04),
    light: -1,
    turn: 0.45,
    hair: '#2b1d14',
    sfumato: 0.35,
  });
  // striped turban
  p.c.beginPath();
  p.c.ellipse(head[0] + W * 0.005, head[1] - H * 0.045, W * 0.075, H * 0.05, -0.2, Math.PI * 0.92, Math.PI * 2.1);
  p.c.fillStyle = '#c8a35c';
  p.c.fill();
  for (let i = 0; i < 3; i++) {
    curve(
      p,
      [[head[0] - W * 0.07, head[1] - H * 0.03 + i * H * 0.014], [head[0], head[1] - H * 0.07 + i * H * 0.014], [head[0] + W * 0.07, head[1] - H * 0.025 + i * H * 0.012]],
      i % 2 === 0 ? '#7d5c2c' : '#e6d3a5',
      W * 0.008,
      0.8,
    );
  }
  // peacock feather fan at the right
  for (let i = 0; i < 5; i++) {
    const a = -0.9 + i * 0.22;
    const fx = W * 0.9;
    const fy = H * 0.62;
    const ex = fx + Math.cos(a) * W * 0.08;
    const ey = fy - Math.sin(a) * H * 0.26;
    curve(p, [[fx, fy], [(fx + ex) / 2 - W * 0.03, (fy + ey) / 2], [ex, ey]], '#3f7a63', W * 0.008, 0.85);
    ellipse(p, ex, ey, W * 0.014, H * 0.014, alpha('#2d6b8a', 0.9));
    ellipse(p, ex, ey, W * 0.007, H * 0.007, '#c9a24a');
  }
  softFocus(p, Math.max(1, W * 0.003), 0.28);
}

/* ------------------------------------------------------------------------------------- */
/* The Lacemaker — 21 x 24 cm                                                            */
/* ------------------------------------------------------------------------------------- */
export function lacemaker(p: Paint): void {
  const { W, H } = p;
  const skin = '#d8ab84';
  bg(p, [
    [0, '#6b5b42'],
    [0.5, '#57492f'],
    [1, '#3b3122'],
  ]);
  // the wall's soft light from the left and the shadowed corner at the right
  soft(p, W * 0.1, H * 0.3, W * 0.5, H * 0.45, '#a08c62', 0.4);
  soft(p, W * 0.92, H * 0.7, W * 0.4, H * 0.5, '#231c13', 0.6);
  // table at the right with a blue cloth and a book
  poly(p, [[W * 0.62, H * 0.6], [W, H * 0.52], [W, H], [W * 0.6, H]], '#4a4231');
  poly(p, [[W * 0.66, H * 0.63], [W, H * 0.56], [W, H * 0.74], [W * 0.66, H * 0.8]], '#2e4460');
  fillRect(p, W * 0.72, H * 0.56, W * 0.24, H * 0.05, '#7a2f2a');
  // the sewing cushion with its pins and bobbins
  poly(p, [[W * 0.34, H * 0.62], [W * 0.72, H * 0.58], [W * 0.7, H * 0.76], [W * 0.36, H * 0.8]], '#8f3b33');
  poly(p, [[W * 0.36, H * 0.62], [W * 0.72, H * 0.58], [W * 0.7, H * 0.66], [W * 0.37, H * 0.7]], '#d8cfb8');
  for (let i = 0; i < 10; i++) {
    const x = W * (0.38 + i * 0.032);
    line(p, [[x, H * 0.64], [x + W * 0.004, H * 0.72]], alpha('#2b2118', 0.8), Math.max(1, W * 0.006));
    ellipse(p, x + W * 0.004, H * 0.73, W * 0.008, H * 0.008, i % 3 === 0 ? '#b03a2e' : '#e6ddc4');
  }

  // the girl: yellow bodice, white collar, head bent over the work.
  const headCx = W * 0.4;
  const headCy = H * 0.28;
  const headW = W * 0.2;
  poly(
    p,
    [
      [W * 0.12, H],
      [W * 0.16, H * 0.62],
      [W * 0.3, H * 0.46],
      [W * 0.52, H * 0.46],
      [W * 0.6, H * 0.68],
      [W * 0.56, H],
    ],
    '#c79b2e',
  );
  // bodice shading and sleeve
  soft(p, W * 0.22, H * 0.72, W * 0.2, H * 0.3, '#8a6516', 0.5);
  soft(p, W * 0.46, H * 0.62, W * 0.1, H * 0.16, '#e8c25a', 0.5);
  line(p, [[W * 0.18, H * 0.62], [W * 0.26, H * 0.98]], alpha('#7a5610', 0.5), W * 0.02);
  // white collar and cap edge
  poly(p, [[W * 0.28, H * 0.47], [W * 0.53, H * 0.47], [W * 0.5, H * 0.55], [W * 0.3, H * 0.56]], '#eae4d2');
  // neck and jaw, head bent forward
  poly(p, [[headCx - headW * 0.2, headCy + headW * 0.7], [headCx + headW * 0.24, headCy + headW * 0.66], [headCx + headW * 0.26, headCy + headW * 1.2], [headCx - headW * 0.22, headCy + headW * 1.2]], skin);
  p.c.save();
  p.c.translate(headCx, headCy);
  p.c.rotate(0.32);
  face(p, {
    cx: 0,
    cy: 0,
    w: headW,
    skin,
    light: -1,
    turn: 0.18,
    hair: '#6a4a26',
    sleepy: 0.85,
    sfumato: 0.2,
  });
  p.c.restore();
  // hair bun and ribbon
  ellipse(p, headCx + headW * 0.52, headCy - headW * 0.1, headW * 0.26, headW * 0.3, '#5d3d1e');
  ellipse(p, headCx + headW * 0.5, headCy - headW * 0.26, headW * 0.2, headW * 0.09, '#c73b3b');
  // hands at the cushion
  ellipse(p, W * 0.44, H * 0.63, W * 0.05, H * 0.03, skin, -0.3);
  ellipse(p, W * 0.52, H * 0.62, W * 0.045, H * 0.028, shade(skin, -0.12), -0.2);
  // the threads
  for (let i = 0; i < 4; i++) {
    curve(p, [[W * 0.46, H * 0.64], [W * (0.5 + i * 0.02), H * 0.7], [W * (0.46 + i * 0.03), H * 0.78]], i % 2 === 0 ? '#d8cdb0' : '#a8352c', Math.max(0.8, W * 0.006), 0.8);
  }
  lightPool(p, W * 0.24, H * 0.4, W * 0.3, H * 0.4, '#f0dca8', 0.25);
  chiaroscuro(p, -1, 0.22);
}

/* ------------------------------------------------------------------------------------- */
/* The Astronomer — 45 x 51 cm                                                           */
/* ------------------------------------------------------------------------------------- */
export function astronomer(p: Paint): void {
  const { W, H } = p;
  const skin = '#cf9d78';
  bg(p, [
    [0, '#6a5f47'],
    [0.5, '#544a35'],
    [1, '#332b1f'],
  ]);
  // the wall chart behind him: a pale rectangle of faint constellation lines
  fillRect(p, W * 0.06, H * 0.18, W * 0.3, H * 0.34, alpha('#c8bda0', 0.5));
  fillRect(p, W * 0.06, H * 0.18, W * 0.3, H * 0.01, alpha('#3b3226', 0.5));
  for (let i = 0; i < 8; i++) {
    line(
      p,
      [
        [W * (0.08 + (i % 4) * 0.07), H * (0.22 + Math.floor(i / 4) * 0.12)],
        [W * (0.12 + (i % 4) * 0.07), H * (0.3 + Math.floor(i / 4) * 0.1)],
      ],
      alpha('#4a4030', 0.5),
      Math.max(0.7, W * 0.003),
    );
  }
  // window light from the left
  lightPool(p, W * 0.06, H * 0.45, W * 0.34, H * 0.5, '#f2e2bb', 0.4);

  // table, cloth, books
  poly(p, [[W * 0.24, H * 0.72], [W, H * 0.66], [W, H], [W * 0.2, H]], '#3f3527');
  poly(p, [[W * 0.26, H * 0.72], [W, H * 0.66], [W, H * 0.78], [W * 0.26, H * 0.86]], '#8c3a30');
  fillRect(p, W * 0.28, H * 0.82, W * 0.16, H * 0.05, '#d9cfae');
  fillRect(p, W * 0.31, H * 0.79, W * 0.14, H * 0.05, '#3d5069');
  fillRect(p, W * 0.6, H * 0.8, W * 0.2, H * 0.05, '#2c3c50');

  // the scholar: seated, turned to our right, blue robe with gold lining.
  poly(
    p,
    [
      [W * 0.3, H],
      [W * 0.34, H * 0.66],
      [W * 0.46, H * 0.5],
      [W * 0.62, H * 0.52],
      [W * 0.76, H * 0.72],
      [W * 0.78, H],
    ],
    '#3d5470',
  );
  // robe folds and the gold under-layer at the sleeve
  for (let i = 0; i < 5; i++) {
    curve(
      p,
      [[W * (0.4 + i * 0.06), H * 0.58], [W * (0.42 + i * 0.06), H * 0.78], [W * (0.4 + i * 0.06), H]],
      alpha('#26384c', 0.55),
      W * 0.012,
    );
  }
  poly(p, [[W * 0.62, H * 0.54], [W * 0.74, H * 0.62], [W * 0.72, H * 0.78], [W * 0.6, H * 0.7]], '#b08a3c');
  // arm reaching to the globe
  p.c.strokeStyle = '#3d5470';
  p.c.lineCap = 'round';
  p.c.lineWidth = W * 0.055;
  p.c.beginPath();
  p.c.moveTo(W * 0.6, H * 0.6);
  p.c.quadraticCurveTo(W * 0.68, H * 0.66, W * 0.7, H * 0.74);
  p.c.stroke();
  // collar
  poly(p, [[W * 0.44, H * 0.5], [W * 0.56, H * 0.5], [W * 0.52, H * 0.57], [W * 0.46, H * 0.57]], '#e6dcc4');
  // head with long hair and the red cap
  const headCx = W * 0.46;
  const headCy = H * 0.24;
  const headW = W * 0.2;
  ellipse(p, headCx, headCy + headW * 0.9, headW * 0.5, headW * 0.3, '#5b3f21');
  ellipse(p, headCx - headW * 0.42, headCy + headW * 0.5, headW * 0.34, headW * 0.7, '#64462a');
  ellipse(p, headCx + headW * 0.44, headCy + headW * 0.5, headW * 0.34, headW * 0.7, '#64462a');
  face(p, { cx: headCx, cy: headCy, w: headW * 0.86, skin, light: -1, turn: 0.3, hair: '#6b4a28' });
  p.c.beginPath();
  p.c.ellipse(headCx + headW * 0.04, headCy - headW * 0.34, headW * 0.48, headW * 0.32, 0.1, Math.PI * 0.98, Math.PI * 2.08);
  p.c.fillStyle = '#8e2f2a';
  p.c.fill();

  // the celestial globe: a sphere with gold meridian rings, on a stand.
  const gx = W * 0.72;
  const gy = H * 0.72;
  const gr = W * 0.14;
  p.c.beginPath();
  p.c.arc(gx, gy, gr, 0, Math.PI * 2);
  const globe = p.c.createRadialGradient(gx - gr * 0.4, gy - gr * 0.4, gr * 0.1, gx, gy, gr);
  globe.addColorStop(0, '#9c8a63');
  globe.addColorStop(0.7, '#6c5c3c');
  globe.addColorStop(1, '#3c3322');
  p.c.fillStyle = globe;
  p.c.fill();
  for (let i = 0; i < 3; i++) {
    p.c.beginPath();
    p.c.ellipse(gx, gy, gr * (1 - i * 0.06), gr * (1 - i * 0.28), 0.4 + i * 0.5, 0, Math.PI * 2);
    p.c.strokeStyle = alpha('#d8b45c', 0.85);
    p.c.lineWidth = Math.max(1, W * 0.006);
    p.c.stroke();
  }
  fillRect(p, gx - gr * 0.16, gy + gr, gr * 0.32, H * 0.08, '#4a3b26');
  // his hand on the globe
  ellipse(p, W * 0.68, H * 0.72, W * 0.032, H * 0.028, skin, -0.4);
  chiaroscuro(p, -1, 0.3);
}
