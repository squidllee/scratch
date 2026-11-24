import * as THREE from 'three';
import { accountTexture } from './textures';

/**
 * An optional procedural environment map.
 *
 * The museum is lit by hemisphere and directional lights only, which means metals have nothing to
 * reflect: gold and zinc render as black at the palette's physically-correct metalness. A small
 * PMREM built from a painted sky gradient gives them something to pick up.
 *
 * It is **off by default** (`?env=1` or `--env` turns it on) because it changes how every material
 * in every zone reads, and that is a decision for integration to make with numbers, not a change to
 * land on the eve of assembly. Cost is reported through the same texture budget as everything else.
 */
export interface EnvironmentHandle {
  texture: THREE.Texture;
  bytes: number;
  dispose(): void;
}

function skyCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable; cannot build the environment map');
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, '#5d7793');
  g.addColorStop(0.32, '#a8bccd');
  g.addColorStop(0.5, '#e2e4dd');
  g.addColorStop(0.56, '#cfc6b4');
  g.addColorStop(1, '#6f6455');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

export function installEnvironment(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  resolution = 256,
): EnvironmentHandle {
  const source = new THREE.CanvasTexture(skyCanvas());
  source.mapping = THREE.EquirectangularReflectionMapping;
  source.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const target = pmrem.fromEquirectangular(source);
  const texture = target.texture;
  texture.name = 'app.environment';

  scene.environment = texture;

  // A PMREM cube at `resolution` with a full mip chain, RGBA.
  const bytes = Math.round(resolution * resolution * 6 * 4 * 1.34);
  accountTexture('app.environment', bytes, texture);

  source.dispose();
  pmrem.dispose();

  return {
    texture,
    bytes,
    dispose(): void {
      scene.environment = null;
      target.dispose();
    },
  };
}
