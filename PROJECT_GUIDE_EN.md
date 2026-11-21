# UpKlick Project Guide

**Purpose:** English-language guide to the application's pages, their purpose, the main code behind them, and the repository structure.

**Repository inspected:** `GOS-app` (Vite + React + TypeScript). The route list below is based on `src/router/index.tsx`; page behavior is cross-checked against the route dispatcher and the relevant page/workspace components. This is a code-oriented explanation, not a claim that every external integration is currently configured in production.

## 1. What the application is

UpKlick is a multi-tenant business platform. A regular user can manage marketing funnels and websites, contacts and leads, conversations, follow-up automation, bookings, products and payments, analytics, and workspace settings. Admin and platform-team roles have separate operational workspaces for managing clients, plans, templates, integrations, payments, domains, and platform configuration. Customers can access purchased products through a customer portal.

The front end is a single-page React application. React Router chooses a page from the URL. Most page components are lazy-loaded, so a route's code is fetched when needed. `UserLayout`, `AdminLayout`, and `SuperAdminLayout` provide the shared navigation and shell for their respective areas. Role guards protect private routes. The app uses Redux Toolkit for shared client state, Firebase for identity and parts of the data layer, backend/API adapters for application services, and a local demo mode with adapters for selected workflows.

## 2. Page and route guide

### Public, sign-in, and account recovery

| URL | Page/component | Purpose and behavior |
|---|---|---|
| `/` | `LandingPage` (or `EmailActionPage` when `oobCode` is in the query string) | Public marketing site. Its sections and copy are in `src/pages/landing`; it is deliberately outside the authenticated route guard. An email action link at this URL is routed to account-action handling instead. |
| `/login`, `/auth/login` | `LoginPage` | Sign-in entry page. |
| `/auth/phoenix` | `PhoenixSignIn` | Alternate Phoenix-branded sign-in flow. |
| `/forgot-password`, `/auth/forgot-password` | `ForgotPasswordPage` | Starts password recovery. |
| `/reset-password`, `/auth/reset-password`, `/auth/action`, `/__/auth/action` | `EmailActionPage` | Processes Firebase-style email action links, such as password reset or verification. |
| `/activate` | `ActivationLinkPage` (`ActivationPage`) | Handles an account activation link. |
| `/onboarding/activate-account` | `ActivateAccountPage` | Account activation/onboarding entry. |
| `/onboarding` | Redirect to `/dashboard` | The onboarding wizard route is currently disabled; the route redirects to the dashboard. |
| `/privacy` | `PrivacyPage` | Public privacy information. |
| `/terms-of-service` | `TermsOfServicePage` | Public terms of service. `/terms` and capitalization variants redirect here. |
| `/data-deletion` | `DataDeletionPage` | Public data-deletion instructions. Legacy aliases redirect here. |

### User workspace

All `/dashboard/...` routes require the `USER` role and render within `UserLayout`. Many are dispatched through `DashboardPage`, which selects the feature component based on a page key.

| URL | Page/component | Purpose and behavior |
|---|---|---|
| `/dashboard` | `HomeDashboard` | User's overview/home screen: central entry point to their workspace and activity. |
| `/dashboard/funnels/*`, `/funnels/*`, `/websites/*`, `/forms/*` | `FunnelBuilder` | Funnel, website, and form creation/editing experience. The top-level legacy paths also wrap the builder in `UserLayout`. The `FunnelBuilder` owns the detailed editor interaction and persistence helpers. |
| `/dashboard/crm` and `/dashboard/crm/{pipeline,activities,tasks,overview,templates}` | `CRMLeads` via `DashboardPage` | CRM work area. The page keys select the CRM experience; record pages below use `CRMRecord`. The CRM feature folder contains models, actions, task/record helpers, API request code, and workspace styles. |
| `/crm` and `/crm/{pipeline,activities,tasks,overview,templates}` | Same CRM dashboard pages | Alternate/older CRM route family. `/crm/contacts` redirects to `/dashboard/contacts`. |
| `/dashboard/contacts` or `/contacts` | `CRMLeads` in contacts mode | Contact directory/list view. |
| `/dashboard/contacts/:id`, `/contacts/:id`, `/crm/contacts/:id`, `/crm/opportunities/:id` | `CRMRecord` | Detailed view of a CRM contact or opportunity. |
| `/dashboard/inbox` | `Inbox` | Conversation inbox. It coordinates selected lead, channel, active conversation, AI mode, and message-send state; supporting UI and styles are under `src/pages/inbox` plus `Inbox.tsx`. |
| `/dashboard/follow-up`, `/dashboard/ai-followup` | `AIFollowUp` | AI follow-up workflows for lead communication. The `ai-followup` alias maps to the same feature. `?tab=templates` opens the template workspace. |
| `/dashboard/automation` | `AIFollowUp` in automation section | Automation-oriented section of the follow-up feature; it is not a separate page implementation. |
| `/dashboard/copilot` | `AICopilot` | AI assistant experience. Its tool/data integrations are in the backend and builder areas. |
| `/dashboard/booking` | `BookingCalendar` | Booking calendar/workspace for viewing and managing booking pages and appointments. `?tab=templates` opens booking templates. |
| `/dashboard/booking/new`, `/dashboard/booking/:pageId/edit` | `BookingEditorPage` | Create or edit a public booking page, using booking editor controls, schemas, preview, and template components. |
| `/dashboard/booking/appointments/new`, `/dashboard/booking/appointments/:appointmentId/edit` | `AppointmentEditorPage` | Create or edit a particular appointment. |
| `/dashboard/products`, `/dashboard/products-payments` | `ProductsPayments` | Product and payment management entry/list experience. The product subroutes below open the full product workspace. `?tab=templates` opens product templates. |
| `/dashboard/products-payments/products/new` | `ProductWorkspace` in create mode | Product creation, including product details and configuration tabs. |
| `/dashboard/products-payments/products/:id[/edit]`, `/dashboard/products-payments/course/:id[/edit]` | `ProductWorkspace` in edit mode | Edit a product or course. Related modules cover pricing, access, checkout, sales pages, previews, reviews, and course content. |
| `/dashboard/products-payments/products/:id/pricing` | `ProductWorkspace` pricing tab | Opens the product workspace directly on pricing. |
| `/dashboard/products-payments/course/:id/orders` | `ProductWorkspace` orders tab | Opens course/product order records. |
| `/dashboard/products-payments/course/:id/students` | `ProductWorkspace` access tab | Opens student/access management. |
| `/dashboard/products-payments/discounts/new`, `/dashboard/products-payments/discounts/:id/edit` | `DiscountEditorPage` | Create or edit a discount. |
| `/dashboard/analytics` | `Analytics` | Workspace analytics. Supporting modules include reports, live analytics, chart components, data model, labels, and PDF report helpers. |
| `/dashboard/knowledge` | `KnowledgePanel` | Knowledge-base and AI knowledge configuration. |
| `/dashboard/activity` | `ActivityPage` | Activity history/feed. |
| `/dashboard/support` | `UserSupportPage` | User support entry page. |
| `/dashboard/settings/*` | `SettingsWorkspace` | Settings hub; page content is selected from the last URL segment (see Settings below). |
| `/dashboard/integrations` | `SettingsWorkspace` | Compatibility entry into settings; integrations itself is reached through the settings navigation. |
| `/dashboard/content`, `/dashboard/academy` | `PagePlaceholder` | Explicit placeholder pages titled “Content Generator” and “Upklick Academy”; route presence does not imply a finished feature. |

#### Settings pages

`SettingsWorkspace` loads account settings through the settings request layer and chooses a panel from the route segment. It handles save state, errors, redirects for retired aliases, and tenant/user scoping.

| Typical URL | Panel | What it is for |
|---|---|---|
| `/dashboard/settings/profile` | `ProfilePanel` | Personal account profile. |
| `/dashboard/settings/business` | Business panel | Business identity and defaults used by customer-facing pages and communications. |
| `/dashboard/settings/billing` | `BillingPanel` | Subscription/billing settings, with query tabs such as plans or wallet where applicable. `/dashboard/plans` redirects here with the plans tab. |
| `/dashboard/settings/payment-methods` | `PaymentMethodsPanel` | Saved payment methods for the user scope. |
| `/dashboard/settings/integrations` | `IntegrationsPanel` | Connect/manage integrations and provider status. |
| `/dashboard/settings/team` | `TeamPanel` | Workspace team and role management. |
| `/dashboard/settings/security` | `SecurityPanel` | Security controls. |
| `/dashboard/settings/support-team` | `SupportTeamPanel` | Support team configuration. |
| `/dashboard/settings/pixel` | `MarketingTracking` | Marketing pixels/tracking configuration. `/dashboard/marketing-tracking` redirects here. |
| `/dashboard/settings/knowledge` | `KnowledgePanel` | Workspace knowledge configuration. |
| `/dashboard/settings/privacy` | `PrivacyPolicyPanel` | Workspace privacy/policy settings. |
| `/dashboard/settings/domains` | `DomainsSettingsPanel` | Workspace domain settings. `/dashboard/domains/*` redirects here. |

### Booking, product previews, templates, and customer access

| URL | Page/component | Purpose and behavior |
|---|---|---|
| `/book/:slug` | `PublicBookingPage` | Public booking page visitors use to view availability and submit a booking. Booking rendering and confirmation components are in `src/pages/booking`. |
| `/template-preview/:templateId` | `TemplatePreviewPage` | Authenticated preview of a template. |
| `/asset-preview/:assetId/:pageId?` | `AssetStandalonePreview` | Authenticated standalone preview of a business asset/page. |
| `/product-preview/:token` | `ProductLivePreview` or `ProductPublicPreview` | Product preview. Presence of the `workspace` query parameter selects the public preview; otherwise the user must be an authenticated workspace role and workspace data is loaded. |
| `/product-access` | `ProductAccess` | Customer product access/entitlement entry. |
| `/portal`, `/portal/:purchaseId` | `CustomerPortal` | Customer delivery portal for purchased products. Accessible to customer and selected workspace/admin roles. |
| `/portal/preview/:productId` | `CustomerDeliveryPreview` | Workspace user's preview of customer delivery. |
| `/customer/change-password` | `CustomerChangePassword` | Password change for a customer account with pending-password access. |
| `/commerce/policies/:kind` | `CommercePolicyPage` | Public commerce policy page selected by kind, such as a policy linked from checkout. |

### Admin workspace

`/admin/*` requires `ADMIN` or `SUPER_ADMIN` and uses `AdminLayout`. Some sections have dedicated components; other list/table modules are selected by `AdminWorkspace` and a module catalog.

| URL | Page/component | Purpose and behavior |
|---|---|---|
| `/admin` | Redirect to `/admin/dashboard` | Admin home route. |
| `/admin/dashboard` | `AdminDashboard` | Admin overview and operational summary. |
| `/admin/users` | `AdminUsers` | User/account administration. |
| `/admin/support` | `SupportChat` | Admin-facing support conversations. |
| `/admin/tools` | `AdminTools` | Admin tools/utilities. |
| `/admin/business-assets` | `BusinessAssetsPage` | Manage business assets. |
| `/admin/templates/new`, `/admin/templates/:templateId/edit` | `AdminTemplateEditorPage` (scope `mine`) | Create/edit admin-owned templates. |
| `/admin/payments-gateways` | `PaymentMethodsPanel` (admin scope) | Configure admin-scope payment methods/providers. |
| `/admin/plans` | `AdminPlansPage` | Plan catalog/administration. |
| `/admin/user-billing-settings` | `UserBillingSettingsPage` | Configure user billing settings. |
| `/admin/domains` | `DomainsPage` (admin scope) | Admin domain management. |
| `/admin/settings` | `WorkspaceBrandSettings` | Configure workspace brand settings. |
| `/admin/conversations` | `AdminOperations` | Admin conversation operations. |
| `/admin/analytics` | `AdminOperations` | Admin analytics operations. |
| `/admin/ai-usage` | `AdminOperations` | AI usage monitoring/operations. |
| `/admin/integrations` | `AdminOperations` | Integration operations. |
| `/admin/transactions` | `AdminOperations` | Transaction operations. |
| `/admin/funnels`, `/admin/funnels-websites` | `AdminLiveManagement` | Live management for funnel/website records. Some legacy template tab paths redirect to `/admin/templates`. |
| `/admin/crm` | `AdminLiveManagement` | Live management for CRM records. |
| `/admin/booking` | `AdminLiveManagement` | Live management for booking. |
| `/admin/products` | `AdminLiveManagement` | Live management for products. |
| `/admin/templates` | Admin module/workspace | Template management module. |
| `/admin/landing` | Admin module/workspace | Landing-page management module. |
| `/admin/billing` | Redirect to `/admin/transactions` | Legacy route. `/admin/leads` redirects to `/admin/crm`. |
| `/admin-preview` | `AdminPreviewPage` | Admin preview surface, guarded to admin roles. |

Generic admin workspaces provide catalog-driven tabs, search, filtering, pagination, CSV export, and record editing where applicable. Some generic data is explicitly stored in browser storage; it should not be confused with server-backed live management.

### Super-admin / platform team

`/super-admin/*` requires a platform-team role and uses `SuperAdminLayout`.

| URL | Page/component | Purpose and behavior |
|---|---|---|
| `/super-admin` | `SuperAdminDashboard` | Platform-wide overview. |
| `/super-admin/support` | `SupportChat` | Platform support operations. |
| `/super-admin/clients`, `/super-admin/clients/:adminId/sub-users` | `SuperAdminWorkspace` | Manage client/admin accounts and their sub-users. |
| `/super-admin/plans` | `SuperAdminPlansPage` | Platform plan administration. |
| `/super-admin/analytics`, `/super-admin/settings`, `/super-admin/users`, `/super-admin/integrations`, `/super-admin/payments`, `/super-admin/logs` | `SuperAdminWorkspace` | Platform operations areas selected by route. |
| `/super-admin/funnel-templates` | `SuperAdminFunnelTemplates` | Platform funnel template management. |
| `/super-admin/dashboard-management` | `AdminWorkspace` within platform shell | Dashboard/template management area. |
| `/super-admin/dashboard-management/new`, `/:templateId/edit` | `AdminTemplateEditorPage` (scope `system`) | Create/edit system-level templates. |
| `/super-admin/domains` | `DomainsPage` (super-admin scope) | Platform domain administration. |
| `/super-admin/payment-methods` | `PaymentMethodsPanel` (super-admin scope) | Platform payment methods. |
| `/super-admin/meta-app` | `MetaAppSettings` | Meta application settings. |
| `/super-admin/marketing-tracking` | `MarketingTracking` | Platform tracking settings. |
| `/super-admin/subscriptions`, `/super-admin/wallet` | Redirect to `/super-admin` | These paths currently redirect rather than rendering a dedicated route page. |
| `/super-admin/templates` | Redirect to `/super-admin/dashboard-management` | Legacy alias. |

### Unknown routes

The catch-all route uses `DefaultRedirect`, which sends the visitor to the appropriate default based on session/role rather than displaying a dedicated not-found page.

## 3. How a page runs

1. `src/main.tsx` is the application entry. It chooses the demo or live module graph (`src/demo/bootstrap` or `src/liveApp`), installs chunk recovery, and handles a startup failure screen. `src/App.tsx` wires Redux, theme, session, custom-domain handling, tracking, router, and notifications for the live graph.
2. `src/router/index.tsx` maps URL patterns to lazy-loaded page modules. `Suspended` and `RouteBoundary` provide loading/error handling. `ProtectedRoute` checks session and role; `WorkspaceData` loads workspace context for routes that need it.
3. Layout components (`src/components/layout`) provide navigation, header, support drawer, and the user/admin/platform shell.
4. Feature components under `src/pages` render the actual page and compose smaller components, models, API adapters, and styles.
5. Services under `src/backend` and `src/lib` communicate with Firebase, Cloud Functions/GOS APIs, storage, billing, analytics, domains, and other platform services. Demo adapters under `src/demo` can substitute local/demo behavior in supported flows.
6. Shared display language and RTL support come from `src/i18n`; theme and workspace customization come from `src/context` and `src/branding`; global state is in `src/store`.

## 4. Folder structure

### Repository root

| Path | Role |
|---|---|
| `src/` | Main React + TypeScript front end. Detailed map below. |
| `functions/` | Firebase Cloud Functions and server-side JavaScript modules for AI, billing, admin, activation, and related API operations. |
| `public/` | Static files served as-is, including logos and marks. |
| `launch-brand/` | Separate Launch Brand application/package with its own build configuration. |
| `tests/` | Automated unit, integration, and browser-oriented checks, plus selected screenshots/fixtures. |
| `scripts/` | Build, validation, seeding, export, deployment, and maintenance scripts. |
| `docs/` | Product and engineering documentation, integration notes, and migration guides. |
| `reports/` | Generated or maintained verification and audit reports. |
| `artifacts/` | Captured screenshots and outputs from development/QA work. |
| `firebase.js`, `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `storage.rules` | Firebase client/configuration and security/index definitions. |
| `vite.config.ts`, `tsconfig*.json`, `tailwind.config.js`, `postcss.config.js` | Front-end build, TypeScript, and CSS tooling configuration. |
| `package.json` / `package-lock.json` | npm package metadata, scripts, and pinned dependency tree. |
| `index.html`, `published.html`, `landing-preview.html` | Main app document and standalone published/preview entry documents. |

### `src/` directories

| Folder | Contents and responsibility |
|---|---|
| `src/app/` | App-level supporting views; currently includes an admin domains page. |
| `src/assets/` | Imported images, product graphics, inbox avatars, currency flags, and Vite starter assets. |
| `src/backend/` | Client-side service/API layer: session, Firebase, workspace data, CRM, AI, billing, payments, hosting, domains, analytics, templates, admin, and policy helpers. |
| `src/branding/` | Brand themes, color tokens, preview utilities, font catalog, and brand CSS. |
| `src/components/` | Shared UI pieces. `common/` has reusable states/interceptors, `layout/` has app shells/navigation, `payments/` and `sites/` hold shared domain UI, `ui/` has controls, and `Views/` contains view components. |
| `src/context/` | React providers and context for theme, currency, workspace customization, and Phoenix brand styles. |
| `src/data/` | Static/mock application data. |
| `src/demo/` | Demo-mode bootstrap, data/store, mode switches, and adapters that mimic app services. |
| `src/i18n/` | Language setup, text display/localization helpers, locale catalogs, and right-to-left styling. |
| `src/lib/` | Small reusable libraries; includes domain client/constants. |
| `src/pages/` | Route-level pages and feature-specific subfolders (see feature map below). |
| `src/router/` | Router helpers, role protection, platform access checks, lazy loading, error boundaries, and chunk recovery. |
| `src/store/` | Redux store, slices for auth/CRM/UI, selectors, and store-level visibility state. |
| `src/styles/` | Shared/feature-wide CSS utilities such as compact workspace styles. |
| `src/types/` | Shared TypeScript types such as auth and business entities. |
| `src/utils/` | Generic helpers for dates, currency, browser storage, cities/time zones, toast, search, PDF, class names, and list keys. |

### `src/pages/` feature map

| Folder/files | Responsibility |
|---|---|
| `admin/` | Admin dashboard, admin module workspace, operations/live management, template editor, business assets, preview, and tools. |
| `analytics/` plus `Analytics.tsx` | Analytics dashboards, reports, charting, labels, data model, and PDF report generation. |
| `auth/` | Login, Phoenix sign-in, forgot/reset password, email action, activation, and customer password change. |
| `billing/` | Plan catalog/editor, subscriptions, invoices, wallets, credit settings, checkout, provider controls, and billing panels for user/admin/platform scopes. |
| `booking/` | Public booking page, calendar/editor/workspace, appointment and confirmation views, templates, availability and form controls, embed/preview, and booking styles. |
| `campaigns/` | Campaign page, API calls, and styles. |
| `commerce/` | Product/course/service/digital product workspaces, checkout, orders/purchases, reviews, student management, pricing, access, previews, customer portal, templates, policies, and shared commerce models/repositories. |
| `crm/` plus `CRMLeads.tsx`, `CRMRouting.tsx` | CRM records, lead actions, pipeline, tasks, dialogs, templates, models, API requests, and CRM styling. |
| `dashboard/` | Home dashboard and its visuals/styles. |
| `flow-builder/` | Flow/automation builder feature components and supporting logic. |
| `inbox/` plus `Inbox.tsx` | Inbox experience and inbox-specific components/styles. |
| `landing/` | Public landing page, content/CMS, native preview, white-label story, and preview adapters. |
| `onboarding/` | Account activation, activation wizard pieces, progress, localization data, and asset generation. |
| `pagefly/` | Page builder renderer, element registry, sanitization, tree/factory/context, widgets, types, and sample page templates. |
| `settings/` | Settings workspace and profile/business/billing/integration/team/security/privacy/domain/knowledge panels, navigation, data, and CSS. |
| `super-admin/` | Platform dashboard/workspace, Meta app and Launch Brand settings, admin data, and styles. |
| `support/` | Support chat, user support entry, assignments/dialogs/media, support model, and styles. |
| `templates/` | WhatsApp templates and template API/style. Other template tools are distributed with their feature domains. |
| Root-level page modules | Standalone feature pages such as `FunnelBuilder`, `ProductsPayments`, `AICopilot`, `AIFollowUp`, `ActivityPage`, `MarketingTracking`, legal pages, published page rendering, template previews, and asset controls. |

## 5. Main technologies and dependencies

- **React 19 + TypeScript 6:** UI components, page logic, and static type checking.
- **Vite 8:** local development server and production build.
- **React Router 7:** URL routing, nested workspaces, redirects, and role-aware navigation.
- **Redux Toolkit + React Redux:** shared auth, UI, and CRM state.
- **Firebase 12:** authentication and Firebase-backed platform services; Cloud Functions and Firestore/storage rules live alongside the app.
- **i18next + react-i18next:** language translation and bilingual English/Arabic display, with RTL support.
- **Tailwind CSS 3, regular CSS, and CSS modules by feature convention:** styling; much of the application uses explicit feature CSS files.
- **Lucide and Phosphor icons, Radix Select, Sonner, Framer Motion, XYFlow:** icons, accessible select primitives, toast messages, animation, and flow diagrams/builders.

## 6. Reading notes and scope

- The route table is the authoritative index of addressable pages. Repeated route aliases often point to the same page component.
- A route can show a sub-view selected by query parameters (for example, template tabs or product preview mode).
- Some pages are intentionally generic workspaces, and some are explicit placeholders. A route's existence alone does not prove that every action is connected to a production backend.
- This guide describes the current code structure and route/component mapping. It does not certify deployment status, Firebase rules in a live project, or external provider credentials.

## 7. Libraries used in both applications

This repository has two related front ends: `GOS-app` (UpKlick) and `phoenix-app` (Joe Academy/Phoenix). The lists below summarize direct dependencies from each app's `package.json`; versions are the declared semver ranges, not a statement about the exact version installed at runtime.

### GOS-app (`GOS-app/package.json`)

| Library | Declared version | Main use |
|---|---:|---|
| `react`, `react-dom` | `^19.2.8` | UI and browser rendering. |
| `react-router-dom` | `^7.18.4` | App routes, nested layouts, navigation and redirects. |
| `@reduxjs/toolkit`, `react-redux` | `^2.13.0`, `^9.3.0` | Shared client state and React bindings. |
| `firebase` | `^12.19.0` | Firebase client SDK: authentication, Firestore/functions and related services. |
| `i18next`, `react-i18next` | `^26.4.2`, `^17.0.15` | Localization and translated React UI. |
| `lucide-react`, `@phosphor-icons/react` | `^1.49.0`, `^2.1.10` | UI icon sets. |
| `@radix-ui/react-select` | `^2.3.7` | Accessible select primitive. |
| `@xyflow/react` | `^12.12.1` | Node/edge workflow or flow editing UI. |
| `framer-motion` | `^13.4.6` | UI transitions and animation. |
| `sonner` | `^2.0.8` | Toast notifications. |
| `clsx`, `tailwind-merge` | `^2.1.1`, `^3.7.0` | Conditional class strings and Tailwind class merging. |
| `vite`, `@vitejs/plugin-react` | `^8.3.0`, `^6.1.1` | Dev server/build and React transform. |
| `typescript` | `~6.0.2` | Type checking and TS compilation. |
| `tailwindcss`, `postcss`, `autoprefixer` | `^3.4.19`, `^8.5.28`, `^10.6.1` | CSS utility generation and processing. |
| `oxlint` | `^1.81.0` | Linting. |

### Phoenix-app (`phoenix-app/package.json`)

Phoenix shares React, React Router, Firebase, Redux Toolkit, i18next, Lucide/Phosphor, Framer Motion, Sonner, clsx, and Tailwind class merging with GOS. Its additional direct dependencies include:

| Library | Declared version | Main use |
|---|---:|---|
| `@tanstack/react-router` | `^1.170.45` | Typed routing in Phoenix features alongside the app's other router dependencies. |
| `zustand` | `^5.0.15` | Lightweight feature/store state. |
| `@radix-ui/*` family | Versions in package manifest | Accessible accordion, dialogs, menus, popovers, select, tabs, tooltip, toggle, and other UI primitives. |
| `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` | `^6.3.1`, `^10.0.0`, `^3.2.2` | Drag-and-drop interactions, including sortable content. |
| `ai`, `streamdown`, `@streamdown/*` | `^7.0.143`, `^2.7.0`, plugin versions in manifest | AI SDK and rendering streamed Markdown/code/math/diagrams. |
| `react-hook-form`, `zod` | `^7.90.0`, `^3.25.76` | Form state and schema validation. |
| `recharts` | `^2.15.4` | Charts. |
| `date-fns`, `react-day-picker` | `^4.4.0`, `^10.0.2` | Date utilities and date picker UI. |
| `jspdf`, `fflate` | `^4.2.1`, `^0.8.3` | PDF output and compression/zip utilities. |
| `nanoid` | `^6.0.2` | Compact unique IDs. |
| `@tailwindcss/vite`, `tailwindcss` | `^4.3.3`, `^4.3.3` | Tailwind 4 build integration and utility CSS. |
| `firebase-admin` | `^14.5.0` (dev dependency) | Admin SDK in scripts/tests and server-side tooling. |
| `@playwright/test`, `@axe-core/playwright` | `1.64.1`, `4.14.0` | Browser automation and accessibility checks. |
| `@firebase/rules-unit-testing` | `^5.0.2` | Firebase security-rules tests. |

Both apps also use Vite, React's Vite plugin, TypeScript 6, and Oxlint. Phoenix declares Tailwind 4, plus a `tailwindcss-gos` alias to Tailwind 3.4 for compatibility with GOS preview styles.

## 8. How Phoenix and GOS are connected

The two apps are separate deployments and separate Firebase projects; they do not import each other's source code. Their bridge is the GOS Cloud Function `phoenixPlatform` (`functions/phoenix.js`), called over HTTPS by Phoenix (`phoenix-app/src/services/gosPlatform.ts`) and, for Phoenix-password sign-in, by GOS (`GOS-app/src/backend/phoenixLogin.ts`). The Firebase project IDs in the code are Phoenix `phoenix-app-8bc7b` and GOS `gos-app-3c7fb`.

### Normal Phoenix-to-GOS platform opening

1. A signed-in Phoenix user reaches Phoenix's open-platform page. Phoenix asks `phoenixPlatform` for `platform-status`; it sends the current Phoenix Firebase ID token as a Bearer token.
2. The function verifies that token against Phoenix Auth and checks the account's link record (`phoenixAccounts/{phoenixUid}`) and the matching GOS profile/brand preparation state.
3. On `open`, GOS mints a short-lived Firebase custom token for the linked GOS Auth UID. The custom claims include platform role, `phoenixUid`, and `tenantId`.
4. Phoenix navigates the browser to `https://app.upklick.net/auth/phoenix#token=...`. The token is in the URL hash (not sent as a server request path); GOS reads it, immediately removes it from browser history, signs into GOS Firebase with `signInWithCustomToken`, resolves the GOS session, and routes by role.
5. The GOS session loader sees the `phoenixUid` claim/profile and loads the user's Phoenix brand settings from GOS's prepared brand snapshot. Thus the GOS workspace can use the identity and brand configured in Phoenix.

### Deployment and data handoff

When a Phoenix user deploys or changes the connected platform, `phoenixPlatform` validates and reads a revisioned set of Phoenix brand-engine documents, pages, and referenced assets. It writes a versioned snapshot in GOS Firestore (`users/{gosUid}/brandEngineSnapshots/{revision}`), then transactionally publishes a pointer at `users/{gosUid}/brandEngine/current`, creates/updates the `phoenixAccounts/{phoenixUid}` link, and syncs related tenant/brand profile values. The snapshot is the handoff of configuration data; later GOS loads that prepared snapshot. On a later open, the bridge checks the latest revision and refreshes the snapshot when it differs.

The bridge also provisions or repairs the GOS admin profile, tenant membership, claims, wallet records, and linked agency account needed for that platform. The Phoenix user remains the source identity; the linked GOS identity is the account that authenticates into the platform.

### Phoenix password login from GOS

The GOS login helper temporarily signs into Phoenix Auth using Phoenix's Firebase configuration and the supplied credentials, then asks `phoenixPlatform` to perform a `login` action. The server independently verifies the password against Phoenix Identity Toolkit and checks the verified UID matches the token identity. After that verification, if the GOS account does not have a local-password policy enabled, the bridge sets that same password on the linked GOS Auth account before minting the GOS custom token. If a local GOS password policy exists, it rejects this path and directs the user to sign in with the Upklick password. The temporary Phoenix Firebase app uses in-memory persistence and is signed out/deleted after the exchange. This is a distinct path from an already authenticated Phoenix session opening GOS.

## 9. How “Switch Account” works in GOS

In this code, “Switch Account” means **administrator impersonation/workspace access**. It does not replace the original admin's Firebase login with the target user's password or stored credentials.

### Starting the switch

1. Admins can select a sub-account from the sidebar's `SubAccountSwitcher`; account-management surfaces also call the same `switchToUser` service. Platform super-admins get the platform account switcher.
2. The client validates the requested user/workspace IDs and checks the effective role. An `ADMIN` can switch only to permitted user accounts belonging to that admin; a `SUPER_ADMIN` can switch to user accounts and managed admin accounts. An already impersonating regular admin cannot switch again.
3. The client calls the GOS callable function `manageUser` with `operation: 'impersonate'`, target ID, and optional tenant ID. The server checks permissions, target status, tenant membership, account enabled state, and ownership. It writes a `userManagementAudit` record.
4. The server creates a Firebase custom token for the target with target role/tenant and an `impersonatedBy` claim pointing to the original actor.
5. The browser signs that token into a *separate Firebase app* with in-memory persistence. It switches the backend context to that secondary app and saves an `impersonation` snapshot in Redux containing the original admin's user, role, tenant, and token. The original primary Firebase login remains active.
6. The router sends the operator to `/dashboard` for a user target or `/admin/dashboard` for a managed-admin target. `WorkspaceData` and backend services then use the switched app/context and target tenant, so the operator sees the target workspace. The UI shows a switcher/return-to-admin control.

### Returning and restrictions

`returnToAdmin()` checks that the original primary Firebase user is still the saved admin and that the profile is not suspended/deactivated/deleted. It clears the secondary Firebase app/backend context, restores the Phoenix brand if the admin has one, restores the original Redux session, and navigates to the matching admin dashboard. Logout while impersonating first attempts this return path.

The UI may remember the selected sub-account ID in browser `localStorage` for convenience, but that value is not the authorization mechanism. Authorization comes from server-side role/ownership/status/member checks and the custom token. The server refuses nested impersonation based on the `impersonatedBy` claim. Sensitive admin-only views/actions are also suppressed or gated while impersonating.

If the Cloud Function switch call fails and the caller supplied cached account details, the client has a limited Firestore-backed fallback. It is restricted for ordinary admins to owned user accounts; it uses the existing admin token rather than a target custom token and therefore is not equivalent to the normal server-issued impersonation session. The standard path is the audited custom-token exchange.

## 10. How Stripe works in GOS: front end and back end

The Stripe integration is multi-tenant: each payment is associated with a payment owner/scope (`user`, `admin`, or platform `super_admin`). The owner's Stripe Secret Key and optional Webhook Secret are stored in private integration documents. Public checkout configuration contains only fields such as `enabled`, publishable key, mode, and optional Stripe Payment Links.

### Connecting Stripe in settings

1. An operator opens Payment Methods and enters the Stripe mode and keys in `src/pages/settings/PaymentMethodsPanel.tsx`.
2. The UI calls `testStripeConnection()` in `src/backend/stripeService.ts`, which normally invokes the `stripeGateway` callable with `operation: 'test'`.
3. The Cloud Function derives the payment owner from scope/ID, checks the caller's role and ownership with `canManageScope()`, loads the private credentials, and calls Stripe `/v1/balance` with the Secret Key. It checks that Stripe's `livemode` matches the selected sandbox/live mode.
4. Saving also syncs public-only settings to a public Firestore projection. This lets checkout UI read what methods/mode to present without needing to read the secret for the normal flow. The UI displays a generated `stripeWebhook` URL for the owner to register in Stripe Dashboard.

### Product checkout path currently wired in the UI

1. `src/pages/commerce/CheckoutScreen.tsx` obtains the configured payment methods, builds the customer's order/quote, and when the selected method is Stripe creates a Checkout Session through `createCheckoutSession()`.
2. `src/backend/stripeService.ts` calls the GOS callable `stripeGateway` with `operation: 'createCheckout'`, product/order IDs, owner scope, amount, currency, customer email, request/idempotency ID, and success/cancel URLs.
3. `functions/stripe-gateway.js` authenticates the buyer (or allows its limited guest product-checkout case), resolves the correct owner's saved secret, validates the amount/currency and that return URLs belong to the app's origin, then sends a form-encoded request to Stripe `/v1/checkout/sessions`.
4. The backend saves a local session record in `stripeCheckoutSessions/{sessionId}`, including owner, user, product/order, amount, currency, mode, and `fulfilled: false`. It returns Stripe's hosted Checkout URL; the browser redirects the customer to that URL. The secret stays server-side on this standard path.
5. Stripe redirects the browser to the success or cancel URL. The product checkout removes payment parameters from the address bar and calls `verifyCheckoutSession()` for a success return; it does not treat the redirect alone as proof of payment.
6. `verifySession` loads the local session record, checks the signed-in user for non-product purchases, fetches the session directly from Stripe using the owner's secret, and only fulfills it if Stripe reports `payment_status: 'paid'`.

### Webhook and fulfillment

Stripe posts `checkout.session.completed` events to the generated `stripeWebhook` Cloud Function URL. The handler selects the owner from the URL or event metadata, optionally checks the `Stripe-Signature` if a Webhook Secret is configured, then always retrieves the Checkout Session from Stripe itself before marking it paid. Fulfillment runs in a Firestore transaction and uses the local `fulfilled` flag for idempotency. It records payment/session data and updates related billing requests, product checkout/order/transaction records, or domain orders. Product purchase fulfillment can then grant delivery/access through the configured fulfillment hook.

The webhook and browser-return verification converge on the same fulfillment logic. Therefore, retries or the webhook arriving before the browser return should not credit the same recorded session twice.

### Important behavior and code observations

- In the wired product UI, the Stripe Checkout Session uses `mode: 'payment'` (one-time payment). Although callers can pass an interval and select an annual static Payment Link, this code path does not create a Stripe recurring subscription session.
- The wallet top-up UI currently takes a different path. `WalletTopupModal.tsx` sends `paymentType: 'gateway'` and `gatewayPaid: true` directly to the billing `requestWalletTopup` operation. `functions/billing-engine.js` treats those client-supplied values as confirmation and credits the communication wallet immediately. This path does not call `createCheckoutSession` or verify a Stripe Checkout Session in the inspected client flow. It should not be considered safely Stripe-confirmed as currently wired; the backend should derive confirmation from a verified Stripe session/webhook rather than trust a client flag.
- `stripeService.ts` has compatibility fallbacks that, if `stripeGateway` errors, read saved credentials from Firestore and call Stripe's API directly from the browser for connection testing, checkout creation, and return verification. So the comment that secrets never leave server-side documents describes the intended primary path, but not those fallback branches: those branches expose the Secret Key to client JavaScript/network requests. The normal callable path avoids this. These fallbacks should be reviewed/removed or redesigned before relying on strict secret isolation.
- Webhook signature verification is conditional on a Webhook Secret being present. Even then, the handler also retrieves the session from Stripe, which is an important source-of-truth check. Configure the webhook secret for signature authentication and keep it in the private credential document.
