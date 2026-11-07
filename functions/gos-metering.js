import { createHash, randomUUID } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';
import { consumeCredits, executeUsage, toHttpsError } from './billing-service.js';
import { copilotAction } from './credit-actions.js';

const playground = { path: '/ai/playground', fields: ['question', 'channel', 'city', 'session_id', 'source_id'] };
const actions = {
  copilot: { path: '/ai/copilot', permission: 'copilot', tool: 'ai-copilot', fields: ['text', 'conversationId', 'webSearch', 'deepResearch'], credit: copilotAction },
  playground: { ...playground, permission: 'follow-up', tool: 'ai-followup', credit: () => 'playground_test' },
  inboxSmartReply: { ...playground, permission: 'inbox', tool: 'unified-inbox', credit: () => 'inbox_smart_reply' },
  inboxSimulation: { path: '/inbox/messages', permission: 'inbox', tool: 'unified-inbox', fields: ['body', 'channel', 'external_thread_id', 'external_message_id', 'customer_name', 'phone'], credit: () => 'inbox_simulation' },
  source: { path: '/ai/sources', permission: 'follow-up', tool: 'ai-followup' },
  liveEnable: { path: '/ai/assistant', permission: 'follow-up', tool: 'ai-followup' },
};

const MAX_FILE_BYTES = 20 * 1024 * 1024;

function sourceRequest({ type, name, content, url, file }) {
  if (typeof name !== 'string' || !name.trim() || name.length > 250) throw new HttpsError('invalid-argument', 'Enter a source name.');
  if (type === 'file') {
    if (typeof file?.name !== 'string' || !/\.(pdf|docx|csv|txt|md|json)$/i.test(file.name) || file.name.length > 250 ||
        typeof file.data !== 'string' || file.data.length > Math.ceil(MAX_FILE_BYTES / 3) * 4) {
      throw new HttpsError('invalid-argument', 'Choose a supported knowledge file up to 20 MB.');
    }
    const bytes = Buffer.from(file.data, 'base64');
    if (!bytes.length || bytes.length > MAX_FILE_BYTES || bytes.toString('base64') !== file.data) throw new HttpsError('invalid-argument', 'The knowledge file could not be read.');
    const body = new FormData();
    body.append('name', name.trim());
    body.append('type', 'file');
    body.append('file', new Blob([bytes], { type: typeof file.mime === 'string' ? file.mime.slice(0, 200) : '' }), file.name);
    return { body, action: 'knowledge_file_upload' };
  }
  if (type === 'url') {
    const link = typeof url === 'string' && url.length <= 4000 ? URL.parse(url) : null;
    if (!link || !['https:', 'http:'].includes(link.protocol) || link.username || link.password) throw new HttpsError('invalid-argument', 'Enter a valid website URL.');
    return { body: JSON.stringify({ type, name: name.trim(), url: link.href }), action: 'knowledge_url_crawl' };
  }
  if (!['text', 'instructions', 'faq', 'products'].includes(type) || typeof content !== 'string' || !content.trim() || content.length > MAX_FILE_BYTES) {
    throw new HttpsError('invalid-argument', 'Enter valid knowledge source content.');
  }
  return { body: JSON.stringify({ type, name: name.trim(), content }), action: 'knowledge_text' };
}

export async function chargeAction(db, user, action, tool, { idempotencyKey = randomUUID(), quantity, allowDuplicate = false } = {}) {
  const result = await consumeCredits(db, { subscriberId: user.uid, action, tool, quantity, idempotencyKey });
  if (result.duplicate && !allowDuplicate) throw new HttpsError('already-exists', 'This request was already processed. Refresh to see the result, or start a new request.');
  return result;
}

export async function meteredGosRequest(request, { db, workspace, baseUrl, gatewaySecret, fetcher = fetch }) {
  const { action, payload } = request.data ?? {};
  if (typeof action !== 'string' || !Object.hasOwn(actions, action) || !payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new HttpsError('invalid-argument', 'Choose a supported AI action.');
  }
  const route = actions[action];
  const { user } = await workspace(request, route.permission);
  const authorization = request.rawRequest.headers.authorization;
  if (typeof authorization !== 'string') throw new HttpsError('unauthenticated', 'Sign in to continue.');
  let body, credit, idempotencyKey;
  if (action === 'liveEnable') {
    if (!gatewaySecret) throw new HttpsError('failed-precondition', 'Live replies require a connected billing integration. Contact your administrator.');
    const channels = payload.channels;
    if (payload.live_enabled !== true || channels !== undefined && (!channels || typeof channels !== 'object' || Array.isArray(channels) ||
        Object.entries(channels).length > 20 || Object.entries(channels).some(([key, value]) => !/^[\w-]{1,40}$/.test(key) || typeof value !== 'boolean'))) {
      throw new HttpsError('invalid-argument', 'Choose valid live channel settings.');
    }
    body = JSON.stringify({ live_enabled: true, channels });
    credit = 'live_auto_reply';
  } else if (action === 'source') {
    ({ body, action: credit } = sourceRequest(payload));
  } else {
    const input = Object.fromEntries(route.fields.flatMap(key => {
      const value = payload[key];
      const flag = key === 'webSearch' || key === 'deepResearch';
      return typeof value === (flag ? 'boolean' : 'string') ? [[key, value]] : [];
    }));
    body = JSON.stringify(input);
    const prompt = input[route.fields[0]];
    if (body.length > 30000 || typeof prompt !== 'string' || !prompt.trim() || prompt.length > 12000) {
      throw new HttpsError('invalid-argument', 'Enter a valid message.');
    }
    if (action === 'inboxSimulation') {
      if (!input.channel || !input.external_thread_id || !input.external_message_id || !input.customer_name) throw new HttpsError('invalid-argument', 'Choose a channel and a valid customer message.');
      idempotencyKey = createHash('sha256').update(JSON.stringify([input.channel, input.external_thread_id, input.external_message_id])).digest('hex');
    }
    credit = route.credit(input);
  }
  const savedResult = idempotencyKey ? db.doc(`gosSimulationResults/${createHash('sha256').update(JSON.stringify([user.uid, idempotencyKey])).digest('hex')}`) : null;
  const charge = action === 'liveEnable'
    ? await db.runTransaction(tx => executeUsage(db, tx, 'checkUsage', { subscriberId: user.uid, action: credit, tool: route.tool, idempotencyKey: randomUUID() })).catch(error => { throw toHttpsError(error); })
    : await chargeAction(db, user, credit, route.tool, { idempotencyKey, allowDuplicate: Boolean(savedResult) });
  if (savedResult && charge.duplicate) {
    const saved = (await savedResult.get()).data();
    if (saved?.result && saved.expiresAt?.toMillis?.() > Date.now() && saved.inputHash === createHash('sha256').update(body).digest('hex')) return JSON.parse(saved.result);
    throw new HttpsError('already-exists', 'This message was already submitted. Refresh the conversation to see its status.');
  }
  const response = await fetcher(`${baseUrl.replace(/\/$/, '')}/api/v1${route.path}`, {
    method: action === 'liveEnable' ? 'PUT' : 'POST',
    redirect: 'error',
    headers: { Authorization: authorization, Accept: 'application/json', ...(typeof body === 'string' ? { 'Content-Type': 'application/json' } : {}), ...(gatewaySecret ? { 'X-GOS-Metering-Secret': gatewaySecret } : {}) },
    body,
    signal: AbortSignal.timeout(90000),
  }).catch(() => { throw new HttpsError('unavailable', 'The Upclick API could not complete the request.'); });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success === false) {
    const code = { 400: 'invalid-argument', 401: 'unauthenticated', 403: 'permission-denied', 404: 'not-found', 413: 'invalid-argument', 422: 'invalid-argument', 429: 'resource-exhausted' }[response.status];
    throw new HttpsError(code ?? 'unavailable', result?.error?.message || result?.message || 'The Upclick API could not complete the request.');
  }
  if (result?.data === undefined) throw new HttpsError('internal', 'The Upclick API returned an unexpected response.');
  if (savedResult) {
    const encoded = JSON.stringify(result.data);
    if (Buffer.byteLength(encoded) < 700000) {
      await savedResult.set({ result: encoded, inputHash: createHash('sha256').update(body).digest('hex'), expiresAt: new Date(Date.now() + 86400000) }).catch(error => console.warn('Could not cache simulation result', error));
    }
  }
  return result.data;
}
