import * as THREE from 'three';
import { extrudeProfile, mergeAll, quadGeo, smoothstep, type ProfilePoint } from '../geom';
import type { BuildParts } from './types';

export interface PictureFrameOptions {
  /** Outer width of the frame in metres. */
  width: number;
  /** Outer height of the frame in metres. */
  height: number;
  /** Width of the frame moulding. Defaults to a museum-proportioned 8% of the short side. */
  borderWidth?: number;
  /** How far the frame stands proud of the wall. Defaults 0.11. */
  depth?: number;
  /** Add a blank canvas in the opening (used by the proof gallery's empty frames). */
  canvas?: boolean;
}

/**
 * A gilt picture frame with a real moulding profile: concave scotia, ovolo, and outer fillet,
 * mitred by overlapping the four runs. Faces +Z from the wall plane z = 0, centred on the origin.
 */
export function pictureFrame(opts: PictureFrameOptions): BuildParts {
  const { width, height } = opts;
  const border = opts.borderWidth ?? Math.min(width, height) * 0.08;
  const depth = opts.depth ?? 0.11;

  const profile: ProfilePoint[] = [
    [0, 0],
    [depth * 0.62, 0],
    [depth * 0.72, border * 0.1],
    [depth * 0.95, border * 0.26],
    [depth, border * 0.46],
    [depth * 0.86, border * 0.62],
    [depth * 0.6, border * 0.74],
    [depth * 0.52, border * 0.86],
    [depth * 0.62, border * 0.94],
    [depth * 0.62, border],
    [0, border],
  ];

  const rail = (length: number): THREE.BufferGeometry => extrudeProfile(profile, { length });

  const parts: THREE.BufferGeometry[] = [];
  const top = rail(width);
  top.translate(0, height / 2 - border, 0);
  parts.push(top);
  const bottom = rail(width);
  bottom.translate(0, -height / 2, 0);
  parts.push(bottom);

  const stileLength = height - border * 2;
  if (stileLength > 0.02) {
    const left = rail(stileLength);
    left.rotateZ(Math.PI / 2);
    left.translate(-width / 2, 0, 0);
    parts.push(left);
    const right = rail(stileLength);
    right.rotateZ(-Math.PI / 2);
    right.translate(width / 2, 0, 0);
    parts.push(right);
  }

  const frame = mergeAll(parts);
  const pos = frame.attributes.position;
  const col = frame.attributes.color as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const a = 0.72 + 0.28 * smoothstep(0, depth * 0.55, pos.getZ(i));
    col.setXYZ(i, a, a, a);
  }
  col.needsUpdate = true;

  const result: BuildParts = { 'wood.gilt-frame': frame };
  if (opts.canvas) {
    const cw = width - border * 2;
    const ch = height - border * 2;
    result['app.canvas-placeholder'] = quadGeo(
      [-cw / 2, -ch / 2, 0.004],
      [cw / 2, -ch / 2, 0.004],
      [cw / 2, ch / 2, 0.004],
      [-cw / 2, ch / 2, 0.004],
      [[0, 0], [cw, 0], [cw, ch], [0, ch]],
    );
  }
  return result;
}
