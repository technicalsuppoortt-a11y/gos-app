# Dashboard feature additions

These features reuse the existing shell, settings cards, billing navigation, dialogs, translation catalog, and brand/theme styles. Reference designs are not imported into the app.

## Get App

The shared header covers user and admin dashboards; the superadmin topbar mounts the same install trigger. The HTML entry captures `beforeinstallprompt` before React mounts. Installed/standalone windows hide the trigger; iOS receives Safari Share → Add to Home Screen guidance. Unsupported browsers receive browser-menu instructions. The manifest uses Upclick icons and starts at `/dashboard`, where existing role guards select the appropriate dashboard. The service worker is network-only and does not cache authenticated or financial responses.

## Marketing Tracking

Routes: `/dashboard/marketing-tracking`, `/admin/marketing-tracking`, `/super-admin/marketing-tracking`.

The center includes all 12 reference sections. Administrators manage `settings/marketingTracking`; users manage `tenants/{tenantId}/preferences/marketingTracking`. The workspace preference document preserves server-owned user profiles. Rules and the marketingTrackingConfiguration callable require active membership and owner/settings permissions; global edits require a platform admin. Existing personal preferences migrate on the first authorized workspace load. Verified tenant claims follow the same active-workspace selection as session resolution.

Configuration fields: `schemaVersion`, `metaId`, `googleId`, `enabled`, `customEvents`, `advancedMode`, `webhookUrl`. Tracking starts disabled. IDs are validated before saving and again before script injection. Platform and personal destinations coexist without duplicate script elements or duplicate initial pageviews. Route changes emit pageviews. Published form acceptance and successful booking requests emit lead/booking events without personal contact details. Published sites load the global tracking runtime; their HTML must be republished to include the updated bundle.

`src/backend/marketingTracking.ts` exports the SDK, a bounded session event stream, and the `gos_track` browser event. Test Center events and checkout-preview events stay local. Purchase events must only be invoked after server verification. Analytics combine authorized workspace records, verified transactions, and observed browser events. Readiness checks are observational; they do not claim provider delivery. Webhook/CAPI delivery and a consent manager are not implemented by the reference module; the endpoint field is saved configuration only.

## Payment Methods

The shared panel uses one manual-transfer container with six method selectors and a currently-added list, followed by four compact gateway cards (Stripe, PayPal, PayTabs, Fawry/Kashier). Styles are scoped to .pm-methods and reuse settings theme variables.

User billing: `/dashboard/settings/billing?tab=payment-methods`. Admin management: `/admin/payments-gateways`. Superadmin management: `/super-admin/payments`.

`settings/paymentMethods` is the shared public checkout projection. It contains public transfer instructions/account references, never API secrets or card details. Users can read it. Only the `configurePaymentMethods` callable writes it, after checking the authenticated account's active status and ADMIN/SUPER_ADMIN role. It validates provider IDs, unique methods, field types, lengths, and account references. Saves include actor identity, timestamp, and revision. Stale revisions are rejected to prevent one admin from overwriting another. Authenticated reads return server-verified management capabilities. Realtime Firestore subscriptions remain the shared source, with callable reads available when a listener fails.

Supported manual methods: Vodafone Cash, InstaPay, Etisalat Cash, Orange Cash, bank transfer, STC Pay. Supported gateway configurations: Stripe, PayPal, PayTabs, Fawry, Kashier. Client input cannot promote a gateway to `Connected`; only an existing backend-verified connection for the same merchant reference can retain that status.

Gateway modals use provider-specific inputs: Stripe publishable/secret keys and optional webhook secret; PayPal client ID/secret; PayTabs profile ID/server key/region; Fawry merchant code/secure key; Kashier merchant ID/payment API key/secret API key. All support Sandbox/Live and a public account label. The `getGateway` and `saveGateway` operations require active ADMIN/SUPER_ADMIN accounts. Credentials are stored in `paymentGatewayConfigurations/{provider}` using the Admin SDK, with all client reads/writes denied by Firestore rules. Firestore encrypts these documents at rest. Secret values are never written to browser storage, public payment projections or application logs, and never returned by callables. Admin reads return nonsecret fields and boolean secret-presence flags only. Empty secret inputs retain existing values for the same merchant/environment; changing identity, mode or region requires reentry. Private/public changes commit atomically with revision checks. Saving credentials resets status to Configured pending backend verification.

Credential field references: [Stripe](https://docs.stripe.com/keys), [PayPal](https://developer.paypal.com/api/get-started/), [PayTabs](https://github.com/paytabscom/php-sdk), [Fawry](https://developer.fawrystaging.com/docs/server-apis/my-fawry), [Kashier](https://developers.kashier.io/docs/get-started/api-keys).

Billing, Products & Payments, pricing/service payment badges, and checkout subscribe to this document. Changes propagate immediately. Product-specific card/wallet selections are intersected with enabled, connected gateways; enabled manual methods supply transfer instructions globally. Disabled or removed methods disappear from checkout.

The existing commerce flow is a checkout preview. This change does not collect money, approve transfers, grant product access, or fabricate verified gateway connections. Live gateway processing still needs provider onboarding, checkout creation, and signed webhook verification using the saved server credentials. Existing subscription billing/card management remains in its current provider-hosted flow.

## Landing preview

Every hero sidebar tab renders the actual application page component and UserLayout inside landing-preview.html. The Vite ?landing-demo graph replaces backend boundaries only in this iframe; the authenticated app keeps its original modules. The frame has its own demo store and memory-only storage, read-only adapters, inert interactions, and a network-blocking CSP. Native CSS breakpoints use a 1440px desktop viewport with the 1200px content area scaled into the existing mockup. Platform sidebar/topbar and hero copy remain unchanged. Demo data is explicitly labeled. Language/theme changes and keyboard sidebar navigation synchronize through a restricted postMessage contract.

## Validation and deployment

- `npm run build`
- `npm run i18n:check`
- `node --test functions/marketing-tracking.test.js functions/payment-methods.test.js`
- `node tests/platform-features-browser.test.mjs --no-landing` (Edge; optional `PLAYWRIGHT_MODULE` points at playwright-core)
- `node tests/landing-native-preview-browser.test.mjs --production` (after building)
- `node scripts/smoke-feature-config.mjs` (read-only deployed endpoint/rules checks)

The browser test uses an isolated transport fixture, not live Firestore or payment accounts. It covers native-prompt simulation, installed-state hiding, fallback/iOS guidance, ID validation, idempotent script injection, all tracking sections, test-event isolation, failed saves, role visibility, realtime payment updates, and mobile/light/dark preview screenshots.

Deploy the new callable, Firestore rules, and frontend together. Until deployment, a local frontend connected to older rules/functions cannot save the new configuration. Re-publish existing hosted funnel sites to update their tracking runtime. The permission fix deployed the rules plus configurePaymentMethods and marketingTrackingConfiguration to gos-app-3c7fb. Frontend hosting is a separate release; the local app reads these deployed configuration services.
