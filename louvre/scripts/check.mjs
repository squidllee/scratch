#!/usr/bin/env node
/**
 * Cheap structural guard for the rules that are easy to break silently.
 *
 *  - no Math.random in src/ (all variation must come from core/rng so scenes are reproducible)
 *  - no network URLs in src/ (no runtime network, no CDN assets)
 *  - no image/font/model files imported (every texture is generated in code)
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const SRC = new URL('../src/', import.meta.url).pathname;
const EXT = new Set(['.ts', '.js', '.mjs', '.glsl']);

const problems = [];

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }
    if (!EXT.has(extname(entry.name))) continue;
    const text = await readFile(path, 'utf8');
    const code = text
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/, ''))
      .join('\n');
    if (/\bMath\.random\s*\(/.test(code)) problems.push(path + ': uses Math.random (use core/rng)');
    if (/https?:\/\/[^'"\s]+/.test(code) && !/'(https?:\/\/')\.test/.test(code)) {
      problems.push(path + ': contains an http(s) URL (no runtime network)');
    }
    if (/\.(png|jpg|jpeg|webp|ktx2?|hdr|glb|gltf|woff2?)['"]/.test(code)) {
      problems.push(path + ': references an asset file (textures and meshes must be procedural)');
    }
  }
}

await walk(SRC);

if (problems.length) {
  console.error('check failed:');
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log('check ok: no Math.random, no network URLs, no asset files in src/');
