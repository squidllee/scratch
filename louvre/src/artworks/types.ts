import * as THREE from 'three';
import type { Rng } from '../core/rng';
import { mat } from '../core/materials';

/**
 * The artwork contract.
 *
 * An artwork is DATA first: title, artist, year, real painted size in centimetres, and where it
 * hangs (room, wall, world position, rotation). The factory turns that data into geometry.
 * Zone threads place artworks by id; the artworks library thread supplies the factories.
 * A zone never hard-codes an artwork's appearance.
 */
export interface ArtworkSpec {
  id: string;
  title: string;
  artist: string;
  year: string;
  medium?: string;
  /** Real size of the painted surface: [width, height] in CENTIMETRES. Never invent these. */
  sizeCm: readonly [number, number];
  /** Room id this artwork hangs in. Must match a room the zone declares. */
  room: string;
  /** Wall id inside the room, e.g. 'north' — purely documentation for the artwork factory. */
  wall: string;
  /** Centre of the artwork's canvas on the wall, world metres. */
  position: readonly [number, number, number];
  /** Rotation about Y in radians: 0 faces +Z, PI faces -Z. */
  rotationY: number;
}

export interface ArtworkContext {
  /** Deterministic stream for this artwork; fork by label for sub-details. */
  rng: Rng;
  /** True when no factory is registered and a placeholder stand-in should be produced. */
  placeholder: boolean;
}

export type ArtworkFactory = (spec: ArtworkSpec, ctx: ArtworkContext) => THREE.Object3D;

export interface ArtworkLibrary {
  register(id: string, factory: ArtworkFactory): void;
  has(id: string): boolean;
  /** Always returns an object: falls back to the placeholder when the id has no factory. */
  create(spec: ArtworkSpec): THREE.Object3D;
}

/** A neutral stand-in used whenever an artwork's factory is missing: a gilt frame plus a canvas. */
export function placeholderArtwork(spec: ArtworkSpec, ctx: ArtworkContext): THREE.Object3D {
  const w = spec.sizeCm[0] / 100;
  const h = spec.sizeCm[1] / 100;
  const group = new THREE.Group();
  group.name = 'placeholder:' + spec.id;
  const depth = 0.09;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.24, h + 0.24, depth), mat('wood.gilt-frame'));
  frame.position.z = -depth / 2;
  group.add(frame);
  const canvas = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat('app.canvas-placeholder'));
  canvas.position.z = 0.002;
  group.add(canvas);
  if (ctx.placeholder) group.userData.missing = true;
  return group;
}
