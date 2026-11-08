import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { fileURLToPath } from 'node:url'

// Dev only: serve /launch-brand (no trailing slash), the address Joe Academy opens.
// Firebase Hosting does the same with its /launch-brand rewrite.
function launchBrandWithoutSlash(): Plugin {
  return {
    name: 'launch-brand-without-slash',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/launch-brand' || req.url?.startsWith('/launch-brand?')) req.url = req.url.replace('/launch-brand', '/launch-brand/');
        next();
      });
    },
  };
}

// Same plugins and alias as Joe Academy (phoenix-app). Built into gos-app's
// dist/launch-brand so Firebase Hosting serves it at /launch-brand.
export default defineConfig({
  base: '/launch-brand/',
  publicDir: false,
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [launchBrandWithoutSlash(), react(), tailwindcss()],
  // Tailwind 4 runs through @tailwindcss/vite. Don't pick up gos-app's
  // Tailwind 3 postcss.config.js from the parent folder.
  css: { postcss: { plugins: [] } },
  build: { outDir: '../dist/launch-brand', emptyOutDir: true },
  server: { port: 5175, strictPort: true, hmr: { clientPort: 5173 } },
})
