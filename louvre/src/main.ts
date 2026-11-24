import * as THREE from 'three';
import { EngineRenderer } from './core/renderer';
import { PerfHud } from './core/perf';
import { Controls, type ControlMode, type TourWaypoint } from './core/controls';
import { RoomCuller, cullerInfo } from './core/culling';
import { rng } from './core/rng';
import { artworks } from './artworks/library';
import { availableZones, loadZone, zoneAvailable } from './zones/registry';
import { EXAMPLE_ZONE, type AnyZoneId, type ZoneContext } from './zones/types';

const params = new URLSearchParams(window.location.search);
const canvas = document.getElementById('scene') as HTMLCanvasElement;
const hudHost = document.getElementById('hud-host') as HTMLDivElement;
const banner = document.getElementById('banner') as HTMLDivElement;

const engine = new EngineRenderer(canvas);
engine.scene.background = new THREE.Color(0x0a0b0d);
engine.scene.fog = new THREE.FogExp2(0x0a0b0d, 0.0026);

// Daylight through the skylight: a strong hemisphere for the sky, a directional for the sun patch
// on the floor, a cool fill so red walls do not go muddy in shadow, and a warm bounce.
const hemi = new THREE.HemisphereLight(0xe8f0f8, 0x6a5943, 3.6);
const sun = new THREE.DirectionalLight(0xfff4e6, 3.4);
sun.position.set(-24, 46, 16);
const fill = new THREE.DirectionalLight(0xc2d4e8, 1.0);
fill.position.set(20, 12, -34);
const bounce = new THREE.AmbientLight(0xffe9cf, 0.35);
engine.scene.add(hemi, sun, fill, bounce);

const requested = (params.get('zone') ?? EXAMPLE_ZONE) as AnyZoneId;
if (!availableZones().includes(requested)) {
  banner.style.display = 'block';
  banner.textContent =
    'Zone "' + requested + '" is not built yet. Available: ' +
    (availableZones().join(', ') || 'none') +
    (zoneAvailable(EXAMPLE_ZONE) ? ' — showing the proof gallery instead.' : '');
}

const zoneId: AnyZoneId = availableZones().includes(requested) ? requested : EXAMPLE_ZONE;
const ctx: ZoneContext = {
  rng: (label) => rng('zone/' + zoneId + '/' + (label ?? 'main')),
  artworks,
  pixelRatio: Math.min(window.devicePixelRatio, 2),
};

const loaded = await loadZone(zoneId, ctx);
const zone = loaded.zone;
if (!zone && loaded.error) {
  banner.style.display = 'block';
  banner.textContent = loaded.error;
}
if (zone) engine.scene.add(zone.group);

const rooms = zone?.rooms ?? [];
const spawns = zone?.spawnPoints ?? [];
const defaultSpawn = spawns[0] ?? { id: 'origin', position: [0, 1.65, 8] as const, lookAt: [0, 2, -6] as const };
const requestedSpawn = params.get('spawn');
const spawn = spawns.find((s) => s.id === requestedSpawn) ?? defaultSpawn;

const tourPath: TourWaypoint[] = spawns.length >= 2
  ? spawns.map((s) => ({ position: s.position, lookAt: s.lookAt, label: s.label }))
  : [
      { position: defaultSpawn.position, lookAt: defaultSpawn.lookAt },
      { position: [6, 1.65, 0], lookAt: [0, 2.4, -6] },
    ];

const culler = new RoomCuller(rooms, { depth: Number(params.get('depth') ?? 2) });
const roomObjects = new Map<string, THREE.Object3D>();
if (zone?.roomGroups) {
  for (const [id, obj] of zone.roomGroups) roomObjects.set(id, obj);
}

const hud = new PerfHud(engine.renderer, engine.stats, hudHost);
const helpEl = document.getElementById('help') as HTMLDivElement;
helpEl.innerHTML = Controls.keyHelp().join('<br>');

const controls = new Controls({
  camera: engine.camera,
  domElement: canvas,
  colliders: rooms,
  spawn,
  tour: tourPath,
  onChange: () => engine.invalidate(),
  onModeChange: (mode: ControlMode, paused: boolean) => {
    hud.setMode(mode + (paused ? ' (paused)' : ''));
    engine.continuous = mode === 'tour' && !paused;
    engine.invalidate();
  },
});

const cameraParam = params.get('camera');
const lookParam = params.get('look');
if (cameraParam && lookParam) {
  const p = cameraParam.split(',').map(Number) as [number, number, number];
  const l = lookParam.split(',').map(Number) as [number, number, number];
  controls.setCamera(p, l);
}
if (params.get('mode') === 'tour') controls.setMode('tour');

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyH') {
    hud.toggle();
    helpEl.style.display = helpEl.style.display === 'none' ? 'block' : 'none';
  } else if (e.code === 'KeyC') {
    hud.toggleCullingDebug();
  }
});

let sinceCull = 0;
engine.onFrame((dt) => {
  const moved = controls.update(dt);
  if (zone?.update) zone.update(dt, engine.camera);
  hud.update(dt);
  sinceCull += dt;
  if (moved || sinceCull > 0.25) {
    sinceCull = 0;
    const result = culler.compute(engine.camera);
    if (roomObjects.size) culler.apply(roomObjects, result);
    cullerInfo.active = result.active;
    cullerInfo.reason = result.reason;
  }
  return moved;
});

engine.start();
engine.renderNow();

const stats = (): ReturnType<PerfHud['snapshot']> => hud.snapshot();
(window as unknown as Record<string, unknown>).__stats = stats;
(window as unknown as Record<string, unknown>).__ready = true;
/** Zone-agnostic collision probes: one point that must be walkable, three that must not. */
const collisionProbes = (): Record<string, boolean> => {
  const b = rooms[0]?.bounds;
  if (!b) return { noRooms: true };
  const cx = (b.min[0] + b.max[0]) / 2;
  const cz = (b.min[2] + b.max[2]) / 2;
  return {
    roomCentre: controls.walkable(cx, cz),
    beyondEastWall: controls.walkable(b.max[0] + 2, cz),
    beyondNorthWall: controls.walkable(cx, b.min[2] - 2),
    farOutside: controls.walkable(b.min[0] - 60, b.min[2] - 60),
  };
};

(window as unknown as Record<string, unknown>).__test = {
  walkable: (x: number, z: number) => controls.walkable(x, z),
  collision: collisionProbes,
  zone: zoneId,
  spawns: spawns.map((s) => s.id),
  rooms: rooms.map((r) => r.id),
  setCamera: (p: [number, number, number], l: [number, number, number]) => controls.setCamera(p, l),
  tourProgress: (seconds: number) => controls.tourProgressAfter(seconds),
};
