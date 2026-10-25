import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import glsl from 'vite-plugin-glsl'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), glsl({ include: ['node_modules/sheryjs/**/*.glsl'] })],
  resolve: {
    alias: {
      '@': '/src/trainspotting',
    },
  },
})
