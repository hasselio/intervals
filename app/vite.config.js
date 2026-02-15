import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/intervals/' : '/',
  appType: 'spa',
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
})
