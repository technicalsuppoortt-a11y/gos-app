import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BookOpen, CalendarDays, Mail, Plug, ShieldCheck, Users, X } from 'lucide-react';
import { uiDirection, useUILanguage } from '../../i18n/display';
import './help-drawer.css';

export function HelpDrawer({ close }: { close: () => void }) {
  useUILanguage();
  const ar = uiDirection() === 'rtl';
  const dialog = useRef<HTMLDialogElement>(null);
  const t = (en: string, arabic: string) => ar ? arabic : en;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.showModal();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  const guides = [
    { icon: Users, title: t('Organize your contacts', 'نظّم جهات الاتصال'), text: t('Add contacts in CRM, then move opportunities through your pipeline as they progress.', 'أضف جهات الاتصال في إدارة العملاء ثم انقل الفرص بين مراحل مسار المبيعات.'), to: '/dashboard/crm' },
    { icon: CalendarDays, title: t('Set up your booking page', 'جهّز صفحة الحجز'), text: t('Create a booking page, set availability and share its public link with your clients.', 'أنشئ صفحة حجز وحدد أوقات التوفر وشارك الرابط مع عملائك.'), to: '/dashboard/booking' },
    { icon: Plug, title: t('Connect your channels', 'اربط قنواتك'), text: t('Open Integrations to connect available providers and review their connection status.', 'افتح التكاملات لربط الخدمات المتاحة ومراجعة حالة الاتصال.'), to: '/dashboard/settings/integrations' },
  ];
  const faqs = [
    [t('How do I invite my team?', 'كيف أدعو فريقي؟'), t('Open Settings → Team & roles. Workspace administrators can manage invitations and access permissions there.', 'افتح الإعدادات ← الفريق والأدوار. يمكن لمسؤولي مساحة العمل إدارة الدعوات وصلاحيات الوصول من هناك.')],
    [t('Why is a channel disconnected?', 'لماذا انقطع اتصال إحدى القنوات؟'), t('Review the provider in Settings → Integrations. Check its credentials and reconnect if its authorization has expired.', 'راجع الخدمة في الإعدادات ← التكاملات. تحقق من بيانات الدخول وأعد الربط إذا انتهت صلاحية التفويض.')],
    [t('Where can I manage my subscription?', 'أين أدير اشتراكي؟'), t('Open Settings → Billing & Payments to review the billing options available to your workspace.', 'افتح الإعدادات ← الفوترة والمدفوعات لمراجعة خيارات الفوترة المتاحة لمساحة عملك.')],
  ];
  return createPortal(<dialog ref={dialog} className="upclick-help" aria-labelledby="upclick-help-title" dir={ar ? 'rtl' : 'ltr'} onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close(); } }}>
    <header className="upclick-help-header"><img src="/upclick-mark.svg" width="36" height="36" alt=""/><div><small>{t('UPCLICK SUPPORT', 'دعم Upclick')}</small><h2 id="upclick-help-title">{t('How can we help?', 'كيف يمكننا مساعدتك؟')}</h2></div><button autoFocus type="button" onClick={close} aria-label={t('Close help center', 'إغلاق مركز المساعدة')}><X size={20}/></button></header>
    <div className="upclick-help-body"><p>{t('A little guidance. A bigger next step.', 'إرشادات بسيطة لخطوتك التالية.')}</p>
      <section><h3><BookOpen size={17}/>{t('Quick-start guides', 'أدلة البداية')}</h3><div className="upclick-help-guides">{guides.map(({ icon: Icon, title, text, to }) => <article key={to}><Icon size={20}/><div><h4>{title}</h4><p>{text}</p><Link to={to} onClick={close}>{t('Open workspace', 'فتح مساحة العمل')}<ArrowUpRight size={14}/></Link></div></article>)}</div></section>
      <section><h3>{t('Frequently asked questions', 'الأسئلة الشائعة')}</h3>{faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>
      <section className="upclick-help-support"><h3>{t('Talk to someone', 'تواصل معنا')}</h3><a href={`mailto:technicalsuppoortt@gmail.com?subject=${encodeURIComponent('Upclick workspace support')}`}><Mail size={18}/><span><b>{t('Email support', 'الدعم عبر البريد الإلكتروني')}</b><small>technicalsuppoortt@gmail.com</small></span><ArrowUpRight size={16}/></a><Link to="/dashboard/settings/team" onClick={close}><ShieldCheck size={18}/><span><b>{t('Workspace administrator', 'مسؤول مساحة العمل')}</b><small>{t('Get help with team access and permissions', 'للمساعدة في الوصول وصلاحيات الفريق')}</small></span><ArrowUpRight size={16}/></Link></section>
    </div><footer>{t('Ideas to impact. We’re here to help.', 'من الأفكار إلى الأثر. نحن هنا لمساعدتك.')}</footer>
  </dialog>, document.body);
}
