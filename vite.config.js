import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
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
