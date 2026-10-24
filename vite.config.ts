import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // efekty potřebuje jen vizualizátor – necháme je v jeho vlastním (líně načítaném) balíčku
          if (/node_modules\/(@react-three\/postprocessing|postprocessing|n8ao)\//.test(id)) return undefined
          if (id.includes('node_modules/three/')) return 'three'
          if (id.includes('@react-three')) return 'r3f'
          if (id.includes('framer-motion')) return 'motion'
        },
      },
    },
  },
})
