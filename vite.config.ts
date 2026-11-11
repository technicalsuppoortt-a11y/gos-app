import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { landingPreviewPlugin } from './scripts/landing-preview-plugin.ts'
import { demoAccountPlugin } from './scripts/demo-account-plugin.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [demoAccountPlugin(), landingPreviewPlugin(), react()],
  server: {
    // Local Meta testing: the Facebook login popup needs https, so the dev server is opened through ngrok.
    allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app'],
    // With VITE_GOS_API_BASE_URL=/ the page calls /api on its own origin and Vite forwards it to Herd.
    proxy: {
      '/api': 'http://ai-follow-up.test',
      // Launch Brand dev server (npm run dev:launch-brand), on the same address as gos for the live previews.
      '/launch-brand': { target: 'http://localhost:5175', ws: true },
    },
  },
  optimizeDeps: {
    include: [
      '@radix-ui/react-select',
      '@phosphor-icons/react',
      '@xyflow/react',
      'clsx',
      'tailwind-merge',
      'i18next',
      'react-i18next',
      'lucide-react',
      'react-router-dom',
      'react-redux',
      '@reduxjs/toolkit',
      'framer-motion',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'firebase/storage',
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
