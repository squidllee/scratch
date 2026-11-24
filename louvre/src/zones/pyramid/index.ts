import * as THREE from 'three';
import { mergeByMaterial } from '../../core/merge';
import type { RoomDef } from '../../core/culling';
import type { SpawnPoint } from '../../core/controls';
import type { Zone, ZoneContext } from '../types';
import { pyramidMaterials } from './materials';
import { assertPaneCounts, buildGlassPyramid, paneReport, PYRAMID } from './pyramid';
import { buildCourtyard, COURT } from './courtyard';
import { buildHall, HALL } from './hall';
import { buildPassages, LINK_STAIR, PASSAGE } from './passages';
import { ARC, buildArc } from './arc';
import { buildInverted } from './inverted';

/**
 * The Glass Pyramid zone: the pyramid itself, the courtyard that frames it, the Arc du Carrousel,
 * the inverted pyramid, and the Hall Napoléon with its two undercroft links.
 *
 * Rooms come from route.json (`pyramid-courtyard` in the spec's taxonomy) plus one vestibule:
 * route.json's Denon passage starts at the hall's south-east corner and the two footprints only
 * touch at a point, so the vestibule is the threshold room the contract asks for in that case.
 */

/** Pane counts, computed once at import time from pure lattice maths. */
export const PANE_COUNTS = paneReport();

export const createZone = (ctx: ZoneContext): Zone => {
  const counts = assertPaneCounts();
  console.info(
    '[pyramid] panes ' + counts.panes + ' = ' + counts.rhombi + ' rhombi + ' + counts.triangles + ' triangles; ' +
      'satellites 3 x (24 + 16); inverted 84 + 28',
  );

  const materials = pyramidMaterials();
  const yard = buildCourtyard(ctx.rng('courtyard'));
  const hall = buildHall();
  const passages = buildPassages();

  // Landmarks: the pyramid and the two buildings that belong to the axis. These are never culled
  // by room, because they are what the zone is.
  const landmarks = new THREE.Group();
  landmarks.name = 'pyramid/landmarks';

  const main = buildGlassPyramid({
    apex: new THREE.Vector3(0, PYRAMID.height, 0),
    half: PYRAMID.base / 2,
    baseY: 0,
    courses: PYRAMID.courses,
    entranceFace: PYRAMID.entranceFace,
    rng: ctx.rng('pyramid/panes'),
  });
  main.group.name = 'pyramid/main';
  landmarks.add(main.group);

  const satelliteHalf = (PYRAMID.satellites.height * PYRAMID.base) / PYRAMID.height / 2;
  for (const [sx, sz] of PYRAMID.satellites.positions) {
    const satellite = buildGlassPyramid({
      apex: new THREE.Vector3(sx, PYRAMID.satellites.height, sz),
      half: satelliteHalf,
      baseY: 0,
      courses: PYRAMID.satellites.courses,
      rng: ctx.rng('pyramid/satellite-' + sx + '-' + sz),
    });
    satellite.group.position.set(0, 0, 0);
    landmarks.add(satellite.group);
  }

  landmarks.add(buildArc());
  landmarks.add(buildInverted(ctx.rng('inverted')));

  // ?pyramiddebug=1 names every mesh that leaves the zone box, before merging hides which is which.
  if (window.location.search.includes('pyramiddebug')) {
    const box = new THREE.Box3(new THREE.Vector3(-236, -9.5, -70.5), new THREE.Vector3(116, 21.7, 70.5));
    for (const [label, root] of [['landmarks', landmarks], ['court', yard.court], ['place', yard.place], ['hall', hall.group], ['denon', passages.denon], ['link', passages.link], ['vestibule', passages.vestibule]] as Array<[string, THREE.Object3D]>) {
      root.updateMatrixWorld(true);
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const meshBox = new THREE.Box3().setFromObject(object);
        if (!box.containsBox(meshBox)) {
          console.info('[pyramid:out-of-box] ' + label + ' ' + (object.name || object.parent?.name || '?') + ' ' +
            'scale=' + object.scale.toArray().map((v) => Math.round(v * 100) / 100).join(',') +
            ' min=' + meshBox.min.toArray().map((v) => Math.round(v * 100) / 100).join(',') +
            ' max=' + meshBox.max.toArray().map((v) => Math.round(v * 100) / 100).join(','));
        }
      });
    }
  }

  const one = (root: THREE.Object3D): THREE.Group => {
    const merged = mergeByMaterial(root).group;
    return merged;
  };

  const court = one(yard.court);
  court.name = 'pyramid/cour-napoleon';
  const place = one(yard.place);
  place.name = 'pyramid/place-du-carrousel';
  const hallGroup = one(hall.group);
  const denonGroup = one(passages.denon);
  const vestibuleGroup = one(passages.vestibule);
  const linkGroup = one(passages.link);
  const landmarkGroup = one(landmarks);
  landmarkGroup.name = 'pyramid/landmarks';

  const group = new THREE.Group();
  group.name = 'zone:pyramid';
  group.add(court, place, hallGroup, denonGroup, vestibuleGroup, linkGroup, landmarkGroup);

  const roomGroups = new Map<string, THREE.Object3D>([
    ['cour-napoleon', court],
    ['place-du-carrousel', place],
    ['hall-napoleon', hallGroup],
    ['passage-denon', denonGroup],
    ['vestibule-denon', vestibuleGroup],
    ['passage-richelieu-link', linkGroup],
  ]);

  // Portal centres sit at the openings actually built. Declared both ways, as the contract asks.
  const entranceX = (PYRAMID.base / 2);
  const rooms: RoomDef[] = [
    {
      id: 'cour-napoleon',
      bounds: { min: [COURT.court.x0, 0, COURT.court.z0], max: [COURT.court.x1, 2.4, COURT.court.z1] },
      portals: [
        {
          to: 'hall-napoleon',
          centre: [entranceX, 3.2, 0],
          width: 7.9,
          height: 6.0,
          normal: [1, 0, 0],
        },
        {
          to: 'place-du-carrousel',
          centre: [COURT.court.x0, 1.2, 0],
          width: 138,
          height: 6,
          normal: [-1, 0, 0],
        },
        {
          to: 'pavillon-horloge',
          centre: [COURT.court.x1, 1.5, 0],
          width: 22,
          height: 7,
          normal: [1, 0, 0],
        },
        {
          to: 'passage-richelieu-link',
          centre: [-23, 0.4, COURT.court.z0],
          width: 13,
          height: 4,
          normal: [0, 0, -1],
        },
      ],
    },
    {
      id: 'place-du-carrousel',
      bounds: { min: [COURT.place.x0, 0, COURT.place.z0], max: [COURT.place.x1, 2.4, COURT.place.z1] },
      portals: [
        {
          to: 'cour-napoleon',
          centre: [COURT.place.x1, 1.2, 0],
          width: 138,
          height: 6,
          normal: [1, 0, 0],
        },
      ],
    },
    {
      id: 'hall-napoleon',
      bounds: { min: [HALL.x0, HALL.floorY, HALL.z0], max: [HALL.x1, HALL.ceilY, HALL.z1] },
      portals: [
        {
          to: 'cour-napoleon',
          centre: [entranceX, 3.2, 0],
          width: 7.9,
          height: 6.0,
          normal: [1, 0, 0],
        },
        {
          to: 'vestibule-denon',
          centre: [HALL.southOpening.x, HALL.floorY + 2.2, HALL.z1],
          width: HALL.southOpening.width,
          height: HALL.southOpening.head,
          normal: [0, 0, 1],
        },
        {
          to: 'passage-richelieu-link',
          centre: [HALL.northOpening.x, HALL.floorY + 2.0, HALL.z0],
          width: HALL.northOpening.width,
          height: HALL.northOpening.head,
          normal: [0, 0, -1],
        },
      ],
    },
    {
      id: 'vestibule-denon',
      bounds: {
        min: [PASSAGE.vestibule.x0, PASSAGE.vestibule.floorY, PASSAGE.vestibule.z0],
        max: [PASSAGE.vestibule.x1, PASSAGE.vestibule.ceilY, PASSAGE.vestibule.z1],
      },
      portals: [
        {
          to: 'hall-napoleon',
          centre: [HALL.southOpening.x, PASSAGE.vestibule.floorY + 2.2, PASSAGE.vestibule.z0],
          width: HALL.southOpening.width,
          height: HALL.southOpening.head,
          normal: [0, 0, -1],
        },
        {
          to: 'passage-denon',
          centre: [PASSAGE.vestibule.x1, PASSAGE.vestibule.floorY + 2.0, 25.5],
          width: 8.6,
          height: 4.0,
          normal: [1, 0, 0],
        },
      ],
    },
    {
      id: 'passage-denon',
      bounds: {
        min: [PASSAGE.denon.x0, PASSAGE.denon.floorY, PASSAGE.denon.z0],
        max: [PASSAGE.denon.x1, PASSAGE.denon.ceilY, PASSAGE.denon.z1],
      },
      portals: [
        {
          to: 'vestibule-denon',
          centre: [PASSAGE.denon.x0, PASSAGE.denon.floorY + 2.0, 25.5],
          width: 8.6,
          height: 4.0,
          normal: [-1, 0, 0],
        },
        {
          to: 'escalier-daru',
          centre: [46, PASSAGE.denon.floorY + 2.0, PASSAGE.denon.z1],
          width: 8.2,
          height: 4.0,
          normal: [0, 0, 1],
        },
      ],
    },
    {
      id: 'passage-richelieu-link',
      bounds: {
        min: [PASSAGE.link.x0, PASSAGE.link.floorY, PASSAGE.link.z0],
        max: [PASSAGE.link.x1, PASSAGE.link.ceilY, PASSAGE.link.z1],
      },
      // The link is 52 treads up to courtyard level; the walker reads this instead of the bounds.
      floorAt(x: number, z: number): number {
        const t = Math.max(0, Math.min(1, (LINK_STAIR.start - z) / (LINK_STAIR.start - LINK_STAIR.end)));
        void x;
        return PASSAGE.link.floorY + t * 9;
      },
      portals: [
        {
          to: 'hall-napoleon',
          centre: [HALL.northOpening.x, PASSAGE.link.floorY + 2.0, PASSAGE.link.z1],
          width: HALL.northOpening.width,
          height: HALL.northOpening.head,
          normal: [0, 0, 1],
        },
        {
          to: 'cour-napoleon',
          centre: [-23, 0.4, PASSAGE.link.z0],
          width: 13,
          height: 4,
          normal: [0, 0, -1],
        },
        {
          to: 'passage-richelieu',
          centre: [-23, 0.4, PASSAGE.link.z0],
          width: 13,
          height: 4,
          normal: [0, 0, -1],
        },
      ],
    },
  ];

  /**
   * The tour, west to east: the Arc on arrival from the Tuileries, the Court Napoléon, the inside of
   * the pyramid, then out through the east side and round to the south front.
   */
  const spawnPoints: SpawnPoint[] = [
    {
      id: 'arc-du-carrousel',
      position: [-197, 1.65, 1.2],
      lookAt: [ARC.position.x, 13, 0],
      label: 'Arc du Carrousel, on the axis',
    },
    {
      id: 'place-du-carrousel',
      position: [-132, 1.65, 5],
      lookAt: [-8, 12, 0],
      label: 'Place du Carrousel, the pyramid ahead',
    },
    {
      id: 'cour-napoleon-west',
      position: [-56, 1.65, 0],
      lookAt: [0, 7.5, 0],
      label: 'Cour Napoléon, on the axis',
    },
    {
      id: 'pyramid-inside',
      position: [6, 1.65, 6],
      lookAt: [-13, 8.5, -13],
      label: 'Inside the pyramid, looking up the lattice',
    },
    {
      id: 'cour-napoleon-east',
      position: [54, 1.65, -8],
      lookAt: [0, 7, 0],
      label: 'East side, the satellite pyramid and pool',
    },
    {
      id: 'cour-napoleon-south',
      position: [17, 1.65, 43],
      lookAt: [0, 8.5, 0],
      label: 'South front, under the wings',
    },
  ];

  const zone: Zone = {
    id: 'pyramid',
    // An open courtyard, so it wants sky and a little aerial haze rather than the interior default.
    // The engine applies this only while one of this zone's rooms is the camera's cell.
    atmosphere: {
      background: 'context.sky-day',
      fog: { color: 'context.sky-day', density: 0.0016 },
    },
    rooms,
    group,
    roomGroups,
    spawnPoints,
    dispose(): void {
      group.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
      materials.dispose();
      yard.dispose();
    },
  };

  // Debug handle for numeric verification (add ?pyramiddebug=1): the capture harness proves a frame
  // is not blank, this lets a probe ask which part of the zone put which pixels on screen.
  if (window.location.search.includes('pyramiddebug')) {
    (window as unknown as Record<string, unknown>).__zonePyramid = { zone, counts: PANE_COUNTS };
  }
  return zone;
};
