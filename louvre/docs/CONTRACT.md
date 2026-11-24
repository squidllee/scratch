# Zone contract

Read this before writing a line of code. It defines the interfaces, the coordinate frame, the
geometry vocabulary, the material names, and the budget. Everything here is implemented in
`src/core/` and typed in `src/zones/types.ts` — if this document and the code disagree, the code
wins and the document is a bug.

The proof gallery in `src/zones/_example/` is a complete, working implementation of this contract.
Read it after this file.

---

## 1. Coordinate frame

One world, metres, right-handed.

| item | value |
| --- | --- |
| Unit | metre |
| Origin | centre of the square base of the Glass Pyramid, at Cour Napoléon paving level |
| +X | east, toward the Cour Carrée |
| +Y | up |
| +Z | south, toward the Seine (so north is −Z) |
| Cour Napoléon ground | y = 0 |
| Level −1 (Hall Napoléon) | y = −9.0 |
| Level 1 (painting floors) | y = +7.0 |
| Cornice | y = +20.4 |

Your zone box, from the measured spec (`handoffs/louvre/spec/coordinates.md`). Build inside it and
nowhere else; two zone boxes may not overlap in all three axes.

| zone id (folder) | x | y | z |
| --- | --- | --- | --- |
| `pyramid` | −236 … +116 | −9.5 … 21.7 | −70.5 … +70.5 |
| `denon` | −172 … +116 | −9.5 … 20.4 | +70.5 … +154 |
| `richelieu` | −84 … +116 | −9.5 … 20.4 | −141 … −70.5 |
| `sully` | +116 … +276 | −9.5 … 20.4 | −91.5 … +154 |
| `exterior` | the roof boxes and the four 2 m façade skins (see coordinates.md §3) | 20.4 … 42 | per box |

The palace is deliberately **orthogonalised**: the real building bends about 6° between court axes.
Build everything on the axis-aligned boxes above.

## 2. Where your code lives

```
louvre/src/zones/<id>/index.ts     <- the only entry point the registry looks for
louvre/src/zones/<id>/*.ts         <- any helpers you like
louvre/src/artworks/<name>/*.ts    <- only if you own the artwork library
```

You never edit `src/core/`, `src/main.ts`, `src/zones/registry.ts`, `src/zones/types.ts`, or another
zone's directory. The registry discovers zones with `import.meta.glob('./*/index.ts')`, so **adding
your folder registers your zone**. Nothing to wire up, nothing to conflict with.

## 3. The `Zone` interface

```ts
import type { Zone, ZoneContext } from '../types';

export const createZone = (ctx: ZoneContext): Zone => { /* ... */ };

export interface ZoneContext {
  rng: (label?: string) => Rng;       // seeded, deterministic; fork by label
  artworks: ArtworkLibrary;           // factories looked up by artwork id
  pixelRatio: number;                 // renderer DPR cap (for LOD decisions)
}

export interface Zone {
  id: AnyZoneId;                      // 'denon' | 'sully' | ...
  rooms: RoomDef[];                   // walkable cells + portals (see §5)
  group: THREE.Group;                 // your merged geometry
  roomGroups: Map<string, THREE.Object3D>;  // REQUIRED: per-room sub-groups, for culling (§5)
  spawnPoints: SpawnPoint[];          // named viewpoints; also the guided-tour order
  atmosphere?: AtmosphereSpec;        // sky + fog while the camera is in this zone (§6)
  update?(dt: number, camera: THREE.Camera): void; // optional per-frame work
  dispose(): void;                    // release every geometry you allocated
}

export interface SpawnPoint {
  id: string;                         // 'grande-galerie-west'
  position: readonly [number, number, number];  // eye position, world metres
  lookAt: readonly [number, number, number];
  label?: string;
}
```

Spawn point ids are used by the capture harness (`--spawn <id>`) and by the tour, so name them the
way a curator would: `salon-carre-east`, `grande-galerie-west`, `escalier-daru-base`.

## 4. Building geometry: the shared vocabulary

Every builder takes real dimensions in metres and returns either a `BufferGeometry` or, for the two
multi-material cases, a `BuildParts` record keyed by palette name. All of them bake ambient occlusion
into a `color` attribute and emit UVs in metres, so nothing needs texture setup.

```ts
import { addPart, addParts, mergeByMaterial } from '../../core/merge';
import {
  wall, floor, ceiling, cofferCeiling, cornice, moulding, baseboard,
  column, pilaster, arcade, windowRow, mansardRoof, skylight, staircase,
  balustrade, doorway, arch, pictureFrame, parquet,
} from '../../core/builders';
```

| builder | builds along | origin / base | returns |
| --- | --- | --- | --- |
| `wall({length, height, thickness?, openings?})` | X | base y=0, straddles z=0 | geometry |
| `floor({width, depth, thickness?})` | XZ | walking surface at y=0 | geometry |
| `ceiling({width, depth, beams?})` | XZ | finished face at y=0 | geometry |
| `cofferCeiling({width, depth, baysX?, baysZ?, rosettes?})` | XZ | lowest plane at y=−beamDepth | geometry |
| `cornice({length, height?, projection?, dentils?})` | X | base y=0, out along +Z | geometry |
| `moulding({length, profile})` | X | profile `[outward, up]` from y=0 | geometry |
| `baseboard({length, height?, thickness?})` | X | base y=0, out along +Z | geometry |
| `parquet({width, depth, border?, crossBands?})` | XZ | surface at y=0 | geometry |
| `column({height, radius, order})` | Y | base y=0 | geometry |
| `pilaster({width, height, depth?})` | Y | base y=0, faces +Z | geometry |
| `arcade({bays, bayWidth, height, pierWidth?})` | X | base y=0, straddles z=0 | geometry |
| `windowRow({bays, bayWidth, spacing?, sillHeight, headHeight, mullions?})` | X | base y=0, plane z=0 | **BuildParts** (frames instanced + glass) |
| `skylight({width, depth, bars?, frameWidth?})` | XZ | sits from y=0 down to −0.16 | **BuildParts** |
| `staircase({steps, rise, run, width})` | +Z rising | first riser at y=0 | geometry |
| `balustrade({length, height?, spacing?})` | X | base y=0 | geometry |
| `doorway({width, height, thickness?, arched?})` | X | XY plane, base y=0, faces +Z | geometry (*casing*, not a hole) |
| `arch({span, band?, thickness?})` | XY | springs at y=0 | geometry |
| `pictureFrame({width, height, borderWidth?, depth?, canvas?})` | XY | centred on origin, faces +Z | **BuildParts** (gilt + optional canvas) |

Rules that make the vocabulary compose:

- **A wall opening is a hole.** `wall({openings: [{x, width, sill?, head, arched?}]})` triangulates
  real holes. Put a `doorway()` casing in the hole for the dressed stone surround, and a `windowRow()`
  whose bay centres match the openings for frames and glass.
- **Meshes face +Z.** Rotate about Y to face the other way (`Math.PI` faces −Z, `±Math.PI/2` faces
  ±X). A cornice `rotation.y = Math.PI` runs along the same axis but protrudes −Z.
- **Merging bakes world transforms.** `mergeByMaterial()` folds each child's world matrix into the
  merged geometry, and for an `InstancedMesh` it bakes it into every instance matrix. So you can
  position a row of windows inside a placed group and merge afterwards; the row lands where you put
  it. `--verify` fails if any instance ends up outside every room box, which is what a dropped
  group transform looks like.
- **AO is baked, so put geometry where it is seen.** Nothing casts realtime shadows; the darkness
  under a cornice, at the foot of a wall, and in the corner of a room comes from the vertex colours
  the builders write. Keep the pieces you build; do not fake shadow planes.

### Turning builders into a group

```ts
const raw = new THREE.Group();
addPart(raw, parquet({ width: 40, depth: 12 }), 'floor.parquet-versailles');
const w = addPart(raw, wall({ length: 44, height: 9, openings: [{ x: 0, width: 2.4, head: 4.2, arched: true }] }), 'wall.red-madder');
w.position.set(0, 0, -6.3);
addParts(raw, windowRow({ bays: 6, bayWidth: 2.4, spacing: 5.2, sillHeight: 1, headHeight: 6.6 })); // keys are palette names

const { group } = mergeByMaterial(raw);   // one draw call per material
```

`mergeByMaterial` bakes each child's world transform and collapses everything into one mesh per
material. Call it **once per room group**, not once per zone, so the culler can hide a room on its
own.

## 5. Rooms and portals

```ts
const rooms: RoomDef[] = [
  {
    id: 'grande-galerie',
    bounds: { min: [-86, 7, 70.5], max: [116, 20.4, 84] },   // interior surfaces
    portals: [
      { to: 'salon-carre', centre: [116, 12, 77], width: 3.2, height: 5.4, normal: [1, 0, 0] },
    ],
  },
];
```

- `bounds` are the **interior** faces: floor y, wall x/z, ceiling y. The engine uses them for the
  camera's cell and for walk collision, so they must cover every place a visitor can stand.
- `portals` are **reciprocal**: A→B and B→A, both declared. One-way portals break the reachability
  test in the spec validator and the culling BFS.
- `normal` is optional; supply it. It tells the culler and the walker which face of the room the
  opening is in.
- Where a wall is thick, add a thin **threshold room** spanning the opening (`bounds` across the
  wall, `width` = the doorway) with portals on both sides. That is how collision keeps a wall solid
  while letting you walk through the door. See `threshold-east` in `src/zones/_example/`.
- **Floors and stairs.** `bounds.min[1]` is the walking surface of a flat room. For stairs, a ramp,
  or a stepped dais, give that room a `floorAt(x, z)` function returning the height at that point;
  the walker calls it every frame and puts the eye at `height + 1.65 m`, so the camera climbs with
  you. **Vertical movement is never a zone's job** — a zone that moves the camera in `update()`
  fights the walker and loses. `--verify` probes `floorAt` with a synthetic ramp and fails if the
  walker does not read it.

```ts
{ id: 'escalier-daru', bounds: {...},
  floorAt: (x, z) => {
    // a straight flight climbing in +Z inside the room
    const t = Math.min(1, Math.max(0, (z - 118) / 9));
    return 7 + t * 4.2;
  },
  portals: [...] }
```
- The engine renders the camera's room plus rooms reached through visible portals up to two hops,
  and falls back to distance culling when the camera is outside every room (exterior views).

### Starting from the measured spec

The reference data lives at `louvre/docs/spec/` (spec branch) and in the captain drive at
`handoffs/louvre/spec/`; read whichever exists. Convert each of your rooms straight from
`route.json`:

```ts
// route.json room -> RoomDef
const floorY = room.floorY;
const ceilY = room.floorY + room.clearHeight_m;
bounds.min = [room.footprint.x[0], floorY, room.footprint.z[0]];
bounds.max = [room.footprint.x[1], ceilY, room.footprint.z[1]];
```

Portals in `route.json` only say `{to, kind}`; you supply the centre, width and height from the
doorway you actually build (or from `geometry.md`'s opening sizes), and you declare both
directions. `route.json`'s `zone` field uses the spec's own taxonomy (`denon-interior`,
`sully-interior`, `richelieu-interior`, `pyramid-courtyard`, `exterior-wings`); the **folder and
registry id** are the short names in §1 (`denon`, `sully`, `richelieu`, `pyramid`, `exterior`).

`roomGroups` is **required**, one entry per room id. It is what makes culling and the per-room
draw-call budget real: the engine sets `visible` per room group, so a room behind two walls costs
nothing. A zone that returns its geometry as one block cannot be culled, and the type will not let
you ship it that way.

## 6. Atmosphere

Sky and fog are per zone, because Paris daylight outdoors and the dark interior falloff cannot be
one global setting. Declare it on the zone and the engine applies it while one of your rooms is the
camera's cell, restoring the default when the camera leaves:

```ts
atmosphere: {
  background: 'context.sky-day',           // palette name or 0x hex
  fog: { color: 'context.sky-day', density: 0.0011 },   // null disables fog for this zone
}
```

Do **not** set `scene.fog` or `scene.background` yourself, and do not reach the scene through
`group.parent`: with two zones loaded that silently wins or loses by load order.

## 7. Materials

Every colour comes from `src/core/palette.ts`, which is generated from the measured
`palette.json` (56 semantic names, grouped):

```
wall.red-madder  wall.midnight-blue  wall.apollon-blue  wall.stone-grey
floor.parquet-versailles  floor.marble-checker  floor.stone-flag  floor.pave-granite
ceiling.plaster-white  ceiling.cream-cove  ceiling.gold-leaf  ceiling.glazed-skylight
trim.gilt  trim.stone-limestone-warm  trim.marble-rouge  trim.wood-oak
marble.blanc-carrare  marble.noir-marquina  marble.vert-antique  marble.rouge-royal
stone.limestone-warm  stone.limestone-pale  stone.granite-grey
gold.leaf  gold.bronze-tarnished  glass.skylight-clear  glass.vitrine  glass.pyramid-tint
wood.oak  wood.walnut  wood.gilt-frame  context.zinc-roof  context.seine-water  ...
```

Metals outdoors: the palette's metalness (zinc 0.6, gold 0.85) assumes interior lighting. With no
environment map in the scene a high-metalness surface has nothing to reflect and renders black, so
the exterior uses `outdoorMat('context.zinc-roof')` — same colour and texture, metalness 0.08.
Never clone and mutate a cached material; pass an override instead (`mat(name, { metalness: 0.1 })`).

Use `mat('wall.red-madder')` to get the cached material, and the same string in `addPart(..., name)`.
Never construct a `MeshStandardMaterial` inline: each unique material is a state change, and the
per-material merge depends on names being stable. `palette.json` also names four base materials per
zone (`zones.denon` etc.) — those are your defaults.

## 8. Determinism

All variation comes from `ctx.rng(label)`:

```ts
const r = ctx.rng('paving');            // stable for this zone, this label, every run
const jitter = r.range(-0.02, 0.02);    // also r.int, r.chance, r.pick, r.gauss, r.fork('sub')
```

`Math.random` is banned — `npm run build` runs `scripts/check.mjs`, which fails on it, on any
`http(s)` URL in `src/`, and on any image/font/model import. Two builds of the same scene must be
pixel-identical.

## 9. Artworks

An artwork is **data plus a factory**. You place artworks by id; you never model one.

```ts
import { placeArtwork } from '../../artworks/library';

placeArtwork(group, {
  id: 'denon/mona-lisa',          // the only thing the library keys on
  title: 'Portrait de Monna Lisa',
  artist: 'Leonardo da Vinci',
  year: '1503-1519',
  sizeCm: [77, 53],               // REAL painted size; never invent it
  room: 'salle-des-etats',
  wall: 'north',
  position: [3.2, 8.9, 78.1],     // canvas centre, world metres
  rotationY: Math.PI,             // 0 faces +Z
});
```

Artwork data for the whole museum is in `handoffs/louvre/spec/artworks.json` (28 works, real sizes).
If no factory is registered for an id you get a correctly-sized gilt frame with a blank canvas, so
your room can be verified before the artwork library lands.

## 10. Budget

Per zone, measured with the capture harness on the built scene:

| measure | ceiling |
| --- | --- |
| draw calls (whole scene, one zone loaded) | ≤ 150 |
| visible triangles | ≤ 300 000 |
| texture memory | ≤ 64 MB |
| zone module load | ≤ 1.5 s on the CI machine |

How to hit them: merge per room per material, instance anything repeated more than about 30 times,
prefer texture detail over triangle detail, and delete ornament you cannot see from any spawn point.

## 11. Verify yourself

```bash
cd louvre
npm install
npm run build                                        # check + typecheck + bundle
npm run capture -- --zone denon --verify --all --out captures/
npm run capture -- --zone denon --verify --spawn grande-galerie-west --tour 30 --out captures/
```

`--verify` is not optional in spirit: no agent in this crew can look at an image, so the harness is
the only thing that can tell a rendered gallery from a black canvas. It fails the run (exit code 1)
when:

- a frame is near-uniform — `std < 10` or fewer than 2 000 exact colours, i.e. a blank canvas, a
  camera inside geometry, or a scene that silently failed to build;
- the collision probes are wrong (a point inside the first room must be walkable; points beyond its
  walls and far outside must not be);
- `--tour N` does not reach at least 95% of the spline's arc length in N seconds (a coverage
  check, not a finish line, so the same command works for a 60 m hall and a 288 m gallery);
- any console error is logged;
- **structural asserts against the spec** (`route.json`, `artworks.json` from `docs/spec/`, or pass
  `--spec <dir>` to point at the captain drive copy): every room `route.json` gives this zone must
  exist in `zone.rooms`; the zone's geometry bounds must sit inside the box `coordinates.md` assigns
  it (tolerance `--bbox-tolerance`, default 3 m); and every artwork `artworks.json` assigns to those
  rooms must be in the scene graph (name it through `placeArtwork`, which tags `userData.artworkId`).

Raycast probe: `--probe` fires a ray from every spawn point along its sight line and reports the
object and material it hits. Pixel statistics cannot tell a correct wall from a window row hung on
the wrong surface; a hit test can. Use `--expect-material wall.red-madder` to assert what a zone's
spawns should be looking at, and read `probe` in the report when a shot looks plausible but the
geometry is misplaced.

Then read `captures/capture-report.json`. It contains, per screenshot, `drawCalls`, `triangles`,
`textureMB`, `cells`, plus zone-agnostic collision probes and any console errors. A run with console
errors exits non-zero — treat that as a failure, not a warning.

Frame rate under SwiftShader is meaningless; see `docs/PERF.md`.
