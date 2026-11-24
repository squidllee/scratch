/**
 * The 28 works of the walkable Louvre, as data.
 *
 * Sizes are the real ones from `handoffs/louvre/spec/artworks.json` (Louvre collection database);
 * `scripts/verify-catalog.mjs` in this folder re-checks every id, size and artist against that
 * file when it is reachable, so a typo here fails rather than ships.
 *
 * `render` names the routine that draws the work:
 *  - painted works name a composition in `paint/compositions.ts`
 *  - sculpture names a builder in `sculpt/statues.ts`, `sculpt/animals.ts` or `sculpt/objects.ts`
 */

export type ArtworkKind =
  | 'painting'
  | 'ceiling-painting'
  | 'sculpture'
  | 'stele'
  | 'object'
  | 'architectural-sculpture';

/** Frame moulding for a painted work. `border` is the visible moulding width in metres. */
export interface FrameDef {
  border: number;
  style: 'gilt' | 'gilt-dark' | 'dark-wood';
}

export interface ArtworkDef {
  id: string;
  titleFr: string;
  artist: string;
  year: string;
  medium: string;
  kind: ArtworkKind;
  /** Painted surface / sculpted mass: [width, height] in cm, from the spec. */
  sizeCm: readonly [number, number];
  /** Depth in cm where the spec gives one. */
  depthCm?: number;
  room: string;
  frame?: FrameDef;
  /** Composition or builder id. */
  build: string;
  /** One line for the README: what the object actually looks like. */
  looks: string;
}

const def = (d: ArtworkDef): ArtworkDef => d;

export const ARTWORK_DEFS: readonly ArtworkDef[] = [
  def({
    id: 'mona-lisa',
    titleFr: 'Portrait de Lisa Gherardini, dite La Joconde',
    artist: 'Leonardo da Vinci',
    year: 'c. 1503-1519',
    medium: 'Oil on poplar panel',
    kind: 'painting',
    sizeCm: [53, 77],
    room: 'salle-des-etats',
    frame: { border: 0.14, style: 'gilt-dark' },
    build: 'mona-lisa',
    looks:
      'Single seated woman, three-quarter turn, hands crossed at lower left, near-black olive dress and veil, blue-green aerial landscape behind, soft light from the upper left.',
  }),
  def({
    id: 'wedding-at-cana',
    titleFr: 'Les Noces de Cana',
    artist: 'Paolo Veronese',
    year: '1562-1563',
    medium: 'Oil on canvas',
    kind: 'painting',
    sizeCm: [994, 677],
    room: 'salle-des-etats',
    frame: { border: 0.18, style: 'gilt' },
    build: 'wedding-at-cana',
    looks:
      'Forty-odd guests along a long table between two giant Corinthian columns, pale sky at the centre, Christ at the exact centre, musicians with lutes at the left, a dwarf with a parrot at the lower right, marbled floor running to the horizon.',
  }),
  def({
    id: 'coronation',
    titleFr: 'Le Sacre de Napoléon Ier',
    artist: 'Jacques-Louis David',
    year: '1805-1807',
    medium: 'Oil on canvas',
    kind: 'painting',
    sizeCm: [979, 621],
    room: 'salle-daru',
    frame: { border: 0.16, style: 'gilt' },
    build: 'coronation',
    looks:
      'Notre-Dame interior in a shallow processional band: Napoleon centre-left in scarlet and white raising the crown over the kneeling Josephine, clergy in gold at the right, officers red-white-blue at the left, stone piers and hangings behind.',
  }),
  def({
    id: 'oath-of-the-horatii',
    titleFr: 'Le Serment des Horaces',
    artist: 'Jacques-Louis David',
    year: '1784',
    medium: 'Oil on canvas',
    kind: 'painting',
    sizeCm: [425, 330],
    room: 'salle-daru',
    frame: { border: 0.12, style: 'gilt' },
    build: 'oath-of-the-horatii',
    looks:
      'Three braced young men with arms raised at the left, the father in a red cloak holding a sword at the centre, three women and two children collapsed at the right, in a bare ochre room of three arches and one dark column, lit hard from the left.',
  }),
  def({
    id: 'grande-odalisque',
    titleFr: 'La Grande Odalisque',
    artist: 'Jean-Auguste-Dominique Ingres',
    year: '1814',
    medium: 'Oil on canvas',
    kind: 'painting',
    sizeCm: [162, 91],
    room: 'salle-daru',
    frame: { border: 0.1, style: 'gilt' },
    build: 'grande-odalisque',
    looks:
      'Reclining nude seen from behind on a blue divan, head turned over the shoulder toward the viewer, turban, peacock feathers at the right, cool blue drapery against warm flesh.',
  }),
  def({
    id: 'liberty',
    titleFr: 'La Liberté guidant le peuple',
    artist: 'Eugène Delacroix',
    year: '1830',
    medium: 'Oil on canvas',
    kind: 'painting',
    sizeCm: [325, 260],
    room: 'salle-mollien',
    frame: { border: 0.12, style: 'gilt' },
    build: 'liberty',
    looks:
      'Liberty barefoot on a barricade with the tricolour and a musket, a boy with pistols at her right, a top-hatted bourgeois at her left, dead and dying men underfoot, smoke and the towers of Notre-Dame behind.',
  }),
  def({
    id: 'raft-of-the-medusa',
    titleFr: 'Le Radeau de la Méduse',
    artist: 'Théodore Géricault',
    year: '1818-1819',
    medium: 'Oil on canvas',
    kind: 'painting',
    sizeCm: [716, 491],
    room: 'salle-mollien',
    frame: { border: 0.14, style: 'gilt' },
    build: 'raft-of-the-medusa',
    looks:
      'A pyramid of survivors on a raft, the apex a man waving a rag at a distant ship, a dead man and a despairing father at the lower left, a low storm horizon and a dark sea.',
  }),
  def({
    id: 'death-of-sardanapalus',
    titleFr: 'La Mort de Sardanapale',
    artist: 'Eugène Delacroix',
    year: '1827',
    medium: 'Oil on canvas',
    kind: 'painting',
    sizeCm: [496, 392],
    room: 'salle-mollien',
    frame: { border: 0.12, style: 'gilt' },
    build: 'death-of-sardanapalus',
    looks:
      'A crimson bed on a diagonal with the king reclining at the upper left, servants and horses crowded at the right, gold vessels and a smoking lamp, ochre and crimson throughout.',
  }),
  def({
    id: 'lacemaker',
    titleFr: 'La Dentellière',
    artist: 'Johannes Vermeer',
    year: 'c. 1669-1670',
    medium: 'Oil on canvas, mounted on panel',
    kind: 'painting',
    sizeCm: [21, 24],
    room: 'dutch-rooms',
    frame: { border: 0.05, style: 'dark-wood' },
    build: 'lacemaker',
    looks:
      'A girl in a yellow bodice and white collar leaning over a sewing cushion, bobbins in her hands, red and white threads, a dark plain wall behind and light from the left.',
  }),
  def({
    id: 'astronomer',
    titleFr: "L'Astronome",
    artist: 'Johannes Vermeer',
    year: '1668',
    medium: 'Oil on canvas',
    kind: 'painting',
    sizeCm: [45, 51],
    room: 'dutch-rooms',
    frame: { border: 0.06, style: 'dark-wood' },
    build: 'astronomer',
    looks:
      'A seated scholar in a gold-embroidered blue robe and red cap, hand on a celestial globe, books and a chart on the table, a shadowed room with light from the left.',
  }),
  def({
    id: 'virgin-of-the-rocks',
    titleFr: 'La Vierge aux rochers',
    artist: 'Leonardo da Vinci',
    year: 'c. 1483-1494',
    medium: 'Oil on canvas, transferred from panel',
    kind: 'painting',
    sizeCm: [122, 199],
    room: 'grande-galerie',
    frame: { border: 0.14, style: 'gilt' },
    build: 'virgin-of-the-rocks',
    looks:
      'Madonna in blue and red between an angel and the infant Baptist in a rocky grotto, the Christ child held at her knee, a blue-green watery distance and eroded ochre rocks, sfumato throughout.',
  }),
  def({
    id: 'sainte-anne',
    titleFr: 'La Sainte Anne',
    artist: 'Leonardo da Vinci',
    year: 'c. 1503-1519',
    medium: 'Oil on poplar panel',
    kind: 'painting',
    sizeCm: [130, 168],
    room: 'grande-galerie',
    frame: { border: 0.16, style: 'gilt' },
    build: 'sainte-anne',
    looks:
      'Sainte Anne behind and above the Virgin, both seated, the Virgin reaching toward the Christ child who holds a lamb, blue and earth draperies, hazy blue mountains and trees behind.',
  }),
  def({
    id: 'belle-jardiniere',
    titleFr: 'La Belle Jardinière',
    artist: 'Raphael',
    year: '1507-1508',
    medium: 'Oil on poplar panel',
    kind: 'painting',
    sizeCm: [80, 122],
    room: 'grande-galerie',
    frame: { border: 0.12, style: 'gilt' },
    build: 'belle-jardiniere',
    looks:
      'Madonna in a meadow with a blue mantle over a red bodice and a dark veil, the Christ child leaning against her knee with a reed cross, the infant Baptist at the right, dark trees and hazy hills.',
  }),
  def({
    id: 'apollo-ceiling-delacroix',
    titleFr: 'Apollon vainqueur du serpent Python',
    artist: 'Eugène Delacroix',
    year: '1850-1851',
    medium: 'Oil and wax on canvas, marouflé to the vault',
    kind: 'ceiling-painting',
    sizeCm: [1600, 800],
    room: 'galerie-apollon',
    frame: { border: 0.3, style: 'gilt' },
    build: 'apollo-ceiling',
    looks:
      'Apollo in a golden chariot driving a team of horses at the upper right, the green Python beaten into the darker lower left, naiads and figures beneath, gold ground and a gilded stucco border; built flat for a ceiling.',
  }),
  def({
    id: 'winged-victory',
    titleFr: 'Victoire de Samothrace',
    artist: 'Attributed to Pythokritos of Rhodes',
    year: 'c. 200-190 BC',
    medium: 'Parian marble with a marble ship prow',
    kind: 'sculpture',
    sizeCm: [429, 557],
    depthCm: 248,
    room: 'escalier-daru',
    build: 'winged-victory',
    looks:
      'Winged goddess striding forward into wind on the prow of a warship, torso turned, drapery pressed against her legs, both wings swept back, head and arms lost; on a stone socle.',
  }),
  def({
    id: 'venus-de-milo',
    titleFr: 'Vénus de Milo',
    artist: 'Alexandros of Antioch (attributed)',
    year: 'c. 150-125 BC',
    medium: 'Parian marble',
    kind: 'sculpture',
    sizeCm: [100, 204],
    depthCm: 60,
    room: 'salle-venus-milo',
    build: 'venus-de-milo',
    looks:
      'Standing half-draped goddess, torso twisted to her left, drapery fallen to the hips, both arms broken at the shoulder, on a low plinth.',
  }),
  def({
    id: 'marly-horses',
    titleFr: 'Les Chevaux de Marly',
    artist: 'Guillaume Coustou',
    year: '1743-1745',
    medium: 'Carrara marble',
    kind: 'sculpture',
    sizeCm: [284, 355],
    depthCm: 127,
    room: 'cour-marly',
    build: 'marly-horse',
    looks:
      'Rearing horse held by a nude groom behind it, both on a rock base; one group of the pair — place the id twice, the second mirrored about Y, 12 m apart.',
  }),
  def({
    id: 'great-sphinx-tanis',
    titleFr: 'Grand sphinx de Tanis',
    artist: 'Unattributed (Old Kingdom)',
    year: 'c. 2600 BC',
    medium: 'Pink granite',
    kind: 'sculpture',
    sizeCm: [154, 183],
    depthCm: 480,
    room: 'sphinx-crypt',
    build: 'great-sphinx',
    looks:
      'Recumbent lion-bodied sphinx with a human head under the nemes headdress, front paws forward on the slab, long axis front to back, speckled pink granite.',
  }),
  def({
    id: 'hammurabi',
    titleFr: 'Stèle du Code de Hammurabi',
    artist: 'Unattributed, Babylonian',
    year: 'c. 1792-1750 BC',
    medium: 'Black basalt',
    kind: 'stele',
    sizeCm: [79, 225],
    depthCm: 47,
    room: 'salle-hammurabi',
    build: 'hammurabi-stele',
    looks:
      'Rounded-top black basalt slab: a sun-god and king in relief at the head, forty-four columns of cuneiform below, a worn base.',
  }),
  def({
    id: 'diana-of-versailles',
    titleFr: 'Diane de Versailles',
    artist: 'Roman copy after Leochares',
    year: '1st-2nd century AD',
    medium: 'Marble',
    kind: 'sculpture',
    sizeCm: [130, 201],
    depthCm: 70,
    room: 'salle-des-caryatides',
    build: 'diana-of-versailles',
    looks:
      'Diana striding forward in a short girdled tunic, reaching back for an arrow from her quiver, a small deer bounding beside her, on a low base.',
  }),
  def({
    id: 'borghese-gladiator',
    titleFr: 'Gladiateur Borghese',
    artist: 'Agasias of Ephesus (signed)',
    year: 'c. 100 BC',
    medium: 'Pentelic marble',
    kind: 'sculpture',
    sizeCm: [172, 173],
    depthCm: 169,
    room: 'salle-des-caryatides',
    build: 'borghese-gladiator',
    looks:
      'Nude warrior lunging forward with both arms thrust out, left arm forward with a shield strap and raised sword arm behind, torque and cloak, on a low base.',
  }),
  def({
    id: 'caryatids-goujon',
    titleFr: 'Les Caryatides de la tribune des musiciens',
    artist: 'Jean Goujon',
    year: '1550',
    medium: 'Limestone',
    kind: 'architectural-sculpture',
    sizeCm: [60, 280],
    depthCm: 45,
    room: 'salle-des-caryatides',
    build: 'caryatids',
    looks:
      'Four draped female figures in a row carrying an entablature on their heads; each is 2.80 m tall, the four span 5.2 m with the doorway between the middle two.',
  }),
  def({
    id: 'dying-slave',
    titleFr: "L'Esclave mourant",
    artist: 'Michelangelo',
    year: '1513-1515',
    medium: 'Marble',
    kind: 'sculpture',
    sizeCm: [72, 228],
    depthCm: 54,
    room: 'galerie-michel-ange',
    build: 'dying-slave',
    looks:
      'Standing nude with one arm bent behind the head and the other across the chest, head fallen back, weight on one leg, on a plinth.',
  }),
  def({
    id: 'rebellious-slave',
    titleFr: "L'Esclave rebelle",
    artist: 'Michelangelo',
    year: '1513-1515',
    medium: 'Marble',
    kind: 'sculpture',
    sizeCm: [49, 215],
    depthCm: 76,
    room: 'galerie-michel-ange',
    build: 'rebellious-slave',
    looks:
      'Standing nude twisting away, left arm bent behind the back, right arm across the chest, head turned up and back, on a plinth.',
  }),
  def({
    id: 'psyche-revived',
    titleFr: "Psyché ranimée par le baiser de l'Amour",
    artist: 'Antonio Canova',
    year: '1787-1793',
    medium: 'Marble',
    kind: 'sculpture',
    sizeCm: [168, 155],
    depthCm: 101,
    room: 'galerie-michel-ange',
    build: 'psyche-revived',
    looks:
      'Cupid with outspread wings lifting the kneeling Psyche by the head, her arms rising to his shoulders, on a low round plinth.',
  }),
  def({
    id: 'crown-of-louis-xv',
    titleFr: 'Couronne dite de Louis XV',
    artist: 'Claude Ronde, executed by Augustin Duflos',
    year: '1722',
    medium: 'Silver-gilt with facsimile stones, silk cap',
    kind: 'object',
    sizeCm: [22, 24],
    depthCm: 20,
    room: 'galerie-apollon',
    frame: { border: 0.02, style: 'gilt' },
    build: 'crown-of-louis-xv',
    looks:
      'Gold crown of eight arches over a crimson silk cap, pearl and stone rows on the band, cross fleury on top; mounted in a 60 × 50 × 40 cm glass case on a black velvet cushion.',
  }),
  def({
    id: 'milo-of-croton',
    titleFr: 'Milon de Crotone',
    artist: 'Pierre Puget',
    year: '1671-1682',
    medium: 'Marble',
    kind: 'sculpture',
    sizeCm: [140, 270],
    depthCm: 70,
    room: 'cour-puget',
    build: 'milo-of-croton',
    looks:
      'Nude athlete caught by the wrist in a split tree trunk, twisting in pain, a lion pelt over the stump and a club at his feet, on a low base.',
  }),
  def({
    id: 'lamassu-khorsabad',
    titleFr: 'Taureau androcéphale ailé',
    artist: 'Unattributed, Neo-Assyrian',
    year: '721-705 BC',
    medium: 'Gypsum alabaster',
    kind: 'sculpture',
    sizeCm: [436, 420],
    depthCm: 97,
    room: 'cour-khorsabad',
    build: 'lamassu',
    looks:
      'Two colossal winged bulls with bearded human heads, long ringlets, horned crowns, walking in profile with five legs; the pair stands 4.36 m across.',
  }),
];

export const ARTWORK_BY_ID: ReadonlyMap<string, ArtworkDef> = new Map(
  ARTWORK_DEFS.map((d) => [d.id, d]),
);

export const ARTWORK_IDS: readonly string[] = ARTWORK_DEFS.map((d) => d.id);
