/**
 * The four history machines: Veronese's banquet, David's two set pieces, Delacroix's barricade.
 * These are crowd pictures — the reading order at museum distance is architecture, then the massed
 * figures, then the hero — so each one is built architecture-first and the figures are placed from
 * the description's own arrangement (left / centre / right thirds).
 */
import {
  alpha,
  archOpening,
  bg,
  chiaroscuro,
  column,
  curve,
  ellipse,
  figure,
  fillRect,
  lightPool,
  line,
  mass,
  mix,
  perspectiveFloor,
  poly,
  scumble,
  shade,
  soft,
  softFocus,
  type FigureDef,
  type Paint,
} from './kit';
import { face } from './face';

/* ------------------------------------------------------------------------------------- */
/* The Wedding Feast at Cana — 994 x 677 cm                                              */
/* ------------------------------------------------------------------------------------- */
export function weddingAtCana(p: Paint): void {
  const { W, H, r } = p;
  const skin = '#c79c74';
  const stone = '#cbbfa6';

  // 1. Sky, distant terrace and balustrade.
  bg(p, [
    [0, '#8fa7bd'],
    [0.22, '#b9c8cf'],
    [0.38, '#cfd2c4'],
    [0.5, '#a9a48c'],
    [1, '#6b6047'],
  ]);
  // soft cloud masses, higher at the left
  for (let i = 0; i < 9; i++) {
    mass(p, r.range(W * 0.05, W * 0.95), H * r.range(0.02, 0.2), W * r.range(0.08, 0.18), H * r.range(0.02, 0.05), '#f0eee2', 0.5, 5);
  }
  // a pale classical building on the far side of the terrace
  fillRect(p, W * 0.26, H * 0.26, W * 0.48, H * 0.1, alpha('#d8d4c4', 0.55));
  for (let i = 0; i < 7; i++) {
    column(p, W * (0.28 + i * 0.07), H * 0.26, H * 0.36, W * 0.006, '#cfc6ae', -1);
  }
  // balustrade with its vase finials
  fillRect(p, W * 0.2, H * 0.36, W * 0.6, H * 0.02, alpha('#bdb49c', 0.85));
  for (let i = 0; i < 14; i++) {
    const x = W * (0.22 + i * 0.041);
    fillRect(p, x, H * 0.362, W * 0.012, H * 0.03, alpha('#a89e86', 0.7));
  }

  // 2. The two giant Corinthian columns: they run off the top of the canvas.
  for (const cx of [W * 0.185, W * 0.815]) {
    column(p, cx, 0, H * 0.62, W * 0.043, '#b8ac92', cx < W * 0.5 ? -1 : 1);
    // capital: acanthus block and volutes at the top
    fillRect(p, cx - W * 0.058, H * 0.02, W * 0.116, H * 0.05, shade('#b8ac92', 0.08));
    fillRect(p, cx - W * 0.052, 0, W * 0.104, H * 0.02, shade('#b8ac92', -0.14));
    for (let i = 0; i < 4; i++) {
      ellipse(p, cx + (i - 1.5) * W * 0.022, H * 0.045, W * 0.013, H * 0.011, alpha('#8e846c', 0.8));
    }
    // fluting highlight down the shaft
    line(p, [[cx - W * 0.03, H * 0.08], [cx - W * 0.03, H * 0.6]], alpha('#e3dcc8', 0.35), W * 0.008);
  }

  // 3. The table: a long white cloth across the full width.
  poly(p, [[W * 0.02, H * 0.55], [W * 0.98, H * 0.55], [W * 0.98, H * 0.62], [W * 0.02, H * 0.62]], '#e6e3d6');
  poly(p, [[W * 0.02, H * 0.6], [W * 0.98, H * 0.6], [W * 0.98, H * 0.635], [W * 0.02, H * 0.635]], alpha('#b9b6a6', 0.7));
  // a few vessels and a white pyramidal centrepiece
  for (let i = 0; i < 16; i++) {
    const x = W * (0.05 + i * 0.059);
    ellipse(p, x, H * 0.585, W * 0.007, H * 0.008, alpha('#cfd6cd', 0.85));
    fillRect(p, x - W * 0.002, H * 0.56, W * 0.004, H * 0.022, alpha('#dfe4da', 0.8));
  }
  poly(p, [[W * 0.48, H * 0.5], [W * 0.52, H * 0.5], [W * 0.545, H * 0.56], [W * 0.455, H * 0.56]], '#e9e6d8');

  // 4. Marble floor in perspective running to the horizon at the table.
  perspectiveFloor(p, W * 0.5, H * 0.64, H * 1.02, '#a8a293', '#6e6a5e', 8, 18);

  // 5. The guests: two rows behind the table, Christ at the exact centre.
  const seated: FigureDef[] = [];
  for (let i = 0; i < 18; i++) {
    const t = (i + 0.5) / 18;
    const x = 0.06 + t * 0.88;
    const centre = Math.abs(x - 0.5) < 0.1;
    const robe = centre ? '#b9a05c' : p.r.pick(['#d8d3c4', '#8d3a3a', '#3f4f74', '#6d7048', '#c9b89a', '#7a4a5c']);
    seated.push({
      x: x + r.range(-0.004, 0.004),
      y: 0.575,
      h: 0.115,
      pose: 'sit',
      robe,
      skin,
      light: -1,
    });
  }
  for (const f of seated) figure(p, f);
  // Christ: the smallest figure, dead centre, with a faint gold halo.
  soft(p, W * 0.5, H * 0.445, W * 0.028, H * 0.03, '#f2d98a', 0.5);
  figure(p, { x: 0.5, y: 0.55, h: 0.125, pose: 'sit', robe: '#c3a460', skin, hair: '#4a3320' });
  // the standing row behind them, mostly servants and guests
  for (let i = 0; i < 12; i++) {
    const t = (i + 0.5) / 12;
    figure(p, {
      x: 0.12 + t * 0.76 + r.range(-0.004, 0.004),
      y: 0.5,
      h: 0.14,
      pose: 'stand',
      robe: p.r.pick(['#8d3a3a', '#43537a', '#cfc7ae', '#6f5a3a']),
      skin,
      light: -1,
    });
  }

  // 6. Foreground left: the musicians with lutes, painted half-length and large.
  const musicians: Array<[number, string]> = [
    [0.14, '#7a2f2c'],
    [0.26, '#2f4263'],
    [0.37, '#5c4a2c'],
    [0.47, '#84463a'],
  ];
  musicians.forEach(([x, robe], i) => {
    figure(p, { x, y: 1.02, h: 0.42, pose: 'sit', robe, skin, light: -1, detail: 0.6, armUp: 0.15 });
    // the lute: a big wooden pear shape across the body
    const ly = H * 0.8;
    const lx = W * (x + 0.035);
    ellipse(p, lx, ly, W * 0.028, H * 0.035, i % 2 === 0 ? '#8a6234' : '#6f4c28', -0.5);
    ellipse(p, lx - W * 0.02, ly - H * 0.01, W * 0.014, H * 0.012, '#5a3c1e', -0.5);
    line(p, [[lx, ly - H * 0.02], [lx + W * 0.05, ly - H * 0.06]], '#a8823f', W * 0.005);
  });

  // 7. Lower right: the dwarf with the parrot on his wrist.
  figure(p, { x: 0.87, y: 0.98, h: 0.22, pose: 'dwarf', robe: '#5d5a46', skin, light: 1 });
  ellipse(p, W * 0.905, H * 0.79, W * 0.012, H * 0.018, '#4f7a3a');
  ellipse(p, W * 0.909, H * 0.777, W * 0.006, H * 0.008, '#b03a2a');

  // 8. A gilt-framed background panel behind the table on the right, as in the painting.
  fillRect(p, W * 0.6, H * 0.4, W * 0.14, H * 0.12, alpha('#7a6a48', 0.5));

  softFocus(p, Math.max(1, W * 0.0016), 0.2);
}

/* ------------------------------------------------------------------------------------- */
/* The Coronation of Napoleon — 979 x 621 cm                                             */
/* ------------------------------------------------------------------------------------- */
export function coronation(p: Paint): void {
  const { W, H, r } = p;
  const skin = '#c99b74';
  const stone = '#7d6f58';

  bg(p, [
    [0, '#3b3328'],
    [0.3, '#5a4f3e'],
    [0.62, '#6d5f48'],
    [1, '#241f18'],
  ]);
  // the piers of Notre-Dame, in a shallow rank
  for (let i = 0; i < 5; i++) {
    const x = W * (0.1 + i * 0.21);
    fillRect(p, x - W * 0.028, 0, W * 0.056, H * 0.66, alpha(stone, 0.8));
    fillRect(p, x - W * 0.034, H * 0.02, W * 0.068, H * 0.03, alpha(shade(stone, 0.12), 0.8));
    fillRect(p, x - W * 0.032, H * 0.6, W * 0.064, H * 0.06, alpha(shade(stone, -0.2), 0.8));
  }
  // crimson hangings high on the walls
  for (let i = 0; i < 6; i++) {
    const x = W * (0.02 + i * 0.17);
    fillRect(p, x, H * 0.02, W * 0.13, H * 0.16, alpha('#6d2420', 0.55));
    for (let k = 0; k < 3; k++) {
      line(p, [[x + W * (0.02 + k * 0.04), H * 0.02], [x + W * (0.02 + k * 0.04), H * 0.18]], alpha('#3d1210', 0.4), W * 0.006);
    }
  }
  // a warm pool of light down the centre where the ceremony happens
  lightPool(p, W * 0.45, H * 0.3, W * 0.3, H * 0.4, '#e8cf9a', 0.25);

  // the shallow stage: a low dais and steps running across the middle ground
  poly(p, [[0, H * 0.62], [W, H * 0.6], [W, H * 0.68], [0, H * 0.7]], alpha('#786a52', 0.9));
  poly(p, [[0, H * 0.7], [W, H * 0.68], [W, H * 0.98], [0, H * 1.0]], '#5c4f3c');
  // the carpet of the tribune
  poly(p, [[W * 0.04, H * 0.7], [W * 0.96, H * 0.685], [W * 0.98, H * 0.9], [W * 0.02, H * 0.92]], alpha('#6b2a24', 0.55));

  // left half: the civil party in red, white and blue, ranked.
  for (let i = 0; i < 14; i++) {
    const t = i / 14;
    const x = 0.045 + t * 0.3 + r.range(-0.004, 0.004);
    figure(p, {
      x,
      y: 0.7 - (i % 3) * 0.012,
      h: 0.2 + (i % 2) * 0.014,
      pose: 'stand',
      robe: p.r.pick(['#8c2b26', '#2e3f6b', '#d9d3c2', '#c9a347']),
      skin,
      light: -1,
    });
  }
  // the marshals close to the emperor, in front of the others
  figure(p, { x: 0.28, y: 0.76, h: 0.26, pose: 'stand', robe: '#8f2f28', skin, light: -1, detail: 0.4 });
  figure(p, { x: 0.35, y: 0.77, h: 0.27, pose: 'stand', robe: '#2c3f6c', skin, light: -1, detail: 0.4 });

  // centre-left: Napoleon in scarlet and white; he holds the crown above Josephine.
  figure(p, { x: 0.43, y: 0.7, h: 0.34, pose: 'stand', robe: '#a8251f', skin, light: -1, detail: 0.7, armUp: 0.85 });
  // white silk tunic under the scarlet mantle
  poly(p, [[W * 0.415, H * 0.5], [W * 0.445, H * 0.49], [W * 0.45, H * 0.62], [W * 0.41, H * 0.63]], alpha('#eee7d6', 0.9));
  // the crown, raised, catching the light
  ellipse(p, W * 0.43, H * 0.42, W * 0.018, H * 0.022, '#d8b155');
  for (let i = 0; i < 3; i++) {
    line(p, [[W * 0.43 - W * 0.016, H * (0.415 + i * 0.007)], [W * 0.43 + W * 0.016, H * (0.415 + i * 0.007)]], '#f0d58a', W * 0.003, 0.8);
  }
  soft(p, W * 0.43, H * 0.42, W * 0.05, H * 0.06, '#ffe9a8', 0.35);
  // Josephine kneeling before him in white satin, her crimson train held to the right
  figure(p, { x: 0.485, y: 0.75, h: 0.2, pose: 'kneel', robe: '#e7e2d2', skin, light: -1, detail: 0.6 });
  poly(p, [[W * 0.5, H * 0.6], [W * 0.62, H * 0.66], [W * 0.66, H * 0.73], [W * 0.5, H * 0.73]], alpha('#7d2523', 0.85));
  figure(p, { x: 0.56, y: 0.755, h: 0.15, pose: 'kneel', robe: '#8e2a26', skin, light: -1, detail: 0.3 });
  figure(p, { x: 0.6, y: 0.755, h: 0.15, pose: 'kneel', robe: '#7c2622', skin, light: -1, detail: 0.3 });

  // right half: the clergy, gold and white, packed and facing left.
  for (let i = 0; i < 16; i++) {
    const t = i / 16;
    const x = 0.63 + t * 0.34;
    figure(p, {
      x,
      y: 0.72 - (i % 3) * 0.013,
      h: 0.2 + (i % 2) * 0.016,
      pose: 'stand',
      robe: p.r.pick(['#d6cba6', '#e8e1cc', '#b9993f', '#c9b57a', '#9a7228']),
      skin,
      light: 1,
    });
  }
  // the pope, seated behind and above the group
  figure(p, { x: 0.73, y: 0.66, h: 0.24, pose: 'sit', robe: '#eae4d2', skin, light: 1, detail: 0.4 });
  // David himself, drawing in the tribune at the upper left
  figure(p, { x: 0.1, y: 0.24, h: 0.09, pose: 'sit', robe: '#5a4a35', skin, light: -1 });

  chiaroscuro(p, -1, 0.2);
}

/* ------------------------------------------------------------------------------------- */
/* The Oath of the Horatii — 425 x 330 cm                                                */
/* ------------------------------------------------------------------------------------- */
export function oathOfTheHoratii(p: Paint): void {
  const { W, H } = p;
  const skin = '#c2906a';
  const ochre = '#b3844d';

  bg(p, [
    [0, '#7c5a34'],
    [0.5, '#a87c4a'],
    [1, '#6a4a2a'],
  ]);
  // three plain arches in a bare wall
  const spring = H * 0.36;
  for (let i = 0; i < 3; i++) {
    const x = W * (0.24 + i * 0.26);
    archOpening(p, x, spring, H * 0.72, W * 0.1, alpha('#33231a', 0.9));
    // the arch voussoir band
    p.c.beginPath();
    p.c.arc(x, spring, W * 0.1, Math.PI, 0);
    p.c.strokeStyle = alpha('#c69a63', 0.7);
    p.c.lineWidth = W * 0.008;
    p.c.stroke();
  }
  // the single dark column between the arches
  column(p, W * 0.56, H * 0.3, H * 0.72, W * 0.013, '#4a3a2c', -1);
  // floor: square slabs in one-point perspective
  p.c.beginPath();
  p.c.moveTo(0, H * 0.72);
  p.c.lineTo(W, H * 0.72);
  p.c.lineTo(W, H);
  p.c.lineTo(0, H);
  p.c.closePath();
  const floor = p.c.createLinearGradient(0, H * 0.72, 0, H);
  floor.addColorStop(0, '#8f6a44');
  floor.addColorStop(1, '#4d3621');
  p.c.fillStyle = floor;
  p.c.fill();
  for (let i = 0; i < 7; i++) {
    const y = H * (0.72 + i * i * 0.006);
    line(p, [[0, y], [W, y]], alpha('#3f2c1a', 0.25), 1.5);
  }
  for (let i = -3; i <= 3; i++) {
    line(p, [[W * 0.5 + i * W * 0.06, H * 0.72], [W * 0.5 + i * W * 0.34, H]], alpha('#3f2c1a', 0.22), 1.5);
  }

  // LEFT THIRD: the three brothers, braced, right arms thrust up.
  const brothers: Array<[number, string]> = [
    [0.135, '#6d6a58'],
    [0.215, '#7a7360'],
    [0.295, '#5f5c4c'],
  ];
  brothers.forEach(([x, robe]) => {
    figure(p, { x, y: 0.93, h: 0.66, pose: 'stand', robe, skin, light: -1, detail: 0.6, lean: 0.02 });
    // the raised arm as a bright line to the sword
    line(p, [[W * (x + 0.012), H * 0.55], [W * 0.335, H * 0.42]], alpha(shade(skin, 0.12), 0.85), W * 0.016);
  });
  // the father at the centre, red cloak, holding the sword high
  figure(p, { x: 0.415, y: 0.93, h: 0.62, pose: 'stand', robe: '#8b2c26', skin, light: -1, detail: 0.7, armUp: 0.9 });
  poly(p, [[W * 0.37, H * 0.5], [W * 0.46, H * 0.48], [W * 0.47, H * 0.78], [W * 0.37, H * 0.82]], alpha('#7c2721', 0.7));
  // the three swords, crossed at the hilt above his hand
  for (let i = 0; i < 3; i++) {
    line(p, [[W * 0.4, H * 0.44], [W * (0.352 + i * 0.026), H * 0.29]], '#d8d2c0', W * 0.006, 0.95);
    line(p, [[W * (0.352 + i * 0.026) - W * 0.008, H * 0.3], [W * (0.352 + i * 0.026) + W * 0.008, H * 0.293]], '#a08a5e', W * 0.006);
  }
  lightPool(p, W * 0.42, H * 0.36, W * 0.12, H * 0.1, '#f2dfae', 0.3);

  // RIGHT THIRD: the women and children, collapsed and in shadow.
  const women: Array<[number, string, FigureDef['pose'], number]> = [
    [0.665, '#7d6d54', 'swoon', 0.44],
    [0.745, '#8a7a5e', 'sit', 0.4],
    [0.825, '#6f644c', 'recline', 0.36],
  ];
  women.forEach(([x, robe, pose, h]) => {
    figure(p, { x, y: 0.94, h, pose, robe, skin, light: 1, detail: 0.5, alpha: 0.95 });
  });
  figure(p, { x: 0.7, y: 0.98, h: 0.13, pose: 'child', robe: '#8f8062', skin, light: 1 });
  figure(p, { x: 0.88, y: 0.99, h: 0.12, pose: 'child', robe: '#7a6c50', skin, light: 1 });
  // the shadow the right-hand column throws across the women
  soft(p, W * 0.86, H * 0.8, W * 0.2, H * 0.3, '#241809', 0.4);

  chiaroscuro(p, -1, 0.34);
}

/* ------------------------------------------------------------------------------------- */
/* Liberty Guiding the People — 325 x 260 cm                                             */
/* ------------------------------------------------------------------------------------- */
export function liberty(p: Paint): void {
  const { W, H, r } = p;
  const skin = '#c08d63';

  bg(p, [
    [0, '#9a9276'],
    [0.25, '#b7ac8a'],
    [0.5, '#8a7a5c'],
    [1, '#3d3222'],
  ]);
  // smoke plumes rolling across the sky
  for (let i = 0; i < 10; i++) {
    mass(p, r.range(W * 0.02, W * 0.98), H * r.range(0.02, 0.28), W * r.range(0.08, 0.2), H * r.range(0.03, 0.08), '#ded4b4', 0.55, 6);
  }
  // the towers of Notre-Dame on the right skyline
  const tow = W * 0.8;
  for (const dx of [0, W * 0.055]) {
    fillRect(p, tow + dx, H * 0.2, W * 0.042, H * 0.2, alpha('#7d7460', 0.9));
    fillRect(p, tow + dx + W * 0.004, H * 0.19, W * 0.034, H * 0.015, alpha('#6d6450', 0.9));
    fillRect(p, tow + dx + W * 0.012, H * 0.24, W * 0.016, H * 0.05, alpha('#332f26', 0.7));
  }
  // distant rooftops
  for (let i = 0; i < 9; i++) {
    fillRect(p, W * (0.55 + i * 0.05), H * (0.36 + (i % 3) * 0.01), W * 0.045, H * 0.05, alpha('#6a6049', 0.55));
  }

  // the barricade: broken timber and paving stones across the lower third
  poly(p, [[0, H * 0.7], [W * 0.2, H * 0.66], [W * 0.5, H * 0.68], [W * 0.8, H * 0.66], [W, H * 0.7], [W, H], [0, H]], '#59472f');
  for (let i = 0; i < 12; i++) {
    const x = W * (0.02 + i * 0.085);
    const y = H * (0.68 + (i % 4) * 0.03);
    line(p, [[x, y], [x + W * 0.09, y - H * 0.04]], alpha(i % 2 === 0 ? '#8a6f45' : '#6b522f', 0.85), W * 0.014, 1, 'butt');
  }
  for (let i = 0; i < 10; i++) {
    fillRect(p, W * r.range(0.05, 0.95), H * r.range(0.74, 0.95), W * r.range(0.02, 0.05), H * r.range(0.015, 0.03), alpha('#7d7561', 0.7));
  }

  // Liberty: barefoot on the barricade, flag up, musket in the other hand.
  figure(p, { x: 0.43, y: 0.8, h: 0.66, pose: 'stand', robe: '#c9b183', skin, light: -1, detail: 0.8, armUp: 1 });
  // her dress slides off one shoulder; a bare lit arm reaches up
  poly(p, [[W * 0.405, H * 0.5], [W * 0.44, H * 0.48], [W * 0.452, H * 0.62], [W * 0.404, H * 0.64]], shade(skin, 0.1));
  line(p, [[W * 0.428, H * 0.52], [W * 0.412, H * 0.16]], shade(skin, 0.08), W * 0.017);
  // the tricolour on its pole, flying to the left
  line(p, [[W * 0.412, H * 0.16], [W * 0.408, H * 0.54]], '#6b5433', W * 0.008);
  p.c.beginPath();
  p.c.moveTo(W * 0.412, H * 0.11);
  p.c.quadraticCurveTo(W * 0.3, H * 0.13, W * 0.2, H * 0.18);
  p.c.quadraticCurveTo(W * 0.29, H * 0.24, W * 0.41, H * 0.22);
  p.c.closePath();
  p.c.fillStyle = '#2b3f6e';
  p.c.fill();
  p.c.beginPath();
  p.c.moveTo(W * 0.35, H * 0.125);
  p.c.quadraticCurveTo(W * 0.29, H * 0.16, W * 0.28, H * 0.21);
  p.c.lineTo(W * 0.4, H * 0.215);
  p.c.lineTo(W * 0.4, H * 0.118);
  p.c.closePath();
  p.c.fillStyle = '#e4e0d2';
  p.c.fill();
  p.c.beginPath();
  p.c.moveTo(W * 0.412, H * 0.11);
  p.c.quadraticCurveTo(W * 0.38, H * 0.11, W * 0.35, H * 0.12);
  p.c.lineTo(W * 0.4, H * 0.21);
  p.c.lineTo(W * 0.412, H * 0.22);
  p.c.closePath();
  p.c.fillStyle = '#a8322c';
  p.c.fill();
  // the musket in her left hand
  line(p, [[W * 0.47, H * 0.66], [W * 0.49, H * 0.88]], '#5a4630', W * 0.008);

  // the boy with pistols at her right
  figure(p, { x: 0.55, y: 0.79, h: 0.34, pose: 'stand', robe: '#4b4a42', skin, light: -1, detail: 0.5, armUp: 0.6 });
  line(p, [[W * 0.565, H * 0.6], [W * 0.6, H * 0.55]], '#4a3a28', W * 0.008);
  line(p, [[W * 0.58, H * 0.6], [W * 0.62, H * 0.57]], '#4a3a28', W * 0.008);
  // the top-hatted bourgeois at her left, musket levelled
  figure(p, { x: 0.3, y: 0.82, h: 0.36, pose: 'stand', robe: '#3c3a34', skin, light: -1, detail: 0.5 });
  poly(p, [[W * 0.288, H * 0.52], [W * 0.316, H * 0.52], [W * 0.312, H * 0.47], [W * 0.292, H * 0.47]], '#241f1a');
  fillRect(p, W * 0.284, H * 0.518, W * 0.038, H * 0.008, '#241f1a');
  line(p, [[W * 0.28, H * 0.66], [W * 0.35, H * 0.6]], '#453626', W * 0.008);

  // the fallen: three bodies in the foreground
  figure(p, { x: 0.16, y: 0.98, h: 0.2, pose: 'recline', robe: '#6a6049', skin, light: -1, detail: 0.4 });
  figure(p, { x: 0.36, y: 0.99, h: 0.17, pose: 'recline', robe: '#7d7057', skin, light: 1, detail: 0.4 });
  figure(p, { x: 0.66, y: 0.96, h: 0.16, pose: 'swoon', robe: '#5c5340', skin, light: 1, detail: 0.4 });
  // a discarded sabre
  line(p, [[W * 0.6, H * 0.9], [W * 0.68, H * 0.86]], '#b8b2a0', W * 0.005);

  softFocus(p, Math.max(1, W * 0.002), 0.22);
  chiaroscuro(p, -1, 0.22);
}
