import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  MessageCircle,
  PhoneCall,
  RefreshCw,
  RotateCcw,
  Save,
  Server,
  ShieldAlert,
  ShieldCheck,
  Webhook,
  X,
} from 'lucide-react';
import { gosRequest } from '../../backend/gosApi';
import { translateText as t, useUILanguage } from '../../i18n/display';
import { showToast } from '../../utils/toast';
import './admin-workspace.css';

const CHANNELS = [
  {
    id: 'messenger',
    title: 'Messenger',
    subtitle: 'Facebook Page messaging & handover protocol',
    config: 'Facebook Login for Business config ID',
    icon: MessageCircle,
    tone: 'is-messenger',
  },
  {
    id: 'instagram',
    title: 'Instagram',
    subtitle: 'Instagram Business Direct Messages & story replies',
    config: 'Facebook Login for Business config ID',
    icon: Camera,
    tone: 'is-instagram',
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp',
    subtitle: 'WhatsApp Cloud API & Embedded Signup numbers',
    config: 'Embedded Signup config ID',
    icon: PhoneCall,
    tone: 'is-whatsapp',
  },
] as const;

type ChannelId = (typeof CHANNELS)[number]['id'];
type Settings = {
  apps: Record<ChannelId, { app_id: string | null; config_id: string | null; has_secret: boolean }>;
  public_url: string | null;
  allowed_origins: string[];
  unreadable_secrets: ChannelId[];
  verify_token: string | null;
  webhook_url: string;
  redirect_uri: string;
};

const META_APP_CACHE_KEY = 'gos.platform.metaApp.cache.v1';
let memoryMetaSettings: Settings | null = null;

function readCachedMetaSettings(): Settings | null {
  if (memoryMetaSettings) return memoryMetaSettings;
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(META_APP_CACHE_KEY) : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Settings;
    if (parsed && typeof parsed === 'object' && parsed.apps) {
      memoryMetaSettings = parsed;
      return parsed;
    }
  } catch {
    /* ignore storage parse errors */
  }
  return null;
}

function writeCachedMetaSettings(next: Settings) {
  memoryMetaSettings = next;
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(META_APP_CACHE_KEY, JSON.stringify(next));
    }
  } catch {
    /* ignore quota errors */
  }
}

function buildFormState(s: Settings): Record<string, string> {
  const next: Record<string, string> = {
    public_url: s.public_url ?? '',
    allowed_origins: (s.allowed_origins ?? []).join('\n'),
  };
  for (const { id } of CHANNELS) {
    next[`${id}_app_id`] = s.apps[id]?.app_id ?? '';
    next[`${id}_app_secret`] = '';
    next[`${id}_config_id`] = s.apps[id]?.config_id ?? '';
  }
  return next;
}

function MetaAppLoadingShell({ step }: { step: number }) {
  const steps = [
    t('Authenticating platform gateway'),
    t('Loading Messenger, Instagram & WhatsApp apps'),
    t('Verifying webhook & OAuth redirect endpoints'),
  ];

  return (
    <div className="saw-loading-shell" role="status" aria-live="polite" aria-label={t('Loading Meta Apps configuration…')}>
      <div className="saw-meta-loader-card">
        <div className="saw-meta-loader-top">
          <div className="saw-meta-loader-main">
            <div className="saw-loading-spinner" aria-hidden="true" />
            <div>
              <strong>{t('Syncing Meta Graph & Channel App Credentials…')}</strong>
              <span>{t('Retrieving encrypted app secrets, OAuth configurations, and webhook endpoints.')}</span>
            </div>
          </div>
          <span className="saw-loading-pill">{t('Cloud Handshake')}</span>
        </div>
        <div className="saw-meta-loader-steps" aria-hidden="true">
          {steps.map((label, idx) => {
            const stateClass = idx < step ? 'is-done' : idx === step ? 'is-active' : '';
            return (
              <div key={label} className={`saw-meta-loader-step ${stateClass}`}>
                {idx < step ? <CheckCircle2 size={14} /> : <RefreshCw size={13} className={idx === step ? 'animate-spin' : ''} />}
                <span>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="saw-stats" aria-hidden="true">
        {[0, 1, 2, 3].map(idx => (
          <div className="saw-stat saw-skeleton-card" key={idx}>
            <div className="saw-sk-line saw-sk-sm" />
            <div className="saw-sk-line saw-sk-lg" />
            <div className="saw-sk-line saw-sk-xs" />
          </div>
        ))}
      </div>

      <div className="saw-panel" aria-hidden="true" style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="saw-sk-avatar" />
          <div style={{ display: 'grid', gap: 6, flex: 1 }}>
            <div className="saw-sk-line saw-sk-md" />
            <div className="saw-sk-line saw-sk-sm" />
          </div>
        </div>
        <div className="saw-meta-grid-2">
          <div className="saw-sk-line" style={{ height: 42 }} />
          <div className="saw-sk-line" style={{ height: 92 }} />
        </div>
      </div>

      <div className="saw-meta-channels-grid" aria-hidden="true">
        {[0, 1, 2].map(idx => (
          <div className="saw-panel" key={idx} style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="saw-sk-avatar" />
                <div className="saw-sk-line" style={{ width: 110, height: 14 }} />
              </div>
              <div className="saw-sk-line saw-sk-pill" />
            </div>
            <div className="saw-sk-line" style={{ height: 40 }} />
            <div className="saw-sk-line" style={{ height: 40 }} />
            <div className="saw-sk-line" style={{ height: 40 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** One Meta app per channel, since Meta ties each use case to its own app. Only the super admin sees this page. */
export function MetaAppSettings() {
  useUILanguage();
  const initialCached = useMemo(() => readCachedMetaSettings(), []);
  const [settings, setSettings] = useState<Settings | null>(initialCached);
  const [form, setForm] = useState<Record<string, string>>(() => (initialCached ? buildFormState(initialCached) : {}));
  const [baseline, setBaseline] = useState<Record<string, string>>(() => (initialCached ? buildFormState(initialCached) : {}));
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(!initialCached);
  const [refreshing, setRefreshing] = useState<boolean>(Boolean(initialCached));
  const [loadingStep, setLoadingStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const apply = useCallback((s: Settings) => {
    writeCachedMetaSettings(s);
    setSettings(s);
    const next = buildFormState(s);
    setForm(next);
    setBaseline(next);
  }, []);

  const loadSettings = useCallback(
    async (showFullLoader = false) => {
      if (showFullLoader || !settings) {
        setLoading(true);
        setLoadingStep(0);
      } else {
        setRefreshing(true);
      }
      setStatus(null);
      try {
        const response = await gosRequest<{ settings: Settings }>('/platform/meta-app', { method: 'GET' });
        apply(response.settings);
      } catch (e) {
        setStatus({ ok: false, text: (e as Error).message });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [apply, settings]
  );

  useEffect(() => {
    let active = true;
    gosRequest<{ settings: Settings }>('/platform/meta-app', { method: 'GET' })
      .then(response => {
        if (active) apply(response.settings);
      })
      .catch(e => {
        if (active) setStatus({ ok: false, text: (e as Error).message });
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      });
    return () => {
      active = false;
    };
  }, [apply]);

  useEffect(() => {
    if (!loading) return;
    const t1 = window.setTimeout(() => setLoadingStep(1), 260);
    const t2 = window.setTimeout(() => setLoadingStep(2), 560);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [loading]);

  const isDirty = useMemo(() => {
    const keys = new Set([...Object.keys(baseline), ...Object.keys(form)]);
    for (const key of keys) {
      if ((form[key] ?? '') !== (baseline[key] ?? '')) return true;
    }
    return false;
  }, [baseline, form]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const r = await gosRequest<{ settings: Settings }>('/platform/meta-app', {
        method: 'PUT',
        body: {
          ...form,
          allowed_origins: (form.allowed_origins ?? '').split(/\s+/).filter(Boolean),
        },
      });
      apply(r.settings);
      setStatus({ ok: true, text: 'Saved.' });
      showToast.success(t('Meta Apps configuration saved successfully.'));
    } catch (err) {
      setStatus({ ok: false, text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const discardChanges = () => {
    setForm(baseline);
    setStatus(null);
  };

  const handleCopy = (key: string, label: string, value: string | null) => {
    if (!value) return;
    void navigator.clipboard?.writeText(value);
    setCopiedKey(key);
    showToast.success(`${t(label)} ${t('copied to clipboard')}`);
    window.setTimeout(() => {
      setCopiedKey(current => (current === key ? null : current));
    }, 1800);
  };

  const configuredChannelsCount = settings
    ? CHANNELS.filter(({ id }) => Boolean(settings.apps[id]?.app_id && settings.apps[id]?.has_secret)).length
    : 0;
  const storedSecretsCount = settings
    ? CHANNELS.filter(({ id }) => Boolean(settings.apps[id]?.has_secret)).length
    : 0;
  const domainList = useMemo(
    () => (form.allowed_origins ?? '').split(/\s+/).map(item => item.trim()).filter(Boolean),
    [form.allowed_origins]
  );
  const webhookReady = Boolean(settings?.webhook_url && settings?.verify_token);

  const renderTextInput = (key: string, label: string, placeholder?: string) => (
    <label className="saw-meta-field">
      <span className="saw-meta-field-label">{t(label)}</span>
      <input
        inputMode="numeric"
        placeholder={placeholder}
        value={form[key] ?? ''}
        onChange={e => setForm({ ...form, [key]: e.target.value })}
      />
    </label>
  );

  const renderCopyEndpoint = (key: string, label: string, value: string | null, description: string) => {
    const isCopied = copiedKey === key;
    return (
      <div className="saw-meta-copy-card" key={key}>
        <div className="saw-meta-field-label">
          <span>{t(label)}</span>
          <span className={`saw-badge ${value ? 'saw-connected' : ''}`}>
            {t(value ? 'Ready' : 'Pending save')}
          </span>
        </div>
        <span className="saw-meta-field-hint">{t(description)}</span>
        <div className="saw-meta-copy-row">
          <input
            readOnly
            aria-label={label}
            value={value ?? 'Generated when you save'}
          />
          <button
            type="button"
            className={`saw-meta-copy-btn${isCopied ? ' is-copied' : ''}`}
            disabled={!value}
            onClick={() => handleCopy(key, label, value)}
          >
            {isCopied ? <Check size={14} /> : <Copy size={14} />}
            <span>{t(isCopied ? 'Copied' : 'Copy')}</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <main className="saw-workspace">
      <header className="saw-heading">
        <div>
          <div className="saw-eyebrow-row">
            <span className="saw-eyebrow">{t('UPCLICK / PLATFORM CONTROL')}</span>
            {(loading || refreshing) ? (
              <div className="saw-live-sync-chip" role="status" aria-live="polite">
                <span className="saw-live-sync-dot" aria-hidden="true" />
                <span className="saw-live-sync-text">{t('Syncing with cloud…')}</span>
              </div>
            ) : settings ? (
              <div className="saw-live-sync-chip is-fading" role="status" aria-live="polite" style={{ animation: 'none', opacity: 0.9 }}>
                <span className="saw-live-sync-dot" aria-hidden="true" />
                <span className="saw-live-sync-text">{t('Live Synced')}</span>
              </div>
            ) : null}
          </div>
          <h1>{t('Meta Apps')}</h1>
          <p>{t('Clients connect each channel through its own app. Leave a channel blank to keep using the shared server values.')}</p>
        </div>
        <div className="saw-actions">
          <button
            type="button"
            disabled={loading || refreshing || saving}
            onClick={() => void loadSettings(false)}
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            <span>{t(refreshing ? 'Refreshing…' : 'Refresh')}</span>
          </button>
          {settings && (
            <button
              type="submit"
              form="meta-apps-settings-form"
              className="saw-primary"
              disabled={saving}
            >
              {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
              <span>{t(saving ? 'Saving…' : 'Save changes')}</span>
            </button>
          )}
        </div>
      </header>

      {status && (
        <div
          className={status.ok ? 'saw-notice' : 'saw-warning'}
          role={status.ok ? 'status' : 'alert'}
        >
          {status.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{t(status.text)}</span>
          {!status.ok && !settings && (
            <button type="button" onClick={() => void loadSettings(true)} style={{ marginInlineStart: 'auto' }}>
              <RefreshCw size={13} />
              <span>{t('Try again')}</span>
            </button>
          )}
          {status.ok && (
            <button
              type="button"
              aria-label={t('Dismiss notification')}
              onClick={() => setStatus(null)}
            >
              <X size={15} />
            </button>
          )}
        </div>
      )}

      {settings && settings.unreadable_secrets.length > 0 && (
        <div className="saw-warning" role="alert">
          <ShieldAlert size={18} style={{ flexShrink: 0 }} />
          <span>
            The saved App Secret for {settings.unreadable_secrets.join(', ')} can't be read, so those channels won't work. The server's APP_KEY probably changed. Enter the secret again and save, then reconnect the channels.
          </span>
        </div>
      )}

      {loading && !settings && <MetaAppLoadingShell step={loadingStep} />}

      {settings && (
        <>
          <div className="saw-stats">
            <article className="saw-stat">
              <span>{t('Configured channels')}</span>
              <strong>{configuredChannelsCount} / {CHANNELS.length}</strong>
              <small>{t('Channels using dedicated Meta App credentials')}</small>
            </article>
            <article className="saw-stat">
              <span>{t('Stored app secrets')}</span>
              <strong>{storedSecretsCount} / {CHANNELS.length}</strong>
              <small>{t('Encrypted client secrets active on server')}</small>
            </article>
            <article className="saw-stat">
              <span>{t('Allowed origins')}</span>
              <strong>{domainList.length}</strong>
              <small>{t('Whitelisted client OAuth & CORS domains')}</small>
            </article>
            <article className="saw-stat">
              <span>{t('Webhook & OAuth status')}</span>
              <strong>{t(webhookReady ? 'Ready' : 'Pending')}</strong>
              <small>{t('Callback URL & verification token state')}</small>
            </article>
          </div>

          <form id="meta-apps-settings-form" onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <section className="saw-panel saw-meta-panel">
              <div className="saw-meta-panel-head">
                <div className="saw-meta-title-group">
                  <span className="saw-meta-icon">
                    <Server size={19} />
                  </span>
                  <div className="saw-meta-title-copy">
                    <h2>{t('Server and domains')}</h2>
                    <p>{t('Configure the public API origin used for Meta webhook callbacks and authorized client domains.')}</p>
                  </div>
                </div>
                <span className={`saw-badge ${form.public_url?.trim() ? 'saw-connected' : ''}`}>
                  {t(form.public_url?.trim() ? 'Custom Host' : 'Default Host')}
                </span>
              </div>

              <div className="saw-meta-grid-2">
                <label className="saw-meta-field">
                  <span className="saw-meta-field-label">
                    <span>{t('Public API URL')}</span>
                    <span className="saw-meta-field-hint">HTTPS</span>
                  </span>
                  <div className="saw-meta-input-wrap">
                    <input
                      type="url"
                      placeholder="https://api.example.com"
                      value={form.public_url ?? ''}
                      onChange={e => setForm({ ...form, public_url: e.target.value })}
                    />
                  </div>
                  <span className="saw-meta-field-hint">
                    {t('Base URL where Meta delivers webhook events and completes OAuth handshakes.')}
                  </span>
                </label>

                <label className="saw-meta-field">
                  <span className="saw-meta-field-label">
                    <span>{t('App domains, one per line')}</span>
                    <span className="saw-meta-field-hint">
                      {domainList.length} {t(domainList.length === 1 ? 'domain' : 'domains')}
                    </span>
                  </span>
                  <textarea
                    rows={4}
                    placeholder="https://app.client-domain.com"
                    value={form.allowed_origins ?? ''}
                    onChange={e => setForm({ ...form, allowed_origins: e.target.value })}
                  />
                  <span className="saw-meta-field-hint">
                    {t('Include every client workspace domain allowed to initiate Meta Login or Embedded Signup.')}
                  </span>
                </label>
              </div>
            </section>

            <div className="saw-meta-channels-grid">
              {CHANNELS.map(({ id, title, subtitle, config, icon: ChannelIcon, tone }) => {
                const channelState = settings.apps[id];
                const hasAppId = Boolean((form[`${id}_app_id`] ?? '').trim());
                const hasSecret = Boolean(channelState?.has_secret || (form[`${id}_app_secret`] ?? '').trim());
                const hasConfig = Boolean((form[`${id}_config_id`] ?? '').trim());
                const isUnreadable = settings.unreadable_secrets.includes(id);
                const statusBadge = isUnreadable
                  ? { label: 'Secret unreadable', cls: 'saw-error' }
                  : hasAppId && hasSecret
                  ? { label: 'Configured', cls: 'saw-connected' }
                  : hasAppId || hasSecret || hasConfig
                  ? { label: 'Partial setup', cls: 'saw-pending' }
                  : { label: 'Server default', cls: '' };
                const showSecret = Boolean(revealedSecrets[id]);

                return (
                  <section key={id} className="saw-panel saw-meta-panel">
                    <div className="saw-meta-panel-head">
                      <div className="saw-meta-title-group">
                        <span className={`saw-meta-icon ${tone}`}>
                          <ChannelIcon size={19} />
                        </span>
                        <div className="saw-meta-title-copy">
                          <h2>{t(title)}</h2>
                          <p>{t(subtitle)}</p>
                        </div>
                      </div>
                      <span className={`saw-badge ${statusBadge.cls}`}>
                        {t(statusBadge.label)}
                      </span>
                    </div>

                    {renderTextInput(`${id}_app_id`, 'App ID', 'e.g. 104928374651920')}

                    <label className="saw-meta-field">
                      <span className="saw-meta-field-label">
                        <span>{t('App Secret')}</span>
                        {channelState?.has_secret && !isUnreadable && (
                          <span className="saw-meta-secret-pill">
                            <ShieldCheck size={12} />
                            <span>{t('Encrypted')}</span>
                          </span>
                        )}
                      </span>
                      <div className="saw-meta-input-wrap has-trailing">
                        <input
                          type={showSecret ? 'text' : 'password'}
                          autoComplete="off"
                          placeholder={channelState?.has_secret ? 'Saved. Leave blank to keep it.' : '••••••••••••••••••••••••'}
                          value={form[`${id}_app_secret`] ?? ''}
                          onChange={e => setForm({ ...form, [`${id}_app_secret`]: e.target.value })}
                        />
                        <button
                          type="button"
                          className="saw-meta-eye-btn"
                          aria-label={t(showSecret ? 'Hide App Secret' : 'Show App Secret')}
                          onClick={() => setRevealedSecrets(prev => ({ ...prev, [id]: !prev[id] }))}
                        >
                          {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </label>

                    {renderTextInput(`${id}_config_id`, config, 'e.g. 883920174628190')}
                  </section>
                );
              })}
            </div>

            <div className="saw-meta-footer-bar">
              <div className="saw-meta-footer-status">
                <span className={isDirty ? 'saw-meta-unsaved-dot' : 'saw-meta-synced-dot'} aria-hidden="true" />
                <span>
                  {t(
                    isDirty
                      ? 'You have unsaved changes in your Meta Apps configuration.'
                      : 'All Meta channel credentials are synchronized with the platform server.'
                  )}
                </span>
              </div>
              <div className="saw-actions">
                {isDirty && (
                  <button type="button" disabled={saving} onClick={discardChanges}>
                    <RotateCcw size={14} />
                    <span>{t('Discard changes')}</span>
                  </button>
                )}
                <button type="submit" className="saw-primary" disabled={saving}>
                  {saving ? <RefreshCw size={15} className="animate-spin" /> : <KeyRound size={15} />}
                  <span>{saving ? 'Saving…' : 'Save'}</span>
                </button>
              </div>
            </div>
          </form>

          <section className="saw-panel saw-meta-panel">
            <div className="saw-meta-panel-head">
              <div className="saw-meta-title-group">
                <span className="saw-meta-icon is-webhook">
                  <Webhook size={19} />
                </span>
                <div className="saw-meta-title-copy">
                  <h2>{t('Add these in each Meta app')}</h2>
                  <p>{t('Copy these generated URLs and verification credentials into your Meta Developer Console under Webhooks and Facebook Login settings.')}</p>
                </div>
              </div>
              <span className="saw-badge saw-info">
                <Link2 size={11} />
                <span>{t('Meta Developer Console')}</span>
              </span>
            </div>

            <div className="saw-meta-copy-grid">
              {renderCopyEndpoint(
                'webhook_url',
                'Webhook callback URL',
                settings.webhook_url,
                'Paste into Meta App → Webhooks → Callback URL for Page, Instagram & WhatsApp.'
              )}
              {renderCopyEndpoint(
                'verify_token',
                'Webhook verify token',
                settings.verify_token,
                'Paste into Meta App → Webhooks → Verify Token when subscribing webhook fields.'
              )}
              {renderCopyEndpoint(
                'redirect_uri',
                'Valid OAuth Redirect URI',
                settings.redirect_uri,
                'Paste into Facebook Login for Business → Settings → Valid OAuth Redirect URIs.'
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
