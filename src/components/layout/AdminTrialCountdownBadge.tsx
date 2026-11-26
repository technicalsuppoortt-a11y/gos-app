import React, { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { usePrimarySubscription } from '../../backend/billing';
import { isLaunchBrandPreview } from '../../branding/launchBrandPreview';
import { formatDisplayMessage, translateText, useUILanguage } from '../../i18n/display';
import { computeAdminTrialRemainingDays, formatAdminTrialDate } from './adminTrialCountdown';

export const AdminTrialCountdownBadge: React.FC = () => {
  const language = useUILanguage();
  const navigate = useNavigate();
  const role = useSelector((state: RootState) => state.auth.role);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const impersonation = useSelector((state: RootState) => state.auth.impersonation);

  const inPreview = isLaunchBrandPreview();
  const adminOwnerId = !inPreview
    ? role === 'ADMIN'
      ? currentUser?.id ?? null
      : impersonation?.role === 'ADMIN'
        ? impersonation.user?.id ?? null
        : null
    : null;

  const { data: subscription } = usePrimarySubscription(adminOwnerId);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!adminOwnerId) return;
    const refresh = () => setNowMs(Date.now());
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [adminOwnerId]);

  const info = adminOwnerId ? computeAdminTrialRemainingDays(subscription, nowMs) : null;
  if (!info) return null;

  const countText = String(info.daysLeft);
  const fullLabel =
    info.daysLeft === 1
      ? translateText('1 day left in free trial')
      : formatDisplayMessage('{{0}} days left in free trial', countText);
  const compactLabel =
    info.daysLeft === 1
      ? translateText('1d left')
      : formatDisplayMessage('{{0}}d left', countText);
  const endDateText = formatAdminTrialDate(info.endsAt, language);
  const endsLabel = formatDisplayMessage('Free trial ends {{0}}', endDateText);
  const tooltip = `${fullLabel} · ${endsLabel}`;

  const handleClick = () => {
    navigate(role === 'ADMIN' ? '/admin/plans?area=mine' : '/dashboard/settings/billing');
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`layout-admin-trial-badge${info.endingSoon ? ' is-ending-soon' : ''}`}
      data-days-left={info.daysLeft}
      aria-label={tooltip}
      title={tooltip}
    >
      <CalendarClock size={14} className="layout-admin-trial-badge__icon" aria-hidden="true" />
      <span className="layout-admin-trial-badge__full">{fullLabel}</span>
      <span className="layout-admin-trial-badge__compact" aria-hidden="true">
        {compactLabel}
      </span>
    </button>
  );
};
