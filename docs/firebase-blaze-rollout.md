# Firebase Blaze rollout

Project: `gos-app-3c7fb`. Functions: Node.js 22, v2, `us-central1`, codebase `user-dashboard`.

## Verified release, 19 October 2026

Hosting, Firestore rules/indexes and Storage rules are released. Ten functions are deployed: `manageUser`, `queueMessage`, `saveBookings`, `startWorkflow`, `stopFollowUpOnLeadChange`, `pauseFollowUpOnConversationChange`, `processScheduledActions`, `publicBooking`, `settingsService`, and `createCopilotDraft`.

The production build, 17 backend tests, seven REST transport tests, the existing desktop/Arabic-mobile/dark-mode UI harness, and the complete disposable live smoke test passed. Hosting serves the new bundle on home, email-action and public-booking paths. Real Scheduler invocation and both Firestore triggers were exercised successfully. Test data was removed.

Copilot remains undeployed: the final secret-metadata check returned 404 for `OPENAI_API_KEY`. Live message delivery is excluded as requested. Container artifact retention is configured for 14 days.

## Configuration

- `.env.local`: `VITE_USE_CLOUD_FUNCTIONS=true`.
- `functions/.env.gos-app-3c7fb`: `OPENAI_MODEL=gpt-4o`.
- `DEPLOY_COPILOT=false` temporarily omits Copilot while its owner provisions the secret.
- Default Firebase Storage bucket: `gos-app-3c7fb.firebasestorage.app`, `US-CENTRAL1`.
- Runtime service account: `gos-app-3c7fb@appspot.gserviceaccount.com`. Its existing Editor grant provides Firebase Admin access. Client rules prohibit role/tenant escalation.

After adding the real key, enable Copilot:

```sh
firebase functions:secrets:set OPENAI_API_KEY --project gos-app-3c7fb
# Change DEPLOY_COPILOT=false to DEPLOY_COPILOT=true in functions/.env.gos-app-3c7fb.
firebase deploy --project gos-app-3c7fb --only functions:user-dashboard:copilot
```

Do not put API keys in Vite variables or commit secret values.

## Booking and invitations

Admin operations call `manageUser`; errors are surfaced rather than falling back to local invitations. The server creates Auth accounts, stamps role/tenant claims and returns official password-setup links.

`EmailActionPage` handles `mode=verifyEmail` with `applyActionCode`, independently of password reset. Existing reset and activation routes remain available.

`/book/:slug` uses `publicBooking`, with no sign-in requirement. Availability contains anonymous busy intervals. Creation shares the same tenant schedule-lock document as authenticated `saveBookings`, preventing concurrent double booking. Changes require a private session-stored management token. Password-protected calendars are checked on the server. Booking success is shown only after the server confirms the write.

## Scheduling and outbound delivery

`processScheduledActions` runs every minute. Active email/WhatsApp workflows need `messageText`, editable as Follow-up message. The worker checks consent, opt-out, booking and human takeover state before queuing one message per action. Firestore triggers cancel pending actions on inbound activity or takeover.

Live provider dispatch is deliberately **not exported/deployed**, per the user's instruction while provider credentials are unavailable. Queued messages are not sent and are not marked delivered. `functions/outbox.js` and `functions/delivery.js` contain the optional Resend and Meta adapters; provider failures require review, and email requests include an idempotency key.

Before enabling dispatch, configure real integration sender/phone settings and Secret Manager `MESSAGE_DELIVERY_CREDENTIALS` with this structure, then export `dispatchOutbox` from `./outbox.js` in `functions/index.js` and redeploy:

```json
{
  "TENANT_ID": {
    "email": { "resendApiKey": "SECRET_VALUE" },
    "whatsapp": { "whatsappAccessToken": "SECRET_VALUE" }
  }
}
```

Do not enable dispatch against a backlog without reviewing the queued messages first.

## Verification

```sh
npm run build
npm test --prefix functions
npm run test:gos-api
npm run test:firebase-ui
node scripts/smoke-firebase-blaze.mjs /absolute/path/to/node_modules/firebase-tools
```

The live smoke script uses the authenticated Firebase CLI's OAuth session. It creates disposable accounts/workspace data and cleans them up. It verifies account claims, deployed role-escalation denial, public booking, concurrent slot contention, private booking management, queue idempotency, an actual Cloud Scheduler invocation, and Firestore takeover/cancellation triggers. It never sends external messages.

`gos-api` on Vercel is managed separately and was excluded from this rollout at the user's direction. Its Inbox delivery endpoints and provider connections are not changed here.
