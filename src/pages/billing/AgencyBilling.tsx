import { Coins, Wallet } from 'lucide-react';
import { useAgencyBilling } from '../../backend/billing';
import { useCopy } from './ui';

export function AgencyBilling({ uid, showWalletBalance }: { uid: string; showWalletBalance: boolean }) {
  const c = useCopy();
  const { data, loading, error } = useAgencyBilling(uid);
  const locale = c.ar ? 'ar-EG' : 'en';

  return (
    <div className="bl" dir={c.dir}>
      <header className="bl-head">
        <div>
          <span className="bl-eyebrow">{c.t('Agency user', 'مستخدم وكالة')}</span>
          <h2><span className="bl-head-icon"><Wallet size={19} /></span>{c.t('Shared billing', 'الفوترة المشتركة')}</h2>
          <p>{c.t('This workspace uses the Platform Admin’s plan credits and communication wallet. The Platform Admin manages subscriptions and top-ups.', 'تستخدم مساحة العمل رصيد باقة مسؤول المنصة ومحفظة اتصالاته. يدير مسؤول المنصة الاشتراكات وشحن الرصيد.')}</p>
        </div>
      </header>
      {loading && <p role="status">{c.t('Loading shared balances…', 'جارٍ تحميل الأرصدة المشتركة…')}</p>}
      {error && <p role="alert">{error}</p>}
      {data && <>
        {!data.active && <p className="bl-banner warn">{c.t('Ask the Platform Admin to activate billing for paid tools.', 'اطلب من مسؤول المنصة تفعيل الفوترة لاستخدام الأدوات المدفوعة.')}</p>}
        <div className="bl-banner info"><Coins size={17}/><span>{c.t('Available AI credits', 'رصيد الذكاء الاصطناعي المتاح')} <strong>{data.credits.toLocaleString(locale)}</strong></span></div>
        <div className="bl-banner info"><Coins size={17}/><span>{c.t('Available email credits', 'رصيد البريد الإلكتروني المتاح')} <strong>{(data.emailCredits ?? 0).toLocaleString(locale)}</strong></span></div>
        {showWalletBalance && <div className="bl-banner info"><Wallet size={17}/><span>{c.t('Available communication balance', 'رصيد الاتصالات المتاح')} <strong>{data.communicationBalance.toLocaleString(locale, { style: 'currency', currency: data.currency })}</strong></span></div>}
      </>}
    </div>
  );
}
