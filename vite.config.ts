import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves a project site from /<repo>/, not the domain root —
  // only applied in CI (see .github/workflows/deploy.yml) so local dev and
  // `vite preview` keep serving from / as usual.
  base: process.env.GITHUB_PAGES ? '/Yaadify/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
  },
  build: {
    // Phaser alone is ~1MB minified; a single chunk is fine for a game bundle.
    chunkSizeWarningLimit: 2000,
  },
})
