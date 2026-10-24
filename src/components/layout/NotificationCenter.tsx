import { useCloudState, useEntities } from '../../backend/workspace';
import { eventLabel, parseTimestampMs, resourceLabel, toIsoDateString, type BusinessEvent } from '../../backend/metrics';
import { useLocation } from 'react-router-dom';
import React from 'react';
import { createPortal } from 'react-dom';
import { Bell, CalendarDays, CheckCheck, Inbox, Sparkles, Users, X } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import './notification-center.css';
import { withUniqueListIds } from '../../utils/listKeys';

type Category = 'All' | 'Leads' | 'Bookings' | 'System';
type Notice = { id: string; category: Exclude<Category, 'All'>; en: string; ar: string; detail: string; detailAr: string; at: string; read: boolean };
function initial(key: string): Notice[] {
  try { const saved = JSON.parse(localStorage.getItem(key) || 'null'); if (Array.isArray(saved) && saved.every(n => typeof n.id === 'string' && typeof n.read === 'boolean' && Number.isFinite(Date.parse(n.at)))) return saved.filter(n => !['lead', 'booking', 'workspace', 'reminder'].includes(n.id)); } catch {}
  // No sample notifications: outside the user workspace the list stays empty until real events exist.
  return [];
}
export function NotificationCenter() {
  const userId = useSelector((s: RootState) => s.auth.user?.id || 'demo');
  return <NotificationCenterContent key={userId}/>;
}
function NotificationCenterContent() {
  const { user, role } = useSelector((s: RootState) => s.auth); const ar = useSelector((s: RootState) => s.ui.language === 'ar');
  const t = (en: string, arabic: string) => ar ? arabic : en; const navigate = useNavigate();
  const key = `gos.notifications.v1:${user?.id || 'demo'}`;
  const [legacyNotices, setNotices] = React.useState(() => initial(key)), [open, setOpen] = React.useState(false), [tab, setTab] = React.useState<Category>('All');
  const isUserWorkspace = useLocation().pathname.startsWith('/dashboard');
  const events = useEntities<BusinessEvent>('events');
  const [readIds, setReadIds] = useCloudState<string[]>(key, []);
  const notices: Notice[] = isUserWorkspace ? withUniqueListIds([...events].sort((a,b) => parseTimestampMs(b.createdAt) - parseTimestampMs(a.createdAt)).slice(0,100)).map(event => ({ id:event.id, category: /booking/.test(event.type) ? 'Bookings' : /lead/.test(event.type) ? 'Leads' : 'System', en:eventLabel(event.type), ar:eventLabel(event.type), detail:resourceLabel(event.resource), detailAr:resourceLabel(event.resource), at:toIsoDateString(event.createdAt), read:readIds.includes(event.id) })) : withUniqueListIds(legacyNotices);
  const [position, setPosition] = React.useState({ top: 65, left: 0, width: 400 });
  const trigger = React.useRef<HTMLButtonElement>(null), panel = React.useRef<HTMLElement>(null); const id = React.useId();
  React.useEffect(() => { if (isUserWorkspace) return; try { localStorage.setItem(key, JSON.stringify(notices)); } catch {} }, [key, legacyNotices, isUserWorkspace]);
  const save = (next: Notice[]) => { if (isUserWorkspace) setReadIds(next.filter(item => item.read).map(item => item.id)); else setNotices(next); };
  const unread = notices.filter(n => !n.read).length;
  React.useLayoutEffect(() => { if (open && trigger.current) { const r = trigger.current.getBoundingClientRect(); const width = Math.min(410, innerWidth - 24); setPosition({ top: r.bottom + 12, left: Math.max(12, Math.min(ar ? r.left : r.right - width, innerWidth - width - 12)), width }); } }, [open, ar]);
  React.useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => panel.current?.querySelector<HTMLButtonElement>('button')?.focus());
    const outside = (e: PointerEvent) => { if (!panel.current?.contains(e.target as Node) && !trigger.current?.contains(e.target as Node)) setOpen(false); };
    const keyboard = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    const resize = () => setOpen(false);
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', keyboard); window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', keyboard); window.removeEventListener('resize', resize); };
  }, [open]);
  const filtered = notices.filter(n => tab === 'All' || n.category === tab);
  const categoryName = (category: Category) => ({ All: t('All', 'الكل'), Leads: t('Leads', 'العملاء'), Bookings: t('Bookings', 'الحجوزات'), System: t('System', 'النظام') }[category]);
  const timestamp = (date: string) => {
    const ms = parseTimestampMs(date);
    return new Intl.DateTimeFormat(ar ? 'ar-EG' : 'en-GB', { timeZone: 'Africa/Cairo', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(ms || Date.now()));
  };
  return <><button ref={trigger} className="layout-notifications nc-trigger" aria-label={t('Notifications', 'الإشعارات')} aria-expanded={open} aria-controls={id} onClick={() => setOpen(o => !o)}><Bell size={18}/>{!!unread && <span className="nc-count">{unread}</span>}</button>
    {open && createPortal(<section ref={panel} id={id} className="nc-popover" role="dialog" aria-label={t('Notification center', 'مركز الإشعارات')} dir={ar ? 'rtl' : 'ltr'} style={position}>
      <div className="nc-heading"><div><h2>{t('Notifications', 'الإشعارات')}<span>{unread}</span></h2><p>{t('Your workspace, at a glance.', 'نظرة سريعة على مساحة عملك.')}</p></div><button aria-label={t('Close notifications', 'إغلاق الإشعارات')} onClick={() => { setOpen(false); trigger.current?.focus(); }}><X size={17}/></button></div>
      <div className="nc-tabs" role="tablist" aria-label={t('Notification categories', 'تصنيفات الإشعارات')}>{(['All', 'Leads', 'Bookings', 'System'] as Category[]).map((c, i, tabs) => <button key={c} role="tab" aria-selected={tab === c} aria-controls={`${id}-items`} id={`${id}-${c}`} tabIndex={tab === c ? 0 : -1} onClick={() => setTab(c)} onKeyDown={e => { if (['ArrowRight', 'ArrowLeft'].includes(e.key)) { e.preventDefault(); const offset = (e.key === 'ArrowRight') !== ar ? 1 : -1; const next = tabs[(i + offset + tabs.length) % tabs.length]; setTab(next); document.getElementById(`${id}-${next}`)?.focus(); } }}>{categoryName(c)}</button>)}</div>
      <div className="nc-items" role="tabpanel" id={`${id}-items`} aria-labelledby={`${id}-${tab}`}>{filtered.map(n => { const Icon = n.category === 'Leads' ? Users : n.category === 'Bookings' ? CalendarDays : Sparkles; return <button key={n.id} className={`nc-item ${n.read ? '' : 'unread'}`} onClick={() => { save(notices.map(v => v.id === n.id ? { ...v, read: true } : v)); setOpen(false); navigate(n.category === 'Leads' ? '/dashboard/crm' : n.category === 'Bookings' ? '/dashboard/booking' : role === 'ADMIN' || role === 'SUPER_ADMIN' ? '/admin/users' : '/dashboard'); }}><span className={`nc-icon ${n.category.toLowerCase()}`}><Icon size={17}/></span><div><b>{ar ? n.ar : n.en}</b><p>{ar ? n.detailAr : n.detail}</p><time dateTime={n.at}>{timestamp(n.at)}</time></div>{!n.read && <span className="nc-unread-dot"/>}</button>; })}{!filtered.length && <div className="nc-empty"><Inbox size={25}/><b>{t('You’re all caught up', 'أنت مطلع على كل المستجدات')}</b></div>}</div>
      <footer><span>{t('Workspace activity', 'نشاط مساحة العمل')}</span><button disabled={!unread} onClick={() => save(notices.map(n => ({ ...n, read: true })))}><CheckCheck size={14}/>{t('Mark all as read', 'تحديد الكل كمقروء')}</button></footer>
    </section>, document.body)}
  </>;
}
