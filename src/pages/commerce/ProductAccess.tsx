import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { auth, callBackend } from '../../backend/firebase';
import './product-workspace.css';
type AccessData = { name: string; files: { index: number; name: string; lessonId?: string }[] };
export function ProductAccess() {
  const [params] = useSearchParams();
  const tenantId = params.get('tenant'), token = params.get('token');
  const [data, setData] = useState<AccessData | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const lock = useRef(false);
  useEffect(() => { let active = true; setBusy(true); setError(''); void auth.authStateReady().then(() => callBackend<AccessData>('productAccess', { tenantId, token, action: 'inspect' })).then(value => { if (active) setData(value); }).catch(cause => { if (active) setError(cause.message); }).finally(() => { if (active) setBusy(false); }); return () => { active = false; }; }, [tenantId, token]);
  async function action(action: 'download' | 'complete', file: AccessData['files'][number]) {
    if (lock.current) return; lock.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const result = await callBackend<{ url?: string; message?: string }>('productAccess', { tenantId, token, action, index: file.index, lessonId: file.lessonId });
      if (result.url) window.location.assign(result.url); else setMessage(result.message || 'Updated.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'This action is unavailable.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <main className="cw-page"><section className="cw-card"><h1>{data?.name || 'Product access'}</h1>{error && <p className="cw-errors" role="alert">{error}</p>}{message && <p role="status">{message}</p>}{busy && <p role="status">Loading…</p>}{data?.files.map(file => <div className="cw-content-item" key={file.index}><b>{file.name}</b><button className="cw-button" disabled={busy} onClick={() => void action('download', file)}>Open / Download</button>{file.lessonId && <button className="cw-button" disabled={busy} onClick={() => void action('complete', file)}>Mark complete</button>}</div>)}{data && !data.files.length && <p>No files have been attached to this product.</p>}<a href="/auth/login" className="cw-text-link">Sign in with your customer email</a></section></main>;
}
