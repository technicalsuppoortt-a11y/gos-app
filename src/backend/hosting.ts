import { store } from '../store';
import { readWorkspace } from '../pages/asset-model';
import { pendingDomains, queuePendingDomain, resolvePendingDomain, domainServiceUnavailable, domainServiceWarning } from './pendingDomains';
import { callBackend } from './firebase';
import { flushAssetWrites } from './workspace';
import type { Domain } from '../pages/asset-model';

export async function publishWorkspaceAsset(assetId: string) {
  await flushAssetWrites();
  return callBackend<{ url: string; draftChanged: boolean }>('publishAsset', { assetId });
}
export async function deleteWorkspaceAsset(assetId: string) {
  await flushAssetWrites();
  return callBackend('deleteWorkspaceAsset', { assetId });
}
export async function connectWorkspaceDomain(domainId: string, assetId: string, name: string, operation: 'connect' | 'check' = 'connect') {
  await flushAssetWrites();
  const scope = store.getState().auth.tenant?.id ?? '';
  const queued = pendingDomains(scope).find(item => item.id === domainId);
  try {
    const result = await callBackend<{ domain: Domain }>('hostingDomain', { operation: queued ? 'connect' : operation, domainId, assetId: queued?.assetId ?? assetId, name: queued?.name ?? name });
    resolvePendingDomain(scope, domainId);
    return result;
  } catch (error) {
    if (!scope || !domainServiceUnavailable(error)) throw error;
    const previous = queued ?? readWorkspace().domains.find(item => item.id === domainId);
    const domain: Domain = { ...previous, id: domainId, name: name || previous?.name || '', assetId: assetId || previous?.assetId || '', status: 'Pending', ssl: 'Not configured', default: false, issues: [domainServiceWarning] };
    queuePendingDomain(scope, domain);
    console.warn('[hostingDomain] Endpoint unavailable. Domain request retained locally as Pending; DNS and SSL are not verified.', (error as { code?: string }).code ?? 'network-error');
    return { domain };
  }
}
