import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    __WEB_BUILT_AT__: JSON.stringify(
      new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    ),
  },
  server: { port: 5174, strictPort: true },
})
