import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const spec = (name) => JSON.parse(readFileSync(join(here, name), "utf8"));
const route = spec("route.json");
const artworks = spec("artworks.json");
const palette = spec("palette.json");

const errors = [];
const warns = [];
const fail = (m) => errors.push(m);
const warn = (m) => warns.push(m);

// ---- zones (authoritative copy of coordinates.md) -------------------------
// `volume` boxes compete for space and must not intersect. The exterior zone is a `surface`
// envelope: it owns the roof planes and façade skins over the same y range an interior may rise
// into, so it is not compared against volumes. That is the rule from coordinates.md section 4.
const RIDGE_Y = 28.7;
const CORNICE_Y = 20.4;
const HEADROOM = new Set([
  'galerie-apollon',
  'rotonde-apollon',
  'cour-marly',
  'cour-puget',
  'cour-khorsabad',
  'napoleon-iii-grand-salon',
]);
const zones = {
  'pyramid-courtyard': [
    { kind: 'volume', x: [-236, 116], y: [-9.5, 21.7], z: [-70.5, 70.5] },
  ],
  'denon-interior': [{ kind: 'volume', x: [-172, 116], y: [-9.5, RIDGE_Y], z: [70.5, 154] }],
  'richelieu-interior': [{ kind: 'volume', x: [-84, 116], y: [-9.5, RIDGE_Y], z: [-141, -70.5] }],
  'sully-interior': [{ kind: 'volume', x: [116, 276], y: [-9.5, RIDGE_Y], z: [-91.5, 154] }],
  'exterior-wings': [
    { kind: 'surface', x: [-172, 276], y: [CORNICE_Y, 40], z: [-141, 154] },
  ],
};

// ---- 1. zone boxes must not overlap --------------------------------------
const boxes = [];
for (const [z, list] of Object.entries(zones))
  for (const b of list) boxes.push({ zone: z, ...b });
const volumes = boxes.filter((b) => b.kind === 'volume');
const surfaces = boxes.filter((b) => b.kind === 'surface');
const ov = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0);
for (let i = 0; i < volumes.length; i++)
  for (let j = i + 1; j < volumes.length; j++) {
    const A = volumes[i], B = volumes[j];
    const dx = ov(A.x[0], A.x[1], B.x[0], B.x[1]);
    const dy = ov(A.y[0], A.y[1], B.y[0], B.y[1]);
    const dz = ov(A.z[0], A.z[1], B.z[0], B.z[1]);
    if (dx > 0.001 && dy > 0.001 && dz > 0.001)
      fail(`zone boxes overlap: ${A.zone} / ${B.zone} by ${dx.toFixed(2)} x ${dy.toFixed(2)} x ${dz.toFixed(2)} m`);
  }

// ---- 2. rooms clip to their declared zone --------------------------------
const byId = new Map();
for (const r of route.rooms) {
  if (byId.has(r.id)) fail(`duplicate room id ${r.id}`);
  byId.set(r.id, r);
  const zl = zones[r.zone];
  if (!zl) { fail(`${r.id}: unknown zone ${r.zone}`); continue; }
  const fp = r.footprint;
  const yLo = Math.min(r.floorY, ...r.levels.map((l) => route.floorY[l]));
  const yHi = yLo + (r.clearHeight_m ?? 0);
  const inside = zl.some(
    (b) =>
      fp.x[0] >= b.x[0] - 0.01 && fp.x[1] <= b.x[1] + 0.01 &&
      fp.z[0] >= b.z[0] - 0.01 && fp.z[1] <= b.z[1] + 0.01 &&
      yLo >= b.y[0] - 0.01 && yHi <= b.y[1] + 0.01
  );
  if (!inside) fail(`${r.id} footprint escapes its zone box ${r.zone}`);
}

// ---- 2b. vertical rule: interiors may rise into the roof, up to the ridge -
for (const r of route.rooms) {
  const top = r.floorY + (r.clearHeight_m ?? 0);
  if (top > RIDGE_Y + 0.01)
    fail(`${r.id} tops out at ${top.toFixed(2)} m, above the ${RIDGE_Y} m ridge`);
  if (top > CORNICE_Y && !HEADROOM.has(r.id))
    fail(`${r.id} rises above the ${CORNICE_Y} m cornice (${top.toFixed(2)} m) but is not in the HEADROOM set; add it here and in coordinates.md`);
}

// ---- 3. portals reciprocal and resolvable --------------------------------
for (const r of route.rooms) {
  for (const p of r.portals) {
    const other = byId.get(p.to);
    if (!other) { fail(`${r.id}: portal to unknown room ${p.to}`); continue; }
    if (!other.portals.some((q) => q.to === r.id))
      fail(`portal not reciprocal: ${r.id} -> ${p.to}`);
  }
}

// ---- 4. every portal touches a real wall (planarity) --------------------
// A portal between two rooms must either share a boundary segment (within wall thickness)
// or, for a vertical link, overlap in plan on different floors. This is the check that would
// have caught galerie-apollon/pavillon-horloge and caryatides/grec-346 before a zone thread hit them.
const TOL = 1.0;
const WALL_MIN = 0.5;
const planOverlap = (A, B) => {
  const dx = ov(A.footprint.x[0], A.footprint.x[1], B.footprint.x[0], B.footprint.x[1]);
  const dz = ov(A.footprint.z[0], A.footprint.z[1], B.footprint.z[0], B.footprint.z[1]);
  return { dx, dz };
};
const shareWall = (A, B) => {
  const { dx, dz } = planOverlap(A, B);
  const [ax0, ax1] = A.footprint.x, [bx0, bx1] = B.footprint.x;
  const [az0, az1] = A.footprint.z, [bz0, bz1] = B.footprint.z;
  if ((Math.abs(ax1 - bx0) <= TOL || Math.abs(bx1 - ax0) <= TOL) && dz >= WALL_MIN) return true;
  if ((Math.abs(az1 - bz0) <= TOL || Math.abs(bz1 - az0) <= TOL) && dx >= WALL_MIN) return true;
  return false;
};
for (const r of route.rooms) {
  for (const p of r.portals) {
    const o = byId.get(p.to);
    if (!o || o.id < r.id) continue; // report each pair once
    const { dx, dz } = planOverlap(r, o);
    const stacked = dx > 0.01 && dz > 0.01;
    const differentFloor = Math.abs(r.floorY - o.floorY) > 0.5;
    if (stacked && !differentFloor)
      fail(`portal has no wall: ${r.id} / ${o.id} overlap in plan on the same floor`);
    else if (!stacked && !shareWall(r, o))
      fail(`portal to nowhere: ${r.id} / ${o.id} share no wall (gap over ${TOL} m or overlap under ${WALL_MIN} m)`);
  }
}

// ---- 5. reachability from the entrance -----------------------------------
const adj = new Map(route.rooms.map((r) => [r.id, r.portals.map((p) => p.to)]));
const seen = new Set(["cour-napoleon"]);
const q = ["cour-napoleon"];
while (q.length) {
  const cur = q.shift();
  for (const n of adj.get(cur) ?? []) if (!seen.has(n)) { seen.add(n); q.push(n); }
}
for (const r of route.rooms) if (!seen.has(r.id)) fail(`room unreachable from the entrance: ${r.id}`);

// ---- 6. no two rooms share plan area at the same level in the same zone --
const levelsOf = (r) => new Set(r.levels);
for (let i = 0; i < route.rooms.length; i++)
  for (let j = i + 1; j < route.rooms.length; j++) {
    const A = route.rooms[i], B = route.rooms[j];
    if (A.zone !== B.zone) continue;
    const shared = [...levelsOf(A)].filter((l) => levelsOf(B).has(l));
    if (!shared.length) continue;
    const dx = ov(A.footprint.x[0], A.footprint.x[1], B.footprint.x[0], B.footprint.x[1]);
    const dz = ov(A.footprint.z[0], A.footprint.z[1], B.footprint.z[0], B.footprint.z[1]);
    if (dx > 0.01 && dz > 0.01)
      fail(`rooms overlap at level ${shared.join(",")}: ${A.id} / ${B.id} (${dx.toFixed(2)} x ${dz.toFixed(2)} m)`);
  }

// ---- 7. footprints agree with dimensions --------------------------------
for (const r of route.rooms) {
  const w = r.footprint.x[1] - r.footprint.x[0];
  const d = r.footprint.z[1] - r.footprint.z[0];
  const area = w * d;
  if (Math.abs(area - r.dimensions.area_m2) / r.dimensions.area_m2 > 0.09)
    fail(`${r.id}: declared area ${r.dimensions.area_m2} vs footprint ${area.toFixed(0)} m2`);
}

// ---- 8. artworks: room resolves, fits the wall, palette keys resolve ----
const roomArt = new Map(route.rooms.map((r) => [r.id, new Set(r.artworks)]));
for (const a of artworks.artworks) {
  const r = byId.get(a.room);
  if (!r) { fail(`${a.id}: unknown room ${a.room}`); continue; }
  if (!roomArt.get(a.room).has(a.id))
    fail(`${a.id}: room ${a.room} does not list it in route.json`);
  const wall = Math.min(
    r.footprint.x[1] - r.footprint.x[0],
    r.footprint.z[1] - r.footprint.z[0]
  );
  const span = a.dims_cm.width / 100;
  if (a.type === "painting" && span > wall)
    fail(`${a.id}: ${span.toFixed(2)} m wide does not fit a ${wall.toFixed(2)} m wall in ${r.id}`);
  const h = a.dims_cm.height / 100;
  if (a.type === "painting" && h > r.clearHeight_m - 1.0)
    fail(`${a.id}: ${h.toFixed(2)} m tall will not hang in ${r.id} (clear ${r.clearHeight_m} m)`);
}
for (const r of route.rooms)
  for (const id of r.artworks)
    if (!artworks.artworks.some((a) => a.id === id))
      fail(`${r.id} lists artwork ${id}, absent from artworks.json`);

// ---- 9. palette keys used by rooms exist ---------------------------------
const palKeys = new Set();
for (const group of ["wall", "floor", "ceiling", "trim", "stone", "gold", "glass", "wood", "marble", "context"])
  for (const k of Object.keys(palette[group] ?? {})) palKeys.add(`${group}.${k}`);
for (const r of route.rooms) {
  for (const field of ["floorMaterial", "wallColour", "trim"]) {
    const v = r[field];
    if (v && !palKeys.has(v)) fail(`${r.id}.${field} = ${v} is not a palette key`);
  }
}

// ---- 10. painted-wall sanity: no painting wider than its room wall --------
const big = artworks.artworks.filter((a) => a.dims_cm.width >= 500).map((a) => `${a.id} ${a.dims_cm.width}x${a.dims_cm.height}`);
warn(`works over 5 m wide (check sight lines): ${big.join(", ")}`);

// ---- report -------------------------------------------------------------
const stats = {
  rooms: route.rooms.length,
  portals: route.rooms.reduce((n, r) => n + r.portals.length, 0) / 2,
  artworks: artworks.artworks.length,
  zone_boxes: boxes.length,
  errors,
  warnings: warns,
};
console.log(JSON.stringify(stats, null, 2));
if (errors.length) process.exit(1);
