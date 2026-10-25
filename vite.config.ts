import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src/trainspotting', import.meta.url)),
      ControlKit: fileURLToPath(new URL('./src/shery-controlkit-shim.ts', import.meta.url)),
      THREE: fileURLToPath(new URL('./node_modules/three/build/three.module.js', import.meta.url)),
    },
  },
})
