import { BookingSelect as DashboardSelect } from '../booking/BookingSelect';
import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { 
  BookOpen, Check, CheckCircle2, ChevronDown, ChevronUp, Copy, CreditCard, 
  Eye, EyeOff, Landmark, Loader2, Pencil, Plug, Plus, Power, Trash2 
} from 'lucide-react';
import { paymentProviders, usePaymentMethods, type PaymentMethod, type GatewayConfiguration, type PaymentScope } from '../../backend/paymentMethods';
import { stripeWebhookUrl, syncStripePublicConfig, testStripeConnection } from '../../backend/stripeService';
import { gatewayFields, paytabsRegions, type GatewayProvider } from '../../../functions/payment-gateway-model.js';
import type { RootState } from '../../store';
import { translateText as t, useUILanguage } from '../../i18n/display';
import { Card, Field, Modal, PanelHeading, Toggle, Badge } from './kit';
import { showToast } from '../../utils/toast';
import './settings.css';
import './payment-methods.css';

interface GatewayGuideInfo {
  title: string;
  url: string;
  urlText: string;
  steps: { en: string; ar: string }[];
}

const gatewayGuides: Record<string, GatewayGuideInfo> = {
  stripe: {
    title: 'Stripe API Setup Guide',
    url: 'https://dashboard.stripe.com/apikeys',
    urlText: 'Open Stripe Dashboard ↗',
    steps: [
      {
        en: 'Log in to your Stripe Dashboard and navigate to Developers > API keys.',
        ar: 'سجّل الدخول إلى لوحة Stripe ثم انتقل إلى Developers > API keys.',
      },
      {
        en: 'Copy your Publishable Key (pk_live_... / pk_test_...) and reveal & copy your Secret Key (sk_live_... / sk_test_...).',
        ar: 'انسخ المفتاح العام Publishable Key واكشف وانسخ المفتاح السري Secret Key.',
      },
      {
        en: 'To get the Webhook Secret (optional), go to Developers > Webhooks, add the Webhook endpoint shown below for the "checkout.session.completed" event, and copy the Signing Secret (whsec_...).',
        ar: 'للحصول على Webhook Secret (اختياري)، توجه إلى Developers > Webhooks، أضف رابط الويب هوك الموضح بالأسفل لحدث checkout.session.completed وانسخ Signing Secret.',
      },
      {
        en: 'Optional: add static Payment Links (https://buy.stripe.com/...) used as a fallback if a Checkout Session cannot be created.',
        ar: 'اختياري: أضف روابط دفع ثابتة (https://buy.stripe.com/...) تُستخدم كبديل إذا تعذر إنشاء جلسة الدفع.',
      },
      {
        en: 'For production: disable Test Mode in Stripe, select Live mode here and use pk_live_ / sk_live_ keys, then click "Test Connection".',
        ar: 'للتشغيل الفعلي: أوقف وضع الاختبار في Stripe واختر وضع Live هنا واستخدم مفاتيح pk_live_ / sk_live_ ثم اضغط "اختبار الاتصال".',
      },
    ],
  },
  paddle: {
    title: 'Paddle API Setup Guide',
    url: 'https://vendors.paddle.com/authentication-v2',
    urlText: 'Open Paddle Dashboard ↗',
    steps: [
      {
        en: 'Log in to Paddle Vendor Portal and open Developer Tools > Authentication.',
        ar: 'سجل الدخول إلى Paddle Vendor Portal وافتح Developer Tools > Authentication.',
      },
      {
        en: 'Generate or copy your Client-side Token and your private API Key.',
        ar: 'قم بتوليد أو نسخ Client-side Token والمفتاح السري API Key.',
      },
      {
        en: 'Go to Developer Tools > Notifications to configure webhooks and copy your Webhook Secret.',
        ar: 'انتقل إلى Notifications لتهيئة الويب هوك ونسخ الـ Webhook Secret.',
      },
    ],
  },
  paymob: {
    title: 'Paymob API Setup Guide',
    url: 'https://accept.paymob.com/portal2/en/settings',
    urlText: 'Open Paymob Dashboard ↗',
    steps: [
      {
        en: 'Log in to Paymob Portal and navigate to Settings > Account Info to find your Public Key and Secret Key.',
        ar: 'سجل الدخول إلى Paymob وافتح Settings > Account Info لنسخ Public Key و Secret Key.',
      },
      {
        en: 'Navigate to Developers > Payment Integrations to copy your Card/Wallet Integration IDs (comma-separated).',
        ar: 'انتقل إلى Payment Integrations لنسخ معرفات التكامل Integration IDs مفصولة بفواصل.',
      },
      {
        en: 'Copy your HMAC Secret from Settings to verify incoming transaction callbacks.',
        ar: 'انسخ مفتاح HMAC Secret من صفحة الإعدادات للتحقق من إشعارات الدفع.',
      },
    ],
  },
  fawry: {
    title: 'Fawry Merchant Setup Guide',
    url: 'https://www.fawry.com',
    urlText: 'Open Fawry Portal ↗',
    steps: [
      {
        en: 'Log in to your Fawry Merchant account or refer to your merchant onboarding documentation.',
        ar: 'سجل الدخول إلى حساب تاجر فوري أو ارجع إلى مستندات التفعيل الخاصة بك.',
      },
      {
        en: 'Enter your assigned Merchant Code.',
        ar: 'أدخل كود التاجر Merchant Code المخصص لحسابك.',
      },
      {
        en: 'Copy and paste your assigned Secure Key used to generate digital signatures.',
        ar: 'انسخ وأدخل المفتاح الآمن Secure Key المستخدم في توقيع المعاملات.',
      },
    ],
  },
  kashier: {
    title: 'Kashier API Setup Guide',
    url: 'https://merchant.kashier.io',
    urlText: 'Open Kashier Portal ↗',
    steps: [
      {
        en: 'Log in to your Kashier Merchant dashboard and navigate to Integration Settings.',
        ar: 'سجل الدخول إلى لوحة كاشير وافتح إعدادات الربط Integration Settings.',
      },
      {
        en: 'Copy your Merchant ID, Payment API Key, and Secret API Key.',
        ar: 'انسخ معرف التاجر Merchant ID ومفتاح الدفع ومفتاح الأمان السري.',
      },
    ],
  },
  paypal: {
    title: 'PayPal API Setup Guide',
    url: 'https://developer.paypal.com/dashboard/applications',
    urlText: 'Open PayPal Developer ↗',
    steps: [
      {
        en: 'Log in to PayPal Developer Dashboard and select Apps & Credentials.',
        ar: 'سجل الدخول إلى PayPal Developer وافتح Apps & Credentials.',
      },
      {
        en: 'Copy your Client ID and click "Show" to reveal and copy your Client Secret.',
        ar: 'انسخ Client ID ثم اضغط Show لكشف ونسخ Client Secret.',
      },
    ],
  },
  paytabs: {
    title: 'PayTabs API Setup Guide',
    url: 'https://merchant.paytabs.com',
    urlText: 'Open PayTabs Portal ↗',
    steps: [
      {
        en: 'Log in to your PayTabs Merchant Dashboard and open Developers > Key Management.',
        ar: 'سجل الدخول إلى PayTabs وافتح Developers > Key Management.',
      },
      {
        en: 'Select your operational Region, Profile ID, and copy your Server Key.',
        ar: 'حدد المنطقة ومعرف الملف Profile ID وانسخ المفتاح Server Key.',
      },
    ],
  },
};

function GatewaySetupGuide({ provider }: { provider: string }) {
  const guide = gatewayGuides[provider];
  const [expanded, setExpanded] = useState(true);
  const ar = useUILanguage().startsWith('ar');

  if (!guide) return null;

  return (
    <div className="st-guide-box">
      <div className="st-guide-head" onClick={() => setExpanded(v => !v)}>
        <div className="st-guide-title">
          <BookOpen size={15} className="st-guide-icon" />
          <span>{ar ? `دليل إعداد ربط ${guide.title.split(' ')[0]}` : guide.title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <a
            href={guide.url}
            target="_blank"
            rel="noopener noreferrer"
            className="st-guide-link"
            onClick={e => e.stopPropagation()}
          >
            <span>{ar ? 'فتح لوحة التحكم ↗' : guide.urlText}</span>
          </a>
          <button type="button" className="st-icon-button" style={{ width: 22, height: 22 }} aria-label="Toggle Guide">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {expanded && (
        <ol className="st-guide-steps">
          {guide.steps.map((step, idx) => (
            <li key={idx} className="st-guide-step">
              <span className="st-guide-number">{idx + 1}</span>
              <p>{ar ? step.ar : step.en}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

const manualProviders = paymentProviders.filter(([, , type]) => type === 'manual');
const gateways = [
  { ids: ['stripe'], name: 'Stripe', description: 'International payments via Visa & Mastercard', comingSoon: false },
  { ids: ['paddle'], name: 'Paddle', description: 'Subscriptions and global payments', comingSoon: true },
  { ids: ['fawry', 'kashier'], name: 'Fawry / Kashier', description: 'Local Egyptian payments and cards', comingSoon: true },
  { ids: ['paymob'], name: 'Paymob', description: 'Cards and mobile wallets in Egypt and the Middle East', comingSoon: true },
];
const comingSoonProviders = new Set(gateways.filter(gateway => gateway.comingSoon).flatMap(gateway => gateway.ids));
const brandAssets: Record<string, string> = { vodafone: 'vodafone.svg', instapay: 'instapay.png', etisalat: 'etisalat.ico', orange: 'orange.svg', stc: 'stc.svg' };
const ManualIcon = ({ provider }: { provider: string }) => provider === 'bank' ? <Landmark size={24}/> : <span className={`pm-brand-frame ${provider}`}><img className="pm-brand-logo" src={`/payment-brands/${brandAssets[provider]}`} alt="" aria-hidden="true"/></span>;

export function PaymentMethodsPanel({ scope }: { scope?: PaymentScope } = {}) {
  useUILanguage();
  const source = usePaymentMethods(scope ? { scope } : undefined);
  const { methods, loading, error, save, canManage: admin } = source;
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const [draft, setDraft] = useState<PaymentMethod | null>(null), [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false), [failure, setFailure] = useState('');
  const [gateway, setGateway] = useState<GatewayConfiguration | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [gatewayLoading, setGatewayLoading] = useState(false);
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState(false), [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [webhookCopied, setWebhookCopied] = useState(false);
  const close = useCallback(() => { if (!busy && !testing) { setDraft(null); setCredentials({}); setGateway(null); setVisibleSecrets({}); setTestResult(null); } }, [busy, testing]);
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
  const identityChanged = !!gatewayProvider && !!gateway && (credentials.mode !== gateway.mode || gatewayProvider === 'paytabs' && credentials.region !== gateway.region || gatewayFields[gatewayProvider].some(field => !field.secret && !field.link && credentials[field.key]?.trim() !== gateway.fields[field.key]));
  const added = methods;
  const enabledCount = methods.filter(method => method.enabled).length;
  const disabled = busy || loading || !admin || !!error;
  const webhookUrl = stripeWebhookUrl(source.scope, source.tenantId);
  function configure(id: string) {
    const provider = paymentProviders.find(([key]) => key === id);
    if (!provider || disabled || comingSoonProviders.has(id)) return;
    setSelected(id); setFailure(''); setTestResult(null); setWebhookCopied(false);
    setGateway(null); setCredentials({}); setVisibleSecrets({}); setGatewayLoading(provider[2] === 'gateway');
    setDraft(methods.find(method => method.provider === id) ?? { id, provider: id, name: provider[1], type: provider[2], account: '', instructions: '', enabled: true, status: 'Configured' });
  }
  async function persist(next: PaymentMethod[]) {
    if (busy) return;
    setBusy(true); setFailure('');
    try { await save(next); setDraft(null); setSelected(''); showToast.success('Payment methods saved'); }
    catch (error) { setFailure(error instanceof Error ? error.message : 'Could not save payment methods.'); }
    finally { setBusy(false); }
  }
  /** Stripe: verify credentials (entered or saved) against Stripe, like the reference "Test" tab. */
  async function runStripeTest(configuration: Record<string, string>) {
    const result = await testStripeConnection({ scope: source.scope, tenantId: source.tenantId, configuration });
    return result.ok;
  }
  async function testStripe() {
    if (!draft || gatewayProvider !== 'stripe' || testing) return;
    setTesting(true); setTestResult(null);
    try {
      await runStripeTest({ mode: credentials.mode, secretKey: credentials.secretKey ?? '' });
      setTestResult({ ok: true, message: 'Stripe credentials verified successfully.' });
    } catch (error) {
      setTestResult({ ok: false, message: error instanceof Error ? error.message : 'Stripe did not confirm these credentials.' });
    } finally { setTesting(false); }
  }
  async function persistGateway() {
    if (!draft || !gatewayProvider || !gateway || busy || gatewayLoading) return;
    setBusy(true); setFailure('');
    try {
      await source.saveGateway(gatewayProvider, draft.account, draft.enabled, credentials, gateway.gatewayRevision);
      if (gatewayProvider === 'stripe') {
        // Public-only Stripe settings are synchronized for checkout; secrets stay private.
        await syncStripePublicConfig(source.scope, source.tenantId, {
          enabled: draft.enabled,
          publishableKey: credentials.publishableKey?.trim() ?? '',
          paymentLink: credentials.paymentLink?.trim() ?? '',
          paymentLinkAnnual: credentials.paymentLinkAnnual?.trim() ?? '',
          mode: credentials.mode === 'live' ? 'live' : 'sandbox',
        }, userId).catch(() => undefined);
        // Checkout is enabled only after Stripe confirms the saved credentials.
        let verified: boolean | null = null;
        try { verified = await runStripeTest({ mode: credentials.mode, secretKey: credentials.secretKey ?? '' }); }
        catch (testError) {
          const rejectedByStripe = /(failed-precondition|permission-denied)$/.test(String((testError as { code?: string })?.code ?? ''));
          verified = rejectedByStripe || credentials.secretKey?.trim() || identityChanged ? false : null;
        }
        if (verified !== null) await source.setGatewayStatus('stripe', verified ? 'Connected' : 'Configured').catch(() => undefined);
        if (verified === false) showToast.error(t('Stripe settings saved, but the connection could not be verified. Check your keys and mode.'));
      }
      setDraft(null); setCredentials({}); setGateway(null); setSelected(''); setTestResult(null); showToast.success('Payment methods saved');
    } catch (error) { setFailure(error instanceof Error ? error.message : 'Could not save payment methods.'); }
    finally { setBusy(false); }
  }
  return <div className="st-workspace pm-methods">
    <PanelHeading title={t('Payment Methods')} description="Accept payments through manual transfers or payment gateways. Methods are synchronized across products and checkout."/>
    {(error || failure) && <div className="st-error" role="alert">{error || failure}{error && <button className="st-link" onClick={source.refresh}>{t('Try again')}</button>}</div>}
    {loading && (
      <div className="pm-loading-card" role="status" aria-live="polite">
        <div className="pm-loading-spinner" aria-hidden="true">
          <Loader2 size={16} className="animate-spin" />
        </div>
        <div className="pm-loading-copy">
          <b>{t('Loading payment methods…')}</b>
          <span>{t('Syncing configured manual transfer wallets and payment gateways')}</span>
        </div>
        <span className="pm-loading-pill">{t('Cloud Sync')}</span>
      </div>
    )}
    {!loading && !admin && <p className="st-note">{t('Contact your administrator to configure payment methods.')}</p>}
    <section aria-labelledby="pm-active-title" className="pm-section">
      <h3 id="pm-active-title">{t('Active Methods')}</h3>
      <p className="pm-description">{t('Payment methods currently available to your customers at checkout.')}{methods.length > 0 && ` · ${enabledCount}/${methods.length} ${t('enabled')}`}</p>
      <Card className="pm-manual-container">
        <div className="pm-added-list">
          {added.map(method => {
            const soon = comingSoonProviders.has(method.provider);
            return <div className="pm-added-row" key={method.id}>
              <span className="st-service-icon purple">{method.type === 'gateway' ? <CreditCard size={20}/> : <ManualIcon provider={method.provider}/>}</span>
              <div className="pm-account"><b>{t(method.name)}</b><span>{method.account}</span>{method.instructions && <small>{method.instructions}</small>}{method.type === 'gateway' && <small>{t(soon ? 'Coming Soon' : method.status === 'Connected' ? 'Connected · verified with provider' : 'Configured · verification pending')}</small>}</div>
              <Badge tone={method.enabled ? 'green' : 'neutral'}>{t(method.enabled ? 'Enabled' : 'Disabled')}</Badge>
              {admin && <div className="pm-row-actions"><button type="button" className="st-icon-button" title={t(method.enabled ? `Disable ${method.name}` : `Enable ${method.name}`)} aria-label={t(method.enabled ? `Disable ${method.name}` : `Enable ${method.name}`)} disabled={disabled} onClick={() => void persist(methods.map(item => item.id === method.id ? { ...item, enabled: !item.enabled } : item))}><Power size={14}/></button>{!soon && <button type="button" className="st-icon-button" aria-label={t(`Edit ${method.name}`)} disabled={disabled} onClick={() => configure(method.provider)}><Pencil size={14}/></button>}<button type="button" className="st-icon-button" aria-label={t(`Remove ${method.name}`)} disabled={disabled} onClick={() => void persist(methods.filter(item => item.id !== method.id))}><Trash2 size={14}/></button></div>}
            </div>;
          })}
          {!added.length && !loading && <p className="st-note">{t('No payment methods added yet. Connect a gateway or add a transfer method below.')}</p>}
        </div>
      </Card>
    </section>
    <section aria-labelledby="pm-gateway-title" className="pm-section">
      <h3 id="pm-gateway-title">{t('Professional Payment Gateways')}</h3>
      <p className="pm-description">{t('Connect a payment gateway for local or international card payments.')}</p>
      <div className="pm-gateway-grid">{gateways.map(gateway => {
        const configured = methods.filter(method => gateway.ids.includes(method.provider));
        const connected = configured.some(method => method.enabled && method.status === 'Connected');
        return <Card key={gateway.name} className="pm-gateway-card">
          <div className="pm-gateway-heading"><CreditCard size={18}/><b>{gateway.name}</b>{gateway.comingSoon ? <Badge tone="purple">{t('Coming Soon')}</Badge> : <Badge tone={connected ? 'green' : configured.length ? 'orange' : 'neutral'}>{t(connected ? 'Connected' : configured.length ? 'Configured' : 'Disconnected')}</Badge>}</div>
          <p className="st-note">{t(gateway.description)}</p>
          {!gateway.comingSoon && configured.length > 0 && <small className="pm-gateway-accounts">{configured.map(method => `${method.name} · ${t(method.status)}`).join(' / ')}</small>}
          {admin && (gateway.comingSoon
            ? <button type="button" className="st-secondary small" disabled aria-disabled="true">{t('Coming Soon')}</button>
            : <button type="button" className="st-secondary small" disabled={disabled} onClick={() => configure(configured[0]?.provider ?? gateway.ids[0])}>{t(configured.length ? 'Manage Account' : 'Configure Account')}</button>)}
        </Card>;
      })}</div>
    </section>
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
        {admin && <button type="button" className="st-secondary small pm-add-transfer" disabled={disabled} onClick={() => configure(manualProviders.find(([id]) => !methods.some(method => method.provider === id))?.[0] ?? 'bank')}><Plus size={13}/>{t('Add a transfer method')}</button>}
      </Card>
    </section>
    {draft && <Modal title={t(`Configure ${draft.name}`)} close={close} disableBackdropClose={busy || testing} disableEscapeClose={busy || testing}>
      <form autoComplete="off" onSubmit={event => { event.preventDefault(); if (draft.type === 'gateway') void persistGateway(); else void persist([...methods.filter(method => method.id !== draft.id), draft]); }}>
        <fieldset disabled={busy}>
          {['fawry', 'kashier'].includes(draft.provider) && <Field label="Provider"><DashboardSelect aria-label={t('Provider')} value={draft.provider} onChange={event => configure(event.target.value)}><option value="fawry">Fawry</option><option value="kashier">Kashier</option></DashboardSelect></Field>}
          {draft.type === 'manual' ? <>
            <Field label="Transfer account / wallet number"><input required maxLength={150} value={draft.account} onChange={event => setDraft({ ...draft, account: event.target.value })}/></Field>
            <Field label="Customer instructions"><textarea maxLength={1000} value={draft.instructions} onChange={event => setDraft({ ...draft, instructions: event.target.value })}/></Field>
          </> : <>
            <Field label="Account label"><input required maxLength={150} value={draft.account} onChange={event => setDraft({ ...draft, account: event.target.value })}/></Field>
            {gatewayProvider && <GatewaySetupGuide provider={gatewayProvider} />}
            {gatewayProvider === 'stripe' && <Field label="Webhook endpoint (checkout.session.completed)">
              <div className="st-password-wrap">
                <input type="text" readOnly spellCheck={false} value={webhookUrl} onFocus={event => event.currentTarget.select()}/>
                <button
                  type="button"
                  className="st-password-toggle"
                  aria-label={t(webhookCopied ? 'Copied' : 'Copy webhook URL')}
                  title={t(webhookCopied ? 'Copied' : 'Copy webhook URL')}
                  onClick={() => { void navigator.clipboard?.writeText(webhookUrl).then(() => { setWebhookCopied(true); showToast.success(t('Webhook URL copied')); window.setTimeout(() => setWebhookCopied(false), 1800); }); }}
                >
                  {webhookCopied ? <Check size={15} /> : <Copy size={15} />}
                </button>
              </div>
            </Field>}
            {gatewayLoading && <p className="st-note" role="status">{t('Loading gateway configuration…')}</p>}
            {gateway && gatewayProvider && <>
              <Field label="Mode"><DashboardSelect aria-label={t('Mode')} value={credentials.mode} onChange={event => setCredentials({ ...credentials, mode: event.target.value })}><option value="sandbox">{t('Sandbox')}</option><option value="live">{t('Live')}</option></DashboardSelect></Field>
              {gatewayProvider === 'paytabs' && <Field label="PayTabs region"><DashboardSelect aria-label={t('PayTabs region')} value={credentials.region} onChange={event => setCredentials({ ...credentials, region: event.target.value })}>{paytabsRegions.map(region => <option key={region} value={region}>{t(({ SAU: 'Saudi Arabia', ARE: 'United Arab Emirates', EGY: 'Egypt', OMN: 'Oman', JOR: 'Jordan', IRQ: 'Iraq', KWT: 'Kuwait', GLOBAL: 'Global' })[region] ?? region)}</option>)}</DashboardSelect></Field>}
              {gatewayFields[gatewayProvider].map(field => <Field key={`${gatewayProvider}-${field.key}`} label={field.optional ? `${field.label} (optional)` : field.label}>
                {field.secret ? (
                  <div className="st-password-wrap">
                    <input 
                      type={visibleSecrets[field.key] ? 'text' : 'password'} 
                      autoComplete="new-password" 
                      spellCheck={false} 
                      required={!field.optional && (!gateway.configuredSecrets[field.key] || identityChanged)} 
                      maxLength={4096} 
                      value={credentials[field.key] ?? ''} 
                      placeholder={field.secret && gateway.configuredSecrets[field.key] && !identityChanged ? t('Saved securely — leave blank to keep') : ''} 
                      onChange={event => setCredentials({ ...credentials, [field.key]: event.target.value })}
                    />
                    <button
                      type="button"
                      className="st-password-toggle"
                      aria-label={visibleSecrets[field.key] ? t('Hide sensitive key') : t('Show sensitive key')}
                      title={visibleSecrets[field.key] ? t('Hide sensitive key') : t('Show sensitive key')}
                      onClick={() => setVisibleSecrets(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                    >
                      {visibleSecrets[field.key] ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                ) : (
                  <input 
                    type={field.link ? 'url' : 'text'} 
                    autoComplete="off" 
                    spellCheck={false} 
                    required={!field.optional} 
                    maxLength={4096} 
                    placeholder={field.link ? 'https://buy.stripe.com/...' : undefined}
                    value={credentials[field.key] ?? ''} 
                    onChange={event => setCredentials({ ...credentials, [field.key]: event.target.value })}
                  />
                )}
              </Field>)}
              {gatewayProvider === 'stripe' && <div className="st-preference">
                <span>{t('Verify these Stripe keys before enabling checkout.')}</span>
                <button type="button" className="st-secondary small" disabled={testing || busy} onClick={() => void testStripe()}>
                  {testing ? <Loader2 size={13} className="animate-spin" /> : <Plug size={13} />}{t(testing ? 'Testing…' : 'Test Connection')}
                </button>
              </div>}
              {testResult && (testResult.ok
                ? <p className="st-success" role="status"><CheckCircle2 size={15}/>{t(testResult.message)}</p>
                : <p className="st-error" role="alert">{t(testResult.message)}</p>)}
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
