# Admin dashboard updates

## Implemented

- Corrected the light admin secondary-text token, scoped legacy account-management text fixes, and provided explicit tokens for portaled tool menus. Dark branding uses the existing light logo asset.
- Removed Domains & SSL, Marketing Tracking and Onboarding from admin navigation. Dashboard Management groups five existing routes horizontally. Settings groups General, Integrations & Webhooks, AI Models & Usage, and Transactions.
- General settings save platform identity, branding and SMTP references to `settings/adminGeneral`, with concurrent-edit protection.
- Tools persist to `settings/platformTools` with a revision, authenticated author and server timestamp. Cross-session listeners replace browser-only state. Unconfigured tools preserve existing availability; sample maintenance/disabled values are not applied to other modules during a save. Fixed telemetry figures were replaced with actual configuration source, revision and plan access. Failed writes preserve the displayed state and configuration draft.
- Availability, maintenance and plan restrictions affect user routes, supported Firebase callable operations, and canonical Firestore writes. Existing records remain readable. Missing configuration preserves existing access. External GOS mutations check the Firebase policy before calling the original service; its URL, bearer authentication and API contracts remain intact.
- Support uses the `supportChat` callable, `supportRooms/{room}/messages`, and Storage `supportAttachments/{room}/{author}/{file}`. It includes real-time messages, unread indicators, read receipts, replies, author deletion, attachments up to 10 MB and voice notes. Message dispatch IDs are reused on retry. The UI loads the latest 100 messages per conversation.
- Support pairs are user/admin and admin/super-admin. New invitations record their support owner; existing accounts resolve creation-audit ownership or a single eligible owner. Super admins can assign support teams explicitly. Clients cannot create rooms, messages or assignments directly.
- Manual methods display locally stored brand artwork. Paddle and Paymob extend the existing Stripe, Fawry/Kashier and other gateway configuration service. Credentials remain in server-only documents; public projections contain no secrets. Saving credentials records Configured, never an unverified Connected status.

Normal user dashboard source files, page implementations and authentication flow are unchanged. Route composition adds tool boundaries and the separate support entry point.

## Hybrid service boundary and remaining implementation

Firebase stores platform configurations; the existing GOS API continues executing its services. The checked-in Postman contract exposes assistant `live_enabled` and `channels`, CRM operations, knowledge indexing and inbox ingestion. It does **not** expose global model/budget/rate-limit settings, inbox SLA/routing configuration, delivery-provider configuration, voice providers, scheduled DNS policy, analytics retention or portal watermark/session controls. Those advanced values are persisted by the tool drawer but are **not yet applied to their engines**. They require documented configuration endpoints or corresponding backend implementation. Saving these fields must not be treated as evidence that an external engine changed. Existing autonomous workers or integrations calling the API independently are outside the frontend mutation guard.

General branding and SMTP values are saved configuration; this change does not provision an SMTP sender or replace the application design tokens. Existing Settings child-module record editors remain the repository's browser-backed management views.

Gateway forms configure credentials. Live charges, provider verification, checkout creation and provider webhook fulfillment still require their provider adapters and merchant credentials; forms do not establish that those services are connected.

## Validation and rollout

- A full TypeScript build passed before the final hybrid-guard and default-policy changes. Final repeat attempts were terminated by Windows memory allocation failures; syntax transpilation of all 13 changed TypeScript modules passed.
- Admin safety, impersonation and new support/tool/payment tests passed (25 tests, including GOS transport and hybrid policy).
- Browser fixture checks passed before the final contrast/default-policy refinements; the final repeated run timed out during page loading under memory pressure. Passing coverage included navigation, tool save/failure, gateway secret inputs, chat send/retry and mobile switching. Brand assets are checked for successful image loading. These use simulated backend responses, not production user data.
- A production Vite build passed outside the sandbox. Rebuilding the final incremental changes was blocked by recurring Windows memory/paging failures.
- Screenshots are in `artifacts/admin-updates`.
- Firebase Auth/Firestore/Storage emulator validation and live multi-account acceptance have not been run; Java emulators are unavailable here. The rules need validation in the deployment environment before production rollout.

Deploy the Firebase functions and Firestore/Storage rules together with the frontend after review. The relevant callable exports include `supportChat`, existing callable operations changed to enforce platform policy, and `configurePaymentMethods`. Do not deploy only the frontend: the new paths and providers require matching backend/rules. No production deployment, secret upload or production data migration was performed.

## Brand sources

- Vodafone and Orange: Simple Icons v16 SVGs (retain the Simple Icons license and brand trademark requirements).
- InstaPay: official `https://www.instapay.eg/wp-content/uploads/2022/03/logo.png`.
- Etisalat: official `https://www.etisalat.eg/favicon.ico`.
- STC Pay: `https://commons.wikimedia.org/wiki/File:Stc_pay.svg`, which attributes the original artwork to STC.
- Bank Transfer uses the application's bank symbol because it denotes a transfer method rather than a single bank brand.

Provider field references: [Paddle authentication](https://developer.paddle.com/api-reference/about/authentication/) and [Paymob integration credentials](https://developers.paymob.com/paymob-docs/need-help/setup-guides/getting-integration-credentials).
