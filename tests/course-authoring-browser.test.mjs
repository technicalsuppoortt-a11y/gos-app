import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const fixture = name => new URL(`./fixtures/${name}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-course-authoring', optimizeDeps: { entries: ['tests/fixtures/commerce-save.html'] }, plugins: [react(), {
  name: 'course-test-transports', enforce: 'pre',
  resolveId(source) { if (/backend\/workspace$/.test(source)) return fixture('commerce-save-workspace.ts'); if (source === './reviewRepository') return fixture('commerce-review-transport.ts'); if (source === '@phosphor-icons/react') return '\0course-icons'; },
  load(id) { if (id === '\0course-icons') return 'export const AppleLogo=()=>null, InstagramLogo=()=>null, LinkedinLogo=()=>null, YoutubeLogo=()=>null, TiktokLogo=()=>null;'; },
  transform(source, id) { if (id.replaceAll('\\', '/').endsWith('/src/backend/files.ts')) return source.replace("from './firebase'", "from '/tests/fixtures/commerce-upload-transport.ts'").replace("from 'firebase/storage'", "from '/tests/fixtures/commerce-upload-transport.ts'").replace("from 'firebase/firestore'", "from '/tests/fixtures/commerce-upload-transport.ts'"); },
}], server: { host: '127.0.0.1', port: 0 } });
await server.listen(); let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.FUNNEL_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } }); page.setDefaultTimeout(20000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
  await page.route('https://drive.google.com/**', route => route.fulfill({ contentType: 'text/html', body: 'Drive preview' }));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tests/fixtures/commerce-save.html`);
  await page.waitForFunction(() => !!window.__router);
  await page.evaluate(() => {
    window.YT = { Player: class {
      constructor(node, options) { this.frame = document.createElement('iframe'); this.frame.title = 'YouTube test player'; node.replaceWith(this.frame); setTimeout(() => options.events.onReady({ target: this }), 20); }
      getDuration() { return 98.5; } destroy() { this.frame.remove(); }
    } };
    return window.__router.navigate('/dashboard/products-payments/products/new?type=course');
  });
  const publish = page.getByRole('button', { name: 'Publish Course', exact: true });
  await publish.click();
  await page.locator('.cw-errors').getByRole('button', { name: 'Enter a product name.', exact: true }).waitFor();
  assert.equal(await page.getByLabel('Course Title *', { exact: true }).getAttribute('aria-invalid'), 'true');
  await page.getByLabel('Course Title *', { exact: true }).fill('Practical SaaS Course');
  await page.getByLabel('Full description', { exact: true }).fill('Build and launch a reliable SaaS product.');
  await page.getByRole('button', { name: 'Add Module', exact: true }).click();
  await page.getByRole('button', { name: 'Add Lesson', exact: true }).first().click();
  let dialog = page.getByRole('dialog', { name: 'Add Lesson', exact: true });
  await dialog.getByRole('button', { name: 'Save Lesson', exact: true }).click();
  await dialog.getByText('Enter a lesson title.', { exact: true }).waitFor();
  await dialog.getByLabel('Lesson Title *', { exact: true }).fill('YouTube introduction');
  await dialog.getByRole('combobox', { name: 'Video source', exact: true }).click(); await page.getByRole('option', { name: 'YouTube', exact: true }).click();
  await dialog.getByLabel('Resource URL *', { exact: true }).fill('https://www.youtube.com/watch?v=M7lc1UVf-VE');
  await dialog.getByText('Duration detected automatically', { exact: true }).waitFor();
  assert.equal(await dialog.getByLabel('Duration', { exact: true }).inputValue(), '01:39');
  await dialog.getByRole('button', { name: 'Save Lesson', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Add Lesson', exact: true }).first().click();
  dialog = page.getByRole('dialog', { name: 'Add Lesson', exact: true });
  await dialog.getByLabel('Lesson Title *', { exact: true }).fill('PDF workbook');
  await page.evaluate(() => { window.__cloudUploadReject = true; });
  const attachment = { name: 'workbook.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-workbook-content') };
  await dialog.getByLabel('Attach PDF / Video / ZIP', { exact: true }).setInputFiles(attachment);
  await dialog.getByRole('alert').waitFor();
  assert.equal(await dialog.getByLabel('Lesson Title *', { exact: true }).inputValue(), 'PDF workbook');
  await dialog.getByRole('button', { name: 'Save Lesson', exact: true }).click(); assert.equal(await dialog.isVisible(), true);
  await page.evaluate(() => { window.__cloudUploadReject = false; });
  await dialog.getByLabel('Attach PDF / Video / ZIP', { exact: true }).setInputFiles(attachment);
  await dialog.getByText('File metadata detected automatically', { exact: true }).waitFor();
  assert.equal(await dialog.getByLabel('File size', { exact: true }).inputValue(), `${attachment.buffer.length} B`);
  assert.match(await dialog.getByLabel('Resource URL *', { exact: true }).inputValue(), /^https:\/\/storage.example.test\//);
  await dialog.getByRole('button', { name: 'Save Lesson', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Add Lesson', exact: true }).first().click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Attach PDF / Video / ZIP', { exact: true }).setInputFiles({ name: 'resources.zip', mimeType: 'application/zip', buffer: Buffer.from('ZIP-demo') });
  await dialog.getByText('File metadata detected automatically', { exact: true }).waitFor();
  assert.equal(await dialog.getByLabel('Lesson Title *', { exact: true }).inputValue(), 'resources');
  await dialog.getByRole('button', { name: 'Save Lesson', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Add Lesson', exact: true }).first().click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Lesson Title *', { exact: true }).fill('Drive workshop');
  await dialog.getByRole('combobox', { name: 'Video source', exact: true }).click(); await page.getByRole('option', { name: 'Google Drive', exact: true }).click();
  await dialog.getByLabel('Resource URL *', { exact: true }).fill('https://drive.google.com/file/d/drive-file-id/view');
  assert.equal(await dialog.locator('iframe').getAttribute('src'), 'https://drive.google.com/file/d/drive-file-id/preview');
  await dialog.getByRole('button', { name: 'Save Lesson', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
  const localVideo = await page.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 96; canvas.height = 64;
    const stream = canvas.captureStream(15), mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType }), chunks = [];
    const blob = await new Promise(resolve => {
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType })); recorder.start();
      let frame = 0; const timer = setInterval(() => { const ctx = canvas.getContext('2d'); ctx.fillStyle = frame % 2 ? '#635bff' : '#ffffff'; ctx.fillRect(0, 0, 96, 64); if (++frame === 15) { clearInterval(timer); recorder.stop(); stream.getTracks().forEach(track => track.stop()); } }, 80);
    });
    return { bytes: Array.from(new Uint8Array(await blob.arrayBuffer())), mimeType, name: mimeType === 'video/mp4' ? 'local-video.mp4' : 'local-video.webm' };
  });
  await page.getByRole('button', { name: 'Add Lesson', exact: true }).first().click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Video source', exact: true }).click(); await page.getByRole('option', { name: 'Local Video Upload', exact: true }).click();
  await dialog.getByLabel('Attach PDF / Video / ZIP', { exact: true }).setInputFiles({ name: localVideo.name, mimeType: localVideo.mimeType, buffer: Buffer.from(localVideo.bytes) });
  await dialog.getByText('File metadata detected automatically', { exact: true }).waitFor();
  assert.match(await dialog.getByLabel('Duration', { exact: true }).inputValue(), /^\d+:\d{2}$/);
  await dialog.getByRole('button', { name: 'Save Lesson', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
  const tags = page.getByRole('combobox', { name: 'Tags / Keywords', exact: true });
  await tags.fill('Marketing'); await tags.press('Enter'); await tags.fill('marketing,');
  assert.equal(await page.getByRole('button', { name: 'Remove tag Marketing', exact: true }).count(), 1);
  await tags.fill('Des'); await tags.press('ArrowDown'); await tags.press('Enter');
  await page.getByRole('button', { name: 'Remove tag Design', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Remove tag Marketing', exact: true }).click();
  await tags.fill('Business,Analytics,');
  await publish.click();
  await page.waitForFunction(() => window.__writes.some(write => JSON.parse(write.value)?.some?.(p => p.name === 'Practical SaaS Course' && p.status === 'Active')));
  const product = await page.evaluate(() => window.__writes.map(write => JSON.parse(write.value)).flat().findLast(p => p.name === 'Practical SaaS Course'));
  const lessons = product.config.modules[0].lessons;
  assert.equal(lessons.length, 5); assert.equal(lessons[0].durationSeconds, 98.5); assert.equal(lessons[1].size, attachment.buffer.length); assert.equal(lessons[2].kind, 'File'); assert.equal(lessons[3].videoSource, 'Google Drive'); assert.ok(lessons[4].durationSeconds > 0);
  assert.deepEqual(product.config.experience.tags, ['Design', 'Business', 'Analytics']); assert.ok(lessons.every(lesson => !lesson.storageId?.startsWith('local-')));
  assert.equal(await page.getByText(/Local attachments are available only/).count(), 0);
  await page.waitForFunction(() => /\/products\/product-.+\/edit$/.test(window.__router.state.location.pathname));
  await page.evaluate(product => { const broken = structuredClone(product); broken.config.modules[0].lessons[0].url = ''; broken.config.modules[0].lessons[0].title = 'Missing source lesson'; window.__seed('gos-commerce-products-v1:tenant-qa', [broken]); }, product);
  await page.locator('.course-lesson-title').filter({ hasText: 'Missing source lesson' }).waitFor();
  await publish.click();
  await page.locator('.cw-errors').getByRole('button', { name: 'Lesson 1.1: Add a resource URL or upload a file.', exact: true }).waitFor();
  assert.equal(await page.locator('.course-lesson-row.dv-invalid').count(), 1);
  await page.locator('.course-lesson-title').first().click();
  dialog = page.getByRole('dialog', { name: 'Edit Lesson', exact: true });
  await dialog.getByLabel('Resource URL *', { exact: true }).fill('https://www.youtube.com/watch?v=M7lc1UVf-VE');
  await dialog.getByText('Duration detected automatically', { exact: true }).waitFor();
  await dialog.getByRole('button', { name: 'Save Lesson', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
  await page.locator('.cw-errors').waitFor({ state: 'hidden' });
  await publish.click(); await page.waitForFunction(() => window.__writes.length >= 2);
  await page.setViewportSize({ width: 390, height: 844 });
  if (process.env.COURSE_SCREENSHOT) await page.screenshot({ path: process.env.COURSE_SCREENSHOT, fullPage: true });
  assert.deepEqual(errors, []);
  console.log('Course authoring passed: required fields, YouTube metadata, Drive preview, PDF/ZIP cloud uploads and retries, tags, persistence, and publish.');
} finally { await browser?.close(); await server.close(); }
