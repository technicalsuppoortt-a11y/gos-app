# Admin operations and dashboard preferences

`/admin/conversations`, `/admin/analytics` and `/admin/ai-usage` use the existing authenticated administrator subscription layer. It unsubscribes on logout, impersonation, account changes and workspace removal. Records are read from tenant subcollections; there are no browser demo records on these routes.

## Data sources

- Threads: `tenants/{tenantId}/conversations` (the existing inbox thread collection).
- Messages: `messages`, linked by `conversationId`, with channel, delivery status, text and creation timestamp.
- Handoff history: `handoffLogs`. The conversation trigger writes one entry per takeover transition, keyed by the CloudEvent ID so retries cannot duplicate it.
- Channel health: `integrations` connection status and recorded message delivery failures. Missing timestamps and states remain unknown.
- Revenue: completed/paid/succeeded/confirmed `transactions`, grouped by recorded currency and month. Orders are not added again. These are recorded gross receipts, not a net settlement report; no exchange-rate conversion is implied.
- Conversion: Won/Customer/Converted leads divided by all recorded leads. The dashboard labels this denominator explicitly.
- Operational events: `auditLogs` and the backend's existing `events` collection.
- AI consumption: server-owned `aiUsage` records. Copilot and follow-up calls now persist provider-reported input/output/total tokens and model, without prompts or answers. Historical calls and externally hosted knowledge-service usage cannot be reconstructed from missing telemetry.
- Model policy: the existing `settings/platformTools` → `tools.ai-copilot.settings` document supplies the configured default model and token budget per workspace. Actual consumption always uses the model reported by the AI provider. Optional workspace budgets use server-owned `modelAllocations/{allocationId}` with `model`, `tokenBudget` (or legacy `budget`) and `status`. Unconfigured allocations are labeled explicitly.
- Workspace owner balances: `communicationWallets/{ownerUid}` for money and held funds; `billingWallets/{ownerUid}` for plan credits. Existing billing access controls remain authoritative. A denied balance is displayed as an error, never zero.

These views aggregate the subscribed records in the client over all recorded time. Large installations should replace collection fan-out with server-maintained summary documents before collections become large.

## Branding and assets

Tenant overrides live in `tenants/{tenantId}/preferences/general`. Saving as an Admin also atomically updates the safe `dashboardBrands/{adminUid}` preference projection. Clients linked through their server-owned `users/{uid}.supportParentId` inherit this projection when their tenant has no override. Provider account and SMTP documents are never exposed to clients.

Preferences apply after a successful save through live subscriptions: name, logo, preset theme, language/RTL, currency and Light/Dark/System mode. Existing theme/language/currency toolbar controls continue to work. Currency changes display defaults, not historical transaction values. System mode follows operating-system changes.

Workspace Settings is available at `/admin/settings` and User Settings → Branding & Preferences. Business Assets is an independent main Admin Sidebar item at `/admin/business-assets`, removed from both Admin Settings tab rows. Users retain `/dashboard/settings/business-assets`. The asset page loads independently of the General settings request. Metadata lives in `tenants/{tenantId}/businessAssets`, with uploads under Storage `tenants/{tenantId}/branding/{uuid}`. Supported uploads are PNG/JPEG/WebP and, for resources, PDF/TXT, up to 10 MB. Logo uploads preserve the original file and use `object-fit: contain`. SMTP controls remain in the Admin-only Platform email tab.

Timezone controls in General, Profile and Business settings use a searchable IANA timezone selector. The bundled full catalog supports browsers without `Intl.supportedValuesOf`; valid saved aliases remain selectable. Settings use consistent custom selectors and styles for remaining native controls, with RTL arrows and keyboard focus states.

## Permission failure handling

Active Admin/Super Admin profiles have a direct, allowlisted path to workspace directory records and operational collections, including `handoffLogs` and `aiUsage`, without requiring a membership document in each client workspace. The rules recognize server-issued Admin custom claims as well as profile roles, matching the existing sign-in role resolution. An active profile remains mandatory; deactivated profiles cannot use Admin reads even with an Admin claim. Claims must be revoked/refreshed when demoting an administrator. This does not grant access to provider secrets or other users' private Copilot histories. Normal workspace members retain permission and tenant checks; inbox permission permits handoff history but does not grant AI usage access.

Each collection listener now settles independently. A denied collection is removed from the current results and reported in `sourceErrors`; other readable collections continue loading. User attribution failures fall back to recorded IDs. Missing collections resolve to ordinary empty snapshots. Conversations and Analytics evaluate readiness separately for every metric and table. A denied `handoffLogs` source cannot suppress threads or messages, and a denied `aiUsage` source cannot suppress leads, conversions or revenue. Metrics computed from only some workspaces are labeled Partial; fully denied sources show Unavailable instead of a fabricated zero. Only relevant pending sources hold a metric in loading. Main Dashboard remains strict about missing sources and server-only data. Directory denial clears workspace records instead of retaining stale rows.

The corrected Firestore rules were compiled remotely and successfully released to `gos-app-3c7fb` on 2026-11-03 using a Firestore-rules-only deployment. Hosting, Functions and Storage were not published by that deployment. Reload open dashboards once so terminated permission-denied listeners subscribe again. Authorization emulator tests still require Java; the Firebase dry run/deployment confirms compilation and release, not an end-to-end test of a particular user's session.

The login column reserves footer space in a dynamic viewport grid. Compact spacing applies on shorter screens. The document does not scroll; at extremely short heights, the form's middle region can scroll independently while legal links remain visible and keyboard accessible.

## Validation and rollout

- `node --test tests/admin-operations.test.mjs tests/admin-safety.test.mjs functions/impersonation.test.js`
- `node --test tests/admin-dashboard-live.test.mjs tests/timezones.test.mjs` covers independent restricted sources and the full timezone catalog.
- `node --test tests/admin-source-availability.test.mjs` covers per-metric readiness, partial workspace totals, unrelated denied/pending logs and standalone Admin sidebar placement.
- `node tests/admin-operations-browser.test.mjs` (isolated UI fixtures; requires local Edge and Playwright).
- `npm run build`
- `tests/firebase-rules-emulator.test.mjs` adds preference, provider inheritance, business asset and server-owned AI usage authorization checks. Run through Auth/Firestore emulators using the repository's existing emulator setup.
- Browser coverage includes partial permission failures, searchable timezone selection, and footer visibility without page scrolling at ten desktop/mobile/landscape viewport sizes.

Deploy updated Firestore rules, Storage rules and Functions together with the frontend. No production data is seeded or backfilled by these changes. Verify an Admin, a linked client, a settings manager and a member without settings permission against the deployed Firebase project.
