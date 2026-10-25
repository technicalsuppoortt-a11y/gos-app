import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import { useRef, useState } from 'react';
import { ArrowRight, CreditCard, FileText, Settings, SlidersHorizontal, Loader2 } from 'lucide-react';
import { Dialog, Field, Select, Toggle } from './primitives';
import { storageKey } from './repository';

import { readWorkspacePreferences, saveWorkspacePreferences } from './workspacePreferences';
import type { WorkspacePreferences } from './workspacePreferences';
import './product-workspace.css';
import { useNavigate } from 'react-router-dom';

const cards = [
  { title: 'Store details', description: 'Store identity, billing email, currency and timezone.', icon: Settings },
  { title: 'Payment providers', description: 'Configure preferred payment providers and wallets.', icon: CreditCard },
  { title: 'Tax & receipts', description: 'Tax handling, receipt delivery and numbering.', icon: FileText },
  { title: 'Checkout preferences', description: 'Customer information and checkout experience.', icon: SlidersHorizontal },
] as const;
export function WorkspaceSettings({ notify }: { notify: (message: string) => void }) {
  useUILanguage();
  const key = storageKey();
  return <SettingsView key={key} scope={key} notify={notify}/>;
}
function SettingsView({ scope, notify }: { scope: string; notify: (message: string) => void }) {
  useUILanguage();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(() => readWorkspacePreferences(scope));
  const [draft, setDraft] = useState(saved), [active, setActive] = useState<string | null>(null), [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  function change<K extends keyof WorkspacePreferences>(field: K, value: WorkspacePreferences[K]) { setDraft(current => ({ ...current, [field]: value })); setError(''); }
  return <section className="pp-secondary-view"><div className="pp-secondary-heading"><div><h2>{translateText("Workspace Settings")}</h2><p>{translateText("Manage your store preferences. Changes are saved in this workspace.")}</p></div></div><div className="pp-settings-cards">{localizeNode(cards.map(({ title, description, icon: Icon }) => <button key={title} aria-haspopup="dialog" onClick={() => { if (title === 'Payment providers') { navigate('/dashboard/settings/billing?tab=payment-methods'); return; } setDraft({ ...saved }); setError(''); setActive(title); }}><span><Icon size={18}/></span><b>{localizeNode(title)}</b><small>{localizeNode(description)}</small><ArrowRight size={14}/></button>))}</div>
    {active && <Dialog title={translateText(active)} onClose={() => { if (!submitting.current) setActive(null); }}><form className="ce-settings-form" onSubmit={async event => { event.preventDefault(); if (submitting.current) return; submitting.current = true; setSaving(true); setError(''); try { await saveWorkspacePreferences(scope, draft); setSaved({ ...draft }); setActive(null); notify('Changes saved'); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save settings.'); } finally { submitting.current = false; setSaving(false); } }}><fieldset disabled={saving} className="pp-settings-fields">
      {active === 'Store details' && <><Field label="Store name"><input required value={draft.name} onChange={event => change('name', event.target.value)}/></Field><Field label="Billing email"><input required type="email" value={draft.email} onChange={event => change('email', event.target.value)}/></Field><Field label="Default currency"><Select value={draft.currency} options={['EUR', 'USD', 'GBP']} onChange={value => change('currency', value)}/></Field><Field label="Timezone"><Select value={draft.timezone} options={['Africa/Cairo', 'Europe/London', 'Europe/Paris', 'America/New_York', 'Asia/Dubai', 'UTC']} onChange={value => change('timezone', value)}/></Field></>}
      {localizeNode(active === 'Tax & receipts' && <><Field label="Default tax rate (%)"><input type="number" min="0" max="100" step="0.01" required value={draft.taxRate} onChange={event => change('taxRate', Number(event.target.value))}/></Field><Toggle label="Prices include tax" checked={draft.inclusiveTax} onChange={value => change('inclusiveTax', value)}/><Toggle label="Email customer receipts" checked={draft.receipts} onChange={value => change('receipts', value)}/><Field label="Receipt prefix"><input required maxLength={20} value={draft.receiptPrefix} onChange={event => change('receiptPrefix', event.target.value)}/></Field></>)}
      {localizeNode(active === 'Checkout preferences' && <><Toggle label="Allow guest checkout" checked={draft.guestCheckout} onChange={value => change('guestCheckout', value)}/><Toggle label="Collect customer name" checked={draft.collectName} onChange={value => change('collectName', value)}/><Toggle label="Require phone number" checked={draft.requirePhone} onChange={value => change('requirePhone', value)}/><Field label="Default success redirect URL" hint="Optional. Product-specific settings take priority."><input type="url" value={draft.redirectUrl} placeholder={translateText("https://your-store.com/thank-you")} onChange={event => change('redirectUrl', event.target.value)}/></Field></>)}
      {localizeNode(error && <p className="cw-errors" role="alert">{localizeNode(error)}</p>)}<div className="course-modal-actions"><button type="button" className="cw-button" onClick={() => setActive(null)}>{translateText("Cancel")}</button><button type="submit" className="cw-button primary" disabled={saving}>{saving && <Loader2 size={14} className="animate-spin"/>}{translateText(saving ? 'Saving…' : 'Save Changes')}</button></div></fieldset>
    </form></Dialog>}
  </section>;
}
