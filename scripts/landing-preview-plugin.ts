import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Plugin } from 'vite';

// Clone only the iframe's module graph. The authenticated app keeps its original
// modules and transports, even when both graphs share the same source component.
export function landingPreviewPlugin(): Plugin {
  const marker = '?landing-demo';
  const root = resolve(import.meta.dirname, '..');
  const adapters = resolve(root, 'src/pages/landing/preview/adapters');
  const replacements: Record<string, string> = {
    'backend/workspace': 'workspace.ts', 'backend/firebase': 'firebase.ts',
    'backend/gosApi': 'gosApi.ts', 'backend/settings': 'settings.ts',
    'backend/session': 'session.ts',
  };
  return {
    name: 'isolated-landing-preview', enforce: 'pre',
    resolveId(source, importer) {
      if (!source.endsWith(marker) && !importer?.endsWith(marker)) return null;
      const clean = source.replace(marker, '');
      if (clean === 'firebase/firestore') return resolve(adapters, 'firestore.ts') + marker;
      if (!clean.startsWith('.') && !clean.startsWith('/') && !/^[A-Z]:/i.test(clean)) return null;
      let path = clean.startsWith('/src/') ? resolve(root, '.' + clean) : resolve(importer ? dirname(importer.replace(marker, '')) : root, clean);
      if (!existsSync(path) || !/\.[a-z0-9]+$/i.test(path)) {
        const found = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'].map(ext => path + ext).find(existsSync);
        if (!found) return null;
        path = found;
      }
      const normalized = path.replaceAll('\\', '/');
      for (const [module, adapter] of Object.entries(replacements)) {
        if (new RegExp('/src/' + module + '\\.[jt]sx?$').test(normalized)) return resolve(adapters, adapter) + marker;
      }
      return /\.[jt]sx?$/.test(path) ? path + marker : path;
    },
    load(id) { if (id.endsWith(marker)) return readFileSync(id.slice(0, -marker.length), 'utf8'); },
  };
}
