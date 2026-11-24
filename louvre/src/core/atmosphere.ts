import * as THREE from 'three';
import { hexOf } from './palette';

/**
 * Per-zone sky and fog.
 *
 * A museum interior wants dark fog and a dim background so distant rooms fall away; the exterior
 * wants Paris daylight. Both cannot live in one global `scene.fog`, so a zone declares its
 * atmosphere and the engine swaps it as the camera moves between zones. Zones never touch
 * `scene.fog` or `scene.background` themselves.
 */
export interface AtmosphereSpec {
  /** Page/clear colour behind everything. Palette name or hex. */
  background?: string | number;
  /** Exponential fog. `null` disables fog for this zone; omit to inherit the engine default. */
  fog?: { color?: string | number; density?: number } | null;
}

const toColor = (value: string | number): THREE.Color =>
  typeof value === 'number' ? new THREE.Color(value) : new THREE.Color().setStyle(hexOf(value));

interface AtmosphereState {
  background: THREE.Color | THREE.Texture | null;
  fog: THREE.Fog | THREE.FogExp2 | null;
}

export class AtmosphereManager {
  private scene: THREE.Scene;
  private base: AtmosphereState;
  private current: string | number | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.base = {
      background: scene.background as THREE.Color | THREE.Texture | null,
      fog: scene.fog as THREE.Fog | THREE.FogExp2 | null,
    };
  }

  /** Apply a zone's atmosphere, or restore the engine default when there is none. */
  apply(spec: AtmosphereSpec | null | undefined): void {
    const key = spec ? JSON.stringify(spec) : null;
    if (key === this.current) return;
    this.current = key;

    if (!spec) {
      this.scene.background = this.base.background;
      this.scene.fog = this.base.fog;
      return;
    }
    if (spec.background !== undefined) this.scene.background = toColor(spec.background);
    else this.scene.background = this.base.background;

    if (spec.fog === null) {
      this.scene.fog = null;
    } else if (spec.fog) {
      const density = spec.fog.density ?? 0.0026;
      const colour = spec.fog.color !== undefined ? toColor(spec.fog.color) : toColor(0x0a0b0d);
      this.scene.fog = new THREE.FogExp2(colour.getHex(), density);
    } else {
      this.scene.fog = this.base.fog;
    }
  }
}
