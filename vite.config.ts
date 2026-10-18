import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      '@radix-ui/react-select',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-tooltip',
      'lucide-react',
      'react-router-dom',
      'react-redux',
      '@reduxjs/toolkit',
      'framer-motion',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'sonner',
    ],
  },
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
