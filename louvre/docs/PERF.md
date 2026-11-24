# Performance: the budget, and how to measure it without lying

## The budget

| measure | target | hard ceiling |
| --- | --- | --- |
| draw calls, whole scene | 80 | **150** |
| visible triangles | 150 000 | **300 000** |
| texture memory | 24 MB | **64 MB** |
| per-zone build time (JS) | 300 ms | 1 000 ms |

These are per *loaded scene*, not per zone: the museum loads one zone at a time today, and after
integration the culler keeps three or four rooms of one or two zones visible at once. If a zone
alone blows the draw-call ceiling, integration cannot fix it.

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
