import { useEffect, useState } from 'react';
import { doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, backendError, db } from '../../backend/firebase';
import { useUILanguage } from '../../i18n/display';

const defaults = { name: 'Upclick', supportEmail: '', logoUrl: '/upclick-logo.svg', primaryColor: '#7C3AED', timezone: 'Africa/Cairo', smtpHost: '', smtpPort: 587, senderEmail: '', smtpSecretReference: '' };
export function AdminGeneral() {
  const ar = useUILanguage().startsWith('ar');
  const [draft, setDraft] = useState(defaults), [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(false);
  useEffect(() => onSnapshot(doc(db, 'settings', 'adminGeneral'), snap => {
    if (!dirty) { setDraft({ ...defaults, ...snap.data()?.values }); setRevision(snap.data()?.revision ?? 0); }
    setLoading(false);
  }, e => { setLoading(false); setError(backendError(e)); }), [dirty]);
  async function save() {
    setBusy(true); setError(''); setSaved(false);
    try {
      Intl.DateTimeFormat('en', { timeZone: draft.timezone });
      if (draft.logoUrl && !draft.logoUrl.startsWith('/') && !draft.logoUrl.startsWith('https://')) throw new Error('Use a local path or HTTPS URL for the logo.');
      await runTransaction(db, async tx => {
        const target = doc(db, 'settings', 'adminGeneral');
        if (((await tx.get(target)).data()?.revision ?? 0) !== revision) throw new Error('Settings changed in another session. Reload before saving.');
        tx.set(target, { values: draft, revision: revision + 1, updatedAt: serverTimestamp(), updatedBy: auth.currentUser?.uid });
      });
      setRevision(r => r + 1); setDirty(false); setSaved(true);
    } catch (e) { setError(backendError(e)); } finally { setBusy(false); }
  }
  const fields = [['name', 'Platform name', 'اسم المنصة'], ['supportEmail', 'Support email', 'بريد الدعم'], ['logoUrl', 'Logo URL', 'رابط الشعار'], ['primaryColor', 'Primary color', 'اللون الأساسي'], ['timezone', 'Timezone', 'المنطقة الزمنية'], ['smtpHost', 'SMTP host', 'خادم SMTP'], ['smtpPort', 'SMTP port', 'منفذ SMTP'], ['senderEmail', 'Sender email', 'بريد المرسل'], ['smtpSecretReference', 'SMTP secret reference', 'مرجع سر SMTP']] as const;
  return <div className="adm-workspace"><div className="adm-page-head"><div><h1>{ar ? 'الإعدادات العامة' : 'General'}</h1><p>{ar ? 'هوية المنصة والعلامة التجارية وإعدادات البريد.' : 'Platform identity, branding and email configuration.'}</p></div></div><form className="adm-panel" onSubmit={e => { e.preventDefault(); void save(); }}><fieldset disabled={loading || busy} style={{ border: 0, padding: 24 }}><div className="adm-form adm-cms-fields">{fields.map(([key, en, arabic]) => <label key={key}>{ar ? arabic : en}<input type={key === 'primaryColor' ? 'color' : key.endsWith('Email') ? 'email' : key === 'smtpPort' ? 'number' : 'text'} required={['name', 'timezone'].includes(key)} min={1} max={65535} maxLength={500} value={draft[key]} onChange={e => { setDirty(true); setSaved(false); setDraft({ ...draft, [key]: key === 'smtpPort' ? Number(e.target.value) : e.target.value }); }}/></label>)}</div><p style={{ color: 'var(--adm-muted)' }}>{ar ? 'استخدم مرجع السر المحفوظ في الخادم لبيانات SMTP.' : 'Use a server-managed secret reference for SMTP credentials.'}</p>{error && <p role="alert">{error}</p>}{saved && <p role="status">{ar ? 'تم الحفظ.' : 'Settings saved.'}</p>}<button className="adm-primary" disabled={!dirty}>{busy ? (ar ? 'جار الحفظ…' : 'Saving…') : (ar ? 'حفظ التغييرات' : 'Save changes')}</button></fieldset></form></div>;
}
