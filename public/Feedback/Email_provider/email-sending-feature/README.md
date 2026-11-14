# Email Sending Feature — Amazon SES Provider

Standalone export of UpKlick email sending (provider + APIs + campaign UI).

## Core stack

| Path | Role |
|---|---|
| `src/services/email/index.js` | `emailService` facade |
| `src/services/email/providers/SESProvider.js` | Amazon SES SMTP via `nodemailer` |
| `src/services/email/templates/index.js` | HTML templates (verify, reset, welcome, trial, campaign) |
| `src/lib/email/tenantSesHelper.js` | Domain verify / DKIM / SES helpers |
| `src/lib/outreach/dispatch.js` | Campaign dispatch using `emailService` |

## API routes

| Route | Role |
|---|---|
| `src/app/api/email/send/route.js` | Send campaign / one-off email |
| `src/app/api/email/settings/route.js` | Tenant email settings |
| `src/app/api/email/verify-domain/route.js` | Custom domain verification |
| `src/app/api/email/campaigns/route.js` | Campaigns CRUD/list |
| `src/app/api/auth/send-verification/route.js` | Email verification code |
| `src/app/api/auth/send-reset-password/route.js` | Password reset email |
| `src/app/api/auth/send-trial-email/route.js` | Manual trial emails |
| `src/app/api/cron/trial-emails/route.js` | Scheduled trial emails |
| `src/app/api/admin/outreach/status/route.js` | Outreach/email status |

## UI

| Path | Role |
|---|---|
| `src/components/email/CustomerEmailHub.js` | Customer email hub (settings / send) |
| `src/components/outreach/EmailCampaignsView.js` | Campaigns UI |
| `src/components/outreach/email-builder/*` | Visual email builder |

## Env vars (required)

```env
SMTP_HOST=email-smtp.eu-north-1.amazonaws.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=...
SMTP_PASSWORD=...
EMAIL_FROM=UpKlick <noreply@yourdomain.com>

# Used by tenantSesHelper / domain verification (SES API)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
# or SES_ACCESS_KEY_ID / SES_SECRET_ACCESS_KEY
AWS_REGION=eu-north-1
```

## NPM dependency

```json
{
  "nodemailer": "^10.0.10"
}
```

## How to plug into another Next.js app

1. Copy the `src/` tree into the new project (keep the same relative paths or update imports).
2. Install `nodemailer`.
3. Add the env vars above.
4. Mount UI where needed, e.g. Integrations:

```js
import CustomerEmailHub from '../email/CustomerEmailHub';
// ...
<CustomerEmailHub defaultView="settings" />
```

5. Send from server code:

```js
import emailService from '@/services/email';
await emailService.sendCampaignEmail({ to, subject, messageHtml, fromName, fromEmail });
```

## Notes

- Paths use `@/` aliases (`@/services/email`, `@/lib/firebase`, auth helpers). You may need to adapt those imports in the new project.
- Some routes depend on Firebase admin / user auth helpers that live outside this pack — wire your own auth or copy those helpers separately.
