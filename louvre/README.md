# Louvre — browser-walkable replica

A 3D replica of the Louvre you can walk through in a browser: Three.js + TypeScript + Vite, one
static build, no network access at runtime and no downloaded assets. Every texture is generated in
code, every mesh is built from geometry, and every procedural choice comes from a seeded PRNG so two
loads are identical.

## Run it

```bash
cd louvre
npm install
npm run dev            # http://127.0.0.1:5173
```

Keys: click the canvas to capture the mouse, **W A S D** to move, **Shift** to run, **Esc** to
release. **1** walk · **2** guided tour (**Space** pause, **R** restart) · **3** debug fly camera
(**Q E** down/up). **H** toggles the HUD, **C** shows the active culling cells.

## Build and capture

```bash
npm run build          # structural check + typecheck + static bundle in dist/
npm run preview        # serve dist/ on http://127.0.0.1:4173
npm run capture -- --zone denon --all --out captures/
npm run capture -- --zone denon --spawn grande-galerie-west --tour 20
```

`dist/` is relative-path (`base: './'`), so it runs from any static server, a subdirectory, or
`file://`-style hosting that allows modules.

## What is here

```
src/core/          renderer, rng, palette, materials, procedural textures, geometry builders,
                   merge, room culling, perf HUD, controls            (shared — nobody edits it)
src/artworks/      artwork types + registry (data + factory per artwork id)
src/zones/         zone contract + registry (auto-discovers ./<id>/index.ts)
src/zones/_example proof gallery: 40 × 12 × 9 m, three bays, coffers, skylight, two frames
docs/CONTRACT.md   the contract every zone thread implements
docs/PERF.md       budget, and how to measure it without quoting a software-rendered fps
scripts/capture.mjs headless screenshot + stats harness (SwiftShader)
scripts/check.mjs  guard: no Math.random, no network URLs, no asset files
```

## Modes

- **Walk** — pointer-locked first person, eye at 1.65 m, smooth acceleration, collision against room
  bounds with real doorways (you cannot walk through a wall or leave the building).
- **Tour** — a Catmull-Rom spline through the loaded zone's spawn points, eased look targets, 2.6 m/s,
  pausable and restartable.
- **Fly** — unconstrained debug camera for inspecting geometry.

## Notes on honesty

No frame rate is claimed anywhere in this project's evidence. Headless captures run on SwiftShader,
which is a software rasteriser; the numbers that matter there are draw calls, triangles and texture
memory. See `docs/PERF.md`.
