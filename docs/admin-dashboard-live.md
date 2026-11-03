# Main Admin Dashboard: production data sources

`/admin/dashboard` loads `AdminDashboard` directly, bypassing the generic browser-backed management workspace. The former hard-coded overview and unused sample AdminDashboard have been removed.

## Live widgets

- Registered workspaces and active sub accounts: server-confirmed `tenants` and `users` snapshots. Account status must explicitly be Active to count as active.
- Recorded revenue: completed payment records under tenant `transactions`, grouped by currency without converting or summing unlike currencies.
- Queue and delivery monitors: tenant `messages` statuses.
- Integration monitor: the connection state recorded under tenant `integrations`, explicitly labeled as a reported state rather than a provider availability check.
- Booking and account shortcut counts: live records from the same listeners. Every shortcut targets an existing Admin route. The obsolete onboarding/domains shortcuts have been replaced.
- Recent events: tenant `events` and `auditLogs`, ordered by recorded timestamp and attributed to their actor.

The listener uses metadata updates and rejects `fromCache` snapshots on this dashboard. Loading, disconnected, failed and refreshed sources mask previous metrics. There is no operational fallback to localStorage, sessionStorage, onboarding invites, seeded catalog records or a fabricated zero on read failure. Other modules retain their existing listener behavior.

## Backend health

The new authenticated, Admin-only `adminDashboardStatus` callable performs:

1. A real Firestore server read with measured latency.
2. Confirmation that the authenticated Functions endpoint executed.
3. A bounded request to the configured GOS API `/api/v1/health` endpoint. Ambiguous responses are unverified.
4. Read-only Stripe authentication verification through [Retrieve balance](https://docs.stripe.com/api/balance/balance_retrieve).
5. PayPal application authentication through [OAuth authentication](https://developer.paypal.com/api/rest/authentication), using the saved sandbox or live environment.

Provider checks use server-owned credential documents. Credentials, PayPal access tokens and Stripe balances are never returned to the browser. These checks verify authentication/reachability, not successful checkout, settlement or webhook delivery. No payments are created or charged. Unconfigured or disabled providers are not reported as healthy; providers without a supported probe remain Unverified even if their saved connection status says Connected.

Checks run on opening the dashboard, on manual Check Status, and 60 seconds after the previous check completes. Refresh performs real requests and re-subscribes to Firestore. Previous health results are cleared during checks and on failure. Logout/account changes discard in-flight results. Browser offline state masks all operational data, and reconnecting requests fresh sources.

## Verification and rollout

- Backend/hook checks: `node --test functions/tests/admin-dashboard.test.mjs tests/admin-dashboard-live.test.mjs`
- Existing regression checks: `node --test tests/admin-operations.test.mjs tests/admin-safety.test.mjs functions/impersonation.test.js`
- Isolated browser checks: `node tests/admin-operations-browser.test.mjs`
- Production compilation: `npm run build`

Deploy the `adminDashboardStatus` Function and frontend together. This change requires no new Firestore permissions. A missing, undeployed or inaccessible callable displays an error instead of an operational claim. Production credentials and live gateway connectivity must be verified after deployment; the automated tests use isolated fixtures and do not contact real payment accounts.
