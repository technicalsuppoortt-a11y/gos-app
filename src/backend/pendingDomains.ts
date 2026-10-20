import type { Domain } from '../pages/asset-model';

const queues = new Map<string, Domain[]>();
const key = (scope: string) => `gos.pending-domains.v1:${scope}`;
export const domainServiceWarning = 'Domain verification is temporarily unavailable. This request is saved on this browser as Pending. DNS and SSL have not been verified. Keep this window open to retry automatically.';
export function pendingDomains(scope: string): Domain[] {
  if (!scope) return [];
  if (!queues.has(scope)) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(key(scope)) || '[]');
      queues.set(scope, Array.isArray(saved) ? saved.filter(item => item?.status === 'Pending' && typeof item.id === 'string' && typeof item.name === 'string') : []);
    } catch { queues.set(scope, []); }
  }
  return queues.get(scope)!;
}
function save(scope: string, domains: Domain[]) {
  queues.set(scope, domains);
  try { sessionStorage.setItem(key(scope), JSON.stringify(domains)); } catch { /* In-memory fallback also supports blocked storage. */ }
  window.dispatchEvent(new Event('gos-pending-domains-change'));
}
export function queuePendingDomain(scope: string, domain: Domain) {
  save(scope, [...pendingDomains(scope).filter(item => item.id !== domain.id), domain]);
}
export function resolvePendingDomain(scope: string, id: string) {
  if (pendingDomains(scope).some(item => item.id === id)) save(scope, pendingDomains(scope).filter(item => item.id !== id));
}
export function domainServiceUnavailable(error: unknown) {
  const { code, message } = (error ?? {}) as { code?: string; message?: string };
  return (code === 'functions/not-found' && /^(not found|not-found|NOT_FOUND)$/i.test(message ?? '')) || ['functions/internal', 'functions/unavailable', 'functions/deadline-exceeded'].includes(code ?? '') || /CORS|Failed to fetch|NetworkError|404|endpoint.*not found/i.test(message ?? '');
}
