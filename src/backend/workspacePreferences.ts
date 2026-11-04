import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { doc, onSnapshot } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, primaryDb, storage, backendError } from './firebase';
import { storageGet, storageSet } from '../utils/browserStorage';
import type { RootState } from '../store';

export const DEFAULT_BRAND_NAME = 'Upclick';
export const DEFAULT_BRAND_LOGO_URL = '/upclick-logo.svg';
export const DEFAULT_SUPPORT_EMAIL = 'support@upclick.app';
const LOCAL_PREFS_KEY = 'workspace_preferences_local';

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
};

export function sanitizeWorkspacePreferences(
  raw: unknown,
  fallbackEmail?: string
): WorkspacePreferences {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const rawName = typeof obj.name === 'string' && obj.name.trim() ? obj.name.trim() : DEFAULT_BRAND_NAME;
  const rawEmail =
    typeof obj.supportEmail === 'string' && obj.supportEmail.trim()
      ? obj.supportEmail.trim()
      : fallbackEmail?.trim() || DEFAULT_SUPPORT_EMAIL;
  const rawLogo = typeof obj.logoUrl === 'string' ? obj.logoUrl.trim() : DEFAULT_BRAND_LOGO_URL;
  const validLogo =
    rawLogo && (/^https:\/\//.test(rawLogo) || /^\/(?!\/)/.test(rawLogo) || /^data:image\//.test(rawLogo))
      ? rawLogo
      : DEFAULT_BRAND_LOGO_URL;
  const rawTheme = typeof obj.theme === 'string' && obj.theme in workspaceThemes
    ? (obj.theme as WorkspacePreferences['theme'])
    : 'violet';
  const rawLang: 'en' | 'ar' = obj.language === 'ar' ? 'ar' : 'en';
  const rawMode: 'light' | 'dark' | 'system' =
    obj.mode === 'light' || obj.mode === 'dark' || obj.mode === 'system' ? obj.mode : 'system';
  const rawCurr =
    typeof obj.currency === 'string' && ['USD', 'SAR', 'EUR', 'EGP', 'AED', 'GBP'].includes(obj.currency)
      ? obj.currency
      : 'USD';
  const rawTz = typeof obj.timezone === 'string' && obj.timezone.trim() ? obj.timezone.trim() : 'Africa/Cairo';

  // Strictly return ONLY the 8 keys permitted by Firestore validDashboardBrand() security rule
  return {
    name: rawName,
    logoUrl: validLogo,
    theme: rawTheme,
    language: rawLang,
    currency: rawCurr,
    mode: rawMode,
    timezone: rawTz,
    supportEmail: rawEmail,
  };
}

export function readLocalWorkspacePreferences(): WorkspacePreferences | null {
  try {
    const raw = storageGet(LOCAL_PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return sanitizeWorkspacePreferences(parsed);
      }
    }
    const cachedTheme = storageGet('workspace_theme');
    if (cachedTheme && cachedTheme in workspaceThemes) {
      return sanitizeWorkspacePreferences({ ...preferenceDefaults, theme: cachedTheme });
    }
  } catch {}
  return null;
}

export function writeLocalWorkspacePreferences(prefs: WorkspacePreferences): WorkspacePreferences {
  const clean = sanitizeWorkspacePreferences(prefs);
  try {
    storageSet(LOCAL_PREFS_KEY, JSON.stringify(clean));
    storageSet('workspace_theme', clean.theme);
  } catch {}
  return clean;
}

export function isDefaultBrandLogo(url?: string | null): boolean {
  if (!url) return true;
  const trimmed = url.trim();
  return !trimmed || trimmed === '/upclick-logo.svg' || trimmed === '/upclick-mark.svg' || trimmed.endsWith('/upclick-logo.svg') || trimmed.endsWith('/upclick-mark.svg');
}

export function useWorkspacePreferences() {
  const tenantId = useSelector((s: RootState) => s.auth.tenant?.id || s.auth.user?.id || auth.currentUser?.uid || 'main');
  const uid = useSelector((s: RootState) => s.auth.user?.id || auth.currentUser?.uid || '');
  const adminUid = useSelector((s: RootState) => s.auth.impersonation?.user?.id || '');
  const scope = `${tenantId ?? ''}:${uid ?? ''}:${adminUid ?? ''}`;
  const [state, setState] = useState<{
    scope: string;
    values: WorkspacePreferences | null;
    ownValues: WorkspacePreferences | null;
    loading: boolean;
    error: string;
  }>(() => {
    const local = readLocalWorkspacePreferences();
    return { scope, values: local, ownValues: local, loading: !!uid, error: '' };
  });

  useEffect(() => {
    const localInitial = readLocalWorkspacePreferences();
    if (!tenantId || !uid) {
      setState({ scope, values: localInitial, ownValues: localInitial, loading: false, error: '' });
    } else {
      setState(prev => ({
        scope,
        values: prev.values ?? localInitial,
        ownValues: prev.ownValues ?? localInitial,
        loading: true,
        error: '',
      }));
    }

    let own: WorkspacePreferences | null = null;
    let selfBrand: WorkspacePreferences | null = null;
    let adminBrand: WorkspacePreferences | null = null;
    let parent: WorkspacePreferences | null = null;
    let localOverride: WorkspacePreferences | null = localInitial;
    let ownReady = !tenantId || !uid;
    let selfReady = !uid;
    let adminReady = !adminUid || adminUid === uid;
    let parentReady = !uid;
    let stopParent = () => {};
    let stopAdmin = () => {};

    const parse = (data: unknown): WorkspacePreferences | null => {
      if (!data || typeof data !== 'object') return null;
      return sanitizeWorkspacePreferences(data);
    };

    const publish = () => {
      const resolved = own ?? selfBrand ?? adminBrand ?? parent ?? localOverride;
      if (own || selfBrand || adminBrand || parent) {
        const authoritative = (own ?? selfBrand ?? adminBrand ?? parent)!;
        writeLocalWorkspacePreferences(authoritative);
      }
      setState({
        scope,
        values: resolved,
        ownValues: own ?? selfBrand ?? localOverride,
        loading: !ownReady || !selfReady || !adminReady || !parentReady,
        error: '',
      });
    };

    const handleLocalEvent = (evt: Event) => {
      const detail = (evt as CustomEvent<WorkspacePreferences>).detail;
      if (detail && typeof detail === 'object') {
        const clean = sanitizeWorkspacePreferences(detail);
        localOverride = clean;
        own = clean;
        selfBrand = clean;
        publish();
      } else {
        const latestLocal = readLocalWorkspacePreferences();
        if (latestLocal) {
          localOverride = latestLocal;
          publish();
        }
      }
    };

    window.addEventListener('workspace-preferences-updated', handleLocalEvent);

    if (!tenantId || !uid) {
      return () => {
        window.removeEventListener('workspace-preferences-updated', handleLocalEvent);
      };
    }

    const stopOwn = onSnapshot(
      doc(db, 'tenants', tenantId, 'preferences', 'general'),
      snapshot => {
        own = parse(snapshot.data()?.values);
        ownReady = true;
        publish();
      },
      () => {
        ownReady = true;
        publish();
      }
    );

    const stopSelfBrand = onSnapshot(
      doc(primaryDb, 'dashboardBrands', uid),
      snapshot => {
        selfBrand = parse(snapshot.data()?.values);
        selfReady = true;
        publish();
      },
      () => {
        selfReady = true;
        publish();
      }
    );

    if (adminUid && adminUid !== uid) {
      stopAdmin = onSnapshot(
        doc(primaryDb, 'dashboardBrands', adminUid),
        snapshot => {
          adminBrand = parse(snapshot.data()?.values);
          adminReady = true;
          publish();
        },
        () => {
          adminReady = true;
          publish();
        }
      );
    }

    // Agency clients inherit their provider's dashboard brand until they save a tenant override.
    const stopProfile = onSnapshot(
      doc(primaryDb, 'users', uid),
      profile => {
        stopParent();
        parent = null;
        const parentId = profile.data()?.supportParentId;
        if (!parentId || typeof parentId !== 'string' || parentId === uid) {
          parentReady = true;
          publish();
          return;
        }
        parentReady = false;
        publish();
        stopParent = onSnapshot(
          doc(primaryDb, 'dashboardBrands', parentId),
          snapshot => {
            parent = parse(snapshot.data()?.values);
            parentReady = true;
            publish();
          },
          () => {
            parentReady = true;
            publish();
          }
        );
      },
      () => {
        parentReady = true;
        publish();
      }
    );

    return () => {
      window.removeEventListener('workspace-preferences-updated', handleLocalEvent);
      stopOwn();
      stopSelfBrand();
      stopAdmin();
      stopProfile();
      stopParent();
    };
  }, [tenantId, uid, adminUid, scope]);

  return {
    ...(state.scope === scope
      ? state
      : {
          values: readLocalWorkspacePreferences(),
          ownValues: readLocalWorkspacePreferences(),
          loading: !!uid,
          error: '',
        }),
    tenantId,
  };
}

export async function uploadBrandFile(tenantId: string, file: File, logo = false) {
  const allowed = logo ? ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] : ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/pdf', 'text/plain'];
  if (!allowed.includes(file.type) || file.size > 10 * 1024 * 1024 || !file.size) throw new Error('Choose a supported file up to 10 MB. Logos support PNG, JPEG, WebP and SVG; resources also support PDF and TXT.');
  const target = ref(storage, `tenants/${tenantId}/branding/${crypto.randomUUID()}`);
  await uploadBytes(target, file, { contentType: file.type });
  return { url: await getDownloadURL(target), path: target.fullPath };
}
