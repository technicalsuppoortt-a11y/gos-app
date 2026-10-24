import { store } from '../store';
import { readWorkspace } from '../pages/asset-model';
import { pendingDomains, queuePendingDomain, resolvePendingDomain, domainServiceUnavailable, domainServiceWarning } from './pendingDomains';
import { callBackend } from './firebase';
import { flushAssetWrites } from './workspace';
import { connectSiteDomain, verifySiteDomain, disconnectSiteDomain, syncAssetToPublishedSites, normalizeHost } from './siteDomains';
import type { Domain } from '../pages/asset-model';

export async function publishWorkspaceAsset(assetId: string) {
  await flushAssetWrites();
  const asset = readWorkspace().assets.find(item => item.id === assetId);
  const userId = store.getState().auth.user?.id || '';
  if (asset) {
    try {
      await syncAssetToPublishedSites(asset, userId);
    } catch (e) {
      console.warn('[publishWorkspaceAsset] sync to published_sites warning:', e);
    }
  }
  return callBackend<{ url: string; draftChanged: boolean }>('publishAsset', { assetId });
}

export async function deleteWorkspaceAsset(assetId: string) {
  await flushAssetWrites();
  return callBackend('deleteWorkspaceAsset', { assetId });
}

export async function connectWorkspaceDomain(domainId: string, assetId: string, name: string, operation: 'connect' | 'check' = 'connect') {
  await flushAssetWrites();
  const cleanName = normalizeHost(name);
  const scope = store.getState().auth.tenant?.id ?? '';
  const userId = store.getState().auth.user?.id ?? '';
  const queued = pendingDomains(scope).find(item => item.id === domainId);

  // Sync to site_domains collection with required schema
  try {
    if (cleanName && operation === 'connect') {
      await connectSiteDomain({
        funnelId: assetId,
        ownerUid: userId,
        host: cleanName,
        tenantId: scope
      });
    }
  } catch (err: any) {
    console.warn('[connectWorkspaceDomain] site_domains sync warning:', err.message);
  }

  // Trigger automated DNS verification & SSL provisioning
  try {
    const verifyResult = await verifySiteDomain(cleanName, {
      funnelId: assetId,
      ownerUid: userId,
      tenantId: scope
    });

    const isConnected = verifyResult.matched === true || verifyResult.status === 'connected';
    const sslStatus: 'Active' | 'Not configured' = isConnected ? 'Active' : 'Not configured';
    const domainStatus: 'Connected' | 'Pending' = isConnected ? 'Connected' : 'Pending';

    const previous = queued ?? readWorkspace().domains.find(item => item.id === domainId);
    const domain: Domain = {
      ...previous,
      id: domainId,
      name: cleanName || previous?.name || '',
      assetId: assetId || previous?.assetId || '',
      status: domainStatus,
      ssl: sslStatus,
      default: previous?.default || false,
      issues: isConnected ? [] : [
        verifyResult.matchedType
          ? `Verified via ${verifyResult.matchedType.toUpperCase()}`
          : 'Waiting for DNS propagation. Points to cname.vercel-dns.com (CNAME) or 76.76.21.21 (A-Record)'
      ],
      dnsRecords: [
        { domainName: cleanName, type: 'CNAME', rdata: 'cname.vercel-dns.com', requiredAction: 'Subdomain' },
        { domainName: cleanName, type: 'A', rdata: '76.76.21.21', requiredAction: 'Apex/Root' }
      ]
    };

    // Also attempt Firebase hostingDomain backend function if active
    try {
      const result = await callBackend<{ domain: Domain }>('hostingDomain', {
        operation: queued ? 'connect' : operation,
        domainId,
        assetId: queued?.assetId ?? assetId,
        name: queued?.name ?? cleanName
      });
      resolvePendingDomain(scope, domainId);
      return { domain: { ...domain, ...result.domain, status: isConnected ? 'Connected' : result.domain.status } };
    } catch {
      resolvePendingDomain(scope, domainId);
      return { domain };
    }
  } catch (error) {
    if (!scope || !domainServiceUnavailable(error)) {
      // Still return local pending domain if available
      const previous = queued ?? readWorkspace().domains.find(item => item.id === domainId);
      const domain: Domain = {
        ...previous,
        id: domainId,
        name: cleanName || previous?.name || '',
        assetId: assetId || previous?.assetId || '',
        status: 'Pending',
        ssl: 'Not configured',
        default: false,
        issues: [domainServiceWarning]
      };
      return { domain };
    }
    const previous = queued ?? readWorkspace().domains.find(item => item.id === domainId);
    const domain: Domain = { ...previous, id: domainId, name: cleanName || previous?.name || '', assetId: assetId || previous?.assetId || '', status: 'Pending', ssl: 'Not configured', default: false, issues: [domainServiceWarning] };
    queuePendingDomain(scope, domain);
    return { domain };
  }
}
