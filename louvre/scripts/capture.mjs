#!/usr/bin/env node
/**
 * Headless capture harness — the eyes of this crew.
 *
 * No agent in this project can look at an image, so a capture is not evidence unless the harness
 * checks it. `--verify` adds two layers of proof on top of the PNG:
 *
 *   1. Pixel statistics read back from the WebGL framebuffer: a near-uniform frame (blank canvas,
 *      failed build, camera inside a wall) fails on standard deviation and unique-colour count.
 *   2. Structural asserts against the measured spec: every room `route.json` assigns to this zone
 *      exists in the zone, the zone's bounds sit inside its spec box, and every artwork assigned to
 *      those rooms is present in the scene graph.
 *
 * Usage:
 *   npm run capture -- --zone denon --all --out captures/
 *   npm run capture -- --zone denon --verify --all
 *   npm run capture -- --zone denon --verify --spawn grande-galerie-west --tour 30
 *
 * The tour check is coverage, not completion: the head must reach 95% of the spline's arc length
 * within the seconds you give it, so one cap works for a 60 m hall and a 288 m gallery.
 *   npm run capture -- --zone denon --camera 3,1.8,-8 --look 0,2,0
 *
 * Frame rate under SwiftShader is meaningless. Quote draw calls, triangles and texture MB.
 */
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const args = process.argv.slice(2);
const flag = (name, fallback = undefined) => {
  const i = args.indexOf('--' + name);
  if (i === -1) return fallback;
  const v = args[i + 1];
  if (!v || v.startsWith('--')) return true;
  return v;
};
const all = (name) => {
  const out = [];
  args.forEach((a, i) => {
    if (a === '--' + name && args[i + 1] && !args[i + 1].startsWith('--')) out.push(args[i + 1]);
  });
  return out;
};

const zoneArg = flag('zone');
const zonesFlag = flag('zones');
/**
 * `--zone museum` (or `--zones denon,sully`) loads the assembled scene: every wing in one room
 * graph. A single `--zone` keeps the per-zone numbers honest and is what the zone threads used.
 */
const museum = zoneArg === 'museum' || zoneArg === 'all' || typeof zonesFlag === 'string';
const zone = museum ? 'museum' : String(zoneArg ?? 'museum');
const zoneList = typeof zonesFlag === 'string' ? String(zonesFlag) : null;
const outDir = resolve(String(flag('out', 'captures')));
const width = Number(flag('width', 1280));
const height = Number(flag('height', 720));
const port = Number(flag('port', 4599));
const explicitUrl = flag('url');
const camera = flag('camera');
const look = flag('look', '0,2,0');
const spawnFlags = all('spawn');
const captureAll = Boolean(flag('all', false));
const tourSeconds = Number(flag('tour', 0));
const label = flag('name');
const extraQuery = flag('query', '');
const verify = Boolean(flag('verify', false));
const runProbe = Boolean(flag('probe', false));
const expectMaterial = flag('expect-material');
const useEnv = Boolean(flag('env', false));
const bboxTolerance = Number(flag('bbox-tolerance', 3));

/** Pixel verdict floors. Calibrated on the proof gallery: mean 78-85, std 38-42, ~25k colours. */
const PIXEL_FLOOR = { std: 10, uniqueColours: 2000 };

/** Spec zone taxonomy -> registry zone id. */
const SPEC_ZONE = {
  denon: 'denon-interior',
  sully: 'sully-interior',
  richelieu: 'richelieu-interior',
  pyramid: 'pyramid-courtyard',
  exterior: 'exterior-wings',
};

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/usr/local/bin/chromium',
  '/usr/local/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

function serveDist(root, listenPort) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      let path = decodeURIComponent(url.pathname);
      if (path.endsWith('/')) path += 'index.html';
      const file = join(root, path);
      if (!file.startsWith(root)) {
        res.writeHead(403).end('forbidden');
        return;
      }
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((resolvePromise, reject) => {
    server.on('error', reject);
    server.listen(listenPort, '127.0.0.1', () => resolvePromise(server));
  });
}

/** Locate the measured spec: explicit --spec, the merged docs/spec, or the captain drive copy. */
async function findSpec() {
  const explicit = flag('spec');
  const candidates = [
    typeof explicit === 'string' ? explicit : null,
    'docs/spec',
    '/home/user/.capy/drive/captain-maomao/handoffs/louvre/spec',
  ].filter(Boolean);
  for (const dir of candidates) {
    const root = resolve(String(dir));
    try {
      const route = JSON.parse(await readFile(join(root, 'route.json'), 'utf8'));
      let coordinates = null;
      try {
        coordinates = await readFile(join(root, 'coordinates.md'), 'utf8');
      } catch {
        coordinates = null;
      }
      let artworks = null;
      try {
        artworks = JSON.parse(await readFile(join(root, 'artworks.json'), 'utf8'));
      } catch {
        artworks = null;
      }
      return { root, route, artworks, coordinates };
    } catch {
      continue;
    }
  }
  return null;
}

async function main() {
  const dist = resolve('dist');
  if (!existsSync(join(dist, 'index.html'))) {
    console.error('No dist/index.html. Run "npm run build" first.');
    process.exit(1);
  }
  const server = explicitUrl ? null : await serveDist(dist, port);
  const base = explicitUrl ? String(explicitUrl) : 'http://127.0.0.1:' + port;
  await mkdir(outDir, { recursive: true });

  const executablePath = CHROME_CANDIDATES.find((p) => p && existsSync(p));
  if (!executablePath) {
    console.error('No Chromium found. Set CHROME_PATH.');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--enable-unsafe-swiftshader',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--hide-scrollbars',
    ],
    defaultViewport: { width, height, deviceScaleFactor: 1 },
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));

  const failures = [];
  const shots = [];
  let probeReport = [];
  const shoot = async (query, name) => {
    const url = base + '/?' + query;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction('window.__ready === true', { timeout: 60000 });
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))),
    );
    const stats = await page.evaluate(() => window.__stats());
    const pixels = await page.evaluate(() => window.__test.pixelStats());
    const file = join(outDir, name + '.png');
    await page.screenshot({ path: file, type: 'png' });
    shots.push({ file, stats, pixels });
    console.log(
      'captured ' + file + '  draws=' + stats.drawCalls + ' tris=' + stats.triangles +
      ' texMB=' + stats.textureMB + '  mean=' + pixels.mean + ' centre=' + pixels.centreMean + ' std=' + pixels.std +
      ' colours=' + pixels.uniqueColours,
    );
    if (pixels.std < PIXEL_FLOOR.std) {
      failures.push({ shot: name, check: 'pixel-std', value: pixels.std, floor: PIXEL_FLOOR.std,
        message: 'frame is nearly uniform; nothing was rendered, or the camera is inside geometry' });
    }
    if (pixels.uniqueColours < PIXEL_FLOOR.uniqueColours) {
      failures.push({ shot: name, check: 'pixel-colours', value: pixels.uniqueColours, floor: PIXEL_FLOOR.uniqueColours,
        message: 'frame has almost no colour variety; the scene is blank or flat-lit' });
    }
    return stats;
  };

  const queryBase =
    (museum
      ? 'zones=' + encodeURIComponent(zoneList ?? 'pyramid,exterior,denon,sully,richelieu')
      : 'zones=' + encodeURIComponent(zone)) +
    (useEnv ? '&env=1' : '') + (extraQuery ? '&' + extraQuery : '');

  if (captureAll) {
    const spawns = await (async () => {
      await page.goto(base + '/?' + queryBase, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction('window.__ready === true', { timeout: 60000 });
      return page.evaluate(() => window.__test.spawns);
    })();
    if (spawns.length === 0) console.warn('zone "' + zone + '" declared no spawn points');
    for (const id of spawns) {
      await shoot(queryBase + '&spawn=' + encodeURIComponent(id), zone + '-' + String(id).replace(/[^a-z0-9-]+/gi, '-'));
    }
  } else if (spawnFlags.length > 0) {
    for (const id of spawnFlags) {
      await shoot(queryBase + '&spawn=' + encodeURIComponent(id), zone + '-' + String(id).replace(/[^a-z0-9-]+/gi, '-'));
    }
  } else if (camera) {
    const q = queryBase + '&camera=' + encodeURIComponent(String(camera)) + '&look=' + encodeURIComponent(String(look));
    await shoot(q, label ? String(label) : zone + '-custom');
  } else {
    await shoot(queryBase, label ? String(label) : zone);
  }

  if (tourSeconds > 0) {
    const probe = await page.evaluate((s) => window.__test.tourProgress(s), tourSeconds);
    console.log('tour after ' + tourSeconds + 's: ' + JSON.stringify(probe));
    // The time budget differs per route (60 m hall vs 288 m gallery), so the check is coverage:
    // the head must reach 95% of the arc length inside the cap the caller gave it.
    const TOUR_COVERAGE = 0.95;
    if (probe.u < TOUR_COVERAGE) {
      failures.push({
        check: 'tour',
        message: 'tour reached only ' + Math.round(probe.u * 100) + '% of the path in ' + tourSeconds + 's (needs 95%)',
        value: probe.u,
        floor: TOUR_COVERAGE,
      });
    }
  }

  const collision = await page.evaluate(() => window.__test.collision());
  console.log('collision probes: ' + JSON.stringify(collision));
  if (museum) {
    const mustWalk = ['hallNapoleon', 'grandeGalerie', 'courMarly', 'pyramidInterior'];
    const mustNot = ['beyondColonnade', 'offTheCarrousel', 'northOfRivoli', 'insideTheOuterWall'];
    for (const key of mustWalk) {
      if (collision[key] !== true) failures.push({ check: 'collision', value: collision[key], message: 'expected true at ' + key + ' — the walker cannot cross the palace' });
    }
    for (const key of mustNot) {
      if (collision[key] !== false) failures.push({ check: 'collision', value: collision[key], message: 'expected false at ' + key + ' — the walker left the building' });
    }
  } else if (collision.noRooms) {
    failures.push({ check: 'collision', message: 'zone declared no rooms' });
  } else {
    for (const [name, ok] of Object.entries(collision)) {
      const shouldPass = name === 'roomCentre';
      if (ok !== shouldPass) {
        failures.push({ check: 'collision', shot: name, value: ok, message: 'expected ' + shouldPass + ' at ' + name });
      }
    }
  }

  // Floor plumbing: a room's floorAt function must win over its bounds, and a flat room must
  // report its own level. This is what makes stairs walkable without a zone moving the camera.
  const floorProbe = await page.evaluate(() => window.__test.floorProbe());
  console.log('floor probe: ' + JSON.stringify(floorProbe));
  if (Math.abs(floorProbe.rampAtStart) > 1e-6 || Math.abs(floorProbe.rampAtEnd - 3) > 1e-6 || Math.abs(floorProbe.flat - 3) > 1e-6) {
    failures.push({ check: 'floor', value: floorProbe, message: 'room floorAt() is not what the walker reads' });
  }
  // Rooms stacked over one point (courtyard over hall over undercroft): the walker must stand on the
  // floor it is on, not the first room that matches.
  if (Math.abs(floorProbe.stackOnCourtyard) > 1e-6 || Math.abs(floorProbe.stackOnHall + 9) > 1e-6 || Math.abs(floorProbe.stackOnUndercroft + 18) > 1e-6) {
    failures.push({ check: 'floor-stack', value: floorProbe, message: 'stacked rooms resolve to the wrong floor; the undercroft is unreachable' });
  }
  const expectedBands = [0, 0, -9, -9, -9];
  if (JSON.stringify(floorProbe.stairBands) !== JSON.stringify(expectedBands)) {
    failures.push({ check: 'floor-stack', value: floorProbe.stairBands, expected: expectedBands,
      message: 'descending eye heights do not hand over to the room below' });
  }

  if (runProbe || verify) {
    const probeDistance = Number(flag('probe-distance', 150));
    const hits = await page.evaluate((d) => window.__test.probe(d), probeDistance);
    for (const h of hits) {
      console.log('probe ' + h.spawn + ': ' + (h.object ?? 'NOTHING within ' + probeDistance + ' m') +
        (h.material ? ' / ' + h.material : '') + (h.distance !== null ? ' @ ' + h.distance + ' m' : ''));
      if (h.object === null) {
        failures.push({ check: 'probe', shot: h.spawn, message: 'sight line from this spawn hits nothing within ' + probeDistance + ' m; the camera looks into empty space' });
      } else if (typeof expectMaterial === 'string' && h.material !== expectMaterial) {
        failures.push({ check: 'probe', shot: h.spawn, value: h.material, expected: expectMaterial,
          message: 'expected the sight line to land on "' + expectMaterial + '"' });
      }
    }
    probeReport = hits;
  }

  const atmosphere = await page.evaluate(() => window.__test.atmosphere());
  console.log('atmosphere: ' + JSON.stringify(atmosphere));
  if (atmosphere.declaredByZone && (!atmosphere.background || atmosphere.fog === null)) {
    failures.push({ check: 'atmosphere', value: atmosphere, message: 'zone declared an atmosphere but the scene has no background/fog applied' });
  }

  const scene = await page.evaluate(() => window.__test.structure());
  let structureReport = { checked: false, reason: 'not requested', specRoot: null };
  if (verify) {
    structureReport = await verifyStructure(scene, page);
  }
  const instanceCheck = checkInstances(scene, structureReport);

  const finalStats = shots[0]?.stats ?? (await page.evaluate(() => window.__stats()));
  console.log('stats: ' + JSON.stringify(finalStats));
  if (consoleErrors.length) console.log('console errors: ' + JSON.stringify(consoleErrors.slice(0, 10)));
  else console.log('console errors: none');
  if (consoleErrors.length) {
    failures.push({ check: 'console', message: consoleErrors.length + ' console error(s)', detail: consoleErrors.slice(0, 5) });
  }

  const report = {
    zone,
    verified: verify,
    shots: shots.map((s) => ({ file: s.file, stats: s.stats, pixels: s.pixels })),
    collision,
    atmosphere,
    probe: probeReport,
    structure: { rooms: scene.rooms, bounds: scene.bounds, artworkIds: scene.artworkIds, instances: scene.instances },
    instanceCheck,
    structureCheck: structureReport,
    failures,
    consoleErrors,
    verdict: failures.length === 0 ? 'pass' : 'fail',
  };
  await writeFile(join(outDir, 'capture-report.json'), JSON.stringify(report, null, 2));

  if (verify) {
    if (failures.length === 0) {
      console.log('verify: PASS' + (structureReport.checked ? ' (pixels + structure)' : ' (pixels only: ' + structureReport.reason + ')'));
    } else {
      console.error('verify: FAIL — ' + failures.length + ' problem(s)');
      for (const f of failures) console.error('  - [' + f.check + '] ' + (f.message ?? '') + (f.shot ? ' (' + f.shot + ')' : ''));
    }
  }

  await browser.close();
  if (server) await new Promise((r) => server.close(r));
  if (consoleErrors.length) process.exitCode = 2;
  if (failures.length) process.exitCode = 1;

  /**
   * Instances must sit where the zone says it is. The basis depends on the zone: a zone the spec
   * gives rooms to (an interior wing) is checked against those rooms; a zone the spec gives no
   * rooms to (the exterior wings, which declare pavements of their own) is checked against its own
   * rendered bounds. A merged InstancedMesh that lost its group transform fails either basis, and a
   * pile of instances at one coordinate fails the duplicate check. There is no skip flag.
   */
  function checkInstances(scene, structure) {
    const inst = scene.instances;
    if (!inst || inst.count === 0) {
      return { basis: 'none', count: 0, outside: 0, duplicates: 0 };
    }
    const basis = museum
      ? 'per-zone'
      : structure.checked && structure.roomsExpected > 0 ? 'rooms' : 'bounds';
    const outside = basis === 'bounds' ? inst.outsideBounds : inst.outsideRooms;
    const result = {
      basis,
      count: inst.count,
      outside,
      duplicates: inst.duplicatePositions ?? 0,
      perZone: inst.perZone ?? null,
    };
    if (outside > 0) {
      failures.push({
        check: 'instances',
        value: result,
        message: outside + ' of ' + inst.count + ' instances sit outside the zone\'s ' +
          (basis === 'rooms' ? 'room boxes' : 'own bounds') +
          '; a merged InstancedMesh probably lost its group transform',
      });
    }
    const duplicateBudget = Math.max(20, Math.round(inst.count * 0.05));
    if (result.duplicates > duplicateBudget) {
      failures.push({
        check: 'instances',
        value: result,
        message: result.duplicates + ' of ' + inst.count + ' instances share a position (' +
          duplicateBudget + ' allowed); transforms may have collapsed onto one point',
      });
    }
    console.log('instance check: ' + JSON.stringify(result));
    return result;
  }

  /**
   * The zone box from coordinates.md §3, which is the authority: the rooms are its contents, and a
   * room like the Cour Napoléon is open sky with no ceiling to derive a y-max from.
   */
  function parseZoneTable(markdown, specZone) {
    if (!markdown) return null;
    const box = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    let found = false;
    const num = (cell) => {
      const parts = String(cell).replace(/[*_`]/g, '').replace(/\u2212/g, '-').split('…');
      if (parts.length !== 2) return null;
      const lo = Number(parts[0].replace(/[^\d.+-]/g, ''));
      const hi = Number(parts[1].replace(/[^\d.+-]/g, ''));
      return Number.isFinite(lo) && Number.isFinite(hi) ? [lo, hi] : null;
    };
    let block = false;
    for (const line of markdown.split('\n')) {
      const isRow = line.trim().startsWith('|');
      // Only the first contiguous table that names the zone is authoritative; later tables are
      // wider (they reach the ridge at 28.7 m) and would make the check permissive.
      if (!isRow) {
        if (found) break;
        continue;
      }
      const cells = line.split('|').map((c) => c.trim());
      if (cells.length < 6) continue;
      if (!cells.some((c) => c.replace(/[`*]/g, '').startsWith(specZone))) {
        if (block) break;
        continue;
      }
      block = true;
      // Two tables name the zones with different column orders, so take the first three cells that
      // read as ranges in those units: x, then y, then z.
      const ranges = cells.map(num).filter(Boolean);
      if (ranges.length < 3) continue;
      const x = ranges[0];
      const y = ranges[1];
      const z = ranges[2];
      found = true;
      box.min = [Math.min(box.min[0], x[0]), Math.min(box.min[1], y[0]), Math.min(box.min[2], z[0])];
      box.max = [Math.max(box.max[0], x[1]), Math.max(box.max[1], y[1]), Math.max(box.max[2], z[1])];
    }
    return found ? box : null;
  }

  /**
   * The assembled museum is checked against the whole spec, not one zone's slice of it: every room
   * route.json names must exist in the union, every portal must land on a room some wing declares,
   * and the tour must be routable through the real doorways. Those are the three failures a
   * per-zone build cannot see.
   */
  async function verifyMuseum(scene, spec, page) {
    const routeRooms = spec.route.rooms ?? [];
    const declared = new Set(scene.rooms);
    const missingRooms = routeRooms.filter((r) => !declared.has(r.id)).map((r) => r.id);
    if (missingRooms.length) {
      failures.push({
        check: 'rooms', value: missingRooms.length, expected: routeRooms.length,
        message: routeRooms.length + ' rooms in route.json, ' + missingRooms.length + ' not assembled: ' + missingRooms.join(', '),
      });
    }

    const portals = scene.portals ?? {};
    if ((portals.unresolved ?? []).length) {
      failures.push({
        check: 'portals', value: portals.unresolved.length,
        message: 'portals opening onto a room no zone declares: ' +
          portals.unresolved.map((p) => p.from + '->' + p.to + ' (' + p.zone + ')').join(', '),
      });
    }
    if ((portals.oneWay ?? []).length) {
      failures.push({
        check: 'portals', value: portals.oneWay.length,
        message: 'portals with no reciprocal: ' + portals.oneWay.map((p) => p.from + '->' + p.to).join(', '),
      });
    }
    const specPortalCount = routeRooms.reduce((n, r) => n + (r.portals ?? []).length, 0);
    if ((portals.portals ?? 0) < specPortalCount) {
      failures.push({
        check: 'portals', value: portals.portals, expected: specPortalCount,
        message: 'the assembled graph has ' + portals.portals + ' portals; route.json declares ' + specPortalCount,
      });
    }

    const tour = scene.tour ?? {};
    if ((tour.unrouted ?? []).length) {
      failures.push({
        check: 'tour', value: tour.unrouted.length,
        message: 'route legs with no doorway between them: ' + tour.unrouted.map((l) => l.from + '->' + l.to).join(', '),
      });
    }
    if ((tour.unknownRooms ?? []).length) {
      failures.push({
        check: 'tour', value: tour.unknownRooms.length,
        message: 'route rooms no zone built: ' + tour.unknownRooms.join(', '),
      });
    }
    if ((scene.duplicateRooms ?? []).length || (scene.duplicateObjects ?? []).length) {
      failures.push({
        check: 'duplicates', value: (scene.duplicateRooms ?? []).length + (scene.duplicateObjects ?? []).length,
        message: 'rooms declared by two wings, so one copy is never culled: ' +
          [...(scene.duplicateRooms ?? []), ...(scene.duplicateObjects ?? [])].join('; '),
      });
    }

    const doors = await page.evaluate(() => window.__test.doorWalk());
    const blocked = doors.filter((d) => d.walkable === false || d.ok === false);
    if (blocked.length) {
      failures.push({
        check: 'doors', value: blocked.length,
        message: 'route doorways a visitor cannot stand in: ' +
          blocked.map((d) => '#' + d.step + ' ' + d.room + '->' + (d.to ?? '?') + ' (' + (d.reason ?? 'not walkable') + ')').join(', '),
      });
    }

    const expectedArtworks = (spec.artworks?.artworks ?? []).map((a) => a.id);
    const present = new Set(scene.artworkIds);
    const missingArtworks = expectedArtworks.filter((id) => !present.has(id));
    if (missingArtworks.length) {
      failures.push({
        check: 'artworks', value: missingArtworks.length, expected: expectedArtworks.length,
        message: 'artworks.json lists ' + expectedArtworks.length + ' works; not hung: ' + missingArtworks.join(', '),
      });
    }

    return {
      checked: true,
      specRoot: spec.root,
      scope: 'museum',
      wings: scene.zones,
      roomsExpected: routeRooms.length,
      roomsDeclared: scene.rooms.length,
      missingRooms,
      portals: { declared: portals.portals, spec: specPortalCount, crossZone: (portals.crossZone ?? []).length },
      tour: { waypoints: tour.waypoints, lengthM: tour.lengthM, unrouted: (tour.unrouted ?? []).length },
      doorsChecked: doors.length,
      doorsWalkable: doors.length - blocked.length,
      artworksExpected: expectedArtworks.length,
      artworksFound: expectedArtworks.length - missingArtworks.length,
      missingArtworks,
      library: scene.artworkLibrary,
    };
  }

  /** Structural asserts against the measured spec. */
  async function verifyStructure(scene, page) {
    const spec = await findSpec();
    if (museum) {
      if (!spec) return { checked: false, reason: 'no route.json found (pass --spec <dir>)' };
      return verifyMuseum(scene, spec, page);
    }
    const specZone = SPEC_ZONE[zone];
    if (!specZone) {
      return { checked: false, reason: 'zone "' + zone + '" has no spec counterpart' };
    }
    if (!spec) {
      return { checked: false, reason: 'no route.json found (pass --spec <dir> or merge louvre/docs/spec)' };
    }
    const rooms = (spec.route.rooms ?? []).filter((r) => r.zone === specZone);
    if (rooms.length === 0) {
      return { checked: false, reason: 'route.json lists no rooms for ' + specZone };
    }
    const declared = new Set(scene.rooms);
    const missingRooms = rooms.filter((r) => !declared.has(r.id)).map((r) => r.id);
    if (missingRooms.length) {
      failures.push({
        check: 'rooms', value: missingRooms.length, expected: rooms.length,
        message: 'route.json assigns ' + rooms.length + ' rooms to ' + specZone + '; missing: ' + missingRooms.join(', '),
      });
    }

    const tableBox = parseZoneTable(spec.coordinates, specZone);
    const boxBasis = tableBox ? 'coordinates.md zone table' : 'route.json room extents';
    const specMin = tableBox ? [...tableBox.min] : [Infinity, Infinity, Infinity];
    const specMax = tableBox ? [...tableBox.max] : [-Infinity, -Infinity, -Infinity];
    for (const r of rooms) {
      if (tableBox) break;
      specMin[0] = Math.min(specMin[0], r.footprint.x[0]);
      specMin[2] = Math.min(specMin[2], r.footprint.z[0]);
      specMax[0] = Math.max(specMax[0], r.footprint.x[1]);
      specMax[2] = Math.max(specMax[2], r.footprint.z[1]);
      specMin[1] = Math.min(specMin[1], r.floorY);
      const clear = typeof r.clearHeight_m === 'number' ? r.clearHeight_m : 0;
      specMax[1] = Math.max(specMax[1], r.floorY + clear);
    }
    let boundsOk = null;
    if (scene.bounds) {
      const b = scene.bounds;
      boundsOk =
        b.min[0] >= specMin[0] - bboxTolerance && b.max[0] <= specMax[0] + bboxTolerance &&
        b.min[1] >= specMin[1] - bboxTolerance && b.max[1] <= specMax[1] + bboxTolerance &&
        b.min[2] >= specMin[2] - bboxTolerance && b.max[2] <= specMax[2] + bboxTolerance;
      if (!boundsOk) {
        failures.push({
          check: 'bounds', value: b,
          expected: { min: specMin, max: specMax }, basis: boxBasis, tolerance: bboxTolerance,
          message: 'zone geometry leaves the box coordinates.md assigns to ' + specZone +
            ' (min ' + specMin.map((n) => Math.round(n)).join(',') + ' / max ' + specMax.map((n) => Math.round(n)).join(',') + ')',
        });
      }
    }

    const roomIds = new Set(rooms.map((r) => r.id));
    const expectedArtworks = (spec.artworks?.artworks ?? []).filter((a) => roomIds.has(a.room));
    const present = new Set(scene.artworkIds);
    const missingArtworks = expectedArtworks.filter((a) => !present.has(a.id)).map((a) => a.id);
    if (missingArtworks.length) {
      failures.push({
        check: 'artworks', value: missingArtworks.length, expected: expectedArtworks.length,
        message: 'artworks.json gives this zone ' + expectedArtworks.length + ' works; not in the scene: ' + missingArtworks.join(', '),
      });
    }

    return {
      checked: true,
      specRoot: spec.root,
      specZone,
      boxBasis,
      roomsExpected: rooms.length,
      roomsDeclared: scene.rooms.length,
      missingRooms,
      boundsOk,
      artworksExpected: expectedArtworks.length,
      artworksFound: expectedArtworks.length - missingArtworks.length,
      missingArtworks,
    };
  }
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
