import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// BASE defaults to '/' (Netlify / standalone hosts).
// Set DEPLOY_TARGET=ghpages to rebuild for the old /fitBridge/ GitHub Pages path.
const isGhPages = process.env.DEPLOY_TARGET === 'ghpages';

// Bake the build time into the bundle so the production console can show
// "the live JS was built at <time>" — the fastest way to confirm whether
// Netlify served a fresh build vs a stale cache.
const BUILD_TIME = new Date().toISOString();

export default defineConfig({
  plugins: [react()],
  base: isGhPages ? '/fitBridge/' : '/',
  build: {
    outDir: isGhPages ? '../docs' : 'dist',
    emptyOutDir: true,
  },
  define: {
    __FB_BUILD_TIME__: JSON.stringify(BUILD_TIME),
  },
});
