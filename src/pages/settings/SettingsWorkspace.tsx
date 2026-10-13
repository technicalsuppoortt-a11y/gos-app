import { useUILanguage, localizeNode, translateText } from '../../i18n/display';
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, ChevronRight } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { ToolsSettingsPanel } from './ToolsPanel';
import { showToast } from '../../utils/toast';
import { Card, Field, PanelHeading, Toggle } from './kit';
import { Select } from '../../components/ui/Select';
import { friendlyError, readSettings, settingsApiEnabled, settingsKey, settingsRequest } from './data';
import type { SettingsData } from './data';
import { ProfilePanel } from './ProfilePanel';
import { BillingPanel } from './BillingPanel';
import { IntegrationsPanel } from './IntegrationsPanel';
import { TeamPanel, SecurityPanel } from './SystemPanels';
import { settingsTabs as tabs, settingsAliases as aliases } from './navigation';
import { KnowledgePanel } from './KnowledgePanel';
import './settings.css';

export function SettingsWorkspace() {
  useUILanguage();
  const auth = useSelector((s: RootState) => s.auth);
  return <SettingsWorkspaceView key={`${auth.tenant?.id ?? 'demo'}:${auth.user?.id ?? 'demo'}`}/>;
}
function SettingsWorkspaceView() {
  useUILanguage();
  const location = useLocation();
  const [data, setData] = useState<SettingsData>(readSettings), [loading, setLoading] = useState(settingsApiEnabled), [error, setError] = useState('');
  const segment = location.pathname.split('/').filter(Boolean).at(-1);
  const active = tabs.find(t => t.slug === (aliases[segment ?? ''] ?? segment)) ?? tabs[0];
  const refresh = useCallback(async () => {
    if (!settingsApiEnabled) { setData(readSettings()); return; }
    setError('');
    try { setData(await settingsRequest<SettingsData>('/settings')); } catch (e) { setError(friendlyError(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  async function save(next: SettingsData) {
    if (settingsApiEnabled) {
      await settingsRequest('/settings', { profile: next.profile, business: next.business, payment: next.payment }, 'PATCH');
    } else {
      try { localStorage.setItem(settingsKey(), JSON.stringify({ profile: next.profile, business: next.business, payment: next.payment, recharge: next.recharge })); } catch { throw new Error('Your changes could not be saved. Browser storage is full or unavailable.'); }
    }
    setData(next);
    showToast.success(settingsApiEnabled ? 'Changes saved' : 'Preferences saved on this device');
  }
  return <div className="st-workspace">
    <div className="st-layout">
      <div className={`st-content st-${active.slug}`} key={active.slug}>
        {localizeNode(loading ? <div className="st-loading" role="status" aria-label={translateText("Loading settings")}><div/><div/><div/></div> : error ? <Card title={translateText("Settings could not be loaded")}><p className="st-error" role="alert">{localizeNode(error)}</p><button className="st-primary" onClick={() => void refresh()}>{translateText("Try again")}</button></Card> : <>
          {localizeNode(active.slug === 'profile' && <ProfilePanel data={data} save={save}/>)}
          {localizeNode(active.slug === 'billing' && <><BillingPanel data={data} refresh={refresh} saveLocal={save}/><PaymentsPanel data={data} save={save}/></>)}
          {localizeNode(active.slug === 'integrations' && <IntegrationsPanel data={data} refresh={refresh}/>)}
          {localizeNode(active.slug === 'business' && <BusinessPanel data={data} save={save}/>)}
          {localizeNode(active.slug === 'team' && <TeamPanel/>)}
          {localizeNode(active.slug === 'security' && <SecurityPanel/>)}
          {localizeNode(active.slug === 'tools' && <><PanelHeading title={translateText("Tools")} description="Access and manage all your business tools, products, and features."/><ToolsSettingsPanel/></>)}
          {localizeNode(active.slug === 'knowledge' && <KnowledgePanel/>)}
        </>)}
      </div>
    </div>
  </div>;
}

function BusinessPanel({ data, save }: { data: SettingsData; save: (data: SettingsData) => Promise<void> }) {
  useUILanguage();
  const [draft, setDraft] = useState(data.business), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const update = (key: keyof typeof draft, value: string) => setDraft(p => ({ ...p, [key]: value }));
  return <><PanelHeading title={translateText("Business Settings")} description="Your business identity and defaults used across GOS."/><form onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try { await save({ ...data, business: draft }); } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); } }}>
    <Card title={translateText("Business identity")} description="Your brand appears on customer-facing pages and communications."><div className="st-form-grid two">
      <Field label="Business name"><input required value={draft.name} onChange={e => update('name', e.target.value)}/></Field>
      <Field label="Business type"><Select value={draft.type} onChange={value => update('type', value)} options={['Creative services', 'Consulting', 'Education', 'Retail', 'Other']} /></Field>
      <Field label="Business email"><input type="email" required value={draft.email} onChange={e => update('email', e.target.value)}/></Field>
      <Field label="Phone number"><input type="tel" value={draft.phone} onChange={e => update('phone', e.target.value)}/></Field>
      <Field label="Business address"><input value={draft.address} onChange={e => update('address', e.target.value)}/></Field>
      <Field label="Brand color"><input type="color" value={draft.color} onChange={e => update('color', e.target.value)}/></Field>
      <Field label="Public description"><textarea value={draft.description} onChange={e => update('description', e.target.value)}/></Field>
      <Field label="Business logo URL"><input type="url" value={draft.logo} onChange={e => update('logo', e.target.value)} placeholder={translateText("https://…")}/></Field>
    </div></Card>
    <Card title={translateText("Regional defaults")} description="Used for dates, payments and customer experiences."><div className="st-form-grid two"><Field label="Default currency"><Select value={draft.currency} onChange={value => update('currency', value)} options={['EUR', 'USD', 'EGP', 'GBP']} /></Field><Field label="Default timezone"><Select value={draft.timezone} onChange={value => update('timezone', value)} options={['Africa/Cairo', 'Europe/London', 'America/New_York', 'Asia/Dubai', 'UTC']} /></Field></div></Card>
    {localizeNode(error && <p className="st-error" role="alert">{localizeNode(error)}</p>)}<div className="st-form-footer"><span/><button disabled={busy} className="st-primary"><Check size={15}/>{localizeNode(busy ? 'Saving…' : 'Save Changes')}</button></div>
  </form></>;
}
function PaymentsPanel({ data, save }: { data: SettingsData; save: (data: SettingsData) => Promise<void> }) {
  useUILanguage();
  const [draft, setDraft] = useState(data.payment), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const navigate = useNavigate();
  return <><PanelHeading title={translateText("Payment preferences")} description="Manage payment providers, payout details and receipt preferences."/><Card title={translateText("Connected payment provider")} description="Connect a payment provider to accept payments for products and bookings."><div className="st-row"><span className="st-provider-mark stripe">{translateText("stripe")}</span><div><b>{translateText("Stripe")}</b><p>{localizeNode(data.integrations.stripe?.status ?? 'Not Connected')}</p></div><button className="st-secondary" onClick={() => navigate('/dashboard/settings/integrations?provider=stripe')}>{translateText("Manage provider ")}<ChevronRight size={15}/></button></div></Card><form onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try { await save({ ...data, payment: draft }); } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); } }}><Card title={translateText("Payment preferences")}><div className="st-form-grid two"><Field label="Currency"><Select value={draft.currency} onChange={value => setDraft({ ...draft, currency: value })} options={['EUR', 'USD', 'EGP', 'GBP']} /></Field><Field label="Receipt email"><input type="email" required value={draft.receiptEmail} onChange={e => setDraft({ ...draft, receiptEmail: e.target.value })}/></Field></div><div className="st-preference"><span><b>{translateText("Send invoices & receipts")}</b><small>{translateText("Email a receipt after a verified payment.")}</small></span><Toggle label="Send invoices and receipts" checked={draft.invoices} onChange={invoices => setDraft({ ...draft, invoices })}/></div><p className="st-note">{translateText("Payout details are managed securely through your connected provider.")}</p><button type="button" className="st-secondary" onClick={() => navigate('/dashboard/settings/billing')}>{translateText("Manage saved payment methods ")}<ChevronRight size={15}/></button></Card>{localizeNode(error && <p className="st-error" role="alert">{localizeNode(error)}</p>)}<div className="st-form-footer"><span/><button className="st-primary" disabled={busy}>{localizeNode(busy ? 'Saving…' : 'Save Changes')}</button></div></form></>;
}
