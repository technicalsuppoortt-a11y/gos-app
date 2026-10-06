# Settings & integrations API contract

The existing repository is a frontend application. This module does not introduce or replace a backend. Set `VITE_SETTINGS_API_URL` to the authenticated settings service base URL to enable live operations. Restart Vite after changing the environment. The adapter sends the session bearer token, credentials, and the current tenant ID. The server must derive and authorize tenant access from the session; the tenant header is context, not authorization.

Without that variable, profile/business/payment preferences are stored on this device under a tenant-and-user key. Wallet values, plan, payment methods and transactions are explicitly labeled preview data. Provider connections start disconnected. Checkout, account deletion, invitations and security operations return actionable unavailable-service messages. No charges, new credits, provider authorizations or account deletion are simulated.

## Settings

| Endpoint | Request / response |
| --- | --- |
| `GET /settings` | Return the complete `SettingsData` contract in [data.ts](./data.ts). All ledger, integration, plan and payment-method data comes from the server. `profile.memberSince` is the server-provided account creation date. |
| `PATCH /settings` | `{ profile, business, payment }`; persist editable fields after validation and authorization. Ignore server-owned account dates/status. Email changes must follow the account service's verification rules. Photo data URLs are limited by the UI to JPG, PNG or GIF, 5MB; validate them server-side too. |
| `DELETE /account` | `{ confirmation: "DELETE" }`; authorize and complete account deletion before responding. The frontend then signs out. |

## Integrations

Provider IDs: `meta`, `whatsapp`, `gmail`, `outlook-email`, `google-calendar`, `outlook-calendar`, `zoom`, `stripe`, `domains`, `ai`, `webhooks`.

| Endpoint | Request / response |
| --- | --- |
| `POST /integrations/:provider/authorize` | `{ returnUrl }` → `{ authorizeUrl }`. Create provider-specific authorization/configuration on the server. Validate the return URL against the allowed GOS origin. Store OAuth state and credentials on the server. |
| `GET /integrations/:provider` | `IntegrationState`: `{ status, account?, problem?, providerStatus?, sync? }`. Validate real provider authorization. Public status is `Connected`, `Not Connected` or `Needs Attention`; map reauthorization/error/disconnected states appropriately. `problem` must be a human-readable public explanation. |
| `POST /integrations/:provider/test` | `{}` → `{ ok: boolean, problem?: string }`. Test authorized capabilities server-side. |
| `PATCH /integrations/:provider/settings` | `{ sync: boolean }`; persist post-connect settings. |
| `DELETE /integrations/:provider` | Revoke access and stop syncing. Preserve historical records; reconnect must not duplicate them. |
| `GET /integrations/logs` | Admin-only `{ entries: string[] }`. Return safe, redacted log summaries. Never return credentials. |

Authorization returns to `/dashboard/settings/integrations?provider=ID&connection=return`. The query parameter triggers validation; it never marks the provider connected. `providerStatus` is `operational`, `outage`, or omitted. An omitted status displays “Status not checked”; external provider status links remain available.

## Billing

| Endpoint | Request / response |
| --- | --- |
| `POST /billing/checkout` | `{ amount, currency: "EUR", method, idempotencyKey, returnUrl }` → `{ url }` for a hosted checkout or manual bank-transfer instruction page. Allowed amounts are 10, 25, 50, 100. |
| `POST /billing/portal` | `{ returnUrl }` → `{ url }` for subscription management. |
| `POST /billing/payment-methods/setup` | `{ method, returnUrl }` → `{ url }` for secure provider setup. No full card details are collected in GOS. |
| `POST /billing/payment-methods/default` | `{ id }`; validate ownership and permitted method type. |
| `PATCH /billing/recharge` | `{ enabled, below, amount, method }`; validate threshold, amount and reusable payment method. |

Checkout return refreshes `GET /settings`. Redirects never increase the balance. Verified provider webhooks/manual approval own the wallet ledger. Enforce idempotency, tenant isolation, race-safe credits and audit records on the server. Method IDs must be stable; the UI displays only redacted details. The reference uses EUR; live EUR charges must match server currency eligibility.

## Team & security

| Endpoint | Request / response |
| --- | --- |
| `GET /team` | `{ members: [{ id, name, email, role, active }] }` |
| `POST /team/invitations` | `{ email, role }`; authorize, create an invitation and send it through the team service. |
| `PATCH /team/:id` | `{ role? , active? }`; enforce owner protections and audit sensitive changes. |
| `GET /team/audit` | `{ entries: string[] }`, restricted to authorized managers. |
| `GET /security` | `{ sessions: [{ id, device, lastActive, current }], history: string[], mfa: boolean }` |
| `POST /security/password` | `{ currentPassword, newPassword }`; validate current credentials and password policy. |
| `POST /security/mfa/setup` | `{}` → `{ url }` for secure setup/management, or `{ message }`. Never claim enabled before verification. |
| `DELETE /security/sessions/:id` | Revoke the specified owned session. |
| `POST /security/api-keys/portal` | `{}` → `{ url }` to manage secrets in the secure account portal. |

All returned navigation URLs must use HTTPS. The client uses a 20-second request timeout and maps unauthorized, forbidden, conflicting and unavailable responses to human-readable recovery messages. Keep raw diagnostics in authorized server logs.

## Verification

`npm run build`, `npm run lint`, `node tests/settings-routes.test.mjs`, `node tests/settings-api.test.mjs`.

`node tests/settings-browser.test.mjs` additionally checks Chromium interactions and desktop/mobile overflow when browser execution is permitted. Set `SETTINGS_BROWSER_PATH` for a Chromium binary and optionally `SETTINGS_SCREENSHOT_DIR` for screenshot output. The browser test uses an isolated test harness and temporary browser profile; it does not change production authentication.
