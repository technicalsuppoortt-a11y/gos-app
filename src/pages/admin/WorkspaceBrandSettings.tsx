import { useEffect, useState } from 'react';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { Check, Globe, Info, Palette, Sparkles } from 'lucide-react';
import { auth, db, backendError } from '../../backend/firebase';
import {
  DEFAULT_BRAND_LOGO_URL,
  DEFAULT_BRAND_NAME,
  DEFAULT_SUPPORT_EMAIL,
  preferenceDefaults,
  uploadBrandFile,
  useWorkspacePreferences,
  workspaceThemes,
  type WorkspacePreferences,
} from '../../backend/workspacePreferences';
import { themePaletteDetails } from '../../branding/workspaceTheme';
import { useUILanguage } from '../../i18n/display';
import { AdminGeneral } from './AdminGeneral';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
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

  const [draft, setDraft] = useState<WorkspacePreferences>(() => withBrandFallbacks(values, userEmail));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
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

  const update = <K extends keyof WorkspacePreferences>(key: K, value: WorkspacePreferences[K]) => {
    setDraft(p => ({ ...p, [key]: value }));
    setDirty(true);
    setSaved(false);
    if (key === 'theme') {
      document.documentElement.dataset.workspaceTheme = String(value);
    }
  };

  async function save() {
    if (!tenantId) return;
    setBusy(true);
    setError('');
    try {
      Intl.DateTimeFormat('en', { timeZone: draft.timezone });
      const normalizedDraft: WorkspacePreferences = {
        ...draft,
        name: draft.name.trim() || DEFAULT_BRAND_NAME,
        logoUrl: draft.logoUrl.trim() || DEFAULT_BRAND_LOGO_URL,
        supportEmail: draft.supportEmail.trim() || userEmail || DEFAULT_SUPPORT_EMAIL,
      };
      if (
        normalizedDraft.logoUrl &&
        !/^https:\/\//.test(normalizedDraft.logoUrl) &&
        !/^\/(?!\/)/.test(normalizedDraft.logoUrl) &&
        !/^data:image\//.test(normalizedDraft.logoUrl)
      ) {
        throw new Error('Use an HTTPS logo URL, a local path (/...), or upload an image.');
      }
      await runTransaction(db, async tx => {
        const target = doc(db, 'tenants', tenantId, 'preferences', 'general');
        const existing = (await tx.get(target)).data()?.values;
        if (
          !!existing !== !!base ||
          (existing &&
            base &&
            Object.keys(preferenceDefaults).some(
              key => existing[key] !== base[key as keyof WorkspacePreferences]
            ))
        ) {
          throw new Error('Settings changed in another session. Reload to review the latest version.');
        }
        tx.set(target, {
          values: normalizedDraft,
          updatedBy: auth.currentUser?.uid,
          updatedAt: serverTimestamp(),
        });
        if (isAdmin && auth.currentUser) {
          tx.set(doc(db, 'dashboardBrands', auth.currentUser.uid), {
            values: normalizedDraft,
            updatedBy: auth.currentUser.uid,
            updatedAt: serverTimestamp(),
          });
        }
      });
      setDraft(normalizedDraft);
      setDirty(false);
      setSaved(true);
    } catch (e) {
      setError(backendError(e));
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
        {!isAdmin && (
          <Link to="/dashboard/settings/business-assets">
            {ar ? 'أصول الأعمال' : 'Business Assets'}
          </Link>
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
            <fieldset disabled={loading || busy || !!loadError} className="ws-brand-fieldset">
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
                    try {
                      const uploaded = await uploadBrandFile(tenantId, file, true);
                      update('logoUrl', uploaded.url);
                    } catch (err) {
                      setError(backendError(err));
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
                        ? 'اختر لوحة الألوان المفضلة لمساحة عملك مع معاينة فورية متوازنة.'
                        : 'Choose a curated color palette for your workspace with instant live preview.'}
                    </p>
                  </div>
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
                        >
                          <div className="ws-theme-preview-banner" style={{ background: palette.soft }}>
                            <div className="ws-theme-mini-ui">
                              <span className="ws-theme-mini-sidebar" style={{ background: palette.darkBg }}>
                                <i style={{ background: palette.primary }} />
                                <i style={{ background: palette.accent, opacity: 0.65 }} />
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
                              <span style={{ background: palette.primary }} title="Primary" />
                              <span style={{ background: palette.accent }} title="Accent" />
                              <span style={{ background: palette.darkBg }} title="Surface Dark" />
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
                  <button className="adm-primary" disabled={!dirty || busy}>
                    {busy ? 'Saving…' : ar ? 'حفظ التغييرات' : 'Save changes'}
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
