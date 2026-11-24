# Artworks library

The 28 works of the walkable Louvre: fourteen painted surfaces, thirteen sculptures and one
jewelled object. `handoffs/louvre/spec/artworks.json` is the source for every real dimension here;
`catalog.ts` repeats them in code and `verify/report.mjs` re-checks the built objects against that
spec file, so a typo fails a run instead of shipping.

## What a zone does

```ts
import { placeArtwork } from '../../artworks/library';

placeArtwork(roomGroup, {
  id: 'mona-lisa',
  title: 'Portrait de Lisa Gherardini',
  artist: 'Leonardo da Vinci',
  year: 'c. 1503-1519',
  sizeCm: [53, 77],
  room: 'salle-des-etats',
  wall: 'north',
  position: [3.2, 8.9, 78.1],
  rotationY: Math.PI,
});
```

`library.ts` resolves the id through `registry.ts` on its own — there is nothing to wire up and no
import of `src/artworks/index.ts` is needed. An unknown id still returns a correctly sized blank
canvas rather than throwing.

## What you get back

| | origin | +Z faces | size |
| --- | --- | --- | --- |
| painting | the wall contact point, centred on the painted surface | away from the wall | outer (painted + 2 × moulding), painted surface exactly `sizeCm` |
| sculpture | the floor contact point at the base centre | the front of the work | height exactly `sizeCm[1]`, footprint following the pose |
| ceiling painting | as a painting, facing +Z | rotate it −90° about X to face down | painted surface exactly `sizeCm` |

So placing is `obj.position = spec.position` with no arithmetic, and a sculpture never floats or
sinks: its lowest vertex is its origin (`floorGap` is asserted within 2 cm by the verify report).

Two placements share one texture: the material is cached per id, so `marly-horses` placed twice
costs one texture and one extra draw call, not two textures.

**Do not merge artworks into room geometry.** Each work carries `userData.artworkId`, which is what
the capture harness counts; `mergeByMaterial` would flatten the ids away. The works are already
cheap — one or two draw calls each.

## Verification

```bash
npx vite build --config src/artworks/verify/vite.config.mjs      # gallery page -> /tmp/louvre-artworks-gallery
python3 -m http.server 4611 --directory /tmp/louvre-artworks-gallery &
npm run capture -- --url http://127.0.0.1:4611 --zone artworks --verify --all --out captures/artworks
node src/artworks/verify/report.mjs --url http://127.0.0.1:4611 --out captures/artworks
```

`capture --verify` is the crew harness reading the framebuffer: it fails a near-uniform frame, a
collision probe that leaks, a tour that does not finish, and any console error. It reports the
structure check as skipped for this target, because `artworks` is not a `route.json` zone — there is
no room list to assert against. `report.mjs` covers what that leaves out: every id present, every
object the size the centimetres say, every painted canvas non-flat, and the texture bill.

Latest run: 28/28 works, **72 draw calls**, **48 226 triangles**, **16.95 MB** of artwork textures,
frame std 46.5 with 24 221 distinct colours, no console errors.

## The works

| id | kind | real size (w × h × d, cm) | frame | what it is |
| --- | --- | --- | --- | --- |
| `mona-lisa` | painting | 53 × 77 | 0.14 m gilt-dark | Single seated woman, three-quarter turn, hands crossed at lower left, near-black olive dress and veil, blue-green aerial landscape behind, soft light from the upper left. |
| `wedding-at-cana` | painting | 994 × 677 | 0.18 m gilt | Forty-odd guests along a long table between two giant Corinthian columns, pale sky at the centre, Christ at the exact centre, musicians with lutes at the left, a dwarf with a parrot at the lower right, marbled floor running to the horizon. |
| `coronation` | painting | 979 × 621 | 0.16 m gilt | Notre-Dame interior in a shallow processional band: Napoleon centre-left in scarlet and white raising the crown over the kneeling Josephine, clergy in gold at the right, officers red-white-blue at the left, stone piers and hangings behind. |
| `oath-of-the-horatii` | painting | 425 × 330 | 0.12 m gilt | Three braced young men with arms raised at the left, the father in a red cloak holding a sword at the centre, three women and two children collapsed at the right, in a bare ochre room of three arches and one dark column, lit hard from the left. |
| `grande-odalisque` | painting | 162 × 91 | 0.1 m gilt | Reclining nude seen from behind on a blue divan, head turned over the shoulder toward the viewer, turban, peacock feathers at the right, cool blue drapery against warm flesh. |
| `liberty` | painting | 325 × 260 | 0.12 m gilt | Liberty barefoot on a barricade with the tricolour and a musket, a boy with pistols at her right, a top-hatted bourgeois at her left, dead and dying men underfoot, smoke and the towers of Notre-Dame behind. |
| `raft-of-the-medusa` | painting | 716 × 491 | 0.14 m gilt | A pyramid of survivors on a raft, the apex a man waving a rag at a distant ship, a dead man and a despairing father at the lower left, a low storm horizon and a dark sea. |
| `death-of-sardanapalus` | painting | 496 × 392 | 0.12 m gilt | A crimson bed on a diagonal with the king reclining at the upper left, servants and horses crowded at the right, gold vessels and a smoking lamp, ochre and crimson throughout. |
| `lacemaker` | painting | 21 × 24 | 0.05 m dark-wood | A girl in a yellow bodice and white collar leaning over a sewing cushion, bobbins in her hands, red and white threads, a dark plain wall behind and light from the left. |
| `astronomer` | painting | 45 × 51 | 0.06 m dark-wood | A seated scholar in a gold-embroidered blue robe and red cap, hand on a celestial globe, books and a chart on the table, a shadowed room with light from the left. |
| `virgin-of-the-rocks` | painting | 122 × 199 | 0.14 m gilt | Madonna in blue and red between an angel and the infant Baptist in a rocky grotto, the Christ child held at her knee, a blue-green watery distance and eroded ochre rocks, sfumato throughout. |
| `sainte-anne` | painting | 130 × 168 | 0.16 m gilt | Sainte Anne behind and above the Virgin, both seated, the Virgin reaching toward the Christ child who holds a lamb, blue and earth draperies, hazy blue mountains and trees behind. |
| `belle-jardiniere` | painting | 80 × 122 | 0.12 m gilt | Madonna in a meadow with a blue mantle over a red bodice and a dark veil, the Christ child leaning against her knee with a reed cross, the infant Baptist at the right, dark trees and hazy hills. |
| `apollo-ceiling-delacroix` | ceiling-painting | 1600 × 800 | 0.3 m gilt | Apollo in a golden chariot driving a team of horses at the upper right, the green Python beaten into the darker lower left, naiads and figures beneath, gold ground and a gilded stucco border; built flat for a ceiling. |
| `winged-victory` | sculpture | 429 × 557 × 248 | — | Winged goddess striding forward into wind on the prow of a warship, torso turned, drapery pressed against her legs, both wings swept back, head and arms lost; on a stone socle. |
| `venus-de-milo` | sculpture | 100 × 204 × 60 | — | Standing half-draped goddess, torso twisted to her left, drapery fallen to the hips, both arms broken at the shoulder, on a low plinth. |
| `marly-horses` | sculpture | 284 × 355 × 127 | — | Rearing horse held by a nude groom behind it, both on a rock base; one group of the pair — place the id twice, the second mirrored about Y, 12 m apart. |
| `great-sphinx-tanis` | sculpture | 154 × 183 × 480 | — | Recumbent lion-bodied sphinx with a human head under the nemes headdress, front paws forward on the slab, long axis front to back, speckled pink granite. |
| `hammurabi` | stele | 79 × 225 × 47 | — | Rounded-top black basalt slab: a sun-god and king in relief at the head, forty-four columns of cuneiform below, a worn base. |
| `diana-of-versailles` | sculpture | 130 × 201 × 70 | — | Diana striding forward in a short girdled tunic, reaching back for an arrow from her quiver, a small deer bounding beside her, on a low base. |
| `borghese-gladiator` | sculpture | 172 × 173 × 169 | — | Nude warrior lunging forward with both arms thrust out, left arm forward with a shield strap and raised sword arm behind, torque and cloak, on a low base. |
| `caryatids-goujon` | architectural-sculpture | 60 × 280 × 45 | — | Four draped female figures in a row carrying an entablature on their heads; each is 2.80 m tall, the four span 5.2 m with the doorway between the middle two. |
| `dying-slave` | sculpture | 72 × 228 × 54 | — | Standing nude with one arm bent behind the head and the other across the chest, head fallen back, weight on one leg, on a plinth. |
| `rebellious-slave` | sculpture | 49 × 215 × 76 | — | Standing nude twisting away, left arm bent behind the back, right arm across the chest, head turned up and back, on a plinth. |
| `psyche-revived` | sculpture | 168 × 155 × 101 | — | Cupid with outspread wings lifting the kneeling Psyche by the head, her arms rising to his shoulders, on a low round plinth. |
| `crown-of-louis-xv` | object | 22 × 24 × 20 | 0.02 m gilt | Gold crown of eight arches over a crimson silk cap, pearl and stone rows on the band, cross fleury on top; mounted in a 60 × 50 × 40 cm glass case on a black velvet cushion. |
| `milo-of-croton` | sculpture | 140 × 270 × 70 | — | Nude athlete caught by the wrist in a split tree trunk, twisting in pain, a lion pelt over the stump and a club at his feet, on a low base. |
| `lamassu-khorsabad` | sculpture | 436 × 420 × 97 | — | Two colossal winged bulls with bearded human heads, long ringlets, horned crowns, walking in profile with five legs; the pair stands 4.36 m across. |

## Texture budget

Texels per centimetre fall with area — the *Wedding at Cana* is seen from twelve metres and does not
need the density of a 21 cm Vermeer — with a floor of 224 px on the long side and a hard cap of
1024. The table is a pure function of the catalog (`paint/inventory.ts`), so these numbers are the
ones the build actually allocates; each row is `w × h px` and the bytes include mipmaps (×1.34).

| work | real size cm | canvas px | texels/cm | MB |
| --- | --- | --- | --- | --- |
| `mona-lisa` | 53 × 77 | 264 × 384 | 5.0 | 0.52 |
| `wedding-at-cana` | 994 × 677 | 796 × 540 | 0.80 | 2.20 |
| `coronation` | 979 × 621 | 784 × 496 | 0.80 | 1.99 |
| `oath-of-the-horatii` | 425 × 330 | 596 × 460 | 1.4 | 1.40 |
| `grande-odalisque` | 162 × 91 | 452 × 256 | 2.8 | 0.59 |
| `liberty` | 325 × 260 | 456 × 364 | 1.4 | 0.85 |
| `raft-of-the-medusa` | 716 × 491 | 716 × 492 | 1.0 | 1.80 |
| `death-of-sardanapalus` | 496 × 392 | 496 × 392 | 1.0 | 0.99 |
| `lacemaker` | 21 × 24 | 196 × 224 | 5.0 (floor 224 px) | 0.22 |
| `astronomer` | 45 × 51 | 224 × 256 | 5.0 | 0.29 |
| `virgin-of-the-rocks` | 122 × 199 | 340 × 556 | 2.8 | 0.97 |
| `sainte-anne` | 130 × 168 | 364 × 472 | 2.8 | 0.88 |
| `belle-jardiniere` | 80 × 122 | 224 × 340 | 2.8 | 0.39 |
| `apollo-ceiling-delacroix` | 1600 × 800 | 1024 × 512 | 0.64 (capped) | 2.68 |
| `hammurabi (relief face)` | 79 × 225 | 288 × 800 | — | 0.88 |

**Total: 16.95 MB across 15 canvases**, against a 24 MB aim for the whole library.

One honesty note for integration: the perf HUD's `textureMB` comes from `core/textures.ts` and does
**not** count these per-work canvases. A room with the *Wedding at Cana* and the *Mona Lisa* in view
carries ~13 MB of artwork texture that the HUD will not show. Add `textureBytes()` from
`src/artworks/index.ts` to the HUD line when the numbers start to matter.

## How the paintings are made

Each painted work is a 2D canvas composed in the order a panel was actually painted, then uploaded
as one texture:

1. **underpainting** — the dominant ground colour and broad value washes;
2. **value blocking** — the composition from the spec's description: figure arrangement, background,
   light source, architecture, as massed shapes rather than outlines;
3. **detail** — faces modelled with light on `paint/face.ts`, garment folds, highlights;
4. **glaze and varnish** — warm multiplying film, darkened edges;
5. **surface** — canvas weave, craquelure with branches and a light lip, grain, a soft-light scumble.

The frame is the shared `pictureFrame` builder with a period moulding profile: gilt, gilt with a dark
patina, or dark walnut with an inner gilt fillet. Nothing is an image file and no step touches the
network; all variation comes from the seeded RNG.

Sculptures are one parametric body (`sculpt/humanoid.ts`: a joint skeleton plus lofted tubes for
torso and limbs), one animal builder, and a handful of props — wings as fans of feathers, drapery as
ribbed ribbons, plinths with a marble inlay cap. Stone surfaces get seeded noise displacement and a
vertical AO ramp so a 5.6 m Victory and a 1.5 m Psyche read as carved marble under the same light.

## Deviations worth knowing

- **Dimensions.** Every work's height is exact to the centimetre (asserted). Widths follow the
  modelled pose and are usually within 10–20 % of the spec: `lamassu-khorsabad` 466 cm against 436,
  `milo-of-croton` 161 against 140, `psyche-revived` 138 against 168. `caryatids-goujon` is four
  figures in a row spanning 4.65 m, so its spec's 60 × 45 cm is per figure, as it says.
- **`marly-horses`** is one horse-and-groom group at the spec's 355 cm. Place the id twice, the
  second mirrored about Y, 12 m apart, for the pair.
- **`crown-of-louis-xv`** includes its 60 × 50 × 40 cm glass case; the crown inside is 24 cm tall.
- **`apollo-ceiling-delacroix`** is built flat and faces +Z like a painting; rotate it into the vault.
- **`hammurabi`** carries its cuneiform and relief as a generated 288 × 800 texture on the front
  face rather than as geometry.
