import * as THREE from 'three';
import { boxGeo } from '../../core/geom';
import { mergeByMaterial, addPart } from '../../core/merge';
import { mat } from '../../core/materials';
import { cornice, doorway } from '../../core/builders';
import { cullerInfo, type RoomDef, type RoomPortal } from '../../core/culling';
import type { SpawnPoint } from '../../core/controls';
import type { Zone, ZoneContext } from '../types';
import {
  crossing,
  escalier,
  flightUp,
  hammurabi,
  khorsabad,
  marly,
  marlyTerrace,
  MARLY_BAYS,
  MARLY_STAIR_Z,
  passage,
  ESCALIER_DOOR_Z,
  puget,
  pugetTerrace,
  PUGET_BAYS,
  PUGE_ASCENT_X,
  PUGE_DESCENT_X,
  PUGE_STAIR_Z,
  salon,
  WALL_T,
  type Cell,
} from './layout';
import { buildKhorsabad, buildMarly, buildPuget, sideWall } from './courts';
import { buildEscalier, buildHammurabi, buildPassage, buildSalon } from './rooms';
import { placeArtworks, sculptureBases } from './artworks';
import { bakeShade, plate, put } from './parts';

/**
 * Zone `richelieu` — the Richelieu wing's interiors.
 *
 * Seven rooms from `route.json` (Passage Richelieu, the three glazed courts, the Hammurabi room,
 * the Richelieu stair, the Napoleon III Grand Salon) plus the walkable cells that stitch their
 * four different floor levels together. Each room is merged per material into its own group, so the
 * culler can hide it on its own.
 */

const portal = (
  to: string,
  centre: readonly [number, number, number],
  width: number,
  height: number,
  normal: readonly [number, number, number],
): RoomPortal => ({ to, centre, width, height, normal });

const bounds = (c: Cell): RoomDef['bounds'] => ({
  min: [c.x0, c.floor, c.z0],
  max: [c.x1, c.ceil, c.z1],
});

/** A door on the shared face of two cells, both directions. */
function doorBetween(
  a: { id: string; cell: Cell },
  b: { id: string; cell: Cell },
  opts: { axis: 'x' | 'z'; at: number; along: number; width: number; height: number },
): [RoomPortal, RoomPortal] {
  const normalA: readonly [number, number, number] = opts.axis === 'x' ? [Math.sign(opts.at - (a.cell.x0 + a.cell.x1) / 2) || 1, 0, 0] : [0, 0, Math.sign(opts.at - (a.cell.z0 + a.cell.z1) / 2) || 1];
  const y = Math.max(a.cell.floor, b.cell.floor) + opts.height / 2;
  const centre: [number, number, number] =
    opts.axis === 'x' ? [opts.at, y, opts.along] : [opts.along, y, opts.at];
  return [
    portal(b.id, centre, opts.width, opts.height, normalA),
    portal(a.id, centre, opts.width, opts.height, [-normalA[0], 0, -normalA[2]]),
  ];
}

/** The level-1 walkway across the passage's north end, on its own solid mass. */
function buildCrossing(): THREE.Group {
  const g = new THREE.Group();
  const cx = (crossing.x0 + crossing.x1) / 2;
  const cz = (crossing.z0 + crossing.z1) / 2;
  const w = crossing.x1 - crossing.x0;
  const d = crossing.z1 - crossing.z0;
  // The mass the passage runs under.
  put(g, boxGeo(w, 7, d), 'wall.ochre-light', [cx, 3.5, cz]);
  put(g, plate({ width: w, depth: d, nx: 6, nz: 3, y: crossing.floor, light: () => 0.72 }), 'floor.marble-checker', [cx, crossing.floor, cz]);
  sideWall(g, crossing, { side: 'n', baseY: crossing.floor, height: 6.5, material: 'wall.ochre-light' });
  sideWall(g, crossing, { side: 's', baseY: crossing.floor, height: 6.5, material: 'wall.ochre-light' });
  put(g, boxGeo(w, 0.4, d), 'ceiling.plaster-white', [cx, crossing.ceil + 0.2, cz]);
  put(g, cornice({ length: d, height: 0.3, projection: 0.16, dentils: false }), 'trim.gilt', [crossing.x0, crossing.ceil - 0.3, cz], Math.PI / 2);
  put(g, doorway({ width: 3.2, height: 4, thickness: WALL_T }), 'trim.gilt', [crossing.x0, crossing.floor, crossing.z0 + 2.5], Math.PI / 2);
  put(g, doorway({ width: 3.2, height: 4, thickness: WALL_T }), 'trim.stone-limestone-warm', [crossing.x1, crossing.floor, crossing.z0 + 1], -Math.PI / 2);
  return g;
}

export const createZone = (ctx: ZoneContext): Zone => {
  const merged = (raw: THREE.Group, name: string): THREE.Group => {
    const { group } = mergeByMaterial(raw);
    group.name = 'richelieu/' + name;
    return group;
  };

  const marlyGroup = merged(buildMarly(ctx.rng('cour-marly')), 'cour-marly');
  const pugetGroup = merged(buildPuget(ctx.rng('cour-puget')), 'cour-puget');
  const khorGroup = merged(buildKhorsabad(ctx.rng('cour-khorsabad')), 'cour-khorsabad');
  const hammuGroup = merged(buildHammurabi(ctx.rng('salle-hammurabi')), 'salle-hammurabi');
  const passageGroup = merged(buildPassage(ctx.rng('passage')), 'passage-richelieu');
  const escGroup = merged(buildEscalier(ctx.rng('escalier')), 'escalier-richelieu');
  const crossingGroup = merged(buildCrossing(), 'richelieu-crossing');
  const rawSalon = buildSalon(ctx.rng('salon'));
  // The salon is lit by its own chandeliers, not by the scene's daylight rig, and a metal-only gold
  // has nothing to reflect in a scene with no environment map. One emissive-lifted gilt for this
  // room reads as candle-lit bronze; it merges into its own bucket, so it still costs one draw call.
  const candleGilt = mat('trim.gilt', { metalness: 0.62, roughness: 0.4, emissive: 0.55 });
  rawSalon.traverse((o) => {
    if (o instanceof THREE.Mesh && !(o instanceof THREE.InstancedMesh) && (o.material as THREE.Material).name === 'trim.gilt') {
      o.material = candleGilt;
    }
  });
  const salonGroup = merged(rawSalon, 'napoleon-iii-grand-salon');
  // Chandelier light, baked: warm, rising with height the way two crystal fixtures would, and
  // brighter along the centre line between them. No realtime lights are added for this room.
  bakeShade(salonGroup, (x, y, z) => {
    const h = Math.max(0, Math.min(1, (y - salon.floor) / (salon.ceil - salon.floor)));
    const centreLine = 1 - 0.18 * Math.min(1, Math.abs(x + 45) / 15);
    const gain = (0.66 + 0.62 * h) * centreLine;
    return [gain * 1.06, gain, gain * 0.86];
  });

  sculptureBases(marlyGroup, 'cour-marly');
  sculptureBases(pugetGroup, 'cour-puget');
  sculptureBases(khorGroup, 'cour-khorsabad');
  sculptureBases(hammuGroup, 'salle-hammurabi');
  placeArtworks({ marly: marlyGroup, puget: pugetGroup, khorsabad: khorGroup, hammurabi: hammuGroup });

  // ---- level changes, as runs of walkable cells --------------------------------
  const marlySteps = [
    { id: 'cour-marly-step-1', cell: { x0: -76, x1: -74.5, z0: MARLY_STAIR_Z[0], z1: MARLY_STAIR_Z[1], floor: 4 / 3, ceil: 20 } as Cell },
    { id: 'cour-marly-step-2', cell: { x0: -74.5, x1: -73, z0: MARLY_STAIR_Z[0], z1: MARLY_STAIR_Z[1], floor: 2 / 3, ceil: 20 } as Cell },
  ];
  const marlyStairZ = [MARLY_STAIR_Z[0], MARLY_STAIR_Z[1]] as const;

  const pugetDescent = flightUp('cour-puget-descent', PUGE_DESCENT_X[0], PUGE_DESCENT_X[1], PUGE_STAIR_Z[0], PUGE_STAIR_Z[1], pugetTerrace.floor, puget.floor, 6, puget.ceil);
  const pugetAscent = flightUp('cour-puget-ascent', PUGE_ASCENT_X[0], PUGE_ASCENT_X[1], PUGE_STAIR_Z[0], PUGE_STAIR_Z[1], puget.floor, khorsabad.floor, 6, puget.ceil);

  // route.json's escalier footprint (z -141 … -122) overlaps Cour Puget's by 7 m, because the
  // stair is one of the spec's invented rooms. The stair therefore keeps to the northern part of
  // its footprint (z -141 … -129) so the two cells never both claim a point.
  const escSouth = -129;
  const escBase: Cell = { x0: escalier.x0, x1: escalier.x1, z0: escSouth, z1: escSouth - 2.5, floor: escalier.floor, ceil: escalier.ceil };
  const escLanding: Cell = { x0: escalier.x0, x1: escalier.x1, z0: escalier.z0, z1: -139.5, floor: 7, ceil: escalier.ceil };
  const escFlight = flightUp('escalier-richelieu-flight', -8, 2, -131.5, -139.5, escalier.floor, 7, 6, escalier.ceil);

  // --- the room graph -----------------------------------------------------------
  const rooms: RoomDef[] = [];
  const addRoom = (id: string, cell: Cell, portals: RoomPortal[] = []): void => {
    rooms.push({ id, bounds: bounds(cell), portals });
  };

  // Leaf room first: the zone-agnostic collision probes in main.ts read rooms[0], and this is the
  // one room in the wing whose neighbours really are all walls two metres out.
  addRoom('salle-hammurabi', hammurabi, [
    portal('cour-khorsabad', [hammurabi.x0, 2.2, -103], 4.2, 4.4, [-1, 0, 0]),
  ]);

  // Cour Marly, its terrace and the flight between them.
  addRoom('cour-marly-terrace', marlyTerrace, [
    portal('cour-marly', [-76, 3, (marlyStairZ[0] + marlyStairZ[1]) / 2], marlyStairZ[1] - marlyStairZ[0], 3, [1, 0, 0]),
  ]);
  for (const s of marlySteps) {
    const east = s.cell.x1;
    addRoom(s.id, s.cell, [
      portal('cour-marly', [east, s.cell.floor + 1, (marlyStairZ[0] + marlyStairZ[1]) / 2], marlyStairZ[1] - marlyStairZ[0], 3, [1, 0, 0]),
      portal('cour-marly-terrace', [s.cell.x0, s.cell.floor + 1, (marlyStairZ[0] + marlyStairZ[1]) / 2], marlyStairZ[1] - marlyStairZ[0], 3, [-1, 0, 0]),
    ]);
  }
  addRoom('cour-marly', marly, [
    ...MARLY_BAYS.map((z) => portal('passage-richelieu', [marly.x1, 2.3, z], 4.6, 4.6, [1, 0, 0])),
    portal('cour-marly-terrace', [-76, 3, (marlyStairZ[0] + marlyStairZ[1]) / 2], marlyStairZ[1] - marlyStairZ[0], 3, [-1, 0, 0]),
    ...marlySteps.map((s) => portal(s.id, [s.cell.x0, s.cell.floor + 1, (marlyStairZ[0] + marlyStairZ[1]) / 2], marlyStairZ[1] - marlyStairZ[0], 3, [-1, 0, 0])),
  ]);

  // Passage Richelieu: the spine, with five bays into each court.
  addRoom('passage-richelieu', passage, [
    ...MARLY_BAYS.map((z) => portal('cour-marly', [passage.x0, 2.3, z], 4.6, 4.6, [-1, 0, 0])),
    ...PUGET_BAYS.map((z) => portal('cour-puget-terrace', [passage.x1, 2.3, z], 4.6, 4.6, [1, 0, 0])),
    portal('escalier-richelieu', [passage.x1, 2.1, ESCALIER_DOOR_Z], 3.6, 4.2, [1, 0, 0]),
    portal('passage-richelieu-link', [passage.x0 + (passage.x1 - passage.x0) / 2, 2.3, passage.z1], 9.4, 4.6, [0, 0, 1]),
  ]);

  // Cour Puget: the west gallery, the flight down into the court, the court, the flight up to
  // Khorsabad.
  addRoom('cour-puget-terrace', pugetTerrace, [
    ...PUGET_BAYS.map((z) => portal('passage-richelieu', [pugetTerrace.x0, 2.3, z], 4.6, 4.6, [-1, 0, 0])),
    portal(pugetDescent[0]!.id, [pugetTerrace.x1, 1.5, (PUGE_STAIR_Z[0] + PUGE_STAIR_Z[1]) / 2], PUGE_STAIR_Z[1] - PUGE_STAIR_Z[0], 3, [1, 0, 0]),
  ]);
  pugetDescent.forEach((s, i) => {
    const portals: RoomPortal[] = [
      portal('cour-puget-terrace', [s.cell.x0, s.cell.floor + 1.5, (PUGE_STAIR_Z[0] + PUGE_STAIR_Z[1]) / 2], PUGE_STAIR_Z[1] - PUGE_STAIR_Z[0], 3, [-1, 0, 0]),
      portal('cour-puget', [s.cell.x1, s.cell.floor + 1.5, (PUGE_STAIR_Z[0] + PUGE_STAIR_Z[1]) / 2], PUGE_STAIR_Z[1] - PUGE_STAIR_Z[0], 3, [1, 0, 0]),
    ];
    const next = pugetDescent[i + 1];
    if (next) portals.push(portal(next.id, [s.cell.x1, s.cell.floor + 1.5, (PUGE_STAIR_Z[0] + PUGE_STAIR_Z[1]) / 2], PUGE_STAIR_Z[1] - PUGE_STAIR_Z[0], 3, [1, 0, 0]));
    addRoom(s.id, s.cell, portals);
  });
  addRoom('cour-puget', puget, [
    ...pugetDescent.map((s) => portal(s.id, [s.cell.x0, s.cell.floor + 1.5, (PUGE_STAIR_Z[0] + PUGE_STAIR_Z[1]) / 2], PUGE_STAIR_Z[1] - PUGE_STAIR_Z[0], 3, [-1, 0, 0])),
    ...pugetAscent.map((s) => portal(s.id, [s.cell.x1, s.cell.floor + 1.5, (PUGE_STAIR_Z[0] + PUGE_STAIR_Z[1]) / 2], PUGE_STAIR_Z[1] - PUGE_STAIR_Z[0], 3, [1, 0, 0])),
  ]);
  pugetAscent.forEach((s, i) => {
    const portals: RoomPortal[] = [
      portal('cour-puget', [s.cell.x0, s.cell.floor + 1.5, (PUGE_STAIR_Z[0] + PUGE_STAIR_Z[1]) / 2], PUGE_STAIR_Z[1] - PUGE_STAIR_Z[0], 3, [-1, 0, 0]),
    ];
    const next = pugetAscent[i + 1];
    if (next) portals.push(portal(next.id, [s.cell.x1, s.cell.floor + 1.5, (PUGE_STAIR_Z[0] + PUGE_STAIR_Z[1]) / 2], PUGE_STAIR_Z[1] - PUGE_STAIR_Z[0], 3, [1, 0, 0]));
    else portals.push(portal('cour-khorsabad', [s.cell.x1, 0.5, (PUGE_STAIR_Z[0] + PUGE_STAIR_Z[1]) / 2], PUGE_STAIR_Z[1] - PUGE_STAIR_Z[0], 3, [1, 0, 0]));
    addRoom(s.id, s.cell, portals);
  });

  addRoom('cour-khorsabad', khorsabad, [
    portal('salle-hammurabi', [khorsabad.x1, 2.2, -103], 4.2, 4.4, [1, 0, 0]),
    portal(pugetAscent[pugetAscent.length - 1]!.id, [khorsabad.x0, 0.5, (PUGE_STAIR_Z[0] + PUGE_STAIR_Z[1]) / 2], PUGE_STAIR_Z[1] - PUGE_STAIR_Z[0], 3, [-1, 0, 0]),
  ]);

  // The stair: base landing, eight walkable bands up the flight, top landing, crossing.
  addRoom('escalier-richelieu', escBase, [
    portal('passage-richelieu', [escalier.x0, 2.1, ESCALIER_DOOR_Z], 3.6, 4.2, [-1, 0, 0]),
    portal(escFlight[0]!.id, [-3, 1.8, -131.5], 10, 4, [0, 0, -1]),
  ]);
  escFlight.forEach((s, i) => {
    const portals: RoomPortal[] = [];
    const prev = i === 0 ? null : escFlight[i - 1]!;
    if (prev) portals.push(portal(prev.id, [-3, s.cell.floor + 1, s.cell.z0], 10, 3, [0, 0, 1]));
    const next = escFlight[i + 1];
    if (next) portals.push(portal(next.id, [-3, s.cell.floor + 1, s.cell.z1], 10, 3, [0, 0, -1]));
    else portals.push(portal('escalier-richelieu-landing', [-3, 8, s.cell.z1], 10, 3.5, [0, 0, -1]));
    addRoom(s.id, s.cell, portals);
  });
  addRoom('escalier-richelieu-landing', escLanding, [
    portal(escFlight[escFlight.length - 1]!.id, [-3, 8, -139.5], 10, 3.5, [0, 0, 1]),
    portal('richelieu-crossing', [escalier.x0, 8.5, -140], 3.2, 4, [-1, 0, 0]),
  ]);

  addRoom('richelieu-crossing', crossing, [
    portal('escalier-richelieu-landing', [crossing.x1, 8.5, -140], 3.2, 4, [1, 0, 0]),
    portal('napoleon-iii-grand-salon', [crossing.x0, 8.5, -138.5], 3.2, 4, [-1, 0, 0]),
  ]);

  addRoom('napoleon-iii-grand-salon', salon, [
    portal('richelieu-crossing', [salon.x1, 8.5, -138.5], 3.2, 4, [1, 0, 0]),
  ]);

  void doorBetween;
  void escBase;

  // ---- spawn points: the tour order, west to east to level 1 -------------------
  const spawnPoints: SpawnPoint[] = [
    { id: 'passage-richelieu-south', position: [-23, 1.65, -74], lookAt: [-23, 3.0, -120], label: 'Passage Richelieu, from the Pyramid end' },
    { id: 'passage-richelieu-marly-bay', position: [-23, 1.65, -108.5], lookAt: [-79, 8.5, -108.5], label: 'Through the arcade into Cour Marly' },
    { id: 'cour-marly-floor', position: [-50, 1.65, -108.5], lookAt: [-79, 7.5, -108.5], label: 'Cour Marly: the horses under the glass roof' },
    { id: 'cour-marly-terrace', position: [-72.6, 3.65, -117], lookAt: [-80, 4.6, -108], label: 'Marly terrace, beside the horses' },
    { id: 'cour-puget-gallery', position: [-14, 1.65, -100], lookAt: [2, -3.2, -108.5], label: 'Cour Puget from its west gallery' },
    { id: 'cour-puget-floor', position: [6, -2.85, -102], lookAt: [-4, -1.2, -108.5], label: 'Cour Puget: Milo of Croton' },
    { id: 'cour-khorsabad-lamassu', position: [45, 1.65, -108.5], lookAt: [35.4, 2.4, -114.7], label: 'Cour Khorsabad: the lamassu guard the doorway' },
    { id: 'cour-khorsabad-east', position: [58, 1.65, -103], lookAt: [66, 2.2, -103], label: 'Cour Khorsabad, toward the Hammurabi room' },
    { id: 'salle-hammurabi-stele', position: [72.5, 1.65, -103], lookAt: [79.5, 1.5, -103], label: 'The Code of Hammurabi' },
    { id: 'escalier-richelieu', position: [-3, 2.65, -130.1], lookAt: [-3, 6.5, -139], label: 'Escalier Richelieu, from the foot' },
    { id: 'escalier-richelieu-top', position: [-3, 8.65, -140.2], lookAt: [-3, 3.2, -132], label: 'Escalier Richelieu, from the level-1 landing' },
    { id: 'napoleon-iii-grand-salon-entrance', position: [-32.2, 8.65, -138.5], lookAt: [-52, 10.4, -131], label: 'Grand Salon, from its entrance' },
    { id: 'napoleon-iii-grand-salon-centre', position: [-45, 8.65, -133], lookAt: [-40, 12.2, -122], label: 'Grand Salon, under the chandeliers' },
  ];

  const group = new THREE.Group();
  group.name = 'zone:richelieu';
  for (const g of [passageGroup, marlyGroup, pugetGroup, khorGroup, hammuGroup, escGroup, crossingGroup, salonGroup]) group.add(g);

  /**
   * Which cell or cells each merged group serves. A wing with four floor levels and flights between
   * them has several cells per group (the stair bands, the court terraces), and `RoomCuller.apply`
   * assigns `visible` once per map entry, so two ids pointing at one object overwrite each other:
   * the last one mapped wins and the geometry vanishes while you stand on a step whose sibling cell
   * is inactive. The map therefore holds one inert object per room id, and the real groups follow
   * the active-cell set below — a group is drawn when any of its cells is the camera's room or
   * within two portal hops of it.
   */
  const cellGroups: Array<{ group: THREE.Object3D; cells: string[] }> = [
    { group: passageGroup, cells: ['passage-richelieu'] },
    { group: marlyGroup, cells: ['cour-marly', 'cour-marly-terrace', 'cour-marly-step-1', 'cour-marly-step-2'] },
    { group: pugetGroup, cells: ['cour-puget', 'cour-puget-terrace', ...pugetDescent.map((s) => s.id), ...pugetAscent.map((s) => s.id)] },
    { group: khorGroup, cells: ['cour-khorsabad'] },
    { group: hammuGroup, cells: ['salle-hammurabi'] },
    { group: escGroup, cells: ['escalier-richelieu', 'escalier-richelieu-landing', ...escFlight.map((s) => s.id)] },
    { group: crossingGroup, cells: ['richelieu-crossing'] },
    { group: salonGroup, cells: ['napoleon-iii-grand-salon'] },
  ];
  const roomGroups = new Map<string, THREE.Object3D>();
  for (const room of rooms) roomGroups.set(room.id, new THREE.Object3D());

  const triangleTable: Record<string, number> = {};
  for (const { group: g, cells } of cellGroups) {
    let tris = 0;
    g.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const geo = o.geometry;
        const count = geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;
        tris += o instanceof THREE.InstancedMesh ? count * o.count : count;
      }
    });
    triangleTable[cells[0] as string] = Math.round(tris);
  }
  const total = Object.entries(triangleTable)
    .filter(([id]) => ['passage-richelieu', 'cour-marly', 'cour-puget', 'cour-khorsabad', 'salle-hammurabi', 'escalier-richelieu', 'napoleon-iii-grand-salon', 'richelieu-crossing'].includes(id))
    .reduce((n, [, v]) => n + v, 0);
  group.userData.triangles = { perRoom: triangleTable, total };
  console.info('[richelieu] triangles: ' + JSON.stringify(triangleTable) + ' total=' + total);

  return {
    id: 'richelieu',
    rooms,
    group,
    roomGroups,
    spawnPoints,
    update(): void {
      const active = cullerInfo.active;
      for (const { group: g, cells } of cellGroups) {
        g.visible = active.length === 0 || cells.some((c) => active.includes(c));
      }
    },
    dispose(): void {
      group.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          if (o instanceof THREE.InstancedMesh) o.dispose();
        }
      });
    },
  };
};

export { addPart };
