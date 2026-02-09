import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'p5-chunk': ['p5'],
          'colyseus-chunk': ['@colyseus/sdk'],
        }
      }
    }
  }
})
