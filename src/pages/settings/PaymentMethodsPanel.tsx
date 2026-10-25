import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, Landmark, Pencil, Plus, Smartphone, Trash2, Wallet } from 'lucide-react';
import { paymentProviders, usePaymentMethods, type PaymentMethod, type GatewayConfiguration } from '../../backend/paymentMethods';
import { gatewayFields, paytabsRegions, type GatewayProvider } from '../../../functions/payment-gateway-model.js';
import { translateText as t, useUILanguage } from '../../i18n/display';
import { Card, Field, Modal, PanelHeading, Toggle, Badge } from './kit';
import { showToast } from '../../utils/toast';
import './settings.css';
import './payment-methods.css';

const manualProviders = paymentProviders.filter(([, , type]) => type === 'manual');
const gateways = [
  { ids: ['stripe'], name: 'Stripe', description: 'International payments via Visa & Mastercard' },
  { ids: ['paypal'], name: 'PayPal', description: 'Global digital wallet' },
  { ids: ['paytabs'], name: 'PayTabs', description: 'Payment gateway for the Middle East & GCC' },
  { ids: ['fawry', 'kashier'], name: 'Fawry / Kashier', description: 'Local Egyptian payments and cards' },
];
const ManualIcon = ({ provider }: { provider: string }) => provider === 'bank' ? <Landmark size={20}/> : provider === 'stc' ? <Wallet size={20}/> : <Smartphone size={20}/>;

export function PaymentMethodsPanel() {
  useUILanguage();
  const source = usePaymentMethods();
  const { methods, loading, error, save, canManage: admin } = source;
  const [draft, setDraft] = useState<PaymentMethod | null>(null), [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false), [failure, setFailure] = useState('');
  const [gateway, setGateway] = useState<GatewayConfiguration | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [gatewayLoading, setGatewayLoading] = useState(false);
  const close = useCallback(() => { if (!busy) { setDraft(null); setCredentials({}); setGateway(null); } }, [busy]);
  const gatewayProvider = draft?.type === 'gateway' ? draft.provider as GatewayProvider : null;
  const { getGateway } = source;
  useEffect(() => {
    if (!gatewayProvider) return;
    let active = true;
    void getGateway(gatewayProvider).then(config => {
      if (active) { setGateway(config); setCredentials({ ...config.fields, mode: config.mode, region: config.region }); }
    }).catch(error => { if (active) setFailure(error instanceof Error ? error.message : 'Could not load gateway configuration.'); })
      .finally(() => { if (active) setGatewayLoading(false); });
    return () => { active = false; };
  }, [gatewayProvider, getGateway]);
  const identityChanged = !!gatewayProvider && !!gateway && (credentials.mode !== gateway.mode || gatewayProvider === 'paytabs' && credentials.region !== gateway.region || gatewayFields[gatewayProvider].some(field => !field.secret && credentials[field.key]?.trim() !== gateway.fields[field.key]));
  const added = methods.filter(method => method.type === 'manual');
  const disabled = busy || loading || !admin || !!error;
  function configure(id: string) {
    const provider = paymentProviders.find(([key]) => key === id);
    if (!provider || disabled) return;
    setSelected(id); setFailure('');
    setGateway(null); setCredentials({}); setGatewayLoading(provider[2] === 'gateway');
    setDraft(methods.find(method => method.provider === id) ?? { id, provider: id, name: provider[1], type: provider[2], account: '', instructions: '', enabled: true, status: 'Configured' });
  }
  async function persist(next: PaymentMethod[]) {
    if (busy) return;
    setBusy(true); setFailure('');
    try { await save(next); setDraft(null); setSelected(''); showToast.success('Payment methods saved'); }
    catch (error) { setFailure(error instanceof Error ? error.message : 'Could not save payment methods.'); }
    finally { setBusy(false); }
  }
  async function persistGateway() {
    if (!draft || !gatewayProvider || !gateway || busy || gatewayLoading) return;
    setBusy(true); setFailure('');
    try {
      await source.saveGateway(gatewayProvider, draft.account, draft.enabled, credentials, gateway.gatewayRevision);
      setDraft(null); setCredentials({}); setGateway(null); setSelected(''); showToast.success('Payment methods saved');
    } catch (error) { setFailure(error instanceof Error ? error.message : 'Could not save payment methods.'); }
    finally { setBusy(false); }
  }
  return <div className="st-workspace pm-methods">
    <PanelHeading title={t('Payment Methods')} description="Accept payments through manual transfers or payment gateways. Methods are synchronized across products and checkout."/>
    {(error || failure) && <div className="st-error" role="alert">{error || failure}{error && <button className="st-link" onClick={source.refresh}>{t('Try again')}</button>}</div>}
    {loading && <p role="status" className="st-note">{t('Loading payment methods…')}</p>}
    {!loading && !admin && <p className="st-note">{t('Contact your administrator to configure payment methods.')}</p>}
    <section aria-labelledby="pm-manual-title" className="pm-section">
      <h3 id="pm-manual-title">{t('Manual Transfer Methods')}</h3>
      <p className="pm-description">{t('Configure wallet or bank transfer details for your customers.')}</p>
      <Card className="pm-manual-container">
        <h4>{t('Select a method to add its details:')}</h4>
        <div className="pm-manual-options">
          {manualProviders.map(([id, name]) => <button key={id} type="button" className={`pm-manual-choice${selected === id ? ' selected' : ''}`} aria-pressed={selected === id} disabled={disabled} onClick={() => configure(id)}>
            <ManualIcon provider={id}/><span>{t(name)}</span>{methods.some(method => method.provider === id) && <CheckCircle2 className="pm-added-mark" size={13}/>}
          </button>)}
        </div>
        <h4 className="pm-added-heading">{t('Currently Added Methods')}</h4>
        <div className="pm-added-list">
          {added.map(method => <div className="pm-added-row" key={method.id}>
            <span className="st-service-icon purple"><ManualIcon provider={method.provider}/></span>
            <div className="pm-account"><b>{t(method.name)}</b><span>{method.account}</span>{method.instructions && <small>{method.instructions}</small>}</div>
            <Badge tone={method.enabled ? 'green' : 'neutral'}>{t(method.enabled ? 'Enabled' : 'Disabled')}</Badge>
            {admin && <div className="pm-row-actions"><button type="button" className="st-icon-button" aria-label={t(`Edit ${method.name}`)} disabled={disabled} onClick={() => configure(method.provider)}><Pencil size={14}/></button><button type="button" className="st-icon-button" aria-label={t(`Remove ${method.name}`)} disabled={disabled} onClick={() => void persist(methods.filter(item => item.id !== method.id))}><Trash2 size={14}/></button></div>}
          </div>)}
          {!added.length && <p className="st-note">{t('No transfer methods added yet.')}</p>}
        </div>
        {admin && <button type="button" className="st-secondary small pm-add-transfer" disabled={disabled} onClick={() => configure(manualProviders.find(([id]) => !methods.some(method => method.provider === id))?.[0] ?? 'bank')}><Plus size={13}/>{t('Add a transfer method')}</button>}
      </Card>
    </section>
    <section aria-labelledby="pm-gateway-title" className="pm-section">
      <h3 id="pm-gateway-title">{t('Professional Payment Gateways')}</h3>
      <p className="pm-description">{t('Connect a payment gateway for local or international card payments.')}</p>
      <div className="pm-gateway-grid">{gateways.map(gateway => {
        const configured = methods.filter(method => gateway.ids.includes(method.provider));
        const connected = configured.some(method => method.enabled && method.status === 'Connected');
        return <Card key={gateway.name} className="pm-gateway-card">
          <div className="pm-gateway-heading"><CreditCard size={18}/><b>{gateway.name}</b><Badge tone={connected ? 'green' : configured.length ? 'orange' : 'neutral'}>{t(connected ? 'Connected' : configured.length ? 'Configured' : 'Disconnected')}</Badge></div>
          <p className="st-note">{t(gateway.description)}</p>
          {configured.length > 0 && <small className="pm-gateway-accounts">{configured.map(method => `${method.name} · ${t(method.status)}`).join(' / ')}</small>}
          {admin && <button type="button" className="st-secondary small" disabled={disabled} onClick={() => configure(configured[0]?.provider ?? gateway.ids[0])}>{t(configured.length ? 'Manage Account' : 'Configure Account')}</button>}
        </Card>;
      })}</div>
    </section>
    {draft && <Modal title={t(`Configure ${draft.name}`)} close={close} disableBackdropClose={busy} disableEscapeClose={busy}>
      <form autoComplete="off" onSubmit={event => { event.preventDefault(); if (draft.type === 'gateway') void persistGateway(); else void persist([...methods.filter(method => method.id !== draft.id), draft]); }}>
        <fieldset disabled={busy}>
          {['fawry', 'kashier'].includes(draft.provider) && <Field label="Provider"><select aria-label={t('Provider')} value={draft.provider} onChange={event => configure(event.target.value)}><option value="fawry">Fawry</option><option value="kashier">Kashier</option></select></Field>}
          {draft.type === 'manual' ? <>
            <Field label="Transfer account / wallet number"><input required maxLength={150} value={draft.account} onChange={event => setDraft({ ...draft, account: event.target.value })}/></Field>
            <Field label="Customer instructions"><textarea maxLength={1000} value={draft.instructions} onChange={event => setDraft({ ...draft, instructions: event.target.value })}/></Field>
          </> : <>
            <Field label="Account label"><input required maxLength={150} value={draft.account} onChange={event => setDraft({ ...draft, account: event.target.value })}/></Field>
            {gatewayLoading && <p className="st-note" role="status">{t('Loading gateway configuration…')}</p>}
            {gateway && gatewayProvider && <>
              <Field label="Mode"><select aria-label={t('Mode')} value={credentials.mode} onChange={event => setCredentials({ ...credentials, mode: event.target.value })}><option value="sandbox">{t('Sandbox')}</option><option value="live">{t('Live')}</option></select></Field>
              {gatewayProvider === 'paytabs' && <Field label="PayTabs region"><select aria-label={t('PayTabs region')} value={credentials.region} onChange={event => setCredentials({ ...credentials, region: event.target.value })}>{paytabsRegions.map(region => <option key={region} value={region}>{t(({ SAU: 'Saudi Arabia', ARE: 'United Arab Emirates', EGY: 'Egypt', OMN: 'Oman', JOR: 'Jordan', IRQ: 'Iraq', KWT: 'Kuwait', GLOBAL: 'Global' })[region] ?? region)}</option>)}</select></Field>}
              {gatewayFields[gatewayProvider].map(field => <Field key={`${gatewayProvider}-${field.key}`} label={field.optional ? `${field.label} (optional)` : field.label}>
                <input type={field.secret ? 'password' : 'text'} autoComplete={field.secret ? 'new-password' : 'off'} spellCheck={false} required={!field.optional && (!field.secret || !gateway.configuredSecrets[field.key] || identityChanged)} maxLength={4096} value={credentials[field.key] ?? ''} placeholder={field.secret && gateway.configuredSecrets[field.key] && !identityChanged ? t('Saved securely — leave blank to keep') : ''} onChange={event => setCredentials({ ...credentials, [field.key]: event.target.value })}/>
              </Field>)}
              <p className="st-note">{t('Secrets are stored privately and never shown again. Changing the account, mode or region requires new secrets. Checkout is enabled after the provider connection is verified.')}</p>
            </>}
          </>}
          <div className="st-preference"><span>{t('Enable payment method')}</span><Toggle label="Enable payment method" checked={draft.enabled} onChange={enabled => setDraft({ ...draft, enabled })}/></div>
          {failure && <p role="alert" className="st-error">{failure}</p>}
          <div className="st-modal-actions"><button type="button" className="st-secondary" disabled={busy} onClick={close}>{t('Cancel')}</button><button className="st-primary" disabled={busy || draft.type === 'gateway' && (gatewayLoading || !gateway)}>{t(busy ? 'Saving…' : 'Save Changes')}</button></div>
        </fieldset>
      </form>
    </Modal>}
  </div>;
}
