import * as THREE from 'three';
import { staircase, wall as wallOfPiece } from '../../core/builders';
import { boxGeo, extrudeProfile, mergeAll } from '../../core/geom';
import { addPart } from '../../core/merge';
import {
  bx,
  corniceOn,
  dome,
  doorOn,
  hangingAt,
  lightPool,
  mouldingAt,
  pilasterRow,
  q,
  skirtOn,
  vaultRibs,
  vaultZ,
  vitrineAt,
  wallOn,
} from './geo';
import type { Rng } from '../../core/rng';
import { ROOMS, holesFor } from './layout';

/**
 * The Galerie d'Apollon, the Rotonde d'Apollon and the Petite Galerie's stair hall.
 *
 * The vault comes first: a segmental cove from the frieze up to a flat crown panel 8.4 m wide, which
 * is where the Delacroix canvas is. Everything else — gilt ribs, red hangings, the wall cases —
 * hangs off that, so the gallery cannot read as a plain gold box.
 */

const FLOOR = 7;
/** The flat crown panel: the room's box tops out at 22, and the Delacroix canvas is 8 m across,
 *  so the crown sits low enough for the painting to hang on it and stay inside the zone box. */
const CROWN = 20.85;
const SPRING = 15.4;
const FLAT_HALF = 4.2;

export function buildGalerieApollon(g: THREE.Group, rng: Rng): void {
  const b = ROOMS['galerie-apollon'];
  const w = b.x[1] - b.x[0];
  const d = b.z[1] - b.z[0];
  const cx = (b.x[0] + b.x[1]) / 2;
  const cz = (b.z[0] + b.z[1]) / 2;

  addPart(g, boxGeo(w, 0.32, d).translate(cx, FLOOR - 0.16, cz), 'floor.marble-checker');
  const inlay: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    inlay.push(bx(w - 2.35, 0.03, 0.55, cx, FLOOR + 0.005, cz + s * (d / 2 - 1.43)));
    inlay.push(bx(0.55, 0.03, d - 2.35, cx + s * (w / 2 - 1.43), FLOOR + 0.005, cz));
  }
  addPart(g, mergeAll(inlay), 'marble.rouge-royal');

  // Walls to the springing line. The Cour Carrée side carries the seven clerestory windows that
  // throw the raking light the gallery is famous for.
  wallOn(g, { face: 'w', at: b.x[0], from: b.z[0], to: b.z[1], floorY: FLOOR, height: SPRING - FLOOR, mat: 'wall.apollon-blue' });
  wallOn(g, {
    face: 'e',
    at: b.x[1],
    from: b.z[0],
    to: b.z[1],
    floorY: FLOOR,
    height: SPRING - FLOOR,
    mat: 'wall.apollon-blue',
    holes: Array.from({ length: 7 }, (_, i) => ({ at: b.z[0] + 5.4 + i * 8.1, width: 1.5, sill: 5.6, head: 8.2 })),
  });
  // The end walls run to the crown: a barrel vault has to butt into something.
  wallOn(g, { face: 'n', at: b.z[0], from: b.x[0], to: b.x[1], floorY: FLOOR, height: CROWN - FLOOR, mat: 'wall.apollon-blue', holes: holesFor('galerie-apollon', 'n') });
  wallOn(g, { face: 's', at: b.z[1], from: b.x[0], to: b.x[1], floorY: FLOOR, height: CROWN - FLOOR, mat: 'wall.apollon-blue', holes: holesFor('galerie-apollon', 's') });

  doorOn(g, { face: 'n', plane: b.z[0], along: 124.5, floorY: FLOOR, width: 3.6, height: 4.4, arched: true, mat: 'trim.gilt' });
  doorOn(g, { face: 's', plane: b.z[1], along: 124.5, floorY: FLOOR, width: 5, height: 8, arched: true, mat: 'trim.gilt', thickness: 0.8 });

  const panes: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const z = b.z[0] + 5.4 + i * 8.1;
    panes.push(q([b.x[1] - 0.15, FLOOR + 5.62, z + 0.72], [b.x[1] - 0.15, FLOOR + 5.62, z - 0.72], [b.x[1] - 0.15, FLOOR + 8.18, z - 0.72], [b.x[1] - 0.15, FLOOR + 8.18, z + 0.72]));
  }
  addPart(g, mergeAll(panes), 'glass.skylight-clear');

  // Red marble dado, gilt frieze, and the cornice that carries the vault.
  for (const face of ['w', 'e', 'n', 's'] as const) {
    const along = face === 'w' || face === 'e' ? { from: b.z[0], to: b.z[1] } : { from: b.x[0], to: b.x[1] };
    const at = face === 'w' ? b.x[0] : face === 'e' ? b.x[1] : face === 'n' ? b.z[0] : b.z[1];
    skirtOn(g, { face, at, from: along.from, to: along.to, y: FLOOR, height: 1.15, thickness: 0.09, mat: 'marble.rouge-royal' });
    mouldingAt(g, {
      from: along.from,
      to: along.to,
      at,
      y: SPRING - 1.5,
      profile: [
        [0, 0],
        [0.16, 0],
        [0.2, 0.12],
        [0.12, 0.22],
        [0, 0.24],
      ],
      mat: 'trim.gilt',
      alongZ: face === 'w' || face === 'e',
    });
    corniceOn(g, { face, at, from: along.from, to: along.to, y: SPRING - 0.66, height: 0.66, projection: 0.55, dentils: true, mat: 'gold.leaf' });
  }

  const pilasterZ: number[] = [];
  for (let z = b.z[0] + 4.2; z <= b.z[1] - 4.2; z += 6.1) pilasterZ.push(z);
  pilasterRow(g, { face: 'w', at: b.x[0], positions: pilasterZ, floorY: FLOOR + 1.15, height: SPRING - FLOOR - 2.4, width: 0.75, depth: 0.14, mat: 'trim.gilt' });
  pilasterRow(g, { face: 'e', at: b.x[1], positions: pilasterZ, floorY: FLOOR + 1.15, height: SPRING - FLOOR - 2.4, width: 0.75, depth: 0.14, mat: 'trim.gilt' });

  const cloth: THREE.BufferGeometry[] = [];
  const rods: THREE.BufferGeometry[] = [];
  for (const z of [88.5, 97.5, 123.5, 133]) {
    const hg = hangingAt('w', b.x[0], z, FLOOR + 6.4, 4.4, 5.2);
    cloth.push(hg.cloth);
    rods.push(hg.rod);
  }
  addPart(g, mergeAll(cloth), 'wall.crimson-silk');
  addPart(g, mergeAll(rods), 'trim.gilt');

  // The crown jewels: five wall cases on the west side, one holding the crown itself and four
  // holding small pieces whose form and turn come from the seeded stream.
  const frames: THREE.BufferGeometry[] = [];
  const glass: THREE.BufferGeometry[] = [];
  const velvet: THREE.BufferGeometry[] = [];
  const brackets: THREE.BufferGeometry[] = [];
  const jewels: THREE.BufferGeometry[] = [];
  const spin = rng.fork('crown-jewels');
  for (const z of [92.5, 102.5, 110, 118, 128]) {
    brackets.push(bx(0.75, 0.22, 1.25, b.x[0] + 0.36, FLOOR + 0.89, z));
    brackets.push(bx(0.5, 0.3, 0.16, b.x[0] + 0.25, FLOOR + 0.65, z));
    // The crown comes with its own glass case from the artwork library, so this bracket carries it
    // bare and the other four get cases of their own.
    if (z === 110) continue;
    const v = vitrineAt(b.x[0] + 0.5, FLOOR + 1.0, z, 0.95, 1.1, 0.55);
    frames.push(v.frame);
    glass.push(v.glass);
    velvet.push(v.deck);
    jewels.push(jewelForm(b.x[0] + 0.5, FLOOR + 1.09, z, spin));
  }
  addPart(g, mergeAll(jewels), 'gold.leaf');
  addPart(g, mergeAll(frames), 'gold.bronze-tarnished');
  addPart(g, mergeAll(glass), 'glass.vitrine');
  addPart(g, mergeAll(velvet), 'marble.noir-marquina');
  addPart(g, mergeAll(brackets), 'wall.apollon-blue');

  vaultZ({ x0: b.x[0], x1: b.x[1], z0: b.z[0], z1: b.z[1], spring: SPRING, crown: CROWN, flatHalf: FLAT_HALF, segments: 6, mat: 'ceiling.gold-leaf', parent: g, ao: 0.3 });
  const ribZ: number[] = [];
  for (let z = b.z[0] + 3.05; z < b.z[1]; z += 6.1) ribZ.push(z);
  vaultRibs({ x0: b.x[0], x1: b.x[1], spring: SPRING, crown: CROWN, flatHalf: FLAT_HALF, at: ribZ, band: 0.5, depth: 0.2, segments: 6, mat: 'gold.leaf', parent: g });

  const panels: THREE.BufferGeometry[] = [];
  for (const [z0, z1] of [
    [b.z[0] + 1.2, 100.5],
    [120.5, b.z[1] - 1.2],
  ] as Array<[number, number]>) {
    panels.push(bx(FLAT_HALF * 2 - 1.4, 0.04, z1 - z0, cx, CROWN - 0.04, (z0 + z1) / 2));
  }
  addPart(g, mergeAll(panels), 'wall.apollon-blue');

  const bands: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) bands.push(bx(0.36, 0.3, d - 1.5, cx + s * (FLAT_HALF + 0.18), CROWN - 0.15, cz));
  addPart(g, mergeAll(bands), 'gold.leaf');
}

/**
 * A small gilded object on a case's velvet: a tiara arc, a ring or a brooch, chosen and turned by
 * the seeded stream so two runs place the same pieces in the same poses.
 */
function jewelForm(x: number, y: number, z: number, rng: Rng): THREE.BufferGeometry {
  const kind = rng.int(0, 2);
  const turn = rng.range(0, Math.PI * 2);
  const s = rng.range(0.82, 1.05);
  if (kind === 0) {
    const torus = new THREE.TorusGeometry(0.1 * s, 0.018 * s, 6, 16);
    torus.rotateX(Math.PI / 2);
    torus.rotateY(turn);
    return torus.translate(x, y + 0.03, z);
  }
  if (kind === 1) {
    const arc = new THREE.TorusGeometry(0.13 * s, 0.016 * s, 6, 14, Math.PI);
    arc.rotateY(Math.PI / 2);
    arc.rotateX(turn * 0.3);
    return arc.translate(x, y + 0.02, z);
  }
  const base = boxGeo(0.2 * s, 0.03, 0.14 * s);
  base.rotateY(turn);
  return base.translate(x, y + 0.03, z);
}

/** One face of an octagonal drum: its centre, chord length and rotation about Y. */
function drumFaces(cx: number, cz: number, rx: number, rz: number, count: number) {
  const out: Array<{ mx: number; mz: number; len: number; rot: number; nx: number; nz: number }> = [];
  const off = Math.PI / count;
  for (let i = 0; i < count; i++) {
    const a0 = off + (i / count) * Math.PI * 2;
    const a1 = off + ((i + 1) / count) * Math.PI * 2;
    const p0x = cx + rx * Math.cos(a0);
    const p0z = cz + rz * Math.sin(a0);
    const p1x = cx + rx * Math.cos(a1);
    const p1z = cz + rz * Math.sin(a1);
    const mx = (p0x + p1x) / 2;
    const mz = (p0z + p1z) / 2;
    const len = Math.hypot(p1x - p0x, p1z - p0z);
    const rot = Math.atan2(p1z - p0z, p1x - p0x);
    const d = Math.hypot(mx - cx, mz - cz);
    out.push({ mx, mz, len, rot, nx: (mx - cx) / d, nz: (mz - cz) / d });
  }
  return out;
}

export function buildRotondeApollon(g: THREE.Group): void {
  const b = ROOMS['rotonde-apollon'];
  const cx = (b.x[0] + b.x[1]) / 2;
  const cz = (b.z[0] + b.z[1]) / 2;
  const rx = (b.x[1] - b.x[0]) / 2;
  const rz = (b.z[1] - b.z[0]) / 2;
  const seg = 8;

  addPart(g, boxGeo(b.x[1] - b.x[0], 0.32, b.z[1] - b.z[0]).translate(cx, FLOOR - 0.16, cz), 'floor.marble-checker');
  const ring = new THREE.TorusGeometry(1, 0.06, 6, 24);
  ring.rotateX(Math.PI / 2);
  ring.scale(rx - 1.1, 1, rz - 1.1);
  ring.translate(cx, FLOOR + 0.04, cz);
  addPart(g, ring, 'marble.rouge-royal');

  // Eight flat faces, the two on the gallery and Salon Carré axes carrying the doorways.
  const faces = drumFaces(cx, cz, rx, rz, seg);
  const drum: THREE.BufferGeometry[] = [];
  const doorFace = (i: number) => (i === 5 ? { width: 5, head: 8 } : i === 3 ? { width: 4, head: 6 } : null);
  for (let i = 0; i < seg; i++) {
    const f = faces[i] as NonNullable<(typeof faces)[number]>;
    const door = doorFace(i);
    const piece = wallPiece(f.len + 0.24, SPRING - FLOOR, 0.8, door);
    piece.rotateY(f.rot);
    piece.translate(f.mx, FLOOR, f.mz);
    drum.push(piece);
  }
  addPart(g, mergeAll(drum), 'wall.apollon-blue');

  // Cornice ring and gilt pilasters on the four blank faces.
  const band: THREE.BufferGeometry[] = [];
  const pil: THREE.BufferGeometry[] = [];
  const profile: Array<readonly [number, number]> = [
    [0, 0],
    [0.3, 0.08],
    [0.42, 0.22],
    [0.46, 0.38],
    [0.3, 0.5],
    [0.3, 0.6],
    [0, 0.6],
  ];
  for (let i = 0; i < seg; i++) {
    const f = faces[i] as NonNullable<(typeof faces)[number]>;
    const gb = extrudeProfile(profile, { length: f.len });
    gb.rotateY(f.rot);
    gb.translate(f.mx - f.nx * 0.42, SPRING - 0.6, f.mz - f.nz * 0.42);
    band.push(gb);
    if (i % 2 === 0) {
      const p = boxGeo(0.85, SPRING - FLOOR - 2.6, 0.18);
      p.rotateY(f.rot);
      p.translate(f.mx - f.nx * 0.34, FLOOR + 1.15 + (SPRING - FLOOR - 2.6) / 2, f.mz - f.nz * 0.34);
      pil.push(p);
    }
  }
  addPart(g, mergeAll(band), 'gold.leaf');
  addPart(g, mergeAll(pil), 'trim.gilt');

  dome({ cx, cz, rx: rx * 0.97, rz: rz * 0.97, y0: SPRING, rise: CROWN - SPRING - 0.7, flatFraction: 0.34, segments: 20, rings: 5, mat: 'ceiling.gold-leaf', parent: g });

  const lantern: THREE.BufferGeometry[] = [];
  const lr = 1.4;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    lantern.push(bx(0.16, 1.1, 0.16, cx + lr * Math.cos(a), CROWN - 0.35, cz + lr * Math.sin(a)));
  }
  lantern.push(bx(lr * 2.5, 0.16, lr * 2.5, cx, CROWN + 0.22, cz));
  addPart(g, mergeAll(lantern), 'gold.leaf');
  addPart(g, boxGeo(lr * 2.1, 0.06, lr * 2.1).translate(cx, CROWN + 0.1, cz), 'app.light-card');
  addPart(g, lightPool(cx, FLOOR + 0.006, cz, 4.4), 'app.light-card');

  // Coffers in the dome and a marble medallion under them, so the rotunda is not one smooth curve.
  const coffers: THREE.BufferGeometry[] = [];
  for (let r = 0; r < 3; r++) {
    const k = 0.32 + r * 0.22;
    const y = SPRING + (CROWN - SPRING - 0.7) * Math.sin(((r + 0.6) / 5) * (Math.PI / 2));
    for (let i = 0; i < 12; i++) {
      const a = ((i + (r % 2) * 0.5) / 12) * Math.PI * 2;
      coffers.push(bx(0.7, 0.06, 0.7, cx + rx * 0.97 * k * Math.cos(a), y - 0.04, cz + rz * 0.97 * k * Math.sin(a)));
    }
  }
  addPart(g, mergeAll(coffers), 'gold.leaf');
  const medal = new THREE.CircleGeometry(3.1, 24);
  medal.rotateX(-Math.PI / 2);
  medal.translate(cx, FLOOR + 0.008, cz);
  addPart(g, medal, 'marble.rouge-royal');
}

/** A drum face's wall, in its own frame: length along X, straddling z = 0, base at y = 0. */
function wallPiece(len: number, height: number, thickness: number, door: { width: number; head: number } | null): THREE.BufferGeometry {
  const openings = door ? [{ x: 0, width: door.width, head: door.head, arched: true }] : [];
  return wallOfPiece({ length: len, height, thickness, openings, cornerAo: 0 });
}

export function buildRotondeDeMars(g: THREE.Group): void {
  const b = ROOMS['rotonde-de-mars'];
  const cx = (b.x[0] + b.x[1]) / 2;
  const cz = (b.z[0] + b.z[1]) / 2;

  addPart(g, boxGeo(b.x[1] - b.x[0], 0.3, b.z[1] - b.z[0]).translate(cx, -0.15, cz), 'floor.stone-flag');

  // Three walls of its own; the east one is shared with room 346 and carries that doorway here.
  wallOn(g, { face: 'n', at: b.z[0], from: b.x[0], to: b.x[1], floorY: 0, height: b.y1, mat: 'wall.stone-grey', holes: holesFor('rotonde-de-mars', 'n') });
  wallOn(g, { face: 's', at: b.z[1], from: b.x[0], to: b.x[1], floorY: 0, height: b.y1, mat: 'wall.stone-grey', holes: holesFor('rotonde-de-mars', 's') });
  wallOn(g, { face: 'w', at: b.x[0], from: b.z[0], to: b.z[1], floorY: 0, height: b.y1, mat: 'wall.stone-grey' });
  wallOn(g, { face: 'e', at: b.x[1], from: b.z[0], to: b.z[1], floorY: 0, height: b.y1, mat: 'wall.stone-grey', holes: holesFor('rotonde-de-mars', 'e') });

  doorOn(g, { face: 'n', plane: b.z[0], along: 127.875, floorY: 0, width: 2.4, height: 4.4, arched: true, mat: 'trim.stone-limestone-warm' });
  doorOn(g, { face: 'e', plane: b.x[1], along: 68, floorY: 0, width: 2.4, height: 4.4, arched: true, mat: 'trim.stone-limestone-warm' });
  doorOn(g, { face: 's', plane: b.z[1], along: 124.5, floorY: 7, width: 3.6, height: 4.4, arched: true, mat: 'trim.gilt' });

  const ceil = boxGeo(b.x[1] - b.x[0], 0.4, b.z[1] - b.z[0]).translate(cx, b.y1 + 0.2, cz);
  const beams: THREE.BufferGeometry[] = [];
  for (let x = b.x[0] + 4; x < b.x[1]; x += 4) beams.push(bx(0.4, 0.36, b.z[1] - b.z[0], x, b.y1 - 0.18, cz));
  for (let z = b.z[0] + 4; z < b.z[1]; z += 4) beams.push(bx(b.x[1] - b.x[0], 0.36, 0.4, cx, b.y1 - 0.18, z));
  addPart(g, mergeAll([ceil, ...beams]), 'ceiling.plaster-white');

  // The stair up to the Galerie d'Apollon's floor: twenty risers of 0.35 m onto a landing.
  const stair = staircase({ steps: 20, rise: 0.35, run: 0.23, width: 22.8 });
  stair.translate(cx, 0, 74);
  addPart(g, stair, 'marble.blanc-carrare');
  const rails: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) rails.push(bx(0.28, 1.05, 5.1, cx + s * 11.4, 3.55, 76.5));
  addPart(g, mergeAll(rails), 'trim.stone-limestone-warm');
  addPart(g, boxGeo(13.6, 0.3, 1.4).translate(cx, 6.85, 79.3), 'marble.blanc-carrare');
  addPart(g, boxGeo(13.6, 6.85, 1.4).translate(cx, 3.42, 79.3), 'wall.stone-grey');

  corniceOn(g, { face: 'n', at: b.z[0], from: b.x[0], to: b.x[1], y: b.y1 - 0.55, height: 0.55, projection: 0.35, dentils: false, mat: 'trim.stone-limestone-warm' });
  corniceOn(g, { face: 'w', at: b.x[0], from: b.z[0], to: b.z[1], y: b.y1 - 0.55, height: 0.55, projection: 0.35, dentils: false, mat: 'trim.stone-limestone-warm' });
  skirtOn(g, { face: 'w', at: b.x[0], from: b.z[0], to: b.z[1], y: 0, height: 0.3, thickness: 0.07, mat: 'trim.stone-limestone-warm' });

  // A lantern, so the stair hall is not a stone box: the court-facing window is in the court façade.
  const glow = q([b.x[0] + 1.4, 11.97, b.z[0] + 2], [b.x[1] - 1.4, 11.97, b.z[0] + 2], [b.x[1] - 1.4, 11.97, b.z[0] + 10], [b.x[0] + 1.4, 11.97, b.z[0] + 10]);
  glow.computeVertexNormals();
  addPart(g, glow, 'app.light-card');
}
