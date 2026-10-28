import { useSyncExternalStore } from 'react';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';
import { saveSetup } from '../pages/onboarding/onboarding-store';

type Colors = Record<string, string>;
export type PhoenixBrand = {
  name: string; tagline?: string; description: string; business: string;
  language: 'ar' | 'en'; mode: 'light' | 'dark'; logoAssetId?: string;
  theme?: { paletteId: string; light: Colors; dark: Colors; typography: { heading: string; body: string; arabic: string }; buttons: { shape: string; variant: string }; appearance: { radius: number; shadow: string; density: string } };
};
export type PhoenixConfiguration = { uid: string; brand: PhoenixBrand; logo: string; logoHasWordmark: boolean; pages: Record<string, { parameters: Record<string, unknown>; revision: string }> };
let configuration: PhoenixConfiguration | null = null;
let configurationRevision = "";
const listeners = new Set<() => void>();
export function clearPhoenixBrand() { configuration = null; configurationRevision = ""; listeners.forEach(fn => fn()); }
export function getPhoenixBrand() { return configuration; }
export function usePhoenixBrand() {
  return useSyncExternalStore(fn => { listeners.add(fn); return () => { listeners.delete(fn); }; }, () => configuration);
}
export async function loadPhoenixBrand(uid: string, sourceUid: string, tenantId: string, email: string) {
  const current = (await getDoc(doc(db, 'users', uid, 'brandEngine', 'current'))).data();
  if (current?.status !== 'prepared' || current.sourceUid !== sourceUid || current.tenantId !== tenantId) throw new Error('لم يكتمل تجهيز منصتك. أعد المحاولة من Phoenix.');
  const revision = JSON.stringify([uid, sourceUid, tenantId, current.snapshotId, current.sourceRevision]);
  if (configuration?.uid === uid && configurationRevision === revision) return configuration;
  const root = doc(db, 'users', uid, 'brandEngineSnapshots', current.snapshotId);
  const [pageDocs, assetDocs] = await Promise.all([getDocs(collection(root, 'pages')), getDocs(collection(root, 'assets'))]);
  const pages = Object.fromEntries(pageDocs.docs.map(page => [page.id, page.data()])) as PhoenixConfiguration['pages'];
  if (!Array.isArray(current.pageIds) || current.pageIds.some((id: string) => !pages[id] || pages[id].revision !== current.sourceRevision)) throw new Error('Your saved configuration is incomplete.');
  const assets = Object.fromEntries(assetDocs.docs.map(asset => [asset.id, asset.data()]));
  const brand = { ...current.brand, tagline: pages.branding?.parameters.tagline || current.brand.tagline || '' } as PhoenixBrand;
  const asset = assets[brand.logoAssetId || ''];
  let logo = asset?.encoding === 'chunked-data-url-v1'
    ? Array.from({ length: asset.chunkCount }, (_, index) => assets[`${brand.logoAssetId}-part-${index}`]?.dataUrl || '').join('')
    : asset?.dataUrl || '';
  if (!/^data:image\/(png|jpeg|webp|svg\+xml);base64,/.test(logo)) logo = '';
  // Phoenix previews generated logos as vectors. Reuse the persisted vector
  // instead of shrinking a wide PNG into an icon or regenerating the mark.
  if (asset?.origin === 'generated_logo' && typeof asset.svg === 'string' && /^\s*<svg[\s>]/.test(asset.svg)) {
    logo = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(asset.svg)}`;
  }
  if (auth.currentUser?.uid !== uid) throw new Error('The signed-in account changed.');
  configurationRevision = revision;
  configuration = { uid, brand, logo, logoHasWordmark: asset?.origin === 'generated_logo' || Number(asset?.width) > Number(asset?.height) * 1.5, pages };
  saveSetup(email, { onboarding_completed: true, step: 5, name: brand.name, description: brand.description, industry: brand.business, logo: logo.length < 200000 ? logo : '', color: brand.theme?.light.primary || '#7546f5', language: brand.language });
  listeners.forEach(fn => fn());
  return configuration;
}
