import * as THREE from 'three';
import { rng } from '../core/rng';
import { placeholderArtwork, type ArtworkFactory, type ArtworkLibrary, type ArtworkSpec } from './types';
import { createArtwork, hasArtwork } from './registry';

/**
 * The artwork registry. Factories register themselves by artwork id; zones only ever name ids.
 *
 * The artworks library thread ships factories under src/artworks/<name>/ and gets them imported
 * once by the integration thread. Until then every id resolves to the placeholder, so a zone can
 * be built and verified before a single factory exists.
 */
class Library implements ArtworkLibrary {
  private factories = new Map<string, ArtworkFactory>();
  missing = new Set<string>();

  register(id: string, factory: ArtworkFactory): void {
    this.factories.set(id, factory);
  }

  has(id: string): boolean {
    return this.factories.has(id) || hasArtwork(id);
  }

  create(spec: ArtworkSpec): THREE.Object3D {
    const factory = this.factories.get(spec.id);
    const ctx = { rng: rng('artwork/' + spec.id), placeholder: !factory };
    if (!factory) {
      // The artwork library's own factories (src/artworks/registry.ts) are the default, so zones
      // get real art with nothing wired up. register() still overrides them.
      const built = createArtwork(spec, ctx);
      if (built) {
        built.userData.artworkId = spec.id;
        return built;
      }
      this.missing.add(spec.id);
      const obj = placeholderArtwork(spec, { ...ctx, placeholder: true });
      obj.userData.artworkId = spec.id;
      obj.userData.placeholder = true;
      obj.position.set(spec.position[0], spec.position[1], spec.position[2]);
      obj.rotation.y = spec.rotationY;
      return obj;
    }
    return factory(spec, ctx);
  }
}

export const artworks: Library = new Library();

export function registerArtwork(id: string, factory: ArtworkFactory): void {
  artworks.register(id, factory);
}

/**
 * Place one artwork into a zone's group by id. The factory positions the object itself when it
 * wants to (multi-part assemblies); otherwise the spec's position and rotation are applied.
 */
export function placeArtwork(
  parent: THREE.Object3D,
  spec: ArtworkSpec,
  opts: { registerCollider?: (box: THREE.Box3) => void } = {},
): THREE.Object3D {
  const obj = artworks.create(spec);
  obj.userData.artworkId = spec.id;
  if (obj.position.lengthSq() === 0 && obj.rotation.y === 0) {
    obj.position.set(spec.position[0], spec.position[1], spec.position[2]);
    obj.rotation.y = spec.rotationY;
  }
  parent.add(obj);
  if (opts.registerCollider) {
    const box = new THREE.Box3().setFromObject(obj);
    opts.registerCollider(box);
  }
  return obj;
}
