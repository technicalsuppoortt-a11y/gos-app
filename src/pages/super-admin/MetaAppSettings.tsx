import { useEffect, useState } from 'react';
import { gosRequest } from '../../backend/gosApi';
import './admin-workspace.css';

const CHANNELS = [
  { id: 'messenger', title: 'Messenger', config: 'Facebook Login for Business config ID' },
  { id: 'instagram', title: 'Instagram', config: 'Facebook Login for Business config ID' },
  { id: 'whatsapp', title: 'WhatsApp', config: 'Embedded Signup config ID' },
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

const field: React.CSSProperties = { display: 'grid', gap: 6, marginBottom: 14 };
const input: React.CSSProperties = { padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border, #d0d5dd)', background: 'transparent', color: 'inherit', font: 'inherit' };

/** One Meta app per channel, since Meta ties each use case to its own app. Only the super admin sees this page. */
export function MetaAppSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const apply = (s: Settings) => {
    setSettings(s);
    const next: Record<string, string> = { public_url: s.public_url ?? '', allowed_origins: s.allowed_origins.join('\n') };
    for (const { id } of CHANNELS) {
      next[`${id}_app_id`] = s.apps[id].app_id ?? '';
      next[`${id}_app_secret`] = '';
      next[`${id}_config_id`] = s.apps[id].config_id ?? '';
    }
    setForm(next);
  };

  useEffect(() => {
    gosRequest<{ settings: Settings }>('/platform/meta-app', { method: 'GET' })
      .then(r => apply(r.settings))
      .catch(e => setStatus({ ok: false, text: (e as Error).message }));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const r = await gosRequest<{ settings: Settings }>('/platform/meta-app', { method: 'PUT', body: { ...form, allowed_origins: form.allowed_origins.split(/\s+/).filter(Boolean) } });
      apply(r.settings);
      setStatus({ ok: true, text: 'Saved.' });
    } catch (err) {
      setStatus({ ok: false, text: (err as Error).message });
    }
    setSaving(false);
  };

  const text = (key: string, label: string) => (
    <label style={field}>
      <span>{label}</span>
      <input style={input} inputMode="numeric" autoComplete="off" value={form[key] ?? ''} onChange={e => setForm({ ...form, [key]: e.target.value })} />
    </label>
  );
  const copy = (label: string, value: string | null) => (
    <div style={field}>
      <span>{label}</span>
      <div style={{ display: 'flex', gap: 8 }}>
        <input style={{ ...input, flex: 1, minWidth: 0 }} readOnly aria-label={label} value={value ?? 'Generated when you save'} />
        <button type="button" disabled={!value} onClick={() => value && navigator.clipboard.writeText(value)}>Copy</button>
      </div>
    </div>
  );

  return (
    <main className="saw-workspace" style={{ padding: 24, maxWidth: 1080 }}>
      <h1>Meta Apps</h1>
      <p>Clients connect each channel through its own app. Leave a channel blank to keep using the shared server values.</p>
      {status && <p role={status.ok ? 'status' : 'alert'} style={{ color: status.ok ? 'inherit' : '#d92d20' }}>{status.text}</p>}
      {settings && settings.unreadable_secrets.length > 0 && (
        <p role="alert" style={{ color: '#d92d20' }}>
          The saved App Secret for {settings.unreadable_secrets.join(', ')} can't be read, so those channels won't work. The server's APP_KEY probably changed. Enter the secret again and save, then reconnect the channels.
        </p>
      )}
      {settings && (
        <>
          <form onSubmit={save} style={{ marginBottom: 20 }}>
            <section className="saw-panel" style={{ marginBottom: 16 }}>
              <h2>Server and domains</h2>
              <label style={field}>
                <span>Public API URL</span>
                <input style={input} type="url" placeholder="https://api.example.com" value={form.public_url ?? ''} onChange={e => setForm({ ...form, public_url: e.target.value })} />
              </label>
              <label style={field}>
                <span>App domains, one per line</span>
                <textarea style={input} rows={4} placeholder="https://app.client-domain.com" value={form.allowed_origins ?? ''} onChange={e => setForm({ ...form, allowed_origins: e.target.value })} />
              </label>
            </section>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
              {CHANNELS.map(({ id, title, config }) => (
                <section key={id} className="saw-panel">
                  <h2>{title}</h2>
                  {text(`${id}_app_id`, 'App ID')}
                  <label style={field}>
                    <span>App Secret</span>
                    <input
                      style={input}
                      type="password"
                      // "new-password" stops Chrome filling the saved login password here.
                      autoComplete="new-password"
                      placeholder={settings.apps[id].has_secret ? 'Saved. Leave blank to keep it.' : ''}
                      value={form[`${id}_app_secret`] ?? ''}
                      onChange={e => setForm({ ...form, [`${id}_app_secret`]: e.target.value })}
                    />
                  </label>
                  {text(`${id}_config_id`, config)}
                </section>
              ))}
            </div>
            <button type="submit" className="saw-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </form>
          <section className="saw-panel">
            <h2>Add these in each Meta app</h2>
            {copy('Webhook callback URL', settings.webhook_url)}
            {copy('Webhook verify token', settings.verify_token)}
            {copy('Valid OAuth Redirect URI', settings.redirect_uri)}
          </section>
        </>
      )}
    </main>
  );
}
