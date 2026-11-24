import * as THREE from 'three';
import { boxGeo } from '../../core/geom';
import type { Rng } from '../../core/rng';
import { mat } from '../../core/materials';
import { COURT } from './plan';
import { groundQuad, ROOF_ZINC, treeUnit, type InstanceSink } from './parts';

/**
 * Sky, ground and distance — the things that make the stone read warm instead of grey.
 *
 * Three colours do the work: a pale warm horizon, a cool zenith, and a low haze where the wings
 * end. The fog is linear and light, so the Colonnade 200 m away is still a building and not a
 * silhouette. Nothing here is a realtime light: it is geometry with baked colour, plus the
 * scene's background and fog, which the engine has no hook for and this zone must therefore set
 * itself (flagged in the report).
 */

/** Context colours outside the measured palette: sky, foliage, distant city, quay asphalt. */
export const CONTEXT = {
  skyZenith: '#7C9CC4',
  skyMid: '#A9BED3',
  skyHorizon: '#DCDCD6',
  haze: '#C9C6BC',
  foliageDark: '#46553A',
  foliageLight: '#5A6B45',
  cityWall: '#9A9488',
  cityRoof: '#77736E',
  quay: '#8B867E',
} as const;

const SKY_RADIUS = 850;

/** The sky dome: a gradient sphere, unlit, unaffected by fog. */
export function skyDome(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(SKY_RADIUS, 24, 16);
  const pos = geo.attributes.position;
  const colours = new Float32Array(pos.count * 3);
  const zenith = new THREE.Color(CONTEXT.skyZenith);
  const mid = new THREE.Color(CONTEXT.skyMid);
  const horizon = new THREE.Color(CONTEXT.skyHorizon);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const h = Math.max(0, Math.min(1, (pos.getY(i) / SKY_RADIUS) * 1.05));
    if (h < 0.5) c.copy(horizon).lerp(mid, h / 0.5);
    else c.copy(mid).lerp(zenith, (h - 0.5) / 0.5);
    colours[i * 3] = c.r;
    colours[i * 3 + 1] = c.g;
    colours[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  const material = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
  material.name = 'exterior.sky';
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = 'sky';
  mesh.renderOrder = -1;
  mesh.frustumCulled = false;
  return mesh;
}

/** The ground the whole museum stands on, the quays, and the Seine below them. */
export function ground(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'context/ground';

  group.add(new THREE.Mesh(groundQuad(-880, 920, -880, 920, -0.03), mat('floor.pave-granite')));

  // Quay wall and the water below it, south of the Seine façade (z = 154).
  const quayWall = boxGeo(1000, 5.2, 6);
  quayWall.translate(20, -2.6, 179);
  group.add(new THREE.Mesh(quayWall, mat('stone.granite-grey')));


  group.add(new THREE.Mesh(groundQuad(-480, 520, 182, 520, -4.4), mat('context.seine-water')));

  // The far bank, so the river is a river and not a void.
  const farBank = boxGeo(1000, 4.0, 40);
  farBank.translate(20, -2.2, 500);
  group.add(new THREE.Mesh(farBank, mat('floor.pave-granite')));
  return group;
}

interface Block {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
}

/**
 * The distant city: a haze band of roofs in the four directions the palace's own façade does not
 * fill. Cheap boxes at two tones, instanced, so the horizon reads as Paris and not as a void.
 */
export function distantCity(sink: InstanceSink, rng: Rng): void {
  const unit = boxGeo(1, 1, 1);
  unit.translate(0, 0.5, 0);
  const blocks: Block[] = [];
  const band = (x0: number, x1: number, z0: number, z1: number, count: number, minH: number, maxH: number): void => {
    for (let i = 0; i < count; i++) {
      const w = rng.range(12, 34);
      const d = rng.range(12, 34);
      blocks.push({
        x: rng.range(x0, x1),
        z: rng.range(z0, z1),
        w,
        d,
        h: rng.range(minH, maxH),
      });
    }
  };
  // 140 blocks, not 260: the assembled museum's heaviest viewpoint (the Cour Carrée, looking out
  // over the roofs) sat 727 triangles over the 300k ceiling, and the city beyond the palace is the
  // first thing on SCRA-6's ranked cut list. The band coverage is unchanged; only the density is.
  band(-900, 900, -620, -230, 48, 12, 26);
  band(430, 900, -220, 260, 27, 12, 24);
  band(-900, -560, -220, 260, 27, 12, 24);
  band(-700, 900, 540, 780, 38, 10, 22);

  for (const b of blocks) {
    const m = new THREE.Matrix4()
      .makeTranslation(b.x, 0, b.z)
      .multiply(new THREE.Matrix4().makeScale(b.w, b.h, b.d));
    const roof = rng.chance(0.5) ? 'city-roof-a' : 'city-roof-b';
    sink.add(roof, unit, roof === 'city-roof-a' ? CONTEXT.cityRoof : CONTEXT.cityWall, m);
  }
}

/** The two rows of trees along the Cour Napoléon, standing inside the court's edge. */
export function courtTrees(sink: InstanceSink, rng: Rng): void {
  // The real court's rows stand close to the wings and are trimmed high enough that the ground
  // floor of each façade still reads between the trunks. Height and spacing are chosen for that.
  const variants = [
    { key: 'tree-a', h: 8.6, material: CONTEXT.foliageDark },
    { key: 'tree-b', h: 9.8, material: CONTEXT.foliageLight },
    { key: 'tree-c', h: 10.9, material: CONTEXT.foliageDark },
    { key: 'tree-d', h: 9.2, material: CONTEXT.foliageLight },
  ];
  const units = variants.map((v) => ({ ...v, unit: treeUnit(v.h, rng) }));
  const rows = [COURT.z0 + 7.5, COURT.z1 - 7.5];
  for (const z of rows) {
    for (let x = COURT.x0 + 12; x <= COURT.x1 - 14; x += 13.5) {
      if (Math.abs(x) < 18) continue;
      const v = units[Math.floor(rng() * units.length)] as (typeof units)[number];
      const m = new THREE.Matrix4().makeTranslation(x + rng.range(-0.5, 0.5), 0, z + rng.range(-0.7, 0.7));
      sink.add(v.key, v.unit, v.material, m);
    }
  }
}
