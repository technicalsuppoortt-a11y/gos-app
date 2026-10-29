import React from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRightLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Copy,
  Eye,
  Layers,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react';
import type { RootState } from '../../store';
import { Combobox } from '../../components/ui/Combobox';
import type { Invite } from './onboarding-store';
import { useAdminUsers, manageAccount, activationUrl, getActivationLink } from '../../backend/adminUsers';
import { backendError } from '../../backend/firebase';
import { showToast } from '../../utils/toast';
import { safeDate } from '../../utils/safeDate';
import { switchToUser } from '../../backend/impersonation';
import { PLATFORM, useBillingIdentity, usePlans, useSubscription, useTrial, useWallet } from '../../backend/billing';
import './onboarding.css';

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #7C3AED, #7C3AED)',
  'linear-gradient(135deg, #3b82f6, #60a5fa)',
  'linear-gradient(135deg, #10b981, #34d399)',
  'linear-gradient(135deg, #f59e0b, #fbbf24)',
  'linear-gradient(135deg, #ec4899, #f472b6)',
  'linear-gradient(135deg, #7C3AED, #A78BFA)',
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
  onViewDetails,
  onDelete,
  ar,
}: {
  invite: Invite;
  copy: () => void;
  resend: () => void;
  onToggleStatus: () => void;
  onViewDetails: () => void;
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
    const frame = requestAnimationFrame(() => menu.current?.querySelector<HTMLElement>('button:not([disabled]),a')?.focus());
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
    const height = 230;
    setPosition({
      top: r.bottom + height > window.innerHeight ? Math.max(12, r.top - height) : r.bottom + 5,
      left: Math.max(12, Math.min(ar ? r.left : r.right - width, window.innerWidth - width - 12)),
    });
    setOpen(!open);
  };

  const isActive = invite.status === 'Active' || invite.status === 'Activated';
  const isPending = invite.status === 'Pending' || invite.status === 'Invited';

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
                const items = Array.from(menu.current!.querySelectorAll<HTMLElement>('[role=menuitem]:not([disabled])'));
                const index = items.indexOf(document.activeElement as HTMLElement);
                items[(index + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
              }
            }}
          >
            <button
              role="menuitem"
              onClick={() => {
                onViewDetails();
                setOpen(false);
              }}
            >
              <Eye size={14} />
              {t('View Details', 'عرض التفاصيل')}
            </button>
            <button
              role="menuitem"
              disabled={isPending}
              onClick={() => {
                onToggleStatus();
                setOpen(false);
              }}
            >
              {isActive ? <UserX size={14} /> : <UserCheck size={14} />}
              {isPending ? t('Awaiting first sign-in', 'بانتظار تسجيل الدخول الأول') : isActive ? t('Deactivate account', 'تعطيل الحساب') : t('Activate account', 'تفعيل الحساب')}
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
            <InvitationLink
              role="menuitem"
              userId={invite.id}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
            >
              <ArrowUpRight size={14} />
              {t('Open activation', 'فتح صفحة التفعيل')}
            </InvitationLink>
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

function InvitationLink({ userId, ...props }: React.ComponentProps<'a'> & { userId: string }) {
  const [link, setLink] = React.useState(() => activationUrl(userId));
  React.useEffect(() => {
    let active = true;
    getActivationLink(userId).then(value => { if (active) setLink(value); }).catch(error => { if (active) showToast.error(backendError(error)); });
    return () => { active = false; };
  }, [userId]);
  return <a {...props} href={link || undefined} aria-disabled={!link} onClick={event => { if (!link) { event.preventDefault(); return; } props.onClick?.(event); }}/>;
}

function SubAccountDetailsModal({
  user,
  onClose,
  onToggleStatus,
  onCopyActivation,
  onSwitchUser,
  ar,
  isFreePlanEnabled,
  freePlanName,
  busyUserId,
}: {
  user: Invite | null;
  onClose: () => void;
  onToggleStatus: (user: Invite) => Promise<void>;
  onCopyActivation: (id: string, email?: string) => Promise<void>;
  onSwitchUser: (user: Invite) => Promise<void>;
  ar: boolean;
  isFreePlanEnabled: boolean;
  freePlanName: string;
  busyUserId: string | null;
}) {
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  const dir = ar ? 'rtl' : 'ltr';
  const sub = useSubscription(user?.id ?? null);
  const wallet = useWallet(user?.id ?? null);

  if (!user) return null;

  const currentStatus =
    user.status === 'Deactivated' || user.status === 'Inactive'
      ? 'Inactive'
      : user.status === 'Pending' || user.status === 'Invited'
      ? 'Pending'
      : 'Active';

  const isActive = currentStatus === 'Active';
  const isPending = currentStatus === 'Pending';
  const createdDate = safeDate(user.created);
  const activatedDate = user.activatedAt ? safeDate(user.activatedAt) : null;
  const isBusy = busyUserId === user.id;

  const statusName = (s: string) =>
    ({
      Active: t('Active', 'نشط'),
      Pending: t('Pending Activation', 'قيد انتظار التفعيل'),
      Inactive: t('Inactive', 'غير نشط'),
      Deactivated: t('Inactive', 'غير نشط'),
    }[s] || s);

  const availableCredits = wallet.data?.balance ?? user.credits ?? 0;
  const subPlanName = sub.data?.plan?.name
    ? (typeof sub.data.plan.name === 'object'
        ? (ar ? sub.data.plan.name.ar : sub.data.plan.name.en)
        : sub.data.plan.name)
    : '';

  const planName =
    subPlanName ||
    (isPending
      ? isFreePlanEnabled
        ? `${freePlanName || t('Free Plan', 'الخطة المجانية')} (${t('Auto-assigned', 'تلقائي')})`
        : t('Mandatory Plan Selection', 'اختيار خطة إلزامي')
      : t('No Active Plan', 'لا توجد خطة نشطة'));

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="ob-details-overlay"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="ob-dialog ob-details-dialog"
        dir={dir}
        role="dialog"
        aria-modal="true"
        aria-label={t('Sub-Account Details', 'تفاصيل الحساب الفرعي')}
      >
        <button className="ob-close ob-icon" aria-label={t('Close details', 'إغلاق التفاصيل')} onClick={onClose}>
          <X size={19} />
        </button>

        {/* Header */}
      <div className="ob-details-header">
        <div>
          <span className="ob-eyebrow">{t('SUB-ACCOUNT DETAILS', 'تفاصيل الحساب الفرعي')}</span>
          <h2 style={{ margin: '4px 0 0', fontSize: '22px' }}>{user.name || user.email.split('@')[0]}</h2>
          <p style={{ margin: '3px 0 0', fontSize: '12px' }}>
            {t('Detailed profile, subscription tier, credits, and permissions.', 'الملف الشخصي، فئة الاشتراك، رصيد النقاط، والصلاحيات.')}
          </p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="ob-details-profile-card">
        <span
          className="ob-avatar"
          style={{
            ...getAvatarStyle(user.name || user.email),
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            fontSize: '16px',
            fontWeight: 700,
          }}
        >
          {getInitials(user.name || user.email)}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <b style={{ fontSize: '15px', color: 'var(--ob-ink)' }}>{user.name || user.email.split('@')[0]}</b>
            <span className="ob-badge" style={{ fontSize: '10px' }}>
              {user.role === 'ADMIN' ? t('Admin', 'مسؤول') : t('Team Member', 'عضو فريق')}
            </span>
          </div>
          <div dir="ltr" style={{ fontSize: '12px', color: 'var(--ob-muted)', margin: '2px 0 4px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user.email}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--ob-muted)' }}>
            <span>UID:</span>
            <code style={{ fontSize: '10px', background: 'var(--ob-surface)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--ob-border)' }}>
              {user.id}
            </code>
            <button
              type="button"
              className="ob-text-link"
              onClick={() => {
                navigator.clipboard.writeText(user.id);
                showToast.success(t('User ID copied', 'تم نسخ معرف المستخدم'));
              }}
              title={t('Copy UID', 'نسخ المعرف')}
            >
              <Copy size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* Status & Interactive Toggle Card */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '14px 16px',
          borderRadius: '12px',
          background: 'var(--ob-surface)',
          border: '1px solid var(--ob-border)',
          marginBottom: '18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            disabled={isPending || isBusy}
            onClick={() => onToggleStatus(user)}
            className={`ob-toggle ${isActive ? 'on' : ''}`}
            style={{
              cursor: isPending || isBusy ? 'not-allowed' : 'pointer',
              opacity: isPending ? 0.5 : 1,
            }}
            title={
              isPending
                ? t('Pending user sign-in', 'بانتظار تسجيل دخول المستخدم')
                : isActive
                ? t('Click to deactivate account', 'انقر لتعطيل الحساب')
                : t('Click to activate account', 'انقر لتفعيل الحساب')
            }
          >
            <span />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ob-ink)' }}>
                {t('Account Access Status', 'حالة الوصول للحساب')}
              </span>
              <span className={`ob-badge ${isActive ? 'green' : isPending ? 'amber' : 'deactivated'}`}>
                <span className="ob-status-dot" />
                {statusName(currentStatus)}
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--ob-muted)' }}>
              {isActive
                ? t('Sub-account is active with full workspace privileges.', 'الحساب الفرعي نشط ويتمتع بجميع صلاحيات مساحة العمل.')
                : isPending
                ? t('User has been invited but has not yet activated their password.', 'تمت دعوة المستخدم ولم يقم بإعداد كلمة المرور بعد.')
                : t('Sub-account is deactivated and blocked from logging in or using APIs.', 'الحساب معطل وممنوع من تسجيل الدخول أو استخدام الخدمات.')}
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Plan Tier & Credits */}
      <div className="ob-details-grid">
        {/* Subscription & Tier */}
        <div className="ob-details-section">
          <div className="ob-details-section-title">
            <Layers size={14} />
            <span>{t('Subscription Tier', 'فئة الاشتراك')}</span>
          </div>
          <div className="ob-details-meta-row">
            <span className="ob-details-meta-label">{t('Current Plan', 'الخطة الحالية')}</span>
            <span className="ob-details-meta-value">{planName}</span>
          </div>
          <div className="ob-details-meta-row">
            <span className="ob-details-meta-label">{t('Billing Status', 'حالة الفوترة')}</span>
            <span className="ob-details-meta-value">
              {sub.data?.status ? (
                <span className="ob-badge green" style={{ fontSize: '9px', padding: '2px 6px' }}>
                  {sub.data.status.toUpperCase()}
                </span>
              ) : isPending ? (
                <span className="ob-badge amber" style={{ fontSize: '9px', padding: '2px 6px' }}>
                  {isFreePlanEnabled ? t('Pending Free Auto-Assign', 'بانتظار التعيين التلقائي') : t('Mandatory Checkout', 'دفع إلزامي')}
                </span>
              ) : (
                <span className="ob-badge" style={{ fontSize: '9px', padding: '2px 6px' }}>
                  {t('No Plan', 'بدون خطة')}
                </span>
              )}
            </span>
          </div>
          <div className="ob-details-meta-row">
            <span className="ob-details-meta-label">{t('Onboarding Policy', 'سياسة التسجيل')}</span>
            <span className="ob-details-meta-value" style={{ fontSize: '11px', color: isFreePlanEnabled ? '#059669' : '#d97706' }}>
              {isFreePlanEnabled ? t('Scenario A: Free Entitlements', 'السيناريو أ: ميزات مجانية') : t('Scenario B: Mandatory Paywall', 'السيناريو ب: دفع إلزامي')}
            </span>
          </div>
        </div>

        {/* Allocated Credits & Wallet */}
        <div className="ob-details-section">
          <div className="ob-details-section-title">
            <Coins size={14} />
            <span>{t('Credits & Usage', 'النقاط والاستخدام')}</span>
          </div>
          <div className="ob-details-meta-row">
            <span className="ob-details-meta-label">{t('Available Balance', 'الرصيد المتاح')}</span>
            <span className="ob-details-meta-value" style={{ color: '#7C3AED', fontSize: '14px', fontWeight: 700 }}>
              {availableCredits.toLocaleString()} {t('Credits', 'نقطة')}
            </span>
          </div>
          <div className="ob-details-meta-row">
            <span className="ob-details-meta-label">{t('Lifetime Allocated', 'إجمالي المشحون')}</span>
            <span className="ob-details-meta-value">{(wallet.data?.lifetimeAllocated ?? 0).toLocaleString()}</span>
          </div>
          <div className="ob-details-meta-row">
            <span className="ob-details-meta-label">{t('Lifetime Consumed', 'المستهلك')}</span>
            <span className="ob-details-meta-value">{(wallet.data?.lifetimeSpent ?? 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Assigned Permissions & Capabilities */}
      <div className="ob-details-section" style={{ marginBottom: '18px' }}>
        <div className="ob-details-section-title">
          <ShieldCheck size={14} />
          <span>{t('Assigned Capabilities & Workspace Permissions', 'الصلاحيات المخصصة وميزات مساحة العمل')}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', marginTop: '6px' }}>
          {[
            { key: 'crm', label: t('CRM & Contacts', 'إدارة العملاء') },
            { key: 'bookings', label: t('Bookings & Schedule', 'الحجوزات والتقويم') },
            { key: 'copilot', label: t('AI Copilot', 'المساعد الذكي') },
            { key: 'support', label: t('Support Desk', 'مكتب الدعم') },
            { key: 'invoicing', label: t('Invoicing & Orders', 'الفواتير والطلبات') },
          ].map(tool => (
            <div
              key={tool.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 10px',
                borderRadius: '8px',
                background: 'var(--ob-soft)',
                border: '1px solid var(--ob-border)',
                fontSize: '11px',
                color: isActive ? 'var(--ob-ink)' : 'var(--ob-muted)',
              }}
            >
              <CheckCircle2 size={13} style={{ color: isActive ? '#059669' : 'var(--ob-muted)', flexShrink: 0 }} />
              <span>{tool.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Logs & Timeline */}
      <div className="ob-details-section">
        <div className="ob-details-section-title">
          <Clock size={14} />
          <span>{t('Activity Logs & Timeline', 'سجل النشاط والجدول الزمني')}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '11px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#7C3AED', marginTop: '4px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <b style={{ color: 'var(--ob-ink)' }}>{t('Invitation Created', 'تم إنشاء الدعوة')}</b>
              <div style={{ color: 'var(--ob-muted)', fontSize: '10px' }}>
                {createdDate
                  ? new Intl.DateTimeFormat(ar ? 'ar-EG' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(createdDate)
                  : t('N/A', 'غير متاح')}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: activatedDate ? '#10b981' : '#f59e0b', marginTop: '4px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <b style={{ color: 'var(--ob-ink)' }}>
                {activatedDate ? t('Account Activated & Verified', 'تم تفعيل الحساب والتحقق') : t('Awaiting Password Activation', 'بانتظار تفعيل كلمة المرور')}
              </b>
              <div style={{ color: 'var(--ob-muted)', fontSize: '10px' }}>
                {activatedDate
                  ? new Intl.DateTimeFormat(ar ? 'ar-EG' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(activatedDate)
                  : t('User has received activation link and password reset instructions', 'المستخدم استلم رابط التفعيل وتعليمات تعيين كلمة المرور')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="ob-details-actions">
        {user.role === 'USER' && isActive && (
          <button
            type="button"
            className="ob-primary"
            style={{ padding: '8px 14px', fontSize: '12px' }}
            onClick={() => onSwitchUser(user)}
          >
            <ArrowRightLeft size={14} />
            {t('Switch to Sub-Account', 'التبديل إلى الحساب الفرعي')}
          </button>
        )}
        <button
          type="button"
          className="ob-secondary"
          style={{ padding: '8px 14px', fontSize: '12px' }}
          onClick={() => onCopyActivation(user.id, user.email)}
        >
          <Copy size={14} />
          {t('Copy Activation Link', 'نسخ رابط التفعيل')}
        </button>
        <button
          type="button"
          className="ob-secondary"
          disabled={isPending || isBusy}
          style={{ padding: '8px 14px', fontSize: '12px' }}
          onClick={() => onToggleStatus(user)}
        >
          {isActive ? <UserX size={14} /> : <UserCheck size={14} />}
          {isActive ? t('Deactivate', 'تعطيل') : t('Activate', 'تفعيل')}
        </button>
        <button
          type="button"
          className="ob-secondary"
          style={{ padding: '8px 14px', fontSize: '12px', marginInlineStart: 'auto' }}
          onClick={onClose}
        >
          {t('Close', 'إغلاق')}
        </button>
      </div>
    </div>
  </div>,
  document.body
);
}

export function AdminUsers() {
  const navigate = useNavigate();
  const [switchingUser, setSwitchingUser] = React.useState<string | null>(null);
  const { invites, loading, error: loadError } = useAdminUsers();
  const [busy, setBusy] = React.useState(false);
  const [busyUserId, setBusyUserId] = React.useState<string | null>(null);
  const [selectedUserDetails, setSelectedUserDetails] = React.useState<Invite | null>(null);
  const ar = useSelector((s: RootState) => s.ui.language === 'ar');
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  const dir = ar ? 'rtl' : 'ltr';

  // Workspace plans to evaluate onboarding scenario (Free Plan vs Mandatory Checkout)
  const identity = useBillingIdentity();
  const providerOwnerId = identity.role === 'SUPER_ADMIN' ? PLATFORM : identity.uid;
  const { data: trialDoc } = useTrial(providerOwnerId);
  const { data: plans } = usePlans(providerOwnerId, true);

  const customFreePlan = React.useMemo(() => {
    return plans.find(p => p.kind === 'plan' && p.price === 0 && p.status === 'active' && p.visible !== false) || null;
  }, [plans]);

  // Trial is enabled if explicitly enabled in trialDoc, OR enabled by default if trialDoc has not been configured/saved yet
  const isTrialEnabled = React.useMemo(() => {
    if (trialDoc) {
      return trialDoc.enabled !== false && trialDoc.status === 'active';
    }
    return true;
  }, [trialDoc]);

  const isFreePlanEnabled = !!customFreePlan || isTrialEnabled;

  const freePlanName = React.useMemo(() => {
    if (customFreePlan) {
      if (typeof customFreePlan.name === 'object' && customFreePlan.name !== null) {
        return ar ? (customFreePlan.name.ar || customFreePlan.name.en) : (customFreePlan.name.en || customFreePlan.name.ar);
      }
      return typeof customFreePlan.name === 'string' ? customFreePlan.name : '';
    }
    if (trialDoc && trialDoc.name) {
      if (typeof trialDoc.name === 'object') {
        return ar ? (trialDoc.name.ar || trialDoc.name.en) : (trialDoc.name.en || trialDoc.name.ar);
      }
      return typeof trialDoc.name === 'string' ? trialDoc.name : '';
    }
    return t('Free trial', 'تجربة مجانية');
  }, [customFreePlan, trialDoc, ar, t]);

  const [open, setOpen] = React.useState(false);
  const [sent, setSent] = React.useState<Invite | null>(null);
  const [setupLink, setSetupLink] = React.useState('');
  const [copiedLink, setCopiedLink] = React.useState(false);
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

  React.useEffect(() => {
    let active = true;
    setSetupLink(sent ? activationUrl(sent.id) : '');
    if (sent) getActivationLink(sent.id).then(link => { if (active) setSetupLink(link); }).catch(error => { if (active) showToast.error(backendError(error)); });
    return () => { active = false; };
  }, [sent?.id]);

  const copy = async (id: string, _email?: string) => {
    try {
      const link = await getActivationLink(id);
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
    if (invite.status === 'Deactivated' || invite.status === 'Inactive') return 'Inactive';
    if (invite.status === 'Pending' || invite.status === 'Invited') return 'Pending';
    if (invite.status === 'Active' || invite.status === 'Activated') return 'Active';
    return invite.status;
  };

  const sentStatus = sent ? getStatus(invites.find(invite => invite.id === sent.id) || sent) : 'Pending';

  const statusName = (value: string) =>
    ({
      All: t('All statuses', 'كل الحالات'),
      Active: t('Active', 'نشط'),
      Pending: t('Pending', 'قيد الانتظار'),
      Inactive: t('Inactive', 'غير نشط'),
      Deactivated: t('Inactive', 'غير نشط'),
    }[value] || value);

  const roles = [
    { value: 'ADMIN', label: t('Admin', 'مسؤول') },
    { value: 'USER', label: t('Team member', 'عضو الفريق') },
  ];

  const handleToggleStatus = async (invite: Invite) => {
    if (busyUserId) return;
    const isCurrentlyActive = invite.status === 'Active' || invite.status === 'Activated';
    const nextStatus = isCurrentlyActive ? 'Inactive' : 'Active';
    setBusyUserId(invite.id);
    try {
      await manageAccount('status', { id: invite.id, status: nextStatus });
      if (selectedUserDetails && selectedUserDetails.id === invite.id) {
        setSelectedUserDetails(prev => (prev ? { ...prev, status: nextStatus } : null));
      }
      if (nextStatus === 'Active') {
        showToast.success(t(`Activated account for ${invite.name || invite.email}`, `تم تفعيل حساب ${invite.name || invite.email}`));
      } else {
        showToast.success(t(`Deactivated account for ${invite.name || invite.email}`, `تم تعطيل حساب ${invite.name || invite.email}`));
      }
    } catch (error) {
      showToast.error(backendError(error));
    } finally {
      setBusyUserId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deletingUser) return;
    const targetId = deletingUser.id;
    const targetName = deletingUser.name || deletingUser.email;
    try {
      await manageAccount('delete', { id: targetId });
    } catch (error) {
      showToast.error(backendError(error));
      return;
    }
    if (selectedUserDetails?.id === targetId) {
      setSelectedUserDetails(null);
    }
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
      <div className="sr-only" role="status" aria-live="polite">{loading ? t('Loading accounts…', 'جارٍ تحميل الحسابات…') : loadError}</div>
      {loadError && (
        <div className="p-3 mb-4 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs flex items-center justify-between border border-red-200 dark:border-red-900/50">
          <span>{loadError}</span>
          <button type="button" onClick={() => window.location.reload()} className="underline font-medium hover:opacity-80">
            {t('Retry', 'إعادة المحاولة')}
          </button>
        </div>
      )}
      <div className="ob-page-head">
        <div>
          <span className="ob-eyebrow">{t('SUB ACCOUNTS MANAGEMENT', 'إدارة الحسابات الفرعية')}</span>
          <h1>{t('Sub Accounts', 'الحسابات الفرعية')}</h1>
          <p>{t('Invite and manage sub-accounts. Give your team dedicated access to your workspace.', 'ادعُ الحسابات الفرعية وأدرها. امنح فريقك وصولاً مخصصاً لمساحة عملك.')}</p>
        </div>
        <button className="ob-primary" onClick={create}>
          <Plus size={17} />
          {t('Invite Sub-Account', 'دعوة حساب فرعي')}
        </button>
      </div>

      <div className="ob-stats">
        {[
          [Users, t('Sub Accounts', 'الحسابات الفرعية'), invites.length],
          [Mail, t('Pending invitations', 'الدعوات المعلقة'), pendingCount],
          [ShieldCheck, t('Active Accounts', 'الحسابات النشطة'), activeCount],
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
            {t('Sub Accounts', 'الحسابات الفرعية')} <span>{invites.length}</span>
          </h2>
          <div className="ob-table-filters">
            <Combobox
              label={t('Filter sub-accounts by status', 'تصفية الحسابات حسب الحالة')}
              value={filter}
              dir={dir}
              options={['All', 'Active', 'Pending', 'Inactive'].map(value => ({
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
                aria-label={t('Search sub-accounts', 'البحث عن الحسابات الفرعية')}
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
                <th>{t('Sub-Account', 'الحساب الفرعي')}</th>
                <th>{t('Initial role', 'الدور')}</th>
                <th>{t('Status', 'الحالة')}</th>
                <th>{t('Invited on', 'تاريخ الدعوة')}</th>
                <th className="ob-actions-column">{t('Actions', 'الإجراءات')}</th>
              </tr>
            </thead>
            <tbody>
              {pagedUsers.map(i => {
                const currentStatus = getStatus(i);
                const created = safeDate(i.created);
                const isUserActive = currentStatus === 'Active';
                const isUserPending = currentStatus === 'Pending';
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
                        onChange={async value => {
                          try {
                            await manageAccount('role', { id: i.id, role: value });
                            showToast.success(t(`Role updated for ${i.name || i.email}`, `تم تحديث دور ${i.name || i.email}`));
                          } catch (error) {
                            showToast.error(backendError(error));
                          }
                        }}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isUserActive}
                          disabled={isUserPending || busyUserId === i.id}
                          onClick={() => handleToggleStatus(i)}
                          className={`ob-toggle ${isUserActive ? 'on' : ''}`}
                          style={{
                            cursor: isUserPending || busyUserId === i.id ? 'not-allowed' : 'pointer',
                            opacity: isUserPending ? 0.45 : 1,
                            position: 'relative',
                            transition: 'all 0.2s ease',
                          }}
                          title={
                            isUserPending
                              ? t('Awaiting first sign-in before activation', 'بانتظار تسجيل الدخول الأول قبل التفعيل')
                              : isUserActive
                              ? t('Click to deactivate sub-account', 'انقر لتعطيل الحساب الفرعي')
                              : t('Click to activate sub-account', 'انقر لتفعيل الحساب الفرعي')
                          }
                        >
                          <span />
                        </button>
                        <span
                          className={`ob-badge ${
                            isUserActive
                              ? 'green'
                              : isUserPending
                              ? 'amber'
                              : 'deactivated'
                          }`}
                        >
                          <span className="ob-status-dot" />
                          {statusName(currentStatus)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <time dateTime={created?.toISOString()}>
                        {created ? new Intl.DateTimeFormat(ar ? 'ar-EG' : 'en-GB', {
                          timeZone: 'Africa/Cairo',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        }).format(created) : t('N/A', 'غير متاح')}
                      </time>
                    </td>
                    <td className="ob-actions-column">
                      <button
                        type="button"
                        className="ob-icon"
                        title={t('Switch to user dashboard', 'التبديل إلى لوحة المستخدم')}
                        aria-label={`${t('Switch to', 'التبديل إلى')} ${i.name || i.email}`}
                        disabled={!!switchingUser || currentStatus !== 'Active' || i.role !== 'USER'}
                        onClick={async () => {
                          setSwitchingUser(i.id);
                          try {
                            await switchToUser(i.id, i.tenantId);
                            navigate('/dashboard', { replace: true });
                          } catch (error) {
                            showToast.error(backendError(error));
                          } finally {
                            setSwitchingUser(null);
                          }
                        }}
                      >
                        <ArrowRightLeft size={18} />
                      </button>
                      <UserActions
                        ar={ar}
                        invite={i}
                        copy={() => copy(i.id, i.email)}
                        resend={() => {
                          setSent(i);
                          setOpen(true);
                        }}
                        onToggleStatus={() => handleToggleStatus(i)}
                        onViewDetails={() => setSelectedUserDetails(i)}
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
              <h3>{t('Your workspace starts with sub-accounts', 'مساحة عملك تبدأ بالحسابات الفرعية')}</h3>
              <p>{t('Invite team members. They will activate their account and access dedicated tools.', 'ادعُ أفراد فريقك. سيقومون بتفعيل حساباتهم والوصول للأدوات المخصصة.')}</p>
              <button className="ob-secondary" onClick={create}>
                <Plus size={16} />
                {t('Invite your first sub-account', 'دعوة أول حساب فرعي')}
              </button>
            </div>
          )}

          {!!invites.length && !filtered.length && (
            <p className="ob-empty">{t('No sub-accounts match your search.', 'لا توجد حسابات فرعية تطابق بحثك.')}</p>
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
                  `Showing ${startIndex + 1}–${endIndex} of ${filtered.length} sub-accounts`,
                  `عرض ${startIndex + 1}–${endIndex} من ${filtered.length} حساب فرعي`
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

      {/* Sub-Account Comprehensive Details Modal */}
      {selectedUserDetails && (
        <SubAccountDetailsModal
          user={selectedUserDetails}
          onClose={() => setSelectedUserDetails(null)}
          onToggleStatus={handleToggleStatus}
          onCopyActivation={copy}
          onSwitchUser={async user => {
            setSwitchingUser(user.id);
            try {
              await switchToUser(user.id, user.tenantId);
              navigate('/dashboard', { replace: true });
            } catch (error) {
              showToast.error(backendError(error));
            } finally {
              setSwitchingUser(null);
            }
          }}
          ar={ar}
          isFreePlanEnabled={isFreePlanEnabled}
          freePlanName={freePlanName}
          busyUserId={busyUserId}
        />
      )}

      {/* Add / Invite Sub-Account Modal */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
              <span className="ob-orb success" style={{ margin: 0, width: '42px', height: '42px', flexShrink: 0 }}>
                <Check size={20} strokeWidth={2.5} />
              </span>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, letterSpacing: '-0.5px' }}>
                  {t('Sub-Account Provisioned & Ready', 'تم إنشاء الحساب الفرعي بنجاح')}
                </h2>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--ob-muted, #64748b)' }}>
                  {t('The user profile is ready for activation and password setup.', 'ملف المستخدم جاهز للتفعيل وتعيين كلمة المرور.')}
                </p>
              </div>
            </div>

            {/* Dynamic Plan Onboarding Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '10px',
                background: isFreePlanEnabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                border: isFreePlanEnabled ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(245, 158, 11, 0.25)',
                fontSize: '11px',
                color: isFreePlanEnabled ? '#065f46' : '#92400e',
                margin: '12px 0',
              }}
            >
              {isFreePlanEnabled ? <Sparkles size={15} style={{ color: '#059669', flexShrink: 0 }} /> : <AlertCircle size={15} style={{ color: '#d97706', flexShrink: 0 }} />}
              <span style={{ fontWeight: 500 }}>
                {isFreePlanEnabled
                  ? t(`Scenario A Active: Enrolled into Free Plan ("${freePlanName || 'Free Tier'}") automatically upon activation.`, `السيناريو أ مفعّل: سيتم إدراجه تلقائياً في الخطة المجانية ("${freePlanName || 'الخطة المجانية'}") عند التفعيل.`)
                  : t('Scenario B Active: Mandatory subscription flow. User will select a paid plan on initial sign-in.', 'السيناريو ب مفعّل: مسار اشتراك إلزامي. سيُطلب من المستخدم اختيار خطة مدفوعة عند تسجيل الدخول.')}
              </span>
            </div>

            {/* User Profile & Status Pill Card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '12px 14px',
                background: 'var(--ob-soft, #f8fafc)',
                border: '1px solid var(--ob-border, #e2e8f0)',
                borderRadius: '12px',
                margin: '14px 0 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <span
                  className="ob-avatar"
                  style={{
                    ...getAvatarStyle(sent.email),
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  {getInitials(sent.name || sent.email)}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div
                    dir="ltr"
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--ob-foreground, #0f172a)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {sent.email}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--ob-muted, #64748b)' }}>
                    {sent.role === 'ADMIN' ? t('Platform Administrator', 'مسؤول المنصة') : t('Sub-Account Member', 'عضو حساب فرعي')}
                  </div>
                </div>
              </div>

              <span
                className="ob-badge"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: sentStatus === 'Active' ? '#ecfdf5' : sentStatus === 'Pending' ? '#fef3c7' : '#fef2f2',
                  color: sentStatus === 'Active' ? '#047857' : sentStatus === 'Pending' ? '#92400e' : '#b91c1c',
                  borderColor: sentStatus === 'Active' ? '#a7f3d0' : sentStatus === 'Pending' ? '#fde68a' : '#fecaca',
                  flexShrink: 0,
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: sentStatus === 'Active' ? '#059669' : sentStatus === 'Pending' ? '#d97706' : '#dc2626' }} />
                {t('Status:', 'الحالة:')} {statusName(sentStatus)}
              </span>
            </div>

            {/* Direct Link Field with Embedded Copy Action */}
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--ob-foreground, #334155)',
                  marginBottom: '6px',
                }}
              >
                {t('Direct Activation / Password Setup Link', 'رابط التفعيل وإعداد كلمة المرور المباشر')}
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--ob-card, #fff)',
                  border: '1px solid var(--ob-border, #cbd5e1)',
                  borderRadius: '10px',
                  padding: '4px 4px 4px 12px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  gap: '8px',
                }}
              >
                <input
                  dir="ltr"
                  readOnly
                  value={setupLink}
                  placeholder={t('Preparing secure activation link…', 'جارٍ إعداد رابط التفعيل الآمن…')}
                  onFocus={e => e.target.select()}
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '12px',
                    color: 'var(--ob-foreground, #334155)',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    minWidth: 0,
                  }}
                />
                <button
                  type="button"
                  onClick={async () => {
                    await copy(sent.id, sent.email);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2200);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '7px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: copiedLink ? '#059669' : '#7C3AED',
                    background: copiedLink ? '#ecfdf5' : '#eef2ff',
                    border: copiedLink ? '1px solid #a7f3d0' : '1px solid #e0e7ff',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                >
                  {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedLink ? t('Copied!', 'تم النسخ!') : t('Copy', 'نسخ')}</span>
                </button>
              </div>
            </div>

            {/* Actions Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '18px' }}>
              <InvitationLink
                className="ob-secondary"
                userId={sent.id}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  margin: 0,
                  height: '42px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                {t('Preview setup', 'معاينة التفعيل')}
                <ArrowUpRight size={15} />
              </InvitationLink>

              <button
                type="button"
                className="ob-primary"
                style={{
                  margin: 0,
                  height: '42px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
                onClick={() => {
                  setOpen(false);
                  setSent(null);
                  setError('');
                  setCopiedLink(false);
                }}
              >
                {t('Done', 'تم')}
              </button>
            </div>

            <p className="ob-demo-note" style={{ marginTop: '16px', fontSize: '11px', color: 'var(--ob-muted, #94a3b8)' }}>
              {t('When the user sets their password and logs in, their status automatically transitions from Pending to Active.', 'عندما يقوم المستخدم بإعداد كلمة المرور وتسجيل الدخول، ستتغير حالته تلقائياً من Pending إلى Active.')}
            </p>
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
                setSent({ ...invite, id: createdId, status: result?.status || 'Pending', tenantId: result?.tenantId });
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
            <h2>{t('Invite Sub-Account', 'دعوة حساب فرعي')}</h2>
            <p>{t('They’ll get a personal activation link and a guided workspace setup.', 'سيحصل المستخدم على رابط تفعيل شخصي وخطوات لإعداد المساحة.')}</p>

            {/* Dynamic Plan Onboarding Information Box */}
            {isFreePlanEnabled ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px 14px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '10px',
                  marginBottom: '16px',
                  fontSize: '11px',
                  color: '#065f46',
                }}
              >
                <Sparkles size={16} style={{ color: '#059669', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <b style={{ display: 'block', fontWeight: 600, color: '#047857', marginBottom: '2px' }}>
                    {t('Scenario A: Free Plan Auto-Assignment Enabled', 'السيناريو أ: التعيين التلقائي للخطة المجانية مفعّل')}
                  </b>
                  <span style={{ color: 'var(--ob-secondary, #475569)', lineHeight: 1.5 }}>
                    {t(
                      `Your workspace has an active Free Plan ("${freePlanName || 'Free Plan'}"). Upon activation, this sub-account will automatically be enrolled and granted immediate dashboard access.`,
                      `تحتوي مساحة عملك على خطة مجانية نشطة ("${freePlanName || 'الخطة المجانية'}"). عند التفعيل، سيتم إدراج هذا الحساب الفرعي تلقائياً ومنحه وصولاً فورياً للوحة التحكم.`
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px 14px',
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: '10px',
                  marginBottom: '16px',
                  fontSize: '11px',
                  color: '#92400e',
                }}
              >
                <AlertCircle size={16} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <b style={{ display: 'block', fontWeight: 600, color: '#b45309', marginBottom: '2px' }}>
                    {t('Scenario B: Mandatory Plan Selection & Checkout', 'السيناريو ب: اختيار ودفع اشتراك إلزامي')}
                  </b>
                  <span style={{ color: 'var(--ob-secondary, #475569)', lineHeight: 1.5 }}>
                    {t(
                      'No Free Plan is enabled for your workspace. This invited sub-account will be directed into a mandatory plan subscription flow upon login, locking standard dashboard features until a plan is selected.',
                      'لا توجد خطة مجانية مفعلة لمساحة عملك. سيتم توجيه الحساب الفرعي المدعو لمسار اشتراك إلزامي عند تسجيل الدخول، مع حظر أدوات لوحة التحكم حتى اختيار خطة ودفعها.'
                    )}
                  </span>
                  <div style={{ marginTop: '5px' }}>
                    <Link to="/admin/plans" style={{ color: '#7C3AED', fontWeight: 600, textDecoration: 'underline' }}>
                      {t('Configure Free Plan in Plans Management →', 'إعداد خطة مجانية في إدارة الخطط ←')}
                    </Link>
                  </div>
                </div>
              </div>
            )}

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
