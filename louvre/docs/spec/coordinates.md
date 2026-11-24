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

Six zones. Interior zones are **volumes**; the exterior zone is a **surface envelope**. That distinction is the whole point of the split (see §4): an interior room owns its volume and may rise into the roof, and the exterior zone owns the skin that covers it.

| zone | kind | purpose | x (m) | y (m) | z (m) |
| --- | --- | --- | --- | --- | --- |
| `pyramid-courtyard` | volume | pyramid, satellites, Arc du Carrousel, both courts' paving, **Hall Napoléon and the two undercroft links** | −236 … +116 | −9.5 … **21.7** | −70.5 … +70.5 |
| `denon-interior` | volume | every interior space of the Denon wing, levels −1, 0, 1 | −172 … +116 | −9.5 … **28.7** | +70.5 … +154 |
| `richelieu-interior` | volume | every interior space of the Richelieu wing, levels −1, 0, 1, plus the three glazed courts | −84 … +116 | −9.5 … **28.7** | −141 … −70.5 |
| `sully-interior` | volume | the Cour Carrée ring, the Cour Carrée itself, the Pavillon de l'Horloge, the Petite Galerie, the Colonnade wing | +116 … +276 | −9.5 … **28.7** | −91.5 … +154 |
| `exterior-wings` | surface | roof planes from the cornice up, pavilion domes, and the four façade skins | −172 … +276 | 20.4 … 40 | −141 … +154 |

**The interior volumes stop at the ridge, 28.7 m.** That is the highest an interior room may reach, and no room reaches it. The exterior zone's envelope starts at the cornice, 20.4 m, and runs to the top of the pavilion domes at 40 m. The two overlap between 20.4 and 28.7 **by design**: they are not competing for space, they are the inside and the outside of the same roof. `validate.mjs` therefore checks overlap among volumes only, and separately checks that no interior volume exceeds the ridge.

### Rooms that use the headroom

The cornice is not a ceiling for interiors. These are the rooms whose volume the reviewer should know about, with the absolute height each reaches, so nobody has to rediscover them at merge time:

| room | top of volume (m, absolute) | above the 20.4 m cornice? | what rises |
| --- | --- | --- | --- |
| `cour-marly` | **26.4** | yes, 6.0 | Pei's glazed vault, propped on the courtyard cornices; the structural record limits every court roof to about 7 m of rise so it stays behind the Rivoli roofline |
| `cour-puget` | **26.4** | yes, 6.0 | the same vault system over a floor 4.5 m lower, so its clear height is 30.9 |
| `cour-khorsabad` | **24.0** | yes, 3.6 | the third and lowest court |
| `galerie-apollon` | **20.85** | yes, 0.45 | the gilded barrel vault; clear height is 13.85 above a gallery floor at 7 |
| `rotonde-apollon` | **20.85** | yes, 0.45 | the same vault, continuing round the rotunda |
| `napoleon-iii-grand-salon` | 13.5 | **no** | a 6.5 m salon on a level-1 floor: tall for its floor, and still under the cornice. Listed because it is the room most likely to be assumed taller than it is |

The Pavillon de l'Horloge tops out at 20.0 m, on the cornice line. Its dome rises to about 40 m and belongs to `exterior-wings`.

Everything else in `route.json` tops out below 20.4. If a room is added that tops out above the cornice, add it to this table and to the `HEADROOM` set in `validate.mjs`; the run fails until you do.

### The exterior zone's façade skins

The exterior zone also owns the outer skin of every elevation, as flat bands **2 m thick standing outside the building line**, y from 0 to 42. These live in free air, so they overlap no interior volume:

| skin | band |
| --- | --- |
| Seine elevation (Denon) | z = +154 … +156, x = −172 … +116 |
| rue de Rivoli elevation (Richelieu) | z = −143 … −141, x = −84 … +116 |
| Colonnade (Sully east) | x = +276 … +278, z = −91.5 … +91.5 |
| Cour Napoléon east return (Sully west wing, outside face) | x = +114 … +116, z = −70.5 … +70.5 |

The interior zones build their walls from inside; the exterior zone builds from outside. Both surfaces exist in the real building (they are the two faces of the same masonry), so the 0.6 m between them is claimed by neither. That is deliberate.

## 4. Rules the boxes imply

1. **Roof surfaces and façade skins belong to `exterior-wings`. Interior volumes do not stop at the cornice** — a room may rise into the roof as its own architecture requires, up to the ridge at 28.7 m. The exterior owns the surface above it; the interior owns the volume below it. The two are the two sides of one roof and are not competing for the same space.
2. **`exterior-wings` builds no solid volume**, only skins: roof planes, dormers, chimney stacks, balustrades, cornices and the four façade bands. Nothing below the cornice except those bands. The pyramid at 21.7 m is the one object above the cornice line that belongs to `pyramid-courtyard`, because nothing covers it.
3. **The Cour Carrée pavement and the Cour Napoléon pavement belong to `pyramid-courtyard` and `sully-interior` respectively.** The Sully zone owns the court because its four inner façades are its walls; the pyramid zone owns the Cour Napoléon because the pyramid and the Carrousel are there.
4. **The Hall Napoléon and the two undercroft links belong to `pyramid-courtyard`**, even though `route.json` files them as rooms. Rooms and zones are different taxonomies: a room says what the visitor is in, a zone says whose thread builds it.
5. **The three glazed courtyards belong to `richelieu-interior`**, roof glass included, from y = −9.5 up to the apex of each vault at 24–26.4 m. They are interiors with skylights, not outdoor courts, and they are why the Richelieu volume reaches most of the way to the ridge.

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

1. that no two **volume** zone boxes overlap in three axes, and that no interior volume exceeds the ridge at 28.7 m (the exterior skin is a surface envelope and is not compared, by design);
2. that every room's footprint sits inside its declared zone box;
3. that every portal is reciprocal (the graph is undirected);
4. that every room is reachable from the Cour Napoléon;
5. that no two rooms on the same level in the same zone share plan area;
6. that each room's declared area agrees with its footprint within 9%;
7. that every artwork's room exists and lists it, and that no painting is wider than its wall or taller than its ceiling allows;
8. that every palette key a room names exists in `palette.json`;
9. **that every portal sits on a real wall** — two rooms must share a boundary segment (within one metre, for wall thickness), or, for a vertical link only, overlap in plan on different floors. A portal to nowhere fails the run. This is the check that would have caught `galerie-apollon`↔`pavillon-horloge` and `salle-des-caryatides`↔`salle-grec-346` before the Sully zone found them against the geometry.

A clean run is part of the spec being usable: if you change a footprint, run it.

10. that every room reaching above the 20.4 m cornice is listed in the `HEADROOM` set in `validate.mjs` and in the table above, so a new one cannot slip through unannounced.
