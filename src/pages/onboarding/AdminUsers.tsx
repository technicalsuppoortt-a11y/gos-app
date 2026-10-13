import React from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowUpRight, Check, Copy, Mail, MoreHorizontal, Plus, Search, ShieldCheck, Users, X } from 'lucide-react';
import type { RootState } from '../../store';
import { Combobox } from '../../components/ui/Combobox';
import { useOnboarding, updateOnboarding, activationUrl, type Invite } from './onboarding-store';
import { showToast } from '../../utils/toast';
import './onboarding.css';

function UserActions({ invite, copy, resend, ar }: { invite: Invite; copy: () => void; resend: () => void; ar: boolean }) {
  const [open, setOpen] = React.useState(false), [position, setPosition] = React.useState({ top: 0, left: 0 });
  const anchor = React.useRef<HTMLButtonElement>(null), menu = React.useRef<HTMLDivElement>(null); const id = React.useId();
  const t = (en: string, arabic: string) => ar ? arabic : en;
  React.useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => menu.current?.querySelector<HTMLElement>('button,a')?.focus());
    const outside = (e: PointerEvent) => { if (!menu.current?.contains(e.target as Node) && !anchor.current?.contains(e.target as Node)) setOpen(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); anchor.current?.focus(); } };
    const scroll = () => setOpen(false);
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape); window.addEventListener('scroll', scroll, true);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); window.removeEventListener('scroll', scroll, true); };
  }, [open]);
  return <><button ref={anchor} className="ob-icon ob-user-menu-trigger" aria-label={`${t('Actions for', 'إجراءات')} ${invite.email}`} aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={() => { const r = anchor.current!.getBoundingClientRect(); setPosition({ top: Math.min(r.bottom + 5, innerHeight - 155), left: Math.max(12, Math.min(ar ? r.left : r.right - 205, innerWidth - 217)) }); setOpen(!open); }}><MoreHorizontal size={18}/></button>{open && createPortal(<div ref={menu} id={id} className="ob-action-popover" role="menu" dir={ar ? 'rtl' : 'ltr'} style={position} onKeyDown={e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const items = Array.from(menu.current!.querySelectorAll<HTMLElement>('[role=menuitem]')); const index = items.indexOf(document.activeElement as HTMLElement); items[(index + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus(); } }}><button role="menuitem" onClick={() => { copy(); setOpen(false); }}><Copy size={14}/>{t('Copy activation link', 'نسخ رابط التفعيل')}</button><Link role="menuitem" to={`/activate?invite=${invite.id}`} onClick={() => setOpen(false)}><ArrowUpRight size={14}/>{t('Open activation', 'فتح صفحة التفعيل')}</Link><button role="menuitem" onClick={() => { resend(); setOpen(false); }}><Mail size={14}/>{t('View invitation', 'عرض الدعوة')}</button></div>, document.body)}</>;
}

export function AdminUsers() {
  const { invites, setups } = useOnboarding(); const ar = useSelector((s: RootState) => s.ui.language === 'ar');
  const t = (en: string, arabic: string) => ar ? arabic : en; const dir = ar ? 'rtl' : 'ltr';
  const [open, setOpen] = React.useState(false), [sent, setSent] = React.useState<Invite | null>(null);
  const [query, setQuery] = React.useState(''), [error, setError] = React.useState(''), [role, setRole] = React.useState('USER'), [filter, setFilter] = React.useState('All');
  const dialog = React.useRef<HTMLDialogElement>(null);
  React.useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close(); }, [open]);
  const copy = async (id: string) => { try { await navigator.clipboard.writeText(activationUrl(id)); showToast.success(t('Activation link copied', 'تم نسخ رابط التفعيل')); } catch { showToast.error(t('Copy the activation link from the invitation dialog.', 'انسخ رابط التفعيل من نافذة الدعوة.')); } };
  const status = (invite: Invite) => invite.status === 'Invited' ? 'Invited' : setups[invite.email]?.onboarding_completed ? 'Active' : 'Pending';
  const statusName = (value: string) => ({ All: t('All statuses', 'كل الحالات'), Active: t('Active', 'نشط'), Invited: t('Invited', 'مدعو'), Pending: t('Pending', 'قيد الإعداد') }[value] || value);
  const roles = [{ value: 'USER', label: t('Team member', 'عضو الفريق') }, { value: 'ADMIN', label: t('Admin', 'مسؤول') }];
  const filtered = invites.filter(i => i.email.includes(query.trim().toLowerCase()) && (filter === 'All' || status(i) === filter));
  const create = () => { setSent(null); setError(''); setRole('USER'); setOpen(true); };
  return <section className="ob-admin" dir={dir}>
    <div className="ob-page-head"><div><span className="ob-eyebrow">{t('WORKSPACE ADMINISTRATION', 'إدارة مساحة العمل')}</span><h1>{t('Good teams start here.', 'الفرق الرائعة تبدأ هنا.')}</h1><p>{t('Invite your people. Give them a workspace built for their business.', 'ادعُ فريقك إلى مساحة عمل مصممة لنشاطهم.')}</p></div><button className="ob-primary" onClick={create}><Plus size={17}/>{t('Invite user', 'دعوة مستخدم')}</button></div>
    <div className="ob-stats">{[[Users, t('Team members', 'أعضاء الفريق'), invites.length], [Mail, t('Pending invitations', 'الدعوات المعلقة'), invites.filter(i => i.status === 'Invited').length], [ShieldCheck, t('Activated accounts', 'الحسابات المفعلة'), invites.filter(i => i.status === 'Activated').length]].map(([Icon, title, count]) => { const I = Icon as typeof Users; return <div key={String(title)}><I size={21}/><span>{String(title)}<b>{String(count).padStart(2, '0')}</b></span></div>; })}</div>
    <div className="ob-table-card"><div className="ob-table-head"><h2>{t('Workspace users', 'مستخدمو المساحة')} <span>{invites.length}</span></h2><div className="ob-table-filters"><Combobox label={t('Filter users by status', 'تصفية المستخدمين حسب الحالة')} value={filter} dir={dir} options={['All', 'Active', 'Invited', 'Pending'].map(value => ({ value, label: statusName(value) }))} onChange={setFilter}/><label className="ob-search"><Search size={16}/><input aria-label={t('Search users', 'البحث عن مستخدمين')} placeholder={t('Search by email…', 'ابحث بالبريد الإلكتروني…')} value={query} onChange={e => setQuery(e.target.value)}/></label></div></div>
      <div className="ob-table-scroll"><table><thead><tr><th>{t('User', 'المستخدم')}</th><th>{t('Initial role', 'الدور')}</th><th>{t('Status', 'الحالة')}</th><th>{t('Invited on', 'تاريخ الدعوة')}</th><th className="ob-actions-column">{t('Actions', 'الإجراءات')}</th></tr></thead><tbody>{filtered.map(i => <tr key={i.id}><td><span className="ob-user"><span className="ob-avatar">{i.email.slice(0, 2).toUpperCase()}</span><span dir="ltr">{i.email}</span></span></td><td><Combobox label={`${t('Role for', 'دور')} ${i.email}`} value={i.role} dir={dir} options={roles} onChange={value => { updateOnboarding(s => ({ ...s, invites: s.invites.map(item => item.id === i.id ? { ...item, role: value as Invite['role'] } : item) })); showToast.success(t('User role updated', 'تم تحديث دور المستخدم')); }}/></td><td><span className={`ob-badge ${status(i) === 'Active' ? 'green' : status(i) === 'Pending' ? 'amber' : ''}`}><span className="ob-status-dot"/>{statusName(status(i))}</span></td><td><time dateTime={i.created}>{new Intl.DateTimeFormat(ar ? 'ar-EG' : 'en-GB', { timeZone: 'Africa/Cairo', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(i.created))}</time></td><td className="ob-actions-column"><UserActions ar={ar} invite={i} copy={() => copy(i.id)} resend={() => { setSent(i); setOpen(true); }}/></td></tr>)}</tbody></table></div>
      {!invites.length && <div className="ob-empty"><span className="ob-orb"><Users/></span><h3>{t('Your next great team starts with an invite', 'فريقك الرائع القادم يبدأ بدعوة')}</h3><p>{t('New members will activate their account and set up their workspace.', 'سيقوم الأعضاء الجدد بتفعيل حساباتهم وإعداد مساحاتهم.')}</p><button className="ob-secondary" onClick={create}><Plus size={16}/>{t('Invite your first user', 'دعوة أول مستخدم')}</button></div>}
      {!!invites.length && !filtered.length && <p className="ob-empty">{t('No users match your search.', 'لا يوجد مستخدمون يطابقون بحثك.')}</p>}
    </div>
    <p className="ob-demo-note"><ShieldCheck size={14}/>{t('Interactive demo · Invitations are saved locally. No emails are sent.', 'تجربة تفاعلية · يتم حفظ الدعوات محلياً دون إرسال رسائل بريد.')}</p>
    <dialog ref={dialog} className="ob-dialog" dir={dir} onCancel={() => setOpen(false)} onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
      <button className="ob-close ob-icon" aria-label={t('Close invitation', 'إغلاق الدعوة')} onClick={() => setOpen(false)}><X size={19}/></button>
      {sent ? <div><span className="ob-orb success"><Check/></span><h2>{t('Invitation ready to go.', 'الدعوة جاهزة.')}</h2><p>{t('Share this activation link with', 'شارك رابط التفعيل مع')} <strong dir="ltr">{sent.email}</strong> {t('to get them started.', 'ليبدأ إعداد حسابه.')}</p><label className="ob-field">{t('Activation link', 'رابط التفعيل')}<input dir="ltr" readOnly value={activationUrl(sent.id)} onFocus={e => e.target.select()}/></label><button className="ob-secondary ob-full" onClick={() => copy(sent.id)}><Copy size={16}/>{t('Copy activation link', 'نسخ رابط التفعيل')}</button><Link className="ob-primary ob-full" to={`/activate?invite=${sent.id}`}>{t('Preview user activation', 'معاينة تفعيل المستخدم')}<ArrowUpRight size={16}/></Link><p className="ob-demo-note">{t('Simulated send complete. No email was delivered.', 'اكتملت محاكاة الإرسال دون إرسال رسالة بريد.')}</p></div> :
      <form onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); const email = String(data.get('email')).trim().toLowerCase(); if (invites.some(i => i.email === email)) { setError(t('This email already has an invitation. Use its existing activation link.', 'توجد دعوة لهذا البريد. استخدم رابط التفعيل الحالي.')); return; } const invite: Invite = { id: crypto.randomUUID(), email, role: role as Invite['role'], status: 'Invited', created: new Date().toISOString(), mfa: false }; updateOnboarding(s => ({ ...s, invites: [invite, ...s.invites] })); setSent(invite); }}>
        <span className="ob-orb"><Mail/></span><h2>{t('A little invite. A big beginning.', 'دعوة بسيطة. بداية كبيرة.')}</h2><p>{t('They’ll get a personal activation link and a guided workspace setup.', 'سيحصل المستخدم على رابط تفعيل شخصي وخطوات لإعداد المساحة.')}</p>
        <label className="ob-field">{t('Work email', 'بريد العمل')}<input autoFocus name="email" required type="email" dir="ltr" placeholder="alex@company.com"/></label><label className="ob-field">{t('Initial role', 'الدور الأولي')}<Combobox name="role" label={t('Initial role', 'الدور الأولي')} value={role} options={roles} dir={dir} onChange={setRole}/></label>
        <div className="ob-callout"><ShieldCheck size={18}/><span>{t('Account activation includes email confirmation, password setup, and optional MFA.', 'يشمل التفعيل تأكيد البريد وإعداد كلمة المرور وخيار المصادقة متعددة العوامل.')}</span></div>{error && <p className="ob-error" role="alert">{error}</p>}
        <button className="ob-primary ob-full" type="submit"><Mail size={16}/>{t('Send invite & activation link', 'إرسال دعوة ورابط التفعيل')}</button>
      </form>}
    </dialog>
  </section>;
}
