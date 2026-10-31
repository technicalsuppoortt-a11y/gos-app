import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  FileText,
  ShieldCheck,
  Calendar,
  Share2,
  Printer,
  Copy,
  Check,
  Search,
  ChevronUp,
  ArrowLeft,
  ArrowRight,
  LogIn,
  LayoutDashboard,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Globe,
  Coins,
  Cpu,
  Mail,
  Scale
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RootState } from '../store';
import { useUILanguage, uiDirection, translateText } from '../i18n/display';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { showToast } from '../utils/toast';
import './legal-pages.css';

export function TermsOfServicePage() {
  useUILanguage();
  const isRtl = uiDirection() === 'rtl';
  const navigate = useNavigate();
  const auth = useSelector((s: RootState) => s.auth);
  const isAuthenticated = !!auth.token || !!auth.user;
  const appName = import.meta.env.VITE_APP_NAME || 'Upclick Platform';
  const supportEmail = 'technicalsuppoortt@gmail.com';
  const appUrl = 'https://gos-app-3c7fb.web.app/';

  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('section-1');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 350);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const content = useMemo(() => {
    if (isRtl) {
      return {
        title: `شروط الخدمة واتفاقية الاستخدام - ${appName}`,
        subtitle: 'اتفاقية قانونية ملزمة تحدد شروط وضوابط استخدام منصة Upclick وخدمات الأتمتة والذكاء الاصطناعي.',
        effectiveDate: 'تاريخ السريان: 20 أكتوبر 2026',
        badgeCompliance: 'متوافق مع سياسات Meta وGoogle',
        badgeLegal: 'اتفاقية ترخيص SaaS رسمية',
        searchPlaceholder: 'ابحث في بنود شروط الخدمة...',
        copySuccess: 'تم نسخ رابط الصفحة إلى الحافظة!',
        sections: [
          {
            id: 'section-1',
            icon: Scale,
            title: '1. قبول الشروط والأهلية القانونية',
            desc: 'شروط استخدام المنصة والتمثيل القانوني للمستخدم.',
            body: [
              `من خلال إنشاء حساب، أو الدخول إلى منصة ${appName}، أو استخدام أي من أدواتنا الذكية وخدمات الأتمتة السحابية، فإنك تقر وتوافق صراحة على الالتزام بهذه الشروط وجميع السياسات المرتبطة بها (بما في ذلك سياسة الخصوصية وتعليمات حذف البيانات).`,
              `إذا كنت تستخدم المنصة نيابة عن شركة أو كيان قانوني أو وكالة تجارية، فإنك تقر بأن لديك السلطة القانونية الكاملة لإلزام هذا الكيان بهذه الشروط. يجب ألا يقل عمر المستخدم عن 18 عاماً لإنشاء مساحة عمل تجارية.`
            ],
            clauses: [
              { title: 'أهلية الحساب', text: 'يشترط تقديم بيانات حقيقية ودقيقة وكاملة أثناء التسجيل وتحديثها دورياً.' },
              { title: 'تمثيل الوكالات', text: 'يجوز لمديري الوكالات إدارة حسابات عملائهم وفق الصلاحيات المعطاة في باقاتهم.' }
            ]
          },
          {
            id: 'section-2',
            icon: Cpu,
            title: '2. وصف خدمات المنصة وأدوات الذكاء الاصطناعي',
            desc: 'نطاق الخدمات السحابية، أدوات الأتمتة، والمساعد الذكي.',
            body: [
              `توفر المنصة نظام تشغيل سحابي متكامل للأعمال (Operating System for Business) يشمل: منشئ قنوات البيع والمواقع (Funnel & Website Builder)، نظام إدارة علاقات العملاء (CRM & Leads Pipeline)، صندوق الوارد الموحد (Unified Multi-Channel Inbox)، محرك حجز المواعيد والتقويم، المنتجات والمدفوعات، أدوات التحليلات، ومساعد الذكاء الاصطناعي والأتمتة (AI Copilot & Follow-Up).`,
              `تعتمد أدوات الذكاء الاصطناعي على نماذج متقدمة لمعالجة اللغة الطبيعية لتوليد النصوص، وأتمتة الردود على العملاء، وتحليل البيانات. يقر المستخدم بأن مخرجات الذكاء الاصطناعي هي مقترحات مساعدة ويتحمل المستخدم وحده مسؤولية مراجعتها واعتمادها قبل إرسالها لجمهوره.`
            ],
            clauses: [
              { title: 'التوفر المستمر', text: 'نسعى لضمان تشغيل خدمات المنصة بنسبة توافر 99.9% مع تطبيق نسخ احتياطي دوري.' },
              { title: 'التحديثات الدورية', text: 'نحتفظ بالحق في تطوير ميزات المنصة أو تحسين واجهاتها لضمان أقصى كفاءة.' }
            ]
          },
          {
            id: 'section-3',
            icon: Coins,
            title: '3. الاشتراكات، صلاحيات الأدوات، والرصيد (Credits)',
            desc: 'شروط الباقات، دورات الفوترة، ونظام الرصيد الاستهلاكي.',
            body: [
              `تتيح المنصة اشتراكات شهرية، سنوية، بفترات محددة، أو مدى الحياة، بالإضافة إلى الفترات التجريبية المجانية والباقات الإضافية (Add-ons). تتحدد صلاحيات الوصول للأدوات وفق مصفوفة الباقة المفعلة لحسابك.`,
              `تُدار عمليات الذكاء الاصطناعي والمراسلات عبر نظام دفتر الرصيد غير القابل للتعديل (Append-Only Credit Ledger). يتم استهلاك الرصيد بناءً على العمليات الفعلية (مثل استدعاءات نماذج الذكاء الاصطناعي والرسائل الصادرة). الرصيد الممنوح دورياً ينتهي بانتهاء دورة الفوترة الشهرية ولا يتم ترحيله ما لم تنص الباقة على خلاف ذلك.`
            ],
            clauses: [
              { title: 'سياسة التجربة المجانية', text: 'تمنح التجربة المجانية لمرة واحدة لكل مساحة عمل جديدة لاختبار المنصة.' },
              { title: 'الترقية والإلغاء', text: 'يمكنك ترقية باقتك أو طلب إضافات في أي وقت عبر لوحة الاشتراكات والفواتير.' }
            ]
          },
          {
            id: 'section-4',
            icon: Globe,
            title: '4. التكاملات الخارجية وسياسات منصات Meta وGoogle',
            desc: 'الامتثال الصارم لسياسات Facebook وInstagram وWhatsApp وGoogle.',
            body: [
              `تتيح المنصة الربط مع خدمات Meta الرسمية (WhatsApp Business Platform, Instagram Graph API, Facebook Pages) ومزامنة Google Calendar وStripe وPayPal. عند ربط أي حساب خارجي، فإنك توافق على الالتزام بسياسات منصة Meta للمطورين وشروط استخدام Google.`,
              `نحن لا نبيع أو نؤجر بياناتك أو بيانات عملائك لأي طرف ثالث. تُستخدم بيانات اعتمادات ورموز الوصول (Access Tokens) حصرياً لتنفيذ وظائف المراسلة والمزامنة المعتمدة من قبلك.`
            ],
            clauses: [
              { title: 'رموز الوصول المشفرة', text: 'يتم تشفير وتأمين جميع مفاتيح الوصول في طبقات Firestore السحابية المحمية.' },
              { title: 'حظر السبام', text: 'يحظر حظراً تاماً استخدام أدوات واتساب أو المراسلة لإرسال رسائل غير مرغوبة (SPAM).' }
            ]
          },
          {
            id: 'section-5',
            icon: ShieldCheck,
            title: '5. الملكية الفكرية وسرية البيانات',
            desc: 'حقوق الملكية للمحتوى ومساحات العمل.',
            body: [
              `يحتفظ المستخدم بملكية كاملة ومطلقة لجميع البيانات والجهات الاتصالية والصفحات والمحتوى الذي يتم رفعه أو إنشاؤه داخل مساحة عمله (Your Data Stays Yours). لا تدعي المنصة أي حق ملكية لمحتوى عملائك.`,
              `جميع العلامات التجارية، والشفرات البرمجية، وتصميمات واجهة المستخدم، ومحركات الأتمتة الخاصة بالمنصة هي ملكية فكرية حصرية لشركة Upclick Inc. ومحمية بقوانين الملكية الفكرية الدولية.`
            ]
          },
          {
            id: 'section-6',
            icon: Lock,
            title: '6. الاستخدام المقبول والممارسات المحظورة',
            desc: 'قواعد السلوك لضمان أمان وسلامة مجتمع المنصة.',
            body: [
              'يلتزم المستخدم بعدم استخدام المنصة لأي غرض غير قانوني أو ضار، بما في ذلك:',
              '• نشر محتوى احتيالي أو مضلل أو ينتهك حقوق الملكية الفكرية لأي طرف.',
              '• محاولة اختراق أو تعطيل البنية التحتية للمنصة أو تجاوز قيود الأمان أو الهندسة العكسية.',
              '• إرسال حملات تصيد احتيالي (Phishing) أو جمع بيانات المستخدمين دون موافقتهم الصريحة.',
              'يحق للمنصة تعليق أو إنهاء أي حساب يثبت تورطه في انتهاك جسيم لهذه القواعد دون إشعار مسبق وبلا استرداد مالي.'
            ]
          },
          {
            id: 'section-7',
            icon: AlertTriangle,
            title: '7. إخلاء المسؤولية وحدود المسؤولية القانونية',
            desc: 'الضمانات المحدودة وحدود التعويض.',
            body: [
              `يتم تقديم المنصة على أساس "كما هي" و"حسب توفرها" دون أي ضمانات صريحة أو ضمنية بما يتجاوز التزاماتنا التشغيلية. لا نتحمل المسؤولية عن أي خسائر غير مباشرة أو فقدان في الأرباح أو تعطل في الأعمال ناتج عن انقطاع خدمات شبكات الاتصال أو تغييرات سياسات منصات الطرف الثالث (مثل قيود منصة Meta).`,
              `في جميع الأحوال، يقتصر الحد الأقصى للمسؤولية الإجمالية للمنصة تجاه أي مطالبة على إجمالي المبالغ التي دفعها المستخدم للمنصة خلال الثلاثة أشهر السابقة للمطالبة.`
            ]
          },
          {
            id: 'section-8',
            icon: Mail,
            title: '8. إنهاء الخدمة، حل النزاعات، والتواصل',
            desc: 'آلية إنهاء الحسابات والقنوات الرسمية للاستفسارات القانونية.',
            body: [
              `يمكن للمستخدم إنهاء حسابه وطلب حذف بياناته في أي وقت من خلال صفحة إعدادات الحساب أو عبر صفحة تعليمات حذف البيانات المخصصة. يتم حذف وتطهير البيانات وفق المعايير المعتمدة خلال 30 يوماً من تأكيد الطلب.`,
              `لأي استفسارات قانونية أو إشعارات رسمية تتعلق بشروط الخدمة هذه، يرجى التواصل مع الفريق القانوني والدعم الفني عبر البريد الإلكتروني الرسمي:`
            ]
          }
        ]
      };
    }
    return {
      title: `Terms of Service & User Agreement - ${appName}`,
      subtitle: 'A legally binding agreement outlining the terms, rights, and responsibilities governing your use of the Upclick Platform.',
      effectiveDate: 'Effective Date: October 20, 2026',
      badgeCompliance: 'Meta Platform & Google Cloud Compliant',
      badgeLegal: 'Official SaaS Service License',
      searchPlaceholder: 'Search clauses in Terms of Service...',
      copySuccess: 'Terms of Service link copied to clipboard!',
      sections: [
        {
          id: 'section-1',
          icon: Scale,
          title: '1. Acceptance of Terms & Legal Eligibility',
          desc: 'Conditions of entry, binding agreement, and authorized corporate capacity.',
          body: [
            `By creating an account, accessing the ${appName} web application, or utilizing any of our automated workflows, AI copilot engines, or cloud modules, you expressly acknowledge and agree to be bound by these Terms of Service, our Privacy Policy, and our Data Deletion Guidelines.`,
            `If you are accessing or using the platform on behalf of a corporation, limited liability company, agency, or other legal entity, you represent and warrant that you hold full legal authority to bind that entity to this Agreement. You must be at least 18 years old to establish a workspace.`
          ],
          clauses: [
            { title: 'Account Accuracy', text: 'You agree to maintain truthful, accurate, and up-to-date registration and contact details.' },
            { title: 'Agency Governance', text: 'Platform Administrators and Agencies may provision client accounts under authorized tier quotas.' }
          ]
        },
        {
          id: 'section-2',
          icon: Cpu,
          title: '2. Platform Description, AI Copilot & Core Modules',
          desc: 'Scope of SaaS functionality, automation systems, and assistive AI engines.',
          body: [
            `The platform provides a comprehensive Business Operating System featuring: Funnel & Website Builder, CRM & Lead Deal Pipelines, Unified Multi-Channel Inbox (WhatsApp, Instagram, Web Chat, Email), Booking & Calendar Engine, Products & Commerce with integrated checkouts, Analytics & BI, and AI Copilot & Follow-Up Automation engines.`,
            `Our AI engines operate on foundation language models to generate contextual copy, assist with customer inquiries, and automate workflows. You acknowledge that AI output constitutes assistive suggestions, and you retain sole discretion and responsibility for reviewing and vetting communications before distribution.`
          ],
          clauses: [
            { title: 'High Availability', text: 'We design our architecture with target 99.9% uptime and redundant database persistence.' },
            { title: 'Continuous Evolution', text: 'We reserve the right to deploy updates, security patches, and workflow optimizations seamlessly.' }
          ]
        },
        {
          id: 'section-3',
          icon: Coins,
          title: '3. Subscription Tiers, Tool Entitlements & Credit Ledger',
          desc: 'Plan structures, monthly billing cycles, and append-only credit accounting.',
          body: [
            `The platform offers various recurring subscription tiers (monthly, annual), fixed terms, lifetime options, free trials, and modular add-ons. Module entitlements are enforced systematically according to your active subscription plan.`,
            `Communication and AI usage are calculated and audited via an append-only cryptographic credit ledger. Credits are deducted strictly upon verified execution (such as AI completions or outbound messaging). Monthly allocated credits expire at the end of each billing cycle without rollover unless specified by your plan tier.`
          ],
          clauses: [
            { title: 'Free Trial Policy', text: 'Free trials allow prospective businesses to test platform capabilities once per workspace.' },
            { title: 'Upgrades & Cancellations', text: 'You may modify your plan, purchase credit packs, or cancel renewals anytime via Plans & Pricing.' }
          ]
        },
        {
          id: 'section-4',
          icon: Globe,
          title: '4. Third-Party Integrations & Meta Platform Terms',
          desc: 'Strict adherence to WhatsApp Business, Instagram Graph API, and Facebook policies.',
          body: [
            `The platform integrates directly with official Meta APIs (WhatsApp Business Platform, Instagram Graph API, Facebook Pages), Google Calendar, Stripe, and PayPal. When authenticating external accounts, you agree to comply with Meta Developer Policies and Google API Terms of Service.`,
            `We never monetize, rent, or distribute your customer data to advertising brokers. Access tokens, webhook subscriptions, and permissions are stored with AES-256 cloud encryption and utilized exclusively to execute operations you explicitly authorize.`
          ],
          clauses: [
            { title: 'Encrypted Credential Storage', text: 'Authentication tokens and webhooks reside in isolated, authenticated Firebase vaults.' },
            { title: 'Anti-Spam Mandate', text: 'You may not utilize WhatsApp or email tools for unsolicited marketing or spamming.' }
          ]
        },
        {
          id: 'section-5',
          icon: ShieldCheck,
          title: '5. Intellectual Property & Customer Data Ownership',
          desc: 'Clear boundaries: Your data remains yours; our code remains ours.',
          body: [
            `You retain 100% full, exclusive ownership of all customer leads, contact rosters, conversation archives, visual assets, and funnel content uploaded or created within your workspace ("Your Data Stays Yours"). We claim no intellectual property rights over your proprietary business materials.`,
            `All software source code, visual components, algorithmic workflows, templates, brand assets, and platform trademarks are the sole and exclusive intellectual property of Upclick Inc. and are protected under international copyright and software treaties.`
          ]
        },
        {
          id: 'section-6',
          icon: Lock,
          title: '6. Acceptable Use Policy & Restricted Conduct',
          desc: 'Rules of engagement to maintain platform security, trust, and reputation.',
          body: [
            'You agree not to utilize the platform or any of its connected channels to:',
            '• Transmit fraudulent, defamatory, malicious, deceptive, or infringing content.',
            '• Attempt unauthorized access, security penetration, reverse engineering, or denial-of-service against our infrastructure.',
            '• Harvest, scrape, or process personal data without documented customer consent under applicable privacy regulations.',
            'Violation of our Acceptable Use Policy empowers the platform to suspend or terminate accounts immediately without refund.'
          ]
        },
        {
          id: 'section-7',
          icon: AlertTriangle,
          title: '7. Limitation of Liability & Warranty Disclaimer',
          desc: 'Statutory disclaimer of implied warranties and liability caps.',
          body: [
            `The platform and all included modules are provided on an "AS IS" and "AS AVAILABLE" basis without representations or warranties of any kind beyond our standard service commitments. We are not liable for incidental, indirect, or consequential damages resulting from telecommunications outages or external third-party API restrictions.`,
            `To the maximum extent permitted by applicable law, our aggregate liability for any cause of action arising out of this Agreement shall be limited to the total fees paid by you to the platform in the three (3) months preceding the incident.`
          ]
        },
        {
          id: 'section-8',
          icon: Mail,
          title: '8. Termination, Dispute Resolution & Legal Contact',
          desc: 'Account closure procedures, data retention grace periods, and official legal notices.',
          body: [
            `You may terminate your account at any time through workspace settings or by executing a formal deletion request via our Data Deletion page. Upon confirmed deletion, customer records and access credentials are permanently purged within 30 days.`,
            `For any legal inquiries, compliance audits, or formal notices regarding these Terms, please contact our Legal & Compliance Department:`
          ]
        }
      ]
    };
  }, [isRtl, appName]);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return content.sections;
    const query = searchQuery.toLowerCase();
    return content.sections.filter(s =>
      s.title.toLowerCase().includes(query) ||
      s.desc.toLowerCase().includes(query) ||
      s.body.some(b => b.toLowerCase().includes(query))
    );
  }, [content.sections, searchQuery]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    showToast.success(content.copySuccess);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="legal-page-shell" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Sticky Navbar */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="legal-header"
      >
        <div className="flex items-center gap-3">
          <Link to={isAuthenticated ? '/dashboard' : '/'} className="legal-brand" aria-label={appName}>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="legal-brand-logo">
              <FileText size={20} />
            </motion.div>
            <div className="legal-brand-text">
              <span className="legal-brand-title">{appName}</span>
              <span className="legal-brand-subtitle">{translateText("Legal & Compliance")}</span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2.5">
          <LanguageSwitcher />
          <ThemeToggle />

          {isAuthenticated ? (
            <Link to="/dashboard" className="legal-btn-pill secondary">
              <LayoutDashboard size={14} />
              <span>{translateText("Dashboard")}</span>
            </Link>
          ) : (
            <Link to="/login" className="legal-btn-pill primary">
              <LogIn size={14} />
              <span>{translateText("Sign In")}</span>
            </Link>
          )}
        </div>
      </motion.header>

      {/* Main Container */}
      <main className="legal-main-container">
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) navigate(-1);
              else navigate(isAuthenticated ? '/dashboard' : '/');
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-300 transition-colors cursor-pointer"
          >
            {isRtl ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
            <span>{translateText("Back")}</span>
          </button>
        </div>

        {/* Hero Card */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="legal-hero"
        >
          <div className="legal-hero-top">
            <div className="legal-hero-info">
              <div className="legal-hero-icon">
                <Scale size={24} />
              </div>
              <div className="legal-hero-heading">
                <h1>{content.title}</h1>
                <div className="legal-badges-row">
                  <span className="legal-badge purple">
                    <ShieldCheck size={12} />
                    {content.badgeLegal}
                  </span>
                  <span className="legal-badge green">
                    <CheckCircle2 size={12} />
                    {content.badgeCompliance}
                  </span>
                  <span className="legal-badge neutral">
                    <Calendar size={12} />
                    {content.effectiveDate}
                  </span>
                </div>
              </div>
            </div>

            <div className="legal-hero-actions">
              <button
                type="button"
                onClick={handleCopyLink}
                className="legal-action-btn"
                title={translateText("Copy page link")}
              >
                {copiedLink ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                <span>{copiedLink ? translateText("Copied!") : translateText("Share")}</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="legal-action-btn"
                title={translateText("Print or Save as PDF")}
              >
                <Printer size={14} />
                <span>{translateText("Print / PDF")}</span>
              </button>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl m-0">
            {content.subtitle}
          </p>

          {/* Quick Search & Sibling Policy Tabs */}
          <div className="legal-search-row">
            <div className="legal-search-box">
              <Search size={15} />
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={content.searchPlaceholder}
                className="legal-search-input"
              />
            </div>

            <div className="legal-nav-tabs">
              <Link to="/terms-of-service" className="legal-nav-tab active">
                {translateText("Terms of Service")}
              </Link>
              <Link to="/privacy" className="legal-nav-tab">
                {translateText("Privacy Policy")}
              </Link>
              <Link to="/data-deletion" className="legal-nav-tab">
                {translateText("Data Deletion")}
              </Link>
            </div>
          </div>
        </motion.section>

        {/* Two-Column Body */}
        <div className="legal-layout-body">
          {/* Table of Contents Sticky Sidebar */}
          <aside className="legal-toc-sidebar">
            <div className="legal-toc-header">
              <span>{translateText("Table of Contents")}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                {filteredSections.length}
              </span>
            </div>
            <ul className="legal-toc-list">
              {filteredSections.map(s => {
                const isActive = activeSection === s.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => scrollToSection(s.id)}
                      className={`legal-toc-link w-full ${isActive ? 'active' : ''}`}
                    >
                      <span className="truncate">{s.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
              <p className="m-0 flex items-center gap-1.5 font-medium">
                <Lock size={12} className="text-emerald-500" />
                <span>{translateText("Your data stays yours.")}</span>
              </p>
            </div>
          </aside>

          {/* Main Content Articles */}
          <section className="legal-content-area">
            {filteredSections.length === 0 ? (
              <div className="legal-section-card text-center py-12">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {translateText("No clauses match your search query.")}
                </p>
              </div>
            ) : (
              filteredSections.map(section => {
                const IconComponent = section.icon;
                return (
                  <motion.article
                    key={section.id}
                    id={section.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.35 }}
                    className="legal-section-card"
                  >
                    <div className="legal-section-title-wrap">
                      <div className="legal-section-title">
                        <div className="legal-section-icon">
                          <IconComponent size={17} />
                        </div>
                        <h2>{section.title}</h2>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                        {section.id.toUpperCase()}
                      </span>
                    </div>

                    <div className="legal-section-body">
                      {section.body.map((paragraph, pIdx) => (
                        <p key={pIdx} className="m-0">
                          {paragraph}
                        </p>
                      ))}

                      {section.clauses && (
                        <div className="legal-clause-grid">
                          {section.clauses.map((clause, cIdx) => (
                            <div key={cIdx} className="legal-clause-card">
                              <span className="legal-clause-card-title">
                                <CheckCircle2 size={14} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
                                {clause.title}
                              </span>
                              <span className="legal-clause-card-desc">{clause.text}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {section.id === 'section-8' && (
                        <div className="legal-callout mt-2">
                          <div className="flex flex-col gap-1 text-xs">
                            <strong>{translateText("Official Legal & Data Contact:")}</strong>
                            <a
                              href={`mailto:${supportEmail}`}
                              className="font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity"
                            >
                              {supportEmail}
                            </a>
                            <span className="text-slate-500 dark:text-slate-400">
                              {appName} · Legal & Compliance Dept.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.article>
                );
              })
            )}
          </section>
        </div>
      </main>

      {/* Floating Back to Top Button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="legal-back-to-top"
            aria-label={translateText("Back to top")}
          >
            <ChevronUp size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="legal-footer">
        <div className="legal-footer-links">
          <Link to="/terms-of-service">{translateText("Terms of Service")}</Link>
          <span>•</span>
          <Link to="/privacy">{translateText("Privacy Policy")}</Link>
          <span>•</span>
          <Link to="/data-deletion">{translateText("Data Deletion")}</Link>
          <span>•</span>
          <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
          <span>•</span>
          <a href={appUrl} target="_blank" rel="noopener noreferrer">
            {appUrl}
          </a>
        </div>
        <p className="m-0 text-slate-400 dark:text-slate-500">
          © {new Date().getFullYear()} {appName}. {translateText("All rights reserved.")}
        </p>
      </footer>
    </div>
  );
}

export default TermsOfServicePage;
