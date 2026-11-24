import * as THREE from 'three';
import { boxGeo } from '../../core/geom';
import { addPart, mergeByMaterial } from '../../core/merge';
import { mat } from '../../core/materials';
import { cornice, doorway } from '../../core/builders';
import type { RoomDef, RoomPortal } from '../../core/culling';
import type { SpawnPoint } from '../../core/controls';
import type { Zone, ZoneContext } from '../types';
import {
  escalier,
  hammurabi,
  khorsabad,
  marly,
  marlyTerrace,
  MARLY_BAYS,
  passage,
  ESCALIER_DOOR_X,
  ESCALIER_FOOT_Z,
  ESCALIER_HEAD_Z,
  SALON_DOOR_Z,
  puget,
  pugetTerrace,
  PUGET_BAYS,
  PUGE_ASCENT_X,
  PUGE_DESCENT_X,
  salon,
  WALL_T,
  ZONE_BOX,
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
 * the Richelieu stair, the Napoleon III Grand Salon) plus the level-1 crossing that links the head
 * of the stair to the salon. Each room is merged per material into its own group, so the culler can
 * hide it on its own.
 *
 * The wing sits at four levels (0, −4.5, 1 and 7). Each level change is a `floorAt` ramp on the
 * room it happens in — the walker reads that every frame and climbs with it, so the flights are not
 * a chain of thin cells and the camera never jumps a step.
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

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * clamp01(t);

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

  const rawSalon = buildSalon(ctx.rng('salon'));
  // The salon is lit by its own chandeliers rather than by the scene's daylight rig, and a fully
  // metallic gold has no environment map to reflect here, so it renders near-black. One
  // emissive-lifted gilt for this room reads as candle-lit bronze; it merges into its own bucket.
  const candleGilt = mat('trim.gilt', { metalness: 0.62, roughness: 0.4, emissive: 0.55 });
  rawSalon.traverse((o) => {
    if (o instanceof THREE.Mesh && !(o instanceof THREE.InstancedMesh) && (o.material as THREE.Material).name === 'trim.gilt') {
      o.material = candleGilt;
    }
  });
  const salonGroup = merged(rawSalon, 'napoleon-iii-grand-salon');
  bakeShade(salonGroup, (x, y) => {
    const h = clamp01((y - salon.floor) / (salon.ceil - salon.floor));
    const centreLine = 1 - 0.18 * Math.min(1, Math.abs(x + 45) / 15);
    const gain = (0.66 + 0.62 * h) * centreLine;
    return [gain * 1.06, gain, gain * 0.86];
  });

  sculptureBases(marlyGroup, 'cour-marly');
  sculptureBases(pugetGroup, 'cour-puget');
  sculptureBases(khorGroup, 'cour-khorsabad');
  sculptureBases(hammuGroup, 'salle-hammurabi');
  placeArtworks({ marly: marlyGroup, puget: pugetGroup, khorsabad: khorGroup, hammurabi: hammuGroup });

  // ---- the room graph ----------------------------------------------------------
  const marlyStairX = marlyTerrace.x1;
  const marlyStairRun = 4;
  const marlyTerraceHeight = marlyTerrace.floor;

  const rooms: RoomDef[] = [
    // Leaf room first: the zone-agnostic collision probes in main.ts read rooms[0], and this is the
    // one room in the wing whose neighbours two metres out really are walls.
    {
      id: 'salle-hammurabi',
      bounds: bounds(hammurabi),
      portals: [portal('cour-khorsabad', [hammurabi.x0, 2.2, -103], 4.2, 4.4, [-1, 0, 0])],
    },
    {
      id: 'cour-marly',
      bounds: bounds(marly),
      // Raised terrace at the west end, reached by a broad flight: a straight ramp in x.
      floorAt: (x) =>
        x <= marlyStairX ? marlyTerraceHeight : lerp(marlyTerraceHeight, marly.floor, (x - marlyStairX) / marlyStairRun),
      portals: [
        ...MARLY_BAYS.map((z) => portal('passage-richelieu', [marly.x1, 2.3, z], 4.6, 4.6, [1, 0, 0])),
      ],
    },
    {
      id: 'passage-richelieu',
      bounds: bounds(passage),
      portals: [
        ...MARLY_BAYS.map((z) => portal('cour-marly', [passage.x0, 2.3, z], 4.6, 4.6, [-1, 0, 0])),
        ...PUGET_BAYS.map((z) => portal('cour-puget', [passage.x1, 2.3, z], 4.6, 4.6, [1, 0, 0])),
        portal('escalier-richelieu', [ESCALIER_DOOR_X, 2.1, passage.z0], 3.6, 4.2, [0, 0, -1]),
        portal('passage-richelieu-link', [passage.x0 + (passage.x1 - passage.x0) / 2, 2.3, passage.z1], 9.4, 4.6, [0, 0, 1]),
      ],
    },
    {
      id: 'cour-puget',
      bounds: bounds(puget),
      // West gallery at passage level, the court 4.5 m below, the flight up to Khorsabad at the east.
      floorAt: (x) => {
        if (x <= PUGE_DESCENT_X[0]) return pugetTerrace.floor;
        if (x < PUGE_DESCENT_X[1]) return lerp(pugetTerrace.floor, puget.floor, (x - PUGE_DESCENT_X[0]) / (PUGE_DESCENT_X[1] - PUGE_DESCENT_X[0]));
        if (x <= PUGE_ASCENT_X[0]) return puget.floor;
        return lerp(puget.floor, khorsabad.floor, (x - PUGE_ASCENT_X[0]) / (PUGE_ASCENT_X[1] - PUGE_ASCENT_X[0]));
      },
      portals: [
        ...PUGET_BAYS.map((z) => portal('passage-richelieu', [puget.x0, 2.3, z], 4.6, 4.6, [-1, 0, 0])),
        portal('cour-khorsabad', [puget.x1, 2.4, -108.5], 8, 4.9, [1, 0, 0]),
      ],
    },
    {
      id: 'cour-khorsabad',
      bounds: bounds(khorsabad),
      portals: [
        portal('salle-hammurabi', [khorsabad.x1, 2.2, -103], 4.2, 4.4, [1, 0, 0]),
        portal('cour-puget', [khorsabad.x0, 2.4, -108.5], 8, 4.9, [-1, 0, 0]),
      ],
    },
    {
      id: 'escalier-richelieu',
      // The volume runs from the foot of the flight to the vault; the floor ramps 1 → 7 inside it.
      bounds: { min: [escalier.x0, escalier.floor, escalier.z0], max: [escalier.x1, escalier.ceil, escalier.z1] },
      floorAt: (_x, z) => {
        if (z >= ESCALIER_FOOT_Z) return escalier.floor;
        if (z <= ESCALIER_HEAD_Z) return salon.floor;
        return lerp(escalier.floor, salon.floor, (ESCALIER_FOOT_Z - z) / (ESCALIER_FOOT_Z - ESCALIER_HEAD_Z));
      },
      portals: [
        portal('passage-richelieu', [ESCALIER_DOOR_X, 2.1, escalier.z1], 3.6, 4.2, [0, 0, 1]),
        portal('napoleon-iii-grand-salon', [escalier.x0, 8.5, SALON_DOOR_Z], 3.2, 3.6, [-1, 0, 0]),
      ],
    },
    {
      id: 'napoleon-iii-grand-salon',
      bounds: bounds(salon),
      portals: [portal('escalier-richelieu', [salon.x1, 8.5, SALON_DOOR_Z], 3.2, 3.6, [1, 0, 0])],
    },
  ];

  // ---- spawn points: the tour order, west to east and then up to level 1 -------------
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
    { id: 'escalier-richelieu', position: [-23, 2.65, -123.4], lookAt: [-23, 7.2, -137], label: 'Escalier Richelieu, from the foot' },
    { id: 'escalier-richelieu-top', position: [-23.5, 8.65, -139.6], lookAt: [-27, 3.0, -126], label: 'Escalier Richelieu, from the level-1 landing' },
    { id: 'napoleon-iii-grand-salon-entrance', position: [-31.8, 8.65, -138], lookAt: [-52, 10.6, -131], label: 'Grand Salon, from its entrance' },
    { id: 'napoleon-iii-grand-salon-centre', position: [-45, 8.65, -133], lookAt: [-40, 12.2, -122], label: 'Grand Salon, under the chandeliers' },
  ];

  const group = new THREE.Group();
  group.name = 'zone:richelieu';
  for (const g of [passageGroup, marlyGroup, pugetGroup, khorGroup, hammuGroup, escGroup, salonGroup]) group.add(g);

  const roomGroups = new Map<string, THREE.Object3D>([
    ['passage-richelieu', passageGroup],
    ['cour-marly', marlyGroup],
    ['cour-puget', pugetGroup],
    ['cour-khorsabad', khorGroup],
    ['salle-hammurabi', hammuGroup],
    ['escalier-richelieu', escGroup],
    ['napoleon-iii-grand-salon', salonGroup],
  ]);

  const triangleTable: Record<string, number> = {};
  let total = 0;
  for (const [id, obj] of roomGroups) {
    let tris = 0;
    obj.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const geo = o.geometry;
        const count = geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;
        tris += o instanceof THREE.InstancedMesh ? count * o.count : count;
      }
    });
    triangleTable[id] = Math.round(tris);
    total += tris;
  }
  group.userData.triangles = { perRoom: triangleTable, total: Math.round(total) };

  // Out-of-box audit. A wall is 0.9 m thick and a cornice projects 0.5 m, so 1.6 m of slack in plan
  // and in height is legitimate; anything past that is geometry in the wrong place, and the message
  // names it. (The raw bounds check in --verify uses a 3 m tolerance and cannot name a mesh.)
  const pad = 1.6;
  const box = new THREE.Box3(
    new THREE.Vector3(ZONE_BOX.x[0] - pad, ZONE_BOX.y[0] - pad, ZONE_BOX.z[0] - pad),
    new THREE.Vector3(ZONE_BOX.x[1] + pad, ZONE_BOX.y[1] + pad, ZONE_BOX.z[1] + pad),
  );
  const outside: string[] = [];
  group.updateMatrixWorld(true);
  group.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const b = new THREE.Box3().setFromObject(o);
    if (box.containsBox(b)) return;
    const d = Math.max(
      box.min.x - b.min.x, b.max.x - box.max.x,
      box.min.y - b.min.y, b.max.y - box.max.y,
      box.min.z - b.min.z, b.max.z - box.max.z,
    );
    if (d <= 0.05) return;
    outside.push((o.name || '(unnamed ' + (o.material as THREE.Material).name + ')') + ' by ' + d.toFixed(1) + ' m @ ' + b.min.toArray().map((n) => n.toFixed(1)).join(',') + ' .. ' + b.max.toArray().map((n) => n.toFixed(1)).join(','));
  });
  if (outside.length) console.warn('[richelieu] geometry outside the zone box: ' + outside.join('; '));
  console.info('[richelieu] triangles: ' + JSON.stringify(triangleTable) + ' total=' + Math.round(total));

  return {
    id: 'richelieu',
    rooms,
    group,
    roomGroups,
    spawnPoints,
    // An interior: dim, warm, and quietly hazy so the far end of a 65 m passage falls away.
    atmosphere: { background: 0x0b0a09, fog: { color: 0x0b0a09, density: 0.0013 } },
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
