# Metric frame and zone boxes

This is the spatial contract. Every zone thread builds inside its box and nothing else. **Two zone boxes that overlap in all three axes are a bug**; `validate.mjs` fails the build on one.

## 1. The frame

| item | value |
| --- | --- |
| Unit | metre |
| Origin | centre of the square base of the Glass Pyramid, at the paving level of the Cour Napoléon |
| +X | east, toward the Cour Carrée and Perrault's Colonnade |
| +Y | up |
| +Z | south, toward the Seine |
| Ground level of the Cour Napoléon | **y = 0** |
| Pyramid apex | (0, 21.64, 0) |
| Level -1 floor (Hall Napoléon) | y = −9.0 |
| Level 0 floor (ground) | y = 0 |
| Level 1 floor (the painting floors) | y = +7.0 |
| Level 2 floor | y = +13.6 |
| Cornice | y = +20.4 |
| Ridge | y ≈ +28.7 |
| Pavilion domes | y ≈ +40 |

Handedness check: +X east, +Y up, +Z south is **left-handed** if you also want a right-handed cross product with Y up. Three.js uses a right-handed system where +Z points at the viewer. With +X east, +Y up and +Z south, `X × Y = −Z`, i.e. −Z north. That is consistent: the scene is right-handed, north is −Z, and a default camera looking down −Z looks north at the Pavillon de l'Horloge. No mirroring is needed anywhere.

## 2. The plan, projected

The palace as we model it, plan view, north at the top of the page. Numbers are metres.

```
                                      z = -141  ┌───────────────────────────────┐
                                                │      RICHELIEU  WING          │  x -84 .. +116
                                                │  (Cour Marly / Puget /        │
                                                │   Khorsabad under glass)      │
                                      z =  -70.5 └───────────────────────────────┘
                                                       Cour Napoléon
                                      z =  -70.5 ┌───────────────────────────────┐
                                                │                               │
                    ┌──────────────┐            │        ▲ pyramid              │  x -84 .. +116
   x = -236         │ Place du     │            │        ▲ 35.42 m              │
   Arc du Carrousel │ Carrousel    │  x = -84   │        ▲ 21.64 m              │
   at x = -220      │              │            │                               │
                    │   inverted   │            │   x = 0                       │
                    │  pyramid x=-130           │                               │
                    └──────────────┘            └───────────────────────────────┘
                                      z =  +70.5                          x = +116 ┌───┐ z=-80
                                                                                  │ S │
                                      DENON WING   x -172 .. +116                 │ U │
                                      z +70.5 .. +154                              │ L │ Cour Carrée
                                      (Salles Rouges north range,                 │ L │ z -56.25..+56.25
                                       Grande Galerie on the Seine)                │ Y │
                                                      z = +154  Seine quay  ──────┴───┘ z=+80
                                                                                  x = +276 (Colonnade)
```

Read it as: the Cour Napoléon is a 200 × 140 m court with the pyramid in it; the Denon wing runs along its south side and continues west along the Seine; the Richelieu wing runs along its north side; the Sully ring closes the east end; the Cour Carrée is inside the Sully ring; the Petite Galerie runs south from the Cour Carrée's south-west corner to the Grande Galerie.

## 3. Zone boxes

Six zones, seven boxes. The `exterior-wings` zone gets three roof boxes instead of one so that the courtyard stays clear for the pyramid and the courts.

| zone | purpose | x (m) | y (m) | z (m) | size (m) |
| --- | --- | --- | --- | --- | --- |
| `pyramid-courtyard` | pyramid, satellites, Arc du Carrousel, Cour Napoléon paving, Place du Carrousel paving, **Hall Napoléon and the two undercroft links** | −236 … +116 | −9.5 … **21.7** | −70.5 … +70.5 | 352 × 31.2 × 141 |
| `denon-interior` | every interior space of the Denon wing, levels −1, 0, 1 | −172 … +116 | −9.5 … 20.4 | +70.5 … +154 | 288 × 29.9 × 83.5 |
| `richelieu-interior` | every interior space of the Richelieu wing, levels −1, 0, 1, plus the three glazed courts | −84 … +116 | −9.5 … 20.4 | −141 … −70.5 | 200 × 29.9 × 70.5 |
| `sully-interior` | the Cour Carrée ring, the Cour Carrée itself, the Pavillon de l'Horloge, the Petite Galerie (Galerie d'Apollon), the Colonnade wing | +116 … +276 | −9.5 … 20.4 | −91.5 … +154 | 160 × 29.9 × 245.5 |
| `exterior-wings`, roof box 1 | roofs, attics and mansards over the Denon wing | −172 … +116 | **20.4 … 42** | +70.5 … +154 | 288 × 21.6 × 83.5 |
| `exterior-wings`, roof box 2 | roofs over the Richelieu wing | −84 … +116 | 20.4 … 42 | −141 … −70.5 | 200 × 21.6 × 70.5 |
| `exterior-wings`, roof box 3 | roofs over the Sully ring and the Petite Galerie | +116 … +276 | 20.4 … 42 | −91.5 … +154 | 160 × 21.6 × 245.5 |

**Every box pair either overlaps in at most two axes or merely touches.** The tower of the pyramid reaches 21.64 m, above the 20.4 m cornice line, which is exactly why the roof boxes stop at the court edges instead of spanning the whole footprint.

### The exterior zone's façade skins

The exterior zone also owns the outer skin of every elevation, as flat bands **2 m thick standing outside the building line**, y from 0 to 42. These live in free air, so they overlap no interior box:

| skin | band |
| --- | --- |
| Seine elevation (Denon) | z = +154 … +156, x = −172 … +116 |
| rue de Rivoli elevation (Richelieu) | z = −143 … −141, x = −84 … +116 |
| Colonnade (Sully east) | x = +276 … +278, z = −91.5 … +91.5 |
| Cour Napoléon east return (Sully west wing, outside face) | x = +114 … +116, z = −70.5 … +70.5 |

The interior zones build their walls from inside; the exterior zone builds from outside. Both surfaces exist in the real building (they are the two faces of the same masonry), so the 0.6 m of wall between them is simply not claimed by anyone. That is deliberate.

## 4. Rules the boxes imply

1. **No zone builds above y = 20.4 except `exterior-wings`.** The pyramid is the one exception and it belongs to `pyramid-courtyard`.
2. **`exterior-wings` builds nothing below y = 20.4** except the four façade skins and the ground-level porch steps. Cornices, balustrades and roof ornaments belong to it; everything from the plinth up to the cornice belongs to the corresponding interior zone, which renders the inside face.
3. **The Cour Carrée pavement and the Cour Napoléon pavement belong to `pyramid-courtyard` and `sully-interior` respectively.** The Sully zone owns the court because its four inner façades are its walls; the pyramid zone owns the Cour Napoléon because the pyramid and the Carrousel are there.
4. **The Hall Napoléon and the two undercroft links belong to `pyramid-courtyard`**, even though `route.json` files them as rooms. Rooms and zones are different taxonomies: a room says what the visitor is in, a zone says whose thread builds it.
5. **The three glazed courtyards belong to `richelieu-interior`**, roof glass included, from y = −9.5 up to the top of the vault at about 20 m. They are interiors with skylights, not outdoor courts.

## 5. Room-to-zone ownership

`route.json` carries a `zone` field on every room. The complete mapping, so nobody has to infer it:

| zone | rooms |
| --- | --- |
| `pyramid-courtyard` | `hall-napoleon`, `cour-napoleon`, `place-du-carrousel`, `passage-denon`, `passage-richelieu-link` |
| `denon-interior` | `escalier-daru`, `galerie-michel-ange`, `salle-daru`, `salle-denon`, `salle-mollien`, `salle-des-etats`, `galerie-des-sessions`, `grande-galerie`, `salon-carre` |
| `sully-interior` | `rotonde-apollon`, `galerie-apollon`, `pavillon-horloge`, `escalier-henri-ii`, `salle-des-caryatides`, `salle-grec-346`, `salle-venus-milo`, `sphinx-crypt`, `cour-carree`, `salle-perrault`, `sully-l2-corridor`, `dutch-rooms` |
| `richelieu-interior` | `passage-richelieu`, `cour-marly`, `cour-puget`, `cour-khorsabad`, `salle-hammurabi`, `escalier-richelieu`, `napoleon-iii-grand-salon` |

## 6. Verification

`node validate.mjs` in this directory checks, against the boxes above:

1. that no two zone boxes overlap in three axes;
2. that every room's footprint sits inside its declared zone box;
3. that every portal is reciprocal (the graph is undirected);
4. that every room is reachable from the Cour Napoléon;
5. that no two rooms on the same level in the same zone share plan area;
6. that each room's declared area agrees with its footprint within 9%;
7. that every artwork's room exists and lists it, and that no painting is wider than its wall or taller than its ceiling allows;
8. that every palette key a room names exists in `palette.json`;
9. **that every portal sits on a real wall** — two rooms must share a boundary segment (within one metre, for wall thickness), or, for a vertical link only, overlap in plan on different floors. A portal to nowhere fails the run. This is the check that would have caught `galerie-apollon`↔`pavillon-horloge` and `salle-des-caryatides`↔`salle-grec-346` before the Sully zone found them against the geometry.

A clean run is part of the spec being usable: if you change a footprint, run it.
