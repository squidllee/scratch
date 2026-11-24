# The walkable route

33 rooms, 34 portals, one closed graph. `route.json` is the machine-readable copy and is the file the engine reads; this document explains it and records what is real against what we invented.

## 1. The walk, in order

The visitor enters at the pyramid, descends to the Hall Napoléon, and then takes the three wings in the order Denon → Sully → Richelieu.

1. Cour Napoléon, cross the court to the pyramid.
2. **Hall Napoléon**, level −1, under the glass pyramid.
3. East under the court, to the foot of the stairs.
4. **Escalier Daru**, three flights, the Winged Victory on the top landing and visible from the bottom step.
5. **Salle Daru** (702): the Coronation, the Horatii, the Grande Odalisque.
6. **Salle Denon** (701), a pass-through between the David and Delacroix hangs.
7. **Salle Mollien** (700): Liberty, the Raft of the Medusa, the Death of Sardanapalus.
8. **Salle des États** (711): the Mona Lisa alone on a free-standing wall, the Wedding at Cana filling the opposite wall.
9. South through the reconstructed sessions gallery.
10. **Grande Galerie** (710): 268 m of top-lit Italian painting.
11. **Salon Carré**, where the gallery ends.
12. **Rotonde d'Apollon**.
13. **Galerie d'Apollon** (705): 61 m of gold, the crown in a wall case.
14. Out through the **Pavillon de l'Horloge**.
15. **Cour Carrée**, cross to the Colonnade.
16. **Colonnade gallery**, inside Perrault's east wing.
17. Down the **Escalier Henri II**.
18. **Salle des Caryatides** (348): Diana of Versailles, the Borghese Gladiator, Goujon's caryatids.
19. **Room 346**, Greek classical.
20. **Room 345**, the Venus de Milo, free-standing, between the red marble pillars.
21. Optional spur: **Crypt of the Sphinx** (338).
22. Back through the Pavillon de l'Horloge.
23. North under the Cour Napoléon.
24. **Passage Richelieu**, between the two sculpture courts.
25. **Cour Marly** (102): the Marly Horses on the top terrace under the glass vault.
26. **Cour Puget** (105), one terrace down: Milo of Croton.
27. **Cour Khorsabad** (229): the lamassu.
28. **Room 227**: the Code of Hammurabi, spotlit.
29. Up the Richelieu stair.
30. **Napoleon III Apartments, Grand Salon** (544): crimson silk and gold, and the walk ends.

Distances the engine can rely on: the hall to the Daru staircase is 53 m of undercroft, the Grande Galerie is 268 m of unbroken run, the Galerie d'Apollon is 61 m, and the Cour Carrée is 112.5 m across.

## 2. The room table

`basis` uses the same vocabulary as `geometry.md`: **measured**, **derived**, **estimated**, **invented**. Anything marked invented is a stand-in and should be recognisably simple in the scene.

| id | Louvre room | wing | levels | floorY | clear h | area m2 | basis | ceiling | floor | walls | portals | art |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| hall-napoleon | — | pyramid | -1 | -9.0 | 9 | 2520 | derived | flat | floor.hall-napoleon-stone | wall.stone-cream | passage-denon, passage-richelieu-link, cour-napoleon | 0 |
| cour-napoleon | — | courtyard | 0 | 0.0 | open | 28000 | measured-total/estimated-split | open-sky | floor.pave-granite | wall.stone-limestone-warm | hall-napoleon, place-du-carrousel, pavillon-horloge, passage-richelieu-link | 0 |
| place-du-carrousel | — | courtyard | 0 | 0.0 | open | 21280 | derived | open-sky | floor.pave-granite | wall.stone-limestone-warm | cour-napoleon | 0 |
| passage-denon | — | denon | -1 | -9.0 | 4.5 | 1584 | estimated | flat | floor.hall-napoleon-stone | wall.stone-cream | hall-napoleon, escalier-daru | 0 |
| passage-richelieu-link | — | richelieu | -1 | -9.0 | 4.5 | 686 | estimated | flat | floor.hall-napoleon-stone | wall.stone-cream | hall-napoleon, cour-napoleon, passage-richelieu | 0 |
| escalier-daru | 703 | denon | -1,0,1 | 0.0 | 18 | 440 | estimated | coffered | floor.marble-checker | wall.ochre | passage-denon, galerie-michel-ange, salle-daru | 1 |
| galerie-michel-ange | 403 | denon | 0 | 0.0 | 6.2 | 660 | estimated | vault | floor.stone-flag | wall.stone-grey | escalier-daru | 3 |
| salle-daru | 702 | denon | 1 | 7.0 | 7.5 | 540 | estimated | glazed-skylight | floor.parquet-versailles | wall.red-madder | escalier-daru, salle-denon | 3 |
| salle-denon | 701 | denon | 1 | 7.0 | 7.5 | 540 | estimated | glazed-skylight | floor.parquet-versailles | wall.red-madder | salle-daru, salle-mollien | 0 |
| salle-mollien | 700 | denon | 1 | 7.0 | 7.5 | 540 | estimated | glazed-skylight | floor.parquet-versailles | wall.red-madder | salle-denon, salle-des-etats | 3 |
| salle-des-etats | 711 | denon | 1 | 7.0 | 8.5 | 696 | measured-area/derived-split | glazed-skylight | floor.parquet-versailles | wall.midnight-blue | salle-mollien, galerie-des-sessions | 2 |
| galerie-des-sessions | — | denon | 1 | 7.0 | 7.5 | 992 | invented | glazed-skylight | floor.parquet-versailles | wall.red-madder-deep | salle-des-etats, grande-galerie | 0 |
| grande-galerie | 710 | denon | 1 | 7.0 | 9.5 | 3484 | measured-width/truncated-length | glazed-skylight | floor.parquet-versailles | wall.stone-grey | galerie-des-sessions, salon-carre | 3 |
| salon-carre | — | denon | 1 | 7.0 | 8.5 | 260 | estimated | coffered | floor.parquet-versailles | wall.stone-grey | grande-galerie, rotonde-apollon | 0 |
| rotonde-apollon | — | sully | 1 | 7.0 | 15 | 221 | estimated | vault | floor.marble-checker | wall.apollon-blue | salon-carre, galerie-apollon | 0 |
| galerie-apollon | 705 | sully | 1 | 7.0 | 15 | 1037 | measured-length | vault | floor.marble-checker | wall.apollon-blue | rotonde-apollon, pavillon-horloge | 2 |
| pavillon-horloge | — | sully | 0,1,2 | 0.0 | 20 | 665 | derived | vault | floor.stone-flag | wall.stone-grey | cour-napoleon, cour-carree, escalier-henri-ii, galerie-apollon, sully-l2-corridor | 0 |
| escalier-henri-ii | — | sully | 0,1,2 | 0.0 | 14 | 380 | estimated | vault | floor.stone-flag | wall.stone-grey | pavillon-horloge, salle-des-caryatides | 0 |
| salle-des-caryatides | 348 | sully | 0 | 0.0 | 8.5 | 594 | measured-area/derived-split | coffered | floor.stone-flag | wall.stone-grey | escalier-henri-ii, salle-grec-346 | 3 |
| salle-grec-346 | 346 | sully | 0 | 0.0 | 6.4 | 766 | derived | flat | floor.stone-flag | wall.stone-grey | salle-des-caryatides, salle-venus-milo | 0 |
| salle-venus-milo | 345 | sully | 0 | 0.0 | 6.4 | 766 | derived | flat | floor.stone-flag | wall.stone-grey | salle-grec-346, sphinx-crypt | 1 |
| sphinx-crypt | 338 | sully | 0 | 0.0 | 5.5 | 855 | derived | vault | floor.stone-flag | wall.egypt-dark | salle-venus-milo | 1 |
| cour-carree | — | sully | 0 | 0.0 | open | 12656 | measured | open-sky | floor.pave-granite | wall.stone-limestone-warm | pavillon-horloge, salle-perrault | 0 |
| salle-perrault | — | sully | 0 | 0.0 | 6.4 | 2850 | derived | flat | floor.stone-flag | wall.stone-grey | cour-carree | 0 |
| sully-l2-corridor | — | sully | 2 | 13.6 | 4.2 | 1568 | invented | flat | floor.parquet-poitiers | wall.ochre-light | pavillon-horloge, dutch-rooms | 0 |
| dutch-rooms | 837 | sully | 2 | 13.6 | 4.2 | 956 | derived | flat | floor.parquet-poitiers | wall.slate-green | sully-l2-corridor | 2 |
| passage-richelieu | — | richelieu | 0 | 0.0 | 5 | 987 | estimated | flat | floor.stone-flag | wall.ochre-light | passage-richelieu-link, cour-marly, cour-puget, escalier-richelieu | 0 |
| cour-marly | 102 | richelieu | 0,-1 | 0.0 | 20 | 2214 | measured-roof/derived-floor | glazed-skylight | floor.marble-checker | wall.ochre-light | passage-richelieu | 1 |
| cour-puget | 105 | richelieu | -1 | -4.5 | 18 | 2050 | measured-width/derived-length | glazed-skylight | floor.marble-checker | wall.ochre-light | passage-richelieu, cour-khorsabad | 1 |
| cour-khorsabad | 229 | richelieu | 0 | 0.0 | 12 | 1312 | measured-width/derived-length | glazed-skylight | floor.stone-flag | wall.slate-green | cour-puget, salle-hammurabi | 1 |
| salle-hammurabi | 227 | richelieu | 0 | 0.0 | 5.5 | 624 | estimated | flat | floor.stone-flag | wall.slate-green | cour-khorsabad | 1 |
| escalier-richelieu | — | richelieu | 0,1 | 1.0 | 14 | 494 | invented | vault | floor.marble-checker | wall.ochre-light | passage-richelieu, napoleon-iii-grand-salon | 0 |
| napoleon-iii-grand-salon | 544 | richelieu | 1 | 7.0 | 6.5 | 570 | estimated | flat | floor.parquet-versailles | wall.crimson-silk | escalier-richelieu | 0 |

## 3. The portal graph

Rules, all enforced by `validate.mjs` in `coordinates.md`:

- Every portal is listed on **both** rooms, with the same `to`. The graph is undirected.
- Every room is reachable from `cour-napoleon`. There are no orphans and no islands.
- `kind` is descriptive only: `door` (with a leaf), `arch` (open, with a cased opening), `passage`, `stair` (different `floorY`), `open` (no threshold at all, e.g. a courtyard), `tunnel` (underground).
- A portal's opening **must sit on the shared wall** of the two footprints. The engine can derive the opening's position from the intersection of the two rectangles; nobody should hard-code door coordinates.

The graph deliberately contains three spurs — `galerie-michel-ange`, `sphinx-crypt` and `dutch-rooms` — which are one portal deep. Culling must handle a room whose only exit is the one you came in through.

## 4. What is real against what is reconstructed

**Real, and worth building carefully.**
The Escalier Daru with the Victory at the top of three flights; the three Roman red rooms in the order Daru → Denon → Mollien; the Salle des États with the Mona Lisa free-standing opposite the Cana; the Grande Galerie as one 268 m glazed run; the Galerie d'Apollon at 61 × 15 m behind a rotonde; the Pavillon de l'Horloge as the only stone passage between the two courts; the Cour Carrée crossed diagonally to the Colonnade; the Salle des Caryatides with its coffered ceiling and musicians' tribune on the south wall; the Venus de Milo free-standing between red marble pillars; the Sphinx in a dark room; the three Richelieu courts terraced and glazed; the Napoleon III salon in crimson silk.

**Reconstructed, and should look simplified.**
- `galerie-des-sessions` — invented. The real link from the Salle des États to the Grande Galerie is the Escalier Mollien plus the Salle des Sessions. We put one plain gallery there.
- `sully-l2-corridor` — invented. Real wing volume, invented use: a single corridor to reach the Dutch rooms.
- `escalier-richelieu` — invented. The wing has a grand stair; we made it a plain well.
- `passage-denon` and `passage-richelieu-link` — the underground links exist, but their lengths and widths are ours.
- All room footprints not marked measured are laid out to fill their wing, not surveyed.

**Omitted on purpose.** Sully level −1 (the medieval moat and the Louvre history rooms); Sully level 1 except Apollon; the Denon Egyptian galleries and the internal Cour du Sphinx and Cour Lefuel; Richelieu level 2 (the Northern schools and the Medici cycle); every space west of the Pavillon de Flore and east of the Colonnade; the Aile de Marsan, which is now the Musée des Arts Décoratifs and not the Louvre at all.

## 5. Conflicts inside the real museum that a clean model has to resolve

- **Cour Marly's level.** The Louvre's own page gives "Room 102, Richelieu wing, Level 0" and, elsewhere on the same page, "Level −1". The courts are terraced over three levels, so both are true of different tiers. We hold Marly at floor 0 with a lower terrace, and Puget at −4.5 because the museum labels room 105 as level −1.
- **The Crypt of the Sphinx's level.** The collection database says Niveau 0 for room 338; several visitor guides say −1. We follow the collection database.
- **The Salle des États' size.** 698 m² is the Louvre's figure; 40 m long is the commonly quoted length; 40 × 24 m from one guide is 960 m² and contradicts the published area. We take 40 × 17.4.
- **The Salle des Caryatides' size.** 600 m² is Wikipedia FR's figure citing the Louvre; a guide's 30 × 13 m is 390 m². We take 600 m² in a 25 × 23.75 m footprint.
- **The Grande Galerie's length.** 288 m today, 460 m originally. We build 288 and within it the open run is 268 m plus the 20 m Salon Carré.
- **The Borghese Gladiator's height.** The Louvre's catalogue says 173 cm; Wikipedia says 169 cm. We take the catalogue.
