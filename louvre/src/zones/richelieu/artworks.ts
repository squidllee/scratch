import * as THREE from 'three';
import { placeArtwork } from '../../artworks/library';
import type { ArtworkSpec } from '../../artworks/types';
import { boxGeo } from '../../core/geom';
import { addPart } from '../../core/merge';

/**
 * Artwork placement. Sizes and rooms come from `artworks.json`; a zone never models a work, it
 * only says where the real thing stands. Positions are the centre of the sculptural mass, which is
 * the convention `placeholderArtwork` uses (a box centred on its origin), so a factory that builds
 * from its own origin lands correctly here and looks right before the library ships too.
 */

const marlyHorse = (z: number, facing: number): ArtworkSpec => ({
  id: 'marly-horses',
  title: 'The Marly Horses (pair)',
  artist: 'Guillaume Coustou',
  year: '1743-1745',
  medium: 'Carrara marble',
  sizeCm: [284, 355],
  room: 'cour-marly',
  wall: 'terrace',
  position: [-80, 2 + 1.05 + 3.55 / 2, z],
  rotationY: facing,
});

const milo: ArtworkSpec = {
  id: 'milo-of-croton',
  title: 'Milo of Croton',
  artist: 'Pierre Puget',
  year: '1671-1682',
  medium: 'Marble',
  sizeCm: [140, 270],
  room: 'cour-puget',
  wall: 'lower-terrace',
  position: [-4, -4.5 + 0.35 + 2.7 / 2, -108.5],
  rotationY: -Math.PI / 2,
};

const lamassu = (x: number, z: number, facing: number, room: string): ArtworkSpec => ({
  id: 'lamassu-khorsabad',
  title: 'Winged human-headed bull from Khorsabad',
  artist: 'Unattributed, Neo-Assyrian',
  year: '721-705 BC',
  medium: 'Gypsum alabaster',
  sizeCm: [436, 420],
  room,
  wall: 'doorway',
  position: [x, 0.15 + 4.2 / 2, z],
  rotationY: facing,
});

const stele: ArtworkSpec = {
  id: 'hammurabi',
  title: 'Stele of the Code of Hammurabi',
  artist: 'Unattributed, Babylonian',
  year: 'c. 1792-1750 BC',
  medium: 'Black basalt',
  sizeCm: [79, 225],
  room: 'salle-hammurabi',
  wall: 'west',
  position: [79.5, 0.3 + 2.25 / 2, -103],
  rotationY: -Math.PI / 2,
};

/** Bases the sculptures stand on, built to match the positions above. One room each. */
function sculptureBases(g: THREE.Object3D, room: 'cour-marly' | 'cour-puget' | 'cour-khorsabad' | 'salle-hammurabi'): void {
  if (room === 'cour-marly') {
    for (const z of [-114.5, -102.5]) {
      addPart(g, boxGeo(3.6, 1.05, 2.2), 'stone.limestone-pale').position.set(-80, 2, z);
    }
  } else if (room === 'cour-puget') {
    addPart(g, boxGeo(2.4, 0.35, 1.4), 'marble.noir-marquina').position.set(-4, -4.5, -108.5);
  } else if (room === 'cour-khorsabad') {
    for (const x of [35.4, 64.6]) {
      addPart(g, boxGeo(1.2, 0.15, 5.2), 'stone.limestone-pale').position.set(x, 0, x === 35.4 ? -114.7 : -107.4);
      addPart(g, boxGeo(1.2, 0.15, 5.2), 'stone.limestone-pale').position.set(x, 0, x === 35.4 ? -102.3 : -98.6);
    }
  } else {
    addPart(g, boxGeo(1.5, 0.3, 1.1), 'marble.noir-marquina').position.set(79.5, 0, -103);
  }
}

export function placeArtworks(groups: {
  marly: THREE.Object3D;
  puget: THREE.Object3D;
  khorsabad: THREE.Object3D;
  hammurabi: THREE.Object3D;
}): void {
  placeArtwork(groups.marly, marlyHorse(-114.5, 0));
  placeArtwork(groups.marly, marlyHorse(-102.5, Math.PI));
  placeArtwork(groups.puget, milo);
  placeArtwork(groups.khorsabad, lamassu(35.4, -114.7, Math.PI / 2, 'cour-khorsabad'));
  placeArtwork(groups.khorsabad, lamassu(35.4, -102.3, -Math.PI / 2, 'cour-khorsabad'));
  placeArtwork(groups.khorsabad, lamassu(64.6, -107.4, Math.PI / 2, 'salle-hammurabi'));
  placeArtwork(groups.khorsabad, lamassu(64.6, -98.6, -Math.PI / 2, 'salle-hammurabi'));
  placeArtwork(groups.hammurabi, stele);
}

export { sculptureBases };
