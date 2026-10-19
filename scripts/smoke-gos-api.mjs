import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = (process.env.GOS_API_BASE_URL || 'https://gos-api.vercel.app').replace(/\/$/, '');
const token = process.env.FIREBASE_ID_TOKEN;
if (!token) throw new Error('Set FIREBASE_ID_TOKEN to a current Firebase ID token. The token is never printed or saved.');
async function request(path, body, method = body === undefined ? 'GET' : 'POST', publicRequest = false) {
  const multipart = body instanceof FormData;
  const response = await fetch(`${base}/api/v1${path}`, {
    method, signal: AbortSignal.timeout(45000),
    headers: { Accept: 'application/json', ...(!publicRequest && { Authorization: `Bearer ${token}` }), ...(body !== undefined && !multipart && { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : multipart ? body : JSON.stringify(body),
  });
  const payload = await response.json();
  assert.ok(response.ok && payload.success, `${method} ${path}: ${response.status} ${payload.error?.message || ''}`);
  return payload.data;
}
assert.equal((await request('/health', undefined, 'GET', true)).status, 'ok');
await request('/auth/me'); await request('/auth/verify', {});
console.log('PASS: health and Firebase token verification');
const text = await readFile(new URL('../tests/fixtures/gos-coaching-notes.txt', import.meta.url), 'utf8');
const suffix = new Date().toISOString();
const created = [];
created.push((await request('/ai/sources', { name: `Smoke coaching text ${suffix}`, type: 'text', content: text })).source);
const form = new FormData(); form.append('name', `Smoke coaching file ${suffix}`); form.append('type', 'file'); form.append('file', new Blob([text], { type: 'text/plain' }), 'gos-coaching-notes.txt');
created.push((await request('/ai/sources', form)).source);
for (const source of created) {
  assert.ok(source.id); assert.ok(['queued', 'processing', 'ready'].includes(source.status));
  console.log(`PASS: ${source.type} upload accepted (${source.status})`);
}
const deadline = Date.now() + Number(process.env.GOS_SMOKE_TIMEOUT_MS || 180000);
let ready = false;
while (Date.now() < deadline) {
  const { sources } = await request('/ai/sources');
  const records = created.map(source => sources.find(row => row.id === source.id));
  if (records.some(row => row?.status === 'failed')) throw new Error('A smoke-test source failed indexing. Inspect the API queue worker.');
  if (records.every(row => row?.status === 'ready')) { ready = true; break; }
  await new Promise(resolve => setTimeout(resolve, 3000));
}
assert.ok(ready, 'Sources did not reach ready before timeout. Check the API queue worker and indexing configuration.');
for (const source of created) {
  const detail = (await request(`/ai/sources/${encodeURIComponent(source.id)}`)).source;
  assert.equal(detail.status, 'ready'); assert.ok(detail.chunk_count > 0);
}
console.log('PASS: both sources are listed, ready, and have indexed chunks');
const { test } = await request('/ai/playground', { question: 'Do you have online coaching?' });
assert.equal(test.outcome, 'answered'); assert.ok(test.answer); assert.ok(test.citations.length);
await request(`/ai/playground/${encodeURIComponent(test.id)}/grade`, { verdict: 'correct', note: 'Matched the concrete coaching fixture.' });
await request('/ai/playground'); await request('/ai/assistant'); await request('/inbox/conversations');
console.log('PASS: grounded playground answer, grading, assistant, and inbox reads');
if (process.argv.includes('--inbox')) {
  const marker = crypto.randomUUID();
  const event = { channel: 'whatsapp', external_thread_id: `smoke-thread-${marker}`, external_message_id: `smoke-message-${marker}`, customer_name: 'Smoke test customer', body: 'Do you have online coaching?' };
  const received = await request('/inbox/messages', event);
  assert.ok(['answered', 'paused', 'handoff'].includes(received.outcome));
  if (received.outcome === 'answered') assert.ok(received.reply?.body);
  else assert.equal(received.reply, null);
  assert.equal((await request('/inbox/messages', event)).outcome, 'duplicate');
  const thread = await request(`/inbox/conversations/${encodeURIComponent(received.conversation.id)}`);
  assert.ok(thread.messages.length > 0);
  console.log(`PASS: inbox ingestion (${received.outcome}), duplicate handling, and conversation detail`);
}
// Sources remain available for inspection. Opt in to cleaning up only these test records.
if (process.argv.includes('--cleanup')) for (const source of created) await request(`/ai/sources/${encodeURIComponent(source.id)}`, undefined, 'DELETE');
