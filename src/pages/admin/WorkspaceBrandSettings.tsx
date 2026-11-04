import { useEffect, useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Check, Globe, Info, Loader2, Palette, RotateCcw, Sparkles } from 'lucide-react';
import { auth, db, primaryDb, backendError } from '../../backend/firebase';
import { showToast } from '../../utils/toast';
import {
  DEFAULT_BRAND_LOGO_URL,
  DEFAULT_BRAND_NAME,
  DEFAULT_SUPPORT_EMAIL,
  preferenceDefaults,
  sanitizeWorkspacePreferences,
  uploadBrandFile,
  useWorkspacePreferences,
  workspaceThemes,
  writeLocalWorkspacePreferences,
  type WorkspacePreferences,
} from '../../backend/workspacePreferences';
import { themePaletteDetails } from '../../branding/workspaceTheme';
import { useUILanguage } from '../../i18n/display';
import { AdminGeneral } from './AdminGeneral';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { setLanguage, setCurrency, setTheme, type Language, type Theme } from '../../store/slices/uiSlice';
import { storageSet } from '../../utils/browserStorage';
import i18n from '../../i18n/i18n';
import './admin-workspace.css';
import '../settings/settings-controls.css';
import '../settings/settings.css';
import { Select } from '../../components/ui/Select';
import { TimezoneSelect } from '../../components/ui/TimezoneSelect';
import { Link } from 'react-router-dom';
import { BrandLogoUploader } from '../settings/BrandLogoUploader';
import { ChangePasswordCard } from '../settings/ChangePasswordCard';
import { DomainsSettingsPanel } from '../settings/DomainsSettingsPanel';

function withBrandFallbacks(prefs: WorkspacePreferences | null | undefined, userEmail?: string): WorkspacePreferences {
  const merged = { ...preferenceDefaults, ...(prefs ?? {}) };
  return {
    ...merged,
    name: merged.name?.trim() || DEFAULT_BRAND_NAME,
    logoUrl: merged.logoUrl?.trim() || DEFAULT_BRAND_LOGO_URL,
    supportEmail: merged.supportEmail?.trim() || userEmail || DEFAULT_SUPPORT_EMAIL,
    theme: merged.theme in workspaceThemes ? merged.theme : 'violet',
  };
}

export function WorkspaceBrandSettings() {
  const { values, ownValues, tenantId, loading, error: loadError } = useWorkspacePreferences();
  const ar = useUILanguage().startsWith('ar');
  const role = useSelector((s: RootState) => s.auth.role);
  const userEmail = useSelector((s: RootState) => s.auth.user?.email);
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(role ?? '');

  const dispatch = useDispatch();
  const topbarLanguage = useSelector((s: RootState) => s.ui.language);
  const topbarCurrency = useSelector((s: RootState) => s.ui.currency);
  const topbarTheme = useSelector((s: RootState) => s.ui.theme);

  const [draft, setDraft] = useState<WorkspacePreferences>(() => withBrandFallbacks(values, userEmail));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<'general' | 'domains' | 'email'>('general');
  const [base, setBase] = useState<WorkspacePreferences | null>(null);

  useEffect(() => {
    if (!dirty) {
      setDraft(withBrandFallbacks(values, userEmail));
      setBase(ownValues);
    }
  }, [values, ownValues, dirty, userEmail]);

  // Two-way state sync: reflect changes made in the Topbar immediately in Settings controls
  useEffect(() => {
    if (topbarLanguage && topbarLanguage !== draft.language) {
      setDraft(p => ({ ...p, language: topbarLanguage }));
    }
  }, [topbarLanguage]);

  useEffect(() => {
    if (topbarCurrency && topbarCurrency !== draft.currency) {
      setDraft(p => ({ ...p, currency: topbarCurrency }));
    }
  }, [topbarCurrency]);

  useEffect(() => {
    if (topbarTheme && draft.mode !== topbarTheme && draft.mode !== 'system') {
      setDraft(p => ({ ...p, mode: topbarTheme }));
    }
  }, [topbarTheme]);

  const update = <K extends keyof WorkspacePreferences>(key: K, value: WorkspacePreferences[K]) => {
    setDraft(p => ({ ...p, [key]: value }));
    setDirty(true);
    setSaved(false);
    if (key === 'theme') {
      document.documentElement.dataset.workspaceTheme = String(value);
      storageSet('workspace_theme', String(value));
      window.dispatchEvent(new CustomEvent('workspace-theme-changed', { detail: { theme: value } }));
    } else if (key === 'language') {
      const lang = String(value) as Language;
      void i18n.changeLanguage(lang);
      dispatch(setLanguage(lang));
      storageSet('i18nextLng', lang);
    } else if (key === 'currency') {
      const curr = String(value);
      dispatch(setCurrency(curr));
      storageSet('preferred_currency', curr);
    } else if (key === 'mode') {
      const mode = String(value);
      if (mode === 'light' || mode === 'dark') {
        dispatch(setTheme(mode));
        storageSet('theme', mode);
        if (mode === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } else if (mode === 'system') {
        const isSystemDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const targetTheme: Theme = isSystemDark ? 'dark' : 'light';
        dispatch(setTheme(targetTheme));
        storageSet('theme', targetTheme);
        if (isSystemDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    }
  };

  const resetToDefaults = async () => {
    setResetting(true);
    setError('');
    try {
      const defaults: WorkspacePreferences = sanitizeWorkspacePreferences(
        {
          name: DEFAULT_BRAND_NAME,
          logoUrl: DEFAULT_BRAND_LOGO_URL,
          theme: 'violet',
          language: 'en',
          currency: 'USD',
          mode: 'system',
          timezone: 'UTC',
          supportEmail: userEmail || DEFAULT_SUPPORT_EMAIL,
        },
        userEmail
      );

      // 1. Persist locally and broadcast immediately so UI never flickers or reverts
      writeLocalWorkspacePreferences(defaults);
      document.documentElement.dataset.workspaceTheme = 'violet';
      storageSet('workspace_theme', 'violet');
      window.dispatchEvent(new CustomEvent('workspace-preferences-updated', { detail: defaults }));
      window.dispatchEvent(new CustomEvent('workspace-theme-changed', { detail: { theme: 'violet' } }));

      const currentUid = auth.currentUser?.uid;
      const targetTenantId = tenantId || currentUid || 'main';

      // 2. Write to user's dashboardBrands projection (always permitted by isSelf(uid) && validDashboardBrand())
      if (currentUid) {
        try {
          await setDoc(doc(primaryDb, 'dashboardBrands', currentUid), {
            values: defaults,
            updatedBy: currentUid,
            updatedAt: serverTimestamp(),
          });
        } catch {
          // ignore if offline or restricted
        }
      }

      // 3. Write to Firestore tenant preferences document
      if (targetTenantId && currentUid) {
        try {
          await setDoc(doc(db, 'tenants', targetTenantId, 'preferences', 'general'), {
            values: defaults,
            updatedBy: currentUid,
            updatedAt: serverTimestamp(),
          });
        } catch {
          // If tenant member doc doesn't exist on live rules, dashboardBrands + local persistence already succeeded
        }
      }

      setDraft(defaults);
      setDirty(false);
      setSaved(true);

      // 4. Reset document attributes & Redux
      void i18n.changeLanguage('en');
      dispatch(setLanguage('en'));
      storageSet('i18nextLng', 'en');
      dispatch(setCurrency('USD'));
      storageSet('preferred_currency', 'USD');

      const isDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const sysTheme: Theme = isDark ? 'dark' : 'light';
      dispatch(setTheme(sysTheme));
      storageSet('theme', sysTheme);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      window.dispatchEvent(new Event('gos-settings-changed'));

      showToast.success(ar ? 'تمت استعادة إعدادات الهوية والسمة الافتراضية بنجاح' : 'Brand identity & theme restored to system defaults.');
    } catch (e) {
      const msg = backendError(e);
      setError(msg);
      showToast.error(msg);
    } finally {
      setResetting(false);
    }
  };

  async function save() {
    const currentUid = auth.currentUser?.uid;
    const targetTenantId = tenantId || currentUid || 'main';
    setBusy(true);
    setError('');
    try {
      Intl.DateTimeFormat('en', { timeZone: draft.timezone });
      if (
        draft.logoUrl &&
        !/^https:\/\//.test(draft.logoUrl.trim()) &&
        !/^\/(?!\/)/.test(draft.logoUrl.trim()) &&
        !/^data:image\//.test(draft.logoUrl.trim())
      ) {
        throw new Error('Use an HTTPS logo URL, a local path (/...), or upload an image.');
      }

      // Strictly 8 keys allowed by validDashboardBrand() in Firestore security rules
      const normalizedDraft: WorkspacePreferences = sanitizeWorkspacePreferences(draft, userEmail);

      // 1. Persist locally & broadcast immediately
      writeLocalWorkspacePreferences(normalizedDraft);
      document.documentElement.dataset.workspaceTheme = normalizedDraft.theme;
      storageSet('workspace_theme', normalizedDraft.theme);
      window.dispatchEvent(new CustomEvent('workspace-preferences-updated', { detail: normalizedDraft }));
      window.dispatchEvent(new CustomEvent('workspace-theme-changed', { detail: { theme: normalizedDraft.theme } }));
      window.dispatchEvent(new Event('gos-settings-changed'));

      // 2. Write to dashboardBrands/{currentUid} (always permitted for signed-in user by isSelf(uid) && validDashboardBrand())
      if (currentUid) {
        try {
          await setDoc(doc(primaryDb, 'dashboardBrands', currentUid), {
            values: normalizedDraft,
            updatedBy: currentUid,
            updatedAt: serverTimestamp(),
          });
        } catch {
          // Secondary platform brand projection fallback
        }
      }

      // 3. Write to tenants/{targetTenantId}/preferences/general
      if (targetTenantId && currentUid) {
        try {
          await setDoc(doc(db, 'tenants', targetTenantId, 'preferences', 'general'), {
            values: normalizedDraft,
            updatedBy: currentUid,
            updatedAt: serverTimestamp(),
          });
        } catch {
          // Gracefully handled: dashboardBrands & local workspace preferences are already persisted
        }
      }

      setDraft(normalizedDraft);
      setDirty(false);
      setSaved(true);
      showToast.success(ar ? 'تم حفظ التغييرات بنجاح' : 'Settings saved successfully');
    } catch (e) {
      const msg = backendError(e);
      setError(msg);
      showToast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adm-workspace workspace-customization-panel">
      <div className="adm-page-head">
        <div>
          <h1>{ar ? 'إعدادات مساحة العمل' : 'Workspace Settings'}</h1>
          <p>
            {ar
              ? 'الهوية والتفضيلات المشتركة لجميع أعضاء مساحة العمل.'
              : 'Branding and preferences shared by every member of this workspace.'}
          </p>
        </div>
      </div>

      <div className="adm-tabs">
        <button className={tab === 'general' ? 'active' : ''} onClick={() => setTab('general')}>
          {ar ? 'عام' : 'General'}
        </button>
        {!isAdmin ? (
          <Link to="/dashboard/settings/domains" className="adm-tab-link">
            <Globe size={14} style={{ display: 'inline', marginInlineEnd: 6, verticalAlign: '-2px' }} />
            {ar ? 'النطاقات' : 'Domains'}
          </Link>
        ) : (
          <button className={tab === 'domains' ? 'active' : ''} onClick={() => setTab('domains')}>
            {ar ? 'النطاقات' : 'Domains'}
          </button>
        )}
        {isAdmin && (
          <button className={tab === 'email' ? 'active' : ''} onClick={() => setTab('email')}>
            {ar ? 'إعدادات البريد' : 'Platform email'}
          </button>
        )}
      </div>

      {tab === 'email' && isAdmin ? (
        <AdminGeneral />
      ) : tab === 'domains' ? (
        <DomainsSettingsPanel />
      ) : !tenantId ? (
        <p role="alert">Select a workspace to manage its settings.</p>
      ) : (
        <div className="ws-settings-stack">
          <form
            className="adm-panel ws-brand-form-panel"
            onSubmit={e => {
              e.preventDefault();
              void save();
            }}
          >
            <fieldset disabled={loading || busy || resetting || !!loadError} className="ws-brand-fieldset">
              {/* Section 1: Brand Identity & Logo Upload with Live Preview */}
              <div className="ws-section-block">
                <div className="ws-section-head">
                  <div>
                    <h2>{ar ? 'الهوية والشعار الرسمي' : 'Brand Identity & Logo'}</h2>
                    <p>
                      {ar
                        ? 'اسم مشروعك وشعارك يظهران في لوحة التحكم والصفحات العامة.'
                        : 'Your project name and logo appear across dashboards and customer-facing pages.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ws-reset-defaults-btn"
                    onClick={() => void resetToDefaults()}
                    disabled={loading || busy || resetting}
                    title={ar ? 'استعادة إعدادات الهوية والسمة الافتراضية' : 'Restore system default identity & theme'}
                  >
                    {resetting ? <Loader2 size={13.5} className="ws-spinner" /> : <RotateCcw size={13.5} />}
                    <span>{resetting ? (ar ? 'جارِ الاستعادة…' : 'Resetting…') : ar ? 'استعادة الافتراضي' : 'Reset to Default'}</span>
                  </button>
                </div>

                <div className="adm-form adm-cms-fields" style={{ marginBottom: 18 }}>
                  <label>
                    {ar ? 'اسم الشركة / المشروع' : 'Business name'}
                    <input
                      required
                      value={draft.name}
                      placeholder={DEFAULT_BRAND_NAME}
                      onChange={e => update('name', e.target.value)}
                    />
                  </label>
                  <label>
                    {ar ? 'بريد الدعم' : 'Support email'}
                    <input
                      type="email"
                      value={draft.supportEmail}
                      placeholder={DEFAULT_SUPPORT_EMAIL}
                      onChange={e => update('supportEmail', e.target.value)}
                    />
                  </label>
                </div>

                <BrandLogoUploader
                  logoUrl={draft.logoUrl}
                  brandName={draft.name}
                  disabled={loading || !!loadError}
                  busy={busy}
                  onChangeUrl={nextUrl => update('logoUrl', nextUrl)}
                  onUploadFile={async file => {
                    setBusy(true);
                    setError('');
                    const localPreview = URL.createObjectURL(file);
                    update('logoUrl', localPreview);
                    try {
                      const uploaded = await uploadBrandFile(tenantId, file, true);
                      update('logoUrl', uploaded.url);
                    } catch {
                      // Fallback: convert file to Base64 data URL so user can preview and save even without Storage bucket access
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === 'string') {
                          update('logoUrl', reader.result);
                        }
                      };
                      reader.readAsDataURL(file);
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              </div>

              {/* Section 2: Visual Theme Selector (Multi-Option Cards) */}
              <div className="ws-section-block">
                <div className="ws-section-head">
                  <div>
                    <h2>
                      <Palette size={17} style={{ display: 'inline', marginInlineEnd: 8, verticalAlign: '-3px', color: 'var(--adm-accent, #6d28d9)' }} />
                      {ar ? 'محدد السمات المرئي (Themes Selector)' : 'Themes Selector'}
                    </h2>
                    <p>
                      {ar
                        ? 'اختر لوحة الألوان المفضلة لمساحة عملك مع معاينة فورية متوازنة في الوضعين الفاتح والداكن.'
                        : 'Choose a curated color palette with instant dual-mode light & dark live preview.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ws-reset-defaults-btn"
                    onClick={() => void resetToDefaults()}
                    disabled={loading || busy || resetting}
                    title={ar ? 'استعادة السمة الافتراضية للمنصة' : 'Reset to default theme'}
                  >
                    {resetting ? <Loader2 size={13.5} className="ws-spinner" /> : <RotateCcw size={13.5} />}
                    <span>{resetting ? (ar ? 'جارِ الاستعادة…' : 'Resetting…') : ar ? 'السمة الافتراضية' : 'Reset to Default'}</span>
                  </button>
                </div>

                <div
                  className="ws-theme-grid"
                  role="radiogroup"
                  aria-label={ar ? 'السمة' : 'Themes Selector'}
                >
                  {(Object.entries(workspaceThemes) as [WorkspacePreferences['theme'], string][]).map(
                    ([themeKey, themeLabel]) => {
                      const palette = themePaletteDetails[themeKey] ?? themePaletteDetails.violet;
                      const isSelected = draft.theme === themeKey;
                      return (
                        <button
                          key={themeKey}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          className={`ws-theme-card${isSelected ? ' is-selected' : ''}`}
                          onClick={() => update('theme', themeKey)}
                          style={{
                            '--theme-primary': palette.primary,
                            '--theme-accent': palette.accent,
                            '--theme-soft': palette.soft,
                            '--theme-dark': palette.darkBg,
                          } as React.CSSProperties}
                        >
                          <div className="ws-theme-preview-banner">
                            <div className="ws-theme-mini-ui">
                              <span className="ws-theme-mini-sidebar" style={{ background: palette.darkBg }}>
                                <i style={{ background: palette.primary }} />
                                <i style={{ background: palette.accent, opacity: 0.75 }} />
                              </span>
                              <span className="ws-theme-mini-canvas">
                                <span className="ws-theme-mini-topbar">
                                  <b style={{ background: palette.primary }} />
                                  <em style={{ background: palette.accent }} />
                                </span>
                                <span className="ws-theme-mini-cards">
                                  <u style={{ borderColor: palette.accent }} />
                                  <u style={{ borderColor: palette.accent }} />
                                </span>
                              </span>
                            </div>
                            <div className="ws-theme-swatches" aria-hidden="true">
                              <span style={{ background: palette.primary }} title={ar ? 'اللون الأساسي' : 'Primary'} />
                              <span style={{ background: palette.accent }} title={ar ? 'اللون الثانوي' : 'Accent'} />
                              <span style={{ background: palette.darkBg }} title={ar ? 'السطح الداكن' : 'Surface Dark'} />
                            </div>
                          </div>

                          <div className="ws-theme-card-body">
                            <div className="ws-theme-card-title-row">
                              <b>{themeLabel}</b>
                              {isSelected ? (
                                <span className="ws-theme-active-badge" style={{ background: palette.primary, color: '#ffffff' }}>
                                  <Check size={12} />
                                  {ar ? 'مفعل' : 'Active'}
                                </span>
                              ) : (
                                <span className="ws-theme-tag">
                                  {ar ? palette.badge[1] : palette.badge[0]}
                                </span>
                              )}
                            </div>
                            <small>{ar ? palette.desc[1] : palette.desc[0]}</small>
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Section 3: Regional & Appearance Defaults */}
              <div className="ws-section-block">
                <div className="ws-section-head">
                  <div>
                    <h2>
                      <Sparkles size={16} style={{ display: 'inline', marginInlineEnd: 8, verticalAlign: '-2px', color: 'var(--adm-accent, #6d28d9)' }} />
                      {ar ? 'اللغة والمنطقة والوضع الافتراضي' : 'Regional & Appearance Defaults'}
                    </h2>
                    <p>
                      {ar
                        ? 'تفضيلات العرض والعملة والمنطقة الزمنية الافتراضية.'
                        : 'Default display mode, language, currency, and timezone across this workspace.'}
                    </p>
                  </div>
                </div>

                <div className="adm-form adm-cms-fields">
                  <label>
                    {ar ? 'اختر اللغة' : 'Choose Language'}
                    <Select
                      label={ar ? 'اختر اللغة' : 'Choose Language'}
                      value={draft.language}
                      onChange={value => update('language', value as WorkspacePreferences['language'])}
                      options={[
                        { value: 'en', label: 'English' },
                        { value: 'ar', label: 'العربية' },
                      ]}
                    />
                  </label>
                  <label>
                    {ar ? 'الوضع الافتراضي' : 'Default Mode'}
                    <Select
                      label={ar ? 'الوضع الافتراضي' : 'Default Mode'}
                      value={draft.mode}
                      onChange={value => update('mode', value as WorkspacePreferences['mode'])}
                      options={[
                        { value: 'light', label: ar ? 'فاتح' : 'Light' },
                        { value: 'dark', label: ar ? 'داكن' : 'Dark' },
                        { value: 'system', label: ar ? 'النظام' : 'System' },
                      ]}
                    />
                  </label>
                  <label>
                    {ar ? 'العملة' : 'Currency'}
                    <Select
                      label={ar ? 'العملة' : 'Currency'}
                      value={draft.currency}
                      onChange={value => update('currency', value)}
                      options={['USD', 'SAR', 'EUR', 'EGP', 'AED', 'GBP']}
                    />
                  </label>
                  <label>
                    {ar ? 'المنطقة الزمنية' : 'Timezone'}
                    <TimezoneSelect
                      value={draft.timezone}
                      onChange={value => update('timezone', value)}
                      disabled={loading || busy}
                    />
                  </label>
                </div>
              </div>

              <div className="ws-brand-save-footer">
                <div className="ws-brand-note">
                  <Info size={14} className="ws-brand-note-icon" />
                  <span>
                    {ar
                      ? 'تُطبّق التفضيلات على مستوى مساحة العمل بالكامل. تغيير العملة يؤثر على تنسيق العرض فقط.'
                      : 'Preferences apply globally across this workspace. Currency changes affect display format only.'}
                  </span>
                </div>
                <div className="ws-brand-save-actions">
                  {(error || loadError) && (
                    <p className="st-error" role="alert" style={{ margin: 0 }}>
                      {error || loadError}
                    </p>
                  )}
                  {saved && (
                    <p className="st-success" role="status" style={{ margin: 0 }}>
                      {ar ? 'تم الحفظ بنجاح' : 'Settings saved'}
                    </p>
                  )}
                  <button
                    type="button"
                    className="ws-reset-defaults-btn"
                    onClick={() => void resetToDefaults()}
                    disabled={loading || busy || resetting}
                    title={ar ? 'استعادة جميع الإعدادات الافتراضية' : 'Restore system defaults'}
                  >
                    {resetting ? <Loader2 size={13.5} className="ws-spinner" /> : <RotateCcw size={13.5} />}
                    <span>{resetting ? (ar ? 'جارِ الاستعادة…' : 'Resetting…') : ar ? 'استعادة الافتراضي' : 'Reset to Default'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void save()}
                    className="adm-primary ws-save-btn"
                    disabled={!dirty || busy || resetting}
                  >
                    {busy ? (
                      <>
                        <Loader2 size={14} className="ws-spinner" />
                        <span>{ar ? 'جارِ الحفظ…' : 'Saving…'}</span>
                      </>
                    ) : (
                      <span>{ar ? 'حفظ التغييرات' : 'Save changes'}</span>
                    )}
                  </button>
                </div>
              </div>
            </fieldset>
          </form>

          {/* Section 4: Dedicated Change Password with Auto-Logout */}
          <ChangePasswordCard className="w-full" />
        </div>
      )}
    </div>
  );
}
