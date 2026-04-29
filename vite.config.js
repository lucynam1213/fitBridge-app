import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// BASE defaults to '/' (Netlify / standalone hosts).
// Set DEPLOY_TARGET=ghpages to rebuild for the old /fitBridge/ GitHub Pages path.
const isGhPages = process.env.DEPLOY_TARGET === 'ghpages';

export default defineConfig({
  plugins: [react()],
  base: isGhPages ? '/fitBridge/' : '/',
  build: {
    outDir: isGhPages ? '../docs' : 'dist',
    emptyOutDir: true,
  },
});
