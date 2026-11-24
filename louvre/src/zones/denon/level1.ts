import * as THREE from 'three';
import type { ArtworkSpec } from '../../artworks/types';
import { BOX, HOLE, T } from './layout';
import {
  band,
  bench,
  corniceRing,
  flatCeiling,
  hang,
  hangFrame,
  midZ,
  frameOf,
  slabFloor,
  skirting,
  stripCeiling,
  vitrine,
  walls,
  type RoomPart,
  type Side,
  type SideSpec,
  boxGeo,
  mergeAll,
} from './shell';
import { addPart, addParts } from '../../core/merge';
import { cofferCeiling, skylight } from '../../core/builders';

/**
 * Level 1: the three Roman red rooms, the Salle des États, the reconstructed Sessions gallery and
 * the Salon Carré.
 */

const III: number = Math.PI;

/** The Lefuel salles rouges share a shell: parquet, red wall, gilt trim, glazed strip over the centre. */
function redRoom(
  id: string,
  sides: Partial<Record<Side, SideSpec>>,
  opts: { rail?: number } = {},
): { g: THREE.Group; b: (typeof BOX)[string] } {
  const b = BOX[id] as (typeof BOX)[string];
  const g = new THREE.Group();
  g.name = 'denon/' + id;
  slabFloor(g, b, 'floor.parquet-versailles');
  walls(g, b, sides, { wall: 'wall.red-madder', casing: 'trim.stone-limestone-warm' });
  skirting(g, b, sides, 'trim.gilt', 0.26);
  corniceRing(g, b, 'trim.gilt', { height: 0.36, projection: 0.3 });
  stripCeiling(g, b, 'ceiling.plaster-white', 4.2);
  band(g, b, 'trim.gilt', b.y0 + (opts.rail ?? 6.15), 0.1, 0.07);
  return { g, b };
}

const coronation: ArtworkSpec = {
  id: 'coronation',
  title: 'The Coronation of Napoleon I and the Empress Josephine in Notre-Dame, 2 December 1804',
  artist: 'Jacques-Louis David',
  year: '1805-1807',
  sizeCm: [979, 621],
  room: 'salle-daru',
  wall: 'south',
  position: [47, 10.955, 91.98],
  rotationY: III,
};

const oath: ArtworkSpec = {
  id: 'oath-of-the-horatii',
  title: 'The Oath of the Horatii',
  artist: 'Jacques-Louis David',
  year: '1784',
  sizeCm: [425, 330],
  room: 'salle-daru',
  wall: 'north',
  position: [47, 9.85, 74.02],
  rotationY: 0,
};

const odalisque: ArtworkSpec = {
  id: 'grande-odalisque',
  title: 'Une Odalisque (La Grande Odalisque)',
  artist: 'Jean-Auguste-Dominique Ingres',
  year: '1814',
  sizeCm: [162, 91],
  room: 'salle-daru',
  wall: 'north',
  position: [56.9, 8.6, 74.02],
  rotationY: 0,
};

export function buildSalleDaru(): RoomPart {
  const { g, b } = redRoom('salle-daru', {
    n: { t: T },
    s: { t: T },
    e: { t: T, holes: [HOLE.daruLanding] },
    w: { t: T, holes: [HOLE.daruDenon] },
  });
  bench(g, b, { x: 47, z: 84.5, len: 4, along: 'x' });
  return {
    raw: [g],
    dress: (merged) => {
      hang(merged[0] as THREE.Group, coronation);
      hang(merged[0] as THREE.Group, oath);
      hang(merged[0] as THREE.Group, odalisque);
    },
  };
}

export function buildSalleDenon(): RoomPart {
  const { g, b } = redRoom('salle-denon', {
    n: { t: T },
    s: { t: T },
    e: { t: T, holes: [HOLE.daruDenon] },
    w: { t: T, holes: [HOLE.denonMollien] },
  });
  bench(g, b, { x: 17, z: 83, len: 3.6, along: 'x' });
  return { raw: [g] };
}

const raft: ArtworkSpec = {
  id: 'raft-of-the-medusa',
  title: 'The Raft of the Medusa',
  artist: 'Theodore Gericault',
  year: '1818-1819',
  sizeCm: [716, 491],
  room: 'salle-mollien',
  wall: 'west',
  position: [-27.98, 10.655, 86],
  rotationY: Math.PI / 2,
};

const liberty: ArtworkSpec = {
  id: 'liberty',
  title: 'Liberty Leading the People (28 July 1830)',
  artist: 'Eugene Delacroix',
  year: '1830',
  sizeCm: [325, 260],
  room: 'salle-mollien',
  wall: 'south',
  position: [-14, 9.5, 91.98],
  rotationY: III,
};

const sardanapalus: ArtworkSpec = {
  id: 'death-of-sardanapalus',
  title: 'The Death of Sardanapalus',
  artist: 'Eugene Delacroix',
  year: '1827',
  sizeCm: [496, 392],
  room: 'salle-mollien',
  wall: 'north',
  position: [-14, 10.16, 74.02],
  rotationY: 0,
};

export function buildSalleMollien(): RoomPart {
  const { g, b } = redRoom('salle-mollien', {
    n: { t: T },
    s: { t: T },
    e: { t: T, holes: [HOLE.denonMollien] },
    w: { t: T, holes: [HOLE.mollienEtats] },
  });
  bench(g, b, { x: -13, z: 84.5, len: 4, along: 'x' });
  return {
    raw: [g],
    dress: (merged) => {
      const m = merged[0] as THREE.Group;
      hang(m, raft);
      hang(m, liberty);
      hang(m, sardanapalus);
    },
  };
}

const monaLisa: ArtworkSpec = {
  id: 'mona-lisa',
  title: 'Portrait of Lisa Gherardini, wife of Francesco del Giocondo, known as the Mona Lisa',
  artist: 'Leonardo da Vinci',
  year: 'c. 1503-1519',
  sizeCm: [53, 77],
  room: 'salle-des-etats',
  wall: 'cimaise',
  position: [-60.94, 8.75, 82.9],
  rotationY: Math.PI / 2,
};

const cana: ArtworkSpec = {
  id: 'wedding-at-cana',
  title: 'The Wedding Feast at Cana',
  artist: 'Paolo Veronese',
  year: '1562-1563',
  sizeCm: [994, 677],
  room: 'salle-des-etats',
  wall: 'north',
  position: [-48, 11.485, 74.02],
  rotationY: 0,
};

/** Where the Mona Lisa's false wall stands: across the west end, facing the entrance. */
export const CIMAISE = { x: -61.2, z0: 78.4, z1: 87.4, h: 5.4, t: 0.45 };

export function buildSalleDesEtats(): RoomPart {
  const b = BOX['salle-des-etats'] as (typeof BOX)[string];
  const g = new THREE.Group();
  g.name = 'denon/salle-des-etats';
  slabFloor(g, b, 'floor.parquet-versailles');
  const sides: Partial<Record<Side, SideSpec>> = {
    n: { t: T },
    s: { t: T, holes: [HOLE.etatsSessions] },
    e: { t: T, holes: [HOLE.mollienEtats] },
    w: { t: T },
  };
  walls(g, b, sides, { wall: 'wall.midnight-blue', casing: 'trim.gilt' });
  skirting(g, b, sides, 'trim.gilt', 0.26);
  corniceRing(g, b, 'trim.gilt', { height: 0.7, projection: 0.45 });
  // The glass ceiling was fitted so that nothing reflects on the canvases: one continuous lantern.
  stripCeiling(g, b, 'ceiling.plaster-white', 5.2);

  // The false wall that carries the Mona Lisa, standing free across the west end.
  const cw = CIMAISE.z1 - CIMAISE.z0;
  const shell = new THREE.Group();
  const wallGeo = boxGeo(CIMAISE.t, CIMAISE.h, cw);
  wallGeo.translate(0, CIMAISE.h / 2, 0);
  const cap = boxGeo(CIMAISE.t * 1.5, 0.28, cw + 0.2);
  cap.translate(0, CIMAISE.h - 0.14, 0);
  const body = addPart(shell, mergeAll([wallGeo, cap]), 'wall.midnight-blue');
  body.position.set(CIMAISE.x, b.y0, (CIMAISE.z0 + CIMAISE.z1) / 2);
  // Its plinth and picture rail read from both sides.
  const pl = boxGeo(CIMAISE.t * 1.4, 0.14, cw);
  pl.translate(0, 0.07, 0);
  addPart(shell, pl, 'marble.noir-marquina').position.set(CIMAISE.x, b.y0, (CIMAISE.z0 + CIMAISE.z1) / 2);
  g.add(shell);

  // A bench facing the Cana, in the middle of the room.
  bench(g, b, { x: -44, z: 84, len: 5, along: 'x' });

  return {
    raw: [g],
    dress: (merged) => {
      const m = merged[0] as THREE.Group;
      hang(m, cana);
      hang(m, monaLisa);
      vitrine(m, [-60.58, 8.75, 82.9], [0.5, 1.18, 1.3]);
    },
  };
}

export function buildSessions(): RoomPart {
  const b = BOX['galerie-des-sessions'] as (typeof BOX)[string];
  const g = new THREE.Group();
  g.name = 'denon/galerie-des-sessions';
  slabFloor(g, b, 'floor.parquet-versailles');
  const sides: Partial<Record<Side, SideSpec>> = {
    n: { t: T, holes: [HOLE.etatsSessions] },
    s: { t: T, holes: [HOLE.sessionsGg] },
    e: { t: T },
    w: { t: T },
  };
  walls(g, b, sides, { wall: 'wall.red-madder-deep', casing: 'trim.stone-limestone-warm' });
  skirting(g, b, sides, 'trim.stone-limestone-warm', 0.2);
  // Invented room, and it says so: a plain service corridor — a moulded chamfer instead of a proper
  // cornice, no pilasters, no picture rail, no ornament, and no works on the walls.
  band(g, b, 'trim.stone-limestone-warm', b.y0 + b.h - 0.3, 0.16, 0.12);
  flatCeiling(g, b, 'ceiling.plaster-white', Math.round((b.z1 - b.z0) / 6));
  return { raw: [g] };
}

export function buildSalonCarre(): RoomPart {
  const b = BOX['salon-carre'] as (typeof BOX)[string];
  const g = new THREE.Group();
  g.name = 'denon/salon-carre';
  slabFloor(g, b, 'floor.parquet-versailles');
  const sides: Partial<Record<Side, SideSpec>> = {
    n: { t: T },
    s: { t: T },
    e: { t: T, holes: [HOLE.salonApollon] },
    w: { t: T, holes: [HOLE.ggSalon] },
  };
  walls(g, b, sides, { wall: 'wall.stone-grey', casing: 'trim.gilt' });
  skirting(g, b, sides, 'trim.gilt', 0.26);
  corniceRing(g, b, 'trim.gilt', { height: 0.66, projection: 0.42, dentils: true });
  // Coved, with the Grande Galerie's glazed lantern continuing in over the centre.
  const w = b.x1 - b.x0;
  const d = b.z1 - b.z0;
  const strip = 4.4;
  const field = (d - strip) / 2;
  for (const sign of [-1, 1]) {
    const coffer = cofferCeiling({ width: w, depth: field, baysX: 4, baysZ: 1, beamWidth: 0.3, beamDepth: 0.28 });
    const m = addPart(g, coffer, 'ceiling.plaster-white');
    m.position.set(b.x0 + w / 2, b.y0 + b.h + 0.28, midZ(b) + sign * (strip / 2 + field / 2));
  }
  const sky = new THREE.Group();
  addParts(sky, skylight({ width: w - 1.4, depth: strip, bars: 8 }));
  sky.position.set(b.x0 + w / 2, b.y0 + b.h, midZ(b));
  g.add(sky);
  bench(g, b, { x: 106, z: 147.5, len: 4, along: 'z' });
  // A pair of empty frames on the river wall so the room is not bare while the hang is unspecified.
  const f = frameOf(b, 's');
  hangFrame(g, f, 101, b.y0 + 3.4, { w: 1.9, h: 2.5 });
  hangFrame(g, f, 111, b.y0 + 3.4, { w: 1.9, h: 2.5 });
  return { raw: [g] };
}
