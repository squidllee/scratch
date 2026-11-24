# Performance: the budget, and how to measure it without lying

## The assembled museum — measured

The zone threads each measured their own wing. This is the whole building: five zones in one room
graph, every declared spawn point, `npm run capture -- --zone museum --verify --probe --one-load`,
51 viewpoints, verdict PASS.

| measure | value | ceiling |
| --- | --- | --- |
| worst visible triangles | **299,311** — the Cour Carrée, looking out over the roofs | 300,000 |
| worst draw calls | **78** — the Passage Richelieu, looking into Cour Marly | 150 |
| texture memory | **26.33 MB** (16.95 MB of it artwork canvases) | 64 MB |
| rooms in the graph | 40 (the spec's 34, plus a threshold, the spiral and the stair links) | — |
| portals | 94, of which 18 cross a wing boundary; 0 unresolved, 0 one-way | — |
| route doorways a visitor crosses | 31 of 31 standable | — |
| tour | 77 waypoints, 1,814 m, 0 legs through masonry, 100% covered in 820 s | 95% |

The feel of it, by room:

| viewpoint | draws | triangles | mean | std |
| --- | --- | --- | --- | --- |
| `pyramid-place-du-carrousel` | 48 | 250,011 | 178.2 | 53.7 |
| `pyramid-cour-napoleon-east` | 67 | 266,177 | 170.1 | 38.8 |
| `pyramid-pyramid-inside` | 66 | 266,141 | 156.3 | 29.7 |
| `exterior-cour-carree` | 68 | 299,311 | 141.8 | 28.9 |
| `exterior-roofline-above` | 37 | 201,061 | 169.4 | 48.7 |
| `exterior-seine-elevation` | 49 | 258,545 | 185.1 | 33.7 |
| `denon-escalier-daru-landing` | 13 | 11,664 | 155.5 | 47.1 |
| `denon-salle-des-etats` | 32 | 60,732 | 68.1 | 44.9 |
| `denon-grande-galerie-west` | 35 | 77,250 | 79.0 | 48.9 |
| `denon-grande-galerie-east` | 45 | 86,696 | 95.4 | 49.2 |
| `denon-salon-carre` | 23 | 63,736 | 100.0 | 35.7 |
| `sully-galerie-apollon-vault` | 23 | 16,580 | 73.0 | 54.4 |
| `sully-galerie-apollon-crown` | 40 | 24,108 | 107.4 | 94.1 |
| `sully-cour-carree-inside` | 41 | 231,971 | 147.8 | 26.2 |
| `sully-venus-de-milo-doorway` | 27 | 8,208 | 141.5 | 69.9 |
| `richelieu-cour-marly-terrace` | 32 | 80,834 | 161.7 | 43.9 |
| `richelieu-napoleon-iii-grand-salon-centre` | 39 | 70,016 | 89.5 | 53.4 |

Three things keep the assembled scene inside a budget each wing already met alone.

**The exterior backdrop is dropped indoors.** The exterior's 202k triangles of roof and façade are
not portal-culled — it declares no rooms to cull by — so at assembly they would be submitted in
every gallery frame. They are drawn only when the sky is in view: the camera is outdoors, or the
cells being drawn include one of the courts. Standing in the Grande Galerie costs 77k triangles
instead of 280k; standing in the Cour Carrée brings them back, at 299k.

**One room graph, so portals pay for themselves.** A gallery frame submits the camera's cell plus
what its doorways reach, across wing boundaries — which is why the Salle des États is 61k triangles
and the Apollon vault 17k, and why the heaviest frames are the two that see the whole palace.

**The distant city is 140 blocks, not 260.** The Cour Carrée view was 727 triangles over the ceiling
before the cut, and SCRA-6 ranked the city band as the first thing to give back without touching the
bay rhythm or the silhouette. Coverage is unchanged; density is 46% lower.

The margin at the Cour Carrée is thin — 689 triangles. The next lever on SCRA-6's list (pilaster
pairs to singles on the four outer street elevations, about 10k) is the one to pull if a future
change needs room, and it trades detail on elevations nobody stands in front of.

### The number that used to be a lie

`core/textures.ts` counts the shared tile canvases. The artwork canvases are painted by
`src/artworks/textures.ts` through its own ledger, so before assembly the HUD reported **8.0 MB**
while the scene carried **26.33 MB** — the 28 works are 16.95 MB of it. `core/perf.ts` now sums both
ledgers. Any texture figure quoted for this project before that change understated by about 18 MB.

## The budget

| measure | target | hard ceiling |
| --- | --- | --- |
| draw calls, whole scene | 80 | **150** |
| visible triangles | 150 000 | **300 000** |
| texture memory | 24 MB | **64 MB** |
| per-zone build time (JS) | 300 ms | 1 000 ms |

These are per *loaded scene*. The whole museum now loads at once, and the culler keeps the camera's
cell plus everything its doorways reach — three or four rooms of one or two zones — visible. A wing
that blew the draw-call ceiling on its own could not have been fixed here; none did.

`--zone <id>` still measures one wing alone, which is how each zone thread kept its own numbers
honest. `--zone museum` measures the building.

## What is being counted

- **Draw calls** = `renderer.info.render.calls` after the frame. One merged mesh per material is one
  call; one `InstancedMesh` is one call no matter how many instances. This is why
  `mergeByMaterial()` exists and why `windowRow()` and `balustrade()` instance their repetitions.
- **Triangles** = `renderer.info.render.triangles`, i.e. triangles actually submitted after frustum
  culling. If the number does not move when you look away from a room, culling is not working.
- **Texture memory** = the sum of every procedural canvas the project allocated, with mipmaps
  (~1.34×): a 512×512 RGBA canvas costs about 1.4 MB. Every texture is created through
  `src/core/textures.ts`, which is also the only place the number comes from.
- **Cells** = the active room set from `src/core/culling.ts`. A cell that stays active when it is
  behind two walls means your portals are wrong, not that the budget is generous.

## Never report an fps measured headless

The CI machine has no GPU. Chromium runs on SwiftShader, a software rasteriser: it produces correct
pixels at a frame rate that says nothing about a real browser. A scene measured at 12 fps headless
can run at 120 fps on a laptop, and a scene measured at 40 fps headless can stutter at 30 on a phone.
So:

- **Do not** quote `fps` from `window.__stats()` or the HUD in a report, a PR, or a commit message.
- **Do** quote draw calls, triangles and texture MB. Those are properties of the scene.
- If a change is about to make a zone slower, measure the thing that changed: triangles added,
  draw calls added, textures allocated.

The HUD prints the fps figure with the words "(software GL — ignore)" next to it for the same reason.

## Measuring honestly

```bash
cd louvre
npm run build
npm run capture -- --zone denon --all --out captures/
cat captures/capture-report.json
```

Add `--verify` and the same run also asserts the frame is not blank (`std >= 10`, >= 2 000 distinct
colours, read back from the WebGL framebuffer) and that the zone matches the measured spec. Exit
code 1 means a check failed: do not report that capture as evidence.

`capture-report.json` is the record:

```json
{
  "zone": "denon",
  "shots": [{ "file": ".../denon-grande-galerie-west.png",
              "stats": { "drawCalls": 42, "triangles": 118430, "textureMB": 9.8,
                         "cells": ["grande-galerie", "salon-carre"], "cellReason": "room graph" } }],
  "collision": { "roomCentre": true, "beyondEastWall": false, "beyondNorthWall": false, "farOutside": false },
  "consoleErrors": []
}
```

Rules for an honest number:

1. **Report the worst shot, not the best.** Take one capture per spawn point and quote the largest
   triangle count and draw-call count in the set.
2. **Load only your zone.** A scene with three zones loaded measures the sum, and the capture
   harness only loads the zone you name.
3. **Wait for a real frame.** The harness waits for `window.__ready` and two animation frames before
   the screenshot; the stats come from the frame that was actually drawn.
4. **A draw-call number that matches a round number of materials is a warning.** If a zone reports
   120 draw calls with 12 materials, per-room merging did not happen — check that you call
   `mergeByMaterial()` per room group.
5. **Count what you added.** `git diff --stat` plus one capture from before and after is the
   evidence for "this room costs 8 draw calls".

## On-demand rendering

The renderer draws only when something changes: a camera move, a control input, a resize, or an
explicit `invalidate()`. Standing still in a room costs approximately nothing, which is also why the
HUD can show a stale-looking fps while the page is idle. That is correct behaviour, not a stall.

Interactive tools that keep the scene animating (the guided tour) set `renderer.continuous = true`;
that is the only path that draws every animation frame.
