/**
 * The painting toolkit: colour maths, canvas primitives, and a figure renderer.
 *
 * Everything the fourteen painted works are composed from lives here. A composition is written in
 * layers that match the way the pictures were actually made:
 *
 *   underpaint -> value blocking -> detail -> glaze -> varnish -> weave + craquelure
 *
 * All variation comes from the seeded Rng handed in by the library, so two runs are identical.
 */
import type { Rng } from '../../core/rng';

export type C2 = CanvasRenderingContext2D;

export interface Paint {
  c: C2;
  W: number;
  H: number;
  r: Rng;
}

export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

export function hexToRgb(hex: string): [number, number, number] {
  const s = hex.replace('#', '');
  const full = s.length === 3 ? s[0] + s[0] + s[1] + s[1] + s[2] + s[2] : s;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const f = (v: number): string => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return '#' + f(r) + f(g) + f(b);
}

export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const k = clamp01(t);
  return rgbToHex(ar + (br - ar) * k, ag + (bg - ag) * k, ab + (bb - ab) * k);
}

/** amt > 0 lightens toward white, amt < 0 darkens toward black. */
export function shade(hex: string, amt: number): string {
  return amt >= 0 ? mix(hex, '#ffffff', amt) : mix(hex, '#000000', -amt);
}

/** Warm/cool shift without changing value much: positive warms, negative cools. */
export function temper(hex: string, amt: number): string {
  return amt >= 0 ? mix(hex, '#d9a35a', amt) : mix(hex, '#4d6f9c', -amt);
}

export function alpha(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}

export function vgrad(p: Paint, x0: number, y0: number, x1: number, y1: number, stops: Array<[number, string]>): CanvasGradient {
  const g = p.c.createLinearGradient(x0, y0, x1, y1);
  for (const [at, col] of stops) g.addColorStop(at, col);
  return g;
}

export function fillRect(p: Paint, x: number, y: number, w: number, h: number, style: string | CanvasGradient): void {
  p.c.fillStyle = style;
  p.c.fillRect(x, y, w, h);
}

/** Vertical background wash from the top of the canvas to the bottom. */
export function bg(p: Paint, stops: Array<[number, string]>): void {
  fillRect(p, 0, 0, p.W, p.H, vgrad(p, 0, 0, 0, p.H, stops));
}

export function ellipse(p: Paint, x: number, y: number, rx: number, ry: number, style: string | CanvasGradient, rot = 0): void {
  p.c.save();
  p.c.translate(x, y);
  if (rot) p.c.rotate(rot);
  p.c.beginPath();
  p.c.ellipse(0, 0, Math.max(0.2, rx), Math.max(0.2, ry), 0, 0, Math.PI * 2);
  p.c.fillStyle = style;
  p.c.fill();
  p.c.restore();
}

/** A soft-edged ellipse: a radial gradient disc, for flesh masses, smoke, foliage and haze. */
export function soft(p: Paint, x: number, y: number, rx: number, ry: number, col: string, a: number, rot = 0): void {
  const r = Math.max(rx, ry);
  if (r < 0.4) return;
  p.c.save();
  p.c.translate(x, y);
  if (rot) p.c.rotate(rot);
  p.c.scale(rx / r, ry / r);
  const g = p.c.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, alpha(col, a));
  g.addColorStop(0.55, alpha(col, a * 0.62));
  g.addColorStop(1, alpha(col, 0));
  p.c.fillStyle = g;
  p.c.beginPath();
  p.c.arc(0, 0, r, 0, Math.PI * 2);
  p.c.fill();
  p.c.restore();
}

export function poly(p: Paint, pts: Array<[number, number]>, style: string | CanvasGradient, close = true): void {
  if (pts.length < 2) return;
  p.c.beginPath();
  p.c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) p.c.lineTo(pts[i][0], pts[i][1]);
  if (close) p.c.closePath();
  p.c.fillStyle = style;
  p.c.fill();
}

export function line(
  p: Paint,
  pts: Array<[number, number]>,
  style: string | CanvasGradient,
  width: number,
  a = 1,
  cap: CanvasLineCap = 'round',
): void {
  if (pts.length < 2) return;
  p.c.save();
  p.c.globalAlpha = a;
  p.c.strokeStyle = style;
  p.c.lineWidth = Math.max(0.5, width);
  p.c.lineCap = cap;
  p.c.lineJoin = 'round';
  p.c.beginPath();
  p.c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) p.c.lineTo(pts[i][0], pts[i][1]);
  p.c.stroke();
  p.c.restore();
}

/** Smooth curve through points, drawn as a quadratic chain. */
export function curve(
  p: Paint,
  pts: Array<[number, number]>,
  style: string | CanvasGradient,
  width: number,
  a = 1,
): void {
  if (pts.length < 2) return;
  p.c.save();
  p.c.globalAlpha = a;
  p.c.strokeStyle = style;
  p.c.lineWidth = Math.max(0.5, width);
  p.c.lineCap = 'round';
  p.c.beginPath();
  p.c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    p.c.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  const last = pts[pts.length - 1];
  p.c.lineTo(last[0], last[1]);
  p.c.stroke();
  p.c.restore();
}

/* ------------------------------------------------------------------------------------- */
/* Figures                                                                                */
/* ------------------------------------------------------------------------------------- */

export type Pose = 'stand' | 'contrapposto' | 'sit' | 'kneel' | 'recline' | 'flying' | 'child' | 'dwarf' | 'swoon';

export interface FigureDef {
  /** Centre x as a fraction of canvas width. */
  x: number;
  /** Baseline (feet or lowest point) as a fraction of canvas height. */
  y: number;
  /** Figure height as a fraction of canvas height. */
  h: number;
  pose: Pose;
  /** Garment or flesh colour. */
  robe: string;
  skin?: string;
  hair?: string;
  /** -1 light from the left (default), +1 from the right. */
  light?: number;
  /** Body tilt in radians, positive leans right. */
  lean?: number;
  /** 0..1: raise the arms (oaths, waving, flying). */
  armUp?: number;
  /** True to draw bare flesh rather than clothing. */
  nude?: boolean;
  /** 0..1, extra facial and fold detail; resolved automatically when omitted. */
  detail?: number;
  alpha?: number;
}

const FIG_SKIN = '#c99a72';
const FIG_HAIR = '#3a2a1e';

interface Frame {
  s: number;
  x: number;
  y: number;
  lit: string;
  mid: string;
  dark: string;
  skinLit: string;
  skinMid: string;
  skinDark: string;
  light: number;
}

/** Body geometry in unit space: y = 0 at the feet, -1 at the crown. */
function bodyWidths(pose: Pose): { hipY: number; hipW: number; waistY: number; waistW: number; shY: number; shW: number; headY: number; headR: number } {
  switch (pose) {
    case 'child':
      return { hipY: -0.46, hipW: 0.085, waistY: -0.56, waistW: 0.072, shY: -0.72, shW: 0.09, headY: -0.88, headR: 0.072 };
    case 'dwarf':
      return { hipY: -0.44, hipW: 0.09, waistY: -0.55, waistW: 0.078, shY: -0.72, shW: 0.095, headY: -0.86, headR: 0.07 };
    case 'sit':
      return { hipY: -0.44, hipW: 0.075, waistY: -0.6, waistW: 0.058, shY: -0.8, shW: 0.078, headY: -0.92, headR: 0.048 };
    case 'kneel':
      return { hipY: -0.5, hipW: 0.075, waistY: -0.65, waistW: 0.056, shY: -0.82, shW: 0.076, headY: -0.93, headR: 0.048 };
    default:
      return { hipY: -0.5, hipW: 0.068, waistY: -0.63, waistW: 0.05, shY: -0.8, shW: 0.075, headY: -0.93, headR: 0.046 };
  }
}

/**
 * One figure: a shadow mass, a shaded body, arms, and (when the figure is large enough on the
 * canvas) a face. Proportions are canonical seven-and-a-half heads; the shading ramp runs across
 * the body from the light side, which is what makes a 30 px silhouette read as a person.
 */
export function figure(p: Paint, f: FigureDef): void {
  const s = f.h * p.H;
  if (s < 2) return;
  const light = f.light ?? -1;
  const robe = f.robe;
  const skin = f.skin ?? FIG_SKIN;
  const hairCol = f.hair ?? FIG_HAIR;
  const fr: Frame = {
    s,
    x: f.x * p.W,
    y: f.y * p.H,
    lit: shade(robe, 0.3),
    mid: robe,
    dark: shade(robe, -0.42),
    skinLit: shade(skin, 0.22),
    skinMid: skin,
    skinDark: shade(skin, -0.36),
    light,
  };
  const pose = f.pose;
  const b = bodyWidths(pose);

  p.c.save();
  p.c.globalAlpha = f.alpha ?? 1;
  p.c.translate(fr.x, fr.y);
  p.c.scale(s, s);
  if (f.lean) p.c.rotate(f.lean);
  if (pose === 'recline') p.c.rotate(light * 0.32);
  if (pose === 'flying') p.c.rotate(light * 0.2);
  if (pose === 'swoon') p.c.rotate(-0.35);
  p.c.rotate(light * 0.04);

  const w = (u: number): number => u * (light < 0 ? -1 : 1);
  const grad = (): CanvasGradient => {
    const g = p.c.createLinearGradient(w(b.shW), 0, w(-b.shW), 0);
    g.addColorStop(0, fr.lit);
    g.addColorStop(0.45, fr.mid);
    g.addColorStop(1, fr.dark);
    return g;
  };
  const skinGrad = (cx: number, r: number): CanvasGradient => {
    const g = p.c.createLinearGradient(cx + w(r), 0, cx - w(r), 0);
    g.addColorStop(0, fr.skinLit);
    g.addColorStop(0.5, fr.skinMid);
    g.addColorStop(1, fr.skinDark);
    return g;
  };

  // 1. the cast shadow mass, offset away from the light.
  p.c.save();
  p.c.globalAlpha = (f.alpha ?? 1) * 0.35;
  p.c.translate(w(-0.02), 0);
  p.c.fillStyle = shade(robe, -0.6);
  p.c.beginPath();
  p.c.moveTo(-b.shW * 1.12, b.shY);
  p.c.quadraticCurveTo(-b.waistW * 1.1, b.waistY, -b.hipW * 1.2, b.hipY);
  p.c.lineTo(-b.hipW * 1.5, 0);
  p.c.lineTo(b.hipW * 1.5, 0);
  p.c.lineTo(b.hipW * 1.2, b.hipY);
  p.c.quadraticCurveTo(b.waistW * 1.1, b.waistY, b.shW * 1.12, b.shY);
  p.c.closePath();
  p.c.fill();
  p.c.restore();

  const legs = (): void => {
    p.c.fillStyle = grad();
    if (pose === 'sit') {
      p.c.beginPath();
      p.c.moveTo(-b.hipW, b.hipY);
      p.c.lineTo(b.hipW, b.hipY);
      p.c.lineTo(b.hipW * 0.9, -0.18);
      p.c.quadraticCurveTo(b.hipW * 1.6, -0.1, b.hipW * 1.5, 0);
      p.c.lineTo(-b.hipW * 0.4, 0);
      p.c.quadraticCurveTo(-b.hipW * 0.7, -0.16, -b.hipW * 1.05, -0.2);
      p.c.closePath();
      p.c.fill();
    } else if (pose === 'kneel') {
      p.c.beginPath();
      p.c.moveTo(-b.hipW * 1.4, b.hipY);
      p.c.lineTo(b.hipW * 1.4, b.hipY);
      p.c.lineTo(b.hipW * 2.0, 0);
      p.c.lineTo(-b.hipW * 1.1, 0);
      p.c.closePath();
      p.c.fill();
    } else {
      // A skirt or two legs, whichever the garment implies.
      const hem = f.nude ? b.hipW * 0.72 : b.hipW * 1.45;
      p.c.beginPath();
      p.c.moveTo(-b.hipW, b.hipY);
      p.c.quadraticCurveTo(-hem * 0.9, b.hipY / 2, -hem, 0);
      p.c.lineTo(hem, 0);
      p.c.quadraticCurveTo(hem * 0.9, b.hipY / 2, b.hipW, b.hipY);
      p.c.closePath();
      p.c.fill();
      if (f.nude) {
        p.c.save();
        p.c.globalAlpha = 0.4;
        line(p, [[0, b.hipY], [w(0.004), 0]], shade(skin, -0.4), 0.008);
        p.c.restore();
      }
    }
  };

  legs();

  // 2. torso.
  p.c.fillStyle = grad();
  p.c.beginPath();
  p.c.moveTo(-b.shW, b.shY);
  p.c.quadraticCurveTo(-b.waistW * 1.02, b.waistY, -b.hipW, b.hipY);
  p.c.lineTo(b.hipW, b.hipY);
  p.c.quadraticCurveTo(b.waistW * 1.02, b.waistY, b.shW, b.shY);
  p.c.quadraticCurveTo(0, b.shY - 0.028, -b.shW, b.shY);
  p.c.closePath();
  p.c.fill();

  // 3. arms. `armUp` raises them; the gestures read at any size.
  const up = f.armUp ?? 0;
  p.c.strokeStyle = grad();
  p.c.lineCap = 'round';
  p.c.lineWidth = Math.max(0.012, b.shW * 0.42);
  const arm = (side: number, lift: number): void => {
    const sx = side * b.shW * 0.86;
    const elbow: [number, number] = [side * (b.shW * 1.18 + lift * 0.02), b.waistY + 0.02 - lift * 0.1];
    const hand: [number, number] = [side * (b.shW * 1.0 + lift * 0.05), b.hipY + 0.06 - lift * 0.34];
    p.c.beginPath();
    p.c.moveTo(sx, b.shY + 0.008);
    p.c.quadraticCurveTo(elbow[0], elbow[1], hand[0], hand[1]);
    p.c.stroke();
    if (s > 26) {
      p.c.fillStyle = skinGrad(hand[0], 0.014);
      p.c.beginPath();
      p.c.ellipse(hand[0], hand[1], 0.014, 0.011, 0, 0, Math.PI * 2);
      p.c.fill();
    }
  };
  arm(-1, up);
  arm(1, up * 0.9);

  // 4. neck and head.
  p.c.fillStyle = skinGrad(0, b.headR);
  p.c.fillRect(-b.headR * 0.42, b.headY + b.headR * 0.7, b.headR * 0.84, (b.shY - b.headY) * 1.05);
  const hg = skinGrad(0, b.headR);
  p.c.fillStyle = hg;
  p.c.beginPath();
  p.c.ellipse(0, b.headY, b.headR, b.headR * 1.24, 0, 0, Math.PI * 2);
  p.c.fill();
  // hair / headdress mass, heavier on the shadow side.
  p.c.fillStyle = hairCol;
  p.c.beginPath();
  p.c.ellipse(w(-b.headR * 0.16), b.headY - b.headR * 0.24, b.headR * 1.06, b.headR * 1.0, 0, Math.PI * 0.86, Math.PI * 2.2);
  p.c.fill();

  // 5. detail: only when the figure is big enough on the canvas for it to be seen.
  const detail = f.detail ?? (s > 90 ? 1 : s > 40 ? 0.5 : 0);
  if (detail > 0) {
    p.c.save();
    p.c.globalAlpha = detail;
    // shadow between the head and the body, and along the shadow edge of the torso.
    line(p, [[w(-b.headR * 0.4), b.headY + b.headR * 1.1], [w(b.headR * 0.1), b.shY]], shade(skin, -0.25), b.headR * 0.3, 0.5);
    if (detail > 0.45) {
      // eye sockets and jaw shadow
      ellipse(p, w(-b.headR * 0.32), b.headY - b.headR * 0.1, b.headR * 0.2, b.headR * 0.12, alpha(shade(skin, -0.55), 0.55));
      ellipse(p, w(b.headR * 0.2), b.headY - b.headR * 0.12, b.headR * 0.18, b.headR * 0.1, alpha(shade(skin, -0.55), 0.45));
      line(p, [[w(-b.headR * 0.5), b.headY + b.headR * 0.5], [0, b.headY + b.headR * 0.72]], alpha(shade(skin, -0.4), 0.35), b.headR * 0.16);
      if (!f.nude) {
        // garment folds
        for (let i = 0; i < 4; i++) {
          const fx = -b.hipW + (i / 3) * b.hipW * 2;
          curve(
            p,
            [
              [fx * 0.7, b.waistY + 0.02],
              [fx * 1.05, (b.waistY + b.hipY) / 2],
              [fx * 1.2, b.hipY + 0.02],
            ],
            alpha(shade(robe, -0.5), 0.32),
            b.hipW * 0.1,
          );
        }
      }
    }
    p.c.restore();
  }
  p.c.restore();
}

/* ------------------------------------------------------------------------------------- */
/* Scenery                                                                                */
/* ------------------------------------------------------------------------------------- */

/** A fluted column shaft in perspective: silhouette, flutes, and a lit/shadow split. */
export function column(
  p: Paint,
  x: number,
  top: number,
  bottom: number,
  halfWidth: number,
  stone: string,
  light = -1,
): void {
  const g = p.c.createLinearGradient(x - halfWidth, 0, x + halfWidth, 0);
  const lit = shade(stone, 0.26);
  const dark = shade(stone, -0.5);
  if (light < 0) {
    g.addColorStop(0, lit);
    g.addColorStop(0.35, stone);
    g.addColorStop(1, dark);
  } else {
    g.addColorStop(0, dark);
    g.addColorStop(0.65, stone);
    g.addColorStop(1, lit);
  }
  fillRect(p, x - halfWidth, top, halfWidth * 2, bottom - top, g);
  // flutes
  p.c.save();
  p.c.globalAlpha = 0.22;
  for (let i = -3; i <= 3; i++) {
    const fx = x + (i / 3.4) * halfWidth;
    line(p, [[fx, top + 6], [fx, bottom]], i % 2 === 0 ? shade(stone, -0.55) : shade(stone, 0.4), Math.max(1, halfWidth * 0.045), 0.5);
  }
  p.c.restore();
  // capital and base rings
  const capH = (bottom - top) * 0.045;
  fillRect(p, x - halfWidth * 1.32, top, halfWidth * 2.64, capH, shade(stone, -0.18));
  fillRect(p, x - halfWidth * 1.22, bottom - capH * 0.7, halfWidth * 2.44, capH * 0.7, shade(stone, -0.1));
}

/** A round arch opening: dark tympanum over two piers. */
export function archOpening(
  p: Paint,
  x: number,
  springLine: number,
  bottom: number,
  halfWidth: number,
  fill: string,
): void {
  p.c.beginPath();
  p.c.moveTo(x - halfWidth, bottom);
  p.c.lineTo(x - halfWidth, springLine);
  p.c.arc(x, springLine, halfWidth, Math.PI, 0);
  p.c.lineTo(x + halfWidth, bottom);
  p.c.closePath();
  p.c.fillStyle = fill;
  p.c.fill();
}

/** Receding tiled floor: alternating light/dark bands converging on a vanishing point. */
export function perspectiveFloor(
  p: Paint,
  vpx: number,
  horizon: number,
  bottom: number,
  colA: string,
  colB: string,
  rows = 9,
  cols = 16,
): void {
  const span = bottom - horizon;
  for (let row = 0; row < rows; row++) {
    const t0 = row / rows;
    const t1 = (row + 1) / rows;
    const y0 = horizon + span * t0 * t0;
    const y1 = horizon + span * t1 * t1;
    const spread0 = 0.16 + t0 * 1.5;
    const spread1 = 0.16 + t1 * 1.5;
    for (let col = 0; col < cols; col++) {
      const u0 = col / cols - 0.5;
      const u1 = (col + 1) / cols - 0.5;
      const colr = (row + col) % 2 === 0 ? colA : colB;
      poly(
        p,
        [
          [vpx + u0 * p.W * spread0, y0],
          [vpx + u1 * p.W * spread0, y0],
          [vpx + u1 * p.W * spread1, y1],
          [vpx + u0 * p.W * spread1, y1],
        ],
        alpha(colr, 0.35 + 0.55 * t1),
      );
    }
  }
}

/** A broken, mottled rock or cloud mass built from overlapping soft discs. */
export function mass(p: Paint, x: number, y: number, rx: number, ry: number, col: string, a: number, lumps = 7): void {
  soft(p, x, y, rx, ry, col, a);
  for (let i = 0; i < lumps; i++) {
    const ax = x + p.r.range(-rx * 0.8, rx * 0.8);
    const ay = y + p.r.range(-ry * 0.8, ry * 0.8);
    soft(p, ax, ay, rx * p.r.range(0.25, 0.55), ry * p.r.range(0.25, 0.6), col, a * 0.55);
  }
}

export function foliage(p: Paint, x: number, y: number, rx: number, ry: number, col: string, a: number): void {
  mass(p, x, y, rx, ry, col, a, 9);
  const lit = shade(col, 0.28);
  for (let i = 0; i < 14; i++) {
    const ax = x + p.r.range(-rx * 0.9, rx * 0.9);
    const ay = y + p.r.range(-ry * 0.9, ry * 0.9);
    soft(p, ax, ay, rx * p.r.range(0.06, 0.16), ry * p.r.range(0.05, 0.14), lit, a * 0.5);
  }
}

/* ------------------------------------------------------------------------------------- */
/* Finishing passes                                                                       */
/* ------------------------------------------------------------------------------------- */

/** Broad lamp/lamp-glow or window light falling into the composition. */
export function lightPool(p: Paint, x: number, y: number, rx: number, ry: number, col: string, a: number): void {
  p.c.save();
  p.c.globalCompositeOperation = 'lighter';
  soft(p, x, y, rx, ry, col, a);
  p.c.restore();
}

/** Directional raking light: darkens one side of the whole canvas and lifts the other. */
export function chiaroscuro(p: Paint, dirX: number, amount = 0.3): void {
  const g = p.c.createLinearGradient(0, 0, p.W, 0);
  const dark = alpha('#140f0a', amount);
  const clear = alpha('#ffffff', 0);
  const lift = alpha('#fff3dc', amount * 0.55);
  if (dirX < 0) {
    g.addColorStop(0, lift);
    g.addColorStop(0.42, clear);
    g.addColorStop(1, dark);
  } else {
    g.addColorStop(0, dark);
    g.addColorStop(0.58, clear);
    g.addColorStop(1, lift);
  }
  p.c.save();
  p.c.globalCompositeOperation = 'multiply';
  p.c.fillStyle = g;
  p.c.fillRect(0, 0, p.W, p.H);
  p.c.restore();
}

/** The warm varnish: yellowing, a soft multiplying glow, and darkened edges. */
export function varnish(p: Paint, amount = 0.16, warm = '#c98f3d'): void {
  p.c.save();
  p.c.globalCompositeOperation = 'multiply';
  p.c.fillStyle = alpha(warm, amount);
  p.c.fillRect(0, 0, p.W, p.H);
  p.c.restore();
  const g = p.c.createRadialGradient(p.W * 0.5, p.H * 0.42, Math.min(p.W, p.H) * 0.28, p.W * 0.5, p.H * 0.45, Math.max(p.W, p.H) * 0.78);
  g.addColorStop(0, alpha('#000000', 0));
  g.addColorStop(1, alpha('#0b0705', 0.34));
  p.c.save();
  p.c.globalCompositeOperation = 'multiply';
  p.c.fillStyle = g;
  p.c.fillRect(0, 0, p.W, p.H);
  p.c.restore();
}

/** Canvas weave: the two crossing thread series, at a scale of a few pixels. */
export function canvasWeave(p: Paint, strength = 0.1, step = 3): void {
  p.c.save();
  p.c.globalAlpha = strength;
  for (let y = 0; y < p.H; y += step) {
    p.c.fillStyle = y % (step * 2) === 0 ? '#ffffff' : '#000000';
    p.c.fillRect(0, y, p.W, 1);
  }
  for (let x = 0; x < p.W; x += step) {
    p.c.globalAlpha = strength * 0.7;
    p.c.fillStyle = x % (step * 2) === 0 ? '#ffffff' : '#ffffff';
    p.c.fillRect(x, 0, 1, p.H);
  }
  p.c.restore();
}

/** Age cracks: long dark polylines with short branches, plus a light lip on one side. */
export function craquelure(p: Paint, density = 0.5): void {
  const count = Math.round((p.W * p.H) / 90000 * density * 26) + 18;
  p.c.save();
  p.c.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const x = p.r.range(0, p.W);
    const y = p.r.range(0, p.H);
    const a = p.r.range(0, Math.PI * 2);
    const len = p.r.range(6, 40) * (0.6 + density * 0.7);
    const segs = p.r.int(2, 5);
    const pts: Array<[number, number]> = [[x, y]];
    let cx = x;
    let cy = y;
    let ang = a;
    for (let k = 0; k < segs; k++) {
      ang += p.r.range(-0.7, 0.7);
      cx += Math.cos(ang) * (len / segs);
      cy += Math.sin(ang) * (len / segs);
      pts.push([cx, cy]);
    }
    p.c.globalAlpha = p.r.range(0.1, 0.3);
    line(p, pts, '#1a1108', p.r.range(0.6, 1.5));
    if (p.r.chance(0.4)) {
      const bx = pts[p.r.int(1, pts.length - 1)][0];
      const by = pts[p.r.int(1, pts.length - 1)][1];
      line(p, [[bx, by], [bx + p.r.range(-9, 9), by + p.r.range(-9, 9)]], '#1a1108', 0.7, 0.18);
    }
    p.c.globalAlpha = p.r.range(0.05, 0.14);
    line(p, pts.map(([px, py]) => [px + 0.8, py + 0.8] as [number, number]), '#f4e3c2', 0.8);
  }
  p.c.restore();
}

/** Fine grain, so flat areas do not read as vector art. One ImageData pass, deterministic. */
export function grain(p: Paint, amount = 0.05): void {
  const img = p.c.getImageData(0, 0, p.W, p.H);
  const d = img.data;
  const k = amount * 46;
  for (let i = 0; i < d.length; i += 4) {
    const n = (p.r() - 0.5) * k;
    d[i] = clampByte((d[i] as number) + n);
    d[i + 1] = clampByte((d[i + 1] as number) + n);
    d[i + 2] = clampByte((d[i + 2] as number) + n * 0.8);
  }
  p.c.putImageData(img, 0, 0);
}

const clampByte = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : v);

/** Sfumato: a light blur of the whole panel laid back over itself, edges dissolving. */
export function softFocus(p: Paint, px: number, a = 0.55): void {
  const tmp = document.createElement('canvas');
  tmp.width = p.W;
  tmp.height = p.H;
  const tctx = tmp.getContext('2d');
  if (!tctx) return;
  tctx.drawImage(p.c.canvas, 0, 0);
  p.c.save();
  p.c.globalAlpha = a;
  p.c.filter = 'blur(' + px + 'px)';
  p.c.drawImage(tmp, 0, 0);
  p.c.filter = 'none';
  p.c.restore();
  tmp.width = 0;
  tmp.height = 0;
}

/** A translucent dust/scumble film, for works that are meant to look four hundred years old. */
export function scumble(p: Paint, col: string, a = 0.12, lumps = 26): void {
  for (let i = 0; i < lumps; i++) {
    soft(
      p,
      p.r.range(0, p.W),
      p.r.range(0, p.H),
      p.r.range(p.W * 0.06, p.W * 0.3),
      p.r.range(p.H * 0.04, p.H * 0.22),
      col,
      a * p.r.range(0.4, 1),
    );
  }
}
