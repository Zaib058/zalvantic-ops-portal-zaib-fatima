import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    // send /api calls to the express server
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})