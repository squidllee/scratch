/**
 * The per-work texture table: real size, planned canvas, texels per centimetre and bytes.
 *
 * `npm run`-less on purpose — it is a pure function of the catalog, so the README, the verify page
 * and the perf report all quote the same numbers instead of rounding differently.
 */
import { ARTWORK_DEFS, type ArtworkDef } from '../catalog';
import { canvasPlan, texelDensity } from './index';

export interface CanvasRow {
  id: string;
  kind: string;
  widthCm: number;
  heightCm: number;
  pxW: number;
  pxH: number;
  texelsPerCm: number;
  bytes: number;
}

export function canvasInventory(): CanvasRow[] {
  return ARTWORK_DEFS.filter((d) => d.kind === 'painting' || d.kind === 'ceiling-painting').map((d: ArtworkDef) => {
    const plan = canvasPlan(d.sizeCm);
    const density = texelDensity(d.sizeCm[0] * d.sizeCm[1]);
    return {
      id: d.id,
      kind: d.kind,
      widthCm: d.sizeCm[0],
      heightCm: d.sizeCm[1],
      pxW: plan.width,
      pxH: plan.height,
      texelsPerCm: Math.round(density * 100) / 100,
      bytes: Math.round(plan.width * plan.height * 4 * 1.34),
    };
  });
}

export function inventoryTotal(): { bytes: number; rows: number } {
  const rows = canvasInventory();
  return { bytes: rows.reduce((a, r) => a + r.bytes, 0), rows: rows.length };
}
