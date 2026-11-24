import * as THREE from 'three';
import { EngineRenderer } from './core/renderer';
import { PerfHud } from './core/perf';
import { Controls, type ControlMode, type TourWaypoint } from './core/controls';
import { RoomCuller, cullerInfo, pickFloorAt, roomFloorAt, type RoomDef } from './core/culling';
import { AtmosphereManager } from './core/atmosphere';
import { installEnvironment } from './core/environment';
import { rng } from './core/rng';
import { artworks } from './artworks/library';
import { librarySummary } from './artworks/index';
import { ZONE_IDS, loadZone } from './zones/registry';
import type { AnyZoneId, Zone, ZoneContext } from './zones/types';
import { addLevelLinks, assemble, auditPortals, openSkyRooms, reconcilePortals } from './core/assembly';
import { SPIRAL } from './zones/pyramid/hall';
import { buildTour, findPath, type RouteStep } from './core/tour';
import routeSpec from '../docs/spec/route.json';

/**
 * The assembled museum.
 *
 * One scene, five zones, one room graph. Every zone builds its own wing and declares its own
 * rooms; a portal that names a room in another wing is just a string until the graphs are unioned,
 * which is what happens here — the culler walks from the Hall Napoléon into the Denon wing because
 * both ends of that doorway live in the same map.
 *
 * `?zones=denon` loads one wing (the capture harness uses this to keep per-zone numbers honest).
 * No parameter loads the whole museum, which is what ships.
 */

const params = new URLSearchParams(window.location.search);
const canvas = document.getElementById('scene') as HTMLCanvasElement;
const hudHost = document.getElementById('hud-host') as HTMLDivElement;
const banner = document.getElementById('banner') as HTMLDivElement;

const engine = new EngineRenderer(canvas);
engine.scene.background = new THREE.Color(0x0a0b0d);
engine.scene.fog = new THREE.FogExp2(0x0a0b0d, 0.0026);

const hemi = new THREE.HemisphereLight(0xe8f0f8, 0x6a5943, 3.6);
const sun = new THREE.DirectionalLight(0xfff4e6, 3.4);
sun.position.set(-24, 46, 16);
const fill = new THREE.DirectionalLight(0xc2d4e8, 1.0);
fill.position.set(20, 12, -34);
const bounce = new THREE.AmbientLight(0xffe9cf, 0.35);
engine.scene.add(hemi, sun, fill, bounce);

const envHandle = params.get('env') === '1' ? installEnvironment(engine.renderer, engine.scene) : null;

/** Which wings to load. Default: all of them — this is the museum, not a zone demo. */
const requestedZones = (params.get('zones') ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter((s): s is AnyZoneId => (ZONE_IDS as string[]).includes(s));
const zoneIds: AnyZoneId[] = requestedZones.length ? requestedZones : [...ZONE_IDS];

const ctx: ZoneContext = {
  rng: (label) => rng('museum/' + (label ?? 'main')),
  artworks,
  pixelRatio: Math.min(window.devicePixelRatio, 2),
};

const loadedZones: Zone[] = [];
const loadErrors: string[] = [];
await Promise.all(
  zoneIds.map(async (id) => {
    const loaded = await loadZone(id, ctx);
    if (loaded.zone) loadedZones.push(loaded.zone);
    else if (loaded.error) loadErrors.push(loaded.error);
  }),
);
loadedZones.sort((a, b) => ZONE_IDS.indexOf(a.id as never) - ZONE_IDS.indexOf(b.id as never));
for (const zone of loadedZones) engine.scene.add(zone.group);

if (loadErrors.length) {
  banner.style.display = 'block';
  banner.textContent = loadErrors.join(' · ');
}

/**
 * A ceiling painting is built flat, facing +Z, exactly like a wall painting. Nothing pitches it into
 * the vault: the Galerie d'Apollon's Delacroix stood upright across a 13.85 m room. Pitch it before
 * the yaw the zone gave it, and keep the work's own id and position, which the harness counts.
 */
const pitched: string[] = [];
for (const zone of loadedZones) {
  zone.group.traverse((obj) => {
    if (obj.userData?.artworkKind !== 'ceiling-painting' || !obj.parent) return;
    const parent = obj.parent;
    const pivot = new THREE.Group();
    pivot.name = 'ceiling-pivot/' + String(obj.userData.artworkId);
    pivot.position.copy(obj.position);
    pivot.rotation.y = obj.rotation.y;
    obj.position.set(0, 0, 0);
    obj.rotation.set(Math.PI / 2, 0, 0);
    parent.add(pivot);
    parent.remove(obj);
    pivot.add(obj);
    pitched.push(String(obj.userData.artworkId));
  });
}

const assembly = assemble(loadedZones);
/**
 * One room graph. Every zone declared only its own half of the doors between wings, so the union
 * is repaired against the spec before anything else reads it: `route.json` says which rooms are
 * joined, the geometry says where the opening sits.
 */
const specLinks = (routeSpec.rooms as Array<{ id: string; portals?: Array<{ to: string }> }>).flatMap((room) =>
  (room.portals ?? []).map((p) => ({ from: room.id, to: p.to })),
);
const reconciliation = reconcilePortals(assembly.rooms, specLinks);
/**
 * Connectors between levels. The spec puts the Hall Napoléon nine metres under the courtyard and
 * the Denon ground floor nine metres above its passage, joined by doorways. The zones built the
 * stone and the passages; nothing built the climb, so the assembly does, from the geometry they
 * did build.
 */
const levelLinks = addLevelLinks(assembly.rooms, {
  spiral: { id: 'spiral/hall-napoleon', spec: SPIRAL, links: ['cour-napoleon', 'hall-napoleon'] },
});
const rooms = assembly.rooms;
const roomToZone = assembly.roomToZone;
const roomObjects = assembly.roomObjects;
const spawns = assembly.spawns;

/** The courts: no ceiling in the spec, sky above them, and the only cells that can see façades. */
const openSky = openSkyRooms(routeSpec.rooms as Array<{ id: string; clearHeight_m: number | null }>);

/** The exterior's backdrop — roofs, façades, sky, ground — as one object the frame can drop. */
const backdrop = new THREE.Group();
backdrop.name = 'exterior-backdrop';
for (const zone of loadedZones) {
  if (zone.id !== 'exterior') continue;
  const kept = new Set(zone.roomGroups.values());
  for (const child of [...zone.group.children]) {
    if (kept.has(child)) continue;
    zone.group.remove(child);
    backdrop.add(child);
  }
  // Inside the zone, not beside it: the harness's instance audit walks each zone's group, and a
  // backdrop reparented to the scene root would take 5,000 façade instances out of the count.
  zone.group.add(backdrop);
}

const requestedSpawn = params.get('spawn');
const bare = (id: string): string => id.slice(id.indexOf('/') + 1);
const resolved =
  spawns.find((s) => s.id === requestedSpawn) ??
  spawns.find((s) => bare(s.id) === requestedSpawn) ??
  spawns.find((s) => s.id === 'pyramid/pyramid-inside');
const spawn = resolved ?? spawns[0] ?? { id: 'origin', position: [0, 1.65, 8] as const, lookAt: [0, 2, -6] as const };
/**
 * A spawn id that does not exist must say so. Falling back silently made three different capture
 * viewpoints produce three identical frames, and the run still passed every pixel floor.
 */
if (requestedSpawn && !resolved) {
  banner.style.display = 'block';
  banner.textContent =
    'No spawn point "' + requestedSpawn + '". Using ' + spawn.id + '. Available: ' +
    spawns.slice(0, 8).map((s) => s.id).join(', ') + (spawns.length > 8 ? ', …' : '');
}

const tour = buildTour(routeSpec.route as RouteStep[], rooms);
const tourPath: TourWaypoint[] = tour.waypoints;

const atmosphere = new AtmosphereManager(engine.scene);
const zoneAtmospheres = new Map<string, import('./core/atmosphere').AtmosphereSpec | undefined>();
for (const zone of loadedZones) zoneAtmospheres.set(zone.id, zone.atmosphere);
let appliedZone: string | null = null;

const culler = new RoomCuller(rooms, { depth: Number(params.get('depth') ?? 2) });

const hud = new PerfHud(engine.renderer, engine.stats, hudHost);
const helpEl = document.getElementById('help') as HTMLDivElement;
helpEl.innerHTML = Controls.keyHelp().join('<br>');

const controls = new Controls({
  camera: engine.camera,
  domElement: canvas,
  colliders: rooms,
  spawn,
  tour: tourPath,
  tourSpeed: Number(params.get('tourspeed') ?? 2.9),
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

/**
 * Settle the scene for wherever the camera now is: which cells are drawn, whether the exterior's
 * backdrop is in view, and which wing's sky and fog apply. The frame loop calls this whenever the
 * camera moved; a teleport (a spawn, a capture, a camera parameter) calls it directly, because a
 * jump is not a movement the walker's own integrator can see.
 */
function applyCellState(): void {
  const result = culler.compute(engine.camera);
  if (roomObjects.size) culler.apply(roomObjects, result);
  cullerInfo.active = result.active;
  cullerInfo.reason = result.reason;

  // The backdrop is 200k triangles of roof and façade. Standing in a sealed gallery cannot see it,
  // so it is drawn only when the sky is in view: the camera is outdoors, or the cells it is drawing
  // include a court — which is what a window onto the Cour Carrée looks at.
  const cell = result.cameraRoom;
  const outdoors =
    cell === null ||
    openSky.has(cell) ||
    roomToZone.get(cell) === 'exterior' ||
    result.active.some((id) => openSky.has(id));
  backdrop.visible = outdoors;

  const activeZoneId = (cell ? roomToZone.get(cell) : undefined) ?? activeZoneIdFor(cell);
  if (activeZoneId !== appliedZone) {
    appliedZone = activeZoneId;
    atmosphere.apply(zoneAtmospheres.get(activeZoneId));
  }
}

let sinceCull = 0;
engine.onFrame((dt) => {
  const moved = controls.update(dt);
  for (const zone of loadedZones) zone.update?.(dt, engine.camera);
  hud.update(dt);
  sinceCull += dt;
  if (moved || sinceCull > 0.25) {
    sinceCull = 0;
    applyCellState();
  }
  return moved;
});

/**
 * The camera outside every room is standing on the place du Carrousel or over the roofline: that is
 * the exterior's daylight, not whichever wing happened to load last.
 */
function activeZoneIdFor(cell: string | null): string {
  if (cell) return roomToZone.get(cell) ?? 'exterior';
  return 'exterior';
}

engine.start();
engine.renderNow();

const stats = (): ReturnType<PerfHud['snapshot']> => hud.snapshot();
(window as unknown as Record<string, unknown>).__stats = stats;
(window as unknown as Record<string, unknown>).__ready = true;

const pixelStats = (): {
  width: number;
  height: number;
  mean: number;
  centreMean: number;
  environment: boolean;
  std: number;
  uniqueColours: number;
  sampled: number;
} => {
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
  const step = 2;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const lum = 0.2126 * (buf[i] as number) + 0.7152 * (buf[i + 1] as number) + 0.0722 * (buf[i + 2] as number);
      sum += lum;
      sumSq += lum * lum;
      n++;
      seen.add(((buf[i] as number) << 16) | ((buf[i + 1] as number) << 8) | (buf[i + 2] as number));
    }
  }
  const mean = n > 0 ? sum / n : 0;
  const variance = n > 0 ? Math.max(0, sumSq / n - mean * mean) : 0;
  let centreSum = 0;
  let centreN = 0;
  const cx0 = Math.floor(width * 0.4);
  const cx1 = Math.floor(width * 0.6);
  const cy0 = Math.floor(height * 0.4);
  const cy1 = Math.floor(height * 0.6);
  for (let y = cy0; y < cy1; y += step) {
    for (let x = cx0; x < cx1; x += step) {
      const i = (y * width + x) * 4;
      centreSum += 0.2126 * (buf[i] as number) + 0.7152 * (buf[i + 1] as number) + 0.0722 * (buf[i + 2] as number);
      centreN++;
    }
  }
  return {
    width,
    height,
    mean: Math.round(mean * 10) / 10,
    centreMean: Math.round((centreN > 0 ? centreSum / centreN : 0) * 10) / 10,
    environment: Boolean(envHandle),
    std: Math.round(Math.sqrt(variance) * 10) / 10,
    uniqueColours: seen.size,
    sampled: n,
  };
};

const round = (v: number): number => Math.round(v * 100) / 100;

const structure = (): Record<string, unknown> => {
  const artworkIds: string[] = [];
  for (const zone of loadedZones) {
    zone.group.traverse((o) => {
      const id = o.userData?.artworkId;
      if (typeof id === 'string') artworkIds.push(id);
    });
  }

  const instances: {
    count: number;
    outsideRooms: number;
    outsideBounds: number;
    duplicatePositions: number;
    perZone: Array<{ zone: string; basis: string; count: number; outside: number; duplicates: number }>;
  } = { count: 0, outsideRooms: 0, outsideBounds: 0, duplicatePositions: 0, perZone: [] };
  const m = new THREE.Matrix4();
  const v = new THREE.Vector3();
  const pad = 8;
  const withinBox = (b: { min: readonly number[]; max: readonly number[] }, p: THREE.Vector3): boolean =>
    p.x >= (b.min[0] as number) - pad && p.x <= (b.max[0] as number) + pad &&
    p.y >= (b.min[1] as number) - pad && p.y <= (b.max[1] as number) + pad &&
    p.z >= (b.min[2] as number) - pad && p.z <= (b.max[2] as number) + pad;
  const withinRooms = (p: THREE.Vector3): boolean => rooms.some((room) => withinBox(room.bounds, p));

  const box = new THREE.Box3();
  for (const zone of loadedZones) {
    zone.group.updateMatrixWorld(true);
    box.union(new THREE.Box3().setFromObject(zone.group));
  }
  const extent = { min: [box.min.x, box.min.y, box.min.z], max: [box.max.x, box.max.y, box.max.z] };

  for (const zone of loadedZones) {
    // The basis is per wing, exactly as the contract says: a wing the spec gives rooms to is
    // checked against its rooms, and the exterior — which builds façades over open ground — against
    // its own rendered bounds. Auditing the assembled scene with one basis would report 1,200
    // healthy instances as failures.
    const zoneHasRooms = zone.id !== 'exterior';
    const zoneBox = new THREE.Box3().setFromObject(zone.group);
    const own = { count: 0, outside: 0, duplicates: 0 };
    zone.group.traverse((o) => {
      const im = o as THREE.InstancedMesh;
      if (!im.isInstancedMesh) return;
      const seen = new Map<string, number>();
      for (let i = 0; i < im.count; i++) {
        im.getMatrixAt(i, m);
        v.setFromMatrixPosition(m).applyMatrix4(im.matrixWorld);
        instances.count++;
        own.count++;
        const inOwn = zoneBox.isEmpty()
          ? true
          : v.x >= zoneBox.min.x - pad && v.x <= zoneBox.max.x + pad &&
            v.y >= zoneBox.min.y - pad && v.y <= zoneBox.max.y + pad &&
            v.z >= zoneBox.min.z - pad && v.z <= zoneBox.max.z + pad;
        const outside = zoneHasRooms ? !withinRooms(v) : !inOwn;
        if (outside) {
          instances.outsideRooms++;
          own.outside++;
        }
        if (!withinBox(extent, v)) instances.outsideBounds++;
        const key = Math.round(v.x * 100) + ':' + Math.round(v.y * 100) + ':' + Math.round(v.z * 100);
        seen.set(key, (seen.get(key) ?? 0) + 1);
      }
      let worst = 0;
      for (const n of seen.values()) worst = Math.max(worst, n);
      if (worst > im.count * 0.1) {
        instances.duplicatePositions += worst;
        own.duplicates += worst;
      }
    });
    if (own.count) {
      instances.perZone.push({ zone: zone.id, basis: zoneHasRooms ? 'rooms' : 'bounds', ...own });
    }
  }

  const bounds = box.isEmpty()
    ? null
    : {
        min: [round(box.min.x), round(box.min.y), round(box.min.z)] as [number, number, number],
        max: [round(box.max.x), round(box.max.y), round(box.max.z)] as [number, number, number],
      };

  return {
    zones: loadedZones.map((z) => z.id),
    rooms: rooms.map((r) => r.id),
    spawns: spawns.map((s) => s.id),
  spawnTable: () => spawns.map((s) => ({ id: s.id, position: s.position, lookAt: s.lookAt })),
    bounds,
    artworkIds,
    instances,
    duplicateRooms: assembly.duplicateRooms,
    duplicateObjects: assembly.duplicateObjects,
    portals: auditPortals(rooms, roomToZone),
    reconciliation: {
      fromSpec: reconciliation.fromSpec,
      reciprocal: reconciliation.reciprocal.length,
      unbridgeable: reconciliation.unbridgeable,
      thresholds: reconciliation.thresholds,
      levelLinks,
      pitchedCeilingPaintings: pitched,
    },
    tour: {
      waypoints: tourPath.length,
      lengthM: tour.lengthM,
      unrouted: tour.unrouted,
      unknownRooms: tour.unknownRooms,
    },
    drawCalls: engine.stats.drawCalls,
    triangles: engine.stats.triangles,
    artworkLibrary: librarySummary(),
  };
};

/**
 * Collision over the whole palace, not over one room. Three points that must be walkable (the
 * pyramid's own cell, the far end of the Grande Galerie, the middle of the Richelieu courts) and
 * four that must not: past the colonnade, out on the Carrousel, north of the rue de Rivoli, and
 * inside the outer wall between the Grande Galerie and the quay.
 */
const collisionProbes = (): Record<string, boolean> => {
  const at = (id: string): [number, number] | null => {
    const room = rooms.find((r) => r.id === id);
    if (!room) return null;
    return [(room.bounds.min[0] + room.bounds.max[0]) / 2, (room.bounds.min[2] + room.bounds.max[2]) / 2];
  };
  const centre = (id: string): boolean => {
    const p = at(id);
    return p ? controls.walkable(p[0], p[1]) : false;
  };
  return {
    hallNapoleon: centre('hall-napoleon'),
    grandeGalerie: centre('grande-galerie'),
    courMarly: centre('cour-marly'),
    pyramidInterior: controls.walkable(0, 0),
    beyondColonnade: controls.walkable(330, 0),
    offTheCarrousel: controls.walkable(-300, 0),
    northOfRivoli: controls.walkable(0, -200),
    insideTheOuterWall: controls.walkable(40, 155.5),
  };
};

(window as unknown as Record<string, unknown>).__test = {
  walkable: (x: number, z: number) => controls.walkable(x, z),
  collision: collisionProbes,
  zones: loadedZones.map((z) => z.id),
  spawns: spawns.map((s) => s.id),
  spawnTable: () => spawns.map((s) => ({ id: s.id, position: s.position, lookAt: s.lookAt })),
  rooms: rooms.map((r) => r.id),
  /** Every room as the culler and the walker see it, with its doors: the assembled graph, printed. */
  roomTable: () =>
    rooms.map((r) => ({
      id: r.id,
      zone: roomToZone.get(r.id),
      min: r.bounds.min.map(round),
      max: r.bounds.max.map(round),
      floorAt: Boolean(r.floorAt),
      doors: (r.portals ?? []).map((p) => p.to),
    })),
  atmosphere: () => ({
    declaredByAnyZone: loadedZones.some((z) => z.atmosphere),
    background: engine.scene.background instanceof THREE.Color ? '#' + engine.scene.background.getHexString() : null,
    fog: engine.scene.fog ? (engine.scene.fog as THREE.FogExp2).density ?? null : null,
    fogColour: engine.scene.fog ? '#' + (engine.scene.fog as THREE.FogExp2).color.getHexString() : null,
  }),
  debug: () => {
    const cam = engine.camera;
    const q = cam.quaternion;
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    const visible: Array<{ name: string; visible: boolean }> = [];
    engine.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      visible.push({ name: mesh.name || '(unnamed)', visible: mesh.visible });
    });
    return {
      camera: [round(cam.position.x), round(cam.position.y), round(cam.position.z)],
      forward: [round(fwd.x), round(fwd.y), round(fwd.z)],
      mode: controls.mode,
      meshes: visible.length,
      backdropVisible: backdrop.visible,
      fog: engine.scene.fog ? (engine.scene.fog as THREE.FogExp2).density : null,
    };
  },
  pixelStats,
  structure,
  probe: (maxDistance = 200) => {
    const raycaster = new THREE.Raycaster();
    raycaster.far = maxDistance;
    const out: Array<Record<string, unknown>> = [];
    const origin = new THREE.Vector3();
    for (const s of spawns) {
      origin.set(s.position[0], s.position[1], s.position[2]);
      const dir = new THREE.Vector3(s.lookAt[0], s.lookAt[1], s.lookAt[2]).sub(origin).normalize();
      raycaster.set(origin, dir);
      // The backdrop is hidden indoors to save 200k triangles; a probe still wants to know what is
      // along the sight line, so it is drawn for the duration of the query.
      const wasVisible = backdrop.visible;
      backdrop.visible = true;
      const hits = raycaster.intersectObjects(loadedZones.map((z) => z.group), true);
      backdrop.visible = wasVisible;
      const hit = hits[0];
      const mesh = hit?.object as THREE.Mesh | undefined;
      const material = mesh ? (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) : null;
      out.push({
        spawn: s.id,
        object: hit ? hit.object.name || '(unnamed)' : null,
        material: material ? material.name || '(unnamed)' : null,
        distance: hit ? round(hit.distance) : null,
      });
    }
    return out;
  },
  floorProbe: () => {
    const ramp: RoomDef = { id: 'probe-ramp', bounds: { min: [0, 0, 0], max: [4, 3, 6] }, floorAt: (_x, z) => z * 0.5 };
    const flat: RoomDef = { id: 'probe-flat', bounds: { min: [0, 3, 0], max: [4, 6, 6] } };
    const courtyard: RoomDef = { id: 'probe-courtyard', bounds: { min: [-5, 0, -5], max: [5, 21.7, 5] } };
    const hall: RoomDef = { id: 'probe-hall', bounds: { min: [-5, -9, -5], max: [5, 0, 5] } };
    const undercroft: RoomDef = { id: 'probe-undercroft', bounds: { min: [-5, -18, -5], max: [5, -9, 5] } };
    const stack = [courtyard, hall, undercroft];
    return {
      rampAtStart: roomFloorAt(ramp, 1, 0),
      rampAtEnd: roomFloorAt(ramp, 1, 6),
      flat: roomFloorAt(flat, 1, 3),
      atSpawn: controls.floorAt(spawn.position[0], spawn.position[2]),
      stackOnCourtyard: pickFloorAt(stack, 0, 0, 1.65),
      stackOnHall: pickFloorAt(stack, 0, 0, -7.35),
      stackOnUndercroft: pickFloorAt(stack, 0, 0, -16.35),
      stairBands: [1.65, 0.2, -0.4, -3.0, -7.35].map((eye) => pickFloorAt(stack, 0, 0, eye)),
      // The same test against the assembled rooms, under the pyramid: pavement at 0, the Hall
      // Napoléon at −9, the undercroft below that. If these three numbers are not 0 / −9 / −18 the
      // cross-zone graph is wrong, not the pyramid.
      assembledAtCourt: pickFloorAt(rooms, 0, 0, 1.65),
      assembledAtHall: pickFloorAt(rooms, 0, 0, -7.35),
      assembledAtUndercroft: pickFloorAt(rooms, 0, 0, -16.35),
      descent: [1.65, 0.2, -0.4, -3.0, -7.35, -9.5, -16.35].map((eye) => pickFloorAt(rooms, 0, 0, eye)),
    };
  },
  /**
   * Walk a route on foot, in geometry. The polyline runs room centre to room centre through every
   * doorway the graph says joins them, sampled every 20 cm; each sample must be standable and the
   * floor height at each is read through the same `floorAt` the walker uses. This is what proves
   * the doors between wings open and that the levels stack, without a camera or a keypress.
   */
  walk: (via: string[], step = 0.2) => {
    const byId = new Map(rooms.map((r) => [r.id, r]));
    const path: Array<[number, number]> = [];
    const roomsVisited: string[] = [];
    const centre = (room: RoomDef): [number, number] => [
      (room.bounds.min[0] + room.bounds.max[0]) / 2,
      (room.bounds.min[2] + room.bounds.max[2]) / 2,
    ];
    const first = byId.get(via[0] as string);
    if (!first) return { ok: false, reason: 'room missing: ' + via[0] };
    path.push(centre(first));
    roomsVisited.push(first.id);

    for (let i = 1; i < via.length; i++) {
      const from = via[i - 1] as string;
      const to = via[i] as string;
      const hops = findPath(byId, from, to);
      if (!hops) return { ok: false, reason: 'no path ' + from + ' -> ' + to, via };
      for (const hop of hops) {
        path.push([hop.portal.centre[0], hop.portal.centre[2]]);
        roomsVisited.push(hop.to);
      }
      const target = byId.get(to);
      if (target) path.push(centre(target));
    }

    // Walk with the walker's own rule: the eye stands on the highest floor at or below it, so
    // descending a stair hands over to the room below once the eye drops past the floor above.
    let eye = (first.bounds.min[1] as number) + 1.65;
    let samples = 0;
    let distance = 0;
    const blocked: Array<{ x: number; z: number; to: string }> = [];
    const profile: Array<{ at: number; floor: number }> = [];
    for (let i = 1; i < path.length; i++) {
      const [x0, z0] = path[i - 1] as [number, number];
      const [x1, z1] = path[i] as [number, number];
      const span = Math.hypot(x1 - x0, z1 - z0);
      distance += span;
      const n = Math.max(1, Math.ceil(span / step));
      for (let k = 0; k <= n; k++) {
        const x = x0 + ((x1 - x0) * k) / n;
        const z = z0 + ((z1 - z0) * k) / n;
        samples++;
        if (!controls.walkable(x, z)) blocked.push({ x: round(x), z: round(z), to: roomsVisited[i] ?? '?' });
        const floor = pickFloorAt(rooms, x, z, eye);
        eye = floor + 1.65;
        const previous = profile[profile.length - 1];
        if (!previous || Math.abs(previous.floor - floor) > 0.01) {
          profile.push({ at: Math.round(distance * 10) / 10, floor: Math.round(floor * 100) / 100 });
        }
      }
    }
    return {
      ok: blocked.length === 0,
      via,
      rooms: roomsVisited,
      distanceM: Math.round(distance * 10) / 10,
      samples,
      blockedCount: blocked.length,
      blocked: blocked.slice(0, 8),
      /** Floor height each time it changes along the walk: the levels stacking, printed. */
      profile,
      floorsSeen: [...new Set(profile.map((p) => p.floor))],
    };
  },
  setCamera: (p: [number, number, number], l: [number, number, number]) => {
    controls.setCamera(p, l);
    applyCellState();
    engine.renderNow();
  },
  tourProgress: (seconds: number) => controls.tourProgressAfter(seconds),
  /** Walk the route's doors on foot: every portal centre a visitor crosses must be standable. */
  doorWalk: () => {
    const byId = new Map(rooms.map((r) => [r.id, r]));
    const out: Array<Record<string, unknown>> = [];
    for (let i = 0; i < routeSpec.route.length; i++) {
      const step = routeSpec.route[i] as { n: number; room: string };
      const next = routeSpec.route[i + 1] as { room: string } | undefined;
      if (!byId.has(step.room)) {
        out.push({ step: step.n, room: step.room, ok: false, reason: 'room missing' });
        continue;
      }
      if (!next) {
        out.push({ step: step.n, room: step.room, ok: true, doors: 0 });
        continue;
      }
      const hops = findPath(byId, step.room, next.room);
      if (!hops) {
        out.push({ step: step.n, room: step.room, to: next.room, ok: false, reason: 'no path through the room graph' });
        continue;
      }
      const closed = hops
        .map((hop) => {
          const walkable = controls.walkable(hop.portal.centre[0], hop.portal.centre[2], 0.05);
          return walkable ? null : { to: hop.to, door: [round(hop.portal.centre[0]), round(hop.portal.centre[2])] };
        })
        .filter((x): x is { to: string; door: number[] } => x !== null);
      out.push({
        step: step.n,
        room: step.room,
        to: next.room,
        via: hops.length > 1 ? hops.map((h) => h.to) : undefined,
        doors: hops.length,
        ok: closed.length === 0,
        walkable: closed.length === 0,
        blocked: closed.length ? closed : undefined,
      });
    }
    return out;
  },
};
