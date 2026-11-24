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

const zone = String(flag('zone', 'example'));
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
      let artworks = null;
      try {
        artworks = JSON.parse(await readFile(join(root, 'artworks.json'), 'utf8'));
      } catch {
        artworks = null;
      }
      return { root, route, artworks };
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
      ' texMB=' + stats.textureMB + '  mean=' + pixels.mean + ' std=' + pixels.std +
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

  const queryBase = 'zone=' + encodeURIComponent(zone) + (extraQuery ? '&' + extraQuery : '');

  if (captureAll) {
    const spawns = await (async () => {
      await page.goto(base + '/?' + queryBase, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction('window.__ready === true', { timeout: 60000 });
      return page.evaluate(() => window.__test.spawns);
    })();
    if (spawns.length === 0) console.warn('zone "' + zone + '" declared no spawn points');
    for (const id of spawns) {
      await shoot(queryBase + '&spawn=' + encodeURIComponent(id), zone + '-' + id);
    }
  } else if (spawnFlags.length > 0) {
    for (const id of spawnFlags) {
      await shoot(queryBase + '&spawn=' + encodeURIComponent(id), zone + '-' + id);
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
  if (collision.noRooms) {
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
  if (scene.instances && scene.instances.outsideRooms > 0) {
    failures.push({
      check: 'instances',
      value: scene.instances,
      message: scene.instances.outsideRooms + ' of ' + scene.instances.count +
        ' instances sit outside every room box; a merged InstancedMesh probably lost its group transform',
    });
  }
  let structureReport = { checked: false, reason: 'not requested', specRoot: null };
  if (verify) {
    structureReport = await verifyStructure(scene);
  }

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

  /** Structural asserts against the measured spec. */
  async function verifyStructure(scene) {
    const specZone = SPEC_ZONE[zone];
    if (!specZone) {
      return { checked: false, reason: 'zone "' + zone + '" has no spec counterpart (proof gallery)' };
    }
    const spec = await findSpec();
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

    const specMin = [Infinity, Infinity, Infinity];
    const specMax = [-Infinity, -Infinity, -Infinity];
    for (const r of rooms) {
      specMin[0] = Math.min(specMin[0], r.footprint.x[0]);
      specMin[2] = Math.min(specMin[2], r.footprint.z[0]);
      specMax[0] = Math.max(specMax[0], r.footprint.x[1]);
      specMax[2] = Math.max(specMax[2], r.footprint.z[1]);
      specMin[1] = Math.min(specMin[1], r.floorY);
      specMax[1] = Math.max(specMax[1], r.floorY + r.clearHeight_m);
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
          expected: { min: specMin, max: specMax }, tolerance: bboxTolerance,
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
