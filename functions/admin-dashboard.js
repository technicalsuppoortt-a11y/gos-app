import { HttpsError } from 'firebase-functions/v2/https';

async function checkGateway(method, config, fetcher) {
  const base = { id: method.provider, name: method.name || method.provider, kind: 'Payment gateway', mode: config?.credentials?.mode ?? 'unknown', status: 'unverified', detail: 'No provider availability probe is configured.', latencyMs: null };
  if (!method.enabled) return { ...base, status: 'disabled', detail: 'Disabled in payment settings.' };
  const credentials = config?.credentials ?? {};
  let url, options;
  if (method.provider === 'stripe' && credentials.secretKey) {
    url = 'https://api.stripe.com/v1/balance';
    options = { headers: { Authorization: `Bearer ${credentials.secretKey}` } };
  } else if (method.provider === 'paypal' && credentials.clientId && credentials.clientSecret && ['live', 'sandbox'].includes(credentials.mode)) {
    url = `https://api-m.${credentials.mode === 'sandbox' ? 'sandbox.' : ''}paypal.com/v1/oauth2/token`;
    options = { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' };
  } else return { ...base, detail: ['stripe', 'paypal'].includes(method.provider) ? 'Provider credentials or environment are not configured.' : `Saved connection state: ${String(method.status ?? 'Unknown')}. Availability is unverified.` };
  const start = performance.now();
  try {
    const response = await fetcher(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(8000) });
    const payload = await response.json();
    const verified = response.ok && (method.provider === 'stripe' ? payload?.object === 'balance' : typeof payload?.access_token === 'string');
    const mode = method.provider === 'stripe' && typeof payload?.livemode === 'boolean' ? payload.livemode ? 'live' : 'sandbox' : base.mode;
    return { ...base, mode, status: verified ? 'healthy' : 'error', detail: verified ? 'Provider authentication verified. Payment delivery is not tested.' : `Provider check failed (HTTP ${response.status}).`, latencyMs: Math.round(performance.now() - start) };
  } catch { return { ...base, status: 'unreachable', detail: 'The provider check timed out or could not connect.', latencyMs: null }; }
}

export async function adminDashboardStatusRequest(request, { actor, db, apiBase, fetcher = fetch }) {
  const user = await actor(request);
  if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) throw new HttpsError('permission-denied', 'Administrator access is required.');
  const start = performance.now();
  const paymentDoc = await db.doc('settings/paymentMethods').get();
  const firestoreLatency = Math.round(performance.now() - start);
  const services = [
    { id: 'firestore', name: 'Cloud Firestore', kind: 'Infrastructure', status: 'healthy', mode: 'server', latencyMs: firestoreLatency, detail: 'Server read completed.' },
    { id: 'functions', name: 'Firebase Functions', kind: 'Backend', status: 'healthy', mode: 'server', latencyMs: null, detail: 'Authenticated dashboard callable completed.' },
  ];
  const apiStart = performance.now();
  const apiCheck = (async () => {
    try {
      const response = await fetcher(`${apiBase.replace(/\/$/, '')}/api/v1/health`, { redirect: 'error', signal: AbortSignal.timeout(8000) });
      const payload = await response.json();
      const status = String(payload?.data?.status ?? payload?.status ?? '').toLowerCase();
      const failed = payload?.success === false || /^(error|failed|down|degraded|unhealthy)$/.test(status);
      const verified = response.ok && !failed && (payload?.success === true || /^(ok|healthy|up|operational|ready)$/.test(status));
      return { id: 'gos-api', name: 'GOS API', kind: 'Backend gateway', status: !response.ok || failed ? 'error' : verified ? 'healthy' : 'unverified', mode: 'server', latencyMs: Math.round(performance.now() - apiStart), detail: !response.ok || failed ? `Health endpoint reported a failure (HTTP ${response.status}).` : verified ? 'Health endpoint responded successfully.' : 'The endpoint responded without a recognized health signal.' };
    } catch { return { id: 'gos-api', name: 'GOS API', kind: 'Backend gateway', status: 'unreachable', mode: 'server', latencyMs: null, detail: 'The API health endpoint could not be reached.' }; }
  })();
  const methods = Array.isArray(paymentDoc.data()?.methods) ? paymentDoc.data().methods.filter(m => m.type === 'gateway') : [];
  const gateways = await Promise.all(methods.map(async method => {
    if (!['stripe', 'paypal'].includes(method.provider)) return checkGateway(method, null, fetcher);
    try { return await checkGateway(method, (await db.doc(`paymentGatewayConfigurations/${method.provider}`).get()).data(), fetcher); }
    catch { return { id: method.provider, name: method.name || method.provider, kind: 'Payment gateway', status: 'error', mode: 'unknown', latencyMs: null, detail: 'Gateway configuration could not be read.' }; }
  }));
  return { checkedAt: new Date().toISOString(), services: [...services, await apiCheck], gateways };
}
