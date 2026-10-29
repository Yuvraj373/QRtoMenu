import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'

// Use the backend's PORT from backend/.env so the proxy always points at it
const backendPort = (() => {
  try {
    return readFileSync(new URL('../backend/.env', import.meta.url), 'utf8').match(/^PORT=(\d+)/m)?.[1]
  } catch {
    return undefined
  }
})() || 5000

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // host: true lets phones on the same Wi-Fi open the menu via your LAN IP
    host: true,
    proxy: {
      // API_URL overrides the auto-detected backend address
      '/api': process.env.API_URL || `http://localhost:${backendPort}`,
    },
  },
})
