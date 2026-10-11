import { useState } from 'react';
import { ArrowRight, CreditCard, FileText, Settings, SlidersHorizontal } from 'lucide-react';
import { Dialog, Field, Select, Toggle } from './primitives';
import { storageKey } from './repository';

import { readWorkspacePreferences, saveWorkspacePreferences } from './workspacePreferences';
import type { WorkspacePreferences } from './workspacePreferences';

const cards = [
  { title: 'Store details', description: 'Store identity, billing email, currency and timezone.', icon: Settings },
  { title: 'Payment providers', description: 'Configure preferred payment providers and wallets.', icon: CreditCard },
  { title: 'Tax & receipts', description: 'Tax handling, receipt delivery and numbering.', icon: FileText },
  { title: 'Checkout preferences', description: 'Customer information and checkout experience.', icon: SlidersHorizontal },
] as const;
export function WorkspaceSettings({ notify }: { notify: (message: string) => void }) {
  const key = storageKey();
  return <SettingsView key={key} scope={key} notify={notify}/>;
}
function SettingsView({ scope, notify }: { scope: string; notify: (message: string) => void }) {
  const [saved, setSaved] = useState(() => readWorkspacePreferences(scope));
  const [draft, setDraft] = useState(saved), [active, setActive] = useState<string | null>(null), [error, setError] = useState('');
  function change<K extends keyof WorkspacePreferences>(field: K, value: WorkspacePreferences[K]) { setDraft(current => ({ ...current, [field]: value })); setError(''); }
  return <section className="pp-secondary-view"><div className="pp-secondary-heading"><div><h2>Workspace Settings</h2><p>Manage your store preferences. Changes are saved in this workspace.</p></div></div><div className="pp-settings-cards">{cards.map(({ title, description, icon: Icon }) => <button key={title} aria-haspopup="dialog" onClick={() => { setDraft({ ...saved }); setError(''); setActive(title); }}><span><Icon size={18}/></span><b>{title}</b><small>{description}</small><ArrowRight size={14}/></button>)}</div>
    {active && <Dialog title={active} onClose={() => setActive(null)}><form className="ce-settings-form" onSubmit={event => { event.preventDefault(); try { saveWorkspacePreferences(scope, draft); setSaved({ ...draft }); setActive(null); notify(`${active} saved.`); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save settings.'); } }}>
      {active === 'Store details' && <><Field label="Store name"><input required value={draft.name} onChange={event => change('name', event.target.value)}/></Field><Field label="Billing email"><input required type="email" value={draft.email} onChange={event => change('email', event.target.value)}/></Field><Field label="Default currency"><Select value={draft.currency} options={['EUR', 'USD', 'GBP']} onChange={value => change('currency', value)}/></Field><Field label="Timezone"><Select value={draft.timezone} options={['Africa/Cairo', 'Europe/London', 'Europe/Paris', 'America/New_York', 'Asia/Dubai', 'UTC']} onChange={value => change('timezone', value)}/></Field></>}
      {active === 'Payment providers' && <><p className="cw-help">Save provider preferences for your workspace. Live payment processing requires a connected payment gateway.</p><Toggle label="Stripe · Visa and Mastercard" checked={draft.stripe} onChange={value => change('stripe', value)}/><Toggle label="PayPal" checked={draft.paypal} onChange={value => change('paypal', value)}/><Toggle label="Apple Pay" checked={draft.applePay} onChange={value => change('applePay', value)}/><Toggle label="Google Pay" checked={draft.googlePay} onChange={value => change('googlePay', value)}/></>}
      {active === 'Tax & receipts' && <><Field label="Default tax rate (%)"><input type="number" min="0" max="100" step="0.01" required value={draft.taxRate} onChange={event => change('taxRate', Number(event.target.value))}/></Field><Toggle label="Prices include tax" checked={draft.inclusiveTax} onChange={value => change('inclusiveTax', value)}/><Toggle label="Email customer receipts" checked={draft.receipts} onChange={value => change('receipts', value)}/><Field label="Receipt prefix"><input required maxLength={20} value={draft.receiptPrefix} onChange={event => change('receiptPrefix', event.target.value)}/></Field></>}
      {active === 'Checkout preferences' && <><Toggle label="Allow guest checkout" checked={draft.guestCheckout} onChange={value => change('guestCheckout', value)}/><Toggle label="Collect customer name" checked={draft.collectName} onChange={value => change('collectName', value)}/><Toggle label="Require phone number" checked={draft.requirePhone} onChange={value => change('requirePhone', value)}/><Field label="Default success redirect URL" hint="Optional. Product-specific settings take priority."><input type="url" value={draft.redirectUrl} placeholder="https://your-store.com/thank-you" onChange={event => change('redirectUrl', event.target.value)}/></Field></>}
      {error && <p className="cw-errors" role="alert">{error}</p>}<div className="course-modal-actions"><button type="button" className="cw-button" onClick={() => setActive(null)}>Cancel</button><button type="submit" className="cw-button primary">Save settings</button></div>
    </form></Dialog>}
  </section>;
}
