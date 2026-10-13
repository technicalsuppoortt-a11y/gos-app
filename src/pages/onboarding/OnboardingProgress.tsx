import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, ChevronDown, Globe2, Sparkles, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { RootState } from '../../store';
import { useOnboarding } from './onboarding-store';
import './onboarding.css';
import { countryOptions } from './localization-data';

export function OnboardingProgress() {
  const email = useSelector((s: RootState) => s.auth.user?.email || '');
  const { setups } = useOnboarding();
  const setup = setups[email];
  const ar = useSelector((s: RootState) => s.ui.language === 'ar');
  const [expanded, setExpanded] = React.useState(false);
  const [preview, setPreview] = React.useState(false);
  const dialog = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    if (preview) dialog.current?.showModal();
    else dialog.current?.close();
  }, [preview]);

  if (!setup?.onboarding_completed) return null;

  const t = (en: string, arabic: string) => (ar ? arabic : en);
  const countryLabel =
    countryOptions(ar ? 'ar' : 'en').find((country) => country.value === setup.country)?.label ||
    setup.country;

  const tasks = [
    { name: t('Business identity', 'هوية النشاط'), done: !!setup.name, step: 0 },
    { name: t('Goals & localization', 'الأهداف والإعدادات المحلية'), done: !!setup.industry && !!setup.country, step: 1 },
    { name: t('AI business context', 'سياق المساعد الذكي'), done: !!setup.description.trim() || !!setup.facts.length, step: 3 },
    { name: t('Connect your tools', 'ربط الأدوات'), done: !!setup.integrations.length, step: 4 },
    { name: t('Create your first asset', 'إنشاء أول أصل'), done: !!setup.asset, step: 5 },
  ];

  const count = tasks.filter((t) => t.done).length;
  const nativeAssetPath = setup.asset?.id
    ? setup.asset.type === 'Booking page'
      ? `/dashboard/booking/${setup.asset.id}/edit`
      : `/dashboard/products-payments/products/${setup.asset.id}/edit`
    : '/onboarding?step=5';

  return (
    <section
      className="ob-progress"
      dir={ar ? 'rtl' : 'ltr'}
      style={{ '--ob-brand-color': setup.color } as React.CSSProperties}
    >
      <button
        className="ob-progress-header"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="ob-progress-icon">
          <Sparkles size={18} />
        </span>
        <div>
          <b>
            {t(`${setup.name} is ready for its next chapter`, `${setup.name} جاهزة للانطلاق`)}
          </b>
          <small>
            {t(
              `Onboarding progress · ${count} of 5 setup steps complete`,
              `تقدم الإعداد · ${count} من ٥ خطوات مكتملة`
            )}
          </small>
        </div>
        <span className="ob-progress-meter">
          <span style={{ width: `${count * 20}%` }} />
        </span>
        <strong>{count * 20}%</strong>
        <ChevronDown
          size={17}
          className={`shrink-0 transition-transform duration-300 ease-in-out ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="ob-details"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{
              height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
              opacity: { duration: 0.2, ease: 'easeInOut' },
            }}
            className="ob-progress-details overflow-hidden"
          >
            <div className="ob-progress-tasks">
              {tasks.map((task) => (
                <Link key={task.step} to={`/onboarding?step=${task.step}`}>
                  <span className={task.done ? 'done' : ''}>
                    {task.done ? <Check size={13} /> : task.step + 1}
                  </span>
                  {task.name}
                  <ArrowUpRight size={14} />
                </Link>
              ))}
            </div>
            <div className="ob-progress-context">
              <Globe2 size={15} />
              <span>
                {countryLabel} · {setup.timezone} · {setup.currency}
              </span>
              <p>
                {setup.description ||
                  t(
                    'Add your business context to personalize your Copilot.',
                    'أضف سياق نشاطك لتخصيص المساعد الذكي.'
                  )}
              </p>
              {setup.asset && (
                <button className="ob-secondary" onClick={() => setPreview(true)}>
                  {setup.asset.name}
                  <ArrowUpRight size={14} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <dialog
        ref={dialog}
        className="ob-dialog ob-asset-preview"
        onCancel={() => setPreview(false)}
      >
        <button
          className="ob-close ob-icon"
          aria-label="Close preview"
          onClick={() => setPreview(false)}
        >
          <X size={18} />
        </button>
        <span className="ob-badge">{t('PRIVATE DRAFT', 'مسودة خاصة')}</span>
        <div className="ob-preview-brand">
          {setup.logo && <img src={setup.logo} alt={t('Workspace logo', 'شعار مساحة العمل')} />}
          <b>{setup.name}</b>
        </div>
        <h2>{setup.asset?.name}</h2>
        <p>
          {setup.description ||
            t(
              'Welcome. Let’s take the next step together.',
              'أهلاً بك. لنبدأ الخطوة التالية معاً.'
            )}
        </p>
        <div className="ob-callout">
          {t(
            setup.asset?.type || '',
            setup.asset?.type === 'Booking page' ? 'صفحة حجز' : 'منتج رقمي'
          )}{' '}
          ·{' '}
          {setup.asset?.duration &&
            `${setup.asset.duration} ${t('min', 'دقيقة')} · `}
          {setup.asset?.price === '0'
            ? t('Free', 'مجاني')
            : `${setup.asset?.price} ${setup.currency}`}
        </div>
        <p>
          {t(
            'Your first asset is saved as a local draft. Review or edit its details before publishing.',
            'تم حفظ أول أصل كمسودة محلية. راجع التفاصيل أو عدلها قبل النشر.'
          )}
        </p>
        <Link className="ob-primary ob-full" to={nativeAssetPath}>
          {t('Edit draft', 'تعديل المسودة')}
          <ArrowUpRight size={15} />
        </Link>
      </dialog>
    </section>
  );
}
