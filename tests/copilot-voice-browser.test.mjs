import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/Dell/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');
const transportId = '\0copilot-voice-test-transport';
const gosId = '\0copilot-voice-test-gos';
const server = await createServer({
  configFile: false,
  cacheDir: 'node_modules/.vite-copilot-voice-test',
  server: { host: '127.0.0.1', port: 0, hmr: false },
  plugins: [react(), {
    name: 'copilot-voice-test',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source === './firebase' && importer?.endsWith('/copilotVoice.ts')) return transportId;
      if (source === '../backend/gosApi' && importer?.endsWith('/AICopilot.tsx')) return gosId;
    },
    load(id) {
      if (id === gosId) return `export const gosApi = {
        copilotConversations: async () => ({conversations: []}),
        copilot: async request => {
          window.textRequests.push(request);
          return {text: 'Follow-up delivered.'};
        }
      };`;
      if (id === transportId) return `export async function callBackend(name, data) {
        window.voiceRequests.push({name, ...data});
        if (name === 'transcribeCopilotVoice') {
          if (window.voiceRequests.filter(request => request.name === name).length === 1) throw new Error('Transcription failed. Try again.');
          await new Promise(resolve => { window.finishTranscription = resolve; });
          return { transcript: 'Call Sara on Friday.' };
        }
        if (window.voiceRequests.length === 1) throw new Error('Try the recording again.');
        const summary = 'Sara needs a strategy consultation.';
        return {
          user: {id: data.requestId, role: 'user', text: data.focus, transcript: 'Sara needs a strategy consultation. Call her Friday.'},
          assistant: {id: data.requestId + '-result', role: 'assistant', text: summary, voiceExtraction: {
            summary, intent: 'Book a call', clientDetails: [{label:'Name', value:'Sara'}], parameters: [],
            actionItems: [{task:'Call Sara', owner: null, due:'Friday'}],
          }},
        };
      }`;
    },
    configureServer(vite) {
      vite.middlewares.use('/__copilot-voice', async (_request, response) => {
        response.setHeader('Content-Type', 'text/html');
        response.end(await vite.transformIndexHtml('/__copilot-voice', `<!doctype html><meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1"><div id="root" style="height:100vh"></div>
          <script type="module">
          import React from 'react'; import {createRoot} from 'react-dom/client';
          import {Provider} from 'react-redux'; import {MemoryRouter} from 'react-router-dom';
          import {store} from '/src/store/index.ts'; import {AICopilot} from '/src/pages/AICopilot.tsx'; import '/src/index.css';
          window.voiceRequests = []; window.textRequests = [];
          createRoot(document.getElementById('root')).render(React.createElement(Provider, {store},
            React.createElement(MemoryRouter, null, React.createElement(AICopilot))));
          </script>`));
      });
    },
  }],
});
await server.listen();
let browser;
try {
  browser = await chromium.launch({
    executablePath: process.env.FUNNEL_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  page.setDefaultTimeout(15_000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ body: '', contentType: 'text/css' }));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__copilot-voice`);
  const input = page.locator('input[type=file]');
  const sendVoice = page.getByRole('button', { name: 'Extract voice note' });
  await input.setInputFiles({ name: 'note.webm', mimeType: 'audio/webm', buffer: Buffer.from('test audio') });
  await page.getByRole('textbox', { name: 'Ask the AI Copilot' }).fill('Find follow-ups');
  await sendVoice.click();
  await page.getByRole('alert').getByText('Try the recording again.').waitFor();
  await sendVoice.click();
  await page.getByText('Voice note extraction', { exact: true }).waitFor();
  await page.getByText('Call Sara', { exact: false }).first().waitFor();
  await page.getByText('Transcript', { exact: true }).click();
  await page.getByText('Sara needs a strategy consultation. Call her Friday.', { exact: true }).waitFor();
  const [first, retry] = await page.evaluate(() => window.voiceRequests);
  assert.deepEqual(retry, first);
  assert.equal(first.name, 'extractCopilotVoice');
  assert.equal(first.focus, 'Find follow-ups');
  assert.equal(Buffer.from(first.audio, 'base64').toString(), 'test audio');
  await page.getByRole('textbox', { name: 'Ask the AI Copilot' }).fill('When should I call?');
  await page.getByRole('button', { name: 'Send prompt' }).click();
  await page.getByText('Follow-up delivered.', { exact: true }).waitFor();
  const [followup] = await page.evaluate(() => window.textRequests);
  assert.equal(followup.conversationId, first.conversationId);
  assert.match(followup.text, /When should I call\?[\s\S]+Call her Friday/);

  await page.getByRole('button', { name: 'Start voice recording' }).click();
  await page.getByText('Recording voice note', { exact: true }).waitFor();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Stop voice recording' }).click();
  await sendVoice.click();
  await page.getByText('Voice note extraction', { exact: true }).nth(1).waitFor();
  assert.ok(await page.evaluate(() => window.voiceRequests[2].audio.length > 0));

  await page.getByRole('button', { name: 'New chat' }).click();
  await page.getByRole('button', { name: 'Start voice recording' }).click();
  await page.getByText('Recording voice note', { exact: true }).waitFor();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Stop voice recording' }).click();
  const transcribe = page.getByRole('button', { name: 'Transcribe', exact: true });
  const composer = page.getByRole('textbox', { name: 'Ask the AI Copilot' });
  await composer.fill('Follow-up draft');
  await transcribe.click();
  await page.getByRole('alert').filter({ hasText: 'Transcription failed. Try again.' }).waitFor();
  assert.equal(await composer.inputValue(), 'Follow-up draft');
  await transcribe.click();
  const loading = page.getByRole('button', { name: 'Transcribing…' });
  await loading.waitFor();
  assert.equal(await loading.isDisabled(), true);
  await composer.fill('Updated while waiting');
  await composer.press('Enter');
  assert.equal(await page.evaluate(() => window.textRequests.length), 1);
  await page.waitForFunction(() => !!window.finishTranscription);
  await page.evaluate(() => window.finishTranscription());
  await page.waitForFunction(() => document.querySelector('.ai-composer textarea').value === 'Updated while waiting\n\nCall Sara on Friday.');
  assert.equal(await composer.evaluate(input => document.activeElement === input), true);
  assert.equal(await page.locator('.ai-attachment-preview').count(), 0);
  assert.equal(await page.locator('.ai-message').count(), 0);
  const [transcription, transcriptionRetry] = await page.evaluate(() => window.voiceRequests.slice(3));
  assert.deepEqual(transcriptionRetry, transcription);
  assert.equal(transcription.name, 'transcribeCopilotVoice');
  assert.equal(transcription.conversationId, undefined);
  await composer.fill('Call Sara on Monday.');
  await page.getByRole('button', { name: 'Send prompt' }).click();
  await page.getByText('Follow-up delivered.', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.textRequests.at(-1).text), 'Call Sara on Monday.');
  assert.equal(await page.evaluate(() => window.voiceRequests.length), 5);
  assert.deepEqual(errors, []);
  console.log('PASS: Copilot audio extraction and transcription into an editable draft, including retry and standard text send.');
} finally {
  await browser?.close();
  await server.close();
}
