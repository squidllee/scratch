import spec from './palette.json';

/**
 * The material vocabulary, straight from the measured spec
 * (captain drive: handoffs/louvre/spec/palette.json). 56 semantic names grouped by surface:
 *
 *   wall.red-madder  floor.parquet-versailles  ceiling.plaster-white  trim.gilt
 *   marble.blanc-carrare  stone.limestone-warm  gold.leaf  glass.skylight-clear  wood.oak ...
 *
 * Hex values are art direction sampled by eye, not spectrophotometer readings — see the
 * provenance string in palette.json. Nothing in the project hard-codes a colour outside this file.
 *
 * Every zone uses these keys verbatim. `zones.<zone>` in palette.json lists the four base
 * materials a zone must treat as its defaults.
 */
interface ColourEntry {
  hex: string;
  name: string;
  where?: string;
}

type Groups = Record<string, Record<string, ColourEntry> | string[]>;

const groups = spec as unknown as Groups;

/** Flat map: 'wall.red-madder' -> '#7C2A26'. */
export const PALETTE: Record<string, string> = {};
/** Human names, for HUDs and reports. */
export const PALETTE_LABELS: Record<string, string> = {};
/** Which group each key belongs to. */
export const PALETTE_GROUP: Record<string, string> = {};

for (const [group, entries] of Object.entries(groups)) {
  if (!entries || Array.isArray(entries)) continue;
  for (const [key, value] of Object.entries(entries)) {
    if (!value || typeof value !== 'object' || !('hex' in value)) continue;
    const id = group + '.' + key;
    PALETTE[id] = String((value as ColourEntry).hex).toUpperCase();
    PALETTE_LABELS[id] = (value as ColourEntry).name;
    PALETTE_GROUP[id] = group;
  }
}

/**
 * Engine materials that are not surfaces of the building: the blank canvas behind a placeholder
 * artwork, and the unlit card used for light fixtures. Kept separate so the palette stays a pure
 * record of the museum.
 */
export const ENGINE_MATERIALS: Record<string, string> = {
  'app.canvas-placeholder': '#8F8A7B',
  'app.light-card': '#F4F1E6',
};

export const MATERIAL_NAMES: string[] = [...Object.keys(PALETTE), ...Object.keys(ENGINE_MATERIALS)];

export type MaterialName = string;

const parsed = new Map<string, number>();
function hexToInt(hex: string): number {
  const cached = parsed.get(hex);
  if (cached !== undefined) return cached;
  const v = parseInt(hex.replace('#', ''), 16);
  parsed.set(hex, v);
  return v;
}

export function hexOf(name: string): string {
  return PALETTE[name] ?? ENGINE_MATERIALS[name] ?? (name.startsWith('#') ? name : '#808080');
}

/** Packed sRGB integer for a material name (or a raw #rrggbb). */
export function colorOf(name: string): number {
  return hexToInt(hexOf(name));
}

/** Linear-space float triple, optionally shaded; used when baking vertex colours by hand. */
export function linearOf(name: string, shade = 1): [number, number, number] {
  const v = hexToInt(hexOf(name));
  const toLin = (c: number): number => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return [toLin((v >> 16) & 255) * shade, toLin((v >> 8) & 255) * shade, toLin(v & 255) * shade];
}

/** The four base materials a zone's palette names, e.g. zonePalette('denon'). */
export function zonePalette(zone: string): string[] {
  const z = groups.zones;
  if (!z || Array.isArray(z)) return [];
  const list = (z as unknown as Record<string, string[]>)[zone];
  return Array.isArray(list) ? list : [];
}
