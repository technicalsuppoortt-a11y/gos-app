import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { landingPreviewPlugin } from './scripts/landing-preview-plugin.ts'
import { demoAccountPlugin } from './scripts/demo-account-plugin.ts'

// Prune unused icon modules from lucide-react and @phosphor-icons/react barrel entrypoints during build
// so Rolldown only parses the ~200 icons actually referenced in src/ instead of 7,500+ unused icon files.
function iconBarrelPrunePlugin(): Plugin {
  let used = new Set<string>()
  function collectUsedIdentifiers(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) collectUsedIdentifiers(full)
      else if (/\.[jt]sx?$/.test(entry.name)) {
        const matches = readFileSync(full, 'utf8').match(/\b[A-Z][A-Za-z0-9]*\b/g)
        if (matches) for (const m of matches) used.add(m)
      }
    }
  }
  return {
    name: 'icon-barrel-prune',
    apply: 'build',
    enforce: 'pre',
    buildStart() {
      used = new Set<string>()
      collectUsedIdentifiers(resolve(import.meta.dirname, 'src'))
    },
    load(id) {
      const norm = id.split('?')[0].replaceAll('\\', '/')
      if (norm.endsWith('/lucide-react/dist/esm/lucide-react.mjs')) {
        const lines = readFileSync(norm, 'utf8').split(/\r?\n/)
        return lines
          .filter(line => {
            if (line.includes('./icons/index.mjs') || line.includes('index as icons')) return false
            if (!line.includes("from './icons/")) return true
            const names = [...line.matchAll(/\bas\s+([A-Za-z0-9_]+)\b/g)].map(m => m[1])
            return names.some(n => used.has(n))
          })
          .join('\n')
      }
      if (norm.endsWith('/@phosphor-icons/react/dist/index.es.js')) {
        const csrDir = resolve(norm, '../csr')
        const exports: string[] = []
        for (const file of readdirSync(csrDir)) {
          if (!file.endsWith('.es.js')) continue
          const base = file.slice(0, -'.es.js'.length)
          if (used.has(base) || used.has(`${base}Icon`)) {
            exports.push(`export { ${base}, ${base}Icon } from './csr/${file}';`)
          }
        }
        return exports.join('\n')
      }
      return null
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [iconBarrelPrunePlugin(), demoAccountPlugin(), landingPreviewPlugin(), react()],
  server: {
    // Local Meta testing: the Facebook login popup needs https, so the dev server is opened through ngrok.
    allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app'],
    // With VITE_GOS_API_BASE_URL=/ the page calls /api on its own origin and Vite forwards it to Herd.
    proxy: {
      '/api': 'http://ai-follow-up.test',
      // Same-origin proxy for Firebase Cloud Functions in local dev (prevents browser CORS preflight blocks on localhost).
      '/api-functions': {
        target: 'https://us-central1-gos-app-3c7fb.cloudfunctions.net',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api-functions/, ''),
      },
      // Launch Brand dev server (npm run dev:launch-brand), on the same address as gos for the live previews.
      '/launch-brand': { target: 'http://localhost:5175', ws: true },
    },
    watch: {
      ignored: ['**/.tmp/**', '**/.git/**'],
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
