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
  cacheDir: 'node_modules/.vite-booking-visitor',
  plugins: [
    react(),
    {
      name: 'visitor-test-backend',
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
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**', route =>
    route.fulfill({ contentType: 'text/css', body: '' })
  );
  await page.addInitScript(() => {
    localStorage.setItem('i18nextLng', 'en');
  });
  const url = `http://127.0.0.1:${server.httpServer.address().port}/tests/fixtures/booking-visitor.html`;

  const visit = async query => {
    await page.goto(url + query, { waitUntil: 'domcontentloaded' });
    await page.locator('.bk-date-grid button:not(:disabled)').first().waitFor();
  };
  const details = async () => {
    await page.locator('.bk-date-grid button:not(:disabled)').first().click();
    await page.locator('.bk-slot-list button:not(:disabled)').first().waitFor();
    await page.locator('.bk-slot-list button:not(:disabled)').first().click();
    await page.getByRole('button', { name: /Continue/ }).click();
    await page.getByRole('heading', { name: 'Your details' }).waitFor();
  };
  const fill = async () => {
    await page.getByLabel('Name', { exact: false }).first().fill('Returning Visitor');
    await page.locator('#question-email').fill('visitor@example.com');
    await page.locator('#question-whatsapp').fill('+201234567890');
    await page.locator('#question-company').fill('Visitor Co');
  };
  const confirm = async () => {
    await page.getByRole('button', { name: 'Confirm booking', exact: true }).click();
    await page.locator('.bk-public-success').waitFor();
  };

  await visit('?another=off');
  await details();
  await fill();
  await confirm();
  assert.equal(await page.getByRole('link', { name: 'Book another appointment', exact: true }).count(), 0);
  assert.equal(await page.getByRole('link', { name: 'Go to Dashboard', exact: true }).count(), 1);

  await visit('');
  await details();
  assert.equal(await page.locator('#question-name').inputValue(), 'Returning Visitor');
  assert.equal(await page.locator('#question-email').inputValue(), 'visitor@example.com');
  assert.equal(await page.locator('#question-whatsapp').inputValue(), '+201234567890');
  assert.equal(await page.locator('#question-company').inputValue(), 'Visitor Co');
  await page.locator('#question-name').fill('Edited Visitor');
  await confirm();
  await page.getByRole('link', { name: 'Book another appointment', exact: true }).click();
  await details();
  assert.equal(await page.locator('#question-name').inputValue(), 'Edited Visitor');

  await visit('?prefill=off');
  await details();
  for (const field of ['name', 'email', 'whatsapp', 'company']) {
    assert.equal(await page.locator('#question-' + field).inputValue(), '');
  }
  await fill();
  await page.locator('#question-name').fill('Do not remember');
  await confirm();
  assert.equal(
    await page.evaluate(() => JSON.parse(localStorage.getItem('gos.booking.prefill.visitor-calendar')).name),
    'Edited Visitor'
  );

  await visit('?page=other-calendar');
  await details();
  assert.equal(await page.locator('#question-email').inputValue(), '');

  await page.evaluate(() => localStorage.setItem('gos.booking.prefill.visitor-calendar', '{broken'));
  await visit('');
  await details();
  assert.equal(await page.locator('#question-name').inputValue(), '');

  await visit('?fail');
  await details();
  await fill();
  await page.getByRole('button', { name: 'Confirm booking', exact: true }).click();
  await page.getByRole('alert').waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('gos.booking.prefill.visitor-calendar')), '{broken');

  await visit('?page=split-calendar&split');
  await details();
  await page.getByLabel(/First name/).fill('Split');
  await page.getByLabel(/Last name/).fill('Visitor');
  await page.locator('#question-email').fill('split@example.com');
  await page.locator('#question-whatsapp').fill('+201234567890');
  await confirm();
  await visit('?page=split-calendar&split');
  await details();
  assert.equal(await page.getByLabel(/First name/).inputValue(), 'Split');
  assert.equal(await page.getByLabel(/Last name/).inputValue(), 'Visitor');

  await visit('?page=phone-calendar&phone');
  await details();
  await fill();
  await page.getByLabel('Phone number for this call', { exact: true }).fill('+209876543210');
  await confirm();
  await visit('?page=phone-calendar&phone');
  await details();
  assert.equal(await page.getByLabel('Phone number for this call', { exact: true }).inputValue(), '+209876543210');

  await visit('?page=blocked-calendar');
  await details();
  await fill();
  await page.evaluate(() =>
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('Storage blocked');
      },
    })
  );
  await confirm();
  await page.getByRole('link', { name: 'Book another appointment', exact: true }).click();
  await details();
  assert.equal(await page.locator('#question-email').inputValue(), 'visitor@example.com');

  // Screening inside "Your details" (no Quick questions step; 3 steps: Date & time -> Your details -> Confirmation)
  await page.setViewportSize({ width: 390, height: 844 });
  await visit('?screening');
  assert.equal(await page.getByRole('heading', { name: 'Before you book' }).count(), 0);
  assert.equal(await page.locator('.bk-wizard-steps span').count(), 3);
  await details();
  await fill();
  await page.locator('#question-budget').fill('1499');
  await page.locator('#question-scope').click();
  await page.getByRole('option', { name: 'Strategy', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm booking', exact: true }).click();
  await page.getByRole('heading', { name: 'Thank you for your interest' }).waitFor();
  assert.equal(await page.locator('.bk-date-grid').count(), 0);
  assert.deepEqual(
    await page.evaluate(() => [
      window.__bookings.length,
      window.__bookMeetingCount,
      window.__pendingLeads?.length ?? 0,
      window.__pendingLeads?.[0]?.bookingStatus,
    ]),
    [0, 0, 1, 'Pending Booking']
  );

  // Qualifying submission books normally and does not persist screening answers into prefill
  await visit('?screening');
  await details();
  await fill();
  await page.locator('#question-budget').fill('1500');
  await page.locator('#question-scope').click();
  await page.getByRole('option', { name: 'Strategy', exact: true }).click();
  await confirm();
  assert.deepEqual(await page.evaluate(() => [window.__bookings.length, window.__bookMeetingCount]), [1, 1]);
  await page.getByRole('link', { name: 'Book another appointment', exact: true }).click();
  await details();
  assert.equal(await page.locator('#question-budget').inputValue(), '');

  // Builder: Lead qualification is integrated directly inside "Booking form & questions"
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(url + '?builder', { waitUntil: 'domcontentloaded' });
  assert.equal(await page.getByRole('button', { name: /Lead qualification/ }).count(), 0);
  await page.getByRole('button', { name: /Booking form & questions/ }).click();
  await page.getByRole('button', { name: 'Add screening question', exact: true }).click();
  await page.getByPlaceholder('e.g. What is your monthly marketing budget?').fill('What is your budget?');
  await page.getByRole('combobox', { name: 'Rule type', exact: true }).click();
  await page.getByRole('option', { name: 'Minimum amount', exact: true }).click();
  await page.getByLabel('Minimum accepted amount', { exact: true }).fill('2500');
  await page.getByRole('button', { name: 'Save question', exact: true }).click();

  const preview = page.frameLocator('iframe[title="Booking page preview"]');
  await preview.locator('.bk-date-grid button:not(:disabled)').first().click();
  await preview.locator('.bk-slot-list button:not(:disabled)').first().click();
  await preview.getByRole('button', { name: /Continue/ }).click();
  await preview.getByLabel(/What is your budget\?/).waitFor();
  await page.getByRole('button', { name: 'Save changes', exact: true }).first().click();
  await page.waitForFunction(() => window.__bookingPage.qualificationQuestions?.[0]?.minimum === 2500);

  // Arabic RTL & English LTR layout parity
  await page.goto(url + '?screening', { waitUntil: 'domcontentloaded' });
  await page.locator('.bk-date-grid button:not(:disabled)').first().waitFor();
  const layout = () =>
    page.locator('.bk-public').evaluate(main => {
      const bounds = selector => main.querySelector(selector).getBoundingClientRect();
      return {
        dir: main.dir,
        sidebarOnRight: bounds('.bk-public-details').left > bounds('.bk-public-wizard').left,
        firstStepOnRight:
          bounds('.bk-wizard-steps span:first-child').left >
          bounds('.bk-wizard-steps span:last-child').left,
      };
    });
  assert.equal((await layout()).sidebarOnRight, false);
  await page.evaluate(() => window.__setBookingLanguage('ar'));
  await page.locator('.bk-public[dir=rtl]').waitFor();
  assert.deepEqual(await layout(), { dir: 'rtl', sidebarOnRight: true, firstStepOnRight: true });
  await page.evaluate(() => window.__setBookingLanguage('en'));
  await page.locator('.bk-public[dir=ltr]').waitFor();

  await page.goto(url + '?screening&arabic-calendar', { waitUntil: 'domcontentloaded' });
  await page.locator('.bk-public[dir=rtl]').waitFor();
  assert.equal((await layout()).sidebarOnRight, true);

  await page.setViewportSize({ width: 320, height: 760 });
  assert.equal(
    await page.locator('.bk-public-grid').evaluate(grid => grid.scrollWidth <= grid.clientWidth + 1),
    true
  );

  assert.deepEqual(errors, []);
  console.log(
    'PASS: visitor prefill, booking confirmation, inline screening + Pending Booking lead capture, builder form screening integration, and Arabic/English layout.'
  );
} catch (error) {
  console.error(error);
  throw error;
} finally {
  await browser?.close();
  await server.close();
}
