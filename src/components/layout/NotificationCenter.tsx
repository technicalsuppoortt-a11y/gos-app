import { useCloudState, useEntities } from '../../backend/workspace';
import {
  eventLabel,
  parseTimestampMs,
  resourceLabel,
  toIsoDateString,
  type BusinessEvent,
} from '../../backend/metrics';
import {
  useWorkspaceNotifications,
  type WorkspaceNotificationRecord,
} from '../../backend/notifications';
import { translateText } from '../../i18n/display';
import { useLocation, useNavigate } from 'react-router-dom';
import React from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  CalendarDays,
  CheckCheck,
  Headset,
  Inbox,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import './notification-center.css';
import { withUniqueListIds } from '../../utils/listKeys';

type Category = 'All' | 'Support' | 'Leads' | 'Bookings' | 'System';

type Notice = {
  id: string;
  category: Exclude<Category, 'All'>;
  en: string;
  ar: string;
  detail: string;
  detailAr: string;
  at: string;
  read: boolean;
  deepLink?: string;
  rawWorkspaceNotif?: WorkspaceNotificationRecord;
};

function initial(key: string): Notice[] {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (
      Array.isArray(saved) &&
      saved.every(
        n =>
          typeof n.id === 'string' &&
          typeof n.read === 'boolean' &&
          Number.isFinite(Date.parse(n.at)),
      )
    ) {
      return saved.filter(
        n => !['lead', 'booking', 'workspace', 'reminder'].includes(n.id),
      );
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function NotificationCenter() {
  const userId = useSelector((s: RootState) => s.auth.user?.id || 'demo');
  return <NotificationCenterContent key={userId} />;
}

function NotificationCenterContent() {
  const { user, tenant, role } = useSelector((s: RootState) => s.auth);
  const ar = useSelector((s: RootState) => s.ui.language === 'ar');
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  const navigate = useNavigate();
  const location = useLocation();

  const key = `gos.notifications.v1:${user?.id || 'demo'}`;
  const [legacyNotices, setNotices] = React.useState(() => initial(key));
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<Category>('All');

  const isUserWorkspace = location.pathname.startsWith('/dashboard');
  const scope = tenant?.id || user?.id || '';
  const isOwner =
    role === 'ADMIN' ||
    role === 'SUPER_ADMIN' ||
    (!user?.isTeamMember &&
      (!scope || scope === user?.id || scope === `workspace-${user?.id}`));

  const {
    notifications: wsNotifications,
    markRead: markWsRead,
    markAllRead: markAllWsRead,
  } = useWorkspaceNotifications({
    scope: isUserWorkspace ? scope : '',
    userId: user?.id || '',
    userEmail: user?.email || '',
    isOwner,
  });

  const events = useEntities<BusinessEvent>('events');
  const [readIds, setReadIds] = useCloudState<string[]>(key, []);

  const notices: Notice[] = React.useMemo(() => {
    if (!isUserWorkspace) {
      return withUniqueListIds(legacyNotices);
    }

    const supportAndRealtimeNotices: Notice[] = wsNotifications.map(item => ({
      id: `ws_${item.id}`,
      category: item.category || 'Support',
      en: item.titleEn,
      ar: item.titleAr || item.titleEn,
      detail: item.detailEn,
      detailAr: item.detailAr || item.detailEn,
      at: item.createdAt,
      read: item.isRead,
      deepLink: item.deepLink,
      rawWorkspaceNotif: item,
    }));

    // Filter out internal background 'workspace.updated' noise so real notifications shine
    const actionableEvents = events.filter(
      event => event.type && event.type !== 'workspace.updated',
    );

    const eventNotices: Notice[] = actionableEvents.map(event => {
      const cat: Exclude<Category, 'All'> = /booking/.test(event.type)
        ? 'Bookings'
        : /lead/.test(event.type)
        ? 'Leads'
        : /handoff|support|conversation/.test(event.type)
        ? 'Support'
        : 'System';
      const labelEn = eventLabel(event.type);
      const resEn = resourceLabel(event.resource);
      return {
        id: event.id,
        category: cat,
        en: labelEn,
        ar: translateText(labelEn),
        detail: resEn,
        detailAr: translateText(resEn),
        at: toIsoDateString(event.createdAt),
        read: readIds.includes(event.id),
        deepLink:
          cat === 'Support'
            ? '/dashboard/inbox'
            : cat === 'Leads'
            ? '/dashboard/crm'
            : cat === 'Bookings'
            ? '/dashboard/booking'
            : '/dashboard',
      };
    });

    const combined = [...supportAndRealtimeNotices, ...eventNotices]
      .sort((a, b) => parseTimestampMs(b.at) - parseTimestampMs(a.at))
      .slice(0, 100);

    return withUniqueListIds(combined);
  }, [isUserWorkspace, legacyNotices, wsNotifications, events, readIds]);

  const [position, setPosition] = React.useState({ top: 65, left: 0, width: 410 });
  const trigger = React.useRef<HTMLButtonElement>(null);
  const panel = React.useRef<HTMLElement>(null);
  const id = React.useId();

  React.useEffect(() => {
    if (isUserWorkspace) return;
    try {
      localStorage.setItem(key, JSON.stringify(notices));
    } catch {
      /* ignore */
    }
  }, [key, legacyNotices, isUserWorkspace, notices]);

  const handleMarkItemRead = (item: Notice) => {
    if (!isUserWorkspace) {
      setNotices(prev => prev.map(v => (v.id === item.id ? { ...v, read: true } : v)));
      return;
    }
    if (item.rawWorkspaceNotif) {
      void markWsRead(item.rawWorkspaceNotif);
    } else if (!readIds.includes(item.id)) {
      setReadIds([...readIds, item.id]);
    }
  };

  const handleMarkAllRead = () => {
    if (!isUserWorkspace) {
      setNotices(prev => prev.map(n => ({ ...n, read: true })));
      return;
    }
    void markAllWsRead();
    const unreadEventIds = notices
      .filter(n => !n.rawWorkspaceNotif && !n.read)
      .map(n => n.id);
    if (unreadEventIds.length > 0) {
      setReadIds([...new Set([...readIds, ...unreadEventIds])]);
    }
  };

  const unread = notices.filter(n => !n.read).length;

  React.useLayoutEffect(() => {
    if (open && trigger.current) {
      const r = trigger.current.getBoundingClientRect();
      const width = Math.min(420, innerWidth - 24);
      setPosition({
        top: r.bottom + 12,
        left: Math.max(
          12,
          Math.min(ar ? r.left : r.right - width, innerWidth - width - 12),
        ),
        width,
      });
    }
  }, [open, ar]);

  React.useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() =>
      panel.current?.querySelector<HTMLButtonElement>('button')?.focus(),
    );
    const outside = (e: PointerEvent) => {
      if (
        !panel.current?.contains(e.target as Node) &&
        !trigger.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const keyboard = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    const resize = () => setOpen(false);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', keyboard);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', keyboard);
      window.removeEventListener('resize', resize);
    };
  }, [open]);

  const filtered = notices.filter(n => tab === 'All' || n.category === tab);

  const categoryName = (category: Category) =>
    ({
      All: t('All', 'الكل'),
      Support: t('Support', 'الدعم'),
      Leads: t('Leads', 'العملاء'),
      Bookings: t('Bookings', 'الحجوزات'),
      System: t('System', 'النظام'),
    })[category];

  const timestamp = (date: string) => {
    const ms = parseTimestampMs(date);
    return new Intl.DateTimeFormat(ar ? 'ar-EG-u-nu-latn' : 'en-GB', {
      timeZone: 'Africa/Cairo',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ms || Date.now()));
  };

  const categories: Category[] = ['All', 'Support', 'Leads', 'Bookings', 'System'];

  return (
    <>
      <button
        ref={trigger}
        className="layout-notifications nc-trigger"
        aria-label={t('Notifications', 'الإشعارات')}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(o => !o)}
      >
        <Bell size={18} />
        {!!unread && <span className="nc-count">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open &&
        createPortal(
          <section
            ref={panel}
            id={id}
            className="nc-popover"
            role="dialog"
            aria-label={t('Notification center', 'مركز الإشعارات')}
            dir={ar ? 'rtl' : 'ltr'}
            style={position}
          >
            <div className="nc-heading">
              <div>
                <h2>
                  {t('Notifications', 'الإشعارات')}
                  <span>{unread}</span>
                </h2>
                <p>
                  {t(
                    'Real-time support routing, handoffs & workspace alerts.',
                    'إشعارات الدعم الفورية، تحويل المحادثات، وتنبيهات مساحة العمل.',
                  )}
                </p>
              </div>
              <button
                aria-label={t('Close notifications', 'إغلاق الإشعارات')}
                onClick={() => {
                  setOpen(false);
                  trigger.current?.focus();
                }}
              >
                <X size={17} />
              </button>
            </div>

            <div
              className="nc-tabs"
              role="tablist"
              aria-label={t('Notification categories', 'تصنيفات الإشعارات')}
            >
              {categories.map((c, i, tabs) => (
                <button
                  key={c}
                  role="tab"
                  aria-selected={tab === c}
                  aria-controls={`${id}-items`}
                  id={`${id}-${c}`}
                  tabIndex={tab === c ? 0 : -1}
                  onClick={() => setTab(c)}
                  onKeyDown={e => {
                    if (['ArrowRight', 'ArrowLeft'].includes(e.key)) {
                      e.preventDefault();
                      const offset = (e.key === 'ArrowRight') !== ar ? 1 : -1;
                      const next = tabs[(i + offset + tabs.length) % tabs.length];
                      setTab(next);
                      document.getElementById(`${id}-${next}`)?.focus();
                    }
                  }}
                >
                  {categoryName(c)}
                </button>
              ))}
            </div>

            <div
              className="nc-items"
              role="tabpanel"
              id={`${id}-items`}
              aria-labelledby={`${id}-${tab}`}
            >
              {filtered.map(n => {
                const Icon =
                  n.category === 'Support'
                    ? Headset
                    : n.category === 'Leads'
                    ? Users
                    : n.category === 'Bookings'
                    ? CalendarDays
                    : Sparkles;
                return (
                  <button
                    key={n.id}
                    className={`nc-item ${n.read ? '' : 'unread'}`}
                    onClick={() => {
                      handleMarkItemRead(n);
                      setOpen(false);
                      const target =
                        n.deepLink ||
                        (n.category === 'Support'
                          ? '/dashboard/inbox'
                          : n.category === 'Leads'
                          ? '/dashboard/crm'
                          : n.category === 'Bookings'
                          ? '/dashboard/booking'
                          : role === 'ADMIN' || role === 'SUPER_ADMIN'
                          ? '/admin/users'
                          : '/dashboard');
                      navigate(target);
                    }}
                  >
                    <span className={`nc-icon ${n.category.toLowerCase()}`}>
                      <Icon size={17} />
                    </span>
                    <div>
                      <b>{ar ? n.ar : n.en}</b>
                      <p>{ar ? n.detailAr : n.detail}</p>
                      <time dateTime={n.at}>{timestamp(n.at)}</time>
                    </div>
                    {!n.read && <span className="nc-unread-dot" />}
                  </button>
                );
              })}
              {!filtered.length && (
                <div className="nc-empty">
                  <Inbox size={25} />
                  <b>{t('You’re all caught up', 'أنت مطلع على كل المستجدات')}</b>
                </div>
              )}
            </div>

            <footer>
              <span>{t('Workspace activity', 'نشاط مساحة العمل')}</span>
              <button disabled={!unread} onClick={handleMarkAllRead}>
                <CheckCheck size={14} />
                {t('Mark all as read', 'تحديد الكل كمقروء')}
              </button>
            </footer>
          </section>,
          document.body,
        )}
    </>
  );
}
