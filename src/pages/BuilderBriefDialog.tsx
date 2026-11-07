import { useRef, useState } from 'react';
import { LoaderCircle, Sparkles } from 'lucide-react';
import { backendError } from '../backend/firebase';
import { translateText } from '../i18n/display';
import { Modal } from './settings/kit';

export function BuilderBriefDialog({ title, placeholder, close, generate }: {
  title: string; placeholder: string; close: () => void; generate: (brief: string) => Promise<void>;
}) {
  const [brief, setBrief] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const dismiss = () => { if (!lock.current) close(); };

  return <Modal title={translateText(title)} close={dismiss}>
    <div className="aw-modal-body aw-ai-generator"><form onSubmit={async event => {
      event.preventDefault();
      if (!brief.trim() || lock.current) return;
      lock.current = true;
      setBusy(true);
      setError('');
      try { await generate(brief.trim()); close(); }
      catch (error) { setError(backendError(error)); }
      finally { lock.current = false; setBusy(false); }
    }}>
      <label>{translateText('Describe what you want to build')}
        <textarea className="w-full rounded-lg border px-3 py-2" rows={5} autoFocus required maxLength={4000} disabled={busy} placeholder={translateText(placeholder)} value={brief} onChange={event => setBrief(event.target.value)} />
      </label>
      {error && <p className="aw-error" role="alert">{error}</p>}
      <footer>
        <button type="button" className="aw-secondary" disabled={busy} onClick={dismiss}>{translateText('Cancel')}</button>
        <button type="submit" className="aw-primary" disabled={busy || !brief.trim()}>{busy ? <LoaderCircle size={15} className="animate-spin" /> : <Sparkles size={15} />}{translateText(busy ? 'Generating…' : 'Generate draft')}</button>
      </footer>
    </form></div>
  </Modal>;
}
