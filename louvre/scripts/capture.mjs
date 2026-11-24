#!/usr/bin/env node
/**
 * Headless capture harness.
 *
 * Every zone thread proves its work with this, so it has to work from a cold checkout:
 *
 *   npm run build
 *   npm run capture -- --zone denon --spawn grande-galerie-west --out captures/
 *   npm run capture -- --zone denon --all --out captures/
 *   npm run capture -- --zone denon --camera 3,1.8,-8 --look 0,2,0
 *
 * It serves ./dist locally (or uses --url), drives Chromium through SwiftShader, waits for
 * window.__ready, writes PNGs, and prints window.__stats() as JSON.
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

  const shots = [];
  const shoot = async (query, name) => {
    const url = base + '/?' + query;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction('window.__ready === true', { timeout: 60000 });
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))),
    );
    const stats = await page.evaluate(() => window.__stats());
    const file = join(outDir, name + '.png');
    await page.screenshot({ path: file, type: 'png' });
    shots.push({ file, stats });
    console.log('captured ' + file + '  draws=' + stats.drawCalls + ' tris=' + stats.triangles + ' texMB=' + stats.textureMB);
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
  }

  const collision = await page.evaluate(() => window.__test.collision());
  console.log('collision probes: ' + JSON.stringify(collision));

  const finalStats = shots[0]?.stats ?? (await page.evaluate(() => window.__stats()));
  console.log('stats: ' + JSON.stringify(finalStats));
  if (consoleErrors.length) {
    console.log('console errors: ' + JSON.stringify(consoleErrors.slice(0, 10)));
  } else {
    console.log('console errors: none');
  }
  await writeFile(
    join(outDir, 'capture-report.json'),
    JSON.stringify({ zone, shots: shots.map((s) => ({ file: s.file, stats: s.stats })), collision, consoleErrors }, null, 2),
  );

  await browser.close();
  if (server) await new Promise((r) => server.close(r));
  if (consoleErrors.length) process.exitCode = 2;
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
