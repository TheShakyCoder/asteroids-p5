import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const port = 5173
const origin = `${process.env.DDEV_PRIMARY_URL}:${port}`

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: '../public',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'p5-chunk': ['p5'],
          'colyseus-chunk': ['@colyseus/sdk'],
        }
      }
    }
  },
  server: {
    cors: {
      origin: [
        `${process.env.DDEV_PRIMARY_URL}`
      ]
    },
    // respond to all network requests:
    host: "0.0.0.0",
    port: port,
    strictPort: true,
    // Defines the origin of the generated asset URLs during development
    origin: origin,
  },
})
