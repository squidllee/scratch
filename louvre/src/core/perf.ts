import * as THREE from 'three';
import type { RendererStats } from './renderer';
import { textureStats } from './textures';
import { textureBytes as artworkTextureBytes, textureLedger } from '../artworks';
import { materialCacheSize } from './materials';
import { cullerInfo } from './culling';

export interface Stats {
  fps: number;
  drawCalls: number;
  triangles: number;
  textureMB: number;
  textures: number;
  materials: number;
  cells: string[];
  cellReason: string;
  programs: number;
  geometries: number;
  frame: number;
  mode: string;
}

/**
 * The perf HUD. Numbers here are what every report quotes.
 *
 * Under SwiftShader (headless CI) the fps figure is meaningless — it measures a software
 * rasteriser. Draw calls, triangles and texture memory are the honest comparison, because they
 * are properties of the scene rather than of the machine drawing it. See docs/PERF.md.
 */
export class PerfHud {
  private readonly el: HTMLDivElement;
  private frames = 0;
  private accum = 0;
  private fps = 0;
  private mode = 'walk';
  private renderer: THREE.WebGLRenderer;
  private stats: RendererStats;
  private debugCulling = false;
  visible = true;

  constructor(renderer: THREE.WebGLRenderer, stats: RendererStats, host: HTMLElement) {
    this.renderer = renderer;
    this.stats = stats;
    this.el = document.createElement('div');
    this.el.id = 'hud';
    this.el.className = 'hud';
    host.appendChild(this.el);
    this.el.addEventListener('click', () => this.toggle());
  }

  setMode(mode: string): void {
    this.mode = mode;
  }

  toggleCullingDebug(): void {
    this.debugCulling = !this.debugCulling;
  }

  toggle(): void {
    this.visible = !this.visible;
    this.el.style.display = this.visible ? 'block' : 'none';
  }

  /** Call every frame; refreshes the DOM about five times a second. */
  update(dt: number): void {
    this.frames++;
    this.accum += dt;
    if (this.accum >= 0.2) {
      this.fps = this.frames / this.accum;
      this.frames = 0;
      this.accum = 0;
      if (this.visible) this.paint();
    }
  }

  snapshot(): Stats {
    const textures = textureStats();
    // `core/textures.ts` counts the shared tile canvases. The artwork canvases are painted by the
    // artworks library through its own ledger, so a scene carrying 28 real paintings reported 8 MB
    // while holding 25. Both ledgers, or the number is a lie.
    const bytes = textures.bytes + artworkTextureBytes();
    const artworkTextures = (): number => textureLedger().length;
    const cells = cullerInfo.active;
    return {
      fps: Math.round(this.fps * 10) / 10,
      drawCalls: this.stats.drawCalls,
      triangles: this.stats.triangles,
      textureMB: Math.round((bytes / (1024 * 1024)) * 100) / 100,
      textures: textures.count + artworkTextures(),
      materials: materialCacheSize(),
      cells,
      cellReason: cullerInfo.reason,
      programs: this.renderer.info.programs?.length ?? 0,
      geometries: this.renderer.info.memory.geometries,
      frame: this.stats.frame,
      mode: this.mode,
    };
  }

  private paint(): void {
    const s = this.snapshot();
    const lines = [
      '<b>' + s.fps.toFixed(0) + '</b> fps <span class="dim">(software GL — ignore)</span>',
      s.drawCalls + ' draw calls',
      (s.triangles / 1000).toFixed(1) + 'k tris',
      s.textureMB.toFixed(1) + ' MB textures (' + s.textures + ')',
      s.cells.length + ' cells' + (this.debugCulling ? ': ' + s.cells.join(', ') : ''),
      '<span class="dim">' + s.mode + ' · H hud · C cells</span>',
    ];
    this.el.innerHTML = lines.join('<br>');
  }
}
