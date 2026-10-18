# Firebase migration setup and implementation status

This change prepares a substantial migration of the existing User Dashboard. It does **not** complete the full production specification. The transport integrations, autonomous execution worker, public booking flow, and several production acceptance checks listed below still require implementation. Deployment and live account seeding were not performed, as requested.

## Scope

Firebase data subscriptions run inside the User Dashboard and protected product preview. The Admin User Management page uses the protected `manageUser` callable and the role-filtered `users` collection. No general Admin or Super Admin dashboard database implementation was added. Shared sign-out controls now sign out of Firebase.

Existing changes in this workspace were retained. Browser preferences such as theme and language remain local. General Admin repositories and landing-page CMS remain outside this migration.

## Implemented code

| Area | Behavior prepared |
| --- | --- |
| Authentication | Firebase email/password sign-in, token restoration, live profile access checks, role routing, and sign-out. A browser-stored role or token no longer establishes a session. |
| Recovery | Real reset email requests, `oobCode` verification, expiration errors, and password reset confirmation. Old local-only activation links no longer establish sessions. |
| Account bootstrap | Trusted Admin SDK script creates missing master accounts, preserves existing passwords and workspace IDs, sets RBAC claims and profile records, and seeds membership records. |
| Admin User Management | Live role-filtered user list; callable create, role change, activation link, deactivate/reactivate, and delete. Admins cannot alter peer admins, Super Admin accounts, or their own access. |
| Workspace persistence | Tenant-specific snapshots and writes for products, calendars, bookings, CRM, conversations, workflows, knowledge, templates, discounts, assets, domains, and preferences. State clears when the tenant changes. |
| Dashboard and analytics | Current canonical record counts; revenue from numeric, verified transactions with matching currency; date-filtered event streams; CSV export. Missing history is shown without invented growth figures. |
| Copilot | Server-side Responses API request with approved knowledge, limited workspace context, conversation history, and permission checks. Confirmed product/service, funnel, and campaign-template drafts can be persisted through a separate callable. It does not autonomously publish or send messages. |
| Follow-Up | Persisted configuration, workflow definitions, template records, knowledge records, consent checks, run scheduling records, and cancellation of pending actions after replies, human takeover, opt-out, or booking state changes. |
| Inbox | Live conversation persistence; outbound text queue validates channel connection, contact linkage, consent, and applicable WhatsApp window. Queue acceptance is reported as queued rather than delivered. |
| Booking | Server-validated dashboard booking writes use a transaction lock, availability checks, buffers, capacity, and pending payment status. A booking can create a canonical CRM lead. |
| Templates | User template assets are tenant records. The user-facing catalog reads `templateCatalog`; 30 catalog templates are prepared as seed JSON. Existing catalog customizations are preserved by the seed script. |
| Settings | Profile/business updates, authenticated password changes, server-managed team membership, module permissions, approved text knowledge, and genuine current-session information. Unsupported provider/security actions return errors. |
| Files | Product file upload/read/download uses private Firebase Storage paths, with Firestore file metadata. |
| Privacy | Existing `/privacy` and `/dashboard/settings/privacy` routes retain `technicalsuppoortt@gmail.com`. |
| Feedback and layout | Writes produce pending/commit/error toasts. Failed optimistic writes restore the adapter snapshot. The fixed shell and sidebar remain visible while workspace content loads. |

## Project configuration

Use Node.js 22. Copy `.env.example` values into the existing `.env.local`, using the intended Firebase web app configuration. The existing `VITE_FIREBASE_MESSAGE_SENDER_ID` spelling is also supported; `VITE_FIREBASE_MESSAGING_SENDER_ID` is preferred.

Enable Firebase Authentication Email/Password, Firestore, Cloud Functions, and Storage in the selected project. Add the development and hosted domains to Authentication authorized domains.

For the custom reset screen, configure the password-reset email template action handler to `https://YOUR_HOST/auth/reset-password`. Firebase supplies the `oobCode`. The `url` passed when sending recovery emails is the post-action continue URL, not the custom handler URL. Generated activation links may use Firebase's hosted password-setup handler.

Install dependencies from the correct working directories:

```powershell
npm ci
Push-Location functions
npm ci
Pop-Location
```

The functions package uses Firebase Admin SDK Application Default Credentials. Browser API keys cannot create privileged accounts or assign protected roles.

## Trusted account and catalog seeding

Configure Application Default Credentials in your trusted environment, using an appropriate service account or an existing authenticated Google Cloud identity. A service-account path belongs in `GOOGLE_APPLICATION_CREDENTIALS` in that environment. Never put its JSON or private key in `public`, a `VITE_` variable, or source control.

```powershell
npm run firebase:catalog
npm run seed:firebase
```

The seed script reads the project ID from the root `.env.local`. It creates missing accounts for `super@gmail.com` and `admin@gmail.com` using the requested initial password. It preserves passwords for existing accounts. It does not populate customer workspaces with fabricated leads, bookings, sales, or payments. The seed script did not run successfully here because ADC was absent; no live account verification is claimed.

## AI configuration

Set `OPENAI_MODEL` in `functions/.env.YOUR_PROJECT_ID` to an approved model supporting the Responses API and JSON output. Store the server key using Secret Manager:

```powershell
firebase functions:secrets:set OPENAI_API_KEY --project YOUR_PROJECT_ID
```

The client never receives the OpenAI key. Context queries are limited to 50 records per supported resource and respect the member's module grants. This is bounded context retrieval, not full knowledge ingestion or vector search. Copilot currently implements draft creation rather than the specification's complete tool/action catalog.

## Deployment commands for your environment

These commands are prepared for your operator; they were not executed here:

```powershell
npm run build
firebase deploy --only firestore:rules,firestore:indexes,storage,functions:user-dashboard --project YOUR_PROJECT_ID
firebase deploy --only hosting --project YOUR_PROJECT_ID
```

Review existing remote rules if this project is shared with another application. The new rules deny unknown paths; preserve any separately maintained out-of-scope access rules when integrating them. Storage reads via `getBlob` may also require bucket CORS configuration for the hosted origin.

## Work still required before a production release

These are implementation gaps, not features that become complete merely by supplying API keys.

| Area | Remaining work |
| --- | --- |
| Channel providers | Official OAuth/onboarding, encrypted token storage, verified inbound webhooks, identity resolution, delivery adapters, delivery/read receipts, reconnect/revoke handling, media upload/delivery, retries, and provider-specific eligibility beyond the initial policy checks. |
| Follow-Up engine | A deployed timer/outbox worker, durable leases, retry/backoff/dead-letter handling, qualification branching/scoring, all stop conditions, quiet hours, kill switches, and full lifecycle orchestration. Scheduled records are not autonomously delivered by this patch. |
| Public booking | `/book/:slug` still needs a public tenant/calendar resolver, server-side public slot queries, capability-protected cancellation/rescheduling, abuse protection, and payment-gated confirmation. The dashboard booking callable is not a public booking API. |
| Calendar integrations | OAuth, external FreeBusy, event creation/sync, watches, conflict reconciliation, and reminders. Current validation covers the local canonical calendar only. |
| Payments and billing | Provider onboarding, hosted checkout, verified webhooks, canonical orders and financial ledgers, refunds, manual-payment review, access fulfillment, subscriptions, credits, and billing portal handlers. The preview checkout deliberately does not mark payments successful or grant purchases. |
| Funnels and domains | Public publishing/runtime resolution, DNS ownership verification, SSL provisioning, version/rollback, and production form/booking/payment submission adapters. Persisted domain metadata does not prove DNS or SSL status. Legacy preview widgets still need replacement. |
| Knowledge | File/URL ingestion, safe fetching, parsing, indexing, approved versions, and retrieval across modules. Approved text content is supported; storing a URL/file reference is not ingestion. |
| Security | MFA enrollment/challenge UI and account-service implementation, broader session revocation, account deletion, comprehensive audit events, App Check/rate limits where required, and emulator-tested production rules. Unsupported controls return errors instead of simulating security changes. |
| Remaining UI migration | Audit legacy builder widgets, unused fixture modules, onboarding activation pages, some commerce detail views and selectors, and all action handlers. This patch does not establish that every static array or simulated action in the repository has been eliminated. |
| Scale and concurrency | Pagination/cursors, server aggregates, per-record revision conflict handling, large imports, and uploads beyond the current limits. The compatibility adapter loads allowed collections and limits bulk writes. |

Existing browser-only business records are not automatically imported. Any import must identify the correct authenticated tenant, validate schema/relationships, and run as an explicit migration rather than treating unscoped browser data as trusted account data.

## Validation

```powershell
npm run test:backend
npm run test:firebase-ui
npm run build
```

The UI test uses an isolated service adapter. It checks six empty workspaces, fixed desktop viewport layouts, and Arabic mobile/dark-mode rendering. It does not prove live Firebase persistence, deployed rules, or provider delivery.

An emulator integration test is included for tenant isolation, escalation denial, module access, server-only payments/bookings, account listing constraints, and deactivation. It was not executed here because Firebase CLI/Java emulators were unavailable:

```powershell
firebase emulators:exec --only auth,firestore --project demo-gos-user-dashboard "npm run test:firebase-rules"
```

Run emulator tests and the complete specification acceptance matrix before treating this as production-ready. Live staging acceptance must cover refresh/login persistence, account revocation, offline failures, simultaneous booking attempts, cross-tenant access, provider outages, and verified payment/delivery results.

Implementation references: [Firebase custom claims](https://firebase.google.com/docs/auth/admin/custom-claims), [Firebase Auth API](https://firebase.google.com/docs/reference/js/auth), and [OpenAI text generation](https://developers.openai.com/api/docs/guides/text).
