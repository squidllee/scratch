import * as THREE from 'three';
import { cofferCeiling, staircase } from '../../core/builders';
import { boxGeo, mergeAll } from '../../core/geom';
import { addPart } from '../../core/merge';
import { bx, corniceOn, doorOn, plinthAt, q, skirtOn, vaultRibs, vaultZ, wallOn } from './geo';
import { ROOMS, holesFor } from './layout';

/**
 * The Lescot corner: the Pavillon de l'Horloge, the Henri II stair and the Salle des Caryatides.
 *
 * All three are stone boxes and the work is in the cutting, not the ornament: rusticated reveals,
 * a barrel vault over the pavilion, the oldest coffered ceiling in the Louvre over the Caryatides,
 * and Jean Goujon's tribune, whose four figures come from the artwork library while the corbels,
 * plinths and entablature they carry are built here.
 */

export function buildPavillon(g: THREE.Group): void {
  const b = ROOMS['pavillon-horloge'];
  const w = b.x[1] - b.x[0];
  const d = b.z[1] - b.z[0];
  const cx = (b.x[0] + b.x[1]) / 2;
  const cz = (b.z[0] + b.z[1]) / 2;
  const SPRING = 14.2;

  addPart(g, boxGeo(w, 0.35, d).translate(cx, -0.175, cz), 'floor.stone-flag');

  // The east wall is the court's west façade, built once with the court: it carries the big arch.
  wallOn(g, { face: 'w', at: b.x[0], from: b.z[0], to: b.z[1], floorY: 0, height: SPRING, mat: 'wall.stone-grey', holes: holesFor('pavillon-horloge', 'w') });
  // The end walls rise the full 20 m, because the barrel vault between them needs a tympanum,
  // and because the level-2 door sits at 13.6 m, above the vault's springing line.
  wallOn(g, { face: 'n', at: b.z[0], from: b.x[0], to: b.x[1], floorY: 0, height: b.y1, mat: 'wall.stone-grey', holes: holesFor('pavillon-horloge', 'n') });
  wallOn(g, { face: 's', at: b.z[1], from: b.x[0], to: b.x[1], floorY: 0, height: b.y1, mat: 'wall.stone-grey', holes: holesFor('pavillon-horloge', 's') });

  doorOn(g, { face: 'w', plane: b.x[0], along: 0, floorY: 0, width: 7, height: 9.5, arched: true, mat: 'trim.stone-limestone-warm', thickness: 0.9 });
  doorOn(g, { face: 'n', plane: b.z[0], along: 118.7, floorY: 13.6, width: 3, height: 3.4, mat: 'trim.stone-limestone-warm' });
  doorOn(g, { face: 's', plane: b.z[1], along: 127.875, floorY: 0, width: 2.4, height: 4.4, arched: true, mat: 'trim.stone-limestone-warm' });

  // Stone barrel vault along the pavilion's depth.
  vaultZ({ x0: b.x[0], x1: b.x[1], z0: b.z[0], z1: b.z[1], spring: SPRING, crown: 19.9, flatHalf: 2.4, segments: 5, mat: 'stone.limestone-pale', parent: g, ao: 0.34 });
  vaultRibs({ x0: b.x[0], x1: b.x[1], spring: SPRING, crown: 19.9, flatHalf: 2.4, at: [-10.5, -3.5, 3.5, 10.5], band: 0.55, depth: 0.24, segments: 5, mat: 'trim.stone-limestone-warm', parent: g });

  for (const face of ['w', 'n', 's'] as const) {
    const along = face === 'w' ? { from: b.z[0], to: b.z[1] } : { from: b.x[0], to: b.x[1] };
    const at = face === 'w' ? b.x[0] : face === 'n' ? b.z[0] : b.z[1];
    corniceOn(g, { face, at, from: along.from, to: along.to, y: SPRING - 0.6, height: 0.6, projection: 0.46, dentils: true, mat: 'trim.stone-limestone-warm' });
  }
  // Giant pilasters carrying the cornice on the two end walls.
  for (const face of ['n', 's'] as const) {
    const at = face === 'n' ? b.z[0] : b.z[1];
    const parts: THREE.BufferGeometry[] = [];
    for (const x of [120.2, 124.6, 131.5, 135.9]) {
      parts.push(bx(1.1, SPRING - 1.6, 0.42, x, (SPRING - 1.6) / 2, at));
      parts.push(bx(1.34, 0.3, 0.62, x, SPRING - 1.6, at));
      parts.push(bx(1.3, 1.4, 0.56, x, 0.7, at));
    }
    addPart(g, mergeAll(parts), 'wall.stone-grey');
  }
  skirtOn(g, { face: 'w', at: b.x[0], from: b.z[0], to: b.z[1], y: 0, height: 1.4, thickness: 0.1, mat: 'stone.limestone-warm' });
  skirtOn(g, { face: 'n', at: b.z[0], from: b.x[0], to: b.x[1], y: 0, height: 1.4, thickness: 0.1, mat: 'stone.limestone-warm' });
  skirtOn(g, { face: 's', at: b.z[1], from: b.x[0], to: b.x[1], y: 0, height: 1.4, thickness: 0.1, mat: 'stone.limestone-warm' });

  // The stair to level 2: 76 risers along the west wall, landing at the north door.
  const stair = staircase({ steps: 76, rise: 0.179, run: 0.28, width: 3.8 });
  stair.rotateY(Math.PI);
  stair.translate(118.7, 0, 12);
  addPart(g, stair, 'stone.limestone-warm');
  // Sloped parapet and handrail on its open side.
  const slope = Math.atan2(13.6, 21.28);
  const rail = boxGeo(0.18, 1.05, Math.hypot(13.6, 21.28));
  rail.rotateX(-slope);
  rail.translate(120.7, 7.15, 1.36);
  const parapet = boxGeo(0.5, 0.9, Math.hypot(13.6, 21.28));
  parapet.rotateX(-slope);
  parapet.translate(120.7, 6.6, 1.36);
  addPart(g, mergeAll([rail, parapet]), 'trim.stone-limestone-warm');
  addPart(g, boxGeo(5.4, 0.35, 5).translate(119.2, 13.42, -11.5), 'stone.limestone-warm');
  addPart(g, boxGeo(0.4, 1.1, 5).translate(121.65, 13.9, -11.5), 'trim.stone-limestone-warm');

  // Daylight through the west arch: a soft pool on the paving where it lands.
  addPart(g, new THREE.CircleGeometry(3.4, 18).rotateX(-Math.PI / 2).translate(b.x[0] + 6.4, 0.02, 0), 'app.light-card');
}

export function buildEscalierHenriII(g: THREE.Group): void {
  const b = ROOMS['escalier-henri-ii'];
  const w = b.x[1] - b.x[0];
  const d = b.z[1] - b.z[0];
  const cx = (b.x[0] + b.x[1]) / 2;
  const cz = (b.z[0] + b.z[1]) / 2;
  const SPRING = 11.3;

  addPart(g, boxGeo(w, 0.35, d).translate(cx, -0.175, cz), 'floor.stone-flag');
  wallOn(g, { face: 'w', at: b.x[0], from: b.z[0], to: b.z[1], floorY: 0, height: SPRING, mat: 'wall.stone-grey' });
  wallOn(g, { face: 'n', at: b.z[0], from: b.x[0], to: b.x[1], floorY: 0, height: b.y1, mat: 'wall.stone-grey', holes: holesFor('escalier-henri-ii', 'n') });
  wallOn(g, { face: 's', at: b.z[1], from: b.x[0], to: b.x[1], floorY: 0, height: b.y1, mat: 'wall.stone-grey', holes: holesFor('escalier-henri-ii', 's') });
  doorOn(g, { face: 'n', plane: b.z[0], along: 127.875, floorY: 0, width: 2.4, height: 4.4, arched: true, mat: 'trim.stone-limestone-warm' });
  doorOn(g, { face: 's', plane: b.z[1], along: 127.875, floorY: 0, width: 2.4, height: 4.4, arched: true, mat: 'trim.stone-limestone-warm' });

  vaultZ({ x0: b.x[0], x1: b.x[1], z0: b.z[0], z1: b.z[1], spring: SPRING, crown: 13.95, flatHalf: 2.2, segments: 4, mat: 'stone.limestone-pale', parent: g, ao: 0.4 });
  vaultRibs({ x0: b.x[0], x1: b.x[1], spring: SPRING, crown: 13.95, flatHalf: 2.2, at: [17.6, 22, 26.4], band: 0.5, depth: 0.22, segments: 4, mat: 'trim.stone-limestone-warm', parent: g });

  // The straight flight: 24 risers to a 7 m landing against the south wall.
  const stair = staircase({ steps: 24, rise: 0.2917, run: 0.5, width: 9.6 });
  stair.translate(121, 0, 15);
  addPart(g, stair, 'stone.limestone-warm');
  addPart(g, boxGeo(9.6, 0.4, 3).translate(121, 6.8, 28.5), 'trim.stone-limestone-warm');
  addPart(g, boxGeo(9.6, 6.6, 3).translate(121, 3.3, 28.5), 'wall.stone-grey');
  const balustrade: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 24; i++) {
    const z = 15.25 + i * 0.5;
    balustrade.push(bx(0.16, 0.9, 0.16, 125.9, 0.2917 * (i + 1) + 0.45, z));
  }
  balustrade.push(bx(0.26, 0.14, 12.4, 125.9, 7.35, 21));
  addPart(g, mergeAll(balustrade), 'trim.stone-limestone-warm');

  corniceOn(g, { face: 'w', at: b.x[0], from: b.z[0], to: b.z[1], y: SPRING - 0.55, height: 0.55, projection: 0.4, dentils: false, mat: 'trim.stone-limestone-warm' });
  corniceOn(g, { face: 'n', at: b.z[0], from: b.x[0], to: b.x[1], y: SPRING - 0.55, height: 0.55, projection: 0.4, dentils: false, mat: 'trim.stone-limestone-warm' });
  corniceOn(g, { face: 's', at: b.z[1], from: b.x[0], to: b.x[1], y: SPRING - 0.55, height: 0.55, projection: 0.4, dentils: false, mat: 'trim.stone-limestone-warm' });
  skirtOn(g, { face: 'w', at: b.x[0], from: b.z[0], to: b.z[1], y: 0, height: 1.2, thickness: 0.1, mat: 'stone.limestone-warm' });
}

export function buildCaryatides(g: THREE.Group): void {
  const b = ROOMS['salle-des-caryatides'];
  const w = b.x[1] - b.x[0];
  const d = b.z[1] - b.z[0];
  const cx = (b.x[0] + b.x[1]) / 2;
  const cz = (b.z[0] + b.z[1]) / 2;
  const H = b.y1;

  addPart(g, boxGeo(w, 0.35, d).translate(cx, -0.175, cz), 'floor.stone-flag');

  // The east wall is the court's west façade — it carries this room's windows.
  wallOn(g, { face: 'w', at: b.x[0], from: b.z[0], to: b.z[1], floorY: 0, height: H, mat: 'wall.stone-grey' });
  wallOn(g, { face: 'n', at: b.z[0], from: b.x[0], to: b.x[1], floorY: 0, height: H, mat: 'wall.stone-grey', holes: holesFor('salle-des-caryatides', 'n') });
  wallOn(g, { face: 's', at: b.z[1], from: b.x[0], to: b.x[1], floorY: 0, height: H, mat: 'wall.stone-grey', holes: holesFor('salle-des-caryatides', 's') });
  doorOn(g, { face: 'n', plane: b.z[0], along: 127.875, floorY: 0, width: 2.4, height: 4.4, arched: true, mat: 'trim.stone-limestone-warm' });
  doorOn(g, { face: 's', plane: b.z[1], along: 127.875, floorY: 0, width: 2.4, height: 4.4, arched: true, mat: 'trim.stone-limestone-warm' });

  // The oldest coffered ceiling in the Louvre: five bays across the short side.
  const coffer = cofferCeiling({ width: w, depth: d, baysX: 3, baysZ: 5, beamWidth: 0.44, beamDepth: 0.52, rosettes: true });
  coffer.rotateY(Math.PI / 2);
  coffer.translate(cx, H + 0.52, cz);
  addPart(g, coffer, 'ceiling.plaster-white');

  // Stone pilasters on the three closed walls and a string course at the springing of the coffer.
  const pil: THREE.BufferGeometry[] = [];
  for (const x of [119, 122, 126, 130, 134, 137]) {
    pil.push(bx(0.95, H - 1.5, 0.3, x, (H - 1.5) / 2, b.z[0]));
    pil.push(bx(0.95, H - 1.5, 0.3, x, (H - 1.5) / 2, b.z[1]));
  }
  for (const z of [33.5, 37.5, 41.5, 45.5, 49.5]) {
    pil.push(bx(0.3, H - 1.5, 0.95, b.x[0], (H - 1.5) / 2, z));
  }
  for (const face of ['n', 's', 'w'] as const) {
    const along = face === 'w' ? { from: b.z[0], to: b.z[1] } : { from: b.x[0], to: b.x[1] };
    const at = face === 'w' ? b.x[0] : face === 'n' ? b.z[0] : b.z[1];
    corniceOn(g, { face, at, from: along.from, to: along.to, y: H - 0.6, height: 0.6, projection: 0.36, dentils: false, mat: 'trim.stone-limestone-warm' });
    skirtOn(g, { face, at, from: along.from, to: along.to, y: 0, height: 0.9, thickness: 0.1, mat: 'stone.limestone-warm' });
  }
  addPart(g, mergeAll(pil), 'wall.stone-grey');

  // Jean Goujon's tribune: four corbels, four plinths, the slab and the entablature. The figures
  // themselves are the artwork (id caryatids-goujon); this is what they stand on and carry.
  // Figure centres: the library's four span 5.2 m with the doorway between the middle pair, so the
  // corbels sit at ±1.5 and ±2.1 m from the axis and their heads carry the entablature at 4.27 m.
  const figuresX = [125.775, 126.375, 129.375, 129.975];
  const tribune: THREE.BufferGeometry[] = [];
  for (const x of figuresX) {
    tribune.push(bx(0.66, 0.5, 0.55, x, 1.1, b.z[1] - 0.45));
    tribune.push(bx(0.8, 0.12, 0.66, x, 1.41, b.z[1] - 0.45));
  }
  tribune.push(bx(6.4, 0.3, 1.9, 127.875, 4.42, b.z[1] - 0.95));
  tribune.push(bx(6.7, 0.26, 2.1, 127.875, 4.68, b.z[1] - 1.0));
  tribune.push(bx(6.2, 0.55, 1.5, 127.875, 5.1, b.z[1] - 1.05));
  tribune.push(bx(6.6, 0.24, 1.7, 127.875, 5.5, b.z[1] - 1.05));
  addPart(g, mergeAll(tribune), 'trim.stone-limestone-warm');
  addPart(g, boxGeo(6.4, 0.1, 1.9).translate(127.875, 4.59, b.z[1] - 0.95), 'marble.rouge-royal');

  // The two marbles the room is known for, on their plinths.
  addPart(g, plinthAt(127.9, 42.5, 1.5, 1.5, 0.62), 'marble.blanc-carrare');
  addPart(g, plinthAt(127.9, 49.5, 1.9, 1.9, 0.46), 'marble.blanc-carrare');
}
