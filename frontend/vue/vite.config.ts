import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig({
  plugins: [vue()],
  // Web release time when VITE_PUBLISHED_AT is not stamped: the build (or dev server start), UTC.
  define: { __WEB_BUILT_AT__: JSON.stringify(new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')) },
  server: { port: 5173, strictPort: true },
})
