import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import path from 'node:path';
import { createServer } from 'vite';

const server = await createServer({ root: path.resolve('launch-brand'), configFile: path.resolve('launch-brand/vite.config.ts'), server: { middlewareMode: true }, logLevel: 'error' });
after(() => server.close());
const { createBrandTheme } = await server.ssrLoadModule('/src/modules/brand-engine/data/brandTheme.ts');
const { resolveBrandMode, studioPresetTheme } = await server.ssrLoadModule('/src/modules/brand-engine/data/studioColorPresets.ts');
const { hydrateBrandPages, serializeBrandPages } = await server.ssrLoadModule('/src/modules/brand-engine/data/brandPages.ts');

function draft(appTheme, palette, choices = {}) {
  return { theme: appTheme, language: 'en', brandPalette: palette, brandTheme: studioPresetTheme(palette, createBrandTheme()), pageParameters: { branding: choices } };
}

test('saved palette modes and legacy presets remain independent of both app themes', () => {
  for (const appTheme of ['light', 'dark']) {
    for (const palette of ['crimson-carbon', 'joe-academy', 'dashboard-default']) {
      const state = draft(appTheme, palette);
      const expected = palette === 'crimson-carbon' ? 'dark' : 'light';
      assert.equal(resolveBrandMode(state), expected);
      assert.equal(state.theme, appTheme);
    }
  }
});

test('custom edits retain the chosen brand mode through save and reload without changing app state', () => {
  const state = draft('light', 'crimson-carbon', { brandMode: 'dark', favoriteIdentities: ['saved-logo'] });
  state.brandTheme.paletteId = 'custom';
  const before = structuredClone(state);
  const pages = serializeBrandPages(state);
  assert.equal(pages.find(page => page.pageId === 'vision_journey').parameters.theme, 'dark');
  assert.equal(pages.find(page => page.pageId === 'deployment').parameters.theme, 'dark');
  const restored = hydrateBrandPages(pages);
  restored.theme = 'light'; // The existing host display-preference binding runs after hydration.
  assert.equal(resolveBrandMode(restored), 'dark');
  assert.deepEqual(restored.pageParameters.branding.favoriteIdentities, ['saved-logo']);
  assert.deepEqual(state, before);
});

test('Keep Dashboard Color is a light brand even when the app is dark', () => {
  const state = draft('dark', 'dashboard-default', { brandMode: 'light' });
  assert.equal(resolveBrandMode(state), 'light');
  assert.equal(state.theme, 'dark');
});
