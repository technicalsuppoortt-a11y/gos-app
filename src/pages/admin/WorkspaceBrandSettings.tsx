import { useEffect, useRef, useState } from 'react';
import { Check, Globe, Info, Loader2, Palette, RotateCcw, Sparkles } from 'lucide-react';
import { backendError } from '../../backend/firebase';
import { browserStorage } from '../../utils/browserStorage';
import { showToast } from '../../utils/toast';
import {
  DEFAULT_SUPPORT_EMAIL,
  preferenceDefaults,
  sanitizeWorkspacePreferences,
  uploadBrandFile,
  useWorkspacePreferences,
  workspaceThemes,
  inheritWorkspacePreferences,
  saveWorkspacePreferences,
  type PersonalPreferences,
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

export function WorkspaceBrandSettings() {
  const { values, effective, topbarChange, tenantId, loading, error: loadError, canPublish, preview } = useWorkspacePreferences();
  const ar = useUILanguage().startsWith('ar');
  const role = useSelector((s: RootState) => s.auth.role);
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(role ?? '');

  const [edits, setEdits] = useState<Partial<WorkspacePreferences>>({});
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<'general' | 'domains' | 'email'>('general');
  const draft = resetting ? preferenceDefaults : { ...(values ?? preferenceDefaults), ...edits };
  const dirty = Object.keys(edits).length > 0;

  useEffect(() => {
    const { theme, mode, language, currency } = edits;
    preview(resetting ? preferenceDefaults : dirty && tab === 'general' ? {
      ...(theme && { theme }),
      ...(mode && { mode }),
      ...(language && { language }),
      ...(currency && { currency }),
    } : null);
    return () => preview(null);
  }, [dirty, edits, preview, resetting, tab]);

  const previousTopbarChange = useRef(topbarChange);
  useEffect(() => {
    if (!topbarChange || previousTopbarChange.current === topbarChange) return;
    previousTopbarChange.current = topbarChange;
    const { language, currency, mode } = topbarChange;
    if (!language && !currency && !mode) return;
    // The Topbar saves a personal choice. Saving this draft publishes it to the workspace.
    setEdits(current => ({
      ...current,
      ...(language && { language }),
      ...(currency && { currency }),
      ...(mode && { mode }),
    }));
    setSaved(false);
  }, [topbarChange]);

  function update<K extends keyof WorkspacePreferences>(key: K, value: WorkspacePreferences[K]) {
    setEdits(current => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function save(reset = false) {
    if (loading || busy || resetting) return;
    if (reset) {
      setResetting(true);
      for (const key of ['workspace_theme', 'workspace_preferences_local', 'gos-theme-mode']) {
        browserStorage.removeItem(key);
      }
      preview(preferenceDefaults);
    } else {
      setBusy(true);
    }
    setError('');
    setSaved(false);
    try {
      const next = reset ? preferenceDefaults : draft;
      Intl.DateTimeFormat('en', { timeZone: next.timezone });
      if (next.logoUrl && !/^(https:\/\/|\/(?!\/)|data:image\/)/.test(next.logoUrl.trim())) {
        throw new Error('Use an HTTPS logo URL, a local path (/...), or upload an image.');
      }
      const personalPatch: PersonalPreferences = reset ? inheritWorkspacePreferences : {};
      if (!reset) {
        if (edits.language) personalPatch.language = null;
        if (edits.currency) personalPatch.currency = null;
        if (edits.mode) personalPatch.mode = null;
        if (edits.timezone) personalPatch.timezone = null;
      }
      await saveWorkspacePreferences(tenantId, sanitizeWorkspacePreferences(next), canPublish, personalPatch);
      setEdits({});
      setSaved(true);
      showToast.success(reset
        ? (ar ? 'تمت استعادة الإعدادات الافتراضية' : 'Workspace defaults restored.')
        : (ar ? 'تم حفظ التغييرات بنجاح' : 'Settings saved successfully'));
    } catch (cause) {
      const message = backendError(cause);
      setError(message);
      showToast.error(message);
    } finally {
      setBusy(false);
      setResetting(false);
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
                    onClick={() => void save(true)}
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
                      placeholder={preferenceDefaults.name}
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
                    } catch (cause) {
                      setError(backendError(cause));
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
                    onClick={() => void save(true)}
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
                      value={resetting ? preferenceDefaults.language : edits.language ?? effective.language}
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
                      value={resetting ? preferenceDefaults.mode : edits.mode ?? effective.mode}
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
                      value={resetting ? preferenceDefaults.currency : edits.currency ?? effective.currency}
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
                    onClick={() => void save(true)}
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
