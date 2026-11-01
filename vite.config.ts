import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/lucide-react/')) return 'icons'
          if (id.includes('/node_modules/three/')) return 'three'
          if (/\/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\//.test(id)) return 'react-vendor'
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
})
