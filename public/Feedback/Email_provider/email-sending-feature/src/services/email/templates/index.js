/**
 * HTML Email Templates for UpKlick
 * Built with industry-standard HTML email table layouts, prominent brand logos, and anti-clipping protection for Gmail & Outlook.
 */

const getLogoHeader = ({ brandName, brandLogoUrl, brandUrl } = {}) => {
  const baseUrl = brandUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://upklick.net';
  const displayBrand = brandName || 'UpKlick';
  if (brandLogoUrl) {
    return `
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
        <tr>
          <td align="center">
            <a href="${baseUrl}" target="_blank" style="text-decoration: none; display: inline-block;">
              <img src="${brandLogoUrl}" alt="${displayBrand}" style="max-height: 52px; max-width: 200px; object-fit: contain; display: block; margin: 0 auto;" />
            </a>
          </td>
        </tr>
      </table>
    `;
  }
  return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
      <tr>
        <td align="center">
          <a href="${baseUrl}" target="_blank" style="text-decoration: none; display: inline-block;">
            <h1 style="margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.5px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: -webkit-background-clip: text; -webkit-text-fill-color: transparent; color: #FF6B35;">${displayBrand}</h1>
          </a>
        </td>
      </tr>
    </table>
  `;
};




const baseEmailStyle = `
  body {
    margin: 0 !important;
    padding: 0 !important;
    background-color: #08080f !important;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    color: #e2e8f0;
    -webkit-text-size-adjust: 100%;
    -ms-text-size-adjust: 100%;
  }
  table, td {
    mso-table-lspace: 0pt;
    mso-table-rspace: 0pt;
  }
  img {
    -ms-interpolation-mode: bicubic;
    border: 0;
    height: auto;
    line-height: 100%;
    outline: none;
    text-decoration: none;
  }
  .title {
    color: #ffffff;
    font-size: 22px;
    font-weight: 700;
    margin-top: 0;
    margin-bottom: 16px;
  }
  .text {
    color: #a0aec0;
    font-size: 15px;
    line-height: 1.6;
    margin-bottom: 20px;
  }
  .btn {
    display: inline-block;
    padding: 14px 32px;
    background: linear-gradient(135deg, #FF6B35, #6C35FF);
    color: #ffffff !important;
    text-decoration: none;
    font-weight: 700;
    font-size: 15px;
    border-radius: 12px;
    box-shadow: 0 6px 20px rgba(255, 107, 53, 0.35);
  }
  .footer {
    text-align: center;
    margin-top: 30px;
    font-size: 13px;
    color: #4a5568;
  }
`;

function wrapEmailBody(contentHtml, preheaderText = '', brandOptions = {}) {
  const uniqueToken = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const displayBrand = brandOptions.brandName || 'UpKlick';
  const footerCopy = brandOptions.footerText || `&copy; ${new Date().getFullYear()} ${displayBrand}. All rights reserved. | جميع الحقوق محفوظة.`;
  return `
<!DOCTYPE html>
<html lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${displayBrand}</title>
  <style>
    ${baseEmailStyle}
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #08080f; color: #e2e8f0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <!-- Hidden Preheader & Anti-trimming hack for Gmail -->
  <div style="display:none !important; visibility:hidden; mso-hide:all; font-size:1px; color:#08080f; max-height:0px; max-width:0px; opacity:0; overflow:hidden;">
    ${preheaderText || displayBrand} &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #08080f; width: 100%; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #141422; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 36px 28px; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);">
          <tr>
            <td>
              ${getLogoHeader(brandOptions)}
              ${contentHtml}
            </td>
          </tr>
        </table>
        
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin-top: 24px;">
          <tr>
            <td align="center" style="font-size: 13px; color: #4a5568;">
              ${footerCopy}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  
  <!-- Unique token prevents Gmail thread clipping -->
  <span style="display:none !important; opacity:0; font-size:1px; color:#08080f;">Ref: ${uniqueToken}</span>
</body>
</html>
  `;
}

export function getVerificationEmailTemplate({ name, code, verificationLink }) {
  const recipientName = name ? name : 'عزيزنا المستخدم';
  const content = `
    <div style="direction: rtl; text-align: right;">
      <h2 class="title">مرحباً ${recipientName} 👋</h2>
      <p class="text">
        شكراً لتسجيلك في منصة UpKlick! رمز تفعيل حسابك المكون من 6 أرقام هو:
      </p>
      
      <div style="background: linear-gradient(135deg, rgba(255, 107, 53, 0.12), rgba(108, 53, 255, 0.18)); border: 1.5px solid rgba(108, 53, 255, 0.35); border-radius: 16px; padding: 24px 16px; text-align: center; margin: 28px 0;">
        <div style="font-size: 13px; color: #a0aec0; margin-bottom: 6px;">رمز التحقق الخارجي</div>
        <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #FF6B35; margin: 12px 0; direction: ltr; display: inline-block;">${code}</div>
        <div style="font-size: 12px; color: #718096; margin-top: 8px;">الرمز صالح لمدة 15 دقيقة</div>
      </div>

      ${verificationLink ? `
      <div style="text-align: center; margin-top: 20px;">
        <a href="${verificationLink}" target="_blank" class="btn">أو التفعيل المباشر بنقرة واحدة</a>
      </div>` : ''}

      <p class="text" style="font-size: 13px; color: #718096; margin-top: 24px;">
        أدخل هذا الرمز داخل التطبيق لتأكيد ملكية البريد وتفعيل حسابك بالكامل. إذا لم تطلب هذا الرمز، يمكنك تجاهل هذا البريد.
      </p>
    </div>
  `;
  return wrapEmailBody(content, 'رمز تفعيل الحساب - UpKlick');
}

export function getResetPasswordEmailTemplate({ name, code }) {
  const recipientName = name ? name : 'عزيزنا المستخدم';
  const content = `
    <div style="direction: rtl; text-align: right;">
      <h2 class="title">طلب إعادة تعيين كلمة المرور 🔐</h2>
      <p class="text">
        مرحباً ${recipientName}، لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في UpKlick.
      </p>

      <div style="background: linear-gradient(135deg, rgba(255, 107, 53, 0.12), rgba(108, 53, 255, 0.18)); border: 1.5px solid rgba(108, 53, 255, 0.35); border-radius: 16px; padding: 26px 18px; text-align: center; margin: 28px 0;">
        <div style="font-size: 13px; color: #a0aec0; margin-bottom: 6px;">رمز إعادة تعيين كلمة المرور</div>
        <div style="font-family: 'Courier New', Courier, monospace; font-size: 42px; font-weight: 800; letter-spacing: 14px; color: #FF6B35; margin: 14px 0; direction: ltr; display: inline-block;">${code || '000000'}</div>
        <div style="font-size: 12px; color: #718096; margin-top: 8px;">الرمز صالح لمدة 15 دقيقة فقط</div>
      </div>

      <p class="text" style="font-size: 13px; color: #718096; margin-top: 24px;">
        أدخل هذا الرمز المكون من 6 أرقام داخل المنصة لاختيار كلمة المرور الجديدة. إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذه الرسالة، وستظل كلمة المرور الحالية دون تغيير.
      </p>
    </div>
  `;
  return wrapEmailBody(content, 'إعادة تعيين كلمة المرور - UpKlick');
}

export function getWelcomeEmailTemplate({ name, dashboardUrl }) {
  const recipientName = name ? name : 'عزيزنا المستخدم';
  const content = `
    <div style="direction: rtl; text-align: right;">
      <h2 class="title">أهلاً بك في عائلة UpKlick! 🚀</h2>
      <p class="text">
        مرحباً ${recipientName}، يسعدنا وجودك معنا. يمكنك الآن البدء في بناء وتنمية أعمالك وتسهيل عملياتك باستخدام أدوات UpKlick الذكية.
      </p>
      <div style="text-align: center; margin-top: 32px;">
        <a href="${dashboardUrl || '#'}" target="_blank" class="btn">الانتقال إلى لوحة التحكم</a>
      </div>
    </div>
  `;
  return wrapEmailBody(content, 'أهلاً بك في UpKlick');
}

export function getNotificationEmailTemplate({ name, title, message, actionUrl, actionText }) {
  const recipientName = name ? name : 'عزيزنا المستخدم';
  const content = `
    <div style="direction: rtl; text-align: right;">
      <h2 class="title">${title || 'إشعار جديد'}</h2>
      <p class="text">مرحباً ${recipientName}،</p>
      <p class="text">${message}</p>
      ${actionUrl ? `
      <div style="text-align: center; margin-top: 32px;">
        <a href="${actionUrl}" target="_blank" class="btn">${actionText || 'عرض التفاصيل'}</a>
      </div>` : ''}
    </div>
  `;
  return wrapEmailBody(content, title || 'إشعار جديد - UpKlick');
}

export function getCampaignEmailTemplate({
  name,
  title,
  messageHtml,
  unsubscribeUrl,
  actionUrl,
  actionText,
  brandName,
  brandLogoUrl,
  footerText
}) {
  const rawHtml = String(messageHtml || '');

  // If the email was built using the Visual Email Builder, it contains its own full layout
  if (rawHtml.includes('<!-- upklick-custom-email-builder -->') || rawHtml.includes('data-ghl-email-root')) {
    let finalHtml = rawHtml;
    if (unsubscribeUrl && !finalHtml.includes(unsubscribeUrl)) {
      finalHtml = finalHtml.replaceAll('{{unsubscribe_url}}', unsubscribeUrl);
    }
    return finalHtml;
  }

  const displayBrand = brandName || 'UpKlick';
  const recipientName = name ? name : 'عزيزنا العميل';
  const content = `
    <div style="direction: rtl; text-align: right;">
      <h2 class="title">${title || `رسالة من ${displayBrand}`}</h2>
      <p class="text">مرحباً ${recipientName}،</p>
      <div class="text">${messageHtml || ''}</div>
      ${actionUrl ? `
      <div style="text-align: center; margin-top: 32px;">
        <a href="${actionUrl}" target="_blank" class="btn">${actionText || displayBrand}</a>
      </div>` : ''}
      ${unsubscribeUrl ? `
      <p class="footer" style="margin-top: 28px;">
        لا ترغب في رسائل التسويق؟
        <a href="${unsubscribeUrl}" style="color: #a0aec0;">إلغاء الاشتراك</a>
      </p>` : ''}
    </div>
  `;
  return wrapEmailBody(content, title || `رسالة من ${displayBrand}`, {
    brandName: displayBrand,
    brandLogoUrl,
    footerText
  });
}

/**
 * Trial Email 1 — Welcome (Start of 15-day Free Trial)
 */
export function getTrialWelcomeEmailTemplate({ name, dashboardUrl }) {
  const targetUrl = dashboardUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://upklick.net/dashboard';

  const content = `
    <!-- Arabic Section -->
    <div style="direction: rtl; text-align: right; margin-bottom: 32px; padding-bottom: 28px; border-bottom: 1px dashed rgba(255, 255, 255, 0.12);">
      <h2 class="title">أهلاً بيك في UpKlick 👋</h2>
      <p class="text">
        بدأت دلوقتي تجربتك المجانية لمدة 15 يوم.
      </p>
      <p class="text">
        خلال الفترة دي، تقدر تستكشف أدوات UpKlick وتستخدمها في إدارة شغلك، تنظيم العملاء، التسويق، الأتمتة، المنتجات الرقمية وغيرها.
      </p>
      <div style="background: linear-gradient(135deg, rgba(255, 107, 53, 0.1), rgba(108, 53, 255, 0.15)); border: 1px solid rgba(108, 53, 255, 0.3); border-radius: 12px; padding: 16px 20px; font-weight: 700; color: #ffffff; margin: 20px 0; text-align: right;">
        15 يوم عشان تكتشف إزاي UpKlick ممكن يخلي إدارة شغلك أبسط وأذكى.
      </div>
      <div style="text-align: right; margin: 24px 0 10px 0;">
        <a href="${targetUrl}" target="_blank" class="btn">ابدأ تجربتك الآن ←</a>
      </div>
    </div>

    <!-- English Section -->
    <div style="direction: ltr; text-align: left;">
      <h2 class="title" style="text-align: left;">Welcome to UpKlick 👋</h2>
      <p class="text" style="text-align: left;">
        Your <strong>15-day free trial</strong> has officially started.
      </p>
      <p class="text" style="text-align: left;">
        Explore UpKlick and discover the tools you need to manage your business, organize your workflow, automate tasks, and more — all in one place.
      </p>
      <div style="background: linear-gradient(135deg, rgba(255, 107, 53, 0.1), rgba(108, 53, 255, 0.15)); border: 1px solid rgba(108, 53, 255, 0.3); border-radius: 12px; padding: 16px 20px; font-weight: 700; color: #ffffff; margin: 20px 0; text-align: left;">
        15 days to experience a smarter way to work.
      </div>
      <div style="text-align: left; margin: 24px 0 10px 0;">
        <a href="${targetUrl}" target="_blank" class="btn">Start Exploring UpKlick →</a>
      </div>
    </div>
  `;

  return wrapEmailBody(content, 'أهلاً بيك في UpKlick | Welcome to UpKlick');
}

/**
 * Trial Email 2 — 7 Days Remaining
 */
export function getTrial7DaysLeftEmailTemplate({ name, dashboardUrl }) {
  const targetUrl = dashboardUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://upklick.net/dashboard';

  const content = `
    <!-- Arabic Section -->
    <div style="direction: rtl; text-align: right; margin-bottom: 32px; padding-bottom: 28px; border-bottom: 1px dashed rgba(255, 255, 255, 0.12);">
      <h2 class="title">فاضل 7 أيام على انتهاء تجربتك المجانية مع UpKlick ⏳</h2>
      <p class="text">
        لسه قدامك أسبوع كامل تقدر خلاله تستكشف أدوات UpKlick وتستخدمها على شغلك الحقيقي.
      </p>
      <div style="background: linear-gradient(135deg, rgba(255, 107, 53, 0.12), rgba(108, 53, 255, 0.18)); border: 1px solid rgba(255, 107, 53, 0.35); border-radius: 12px; padding: 16px 20px; font-weight: 700; color: #ffffff; margin: 20px 0; text-align: right;">
        استغل الـ7 أيام المتبقية واكتشف كل اللي ممكن تعمله مع UpKlick.
      </div>
      <div style="text-align: right; margin: 24px 0 10px 0;">
        <a href="${targetUrl}" target="_blank" class="btn">استكمل تجربتك الآن ←</a>
      </div>
    </div>

    <!-- English Section -->
    <div style="direction: ltr; text-align: left;">
      <h2 class="title" style="text-align: left;">You have 7 days left in your UpKlick free trial ⏳</h2>
      <p class="text" style="text-align: left;">
        You still have a full week to explore UpKlick and put its tools to work for your business.
      </p>
      <div style="background: linear-gradient(135deg, rgba(255, 107, 53, 0.12), rgba(108, 53, 255, 0.18)); border: 1px solid rgba(255, 107, 53, 0.35); border-radius: 12px; padding: 16px 20px; font-weight: 700; color: #ffffff; margin: 20px 0; text-align: left;">
        Make the most of your remaining trial and discover what UpKlick can do for you.
      </div>
      <div style="text-align: left; margin: 24px 0 10px 0;">
        <a href="${targetUrl}" target="_blank" class="btn">Continue Your Trial →</a>
      </div>
    </div>
  `;

  return wrapEmailBody(content, 'فاضل 7 أيام على انتهاء تجربتك المجانية | 7 Days Left in Free Trial');
}

/**
 * Trial Email 3 — Trial Ended (15 Days Finished)
 */
export function getTrialEndedEmailTemplate({ name, pricingUrl }) {
  const targetUrl = pricingUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://upklick.net'}/#pricing`;

  const content = `
    <!-- Arabic Section -->
    <div style="direction: rtl; text-align: right; margin-bottom: 32px; padding-bottom: 28px; border-bottom: 1px dashed rgba(255, 255, 255, 0.12);">
      <h2 class="title">انتهت تجربتك المجانية لمدة 15 يوم على UpKlick.</h2>
      <p class="text">
        لكن شغلك مش لازم يقف هنا.
      </p>
      <p class="text">
        دلوقتي تقدر تختار الباقة المناسبة لاحتياجاتك وتكمل استخدام أدوات UpKlick لإدارة وتنمية شغلك.
      </p>
      <div style="background: linear-gradient(135deg, rgba(108, 53, 255, 0.15), rgba(255, 107, 53, 0.15)); border: 1px solid rgba(108, 53, 255, 0.4); border-radius: 12px; padding: 16px 20px; font-weight: 700; color: #ffffff; margin: 20px 0; text-align: right;">
        اختر الباقة المناسبة وكمل رحلتك مع UpKlick.
      </div>
      <div style="text-align: right; margin: 24px 0 10px 0;">
        <a href="${targetUrl}" target="_blank" class="btn">اختر الباقة المناسبة ←</a>
      </div>
    </div>

    <!-- English Section -->
    <div style="direction: ltr; text-align: left;">
      <h2 class="title" style="text-align: left;">Your 15-day free trial has ended.</h2>
      <p class="text" style="text-align: left;">
        But your workflow doesn’t have to stop here.
      </p>
      <p class="text" style="text-align: left;">
        Choose the plan that fits your needs and continue using UpKlick to manage and grow your business.
      </p>
      <div style="background: linear-gradient(135deg, rgba(108, 53, 255, 0.15), rgba(255, 107, 53, 0.15)); border: 1px solid rgba(108, 53, 255, 0.4); border-radius: 12px; padding: 16px 20px; font-weight: 700; color: #ffffff; margin: 20px 0; text-align: left;">
        Choose the plan that works for you and keep growing with UpKlick.
      </div>
      <div style="text-align: left; margin: 24px 0 10px 0;">
        <a href="${targetUrl}" target="_blank" class="btn">Choose Your Plan →</a>
      </div>
    </div>
  `;

  return wrapEmailBody(content, 'انتهت تجربتك المجانية | Free Trial Ended');
}



