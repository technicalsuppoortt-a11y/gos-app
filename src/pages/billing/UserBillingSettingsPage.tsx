import { Link } from 'react-router-dom';
import { Package, ArrowLeft, ArrowRight, Sliders } from 'lucide-react';
import { entitledTools, isLive, useBillingIdentity, usePlans, useSubscribers, useSubscription } from '../../backend/billing';
import { PlanCatalog } from './PlanCatalog';
import { useCopy } from './ui';

export function UserBillingSettingsPage() {
  const c = useCopy();
  const identity = useBillingIdentity();
  const { data: sub } = useSubscription(identity.uid);
  const { data: plans } = usePlans(identity.uid, true);
  const { data: subscribers } = useSubscribers(identity.uid);

  const live = isLive(sub);
  const allowed = entitledTools(sub);

  return (
    <div className="bl" dir={c.dir}>
      <header className="bl-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBlockEnd: 6 }}>
            <Link to="/admin/plans?area=clients" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--bl-accent)', textDecoration: 'none', fontWeight: 600 }}>
              {c.ar ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
              {c.t('Back to Plans Management', 'العودة لإدارة الباقات')}
            </Link>
          </div>
          <span className="bl-eyebrow"><Package size={12} />{c.t('Client Top-ups & Add-ons Configuration', 'إعدادات شحن وإضافات العملاء')}</span>
          <h1><span className="bl-head-icon"><Sliders size={19} /></span>{c.t('User Billing & Add-on Settings', 'إعدادات فوترة وإضافات المستخدمين')}</h1>
          <p>{c.t('Define unit-based credit rates for your end-users and create fixed add-on packages offered exclusively to them.', 'حدد أسعار شحن الرصيد بالوحدة لعملائك وأنشئ باقات إضافية ثابتة مخصصة لهم.')}</p>
        </div>
      </header>

      {/* Unified Add-on Settings & Packages Management with Synchronized 2-Mode Switch */}
      <PlanCatalog
        kind="addon"
        plans={plans}
        subscribers={subscribers}
        isPlatform={false}
        allowedTools={allowed}
        locked={!live}
        ownerId={identity.uid || ''}
      />
    </div>
  );
}
