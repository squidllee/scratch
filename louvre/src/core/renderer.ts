import * as THREE from 'three';

export interface RendererStats {
  drawCalls: number;
  triangles: number;
  frame: number;
  lastFrameMs: number;
}

/**
 * The engine's WebGL renderer.
 *
 * On-demand drawing: the loop calls `update(dt)` every animation frame but only submits a draw
 * when something actually changed (the camera moved, a scene object was added, the tour advanced).
 * A static gallery costs nothing while the visitor stands still.
 */
export class EngineRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly canvas: HTMLCanvasElement;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(62, 1, 0.05, 1200);
  readonly stats: RendererStats = { drawCalls: 0, triangles: 0, frame: 0, lastFrameMs: 0 };
  /** Force continuous drawing (used while the tour plays). */
  continuous = false;
  /** rAF is throttled to this cadence even when dirty, so idle CPU stays near zero. */
  maxIdleFps = 12;

  private dirty = true;
  private update: ((dt: number) => boolean) | null = null;
  private last = 0;
  private raf = 0;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('webgl2', {
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    if (!context) {
      throw new Error('WebGL2 is not available in this browser; the Louvre needs WebGL2.');
    }
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      context: context as WebGL2RenderingContext,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = false;
    this.renderer.info.autoReset = false;
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  resize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.invalidate();
  };

  /** Mark the frame as needing a redraw. */
  invalidate(): void {
    this.dirty = true;
  }

  setCamera(camera: THREE.PerspectiveCamera): void {
    this.camera = camera;
    this.camera.updateProjectionMatrix();
    this.invalidate();
  }

  /** Called once per frame; return true when the scene changed and must be redrawn. */
  onFrame(update: (dt: number) => boolean): void {
    this.update = update;
  }

  start(): void {
    if (this.raf) return;
    this.last = performance.now();
    const tick = (now: number): void => {
      if (this.disposed) return;
      this.raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
      this.last = now;
      const changed = this.update ? this.update(dt) : false;
      if (changed || this.continuous) this.dirty = true;
      if (this.dirty) {
        this.dirty = false;
        const t0 = performance.now();
        this.renderer.info.reset();
        this.renderer.render(this.scene, this.camera);
        this.stats.drawCalls = this.renderer.info.render.calls;
        this.stats.triangles = this.renderer.info.render.triangles;
        this.stats.frame++;
        this.stats.lastFrameMs = performance.now() - t0;
      }
    };
    this.raf = requestAnimationFrame(tick);
  }

  renderNow(): void {
    this.renderer.info.reset();
    this.renderer.render(this.scene, this.camera);
    this.stats.drawCalls = this.renderer.info.render.calls;
    this.stats.triangles = this.renderer.info.render.triangles;
    this.stats.frame++;
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    this.renderer.dispose();
  }
}
