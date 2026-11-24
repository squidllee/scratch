/**
 * The exterior zone's plan, in world metres.
 *
 * Every number here is either measured (geometry.md / coordinates.md in the spec) or derived
 * from a measured number by the arithmetic in the comment beside it. `assertPlan()` re-checks the
 * whole thing at zone build time and throws rather than let a wrong building render.
 *
 * Frame: metres, +X east, +Y up, +Z south. Origin at the centre of the Pyramid's base.
 * Cour Napoléon paving is y = 0, the cornice is y = 20.4 on every wing.
 */

/** Vertical key heights (geometry.md §8). */
export const Y = {
  ground: 0,
  /** Storey divisions: three storeys back-solved to land on the 20.4 m cornice. */
  storey2: 7.0,
  storey3: 13.6,
  cornice: 20.4,
  /** Mansard: 6.0 m at 70°, then 2.3 m at 25° -> derived ridge 28.7 m. */
  mansardLower: 6.0,
  mansardUpper: 2.3,
  ridge: 28.7,
  pavilion: 40.0,
  /** The zone box ceiling (coordinates.md §3). Nothing here goes above it. */
  top: 42.0,
} as const;

export const MANSARD = {
  lowerDeg: 70,
  upperDeg: 25,
  /** Horizontal run of each slope, derived from its rise and angle. */
  lowerRun: Y.mansardLower / Math.tan((70 * Math.PI) / 180),
  upperRun: Y.mansardUpper / Math.tan((25 * Math.PI) / 180),
  /** Eaves inset from the mass edge: the cornice projects, the roof starts behind it. */
  eaves: 0.28,
} as const;

/** Cour Napoléon: 200 x 141 m between the building lines; 28,000 m2 measured (our 200 x 140 split). */
export const COURT = { x0: -84, x1: 116, z0: -70.5, z1: 70.5 } as const;

/** Cour Carrée: 160 m outer, 112.5 m inner court, so each wing is (160 - 112.5) / 2 = 23.75 m. */
export const CARREE = {
  x0: 116,
  x1: 276,
  z0: -80,
  z1: 80,
  outer: 160,
  inner: 112.5,
  wing: (160 - 112.5) / 2,
  /** Inner court faces. */
  ix0: 116 + (160 - 112.5) / 2,
  ix1: 276 - (160 - 112.5) / 2,
  iz0: -112.5 / 2,
  iz1: 112.5 / 2,
} as const;

/** Perrault's Colonnade: 183 m on the east face, projecting (183 - 160) / 2 = 11.5 m at each end. */
export const COLONNADE = {
  x: 276,
  z0: -183 / 2,
  z1: 183 / 2,
  length: 183,
  bays: 27,
  bay: 183 / 27,
  projection: (183 - 160) / 2,
  /** Coupled giant columns: two per bay. */
  columns: 27 * 2,
  /** Central pediment block, 17.5 m of stone per geometry.md §5. */
  pedimentLength: 17.5,
} as const;

/** Grande Galerie museum room: 288 m of Seine frontage at 52 bays of 5.538 m. */
export const GALERIE = { x0: -172, x1: 116, z0: 141, z1: 154, bays: 52 } as const;

export interface Mass {
  id: string;
  x: [number, number];
  z: [number, number];
  /** False for a court or a glazed courtyard another zone roofs. */
  roofed: boolean;
  /**
   * Roof form. `mansard` is the Parisian mansard ring; `flat` is a glazed court cap (never used
   * here); `round` is the Rotonde d'Apollon's drum and dome.
   */
  form?: 'mansard' | 'round' | 'flat';
}

/**
 * The solid building. Roofs are built over exactly these rectangles, so a court is open sky and
 * a range is covered. Checked against route.json's room footprints by `assertPlan()`.
 */
export const MASSES: Mass[] = [
  // Denon: the Cour Napoléon range, the Seine range, their links, and the two internal courts.
  { id: 'denon-court-range', x: [-172, 116], z: [70.5, 96], roofed: true },
  { id: 'denon-seine-range', x: [-172, 116], z: [141, 154], roofed: true },
  { id: 'denon-sessions-link', x: [-68, -48], z: [96, 141], roofed: true },
  { id: 'denon-east-link', x: [72, 116], z: [96, 141], roofed: true },
  // Richelieu: court side, Rivoli side, the east block, and the passage spine between the courts.
  { id: 'richelieu-court-range', x: [-84, 116], z: [-88, -70.5], roofed: true },
  { id: 'richelieu-rivoli-range', x: [-84, 116], z: [-141, -129], roofed: true },
  { id: 'richelieu-east-block', x: [66, 116], z: [-129, -88], roofed: true },
  { id: 'richelieu-passage-spine', x: [-30, -16], z: [-129, -88], roofed: true },
  // Sully ring: four wings of 23.75 m around the Cour Carrée. These tile the ring: the north and
  // south ranges run only between the west and east ranges, which own the corners. The ring's
  // roofs below span the full 160 m instead, so no two mansards share a plateau.
  { id: 'sully-west', x: [116, 139.75], z: [-80, 80], roofed: true },
  { id: 'sully-north', x: [139.75, 252.25], z: [-80, -56.25], roofed: true },
  { id: 'sully-south', x: [139.75, 252.25], z: [56.25, 80], roofed: true },
  { id: 'sully-east-colonnade', x: [252.25, 276], z: [-91.5, 91.5], roofed: true },
  // Petite Galerie and the Rotonde d'Apollon at its south end.
  { id: 'petite-galerie', x: [116, 133], z: [80, 141], roofed: true },
  { id: 'rotonde-apollon', x: [116, 133], z: [141, 154], roofed: true, form: 'round' },
];

/**
 * Roof rectangles. The ring's north and south roofs span the full 160 m while its west and east
 * ranges are roofed only between them, so no two mansards share a plateau. The Rotonde is a drum
 * and is built by its own builder, not as a rectangle.
 */
export function roofRects(): Array<{ id: string; x: [number, number]; z: [number, number] }> {
  return [
    { id: 'denon-court-range', x: [-172, 116], z: [70.5, 96] },
    { id: 'denon-seine-range', x: [-172, 116], z: [141, 154] },
    { id: 'denon-sessions-link', x: [-68, -48], z: [96, 141] },
    { id: 'denon-east-link', x: [72, 116], z: [96, 141] },
    { id: 'richelieu-court-range', x: [-84, 116], z: [-88, -70.5] },
    { id: 'richelieu-rivoli-range', x: [-84, 116], z: [-141, -129] },
    { id: 'richelieu-east-block', x: [66, 116], z: [-129, -88] },
    { id: 'richelieu-passage-spine', x: [-30, -16], z: [-129, -88] },
    { id: 'sully-north-roof', x: [116, 276], z: [-80, -56.25] },
    { id: 'sully-south-roof', x: [116, 276], z: [56.25, 80] },
    { id: 'sully-west-roof', x: [116, 139.75], z: [-56.25, 56.25] },
    { id: 'sully-east-roof', x: [252.25, 276], z: [-56.25, 56.25] },
    { id: 'colonnade-end-roof-n', x: [252.25, 276], z: [-91.5, -80] },
    { id: 'colonnade-end-roof-s', x: [252.25, 276], z: [80, 91.5] },
    { id: 'petite-galerie-roof', x: [116, 133], z: [80, 141] },
  ];
}

export type Layer = 'courts' | 'outer';

export type RunStyle = 'court' | 'seafront' | 'plain' | 'inner';

export interface RunSpec {
  id: string;
  /** The axis the wall runs along in world space. */
  axis: 'x' | 'z';
  /** The other plan coordinate: z for an 'x' run, x for a 'z' run. */
  line: number;
  from: number;
  to: number;
  /** Which way the façade looks: +1 or -1 along the axis normal to `axis`. */
  out: 1 | -1;
  /** Number of bays. Bay width is length / bays, so the rhythm always closes on the corner. */
  bays: number;
  style: RunStyle;
  layer: Layer;
  /** Which storeys exist: the wings have three, low links only two. */
  storeys?: 2 | 3;
  /** Suppress dormers where the elevation stands proud of the roof behind it (pavilions, avant-corps). */
  noDormers?: boolean;
}

/**
 * Every exposed elevation. Order matches the walk around the building: Cour Napoléon first, then
 * the Seine, Rivoli, and the Cour Carrée ring.
 */
export const RUNS: RunSpec[] = [
  // --- Cour Napoléon ---------------------------------------------------------
  { id: 'denon-cour', axis: 'x', line: 70.5, from: -172, to: 116, out: -1, bays: GALERIE.bays, style: 'court', layer: 'courts' },
  { id: 'richelieu-cour', axis: 'x', line: -70.5, from: -84, to: 116, out: 1, bays: 36, style: 'court', layer: 'courts' },
  // The Pavillon de l'Horloge front, in two flanks of 15 bays with the pavilion between them.
  { id: 'sully-cour-north', axis: 'z', line: 116, from: -80, to: -14, out: -1, bays: 15, style: 'court', layer: 'courts' },
  { id: 'sully-cour-south', axis: 'z', line: 116, from: 14, to: 80, out: -1, bays: 15, style: 'court', layer: 'courts' },
  // --- Seine and Rivoli ------------------------------------------------------
  { id: 'denon-seine', axis: 'x', line: 154, from: -172, to: 116, out: 1, bays: GALERIE.bays, style: 'seafront', layer: 'outer' },
  { id: 'richelieu-rivoli', axis: 'x', line: -141, from: -84, to: 116, out: -1, bays: 36, style: 'court', layer: 'outer' },
  // --- Denon internal courts (open to the sky) -------------------------------
  { id: 'denon-court-inner-s', axis: 'x', line: 96, from: -172, to: 116, out: 1, bays: 44, style: 'inner', layer: 'outer' },
  { id: 'denon-court-inner-n', axis: 'x', line: 141, from: -172, to: 116, out: -1, bays: 44, style: 'inner', layer: 'outer' },
  { id: 'denon-court-west', axis: 'z', line: -172, from: 96, to: 141, out: -1, bays: 6, style: 'inner', layer: 'outer' },
  { id: 'denon-court-east', axis: 'z', line: 72, from: 96, to: 141, out: 1, bays: 6, style: 'inner', layer: 'outer' },
  { id: 'denon-west-end-a', axis: 'z', line: -172, from: 70.5, to: 96, out: -1, bays: 5, style: 'plain', layer: 'outer' },
  { id: 'denon-west-end-b', axis: 'z', line: -172, from: 141, to: 154, out: -1, bays: 2, style: 'plain', layer: 'outer' },
  // --- Richelieu ends --------------------------------------------------------
  { id: 'richelieu-west-n', axis: 'z', line: -84, from: -141, to: -129, out: -1, bays: 2, style: 'plain', layer: 'outer' },
  { id: 'richelieu-west-s', axis: 'z', line: -84, from: -88, to: -70.5, out: -1, bays: 3, style: 'plain', layer: 'outer' },
  { id: 'richelieu-east-end', axis: 'z', line: 116, from: -129, to: -88, out: 1, bays: 8, style: 'plain', layer: 'outer' },
  // --- Cour Carrée: inner faces (the court you stand in) ---------------------
  { id: 'carree-inner-west', axis: 'z', line: 139.75, from: -56.25, to: 56.25, out: 1, bays: 25, style: 'court', layer: 'courts' },
  { id: 'carree-inner-north', axis: 'x', line: -56.25, from: 139.75, to: 252.25, out: 1, bays: 25, style: 'court', layer: 'courts' },
  { id: 'carree-inner-south', axis: 'x', line: 56.25, from: 139.75, to: 252.25, out: -1, bays: 25, style: 'court', layer: 'courts' },
  { id: 'carree-inner-east', axis: 'z', line: 252.25, from: -56.25, to: 56.25, out: -1, bays: 25, style: 'court', layer: 'courts' },
  // The Petite Galerie's west wall closes the Denon court beside it.
  { id: 'petite-galerie-west', axis: 'z', line: 116, from: 80, to: 141, out: -1, bays: 11, style: 'inner', layer: 'courts' },
  // --- Cour Carrée: outer faces (seen from the street, and from the air) -----
  { id: 'carree-outer-north', axis: 'x', line: -80, from: 116, to: 276, out: -1, bays: 36, style: 'plain', layer: 'outer' },
  { id: 'carree-outer-south', axis: 'x', line: 80, from: 116, to: 276, out: 1, bays: 36, style: 'plain', layer: 'outer' },
];

/** Storey-by-storey window module (geometry.md §9, the standard wing). */
export const WINDOW = {
  /** level 0: 1.6 x 3.2 */
  l0: { w: 1.6, sill: 1.15, head: 4.35 },
  /** level 1: 1.4 x 2.8 */
  l1: { w: 1.4, sill: 8.05, head: 10.85 },
  /** level 2: 1.2 x 1.9 */
  l2: { w: 1.2, sill: 14.9, head: 16.8 },
} as const;

/** Dormer in the mansard: 1.1 x 1.4, one per bay. */
export const DORMER = { w: 1.1, h: 1.4, depth: 1.0 } as const;

interface Box2 {
  x: [number, number];
  z: [number, number];
}

const eps = 1e-6;

function overlaps(a: Box2, b: Box2): boolean {
  return (
    Math.min(a.x[1], b.x[1]) - Math.max(a.x[0], b.x[0]) > eps &&
    Math.min(a.z[1], b.z[1]) - Math.max(a.z[0], b.z[0]) > eps
  );
}

/**
 * route.json's room footprints for this zone's wings, copied from the measured spec. A mass must
 * cover every roofed room, so this catches a wrong plan before it renders.
 */
const ROOMS: Array<{ id: string; x: [number, number]; z: [number, number]; roofed: boolean }> = [
  { id: 'escalier-daru', x: [62, 82], z: [74, 96], roofed: true },
  { id: 'galerie-michel-ange', x: [32, 62], z: [74, 96], roofed: true },
  { id: 'salle-daru', x: [32, 62], z: [74, 92], roofed: true },
  { id: 'salle-denon', x: [2, 32], z: [74, 92], roofed: true },
  { id: 'salle-mollien', x: [-28, 2], z: [74, 92], roofed: true },
  { id: 'salle-des-etats', x: [-68, -28], z: [74, 91.4], roofed: true },
  { id: 'galerie-des-sessions', x: [-68, -48], z: [91.4, 141], roofed: true },
  { id: 'grande-galerie', x: [-172, 96], z: [141, 154], roofed: true },
  { id: 'salon-carre', x: [96, 116], z: [141, 154], roofed: true },
  { id: 'rotonde-apollon', x: [116, 133], z: [141, 154], roofed: true },
  { id: 'galerie-apollon', x: [116, 133], z: [80, 141], roofed: true },
  { id: 'pavillon-horloge', x: [116, 139.75], z: [-14, 14], roofed: true },
  { id: 'escalier-henri-ii', x: [116, 139.75], z: [14, 30], roofed: true },
  { id: 'salle-des-caryatides', x: [116, 139.75], z: [30, 55], roofed: true },
  { id: 'salle-grec-346', x: [139.75, 172], z: [56.25, 80], roofed: true },
  { id: 'salle-venus-milo', x: [172, 204], z: [56.25, 80], roofed: true },
  { id: 'sphinx-crypt', x: [204, 240], z: [56.25, 80], roofed: true },
  { id: 'salle-perrault', x: [252.25, 276], z: [-60, 60], roofed: true },
  { id: 'sully-l2-corridor', x: [116, 139.75], z: [-80, -14], roofed: true },
  { id: 'dutch-rooms', x: [139.75, 180], z: [-80, -56.25], roofed: true },
  { id: 'passage-richelieu', x: [-30, -16], z: [-141, -70.5], roofed: true },
  { id: 'cour-marly', x: [-84, -30], z: [-129, -88], roofed: false },
  { id: 'cour-puget', x: [-16, 34], z: [-129, -88], roofed: false },
  { id: 'cour-khorsabad', x: [34, 66], z: [-129, -88], roofed: false },
  { id: 'salle-hammurabi', x: [66, 90], z: [-116, -90], roofed: true },
  { id: 'escalier-richelieu', x: [-16, 10], z: [-141, -122], roofed: true },
  { id: 'napoleon-iii-grand-salon', x: [-60, -30], z: [-141, -122], roofed: true },
];

export interface PlanReport {
  masses: number;
  roofRects: number;
  runs: number;
  bays: number;
  windows: number;
  checks: string[];
}

/** Verify the plan against the measured spec. Throws on any violation. */
export function assertPlan(): PlanReport {
  const checks: string[] = [];
  const fail = (msg: string): never => {
    throw new Error('[exterior] plan: ' + msg);
  };

  if (Math.abs(CARREE.outer - 160) > eps) fail('Cour Carrée outer must be 160 m');
  if (Math.abs(CARREE.inner - 112.5) > eps) fail('Cour Carrée inner must be 112.5 m');
  if (Math.abs(CARREE.wing - 23.75) > eps) fail('Cour Carrée wing depth must be 23.75 m');
  if (Math.abs(CARREE.x1 - CARREE.x0 - 160) > eps) fail('Cour Carrée x extent must be 160 m');
  if (Math.abs(CARREE.z1 - CARREE.z0 - 160) > eps) fail('Cour Carrée z extent must be 160 m');
  if (Math.abs(CARREE.ix1 - CARREE.ix0 - 112.5) > eps) fail('inner court x must be 112.5 m');
  if (Math.abs(CARREE.iz1 - CARREE.iz0 - 112.5) > eps) fail('inner court z must be 112.5 m');
  checks.push('Cour Carrée 160 / 112.5 / 23.75');

  if (Math.abs(COLONNADE.z1 - COLONNADE.z0 - 183) > eps) fail('Colonnade must be 183 m');
  if (Math.abs(COLONNADE.projection - 11.5) > eps) fail('Colonnade must project 11.5 m each end');
  if (Math.abs(COLONNADE.x - CARREE.x1) > eps) fail('Colonnade face must stand on the court east line');
  checks.push('Colonnade 183 m, 11.5 m projection, 54 coupled columns');

  if (Math.abs(COURT.x1 - COURT.x0 - 200) > eps) fail('Cour Napoléon must be 200 m wide');
  if (Math.abs(GALERIE.x1 - GALERIE.x0 - 288) > eps) fail('Grande Galerie frontage must be 288 m');
  if (Math.abs(GALERIE.z1 - GALERIE.z0 - 13) > eps) fail('Grande Galerie must be 13 m deep');
  checks.push('Cour Napoléon 200 m, Grande Galerie 288 x 13 m');

  if (Math.abs(Y.cornice - 20.4) > eps) fail('cornice must be 20.4 m');
  // Level 1 at 7.0 and level 2 at 13.6 are fixed by the contract, so the three storeys are
  // 7.0 + 6.6 + 6.8 and they must land exactly on the cornice.
  if (Math.abs(Y.storey2 - 7.0) > eps || Math.abs(Y.storey3 - 13.6) > eps) fail('storeys must follow the contract levels');
  if (Math.abs(Y.cornice - Y.storey3 - 6.8) > eps) fail('the third storey must be 6.8 m to reach the cornice');
  if (Math.abs(Y.cornice + Y.mansardLower + Y.mansardUpper - Y.ridge) > eps) fail('ridge must derive to 28.7 m');
  if (Y.pavilion > Y.top) fail('pavilion crown must stay inside the 42 m zone box');
  checks.push('cornice 20.4, ridge 28.7, pavilion 40, box top 42');

  // No two masses may share volume: the plan's courts are what keep the roofs off them.
  for (let i = 0; i < MASSES.length; i++) {
    for (let j = i + 1; j < MASSES.length; j++) {
      const a = MASSES[i] as Mass;
      const b = MASSES[j] as Mass;
      if (overlaps(a, b)) fail('masses overlap in plan: ' + a.id + ' / ' + b.id);
    }
  }
  checks.push('no two masses overlap');

  // Roofs must not overlap either, once the ring corners are assigned to the north/south ranges.
  const rects = roofRects();
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i] as { id: string; x: [number, number]; z: [number, number] };
      const b = rects[j] as { id: string; x: [number, number]; z: [number, number] };
      if (overlaps({ x: a.x, z: a.z }, { x: b.x, z: b.z })) fail('roofs overlap: ' + a.id + ' / ' + b.id);
    }
  }
  checks.push(rects.length + ' roof rectangles, none overlapping');

  // Every roofed room must sit under a roof.
  for (const room of ROOMS) {
    const covered = MASSES.some((m) => {
      const c = Math.max(m.x[0], room.x[0]);
      const d = Math.min(m.x[1], room.x[1]);
      const e = Math.max(m.z[0], room.z[0]);
      const f = Math.min(m.z[1], room.z[1]);
      return d - c > 1 && f - e > 1;
    });
    if (covered !== room.roofed) {
      fail((room.roofed ? 'room is not roofed: ' : 'court is roofed: ') + room.id);
    }
  }
  checks.push(ROOMS.length + ' route.json rooms agree with the masses');

  // Each run must fit the court line it claims and divide into whole bays.
  let bays = 0;
  for (const run of RUNS) {
    const len = Math.abs(run.to - run.from);
    if (len < 2) fail('run too short: ' + run.id);
    if (run.bays < 1 || !Number.isFinite(run.bays)) fail('bad bay count on ' + run.id);
    if (len / run.bays < 3 || len / run.bays > 10) fail('bay width out of range on ' + run.id + ': ' + (len / run.bays).toFixed(2));
    bays += run.bays;
  }
  checks.push(bays + ' bays across ' + RUNS.length + ' elevations');

  // One storey band per floor, from the ground to the cornice.
  for (const key of ['l0', 'l1', 'l2'] as const) {
    const w = WINDOW[key];
    if (w.sill < 0 || w.head > Y.cornice) fail('window ' + key + ' leaves the wall');
    if (w.head - w.sill < 1) fail('window ' + key + ' is degenerate');
  }
  checks.push('window module inside the storeys');

  return {
    masses: MASSES.length,
    roofRects: rects.length,
    runs: RUNS.length,
    bays,
    windows: bays * 3,
    checks,
  };
}
