import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // All /api HTTP calls → FastAPI on 8000
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // WebSocket proxy for camera stream
      '/api/camera/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})