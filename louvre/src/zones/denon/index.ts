import * as THREE from 'three';
import { mergeByMaterial } from '../../core/merge';
import type { RoomDef, RoomPortal } from '../../core/culling';
import type { SpawnPoint } from '../../core/controls';
import type { Zone, ZoneContext } from '../types';
import { BOX, PORTALS } from './layout';
import { buildEscalierDaru, buildGalerieMichelAnge, stairHeightAt } from './stair';
import {
  buildSalleDaru,
  buildSalleDenon,
  buildSalleMollien,
  buildSalleDesEtats,
  buildSessions,
  buildSalonCarre,
} from './level1';
import { buildGrandeGalerie, type GalleryCell } from './spine';
import type { RoomPart } from './shell';

/**
 * Denon wing interiors — nine rooms of the measured route:
 *
 *   escalier-daru, galerie-michel-ange, salle-daru, salle-denon, salle-mollien, salle-des-etats,
 *   galerie-des-sessions, grande-galerie, salon-carre
 *
 * Everything is built from the shared builders out of `core/` with the palette from `core/`, merged
 * one material per room (or per gallery cell) so a whole room is a handful of draw calls.
 */

const EYE = 1.65;
/** How far down the Grande Galerie stays drawn from the camera. */
const GG_DRAW_AHEAD = 118;

/** Turn a portal link from the layout table into a RoomDef portal on this side of the wall. */
function portalFor(roomId: string, index: number): RoomPortal | null {
  const links = PORTALS[roomId] ?? [];
  const link = links[index];
  if (!link) return null;
  const b = BOX[roomId];
  if (!b) return null;
  const h = link.hole;
  const cy = link.floorY + h.head / 2;
  if (link.axis === 'x') {
    const x = link.normal[0] > 0 ? b.x1 : b.x0;
    return { to: link.to, centre: [x, cy, h.at], width: h.width, height: h.head, normal: link.normal };
  }
  const z = link.normal[2] > 0 ? b.z1 : b.z0;
  return { to: link.to, centre: [h.at, cy, z], width: h.width, height: h.head, normal: link.normal };
}

function roomsOf(ids: string[]): RoomDef[] {
  return ids.map((id) => {
    const b = BOX[id] as (typeof BOX)[string];
    const links = PORTALS[id] ?? [];
    const portals = links.map((_, i) => portalFor(id, i)).filter((p): p is RoomPortal => p !== null);
    return {
      id,
      bounds: {
        min: [b.x0, b.y0, b.z0] as [number, number, number],
        max: [b.x1, b.y0 + b.h, b.z1] as [number, number, number],
      },
      portals,
    };
  });
}

const ROOM_IDS = [
  'escalier-daru',
  'galerie-michel-ange',
  'salle-daru',
  'salle-denon',
  'salle-mollien',
  'salle-des-etats',
  'galerie-des-sessions',
  'grande-galerie',
  'salon-carre',
];

export const createZone = (ctx: ZoneContext): Zone => {
  const parts: Record<string, RoomPart> = {
    'escalier-daru': buildEscalierDaru(),
    'galerie-michel-ange': buildGalerieMichelAnge(),
    'salle-daru': buildSalleDaru(),
    'salle-denon': buildSalleDenon(),
    'salle-mollien': buildSalleMollien(),
    'salle-des-etats': buildSalleDesEtats(),
    'galerie-des-sessions': buildSessions(),
    'salon-carre': buildSalonCarre(),
  };

  const gallery = buildGrandeGalerie(ctx);
  parts['grande-galerie'] = gallery.part;

  const group = new THREE.Group();
  group.name = 'zone:denon';
  const roomGroups = new Map<string, THREE.Object3D>();
  const cells: GalleryCell[] = [];

  for (const id of ROOM_IDS) {
    const part = parts[id] as RoomPart;
    const room = new THREE.Group();
    room.name = 'denon/room-' + id;
    const merged = part.raw.map((raw) => mergeByMaterial(raw).group);
    for (const m of merged) room.add(m);
    part.dress?.(merged);
    if (id === 'grande-galerie') {
      merged.forEach((m, i) => cells.push({ group: m, x0: gallery.cells[i]?.x0 ?? 0, x1: gallery.cells[i]?.x1 ?? 0 }));
    }
    group.add(room);
    roomGroups.set(id, room);
  }

  const rooms = roomsOf(ROOM_IDS);

  const spawnPoints: SpawnPoint[] = [
    {
      id: 'escalier-daru-base',
      position: [72, EYE, 76],
      lookAt: [72, 10.2, 92],
      label: 'Foot of the Daru staircase, looking up at the Victory',
    },
    {
      id: 'galerie-michel-ange',
      position: [46.5, EYE, 91],
      lookAt: [45, 2.4, 74],
      label: 'Michelangelo gallery, the two Slaves on the north wall',
    },
    {
      id: 'escalier-daru-landing',
      position: [66.4, 7 + EYE, 94.4],
      lookAt: [72.2, 9.4, 91.2],
      label: 'The landing, beside the Winged Victory',
    },
    {
      id: 'salle-daru',
      position: [36.5, 7 + EYE, 78.5],
      lookAt: [47, 11.3, 92],
      label: 'Salle Daru, the Coronation on the long wall',
    },
    {
      id: 'salle-denon',
      position: [29.5, 7 + EYE, 86],
      lookAt: [4, 9.6, 80],
      label: 'Salle Denon, the pass-through between the two Davids',
    },
    {
      id: 'salle-mollien',
      position: [-2, 7 + EYE, 84],
      lookAt: [-27.9, 10.6, 86],
      label: 'Salle Mollien, the Raft of the Medusa',
    },
    {
      id: 'salle-des-etats',
      position: [-30.5, 7 + EYE, 82.9],
      lookAt: [-60.9, 8.75, 82.9],
      label: 'Salle des Etats, the axis to the Mona Lisa',
    },
    {
      id: 'galerie-des-sessions',
      position: [-58, 7 + EYE, 100],
      lookAt: [-58, 7.6, 140],
      label: 'Sessions gallery, the plain link to the Grande Galerie',
    },
    {
      id: 'grande-galerie-west',
      position: [-166, 7 + EYE, 147.5],
      lookAt: [40, 9.6, 147.5],
      label: 'Grande Galerie, west end, looking east',
    },
    {
      id: 'grande-galerie-east',
      position: [91, 7 + EYE, 147.5],
      lookAt: [-60, 9.6, 147.5],
      label: 'Grande Galerie, east end, looking west',
    },
    {
      id: 'salon-carre',
      position: [112.5, 7 + EYE, 147.5],
      lookAt: [94, 9.2, 147.5],
      label: 'Salon Carre, looking back west into the gallery',
    },
  ];

  return {
    id: 'denon',
    rooms,
    group,
    roomGroups,
    spawnPoints,
    update(_dt: number, camera: THREE.Camera): void {
      // 268 m of gallery: draw only the stretch the camera can actually be looking at.
      const x = camera.position.x;
      for (const cell of cells) {
        cell.group.visible = x > cell.x0 - GG_DRAW_AHEAD && x < cell.x1 + GG_DRAW_AHEAD;
      }
      // Walking up the Daru staircase: the engine's floor lookup is per room, so the stair is
      // carried here instead of pretending each tread is a room.
      const py = camera.position.y;
      const stair = stairHeightAt(camera.position.x, camera.position.z);
      if (stair !== null) {
        const target = stair + EYE;
        if (py < target + 1.6) camera.position.y = target;
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
