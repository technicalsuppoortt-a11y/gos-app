import { callBackend } from './firebase';
import { flushAssetWrites } from './workspace';
import type { Domain } from '../pages/asset-model';

export async function publishWorkspaceAsset(assetId: string) {
  await flushAssetWrites();
  return callBackend<{ url: string; draftChanged: boolean }>('publishAsset', { assetId });
}
export async function connectWorkspaceDomain(domainId: string, assetId: string, name: string, operation: 'connect' | 'check' = 'connect') {
  await flushAssetWrites();
  return callBackend<{ domain: Domain }>('hostingDomain', { operation, domainId, assetId, name });
}
