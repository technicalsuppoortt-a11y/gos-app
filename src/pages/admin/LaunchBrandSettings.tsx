import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { primaryAuth } from '../../backend/firebase';
import { useUILanguage } from '../../i18n/display';
import type { RootState } from '../../store';
import './launch-brand-settings.css';

export function LaunchBrandSettings() {
  const ar = useUILanguage().startsWith('ar');
  const theme = useSelector((state: RootState) => state.ui.theme);
  const [params, setParams] = useSearchParams();
  const page = params.get('tab') === 'business-discovery' ? 'business-discovery' : 'ai-center';
  const frame = useRef<HTMLIFrameElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setError('');
    const receive = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow || event.data?.type !== 'launch-brand-admin-ready') return;
      try {
        const token = await primaryAuth.currentUser?.getIdToken();
        if (!token) throw new Error(ar ? 'سجّل الدخول إلى GOS مرة أخرى.' : 'Sign in to GOS again.');
        if (active) frame.current?.contentWindow?.postMessage({ type: 'launch-brand-admin-session', token, language: ar ? 'ar' : 'en', theme }, window.location.origin);
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : 'Could not open settings.'); }
    };
    window.addEventListener('message', receive);
    frame.current?.contentWindow?.postMessage({ type: 'launch-brand-admin-connect' }, window.location.origin);
    return () => { active = false; window.removeEventListener('message', receive); };
  }, [ar, theme, attempt]);
  return <section className="launch-brand-settings">
    <h1>Launch Brand Settings</h1>
    <nav className="adm-group-nav" aria-label="Launch Brand Settings">
      <button type="button" aria-pressed={page === 'ai-center'} className={page === 'ai-center' ? 'active' : ''} onClick={() => setParams({ tab: 'ai-center' })}>{ar ? 'مركز الذكاء الاصطناعي' : 'AI Center'}</button>
      <button type="button" aria-pressed={page === 'business-discovery'} className={page === 'business-discovery' ? 'active' : ''} onClick={() => setParams({ tab: 'business-discovery' })}>{ar ? 'اكتشاف البيزنس' : 'Business Discovery'}</button>
    </nav>
    {error && <p role="alert">{error}</p>}
    <button className="lb-settings-retry" type="button" onClick={() => setAttempt(value => value + 1)}>{ar ? 'إعادة تحميل الإعدادات' : 'Reload settings'}</button>
    <iframe ref={frame} key={attempt} src={`/launch-brand/admin-settings?tab=${page}`} title={ar ? 'إعدادات لانش برند' : 'Launch Brand settings'} />
  </section>;
}
