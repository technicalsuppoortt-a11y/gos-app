import { logoutFirebase } from '../../backend/session';
import { showToast as authToast, showToast } from '../../utils/toast';
import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useBlocker, useNavigate } from 'react-router-dom';
import { CalendarDays, Camera, Check, Clock3, Globe2, Mail, Megaphone, Moon, Phone, Trash2, UserRound } from 'lucide-react';
import { LinkedinLogo, YoutubeLogo } from '@phosphor-icons/react';
import { InstagramIcon, FacebookIcon } from '../inbox/ChannelIcons';
import { useTranslation } from 'react-i18next';
import portrait from '../../assets/inbox/mohamed.jpg';
import { setTheme, setLanguage, setCurrency } from '../../store/slices/uiSlice';
import type { RootState } from '../../store';
import { storageSet } from '../../utils/browserStorage';
import { Badge, Card, Field, Modal, Toggle } from './kit';
import { Select } from '../../components/ui/Select';
import { TimezoneSelect } from '../../components/ui/TimezoneSelect';
import { friendlyError, settingsApiEnabled, settingsRequest } from './data';
import type { Profile, SettingsData } from './data';
import { PanelHeading } from './kit';
import { ChangePasswordCard } from './ChangePasswordCard';
import { useWorkspacePreferences } from '../../backend/workspacePreferences';

const CURRENCY_SELECT_OPTIONS = [
  { value: 'USD', label: '$ · USD (US Dollar)' },
  { value: 'EUR', label: '€ · EUR (Euro)' },
  { value: 'EGP', label: 'E£ · EGP (Egyptian Pound)' },
  { value: 'GBP', label: '£ · GBP (British Pound)' },
  { value: 'AED', label: 'د.إ · AED (UAE Dirham)' },
  { value: 'SAR', label: '﷼ · SAR (Saudi Riyal)' },
];

export function ProfilePanel({ data, save }: { data: SettingsData; save: (data: SettingsData) => Promise<void> }) {
  useUILanguage();
  const file = useRef<HTMLInputElement>(null), dispatch = useDispatch(), navigate = useNavigate();
  const { i18n } = useTranslation();
  const theme = useSelector((s: RootState) => s.ui.theme);
  const { values: workspacePrefs } = useWorkspacePreferences();

  // Check if this user account already has saved personal preference overrides in Firestore
  const hasUserOverrides = Boolean(data.hasSavedProfile || data.profile?.hasUserOverrides);

  // Compute profile state inheriting from workspace admin defaults when user overrides are not present
  const computeInitialProfile = (currentProfile: Profile, ws: typeof workspacePrefs): Profile => {
    if (hasUserOverrides) {
      return {
        ...currentProfile,
        currency: currentProfile.currency || 'USD',
        mode: currentProfile.mode || (theme === 'dark' ? 'dark' : 'light'),
        dateFormat: currentProfile.dateFormat || 'DD / MM / YYYY',
      };
    }
    // Inherit from Workspace Admin defaults
    const adminLang = ws?.language === 'ar' ? 'Arabic' : 'English';
    const adminCurrency = ws?.currency || 'USD';
    const adminTimezone = ws?.timezone || currentProfile.timezone || 'Africa/Cairo';
    const adminMode = ws?.mode || 'system';
    const adminDateFormat = ws?.dateFormat || currentProfile.dateFormat || 'DD / MM / YYYY';
    return {
      ...currentProfile,
      language: adminLang,
      currency: adminCurrency,
      timezone: adminTimezone,
      mode: adminMode,
      dateFormat: adminDateFormat,
    };
  };

  const [draft, setDraft] = useState<Profile>(() => computeInitialProfile(data.profile, workspacePrefs));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  // Keep draft in sync with persisted profile data when user hasn't made dirty edits
  useEffect(() => {
    if (!isDirty) {
      setDraft(computeInitialProfile(data.profile, workspacePrefs));
    }
  }, [data.profile, hasUserOverrides]);

  // When workspace admin defaults finish loading, hydrate form if user has no overrides and hasn't edited
  useEffect(() => {
    if (workspacePrefs && !hasUserOverrides && !isDirty) {
      setDraft(prev => ({
        ...prev,
        language: workspacePrefs.language === 'ar' ? 'Arabic' : 'English',
        currency: workspacePrefs.currency || prev.currency || 'USD',
        timezone: workspacePrefs.timezone || prev.timezone || 'Africa/Cairo',
        mode: workspacePrefs.mode || prev.mode || 'system',
        dateFormat: workspacePrefs.dateFormat || prev.dateFormat || 'DD / MM / YYYY',
      }));
    }
  }, [workspacePrefs, hasUserOverrides, isDirty]);

  const closeDelete = useCallback(() => setDeleteOpen(false), []);
  const blocker = useBlocker(isDirty && !busy);
  const closeLeave = useCallback(() => { if (blocker.state === 'blocked') blocker.reset(); }, [blocker]);
  useEffect(() => { const handler = (e: BeforeUnloadEvent) => { if (isDirty) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', handler); return () => window.removeEventListener('beforeunload', handler); }, [isDirty]);

  // Modifying any input strictly updates local component state only
  const update = (key: keyof Profile, value: any) => {
    setIsDirty(true);
    setDraft(p => ({ ...p, [key]: value }));
  };

  const isDarkModeChecked = draft.mode === 'dark' || (draft.mode === 'system' && (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)) || (!draft.mode && theme === 'dark');

  const avatar = draft.photo;
  const avatarView = (large = false) => avatar ? <img className={`st-avatar${large ? ' large' : ''}`} src={avatar} alt={translateText(draft.name)} onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = portrait; }}/>: <span className={`st-avatar st-initials${large ? ' large' : ''}`}>{localizeNode(draft.name.split(' ').map(x => x[0]).slice(0, 2).join(''))}</span>;

  return <>
    {localizeNode(blocker.state === 'blocked' && (
      <Modal title={translateText("Leave without saving?")} close={closeLeave}>
        <p>{translateText("Your profile changes haven’t been saved.")}</p>
        <div className="st-modal-actions">
          <button className="st-secondary" onClick={closeLeave}>{translateText("Keep editing")}</button>
          <button className="st-danger" onClick={() => { setIsDirty(false); blocker.proceed(); }}>{translateText("Discard changes")}</button>
        </div>
      </Modal>
    ))}
    <PanelHeading title={translateText("Profile Settings")} description="Manage your personal information and account preferences."/>
    <form onSubmit={async e => {
      e.preventDefault();
      setBusy(true);
      setError('');
      try {
        const activeCurrency = draft.currency || 'USD';
        const activeMode = draft.mode || (theme === 'dark' ? 'dark' : 'light');
        const updated: Profile = {
          ...draft,
          currency: activeCurrency,
          mode: activeMode,
          hasUserOverrides: true,
        };

        // 1. Commit to Firestore user profile data
        await save({ ...data, profile: updated, hasSavedProfile: true });
        setIsDirty(false);

        // 2. Commit Language globally
        const langCode = updated.language === 'Arabic' ? 'ar' : 'en';
        dispatch(setLanguage(langCode));
        await i18n.changeLanguage(langCode);
        storageSet('i18nextLng', langCode);

        // 3. Commit Currency globally
        dispatch(setCurrency(activeCurrency));
        storageSet('preferred_currency', activeCurrency);
        window.dispatchEvent(new CustomEvent('gos-currency-changed', { detail: { currency: activeCurrency } }));

        // 4. Commit Theme / Appearance Mode globally
        const resolvedTheme = activeMode === 'system'
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : activeMode;
        dispatch(setTheme(resolvedTheme));
        storageSet('gos-theme-mode', activeMode);

        showToast.success(updated.language === 'Arabic' ? 'تم حفظ إعدادات الملف الشخصي بنجاح' : 'Profile settings saved successfully');
      } catch (e) {
        setError(friendlyError(e));
      } finally {
        setBusy(false);
      }
    }}>
      <div className="st-profile-grid">
        <Card className="st-profile-form">
          <div className="st-section-title"><h3>{translateText("Profile Photo")}</h3><p>{translateText("This photo will be used across your account.")}</p></div>
          <div className="st-photo-row">
            <div className="st-avatar-wrap">
              {localizeNode(avatarView(true))}
              <button type="button" aria-label={translateText("Change profile photo")} className="st-camera" onClick={() => file.current?.click()}><Camera size={13}/></button>
            </div>
            <div>
              <div className="st-photo-actions">
                <button type="button" className="st-secondary" onClick={() => file.current?.click()}>{translateText("Change Photo")}</button>
                <button type="button" className="st-danger" onClick={() => update('photo', '')}>{translateText("Remove")}</button>
              </div>
              <small>{translateText("JPG, PNG or GIF. Max 5MB.")}</small>
            </div>
            <input ref={file} type="file" hidden accept="image/jpeg,image/png,image/gif" onChange={e => {
              const image = e.target.files?.[0];
              e.target.value = '';
              if (!image) return;
              if (!['image/jpeg', 'image/png', 'image/gif'].includes(image.type) || image.size > 5 * 1024 * 1024) {
                setError('Choose a JPG, PNG or GIF image smaller than 5MB.');
                return;
              }
              const reader = new FileReader();
              reader.onload = () => { update('photo', String(reader.result)); setError(''); };
              reader.onerror = () => setError('This image could not be opened. Choose another file.');
              reader.readAsDataURL(image);
            }}/>
          </div>

          <div className="st-section-title"><h3>{translateText("Personal Information")}</h3><p>{translateText("Update your personal details.")}</p></div>
          <div className="st-form-grid">
            <Field label="Full Name"><input required maxLength={100} autoComplete="name" value={draft.name} onChange={e => update('name', e.target.value)}/></Field>
            <Field label="Email Address"><input type="email" required autoComplete="email" value={draft.email} onChange={e => update('email', e.target.value)}/></Field>
            <Field label="Phone Number"><span className="st-phone-field"><span aria-label={translateText("Egypt")}>🇪🇬</span><input type="tel" autoComplete="tel" value={draft.phone} onChange={e => update('phone', e.target.value)}/></span></Field>
            <Field label="Language"><Select value={draft.language} onChange={value => update('language', value)} options={[{ value: 'English', label: 'EN · English' }, { value: 'Arabic', label: 'AR · العربية' }]} /></Field>
            <Field label="Currency"><Select value={draft.currency || 'USD'} onChange={value => update('currency', value)} options={CURRENCY_SELECT_OPTIONS} /></Field>
            <Field label="Timezone"><TimezoneSelect value={draft.timezone} onChange={value => update('timezone', value)}/></Field>
            <Field label="Date Format"><Select value={draft.dateFormat || 'DD / MM / YYYY'} onChange={value => update('dateFormat', value)} options={['DD / MM / YYYY', 'MM / DD / YYYY', 'YYYY / MM / DD']} /></Field>
          </div>

          <div className="st-section-title st-preferences-title"><h3>{translateText("Preferences")}</h3><p>{translateText("Customize your experience.")}</p></div>
          {localizeNode([
            { name: 'Email Notifications', text: 'Receive important updates via email', icon: Mail, value: draft.emailNotifications, change: (v: boolean) => update('emailNotifications', v) },
            { name: 'Marketing Updates', text: 'Receive tips, new features and offers', icon: Megaphone, value: draft.marketing, change: (v: boolean) => update('marketing', v) },
            {
              name: 'Appearance Mode',
              text: isDarkModeChecked ? 'Dark mode' : 'Light mode',
              icon: Moon,
              value: isDarkModeChecked,
              change: (checked: boolean) => update('mode', checked ? 'dark' : 'light'),
            }
          ].map(p => (
            <div key={p.name} className="st-preference">
              <span className="st-preference-icon"><p.icon size={17}/></span>
              <span><b>{localizeNode(p.name)}</b><small>{localizeNode(p.text)}</small></span>
              <Toggle label={p.name} checked={p.value} onChange={p.change}/>
            </div>
          )))}
        </Card>

        <aside className="st-profile-summary">
          <Card title={translateText("Account Overview")} action={<Badge>{translateText("Active")}</Badge>}>
            <dl className="st-account-list">
              {[[UserRound, 'Name', draft.name], [Mail, 'Email', draft.email], [Phone, 'Phone', draft.phone || '—'], [Globe2, 'Language', draft.language], [Clock3, 'Timezone', draft.timezone], [CalendarDays, 'Member Since', draft.memberSince || '—']].map(([Icon, label, value]) => {
                const I = Icon as typeof UserRound;
                return <div key={String(label)}><dt><I size={15}/>{localizeNode(String(label))}</dt><dd>{localizeNode(String(value))}</dd></div>;
              })}
            </dl>
          </Card>
          <Card title={translateText("Profile Preview")} description="This is how your profile appears to clients.">
            <div className="st-preview">
              {localizeNode(avatarView())}
              <b>{localizeNode(draft.name)}</b>
              <small>{localizeNode(draft.title)}</small>
              <p>{localizeNode(draft.bio)}</p>
              <div className="st-socials">
                <a href="https://www.instagram.com/" target="_blank" rel="noreferrer" aria-label={translateText("Instagram")}><InstagramIcon size={18}/></a>
                <a href="https://www.facebook.com/" target="_blank" rel="noreferrer" aria-label={translateText("Facebook")}><FacebookIcon size={18}/></a>
                <a href="https://www.youtube.com/" target="_blank" rel="noreferrer" aria-label={translateText("YouTube")}><YoutubeLogo weight="fill" size={20} color="#ff0033"/></a>
                <a href="https://www.linkedin.com/" target="_blank" rel="noreferrer" aria-label={translateText("LinkedIn")}><LinkedinLogo weight="fill" size={18} color="#0a7db5"/></a>
              </div>
              <button className="st-primary" type="button" onClick={() => navigate('/dashboard/booking')}><CalendarDays size={15}/>{translateText("Book a Call")}</button>
            </div>
          </Card>
        </aside>
      </div>

      {localizeNode(error && <p className="st-error" role="alert">{localizeNode(error)}</p>)}
      <div className="st-form-footer">
        <button type="button" className="st-danger" onClick={() => { setError(''); setDeleteOpen(true); }}><Trash2 size={14}/>{translateText("Delete Account")}</button>
        <button className="st-primary" disabled={busy}><Check size={15}/>{localizeNode(busy ? 'Saving…' : 'Save Changes')}</button>
      </div>
    </form>

    <ChangePasswordCard className="w-full" />

    {localizeNode(deleteOpen && (
      <Modal title={translateText("Delete your account?")} close={closeDelete}>
        <p>{translateText("This permanently deletes your account and personal data. This action cannot be undone.")}</p>
        <Field label="Type DELETE to confirm"><input value={confirmation} onChange={e => setConfirmation(e.target.value)}/></Field>
        {localizeNode(!settingsApiEnabled && <p className="st-note">{translateText("Account deletion requires the account service to be connected. Your account will remain active.")}</p>)}
        {localizeNode(error && <p className="st-error" role="alert">{localizeNode(error)}</p>)}
        <div className="st-modal-actions">
          <button className="st-secondary" onClick={closeDelete}>{translateText("Cancel")}</button>
          <button disabled={confirmation !== 'DELETE' || busy} className="st-danger" onClick={async () => {
            setBusy(true);
            try {
              await settingsRequest('/account', { confirmation }, 'DELETE');
              void logoutFirebase().catch(error => authToast.error(error.message));
              navigate('/auth/login', { replace: true });
            } catch (e) {
              setError(friendlyError(e));
            } finally {
              setBusy(false);
            }
          }}>{translateText("Delete Account")}</button>
        </div>
      </Modal>
    ))}
  </>;
}
