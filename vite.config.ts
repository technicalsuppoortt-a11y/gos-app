import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('pagefly/templates/')) {
            const name = id.split('/').pop()?.replace('.ts', '');
            return 'template-' + name;
          }
        }
      }
    },
    minify: false
  },
})
