# Admin management workspace

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
