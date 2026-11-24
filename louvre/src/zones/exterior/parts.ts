import * as THREE from 'three';
import { boxGeo, quadGeo, mergeAll, bakeAo, smoothstep, type ProfilePoint } from '../../core/geom';
import { instanced } from '../../core/merge';
import { mat } from '../../core/materials';

/**
 * Facade vocabulary for the exterior zone.
 *
 * The shared builders in core are built for interiors: a `cornice` adds dentils every 240 mm
 * (1,200 of them on a 288 m wing), and `balustrade` turns every baluster on a lathe. Repeated
 * thousands of times over three wings that is the whole triangle budget. The units here are the
 * same architectural forms reduced to what is legible from 30–200 m, every one of them instanced
 * or merged, because a palace façade is a few dozen repeated elements and the budget will not
 * survive hand-placed ones.
 *
 * Local frame for a unit: x along the façade, y up, z outward (toward the viewer). Callers place
 * the unit with a world matrix, so a 288 m wing and a 12 m end wall use the same geometry.
 */

/** Height of the stone plinth at the foot of every wing. */
export const PLINTH = { height: 0.9, proud: 0.12 } as const;

/** The main cornice band: 19.6 -> 20.4 m, projecting 0.55 m. */
export const CORNICE_BAND = { height: 0.8, proud: 0.55 } as const;

/** Moulded band between storeys. */
export const STRING_COURSE = { height: 0.26, proud: 0.15 } as const;

const WHITE = 1;

/** A flat rectangular ring in XY at z, built from four quads. UVs are in metres. */
function rectRing(w: number, h: number, f: number, z: number): THREE.BufferGeometry {
  const ow = w / 2 + f;
  const oh = h / 2 + f;
  const iw = w / 2;
  const ih = h / 2;
  const parts = [
    quadGeo([-ow, ih, z], [ow, ih, z], [ow, oh, z], [-ow, oh, z], [[-ow, ih], [ow, ih], [ow, oh], [-ow, oh]]),
    quadGeo([-ow, -oh, z], [ow, -oh, z], [ow, -ih, z], [-ow, -ih, z], [[-ow, -oh], [ow, -oh], [ow, -ih], [-ow, -ih]]),
    quadGeo([-ow, -oh, z], [-iw, -oh, z], [-iw, ih, z], [-ow, ih, z], [[-ow, -oh], [-iw, -oh], [-iw, ih], [-ow, ih]]),
    quadGeo([iw, -oh, z], [ow, -oh, z], [ow, ih, z], [iw, ih, z], [[iw, -oh], [ow, -oh], [ow, ih], [iw, ih]]),
  ];
  return mergeAll(parts);
}

/** A flat panel in XY, facing +Z, UVs in metres. */
export function panel(w: number, h: number, z: number): THREE.BufferGeometry {
  const hw = w / 2;
  const hh = h / 2;
  return quadGeo([-hw, -hh, z], [hw, -hh, z], [hw, hh, z], [-hw, hh, z], [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]);
}

export interface WindowOpts {
  w: number;
  h: number;
  /** Stone frame width. */
  frame?: number;
  /** True for the pedimented windows of the court elevations. */
  dressed?: boolean;
}

/**
 * One window: a dressed stone surround with a mullion and a transom over a dark pane, and, when
 * dressed, a projecting head shelf that throws a shadow line the way the real architraves do.
 */
export function windowUnit(opts: WindowOpts): THREE.BufferGeometry {
  const f = opts.frame ?? 0.2;
  const { w, h } = opts;
  const parts: THREE.BufferGeometry[] = [];
  parts.push(rectRing(w, h, f, 0.06));
  // Sill: a ledge that catches light and throws the pane back.
  const sill = boxGeo(w + f * 2 + 0.12, 0.1, 0.22, { skip: ['back', 'bottom'] });
  sill.translate(0, -h / 2 - f - 0.05, 0.08);
  parts.push(sill);
  // Mullion and transom as thin strips proud of the glass.
  const mull = boxGeo(0.07, h, 0.05, { skip: ['back', 'left', 'right', 'top', 'bottom'] });
  mull.translate(0, 0, 0.02);
  parts.push(mull);
  const trans = boxGeo(w, 0.06, 0.04, { skip: ['back', 'left', 'right', 'top', 'bottom'] });
  trans.translate(0, h * 0.18, 0.02);
  parts.push(trans);
  if (opts.dressed) {
    const shelf = boxGeo(w + f * 2 + 0.3, 0.12, 0.28, { skip: ['back', 'bottom'] });
    shelf.translate(0, h / 2 + f + 0.06, 0.1);
    parts.push(shelf);
  }
  return mergeAll(parts);
}

/** The glass of one window: a single quad, placed behind the frame. */
export function windowPane(w: number, h: number): THREE.BufferGeometry {
  return panel(w, h, 0);
}

/** The gable over a dressed window: a flat triangle above the head shelf. */
export function pedimentUnit(w: number, rise: number): THREE.BufferGeometry {
  const hw = w / 2;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-hw, 0, 0, hw, 0, 0, 0, rise, 0], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([-hw, 0, hw, 0, 0, rise], 2));
  g.setIndex([0, 1, 2]);
  g.computeVertexNormals();
  return g;
}

/**
 * A pilaster between bays: shaft, moulded base and capital. Three boxes at this distance read as
 * a classical order; the fluting does not survive 60 m.
 */
export function pilasterUnit(width: number, height: number, depth = 0.22): THREE.BufferGeometry {
  const baseH = 0.42;
  const capH = 0.5;
  const shaft = boxGeo(width, height - baseH - capH, depth, { skip: ['back'] });
  shaft.translate(0, baseH + (height - baseH - capH) / 2, depth / 2);
  const base = boxGeo(width + 0.14, baseH, depth + 0.12, { skip: ['back'] });
  base.translate(0, baseH / 2, (depth + 0.12) / 2);
  const cap = boxGeo(width + 0.2, capH, depth + 0.2, { skip: ['back'] });
  cap.translate(0, height - capH / 2, (depth + 0.2) / 2);
  return mergeAll([shaft, base, cap]);
}

/** A plinth course running the length of a wall. */
export function plinthRun(length: number): THREE.BufferGeometry {
  const g = boxGeo(length, PLINTH.height, 0.5, { skip: ['back'] });
  g.translate(0, PLINTH.height / 2, PLINTH.proud);
  return g;
}

/** A moulded string course between storeys. */
export function stringCourse(length: number, height = STRING_COURSE.height, proud = STRING_COURSE.proud): THREE.BufferGeometry {
  const a = boxGeo(length, height * 0.45, proud * 0.6, { skip: ['back'] });
  a.translate(0, height * 0.22, proud * 0.3);
  const b = boxGeo(length, height * 0.55, proud, { skip: ['back'] });
  b.translate(0, height * 0.7, proud / 2);
  return mergeAll([a, b]);
}

/**
 * The main cornice: a stepped corona with a bed mould, projecting CORNICE_BAND.proud. Optional
 * dentils are only worth their triangles on the elevations you can walk up to.
 */
export function corniceRun(length: number, opts: { dentils?: boolean; scale?: number } = {}): THREE.BufferGeometry {
  const s = opts.scale ?? 1;
  const H = CORNICE_BAND.height * s;
  const P = CORNICE_BAND.proud * s;
  /** [start fraction, end fraction, projection fraction] up the profile. */
  const steps: Array<[number, number, number]> = [
    [0.0, 0.22, 0.4],
    [0.22, 0.34, 0.62],
    [0.34, 0.46, 0.9],
    [0.46, 0.68, 1.0],
    [0.68, 0.78, 0.82],
    [0.78, 1.0, 1.0],
  ];
  const parts: THREE.BufferGeometry[] = [];
  let y = 0;
  for (const [from, to, proj] of steps) {
    const h = (to - from) * H;
    const b = boxGeo(length, h, P * proj, { skip: ['back'] });
    b.translate(0, y + h / 2, 0);
    parts.push(b);
    y += h;
  }
  if (opts.dentils) {
    const step = 0.5;
    const count = Math.max(2, Math.floor(length / step));
    for (let i = 0; i < count; i++) {
      const x = -length / 2 + (length / count) * (i + 0.5);
      const d = boxGeo((length / count) * 0.45, H * 0.16, P * 0.55, { skip: ['back', 'bottom'] });
      d.translate(x, H * 0.28, P * 0.62);
      parts.push(d);
    }
  }
  return mergeAll(parts);
}

/**
 * A stone balustrade along the cornice line: plinth, pierced baluster row and a moulded handrail.
 * Balusters are 60 mm slabs, which is what a 1,500 m run of them costs if you want the silhouette.
 */
export function balustradeRun(length: number, opts: { spacing?: number; height?: number } = {}): THREE.BufferGeometry {
  const h = opts.height ?? 1.0;
  const spacing = opts.spacing ?? 0.62;
  const parts: THREE.BufferGeometry[] = [];
  const plinth = boxGeo(length, h * 0.2, 0.34, { skip: ['back', 'bottom'] });
  plinth.translate(0, h * 0.1, 0.17);
  parts.push(plinth);
  const rail = boxGeo(length, h * 0.18, 0.4, { skip: ['back', 'bottom'] });
  rail.translate(0, h * 0.82, 0.2);
  parts.push(rail);
  const cap = boxGeo(length, h * 0.1, 0.46, { skip: ['back', 'bottom'] });
  cap.translate(0, h * 0.95, 0.23);
  parts.push(cap);
  const count = Math.max(2, Math.floor(length / spacing));
  const step = length / count;
  const balW = 0.075;
  const balH = h * 0.62;
  for (let i = 0; i < count; i++) {
    const x = -length / 2 + step * (i + 0.5);
    const b = boxGeo(balW, balH, 0.11, { skip: ['back'] });
    b.translate(x, h * 0.2 + balH / 2, 0.14);
    parts.push(b);
  }
  return mergeAll(parts);
}

/** A dormer in the mansard: a stone cheek, a gable and a dark window. */
export function dormerUnit(w: number, h: number, depth: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const cheek = boxGeo(w, h, depth, { skip: ['back', 'bottom'] });
  cheek.translate(0, h / 2, depth / 2);
  parts.push(cheek);
  const gable = boxGeo(w + 0.24, 0.14, depth + 0.16, { skip: ['back', 'bottom'] });
  gable.translate(0, h + 0.07, (depth + 0.16) / 2);
  parts.push(gable);
  // Two raking cheeks give the gable its triangular profile without a full prism.
  for (const side of [-1, 1]) {
    const rake = boxGeo(0.1, 0.55, depth + 0.1, { skip: ['back'] });
    rake.rotateZ(side * 0.55);
    rake.translate(side * (w / 2 - 0.02), h + 0.2, (depth + 0.1) / 2);
    parts.push(rake);
  }
  return mergeAll(parts);
}

/** Chimney stack with its capping course. */
export function chimneyUnit(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const stack = boxGeo(0.9, 1.7, 0.75, { skip: ['bottom'] });
  stack.translate(0, 0.85, 0);
  parts.push(stack);
  const cap = boxGeo(1.06, 0.16, 0.9, { skip: ['bottom'] });
  cap.translate(0, 1.78, 0);
  parts.push(cap);
  for (const x of [-0.24, 0.24]) {
    const pot = boxGeo(0.24, 0.34, 0.24, { skip: ['bottom'] });
    pot.translate(x, 2.03, 0);
    parts.push(pot);
  }
  return mergeAll(parts);
}

/**
 * A statue niche on the ground floor of a court elevation: the arched recess and the figure that
 * stands in it, reduced to a silhouette — deep shadow and a pale block.
 */
export function nicheUnit(w: number, h: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const arch = new THREE.Shape();
  arch.absarc(0, 0, w / 2, 0, Math.PI, false);
  arch.lineTo(-w / 2, -h);
  arch.lineTo(w / 2, -h);
  arch.closePath();
  const recess = new THREE.ExtrudeGeometry(arch, { depth: 0.5, bevelEnabled: false, curveSegments: 10 });
  recess.translate(0, 0, -0.5);
  parts.push(recess);
  return mergeAll(parts);
}

/** One figure for a niche: a tapered body and a head, four triangles' worth of silhouette. */
export function statueUnit(height: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const body = new THREE.CylinderGeometry(0.19, 0.34, height * 0.78, 7, 1, false);
  body.translate(0, height * 0.39, 0);
  parts.push(body);
  const head = new THREE.SphereGeometry(height * 0.1, 7, 5);
  head.translate(0, height * 0.86, 0);
  parts.push(head);
  return mergeAll(parts);
}

/**
 * A giant order column for the Colonnade: base, shaft, capital, abacus. Eight radial segments
 * survive SwiftShader's flat shading and keep 54 coupled columns affordable.
 */
export function giantColumn(height: number, radius: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const plinth = boxGeo(radius * 2.5, height * 0.045, radius * 2.5);
  plinth.translate(0, height * 0.0225, 0);
  parts.push(plinth);
  const basePts: ProfilePoint[] = [
    [radius * 1.2, 0],
    [radius * 1.2, height * 0.02],
    [radius * 1.02, height * 0.05],
    [radius, height * 0.06],
  ];
  const base = new THREE.LatheGeometry(basePts.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y)), 8);
  base.translate(0, height * 0.045, 0);
  parts.push(base);
  const shaft = new THREE.CylinderGeometry(radius * 0.86, radius, height * 0.78, 8, 1, false);
  shaft.translate(0, height * 0.06 + height * 0.39, 0);
  parts.push(shaft);
  const capPts: ProfilePoint[] = [
    [radius * 0.86, 0],
    [radius * 0.95, height * 0.02],
    [radius * 1.24, height * 0.05],
    [radius * 1.3, height * 0.07],
  ];
  const cap = new THREE.LatheGeometry(capPts.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y)), 8);
  cap.translate(0, height * 0.84, 0);
  parts.push(cap);
  const abacus = boxGeo(radius * 2.7, height * 0.035, radius * 2.7);
  abacus.translate(0, height * 0.9, 0);
  parts.push(abacus);
  return mergeAll(parts);
}

/** A tree: trunk and three canopy masses. The Cour Napoléon rows read as one green band. */
export function treeUnit(height: number, rng: () => number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const trunkH = height * 0.42;
  const trunk = new THREE.CylinderGeometry(height * 0.022, height * 0.035, trunkH, 5, 1, false);
  trunk.translate(0, trunkH / 2, 0);
  parts.push(trunk);
  const canopyR = height * 0.3;
  const blobs: Array<[number, number, number, number]> = [
    [0, trunkH + canopyR * 0.55, 0, canopyR],
    [canopyR * 0.42, trunkH + canopyR * 0.9, canopyR * 0.2, canopyR * 0.74],
    [-canopyR * 0.4, trunkH + canopyR * 0.82, -canopyR * 0.24, canopyR * 0.7],
  ];
  for (const [x, y, z, r] of blobs) {
    const g = new THREE.IcosahedronGeometry(r, 0);
    g.scale(1.08, 0.9, 1.08);
    g.translate(x + (rng() - 0.5) * 0.4, y, z + (rng() - 0.5) * 0.4);
    parts.push(g);
  }
  return mergeAll(parts);
}

/**
 * Light baked into vertex colours, in world space, applied after the zone's meshes are merged.
 *
 * No realtime shadows in this project, so the building's form has to come from here: a key light
 * from the south-west and above, contact darkening toward the ground, and a slight darkening on
 * faces turned away from the sky. Without this a mansard reads as cardboard.
 */
const LIGHT = new THREE.Vector3(-0.42, 0.66, 0.62).normalize();

export function bakeWorldLight(group: THREE.Object3D): void {
  group.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || o instanceof THREE.InstancedMesh) return;
    const geo = o.geometry;
    if (!geo || !geo.attributes.normal) return;
    bakeAo(geo, (x, y, _z, nx, ny, nz) => {
      const lambert = 0.78 + 0.22 * Math.max(0, nx * LIGHT.x + ny * LIGHT.y + nz * LIGHT.z);
      // Contact darkening at the foot of the wall, and a touch of sky lift on the roof.
      const foot = 0.82 + 0.18 * smoothstep(0, 6, y);
      const crown = 1 + 0.05 * smoothstep(20.4, 28.7, y);
      return lambert * foot * crown;
    });
  });
}

/** Multiply a unit's brightness into its own vertex colours (for instanced units). */
export function shadeUnit(geo: THREE.BufferGeometry, factor: number): THREE.BufferGeometry {
  const col = geo.attributes.color as THREE.BufferAttribute | undefined;
  if (!col) return geo;
  for (let i = 0; i < col.count; i++) {
    col.setXYZ(i, col.getX(i) * factor, col.getY(i) * factor, col.getZ(i) * factor);
  }
  col.needsUpdate = true;
  return geo;
}

/**
 * Collects one instanced mesh per repeated element for the whole zone, so a pilaster on the
 * Rivoli front and a pilaster in the Cour Carrée are the same draw call.
 */
export class InstanceSink {
  private readonly sets = new Map<string, { unit: THREE.BufferGeometry; material: string; transforms: THREE.Matrix4[] }>();

  add(key: string, unit: THREE.BufferGeometry, material: string, transform: THREE.Matrix4): void {
    let set = this.sets.get(key);
    if (!set) {
      set = { unit, material, transforms: [] };
      this.sets.set(key, set);
    }
    set.transforms.push(transform);
  }

  get size(): number {
    let n = 0;
    for (const set of this.sets.values()) n += set.transforms.length;
    return n;
  }

  keys(): string[] {
    return [...this.sets.keys()];
  }

  build(name = 'exterior/instanced'): THREE.Group {
    const group = new THREE.Group();
    group.name = name;
    for (const [key, set] of this.sets) {
      if (set.transforms.length === 0) continue;
      const mesh = instanced(set.unit, set.transforms, set.material);
      mesh.name = 'instanced:' + key;
      group.add(mesh);
    }
    return group;
  }
}

/** Shorthand for a mesh with a palette material (merged later, never per-part materials). */
export function solid(geo: THREE.BufferGeometry, material: string): THREE.Mesh {
  return new THREE.Mesh(geo, mat(material));
}

export const WHITE_VERTEX = WHITE;

/** A plain projecting band: a stylobate, a pedestal course, an entablature's architrave. */
export function pedestalRun(length: number, height: number, proud: number): THREE.BufferGeometry {
  const g = boxGeo(length, height, proud, { skip: ['back', 'bottom'] });
  g.translate(0, height / 2, proud / 2);
  return g;
}

/**
 * A flat quad lying in the XZ plane with UVs in metres. `THREE.PlaneGeometry` emits 0..1 UVs, so a
 * 1,800 m ground plane would show a single texel of its stone; every ground surface here uses this
 * instead, and the texture tiles the way the builders' walls do.
 */
export function groundQuad(x0: number, x1: number, z0: number, z1: number, y = 0): THREE.BufferGeometry {
  return quadGeo(
    [x0, y, z1],
    [x1, y, z1],
    [x1, y, z0],
    [x0, y, z0],
    [[x0, z1], [x1, z1], [x1, z0], [x0, z0]],
  );
}

/**
 * The palette's zinc roof and gold leaf carry `metalness` for interiors lit by an environment. Out
 * here there is no environment map, and a metal with nothing to reflect renders black: the meas-
 * ured frame had the mansard at RGB 26,32,39. These are the same palette colours, at the low
 * metalness an exterior daylight pass needs.
 */
export const ROOF_ZINC = 'exterior.zinc';
export const ORNAMENT_GOLD = 'exterior.gold';

export function exteriorMaterial(name: string): THREE.Material {
  if (name === ROOF_ZINC) return mat('context.zinc-roof', { metalness: 0.06, roughness: 0.62 });
  if (name === ORNAMENT_GOLD) return mat('gold.leaf', { metalness: 0.12, roughness: 0.42 });
  return mat(name);
}
