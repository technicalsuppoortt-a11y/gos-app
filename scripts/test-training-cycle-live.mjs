import { mkdir, writeFile } from 'node:fs/promises';

// Set FIREBASE_ID_TOKEN in the process environment; credentials are never saved.
const token = process.env.FIREBASE_ID_TOKEN;
const base = 'https://api.upklick.net/api/v1';
const rows = [];
const marker = crypto.randomUUID();
let sourceId = marker, sessionId = marker;
async function check(name, method, path, body) {
  const started = Date.now();
  try {
    const multipart = body instanceof FormData;
    const response = await fetch(`${base}${path}`, {
      method, signal: AbortSignal.timeout(45000),
      headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body && !multipart ? { 'Content-Type': 'application/json' } : {}) },
      body: body === undefined ? undefined : multipart ? body : JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null);
    rows.push({ name, method, path, status: response.status, elapsed_ms: Date.now() - started, success: response.ok && payload?.success !== false, message: payload?.error?.message ?? payload?.message ?? '' });
    console.log(`${name}: HTTP ${response.status}`);
    return response.ok ? payload?.data : undefined;
  } catch (error) {
    rows.push({ name, method, path, status: null, success: false, message: error.message, cause: error.cause?.code });
    console.log(`${name}: NETWORK ERROR (${error.cause?.code ?? error.message})`);
  }
}
const form = new FormData();
form.append('name', `Training cycle QA file ${marker}`); form.append('type', 'file');
form.append('file', new Blob(['QA support hours: Sunday to Thursday, 9am to 5pm.'], { type: 'text/plain' }), 'training-cycle-qa.txt');
await check('Upload file', 'POST', '/ai/sources', form);
const text = await check('Upload text', 'POST', '/ai/sources', { name: `Training cycle QA text ${marker}`, type: 'text', content: 'QA support hours: Sunday to Thursday, 9am to 5pm.' });
sourceId = text?.source?.id ?? sourceId;
await check('Crawl website', 'POST', '/ai/sources', { name: `Training cycle QA URL ${marker}`, type: 'url', url: 'https://example.com' });
await check('Overall training progress', 'GET', '/ai/training');
await check('Individual source progress', 'GET', `/ai/sources/${encodeURIComponent(sourceId)}`);
const test = await check('Start playground session', 'POST', '/ai/playground', { question: 'What are the support hours?', channel: 'webchat', city: 'Cairo' });
sessionId = test?.session_id ?? test?.test?.session_id ?? test?.test?.id ?? sessionId;
await check('Continue playground session', 'POST', '/ai/playground', { session_id: sessionId, source_id: sourceId, question: 'Is support available on Sunday?' });
await check('Read connected channels', 'GET', '/ai/channels');
const original = token ? await check('Read assistant before live test', 'GET', '/ai/assistant') : undefined;
try {
  await check('Enable webchat channel', 'PUT', '/ai/channels/webchat', { enabled: true });
  await check('Enable live replies', 'PUT', '/ai/assistant', { live_enabled: true, channels: { ...original?.assistant?.channels, webchat: true } });
  await check('Ingest live customer message', 'POST', '/inbox/messages', { channel: 'webchat', external_thread_id: `training-qa-${marker}`, external_message_id: marker, customer_name: 'Training cycle QA customer', body: 'What are the support hours?' });
} finally {
  if (original?.assistant) {
    await check('Restore webchat setting', 'PUT', '/ai/channels/webchat', { enabled: !!original.assistant.channels.webchat });
    await check('Restore assistant settings', 'PUT', '/ai/assistant', original.assistant);
  }
}
await mkdir('reports', { recursive: true });
await writeFile('reports/training-cycle-live.json', JSON.stringify({ tested_at: new Date().toISOString(), base, authenticated: !!token, source_id_is_placeholder: !text?.source?.id, session_id_is_placeholder: !(test?.session_id ?? test?.test?.session_id), rows }, null, 2) + '\n');
if (rows.some(row => !row.success)) process.exitCode = 1;
