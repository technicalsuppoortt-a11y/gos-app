import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  HelpCircle,
  Info,
  Mail,
  MessageCircle,
  Plug,
  Search,
  ShieldCheck,
  Sparkles,
  Unplug,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { InstagramIcon, FacebookIcon } from '../inbox/ChannelIcons';
import { Badge, Card, Field, Modal, Toggle } from './kit';
import { friendlyError, safeExternalUrl, settingsApiEnabled, settingsRequest } from './data';
import type { IntegrationState, SettingsData } from './data';
import { PanelHeading } from './kit';
import { useMetaChannels, type MetaChannel } from '../flow-builder/Channels';
import { localDemoEnabled, useDemoState } from '../../backend/localDemo';

type GuideStep = {
  step: string;
  title: string;
  detail: string;
};

const providers = [
  {
    id: 'meta',
    connectionId: 'meta',
    channel: 'messenger' as MetaChannel,
    name: 'Facebook Messenger',
    category: 'Communication',
    setupTime: '~2 min setup',
    accountLabel: 'Connected Facebook Page',
    accountPlaceholder: 'e.g. Upclick Official Page',
    description: 'Manage Facebook Page messages in your unified inbox and automations.',
    capabilities: ['Unified Inbox DMs', 'Comment Replies', 'AI Auto-Responder'],
    scopes: [
      'Read the Facebook Pages you manage',
      'Receive and reply to Page messages and comments in real time',
    ],
    prerequisites: [
      'Admin access to a Facebook Business Page',
      'Messaging turned on for the Page',
    ],
    guideSteps: [
      {
        step: '01',
        title: 'Make Sure You Are a Page Admin',
        detail: 'Open your Facebook Page → Settings → Page access and confirm your account has full control of the Page.',
      },
      {
        step: '02',
        title: 'Turn On Page Messaging',
        detail: 'In your Page settings, make sure people can message your Page so new conversations can reach your Inbox.',
      },
      {
        step: '03',
        title: 'Authorize via Meta Business Login',
        detail: 'Click "Connect" below, sign in with your Facebook Admin account, and select the Page you want to sync.',
      },
      {
        step: '04',
        title: 'Test & Enable Automatic Sync',
        detail: 'Run the built-in Connection Test to verify webhook delivery and keep "Automatic sync" turned on so new messages appear in your Inbox immediately.',
      },
    ] as GuideStep[],
    proTip: 'Grant all requested permissions for the Page during the Meta popup—deselecting any of them can stop new messages from reaching your Inbox.',
    icon: FacebookIcon,
    color: 'blue',
    status: 'https://metastatus.com/',
  },
  {
    id: 'instagram',
    // Instagram connects through the same Meta login as Messenger, so it shares that connection.
    connectionId: 'meta',
    channel: 'instagram' as MetaChannel,
    name: 'Instagram',
    category: 'Communication',
    setupTime: '~2 min setup',
    accountLabel: 'Connected Instagram Handle',
    accountPlaceholder: 'e.g. @upclick.app',
    description: 'Manage Instagram Business DMs, story and comment replies in your unified inbox.',
    capabilities: ['Instagram DMs', 'Story & Comment Replies', 'AI Auto-Responder'],
    scopes: [
      'Read linked Instagram Business accounts',
      'Receive and reply to Instagram direct messages and comments in real time',
    ],
    prerequisites: [
      'An Instagram Professional (Business or Creator) account linked to your Facebook Page',
      'Message control ("Allow access to messages") enabled in Instagram Advanced Messaging settings',
    ],
    guideSteps: [
      { step: '01', title: 'Link Instagram to Your Facebook Page', detail: 'Open your Facebook Page Settings → Linked Accounts → Instagram and ensure your Instagram Business profile is connected.' },
      { step: '02', title: 'Enable Connected Tools in Instagram', detail: 'In the Instagram mobile app, go to Settings & Privacy → Messages and story replies → Message controls and turn on "Allow access to messages".' },
      { step: '03', title: 'Authorize via Meta Business Login', detail: 'Click "Connect" below, sign in with your Facebook Admin account, and select the Instagram account you want to sync.' },
    ] as GuideStep[],
    proTip: 'Instagram uses the same Meta login as Facebook Messenger; connecting either one connects both.',
    icon: InstagramIcon,
    color: 'pink',
    status: 'https://metastatus.com/',
  },
  {
    id: 'whatsapp',
    connectionId: 'whatsapp',
    channel: 'whatsapp' as MetaChannel,
    name: 'WhatsApp Business',
    category: 'Communication',
    setupTime: '~3 min setup',
    accountLabel: 'WhatsApp Business Phone Number / WABA Name',
    accountPlaceholder: 'e.g. +20 100 000 0000 · Upclick Support',
    description: 'Connect WhatsApp Cloud API for customer messaging, broadcasts, and automated AI follow-ups.',
    capabilities: ['WhatsApp Cloud API', 'Automated Follow-ups', 'Approved Templates'],
    scopes: [
      'Access your verified WhatsApp Business Account (WABA) and phone number',
      'Send approved template messages and receive customer replies in real time',
    ],
    prerequisites: [
      'A Meta Business Portfolio (Business Manager) account',
      'A phone number that can receive an SMS or call code and is not active on the regular WhatsApp app',
      'For manual setup: your own Meta app with the WhatsApp product added',
    ],
    guideSteps: [
      {
        step: '01',
        title: 'Prepare Your Phone Number',
        detail: 'Use a number that is not registered on the regular WhatsApp or WhatsApp Business app, or delete that account from the app first.',
      },
      {
        step: '02',
        title: 'Option 1: Connect with Meta',
        detail: 'Click "Connect with Meta", log in to your Meta Business Portfolio, then create or pick your WhatsApp Business profile and verify the number with the 6-digit code.',
      },
      {
        step: '03',
        title: 'Option 2: Connect Manually',
        detail: 'Click "Connect manually", add the Callback URL and Verify token shown to your Meta app webhook and subscribe to "messages", then paste your Phone number ID, permanent access token and App Secret.',
      },
      {
        step: '04',
        title: 'Send a Test Message',
        detail: 'Message your WhatsApp number from another phone and check that the conversation appears in your Inbox.',
      },
    ] as GuideStep[],
    proTip: 'Use Connect with Meta if you are not sure. Choose manual setup only if you already run your own Meta app and have a permanent System User token.',
    icon: MessageCircle,
    color: 'green',
    status: 'https://metastatus.com/',
  },
  {
    id: 'gmail',
    connectionId: 'gmail',
    name: 'Gmail',
    category: 'Communication',
    setupTime: '~1 min setup',
    accountLabel: 'Connected Gmail / Google Workspace Address',
    accountPlaceholder: 'e.g. support@yourbusiness.com',
    description: 'Send and receive customer emails directly from your connected Gmail or Google Workspace account.',
    capabilities: ['2-Way Email Sync', 'Follow-Up Sequences', 'Custom Sender Identity'],
    scopes: [
      'Read and send business emails on behalf of your connected address',
      'Identify the connected Google Workspace or Gmail account profile',
    ],
    prerequisites: [
      'An active Gmail or Google Workspace business email account',
      'Pop-ups allowed in your browser for Google OAuth sign-in',
      'Admin approval for third-party OAuth apps if using a restricted Google Workspace organization',
    ],
    guideSteps: [
      {
        step: '01',
        title: 'Click Connect on the Gmail Card',
        detail: 'Open the Gmail connection modal and review the email read/send permissions required for unified inbox syncing.',
      },
      {
        step: '02',
        title: 'Select Your Google Account',
        detail: 'Choose your preferred business Gmail or Google Workspace address in the secure Google sign-in window.',
      },
      {
        step: '03',
        title: 'Approve Gmail Workspace Scopes',
        detail: 'Check the permission boxes to allow Upclick to send follow-up emails and sync incoming customer replies.',
      },
      {
        step: '04',
        title: 'Confirm Sender Address & Sync',
        detail: 'Run the connection test to verify SMTP/API readiness and save your preferences to start emailing leads from CRM and Inbox.',
      },
    ] as GuideStep[],
    proTip: 'Connecting a custom domain Google Workspace address (e.g., hello@yourdomain.com) significantly improves email deliverability and customer trust.',
    icon: Mail,
    color: 'red',
    status: 'https://www.google.com/appsstatus/dashboard/',
  },
  {
    id: 'google-calendar',
    connectionId: 'google-calendar',
    name: 'Google Calendar',
    category: 'Scheduling',
    setupTime: '~1 min setup',
    accountLabel: 'Connected Google Calendar Account',
    accountPlaceholder: 'e.g. bookings@yourbusiness.com (Primary Calendar)',
    description: 'Sync bookings in real time, check live availability, and prevent double bookings automatically.',
    capabilities: ['Real-Time Availability', 'Two-Way Event Sync', 'Conflict Prevention'],
    scopes: [
      'Read calendar busy/free availability blocks in real time',
      'Create, reschedule, and cancel booking events automatically',
    ],
    prerequisites: [
      'A Google account with Google Calendar active',
      'Your primary calendar timezone configured to match your business operating hours',
      'Edit permissions ("Make changes to events") on the target calendar',
    ],
    guideSteps: [
      {
        step: '01',
        title: 'Open the Google Calendar Connection Flow',
        detail: 'Click "Connect" on the Google Calendar card to start linking your scheduling calendar.',
      },
      {
        step: '02',
        title: 'Sign In with Your Google Account',
        detail: 'Select the Google account that hosts the main calendar where you manage your daily appointments.',
      },
      {
        step: '03',
        title: 'Grant Calendar Read & Write Access',
        detail: 'Approve calendar availability and event creation permissions so Upclick can block busy slots and add new client bookings.',
      },
      {
        step: '04',
        title: 'Verify Two-Way Sync',
        detail: 'Click "Test Connection" and enable "Automatic sync" so every appointment booked on your Booking Pages appears on your calendar instantly.',
      },
    ] as GuideStep[],
    proTip: 'Mark personal appointments as "Busy" in your Google Calendar—Upclick automatically hides those time slots on your public booking pages.',
    icon: CalendarDays,
    color: 'blue',
    status: 'https://www.google.com/appsstatus/dashboard/',
  },
];

type Provider = typeof providers[number];

export function IntegrationsPanel({ data, refresh }: { data: SettingsData; refresh: () => Promise<void> }) {
  useUILanguage();
  const [demoConnections] = useDemoState<Record<string, IntegrationState>>('integrations', {});
  if (localDemoEnabled) data = { ...data, integrations: { ...data.integrations, ...demoConnections } };

  const [category, setCategory] = useState('All integrations');
  const [search, setSearch] = useState('');
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<Provider | null>(providers.find(p => p.id === params.get('provider') && !p.channel) ?? null);
  const [activeGuideId, setActiveGuideId] = useState<string>(providers[0].id);
  const [logs, setLogs] = useState<string[] | null>(null);
  const [logError, setLogError] = useState('');
  const guideRef = useRef<HTMLDivElement>(null);
  const role = useSelector((s: RootState) => s.auth.role);

  const close = useCallback(() => {
    setSelected(null);
    setParams(p => {
      p.delete('provider');
      p.delete('connection');
      return p;
    }, { replace: true });
  }, [setParams]);

  const list = providers.filter(
    p =>
      (category === 'All integrations' || p.category === category) &&
      `${p.name} ${p.description} ${p.capabilities.join(' ')}`.toLowerCase().includes(search.toLowerCase()),
  );

  // Messenger, Instagram and WhatsApp use the real channel connection (the same one the AI and flows reply on).
  const meta = useMetaChannels();
  const stateOf = (p: Provider): IntegrationState => {
    if (!p.channel) return data.integrations[p.connectionId] ?? { status: 'Not Connected' };
    const c = meta.channels?.find(x => x.channel === p.channel);
    return c?.status === 'connected'
      ? { status: 'Connected', account: c.name ?? c.external_id ?? undefined, providerStatus: 'operational' }
      : { status: 'Not Connected' };
  };
  const connectedCount = providers.filter(p => stateOf(p).status === 'Connected').length;
  const activeGuide = providers.find(p => p.id === activeGuideId) ?? providers[0];
  const activeGuideState = stateOf(activeGuide);

  const openProviderGuide = (providerId: string) => {
    setActiveGuideId(providerId);
    guideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleChannel = (p: Provider) => {
    const c = meta.channels?.find(x => x.channel === p.channel);
    if (stateOf(p).status === 'Connected' && c) meta.disconnect(c, p.name);
    else meta.connect(p.channel!);
  };
  const openManualWhatsApp = () => {
    meta.setManual({ external_id: '', access_token: '', app_secret: '' });
    requestAnimationFrame(() => document.getElementById('integration-whatsapp')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

  const renderChannelExtras = (p: Provider) => {
    const isWhatsApp = p.channel === 'whatsapp';
    const connected = stateOf(p).status === 'Connected';
    return (
      <>
        {meta.error && meta.busy === null && p.channel === 'messenger' && (
          <p className="st-error" role="alert">{localizeNode(meta.error)}</p>
        )}
        {meta.picking && meta.picking.channel === p.channel && (
          <div className="st-channel-picker">
            <h4>{translateText(p.channel === 'instagram' ? 'Choose an Instagram account' : 'Choose a page')}</h4>
            {meta.picking!.pages.length === 0 && (
              <p>{translateText(p.channel === 'instagram'
                ? 'No Instagram account found. Link a professional Instagram account to your Facebook Page, then allow it in the Meta window.'
                : 'No pages found. You need to manage the page, and allow it in the Meta window.')}</p>
            )}
            <ul>
              {meta.picking!.pages.map(page => (
                <li key={page.id}>
                  <span dir="auto">{p.channel === 'instagram' ? `@${page.instagram?.username} · ${page.name}` : page.name}</span>
                  <button type="button" className="st-secondary small" disabled={meta.busy !== null} onClick={() => meta.pick(page)}>
                    {localizeNode(meta.busy === page.id ? 'Connecting…' : 'Connect')}
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="st-guide-trigger" onClick={() => meta.setPicking(null)}>{translateText('Cancel')}</button>
          </div>
        )}
        {isWhatsApp && !connected && !meta.manual && (
          <button type="button" className="st-secondary small" onClick={openManualWhatsApp}>
            {translateText('Connect manually with my own Meta app')}
          </button>
        )}
        {isWhatsApp && !connected && meta.manual && (
          <form className="st-channel-picker" onSubmit={meta.connectManual}>
            <h4>{translateText('Connect with your own Meta app')}</h4>
            <p>{translateText('First add this webhook to your app in Meta, and subscribe to the messages field.')}</p>
            <Field label={translateText("Callback URL")}><input readOnly value={meta.config?.webhook_url ?? ''} /></Field>
            <Field label={translateText("Verify token")}><input readOnly value={meta.config?.verify_token ?? ''} /></Field>
            <Field label={translateText("Phone number ID")}><input required inputMode="numeric" value={meta.manual.external_id} onChange={e => meta.setManual({ ...meta.manual!, external_id: e.target.value })} /></Field>
            <Field label={translateText("Permanent access token")}><input required type="password" autoComplete="off" value={meta.manual.access_token} onChange={e => meta.setManual({ ...meta.manual!, access_token: e.target.value })} /></Field>
            <Field label={translateText("App Secret")}><input required type="password" autoComplete="off" value={meta.manual.app_secret} onChange={e => meta.setManual({ ...meta.manual!, app_secret: e.target.value })} /></Field>
            <div className="st-modal-actions">
              <button type="button" className="st-secondary" onClick={() => meta.setManual(null)}>{translateText('Cancel')}</button>
              <button type="submit" className="st-primary" disabled={meta.busy !== null}>{localizeNode(meta.busy === 'whatsapp' ? 'Connecting…' : 'Connect')}</button>
            </div>
          </form>
        )}
      </>
    );
  };

  const renderProviderIcon = (p: Provider, size = 24) =>
    <p.icon size={size} />;

  return (
    <>
      <PanelHeading
        title={translateText('Integrations')}
        description={translateText("Connect your core communication and scheduling channels with real-time Firebase workspace sync.")}
      />

      {/* Summary & Filter Toolbar */}
      <div className="st-integration-toolbar">
        <div className="st-category-tabs" aria-label={translateText('Integration categories')}>
          {localizeNode(
            ['All integrations', 'Communication', 'Scheduling'].map(c => (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
                className={category === c ? 'active' : ''}
                onClick={() => setCategory(c)}
              >
                {localizeNode(c)}
              </button>
            )),
          )}
        </div>
        <div className="st-integration-toolbar-right">
          <span className="st-integration-summary-pill">
            <CheckCircle2 size={13} />
            <span>
              {localizeNode(connectedCount)} / {providers.length} {translateText('Connected')}
            </span>
          </span>
          <label className="st-search">
            <Search size={15} />
            <input
              aria-label={translateText('Search integrations')}
              placeholder={translateText('Search integrations…')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </label>
        </div>
      </div>

      {/* 4 Core Integration Cards Grid */}
      <div className="st-integration-grid st-integration-grid-four">
        {localizeNode(
          list.map(p => {
            const state = stateOf(p);
            const isConnected = state.status === 'Connected';
            return (
              <Card key={p.id} id={`integration-${p.id}`} className={`st-integration-card${isConnected ? ' is-connected' : ''}`}>
                <div className="st-integration-top">
                  <span className={`st-service-icon ${p.color}`}>
                    {localizeNode(renderProviderIcon(p, 25))}
                  </span>
                  <div className="st-integration-badges">
                    <span className="st-integration-time-pill">
                      <Clock3 size={11} />
                      {localizeNode(p.setupTime)}
                    </span>
                    <Badge
                      tone={
                        state.status === 'Connected'
                          ? 'green'
                          : state.status === 'Needs Attention'
                          ? 'orange'
                          : 'neutral'
                      }
                    >
                      {localizeNode(state.status)}
                    </Badge>
                  </div>
                </div>

                <h3>{localizeNode(p.name)}</h3>
                <p>{localizeNode(p.description)}</p>

                <div className="st-integration-capabilities">
                  {p.capabilities.map(cap => (
                    <span key={cap} className="st-capability-chip">
                      {localizeNode(cap)}
                    </span>
                  ))}
                </div>

                {localizeNode(
                  isConnected && state.account && (
                    <div className="st-integration-connected-account">
                      <CheckCircle2 size={14} />
                      <span className="truncate">{localizeNode(state.account)}</span>
                    </div>
                  ),
                )}

                {localizeNode(
                  state.status === 'Needs Attention' && (
                    <div className="st-integration-problem">
                      <AlertCircle size={15} />
                      <span>
                        {localizeNode(
                          state.problem || 'Your access needs to be renewed. Reconnect to resume syncing.',
                        )}
                      </span>
                    </div>
                  ),
                )}

                <div className="st-integration-bottom">
                  <small>
                    <i className={state.providerStatus === 'outage' ? 'outage' : isConnected ? 'online' : ''} />
                    {localizeNode(
                      state.providerStatus === 'outage'
                        ? 'Provider disruption'
                        : state.providerStatus === 'operational' || isConnected
                        ? 'Provider operational'
                        : 'Ready to connect',
                    )}
                  </small>
                  <div className="st-integration-actions">
                    <button
                      type="button"
                      className="st-guide-trigger"
                      onClick={() => openProviderGuide(p.id)}
                    >
                      <BookOpen size={13} />
                      {translateText('How to connect')}
                    </button>
                    {p.channel ? (
                      <button
                        type="button"
                        className={isConnected ? 'st-secondary' : 'st-primary'}
                        disabled={meta.busy !== null || meta.channels === null}
                        onClick={() => toggleChannel(p)}
                      >
                        {localizeNode(meta.busy === p.channel ? (isConnected ? 'Disconnecting…' : 'Opening Meta…') : isConnected ? 'Disconnect' : 'Connect')}
                      </button>
                    ) : (
                    <button
                      type="button"
                      className={state.status === 'Needs Attention' || !isConnected ? 'st-primary' : 'st-secondary'}
                      onClick={() => setSelected(p)}
                    >
                      {localizeNode(
                        state.status === 'Connected'
                          ? 'Manage'
                          : state.status === 'Needs Attention'
                          ? 'Fix connection'
                          : 'Connect',
                      )}
                      <ChevronRight size={14} />
                    </button>
                    )}
                  </div>
                </div>
                {p.channel && renderChannelExtras(p)}
              </Card>
            );
          }),
        )}
      </div>

      {localizeNode(
        !list.length && (
          <div className="st-empty">
            <Search size={30} />
            <h3>{translateText('No integrations found')}</h3>
            <p>{translateText('Try a different search or category.')}</p>
            <button
              type="button"
              className="st-secondary"
              onClick={() => {
                setSearch('');
                setCategory('All integrations');
              }}
            >
              {translateText('Clear filters')}
            </button>
          </div>
        ),
      )}

      {/* Professional Step-by-Step Connection Guideline Section */}
      <div ref={guideRef} className="st-guideline-section">
        <Card className="st-guideline-card">
          <div className="st-guideline-header">
            <div className="st-guideline-title-wrap">
              <span className="st-guideline-icon">
                <BookOpen size={20} />
              </span>
              <div>
                <div className="st-guideline-eyebrow">
                  <Sparkles size={12} />
                  <span>{translateText('STEP-BY-STEP CONNECTION GUIDE')}</span>
                </div>
                <h3>{translateText('How to Connect Your Channels Professionally')}</h3>
                <p>
                  {translateText(
                    'Select a channel below to view its required prerequisites, step-by-step setup instructions, and security permissions.',
                  )}
                </p>
              </div>
            </div>
            <Badge tone="purple">{translateText('Firebase Cloud Synced')}</Badge>
          </div>

          {/* Channel Selector Tabs inside Guideline */}
          <div className="st-guideline-tabs" role="tablist" aria-label={translateText('Channel connection guides')}>
            {providers.map(p => {
              const isSelected = p.id === activeGuide.id;
              const pState = stateOf(p).status === 'Connected';
              return (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  className={`st-guideline-tab${isSelected ? ' is-active' : ''}`}
                  onClick={() => setActiveGuideId(p.id)}
                >
                  <span className={`st-guideline-tab-icon ${p.color}`}>
                    {localizeNode(renderProviderIcon(p, 16))}
                  </span>
                  <span className="st-guideline-tab-name">{localizeNode(p.name)}</span>
                  {pState && <CheckCircle2 size={13} className="st-guideline-tab-check" />}
                </button>
              );
            })}
          </div>

          {/* Active Provider Guideline Content */}
          <div className="st-guideline-body">
            {/* Left column: Prerequisites & Scopes */}
            <div className="st-guideline-meta-col">
              <div className="st-guideline-box">
                <h4>
                  <CheckCircle2 size={15} />
                  <span>{translateText('Before You Begin (Prerequisites)')}</span>
                </h4>
                <ul className="st-guideline-checklist">
                  {activeGuide.prerequisites.map(item => (
                    <li key={item}>
                      <span className="st-check-bullet" aria-hidden="true">✓</span>
                      <span>{localizeNode(item)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="st-guideline-box">
                <h4>
                  <ShieldCheck size={15} />
                  <span>{translateText('Permissions & Data Sync')}</span>
                </h4>
                <ul className="st-guideline-Checklist-scopes">
                  {activeGuide.scopes.map(scope => (
                    <li key={scope}>
                      <ShieldCheck size={14} />
                      <span>{localizeNode(scope)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right column: 4-Step Visual Walkthrough */}
            <div className="st-guideline-steps-col">
              <div className="st-guideline-steps-grid">
                {activeGuide.guideSteps.map(gs => (
                  <div key={gs.step} className="st-guideline-step-card">
                    <div className="st-guideline-step-top">
                      <span className="st-guideline-step-num">{gs.step}</span>
                      <b>{localizeNode(gs.title)}</b>
                    </div>
                    <p>{localizeNode(gs.detail)}</p>
                  </div>
                ))}
              </div>

              <div className="st-guideline-pro-tip">
                <div className="st-guideline-pro-tip-content">
                  <Info size={16} />
                  <div>
                    <b>{translateText('Pro Tip for ')}{localizeNode(activeGuide.name)}</b>
                    <p>{localizeNode(activeGuide.proTip)}</p>
                  </div>
                </div>
                <div className="st-modal-actions">
                  {activeGuide.channel === 'whatsapp' && activeGuideState.status !== 'Connected' && (
                    <button type="button" className="st-secondary" onClick={openManualWhatsApp}>
                      {translateText('Connect manually')}
                    </button>
                  )}
                  <button
                    type="button"
                    className="st-primary"
                    disabled={!!activeGuide.channel && (meta.busy !== null || meta.channels === null)}
                    onClick={() => (activeGuide.channel ? toggleChannel(activeGuide) : setSelected(activeGuide))}
                  >
                    {localizeNode(
                      activeGuide.channel
                        ? activeGuideState.status === 'Connected'
                          ? `Disconnect ${activeGuide.name}`
                          : activeGuide.channel === 'whatsapp'
                          ? 'Connect with Meta'
                          : `Connect ${activeGuide.name}`
                        : activeGuideState.status === 'Connected'
                        ? `Manage ${activeGuide.name}`
                        : `Connect ${activeGuide.name}`,
                    )}
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="st-integration-note">
        <ShieldCheck size={18} />
        <p>
          {translateText(
            'You control what you connect. All integration states are securely synced with your Firebase workspace, and disconnecting a tool preserves your historical data.',
          )}
        </p>
        {localizeNode(
          (role === 'ADMIN' || role === 'SUPER_ADMIN') && (
            <button
              type="button"
              className="st-link"
              onClick={async () => {
                setLogs([]);
                setLogError('');
                try {
                  const result = await settingsRequest<{ entries: string[] }>('/integrations/logs');
                  setLogs(result.entries);
                } catch (e) {
                  setLogError(friendlyError(e));
                }
              }}
            >
              {translateText('Admin logs ')}
              <ArrowRight size={14} />
            </button>
          ),
        )}
      </div>

      {localizeNode(
        selected && (
          <ConnectionModal
            provider={selected}
            state={data.integrations[selected.connectionId]}
            returned={params.get('connection') === 'return'}
            close={close}
            refresh={refresh}
          />
        ),
      )}

      {localizeNode(
        logs && (
          <Modal title={translateText('Integration activity logs')} close={() => setLogs(null)}>
            {localizeNode(
              logError ? (
                <p className="st-error" role="alert">
                  {localizeNode(logError)}
                </p>
              ) : logs.length ? (
                <ul className="st-log-list">
                  {localizeNode(logs.map((l, i) => <li key={i}>{localizeNode(l)}</li>))}
                </ul>
              ) : (
                <p>{translateText('No activity has been recorded.')}</p>
              ),
            )}
          </Modal>
        ),
      )}
    </>
  );
}

function ConnectionModal({
  provider,
  state,
  returned,
  close,
  refresh,
}: {
  provider: Provider;
  state?: IntegrationState;
  returned: boolean;
  close: () => void;
  refresh: () => Promise<void>;
}) {
  useUILanguage();
  const userEmail = useSelector((s: RootState) => s.auth.user?.email ?? '');
  const [step, setStep] = useState(state?.status === 'Connected' || returned ? 1 : 0);
  const [connection, setConnection] = useState(state);
  const [accountInput, setAccountInput] = useState(state?.account ?? userEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tested, setTested] = useState(false);
  const [sync, setSync] = useState(state?.sync ?? true);
  const [disconnect, setDisconnect] = useState(false);

  const validate = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const result = await settingsRequest<IntegrationState>(`/integrations/${provider.connectionId}`);
      if (result.status !== 'Connected') {
        throw new Error(
          result.problem ||
            'Authorization is not complete. Return to the provider and approve the requested access.',
        );
      }
      setConnection(result);
      if (result.account) setAccountInput(result.account);
      setStep(1);
      await refresh();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }, [provider.connectionId, refresh]);

  useEffect(() => {
    if (returned) void validate();
  }, [returned, validate]);

  // Clicking Connect in local development completes a simulated authorization immediately.
  useEffect(() => {
    if (!localDemoEnabled || returned || state?.status === 'Connected') return;
    let cancelled = false;
    void settingsRequest<IntegrationState>(`/integrations/${provider.connectionId}/authorize`, {})
      .then(result => {
        if (!cancelled) {
          setConnection(result);
          if (result.account) setAccountInput(result.account);
          setStep(1);
        }
      })
      .catch(e => {
        if (!cancelled) setError(friendlyError(e));
      });
    return () => {
      cancelled = true;
    };
  }, [provider.connectionId, returned, state?.status]);

  async function authorize() {
    setBusy(true);
    setError('');
    try {
      const payload = {
        ...(accountInput.trim() ? { account: accountInput.trim() } : {}),
        returnUrl: `${window.location.origin}/dashboard/settings/integrations?provider=${provider.id}&connection=return`,
      };
      const result = await settingsRequest<IntegrationState & { authorizeUrl?: string }>(
        `/integrations/${provider.connectionId}/authorize`,
        payload,
      );
      if (result && typeof result.authorizeUrl === 'string' && result.authorizeUrl) {
        window.location.assign(safeExternalUrl(result.authorizeUrl));
        return;
      }
      setConnection(result);
      if (result?.account) setAccountInput(result.account);
      setStep(1);
      await refresh();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={translateText(`Connect ${provider.name}`)} close={close}>
      <ol className="st-steps">
        {localizeNode(
          ['Permissions', 'Validate connection', 'Preferences'].map((s, i) => (
            <li className={i <= step ? 'active' : ''} key={s}>
              <span>{localizeNode(i < step ? <CheckCircle2 size={14} /> : i + 1)}</span>
              {localizeNode(s)}
            </li>
          )),
        )}
      </ol>

      {localizeNode(
        step === 0 && (
          <>
            <div className="st-empty compact">
              <span className={`st-service-icon ${provider.color}`}>
                <provider.icon size={29} />
              </span>
              <h3>
                {translateText('Bring ')}
                {localizeNode(provider.name)}
                {translateText(' into your workspace')}
              </h3>
              <p>{localizeNode(provider.description)}</p>
            </div>

            <div className="st-modal-guide-box">
              <h4>
                <HelpCircle size={14} />
                <span>{translateText('Quick Connection Steps')}</span>
              </h4>
              <ol className="st-modal-guide-list">
                {provider.guideSteps.map(gs => (
                  <li key={gs.step}>
                    <b>{localizeNode(gs.title)}:</b> {localizeNode(gs.detail)}
                  </li>
                ))}
              </ol>
            </div>

            <Field label={provider.accountLabel}>
              <input
                value={accountInput}
                onChange={e => setAccountInput(e.target.value)}
                placeholder={translateText(provider.accountPlaceholder)}
              />
            </Field>

            <h3 style={{ marginTop: 16 }}>{translateText('Permissions you’ll review')}</h3>
            <ul className="st-scope-list">
              {localizeNode(
                provider.scopes.map(s => (
                  <li key={s}>
                    <ShieldCheck size={17} />
                    {localizeNode(s)}
                  </li>
                )),
              )}
            </ul>
            <p className="st-note">
              {translateText(
                'You’ll authorize access securely and sync your connection state with Firebase. You can disconnect at any time.',
              )}
            </p>
            <button
              type="button"
              className="st-primary st-full"
              disabled={busy}
              onClick={() => void authorize()}
            >
              <ExternalLink size={16} />
              {localizeNode(busy ? 'Connecting…' : 'Connect / Authorize')}
            </button>
          </>
        ),
      )}

      {localizeNode(
        step === 1 && (
          <>
            <div className="st-connection-account">
              <CheckCircle2 size={25} />
              <div>
                <b>
                  {localizeNode(
                    connection?.status === 'Connected' ? 'Connected account' : 'Validate your connection',
                  )}
                </b>
                <p>
                  {localizeNode(
                    connection?.account || 'We’ll verify your authorization with the provider.',
                  )}
                </p>
              </div>
              {localizeNode(
                connection?.status === 'Connected' && <Badge>{translateText('Connected')}</Badge>,
              )}
            </div>
            <p>{translateText('Test your connection before enabling automatic syncing.')}</p>
            {localizeNode(
              tested && (
                <p className="st-success" role="status">
                  <CheckCircle2 size={17} />
                  {translateText('Connection test passed.')}
                </p>
              ),
            )}
            <div className="st-modal-actions">
              <button
                type="button"
                className="st-secondary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setTested(false);
                  setError('');
                  try {
                    const result = await settingsRequest<{ ok: boolean; problem?: string }>(
                      `/integrations/${provider.connectionId}/test`,
                      {},
                    );
                    if (!result.ok) {
                      throw new Error(
                        result.problem ||
                          'The provider could not complete the test. Reauthorize access and try again.',
                      );
                    }
                    setTested(true);
                  } catch (e) {
                    setError(friendlyError(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Plug size={15} />
                {localizeNode(busy ? 'Testing…' : 'Test Connection')}
              </button>
              <button
                type="button"
                className="st-primary"
                disabled={connection?.status !== 'Connected' || busy}
                onClick={() => setStep(2)}
              >
                {translateText('Continue ')}
                <ArrowRight size={15} />
              </button>
            </div>
            <button type="button" className="st-link" disabled={busy} onClick={() => void validate()}>
              {translateText('Validate authorization again')}
            </button>
          </>
        ),
      )}

      {localizeNode(
        step === 2 && (
          <>
            <h3>{translateText('Connection preferences')}</h3>
            <div className="st-preference">
              <span>
                <b>{translateText('Automatic sync')}</b>
                <small>{translateText('Keep your connected account and Upclick up to date.')}</small>
              </span>
              <Toggle label="Automatic sync" checked={sync} onChange={setSync} />
            </div>
            <Field label={translateText("Connected account")}>
              <input
                value={accountInput || (connection?.account ?? '')}
                onChange={e => setAccountInput(e.target.value)}
                placeholder={translateText(provider.accountPlaceholder)}
              />
            </Field>
            <div className="st-modal-actions">
              <button
                type="button"
                className="st-danger"
                onClick={() => setDisconnect(true)}
                disabled={busy}
              >
                <Unplug size={15} />
                {translateText('Disconnect')}
              </button>
              <button
                type="button"
                className="st-primary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError('');
                  try {
                    const trimmedAccount = accountInput.trim() || connection?.account;
                    await settingsRequest(
                      `/integrations/${provider.connectionId}/settings`,
                      { sync, ...(trimmedAccount ? { account: trimmedAccount } : {}) },
                      'PATCH',
                    );
                    await refresh();
                    close();
                  } catch (e) {
                    setError(friendlyError(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {localizeNode(busy ? 'Saving…' : 'Save connection')}
              </button>
            </div>
          </>
        ),
      )}

      {localizeNode(
        disconnect && (
          <div className="st-disconnect-confirm">
            <p>
              {translateText('Disconnect ')}
              {localizeNode(provider.name)}
              {translateText('? Syncing will stop. Your historical records will be kept.')}
            </p>
            <div className="st-modal-actions">
              <button type="button" className="st-secondary" onClick={() => setDisconnect(false)}>
                {translateText('Keep connected')}
              </button>
              <button
                type="button"
                className="st-danger"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError('');
                  try {
                    await settingsRequest(`/integrations/${provider.connectionId}`, undefined, 'DELETE');
                    await refresh();
                    close();
                  } catch (e) {
                    setError(friendlyError(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {translateText('Confirm disconnect')}
              </button>
            </div>
          </div>
        ),
      )}

      {localizeNode(
        error && (
          <div className="st-error-box" role="alert">
            <AlertCircle size={18} />
            <div>
              <b>{translateText('Connection needs attention')}</b>
              <p>{localizeNode(error)}</p>
              <button
                type="button"
                className="st-link"
                disabled={busy}
                onClick={() => {
                  setError('');
                  setStep(0);
                }}
              >
                {translateText('Fix: review connection setup ')}
                <ArrowRight size={14} />
              </button>
              {localizeNode(
                provider.status && (
                  <a href={provider.status} target="_blank" rel="noreferrer">
                    {translateText('Check provider status ')}
                    <ExternalLink size={13} />
                  </a>
                ),
              )}
            </div>
          </div>
        ),
      )}

      {localizeNode(
        !settingsApiEnabled && (
          <p className="st-note">
            {translateText(
              'Provider connections will be available once your workspace administrator connects the integration service.',
            )}
          </p>
        ),
      )}
    </Modal>
  );
}
