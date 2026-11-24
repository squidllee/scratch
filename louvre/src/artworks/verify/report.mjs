#!/usr/bin/env node
/**
 * Artwork report: drives the verification gallery and writes the per-work numbers.
 *
 * The crew's capture harness judges the frame (pixels, collision, console). This script judges the
 * library itself: every id in the spec present in the scene, every object the size the centimetres
 * say, and the texture bill. It talks to the page's `window.__test.artworkReport()`, so the numbers
 * come from the built scene, not from the source.
 *
 *   node src/artworks/verify/report.mjs --url <served origin> --out captures/artworks
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf('--' + name);
  if (i === -1) return fallback;
  const v = args[i + 1];
  return !v || v.startsWith('--') ? true : v;
};

const url = flag('url', null);
const outDir = resolve(String(flag('out', 'captures/artworks')));
const specDir = resolve(String(flag('spec', '/home/user/.capy/drive/captain-maomao/handoffs/louvre/spec')));

if (!url || url === true) {
  console.error('pass --url <the served gallery build>, e.g. --url $(...)/ after vite build');
  process.exit(2);
}

const CHROME = [
  process.env.CHROME_PATH,
  '/usr/local/bin/chromium',
  '/usr/local/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
].find((p) => p && existsSync(p));

if (!CHROME) {
  console.error('no chromium found');
  process.exit(1);
}

async function spec() {
  try {
    const raw = JSON.parse(await readFile(join(specDir, 'artworks.json'), 'utf8'));
    return raw.artworks ?? null;
  } catch {
    return null;
  }
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--hide-scrollbars',
  ],
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto(url + '/?zone=artworks', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForFunction('window.__ready === true', { timeout: 120000 });
await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))));

const report = await page.evaluate(() => window.__test.artworkReport());
const textures = await page.evaluate(() => window.__test.textures());
const inventory = await page.evaluate(() => window.__test.inventory());
const stats = await page.evaluate(() => window.__stats());
const pixels = await page.evaluate(() => window.__test.pixelStats());
const canvases = await page.evaluate(() => window.__test.canvasStats());
await browser.close();

const specWorks = await spec();
const specById = new Map((specWorks ?? []).map((w) => [w.id, w]));

const failures = [];
const rows = [];
let totalBytes = 0;
for (const art of report) {
  const s = specById.get(art.id);
  const invariants = [];
  if (!s) {
    invariants.push('missing-from-spec');
  } else {
    const cm = [s.dims_cm.width, s.dims_cm.height, s.dims_cm.depth ?? null];
    const bbox = art.bboxM.map((v) => v * 100);
    if (s.type === 'painting' || s.type === 'ceiling-painting') {
      // the painted surface is the spec size; the object is bigger by twice the moulding
      const border = art.specCm[2] / 2;
      const innerW = bbox[0] - border * 2;
      const innerH = bbox[1] - border * 2;
      const okW = Math.abs(innerW - cm[0]) < 3;
      const okH = Math.abs(innerH - cm[1]) < 3;
      if (!okW || !okH) invariants.push('canvas ' + innerW.toFixed(0) + 'x' + innerH.toFixed(0) + ' != ' + cm[0] + 'x' + cm[1]);
    } else if (s.id === 'crown-of-louis-xv') {
      // the case is part of the object; the crown inside is the 24 cm work
      if (math_out(bbox[1], 50, 6)) invariants.push('case height ' + bbox[1].toFixed(1) + 'cm');
    } else if (s.id === 'caryatids-goujon') {
      if (math_out(bbox[1], 320, 60)) invariants.push('group height ' + bbox[1].toFixed(0) + 'cm');
    } else {
      if (math_out(bbox[1], cm[1], Math.max(6, cm[1] * 0.03))) invariants.push('height ' + bbox[1].toFixed(1) + ' != ' + cm[1]);
    }
  }
  const minTris = art.kind === 'painting' || art.kind === 'ceiling-painting' || art.kind === 'stele' ? 40 : 500;
  if (art.kind !== 'painting' && art.kind !== 'ceiling-painting' && Math.abs(art.floorGap) > 0.02) {
    invariants.push('base ' + (art.floorGap * 100).toFixed(1) + ' cm off its placement point');
  }
  if (art.triangles < minTris) invariants.push('only ' + Math.round(art.triangles) + ' tris (floor ' + minTris + ')');
  if (invariants.length) failures.push({ id: art.id, invariants });
  rows.push({
    id: art.id,
    kind: art.kind,
    bboxCm: art.bboxM.map((v) => Math.round(v * 100)),
    triangles: Math.round(art.triangles),
    meshes: art.meshes,
    invariants: invariants.join('; '),
  });
}
for (const t of textures) totalBytes += t.bytes;

function math_out(a, b, tol) {
  return Math.abs(a - b) > tol;
}

const missingFromScene = (specWorks ?? []).filter((w) => !report.some((r) => r.id === w.id)).map((w) => w.id);

await mkdir(outDir, { recursive: true });
// Every painted canvas must look like a painting: real spread of value and real colour variety.
const artworkCanvases = canvases.filter((c) => String(c.name).startsWith('artwork/'));
const blankCanvases = artworkCanvases.filter((c) =>
  String(c.name).includes('/face') ? c.std < 15 || c.colours < 40 : c.std < 12 || c.colours < 240,
);

const out = {
  url,
  stats,
  pixels,
  canvases,
  blankCanvases: blankCanvases.map((c) => c.name),
  artworks: rows,
  textures: { count: textures.length, bytes: totalBytes, mb: Math.round((totalBytes / 1048576) * 100) / 100, rows: textures },
  inventory,
  specWorks: specWorks ? specWorks.length : null,
  missingFromScene,
  failures,
  consoleErrors: errors,
};
await writeFile(join(outDir, 'artwork-report.json'), JSON.stringify(out, null, 2));

console.log('id'.padEnd(24) + 'kind'.padEnd(22) + 'bbox cm'.padEnd(22) + 'tris'.padStart(7) + '  notes');
for (const r of rows) {
  console.log(
    r.id.padEnd(24) + r.kind.padEnd(22) + (r.bboxCm.join(' x ')).padEnd(22) + String(r.triangles).padStart(7) + '  ' + r.invariants,
  );
}
console.log('');
console.log('works in scene: ' + report.length + (specWorks ? ' / ' + specWorks.length + ' in spec' : ''));
if (missingFromScene.length) console.log('missing from scene: ' + missingFromScene.join(', '));
console.log('texture bill: ' + out.textures.mb + ' MB across ' + out.textures.count + ' canvases');
for (const c of artworkCanvases) {
  const r = c.regions ?? {};
  console.log(
    '  ' + String(c.name).replace('artwork/', '').padEnd(26) + String(c.w + 'x' + c.h).padEnd(10) +
    'std ' + String(c.std).padStart(5) + '  top ' + r.top + ' centre ' + r.centre + ' left ' + r.left + ' right ' + r.right + ' bottom ' + r.bottom,
  );
}
if (blankCanvases.length) {
  for (const c of blankCanvases) failures.push({ id: c.name, invariants: ['flat canvas: std ' + c.std + ', colours ' + c.colours] });
}
console.log('draw calls ' + stats.drawCalls + ' · triangles ' + stats.triangles + ' · std ' + pixels.std + ' · colours ' + pixels.uniqueColours);
console.log('console errors: ' + (errors.length ? JSON.stringify(errors.slice(0, 5)) : 'none'));
if (failures.length) {
  console.error('report: FAIL — ' + failures.length + ' work(s) out of spec');
  for (const f of failures) console.error('  - ' + f.id + ': ' + f.invariants.join('; '));
  process.exitCode = 1;
} else {
  console.log('report: PASS');
}
