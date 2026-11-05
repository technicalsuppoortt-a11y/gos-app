import { createContext, useContext, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { doc, onSnapshot, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, primaryDb, storage, backendError } from './firebase';
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
  language: 'ar',
  currency: 'USD',
  mode: 'light',
  timezone: 'UTC',
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
  const rawTheme = typeof obj.theme === 'string' && Object.hasOwn(workspaceThemes, obj.theme)
    ? (obj.theme as WorkspacePreferences['theme'])
    : 'violet';
  const rawLang: 'en' | 'ar' = obj.language === 'en' ? 'en' : 'ar';
  const rawMode: 'light' | 'dark' | 'system' =
    obj.mode === 'light' || obj.mode === 'dark' || obj.mode === 'system' ? obj.mode : 'light';
  const rawCurr =
    typeof obj.currency === 'string' && ['USD', 'SAR', 'EUR', 'EGP', 'AED', 'GBP'].includes(obj.currency)
      ? obj.currency
      : 'USD';
  const rawTz = validTimezone(obj.timezone) ? obj.timezone : preferenceDefaults.timezone;

  return {
    name: rawName,
    logoUrl: validLogo,
    theme: rawTheme,
    language: rawLang,
    currency: rawCurr,
    mode: rawMode,
    timezone: rawTz,
    supportEmail: rawEmail,
    ...(typeof obj.dateFormat === 'string' && { dateFormat: obj.dateFormat }),
  };
}

export function isDefaultBrandLogo(url?: string | null): boolean {
  if (!url) return true;
  const trimmed = url.trim();
  return !trimmed || trimmed === '/upclick-logo.svg' || trimmed === '/upclick-mark.svg' || trimmed.endsWith('/upclick-logo.svg') || trimmed.endsWith('/upclick-mark.svg');
}

export type PersonalPreferences = {
  [K in 'language' | 'currency' | 'timezone' | 'mode' | 'dateFormat']?: NonNullable<WorkspacePreferences[K]> | null;
};

export const inheritWorkspacePreferences = {
  language: null, currency: null, timezone: null, mode: null, dateFormat: null,
} satisfies PersonalPreferences;

function validTimezone(value: unknown): value is string {
  if (typeof value !== 'string' || !value) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function readPersonal(data?: Record<string, unknown>): PersonalPreferences {
  if (!data) return {};
  const { language, currency, mode, timezone, dateFormat } = data;
  return {
    ...(language === 'ar' || language === 'en' || language === null ? { language } : {}),
    ...((typeof currency === 'string' && /^[A-Z]{3}$/.test(currency)) || currency === null ? { currency } : {}),
    ...(mode === 'system' || mode === 'dark' || mode === 'light' || mode === null ? { mode } : {}),
    ...(validTimezone(timezone) || timezone === null ? { timezone } : {}),
    ...(typeof dateFormat === 'string' || dateFormat === null ? { dateFormat } : {}),
  };
}

export function personalPreferencesRef(uid: string) {
  return doc(db, 'users', uid, 'preferences', 'dashboard');
}

export function profileSettingsRef(tenantId: string, uid: string) {
  return doc(db, 'tenants', tenantId, 'workspaceState', encodeURIComponent(['gos-settings-v1', tenantId, uid].join(':')));
}

export async function savePersonalPreferences(uid: string, patch: PersonalPreferences) {
  if (auth.currentUser?.uid !== uid) throw new Error('Sign in to change your preferences.');
  await setDoc(personalPreferencesRef(uid), patch, { merge: true });
}

export async function saveWorkspacePreferences(tenantId: string, values: WorkspacePreferences, publishPlatform: boolean, personalPatch: PersonalPreferences) {
  const uid = auth.currentUser?.uid;
  if (!uid || !tenantId) throw new Error('Sign in to change workspace settings.');
  const batch = writeBatch(db);
  const record = { values, updatedAt: serverTimestamp(), updatedBy: uid };
  batch.set(doc(db, 'tenants', tenantId, 'preferences', 'general'), record);
  if (publishPlatform) {
    // Preserve the existing projection for linked client workspaces.
    batch.set(doc(db, 'dashboardBrands', uid), record);
    const { name, logoUrl, theme, language, currency, mode, timezone } = values;
    batch.set(doc(db, 'settings', 'publicAppearance'), {
      values: { name, logoUrl, theme, language, currency, mode, timezone },
    });
  }
  if (Object.keys(personalPatch).length) {
    batch.set(personalPreferencesRef(uid), personalPatch, { merge: true });
  }
  await batch.commit();
}

export function useWorkspacePreferenceState() {
  const { tenant, user, impersonation, role } = useSelector((s: RootState) => s.auth);
  const tenantId = tenant?.id ?? '';
  const uid = user?.id ?? '';
  const adminUid = impersonation?.user.id ?? '';
  const scope = JSON.stringify([tenantId, uid, adminUid]);
  const [publicValues, setPublicValues] = useState<WorkspacePreferences | null>(null);
  const [account, setAccount] = useState({
    scope: '', workspace: null as WorkspacePreferences | null, personal: {} as PersonalPreferences,
    loading: true, error: '',
  });

  useEffect(() => onSnapshot(doc(primaryDb, 'settings', 'publicAppearance'), snapshot => {
    const values = snapshot.data()?.values;
    setPublicValues(values ? sanitizeWorkspacePreferences(values) : null);
  }, error => console.warn('Public appearance could not be loaded', backendError(error))), []);

  useEffect(() => {
    if (!uid || !tenantId) return;
    let tenantValues: WorkspacePreferences | null = null;
    let ownBrand: WorkspacePreferences | null = null;
    let parentBrand: WorkspacePreferences | null = null;
    const inheritsProvider = role === 'USER';
    let legacy: PersonalPreferences = {};
    let personal: PersonalPreferences = {};
    let error = '';
    const pending = new Set(['tenant', 'self', 'profile', 'personal']);
    let parentId: string | undefined;
    let legacyTenant: string | undefined;
    let stopParent = () => {};
    let stopLegacy = () => {};

    const publish = (source: string) => {
      pending.delete(source);
      // Client workspaces follow their linked provider's publication, even when
      // an older client document still contains a copy of the previous theme.
      const workspace = inheritsProvider
        ? parentBrand ?? tenantValues ?? ownBrand
        : tenantValues ?? ownBrand ?? parentBrand;
      setAccount({ scope, workspace,
        personal: { ...legacy, ...personal }, loading: pending.size > 0, error });
    };
    const failed = (source: string, cause: unknown) => {
      if (source === 'tenant' || (source === 'personal' && auth.currentUser?.uid === uid)) error = backendError(cause);
      publish(source);
    };
    const brand = (value: unknown) => value && typeof value === 'object' ? sanitizeWorkspacePreferences(value) : null;

    const stopTenant = onSnapshot(doc(db, 'tenants', tenantId, 'preferences', 'general'), snapshot => {
      tenantValues = brand(snapshot.data()?.values);
      publish('tenant');
    }, cause => failed('tenant', cause));
    const stopSelf = onSnapshot(doc(db, 'dashboardBrands', uid), snapshot => {
      ownBrand = brand(snapshot.data()?.values);
      publish('self');
    }, cause => failed('self', cause));
    const stopPersonal = onSnapshot(personalPreferencesRef(uid), snapshot => {
      personal = readPersonal(snapshot.data());
      publish('personal');
    }, cause => failed('personal', cause));

    const stopProfile = onSnapshot(doc(db, 'users', uid), snapshot => {
      const profile = snapshot.data();
      const linkedAdmin = profile?.supportParentId || adminUid;
      if (linkedAdmin !== parentId) {
        stopParent();
        parentId = linkedAdmin;
        parentBrand = null;
        pending.delete('parent');
        if (typeof linkedAdmin === 'string' && linkedAdmin && linkedAdmin !== uid) {
          pending.add('parent');
          stopParent = onSnapshot(doc(db, 'dashboardBrands', linkedAdmin), brandSnapshot => {
            parentBrand = brand(brandSnapshot.data()?.values);
            publish('parent');
          }, cause => failed('parent', cause));
        }
      }
      // Older versions persisted overrides alongside the profile.
      const profileTenant = typeof profile?.tenantId === 'string' && profile.tenantId
        ? profile.tenantId
        : profile?.status === 'Active' && role === 'USER' ? uid : tenantId;
      if (profileTenant !== legacyTenant) {
        stopLegacy();
        legacyTenant = profileTenant;
        legacy = {};
        pending.add('legacy');
        stopLegacy = onSnapshot(profileSettingsRef(profileTenant, uid), settings => {
          const saved = settings.data()?.value?.profile;
          legacy = saved?.hasUserOverrides === true ? readPersonal({
            ...saved,
            language: saved.language === 'Arabic' ? 'ar' : saved.language === 'English' ? 'en' : undefined,
          }) : {};
          publish('legacy');
        }, cause => failed('legacy', cause));
      }
      publish('profile');
    }, cause => failed('profile', cause));

    return () => { stopTenant(); stopSelf(); stopPersonal(); stopProfile(); stopParent(); stopLegacy(); };
  }, [uid, tenantId, adminUid, role, scope]);

  const current = uid && scope === account.scope ? account : null;
  return {
    scope, uid, tenantId,
    canPublish: !impersonation && (role === 'ADMIN' || role === 'SUPER_ADMIN'),
    values: current?.workspace ?? publicValues,
    publicValues,
    personal: current?.personal ?? inheritWorkspacePreferences,
    loading: Boolean(uid && (!current || current.loading)),
    error: current?.error ?? '',
  };
}

type WorkspaceContext = ReturnType<typeof useWorkspacePreferenceState> & {
  effective: WorkspacePreferences;
  hasWorkspaceTheme: boolean;
  topbarChange?: PersonalPreferences;
  themePreview?: Partial<WorkspacePreferences> | null;
  preview: (patch: Partial<WorkspacePreferences> | null) => void;
  setPreference?: (patch: PersonalPreferences) => void;
};

export const WorkspacePreferencesContext = createContext<WorkspaceContext>({
  scope: '', uid: '', tenantId: '', canPublish: false, values: null, publicValues: null,
  hasWorkspaceTheme: false, personal: inheritWorkspacePreferences, effective: preferenceDefaults, loading: false, error: '',
  preview: () => {},
});
export const useWorkspacePreferences = () => useContext(WorkspacePreferencesContext);

export async function uploadBrandFile(tenantId: string, file: File, logo = false) {
  const allowed = logo ? ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] : ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/pdf', 'text/plain'];
  if (!allowed.includes(file.type) || file.size > 10 * 1024 * 1024 || !file.size) throw new Error('Choose a supported file up to 10 MB. Logos support PNG, JPEG, WebP and SVG; resources also support PDF and TXT.');
  const target = ref(storage, `tenants/${tenantId}/branding/${crypto.randomUUID()}`);
  await uploadBytes(target, file, { contentType: file.type });
  return { url: await getDownloadURL(target), path: target.fullPath };
}

export async function uploadProfilePhoto(uid: string, file: File) {
  if (auth.currentUser?.uid !== uid) throw new Error('Sign in to change your profile photo.');
  if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024) {
    throw new Error('Choose a JPG, PNG or GIF image up to 5 MB.');
  }
  const target = ref(storage, 'profilePhotos/' + uid + '/' + crypto.randomUUID());
  await uploadBytes(target, file, { contentType: file.type });
  return getDownloadURL(target);
}
