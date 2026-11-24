import * as THREE from 'three';
import type { ArtworkSpec } from '../../artworks/types';
import type { ZoneContext } from '../types';
import { addPart } from '../../core/merge';
import { boxGeo, mergeAll, quadGeo } from '../../core/geom';
import { floor } from '../../core/builders';
import type { Rng } from '../../core/rng';
import { BOX, HOLE, T } from './layout';
import {
  arcBand,
  bandOn,
  bench,
  corniceOn,
  frameOf,
  hang,
  hangFrame,
  midZ,
  put,
  simplePilaster,
  skirting,
  walls,
  type Frame,
  type RoomBox,
  type RoomPart,
  type Side,
} from './shell';

/**
 * The Grande Galerie: 268 m of top-lit Italian painting along the Seine, plus the reconstructed
 * Sessions gallery that links it to the Salle des États.
 *
 * The gallery is built as six cells along its length. Each cell merges on its own, so the culler
 * (and the frustum) can drop the ends of the room instead of drawing 268 m of wall and a thousand
 * pewter frames every frame. `update()` also hides cells beyond a distance so looking down the
 * length does not submit the whole spine.
 */

const GG = BOX['grande-galerie'] as RoomBox;
const CELLS = 6;
export const CELL_SPAN = (GG.x1 - GG.x0) / CELLS;

export interface GalleryCell {
  group: THREE.Group;
  x0: number;
  x1: number;
}

const LANTERN = 6.8;

interface HangRow {
  y: number;
  hMin: number;
  hMax: number;
  wMin: number;
  wMax: number;
}

const ROWS: HangRow[] = [
  { y: 1.75, hMin: 1.35, hMax: 2.35, wMin: 0.95, wMax: 1.85 },
  { y: 4.15, hMin: 0.95, hMax: 1.55, wMin: 0.75, wMax: 1.45 },
  { y: 5.95, hMin: 0.55, hMax: 0.9, wMin: 0.5, wMax: 1.0 },
];

/** Bays reserved for the three named works and for the doorways. */
const RESERVED: Record<'n' | 's', Array<[number, number]>> = {
  n: [[89.6, 96], [-63, -53]],
  s: [[79.4, 85.3]],
};

function cellBox(i: number): RoomBox {
  return { x0: GG.x0 + i * CELL_SPAN, x1: GG.x0 + (i + 1) * CELL_SPAN, z0: GG.z0, z1: GG.z1, y0: GG.y0, h: GG.h };
}

/** One bay of the glazed lantern: a glass sheet, bronze glazing bars and the iron kerbs. */
function lantern(g: THREE.Group, b: RoomBox): void {
  const w = b.x1 - b.x0;
  const half = LANTERN / 2;
  const cz = midZ(b);
  const y = b.y0 + b.h;
  const glass = quadGeo(
    [b.x0, y - 0.02, cz + half - 0.15],
    [b.x1, y - 0.02, cz + half - 0.15],
    [b.x1, y - 0.02, cz - half + 0.15],
    [b.x0, y - 0.02, cz - half + 0.15],
    [[0, 0], [w, 0], [w, LANTERN], [0, LANTERN]],
  );
  addPart(g, glass, 'glass.skylight-clear');

  const bars: THREE.BufferGeometry[] = [];
  // Kerbs along both edges of the lantern.
  for (const s of [-1, 1]) {
    const kerb = boxGeo(w, 0.22, 0.3);
    kerb.translate((b.x0 + b.x1) / 2, y - 0.11, cz + s * half);
    bars.push(kerb);
    const lip = boxGeo(w, 0.1, 0.14);
    lip.translate((b.x0 + b.x1) / 2, y - 0.26, cz + s * (half - 0.2));
    bars.push(lip);
  }
  // Longitudinal glazing bars.
  for (let k = 1; k < 4; k++) {
    const z = cz - half + (LANTERN * k) / 4;
    const bar = boxGeo(w, 0.09, 0.07);
    bar.translate((b.x0 + b.x1) / 2, y - 0.1, z);
    bars.push(bar);
  }
  // Transverse bars every 2.75 m, which is where the glazing panes break.
  for (let x = b.x0 + 2.75; x < b.x1; x += 2.75) {
    const bar = boxGeo(0.07, 0.08, LANTERN);
    bar.translate(x, y - 0.09, cz);
    bars.push(bar);
  }
  addPart(g, mergeAll(bars), 'gold.bronze-tarnished');

  // The plaster fields either side of the lantern.
  const field = (GG.z1 - GG.z0 - LANTERN) / 2;
  for (const s of [-1, 1]) {
    const slab = boxGeo(w, 0.28, field);
    slab.translate((b.x0 + b.x1) / 2, y + 0.14, cz + s * (half + field / 2));
    addPart(g, slab, 'ceiling.plaster-white');
  }
}

function cellRng(r: Rng, i: number): Rng {
  return r.fork('cell' + i);
}

function buildCell(ctx: ZoneContext, i: number): THREE.Group {
  const b = cellBox(i);
  const r = cellRng(ctx.rng('grande-galerie'), i);
  const g = new THREE.Group();
  g.name = 'denon/grande-galerie-' + i;

  const fN = frameOf(b, 'n');
  const fS = frameOf(b, 's');
  const inSpan = (h: { at: number; width: number }): boolean =>
    h.at + h.width / 2 > b.x0 && h.at - h.width / 2 < b.x1;
  const holes = [HOLE.sessionsGg].filter(inSpan);

  const sides: Partial<Record<Side, { t: number; holes?: typeof holes }>> = {
    n: { t: T, holes },
    s: { t: T },
  };
  if (i === 0) sides.w = { t: T };
  if (i === CELLS - 1) sides.e = { t: T, holes: [HOLE.ggSalon] };

  const fl = addPart(g, floor({ width: CELL_SPAN, depth: GG.z1 - GG.z0 }), 'floor.parquet-versailles');
  fl.position.set((b.x0 + b.x1) / 2, b.y0, midZ(b));

  walls(g, b, sides, { wall: 'wall.red-madder', casing: 'trim.stone-limestone-warm' });
  const wallSides: Side[] = ['n', 's'];
  if (i === 0) wallSides.push('w');
  if (i === CELLS - 1) wallSides.push('e');
  skirting(g, b, sides, 'stone.limestone-warm', 0.3);
  corniceOn(g, b, wallSides, 'trim.gilt', { height: 0.55, projection: 0.36 });
  // The picture rail runs the whole 268 m without a break.
  bandOn(g, b, wallSides, 'trim.gilt', b.y0 + 6.5, 0.12, 0.08);

  // Grey stone dado, then the red field above it — the gallery as it is, not as route.json's one word.
  for (const side of wallSides) {
    const f = frameOf(b, side);
    put(addPart(g, boxGeo(f.length, 0.85, 0.06), 'stone.limestone-warm'), f, f.ct, b.y0 + 0.425, 0.03);
  }

  // Pilasters on the bay grid, standing from the dado to the cornice.
  const pil = simplePilaster(0.95, b.h - 0.55 - 0.85, 0.22);
  for (let x = b.x0 + (i === 0 ? 0 : 5.5); x <= b.x1 + 0.01; x += 5.5) {
    if (holes.some((h) => Math.abs(x - h.at) < h.width / 2 + 0.7)) continue;
    put(addPart(g, pil.clone(), 'stone.limestone-warm'), fN, x, b.y0 + 0.85, 0.02);
    put(addPart(g, pil.clone(), 'stone.limestone-warm'), fS, x, b.y0 + 0.85, 0.02);
  }
  pil.dispose();

  lantern(g, b);
  // Transverse ribs every 5.5 m, springing from the cornice and rising into the lantern.
  for (let x = b.x0 + 2.75; x < b.x1; x += 5.5) {
    const rib = arcBand({ span: GG.z1 - GG.z0, rise: 0.72, depth: 0.32, width: 0.24, segs: 16 });
    rib.rotateY(Math.PI / 2);
    rib.translate(x, b.y0 + b.h - 0.75, midZ(b));
    addPart(g, rib, 'ceiling.plaster-white');
  }

  // One stone bench per cell, on the south side, where the real gallery seats its visitors.
  bench(g, b, { x: (b.x0 + b.x1) / 2, z: b.z1 - 3.4, len: 4.2, along: 'x', mat: 'stone.limestone-warm' });

  // The salon hang: three rows, one column per bay, sizes from the seeded stream.
  for (const side of ['n', 's'] as const) {
    const f: Frame = side === 'n' ? fN : fS;
    const reserved = RESERVED[side];
    for (let x = b.x0 + 2.75; x < b.x1; x += 5.5) {
      if (reserved.some(([a, c]) => x > a && x < c)) continue;
      if (holes.some((h) => Math.abs(x - h.at) < h.width / 2 + 1.2)) continue;
      for (const row of ROWS) {
        const h = r.range(row.hMin, row.hMax);
        const w = r.range(row.wMin, row.wMax);
        if (row.y + h / 2 > 6.35) continue;
        hangFrame(g, f, x + r.range(-0.25, 0.25), b.y0 + row.y + r.range(-0.08, 0.08), { w, h });
      }
    }
  }

  return g;
}

const virginOfTheRocks: ArtworkSpec = {
  id: 'virgin-of-the-rocks',
  title: 'The Virgin of the Rocks',
  artist: 'Leonardo da Vinci',
  year: 'c. 1483-1494',
  sizeCm: [122, 199],
  room: 'grande-galerie',
  wall: 'north',
  position: [93.25, 8.4, 141.02],
  rotationY: 0,
};

const sainteAnne: ArtworkSpec = {
  id: 'sainte-anne',
  title: 'The Virgin and Child with Saint Anne',
  artist: 'Leonardo da Vinci',
  year: 'c. 1503-1519',
  sizeCm: [130, 168],
  room: 'grande-galerie',
  wall: 'north',
  position: [87.75, 8.7, 141.02],
  rotationY: 0,
};

const belleJardiniere: ArtworkSpec = {
  id: 'belle-jardiniere',
  title: 'The Virgin and Child with the Infant Saint John the Baptist (La Belle Jardiniere)',
  artist: 'Raphael',
  year: '1507-1508',
  sizeCm: [80, 122],
  room: 'grande-galerie',
  wall: 'south',
  position: [82.25, 8.4, 153.98],
  rotationY: Math.PI,
};

export function buildGrandeGalerie(ctx: ZoneContext): { part: RoomPart; cells: GalleryCell[] } {
  const raws: THREE.Group[] = [];
  for (let i = 0; i < CELLS; i++) raws.push(buildCell(ctx, i));
  const cells: GalleryCell[] = raws.map((raw, i) => {
    const b = cellBox(i);
    return { group: raw, x0: b.x0, x1: b.x1 };
  });
  return {
    part: {
      raw: raws,
      dress: (merged) => {
        const east = merged[CELLS - 1] as THREE.Group;
        hang(east, virginOfTheRocks);
        hang(east, sainteAnne);
        hang(east, belleJardiniere);
      },
    },
    cells,
  };
}
