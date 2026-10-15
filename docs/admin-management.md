# Admin management workspace

## CRM consolidation, templates hub and booking monitoring

`/admin/crm` contains Leads Database, Pipeline stages, Custom fields and CRM
defaults. The standalone Leads navigation entry is removed from the platform
sidebar; `/admin/leads` redirects to CRM. Leads continue using the original
`gos.admin.v1.leads.0` storage key, and the other three tabs retain their original
CRM storage addresses, so tab insertion does not overwrite existing data.

`/admin/templates` is the only admin surface for system templates. Its horizontal
tabs cover Funnels, Websites, Landing Pages, Booking Pages, CRM Pipelines,
AI Assistants, AI Knowledge Packs, Automations, Products and Messages.
The Messages tab groups Email, SMS and WhatsApp with a channel filter. New assets
inherit the active tab's category; editing/deleting an asset preserves the other
categories. All tabs read and edit the same `gos.system.templates.v2` library.
`/admin/funnels` (also available at `/admin/funnels-websites`) displays only active
tenant sites. Its former Templates tab is removed, legacy template-tab URLs
redirect to the hub, and the repository rejects the old template-tab writes.
CRM has no template views or template creation actions.
The first read migrates both legacy template stores and the built-in page designs;
subsequent reads preserve edits, publication states and deletions. The hub supports
Funnel, Website, Landing Page, Booking Page, CRM Pipeline, AI Assistant,
AI Knowledge Pack, Automation, Product Layout, Email, SMS and WhatsApp categories.
`publishedSystemTemplates(category)` exposes published defaults. Existing
funnel/website galleries use `publishedPageTemplates()`, and the shared tenant
template workspace uses `publishedWorkspaceTemplates()` across its module scopes.
Built-in defaults from both libraries are registered in the admin hub. Tenant-owned
copies remain independent when a system template changes or is unpublished.
Structured workspace configurations are stored as JSON in Content; plain text
is also supported, using the category's default configuration for its structure.

All booking tabs are monitoring views. Neither row names nor table actions open
editors, and the repository rejects booking saves. Search, filters, pagination
and CSV export remain available. This is a frontend guard; a production backend
must enforce the same permissions.

These four modules use viewport-sized layouts and table page sizes calculated
from available height. Menu direction is explicit on portaled admin selects;
native menu and profile alignment rules are scoped to `.adm-shell`, excluding
the Users Management shell. Users Management files and styles are untouched.

Run `node scripts/verify-admin-template-library.mjs` against a Vite server on
port 5181 (or set `ADMIN_AUDIT_URL`). Configure `PLAYWRIGHT_MODULE_PATH` when
Playwright is installed outside the project. It checks 216 combinations of
route/tab, viewport, theme and language, ten-category CRUD, message filtering,
CRM/lead data preservation, template isolation, legacy redirects and booking
write rejection. Screenshots and results are saved under `artifacts/admin-template-hub`.

## Compact desktop layout

The operational modules use compact cards, 140px chart canvases, five-row table
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
