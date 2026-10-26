import { useCallback, useEffect, useState } from 'react';
import { Download, ShieldCheck, Smartphone, Zap } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Modal } from '../../pages/settings/kit';
import { translateText as t, useUILanguage } from '../../i18n/display';
import '../../pages/settings/settings.css';

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
declare global { interface Window { deferredPWAInstallPrompt?: InstallPrompt | null } }
const standalone = () => matchMedia('(display-mode: standalone)').matches || !!(navigator as Navigator & { standalone?: boolean }).standalone;

export function GetAppButton() {
  useUILanguage();
  const [installed, setInstalled] = useState(standalone);
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [prompt, setPrompt] = useState(window.deferredPWAInstallPrompt);
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    const media = matchMedia('(display-mode: standalone)');
    const update = () => setInstalled(standalone());
    const ready = () => setPrompt(window.deferredPWAInstallPrompt);
    const done = () => { window.deferredPWAInstallPrompt = null; setPrompt(null); setInstalled(true); setOpen(false); };
    window.addEventListener('pwa-prompt-ready', ready);
    window.addEventListener('appinstalled', done);
    media.addEventListener('change', update);
    return () => { window.removeEventListener('pwa-prompt-ready', ready); window.removeEventListener('appinstalled', done); media.removeEventListener('change', update); };
  }, []);
  if (installed) return null;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return <><button type="button" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200" title={t('Get App')} onClick={() => { setError(''); setOpen(true); }}><Download size={15}/><span className="hidden sm:inline">{t('Get App')}</span></button>{open && createPortal(<div className="st-workspace"><Modal title={t('Install Upclick')} close={close}><div className="flex items-center gap-3 py-4"><img src="/app-icon.svg" width="56" height="56" alt="Upclick"/><p>{t('Your workspace, one tap away.')}</p></div><div className="grid grid-cols-3 gap-3 py-4 text-center text-xs">{[[Zap, 'Fast access'], [Smartphone, 'Standalone app'], [ShieldCheck, 'Secure workspace']].map(([Icon, label]) => { const Glyph = Icon as typeof Zap; return <div key={String(label)}><Glyph className="mx-auto mb-2 text-violet-500" size={22}/>{t(String(label))}</div>; })}</div>{ios ? <ol className="list-decimal space-y-2 ps-5"><li>{t('Open this page in Safari.')}</li><li>{t('Tap Share in the browser toolbar.')}</li><li>{t('Choose Add to Home Screen, then tap Add.')}</li></ol> : !prompt ? <p>{t('Open your browser menu and choose Install app or Add to Home Screen. If unavailable, try Chrome or Edge over HTTPS.')}</p> : <p>{t('Install Upclick for quick access from your home screen or desktop.')}</p>}{error && <p className="st-error" role="alert">{error}</p>}<div className="st-modal-actions"><button className="st-secondary" onClick={close}>{t('Not now')}</button>{prompt && !ios && <button className="st-primary" disabled={busy} onClick={async () => { setBusy(true); try { await prompt.prompt(); await prompt.userChoice; window.deferredPWAInstallPrompt = null; setPrompt(null); close(); } catch { setError(t('Installation could not start. Try the browser menu.')); } finally { setBusy(false); } }}>{t(busy ? 'Opening…' : 'Install Now')}</button>}</div></Modal></div>, document.body)}</>;
}
