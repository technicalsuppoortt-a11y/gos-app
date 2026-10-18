import React from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react';
import type { RootState } from '../../store';
import { Combobox } from '../../components/ui/Combobox';
import type { Invite } from './onboarding-store';
import { useAdminUsers, manageAccount, activationUrl, getActivationLink, generateActivationLink } from '../../backend/adminUsers';
import { backendError } from '../../backend/firebase';
import { showToast } from '../../utils/toast';
import './onboarding.css';

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #3b82f6, #60a5fa)',
  'linear-gradient(135deg, #10b981, #34d399)',
  'linear-gradient(135deg, #f59e0b, #fbbf24)',
  'linear-gradient(135deg, #ec4899, #f472b6)',
  'linear-gradient(135deg, #8b5cf6, #c084fc)',
  'linear-gradient(135deg, #06b6d4, #22d3ee)',
];

function getAvatarStyle(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const bg = AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
  return { background: bg, color: '#ffffff' };
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function UserActions({
  invite,
  copy,
  resend,
  onToggleStatus,
  onDelete,
  ar,
}: {
  invite: Invite;
  copy: () => void;
  resend: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
  ar: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const anchor = React.useRef<HTMLButtonElement>(null);
  const menu = React.useRef<HTMLDivElement>(null);
  const id = React.useId();
  const t = (en: string, arabic: string) => (ar ? arabic : en);

  React.useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => menu.current?.querySelector<HTMLElement>('button,a')?.focus());
    const outside = (e: PointerEvent) => {
      if (!menu.current?.contains(e.target as Node) && !anchor.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        anchor.current?.focus();
      }
    };
    const scroll = () => setOpen(false);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    window.addEventListener('scroll', scroll, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('scroll', scroll, true);
    };
  }, [open]);

  const openMenu = () => {
    const r = anchor.current!.getBoundingClientRect();
    const width = 210;
    const height = 190;
    setPosition({
      top: r.bottom + height > window.innerHeight ? Math.max(12, r.top - height) : r.bottom + 5,
      left: Math.max(12, Math.min(ar ? r.left : r.right - width, window.innerWidth - width - 12)),
    });
    setOpen(!open);
  };

  const isActive = invite.status === 'Active' || invite.status === 'Activated';

  return (
    <>
      <button
        ref={anchor}
        className="ob-icon ob-user-menu-trigger"
        aria-label={`${t('Actions for', 'إجراءات')} ${invite.name || invite.email}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onClick={openMenu}
      >
        <MoreHorizontal size={18} />
      </button>
      {open &&
        createPortal(
          <div
            ref={menu}
            id={id}
            className="ob-action-popover"
            role="menu"
            dir={ar ? 'rtl' : 'ltr'}
            style={position}
            onKeyDown={e => {
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const items = Array.from(menu.current!.querySelectorAll<HTMLElement>('[role=menuitem]'));
                const index = items.indexOf(document.activeElement as HTMLElement);
                items[(index + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
              }
            }}
          >
            <button
              role="menuitem"
              onClick={() => {
                onToggleStatus();
                setOpen(false);
              }}
            >
              {isActive ? <UserX size={14} /> : <UserCheck size={14} />}
              {isActive ? t('Deactivate account', 'تعطيل الحساب') : t('Activate account', 'تفعيل الحساب')}
            </button>
            <button
              role="menuitem"
              onClick={() => {
                copy();
                setOpen(false);
              }}
            >
              <Copy size={14} />
              {t('Copy activation link', 'نسخ رابط التفعيل')}
            </button>
            <a
              role="menuitem"
              href={activationUrl(invite.id) || generateActivationLink(invite.id, invite.email)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
            >
              <ArrowUpRight size={14} />
              {t('Open activation', 'فتح صفحة التفعيل')}
            </a>
            <button
              role="menuitem"
              onClick={() => {
                resend();
                setOpen(false);
              }}
            >
              <Mail size={14} />
              {t('View invitation', 'عرض تفاصيل الدعوة')}
            </button>
            <div className="ob-popover-divider" />
            <button
              role="menuitem"
              className="is-danger"
              onClick={() => {
                onDelete();
                setOpen(false);
              }}
            >
              <Trash2 size={14} />
              {t('Delete user', 'حذف المستخدم')}
            </button>
          </div>,
          document.body
        )}
    </>
  );
}

export function AdminUsers() {
  const { invites, loading, error: loadError } = useAdminUsers();
  const [busy, setBusy] = React.useState(false);
  const ar = useSelector((s: RootState) => s.ui.language === 'ar');
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  const dir = ar ? 'rtl' : 'ltr';

  const [open, setOpen] = React.useState(false);
  const [sent, setSent] = React.useState<Invite | null>(null);
  const [deletingUser, setDeletingUser] = React.useState<Invite | null>(null);

  const [query, setQuery] = React.useState('');
  const [error, setError] = React.useState('');
  const [role, setRole] = React.useState('USER');
  const [filter, setFilter] = React.useState('All');

  // Pagination states
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(5);

  const dialog = React.useRef<HTMLDialogElement>(null);
  const deleteDialog = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);

  React.useEffect(() => {
    if (deletingUser) deleteDialog.current?.showModal();
    else deleteDialog.current?.close();
  }, [deletingUser]);

  const copy = async (id: string, email?: string) => {
    try {
      const link = (await getActivationLink(id)) || (email ? generateActivationLink(id, email) : '');
      if (link) {
        await navigator.clipboard.writeText(link);
        showToast.success(t('Activation link copied', 'تم نسخ رابط التفعيل'));
      } else {
        throw new Error('Link unavailable');
      }
    } catch {
      showToast.error(t('Copy the activation link from the invitation dialog.', 'انسخ رابط التفعيل من نافذة الدعوة.'));
    }
  };

  const getStatus = (invite: Invite) => {
    if (invite.status === 'Deactivated') return 'Deactivated';
    if (invite.status === 'Pending' || invite.status === 'Invited') return 'Pending';
    return 'Active';
  };

  const statusName = (value: string) =>
    ({
      All: t('All statuses', 'كل الحالات'),
      Active: t('Active', 'نشط'),
      Pending: t('Pending', 'قيد الانتظار'),
      Deactivated: t('Deactivated', 'معطل'),
    }[value] || value);

  const roles = [
    { value: 'ADMIN', label: t('Admin', 'مسؤول') },
    { value: 'USER', label: t('Team member', 'عضو الفريق') },
  ];

  const handleToggleStatus = async (invite: Invite) => {
    const isCurrentlyActive = invite.status === 'Active' || invite.status === 'Activated';
    const nextStatus = isCurrentlyActive ? 'Deactivated' : 'Active';
    try { await manageAccount('status', { id: invite.id, status: nextStatus }); } catch (error) { showToast.error(backendError(error)); return; }
    if (nextStatus === 'Active') {
      showToast.success(t(`Activated account for ${invite.name || invite.email}`, `تم تفعيل حساب ${invite.name || invite.email}`));
    } else {
      showToast.success(t(`Deactivated account for ${invite.name || invite.email}`, `تم تعطيل حساب ${invite.name || invite.email}`));
    }
  };

  const confirmDelete = async () => {
    if (!deletingUser) return;
    const targetId = deletingUser.id;
    const targetName = deletingUser.name || deletingUser.email;
    try { await manageAccount('delete', { id: targetId }); } catch (error) { showToast.error(backendError(error)); return; }
    setDeletingUser(null);
    deleteDialog.current?.close();
    showToast.success(t(`Deleted user ${targetName}`, `تم حذف المستخدم ${targetName}`));
  };

  const create = () => {
    setSent(null);
    setError('');
    setRole('USER');
    setOpen(true);
  };

  // Filtered users
  const filtered = invites.filter(i => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      i.email.toLowerCase().includes(q) ||
      (i.name && i.name.toLowerCase().includes(q));
    const currentStatus = getStatus(i);
    const matchesFilter = filter === 'All' || currentStatus === filter;
    return matchesQuery && matchesFilter;
  });

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const activePage = Math.min(page, totalPages);
  const startIndex = (activePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filtered.length);
  const pagedUsers = filtered.slice(startIndex, endIndex);

  // Dynamic counts for metrics
  const activeCount = invites.filter(i => getStatus(i) === 'Active').length;
  const pendingCount = invites.filter(i => getStatus(i) === 'Pending').length;

  return (
    <section className="ob-admin" dir={dir}>
      <div role="status">{loading ? 'Loading accounts…' : loadError}</div><div className="ob-page-head">
        <div>
          <span className="ob-eyebrow">{t('WORKSPACE ADMINISTRATION', 'إدارة مساحة العمل')}</span>
          <h1>{t('Good teams start here.', 'الفرق الرائعة تبدأ هنا.')}</h1>
          <p>{t('Invite your people. Give them a workspace built for their business.', 'ادعُ فريقك إلى مساحة عمل مصممة لنشاطهم.')}</p>
        </div>
        <button className="ob-primary" onClick={create}>
          <Plus size={17} />
          {t('Invite user', 'دعوة مستخدم')}
        </button>
      </div>

      <div className="ob-stats">
        {[
          [Users, t('Team members', 'أعضاء الفريق'), invites.length],
          [Mail, t('Pending invitations', 'الدعوات المعلقة'), pendingCount],
          [ShieldCheck, t('Activated accounts', 'الحسابات المفعلة'), activeCount],
        ].map(([Icon, title, count]) => {
          const I = Icon as typeof Users;
          return (
            <div key={String(title)}>
              <I size={21} />
              <span>
                {String(title)}
                <b>{String(count).padStart(2, '0')}</b>
              </span>
            </div>
          );
        })}
      </div>

      <div className="ob-table-card">
        <div className="ob-table-head">
          <h2>
            {t('Workspace users', 'مستخدمو المساحة')} <span>{invites.length}</span>
          </h2>
          <div className="ob-table-filters">
            <Combobox
              label={t('Filter users by status', 'تصفية المستخدمين حسب الحالة')}
              value={filter}
              dir={dir}
              options={['All', 'Active', 'Pending', 'Deactivated'].map(value => ({
                value,
                label: statusName(value),
              }))}
              portal={false}
              onChange={val => {
                setFilter(val);
                setPage(1);
              }}
            />
            <label className="ob-search">
              <Search size={16} />
              <input
                aria-label={t('Search users', 'البحث عن مستخدمين')}
                placeholder={t('Search by name or email…', 'ابحث بالاسم أو البريد…')}
                value={query}
                onChange={e => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </label>
          </div>
        </div>

        <div className="ob-table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t('User', 'المستخدم')}</th>
                <th>{t('Initial role', 'الدور')}</th>
                <th>{t('Status', 'الحالة')}</th>
                <th>{t('Invited on', 'تاريخ الدعوة')}</th>
                <th className="ob-actions-column">{t('Actions', 'الإجراءات')}</th>
              </tr>
            </thead>
            <tbody>
              {pagedUsers.map(i => {
                const currentStatus = getStatus(i);
                return (
                  <tr key={i.id}>
                    <td>
                      <div className="ob-user-cell">
                        <span className="ob-avatar" style={getAvatarStyle(i.name || i.email)}>
                          {getInitials(i.name || i.email)}
                        </span>
                        <div className="ob-user-info">
                          <b className="ob-user-name">{i.name || i.email.split('@')[0]}</b>
                          <span className="ob-user-email" dir="ltr">
                            {i.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Combobox
                        label={`${t('Role for', 'دور')} ${i.name || i.email}`}
                        value={i.role === 'SUPER_ADMIN' ? 'ADMIN' : i.role}
                        dir={dir}
                        options={roles}
                        portal={false}
                        onChange={async value => { try { await manageAccount('role', { id: i.id, role: value }); showToast.success(t(`Role updated for ${i.name || i.email}`, `تم تحديث دور ${i.name || i.email}`)); } catch (error) { showToast.error(backendError(error)); } }}
                      />
                    </td>
                    <td>
                      <span
                        className={`ob-badge ${
                          currentStatus === 'Active'
                            ? 'green'
                            : currentStatus === 'Pending'
                            ? 'amber'
                            : 'deactivated'
                        }`}
                      >
                        <span className="ob-status-dot" />
                        {statusName(currentStatus)}
                      </span>
                    </td>
                    <td>
                      <time dateTime={i.created}>
                        {new Intl.DateTimeFormat(ar ? 'ar-EG' : 'en-GB', {
                          timeZone: 'Africa/Cairo',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        }).format(new Date(i.created))}
                      </time>
                    </td>
                    <td className="ob-actions-column">
                      <UserActions
                        ar={ar}
                        invite={i}
                        copy={() => copy(i.id, i.email)}
                        resend={() => {
                          setSent(i);
                          setOpen(true);
                        }}
                        onToggleStatus={() => handleToggleStatus(i)}
                        onDelete={() => setDeletingUser(i)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!invites.length && (
            <div className="ob-empty">
              <span className="ob-orb">
                <Users />
              </span>
              <h3>{t('Your next great team starts with an invite', 'فريقك الرائع القادم يبدأ بدعوة')}</h3>
              <p>{t('New members will activate their account and set up their workspace.', 'سيقوم الأعضاء الجدد بتفعيل حساباتهم وإعداد مساحاتهم.')}</p>
              <button className="ob-secondary" onClick={create}>
                <Plus size={16} />
                {t('Invite your first user', 'دعوة أول مستخدم')}
              </button>
            </div>
          )}

          {!!invites.length && !filtered.length && (
            <p className="ob-empty">{t('No users match your search.', 'لا يوجد مستخدمون يطابقون بحثك.')}</p>
          )}
        </div>

        {/* Footer Pagination Controls */}
        {filtered.length > 0 && (
          <div className="ob-pagination-bar">
            <div className="ob-pagination-info">
              <div className="ob-rows-per-page">
                <span>{t('Rows per page:', 'الصفوف بالصفحة:')}</span>
                <select
                  aria-label={t('Rows per page', 'الصفوف بالصفحة')}
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="ob-rows-select"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                </select>
              </div>
              <span className="ob-pagination-counter">
                {t(
                  `Showing ${startIndex + 1}–${endIndex} of ${filtered.length} users`,
                  `عرض ${startIndex + 1}–${endIndex} من ${filtered.length} مستخدم`
                )}
              </span>
            </div>

            <div className="ob-pagination-buttons">
              <button
                type="button"
                className="ob-page-btn"
                disabled={activePage <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                aria-label={t('Previous page', 'الصفحة السابقة')}
              >
                {ar ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
                <span>{t('Previous', 'السابق')}</span>
              </button>

              <div className="ob-page-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    type="button"
                    className={`ob-page-btn ${p === activePage ? 'is-active' : ''}`}
                    aria-current={p === activePage ? 'page' : undefined}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="ob-page-btn"
                disabled={activePage >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                aria-label={t('Next page', 'الصفحة التالية')}
              >
                <span>{t('Next', 'التالي')}</span>
                {ar ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Invite User Modal */}
      <dialog
        ref={dialog}
        className="ob-dialog"
        dir={dir}
        onCancel={() => {
          setOpen(false);
          setSent(null);
          setError('');
        }}
        onClick={e => {
          if (e.target === e.currentTarget) {
            setOpen(false);
            setSent(null);
            setError('');
          }
        }}
      >
        <button
          className="ob-close ob-icon"
          aria-label={t('Close invitation', 'إغلاق الدعوة')}
          onClick={() => {
            setOpen(false);
            setSent(null);
            setError('');
          }}
        >
          <X size={19} />
        </button>
        {sent ? (
          <div>
            <span className="ob-orb success">
              <Check />
            </span>
            <h2>{t('User Provisioned & Invitation Ready', 'تم إنشاء المستخدم والدعوة جاهزة')}</h2>
            <p>
              {t('A pending user profile has been created for', 'تم إنشاء ملف مستخدم معلق لـ')}{' '}
              <strong dir="ltr">{sent.email}</strong>.
            </p>
            <div className="ob-callout" style={{ margin: '14px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="ob-badge amber" style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }}>
                  {t('Status: Pending', 'الحالة: قيد الانتظار')}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--ob-muted)' }}>
                  {t('Registered in Firebase Auth & Firestore with status: "Pending"', 'تم التسجيل في Firebase Auth وقاعدة البيانات بحالة Pending')}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Check size={14} />
                <span>{t('Official password setup email triggered via Firebase Auth', 'تم إرسال بريد إعداد كلمة المرور الرسمي من Firebase')}</span>
              </div>
            </div>
            <label className="ob-field">
              {t('Direct Activation / Password Setup Link', 'رابط التفعيل وإعداد كلمة المرور المباشر')}
              <input
                dir="ltr"
                readOnly
                value={activationUrl(sent.id) || generateActivationLink(sent.id, sent.email)}
                onFocus={e => e.target.select()}
              />
            </label>
            <button className="ob-secondary ob-full" onClick={() => copy(sent.id, sent.email)}>
              <Copy size={16} />
              {t('Copy activation link', 'نسخ رابط التفعيل')}
            </button>
            <a
              className="ob-primary ob-full"
              href={activationUrl(sent.id) || generateActivationLink(sent.id, sent.email)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('Preview user activation', 'معاينة تفعيل المستخدم')}
              <ArrowUpRight size={16} />
            </a>
            <p className="ob-demo-note">
              {t('When the user sets their password and logs in, their status automatically transitions from Pending to Active.', 'عندما يقوم المستخدم بإعداد كلمة المرور وتسجيل الدخول، ستتغير حالته تلقائياً من Pending إلى Active.')}
            </p>
            <button
              type="button"
              className="ob-secondary ob-full"
              style={{ marginTop: '12px' }}
              onClick={() => {
                setOpen(false);
                setSent(null);
                setError('');
              }}
            >
              {t('Done', 'تم')}
            </button>
          </div>
        ) : (
          <form
            onSubmit={async e => {
              e.preventDefault();
              if (busy) return;
              const form = e.currentTarget;
              const data = new FormData(form);
              const name = String(data.get('name') || '').trim();
              const email = String(data.get('email') || '').trim().toLowerCase();
              if (invites.some(i => i.email === email)) {
                setError(t('This email already has an invitation. Use its existing activation link.', 'توجد دعوة لهذا البريد. استخدم رابط التفعيل الحالي.'));
                return;
              }
              const invite: Invite = {
                id: crypto.randomUUID(),
                name: name || email.split('@')[0],
                email,
                role: role as Invite['role'],
                status: 'Pending',
                created: new Date().toISOString(),
                mfa: false,
              };
              setBusy(true);
              try {
                const result = await manageAccount('create', { email, name: invite.name, role });
                const createdId = result?.id || invite.id;
                setSent({ ...invite, id: createdId });
                form.reset();
                if (result?.alreadyExists) {
                  showToast.info(t('This email already has an account. It was set to Pending and a password reset email was sent — the user must finish activation from that email.', 'هذا البريد مسجل مسبقًا. تم تعيين حالته إلى قيد الانتظار وإرسال رسالة لإعادة تعيين كلمة المرور — يجب على المستخدم إكمال التفعيل من خلالها.'));
                } else {
                  showToast.success(t('User invited successfully! Activation link generated.', 'تمت دعوة المستخدم بنجاح! تم إنشاء رابط التفعيل.'));
                }
              } catch (error) {
                setError(backendError(error));
                showToast.error(backendError(error));
                return;
              } finally {
                setBusy(false);
              }
            }}
          >
            <span className="ob-orb">
              <Mail />
            </span>
            <h2>{t('A little invite. A big beginning.', 'دعوة بسيطة. بداية كبيرة.')}</h2>
            <p>{t('They’ll get a personal activation link and a guided workspace setup.', 'سيحصل المستخدم على رابط تفعيل شخصي وخطوات لإعداد المساحة.')}</p>
            <label className="ob-field">
              {t('Full name', 'الاسم الكامل')}
              <input name="name" placeholder="Alex Morgan" maxLength={80} />
            </label>
            <label className="ob-field">
              {t('Work email', 'بريد العمل')}
              <input autoFocus name="email" required type="email" dir="ltr" placeholder="alex@company.com" />
            </label>
            <label className="ob-field">
              {t('Initial role', 'الدور الأولي')}
              <Combobox
                name="role"
                label={t('Initial role', 'الدور الأولي')}
                value={role}
                options={roles}
                dir={dir}
                onChange={setRole}
                portal={false}
              />
            </label>
            <div className="ob-callout">
              <ShieldCheck size={18} />
              <span>
                {t(
                  'Account activation includes email confirmation, password setup, and optional MFA.',
                  'يشمل التفعيل تأكيد البريد وإعداد كلمة المرور وخيار المصادقة متعددة العوامل.'
                )}
              </span>
            </div>
            {error && (
              <p className="ob-error" role="alert">
                {error}
              </p>
            )}
            <button className="ob-primary ob-full" type="submit" disabled={busy}>
              <Mail size={16} />
              {t('Send invite & activation link', 'إرسال دعوة ورابط التفعيل')}
            </button>
          </form>
        )}
      </dialog>

      {/* Delete User Confirmation Dialog */}
      <dialog
        ref={deleteDialog}
        className="ob-dialog ob-confirm-dialog"
        dir={dir}
        onCancel={() => setDeletingUser(null)}
        onClick={e => {
          if (e.target === e.currentTarget) setDeletingUser(null);
        }}
      >
        <button
          className="ob-close ob-icon"
          aria-label={t('Close dialog', 'إغلاق النافذة')}
          onClick={() => setDeletingUser(null)}
        >
          <X size={18} />
        </button>
        <div className="ob-confirm-body">
          <span className="ob-orb danger">
            <AlertTriangle size={22} />
          </span>
          <h2>{t('Delete user account?', 'هل أنت متأكد من حذف الحساب؟')}</h2>
          <p>
            {t(
              `Are you sure you want to delete ${deletingUser?.name || deletingUser?.email}? This action will immediately revoke their workspace access and cannot be undone.`,
              `هل أنت متأكد من حذف حساب ${deletingUser?.name || deletingUser?.email}؟ سيؤدي هذا الإجراء إلى إلغاء صلاحيات الوصول فوراً ولا يمكن التراجع عنه.`
            )}
          </p>
          <div className="ob-confirm-actions">
            <button
              type="button"
              className="ob-secondary"
              onClick={() => setDeletingUser(null)}
            >
              {t('Cancel', 'إلغاء')}
            </button>
            <button
              type="button"
              className="ob-danger"
              onClick={confirmDelete}
            >
              <Trash2 size={15} />
              {t('Delete user', 'حذف المستخدم')}
            </button>
          </div>
        </div>
      </dialog>
    </section>
  );
}
