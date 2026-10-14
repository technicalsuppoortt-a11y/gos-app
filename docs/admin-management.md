# Admin management workspace

## Compact desktop layout

The 18 editable modules use compact cards, 140px chart canvases, five-row table
pages, and the same shared Header component as Users Management. Desktop
navigation can collapse to an icon rail. All admin filters and select fields use
keyboard-accessible, RTL-aware Radix dropdowns; search has a visible clear action.
Users Management and its shared header implementation and styles are unchanged.
Budget and gateway widgets also paginate, maintaining their compact dimensions
when records are added. `scripts/verify-admin-widget-growth.mjs` verifies this with
12 budgets, gateways and operational events in both themes and languages.

The landing CMS presents six fields per page in two desktop columns. Explicit
Previous/Next controls expose every field. Pricing uses separate content/link
and plan panels, keeping all editor actions visible without page scrolling.
Smaller screens retain scrolling rather than clipping content.

For the sequential 1920×1080 layout audit, run
`node scripts/verify-admin-compact.mjs` with `PLAYWRIGHT_MODULE_PATH` configured.
`ADMIN_AUDIT_URL` defaults to `http://127.0.0.1:5177`. The audit visits each module
in order and checks every sub-tab and CMS field page in both themes and languages.
It measures actual document/main scroll heights and content bounds, rather than
passing on the presence of `overflow: hidden`. Reports and screenshots are in
`artifacts/admin-compact`.

In restricted networks, `ADMIN_AUDIT_OFFLINE_FONTS=1` lets the interaction suite
stub only Google Fonts CSS and use system fallback fonts. The verification report
records this setting. Application styles and production font requests are unchanged.

The platform admin navigation contains 19 routes. `/admin` redirects to
`/admin/dashboard`; the legacy `/admin/billing` route redirects to transactions.
The existing Users Management component, stylesheet, shared header and shell are
preserved. The navigation entries supplied to that shell include the new modules.

The new workspace uses scoped semantic colors, logical CSS properties, localized
labels, a scrollable sidebar, accessible editing drawers and mobile navigation.
Records support search, applicable filters, pagination, CSV export, creation,
editing and confirmed deletion. Templates have publication toggles, completed
transactions can be refunded through the editing drawer, and pricing tiers have
feature checkboxes. Dashboard KPIs read management records and active users from
the existing onboarding store. Historical chart series are illustrative mock data.

## Data and service boundary

This is a frontend demonstration. Records persist in localStorage under
`gos.admin.v1.<module>.<tab>`. Gateway connections, DNS checks, webhook checks,
calendar sync, SMTP and provider credentials are simulated configuration views.
They do not send requests, charge or refund money, provision certificates or
configure external services. Credential fields contain secret references rather
than API secrets. Production operation needs authenticated backend APIs and
server-side secret storage.

Landing content is managed separately:

- `gos.landing.draft.v1`: unpublished English and Arabic copy, pricing and CTA links.
- `gos.landing.published.v1`: copy consumed by the public `/` route.
- `/?cms-preview=1`: previews the saved draft.

The editor covers all copy sections in the existing landing content model,
including feature cards, testimonials, FAQs and preview text. Structural IDs and
icon kinds stay fixed. Pricing copy, monthly/annual amounts, features, the main
booking destination and login destination are editable. Publishing replaces both
language versions and updates open public pages through a storage event. Changes
are visible in the current browser; publishing to all visitors requires a shared
CMS backend. Invalid links and malformed stored content recover safely.

## Verification

Run `npm run build`. For browser checks, start Vite preview on port 5175 and run
`node scripts/verify-admin-workspace.mjs` with Playwright available, or set
`PLAYWRIGHT_MODULE_PATH` to its installed package path. Chrome must be available.
The script checks all 19 routes in both themes and languages, all module sub-tabs,
mobile overflow and navigation, persistent CRUD, template publishing, refunds,
feature flags, bilingual CMS publishing, draft isolation, pricing and CTA updates,
and malformed-content recovery. Reports and screenshots are written to
`artifacts/admin-expansion`.
