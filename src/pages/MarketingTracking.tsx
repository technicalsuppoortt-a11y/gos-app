import { useState, useSyncExternalStore, type FormEvent } from 'react';
import { useSelector } from 'react-redux';
import { Activity, CheckCircle2, Download, Plus, Radio, Save, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { useBusinessMetrics, eventLabel } from '../backend/metrics';
import type { RootState } from '../store';
import { useTrackingConfig, validMeta, validGoogle, subscribeTracking, trackingSnapshot, track, type TrackingConfig } from '../backend/marketingTracking';
import { Card, Field, PanelHeading, Toggle, Badge } from './settings/kit';
import { translateText as t, useUILanguage } from '../i18n/display';
import { showToast } from '../utils/toast';
import './settings/settings.css';
import './pixel-connect.css';

const platformTabs = ['Overview', 'Connect Accounts', 'Event SDK', 'Event Library', 'Realtime', 'Funnels', 'Analytics', 'Health Check', 'Debug Logs', 'Test Center', 'AI Optimization', 'Advanced'] as const;
const workspaceTabs = ['Tracking Settings', 'Event Logs', 'Event Management'] as const;
const providers = [
  { key: 'metaId', style: 'meta', mark: 'f', name: 'Meta Facebook Ads', description: 'Meta Pixel integration', field: 'Meta Pixel ID', placeholder: '123456789012345', idCheck: 'Meta ID valid', scriptCheck: 'Meta script requested', testLabel: 'Test Meta' },
  { key: 'googleId', style: 'google', mark: 'G', name: 'Google Analytics 4', description: 'Web analytics integration', field: 'GA4 Measurement ID', placeholder: 'G-ABC123XYZ0', idCheck: 'GA4 ID valid', scriptCheck: 'GA4 script requested', testLabel: 'Test GA4' },
] as const;
const upcomingProviders = [
  { style: 'tiktok', mark: '♪', name: 'TikTok Ads', description: 'TikTok pixel integration' },
  { style: 'linkedin', mark: 'in', name: 'LinkedIn Insight Tag', description: 'LinkedIn pixel integration' },
] as const;
const library = ['PageView','Lead','Purchase','BookMeeting','Signup','Login','InitiateCheckout','ViewContent','AddToCart','AddToWishlist','Search','Contact','Subscribe','StartTrial','CompleteRegistration','AddPaymentInfo','SubmitApplication','Donate','FindLocation','CustomizeProduct','Schedule','ViewCart','RemoveFromCart','Refund','Share','Download'];
export function MarketingTracking() {
  useUILanguage();
  const role = useSelector((s: RootState) => s.auth.role);
  const global = role === 'ADMIN' || role === 'SUPER_ADMIN';
  const source = useTrackingConfig(global);
  const [changes, setChanges] = useState<{ source: TrackingConfig; draft: TrackingConfig } | null>(null);
  const draft = changes?.source === source.config ? changes.draft : source.config;
  const [tab, setTab] = useState<string>(global ? platformTabs[0] : workspaceTabs[0]), [busy, setBusy] = useState(false), [error, setError] = useState(''), [eventName, setEventName] = useState('');
  const sessionEvents = useSyncExternalStore(subscribeTracking, trackingSnapshot);
  const records = useBusinessMetrics();
  const events = [
    ...sessionEvents,
    ...records.events.map(event => ({ id: 'workspace:' + event.id, event: eventLabel(event.type), at: event.createdAt, test: false, destinations: ['Workspace record'], payload: { resource: event.resource ?? '', resourceId: event.resourceId ?? '' } })),
    ...records.paid.map(order => ({ id: 'order:' + order.id, event: 'Purchase', at: order.createdAt ?? order.date ?? '', test: false, destinations: ['Verified transaction'], payload: { orderId: order.id, value: order.amount, currency: order.currency } })),
  ].sort((a,b) => Date.parse(b.at) - Date.parse(a.at)).slice(0,200);
  const change = <K extends keyof TrackingConfig>(key: K, value: TrackingConfig[K]) => setChanges({ source: source.config, draft: { ...draft, [key]: value } });
  const count = (name: string) => name === 'Purchase' ? records.paid.length : name === 'Lead' ? records.leads.length : name === 'BookMeeting' ? records.bookings.length : events.filter(e => e.event === name && !e.test).length;
  const checks: [string, boolean][] = [
    ['Tracking enabled', source.config.enabled], ['Meta ID valid', validMeta(source.config.metaId)], ['GA4 ID valid', validGoogle(source.config.googleId)], ['HTTPS connection', location.protocol === 'https:'],
    ['Meta script requested', !!document.getElementById('gos-meta-pixel')], ['GA4 script requested', !!document.getElementById('gos-ga4')], ['Meta SDK available', !!window.fbq], ['GA4 SDK available', !!window.gtag],
    ['Events observed this session', events.length > 0], ['Custom events configured', source.config.customEvents.length > 0], ['Webhook URL configured (delivery not connected)', !!source.config.webhookUrl], ['Tracking scope authorized', !source.error && !source.loading],
  ];
  const score = Math.round(checks.filter(([, ok]) => ok).length / checks.length * 100);
  function exportEvents() {
    const cell = (s: string) => `"${(/^[=+@\-\t\r]/.test(s) ? "'" : '') + s.replaceAll('"', '""')}"`;
    const csv = [['Time', 'Event', 'Test', 'Destinations', 'Payload'], ...events.map(e => [e.at, e.event, String(e.test), e.destinations.join(', '), JSON.stringify(e.payload)])].map(row => row.map(cell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = 'upclick-tracking-events.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const activeTab = (global ? platformTabs : workspaceTabs).find(name => name === tab) ?? (global ? platformTabs[0] : workspaceTabs[0]);
  const writeDisabled = busy || source.loading || !!source.error || !source.canManage;
  const conversions = count('Purchase') + count('BookMeeting');

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await source.save({ ...draft, metaId: draft.metaId.trim(), googleId: draft.googleId.trim().toUpperCase() });
      showToast.success('Tracking settings saved');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not save tracking settings.');
    } finally {
      setBusy(false);
    }
  }

  async function addCustomEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (writeDisabled || !/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(eventName)) return;
    setBusy(true);
    setError('');
    try {
      await source.save({ ...draft, customEvents: [...new Set([...draft.customEvents, eventName])] });
      setEventName('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not save event.');
    } finally {
      setBusy(false);
    }
  }

  function runLocalTest(name: string) {
    track(name, name === 'Purchase' ? { value: 49, currency: 'USD' } : {}, true);
    showToast.success(global ? 'Test event added to Realtime' : 'Test event added to Event Logs');
  }

  const badge = (ok: boolean) => <Badge tone={ok ? 'green' : 'orange'}>{t(ok ? 'Ready' : 'Needs review')}</Badge>;
  const saveButton = <button type="submit" className="st-primary" disabled={writeDisabled}><Save size={16} aria-hidden="true"/>{t(busy ? 'Saving…' : 'Save Changes')}</button>;

  function renderConnections() {
    return <form className="pixel-connect" onSubmit={saveSettings}>
      <fieldset className="pixel-section-stack" disabled={writeDisabled}>
        <div className="pixel-connect-grid">
          {providers.map(provider => {
            const providerChecks = checks.filter(([label]) => label === provider.idCheck || label === provider.scriptCheck);
            return <section className="pixel-connect-card" key={provider.key} aria-label={t(provider.name)}>
              <header className="pixel-card-header">
                <div className="pixel-connect-heading">
                  <span className={`pixel-connect-logo pixel-connect-${provider.style}`} aria-hidden="true">{provider.mark}</span>
                  <div><h3>{t(provider.name)}</h3><p>{t(provider.description)}</p></div>
                </div>
                {badge(providerChecks.every(([, ok]) => ok))}
              </header>
              <Field label={provider.field}>
                <input dir="ltr" inputMode={provider.key === 'metaId' ? 'numeric' : 'text'} placeholder={provider.placeholder} value={draft[provider.key]}
                  onChange={event => change(provider.key, provider.key === 'googleId' ? event.target.value.toUpperCase() : event.target.value)}/>
              </Field>
              <ul className="pixel-status-list">
                {providerChecks.map(([label, ok]) => <li key={label}><span>{t(label)}</span>{badge(ok)}</li>)}
              </ul>
              <button type="button" className="st-secondary pixel-local-test" title={t('Run a local PageView test')} onClick={() => runLocalTest('PageView')}>{t(provider.testLabel)}</button>
            </section>;
          })}
          {upcomingProviders.map(provider => (
            <section className="pixel-connect-card pixel-connect-upcoming" key={provider.style} aria-label={t(provider.name)}>
              <header className="pixel-card-header">
                <div className="pixel-connect-heading">
                  <span className={`pixel-connect-logo pixel-connect-${provider.style}`} aria-hidden="true">{provider.mark}</span>
                  <div><h3>{t(provider.name)}</h3><p>{t(provider.description)}</p></div>
                </div>
                <Badge tone="green">{t('Coming soon')}</Badge>
              </header>
            </section>
          ))}
        </div>
        <Card className="pixel-card">
          <div className="pixel-consent-row">
            <div><h3>{t('Enable tracking after reviewing your consent requirements')}</h3><p>{t(global ? 'These defaults apply across the platform.' : 'Your workspace pixels run alongside platform defaults.')}</p></div>
            <Toggle label="Enable tracking" checked={draft.enabled} onChange={value => change('enabled', value)}/>
          </div>
          <div className="pixel-card-actions">{saveButton}</div>
        </Card>
      </fieldset>
    </form>;
  }

  function renderTestCenter() {
    return <Card className="pixel-card" title={t('Test Center')} description={t('Run local test events from this page. They appear in the event logs without sending production conversions.')}>
      <div className="pixel-event-chips">
        {['PageView','Lead','Signup','Login','Purchase','BookMeeting', ...source.config.customEvents].map(name => (
          <button key={name} type="button" className="st-secondary" onClick={() => runLocalTest(name)}><bdi dir="ltr">{name}</bdi></button>
        ))}
      </div>
    </Card>;
  }

  function renderEventTable(title: string, withPayload: boolean) {
    return <Card className="pixel-card" title={t(title)} description={t('Workspace records and browser event stream · delivery to Meta or Google is not verified here.')}
      action={<button type="button" className="st-secondary" disabled={!events.length} onClick={exportEvents}><Download size={16} aria-hidden="true"/>{t('Export CSV')}</button>}>
      {events.length ? <div className="pixel-log-scroll" tabIndex={0} aria-label={t(title)}>
        <table className="pixel-log-table">
          <thead><tr>{['Time','Event','Destinations','Status', ...(withPayload ? ['Payload'] : [])].map(label => <th key={label} scope="col">{t(label)}</th>)}</tr></thead>
          <tbody>{events.map(event => <tr key={event.id}>
            <td data-label={t('Time')}><bdi dir="ltr">{new Date(event.at).toLocaleTimeString('en-US')}</bdi></td>
            <td data-label={t('Event')}><bdi className="pixel-event-name">{event.event}</bdi></td>
            <td data-label={t('Destinations')}><span>{event.destinations.map(destination => t(destination)).join(' · ') || t('Local only')}</span></td>
            <td data-label={t('Status')}><Badge tone={event.test ? 'orange' : 'green'}>{t(event.test ? 'Local test' : 'Dispatched')}</Badge></td>
            {withPayload && <td data-label={t('Payload')}><code dir="ltr">{JSON.stringify(event.payload)}</code></td>}
          </tr>)}</tbody>
        </table>
      </div> : <p className="st-empty">{t('No events observed in this session.')}</p>}
    </Card>;
  }

  function renderPipeline() {
    const stages = ['PageView', 'Lead', 'InitiateCheckout', 'Purchase'];
    return <Card className="pixel-card" title={t('Session conversion pipeline')} description={t('Aggregate event counts, not unique-user attribution.')}>
      <dl className="pixel-data-list">{stages.map((name, index) => {
        const value = count(name), previous = count(stages[index - 1]);
        return <div key={name}><dt><bdi>{name}</bdi><small>{index && previous ? `${Math.round(Math.min(value / previous, 1) * 100)}% ${t('of previous stage')}` : t('This session')}</small></dt><dd>{value}</dd></div>;
      })}</dl>
    </Card>;
  }

  function renderDistribution() {
    const names = [...new Set(events.filter(event => !event.test).map(event => event.event))];
    return <Card className="pixel-card" title={t('Event distribution')} description={t('Recorded workspace events, verified transactions and observed browser events.')}>
      {names.length ? <dl className="pixel-data-list">{names.map(name => <div key={name}><dt><bdi>{name}</bdi></dt><dd>{count(name)}</dd></div>)}</dl>
        : <p className="st-note">{t('No production events observed.')}</p>}
    </Card>;
  }

  function renderCatalog() {
    return <Card className="pixel-card" title={t('Event Library')} description={t('Standard events are ready to use. Add a custom event for a workspace-specific action.')}>
      <div className="pixel-event-chips">{library.map(name => <span className="pixel-event-chip" key={name}><CheckCircle2 size={15} aria-hidden="true"/><bdi dir="ltr">{name}</bdi></span>)}
        {source.config.customEvents.map(name => <span className="pixel-event-chip pixel-custom-chip" key={name}><bdi dir="ltr">{name}</bdi></span>)}
      </div>
      <details className="pixel-disclosure">
        <summary><Plus size={15} aria-hidden="true"/>{t('Add custom event')}</summary>
        <form className="pixel-custom-event-form" onSubmit={addCustomEvent}>
          <Field label="Event name"><input dir="ltr" maxLength={40} value={eventName} onChange={event => setEventName(event.target.value)}/></Field>
          <button type="submit" className="st-primary" disabled={writeDisabled || !/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(eventName)}>{t('Add custom event')}</button>
        </form>
      </details>
    </Card>;
  }

  function renderSdk() {
    return <Card className="pixel-card" title={t('Unified tracking SDK')} description={t('Use this SDK to dispatch events from the application code.')}>
      <pre className="pixel-sdk" dir="ltr"><code>{`import { Tracking } from './backend/marketingTracking';\n\nTracking.page('/dashboard');\nTracking.lead({ source: 'campaign' });\nTracking.purchase(49, 'USD', { orderId: 'verified-order' });\nTracking.bookMeeting({ meetingType: 'consultation' });\nTracking.custom('export_report', { format: 'pdf' });`}</code></pre>
      <p className="st-note">{t('Call purchase only after the payment backend verifies an order. Avoid personal or sensitive data in event payloads.')}</p>
    </Card>;
  }

  function renderAdvanced() {
    return <form onSubmit={saveSettings}>
      <Card className="pixel-card" title={t('Advanced configuration')} description={t(global ? 'These defaults apply across the platform.' : 'Your workspace pixels run alongside platform defaults.')}>
        <fieldset className="pixel-section-stack" disabled={writeDisabled}>
          <div className="pixel-consent-row"><b>{t('Developer mode')}</b><Toggle label="Developer mode" checked={draft.advancedMode} onChange={value => change('advancedMode', value)}/></div>
          <Field label="Webhook / CAPI endpoint (configuration only)"><input type="url" dir="ltr" value={draft.webhookUrl} onChange={event => change('webhookUrl', event.target.value)}/></Field>
          <p className="st-note">{t('Server-side webhook delivery and consent management must be connected separately. No API secrets are stored here.')}</p>
          <div className="pixel-card-actions">
            <button type="button" className="st-secondary" onClick={() => change('enabled', false)}>{t('Disable tracking in draft')}</button>
            {saveButton}
          </div>
        </fieldset>
      </Card>
    </form>;
  }

  function renderChecks() {
    return <Card className="pixel-card" title={t('Infrastructure checks')}><ul className="pixel-status-list">{checks.map(([label, ok]) => <li key={label}><span>{t(label)}</span>{badge(ok)}</li>)}</ul></Card>;
  }

  function renderRecommendations() {
    return <Card className="pixel-card" title={t('Configuration recommendations')} description={t('Rule-based diagnostics from your current configuration.')}>
      {checks.filter(([, ok]) => !ok).map(([label]) => <p className="st-note" key={label}>• {t('Review')}: {t(label)}</p>)}
      <p className="st-note">{t('Verify delivery with Meta Test Events and Google DebugView. Add a consent manager before collecting marketing events where consent is required.')}</p>
    </Card>;
  }

  const metric = (label: string, value: number | string, Icon: typeof Activity) => (
    <div className="pixel-metric" key={label}><Icon size={21} aria-hidden="true"/><div><span>{t(label)}</span><strong>{value}</strong></div></div>
  );

  function renderTab() {
    switch (activeTab) {
      case 'Tracking Settings':
        return <>{renderConnections()}{renderTestCenter()}</>;
      case 'Event Logs':
        return <>
          <div className="pixel-pair">{metric('Total Events', events.length, Activity)}{metric('Recorded conversions', conversions, Radio)}</div>
          {renderEventTable('Realtime events and debug logs', true)}
          <div className="pixel-pair">{renderPipeline()}{renderDistribution()}</div>
        </>;
      case 'Event Management':
        return <>{renderCatalog()}{renderSdk()}<details className="pixel-card pixel-disclosure">
          <summary><SlidersHorizontal size={17} aria-hidden="true"/>{t('Advanced tools')}</summary>
          <div className="pixel-section-stack">{renderAdvanced()}<div className="pixel-pair">{renderChecks()}{renderRecommendations()}</div></div>
        </details></>;
      case 'Overview':
        return <>
          <div className="pixel-metrics">{metric('Readiness checks', `${score}%`, ShieldCheck)}{metric('Recorded events', events.filter(event => !event.test).length, Radio)}{metric('Recorded conversions', conversions, Activity)}</div>
          <Card className="pixel-card" title={t('Quick setup')}>
            <p className="st-note">{t('Events combine recorded workspace activity, verified transactions and this browser session. Script availability does not confirm delivery to a provider.')}</p>
            <div className="pixel-card-actions"><button type="button" className="st-primary" onClick={() => setTab('Connect Accounts')}>{t('Connect Accounts')}</button><button type="button" className="st-secondary" onClick={() => setTab('Test Center')}>{t('Test Center')}</button></div>
          </Card>
        </>;
      case 'Connect Accounts': return renderConnections();
      case 'Event SDK': return renderSdk();
      case 'Event Library': return renderCatalog();
      case 'Realtime': return renderEventTable(activeTab, false);
      case 'Debug Logs': return renderEventTable(activeTab, true);
      case 'Funnels': return renderPipeline();
      case 'Analytics': return renderDistribution();
      case 'Health Check': return renderChecks();
      case 'Test Center': return renderTestCenter();
      case 'AI Optimization': return renderRecommendations();
      case 'Advanced': return renderAdvanced();
    }
  }

  return <div className="st-workspace pixel-workspace">
    <PanelHeading title={t('Pixel')} description={t(global ? 'Manage platform-wide Meta Pixel and Google Analytics defaults.' : 'Configure workspace pixels and inspect recorded activity and observed tracking events.')}/>
    <nav className="pixel-tabs" aria-label={t('Pixel navigation')}>
      {(global ? platformTabs : workspaceTabs).map(name => <button type="button" key={name} aria-current={activeTab === name ? 'page' : undefined} onClick={() => setTab(name)}>{t(name)}</button>)}
    </nav>
    {source.loading && <p role="status">{t('Loading tracking settings…')}</p>}
    {(source.error || error) && <p role="alert" className="st-error">{t(source.error || error)}{source.error && <button type="button" className="st-link" onClick={source.refresh}>{t('Try again')}</button>}</p>}
    <div className="pixel-section-stack">{renderTab()}</div>
  </div>;
}
