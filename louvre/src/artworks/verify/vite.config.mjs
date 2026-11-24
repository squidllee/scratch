/**
 * Build config for the artworks verification gallery.
 *
 * Plain .mjs so the app's TypeScript project does not need Node types. Kept inside the artwork
 * library's folder so the main app's Vite config is untouched:
 *
 *   npx vite build --config src/artworks/verify/vite.config.mjs
 *   python3 -m http.server 4611 --directory /tmp/louvre-artworks-gallery
 *   npm run capture -- --url http://127.0.0.1:4611 --zone artworks --verify --all --out captures/artworks
 */
import { defineConfig } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.GALLERY_OUT ?? '/tmp/louvre-artworks-gallery';

export default defineConfig({
  root: here,
  base: './',
  build: {
    target: 'es2022',
    outDir,
    emptyOutDir: true,
    sourcemap: false,
  },
});
