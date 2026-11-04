import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { doc, onSnapshot } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage, backendError } from './firebase';
import type { RootState } from '../store';

export const DEFAULT_BRAND_NAME = 'Upclick';
export const DEFAULT_BRAND_LOGO_URL = '/upclick-logo.svg';
export const DEFAULT_SUPPORT_EMAIL = 'support@upclick.app';

export const workspaceThemes = {
  violet: 'Violet Indigo',
  slate: 'Slate Clean',
  midnight: 'Midnight Neon',
  emerald: 'Emerald Enterprise',
  amber: 'Sunset Amber',
  ocean: 'Ocean Cyan',
  royal: 'Royal Purple',
  crimson: 'Crimson Executive',
  cyber: 'Cyber Matrix',
  minimalist: 'Minimalist Monotone',
} as const;

export type WorkspacePreferences = {
  name: string;
  logoUrl: string;
  theme: keyof typeof workspaceThemes;
  language: 'en' | 'ar';
  currency: string;
  mode: 'light' | 'dark' | 'system';
  timezone: string;
  supportEmail: string;
  dateFormat?: string;
};

export const preferenceDefaults: WorkspacePreferences = {
  name: DEFAULT_BRAND_NAME,
  logoUrl: DEFAULT_BRAND_LOGO_URL,
  theme: 'violet',
  language: 'en',
  currency: 'USD',
  mode: 'system',
  timezone: 'Africa/Cairo',
  supportEmail: DEFAULT_SUPPORT_EMAIL,
  dateFormat: 'DD / MM / YYYY',
};

export function isDefaultBrandLogo(url?: string | null): boolean {
  if (!url) return true;
  const trimmed = url.trim();
  return !trimmed || trimmed === '/upclick-logo.svg' || trimmed === '/upclick-mark.svg' || trimmed.endsWith('/upclick-logo.svg') || trimmed.endsWith('/upclick-mark.svg');
}

export function useWorkspacePreferences() {
  const tenantId = useSelector((s: RootState) => s.auth.tenant?.id);
  const uid = useSelector((s: RootState) => s.auth.user?.id);
  const scope = `${tenantId ?? ''}:${uid ?? ''}`;
  const [state, setState] = useState<{ scope: string; values: WorkspacePreferences | null; ownValues: WorkspacePreferences | null; loading: boolean; error: string }>({ scope, values: null, ownValues: null, loading: true, error: '' });
  useEffect(() => {
    setState({ scope, values: null, ownValues: null, loading: !!tenantId, error: '' });
    if (!tenantId || !uid) return;
    let own: WorkspacePreferences | null = null, parent: WorkspacePreferences | null = null;
    let ownReady = false, parentReady = false;
    let failure = '';
    let stopParent = () => {};
    const publish = () => setState({ scope, values: own ?? parent, ownValues: own, loading: !ownReady || !parentReady, error: failure });
    const fail = (error: unknown) => { failure = backendError(error); ownReady = true; parentReady = true; publish(); };
    const parse = (data: unknown) => {
      const values = data && typeof data === 'object' ? { ...preferenceDefaults, ...data } as WorkspacePreferences : null;
      if (values) {
        if (typeof values.name !== 'string' || !values.name.trim()) values.name = DEFAULT_BRAND_NAME;
        if (typeof values.supportEmail !== 'string' || !values.supportEmail.trim()) values.supportEmail = DEFAULT_SUPPORT_EMAIL;
        if (typeof values.logoUrl !== 'string' || (!/^https:\/\//.test(values.logoUrl) && !/^\/(?!\/)/.test(values.logoUrl) && !/^data:image\//.test(values.logoUrl))) {
          values.logoUrl = DEFAULT_BRAND_LOGO_URL;
        }
        if (!(values.theme in workspaceThemes)) values.theme = 'violet';
        if (!['en', 'ar'].includes(values.language)) values.language = 'en';
        if (!['light', 'dark', 'system'].includes(values.mode)) values.mode = 'system';
        if (!['USD', 'SAR', 'EUR', 'EGP', 'AED', 'GBP'].includes(values.currency)) values.currency = 'USD';
      }
      return values;
    };
    const stopOwn = onSnapshot(doc(db, 'tenants', tenantId, 'preferences', 'general'), snapshot => { own = parse(snapshot.data()?.values); ownReady = true; publish(); }, fail);
    // Agency clients inherit their provider's dashboard brand until they save a tenant override.
    // Only the safe preference projection is read, never the provider's account document.
    const stopProfile = onSnapshot(doc(db, 'users', uid), profile => {
      stopParent(); parent = null;
      const parentId = profile.data()?.supportParentId;
      if (!parentId || typeof parentId !== 'string' || parentId === uid) { parentReady = true; publish(); return; }
      parentReady = false; publish();
      stopParent = onSnapshot(doc(db, 'dashboardBrands', parentId), snapshot => { parent = parse(snapshot.data()?.values); parentReady = true; publish(); }, fail);
    }, fail);
    return () => { stopOwn(); stopProfile(); stopParent(); };
  }, [tenantId, uid, scope]);
  return { ...(state.scope === scope ? state : { values: null, ownValues: null, loading: !!tenantId, error: '' }), tenantId };
}

export async function uploadBrandFile(tenantId: string, file: File, logo = false) {
  const allowed = logo ? ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] : ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/pdf', 'text/plain'];
  if (!allowed.includes(file.type) || file.size > 10 * 1024 * 1024 || !file.size) throw new Error('Choose a supported file up to 10 MB. Logos support PNG, JPEG, WebP and SVG; resources also support PDF and TXT.');
  const target = ref(storage, `tenants/${tenantId}/branding/${crypto.randomUUID()}`);
  await uploadBytes(target, file, { contentType: file.type });
  return { url: await getDownloadURL(target), path: target.fullPath };
}
