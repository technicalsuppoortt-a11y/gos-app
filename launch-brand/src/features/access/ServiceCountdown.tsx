import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { servicePeriod, type ServiceEntitlement } from './servicePeriod';

const RADIUS = 13;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Arabic counted noun for "day": 1 يوم واحد, 2 يومان, 3–10 أيام, 11+ يومًا.
function arabicDays(count: number) {
  const n = count.toLocaleString('ar-EG');
  if (count === 1) return 'يوم واحد';
  if (count === 2) return 'يومان';
  const lastTwo = count % 100;
  return lastTwo >= 3 && lastTwo <= 10 ? `${n} أيام` : `${n} يومًا`;
}
const englishDays = (count: number) => `${count.toLocaleString('en-US')} ${count === 1 ? 'day' : 'days'}`;

/** Days left in the student's service period, counting down to serviceExpiresAt. */
export default function ServiceCountdown() {
  const entitlement = useStore(state => state.user?.serviceEntitlement as ServiceEntitlement | null | undefined);
  const isAr = useStore(state => state.language === 'ar');
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);

  const period = servicePeriod(entitlement, now);
  if (!period) return null;

  const date = period.expiresAt.toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const expired = period.state === 'expired';
  const lastDay = !expired && period.daysRemaining === 1;
  const label = isAr ? 'مدة الخدمة' : 'Service period';
  const value = expired ? (isAr ? 'انتهت المدة' : 'Ended')
    : lastDay ? (isAr ? 'آخر يوم' : 'Last day')
    : isAr ? `متبقٍ ${arabicDays(period.daysRemaining)}` : `${englishDays(period.daysRemaining)} left`;
  const detail = expired
    ? (isAr ? `انتهت في ${date}` : `Ended ${date}`)
    : [period.totalDays ? (isAr ? `من ${arabicDays(period.totalDays)}` : `of ${englishDays(period.totalDays)}`) : null,
       isAr ? `تنتهي ${date}` : `ends ${date}`].filter(Boolean).join(' · ');
  const share = expired ? 0 : period.remainingShare ?? 1;

  return (
    <div className="service-countdown" data-state={period.state} dir={isAr ? 'rtl' : 'ltr'}
      role="status" aria-label={`${label}: ${value}. ${detail}`} title={`${label}: ${value} · ${detail}`}>
      <svg className="service-countdown__ring" viewBox="0 0 32 32" aria-hidden="true">
        <circle className="service-countdown__track" cx="16" cy="16" r={RADIUS} />
        <circle className="service-countdown__progress" cx="16" cy="16" r={RADIUS}
          strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * (1 - share)} />
        <text x="16" y="16" className="service-countdown__count">
          {expired ? '!' : period.daysRemaining > 999 ? '999+' : period.daysRemaining.toLocaleString(isAr ? 'ar-EG' : 'en-US')}
        </text>
      </svg>
      <span className="service-countdown__text" aria-hidden="true">
        <span className="service-countdown__label">{label}</span>
        <span className="service-countdown__value">{value}</span>
      </span>
      <span className="service-countdown__detail" aria-hidden="true">{detail}</span>
    </div>
  );
}
