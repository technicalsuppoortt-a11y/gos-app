import { SESProvider } from './providers/SESProvider';
import {
  getVerificationEmailTemplate,
  getResetPasswordEmailTemplate,
  getWelcomeEmailTemplate,
  getNotificationEmailTemplate,
  getTrialWelcomeEmailTemplate,
  getTrial7DaysLeftEmailTemplate,
  getTrialEndedEmailTemplate,
  getCampaignEmailTemplate
} from './templates';

/**
 * Factory to get the active email provider.
 * Uses Amazon SES (SMTP) Provider.
 */
function getEmailProvider() {
  return new SESProvider();
}

class EmailService {
  constructor() {
    this.provider = getEmailProvider();
  }

  /**
   * Send Email Verification Code
   */
  async sendEmailVerification({ to, name, code, verificationLink }) {
    const html = getVerificationEmailTemplate({ name, code, verificationLink });
    const subject = code ? `رمز تفعيل حسابك في UpKlick هو: [ ${code} ]` : 'تأكيد البريد الإلكتروني - UpKlick';
    return this.provider.sendEmail({ to, subject, html });
  }

  /**
   * Send Password Reset Email
   */
  async sendPasswordResetEmail({ to, name, code }) {
    const html = getResetPasswordEmailTemplate({ name, code });
    const subject = code ? `رمز إعادة تعيين كلمة المرور في UpKlick هو: [ ${code} ]` : 'إعادة تعيين كلمة المرور - UpKlick';
    return this.provider.sendEmail({ to, subject, html });
  }

  /**
   * Send Welcome Email
   */
  async sendWelcomeEmail({ to, name, dashboardUrl }) {
    const html = getWelcomeEmailTemplate({ name, dashboardUrl });
    const subject = 'أهلاً بك في منصة UpKlick 🚀';
    return this.provider.sendEmail({ to, subject, html });
  }

  /**
   * Send Trial Email 1 — Welcome (Start of 15-day Free Trial)
   */
  async sendTrialWelcomeEmail({ to, name, dashboardUrl }) {
    const html = getTrialWelcomeEmailTemplate({ name, dashboardUrl });
    const subject = 'أهلاً بيك في UpKlick 👋 | Welcome to UpKlick';
    return this.provider.sendEmail({ to, subject, html });
  }

  /**
   * Send Trial Email 2 — 7 Days Remaining
   */
  async sendTrial7DaysLeftEmail({ to, name, dashboardUrl }) {
    const html = getTrial7DaysLeftEmailTemplate({ name, dashboardUrl });
    const subject = 'فاضل 7 أيام على انتهاء تجربتك المجانية ⏳ | 7 Days Left in Your Free Trial';
    return this.provider.sendEmail({ to, subject, html });
  }

  /**
   * Send Trial Email 3 — Trial Ended (15 Days Finished)
   */
  async sendTrialEndedEmail({ to, name, pricingUrl }) {
    const html = getTrialEndedEmailTemplate({ name, pricingUrl });
    const subject = 'انتهت تجربتك المجانية على UpKlick | Your UpKlick Free Trial Has Ended';
    return this.provider.sendEmail({ to, subject, html });
  }

  /**
   * Send Generic / Notification Email
   */
  async sendNotificationEmail({ to, name, title, message, actionUrl, actionText }) {
    const html = getNotificationEmailTemplate({ name, title, message, actionUrl, actionText });
    const subject = title || 'إشعار جديد - UpKlick';
    return this.provider.sendEmail({ to, subject, html });
  }

  async sendCampaignEmail({
    to,
    name,
    subject,
    messageHtml,
    text,
    unsubscribeUrl,
    actionUrl,
    actionText,
    campaignId,
    from,
    fromName,
    fromEmail,
    replyTo,
    brandName,
    brandLogoUrl,
    footerText
  }) {
    const html = getCampaignEmailTemplate({
      name,
      title: subject,
      messageHtml,
      unsubscribeUrl,
      actionUrl,
      actionText,
      brandName: brandName || fromName,
      brandLogoUrl,
      footerText
    });
    const headers = unsubscribeUrl
      ? {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        }
      : undefined;
    const tags = campaignId
      ? [{ name: 'campaign', value: String(campaignId).slice(0, 40) }]
      : undefined;
    return this.provider.sendCampaignEmail({
      to,
      subject: subject || `رسالة من ${brandName || fromName || 'UpKlick'}`,
      html,
      text,
      headers,
      tags,
      from,
      fromName,
      fromEmail,
      replyTo
    });
  }
}

export const emailService = new EmailService();
export default emailService;

