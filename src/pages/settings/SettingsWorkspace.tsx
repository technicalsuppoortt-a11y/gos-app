import { useCallback, useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Blocks, Building2, Check, ChevronRight, CreditCard, Lightbulb, Link2, Settings, ShieldCheck, UserRound, Users, Wallet } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { ToolsSettingsPanel } from './ToolsPanel';
import { showToast } from '../../utils/toast';
import { Card, Field, PanelHeading, Toggle } from './kit';
import { friendlyError, readSettings, settingsApiEnabled, settingsKey, settingsRequest } from './data';
import type { SettingsData } from './data';
import { ProfilePanel } from './ProfilePanel';
import { BillingPanel } from './BillingPanel';
import { IntegrationsPanel } from './IntegrationsPanel';
import { TeamPanel, SecurityPanel } from './SystemPanels';
import './settings.css';

const tabs = [
  { slug: 'profile', name: 'Profile', subtitle: 'Your personal information', icon: UserRound },
  { slug: 'business', name: 'Business', subtitle: 'Business details & branding', icon: Building2 },
  { slug: 'team', name: 'Team & roles', subtitle: 'Members & permissions', icon: Users },
  { slug: 'knowledge', name: 'Knowledge', subtitle: 'Your business knowledge', icon: Lightbulb },
  { slug: 'tools', name: 'Tools', subtitle: 'Your workspace tools', icon: Blocks },
  { slug: 'integrations', name: 'Integrations', subtitle: 'Connect your favorite tools', icon: Link2 },
  { slug: 'payments', name: 'Payments', subtitle: 'Payment methods & payouts', icon: CreditCard },
  { slug: 'billing', name: 'Billing & Wallet', subtitle: 'Subscription & wallet', icon: Wallet },
  { slug: 'security', name: 'Security', subtitle: 'Password & account security', icon: ShieldCheck },
];
export function SettingsWorkspace() {
  const auth = useSelector((s: RootState) => s.auth);
  return <SettingsWorkspaceView key={`${auth.tenant?.id ?? 'demo'}:${auth.user?.id ?? 'demo'}`}/>;
}
function SettingsWorkspaceView() {
  const location = useLocation(), navigate = useNavigate();
  const [data, setData] = useState<SettingsData>(readSettings), [loading, setLoading] = useState(settingsApiEnabled), [error, setError] = useState('');
  const segment = location.pathname.split('/').filter(Boolean).at(-1);
  const aliases: Record<string, string> = { 'billing-wallet': 'billing', 'billing-and-wallet': 'billing', 'team-roles': 'team', 'team-and-roles': 'team' };
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
    <div className="st-page-heading"><span className="st-heading-icon"><Settings size={23}/></span><div><h1>Settings</h1><p>Manage your account, business, integrations and payments.</p></div></div>
    <div className="st-layout"><aside className="st-navigation"><h2>Settings</h2><nav aria-label="Settings navigation">{tabs.map(tab => <NavLink key={tab.slug} to={`/dashboard/settings/${tab.slug}`} className={`st-nav-item${active.slug === tab.slug ? ' active' : ''}`} aria-current={active.slug === tab.slug ? 'page' : undefined}><tab.icon size={21} strokeWidth={1.65}/><span><b>{tab.name}</b><small>{tab.subtitle}</small></span><ChevronRight size={14}/></NavLink>)}</nav></aside>
      <div className={`st-content st-${active.slug}`} key={active.slug}>
        {loading ? <div className="st-loading" role="status" aria-label="Loading settings"><div/><div/><div/></div> : error ? <Card title="Settings could not be loaded"><p className="st-error" role="alert">{error}</p><button className="st-primary" onClick={() => void refresh()}>Try again</button></Card> : <>
          {active.slug === 'profile' && <ProfilePanel data={data} save={save}/>}
          {active.slug === 'billing' && <BillingPanel data={data} refresh={refresh} saveLocal={save}/>}
          {active.slug === 'integrations' && <IntegrationsPanel data={data} refresh={refresh}/>}
          {active.slug === 'business' && <BusinessPanel data={data} save={save}/>}
          {active.slug === 'payments' && <PaymentsPanel data={data} save={save}/>}
          {active.slug === 'team' && <TeamPanel/>}
          {active.slug === 'security' && <SecurityPanel/>}
          {active.slug === 'tools' && <><PanelHeading title="Tools" description="Access and manage all your business tools, products, and features."/><ToolsSettingsPanel/></>}
          {active.slug === 'knowledge' && <><PanelHeading title="Knowledge" description="The shared knowledge used by your AI assistants."/><Card title="Business knowledge" description="Manage sources, documents and approved answers in your Knowledge Center."><div className="st-empty"><Lightbulb size={32}/><h3>Give your AI the context it needs</h3><p>Add your website, files and FAQs to keep answers consistent across your workspace.</p><button className="st-primary" onClick={() => navigate('/dashboard/knowledge')}>Open Knowledge Center <ChevronRight size={16}/></button></div></Card></>}
        </>}
      </div>
    </div>
  </div>;
}

function BusinessPanel({ data, save }: { data: SettingsData; save: (data: SettingsData) => Promise<void> }) {
  const [draft, setDraft] = useState(data.business), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const update = (key: keyof typeof draft, value: string) => setDraft(p => ({ ...p, [key]: value }));
  return <><PanelHeading title="Business Settings" description="Your business identity and defaults used across GOS."/><form onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try { await save({ ...data, business: draft }); } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); } }}>
    <Card title="Business identity" description="Your brand appears on customer-facing pages and communications."><div className="st-form-grid two">
      <Field label="Business name"><input required value={draft.name} onChange={e => update('name', e.target.value)}/></Field>
      <Field label="Business type"><select value={draft.type} onChange={e => update('type', e.target.value)}>{['Creative services', 'Consulting', 'Education', 'Retail', 'Other'].map(x => <option key={x}>{x}</option>)}</select></Field>
      <Field label="Business email"><input type="email" required value={draft.email} onChange={e => update('email', e.target.value)}/></Field>
      <Field label="Phone number"><input type="tel" value={draft.phone} onChange={e => update('phone', e.target.value)}/></Field>
      <Field label="Business address"><input value={draft.address} onChange={e => update('address', e.target.value)}/></Field>
      <Field label="Brand color"><input type="color" value={draft.color} onChange={e => update('color', e.target.value)}/></Field>
      <Field label="Public description"><textarea value={draft.description} onChange={e => update('description', e.target.value)}/></Field>
      <Field label="Business logo URL"><input type="url" value={draft.logo} onChange={e => update('logo', e.target.value)} placeholder="https://…"/></Field>
    </div></Card>
    <Card title="Regional defaults" description="Used for dates, payments and customer experiences."><div className="st-form-grid two"><Field label="Default currency"><select value={draft.currency} onChange={e => update('currency', e.target.value)}>{['EUR', 'USD', 'EGP', 'GBP'].map(x => <option key={x}>{x}</option>)}</select></Field><Field label="Default timezone"><select value={draft.timezone} onChange={e => update('timezone', e.target.value)}>{['Africa/Cairo', 'Europe/London', 'America/New_York', 'Asia/Dubai', 'UTC'].map(x => <option key={x}>{x}</option>)}</select></Field></div></Card>
    {error && <p className="st-error" role="alert">{error}</p>}<div className="st-form-footer"><span/><button disabled={busy} className="st-primary"><Check size={15}/>{busy ? 'Saving…' : 'Save Changes'}</button></div>
  </form></>;
}
function PaymentsPanel({ data, save }: { data: SettingsData; save: (data: SettingsData) => Promise<void> }) {
  const [draft, setDraft] = useState(data.payment), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const navigate = useNavigate();
  return <><PanelHeading title="Payments" description="Manage payment providers, payout details and receipt preferences."/><Card title="Connected payment provider" description="Connect a payment provider to accept payments for products and bookings."><div className="st-row"><span className="st-provider-mark stripe">stripe</span><div><b>Stripe</b><p>{data.integrations.stripe?.status ?? 'Not Connected'}</p></div><button className="st-secondary" onClick={() => navigate('/dashboard/settings/integrations?provider=stripe')}>Manage provider <ChevronRight size={15}/></button></div></Card><form onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try { await save({ ...data, payment: draft }); } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); } }}><Card title="Payment preferences"><div className="st-form-grid two"><Field label="Currency"><select value={draft.currency} onChange={e => setDraft({ ...draft, currency: e.target.value })}>{['EUR', 'USD', 'EGP', 'GBP'].map(x => <option key={x}>{x}</option>)}</select></Field><Field label="Receipt email"><input type="email" required value={draft.receiptEmail} onChange={e => setDraft({ ...draft, receiptEmail: e.target.value })}/></Field></div><div className="st-preference"><span><b>Send invoices & receipts</b><small>Email a receipt after a verified payment.</small></span><Toggle label="Send invoices and receipts" checked={draft.invoices} onChange={invoices => setDraft({ ...draft, invoices })}/></div><p className="st-note">Payout details are managed securely through your connected provider.</p><button type="button" className="st-secondary" onClick={() => navigate('/dashboard/settings/billing')}>Manage saved payment methods <ChevronRight size={15}/></button></Card>{error && <p className="st-error" role="alert">{error}</p>}<div className="st-form-footer"><span/><button className="st-primary" disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</button></div></form></>;
}
