/**
 * Faces. Every painted work with a figure above about 40 px of head gets one of these, because a
 * face made of soft value shifts rather than drawn lines is what separates a painting from a
 * pictogram — and because the person's eye will go straight to the faces.
 */
import { alpha, ellipse, line, mix, shade, soft, type Paint } from './kit';

export interface FaceOptions {
  /** Head centre in canvas pixels. */
  cx: number;
  cy: number;
  /** Head width in pixels; height follows the adult 1:1.32 proportion. */
  w: number;
  skin: string;
  /** -1 light from the left (default), +1 from the right. */
  light?: number;
  /** Three-quarter turn: -1 full profile to the left, 0 frontal, +1 profile right. */
  turn?: number;
  hair?: string;
  /** 0 adult, 1 infant (larger eyes, shorter jaw). */
  young?: number;
  /** 0 = open eyes, 1 = closed/lidded. */
  sleepy?: number;
  beard?: string;
  /** A veil drawn over the hair. */
  veil?: string;
  /** Head covering over the hair (turban, cap, hood), drawn instead of hair. */
  cover?: string;
  /** Extra softness, 0..1, for Leonardo and for old varnish. */
  sfumato?: number;
}

/** One head, modelled with light rather than outlined. */
export function face(p: Paint, o: FaceOptions): void {
  const light = o.light ?? -1;
  const turn = o.turn ?? 0;
  const kid = o.young ?? 0;
  const sf = o.sfumato ?? 0;
  const hw = o.w / 2;
  const hh = hw * (1.32 - kid * 0.12);
  const cx = o.cx + turn * hw * 0.16;
  const cy = o.cy;
  const lit = shade(o.skin, 0.16);
  const mid = o.skin;
  const dark = shade(o.skin, -0.34);
  const deep = shade(o.skin, -0.58);

  // jaw and skull in one soft mass, wider at the temples than the chin.
  p.c.save();
  p.c.translate(cx, cy);
  p.c.beginPath();
  p.c.moveTo(-hw * 0.98, -hh * 0.1);
  p.c.quadraticCurveTo(-hw * 1.02, -hh * 0.72, -hw * 0.12, -hh * 0.98);
  p.c.quadraticCurveTo(hw * 0.86, -hh * 1.02, hw * 0.98, -hh * 0.18);
  p.c.quadraticCurveTo(hw * 1.0, hh * 0.42, hw * 0.34, hh * 0.9);
  p.c.quadraticCurveTo(-hw * 0.1, hh * 1.0, -hw * 0.62, hh * 0.62);
  p.c.quadraticCurveTo(-hw * 1.0, hh * 0.28, -hw * 0.98, -hh * 0.1);
  p.c.closePath();
  const g = p.c.createLinearGradient(light * hw, -hh * 0.2, -light * hw * 0.7, hh * 0.3);
  g.addColorStop(0, lit);
  g.addColorStop(0.48, mid);
  g.addColorStop(1, dark);
  p.c.fillStyle = g;
  p.c.fill();
  p.c.restore();

  // hair, veil or head covering sits behind the brow and frames the face.
  if (o.cover) {
    p.c.beginPath();
    p.c.ellipse(cx + turn * hw * 0.1, cy - hh * 0.36, hw * 1.16, hh * 0.78, 0, Math.PI * 0.86, Math.PI * 2.16);
    p.c.fillStyle = o.cover;
    p.c.fill();
    ellipse(p, cx + turn * hw * 0.1, cy - hh * 0.1, hw * 1.2, hh * 0.34, alpha(shade(o.cover, -0.3), 0.6));
  } else if (o.hair) {
    p.c.beginPath();
    p.c.moveTo(-hw * 1.08, hh * (0.5 - kid * 0.2));
    p.c.quadraticCurveTo(-hw * 1.24, -hh * 0.72, -hw * 0.05, -hh * 1.12);
    p.c.quadraticCurveTo(hw * 1.14, -hh * 0.86, hw * 1.08, hh * 0.46);
    p.c.quadraticCurveTo(hw * 0.9, hh * 0.02, hw * 0.82, -hh * 0.42);
    p.c.quadraticCurveTo(hw * 0.1, -hh * 0.82, -hw * 0.78, -hh * 0.4);
    p.c.quadraticCurveTo(-hw * 0.9, hh * 0.02, -hw * 1.08, hh * 0.5 - kid * 0.1);
    p.c.closePath();
    p.c.fillStyle = o.hair;
    p.c.fill();
    // a couple of strand lights so the mass is not a flat patch
    line(p, [[-hw * 0.86, -hh * 0.1], [-hw * 0.72, hh * 0.42]], alpha(shade(o.hair, 0.3), 0.5), hw * 0.07);
    line(p, [[hw * 0.7, -hh * 0.2], [hw * 0.86, hh * 0.34]], alpha(shade(o.hair, 0.24), 0.4), hw * 0.06);
    if (kid > 0.4) {
      // the child's curl across the forehead
      line(p, [[-hw * 0.7, -hh * 0.6], [-hw * 0.1, -hh * 0.78], [hw * 0.5, -hh * 0.58]], o.hair, hw * 0.1, 0.7);
    }
  }
  if (o.veil) {
    p.c.beginPath();
    p.c.moveTo(-hw * 1.1, hh * 0.7);
    p.c.quadraticCurveTo(-hw * 1.3, -hh * 0.9, 0, -hh * 1.16);
    p.c.quadraticCurveTo(hw * 1.3, -hh * 0.9, hw * 1.1, hh * 0.68);
    p.c.quadraticCurveTo(hw * 0.96, -hh * 0.5, 0, -hh * 0.86);
    p.c.quadraticCurveTo(-hw * 0.96, -hh * 0.5, -hw * 1.1, hh * 0.7);
    p.c.closePath();
    p.c.fillStyle = alpha(o.veil, 0.72);
    p.c.fill();
  }

  // brow shadow and eye sockets: two soft hollows rather than drawn eyes.
  const eyeY = cy + hh * 0.02;
  const eyeDx = hw * 0.42 * (1 - kid * 0.14);
  soft(p, cx - eyeDx, eyeY - hh * 0.14, hw * 0.34, hh * 0.2, deep, 0.34 + sf * 0.2);
  soft(p, cx + eyeDx, eyeY - hh * 0.14, hw * 0.34, hh * 0.2, deep, 0.28 + sf * 0.2);
  ellipse(p, cx - eyeDx, eyeY, hw * (0.15 + kid * 0.03), hh * (0.075 - (o.sleepy ?? 0) * 0.05), alpha('#f2e6d2', 0.85));
  ellipse(p, cx + eyeDx, eyeY, hw * (0.15 + kid * 0.03), hh * (0.075 - (o.sleepy ?? 0) * 0.05), alpha('#f2e6d2', 0.85));
  ellipse(p, cx - eyeDx + light * hw * 0.02, eyeY, hw * 0.07, hh * 0.06, '#3a2a20');
  ellipse(p, cx + eyeDx + light * hw * 0.02, eyeY, hw * 0.07, hh * 0.06, '#3a2a20');
  // upper lid and lash line
  line(p, [[cx - eyeDx - hw * 0.15, eyeY - hh * 0.035], [cx - eyeDx + hw * 0.15, eyeY - hh * 0.03]], alpha(deep, 0.8), hw * 0.045);
  line(p, [[cx + eyeDx - hw * 0.15, eyeY - hh * 0.035], [cx + eyeDx + hw * 0.15, eyeY - hh * 0.03]], alpha(deep, 0.8), hw * 0.045);
  // brow
  if (kid < 0.5) {
    line(p, [[cx - eyeDx - hw * 0.18, eyeY - hh * 0.22], [cx - eyeDx + hw * 0.14, eyeY - hh * 0.26]], alpha(shade(o.skin, -0.55), 0.35), hw * 0.05);
    line(p, [[cx + eyeDx - hw * 0.14, eyeY - hh * 0.26], [cx + eyeDx + hw * 0.18, eyeY - hh * 0.22]], alpha(shade(o.skin, -0.55), 0.3), hw * 0.05);
  }

  // nose: a light ridge with its shadow on the dark side, nostrils at the base.
  const noseY = cy + hh * 0.32;
  line(p, [[cx + light * hw * 0.05, eyeY + hh * 0.06], [cx + light * hw * 0.12, noseY]], alpha(shade(o.skin, 0.28), 0.5), hw * 0.07);
  line(p, [[cx - light * hw * 0.12, eyeY + hh * 0.04], [cx - light * hw * 0.08, noseY]], alpha(dark, 0.55), hw * 0.06);
  ellipse(p, cx - hw * 0.1, noseY, hw * 0.06, hh * 0.03, alpha(deep, 0.5));
  ellipse(p, cx + hw * 0.1, noseY, hw * 0.06, hh * 0.03, alpha(deep, 0.4));

  // mouth
  const mouthY = cy + hh * 0.55;
  const mouthW = hw * 0.4;
  line(
    p,
    [[cx - mouthW, mouthY - hh * 0.01], [cx - mouthW * 0.3, mouthY + hh * 0.03], [cx + mouthW * 0.3, mouthY + hh * 0.03], [cx + mouthW, mouthY - hh * 0.02]],
    alpha(mix(deep, '#7a3a33', 0.5), 0.75),
    Math.max(1, hw * 0.055),
  );
  ellipse(p, cx + hw * 0.02, mouthY + hh * 0.06, mouthW * 0.5, hh * 0.045, alpha(shade(o.skin, 0.16), 0.55));
  // chin and jaw shadow
  soft(p, cx - light * hw * 0.2, cy + hh * 0.86, hw * 0.4, hh * 0.15, deep, 0.22);
  soft(p, cx - light * hw * 0.85, cy + hh * 0.3, hw * 0.28, hh * 0.4, deep, 0.3);

  if (o.beard) {
    p.c.beginPath();
    p.c.moveTo(-hw * 0.92, hh * 0.32);
    p.c.quadraticCurveTo(-hw * 0.8, hh * 1.3, 0, hh * 1.36);
    p.c.quadraticCurveTo(hw * 0.8, hh * 1.3, hw * 0.92, hh * 0.32);
    p.c.quadraticCurveTo(hw * 0.5, hh * 0.66, 0, hh * 0.6);
    p.c.quadraticCurveTo(-hw * 0.5, hh * 0.66, -hw * 0.92, hh * 0.32);
    p.c.closePath();
    p.c.fillStyle = alpha(o.beard, 0.9);
    p.c.fill();
  }
}
