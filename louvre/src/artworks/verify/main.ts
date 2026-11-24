/**
 * The artworks library's own capture target.
 *
 * It speaks the foundation harness protocol (`window.__ready`, `window.__stats()`,
 * `window.__test.pixelStats/collision/structure/spawns/tourProgress`) so
 * `npm run capture -- --url <this page> --verify` gives the same pixel verdict a zone gets, plus
 * artwork-specific numbers in `window.__test.artworkReport()`.
 */
import * as THREE from 'three';
import { EngineRenderer } from '../../core/renderer';
import { buildGallery } from './gallery';
import { ARTWORK_IDS, canvasInventory, textureBytes, textureLedger } from '../index';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const params = new URLSearchParams(window.location.search);

const engine = new EngineRenderer(canvas);
engine.scene.background = new THREE.Color(0x0d0e10);

const hemi = new THREE.HemisphereLight(0xeaf1f8, 0x6a5943, 3.1);
const sun = new THREE.DirectionalLight(0xfff3e2, 2.9);
sun.position.set(-22, 34, 20);
const fill = new THREE.DirectionalLight(0xc6d6ea, 0.85);
fill.position.set(18, 12, -26);
const ambient = new THREE.AmbientLight(0xffe9cf, 0.4);
engine.scene.add(hemi, sun, fill, ambient);

const layout = buildGallery();
engine.scene.add(layout.group);

const spawns = layout.spawns;
const spawn = spawns.find((s) => s.id === params.get('spawn')) ?? spawns[0];
engine.camera.position.set(spawn.position[0], spawn.position[1], spawn.position[2]);
engine.camera.lookAt(spawn.lookAt[0], spawn.lookAt[1], spawn.lookAt[2]);
const cameraParam = params.get('camera');
const lookParam = params.get('look');
if (cameraParam && lookParam) {
  const p = cameraParam.split(',').map(Number);
  const l = lookParam.split(',').map(Number);
  engine.camera.position.set(p[0], p[1], p[2]);
  engine.camera.lookAt(l[0], l[1], l[2]);
}
engine.camera.updateProjectionMatrix();

engine.onFrame(() => false);
engine.start();
engine.renderNow();

const stats = (): Record<string, number> => {
  const ledger = textureLedger();
  return {
    drawCalls: engine.stats.drawCalls,
    triangles: engine.stats.triangles,
    textureMB: Math.round((textureBytes() / (1024 * 1024)) * 100) / 100,
    artworkTextures: ledger.length,
    works: ARTWORK_IDS.length,
  };
};

const pixelStats = (): { width: number; height: number; mean: number; std: number; uniqueColours: number; sampled: number } => {
  engine.renderNow();
  const gl = engine.renderer.getContext();
  const width = gl.drawingBufferWidth;
  const height = gl.drawingBufferHeight;
  const buf = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  const seen = new Set<number>();
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      const lum = 0.2126 * buf[i] + 0.7152 * buf[i + 1] + 0.0722 * buf[i + 2];
      sum += lum;
      sumSq += lum * lum;
      n++;
      seen.add((buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2]);
    }
  }
  const mean = n > 0 ? sum / n : 0;
  const variance = n > 0 ? Math.max(0, sumSq / n - mean * mean) : 0;
  return {
    width,
    height,
    mean: Math.round(mean * 10) / 10,
    std: Math.round(Math.sqrt(variance) * 10) / 10,
    uniqueColours: seen.size,
    sampled: n,
  };
};

const walkable = (x: number, z: number): boolean => {
  const b = layout.bounds;
  const pad = 0.3;
  return x > b.min[0] + pad && x < b.max[0] - pad && z > b.min[2] + pad && z < b.max[2] - pad;
};

const collision = (): Record<string, boolean> => {
  const b = layout.bounds;
  const cx = (b.min[0] + b.max[0]) / 2;
  const cz = (b.min[2] + b.max[2]) / 2;
  return {
    roomCentre: walkable(cx, cz),
    beyondEastWall: walkable(b.max[0] + 2, cz),
    beyondNorthWall: walkable(cx, b.min[2] - 2),
    farOutside: walkable(b.min[0] - 60, b.min[2] - 60),
  };
};

const structure = (): Record<string, unknown> => {
  const artworkIds: string[] = [];
  layout.group.traverse((o) => {
    const id = o.userData?.artworkId;
    if (typeof id === 'string') artworkIds.push(id);
  });
  const box = new THREE.Box3().setFromObject(layout.group);
  return {
    zone: 'artworks',
    rooms: ['gallery'],
    spawns: spawns.map((s) => s.id),
    bounds: {
      min: [round(box.min.x), round(box.min.y), round(box.min.z)],
      max: [round(box.max.x), round(box.max.y), round(box.max.z)],
    },
    artworkIds,
    drawCalls: engine.stats.drawCalls,
    triangles: engine.stats.triangles,
  };
};

/** Per-work measured size against the centimetres in the spec. */
const artworkReport = (): Array<Record<string, unknown>> => {
  const byId = new Map<string, THREE.Object3D>();
  layout.group.traverse((o) => {
    const id = o.userData?.artworkId;
    if (typeof id === 'string' && !byId.has(id)) byId.set(id, o);
  });
  const out: Array<Record<string, unknown>> = [];
  for (const [id, obj] of byId) {
    const box = new THREE.Box3().setFromObject(obj);
    const size: [number, number, number] = [round(box.max.x - box.min.x), round(box.max.y - box.min.y), round(box.max.z - box.min.z)];
    const placement = layout.placements.find((p) => p.id === id);
    let triangles = 0;
    let meshes = 0;
    obj.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        meshes++;
        const g = o.geometry as THREE.BufferGeometry;
        triangles += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
      }
    });
    out.push({
      id,
      kind: placement?.kind ?? 'unknown',
      specCm: placement ? [placement.size[0] * 100, placement.size[1] * 100, placement.size[2] * 100] : null,
      bboxM: size,
      triangles,
      meshes,
      min: [round(box.min.x), round(box.min.y), round(box.min.z)],
      floorGap: placement ? round(box.min.y - placement.position[1]) : null,
    });
  }
  return out.sort((a, b) => String(a.id).localeCompare(String(b.id)));
};

/** Per-canvas statistics, read back from the painted canvases themselves. */
const canvasStats = (): Array<Record<string, unknown>> => {
  const out: Array<Record<string, unknown>> = [];
  const seen = new Set<HTMLCanvasElement>();
  engine.scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const material = Array.isArray(o.material) ? o.material[0] : o.material;
    const map = (material as THREE.MeshStandardMaterial | undefined)?.map;
    const img = map?.image as HTMLCanvasElement | undefined;
    if (!img || !(img instanceof HTMLCanvasElement) || seen.has(img)) return;
    seen.add(img);
    const ctx = img.getContext('2d');
    if (!ctx) return;
    const w = img.width;
    const h = img.height;
    const data = ctx.getImageData(0, 0, w, h).data;
    const seenColours = new Set<number>();
    let sum = 0;
    let sumSq = 0;
    let n = 0;
    const step = Math.max(1, Math.floor(Math.sqrt((w * h) / 20000)));
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const i = (y * w + x) * 4;
        const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        sum += lum;
        sumSq += lum * lum;
        n++;
        seenColours.add(((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3));
      }
    }
    const mean = n ? sum / n : 0;
    const variance = n ? Math.max(0, sumSq / n - mean * mean) : 0;
    // Named region means, so a composition can be checked numerically instead of by eye.
    const probe = (x0: number, y0: number, x1: number, y1: number): string => {
      let r = 0;
      let g = 0;
      let b = 0;
      let c = 0;
      for (let y = Math.floor(y0 * h); y < Math.floor(y1 * h); y += 2) {
        for (let x = Math.floor(x0 * w); x < Math.floor(x1 * w); x += 2) {
          const i = (y * w + x) * 4;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          c++;
        }
      }
      const hex2 = (v: number): string => Math.round(v / Math.max(1, c)).toString(16).padStart(2, '0');
      return '#' + hex2(r) + hex2(g) + hex2(b);
    };
    out.push({
      name: material?.name ?? 'unknown',
      w,
      h,
      mean: Math.round(mean * 10) / 10,
      std: Math.round(Math.sqrt(variance) * 10) / 10,
      colours: seenColours.size,
      regions: {
        top: probe(0.3, 0.04, 0.7, 0.18),
        centre: probe(0.38, 0.4, 0.62, 0.6),
        left: probe(0.04, 0.35, 0.2, 0.65),
        right: probe(0.8, 0.35, 0.96, 0.65),
        bottom: probe(0.3, 0.82, 0.7, 0.96),
      },
    });
  });
  return out.sort((a, b) => String(a.name).localeCompare(String(b.name)));
};

const round = (v: number): number => Math.round(v * 1000) / 1000;

/** Synthetic tour coverage over the spawn polyline, at walking pace. */
const tourProgress = (seconds: number): { u: number; distance: number } => {
  let total = 0;
  for (let i = 1; i < spawns.length; i++) {
    const a = spawns[i - 1].position;
    const b = spawns[i].position;
    total += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  }
  const speed = 3.2;
  return { u: Math.min(1, (seconds * speed) / Math.max(1, total)), distance: Math.round(total * 10) / 10 };
};

const w = window as unknown as Record<string, unknown>;
w.__stats = stats;
w.__test = {
  walkable,
  collision,
  zone: 'artworks',
  spawns: spawns.map((s) => s.id),
  rooms: ['gallery'],
  pixelStats,
  structure,
  artworkReport,
  canvasStats,
  textures: () => textureLedger(),
  inventory: () => canvasInventory(),
  tourProgress,
  setCamera: (p: [number, number, number], l: [number, number, number]) => {
    engine.camera.position.set(p[0], p[1], p[2]);
    engine.camera.lookAt(l[0], l[1], l[2]);
    engine.invalidate();
  },
};
w.__ready = true;
