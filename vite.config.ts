import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src/trainspotting',
      ControlKit: '/src/shery-controlkit-shim.ts',
      THREE: '/node_modules/three/build/three.module.js',
    },
  },
})
