import { createRequire } from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const base = process.env.ONBOARDING_TEST_URL || 'http://127.0.0.1:5179';
const errors = [], results = [];
page.on('pageerror', error => errors.push(error.message));
fs.mkdirSync('artifacts/flow-refinements', { recursive: true });
await page.goto(base + '/auth/login');
async function seed({ theme = 'light', language = 'en', step = 0, completed = false, role = 'USER' } = {}) {
  await page.evaluate(({ theme, language, step, completed, role }) => {
    localStorage.setItem('theme', theme); localStorage.setItem('i18nextLng', language);
    localStorage.setItem('gos.auth', JSON.stringify({ user: { id: 'refinement-test', email: 'refinement@test.example', name: 'Alex Morgan' }, role, token: 'mock-test', tenant: { id: 'refinement-test', name: 'Northstar Health' } }));
    const setup = { step, onboarding_completed: completed, name: 'Northstar Health', logo: '', color: '#7560eb', industry: 'Consulting', goal: 'Get more bookings', country: 'Egypt', timezone: 'Africa/Cairo', currency: 'EGP', language, description: language === 'ar' ? 'استشارات تساعد الشركات على بناء مستقبل أفضل.' : 'Thoughtful consulting for ambitious small businesses.', website: 'https://northstar.example', facts: ['Free first consultation', 'Available worldwide'], integrations: ['Google Calendar'], asset: null };
    localStorage.setItem('gos.onboarding.v1', JSON.stringify({ setups: { 'refinement@test.example': setup }, invites: [{ id: 'invite-test', email: 'invite@test.example', role: 'USER', status: 'Invited', mfa: false, created: new Date().toISOString() }, { id: 'pending-test', email: 'refinement@test.example', role: 'USER', status: 'Activated', mfa: true, created: new Date().toISOString() }] }));
  }, { theme, language, step, completed, role });
}
async function measure(route, detail) {
  const dimensions = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight }));
  results.push({ route, ...detail, ...dimensions });
  assert.ok(dimensions.scrollWidth <= dimensions.width + 2, `Horizontal overflow ${route} ${JSON.stringify(detail)}: ${JSON.stringify(dimensions)}`);
  if (route === 'onboarding' && dimensions.width >= 1000) {
    assert.ok(dimensions.scrollHeight <= dimensions.height + 2, `Wizard page scroll ${JSON.stringify(detail)}`);
    const bounds = await page.locator('.ob-setup-footer').boundingBox(); assert.ok(bounds.y + bounds.height <= dimensions.height + 2, 'Footer clipped');
    const content = await page.locator('.ob-step-content').evaluate(e => ({ height: e.clientHeight, scroll: e.scrollHeight }));
    assert.ok(content.scroll <= content.height + 3, `Wizard step scroll ${JSON.stringify(detail)} ${JSON.stringify(content)}`);
    const preview = await page.locator('.ob-preview-window').boundingBox(); assert.ok(preview.y + preview.height <= dimensions.height, 'Preview clipped');
  }
}
try {
  for (const theme of process.env.FLOW_SHORT ? [] : ['light', 'dark']) for (const language of ['en', 'ar']) {
    for (const width of [1440, 1080]) {
      await page.setViewportSize({ width, height: 768 });
      for (let step = 0; step < 6; step++) {
        await seed({ theme, language, step });
        await page.goto(base + '/onboarding'); await page.locator('.ob-step-content').waitFor();
        await measure('onboarding', { theme, language, step, width });
        if (step === 2 && width === 1440) await page.screenshot({ path: `artifacts/flow-refinements/wizard-${theme}-${language}.png` });
      }
      await seed({ theme, language, completed: true });
      await page.goto(base + '/dashboard'); await page.locator('.gos-home-dashboard').waitFor();
      await measure('dashboard', { theme, language, width });
      const grid = await page.locator('.gos-home-dashboard .gos-row').last().evaluate(e => getComputedStyle(e).gridTemplateColumns);
      assert.equal(grid.split(' ').length, 3, 'Desktop overview did not use its compact three-card row');
      if (width === 1440) await page.screenshot({ path: `artifacts/flow-refinements/dashboard-${theme}-${language}.png`, fullPage: true });
    }
    await page.setViewportSize({ width: 1440, height: 768 });
    await seed({ theme, language }); await page.goto(base + '/activate?invite=invite-test');
    await page.locator('.ob-activation-form form').waitFor(); await measure('activate', { theme, language });
    const password = page.locator('input[autocomplete=new-password]').first(); await password.fill('Strongpass9');
    assert.equal(await page.getByRole('meter').getAttribute('aria-valuenow'), '3');
    const contrast = await password.evaluate(e => {
      const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => { const c = v / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; });
      const luminance = color => { const [r, g, b] = rgb(color); return .2126 * r + .7152 * g + .0722 * b; };
      const a = luminance(getComputedStyle(e, '::placeholder').color), b = luminance(getComputedStyle(e).backgroundColor);
      return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    }); assert.ok(contrast >= 4.5, `Placeholder contrast too low: ${contrast}`);
    await page.screenshot({ path: `artifacts/flow-refinements/activation-${theme}-${language}.png`, fullPage: true });
    await seed({ theme, language, role: 'ADMIN' }); await page.goto(base + '/admin/users'); await page.locator('.ob-admin').waitFor();
    await measure('admin', { theme, language });
    await page.screenshot({ path: `artifacts/flow-refinements/admin-${theme}-${language}.png`, fullPage: true });
    console.log(`Checked ${theme}/${language}: all wizard steps at 1440/1080, dashboard wrapping, activation contrast, admin.`);
  }
  await page.setViewportSize({ width: 1280, height: 640 });
  for (const [theme, language] of [['light', 'en'], ['dark', 'ar']]) for (let step = 0; step < 6; step++) {
    await seed({ theme, language, step }); await page.goto(base + '/onboarding'); await page.locator('.ob-step-content').waitFor();
    await measure('onboarding', { theme, language, step, width: 1280, short: true });
  }
  await page.setViewportSize({ width: 1440, height: 768 });
  await seed({ step: 2 }); await page.goto(base + '/onboarding');
  await page.getByRole('combobox', { name: 'Country', exact: true }).click();
  await page.getByRole('combobox', { name: 'Search countries…' }).fill('Japan');
  await page.getByRole('option', { name: /Japan/ }).click();
  await page.getByRole('combobox', { name: 'Currency', exact: true }).click();
  await page.getByRole('combobox', { name: 'Search currencies…' }).fill('CAD');
  await page.keyboard.press('Enter');
  await page.getByRole('combobox', { name: 'Workspace timezone', exact: true }).click();
  await page.getByRole('combobox', { name: 'Search timezones…' }).fill('Africa/Cairo');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByPlaceholder('e.g. Free first consultation').fill('New business fact'); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Remove New business fact' }).click();
  await page.getByPlaceholder('e.g. Free first consultation').fill('Added with plus'); await page.getByRole('button', { name: 'Add fact', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('switch', { name: 'Connect Zoom' }).click();
  assert.equal(await page.getByRole('switch', { name: 'Connect Zoom' }).getAttribute('aria-checked'), 'true');
  await page.reload(); assert.equal(await page.getByRole('switch', { name: 'Connect Zoom' }).getAttribute('aria-checked'), 'true');
  await seed({ completed: true }); await page.goto(base + '/dashboard');
  await page.getByRole('button', { name: 'Notifications', exact: true }).click();
  await page.getByRole('tab', { name: 'Bookings', exact: true }).click(); assert.equal(await page.locator('.nc-item').count(), 2);
  await page.getByRole('tab', { name: 'Leads', exact: true }).click(); assert.equal(await page.locator('.nc-item').count(), 1);
  await page.getByRole('button', { name: 'Mark all as read' }).click(); assert.equal(await page.locator('.nc-count').count(), 0);
  await page.screenshot({ path: 'artifacts/flow-refinements/notifications.png' });
  await page.keyboard.press('Escape'); await page.reload(); assert.equal(await page.locator('.nc-count').count(), 0);
  await seed({ role: 'ADMIN' }); await page.goto(base + '/admin/users');
  await page.getByRole('combobox', { name: 'Role for invite@test.example' }).click(); await page.getByRole('option', { name: 'Admin', exact: true }).click();
  await page.getByRole('button', { name: 'Actions for invite@test.example' }).click();
  await page.getByRole('menuitem', { name: 'View invitation' }).click(); await page.locator('.ob-dialog[open]').waitFor();
  await page.getByRole('button', { name: 'Close invitation' }).click();
  await page.getByRole('button', { name: 'Invite user', exact: true }).click();
  await page.getByRole('combobox', { name: 'Initial role', exact: true }).click(); await page.getByRole('option', { name: 'Admin', exact: true }).click();
  await page.getByRole('textbox', { name: 'Work email' }).fill('new-admin@test.example');
  await page.getByRole('button', { name: 'Send invite & activation link' }).click(); await page.getByRole('heading', { name: 'Invitation ready to go.' }).waitFor();
  await page.getByRole('button', { name: 'Close invitation' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const theme of ['light', 'dark']) for (const language of ['en', 'ar']) {
    await seed({ theme, language, role: 'ADMIN', completed: true });
    for (const route of ['/admin/users', '/dashboard', '/onboarding', '/activate?invite=invite-test']) {
      await page.goto(base + route); await page.waitForTimeout(250); await measure(route, { width: 390, theme, language });
      if (route === '/onboarding') await page.screenshot({ path: `artifacts/flow-refinements/mobile-${theme}-${language}.png`, fullPage: true });
    }
  }
  await page.goto(base + '/dashboard');
  await page.getByRole('button', { name: 'الإشعارات', exact: true }).click();
  await page.getByRole('tab', { name: 'الحجوزات', exact: true }).click();
  const notificationBounds = await page.locator('.nc-popover').boundingBox();
  assert.ok(notificationBounds.x >= 0 && notificationBounds.x + notificationBounds.width <= 390, 'RTL notification popover overflow');
  const notificationBackground = await page.locator('.nc-popover').evaluate(e => getComputedStyle(e).backgroundColor);
  assert.notEqual(notificationBackground, 'rgb(255, 255, 255)', 'Notification dark surface is white');
  await page.screenshot({ path: 'artifacts/flow-refinements/notifications-dark-ar-mobile.png' });
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1440, height: 768 });
  await seed({ theme: 'dark', language: 'ar', step: 2 }); await page.goto(base + '/onboarding');
  await page.getByRole('combobox', { name: 'الدولة', exact: true }).click();
  await page.getByRole('combobox', { name: 'ابحث عن دولة…' }).fill('مصر');
  await page.getByRole('option', { name: /مصر/ }).waitFor();
  await page.screenshot({ path: 'artifacts/flow-refinements/combobox-dark-ar.png' });
  await page.keyboard.press('Escape');
  await page.locator('.global-language-control button[lang=en]').click();
  await page.getByRole('heading', { name: 'Localization', exact: true }).waitFor();
  assert.equal(await page.locator('.ob-wizard').getAttribute('dir'), 'ltr');
  assert.deepEqual(errors, []); fs.writeFileSync('artifacts/flow-refinements/report.json', JSON.stringify({ errors, results }, null, 2));
  console.log('PASS: theme/language/viewport matrix, readable activation placeholders, searchable datasets and keyboard selection, tag add/remove, persistent toggles, notification filtering/read state, admin roles/action menus/invites, and mobile overflow.');
} catch (error) {
  await page.screenshot({ path: 'artifacts/flow-refinements/failure.png', fullPage: true }).catch(() => {});
  fs.writeFileSync('artifacts/flow-refinements/report.json', JSON.stringify({ errors, results }, null, 2)); throw error;
} finally { await browser.close(); }
