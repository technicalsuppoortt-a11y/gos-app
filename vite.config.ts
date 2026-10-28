import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { landingPreviewPlugin } from './scripts/landing-preview-plugin.ts'
import { demoAccountPlugin } from './scripts/demo-account-plugin.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [demoAccountPlugin(), landingPreviewPlugin(), react()],
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
    manifest: 'hosting-manifest.json',
    rollupOptions: {
      input: { dashboard: 'index.html', published: 'published.html', landingPreview: 'landing-preview.html' },
      output: {
        manualChunks(id) {
          if (id.includes('pagefly/templates/')) {
            const name = id.split('?')[0].split('/').pop()?.replace('.ts', '');
            return 'template-' + name + (id.endsWith('?landing-demo') ? '-landing-demo' : id.endsWith('?account-demo') ? '-account-demo' : '');
          }
        }
      }
    }
  },
})
