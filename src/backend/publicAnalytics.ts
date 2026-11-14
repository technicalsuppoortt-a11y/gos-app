import { callBackend } from './firebase';

function identity() {
  const visitorKey = 'gos.analytics.visitor';
  const sessionKey = 'gos.analytics.session';
  const visitorId = localStorage.getItem(visitorKey) || crypto.randomUUID();
  const previous = JSON.parse(sessionStorage.getItem(sessionKey) || 'null');
  const now = Date.now();
  const sessionId = previous && now - previous.at < 30 * 60 * 1000 ? previous.id : crypto.randomUUID();
  localStorage.setItem(visitorKey, visitorId);
  sessionStorage.setItem(sessionKey, JSON.stringify({ id: sessionId, at: now }));
  return { visitorId, sessionId };
}

function trafficSource() {
  if (new URLSearchParams(location.search).has('utm_source')) return 'Campaign';
  if (!document.referrer) return 'Direct';
  const referrer = new URL(document.referrer);
  if (referrer.origin === location.origin) return 'Direct';
  if (/(^|\.)(google|bing|yahoo|duckduckgo)\./i.test(referrer.hostname)) return 'Search';
  if (/(^|\.)(facebook|instagram|tiktok|linkedin|youtube|twitter|x)\./i.test(referrer.hostname)) return 'Social';
  return 'Referral';
}

export async function recordAnalyticsView(target: { tenantId: string; assetId: string; pageId: string; captureToken: string; endpoint: string } | { tenantId: string; productId: string }) {
  try {
    if (navigator.doNotTrack === '1') return;
    const data = { ...target, ...identity(), eventId: crypto.randomUUID(), source: trafficSource() };
    if ('endpoint' in target) {
      const endpoint = new URL(target.endpoint);
      if (endpoint.protocol !== 'https:' || !/^us-central1-[a-z0-9-]+\.cloudfunctions\.net$/.test(endpoint.hostname) || endpoint.pathname !== '/captureAssetLead') return;
      endpoint.pathname = '/recordAnalyticsView';
      await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data }), keepalive: true, signal: AbortSignal.timeout(10000) });
    } else await callBackend('recordAnalyticsView', data, 10000);
  } catch { /* Tracking must not interrupt the public experience. */ }
}
