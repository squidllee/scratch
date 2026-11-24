import * as THREE from 'three';
import { placeArtwork } from '../../artworks/library';
import type { RoomDef } from '../../core/culling';
import { mat, type MaterialSpec } from '../../core/materials';
import { mergeByMaterial } from '../../core/merge';
import type { SpawnPoint } from '../../core/controls';
import type { Rng } from '../../core/rng';
import type { Zone, ZoneContext } from '../types';
import { buildGalerieApollon, buildRotondeApollon, buildRotondeDeMars } from './apollon';
import { buildSphinxCrypt, buildSalleGrec, buildVenusRoom } from './antiquities';
import { buildCourCarree, buildPerrault } from './court';
import { buildDutchRooms, buildLevel2Corridor } from './level2';
import { ARTWORKS, FLOORS, ROOMS, SPAWNS, portalsFor, type SullyRoomId } from './layout';
import { buildCaryatides, buildEscalierHenriII, buildPavillon } from './wing';

/**
 * The Sully wing interiors: twelve rooms from `route.json` plus one threshold room
 * (`rotonde-de-mars`) that route.json leaves unassigned and that the walk needs to reach the
 * Galerie d'Apollon's level from the Lescot corner.
 *
 * Each room is built into its own group, merged to one mesh per palette material, and kept in
 * `roomGroups` so the engine's portal culler can hide it. Artworks are placed after the merge, so
 * their `userData.artworkId` survives for the verify pass.
 */

type RoomBuilder = (g: THREE.Group, rng: Rng) => void;

const BUILDERS: Record<SullyRoomId, RoomBuilder> = {
  'salle-perrault': (g) => buildPerrault(g),
  'galerie-apollon': (g, r) => buildGalerieApollon(g, r),
  'rotonde-apollon': (g) => buildRotondeApollon(g),
  'pavillon-horloge': (g) => buildPavillon(g),
  'escalier-henri-ii': (g) => buildEscalierHenriII(g),
  'salle-des-caryatides': (g) => buildCaryatides(g),
  'rotonde-de-mars': (g) => buildRotondeDeMars(g),
  'salle-grec-346': (g) => buildSalleGrec(g),
  'salle-venus-milo': (g) => buildVenusRoom(g),
  'sphinx-crypt': (g) => buildSphinxCrypt(g),
  'cour-carree': (g) => buildCourCarree(g),
  'sully-l2-corridor': (g) => buildLevel2Corridor(g),
  'dutch-rooms': (g) => buildDutchRooms(g),
};

const ROOM_IDS = Object.keys(ROOMS) as SullyRoomId[];

/**
 * This engine has no environment map, so a MeshStandardMaterial at the palette's gold values
 * (metalness 0.9) renders almost black — the gilded Galerie d'Apollon would read as a coal cellar.
 * The palette is core and not this zone's to change, so the gilding is retuned here, once, to a
 * partly-diffuse metal with a little self-illumination: leaf gold under bounce light. Integration
 * can lift this into core when more than one zone needs gold.
 */
const METAL_FIX: Record<string, Partial<MaterialSpec>> = {
  'ceiling.gold-leaf': { metalness: 0.28, roughness: 0.5, emissive: 0.55 },
  'gold.leaf': { metalness: 0.3, roughness: 0.45, emissive: 0.5 },
  'trim.gilt': { metalness: 0.32, roughness: 0.45, emissive: 0.36 },
  'gold.bronze-tarnished': { metalness: 0.35, roughness: 0.55, emissive: 0.2 },
  'wood.gilt-frame': { metalness: 0.3, roughness: 0.5, emissive: 0.3 },
};

function tuneGilding(group: THREE.Group): void {
  group.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || Array.isArray(o.material)) return;
    const fix = METAL_FIX[o.material.name];
    if (fix) o.material = mat(o.material.name, fix);
  });
}

export const createZone = (ctx: ZoneContext): Zone => {
  const root = new THREE.Group();
  root.name = 'sully';
  const roomGroups = new Map<string, THREE.Object3D>();

  for (const id of ROOM_IDS) {
    const raw = new THREE.Group();
    raw.name = id;
    BUILDERS[id](raw, ctx.rng('room/' + id));
    tuneGilding(raw);
    const merged = mergeByMaterial(raw).group;
    merged.name = id;

    // Artworks go on top of the merge: they are factories' geometry, never merged by the zone.
    for (const spec of ARTWORKS) {
      if (spec.room !== id) continue;
      const obj = placeArtwork(merged, spec);
      // A ceiling painting is built like a wall painting; the library leaves the quarter-turn that
      // lays it face down to the zone, and rotationY alone cannot express it.
      if (spec.wall === 'ceiling') {
        obj.rotation.order = 'YXZ';
        obj.rotation.x = Math.PI / 2;
      }
    }

    roomGroups.set(id, merged);
    root.add(merged);
  }

  const rooms: RoomDef[] = ROOM_IDS.map((id) => {
    const b = ROOMS[id];
    return {
      id,
      bounds: {
        min: [b.x[0], b.y0, b.z[0]],
        max: [b.x[1], b.y1, b.z[1]],
      },
      portals: portalsFor(id),
      ...(FLOORS[id] ? { floorAt: FLOORS[id] } : {}),
    };
  });

  const spawnPoints: SpawnPoint[] = SPAWNS.map((s) => ({
    id: s.id,
    position: s.position,
    lookAt: s.lookAt,
    label: s.label,
  }));

  return {
    id: 'sully',
    rooms,
    group: root,
    roomGroups,
    spawnPoints,
    dispose(): void {
      root.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          if (o instanceof THREE.InstancedMesh) o.dispose();
        }
      });
    },
  };
};
