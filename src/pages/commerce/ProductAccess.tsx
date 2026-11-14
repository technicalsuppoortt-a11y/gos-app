import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Download, FileText, PackageCheck } from 'lucide-react';
import { auth, callBackend } from '../../backend/firebase';
import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { translateText, useUILanguage } from '../../i18n/display';
import './customer-portal.css';
import './product-workspace.css';

type AccessData = { name: string; files: { index: number; name: string; lessonId?: string }[] };

export function ProductAccess() {
  useUILanguage();
  const [params] = useSearchParams();
  const tenantId = params.get('tenant');
  const token = params.get('token');
  const [data, setData] = useState<AccessData | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const lock = useRef(false);

  useEffect(() => {
    let active = true;
    setBusy(true);
    setError('');
    void auth
      .authStateReady()
      .then(() => callBackend<AccessData>('productAccess', { tenantId, token, action: 'inspect' }))
      .then(value => {
        if (active) setData(value);
      })
      .catch(cause => {
        if (active) setError(cause.message || 'Could not load product access.');
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [tenantId, token]);

  async function action(kind: 'download' | 'complete', file: AccessData['files'][number]) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await callBackend<{ url?: string; message?: string }>('productAccess', {
        tenantId,
        token,
        action: kind,
        index: file.index,
        lessonId: file.lessonId,
      });
      if (result.url) window.location.assign(result.url);
      else setMessage(result.message || 'Updated.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'This action is unavailable.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="cportal-shell">
      <header className="cportal-topbar">
        <div className="cportal-brand-group">
          <div className="cportal-brand">
            <span className="cportal-brand-mark">
              <img src="/upclick-mark.svg" width="22" height="22" alt="" />
            </span>
            <span className="cportal-brand-copy">
              <b>{translateText('Customer Portal')}</b>
              <small>{translateText('Product access')}</small>
            </span>
          </div>
        </div>
        <div className="cportal-actions">
          <LanguageSwitcher />
          <ThemeToggle />
          <a href="/auth/login?portal=1" className="cportal-back-pill">
            <span>{translateText('Sign in with your customer email')}</span>
          </a>
        </div>
      </header>

      <main className="cportal-main">
        <section className="cportal-panel-card" style={{ padding: 'clamp(18px, 3vw, 28px)', maxWidth: 820, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <PackageCheck size={22} className="text-violet-600" />
            <h1 style={{ margin: 0, fontSize: 'clamp(18px, 2.5vw, 24px)', fontWeight: 800 }}>
              {data?.name || translateText('Product access')}
            </h1>
          </div>

          {error && (
            <p className="cw-errors" role="alert" style={{ marginBottom: 12 }}>
              {translateText(error)}
            </p>
          )}
          {message && (
            <p role="status" style={{ marginBottom: 12, color: 'var(--cp-emerald)', fontWeight: 600 }}>
              {translateText(message)}
            </p>
          )}
          {busy && (
            <p role="status" style={{ color: 'var(--cp-muted)' }}>
              {translateText('Loading…')}
            </p>
          )}

          {data && data.files.length > 0 && (
            <div className="cportal-vault-list" style={{ padding: '8px 0 0' }}>
              {data.files.map(file => (
                <div className="cportal-asset-row" key={file.index}>
                  <div className="cportal-asset-info">
                    <span className="cportal-asset-icon">
                      <FileText size={18} />
                    </span>
                    <b>{file.name}</b>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="cportal-btn-primary"
                      disabled={busy}
                      onClick={() => void action('download', file)}
                    >
                      <Download size={14} />
                      <span>{translateText('Open / Download')}</span>
                    </button>
                    {file.lessonId && (
                      <button
                        type="button"
                        className="cportal-btn-secondary"
                        disabled={busy}
                        onClick={() => void action('complete', file)}
                      >
                        <CheckCircle2 size={14} />
                        <span>{translateText('Mark complete')}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {data && !data.files.length && (
            <p style={{ color: 'var(--cp-muted)' }}>
              {translateText('No files have been attached to this product.')}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
