import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE ||
    'C:/Users/Dell/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core'
);
const backend = new URL('./fixtures/booking-visitor-backend.ts', import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  '$1'
);

const server = await createServer({
  configFile: false,
  cacheDir: 'node_modules/.vite-booking-parity',
  plugins: [
    react(),
    {
      name: 'booking-backend',
      enforce: 'pre',
      resolveId(source, importer) {
        if (
          importer?.replaceAll('\\', '/').endsWith('/src/pages/booking/PublicBookingPage.tsx') &&
          ['../../backend/firebase', '../../backend/marketingTracking'].includes(source)
        ) {
          return backend;
        }
      },
    },
  ],
  server: { host: '127.0.0.1', port: 0, hmr: false },
});

await server.listen();
let browser;
try {
  browser = await chromium.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
  });
  const context = await browser.newContext();
  await context.route('https://fonts.googleapis.com/**', route =>
    route.fulfill({ contentType: 'text/css', body: '' })
  );
  await context.addInitScript(() => localStorage.setItem('i18nextLng', 'en'));
  const published = await context.newPage(),
    editor = await context.newPage();
  const errors = [];
  for (const page of [published, editor]) page.on('pageerror', e => errors.push(e.message));
  await editor.setViewportSize({ width: 1440, height: 1000 });
  const url = `http://127.0.0.1:${server.httpServer.address().port}/tests/fixtures/booking-visitor.html`;
  await editor.goto(url + '?preview');
  const preview = editor.frameLocator('iframe[title="Booking page preview"]');

  const snapshot = async scope =>
    scope.locator('.bk-public').evaluate(root => {
      const selectors = [
        '.bk-public-brand',
        '.bk-public-grid',
        '.bk-public-details',
        '.bk-public-wizard',
        '.bk-wizard-steps',
        '.bk-month-nav',
        '.bk-date-grid',
        '.bk-slot-layout',
        '.bk-slot-list',
        '.bk-next',
      ];
      return selectors.map(selector => {
        const e = root.querySelector(selector),
          s = getComputedStyle(e),
          r = e.getBoundingClientRect();
        return {
          selector,
          width: Math.round(r.width),
          display: s.display,
          columns: s.gridTemplateColumns,
          gap: s.gap,
          padding: s.padding,
          font: s.fontSize,
          color: s.color,
          background: s.backgroundColor,
          border: s.borderRadius,
        };
      });
    });

  for (const mobile of [false, true]) {
    if (mobile) await editor.getByRole('button', { name: 'Mobile preview', exact: true }).click();
    await published.setViewportSize({ width: mobile ? 390 : 1040, height: mobile ? 844 : 800 });
    await published.goto(url);
    await preview.locator('.bk-date-grid button:not(:disabled)').first().waitFor();
    await published.locator('.bk-date-grid button:not(:disabled)').first().waitFor();

    for (const dark of [false, true]) {
      for (const p of [published, editor]) {
        await p.evaluate(isDark => document.documentElement.classList.toggle('dark', isDark), dark);
      }
      await editor.waitForTimeout(100);
      assert.deepEqual(
        await snapshot(preview),
        await snapshot(published),
        `Style parity (${mobile ? 'mobile-step-1' : 'desktop'}, ${dark ? 'dark' : 'light'})`
      );
    }

    await preview.locator('.bk-date-grid button:not(:disabled)').first().click();
    await published.locator('.bk-date-grid button:not(:disabled)').first().click();

    if (mobile) {
      // On mobile, clicking a date transitions to Step 2 (Slots card) with Back button & date banner
      await preview.locator('.bk-mobile-date-banner').waitFor();
      await published.locator('.bk-mobile-date-banner').waitFor();
      assert.deepEqual(
        await snapshot(preview),
        await snapshot(published),
        'Style parity on mobile Step 2 (time slots)'
      );
      // Verify Back returns to calendar step and date click advances again
      await preview.locator('.bk-mobile-back').click();
      await preview.locator('.bk-date-grid button:not(:disabled)').first().waitFor();
      await preview.locator('.bk-date-grid button:not(:disabled)').first().click();
    }

    await preview.getByRole('combobox').first().click();
    await preview.locator('.bk-select-content').waitFor();
    assert.equal(await preview.locator('.bk-select-option[data-state="checked"]').count(), 1);
    await editor.keyboard.press('Escape');

    await preview.locator('.bk-slot-list button:not(:disabled)').first().click();
    await preview.getByRole('button', { name: /Continue/ }).click();
    await preview.locator('#question-name').waitFor();
    assert.equal(await preview.locator('.bk-extra-details').count(), 1);
    await preview.locator('#question-name').fill('Preview Visitor');
    await preview.locator('#question-email').fill('preview@example.com');
    await preview.locator('#question-whatsapp').fill('+201234567890');
    await preview.getByRole('button', { name: 'Confirm booking', exact: true }).click();
    await preview.locator('.bk-public-success dl').waitFor();
    assert.equal(await editor.evaluate(() => window.__bookings.length), 0, 'Preview never saves a booking');
    await preview.getByRole('button', { name: 'Back to calendar', exact: true }).click();
  }

  for (const width of [320, 390, 600, 760]) {
    await published.setViewportSize({ width, height: 844 });
    await published.goto(url);
    await published.locator('.bk-date-grid button:not(:disabled)').first().waitFor();
    const step1Overflow = await published.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      overflow: [...document.querySelectorAll('body *')]
        .filter(n => n.getBoundingClientRect().right > innerWidth + 1)
        .map(n => ({ name: n.className, width: n.getBoundingClientRect().width }))
        .slice(0, 10),
    }));
    assert.ok(step1Overflow.scrollWidth <= width + 1, JSON.stringify({ width, step: 'calendar', ...step1Overflow }));

    await published.locator('.bk-date-grid button:not(:disabled)').first().click();
    await published.locator('.bk-slot-list button:not(:disabled)').first().waitFor();
    const step2Overflow = await published.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      overflow: [...document.querySelectorAll('body *')]
        .filter(n => n.getBoundingClientRect().right > innerWidth + 1)
        .map(n => ({ name: n.className, width: n.getBoundingClientRect().width }))
        .slice(0, 10),
    }));
    assert.ok(step2Overflow.scrollWidth <= width + 1, JSON.stringify({ width, step: 'slots', ...step2Overflow }));
    await published.locator('.bk-next').scrollIntoViewIfNeeded();
  }

  for (const width of [1440, 390]) {
    await editor.setViewportSize({ width, height: 844 });
    await editor.waitForFunction(() => {
      const viewport = document.querySelector('.bk-preview-scroll'),
        frame = document.querySelector('.bk-preview-frame');
      const v = viewport.getBoundingClientRect(),
        f = frame.getBoundingClientRect();
      return (
        f.width > 0 &&
        f.left >= v.left - 1 &&
        f.right <= v.right + 1 &&
        f.top >= v.top - 1 &&
        f.bottom <= v.bottom + 1
      );
    });
  }

  assert.deepEqual(errors, []);
  console.log(
    'PASS: published/preview Koalendar style parity in desktop/mobile and light/dark; mobile step-by-step calendar -> slots -> details; zero horizontal overflow at 320-760px.'
  );
} finally {
  await browser?.close();
  await server.close();
}
