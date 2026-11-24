/**
 * Verification gallery: all 28 works hung and stood in one hall at their real relative sizes.
 *
 * This is not part of the museum. It exists so the artwork library can be captured, measured and
 * looked at on its own — the zones that consume it are owned by other threads.
 */
import * as THREE from 'three';
import { addPart, addParts, mergeByMaterial } from '../../core/merge';
import { cornice, floor, wall } from '../../core/builders';
import { placeArtwork } from '../library';
import { ARTWORK_DEFS } from '../catalog';
import type { ArtworkSpec } from '../types';

const HALL_X = 36;
const HALL_Z = 26;
const HALL_H = 11;
const WALL_T = 0.3;
const HANG_BOTTOM = 1.2;
const GAP = 0.55;

export interface Placement {
  id: string;
  position: [number, number, number];
  rotationY: number;
  size: [number, number, number];
  kind: string;
}

export interface GalleryLayout {
  group: THREE.Group;
  bounds: { min: [number, number, number]; max: [number, number, number] };
  spawns: Array<{ id: string; position: [number, number, number]; lookAt: [number, number, number]; label: string }>;
  placements: Placement[];
}

function frameBorder(id: string): number {
  const d = ARTWORK_DEFS.find((w) => w.id === id);
  return d?.frame?.border ?? 0;
}

export function buildGallery(): GalleryLayout {
  const group = new THREE.Group();
  group.name = 'artworks/gallery';

  // A plain hall: parquet floor, plaster walls, a cornice, no ornament. The art is the subject.
  const shell = new THREE.Group();
  addPart(shell, floor({ width: HALL_X + WALL_T * 2, depth: HALL_Z + WALL_T * 2 }), 'floor.parquet-versailles');
  for (const [len, x, z, ry] of [
    [HALL_X + WALL_T * 2, 0, -HALL_Z / 2 - WALL_T / 2, 0],
    [HALL_X + WALL_T * 2, 0, HALL_Z / 2 + WALL_T / 2, Math.PI],
    [HALL_Z, -HALL_X / 2 - WALL_T / 2, 0, Math.PI / 2],
    [HALL_Z, HALL_X / 2 + WALL_T / 2, 0, -Math.PI / 2],
  ] as const) {
    const w = addPart(shell, wall({ length: len, height: HALL_H, thickness: WALL_T }), 'wall.red-madder');
    w.position.set(x, 0, z);
    w.rotation.y = ry;
    const c = addPart(shell, cornice({ length: len, height: 0.5, projection: 0.36 }), 'ceiling.cream-cove');
    c.position.set(x, HALL_H - 0.5, z);
    c.rotation.y = ry;
  }
  const ceiling = new THREE.Group();
  addParts(ceiling, floor({ width: HALL_X, depth: HALL_Z }), 'ceiling.plaster-white');
  ceiling.children[0]?.position.set(0, HALL_H, 0);
  shell.add(ceiling);
  group.add(mergeByMaterial(shell).group);

  const placements: Placement[] = [];
  const paintings = ARTWORK_DEFS.filter((d) => d.kind === 'painting' || d.kind === 'ceiling-painting').sort(
    (a, b) => a.sizeCm[0] * a.sizeCm[1] - b.sizeCm[0] * b.sizeCm[1],
  );
  const sculptures = ARTWORK_DEFS.filter((d) => d.kind !== 'painting' && d.kind !== 'ceiling-painting').sort(
    (a, b) => a.sizeCm[0] - b.sizeCm[0],
  );

  // Paintings: a continuous hang along the north wall, continuing on the south wall when full.
  let cursor = -HALL_X / 2 + 0.5;
  let wallIndex = 0;
  const walls: Array<{ z: number; ry: number }> = [
    { z: -HALL_Z / 2 + 0.02, ry: 0 },
    { z: HALL_Z / 2 - 0.02, ry: Math.PI },
  ];
  for (const d of paintings) {
    const w = d.sizeCm[0] / 100;
    const h = d.sizeCm[1] / 100;
    const border = frameBorder(d.id);
    const outerW = w + border * 2;
    if (cursor + outerW > HALL_X / 2 - 0.4 && wallIndex < walls.length - 1) {
      wallIndex += 1;
      cursor = -HALL_X / 2 + 0.5;
    }
    const wall = walls[wallIndex];
    const x = cursor + outerW / 2;
    cursor = x + outerW / 2 + GAP;
    const spec: ArtworkSpec = {
      id: d.id,
      title: d.titleFr,
      artist: d.artist,
      year: d.year,
      medium: d.medium,
      sizeCm: d.sizeCm,
      room: 'gallery',
      wall: wallIndex === 0 ? 'north' : 'south',
      position: [x, HANG_BOTTOM + h / 2, wall.z],
      rotationY: wall.ry,
    };
    placeArtwork(group, spec);
    placements.push({ id: d.id, position: [x, HANG_BOTTOM + h / 2, wall.z], rotationY: wall.ry, size: [w, h, border * 2], kind: d.kind });
  }

  // Sculptures: two lines down the middle of the hall, facing +Z, at their real heights.
  let sx = -HALL_X / 2 + 2.2;
  let line = 0;
  for (const d of sculptures) {
    const w = d.sizeCm[0] / 100;
    if (sx + w > HALL_X / 2 - 1.4 && line === 0) {
      line = 1;
      sx = -HALL_X / 2 + 2.2;
    }
    const z = line === 0 ? 3.6 : -3.6;
    const x = sx + w / 2;
    sx = x + w / 2 + 1.5;
    const spec: ArtworkSpec = {
      id: d.id,
      title: d.titleFr,
      artist: d.artist,
      year: d.year,
      medium: d.medium,
      sizeCm: d.sizeCm,
      room: 'gallery',
      wall: 'floor',
      position: [x, 0, z],
      rotationY: 0,
    };
    placeArtwork(group, spec);
    placements.push({ id: d.id, position: [x, 0, z], rotationY: 0, size: [w, d.sizeCm[1] / 100, (d.depthCm ?? 0) / 100], kind: d.kind });
  }

  // Viewpoints are derived from where the works actually are, and each one is aimed at the centre
  // of a named work, so the harness's sight-line probe lands on that work's canvas instead of on
  // bare wall. Aiming by hand is how a capture passes every pixel floor while showing a red wall.
  const byId = new Map(placements.map((p) => [p.id, p]));
  const standoff = (id: string, distance: number): { position: [number, number, number]; lookAt: [number, number, number] } => {
    const p = byId.get(id);
    if (!p) throw new Error('gallery: no placement for "' + id + '"');
    const facing = Math.cos(p.rotationY) >= 0 ? 1 : -1;
    const standing = p.kind === 'sculpture' || p.kind === 'stele' || p.kind === 'object';
    // A painting is aimed at its canvas centre; a standing work at its mid-height, because aiming at
    // its base point sends the sight line over the top of it and into the floor beyond.
    const aimY = standing ? p.position[1] + p.size[1] * 0.45 : p.position[1];
    const eye = standing ? Math.min(2.4, Math.max(1.5, p.size[1] * 0.5)) : Math.min(2.6, Math.max(1.55, p.position[1]));
    return {
      position: [p.position[0], eye, p.position[2] + facing * distance],
      lookAt: [p.position[0], aimY, p.position[2]],
    };
  };
  const view = (id: string, distance: number, label: string) => ({ id, ...standoff(id, distance), label });

  const halfX = HALL_X / 2;
  const halfZ = HALL_Z / 2;
  return {
    group,
    bounds: { min: [-halfX, 0, -halfZ], max: [halfX, HALL_H, halfZ] },
    spawns: [
      view('mona-lisa', 2.4, 'Mona Lisa, at the Louvre\'s 2.4 m sight line'),
      view('wedding-at-cana', 12, 'The Wedding at Cana, full width'),
      view('raft-of-the-medusa', 12, 'The Raft of the Medusa'),
      view('apollo-ceiling-delacroix', 14, 'The Apollo ceiling panel'),
      view('venus-de-milo', 4, 'Venus de Milo'),
      view('winged-victory', 7, 'The Winged Victory on her prow'),
      { id: 'hall-axis', position: [-16.5, 2.2, 8.5], lookAt: [8, 3.0, -12.5], label: 'Down the hall, both walls' },
    ],
    placements,
  };
}
