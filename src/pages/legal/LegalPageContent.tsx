// Adapted from the user-supplied upclick/src/components/LegalPageContent.js.
// Brand facts supplied for GOS-app override the reference's email and pricing.
import type { ReactNode } from 'react';
import { getLegalCopy, UPKLICK_CONTACT_INFO } from './legalNavigation';
import { translateText, useUILanguage } from '../../i18n/display';
const EFFECTIVE_DATE_EN = 'November 24, 2026';
const EFFECTIVE_DATE_AR = '24 نوفمبر 2026';
function CardSection({ num, title, children }: { num?: string; title: string; children: ReactNode }) {
  return <section className="uk-card"><h2>{num && <span className="uk-step-num">{num}</span>}{title}</h2><div>{children}</div></section>;
}
function PageHero({ titleMain, titleGradient, subtitle, isAr }: { badge: string; titleMain: string; titleGradient: string; subtitle: string; isAr: boolean }) {
  const language = useUILanguage();
  const index = titleMain === 'Privacy' ? 0 : titleMain === 'Terms of' ? 1 : titleMain === 'Refund &' ? 2 : 3;
  return <header className="uk-policy-heading"><h1>{isAr ? `${titleMain} ${titleGradient}` : getLegalCopy(language).labels[index]}</h1><p>{translateText(subtitle)}</p><small>{isAr ? 'آخر تحديث: ' + EFFECTIVE_DATE_AR : translateText('Last updated:') + ' ' + EFFECTIVE_DATE_EN}</small></header>;
}
export type LegalSection = 'privacy' | 'terms' | 'refund' | 'shipping' | 'contact';
export function LegalPageContent({ section, isAr }: { section: Exclude<LegalSection, 'contact'>; isAr: boolean }) {
  switch (section) {
    case 'privacy': return PrivacyPolicySection({ isAr });
    case 'terms': return TermsOfServiceSection({ isAr });
    case 'refund': return RefundPolicySection({ isAr });
    case 'shipping': return ShippingPolicySection({ isAr });
  }
}
function PrivacyPolicySection({ isAr }: { isAr: boolean }) {
  if (isAr) {
    return (
      <>
        <PageHero
          badge="الخصوصية وحماية البيانات"
          titleMain="سياسة"
          titleGradient="الخصوصية"
          subtitle="توضح هذه السياسة كيفية جمع واستخدام وحماية بياناتك الشخصية وبيانات التكامل مع منصات Meta داخل منصة UpKlick"
          isAr
        />

        <CardSection num="01" title="مقدمة ونطاق السياسة">
          <p style={{ margin: 0 }}>
            نرحب بك في <strong>UpKlick</strong> ("المنصة"، "نحن"). نحن نلتزم بحماية خصوصيتك وأمان بياناتك وفقاً لأعلى المعايير الدولية ولوائح حماية البيانات (بما في ذلك GDPR وCCPA وسياسات منصة Meta للمطورين). تنطبق سياسة الخصوصية هذه على جميع خدماتنا وتطبيقاتنا ومواقعنا وأدوات الذكاء الاصطناعي والتسويق المتاحة عبر UpKlick.
          </p>
        </CardSection>

        <CardSection num="02" title="البيانات التي نقوم بجمعها">
          <ul>
            <li><strong>بيانات الحساب والهوية:</strong> الاسم، البريد الإلكتروني، رقم الهاتف، اسم الشركة، وصورة الملف الشخصي عند التسجيل أو تسجيل الدخول.</li>
            <li><strong>بيانات الأعمال والعملاء (CRM & Funnels):</strong> صفحات الهبوط، المتاجر، النماذج، قوائم جهات الاتصال، وحملات البريد الإلكتروني والواتساب التي تنشئها داخل حسابك.</li>
            <li><strong>بيانات الدفع والفوترة:</strong> تتم معالجة المدفوعات بشكل آمن عبر مزودي دفع معتمدين (مثل Stripe) ولا نقوم بتخزين أرقام البطاقات الائتمانية الكاملة على خوادمنا.</li>
            <li><strong>البيانات التقنية وملفات تعريف الارتباط (Cookies):</strong> عنوان بروتوكول الإنترنت (IP)، نوع المتصفح، الجهاز، وسجلات الاستخدام لتحسين الأداء والأمان.</li>
          </ul>
        </CardSection>

        <CardSection num="03" title="بيانات تكامل منصات Meta (Facebook و Instagram و WhatsApp و Meta Ads)">
          <p style={{ marginTop: 0 }}>
            عند قيامك بربط حسابك في UpKlick مع خدمات شركة <strong>Meta Platforms, Inc.</strong> (بما في ذلك تسجيل الدخول عبر فيسبوك، صفحات فيسبوك، حسابات إنستغرام الاحترافية، واجهة برمجة تطبيقات WhatsApp Business، ومدير إعلانات Meta / Pixel)، نقوم بجمع ومعالجة الصلاحيات والبيانات التي تصرح بها صراحةً فقط:
          </p>
          <ul>
            <li><strong>معلومات الملف الشخصي الأساسية والمصادقة:</strong> المعرف الفريد (Meta User ID)، الاسم، والبريد الإلكتروني المستخدم لتوثيق هويتك وربط حسابك.</li>
            <li><strong>صفحات فيسبوك وحسابات إنستغرام الاحترافية:</strong> معرفات صفحات فيسبوك وحسابات إنستغرام، الأسماء، أسماء المستخدمين، وصور الملف الشخصي للحسابات التي تختار ربطها، وتُستخدم لعرضها داخل لوحة التحكم الخاصة بك وتوجيه رسائلها إلى صندوق الوارد الخاص بك.</li>
            <li><strong>رسائل فيسبوك ماسنجر ورسائل إنستغرام المباشرة (Messenger &amp; Instagram Direct Messages):</strong> عند ربط صفحة فيسبوك أو حساب إنستغرام احترافي، نتلقى الرسائل التي يرسلها العملاء إلى تلك الصفحة أو الحساب (معرف المرسل، الاسم، نص الرسالة، المرفقات، والطوابع الزمنية) عبر إشعارات ويب هوك الخاصة بـ Meta (Webhooks). نقوم بتخزينها في صندوق الوارد (UpKlick Inbox) الخاص بك لتتمكن من قراءتها والرد عليها، سواء يدوياً أو من خلال التدفقات التلقائية (Flows) وردود الذكاء الاصطناعي التي تقوم بإعدادها. نحن نرسل الرسائل فقط كردود على المحادثات التي يبدأها العملاء ضمن نافذة المراسلة المعتمدة من Meta.</li>
            <li><strong>المعالجة بالذكاء الاصطناعي (AI Processing):</strong> إذا قمت بتفعيل ردود الذكاء الاصطناعي، يتم إرسال نص الرسائل الواردة وقاعدة المعرفة الخاصة بك إلى مزودي نماذج الذكاء الاصطناعي لدينا حصرياً لتوليد رد نيابةً عنك. ولا يُسمح لهؤلاء المزودين باستخدام هذه البيانات لتدريب نماذجهم.</li>
            <li><strong>بيانات WhatsApp Business API:</strong> معرف حساب واتساب للأعمال (WABA ID)، أرقام الهواتف المسجلة، قوالب الرسائل، وحالة تسليم الرسائل لإدارة المحادثات والحملات التسويقية المصرح بها.</li>
            <li><strong>بيانات الإعلانات والـ Pixel (Meta Ads &amp; Leads):</strong> معرفات الحساب الإعلاني والبيكسل (Pixel ID)، أداء الحملات الإعلانية، وبيانات العملاء المحتملين (Lead Ads) لمزامنتها تلقائياً مع نظام CRM الخاص بك.</li>
          </ul>
          <p style={{ marginBottom: 0 }}>
            <strong>التزامنا الصارم بخصوص بيانات Meta:</strong> يتم استخدام البيانات المستلمة من واجهات برمجة تطبيقات Meta حصرياً لتشغيل الميزات التي طلبتها داخل لوحة تحكم UpKlick الخاصة بك. نحن <strong>لا نبيع</strong> بيانات Meta مطلقاً، ولا نشاركها مع وسطاء البيانات أو أطراف ثالثة لأغراض إعلانية مستقلة، ولا نستخدمها لبناء ملفات تعريف غير مصرح بها. يتم تخزين جميع رموز الوصول (OAuth Access Tokens) بشكل مشفر ويمكن إلغاؤها في أي وقت.
          </p>
        </CardSection>

        <CardSection num="04" title="كيف نستخدم بياناتك">
          <ul>
            <li>تقديم وتشغيل وتخصيص خدمات المنصة وأدوات الذكاء الاصطناعي وبناء المواقع والمتاجر.</li>
            <li>تشغيل صندوق الوارد الموحد للمحادثات، وتنفيذ عمليات النشر، وإرسال رسائل البريد الإلكتروني ورسائل WhatsApp Business نيابةً عنك وبناءً على طلبك.</li>
            <li>عرض تحليلات الأداء، وتتبع التحويلات الإعلانية، ومزامنة العملاء المحتملين.</li>
            <li>حماية المنصة من الاحتيال أو الاستخدام غير المصرح به والامتثال للمتطلبات القانونية.</li>
          </ul>
        </CardSection>

        <CardSection num="05" title="مشاركة البيانات وتخزينها وأمنها">
          <p style={{ marginTop: 0 }}>
            نطبق ضوابط أمان قياسية تشمل تشفير HTTPS/TLS أثناء النقل، وضوابط وصول مقيدة، وبنية تحتية سحابية آمنة (Google Cloud / Firebase، وAWS SES، وVercel، ومزودي نماذج الذكاء الاصطناعي). نحن نشارك البيانات فقط مع معالجات البنية التحتية الفرعية الأساسية اللازمة لتقديم الخدمة (الاستضافة السحابية عبر Vercel وGoogle Cloud / Firebase، معالجة المدفوعات، مزودي نماذج الذكاء الاصطناعي، وواجهات برمجة التطبيقات التي تربطها صراحةً). نحتفظ بالبيانات الشخصية وبيانات التكامل فقط طوال فترة نشاط حسابك أو حسب الحاجة لتنفيذ طلباتك.
          </p>
          <p style={{ marginBottom: 0 }}>
            يتم الاحتفاظ بالرسائل وبيانات الحسابات المرتبطة طوال فترة بقاء التكامل نشطاً. يؤدي فصل التكامل إلى حذف رموز الوصول الخاصة به فوراً؛ بينما يظل سجل المحادثات محفوظاً في مساحة العمل الخاصة بك حتى تقوم بحذفه أو تطلب حذفه. يتم حذف جميع بيانات Meta خلال 30 يوماً من حذف الحساب أو تقديم طلب حذف البيانات.
          </p>
        </CardSection>

        <CardSection num="06" title="حقوقك وكيفية حذف بياناتك">
          <p style={{ margin: 0 }}>
            يحق لك في أي وقت الوصول إلى بياناتك، تصحيحها، تصديرها، أو طلب حذفها بالكامل. يمكنك إلغاء ربط تكاملات Meta مباشرةً من لوحة التحكم أو طلب الحذف الفوري عبر صفحة{' '}
            <a href="/data-deletion">تعليمات وطلب حذف البيانات (/data-deletion)</a>.
          </p>
        </CardSection>

        <CardSection num="07" title="التواصل معنا (Contact Us)">
          <p style={{ marginTop: 0 }}>
            إذا كانت لديك أي استفسارات حول سياسة الخصوصية أو ممارسات حماية البيانات لدينا، يمكنك التواصل معنا مباشرة:
          </p>
          <ul>
            <li><strong>رقم الهاتف داخل مصر (Mobile No inside Egypt):</strong> <a href={UPKLICK_CONTACT_INFO.phoneHref} dir="ltr">{UPKLICK_CONTACT_INFO.phoneDisplay}</a> ({UPKLICK_CONTACT_INFO.phoneLocal})</li>
            <li><strong>البريد الإلكتروني (Email):</strong> <a href={`mailto:${UPKLICK_CONTACT_INFO.emailPrimary}`}>{UPKLICK_CONTACT_INFO.emailPrimary}</a></li>
            <li><strong>العنوان (Address):</strong> {UPKLICK_CONTACT_INFO.addressAr}</li>
          </ul>
        </CardSection>
      </>
    );
  }

  return (
    <>
      <PageHero
        badge="PRIVACY & DATA PROTECTION"
        titleMain="Privacy"
        titleGradient="Policy"
        subtitle="How UpKlick collects, uses, protects, and handles your personal data and Meta Platform integrations"
        isAr={false}
      />

      <CardSection num="01" title="Introduction & Scope">
        <p style={{ margin: 0 }}>
          Welcome to <strong>UpKlick</strong> (&ldquo;UpKlick&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;). This Privacy Policy explains how we collect, use, store, and protect information when you use our platform, websites, funnels, e-commerce stores, AI tools, CRM, outreach tools, and third-party integrations (including Meta Platforms, Inc. services). By using UpKlick, you agree to the practices described in this Privacy Policy.
        </p>
      </CardSection>

      <CardSection num="02" title="Information We Collect">
        <ul>
          <li><strong>Account & Profile Information:</strong> Name, email address, phone number, business name, and profile photo provided when registering or authenticating.</li>
          <li><strong>Business, CRM & Funnel Data:</strong> Websites, funnels, stores, forms, contacts, leads, and campaign content you create or manage within your workspace.</li>
          <li><strong>Billing & Transaction Data:</strong> Subscription and payment details processed securely by PCI-compliant payment processors (such as Stripe). We do not store raw credit card numbers on our servers.</li>
          <li><strong>Technical & Usage Data:</strong> IP address, browser type, device identifiers, log data, and cookies used for authentication, security, and analytics.</li>
        </ul>
      </CardSection>

      <CardSection num="03" title="Meta Platform Data (Facebook, Instagram, WhatsApp Business & Meta Ads)">
        <p style={{ marginTop: 0 }}>
          When you connect your UpKlick account to <strong>Meta Platforms, Inc.</strong> services (including Facebook Login, Facebook Pages, Instagram Business Accounts, WhatsApp Business Platform / Cloud API, Meta Ads Manager, Meta Pixel, and Conversions API), we collect and process only the permissions and data you explicitly authorize:
        </p>
        <ul>
          <li><strong>Authentication & Basic Profile:</strong> Your Meta User ID, name, and email address used to authenticate your identity and link your account.</li>
          <li><strong>Facebook Pages & Instagram Professional Accounts:</strong> Page and Instagram account IDs, names, usernames and profile pictures for the accounts you choose to connect, used to show them in your dashboard and route their messages to your Inbox.</li>
          <li><strong>Messenger & Instagram Direct Messages:</strong> When you connect a Facebook Page or Instagram professional account, we receive the messages that customers send to that Page or account (sender ID, name, message text, attachments and timestamps) through Meta webhooks. We store them in your UpKlick Inbox so you can read and reply to them, either manually or through automated Flows and AI replies that you configure. We only send messages as replies to customer-initiated conversations within Meta&apos;s messaging window.</li>
          <li><strong>AI Processing:</strong> If you enable AI replies, the text of incoming messages and your knowledge base is sent to our AI model providers solely to generate a reply for you. These providers are not allowed to use this data to train their models.</li>
          <li><strong>WhatsApp Business Platform Data:</strong> WhatsApp Business Account (WABA) ID, registered phone number IDs, approved message templates, webhook delivery statuses, and customer-initiated or opt-in messaging metadata.</li>
          <li><strong>Meta Ads, Pixel & Lead Ads Data:</strong> Ad account IDs, Meta Pixel IDs, campaign performance metrics, and lead form submissions synced into your UpKlick CRM at your direction.</li>
        </ul>
        <p style={{ marginBottom: 0 }}>
          <strong>Strict Limitation on Meta Data Use:</strong> Data obtained through Meta APIs is used strictly to provide the features you request inside your UpKlick dashboard. We <strong>never sell, license, or transfer</strong> Meta Platform Data to data brokers or third parties for independent advertising, nor do we use it to build unauthorized user profiles. All OAuth access tokens are stored encrypted and can be revoked at any time.
        </p>
      </CardSection>

      <CardSection num="04" title="How We Use Your Information">
        <ul>
          <li>To provide, operate, maintain, and improve the UpKlick platform and AI-powered business tools.</li>
          <li>To execute social media publishing, analytics reporting, Meta Pixel tracking, and WhatsApp/email outreach campaigns initiated by you.</li>
          <li>To authenticate users, prevent fraud, enforce our Terms of Service, and comply with legal obligations.</li>
          <li>To send transactional notifications, security alerts, and customer support responses.</li>
        </ul>
      </CardSection>

      <CardSection num="05" title="Data Sharing, Storage & Security">
        <p style={{ marginTop: 0 }}>
          We implement industry-standard security controls including HTTPS/TLS encryption in transit, restricted access controls, and secure cloud infrastructure (Vercel, Google Cloud / Firebase, AWS SES, and AI model providers). We share data only with essential infrastructure sub-processors required to deliver the service (cloud hosting on Vercel and Google Cloud / Firebase, payment processing, AI model providers, and APIs you explicitly connect). We retain personal and integration data only for as long as your account remains active or as needed to fulfill your requests.
        </p>
        <p style={{ marginBottom: 0 }}>
          Messages and connected-account data are kept while the integration is active. Disconnecting an integration deletes its access tokens immediately; conversation history is kept in your workspace until you delete it or request deletion. All Meta data is deleted within 30 days of an account deletion or a data deletion request.
        </p>
      </CardSection>

      <CardSection num="06" title="Your Privacy Rights & Data Deletion">
        <p style={{ margin: 0 }}>
          Depending on your jurisdiction (including GDPR, UK GDPR, and CCPA), you have the right to access, correct, export, restrict processing of, or delete your personal data and connected Meta Platform data. You may disconnect Meta integrations at any time from your dashboard or request complete data deletion via our dedicated{' '}
          <a href="/data-deletion">User Data Deletion page (/data-deletion)</a>.
        </p>
      </CardSection>

      <CardSection num="07" title="Contact Us">
        <p style={{ marginTop: 0 }}>
          For any questions, privacy requests, or Data Protection Officer inquiries regarding this Privacy Policy, please contact us at:
        </p>
        <ul>
          <li><strong>Mobile Number (Egypt):</strong> <a href={UPKLICK_CONTACT_INFO.phoneHref}>{UPKLICK_CONTACT_INFO.phoneDisplay}</a> ({UPKLICK_CONTACT_INFO.phoneLocal})</li>
          <li><strong>Email Address:</strong> <a href={`mailto:${UPKLICK_CONTACT_INFO.emailPrimary}`}>{UPKLICK_CONTACT_INFO.emailPrimary}</a></li>
          <li><strong>Physical Address:</strong> {UPKLICK_CONTACT_INFO.addressEn}</li>
        </ul>
      </CardSection>
    </>
  );
}

function TermsOfServiceSection({ isAr }: { isAr: boolean }) {
  if (isAr) {
    return (
      <>
        <PageHero
          badge="الشروط والأحكام القانونية"
          titleMain="شروط"
          titleGradient="الخدمة"
          subtitle="الشروط والأحكام التي تنظم استخدامك لمنصة UpKlick وجميع الأدوات والتكاملات المرتبطة بها"
          isAr
        />

        <CardSection num="01" title="قبول الشروط">
          <p style={{ margin: 0 }}>
            باستخدامك لمنصة <strong>UpKlick</strong> أو إنشاء حساب عليها، فإنك توافق على الالتزام بشروط الخدمة هذه وسياسة الخصوصية الخاصة بنا. إذا كنت تستخدم المنصة نيابةً عن شركة أو مؤسسة، فإنك تقر بأن لديك الصلاحية القانونية لإلزام تلك الجهة بهذه الشروط.
          </p>
        </CardSection>

        <CardSection num="02" title="وصف الخدمة">
          <p style={{ margin: 0 }}>
            توفر UpKlick نظام تشغيل متكاملاً مدعوماً بالذكاء الاصطناعي لرواد الأعمال وصناع المحتوى والشركات، ويشمل: بناء الفانلز والمواقع والمتاجر الإلكترونية، إدارة علاقات العملاء (CRM)، صندوق وارد موحد لرسائل فيسبوك ماسنجر ورسائل إنستغرام المباشرة (Facebook Messenger &amp; Instagram Direct messages)، أدوات التسويق عبر البريد الإلكتروني وواتساب، إدارة المجتمعات والدورات،حجز النطاقات، التحليلات، والربط مع منصات التواصل الاجتماعي والإعلانات (بما في ذلك Meta وGoogle وTelegram).
          </p>
        </CardSection>

        <CardSection num="03" title="تسجيل الحساب والأمان">
          <ul>
            <li>يجب أن تكون المعلومات المقدمة عند التسجيل صحيحة ودقيقة ومحدثة.</li>
            <li>أنت مسؤول بالكامل عن الحفاظ على سرية بيانات الدخول الخاصة بحسابك وعن جميع الأنشطة التي تتم من خلاله.</li>
            <li>يجب إخطارنا فوراً عبر <a href="mailto:support@upklick.net">support@upklick.net</a> عند الاشتباه بأي استخدام غير مصرح به لحسابك.</li>
          </ul>
        </CardSection>

        <CardSection num="04" title="التكامل مع خدمات Meta والجهات الخارجية">
          <p style={{ marginTop: 0 }}>
            عند ربط حسابك في UpKlick مع خدمات <strong>Meta</strong> (فيسبوك، إنستغرام، WhatsApp Business، أو Meta Ads) أو أي منصات خارجية أخرى:
          </p>
          <ul>
            <li>أنت تقر بأن لديك الصلاحية القانونية لربط وإدارة الصفحات وحسابات إنستغرام والحسابات الإعلانية وأرقام WhatsApp Business المرتبطة.</li>
            <li>تلتزم بالامتثال الكامل لشروط منصة Meta (Meta Platform Terms)، والشروط التجارية لـ Meta، وسياسات المراسلة التجارية لـ WhatsApp.</li>
            <li>سوف تستخدم مراسلات Messenger وInstagram فقط للرد على الأشخاص الذين تواصلوا مع صفحتك أو حسابك، ضمن نافذة المراسلة القياسية الخاصة بـ Meta، وبما يتوافق مع سياسة منصة Messenger وسياسة منصة Instagram.</li>
            <li>إذا قمت بتفعيل الردود التلقائية (التدفقات Flows أو الذكاء الاصطناعي AI)، فيجب عليك إبلاغ العملاء بأنهم قد يتحدثون إلى مساعد آلي حيثما كان ذلك مطلوباً، وتوفير وسيلة لهم للتواصل مع موظف بشري.</li>
            <li>أنت مسؤول عن محتوى الرسائل المرسلة من مساحة العمل الخاصة بك، بما في ذلك الردود التلقائية.</li>
            <li>يجب الحصول على موافقة مسبقة صالحة (Opt-in) من المستلمين قبل إرسال رسائل تسويقية عبر حملات واتساب أو البريد الإلكتروني واحترام جميع طلبات إلغاء الاشتراك فوراً.</li>
          </ul>
        </CardSection>

        <CardSection title="سياسة الاستخدام المقبول">
          <p>يحظر استخدام UpKlick لنشر محتوى غير قانوني أو احتيالي، أو إرسال رسائل مزعجة، أو توزيع برمجيات ضارة، أو انتهاك حقوق الملكية الفكرية، أو تجاوز ضوابط الأمان. قد تؤدي المخالفات إلى تعليق الحساب أو إنهائه.</p>
        </CardSection>
        <CardSection num="05" title="الاشتراكات والمدفوعات والأرصدة">
          <p style={{ margin: 0 }}>
            سعر الاشتراك 99 دولاراً أمريكياً. تخضع الخطط المدفوعة وشراء الدومينات وأرصدة الرسائل للأسعار الموضحة داخل المنصة وقت الشراء. يتم تجديد الاشتراكات الدورية تلقائياً ما لم يتم إلغاؤها قبل موعد التجديد من إعدادات الفوترة.
          </p>
        </CardSection>

        <CardSection num="06" title="الملكية الفكرية والمحتوى">
          <p style={{ margin: 0 }}>
            تحتفظ أنت بملكية جميع البيانات والمحتويات والمواقع وقوائم العملاء التي تنشئها أو ترفعها على UpKlick. وتمنحنا ترخيصاً محدوداً لاستضافة ومعالجة هذا المحتوى فقط بالقدر اللازم لتقديم خدمات المنصة لك. جميع حقوق البرمجيات والعلامات التجارية والتصاميم الخاصة بـ UpKlick محفوظة للمنصة.
          </p>
        </CardSection>

        <CardSection num="07" title="إنهاء الحساب وتحديد المسؤولية">
          <p style={{ margin: 0 }}>
            يمكنك إغلاق حسابك وطلب حذف بياناتك في أي وقت. كما نحتفظ بالحق في تعليق أو إنهاء الحسابات التي تنتهك شروط الاستخدام أو سياسات مكافحة الرسائل المزعجة. يتم تقديم الخدمة "كما هي" دون ضمانات ضمنية، ولا تتجاوز مسؤوليتنا القانونية إجمالي المبالغ المدفوعة من قبلك خلال الاثني عشر شهراً السابقة.
          </p>
        </CardSection>

        <CardSection num="08" title="التواصل والدعم القانوني">
          <p style={{ margin: 0 }}>
            لأي استفسارات تتعلق بشروط الخدمة، يرجى التواصل معنا عبر البريد الإلكتروني:{' '}
            <a href="mailto:support@upklick.net">support@upklick.net</a>
          </p>
        </CardSection>
      </>
    );
  }

  return (
    <>
      <PageHero
        badge="LEGAL AGREEMENT"
        titleMain="Terms of"
        titleGradient="Service"
        subtitle="The terms and conditions governing your access to and use of the UpKlick platform and integrations"
        isAr={false}
      />

      <CardSection num="01" title="Acceptance of Terms">
        <p style={{ margin: 0 }}>
          By accessing or using <strong>UpKlick</strong> (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service and our{' '}
          <a href="/privacy-policy">Privacy Policy</a>. If you are using the Service on behalf of a business or legal entity, you represent and warrant that you have the authority to bind that entity to these Terms.
        </p>
      </CardSection>

      <CardSection num="02" title="Description of Service">
        <p style={{ margin: 0 }}>
          UpKlick provides an AI-powered business operating system including website, funnel, and e-commerce store builders, CRM, a unified Inbox for Facebook Messenger and Instagram Direct messages, email and WhatsApp outreach tools, memberships and communities, domain registration, analytics, and integrations with third-party platforms including Meta (Facebook, Instagram, WhatsApp Business, Meta Ads).
        </p>
      </CardSection>

      <CardSection num="03" title="Account Registration & Security">
        <ul>
          <li>You must provide accurate, current, and complete information during registration.</li>
          <li>You are solely responsible for safeguarding your account credentials and for all activity occurring under your account.</li>
          <li>You must notify us immediately at <a href="mailto:support@upklick.net">support@upklick.net</a> of any unauthorized access or security breach.</li>
        </ul>
      </CardSection>

      <CardSection num="04" title="Meta Platform & Third-Party Integrations">
        <p style={{ marginTop: 0 }}>
          When you connect your UpKlick workspace to <strong>Meta Platforms, Inc.</strong> services (Facebook Login, Facebook Pages, Instagram Professional Accounts, WhatsApp Business Platform, Meta Pixel, or Meta Ads) or other third-party services:
        </p>
        <ul>
          <li>You represent that you are authorized to connect and manage the respective Pages, Instagram accounts, Ad Accounts, and WhatsApp Business numbers.</li>
          <li>You agree to comply with all applicable Meta policies, including the Meta Platform Terms, Meta Commercial Terms, and the WhatsApp Business Messaging Policy.</li>
          <li>You will use Messenger and Instagram messaging only to respond to people who contacted your Page or account, within Meta&apos;s standard messaging window, and in compliance with the Messenger Platform Policy and the Instagram Platform Policy.</li>
          <li>If you enable automated replies (Flows or AI), you must tell customers they may be talking to an automated assistant where required, and give them a way to reach a human.</li>
          <li>You are responsible for the content of messages sent from your workspace, including automated replies.</li>
          <li>You must obtain valid prior opt-in consent from recipients before sending marketing messages via WhatsApp or email campaigns and honor all unsubscribe/opt-out requests promptly.</li>
        </ul>
      </CardSection>

      <CardSection num="05" title="Acceptable Use Policy">
        <p style={{ margin: 0 }}>
          You agree not to use UpKlick to transmit unlawful, deceptive, defamatory, or fraudulent content, send unsolicited bulk spam, distribute malware, violate intellectual property rights, or bypass platform security or rate limits. Violation of this policy may result in immediate suspension or termination of your account.
        </p>
      </CardSection>

      <CardSection num="06" title="Subscriptions, Billing & Credits">
        <p style={{ margin: 0 }}>
          The subscription price is $99. Paid plans, custom domain registrations, and messaging/AI credit bundles are billed in advance according to the pricing displayed at checkout. Recurring subscriptions automatically renew unless cancelled prior to the renewal date in your Billing Settings.
        </p>
      </CardSection>

      <CardSection num="07" title="Intellectual Property & User Content">
        <p style={{ margin: 0 }}>
          You retain full ownership of all content, websites, customer lists, and data you upload or create in UpKlick. You grant UpKlick a limited, non-exclusive license to host, process, and transmit your content solely as necessary to provide the Service. All UpKlick software, branding, templates, and proprietary algorithms remain the exclusive property of UpKlick.
        </p>
      </CardSection>

      <CardSection num="08" title="Termination, Disclaimer & Limitation of Liability">
        <p style={{ margin: 0 }}>
          You may terminate your account and request full data deletion at any time via your dashboard or our{' '}
          <a href="/data-deletion">Data Deletion page</a>. The Service is provided &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; without warranties of any kind. To the maximum extent permitted by law, UpKlick shall not be liable for indirect, incidental, or consequential damages.
        </p>
      </CardSection>

      <CardSection num="09" title="Contact Information">
        <p style={{ margin: 0 }}>
          Questions about these Terms of Service should be sent to:{' '}
          <a href="mailto:support@upklick.net">support@upklick.net</a>
        </p>
      </CardSection>
    </>
  );
}

function RefundPolicySection({ isAr }: { isAr: boolean }) {
  if (isAr) {
    return (
      <>
        <PageHero
          badge="سياسة الاسترجاع والإلغاء · REFUND & CANCELLATION POLICY"
          titleMain="سياسة الاسترجاع"
          titleGradient="والإلغاء"
          subtitle="سياسة الاسترداد وإلغاء الاشتراكات الخاصة بالخدمات الرقمية والاشتراكات السحابية على منصة UpKlick"
          isAr
        />

        <div
          style={{
            background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.16), rgba(108, 53, 255, 0.16))',
            border: '1px solid rgba(255, 107, 53, 0.45)',
            borderRadius: 20,
            padding: '22px 26px',
            marginBottom: 24
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--t1)', marginBottom: 6 }}>
            بيان سياسة الاسترجاع الرسمي (Official Refund Policy Statement):
          </div>
          <div style={{ color: 'var(--t1)', fontSize: 15.5, fontWeight: 700 }}>
            لا يوجد استرداد نقدي للمبالغ المدفوعة بعد تفعيل الاشتراك الرقمي — &ldquo;There is no refund&rdquo;.
          </div>
        </div>

        <CardSection num="01" title="سياسة عدم الاسترداد (No Refund Policy — There is no refund)">
          <p style={{ marginTop: 0 }}>
            نظراً لأن <strong>UpKlick</strong> تقدم خدمات برمجية سحابية رقمية فورية (SaaS)، وأدوات ذكاء اصطناعي، وأرصدة رسائل وتسويق إلكتروني يتم تفعيلها وإتاحتها للمشترك فور إتمام عملية الدفع، فإن السياسة المعتمدة للمنصة هي: <strong>لا يوجد استرداد (There is no refund)</strong> لأي رسوم اشتراك شهري أو سنوي أو أرصدة إضافية بعد إتمام الدفع وتفعيل الخدمة.
          </p>
          <ul>
            <li><strong>There is no refund:</strong> جميع المدفوعات النهائية غير قابلة للاسترداد النقدي الكلي أو الجزئي بمجرد تفعيل الحساب أو الباقة.</li>
            <li>ننصح جميع المستخدمين بمراجعة تفاصيل الاشتراك ومميزاته بسعر 99 دولاراً أمريكياً قبل إتمام الدفع.</li>
          </ul>
        </CardSection>

        <CardSection num="02" title="سياسة إلغاء الاشتراك (Cancellation Policy)">
          <ul>
            <li><strong>حرية الإلغاء في أي وقت:</strong> يحق للمشترك إلغاء التجديد التلقائي لاشتراكه في أي وقت من خلال لوحة التحكم (إعدادات الفوترة والاشتراك) أو بالتواصل مع فريق الدعم قبل موعد التجديد القادم.</li>
            <li><strong>استمرار الخدمة حتى نهاية الفترة المدفوعة:</strong> عند طلب إلغاء الاشتراك، سيظل حسابك نشطاً وتتمتع بكامل صلاحيات الباقة حتى نهاية دورة الفوترة الحالية المدفوعة بالكامل، ولن يتم خصم أي مبالغ مستقبلية.</li>
            <li><strong>شراء النطاقات (Custom Domains):</strong> رسوم حجز النطاقات الخاصة غير قابلة للإلغاء أو الاسترداد بعد تسجيل النطاق رسمياً باسم العميل لدى مسجل النطاقات الدولي.</li>
          </ul>
        </CardSection>

        <CardSection num="03" title="الأخطاء التقنية أو الخصم المكرر">
          <p style={{ margin: 0 }}>
            في حالة حدوث خطأ تقني ناتج عن بوابة الدفع أدى إلى خصم نفس قيمة الاشتراك مرتين عن طريق الخطأ (Duplicate Charge)، يرجى التواصل مع خدمة العملاء خلال 48 ساعة من العملية مرفقاً بإيصال المعاملة لمراجعتها ومعالجة العملية المكررة.
          </p>
        </CardSection>

        <CardSection num="04" title="التواصل مع قسم الفوترة والدعم (Contact Us)">
          <p style={{ marginTop: 0 }}>
            لأي استفسار يخص الفوترة أو طلبات إلغاء التجديد التلقائي، تواصل معنا عبر البيانات الرسمية التالية داخل جمهورية مصر العربية:
          </p>
          <ul>
            <li><strong>رقم الموبايل داخل مصر:</strong> <a href={UPKLICK_CONTACT_INFO.phoneHref} dir="ltr">{UPKLICK_CONTACT_INFO.phoneDisplay}</a> ({UPKLICK_CONTACT_INFO.phoneLocal})</li>
            <li><strong>البريد الإلكتروني:</strong> <a href={`mailto:${UPKLICK_CONTACT_INFO.emailPrimary}`}>{UPKLICK_CONTACT_INFO.emailPrimary}</a></li>
            <li><strong>العنوان:</strong> {UPKLICK_CONTACT_INFO.addressAr}</li>
          </ul>
        </CardSection>
      </>
    );
  }

  return (
    <>
      <PageHero
        badge="REFUND & CANCELLATION POLICY"
        titleMain="Refund &"
        titleGradient="Cancellation Policy"
        subtitle="Official refund and subscription cancellation terms for UpKlick digital SaaS plans and services"
        isAr={false}
      />

      <div
        style={{
          background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.16), rgba(108, 53, 255, 0.16))',
          border: '1px solid rgba(255, 107, 53, 0.45)',
          borderRadius: 20,
          padding: '22px 26px',
          marginBottom: 24
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--t1)', marginBottom: 6 }}>
          Official Refund Policy Statement:
        </div>
        <div style={{ color: 'var(--t1)', fontSize: 16, fontWeight: 800 }}>
          There is no refund. All digital subscription fees and digital service purchases are final and non-refundable once activated.
        </div>
      </div>

      <CardSection num="01" title="Refund Policy — There is no refund">
        <p style={{ marginTop: 0 }}>
          <strong>There is no refund.</strong> Because <strong>UpKlick</strong> provides instant-access digital cloud software (SaaS), AI automation tools, funnel/store builders, and digital credits that are provisioned immediately upon payment confirmation, all sales are final and <strong>there is no refund</strong> (neither full nor partial) once a subscription or digital plan is activated.
        </p>
        <ul>
          <li><strong>No Refunds on Subscriptions:</strong> Subscriptions priced at $99 are non-refundable after subscription or digital service activation.</li>
          <li><strong>No Refunds on Digital Add-ons & Domains:</strong> AI credits, messaging credits, and custom domain registrations cannot be refunded once provisioned.</li>
        </ul>
      </CardSection>

      <CardSection num="02" title="Subscription Cancellation Policy">
        <ul>
          <li><strong>Cancel Anytime:</strong> You may cancel your recurring subscription renewal at any time directly from your UpKlick Dashboard under Billing Settings or by contacting our support team prior to your next billing date.</li>
          <li><strong>Access Until End of Billing Cycle:</strong> Upon cancellation, your account will remain active with full access to your paid plan features until the end of your current paid billing period, and no further recurring charges will be made.</li>
        </ul>
      </CardSection>

      <CardSection num="03" title="Duplicate Charges & Billing Support">
        <p style={{ margin: 0 }}>
          In the event of an accidental duplicate transaction caused by a technical payment gateway error, please contact our support team within 48 hours with your transaction reference so we can verify and resolve the duplicate charge.
        </p>
      </CardSection>

      <CardSection num="04" title="Contact Us (Billing & Customer Support)">
        <p style={{ marginTop: 0 }}>
          For any billing questions or cancellation assistance, please reach out to us via our official Egypt contact channels:
        </p>
        <ul>
          <li><strong>Mobile No. inside Egypt:</strong> <a href={UPKLICK_CONTACT_INFO.phoneHref}>{UPKLICK_CONTACT_INFO.phoneDisplay}</a> ({UPKLICK_CONTACT_INFO.phoneLocal})</li>
          <li><strong>Email Address:</strong> <a href={`mailto:${UPKLICK_CONTACT_INFO.emailPrimary}`}>{UPKLICK_CONTACT_INFO.emailPrimary}</a></li>
          <li><strong>Physical Address:</strong> {UPKLICK_CONTACT_INFO.addressEn}</li>
        </ul>
      </CardSection>
    </>
  );
}

function ShippingPolicySection({ isAr }: { isAr: boolean }) {
  if (isAr) {
    return (
      <>
        <PageHero
          badge="سياسة الشحن والتسليم · SHIPPING & DELIVERY POLICY"
          titleMain="سياسة الشحن"
          titleGradient="والتسليم"
          subtitle="توضيح طبيعة التسليم الرقمي الفوري لخدمات واشتراكات منصة UpKlick السحابية"
          isAr
        />

        <div
          style={{
            background: 'linear-gradient(135deg, rgba(0, 217, 139, 0.14), rgba(108, 53, 255, 0.16))',
            border: '1px solid rgba(0, 217, 139, 0.45)',
            borderRadius: 20,
            padding: '22px 26px',
            marginBottom: 24
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--t1)', marginBottom: 6 }}>
            بيان سياسة الشحن الرسمي (Official Shipping Policy Statement):
          </div>
          <div style={{ color: 'var(--t1)', fontSize: 15.5, fontWeight: 700 }}>
            لا يوجد شحن مادي للمنتجات — &ldquo;There is no shipping&rdquo; (جميع خدماتنا ومنتجاتنا رقمية سحابية 100% يتم تفعيلها وتسليمها إلكترونياً بشكل فوري).
          </div>
        </div>

        <CardSection num="01" title="سياسة الشحن (Shipping Policy — There is no shipping)">
          <p style={{ marginTop: 0 }}>
            <strong>There is no shipping (لا يوجد شحن مادي).</strong> منصة <strong>UpKlick</strong> هي منصة برمجيات سحابية كخدمة (Cloud SaaS Platform) تقدم أدوات رقمية لرواد الأعمال والشركات (بناء المواقع والفانلز والمتاجر، إدارة علاقات العملاء CRM، أدوات الذكاء الاصطناعي، وأدوات التسويق الرقمي). نحن لا نبيع أو نشحن أي سلع مادية ملموسة، وبالتالي <strong>لا يوجد شحن (There is no shipping)</strong> ولا توجد أي رسوم شحن أو شركات توصيل.
          </p>
        </CardSection>

        <CardSection num="02" title="آلية التسليم الرقمي الفوري (Instant Digital Delivery)">
          <ul>
            <li><strong>التفعيل الفوري (Instant Activation):</strong> فور إتمام عملية الدفع الإلكتروني بنجاح، يتم تفعيل الباقة المشترك بها (99 دولاراً أمريكياً) تلقائياً وفوراً على حساب العميل في نفس اللحظة.</li>
            <li><strong>إشعار التأكيد:</strong> يتلقى العميل رسالة تأكيد إلكترونية على البريد الإلكتروني المسجل تتضمن تفاصيل الباقة المفعلة وإيصال الدفع الرقمي.</li>
            <li><strong>كيفية الوصول للخدمة:</strong> يمكن للعميل الدخول مباشرة إلى لوحة التحكم عبر الرابط <a href="/dashboard">UpKlick</a> واستخدام كافة الأدوات والميزات المشمولة في باقته على مدار الساعة.</li>
          </ul>
        </CardSection>

        <CardSection num="03" title="التأخر في التفعيل والدعم الفني (Contact Us)">
          <p style={{ marginTop: 0 }}>
            في حال واجهت أي تأخر غير معتاد في ظهور تفعيل الباقة بعد الدفع، يرجى التواصل الفوري مع فريق الدعم الفني لدينا لتفعيلها فوراً:
          </p>
          <ul>
            <li><strong>رقم الموبايل داخل مصر:</strong> <a href={UPKLICK_CONTACT_INFO.phoneHref} dir="ltr">{UPKLICK_CONTACT_INFO.phoneDisplay}</a> ({UPKLICK_CONTACT_INFO.phoneLocal})</li>
            <li><strong>البريد الإلكتروني:</strong> <a href={`mailto:${UPKLICK_CONTACT_INFO.emailPrimary}`}>{UPKLICK_CONTACT_INFO.emailPrimary}</a></li>
            <li><strong>العنوان:</strong> {UPKLICK_CONTACT_INFO.addressAr}</li>
          </ul>
        </CardSection>
      </>
    );
  }

  return (
    <>
      <PageHero
        badge="SHIPPING & DELIVERY POLICY"
        titleMain="Shipping &"
        titleGradient="Delivery Policy"
        subtitle="Official delivery and fulfillment policy for UpKlick cloud software subscriptions and digital services"
        isAr={false}
      />

      <div
        style={{
          background: 'linear-gradient(135deg, rgba(0, 217, 139, 0.14), rgba(108, 53, 255, 0.16))',
          border: '1px solid rgba(0, 217, 139, 0.45)',
          borderRadius: 20,
          padding: '22px 26px',
          marginBottom: 24
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--t1)', marginBottom: 6 }}>
          Official Shipping Policy Statement:
        </div>
        <div style={{ color: 'var(--t1)', fontSize: 16, fontWeight: 800 }}>
          There is no shipping. UpKlick is a 100% digital cloud SaaS platform with instant online service delivery.
        </div>
      </div>

      <CardSection num="01" title="Shipping Policy — There is no shipping">
        <p style={{ marginTop: 0 }}>
          <strong>There is no shipping.</strong> <strong>UpKlick</strong> provides cloud-based software-as-a-service (SaaS) subscriptions, AI business tools, website/funnel builders, CRM software, and digital marketing tools. We do not sell or ship physical goods of any kind. Accordingly, <strong>there is no shipping</strong>, no physical courier dispatch, and zero shipping fees.
        </p>
      </CardSection>

      <CardSection num="02" title="Digital Service Delivery & Provisioning Timeframe">
        <ul>
          <li><strong>Instant Online Delivery:</strong> The $99 subscription and digital features are delivered electronically and activated <strong>immediately</strong> upon successful payment confirmation.</li>
          <li><strong>Confirmation Receipt:</strong> Once your payment is confirmed, your account permissions are upgraded automatically and a confirmation email is sent to your registered email address.</li>
          <li><strong>24/7 Cloud Access:</strong> You can access your activated software tools immediately by signing into your dashboard at <a href="/dashboard">UpKlick</a>.</li>
        </ul>
      </CardSection>

      <CardSection num="03" title="Contact Us for Delivery or Activation Support">
        <p style={{ marginTop: 0 }}>
          If your digital subscription does not appear active within a few minutes of payment, please contact our support team immediately:
        </p>
        <ul>
          <li><strong>Mobile No. inside Egypt:</strong> <a href={UPKLICK_CONTACT_INFO.phoneHref}>{UPKLICK_CONTACT_INFO.phoneDisplay}</a> ({UPKLICK_CONTACT_INFO.phoneLocal})</li>
          <li><strong>Email Address:</strong> <a href={`mailto:${UPKLICK_CONTACT_INFO.emailPrimary}`}>{UPKLICK_CONTACT_INFO.emailPrimary}</a></li>
          <li><strong>Physical Address:</strong> {UPKLICK_CONTACT_INFO.addressEn}</li>
        </ul>
      </CardSection>
    </>
  );
}

