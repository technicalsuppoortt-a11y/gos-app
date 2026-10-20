import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const port = server.httpServer.address().port;
const output = await mkdtemp(join(tmpdir(), 'gos-storage-qa-'));
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.FUNNEL_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  for (const mode of ['funnel', 'website']) for (const failure of ['getter', 'quota']) {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(({ failure }) => {
      if (failure === 'getter') for (const key of ['localStorage', 'sessionStorage']) Object.defineProperty(window, key, { configurable: true, get() { throw new DOMException('Storage blocked', 'SecurityError'); } });
      else Storage.prototype.setItem = () => { throw new DOMException('Storage full', 'QuotaExceededError'); };
    }, { failure });
    await page.goto(`http://127.0.0.1:${port}/tests/fixtures/builder-storage.html?mode=${mode}`);
    await page.getByLabel('Funnel name', { exact: true }).waitFor();
    const bounds = () => page.evaluate(() => ['.fb-editor-header', '.fb-canvas-controls'].map(selector => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return { selector, x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }));
    const before = await bounds();
    const name = `${mode} ${failure} retained`;
    await page.getByLabel('Funnel name', { exact: true }).fill(name);
    await page.waitForFunction(name => window.__savedDocument?.funnel.name === name, name);
    await page.getByRole('button', { name: 'Save Draft', exact: true }).click();
    await page.waitForFunction(() => window.__savedDocument?.funnel.status === 'Draft');
    const { browserStorage, sessionStorageFallback } = await page.evaluate(async () => {
      const storage = await import('/src/utils/browserStorage.ts');
      storage.browserStorage.setItem('resilience-test', 'draft'); storage.sessionStorageFallback.setItem('resilience-test', 'step');
      return { browserStorage: storage.browserStorage.getItem('resilience-test'), sessionStorageFallback: storage.sessionStorageFallback.getItem('resilience-test') };
    });
    assert.equal(browserStorage, 'draft'); assert.equal(sessionStorageFallback, 'step');
    assert.deepEqual(await bounds(), before, `${mode}/${failure}: header and canvas control dimensions must remain stable`);
    assert.equal(await page.getByText('Browser storage is unavailable. Changes remain in this session.', { exact: true }).count(), 0);
    assert.deepEqual(errors, [], `${mode}/${failure}: uncaught errors`);
    await page.screenshot({ path: join(output, `${mode}-${failure}.png`) });
    await page.close();
  }
  console.log(`Blocked storage, quota fallback, builder saves and layout checks passed. Screenshots: ${output}`);
} finally { await browser?.close(); await server.close(); }
