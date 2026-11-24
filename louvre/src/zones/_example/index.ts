import * as THREE from 'three';
import { boxGeo, mergeAll, type ProfilePoint } from '../../core/geom';
import { mergeByMaterial, addParts, addPart } from '../../core/merge';
import { goldMat } from '../../core/materials';
import {
  arcade,
  baseboard,
  ceiling,
  cofferCeiling,
  cornice,
  doorway,
  floor,
  parquet,
  pilaster,
  pictureFrame,
  skylight,
  wall,
  windowRow,
  type BuildParts,
} from '../../core/builders';
import type { RoomDef } from '../../core/culling';
import type { SpawnPoint } from '../../core/controls';
import type { Zone, ZoneContext } from '../types';

/**
 * Proof gallery — not part of the museum. It exists to prove the contract: it uses the shared
 * builders, declares rooms and portals, exposes spawn points, and is built from the seeded RNG.
 *
 * 40 m long, 12 m wide, 9 m high: a Grande Galerie proportion. Two side chambers hang off
 * doorways in the north wall so portal culling has something to cull.
 */
const L = 40;
const D = 12;
const H = 9;
/** The gallery is not part of the palace: it sits 400 m south of the pyramid so it can never
 *  overlap the real zone boxes (which end at z = +154). */
const FAR_Z = 400;
const ORIGIN: readonly [number, number, number] = [0, 0, FAR_Z];
const WALL_T = 0.6;
const CORNICE_H = 0.55;

const DOOR_X = [-6, 6];
const DOOR_W = 2.4;
const DOOR_H = 4.2;

const CABINET = { x0: 2, x1: 10, z0: -13, z1: -6 - WALL_T, h: 6 };
const VESTIBULE = { x0: -11, x1: -3, z0: -11, z1: -6 - WALL_T, h: 6 };

const WINDOWS = { bays: 6, spacing: 5.2, width: 2.4, sill: 1.0, head: 6.6 };

function windowCentres(): number[] {
  const out: number[] = [];
  for (let i = 0; i < WINDOWS.bays; i++) out.push((i - (WINDOWS.bays - 1) / 2) * WINDOWS.spacing);
  return out;
}

function sideRoomParts(x0: number, x1: number, z0: number, z1: number, h: number): THREE.Group {
  const g = new THREE.Group();
  const w = x1 - x0;
  const cx = (x0 + x1) / 2;
  addPart(g, floor({ width: w, depth: z1 - z0 }), 'floor.parquet-versailles').position.set(cx, 0, (z0 + z1) / 2);
  addPart(g, ceiling({ width: w, depth: z1 - z0, beams: 3 }), 'ceiling.plaster-white').position.set(cx, h, (z0 + z1) / 2);
  // Outer walls: back, left, right.
  const back = wall({ length: w + WALL_T * 2, height: h, thickness: WALL_T });
  const backMesh = addPart(g, back, 'wall.white-plaster');
  backMesh.position.set(cx, 0, z0 - WALL_T / 2);
  const left = wall({ length: z1 - z0, height: h, thickness: WALL_T });
  const leftMesh = addPart(g, left, 'wall.white-plaster');
  leftMesh.position.set(x0 - WALL_T / 2, 0, (z0 + z1) / 2);
  leftMesh.rotation.y = Math.PI / 2;
  const right = wall({ length: z1 - z0, height: h, thickness: WALL_T });
  const rightMesh = addPart(g, right, 'wall.white-plaster');
  rightMesh.position.set(x1 + WALL_T / 2, 0, (z0 + z1) / 2);
  rightMesh.rotation.y = Math.PI / 2;

  // Skirting and cornice on the three walls.
  const skirtBack = addPart(g, baseboard({ length: w }), 'trim.stone-limestone-warm');
  skirtBack.position.set(cx, 0, z0 + 0.03);
  const cornBack = addPart(g, cornice({ length: w, height: 0.4, projection: 0.24, dentils: false }), 'ceiling.plaster-white');
  cornBack.position.set(cx, h - 0.4, z0);
  return g;
}

interface ExampleParts {
  gallery: THREE.Group;
  cabinet: THREE.Group;
  vestibule: THREE.Group;
}

function buildGallery(ctx: ZoneContext): ExampleParts {
  const r = ctx.rng('example');
  const raw = new THREE.Group();

  // Floor: parquet with a border and Versailles cross bands.
  const parquetParts = parquet({ width: L, depth: D, border: 0.5, crossBands: 3 });
  addPart(raw, parquetParts, 'floor.parquet-versailles');

  // Long walls. North wall carries two arched doorways; south wall carries the window row.
  const northOpenings = DOOR_X.map((x) => ({ x, width: DOOR_W, head: DOOR_H, arched: true }));
  const north = wall({ length: L + WALL_T * 2, height: H, thickness: WALL_T, openings: northOpenings });
  addPart(raw, north, 'wall.red-madder').position.set(0, 0, -D / 2 - WALL_T / 2);

  const southOpenings = windowCentres().map((x) => ({
    x,
    width: WINDOWS.width,
    sill: WINDOWS.sill,
    head: WINDOWS.head,
  }));
  const south = wall({ length: L + WALL_T * 2, height: H, thickness: WALL_T, openings: southOpenings });
  addPart(raw, south, 'wall.red-madder').position.set(0, 0, D / 2 + WALL_T / 2);

  // End walls.
  for (const side of [-1, 1]) {
    const end = wall({ length: D + WALL_T * 2, height: H, thickness: WALL_T });
    const mesh = addPart(raw, end, 'wall.red-madder');
    mesh.position.set(side * (L / 2 + WALL_T / 2), 0, 0);
    mesh.rotation.y = Math.PI / 2;
  }

  // Doorway casings inside the arches.
  for (const x of DOOR_X) {
    const casing = doorway({ width: DOOR_W, height: DOOR_H, thickness: WALL_T, arched: true });
    const m = addPart(raw, casing, 'trim.stone-limestone-warm');
    m.position.set(x, 0, -D / 2);
  }

  // Window row on the south wall: instanced frames + a shared glass sheet.
  const windows: BuildParts = windowRow({
    bays: WINDOWS.bays,
    bayWidth: WINDOWS.width,
    spacing: WINDOWS.spacing,
    sillHeight: WINDOWS.sill,
    headHeight: WINDOWS.head,
    thickness: WALL_T,
    mullions: 2,
  });
  const windowGroup = new THREE.Group();
  addParts(windowGroup, windows);
  windowGroup.position.set(0, 0, D / 2 - 0.02);
  raw.add(windowGroup);

  // Pilasters and cornices: five bays on each long wall.
  const bayX = [-18, -9, 0, 9, 18];
  const pilasterH = H - CORNICE_H - 0.05;
  for (const wallZ of [-1, 1]) {
    for (const x of bayX) {
      const p = pilaster({ width: 0.95, height: pilasterH, depth: 0.17 });
      const mesh = addPart(raw, p, 'trim.stone-limestone-warm');
      mesh.position.set(x, 0, wallZ * (D / 2));
      mesh.rotation.y = wallZ > 0 ? Math.PI : 0;
    }
    // Cornice along the whole bay, plus skirting.
    const corn = addPart(raw, cornice({ length: L, height: CORNICE_H, projection: 0.42 }), 'ceiling.plaster-white');
    corn.position.set(0, H - CORNICE_H, wallZ * (D / 2));
    corn.rotation.y = wallZ > 0 ? Math.PI : 0;
    const skirt = addPart(raw, baseboard({ length: L, height: 0.34, thickness: 0.06 }), 'marble.noir-marquina');
    skirt.position.set(0, 0, wallZ * (D / 2));
    skirt.rotation.y = wallZ > 0 ? Math.PI : 0;
  }
  // End wall cornices and skirting.
  for (const side of [-1, 1]) {
    const corn = addPart(raw, cornice({ length: D, height: CORNICE_H, projection: 0.42, dentils: false }), 'ceiling.plaster-white');
    corn.position.set(side * (L / 2), H - CORNICE_H, 0);
    corn.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    const skirt = addPart(raw, baseboard({ length: D, height: 0.34, thickness: 0.06 }), 'marble.noir-marquina');
    skirt.position.set(side * (L / 2), 0, 0);
    skirt.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
  }

  // Coffered ceiling in two runs, leaving a glazed strip down the centre.
  const slabDepth = (D - 3.4) / 2;
  for (const side of [-1, 1]) {
    const coffer = cofferCeiling({
      width: L,
      depth: slabDepth,
      baysX: 8,
      baysZ: 1,
      beamWidth: 0.36,
      beamDepth: 0.34,
      rosettes: true,
    });
    const mesh = addPart(raw, coffer, 'ceiling.plaster-white');
    mesh.position.set(0, H, side * (1.7 + slabDepth / 2));
  }
  // Glazed skylight bridging the two ceiling runs.
  const sky = skylight({ width: L - 1.2, depth: 3.4, bars: 16 });
  const skyGroup = new THREE.Group();
  addParts(skyGroup, sky);
  skyGroup.position.set(0, H, 0);
  raw.add(skyGroup);

  // The light itself: an emissive plane above the skylight so the glass reads as daylight.
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(L - 1.4, 3.2),
    new THREE.MeshBasicMaterial({ color: 0xf4f1e6, side: THREE.DoubleSide, toneMapped: false }),
  );
  glow.rotation.x = Math.PI / 2;
  glow.position.set(0, H + 0.9, 0);
  raw.add(glow);

  // Two empty frames on the north wall, hung to picture-rail height.
  for (const x of [-13.5, 13.5]) {
    const frame = pictureFrame({ width: 2.4, height: 1.62, canvas: true });
    const fg = new THREE.Group();
    addParts(fg, frame);
    // Gilt reads as coal at the palette's physically-correct metalness under ambient-only light.
    fg.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh && (mesh.material as THREE.MeshStandardMaterial).name === 'wood.gilt-frame') {
        mesh.material = goldMat('wood.gilt-frame');
      }
    });
    fg.position.set(x, 4.6, -D / 2 + 0.02);
    raw.add(fg);
  }

  // A small console table under each frame: two boxes, enough to read as furniture.
  for (const x of [-13.5, 13.5]) {
    const top = boxGeo(1.5, 0.07, 0.45);
    top.translate(0, 0.86, 0);
    const legA = boxGeo(0.09, 0.86, 0.09);
    legA.translate(-0.62, 0.43, 0.16);
    const legB = boxGeo(0.09, 0.86, 0.09);
    legB.translate(0.62, 0.43, 0.16);
    const legC = boxGeo(0.09, 0.86, 0.09);
    legC.translate(-0.62, 0.43, -0.16);
    const legD = boxGeo(0.09, 0.86, 0.09);
    legD.translate(0.62, 0.43, -0.16);
    const table = addPart(raw, mergeAll([top, legA, legB, legC, legD]), 'wood.walnut');
    table.position.set(x, 0, -D / 2 + 0.42);
  }

  // Two side chambers behind the north doorways. They stay in their own groups so portal culling
  // can hide them independently of the gallery.
  const cabinet = sideRoomParts(CABINET.x0, CABINET.x1, CABINET.z0, CABINET.z1, CABINET.h);
  const vestibule = sideRoomParts(VESTIBULE.x0, VESTIBULE.x1, VESTIBULE.z0, VESTIBULE.z1, VESTIBULE.h);

  // The seeded RNG drives the small amount of variation in the room: the two console tables sit
  // a few centimetres off centre, deterministically, so two runs are pixel-identical.
  const jitters = [r.range(-0.04, 0.04), r.range(-0.04, 0.04)];
  const tables = raw.children.filter((c) => (c as THREE.Mesh).geometry && c.position.y === 0 && c.position.z > -5.8 && c.position.z < -5.5);
  tables.forEach((t, i) => {
    t.position.x += jitters[i] ?? 0;
  });

  return { gallery: raw, cabinet, vestibule };
}

export const createZone = (ctx: ZoneContext): Zone => {
  const parts = buildGallery(ctx);
  const gallery = mergeByMaterial(parts.gallery).group;
  gallery.name = 'example/grande-galerie';
  const cabinet = mergeByMaterial(parts.cabinet).group;
  cabinet.name = 'example/cabinet';
  const vestibule = mergeByMaterial(parts.vestibule).group;
  vestibule.name = 'example/vestibule';
  const group = new THREE.Group();
  group.name = 'zone:example';
  group.add(gallery, cabinet, vestibule);
  const roomGroups = new Map<string, THREE.Object3D>([
    ['grande-galerie', gallery],
    ['threshold-west', gallery],
    ['threshold-east', gallery],
    ['cabinet', cabinet],
    ['vestibule', vestibule],
  ]);

  const wallZ = D / 2 + WALL_T;
  const doorPortal = (x: number, fromZ: number, toZ: number): { centre: readonly [number, number, number]; normal: readonly [number, number, number] } => ({
    centre: [x, DOOR_H / 2, (fromZ + toZ) / 2],
    normal: [0, 0, Math.sign(toZ - fromZ)],
  });

  const rooms: RoomDef[] = [
    {
      id: 'grande-galerie',
      bounds: { min: [-L / 2, 0, -D / 2], max: [L / 2, H, D / 2] },
      portals: [
        { to: 'threshold-west', ...doorPortal(DOOR_X[0], -D / 2, -D / 2 - WALL_T), width: DOOR_W, height: DOOR_H },
        { to: 'threshold-east', ...doorPortal(DOOR_X[1], -D / 2, -D / 2 - WALL_T), width: DOOR_W, height: DOOR_H },
      ],
    },
    {
      id: 'threshold-west',
      bounds: {
        min: [DOOR_X[0] - DOOR_W / 2, 0, -D / 2 - WALL_T],
        max: [DOOR_X[0] + DOOR_W / 2, DOOR_H, -D / 2],
      },
      portals: [
        { to: 'grande-galerie', ...doorPortal(DOOR_X[0], -D / 2 - WALL_T, -D / 2), width: DOOR_W, height: DOOR_H },
        { to: 'vestibule', ...doorPortal(DOOR_X[0], -D / 2 - WALL_T, VESTIBULE.z1), width: DOOR_W, height: DOOR_H },
      ],
    },
    {
      id: 'threshold-east',
      bounds: {
        min: [DOOR_X[1] - DOOR_W / 2, 0, -D / 2 - WALL_T],
        max: [DOOR_X[1] + DOOR_W / 2, DOOR_H, -D / 2],
      },
      portals: [
        { to: 'grande-galerie', ...doorPortal(DOOR_X[1], -D / 2 - WALL_T, -D / 2), width: DOOR_W, height: DOOR_H },
        { to: 'cabinet', ...doorPortal(DOOR_X[1], -D / 2 - WALL_T, CABINET.z1), width: DOOR_W, height: DOOR_H },
      ],
    },
    {
      id: 'cabinet',
      bounds: { min: [CABINET.x0, 0, CABINET.z0], max: [CABINET.x1, CABINET.h, CABINET.z1] },
      portals: [{ to: 'threshold-east', ...doorPortal(DOOR_X[1], CABINET.z1, -D / 2 - WALL_T), width: DOOR_W, height: DOOR_H }],
    },
    {
      id: 'vestibule',
      bounds: { min: [VESTIBULE.x0, 0, VESTIBULE.z0], max: [VESTIBULE.x1, VESTIBULE.h, VESTIBULE.z1] },
      portals: [{ to: 'threshold-west', ...doorPortal(DOOR_X[0], VESTIBULE.z1, -D / 2 - WALL_T), width: DOOR_W, height: DOOR_H }],
    },
  ];

  const spawnPoints: SpawnPoint[] = [
    { id: 'west-end', position: [-17.5, 1.65, 0], lookAt: [10, 2.4, 0], label: 'West end, looking east' },
    { id: 'centre', position: [0, 1.65, 2.2], lookAt: [0, 3.4, -6], label: 'Centre, facing the frames' },
    { id: 'east-window', position: [14, 1.65, -2.4], lookAt: [-6, 2.6, 3.4], label: 'North-east, looking across the windows' },
    { id: 'cabinet', position: [6, 1.65, -8], lookAt: [6, 2.2, -6], label: 'Cabinet, looking back at the gallery' },
  ];

  // Shift everything from gallery-local coordinates into the far-away site.
  group.position.set(ORIGIN[0], ORIGIN[1], ORIGIN[2]);
  const shiftedRooms: RoomDef[] = rooms.map((room) => ({
    ...room,
    bounds: {
      min: [room.bounds.min[0] + ORIGIN[0], room.bounds.min[1], room.bounds.min[2] + ORIGIN[2]] as const,
      max: [room.bounds.max[0] + ORIGIN[0], room.bounds.max[1], room.bounds.max[2] + ORIGIN[2]] as const,
    },
    portals: (room.portals ?? []).map((p) => ({
      ...p,
      centre: [p.centre[0] + ORIGIN[0], p.centre[1], p.centre[2] + ORIGIN[2]] as const,
    })),
  }));
  const shiftedSpawns: SpawnPoint[] = spawnPoints.map((s) => ({
    ...s,
    position: [s.position[0] + ORIGIN[0], s.position[1], s.position[2] + ORIGIN[2]] as const,
    lookAt: [s.lookAt[0] + ORIGIN[0], s.lookAt[1], s.lookAt[2] + ORIGIN[2]] as const,
  }));

  return {
    id: 'example',
    rooms: shiftedRooms,
    // Matches the engine default, so the proof gallery looks unchanged while exercising the hook.
    atmosphere: { background: 0x0a0b0d, fog: { color: 0x0a0b0d, density: 0.0026 } },
    group,
    roomGroups,
    spawnPoints: shiftedSpawns,
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
