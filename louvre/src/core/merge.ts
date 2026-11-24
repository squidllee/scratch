import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mat } from './materials';
import type { BuildParts, Part } from './builders/types';
import { isInstanced } from './builders/types';

/**
 * Draw-call discipline. A zone builds tens or hundreds of small pieces; `mergeByMaterial` folds
 * them into one mesh per material so the whole zone costs one draw call per palette entry.
 */

function normalise(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  for (const key of Object.keys(geo.attributes)) {
    if (key !== 'position' && key !== 'normal' && key !== 'uv' && key !== 'color') geo.deleteAttribute(key);
  }
  if (!geo.attributes.uv) {
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
  }
  if (!geo.attributes.normal) geo.computeVertexNormals();
  if (!geo.attributes.color) {
    const n = geo.attributes.position.count;
    const arr = new Float32Array(n * 3);
    arr.fill(1);
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  }
  if (!geo.index) {
    const n = geo.attributes.position.count;
    const idx = new Uint32Array(n);
    for (let i = 0; i < n; i++) idx[i] = i;
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
  }
  return geo;
}

/** One InstancedMesh from a unit geometry and a list of transforms. */
export function instanced(
  unit: THREE.BufferGeometry,
  transforms: THREE.Matrix4[],
  materialName: string,
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(normalise(unit), mat(materialName), transforms.length);
  transforms.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  return mesh;
}

/** Add one part (a geometry or an instanced set) to a parent under a material name. */
export function addPart(parent: THREE.Object3D, part: Part, materialName: string, name?: string): THREE.Object3D {
  if (isInstanced(part)) {
    const mesh = instanced(part.unit, part.transforms, materialName);
    if (name) mesh.name = name;
    parent.add(mesh);
    return mesh;
  }
  const mesh = new THREE.Mesh(part, mat(materialName));
  if (name) mesh.name = name;
  parent.add(mesh);
  return mesh;
}

/**
 * Add a builder result. A single geometry takes `materialName`; a record of parts keyed by
 * palette name (windows, skylights, frames) uses its keys, unless `override` renames them.
 */
export function addParts(
  parent: THREE.Object3D,
  parts: BufferGeometryPart | BuildParts,
  materialName?: string,
  override: Record<string, string> = {},
): void {
  if (!isBuildParts(parts)) {
    addPart(parent, parts as Part, materialName ?? 'wall.white-plaster');
    return;
  }
  for (const [key, part] of Object.entries(parts)) {
    if (!part) continue;
    addPart(parent, part, override[key] ?? key);
  }
}

export type BufferGeometryPart = THREE.BufferGeometry;

function isBuildParts(p: unknown): p is BuildParts {
  if (!p || p instanceof THREE.BufferGeometry) return false;
  return !isInstanced(p as Part);
}

/** Position, rotate about Y, and place a geometry-bearing object on the scene. */
export function place(
  parent: THREE.Object3D,
  geo: Part,
  materialName: string,
  position: [number, number, number],
  rotationY = 0,
): THREE.Object3D {
  const mesh = addPart(parent, geo, materialName);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.rotation.y = rotationY;
  return mesh;
}

export interface MergeStats {
  before: number;
  after: number;
  triangles: number;
}

/**
 * Collapse every mesh under `root` into one mesh per material, baking each mesh's world
 * transform into the merged geometry. Instanced meshes are left alone (they are already one draw
 * call). Returns a fresh group; the original is emptied and its geometries disposed.
 */
export function mergeByMaterial(root: THREE.Object3D): { group: THREE.Group; stats: MergeStats } {
  root.updateMatrixWorld(true);
  const byMaterial = new Map<string, { material: THREE.Material; geos: THREE.BufferGeometry[] }>();
  const instancedKept: THREE.Object3D[] = [];
  let before = 0;

  const walk = (obj: THREE.Object3D): void => {
    for (const child of [...obj.children]) {
      if (child instanceof THREE.InstancedMesh) {
        before++;
        // An InstancedMesh already carries its own transforms per instance, but the transforms of
        // its ancestors (the group a zone positioned the row in) are not part of them. Bake the
        // world matrix into every instance matrix so the merged copy lands where the original did.
        const baked = new THREE.InstancedMesh(
          normalise(child.geometry.clone()),
          Array.isArray(child.material) ? child.material[0] : child.material,
          child.count,
        );
        const m = new THREE.Matrix4();
        for (let i = 0; i < child.count; i++) {
          child.getMatrixAt(i, m);
          m.premultiply(child.matrixWorld);
          baked.setMatrixAt(i, m);
        }
        baked.instanceMatrix.needsUpdate = true;
        baked.frustumCulled = false;
        baked.name = child.name || child.material.name;
        instancedKept.push(baked);
        continue;
      }
      if (child instanceof THREE.Mesh) {
        before++;
        const material = Array.isArray(child.material) ? child.material[0] : child.material;
        if (Array.isArray(child.material)) {
          console.warn('[merge] mesh with multiple materials merged with the first only:', child.name);
        }
        if (!material) continue;
        const key = material.uuid;
        let bucket = byMaterial.get(key);
        if (!bucket) {
          bucket = { material, geos: [] };
          byMaterial.set(key, bucket);
        }
        const geo = normalise(child.geometry.clone());
        geo.applyMatrix4(child.matrixWorld);
        bucket.geos.push(geo);
        continue;
      }
      if (child.children.length) walk(child);
    }
  };
  walk(root);

  const group = new THREE.Group();
  group.name = root.name + ':merged';
  let triangles = 0;
  for (const bucket of byMaterial.values()) {
    const merged = bucket.geos.length === 1 ? (bucket.geos[0] as THREE.BufferGeometry) : mergeGeometries(bucket.geos, false);
    if (!merged) {
      console.warn('[merge] incompatible geometries for material', bucket.material.name);
      continue;
    }
    if (bucket.geos.length > 1) for (const g of bucket.geos) g.dispose();
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, bucket.material);
    mesh.name = bucket.material.name;
    mesh.matrixAutoUpdate = true;
    triangles += merged.index ? merged.index.count / 3 : merged.attributes.position.count / 3;
    group.add(mesh);
  }
  for (const im of instancedKept) {
    const list = im as THREE.InstancedMesh;
    triangles += (list.geometry.index ? list.geometry.index.count / 3 : list.geometry.attributes.position.count / 3) * list.count;
    group.add(list);
  }

  root.traverse((o) => {
    if (o instanceof THREE.Mesh && o.geometry) o.geometry.dispose();
  });
  root.clear();

  return { group, stats: { before, after: group.children.length, triangles } };
}
