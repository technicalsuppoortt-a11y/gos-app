import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Calendar, 
  Share2, 
  Database, 
  Trash2, 
  CheckCircle2, 
  ExternalLink, 
  Mail, 
  Copy, 
  Check, 
  Printer, 
  Search, 
  ChevronUp, 
  Lock, 
  FileText, 
  Globe, 
  Layers, 
  Laptop, 
  MessageSquare, 
  UserRound, 
  AlertTriangle,
  X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUILanguage, uiDirection, translateText, localizeNode } from '../../i18n/display';
import { showToast } from '../../utils/toast';
import './privacy-policy.css';

interface PrivacyPolicyPanelProps {
  mode?: 'panel' | 'standalone';
}

export function PrivacyPolicyPanel({ mode = 'panel' }: PrivacyPolicyPanelProps) {
  useUILanguage();
  const isRtl = uiDirection() === 'rtl';

  // Environment variables with solid fallbacks
  const appName = import.meta.env.VITE_APP_NAME || 'GOS Platform';
  const supportEmail = 'technicalsuppoortt@gmail.com';
  const appUrl = 'https://gos-app-3c7fb.web.app/';
  const fallbackWebUrl = 'https://gos-app-3c7fb.web.app/';

  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string>('intro');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const scrollPaneRef = useRef<HTMLDivElement>(null);

  // Bilingual content dictionaries
  const content = useMemo(() => {
    if (isRtl) {
      return {
        title: `سياسة الخصوصية لمنصة ${appName}`,
        effectiveDateLabel: 'تاريخ السريان:',
        effectiveDateValue: '15 أكتوبر 2026',
        badgeCompliance: 'متوافق مع معايير Meta',
        badgeSecurity: 'مشفر عبر Google Firebase',
        searchPlaceholder: 'البحث في بنود سياسة الخصوصية...',
        actions: {
          copyLink: 'نسخ الرابط',
          copied: 'تم النسخ!',
          print: 'طباعة / PDF',
          requestDeletion: 'طلب حذف البيانات',
          backToTop: 'العودة للأعلى',
          openMetaSettings: 'فتح إعدادات عمليات دمج Meta',
          sendEmail: 'إرسال بريد طلب الحذف',
          copyEmail: 'نسخ عنوان البريد',
        },
        toc: [
          { id: 'section-1', label: '1. المعلومات التي نجمعها' },
          { id: 'section-2', label: '2. كيفية استخدام المعلومات' },
          { id: 'section-3', label: '3. تخزين البيانات وحمايتها' },
          { id: 'section-4', label: '4. مشاركة المعلومات' },
          { id: 'section-5', label: '5. تعليمات حذف البيانات', highlight: true },
          { id: 'section-6', label: '6. التغييرات على السياسة' },
          { id: 'section-7', label: '7. اتصل بنا' },
        ],
        welcome: {
          heading: `أهلاً بك في ${appName}`,
          text: `نحن ملتزمون بحماية خصوصيتك وضمان التعامل مع بياناتك الشخصية بأمان تام وشفافية مطلقة. توضح سياسة الخصوصية هذه كيفية جمع معلوماتك واستخدامها وحمايتها عند استخدام منصتنا لربط حسابات Meta الخاصة بك (Facebook وInstagram وWhatsApp).`,
          tags: ['حماية البيانات', 'تكامل آمن مع Meta', 'عزل مشدد للبيانات'],
        },
        section1: {
          title: '1. المعلومات التي نجمعها',
          lead: `عند استخدامك لخدمتنا لربط أصول Meta الخاصة بك، فإننا نطلب البيانات التالية عبر واجهات برمجة تطبيقات Meta الرسمية (Meta API):`,
          cards: [
            {
              title: 'معلومات الحساب',
              desc: 'الاسم، عنوان البريد الإلكتروني، وتفاصيل الملف الشخصي.',
              icon: UserRound,
            },
            {
              title: 'بيانات تطبيقات Meta',
              desc: 'رموز الوصول للصفحات (Page access tokens)، وبيانات إدارة واتساب للأعمال (WhatsApp Business)، ومعلومات العرض الأساسية لإنستغرام.',
              icon: Share2,
            },
            {
              title: 'بيانات المراسلة',
              desc: 'البيانات المطلوبة لتسهيل إرسال واستقبال الرسائل أو قوالب الحملات عبر واجهة برمجة تطبيقات واتساب للأعمال نيابة عنك.',
              icon: MessageSquare,
            },
            {
              title: 'بيانات الجهاز والاستخدام',
              desc: 'عناوين بروتوكول الإنترنت (IP)، أنواع المتصفحات، وسجلات التفاعل داخل منصتنا السحابية.',
              icon: Laptop,
            },
          ],
        },
        section2: {
          title: '2. كيفية استخدام المعلومات',
          lead: 'نستخدم المعلومات التي تم جمعها حصرياً لتقديم خدماتنا إليك، وتحديداً للأغراض التالية:',
          items: [
            'لربط وإدارة صفحاتك على Facebook، وحسابات Instagram، وملفات WhatsApp Business الخاصة بك.',
            'لتنفيذ الحملات التسويقية وإدارة الرسائل وفقاً لتعليماتك عبر لوحة التحكم الخاصة بنا.',
            'لاستقبال إشعارات الويب الفورية (Webhooks) من Meta بشأن حالات تسليم الرسائل بدقة وموثوقية.',
            'لتقديم الدعم الفني للعملاء وتطوير أداء المنصة وتحسين استقرار وظائفها باستمرار.',
          ],
        },
        section3: {
          title: '3. تخزين البيانات وحمايتها',
          lead: `يتم تخزين بياناتك، بما في ذلك رموز الوصول الخاصة بـ Meta (Meta Access Tokens)، بأمان تام على Google Firebase / Firestore.`,
          boxTitle: 'تشفير متقدم وعزل تام للبيانات متعدد المستأجرين',
          boxDesc: `نحن نطبق قواعد أمان مشددة (Strict Security Rules) وتشفيرًا متقدمًا لضمان عزل رموزك وبيانات عملك عزلًا تامًا، بحيث لا يمكن الوصول إليها من قِبل أي مستخدمين غير مصرح لهم أو أي عملاء آخرين على المنصة.`,
        },
        section4: {
          title: '4. مشاركة معلوماتك',
          lead: 'خصوصيتك خط أحمر لا نتهاون فيه:',
          guaranteeTitle: 'لا نقوم إطلاقاً ببيع أو تأجير بياناتك الشخصية',
          guaranteeText: `نحن لا نبيع، ولا نؤجر، ولا نشارك بياناتك الشخصية مع أي أطراف ثالثة لأغراض إعلانية أو تجارية. تتم مشاركة بياناتك حصرياً مع واجهات برمجة التطبيقات الرسمية لـ Meta لتنفيذ الوظائف الأساسية للخدمة (مثل إرسال رسائل WhatsApp نيابة عنك).`,
        },
        section5: {
          badge: 'متطلب رسمي للامتثال لسياسات Meta',
          title: '5. تعليمات حذف البيانات (الامتثال لمتطلبات Meta)',
          lead: `يحق لك طلب الحذف الكامل لبياناتك من خوادمنا. بالإضافة إلى ذلك، يمكنك إلغاء وصول منصتنا إلى حسابات Meta الخاصة بك في أي وقت.`,
          stepMetaTitle: 'لإلغاء وصول تطبيقنا من حساب Meta الخاص بك:',
          stepMeta: [
            'انتقل إلى إعدادات ملفك الشخصي على Facebook (Facebook Profile Settings).',
            'توجّه إلى: الإعدادات والخصوصية > الإعدادات > عمليات الدمج الخاصة بالأعمال (Business Integrations).',
            `ابحث عن "${appName}" في القائمة واضغط على إزالة (Remove).`,
          ],
          stepSaaSTitle: 'لحذف بياناتك بالكامل نهائياً من خوادم المنصة:',
          stepSaaSLead: `يرجى إرسال رسالة بريد إلكتروني إلى ${supportEmail} مع كتابة سطر الموضوع:`,
          subjectExample: 'Data Deletion Request (طلب حذف البيانات)',
          slaText: 'ضمان الحذف: سيتم حذف حسابك ورموز الوصول وكافة البيانات المرتبطة به نهائياً من قاعدة بيانات Firebase خلال 48 ساعة من استلام الطلب.',
        },
        section6: {
          title: '6. التغييرات على سياسة الخصوصية',
          text: `قد نقوم بتحديث سياسة الخصوصية هذه من حين لآخر لتعكس التحديثات التقنية أو التنظيمية. سنخطرك بأي تغييرات جوهرية عن طريق نشر السياسة المعدلة على هذه الصفحة مع تحديث تاريخ السريان أعلاه.`,
        },
        section7: {
          title: '7. اتصل بنا',
          lead: 'إذا كانت لديك أي أسئلة أو استفسارات حول سياسة الخصوصية أو معالجة بياناتك، يرجى التواصل معنا عبر القنوات التالية:',
          emailLabel: 'البريد الإلكتروني المباشر لحماية البيانات',
          websiteLabel: 'الموقع الرسمي للمنصة',
        },
      };
    }

    return {
      title: `Privacy Policy for ${appName}`,
      effectiveDateLabel: 'Effective Date:',
      effectiveDateValue: 'October 15, 2026',
      badgeCompliance: 'Meta Platform Compliant',
      badgeSecurity: 'Google Firebase Encrypted',
      searchPlaceholder: 'Search policy clauses...',
      actions: {
        copyLink: 'Copy Link',
        copied: 'Copied!',
        print: 'Print / PDF',
        requestDeletion: 'Request Data Deletion',
        backToTop: 'Back to Top',
        openMetaSettings: 'Open Facebook Business Integrations',
        sendEmail: 'Send Deletion Request Email',
        copyEmail: 'Copy Support Email',
      },
      toc: [
        { id: 'section-1', label: '1. Information We Collect' },
        { id: 'section-2', label: '2. How We Use Information' },
        { id: 'section-3', label: '3. Data Storage & Security' },
        { id: 'section-4', label: '4. Sharing Your Information' },
        { id: 'section-5', label: '5. Data Deletion Instructions', highlight: true },
        { id: 'section-6', label: '6. Changes to This Policy' },
        { id: 'section-7', label: '7. Contact Us' },
      ],
      welcome: {
        heading: `Welcome to ${appName}`,
        text: `Welcome to ${appName}. We are committed to protecting your privacy and ensuring that your personal data is handled securely. This Privacy Policy explains how we collect, use, and protect your information when you use our platform to connect your Meta accounts (Facebook, Instagram, and WhatsApp).`,
        tags: ['Data Protection', 'Meta Verified Integration', 'Multi-tenant Isolation'],
      },
      section1: {
        title: '1. Information We Collect',
        lead: `When you use our service to connect your Meta assets, we request the following data via Meta's API:`,
        cards: [
          {
            title: 'Account Information',
            desc: 'Name, email address, and profile details.',
            icon: UserRound,
          },
          {
            title: 'Meta App Data',
            desc: 'Page access tokens, WhatsApp Business management data, and Instagram basic display information.',
            icon: Share2,
          },
          {
            title: 'Messaging Data',
            desc: 'Required data to facilitate sending and receiving messages or campaign templates via the WhatsApp Business API on your behalf.',
            icon: MessageSquare,
          },
          {
            title: 'Device & Usage Data',
            desc: 'IP addresses, browser types, and interaction logs within our SaaS platform.',
            icon: Laptop,
          },
        ],
      },
      section2: {
        title: '2. How We Use Your Information',
        lead: 'We use the collected information exclusively to provide our services to you, specifically:',
        items: [
          'To connect and manage your Facebook Pages, Instagram Accounts, and WhatsApp Business profiles.',
          'To execute marketing campaigns and manage messages as instructed by you through our dashboard.',
          'To receive real-time webhooks from Meta regarding message delivery statuses.',
          'To provide customer support and improve our platform’s functionality.',
        ],
      },
      section3: {
        title: '3. Data Storage and Security',
        lead: 'Your data, including Meta Access Tokens, is securely stored on Google Firebase / Firestore.',
        boxTitle: 'Enterprise-grade isolation and encryption',
        boxDesc: 'We implement strict security rules and encryption to ensure that your tokens and business data are isolated and cannot be accessed by unauthorized users or other clients on our platform.',
      },
      section4: {
        title: '4. Sharing Your Information',
        lead: 'Zero data monetization guarantee:',
        guaranteeTitle: 'We DO NOT sell, rent, or share your personal data with third parties.',
        guaranteeText: "Your data is only shared with Meta's official APIs to fulfill the service's core functionality (e.g., sending a WhatsApp message).",
      },
      section5: {
        badge: 'Meta App Review Compliance',
        title: '5. Data Deletion Instructions (Meta Compliance)',
        lead: 'You have the right to request the complete deletion of your data from our servers. Additionally, you can revoke our platform’s access to your Meta accounts at any time.',
        stepMetaTitle: 'To remove our application’s access from your Meta Account:',
        stepMeta: [
          'Go to your Facebook profile settings.',
          'Navigate to Settings & Privacy > Settings > Business Integrations.',
          `Locate ${appName} in the list and click Remove.`,
        ],
        stepSaaSTitle: 'To completely delete your data from our SaaS platform:',
        stepSaaSLead: `Please send an email to ${supportEmail} with the subject line:`,
        subjectExample: 'Data Deletion Request',
        slaText: 'Guaranteed SLA: We will permanently delete your account, tokens, and associated data from our Firebase database within 48 hours of your request.',
      },
      section6: {
        title: '6. Changes to This Privacy Policy',
        text: 'We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new policy on this page.',
      },
      section7: {
        title: '7. Contact Us',
        lead: 'If you have any questions or concerns about this Privacy Policy, please contact us at:',
        emailLabel: 'Data Privacy & Support Email',
        websiteLabel: 'Official Website & Web Application',
      },
    };
  }, [appName, supportEmail, isRtl]);

  // Handle scroll events: reading progress, active TOC spy, back-to-top visibility
  useEffect(() => {
    const pane = scrollPaneRef.current;
    if (!pane) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = pane;
      const maxScroll = scrollHeight - clientHeight;
      const progress = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
      setScrollProgress(progress);
      setShowBackToTop(scrollTop > 260);

      // Section spy
      const sections = ['section-1', 'section-2', 'section-3', 'section-4', 'section-5', 'section-6', 'section-7'];
      let current = 'section-1';
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          const paneRect = pane.getBoundingClientRect();
          if (rect.top <= paneRect.top + 140) {
            current = id;
          }
        }
      }
      setActiveSection(current);
    };

    pane.addEventListener('scroll', handleScroll, { passive: true });
    return () => pane.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  };

  const scrollToTop = () => {
    scrollPaneRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyLink = () => {
    const url = window.location.origin + '/privacy';
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      showToast.success(isRtl ? 'تم نسخ رابط سياسة الخصوصية إلى الحافظة' : 'Privacy policy link copied to clipboard');
      setTimeout(() => setCopiedLink(false), 2000);
    }).catch(() => {
      showToast.error('Could not copy link');
    });
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(supportEmail).then(() => {
      setCopiedEmail(true);
      showToast.success(isRtl ? `تم نسخ ${supportEmail}` : `Copied ${supportEmail}`);
      setTimeout(() => setCopiedEmail(false), 2000);
    }).catch(() => {
      showToast.error('Could not copy email');
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter content if search query is provided
  const query = searchQuery.trim().toLowerCase();
  const matches = (text: string) => !query || text.toLowerCase().includes(query);

  const mailtoUrl = `mailto:${supportEmail}?subject=${encodeURIComponent('Data Deletion Request')}&body=${encodeURIComponent(
    `Hello ${appName} Privacy Team,\n\nI am requesting the permanent deletion of my account, authentication tokens, and all associated personal data from ${appName} systems in accordance with your Privacy Policy.\n\nAccount Email: \nReason (Optional): \n\nThank you.`
  )}`;

  return (
    <div className={`st-privacy-container ${mode === 'standalone' ? 'is-standalone-view' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Container Header */}
      <header className="st-privacy-header">
        <div className="st-privacy-header-top">
          <div className="st-privacy-title-area">
            <div className="st-privacy-icon-box" aria-hidden="true">
              <ShieldCheck size={26} strokeWidth={2} />
            </div>
            <div className="st-privacy-title-group">
              <h1>
                <span>{localizeNode(content.title)}</span>
                <span className="st-privacy-meta-badge">
                  <CheckCircle2 size={12} />
                  {localizeNode(content.badgeCompliance)}
                </span>
              </h1>
              <div className="st-privacy-effective-row">
                <span className="st-privacy-effective-date">
                  <Calendar size={13} />
                  <span>{localizeNode(content.effectiveDateLabel)}</span>
                  <b>{localizeNode(content.effectiveDateValue)}</b>
                </span>
                <span>•</span>
                <span>{localizeNode(content.badgeSecurity)}</span>
              </div>
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div className="st-privacy-actions">
            <motion.button 
              type="button" 
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="st-privacy-btn deletion-jump"
              onClick={() => scrollToSection('section-5')}
              title={localizeNode(content.actions.requestDeletion)}
            >
              <Trash2 size={13} />
              <span>{localizeNode(content.actions.requestDeletion)}</span>
            </motion.button>

            <motion.button 
              type="button" 
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="st-privacy-btn secondary"
              onClick={handleCopyLink}
              title={localizeNode(content.actions.copyLink)}
            >
              {copiedLink ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              <span>{copiedLink ? localizeNode(content.actions.copied) : localizeNode(content.actions.copyLink)}</span>
            </motion.button>

            <motion.button 
              type="button" 
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="st-privacy-btn secondary"
              onClick={handlePrint}
              title={localizeNode(content.actions.print)}
            >
              <Printer size={13} />
              <span>{localizeNode(content.actions.print)}</span>
            </motion.button>
          </div>
        </div>

        {/* Secondary Bar: Real-time search + TOC chips */}
        <div className="st-privacy-toolbar-row">
          <div className="st-privacy-search">
            <Search size={14} className="st-privacy-search-icon" aria-hidden="true" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={translateText(content.searchPlaceholder)}
              aria-label={translateText("Search Privacy Policy clauses")}
            />
            <AnimatePresence>
              {searchQuery && (
                <motion.button 
                  type="button" 
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setSearchQuery('')}
                  className="st-privacy-search-clear"
                  aria-label={translateText("Clear search")}
                  title={translateText("Clear search")}
                >
                  <X size={12} strokeWidth={2.5} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <nav className="st-privacy-toc-bar" aria-label={translateText("Privacy policy table of contents")}>
            {content.toc.map(item => (
              <motion.button
                key={item.id}
                type="button"
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={`st-privacy-toc-chip${activeSection === item.id ? ' active' : ''}${item.highlight ? ' compliance' : ''}`}
                onClick={() => scrollToSection(item.id)}
              >
                <span>{localizeNode(item.label)}</span>
              </motion.button>
            ))}
          </nav>
        </div>
      </header>

      {/* Reading Progress Line */}
      <div className="st-privacy-progress-line" role="progressbar" aria-valuenow={Math.round(scrollProgress)} aria-valuemin={0} aria-valuemax={100}>
        <div className="st-privacy-progress-fill" style={{ width: `${scrollProgress}%` }} />
      </div>

      {/* Internal Scrollable Body (Zero-Scroll Architecture) */}
      <div ref={scrollPaneRef} className="st-privacy-scroll-pane">
        <main className="st-privacy-content">
          {/* Welcome / Overview Card */}
          {(matches(content.welcome.heading) || matches(content.welcome.text)) && (
            <section className="st-privacy-welcome-card" id="intro">
              <h2>{localizeNode(content.welcome.heading)}</h2>
              <p>{localizeNode(content.welcome.text)}</p>
              <div className="st-privacy-welcome-tags">
                {content.welcome.tags.map(tag => (
                  <span key={tag} className="st-privacy-tag">
                    <CheckCircle2 size={11} />
                    <span>{localizeNode(tag)}</span>
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Section 1: Information We Collect */}
          {(matches(content.section1.title) || matches(content.section1.lead) || content.section1.cards.some(c => matches(c.title) || matches(c.desc))) && (
            <section className="st-privacy-section" id="section-1">
              <header className="st-privacy-section-header">
                <span className="st-privacy-num-badge">1</span>
                <h3>{localizeNode(content.section1.title)}</h3>
              </header>
              <p className="st-privacy-lead-text">{localizeNode(content.section1.lead)}</p>
              <div className="st-privacy-grid">
                {content.section1.cards.map(card => {
                  const Icon = card.icon;
                  return (
                    <article key={card.title} className="st-privacy-subcard">
                      <div className="st-privacy-subcard-icon">
                        <Icon size={17} />
                      </div>
                      <div className="st-privacy-subcard-body">
                        <h4>{localizeNode(card.title)}</h4>
                        <p>{localizeNode(card.desc)}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {/* Section 2: How We Use Your Information */}
          {(matches(content.section2.title) || matches(content.section2.lead) || content.section2.items.some(matches)) && (
            <section className="st-privacy-section" id="section-2">
              <header className="st-privacy-section-header">
                <span className="st-privacy-num-badge">2</span>
                <h3>{localizeNode(content.section2.title)}</h3>
              </header>
              <p className="st-privacy-lead-text">{localizeNode(content.section2.lead)}</p>
              <div className="st-privacy-bullet-list">
                {content.section2.items.map((item, index) => (
                  <div key={index} className="st-privacy-bullet-item">
                    <CheckCircle2 size={16} className="st-privacy-bullet-icon" />
                    <span>{localizeNode(item)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 3: Data Storage and Security */}
          {(matches(content.section3.title) || matches(content.section3.lead) || matches(content.section3.boxDesc)) && (
            <section className="st-privacy-section" id="section-3">
              <header className="st-privacy-section-header">
                <span className="st-privacy-num-badge">3</span>
                <h3>{localizeNode(content.section3.title)}</h3>
              </header>
              <p className="st-privacy-lead-text">{localizeNode(content.section3.lead)}</p>
              <div className="st-privacy-security-box">
                <div className="st-privacy-security-icon">
                  <Lock size={20} />
                </div>
                <div className="st-privacy-security-content">
                  <h4>{localizeNode(content.section3.boxTitle)}</h4>
                  <p>{localizeNode(content.section3.boxDesc)}</p>
                </div>
              </div>
            </section>
          )}

          {/* Section 4: Sharing Your Information */}
          {(matches(content.section4.title) || matches(content.section4.guaranteeTitle) || matches(content.section4.guaranteeText)) && (
            <section className="st-privacy-section" id="section-4">
              <header className="st-privacy-section-header">
                <span className="st-privacy-num-badge">4</span>
                <h3>{localizeNode(content.section4.title)}</h3>
              </header>
              <div className="st-privacy-banner-green">
                <ShieldCheck size={22} className="flex-shrink-0 text-blue-600 dark:text-blue-400" />
                <div>
                  <strong className="block text-[13px] font-bold mb-1">{localizeNode(content.section4.guaranteeTitle)}</strong>
                  <p className="text-[11px] leading-relaxed m-0 text-slate-600 dark:text-slate-300">{localizeNode(content.section4.guaranteeText)}</p>
                </div>
              </div>
            </section>
          )}

          {/* Section 5: Data Deletion Instructions (Meta Compliance - Highlighted Card) */}
          {(matches(content.section5.title) || matches(content.section5.lead) || matches('Meta') || matches('Delete')) && (
            <section className="st-privacy-section compliance-highlight" id="section-5">
              <span className="st-compliance-badge-top">
                <ShieldCheck size={12} />
                <span>{localizeNode(content.section5.badge)}</span>
              </span>

              <header className="st-privacy-section-header">
                <span className="st-privacy-num-badge" style={{ background: '#7546f5', color: '#fff' }}>5</span>
                <h3>{localizeNode(content.section5.title)}</h3>
              </header>

              <p className="st-privacy-lead-text">{localizeNode(content.section5.lead)}</p>

              <div className="st-deletion-columns">
                {/* Part A: Remove access from Facebook Profile */}
                <div className="st-deletion-card">
                  <div>
                    <div className="st-deletion-card-header">
                      <div className="st-deletion-icon meta">
                        <Share2 size={16} />
                      </div>
                      <h4>{localizeNode(content.section5.stepMetaTitle)}</h4>
                    </div>

                    <ol className="st-deletion-steps mt-3">
                      {content.section5.stepMeta.map((step, idx) => (
                        <li key={idx}>
                          <span className="st-step-circle">{idx + 1}</span>
                          <span>{localizeNode(step)}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <a 
                    href="https://www.facebook.com/settings?tab=business_tools" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="st-privacy-btn secondary mt-2 text-center flex items-center justify-center gap-1.5"
                  >
                    <span>{localizeNode(content.actions.openMetaSettings)}</span>
                    <ExternalLink size={12} />
                  </a>
                </div>

                {/* Part B: Completely delete data from SaaS Platform */}
                <div className="st-deletion-card">
                  <div>
                    <div className="st-deletion-card-header">
                      <div className="st-deletion-icon platform">
                        <Trash2 size={16} />
                      </div>
                      <h4>{localizeNode(content.section5.stepSaaSTitle)}</h4>
                    </div>

                    <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 mt-3 mb-2">
                      {localizeNode(content.section5.stepSaaSLead)}{' '}
                      <button 
                        type="button" 
                        onClick={handleCopyEmail}
                        className="inline-flex items-center gap-1 font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                        title="Copy email"
                      >
                        {supportEmail}
                        <Copy size={11} />
                      </button>
                    </p>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 mb-3 text-[11px]">
                      <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-1">
                        {translateText("Email Subject:")}
                      </span>
                      <code className="text-purple-700 dark:text-purple-300 font-mono font-medium">
                        "{content.section5.subjectExample}"
                      </code>
                    </div>

                    <div className="st-deletion-sla-badge">
                      <CheckCircle2 size={12} />
                      <span>{localizeNode(content.section5.slaText)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-2">
                    <a 
                      href={mailtoUrl}
                      className="st-privacy-btn primary flex-1 text-center flex items-center justify-center gap-1.5"
                    >
                      <Mail size={12} />
                      <span>{localizeNode(content.actions.sendEmail)}</span>
                    </a>
                    <button 
                      type="button" 
                      onClick={handleCopyEmail}
                      className="st-privacy-btn secondary"
                      title={localizeNode(content.actions.copyEmail)}
                    >
                      {copiedEmail ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Section 6: Changes to This Privacy Policy */}
          {(matches(content.section6.title) || matches(content.section6.text)) && (
            <section className="st-privacy-section" id="section-6">
              <header className="st-privacy-section-header">
                <span className="st-privacy-num-badge">6</span>
                <h3>{localizeNode(content.section6.title)}</h3>
              </header>
              <p className="st-privacy-lead-text mb-0">{localizeNode(content.section6.text)}</p>
            </section>
          )}

          {/* Section 7: Contact Us */}
          {(matches(content.section7.title) || matches(content.section7.lead) || matches(supportEmail)) && (
            <section className="st-privacy-section" id="section-7">
              <header className="st-privacy-section-header">
                <span className="st-privacy-num-badge">7</span>
                <h3>{localizeNode(content.section7.title)}</h3>
              </header>
              <p className="st-privacy-lead-text">{localizeNode(content.section7.lead)}</p>

              <div className="st-contact-grid">
                <a href={`mailto:${supportEmail}`} className="st-contact-card">
                  <div className="st-contact-card-icon">
                    <Mail size={18} />
                  </div>
                  <div className="st-contact-card-info">
                    <b>{localizeNode(content.section7.emailLabel)}</b>
                    <span>{supportEmail}</span>
                  </div>
                </a>

                <a 
                  href={appUrl || fallbackWebUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="st-contact-card"
                >
                  <div className="st-contact-card-icon">
                    <Globe size={18} />
                  </div>
                  <div className="st-contact-card-info">
                    <b>{localizeNode(content.section7.websiteLabel)}</b>
                    <span>{appUrl}</span>
                  </div>
                </a>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Floating Back to Top Button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            type="button"
            className="st-privacy-back-to-top"
            onClick={scrollToTop}
            initial={{ opacity: 0, scale: 0.6, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 16 }}
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 350, damping: 22 }}
            aria-label={translateText(content.actions.backToTop)}
            title={localizeNode(content.actions.backToTop)}
          >
            <ChevronUp size={18} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
