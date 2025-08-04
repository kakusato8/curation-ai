import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: 'frontend',
  build: {
    outDir: '../dist-frontend'
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: true
  },
  envDir: '.'  // Use .env files from frontend directory
})