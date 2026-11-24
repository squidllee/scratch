# The artwork inventory

28 works, each with its measured size, its room in `route.json`, a placement hint, and a visual description precise enough to reconstruct the composition procedurally. `artworks.json` is the machine-readable copy and the one the artwork library imports; this file is the same content written to be read.

Every size is the real one. Where the Louvre's database and another source disagree, both are in the entry and the choice is stated. The visual descriptions are written for a builder who will never see the painting: they give the figure arrangement, the dominant colours, the background and the direction of the light, in that order, and they stop there. They do not describe brushwork or surface, because a procedural reconstruction will not have it.

## All 28 at a glance

| # | work | artist | year | room (Louvre no.) | size | type |
|---|---|---|---|---|---|---|
| 1 | Portrait of Lisa Gherardini, wife of Francesco del Giocondo, known as the Mona Lisa | Leonardo da Vinci | c. 1503-1519 | `salle-des-etats` (711) | 77 × 53 cm | painting |
| 2 | The Wedding Feast at Cana | Paolo Veronese | 1562-1563 | `salle-des-etats` (711) | 677 × 994 cm | painting |
| 3 | The Coronation of Napoleon I and the Empress Josephine in Notre-Dame, 2 December 1804 | Jacques-Louis David | 1805-1807 | `salle-daru` (702) | 621 × 979 cm | painting |
| 4 | The Oath of the Horatii | Jacques-Louis David | 1784 | `salle-daru` (702) | 330 × 425 cm | painting |
| 5 | Une Odalisque (La Grande Odalisque) | Jean-Auguste-Dominique Ingres | 1814 | `salle-daru` (702) | 91 × 162 cm | painting |
| 6 | Liberty Leading the People (28 July 1830) | Eugene Delacroix | 1830 | `salle-mollien` (700) | 260 × 325 cm | painting |
| 7 | The Raft of the Medusa | Theodore Gericault | 1818-1819 | `salle-mollien` (700) | 491 × 716 cm | painting |
| 8 | The Death of Sardanapalus | Eugene Delacroix | 1827 | `salle-mollien` (700) | 392 × 496 cm | painting |
| 9 | The Lacemaker | Johannes Vermeer | c. 1669-1670 | `dutch-rooms` (837) | 24 × 21 cm | painting |
| 10 | The Astronomer | Johannes Vermeer | 1668 | `dutch-rooms` (837) | 51 × 45 cm | painting |
| 11 | The Virgin of the Rocks | Leonardo da Vinci | c. 1483-1494 | `grande-galerie` (710) | 199 × 122 cm | painting |
| 12 | The Virgin and Child with Saint Anne | Leonardo da Vinci | c. 1503-1519 | `grande-galerie` (710) | 168 × 130 cm | painting |
| 13 | The Virgin and Child with the Infant Saint John the Baptist (La Belle Jardiniere) | Raphael | 1507-1508 | `grande-galerie` (710) | 122 × 80 cm | painting |
| 14 | Winged Victory of Samothrace (Nike of Samothrace) | Attributed to Pythokritos of Rhodes | c. 200-190 BC | `escalier-daru` (703) | 557 × 429 × 248 cm | sculpture |
| 15 | Aphrodite, known as the Venus de Milo | Alexandros of Antioch (attributed) | c. 150-125 BC | `salle-venus-milo` (345) | 204 × 100 × 60 cm | sculpture |
| 16 | The Marly Horses (pair) | Guillaume Coustou | 1743-1745 | `cour-marly` (102) | 355 × 284 × 127 cm | sculpture |
| 17 | The Great Sphinx of Tanis | Unattributed (Old Kingdom, reused in the Middle and New Kingdoms) | c. 2600 BC, with later inscriptions | `sphinx-crypt` (338) | 183 × 154 × 480 cm | sculpture |
| 18 | Stele of the Code of Hammurabi | Unattributed, Babylonian | c. 1792-1750 BC | `salle-hammurabi` (227) | 225 × 79 × 47 cm | stele |
| 19 | Artemis with a Doe, known as the Diana of Versailles | Roman copy after Leochares | 1st-2nd century AD, after a Greek bronze of c. 330 BC | `salle-des-caryatides` (348) | 201 × 130 × 70 cm | sculpture |
| 20 | Borghese Gladiator | Agasias of Ephesus (signed) | c. 100 BC | `salle-des-caryatides` (348) | 173 × 172 × 169 cm | sculpture |
| 21 | The four Caryatids of the musicians' gallery | Jean Goujon | 1550 | `salle-des-caryatides` (348) | 280 × 60 × 45 cm | architectural-sculpture |
| 22 | The Dying Slave | Michelangelo | 1513-1515 | `galerie-michel-ange` (403) | 228 × 72 × 54 cm | sculpture |
| 23 | The Rebellious Slave | Michelangelo | 1513-1515 | `galerie-michel-ange` (403) | 215 × 49 × 76 cm | sculpture |
| 24 | Psyche Revived by Cupid's Kiss | Antonio Canova | 1787-1793 | `galerie-michel-ange` (403) | 155 × 168 × 101 cm | sculpture |
| 25 | Personal Crown of Louis XV | Claude Ronde, executed by Augustin Duflos | 1722 | `galerie-apollon` (705) | 24 × 22 × 20 cm | object |
| 26 | Apollo Slays Python (central panel of the Galerie d'Apollon vault) | Eugene Delacroix | 1850-1851 | `galerie-apollon` (705) | 800 × 1600 cm | ceiling-painting |
| 27 | Milo of Croton | Pierre Puget | 1671-1682 | `cour-puget` (105) | 270 × 140 × 70 cm | sculpture |
| 28 | Winged human-headed bull (lamassu) from the palace of Sargon II at Khorsabad | Unattributed, Neo-Assyrian | 721-705 BC | `cour-khorsabad` (229) | 420 × 436 × 97 cm | sculpture |

## The works

### 1. Portrait of Lisa Gherardini, wife of Francesco del Giocondo, known as the Mona Lisa

**Leonardo da Vinci** · c. 1503-1519 · Oil on poplar panel · 77 × 53 cm · painting

Hangs in `salle-des-etats` — Salle des Etats (Mona Lisa room), Louvre room 711, denon wing, level 1, clear height 8.5 m.

- **Size source:** Louvre press (2019): 'the poplar panel measures 79.4 x 53 cm' including the frame rebate; the painted surface is 77 x 53.
- **Placement:** Free-standing cimaise in the centre of the west end of the room, on a technical console, inside a sealed glass case; 1.75 m to the panel's centre. Intended sight line 3 m. Frame: gilded, dark patina, 14 cm.

**What it looks like.** A single seated woman fills the frame from the waist up, turned three-quarters toward the viewer with her head nearly frontal, hands crossed at the lower left, dark olive dress and a thin dark veil over hair that falls to her shoulders. Behind her a blue-green landscape of winding roads, a lake and eroded mountains recedes into aerial haze, with no horizon line tying the left and right halves to the same height. Light comes from the upper left, the face glows against the almost black dress and the shadows are entirely soft, with no drawn edges anywhere in the flesh.

### 2. The Wedding Feast at Cana

**Paolo Veronese** · 1562-1563 · Oil on canvas · 677 × 994 cm · painting

Hangs in `salle-des-etats` — Salle des Etats (Mona Lisa room), Louvre room 711, denon wing, level 1, clear height 8.5 m.

- **Size source:** collections.louvre.fr (INV 142): 6.77 x 9.94 m.
- **Placement:** Full north wall, filling it wall-to-wall with a 60 cm gap at each end; the bottom edge 1.2 m above the floor. Intended sight line 12 m. Frame: gilded, 18 cm.

**What it looks like.** Forty-odd figures sit and stand along a long table that runs the full width, on a raised terrace between two giant Corinthian columns framing a pale blue sky at the centre. Christ sits at the exact centre of the table, small, with the apostles, while the foreground left is dominated by musicians in sixteenth-century dress playing lutes, and a dwarf holds a parrot at the lower right. The palette is dominated by silver-grey and white silk, warm flesh, deep crimson and ultramarine, and the whole foreground floor of coloured marble is painted in perspective running toward the centre of the horizon, so the eye lands on Christ from any angle in the room.

### 3. The Coronation of Napoleon I and the Empress Josephine in Notre-Dame, 2 December 1804

**Jacques-Louis David** · 1805-1807 · Oil on canvas · 621 × 979 cm · painting

Hangs in `salle-daru` — Salle Daru (Roman red room), Louvre room 702, denon wing, level 1, clear height 7.5 m.

- **Size source:** collections.louvre.fr (INV 3699): 6.21 x 9.79 m.
- **Placement:** East long wall of the Salle Daru, centred, bottom edge 1.3 m above the floor. Intended sight line 11 m. Frame: gilded, 16 cm.

**What it looks like.** A wide horizontal interior of Notre-Dame: Napoleon stands at the centre-left in scarlet and white, holding the crown above Josephine who kneels before him in white satin and a crimson train held by two women. The right half is packed with clergy in gold and white vestments and the left with officers, marshals and the Emperor's family, all ranked in a shallow stage across the middle ground, while David himself sits drawing in the tribune at the upper left. The light is theatrical and even, gold on the ecclesiastical side and red-white-blue on the civil side, against stone columns and hangings that recede only slightly — the composition is deliberately flat and processional rather than deep.

### 4. The Oath of the Horatii

**Jacques-Louis David** · 1784 · Oil on canvas · 330 × 425 cm · painting

Hangs in `salle-daru` — Salle Daru (Roman red room), Louvre room 702, denon wing, level 1, clear height 7.5 m.

- **Size source:** Louvre inventory INV 3692, as published in the Louvre's 2022 catalogue.
- **Placement:** West short wall of the Salle Daru, centred. Intended sight line 7 m. Frame: gilded, 12 cm.

**What it looks like.** Three young men in the left third stand in a rigid row with legs braced and right arms thrust up toward a sword held high by their father, who occupies the centre in a red cloak. The right third holds three women and two children collapsed together on the floor and against a column, heads bowed, in soft warm shadow. The whole scene sits in a bare Roman room of ochre walls and three plain arches with a single dark column, lit from the left so the men are hard-edged and bright and the women softer and dimmer — the entire architecture is there only to separate the two halves.

### 5. Une Odalisque (La Grande Odalisque)

**Jean-Auguste-Dominique Ingres** · 1814 · Oil on canvas · 91 × 162 cm · painting

Hangs in `salle-daru` — Salle Daru (Roman red room), Louvre room 702, denon wing, level 1, clear height 7.5 m.

- **Size source:** collections.louvre.fr (RF 1158): 0.91 x 1.62 m.
- **Placement:** North short wall of the Salle Daru, 1.6 m centre height. Intended sight line 4.5 m. Frame: gilded, 10 cm.

**What it looks like.** A nude woman lies full-length on a blue bed, seen from behind and above in a long horizontal S, her back toward the viewer, head turned over her right shoulder to look out, a striped turban tied at the nape. Blue cushions and disordered white and brown sheets crowd the left, a peacock-feather fan lies in her right hand over the raised left leg, and a blue curtain falls along the right edge against a near-black background. The flesh is pearly and unnaturally smooth with no visible brushwork, the blues are cold and saturated against warm ochre skin, and the light is even and sourceless — the only strong values are the white sheets and the black ground.

### 6. Liberty Leading the People (28 July 1830)

**Eugene Delacroix** · 1830 · Oil on canvas · 260 × 325 cm · painting

Hangs in `salle-mollien` — Salle Mollien (Roman red room), Louvre room 700, denon wing, level 1, clear height 7.5 m.

- **Size source:** collections.louvre.fr / Wikipedia: 2.60 x 3.25 m. The Louvre page's dimension field is truncated at 'Hauteur : 2,6'.
- **Placement:** East long wall of the Salle Mollien, centred. Intended sight line 6.5 m. Frame: gilded, 12 cm.

**What it looks like.** A pyramid of bodies climbs from a heap of dead and dying men at the bottom to a woman at the apex who strides right-forward, bare-breasted, holding the tricolour on a long staff in her raised right hand and a musket with bayonet in her left. Around her legs a boy in a black cap fires two pistols and a man in a top hat with a double-barrelled gun looks up at her, and behind them the crowd recedes into smoke past the towers of Notre-Dame on the right horizon. The palette is dark brown and grey with three patches of saturated colour — the blue-white-red of the flag, the red sash, the gold of the rising smoke — and the light comes from the left front so the dead in the foreground are the brightest flesh in the picture.

### 7. The Raft of the Medusa

**Theodore Gericault** · 1818-1819 · Oil on canvas · 491 × 716 cm · painting

Hangs in `salle-mollien` — Salle Mollien (Roman red room), Louvre room 700, denon wing, level 1, clear height 7.5 m.

- **Size source:** collections.louvre.fr (INV 4884): 4.91 x 7.16 m.
- **Placement:** West short wall of the Salle Mollien, centred, bottom edge 1.2 m above the floor. Intended sight line 9 m. Frame: gilded, 14 cm.

**What it looks like.** A raft of bound planks occupies the lower half of the canvas and tilts up to the right, carrying about fifteen figures who form a rising diagonal from the dead at the bottom left to a young man at the upper right waving a cloth at a tiny ship on the horizon. Most bodies are nude, ochre and olive, lit from the left; one older man sits in the left foreground holding a corpse and staring out of the picture, and a mast with a torn sail rises at the centre-left. Sea and sky fill the top third in a dark green-black swell under a low, livid sky, and the whole surface is built from a narrow range of browns, greens and greys with only the flesh and the rag catching light.

### 8. The Death of Sardanapalus

**Eugene Delacroix** · 1827 · Oil on canvas · 392 × 496 cm · painting

Hangs in `salle-mollien` — Salle Mollien (Roman red room), Louvre room 700, denon wing, level 1, clear height 7.5 m.

- **Size source:** Wikipedia and the Louvre's own catalogue entry (RF 2346): 3.92 x 4.96 m.
- **Placement:** South long wall of the Salle Mollien, centred. Intended sight line 7.5 m. Frame: gilded, 12 cm.

**What it looks like.** The king lies on a vast bed at the upper left, propped on one elbow under a crimson canopy, watching without expression as his world is destroyed around him. The rest of the canvas is a diagonal cascade of bodies, horses and gold: a nude woman is dragged across the bed's foot, a horse rears at the right, a man stabs himself at the lower left, and the whole floor is heaped with red, gold and white fabric. The perspective tips steeply up and back, so the bed floats above the slaughter, and the light is a single warm shaft from the left that catches the bed and leaves everything else in hot red shadow.

### 9. The Lacemaker

**Johannes Vermeer** · c. 1669-1670 · Oil on canvas, mounted on panel · 24 × 21 cm · painting

Hangs in `dutch-rooms` — Dutch Golden Age rooms, Louvre room 837, sully wing, level 2, clear height 4.2 m.

- **Size source:** The Louvre's own teaching sheet: H 24 cm, W 21 cm. Wikipedia gives 24.5 x 21.
- **Placement:** North wall, hung at 1.55 m centre, in a wall case with individually controlled light. Intended sight line 1.2 m. Frame: dark wood with gilt inner edge, 5 cm.

**What it looks like.** A young woman leans forward over her work, head down, entirely absorbed, her hands holding bobbins above a lace pillow that fills the lower centre of the picture. She wears a mustard-yellow bodice with a white collar and a blue skirt, and behind her is a bare pale wall with a red and white cushion and a blue cloth bundled on a table to the left. Light enters from the right — unusual for Vermeer — catching the side of her face and the threads, while everything outside the tight circle of her hands and shoulders is dissolved into soft blur.

### 10. The Astronomer

**Johannes Vermeer** · 1668 · Oil on canvas · 51 × 45 cm · painting

Hangs in `dutch-rooms` — Dutch Golden Age rooms, Louvre room 837, sully wing, level 2, clear height 4.2 m.

- **Size source:** Wikipedia and the Louvre's standard catalogue: 51 x 45 cm.
- **Placement:** East wall, 1.6 m centre height. Intended sight line 1.5 m. Frame: dark Holland frame, 6 cm.

**What it looks like.** A young man in a loose ochre robe sits at a table, turned three-quarters to the left, one hand on a celestial globe and the other resting on the table edge, his face lifted and slightly away from the viewer as if thinking. The room behind him is dark and shallow, with a heavy tapestry or curtain hanging at the left and a painting of the finding of Moses in a black frame on the far wall. Light comes from a window at the left, on the upper body and the globe's gilding, while the lower half stays in warm shadow — the composition is a tight rectangle closed off at every edge except the window.

### 11. The Virgin of the Rocks

**Leonardo da Vinci** · c. 1483-1494 · Oil on canvas, transferred from panel · 199 × 122 cm · painting

Hangs in `grande-galerie` — Grande Galerie, Louvre room 710, denon wing, level 1, clear height 9.5 m.

- **Size source:** Louvre inventory INV 777; the 199.5 x 122 cm figure is the standard published one.
- **Placement:** North (interior) wall of the Grande Galerie, in the first bays from the east, hung at 1.4 m centre. Intended sight line 3 m. Frame: gilded, 14 cm.

**What it looks like.** Four figures sit compressed into a dark rock grotto: Mary at the upper centre with her arm around the infant John, who kneels to the left in prayer, an angel at the lower right looking out and pointing, and the Christ child at the lower left raising two fingers. The arrangement forms a tight pyramid with heads at four heights and hands all converging on the lower centre, and behind them a blue-grey landscape of jagged peaks and water shows through two openings in the rock. The palette is almost monochrome — brown rock, black shadow, deep blue-green distance — with only the flesh and Mary's blue mantle carrying colour, and the light is a soft even glow with no visible source and no cast shadows.

### 12. The Virgin and Child with Saint Anne

**Leonardo da Vinci** · c. 1503-1519 · Oil on poplar panel · 168 × 130 cm · painting

Hangs in `grande-galerie` — Grande Galerie, Louvre room 710, denon wing, level 1, clear height 9.5 m.

- **Size source:** collections.louvre.fr: 1.68 x 1.13 m, later enlarged to 1.30 m wide. We use the current 130.
- **Placement:** North wall, second bay from the east, hung high at 1.7 m centre. Intended sight line 3.5 m. Frame: gilded, 16 cm.

**What it looks like.** Three generations interlock in one continuous spiral: Saint Anne sits at the upper right, her daughter Mary leaning forward on her lap at the centre-left, and the Christ child in Mary's arms at the lower right twists round to grasp a lamb. The bodies overlap completely so that the two women read as a single mass with four hands, and behind them a blue-green mountain landscape rises into mist with a river and a tiny town below. Light is soft, warm and sourceless; the only saturated colour is Mary's blue and the lamb, everything else in a narrow range of warm browns and cool greys.

### 13. The Virgin and Child with the Infant Saint John the Baptist (La Belle Jardiniere)

**Raphael** · 1507-1508 · Oil on poplar panel · 122 × 80 cm · painting

Hangs in `grande-galerie` — Grande Galerie, Louvre room 710, denon wing, level 1, clear height 9.5 m.

- **Size source:** collections.louvre.fr (INV 602): 1.22 x 0.80 m.
- **Placement:** South (river) wall, third bay from the east, hung at 1.4 m centre. Intended sight line 2.5 m. Frame: gilded, 12 cm.

**What it looks like.** Mary sits at the centre in a meadow, her head turned down and to the left toward the Christ child standing between her knees, while the infant John kneels to the right holding his reed cross. The three heads form a low pyramid, hands crossing at the centre where the children meet, and behind them a luminous green landscape of hills, a lake and slender trees fades to a pale blue horizon. The palette is clear and cool — ultramarine mantle, red sleeve, green meadow — and the light is open and even under a high sky, with crisp edges on the figures and soft atmospheric depth behind.

### 14. Winged Victory of Samothrace (Nike of Samothrace)

**Attributed to Pythokritos of Rhodes** · c. 200-190 BC · Parian marble, with a marble ship's prow and a modern socle · 557 × 429 × 248 cm · sculpture

Hangs in `escalier-daru` — Daru Staircase (Escalier Daru), with the landing of the Winged Victory, Louvre room 703, denon wing, level -1/0/1, clear height 18 m.

- **Size source:** Wikipedia's measured breakdown of the assembled monument: total 5.57 m including socle; statue 2.75 m; ship 2.01 m high, 4.29 m long, 2.48 m wide; base 4.76 x 1.76 m.
- **Placement:** Top landing of the Daru staircase, facing the descent: the goddess's right side toward the arriving visitor, ship prow projecting forward and to the left. Intended sight line 6 m. No frame: freestanding.

**What it looks like.** A headless, armless female figure in a wind-pressed chiton strides forward with the right leg advanced and the left trailing, the garment moulded to the torso and blown back in deep folds against the hips and thighs. Two huge feathered wings sweep up and back from the shoulders, the right wing raised and the left lower, and she stands planted on the forward deck of a marble warship whose prow juts out toward the viewer with a painted eye, the whole on a plain rectangular base. The marble is warm grey-white with an ochre stain, lit from above and slightly left so that the torso is the brightest mass in the room and the folds of the chiton read as sharp alternating light and shadow.

### 15. Aphrodite, known as the Venus de Milo

**Alexandros of Antioch (attributed)** · c. 150-125 BC · Parian marble · 204 × 100 × 60 cm · sculpture

Hangs in `salle-venus-milo` — Venus de Milo room (classical and Hellenistic Greek art), Louvre room 345, sully wing, level 0, clear height 6.4 m.

- **Size source:** The Louvre's catalogue gives 204 cm; other sources give 201 (Curtis), 203 (Brill), 211 with the plinth (Pasquier). We take the Louvre's 204. Width and depth are estimates from the plinth plan.
- **Placement:** Free-standing on a low plinth in the centre of the room, twisted slightly to her left, so that she is seen against two walls rather than one. Intended sight line 5 m. No frame: freestanding.

**What it looks like.** A standing nude female figure from the hips up, in Parian marble, with the himation fallen to a thick roll around the hips and legs so that the upper body is bare and the lower is draped in deep vertical folds. Both arms are missing from just below the shoulder, the head is turned to her own left and slightly down, and the weight is carried on the right leg with the left bent and the knee pushing through the drapery. The surface is a warm, slightly yellowed white, lit from above so the torso reads as one soft rounded mass and the drapery as sharp vertical shadows; the missing arms leave the silhouette open in a way that makes the figure look larger than its two metres.

### 16. The Marly Horses (pair)

**Guillaume Coustou** · 1743-1745 · Carrara marble · 355 × 284 × 127 cm · sculpture

Hangs in `cour-marly` — Cour Marly, Louvre room 102, richelieu wing, level 0/-1, clear height 20 m.

- **Size source:** Wikipedia FR: 3.40 m high (3.55 m with accessory), 2.84 m wide, 1.27 m deep. Two groups, MR 1802 and MR 1803.
- **Placement:** Top terrace of the Cour Marly, the pair set facing each other about 12 m apart on the long axis, so each is seen in three-quarter against the glass roof. Intended sight line 12 m. No frame: freestanding.

**What it looks like.** A rearing horse rears almost vertical at the centre, mane and tail flying, one foreleg raised and the head thrown back and up to the right. A nude male groom struggles at its side, holding a halter with both hands on the horse's near side, his body braced back and twisted, one foot planted behind him on a rock. The group is carved as one diagonal mass of marble from the groom's feet to the horse's head, with the horse's pale flank as the largest lit surface and deep shadow under the belly and behind the groom.

### 17. The Great Sphinx of Tanis

**Unattributed (Old Kingdom, reused in the Middle and New Kingdoms)** · c. 2600 BC, with later inscriptions · Pink granite · 183 × 154 × 480 cm · sculpture

Hangs in `sphinx-crypt` — Crypt of the Sphinx, Louvre room 338, sully wing, level 0, clear height 5.5 m.

- **Size source:** Wikipedia's measured figures: 480 cm long, 183 cm high, 154 cm wide. The Louvre record (A 23) agrees.
- **Placement:** Centre of the crypt, long axis running north-south with the face toward the entrance, so the visitor meets it head-on and the body recedes into darkness. Intended sight line 4 m. No frame: freestanding.

**What it looks like.** A colossal lion-bodied sphinx couched on its belly with the forepaws extended forward, the head turned to face the viewer and wearing the striped nemes headcloth with a uraeus on the brow. The face is broad and calm, the eyes half outlined, and the body is a single long horizontal mass of mottled pink-grey granite with the hindquarters packed tight against the rear. It is lit by one narrow pool from above so the head is pale and the flanks and paws fall into near-black, making the figure read as a head floating over a dark mass.

### 18. Stele of the Code of Hammurabi

**Unattributed, Babylonian** · c. 1792-1750 BC · Black basalt · 225 × 79 × 47 cm · stele

Hangs in `salle-hammurabi` — Room of the Code of Hammurabi, Louvre room 227, richelieu wing, level 0, clear height 5.5 m.

- **Size source:** Wikipedia FR's stele table: 225 x 79 x 47 cm, inventory Sb 8.
- **Placement:** Free-standing near the centre of the room, front face toward the entrance, corner lit hard from the upper left so the text is raked. Intended sight line 3 m. No frame: freestanding.

**What it looks like.** A tall rounded-topped stele of black basalt, its upper fifth carved in relief with two standing figures: Hammurabi on the left in a long robe, right arm raised, receiving a rod and ring from the seated sun god Shamash on the right, who wears a horned crown and a fluted robe. Below the relief the entire remaining face is covered in dense horizontal lines of cuneiform running edge to edge, and one column at the lower right has been visibly polished away. The stone is almost black and slightly glossy, and under raking light the cuneiform reads as fine ribs of grey against the dark field.

### 19. Artemis with a Doe, known as the Diana of Versailles

**Roman copy after Leochares** · 1st-2nd century AD, after a Greek bronze of c. 330 BC · Marble · 201 × 130 × 70 cm · sculpture

Hangs in `salle-des-caryatides` — Salle des Caryatides, Louvre room 348, sully wing, level 0, clear height 8.5 m.

- **Size source:** Wikipedia: the statue stands 2.01 m. Width and depth are estimates from the plinth and the running pose.
- **Placement:** Centre of the Salle des Caryatides, on a low plinth, the running axis across the room's short direction so the movement is seen in profile from the door. Intended sight line 6 m. No frame: freestanding.

**What it looks like.** A female figure in a short belted chiton strides forward with the right leg advanced and the drapery split open along the thigh, her right hand reaching back to draw an arrow from a quiver on her shoulder. A small deer trots beside her left leg, head lifted, and her left hand rests on its antlers. The pose is a single forward diagonal from the trailing foot to the raised right arm, the marble is fine white with a warm patina, and the light should come from the front-left so the running leg throws a long shadow across the plinth.

### 20. Borghese Gladiator

**Agasias of Ephesus (signed)** · c. 100 BC · Pentelic marble · 173 × 172 × 169 cm · sculpture

Hangs in `salle-des-caryatides` — Salle des Caryatides, Louvre room 348, sully wing, level 0, clear height 8.5 m.

- **Size source:** collections.louvre.fr (Ma 527): H 173, W 172, D 169 cm. Wikipedia's 169 cm height conflicts; we take the Louvre's.
- **Placement:** South end of the Salle des Caryatides, on a low plinth angled 30 degrees to the wall so the lunge crosses the room. Intended sight line 5 m. No frame: freestanding.

**What it looks like.** A nude male warrior lunges forward and to his left in a wide fighting stance, the left arm thrust out and across the body with the hand open, the right arm drawn back low, the torso twisted toward the viewer. The head is turned sharply over the right shoulder, looking away from the direction of the lunge, and a tree-trunk strut supports the right leg while the left is planted forward. The marble is warm grey Pentelic with fine surface cracks, and because the pose is a spiral, the silhouette changes completely as the visitor walks around it — it must be lit from at least two sides.

### 21. The four Caryatids of the musicians' gallery

**Jean Goujon** · 1550 · Limestone, carved in situ · 280 × 60 × 45 cm · architectural-sculpture

Hangs in `salle-des-caryatides` — Salle des Caryatides, Louvre room 348, sully wing, level 0, clear height 8.5 m.

- **Size source:** Height is an estimate from the gallery head height (about 4.2 m to the tribune floor, caryatids spanning 2.8 m). Not published.
- **Placement:** South end of the room, four figures in a row carrying the musicians' tribune above the main door; entered between the middle two. Intended sight line 4 m. No frame: freestanding.

**What it looks like.** Four female figures stand against the wall between the door jambs, each dressed in a thin pleated tunic that falls to the ankles, arms raised to their heads to support the entablature above. Each stands on a small plinth and each turns her head slightly differently, so the row reads as four individuals rather than columns; between the middle pair is the door opening. They are carved from the same pale limestone as the wall, in shallow relief against it, and are lit only by low side light — the effect is of shadowed figures holding up the room.

### 22. The Dying Slave

**Michelangelo** · 1513-1515 · Marble · 228 × 72 × 54 cm · sculpture

Hangs in `galerie-michel-ange` — Michelangelo Gallery, Louvre room 403, denon wing, level 0, clear height 6.2 m.

- **Size source:** collections.louvre.fr (MR 1590): H 2.277, W 0.724, D 0.535 m.
- **Placement:** North wall, set on a 90 cm plinth against the wall, angled slightly out. Intended sight line 3 m. No frame: freestanding.

**What it looks like.** A nude young man stands with his weight collapsed onto his right leg, body curving into a long S, head fallen back and to his left with the eyes closed. His left arm is raised and bent behind his head, the hand lost in his hair, while the right arm hangs across his chest with the elbow trapped by a band that crosses from his back. The marble is pale and slightly grey, polished to a soft sheen, and the figure is lit from above-left so the torso reads as a bright continuous curve and the face is in its own shadow.

### 23. The Rebellious Slave

**Michelangelo** · 1513-1515 · Marble · 215 × 49 × 76 cm · sculpture

Hangs in `galerie-michel-ange` — Michelangelo Gallery, Louvre room 403, denon wing, level 0, clear height 6.2 m.

- **Size source:** collections.louvre.fr (MR 1589): H 2.15, W 0.49, D 0.755 m.
- **Placement:** North wall, 4 m east of the Dying Slave, on the same plinth line. Intended sight line 3 m. No frame: freestanding.

**What it looks like.** A nude male figure twists violently to his left, right arm wrenched back and bound behind him, left arm raised and bent across his chest, head turned sharply over the left shoulder with the mouth open. The legs are braced apart and the torso is arched, so the body forms a spiral rather than a curve; one arm is broken off above the elbow. The same pale marble as its pair, but lit so the twisting shoulder catches a hard highlight and the bound arm falls into deep shadow — the whole point is the strain in the shoulders.

### 24. Psyche Revived by Cupid's Kiss

**Antonio Canova** · 1787-1793 · Marble · 155 × 168 × 101 cm · sculpture

Hangs in `galerie-michel-ange` — Michelangelo Gallery, Louvre room 403, denon wing, level 0, clear height 6.2 m.

- **Size source:** Wikipedia FR: 155 x 168 x 101 cm. Louvre inventory MR 1777.
- **Placement:** Centre of the gallery on a low round plinth, so the group can be circled; the intended view is the one from which both faces are visible, i.e. from the south-east. Intended sight line 4 m. No frame: freestanding.

**What it looks like.** Psyche, seated and collapsing backward with one arm raised and the other falling, is held by Cupid who stands behind and above her and bends to kiss her, his wings sweeping up and out to the right. Her body is turned so both her face and her open arms lift toward him, and the composition is closed on the left by her raised arm and the base and opens entirely on the right. The marble is polished to an almost wax finish, the flesh surfaces are the only fully worked areas — the base is left rougher — and the group needs light from the left so Cupid's back is dark and Psyche's throat and arms are the brightest things in the room.

### 25. Personal Crown of Louis XV

**Claude Ronde, executed by Augustin Duflos** · 1722 · Silver, gilded; facsimile stones replacing the original diamonds and pearls; embroidered satin cap · 24 × 22 × 20 cm · object

Hangs in `galerie-apollon` — Galerie d'Apollon, Louvre room 705, sully wing, level 1, clear height 15 m.

- **Size source:** collections.louvre.fr (MS 61): H 24, W 22 cm, 20 cm diameter at the base.
- **Placement:** In a wall case on the west side of the Galerie d'Apollon, on a black velvet mount, at 1.55 m to centre, lit inside the case. Intended sight line 0.8 m. Frame: glass case, 60 x 50 x 40 cm.

**What it looks like.** A closed circlet of gilded silver rising into eight arches that meet under a fleur-de-lis at the top, the whole surface set with white stones and drops of pearls in dense rows. Between the arches the cap of embroidered satin shows as dark red, and the four large stones on the frontal band read as the seats of the Regent and the Sancy. Small, dense and entirely gold and white, it needs a hard case light with a black ground so that the stones flare and the metal reads as mass rather than wire.

### 26. Apollo Slays Python (central panel of the Galerie d'Apollon vault)

**Eugene Delacroix** · 1850-1851 · Oil and wax on canvas, maroufled to the vault · 800 × 1600 cm · ceiling-painting

Hangs in `galerie-apollon` — Galerie d'Apollon, Louvre room 705, sully wing, level 1, clear height 15 m.

- **Size source:** Estimate from photographs against the 17 m gallery width; the panel is roughly half the vault's length and spans the flat of the vault. Not published as a single figure.
- **Placement:** Ceiling: the flat central panel of the barrel vault, centred over the room, long axis along the gallery. Intended sight line 8 m. Frame: gilded stucco border.

**What it looks like.** A four-horse chariot driven by Apollo charges across the panel from left to right, the god standing and drawing a bow at a huge dark serpent coiled below and to the front of the horses. Around and behind the chariot the figures of the seasons and the hours tumble in a ring, some flung forward by the speed, and the panel is set in a border of gilded stucco. The palette is hot ochre, rose and gold flesh against a deep blue ground, and the whole panel is meant to be read from below at an angle, so the horses' legs are foreshortened and the light source within the picture is the god himself.

### 27. Milo of Croton

**Pierre Puget** · 1671-1682 · Marble · 270 × 140 × 70 cm · sculpture

Hangs in `cour-puget` — Cour Puget, Louvre room 105, richelieu wing, level -1, clear height 18 m.

- **Size source:** Wikipedia FR: 270 x 140 x 70 cm. MR 2075.
- **Placement:** Lower terrace of the Cour Puget, free-standing on a low base, so it is seen from below against the glass roof. Intended sight line 7 m. No frame: freestanding.

**What it looks like.** A muscular nude old man is caught mid-shout, his right hand trapped in the split trunk of a tree and his body arched back and twisted away from it. A lion has leapt onto his left thigh and sunk its teeth in, its forelegs clamped around the leg, and Milo's left arm is thrown up and back in pain. The group reads as one open spiral of straining limbs with the lion's tawny mass at the base and the man's torso rising above it, and the marble is lit from above through the glass so the shoulders are bright and the lion and the tree both go dark.

### 28. Winged human-headed bull (lamassu) from the palace of Sargon II at Khorsabad

**Unattributed, Neo-Assyrian** · 721-705 BC · Gypsum alabaster, high relief and round · 420 × 436 × 97 cm · sculpture

Hangs in `cour-khorsabad` — Cour Khorsabad, Louvre room 229, richelieu wing, level 0, clear height 12 m.

- **Size source:** collections.louvre.fr (AO 19857): H 420, W 436, thickness 97 cm. The Louvre's teaching dossier gives the same.
- **Placement:** Two pairs guarding the doorways of the court, set at right angles to each other so each bull has a front view and a walking view; the entrance pair flush with the wall face. Intended sight line 5 m. No frame: freestanding.

**What it looks like.** A colossal bull's body in profile with a bearded human head turned to face the viewer, wearing a tall horned tiara and pendant earrings, and a huge wing folded along the flank. It has five legs — four walking and a fifth visible only from the front view — so that the same block reads as standing from one side and striding from the other. The alabaster is pale grey-white with darker veining, the relief is shallow on the body and almost fully round on the head, and the surface carries bands of cuneiform inscription cut across the legs.

## Notes for the artwork library

**Frames are architecture.** Every painting in the Salle Daru, Salle Denon, Salle Mollien and the Salle des États hangs in a gilded frame 10–18 cm wide with a raised sight edge. The frames carry the wall colour's contrast: against the madder red and the midnight blue the gold is the brightest thing in the room after the ceiling light. Model them as geometry, not as texture.

**Three works break the scale assumptions.** The Wedding at Cana (9.94 m), the Coronation (9.79 m) and the Raft of the Medusa (7.16 m) are each wider than the room is deep in any direction. Their sight lines are 9–12 m, which means the visitor never sees one whole: they see it in perspective, from below, in parts. Get the sight line right and the compression reads correctly; get it wrong and the room feels like a gallery print.

**The Mona Lisa is not a painting on a wall.** She is alone on a free-standing cimaise, in a sealed case, lit brighter than the room, three metres from the nearest person. The Wedding at Cana is on the opposite wall. If a build puts the Mona Lisa on a wall among other paintings, it is not the Louvre.

**Two works are the room.** Delacroix's Apollo Slays Python is not hung, it is the vault of the Galerie d'Apollon; the four Caryatids are not exhibited, they hold up the musicians' tribune in the Salle des Caryatides. Both are best built by the zone that owns the room, with the artwork module only supplying dimensions and composition.

**The Crown of Louis XV is small.** 24 cm high, in a 60 cm glass case, in a dark gallery, behind a case light. It is the only object on this list whose whole job is to be a bright point in a very dark room.

**Objects not included, and why.** The crown of the Empress Eugénie (OA 11160) was taken from the Galerie d'Apollon in the 2025 theft and is no longer on display, so it is deliberately absent. The Medici cycle, the Rubens Marie de' Medici paintings, the Egyptian collection and everything on Richelieu level 2 are outside the modelled route.
