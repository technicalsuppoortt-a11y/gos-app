import { createRequire } from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ reducedMotion: 'reduce' });
const base = process.env.ONBOARDING_TEST_URL || 'http://127.0.0.1:5180';
const errors = [], results = [];
page.on('pageerror', e => errors.push(e.message));
fs.mkdirSync('artifacts/viewport-polish', { recursive: true });
await page.goto(base + '/auth/login');
async function seed(theme, language, step = 0, completed = true) {
  await page.evaluate(({ theme, language, step, completed }) => {
    localStorage.setItem('theme', theme); localStorage.setItem('i18nextLng', language);
    localStorage.setItem('gos.auth', JSON.stringify({ user: { id: 'viewport-test', email: 'viewport@test.example', name: 'Alex Morgan' }, role: 'USER', token: 'mock-test', tenant: { id: 'viewport-test', name: 'Northstar Health' } }));
    const setup = { step, onboarding_completed: completed, name: 'Northstar Health', logo: '', color: '#7560eb', industry: 'Consulting', goal: 'Get more bookings', country: 'Egypt', timezone: 'Africa/Cairo', currency: 'EGP', language, description: 'Thoughtful consulting for ambitious small businesses.', website: 'https://northstar.example', facts: ['Free consultation'], integrations: ['Google Calendar'], asset: null };
    localStorage.setItem('gos.onboarding.v1', JSON.stringify({ setups: { 'viewport@test.example': setup }, invites: [] }));
  }, { theme, language, step, completed });
}
async function measureDashboard(theme, language, width, height) {
  const data = await page.evaluate(() => {
    const board = document.querySelector('.gos-home-dashboard');
    return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, boardTransform: getComputedStyle(board).transform, sections: [...board.querySelectorAll('[data-dashboard-section]')].map(section => {
      const r = section.getBoundingClientRect();
      const descendants = [...section.querySelectorAll('h1,h2,li,article,.analytics-chart')].filter(e => e.getClientRects().length && !e.closest('[aria-hidden=true]')).map(e => { const b = e.getBoundingClientRect(); return { tag: e.tagName, bottom: b.bottom, left: b.left, right: b.right, height: b.height }; });
      return { id: section.dataset.dashboardSection, top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height, descendants };
    }) };
  });
  results.push({ theme, language, width, height, ...data });
  assert.ok(data.scrollWidth <= width + 2 && data.scrollHeight <= height + 2, `Page overflow ${theme}/${language}/${width}x${height}: ${data.scrollWidth}x${data.scrollHeight}`);
  assert.equal(data.boardTransform, 'none', 'Dashboard is scaled');
  assert.equal(data.sections.length, 8);
  for (const section of data.sections) {
    assert.ok(section.bottom <= height + 1 && section.left >= -1 && section.right <= width + 1, `Section clipped: ${section.id} ${JSON.stringify(section)}`);
    for (const child of section.descendants) assert.ok(child.bottom <= section.bottom + 1 && child.left >= section.left - 1 && child.right <= section.right + 1, `Content overflows ${section.id}: ${JSON.stringify(child)} vs bottom ${section.bottom}`);
  }
}
async function checkFocus(locator) {
  await locator.focus();
  const guard = await locator.evaluate(e => {
    const ring = 5, input = e.getBoundingClientRect();
    const clipped = [];
    for (let parent = e.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent), r = parent.getBoundingClientRect();
      if (['auto','scroll','hidden','clip'].includes(style.overflowX) && (input.left - ring < r.left - .5 || input.right + ring > r.right + .5)) clipped.push(parent.className + ': horizontal');
      if (['auto','scroll','hidden','clip'].includes(style.overflowY) && (input.top - ring < r.top - .5 || input.bottom + ring > r.bottom + .5)) clipped.push(parent.className + ': vertical');
    }
    return clipped;
  }); assert.deepEqual(guard, [], 'Focus ring clipped by ' + guard.join(', '));
}
try {
  for (const theme of ['light', 'dark']) for (const language of ['en', 'ar']) {
    for (const [width, height] of [[1440,900], [1440,768], [1080,768], [1280,720]]) {
      await page.setViewportSize({ width, height }); await seed(theme, language);
      await page.goto(base + '/dashboard'); await page.locator('.gos-home-dashboard').waitFor();
      await measureDashboard(theme, language, width, height);
      if (width === 1440 && height === 768) await page.screenshot({ path: `artifacts/viewport-polish/dashboard-${theme}-${language}.png` });
      if (width === 1080) {
        await page.locator('.ob-progress-header').click(); await measureDashboard(theme, language, width, height);
        await page.locator('.ob-progress-header').click();
        await page.locator('#hero-create-new').click();
        const menu = await page.locator('#hero-create-list').boundingBox(); const hero = await page.locator('[data-dashboard-section=hero]').boundingBox();
        assert.ok(menu.y >= hero.y && menu.y + menu.height <= height, 'Create menu clipped');
        await page.locator('#hero-create-new').click();
      }
    }
    await page.setViewportSize({ width: 1280, height: 640 });
    for (const step of [0,2,3]) {
      await seed(theme, language, step, false); await page.goto(base + '/onboarding'); await page.locator('.ob-step-content').waitFor();
      const target = page.locator('.ob-step-content input:not([type=file]):not([type=color]),.ob-step-content textarea,.ob-step-content .gos-combo-trigger');
      for (const input of await target.all()) await checkFocus(input);
      assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 2), 'Wizard page scroll');
      const content = await page.locator('.ob-step-content').evaluate(e => [e.scrollHeight, e.clientHeight]);
      assert.ok(content[0] <= content[1] + 3, `Step ${step} scroll: ${content}`);
      if (step === 0) await page.screenshot({ path: `artifacts/viewport-polish/focus-${theme}-${language}.png` });
    }
    console.log(`Checked ${theme}/${language}: zero-scroll dashboard, expanded progress, create menu, unclipped form focus.`);
  }
  await page.setViewportSize({ width: 1440, height: 768 }); await seed('light', 'en', 0, false); await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(base + '/onboarding'); await page.locator('.ob-preview-window').waitFor();
  const input = page.locator('.ob-step-content input').first(); await input.fill('Live motion studio');
  await page.waitForFunction(() => document.querySelector('.ob-preview-window').getAnimations().some(a => a.effect.getTiming().duration === 300));
  const frames = await page.locator('.ob-preview-window').evaluate(e => e.getAnimations().filter(a => a.effect.getTiming().duration === 300).flatMap(a => a.effect.getKeyframes()));
  assert.ok(frames.some(f => f.opacity === '.9' || f.opacity === '0.9'), 'Preview fade missing');
  await page.waitForTimeout(350);
  const settled = await page.locator('.ob-preview-window').evaluate(e => ({ opacity: getComputedStyle(e).opacity, transform: getComputedStyle(e).transform }));
  assert.equal(settled.opacity, '1'); assert.ok(settled.transform === 'none' || settled.transform === 'matrix(1, 0, 0, 1, 0, 0)');
  assert.equal(await input.inputValue(), 'Live motion studio');
  await page.emulateMedia({ reducedMotion: 'reduce' }); await input.fill('Reduced motion studio');
  await page.waitForTimeout(50); assert.equal(await page.locator('.ob-preview-window').evaluate(e => getComputedStyle(e).opacity), '1');
  await page.setViewportSize({ width: 390, height: 844 }); await seed('dark', 'ar'); await page.goto(base + '/dashboard'); await page.locator('.gos-home-dashboard').waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'Mobile overflow');
  assert.ok(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight), 'Mobile content incorrectly locked');
  assert.deepEqual(errors, []);
  console.log('PASS: unclipped focus rings, real 300ms preview motion and reduced-motion support, unscaled zero-scroll desktop dashboard, visible card contents, and mobile fallback.');
} catch (error) {
  await page.screenshot({ path: 'artifacts/viewport-polish/failure.png', fullPage: true }).catch(() => {}); throw error;
} finally { fs.writeFileSync('artifacts/viewport-polish/report.json', JSON.stringify({ errors, results }, null, 2)); await browser.close(); }
