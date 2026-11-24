import * as THREE from 'three';
import { boxGeo, quadGeo, mergeAll } from '../../core/geom';
import { addPart } from '../../core/merge';
import { mat } from '../../core/materials';
import { colorOf } from '../../core/palette';
import type { Rng } from '../../core/rng';
import { pyramidMaterials } from './materials';
import { pavingTexture, rippleNormal } from './textures';
import { PYRAMID } from './pyramid';
import { LINK_SLOT } from './passages';

/**
 * The courtyard that frames the pyramid.
 *
 *  - Cour Napoléon: 200 x 140 m of sandstone and granite setts (the real court is 650,000 of them),
 *    granite banding, the three triangular reflecting pools with their fountains, and the bronze
 *    Louis XIV.
 *  - Place du Carrousel: paving, the hedges that screen the inverted pyramid, and the walkable glass
 *    deck over it.
 *
 * The paving is built as a frame around the pyramid's footprint, because the pyramid's base is a
 * hole in the ground here: through it the Hall Napoléon is nine metres below, and the glass above
 * is the only thing filling it.
 */

export const COURT = {
  /** Cour Napoléon, from route.json: x -84..116, z -70..70. */
  court: { x0: -84, x1: 116, z0: -70, z1: 70 },
  /** Place du Carrousel, from route.json: x -236..-84, z -70..70. */
  place: { x0: -236, x1: -84, z0: -70, z1: 70 },
  /** The pyramid's footprint, plus a 4 cm shadow gap closed by the granite apron. */
  pyramidHole: 17.75,
  deck: { x: PYRAMID.inverted.x, half: 9.4 },
  pavingThickness: 0.34,
} as const;

export interface CourtyardParts {
  /** Geometry culled with the Cour Napoléon cell. */
  court: THREE.Group;
  /** Geometry culled with the Place du Carrousel cell. */
  place: THREE.Group;
  dispose(): void;
}

interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

function slab(parent: THREE.Object3D, rect: Rect, material: THREE.Material, top = 0): void {
  const w = rect.x1 - rect.x0;
  const d = rect.z1 - rect.z0;
  if (w <= 0.01 || d <= 0.01) return;
  const geo = boxGeo(w, COURT.pavingThickness, d);
  // The engine's daylight is tuned for interiors and blows pale exterior stone out to ~190/255, so
  // the paving carries a baked albedo factor: with it the courtyard lands near 150, the value the
  // palette's pave-granite reads at under a Paris sky.
  const col = geo.attributes.color as THREE.BufferAttribute;
  for (let i = 0; i < col.count; i++) col.setXYZ(i, col.getX(i) * 0.46, col.getY(i) * 0.46, col.getZ(i) * 0.46);
  col.needsUpdate = true;
  geo.translate((rect.x0 + rect.x1) / 2, top - COURT.pavingThickness / 2, (rect.z0 + rect.z1) / 2);
  const mesh = new THREE.Mesh(geo, material);
  parent.add(mesh);
}

/** Paving strips around a rectangular hole. */
function frame(parent: THREE.Object3D, outer: Rect, hole: Rect, material: THREE.Material): void {
  slab(parent, { x0: outer.x0, x1: outer.x1, z0: outer.z0, z1: hole.z0 }, material);
  slab(parent, { x0: outer.x0, x1: outer.x1, z0: hole.z1, z1: outer.z1 }, material);
  slab(parent, { x0: outer.x0, x1: hole.x0, z0: hole.z0, z1: hole.z1 }, material);
  slab(parent, { x0: hole.x1, x1: outer.x1, z0: hole.z0, z1: hole.z1 }, material);
}

/** A granite band laid 12 mm proud of the paving. */
function band(parent: THREE.Object3D, rect: Rect, height = 0.024): void {
  const w = Math.max(0.01, rect.x1 - rect.x0);
  const d = Math.max(0.01, rect.z1 - rect.z0);
  const geo = boxGeo(w, height, d);
  geo.translate((rect.x0 + rect.x1) / 2, height / 2, (rect.z0 + rect.z1) / 2);
  addPart(parent, geo, 'stone.granite-grey');
}

function triangleGeo(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z], 3),
  );
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([a.x, a.z, b.x, b.z, c.x, c.z], 2));
  geo.setIndex([0, 1, 2]);
  geo.computeVertexNormals();
  geo.setAttribute('color', new THREE.Float32BufferAttribute([1, 1, 1, 1, 1, 1, 1, 1, 1], 3));
  return geo;
}

/** Wall quad between two top points and their foot offset. UVs in metres. */
function wallQuad(top0: THREE.Vector3, top1: THREE.Vector3, foot0: THREE.Vector3, foot1: THREE.Vector3): THREE.BufferGeometry {
  const w = top0.distanceTo(top1);
  const h = top0.distanceTo(foot0);
  return quadGeo(
    [top0.x, top0.y, top0.z],
    [top1.x, top1.y, top1.z],
    [foot1.x, foot1.y, foot1.z],
    [foot0.x, foot0.y, foot0.z],
    [[0, 0], [w, 0], [w, h], [0, h]],
  );
}

/**
 * One triangular reflecting pool: granite kerb, water 18 cm below the paving, and three jets.
 * `apex` points at the pyramid, `base0`/`base1` close the triangle toward the satellite pyramid.
 */
function pool(
  parent: THREE.Object3D,
  apex: THREE.Vector2,
  base0: THREE.Vector2,
  base1: THREE.Vector2,
  water: THREE.Material,
  rng: Rng,
): void {
  const rim = 0.16;
  const waterY = -0.18;
  const floorY = -0.62;
  const corners = [apex, base0, base1];
  const centre = new THREE.Vector2(
    (apex.x + base0.x + base1.x) / 3,
    (apex.y + base0.y + base1.y) / 3,
  );

  // Basin walls, from the paving edge down to the basin floor.
  for (let i = 0; i < 3; i++) {
    const p0 = corners[i] as THREE.Vector2;
    const p1 = corners[(i + 1) % 3] as THREE.Vector2;
    const top0 = new THREE.Vector3(p0.x, 0, p0.y);
    const top1 = new THREE.Vector3(p1.x, 0, p1.y);
    const foot0 = new THREE.Vector3(p0.x, floorY, p0.y);
    const foot1 = new THREE.Vector3(p1.x, floorY, p1.y);
    const mesh = new THREE.Mesh(wallQuad(top0, top1, foot0, foot1), mat('stone.granite-grey'));
    // Face the wall into the basin.
    const mid = new THREE.Vector3().addVectors(top0, top1).multiplyScalar(0.5);
    const outward = new THREE.Vector3(mid.x - centre.x, 0, mid.z - centre.y);
    const geo = mesh.geometry;
    const n = geo.attributes.normal as THREE.BufferAttribute;
    const first = new THREE.Vector3(n.getX(0), n.getY(0), n.getZ(0));
    if (first.dot(outward) > 0) {
      const idx = geo.index as THREE.BufferAttribute;
      const arr = idx.array as unknown as number[];
      for (let t = 0; t < arr.length; t += 3) {
        const tmp = arr[t + 1] as number;
        arr[t + 1] = arr[t + 2] as number;
        arr[t + 2] = tmp;
      }
      idx.needsUpdate = true;
      geo.computeVertexNormals();
    }
    parent.add(mesh);

    // Kerb along the edge, sitting proud of the paving.
    const dir = new THREE.Vector3(p1.x - p0.x, 0, p1.y - p0.y);
    const length = dir.length();
    const mid0 = new THREE.Vector3().addVectors(top0, top1).multiplyScalar(0.5);
    const kerb = boxGeo(length + rim, 0.2, rim);
    kerb.rotateY(-Math.atan2(dir.z, dir.x));
    kerb.translate(mid0.x + (mid0.x - centre.x) * 0.02, 0.1, mid0.z + (mid0.z - centre.y) * 0.02);
    addPart(parent, kerb, 'stone.granite-grey');
  }

  // Basin floor and water surface.
  const fl = [
    new THREE.Vector3(apex.x, floorY, apex.y),
    new THREE.Vector3(base0.x, floorY, base0.y),
    new THREE.Vector3(base1.x, floorY, base1.y),
  ];
  const floorGeo = triangleGeo(fl[0] as THREE.Vector3, fl[1] as THREE.Vector3, fl[2] as THREE.Vector3);
  addPart(parent, floorGeo, 'marble.noir-marquina');

  const waterGeo = triangleGeo(
    new THREE.Vector3(apex.x, waterY, apex.y),
    new THREE.Vector3(base0.x, waterY, base0.y),
    new THREE.Vector3(base1.x, waterY, base1.y),
  );
  parent.add(new THREE.Mesh(waterGeo, water));

  // Three jets, each a bronze nozzle with a glass plume.
  const materials = pyramidMaterials();
  const inward = new THREE.Vector2(centre.x, centre.y);
  const jets = [
    inward.clone(),
    inward.clone().lerp(apex, -0.34),
    inward.clone().lerp(base0.clone().add(base1).multiplyScalar(0.5), 0.18),
  ];
  for (const jet of jets) {
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.5, 10), materials.bronze);
    nozzle.position.set(jet.x, waterY + 0.1, jet.y);
    parent.add(nozzle);
    const plumeH = 1.15 + rng.range(-0.12, 0.18);
    const plume = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.34, plumeH, 9, 1, true), materials.deckGlass);
    plume.position.set(jet.x, waterY + 0.32 + plumeH / 2, jet.y);
    parent.add(plume);
  }
}

/**
 * Bernini's Louis XIV, the lead copy in the Cour Napoléon: a rearing horse on a stone plinth.
 * The rides are boxes and cylinders at the scale a visitor reads from 30 m.
 */
function equestrian(parent: THREE.Object3D, x: number, z: number, yaw: number): void {
  const statue = new THREE.Group();
  statue.position.set(x, 0, z);
  statue.rotation.y = yaw;

  const plinth = new THREE.Mesh(boxGeo(2.1, 3.0, 3.4), mat('stone.limestone-warm'));
  plinth.position.y = 1.5;
  statue.add(plinth);
  const cap = new THREE.Mesh(boxGeo(2.5, 0.28, 3.8), mat('stone.limestone-warm'));
  cap.position.y = 3.14;
  statue.add(cap);
  const foot = new THREE.Mesh(boxGeo(2.5, 0.3, 3.8), mat('stone.limestone-warm'));
  foot.position.y = 0.15;
  statue.add(foot);

  const bronze = pyramidMaterials().bronze;
  const part = (w: number, h: number, d: number, px: number, py: number, pz: number, rz = 0, ry = 0): void => {
    const mesh = new THREE.Mesh(boxGeo(w, h, d), bronze);
    mesh.position.set(px, py, pz);
    mesh.rotation.set(0, ry, rz);
    statue.add(mesh);
  };

  const base = 3.28;
  // Haunches and body, the body rocked up onto the hind legs.
  part(1.15, 1.15, 0.85, -0.72, base + 0.72, 0);
  part(1.55, 1.0, 0.82, 0.28, base + 1.28, 0, 0.42);
  part(0.95, 0.9, 0.78, 1.02, base + 1.92, 0, 0.3);
  // Neck and head.
  part(0.42, 0.95, 0.5, 1.42, base + 2.5, 0, 0.62);
  part(0.7, 0.32, 0.34, 1.78, base + 2.94, 0, 0.22);
  part(0.2, 0.24, 0.16, 1.62, base + 3.1, 0.13, 0);
  part(0.2, 0.24, 0.16, 1.62, base + 3.1, -0.13, 0);
  // Mane and tail.
  part(0.34, 0.72, 0.2, 1.24, base + 2.62, 0, 0.5);
  part(0.22, 0.9, 0.18, -1.34, base + 1.05, 0, -0.55);
  // Hind legs, planted.
  part(0.26, 1.55, 0.26, -1.02, base + 0.1, 0.24);
  part(0.26, 1.55, 0.26, -1.02, base + 0.1, -0.24);
  part(0.26, 0.6, 0.26, -0.62, base + 0.42, 0.24);
  part(0.26, 0.6, 0.26, -0.62, base + 0.42, -0.24);
  // Fore legs, raised.
  part(0.22, 0.95, 0.22, 1.35, base + 1.62, 0.26, 0.9);
  part(0.22, 0.95, 0.22, 1.35, base + 1.62, -0.26, 0.9);
  part(0.2, 0.7, 0.2, 1.86, base + 1.95, 0.26, 1.5);
  part(0.2, 0.7, 0.2, 1.86, base + 1.95, -0.26, 1.5);
  // The rider: torso, head, cloak, arms.
  part(0.44, 0.78, 0.4, -0.05, base + 2.06, 0, 0.08);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8), bronze);
  head.position.set(0.02, base + 2.56, 0);
  statue.add(head);
  part(0.3, 0.66, 0.3, 0.16, base + 1.86, 0.2, 0.55);
  part(0.62, 0.9, 0.22, -0.34, base + 1.66, 0, -0.3);
  part(0.18, 0.55, 0.18, 0.3, base + 2.06, 0.28, 1.1);
  part(0.18, 0.55, 0.18, 0.3, base + 2.06, -0.28, 1.1);

  parent.add(statue);
}

export function buildCourtyard(rng: Rng): CourtyardParts {
  const court = new THREE.Group();
  court.name = 'pyramid/cour-napoleon';
  const place = new THREE.Group();
  place.name = 'pyramid/place-du-carrousel';

  const pavingTex = pavingTexture();
  const paving = new THREE.MeshStandardMaterial({
    name: 'pyramid/paving',
    color: new THREE.Color().setHex(colorOf('floor.pave-granite'), THREE.SRGBColorSpace),
    map: pavingTex.texture,
    roughness: 0.84,
    metalness: 0.02,
    vertexColors: true,
  });

  const hole = {
    x0: -COURT.pyramidHole,
    x1: COURT.pyramidHole,
    z0: -COURT.pyramidHole,
    z1: COURT.pyramidHole,
  };

  // Cour Napoléon paving, minus the pyramid's footprint and the Richelieu stair well.
  frame(court, { ...COURT.court, z1: LINK_SLOT.z1 }, LINK_SLOT, paving);
  frame(court, { ...COURT.court, z0: LINK_SLOT.z1 }, hole, paving);

  // Place du Carrousel paving, minus the glass deck over the inverted pyramid.
  const deck = { x0: COURT.deck.x - COURT.deck.half, x1: COURT.deck.x + COURT.deck.half, z0: -COURT.deck.half, z1: COURT.deck.half };
  frame(place, COURT.place, deck, paving);

  // Granite apron around the pyramid: the shadow gap between paving and glass base.
  const apron = 1.9;
  band(court, { x0: hole.x0 - apron, x1: hole.x1 + apron, z0: hole.z0 - apron, z1: hole.z0 }, 0.02);
  band(court, { x0: hole.x0 - apron, x1: hole.x1 + apron, z0: hole.z1, z1: hole.z1 + apron }, 0.02);
  band(court, { x0: hole.x0 - apron, x1: hole.x0, z0: hole.z0, z1: hole.z1 }, 0.02);
  band(court, { x0: hole.x1, x1: hole.x1 + apron, z0: hole.z0, z1: hole.z1 }, 0.02);

  // Banding: the court's large granite grid, and the axis through the Place du Carrousel.
  for (const x of [-60, -20, 20, 60]) band(court, { x0: x - 0.6, x1: x + 0.6, z0: COURT.court.z0 + 6, z1: COURT.court.z1 - 6 });
  for (const z of [-44, -22, 22, 44]) band(court, { x0: COURT.court.x0 + 6, x1: COURT.court.x1 - 6, z0: z - 0.6, z1: z + 0.6 });
  band(court, { x0: COURT.court.x0, x1: COURT.court.x1, z0: -0.8, z1: 0.8 }, 0.028);

  band(place, { x0: COURT.place.x0, x1: deck.x0 - 1.2, z0: -0.9, z1: 0.9 }, 0.028);
  band(place, { x0: deck.x1 + 1.2, x1: COURT.place.x1, z0: -0.9, z1: 0.9 }, 0.028);

  // The three triangular pools, each pointing at the main pyramid.
  const waterTex = rippleNormal();
  const water = pyramidMaterials().water;
  water.normalMap = waterTex.texture;
  water.normalScale.set(0.4, 0.4);
  water.needsUpdate = true;

  pool(court, new THREE.Vector2(0, -13.5), new THREE.Vector2(-9.5, -26.5), new THREE.Vector2(9.5, -26.5), water, rng);
  pool(court, new THREE.Vector2(13.5, 0), new THREE.Vector2(26.5, 9.5), new THREE.Vector2(26.5, -9.5), water, rng);
  pool(court, new THREE.Vector2(0, 13.5), new THREE.Vector2(9.5, 26.5), new THREE.Vector2(-9.5, 26.5), water, rng);

  // Louis XIV, south-west of the pyramid, clear of the axis view.
  equestrian(court, -42, 27, -0.42);

  // Glass deck over the inverted pyramid, with its steel edge.
  const materials = pyramidMaterials();
  const deckGeo = new THREE.PlaneGeometry(COURT.deck.half * 2, COURT.deck.half * 2);
  deckGeo.rotateX(-Math.PI / 2);
  const deckMesh = new THREE.Mesh(deckGeo, materials.deckGlass);
  deckMesh.position.set(COURT.deck.x, 0.035, 0);
  place.add(deckMesh);
  const deckFrame = new THREE.Group();
  for (const [w, d, ox, oz] of [
    [COURT.deck.half * 2 + 0.5, 0.25, 0, COURT.deck.half],
    [COURT.deck.half * 2 + 0.5, 0.25, 0, -COURT.deck.half],
    [0.25, COURT.deck.half * 2, COURT.deck.half, 0],
    [0.25, COURT.deck.half * 2, -COURT.deck.half, 0],
  ] as const) {
    const geo = boxGeo(w, 0.12, d);
    geo.translate(COURT.deck.x + ox, 0.06, oz);
    addPart(deckFrame, geo, 'stone.granite-grey');
  }
  place.add(deckFrame);

  // Hedges screening the inverted pyramid, as the real centre is screened.
  const hedgeBlocks: THREE.BufferGeometry[] = [];
  const hedge = materials.hedge;
  const hedgeSpan = COURT.deck.half + 2.2;
  const blocks = 7;
  for (let i = 0; i < blocks; i++) {
    const along = -hedgeSpan + (i * 2 * hedgeSpan) / (blocks - 1);
    const h = 1.3 + rng.range(-0.07, 0.09);
    for (const lateral of [-1, 1]) {
      const geoZ = boxGeo(3.2, h, 1.15);
      geoZ.translate(COURT.deck.x + along, h / 2, lateral * hedgeSpan);
      hedgeBlocks.push(geoZ);
      const geoX = boxGeo(1.15, h, 3.2);
      geoX.translate(COURT.deck.x + lateral * hedgeSpan, h / 2, along);
      hedgeBlocks.push(geoX);
    }
  }
  const hedgeMesh = new THREE.Mesh(mergeAll(hedgeBlocks), hedge);
  place.add(hedgeMesh);

  return {
    court,
    place,
    dispose(): void {
      paving.dispose();
      pavingTex.texture.dispose();
      waterTex.texture.dispose();
    },
  };
}
