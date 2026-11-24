import * as THREE from 'three';
import { boxGeo, quadGeo } from '../../core/geom';
import { put, vaultBar, vaultPurlin, vaultSurface } from './parts';
import type { Cell } from './layout';

/**
 * The glazed roofs over the three courts.
 *
 * The real roofs are Pei/Macary cable-net vaults: stainless tubes on a net, 650-odd facet types,
 * aluminium louvers 21 mm under the glass. None of that survives a triangle budget, so what is
 * modelled is what a visitor actually reads from the floor: a deep lattice of primary trusses, a
 * grid of glazing bars, and the vault's shallow curve against the sky. The louvers are not built —
 * their effect is in the baked floor light instead, as soft bands.
 *
 * The vault springs from a stone kerb and crowns inside the zone's 20.4 m ceiling cap: the real
 * roof rises 7 m above the cornice, which belongs to the roof zone (`exterior`) in our plan.
 */
export interface GlazedRoofOptions {
  cell: Cell;
  /** Height of the springing (the stone kerb the glass sits on). */
  spring: number;
  /** Rise to the crown. */
  rise: number;
  trusses: number;
  purlins: number;
  segments: number;
}

export function glazedRoof(parent: THREE.Object3D, o: GlazedRoofOptions): void {
  const { cell, spring, rise, trusses, purlins } = o;
  const cx = (cell.x0 + cell.x1) / 2;
  const cz = (cell.z0 + cell.z1) / 2;
  const width = cell.x1 - cell.x0;
  const span = cell.z1 - cell.z0;

  // Kerb: the stone beam the glazing springs from, on all four sides.
  const kerb = 0.46;
  put(parent, boxGeo(width + kerb * 2, 0.5, kerb), 'trim.stone-limestone-warm', [cx, spring - 0.25, cell.z0 - kerb / 2]);
  put(parent, boxGeo(width + kerb * 2, 0.5, kerb), 'trim.stone-limestone-warm', [cx, spring - 0.25, cell.z1 + kerb / 2]);
  put(parent, boxGeo(kerb, 0.5, span), 'trim.stone-limestone-warm', [cell.x0 - kerb / 2, spring - 0.25, cz]);
  put(parent, boxGeo(kerb, 0.5, span), 'trim.stone-limestone-warm', [cell.x1 + kerb / 2, spring - 0.25, cz]);

  // The glazing: one subdivided sheet following the vault, so the sky shows through the bars.
  const glass = vaultSurface({ width, span, rise, nx: Math.max(8, Math.round(width / 3.2)), nz: Math.max(8, Math.round(span / 2.6)) });
  put(parent, glass, 'glass.skylight-clear', [cx, spring, cz]);

  // Primary trusses across the short axis, and the glazing grid over them.
  const trussParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < trusses; i++) {
    const x = -width / 2 + (width * (i + 0.5)) / trusses;
    trussParts.push(vaultBar({ span, rise, segments: o.segments, width: 0.22, depth: 0.46, x }));
  }
  const truss = trussParts.length === 1 ? trussParts[0] : mergeLoose(trussParts);
  put(parent, truss, 'context.zinc-roof', [cx, spring, cz]);

  const purlinParts: THREE.BufferGeometry[] = [];
  for (let j = 0; j <= purlins; j++) {
    const z = -span / 2 + (span * j) / purlins;
    if (j === 0 || j === purlins) continue;
    purlinParts.push(vaultPurlin({ width, span, rise, z, thickness: 0.1 }));
  }
  const purlin = purlinParts.length === 1 ? purlinParts[0] : mergeLoose(purlinParts);
  put(parent, purlin, 'gold.bronze-tarnished', [cx, spring, cz]);

  // The daylight itself: a light card above the glass so the roof reads as open to the sky.
  const card = quadGeo(
    [-width / 2 + 0.4, 0, span / 2 - 0.4],
    [width / 2 - 0.4, 0, span / 2 - 0.4],
    [width / 2 - 0.4, 0, -span / 2 + 0.4],
    [-width / 2 + 0.4, 0, -span / 2 + 0.4],
    [[0, 0], [width, 0], [width, span], [0, span]],
  );
  put(parent, card, 'app.light-card', [cx, spring + rise + 0.02, cz]);
}

/** Merge geometries that only share position/normal/uv/color (avoid importing the whole merge lib). */
function mergeLoose(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = new THREE.BufferGeometry();
  let total = 0;
  let indexTotal = 0;
  for (const g of geos) {
    total += g.attributes.position!.count;
    indexTotal += g.index ? g.index.count : g.attributes.position!.count;
  }
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  const uv = new Float32Array(total * 2);
  const col = new Float32Array(total * 3);
  const idx = new Uint32Array(indexTotal);
  let vo = 0;
  let io = 0;
  for (const g of geos) {
    const p = g.attributes.position!;
    const n = g.attributes.normal!;
    const u = g.attributes.uv!;
    const c = g.attributes.color!;
    pos.set(p.array as Float32Array, vo * 3);
    nor.set(n.array as Float32Array, vo * 3);
    uv.set(u.array as Float32Array, vo * 2);
    col.set(c.array as Float32Array, vo * 3);
    const count = p.count;
    if (g.index) {
      for (let i = 0; i < g.index.count; i++) idx[io + i] = (g.index.getX(i) as number) + vo;
      io += g.index.count;
    } else {
      for (let i = 0; i < count; i++) idx[io + i] = vo + i;
      io += count;
    }
    vo += count;
    g.dispose();
  }
  merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  merged.setAttribute('color', new THREE.BufferAttribute(col, 3));
  merged.setIndex(new THREE.BufferAttribute(idx, 1));
  return merged;
}
