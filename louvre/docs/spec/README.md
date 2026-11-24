# Louvre spec

The measured, sourced data every zone thread builds from. Written by the spec thread; no application code lives here.

| file | what it is | who reads it |
| --- | --- | --- |
| [`geometry.md`](geometry.md) | real dimensions in metres with a named source per number, tagged measured / derived / estimated / invented | everyone, once, before starting |
| [`coordinates.md`](coordinates.md) | the metric frame and the six non-overlapping zone boxes | the integration thread and every zone thread |
| [`route.md`](route.md) | the walkable route, room by room, with what is real and what we reconstructed | Denon, Sully and Richelieu interior threads |
| [`route.json`](route.json) | the same route, machine-readable: 34 rooms, 35 portals, footprints, materials, lighting | the engine: portal culling, tour mode, room transitions |
| [`artworks.md`](artworks.md) | 28 works with real sizes, placement and a three-sentence visual description each | the artwork library thread |
| [`artworks.json`](artworks.json) | the same inventory, machine-readable | the artwork library thread |
| [`palette.json`](palette.json) | the material palette: wall colours by wing, floor patterns, stone, gold, glass, wood, eight marble variants | every zone thread |
| [`validate.mjs`](validate.mjs) | checks the whole thing holds together | anyone who edits a footprint |

## Read this first if you are a zone thread

1. Your zone box is in `coordinates.md` §3. Build inside it; two boxes that overlap in all three axes is a bug.
2. Your rooms are listed under your zone in `coordinates.md` §5. Each room's footprint, floor level, clear height, ceiling type, floor and wall material and lighting are in `route.json`.
3. Your materials are keys into `palette.json`. Do not invent a hex value for a wall: if the room needs a colour that is not there, add it to the palette instead of hardcoding it in your zone.
4. The cornice is at y = 20.4 everywhere. Roofs above that line belong to the exterior zone.
5. Portals are undirected, reciprocal, and planar: both rooms must share a wall, or the run fails. Derive a doorway's position from the shared wall between two room footprints; never hard-code a door coordinate.

## Read this first if you are the artwork library thread

`artworks.json` gives you the size, the room, the placement hint and the sight line. The room's clear height and wall length come from `route.json`; `validate.mjs` already checks that every painting fits its wall and its ceiling. Three works (Cana 9.94 m, the Coronation 9.79 m, the Raft 7.16 m) are wider than their rooms are deep — they are meant to be seen in perspective, never whole.

## How much to trust a number

- **measured** — the Louvre's own figure, a survey, or a structural record. Use it as given.
- **derived** — arithmetic from measured numbers, with the arithmetic shown. Trustworthy.
- **estimated** — our judgement where nothing is published. Never present these as measured, and never round them to fake precision.
- **invented** — a stand-in for something we chose not to model. Should be visibly simple in the scene.

Known conflicts between real sources, and the choice made, are listed at the end of `geometry.md`, `route.md` and per artwork in `artworks.md`.

## Changing anything

Footprints, portals and areas are cross-checked:

```
node validate.mjs
```

It fails on: overlapping zone boxes, rooms escaping their zone, one-sided portals, portals with no shared wall, unreachable rooms, two rooms sharing plan area on the same level, declared areas that disagree with footprints, paintings that do not fit their walls, and palette keys that do not exist. A clean run exits 0.
