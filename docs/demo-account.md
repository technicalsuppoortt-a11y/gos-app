# Isolated Demo Account

The login card's **Try Demo Account** button calls `startDemoSession('/dashboard')` (`src/demo/mode.ts`). This sets a per-tab flag (`gos.demo-account.active` in sessionStorage, plus a `window.name` fallback) and loads the normal SPA route `/dashboard`. No separate HTML entry exists. `src/main.tsx` reads the flag on boot and imports either `src/demo/bootstrap.ts` (demo graph) or `src/liveApp.tsx` (real app). Both use the same browser router, routes, layout, sidebar, and topbar. Normal login, Firebase sessions, route guards, backend handlers, and database rules remain authoritative for the live application.

`scripts/demo-account-plugin.ts` creates a separate `?account-demo` module graph. Only that graph substitutes the session, Firestore, Storage, callable, Upclick API, and settings transports. The real bundle has `isDemoAccount = false`; browser flags or saved demo state cannot grant real access. The landing page's read-only preview graph remains separate.

The bootstrap replaces browser storage before importing any application module. Demo state lives under `gos.demo-account.v2:` in this tab's sessionStorage, with a memory fallback when storage is unavailable. Real localStorage and Firebase credentials are never copied or changed. Only theme and language preferences are copied into the demo. Refresh retains demo edits. Exit Demo Account clears the demo namespace and returns to normal login. Closing the tab ends its session.

`src/demo/seed.ts` generates deterministic sample data (`SEED_VERSION` 2). It includes:

- 48 leads across two pipelines, 30 contacts and 12 inbox threads
- 7 products with students, reviews and modules, 60 orders, 260 transactions across 90 days, and discounts
- 3 calendars with 40 bookings
- 3 funnels and 2 websites with ~1.1k analytics events (views by step/source/device, captures, payments)
- Copilot chats, knowledge, workflows and runs, AI templates, team members, audit log, integrations, payment methods, and marketing-tracking IDs

Local adapters support editing, creating, deleting, imports/exports, uploaded files, AI responses/drafts, workflow runs, and simulated checkout/security/provider operations. AI actions deduct demo credits; top-ups update the simulated wallet. Gateway secrets are represented by presence flags only. No payment is charged, message delivered, real domain published, or real identity/security setting changed.

In production builds the demo bootstrap injects a CSP meta (`connect-src 'none'`, `form-action 'none'`). Same-origin app links and `window.open` calls stay in the current tab, so the per-tab session is kept. Fetch/beacon guards provide an additional boundary. Tracking SDKs never load external scripts in the demo. Internal preview links remain in the demo router; external services and media are simulated. The app shows a persistent Demo/Exit control in the topbar.

The shared credit badge subscribes to the same settings document as billing (`tenants/{tenant}/workspaceState/{encoded settings key}`, `value.balance`). It uses the simulated projection in Demo Account and the authorized Firestore projection for real accounts. An unavailable real balance displays an em dash instead of invented credits. Scope changes discard the previous account's display immediately.

Validation: production build, scoped lint, localization checks, `node tests/demo-account-browser.test.mjs`, and the existing landing-preview/platform-feature regression suites. The demo browser suite uses the production app without mocked test transports, exercises native screens and mutations, verifies credit changes and reloads, and asserts no live backend requests or changes to real storage/session sentinels.
