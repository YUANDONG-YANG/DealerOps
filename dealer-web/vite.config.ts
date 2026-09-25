import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig({
  plugins: [vue()],
  server: { port: 5173, strictPort: true },
  // Cloudflare quick-tunnel hostnames change every start. Preview must accept them.
  preview: { allowedHosts: true },
})
