/**
 * The artworks library — public entry.
 *
 * Zones place art by id through `src/artworks/library.ts` (`placeArtwork`), which already resolves
 * ids to these factories; nothing needs wiring for that. Import this module when you want the
 * catalog, the texture ledger, or a direct build:
 *
 *   import { ARTWORK_IDS, createArtwork, textureBytes } from '../../artworks';
 */
import { rng } from '../core/rng';
import { ARTWORK_BY_ID, ARTWORK_DEFS, ARTWORK_IDS, type ArtworkDef } from './catalog';
import { registerArtwork } from './library';
import { canvasPlan, paintSurface, texelDensity } from './paint/index';
import { canvasInventory, inventoryTotal } from './paint/inventory';
import { createArtwork, FACTORY_IDS, hasArtwork, registerAll } from './registry';
import { textureBytes, textureLedger } from './textures';

registerAll(registerArtwork);

export {
  ARTWORK_BY_ID,
  ARTWORK_DEFS,
  ARTWORK_IDS,
  FACTORY_IDS,
  canvasInventory,
  canvasPlan,
  createArtwork,
  hasArtwork,
  inventoryTotal,
  paintSurface,
  texelDensity,
  textureBytes,
  textureLedger,
};
export type { ArtworkDef };

/** Paint one work and hand back its canvas, for verification runs that inspect pixels. */
export function renderToCanvas(id: string, seed = 'verify'): { canvas: HTMLCanvasElement; def: ArtworkDef } | null {
  const def = ARTWORK_BY_ID.get(id);
  if (!def) return null;
  const { canvas } = paintSurface(def, rng(seed + '/' + id));
  return { canvas, def };
}

/** What the library holds and what it costs, for a report or a HUD line. */
export function librarySummary(): {
  works: number;
  factories: number;
  textures: number;
  textureMB: number;
  canvasMB: number;
} {
  const inv = inventoryTotal();
  return {
    works: ARTWORK_IDS.length,
    factories: FACTORY_IDS.length,
    textures: textureLedger().length,
    textureMB: Math.round((textureBytes() / (1024 * 1024)) * 100) / 100,
    canvasMB: Math.round((inv.bytes / (1024 * 1024)) * 100) / 100,
  };
}
