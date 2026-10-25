import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Plugin } from 'vite';

// A separate module graph: no demo switch can bypass authentication in the live app.
// src/main.tsx loads this graph (via src/demo/bootstrap.ts) only for an in-app
// demo session; it shares the SPA document and browser router with the live app.
export function demoAccountPlugin(): Plugin {
  const marker = '?account-demo';
  const root = resolve(import.meta.dirname, '..');
  const adapters = resolve(root, 'src/demo/adapters');
  const replacements: Record<string, string> = {
    'backend/firebase': 'firebase.ts', 'backend/workspace': 'workspace.ts',
    'backend/session': 'session.ts', 'backend/gosApi': 'gosApi.ts',
    'backend/settings': 'settings.ts', 'backend/localDemo': 'localDemo.ts',
    'backend/demoContext': 'context.ts',
    'components/common/CustomDomainInterceptor': 'domain.ts',
  };
  return {
    name: 'isolated-demo-account', enforce: 'pre',
    resolveId(source, importer) {
      if (!source.endsWith(marker) && !importer?.endsWith(marker)) return null;
      const clean = source.replace(marker, '');
      if (clean.startsWith('firebase/')) return resolve(adapters, clean.slice(9) + '.ts') + marker;
      if (!clean.startsWith('.') && !clean.startsWith('/') && !/^[A-Z]:/i.test(clean)) return null;
      let path = clean.startsWith('/src/') ? resolve(root, '.' + clean) : resolve(importer ? dirname(importer.replace(marker, '')) : root, clean);
      if (!existsSync(path) || !/\.[a-z0-9]+$/i.test(path)) {
        const found = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'].map(ext => path + ext).find(existsSync);
        if (!found) return null;
        path = found;
      }
      for (const [module, adapter] of Object.entries(replacements)) if (new RegExp('/src/' + module + '\\.[jt]sx?$').test(path.replaceAll('\\', '/'))) return resolve(adapters, adapter) + marker;
      return /\.[jt]sx?$/.test(path) ? path + marker : path;
    },
    load(id) {
      if (!id.endsWith(marker)) return;
      let source = readFileSync(id.slice(0, -marker.length), 'utf8');
      if (/\/src\/pages\/Inbox\.tsx$/.test(id.slice(0, -marker.length).replaceAll('\\', '/'))) source = source.replace("import.meta.env.VITE_LOCAL_DEMO === 'true'", 'true');
      if (/\/src\/backend\/marketingTracking\.ts$/.test(id.slice(0, -marker.length).replaceAll('\\', '/'))) source = source.replace('function script(id: string, src: string) {', 'function script(id: string, src: string) { return;');
      if (/\/src\/pages\/settings\/data\.ts$/.test(id.slice(0, -marker.length).replaceAll('\\', '/'))) source = source.replace('export function safeExternalUrl(value: string) {', "export function safeExternalUrl(value: string) {\n  if (value.startsWith(window.location.origin + '/')) return value;");
      return source;
    },
  };
}
