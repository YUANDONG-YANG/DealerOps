import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // ✅ Add this line — critical for proper asset loading on Netlify
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
