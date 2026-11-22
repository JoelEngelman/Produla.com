import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Pages is hosted under /Produla.com/, while Cloudflare Pages uses the domain root.
  // CF_PAGES is injected by Cloudflare during production builds, so always use '/' there.
  base: process.env.CF_PAGES ? '/' : (process.env.VITE_BASE_PATH || '/'),
  plugins: [react()],
  server: {
    proxy: {
      '/api/auth': {
        target: 'https://produla-auth.joeldavidengelman.workers.dev',
        changeOrigin: true,
        secure: true,
      },
      '/api/profile': {
        target: 'https://produla-auth.joeldavidengelman.workers.dev',
        changeOrigin: true,
        secure: true,
      },
      '/api/profiles': {
        target: 'https://produla-auth.joeldavidengelman.workers.dev',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
