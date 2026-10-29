import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { pwaBuild } from './pwa-build'
const proxy = {
  '/api': { target: process.env.API_PROXY_TARGET || 'http://127.0.0.1:8000', changeOrigin: true },
}
export default defineConfig({
  plugins: [vue(), pwaBuild()],
  server: { port: 5173, proxy },
  preview: { port: 4173, proxy },
})
