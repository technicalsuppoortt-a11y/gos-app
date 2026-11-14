import nodemailer from 'nodemailer';

/**
 * Amazon SES (SMTP) Email Provider implementation
 */
export class SESProvider {
  constructor() {
    this.host = process.env.SMTP_HOST || 'email-smtp.eu-north-1.amazonaws.com';
    this.port = Number(process.env.SMTP_PORT) || 465;
    this.secure = process.env.SMTP_SECURE === 'true' || this.port === 465;
    this.user = process.env.SMTP_USER;
    this.pass = process.env.SMTP_PASSWORD;
    this.fromEmail = process.env.EMAIL_FROM || 'UpKlick <noreply@upklick.net>';

    if (this.user && this.pass) {
      this.transporter = nodemailer.createTransport({
        host: this.host,
        port: this.port,
        secure: this.secure,
        auth: {
          user: this.user,
          pass: this.pass
        }
      });
    } else {
      this.transporter = null;
    }
  }

  /**
   * Resolve the dynamic "From" header for multi-tenant sending.
   * - If customFromEmail is verified and provided: `"Sender Name" <custom@domain.com>`
   * - If only fromName is provided (Instant Mode): `"Sender Name" <noreply@upklick.net>`
   * - Otherwise falls back to default `this.fromEmail`.
   */
  resolveFromHeader({ from, fromName, fromEmail } = {}) {
    if (from) return from;

    // Extract default email address from `UpKlick <noreply@upklick.net>` or `noreply@upklick.net`
    const match = String(this.fromEmail || '').match(/<([^>]+)>/);
    const defaultEmailAddress = match ? match[1].trim() : String(this.fromEmail || 'noreply@upklick.net').trim();

    const cleanName = String(fromName || '').replace(/["<>]/g, '').trim();
    const cleanEmail = String(fromEmail || '').replace(/["<>\s]/g, '').trim();

    if (cleanName && cleanEmail) {
      return `"${cleanName}" <${cleanEmail}>`;
    }
    if (cleanName) {
      return `"${cleanName}" <${defaultEmailAddress}>`;
    }
    if (cleanEmail) {
      return cleanEmail;
    }
    return this.fromEmail;
  }

  /**
   * Send an email using Amazon SES SMTP
   */
  async sendEmail({ to, subject, html, text, headers, tags, from, fromName, fromEmail, replyTo }) {
    if (!this.transporter) {
      console.warn('[SESProvider] SMTP credentials (SMTP_USER / SMTP_PASSWORD) are not configured.');
      return {
        success: false,
        simulated: true,
        error: 'SMTP credentials missing in environment variables.'
      };
    }

    const recipients = Array.isArray(to) ? to.join(', ') : to;
    const resolvedFrom = this.resolveFromHeader({ from, fromName, fromEmail });

    const mailOptions = {
      from: resolvedFrom,
      to: recipients,
      subject: subject,
      html: html,
      ...(text ? { text } : {}),
      ...(replyTo ? { replyTo: String(replyTo).trim() } : {}),
      headers: { ...(headers || {}) }
    };

    // Support AWS SES email tagging headers
    if (tags && Array.isArray(tags)) {
      tags.forEach(t => {
        if (t.name && t.value) {
          mailOptions.headers[`X-SES-TAG-${t.name}`] = String(t.value);
        }
      });
    }

    try {
      const info = await this.transporter.sendMail(mailOptions);
      return { success: true, data: { messageId: info.messageId } };
    } catch (err) {
      console.error('[SESProvider] Exception during email send via SES SMTP:', err);
      return { success: false, error: err.message || String(err) };
    }
  }

  /**
   * Production campaign send: one recipient
   */
  async sendCampaignEmail({ to, subject, html, text, headers, tags, from, fromName, fromEmail, replyTo }) {
    return this.sendEmail({
      to,
      subject,
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
