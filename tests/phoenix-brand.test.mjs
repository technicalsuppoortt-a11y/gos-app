import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { themeColorValue } from '../src/branding/themeColors.ts';
import { brandContrastRatio, resolveDashboardBrandTokens } from '../src/branding/dashboardBrandTokens.ts';
import { workspaceTheme, themePaletteDetails } from '../src/branding/workspaceTheme.ts';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const moduleCache = new Map();

function loadTsModule(filePath) {
  const abs = path.resolve(filePath);
  if (moduleCache.has(abs)) return moduleCache.get(abs);
  if (abs.endsWith('.json')) {
    const parsed = JSON.parse(fs.readFileSync(abs, 'utf8'));
    moduleCache.set(abs, parsed);
    return parsed;
  }
  const source = fs.readFileSync(abs, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const mod = { exports: {} };
  moduleCache.set(abs, mod.exports);
  const customRequire = specifier => {
    let resolved = specifier.startsWith('@/')
      ? path.join(repoRoot, 'launch-brand', 'src', specifier.slice(2))
      : path.resolve(path.dirname(abs), specifier);
    for (const candidate of [
      resolved,
      `${resolved}.ts`,
      `${resolved}.js`,
      resolved.replace(/\.js$/, '.ts'),
    ]) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return loadTsModule(candidate);
      }
    }
    throw new Error(`Cannot resolve ${specifier} from ${abs}`);
  };
  new Function('require', 'module', 'exports', transpiled)(customRequire, mod, mod.exports);
  moduleCache.set(abs, mod.exports);
  return mod.exports;
}

const { brandPalettes, createBrandTheme } = loadTsModule(
  path.join(repoRoot, 'launch-brand/src/modules/brand-engine/data/brandTheme.ts'),
);
const { studioColorPresets, studioPresetTheme } = loadTsModule(
  path.join(repoRoot, 'launch-brand/src/modules/brand-engine/data/studioColorPresets.ts'),
);
const { createBrandLogoSvg, tightenBrandLogoSvg, withLogoDrawAnimation } = loadTsModule(
  path.join(repoRoot, 'launch-brand/src/modules/brand-engine/services/brandLogo.ts'),
);

test('logo drawing reveals filled and outlined paths without losing their final appearance', () => {
  const svg = '<svg><g data-brand-mark="true"><path d="M0 0L20 0L10 20Z" fill="#007D70" stroke="none" stroke-width="0"/><path d="M0 25L20 25" fill="none" stroke="#005EBB" stroke-width="3"/></g><text>Orbit</text></svg>';
  const animated = withLogoDrawAnimation(svg);
  assert.match(animated, /fill="#007D70" stroke="#007D70"/);
  assert.match(animated, /--i:0;--sw:0;--so:0/);
  assert.match(animated, /--i:1;--sw:3;--so:1/);
  assert.match(animated, /stroke-opacity:var\(--so\)/);
  assert.match(animated, /prefers-reduced-motion:reduce/);
  assert.equal((animated.match(/class="lb-draw"/g) || []).length, 2);
  assert.equal(withLogoDrawAnimation(animated), animated, 'reprocessing an animated preview must not duplicate paths or animations');
});

test('a wordmark-only logo remains wordmark-only during drawing presentation', () => {
  const svg = '<svg><g data-brand-mark="true"></g><text>Orbit</text></svg>';
  assert.equal(withLogoDrawAnimation(svg), svg);
});

test('Phoenix color roles replace brand accents, keep muted charcoal text crisp, and preserve semantic soft tokens', () => {
  assert.match(themeColorValue('#7546f5', 'background'), /--gp-primary/);
  assert.match(themeColorValue('#7546f5', 'color'), /--gp-accent-text/);
  assert.match(themeColorValue('#38344f', 'color'), /--gp-text/);
  assert.doesNotMatch(themeColorValue('#38344f', 'color'), /--gp-surface/);
  assert.match(themeColorValue('#ffffff', 'background'), /--gp-surface/);
  assert.equal(themeColorValue('#ef4444', 'color'), '#ef4444');
  assert.equal(themeColorValue('rgba(245, 158, 11, .14)', '--bl-warning-soft'), 'rgba(245, 158, 11, .14)');
  assert.equal(themeColorValue('url(/photo.png)', 'background'), 'url(/photo.png)');
  const bound = themeColorValue('#7546f5', 'fill');
  assert.equal(themeColorValue(bound, 'fill'), bound, 'repeated observer callbacks must be idempotent');
});

test('every Launch Brand palette, Studio preset, Workspace palette, and Red theme meets WCAG AA contrast in light and dark mode', () => {
  const themes = [
    ...brandPalettes.map(p => ({ label: `brand:${p.id}`, theme: createBrandTheme(p.id), isWorkspace: false })),
    ...studioColorPresets.map(p => ({ label: `studio:${p.id}`, theme: studioPresetTheme(p.id, createBrandTheme()), isWorkspace: false })),
    ...Object.keys(themePaletteDetails).map(id => ({ label: `workspace:${id}`, theme: workspaceTheme(id), isWorkspace: true })),
  ];

  for (const { label, theme, isWorkspace } of themes) {
    for (const mode of ['light', 'dark']) {
      const colors = theme[mode];
      const resolved = resolveDashboardBrandTokens(colors, mode, { isWorkspacePalette: isWorkspace });
      const actionContrast = brandContrastRatio(resolved.actionBg, resolved.onAction);
      assert.ok(
        actionContrast >= 4.5,
        `${label} (${mode}): actionBg ${resolved.actionBg} vs onAction ${resolved.onAction} contrast ${actionContrast.toFixed(2)} < 4.5`,
      );
      const buttonContrast = brandContrastRatio(resolved.buttonBackground, resolved.onPrimary);
      assert.ok(
        buttonContrast >= 4.5,
        `${label} (${mode}): buttonBackground ${resolved.buttonBackground} vs onPrimary ${resolved.onPrimary} contrast ${buttonContrast.toFixed(2)} < 4.5`,
      );
      const surfaceVisibility = brandContrastRatio(resolved.actionBg, colors.surface);
      assert.ok(
        surfaceVisibility >= 2.3,
        `${label} (${mode}): actionBg ${resolved.actionBg} vs surface ${colors.surface} visibility ${surfaceVisibility.toFixed(2)} < 2.3`,
      );
      const accentOnSurface = brandContrastRatio(resolved.accentText, colors.surface);
      const accentOnBg = brandContrastRatio(resolved.accentText, colors.background);
      assert.ok(
        accentOnSurface >= 4.5 && accentOnBg >= 4.5,
        `${label} (${mode}): accentText ${resolved.accentText} contrast (${accentOnSurface.toFixed(2)}, ${accentOnBg.toFixed(2)}) < 4.5`,
      );
    }
  }

  for (const redHex of ['#EF4444', '#DC2626', '#FF0000', '#E11D48', '#BE123C', '#843D50']) {
    for (const mode of ['light', 'dark']) {
      const base = createBrandTheme('rose');
      base[mode].primary = redHex;
      const resolved = resolveDashboardBrandTokens(base[mode], mode);
      assert.equal(resolved.onAction, '#FFFFFF', `Red theme ${redHex} in ${mode} mode must use crisp white text`);
      assert.equal(resolved.onPrimary, '#FFFFFF', `Red button ${redHex} in ${mode} mode must use crisp white text`);
      assert.ok(brandContrastRatio(resolved.actionBg, '#FFFFFF') >= 4.5);
    }
  }
});

test('tightenBrandLogoSvg eliminates 1200x400 empty margins on generated vector logos without touching custom SVGs', () => {
  for (const name of ['Gasser', 'موطن الذكاء']) {
    const raw = createBrandLogoSvg(
      {
        id: 'id-1',
        name,
        arabicName: name,
        tagline: '',
        rationale: '',
        imageDirection: '',
        mark: 'prism',
        theme: createBrandTheme('purple'),
      },
      '#843D50',
    );
    const tightened = tightenBrandLogoSvg(raw);
    const match = tightened.match(/viewBox="([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)"/);
    assert.ok(match, 'tightened SVG must contain a cropped viewBox');
    const [, x, y, w, h] = match.map(Number);
    assert.ok(x > 40, `expected dead left margin cropped for ${name}, got x=${x}`);
    assert.ok(y >= 80, `expected dead top margin cropped for ${name}, got y=${y}`);
    assert.ok(w < 950, `expected width tighter than 1200 for ${name}, got w=${w}`);
    assert.ok(h <= 230, `expected height tighter than 400 for ${name}, got h=${h}`);
  }
});

async function brandHarness() {
  const source = fs.readFileSync(new URL('../src/backend/phoenixBrand.ts', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText.replace(/export /g, '');
  const documents = new Map();
  const auth = { currentUser: { uid: 'gos-owner' } };
  const saved = [];
  const api = new Function('auth', 'db', 'doc', 'collection', 'getDoc', 'getDocs', 'saveSetup', 'useSyncExternalStore', `${code}; return {loadPhoenixBrand,getPhoenixBrand,clearPhoenixBrand};`)(
    auth, {}, (_, ...segments) => segments.join('/'), (root, name) => `${root}/${name}`,
    async ref => ({ data: () => documents.get(ref) }),
    async ref => ({ docs: (documents.get(ref) || []).map(([id, data]) => ({ id, data: () => data })) }),
    (...values) => saved.push(values), () => null,
  );
  const root = 'users/gos-owner/brandEngineSnapshots/revision';
  documents.set('users/gos-owner/brandEngine/current', { status: 'prepared', sourceUid: 'source-owner', tenantId: 'phoenix_source-owner', snapshotId: 'revision', sourceRevision: 'revision', pageIds: ['branding'], brand: { name: 'موطن', logoAssetId: 'logo', language: 'ar', theme: { light: { primary: '#A8553B' } } } });
  documents.set(`${root}/pages`, [['branding', { revision: 'revision', parameters: { tagline: 'Saved tagline' } }]]);
  documents.set(`${root}/assets`, [['logo', { dataUrl: 'data:image/png;base64,YQ==', width: 1200, height: 400, origin: 'generated_logo' }]]);
  return { api, auth, documents, root, saved };
}

test('manual password session restores name, theme, full logo and text from the server', async () => {
  const { api, saved } = await brandHarness();
  const load = () => api.loadPhoenixBrand('gos-owner', 'source-owner', 'phoenix_source-owner', 'owner@example.com');
  const first = await load();
  assert.equal(first.brand.theme.light.primary, '#A8553B');
  assert.equal(first.brand.tagline, 'Saved tagline');
  assert.equal(first.logo, 'data:image/png;base64,YQ==');
  assert.equal(first.logoHasWordmark, true);
  api.clearPhoenixBrand();
  assert.equal(api.getPhoenixBrand(), null);
  assert.deepEqual(await load(), first, 'a fresh session must restore the same branding without local browser cache');
  assert.equal(saved.at(-1)[1].onboarding_completed, true);
});

test('chunked logos are assembled and incomplete or foreign snapshots are rejected', async () => {
  const { api, documents, root } = await brandHarness();
  documents.set(`${root}/assets`, [
    ['logo', { encoding: 'chunked-data-url-v1', chunkCount: 2, width: 100, height: 100 }],
    ['logo-part-0', { dataUrl: 'data:image/png;base64,' }], ['logo-part-1', { dataUrl: 'YQ==' }],
  ]);
  assert.equal((await api.loadPhoenixBrand('gos-owner', 'source-owner', 'phoenix_source-owner', '')).logo, 'data:image/png;base64,YQ==');
  await assert.rejects(api.loadPhoenixBrand('gos-owner', 'foreign-owner', 'phoenix_source-owner', ''));
  documents.set(`${root}/pages`, []);
  await assert.rejects(api.loadPhoenixBrand('gos-owner', 'source-owner', 'phoenix_source-owner', ''));
});

test('switching users during a brand read cannot publish another account identity', async () => {
  const { api, auth } = await brandHarness();
  auth.currentUser = { uid: 'another-user' };
  await assert.rejects(api.loadPhoenixBrand('gos-owner', 'source-owner', 'phoenix_source-owner', ''));
  assert.equal(api.getPhoenixBrand(), null);
});

test('generated logos reuse the saved vector and tighten 1200x400 Studio lockups while preserving custom SVGs', async () => {
  const { api, documents, root } = await brandHarness();
  const customSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400"><text>موطن</text></svg>';
  documents.set(`${root}/assets`, [['logo', { origin: 'generated_logo', width: 1200, height: 400, svg: customSvg }]]);
  const result = await api.loadPhoenixBrand('gos-owner', 'source-owner', 'phoenix_source-owner', '');
  assert.equal(result.logo, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(customSvg)}`);
  assert.equal(result.logoHasWordmark, true);
});
