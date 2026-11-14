# Integration snippets

## IntegrationsView mount

```js
import CustomerEmailHub from '../email/CustomerEmailHub';

// inside Integrations email section
<CustomerEmailHub defaultView="settings" />
```

## Marketing / CRM campaign usage

- Campaigns UI: `EmailCampaignsView.js`
- Builder: `email-builder/EmailBuilderModal.js`
- Send API: `POST /api/email/send`
- Settings API: `/api/email/settings`
- Domain verify: `/api/email/verify-domain`

## emailService methods

- `sendEmailVerification`
- `sendPasswordResetEmail`
- `sendWelcomeEmail`
- `sendTrialWelcomeEmail` / `sendTrial7DaysLeftEmail` / `sendTrialEndedEmail`
- `sendNotificationEmail`
- `sendCampaignEmail`
