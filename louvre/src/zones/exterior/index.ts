import * as THREE from 'three';
import { mergeByMaterial } from '../../core/merge';
import { mat } from '../../core/materials';
import type { RoomDef } from '../../core/culling';
import type { SpawnPoint } from '../../core/controls';
import type { Zone, ZoneContext } from '../types';
import { wall } from '../../core/builders';
import { assertPlan, GALERIE, roofRects, RUNS, type RunSpec } from './plan';
import { buildPavilion, buildRun, type PavilionSpec } from './facade';
import { buildColonnade } from './colonnade';
import { buildHorloge, buildLescot } from './ring';
import { chimneyTransforms, mansard, rotunda } from './roof';
import { chimneyUnit, exteriorMaterial, groundQuad, InstanceSink, bakeWorldLight, ROOF_ZINC, shadeUnit } from './parts';
import { CONTEXT, courtTrees, distantCity, ground, skyDome } from './context';

/**
 * The exterior zone: every façade and every roof of the Louvre, plus the sky and the ground the
 * whole museum stands on.
 *
 * This is the only zone that builds above the 20.4 m cornice. It declares no palace rooms — the
 * courts a visitor stands in belong to the pyramid and Sully zones — so nothing here is
 * portal-culled; the zone is a backdrop in three batches (the Cour Napoléon elevations, the outer
 * and street elevations, and the sky and ground) that the renderer frustum-culls per batch.
 *
 * Two walkable pavements are declared as rooms because that ground is this zone's own (the Seine
 * quay and the Rivoli pavement), and each is mapped in `roomGroups` to its own strip so the culler
 * can drop it independently of the building.
 */

/** Pavilions standing proud of the wings: the Cour Napoléon pairs and the two street ends. */
const PAVILIONS: PavilionSpec[] = [
  // Denon: Daru, Denon and Mollien on the Cour Napoléon front.
  { id: 'pavillon-daru', axis: 'x', line: 70.5, out: -1, centre: 72, width: 16.6, project: 1.15, depth: 26, top: 37.5, figures: true, layer: 'courts' },
  { id: 'pavillon-denon', axis: 'x', line: 70.5, out: -1, centre: 17, width: 16.6, project: 1.15, depth: 26, top: 37.5, figures: true, layer: 'courts' },
  { id: 'pavillon-mollien', axis: 'x', line: 70.5, out: -1, centre: -13, width: 16.6, project: 1.15, depth: 26, top: 37.5, figures: true, layer: 'courts' },
  // Richelieu: Colbert, Richelieu and Turgot on the north side of the court.
  { id: 'pavillon-colbert', axis: 'x', line: -70.5, out: 1, centre: 96, width: 16.6, project: 1.15, depth: 18, top: 37.5, figures: true, layer: 'courts' },
  { id: 'pavillon-richelieu', axis: 'x', line: -70.5, out: 1, centre: 16, width: 16.6, project: 1.15, depth: 18, top: 37.5, figures: true, layer: 'courts' },
  { id: 'pavillon-turgot', axis: 'x', line: -70.5, out: 1, centre: -60, width: 16.6, project: 1.15, depth: 18, top: 37.5, figures: true, layer: 'courts' },
  // The river end of the Grande Galerie and the Rivoli front's library pavilion.
  { id: 'pavillon-flore', axis: 'x', line: 154, out: 1, centre: -164, width: 16.6, project: 1.2, depth: 13, top: 38.5, layer: 'outer' },
  { id: 'pavillon-bibliotheque', axis: 'x', line: -141, out: -1, centre: -22, width: 16.6, project: 1.2, depth: 12, top: 36, layer: 'outer' },
];

const ROOF_MATERIAL = ROOF_ZINC;
const CHIMNEY = 'stone.limestone-warm';

function addMesh(parent: THREE.Object3D, geo: THREE.BufferGeometry, material: string): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, exteriorMaterial(material));
  parent.add(mesh);
  return mesh;
}

/** Roofs: a mansard over every range, its chimney stacks, and the Rotonde's dome. */
function buildRoofs(sink: InstanceSink, rng: () => number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'roofs';
  const chimney = chimneyUnit();
  for (const rect of roofRects()) {
    const roof = mansard(rect.x, rect.z);
    addMesh(group, roof.geo, ROOF_MATERIAL);
    // Stacks stand on the plateau, along the longer axis of the range.
    const alongX = rect.x[1] - rect.x[0] > rect.z[1] - rect.z[0];
    for (const m of chimneyTransforms(roof.plateau, 19, alongX, rng)) {
      sink.add('chimney', chimney, CHIMNEY, m);
    }
  }
  // The Rotonde d'Apollon closes the Petite Galerie's south end.
  const rot = rotunda(7.6);
  const rotMesh = addMesh(group, rot, ROOF_MATERIAL);
  rotMesh.position.set(124.5, 0, 147.5);
  return group;
}

/** The two walkable pavements this zone owns: the Seine quay and the Rivoli pavement. */
function pavements(): { rooms: RoomDef[]; quay: THREE.Group; rivoli: THREE.Group } {
  const quay = new THREE.Group();
  quay.name = 'context/quay';
  const midX = (GALERIE.x0 + GALERIE.x1) / 2;
  quay.add(new THREE.Mesh(groundQuad(midX - 200, midX + 200, 156, 176, -0.02), mat('floor.pave-granite')));

  const rivoli = new THREE.Group();
  rivoli.name = 'context/rivoli';
  rivoli.add(new THREE.Mesh(groundQuad(-114, 146, -160, -144, -0.02), mat('floor.pave-granite')));

  const rooms: RoomDef[] = [
    { id: 'quai-seine', bounds: { min: [-172, 0, 156], max: [116, 20.4, 176] }, portals: [] },
    { id: 'esplanade-rivoli', bounds: { min: [-84, 0, -160], max: [116, 20.4, -144] }, portals: [] },
  ];
  return { rooms, quay, rivoli };
}

const SPAWNS: SpawnPoint[] = [
  {
    id: 'cour-napoleon-facade',
    position: [-40, 3.2, 14],
    lookAt: [26, 14, 70.5],
    label: 'Cour Napoléon: the Denon front and its pavilions',
  },
  {
    id: 'pavillon-horloge',
    position: [30, 2.2, 4],
    lookAt: [116, 22, 0],
    label: "Pavillon de l'Horloge on the axis",
  },
  {
    id: 'cour-carree',
    position: [196, 2.0, 14],
    lookAt: [139.75, 14, -6],
    label: "Cour Carrée, Lescot's façade and the clock pavilion",
  },
  {
    id: 'colonnade-elevation',
    position: [356, 12, 8],
    lookAt: [276, 12, 0],
    label: "Perrault's Colonnade, 80 m out",
  },
  {
    id: 'seine-elevation',
    position: [-30, 5, 250],
    lookAt: [-30, 12, 154],
    label: 'The Seine front of the Grande Galerie',
  },
  {
    id: 'rivoli-elevation',
    position: [16, 5, -215],
    lookAt: [16, 10, -141],
    label: 'The rue de Rivoli front',
  },
  {
    id: 'roofline-above',
    position: [40, 60, 20],
    lookAt: [116, 32, 0],
    label: 'From above: the Cour Carrée ring and its four mansards',
  },
];

export const createZone = (ctx: ZoneContext): Zone => {
  assertPlan();
  const rng = ctx.rng('exterior');
  const sink = new InstanceSink();

  const courts = new THREE.Group();
  courts.name = 'exterior/courts';
  const outer = new THREE.Group();
  outer.name = 'exterior/outer';

  for (const run of RUNS) {
    const built = buildRun(run as RunSpec, sink);
    (run.layer === 'courts' ? courts : outer).add(built.group);
  }
  for (const pavilion of PAVILIONS) {
    (pavilion.layer === 'courts' ? courts : outer).add(buildPavilion(pavilion, sink));
  }
  courts.add(buildLescot(sink));
  courts.add(buildHorloge(sink));
  outer.add(buildColonnade(sink));
  outer.add(buildRoofs(sink, rng.fork('roofs')));

  // --- sky, ground, distance -------------------------------------------------
  const context = new THREE.Group();
  context.name = 'exterior/context';
  context.add(ground());
  distantCity(sink, rng.fork('city'));
  courtTrees(sink, rng.fork('trees'));

  // --- merge -----------------------------------------------------------------
  const courtsMerged = mergeByMaterial(courts).group;
  courtsMerged.name = 'exterior/courts:merged';
  const outerMerged = mergeByMaterial(outer).group;
  outerMerged.name = 'exterior/outer:merged';
  const contextMerged = mergeByMaterial(context).group;
  contextMerged.name = 'exterior/context:merged';

  // Baked key light: the building's form has to come from here; there are no realtime shadows.
  bakeWorldLight(courtsMerged);
  bakeWorldLight(outerMerged);

  // Instanced repeats, shaded to sit in the same brightness range as the walls they stand on.
  const details = sink.build();
  details.traverse((o) => {
    if (o instanceof THREE.InstancedMesh) shadeUnit(o.geometry, 0.92);
  });

  const { rooms, quay, rivoli } = pavements();
  const quayMerged = mergeByMaterial(quay).group;
  quayMerged.name = 'exterior/quay';
  const rivoliMerged = mergeByMaterial(rivoli).group;
  rivoliMerged.name = 'exterior/rivoli';

  const sky = skyDome();
  const group = new THREE.Group();
  group.name = 'zone:exterior';
  group.add(courtsMerged, outerMerged, contextMerged, quayMerged, rivoliMerged, details, sky);

  const roomGroups = new Map<string, THREE.Object3D>([
    ['quai-seine', quayMerged],
    ['esplanade-rivoli', rivoliMerged],
  ]);


  // Debug probe (only with ?debug=exterior): lets a headless run raycast the frame and name what
  // it hits, because no agent on this crew can look at the render.
  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'exterior') {
    (window as unknown as Record<string, unknown>).__ext = {
      group,
      lib: { THREE, wall, meshes(): unknown {
        const out: Array<{ name: string; tris: number; count?: number; visible: boolean }> = [];
        group.traverse((o) => {
          if (o instanceof THREE.InstancedMesh) {
            const g = o.geometry as THREE.BufferGeometry;
            const idx = g.getIndex();
            out.push({ name: o.name, tris: idx ? idx.count / 3 : g.attributes.position.count / 3, count: o.count, visible: o.visible });
          }
        });
        return out;
      } },
      probe(x: number, y: number, camera: THREE.PerspectiveCamera): unknown {
        const rc = new THREE.Raycaster();
        rc.setFromCamera(new THREE.Vector2(x, y), camera);
        const hits = rc.intersectObject(group, true);
        return hits.slice(0, 3).map((h) => ({
          name: h.object.name,
          material: (h.object as THREE.Mesh).material instanceof THREE.Material ? ((h.object as THREE.Mesh).material as THREE.Material).name : '?',
          dist: Math.round(h.distance * 10) / 10,
          point: [Math.round(h.point.x), Math.round(h.point.y), Math.round(h.point.z)],
          normal: h.face ? [h.face.normal.x.toFixed(2), h.face.normal.y.toFixed(2), h.face.normal.z.toFixed(2)] : null,
        }));
      },
    };
  }

  return {
    id: 'exterior',
    rooms,
    group,
    roomGroups,
    spawnPoints: SPAWNS,
    // Paris daylight: a warm haze background and light exponential fog, so a wing 200 m away is
    // still a building and the distant city falls into haze instead of into black.
    atmosphere: { background: CONTEXT.haze, fog: { color: CONTEXT.haze, density: 0.0012 } },
    update(_dt: number, camera: THREE.Camera): void {
      if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__ext) {
        (window as unknown as Record<string, unknown>).__extCamera = camera;
      }
      // The sky travels with the viewer, so the dome can never be clipped by the far plane.
      sky.position.set(camera.position.x, 0, camera.position.z);
    },
    dispose(): void {
      group.traverse((o) => {
        if (o instanceof THREE.InstancedMesh) o.dispose();
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
    },
  };
};
