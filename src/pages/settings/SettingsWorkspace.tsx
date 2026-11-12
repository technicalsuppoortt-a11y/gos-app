import { MarketingTracking } from '../MarketingTracking';
import { useUILanguage, localizeNode, translateText } from '../../i18n/display';
import { useCallback, useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Check, ChevronRight } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { updateUserProfile } from '../../store/slices/authSlice';
import type { RootState } from '../../store';
import { showToast } from '../../utils/toast';
import { Card, Field, PanelHeading, Toggle } from './kit';
import { Select } from '../../components/ui/Select';
import { defaultSettings, friendlyError, settingsRequest } from './data';
import type { SettingsData } from './data';
import { ProfilePanel } from './ProfilePanel';
import { BillingPanel } from './BillingPanel';
import { PaymentMethodsPanel } from './PaymentMethodsPanel';
import { IntegrationsPanel } from './IntegrationsPanel';
import { TeamPanel, SecurityPanel } from './SystemPanels';
import { settingsTabs as tabs, settingsAliases as aliases } from './navigation';
import { KnowledgePanel } from './KnowledgePanel';
import { PrivacyPolicyPanel } from './PrivacyPolicyPanel';
import { DomainsSettingsPanel } from './DomainsSettingsPanel';
import { type PersonalPreferences } from '../../backend/workspacePreferences';
import './settings-controls.css';
import './settings.css';

const CURRENCY_SELECT_OPTIONS = [
  { value: 'USD', label: '$ · USD (US Dollar)' },
  { value: 'EUR', label: '€ · EUR (Euro)' },
  { value: 'EGP', label: 'EGP (Egyptian Pound)' },
  { value: 'GBP', label: '£ · GBP (British Pound)' },
  { value: 'AED', label: 'AED (UAE Dirham)' },
  { value: 'SAR', label: 'SAR (Saudi Riyal)' },
];

export function SettingsWorkspace() {
  const uid = useSelector((state: RootState) => state.auth.user?.id);
  const tenantId = useSelector((state: RootState) => state.auth.tenant?.id);
  return <ScopedSettings key={JSON.stringify([uid, tenantId])}/>;
}

function ScopedSettings() {
  useUILanguage();
  const auth = useSelector((s: RootState) => s.auth);
  return <SettingsWorkspaceView key={`${auth.tenant?.id ?? 'demo'}:${auth.user?.id ?? 'demo'}`}/>;
}
function SettingsWorkspaceView() {
  useUILanguage();
  const dispatch = useDispatch();
  const location = useLocation();
  const user = useSelector((state: RootState) => state.auth.user);
  const [data, setData] = useState<SettingsData>(defaultSettings), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const segment = location.pathname.split('/').filter(Boolean).at(-1);
  const active = tabs.find(t => t.slug === (aliases[segment ?? ''] ?? segment)) ?? tabs[0];
  const agencyUid = user?.accountType === 'agency' && active.slug === 'billing' ? user.id : null;
  const refresh = useCallback(async () => {
    setError('');
    try {
      const loaded = await settingsRequest<SettingsData>('/settings');
      setData(loaded);
      if (loaded.profile?.photo && !user?.avatar) {
        dispatch(updateUserProfile({ avatar: loaded.profile.photo }));
      }
    } catch (e) { setError(friendlyError(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { if (active.slug !== 'domains') void refresh(); }, [refresh, active.slug]);
  async function save(next: SettingsData, personalPreferences?: PersonalPreferences) {
    const result = await settingsRequest<{ profile: SettingsData['profile'] }>('/settings', {
      profile: next.profile, business: next.business, payment: next.payment, personalPreferences,
    }, 'PATCH');
    const savedProfile = { ...next.profile, ...result.profile };
    setData({ ...next, profile: savedProfile });
    dispatch(updateUserProfile({ name: savedProfile.name, avatar: savedProfile.photo ?? '' }));
    showToast.success('Changes saved');
  }
  if (segment === 'general' || segment === 'business-assets' || segment === 'tools') return <Navigate to="/dashboard/settings/profile" replace />;
  const retiredBillingPath = /^\/dashboard\/settings\/billing\/(?:payment-methods|payments)\/?$/.test(location.pathname);
  const billingQuery = new URLSearchParams(location.search);
  if (retiredBillingPath || (active.slug === 'billing' && billingQuery.get('tab') === 'payment-methods')) {
    billingQuery.set('tab', 'overview');
    return <Navigate to={{ pathname: '/dashboard/settings/billing', search: billingQuery.toString(), hash: location.hash }} replace/>;
  }
  if (active.slug === 'domains') return <DomainsSettingsPanel/>;
  if (active.slug === 'payment-methods') return <PaymentMethodsPanel scope="user"/>;
  if (active.slug === 'billing' && segment !== 'billing') {
    const query = new URLSearchParams(location.search);
    if (!query.has('tab')) {
      if (segment && ['wallet', 'billing-wallet', 'billing-and-wallet'].includes(segment)) query.set('tab', 'wallet');
      if (segment && ['plans', 'plans-pricing', 'plans-and-pricing', 'pricing'].includes(segment) && !agencyUid) query.set('tab', 'plans');
    }
    return <Navigate to={{ pathname: '/dashboard/settings/billing', search: query.toString(), hash: location.hash }} replace/>;
  }
  return <div className="st-workspace w-full">
    <div className="st-layout w-full">
      <div className={`st-content st-${active.slug} w-full`} key={active.slug}>
        {active.slug === 'billing' ? <BillingPanel data={data} integrations={loading || error ? undefined : data.integrations} refresh={refresh} saveLocal={save} agencyUid={agencyUid}/> : localizeNode(loading ? <div className="st-loading" role="status" aria-label={translateText("Loading settings")}><div/><div/><div/></div> : error ? <Card title={translateText("Settings could not be loaded")} className="w-full"><p className="st-error" role="alert">{localizeNode(error)}</p><button className="st-primary" onClick={() => void refresh()}>{translateText("Try again")}</button></Card> : <>
          {active.slug === 'pixel' && <MarketingTracking/>}
          {active.slug === 'domains' && <DomainsSettingsPanel/>}
          {localizeNode(active.slug === 'profile' && <ProfilePanel data={data} save={save}/>)}
          {localizeNode(active.slug === 'integrations' && <IntegrationsPanel data={data} refresh={refresh}/>)}
          {localizeNode(active.slug === 'business' && <BusinessPanel data={data} save={save}/>)}
          {localizeNode(active.slug === 'team' && <TeamPanel/>)}
          {localizeNode(active.slug === 'security' && <SecurityPanel/>)}
          {localizeNode(active.slug === 'knowledge' && <KnowledgePanel/>)}
          {localizeNode(active.slug === 'privacy' && <PrivacyPolicyPanel/>)}
        </>)}
      </div>
    </div>
  </div>;
}

function BusinessPanel({ data, save }: { data: SettingsData; save: (data: SettingsData) => Promise<void> }) {
  useUILanguage();
  const [draft, setDraft] = useState(data.business), [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    setDraft(data.business);
  }, [data.business]);
  const update = (key: keyof typeof draft, value: string) => setDraft(p => ({ ...p, [key]: value }));
  return <div className="st-business w-full">
    <PanelHeading title={translateText("Business Settings")} description={translateText("Your business identity and defaults used across Upclick.")}/>
    <form className="st-business-form w-full" onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try { await save({ ...data, business: draft }); } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); } }}>
      <Card title={translateText("Business identity")} description="Your brand appears on customer-facing pages and communications." className="w-full">
        <div className="st-form-grid two">
          <Field label={translateText("Business name")}><input required value={draft.name} onChange={e => update('name', e.target.value)}/></Field>
          <Field label={translateText("Business type")}><Select value={draft.type} onChange={value => update('type', value)} options={['Creative services', 'Consulting', 'Education', 'Retail', 'Other']} /></Field>
          <Field label={translateText("Business email")}><input type="email" required value={draft.email} onChange={e => update('email', e.target.value)}/></Field>
          <Field label={translateText("Phone number")}><input type="tel" value={draft.phone} onChange={e => update('phone', e.target.value)}/></Field>
          <Field label={translateText("Business address")} className="full-span"><input value={draft.address} onChange={e => update('address', e.target.value)}/></Field>
          <Field label={translateText("Public description")} className="full-span"><textarea value={draft.description} onChange={e => update('description', e.target.value)}/></Field>
        </div>
      </Card>
      {localizeNode(error && <p className="st-error" role="alert">{localizeNode(error)}</p>)}
      <div className="st-form-footer">
        <span/>
        <button disabled={busy} className="st-primary"><Check size={15}/>{localizeNode(busy ? 'Saving…' : 'Save Changes')}</button>
      </div>
    </form>
  </div>;
}
export function PaymentsPanel({ data, save }: { data: SettingsData; save: (data: SettingsData) => Promise<void> }) {
  useUILanguage();
  const [draft, setDraft] = useState(data.payment), [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    setDraft(data.payment);
  }, [data.payment]);
  const navigate = useNavigate();
  return <><PanelHeading title={translateText("Payment preferences")} description={translateText("Manage payment providers, payout details and receipt preferences.")}/><Card title={translateText("Connected payment provider")} description="Connect a payment provider to accept payments for products and bookings."><div className="st-row"><span className="st-provider-mark stripe">{translateText("stripe")}</span><div><b>{translateText("Stripe")}</b><p>{localizeNode(data.integrations.stripe?.status ?? 'Not Connected')}</p></div><button className="st-secondary" onClick={() => navigate('/dashboard/settings/integrations?provider=stripe')}>{translateText("Manage provider ")}<ChevronRight size={15}/></button></div></Card><form onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try { await save({ ...data, payment: draft }); } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); } }}><Card title={translateText("Payment preferences")}><div className="st-form-grid two"><Field label={translateText("Currency")}><Select value={draft.currency} onChange={value => setDraft({ ...draft, currency: value })} options={CURRENCY_SELECT_OPTIONS} /></Field><Field label={translateText("Receipt email")}><input type="email" required value={draft.receiptEmail} onChange={e => setDraft({ ...draft, receiptEmail: e.target.value })}/></Field></div><div className="st-preference"><span><b>{translateText("Send invoices & receipts")}</b><small>{translateText("Email a receipt after a verified payment.")}</small></span><Toggle label="Send invoices and receipts" checked={draft.invoices} onChange={invoices => setDraft({ ...draft, invoices })}/></div><p className="st-note">{translateText("Payout details are managed securely through your connected provider.")}</p><button type="button" className="st-secondary" onClick={() => navigate('/dashboard/settings/payment-methods')}>{translateText("Manage saved payment methods ")}<ChevronRight size={15}/></button></Card>{localizeNode(error && <p className="st-error" role="alert">{localizeNode(error)}</p>)}<div className="st-form-footer"><span/><button className="st-primary" disabled={busy}>{localizeNode(busy ? 'Saving…' : 'Save Changes')}</button></div></form></>;
}
