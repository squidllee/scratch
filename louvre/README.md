# Louvre — browser-walkable replica

The whole museum, walkable in a browser: Three.js + TypeScript + Vite, one static build, no network
access at runtime and no downloaded assets. Every texture is generated in code, every mesh is built
from geometry, and every procedural choice comes from a seeded PRNG so two loads are identical.

Five wings — the Pyramid and the Cour Napoléon, the Denon wing, Sully, Richelieu, and the exterior
façades and roofs — plus 28 works hung at their real dimensions and a guided tour that follows the
measured visitor route.

## Run it

```bash
cd louvre
npm install
npm run dev            # http://127.0.0.1:5173 — the assembled museum
npm run build          # structural check + typecheck + static bundle in dist/
npm run preview        # serve dist/ on http://127.0.0.1:4173
npx serve dist         # or any static file server; dist/ uses relative paths
```

Keys: click the canvas to capture the mouse, **W A S D** to move, **Shift** to run, **Esc** to
release. **1** walk · **2** guided tour (**Space** pause, **R** restart) · **3** debug fly camera
(**Q E** down/up). **H** toggles the HUD, **C** shows the active culling cells.

URL parameters: `?spawn=<zone>/<id>` starts at a named viewpoint, `?mode=tour` opens in the tour,
`?zones=denon` loads a single wing (the capture harness does this to keep per-zone numbers honest),
`?env=1` turns on the procedural environment map, `?depth=N` changes the portal-culling hop count.

## Verify it

The harness is the crew's only pair of eyes: it reads the framebuffer back and asserts the frame is
not blank, walks the collision probes, and checks the assembled graph against the measured spec.

```bash
npm run capture -- --zone museum --verify --probe --all --out captures/museum
npm run capture -- --zone museum --verify --tour 820           # tour reaches 95% of the route
npm run capture -- --zone denon  --verify --all                # one wing, its own numbers
```

`--zone museum` loads every wing in one room graph and checks the things only assembly can break:
all 34 rooms of `docs/spec/route.json` present, every portal landing on a room some wing declares,
every room reciprocal, every route leg routable, all 28 works in the scene graph, and every doorway
a visitor crosses standable. `npm run build` runs `scripts/check.mjs`, which fails on `Math.random`,
on any `http(s)` URL in `src/`, and on any image, font or model import.

## What is here

```
src/core/            renderer, rng, palette, materials, procedural textures, geometry builders,
                     merge, room culling, perf HUD, controls, assembly, tour   (shared)
src/artworks/        the 28 works: data + a factory per id, painted to canvas at load
src/zones/           zone contract + registry (auto-discovers ./<id>/index.ts)
  pyramid/           Glass Pyramid, Cour Napoléon, the Hall and its stone spiral, Arc du Carrousel
  exterior/          every façade and roof, the sky, the quay, the ground
  denon/             Daru staircase, the Salle des États, 268 m of Grande Galerie
  sully/             Galerie d'Apollon, the Cour Carrée, Venus de Milo, the Sphinx crypt
  richelieu/         Cour Marly, Cour Puget, Cour Khorsabad, the Napoleon III apartments
docs/CONTRACT.md     the contract every zone implements
docs/PERF.md         the budget, and the assembly's measured numbers
docs/spec/           the measured spec: 34 rooms, 35 portals, 28 works, the palette
scripts/capture.mjs  headless screenshot + verification harness (SwiftShader)
scripts/check.mjs    guard: no Math.random, no network URLs, no asset files
```

## Modes

- **Walk** — pointer-locked first person, eye at 1.65 m, collision against the union of every wing's
  rooms with real doorways. The room graph crosses wings: you walk from the Hall Napoléon, up the
  stone spiral, across the courtyard, up the Daru staircase and into the Grande Galerie without a
  cut. Stairs are walkable because a room can carry a `floorAt` function; stacked rooms resolve by
  height, so the undercroft and the pavement above it are both reachable.
- **Tour** — the measured route from `docs/spec/route.json`, threaded through the doorways that
  actually join the rooms, at 2.9 m/s with a moment in each room. 1.9 km, about ten minutes.
- **Fly** — unconstrained debug camera for inspecting geometry.

## Notes on honesty

No frame rate is claimed anywhere in this project's evidence. Headless captures run on SwiftShader,
a software rasteriser; the numbers that matter there are draw calls, triangles and texture memory.
See `docs/PERF.md` for the assembled museum's measured numbers and for what the assembly had to
repair to make one building out of five wings.
