# Live admin management

The five management routes now use `AdminLiveManagement` and an admin-only Firebase adapter. Other admin modules retain their existing behavior. The adapter uses the primary Firebase identity and never changes backend context, populates tenant workspace stores, or writes tenant documents. USER and impersonated sessions cannot start these subscriptions.

## Management interface

`AdminManagementView` provides the shared management interface: semantic tables, sortable columns, status pills, workspace/owner attribution, live counts, loading skeletons, filter chips, empty/error states, CSV export and 10/25/50-row pagination. Controls and styles are scoped to `.adm-live` and `.adm-live-dialog`; the primary and secondary tokens remain `#7C3AED` and `#A78BFA` in both themes. Category tabs support arrow keys, Home and End. Native modal dialogs provide focus containment, Escape dismissal and focus restoration.

Asset subtype filtering prioritizes `formAsset`, so forms stored with a website builder are correctly labeled Forms. CRM subscribes to pipelines alongside leads; bookings subscribe to calendars alongside appointments. Relationship filter values use full `tenants/{workspace}/pipelines/{id}` or `tenants/{workspace}/calendars/{id}` paths, preventing collisions when several tenants reuse an ID. Changing the workspace resets pipeline/calendar selections. Missing pipeline records retain a scoped fallback option, including legacy leads in `main`.

Details use structured cards for ownership, contact information, pipeline qualification, scheduling, availability, pricing and template flow. They do not expose raw document JSON. Site and template document previews reuse the existing `PagePreview` renderer without modifying it, with saved-page selection and desktop/tablet/mobile viewport controls. The canvas is inert; it cannot submit forms, navigate to checkout, or create bookings. Stored template configurations use a card-based experience preview.

The template hub exposes all ten canonical categories, including Landing Pages, AI Assistants, AI Knowledge Packs and Email/SMS/WhatsApp. The editor has named headline/step/settings fields and a channel selector, replacing the raw JSON editor. An optional starter picker clones an existing `MASTER_TEMPLATES` preset into the draft. Saving or activating that draft writes to the existing shared `templateCatalog`; browsing presets alone writes nothing. Existing static tenant presets and installed tenant copies are unchanged. This UI refinement does not modify tenant pages, routes, gallery adapters, local states, permission rules or Firebase configuration.

| Route | Canonical Firestore records |
| --- | --- |
| `/admin/funnels` | `tenants/{id}/assets`, including drafts and published documents |
| `/admin/crm` | `tenants/{id}/leads` and `pipelines` |
| `/admin/booking` | `tenants/{id}/bookings` and `calendars` |
| `/admin/products` | `tenants/{id}/products`, `orders`, and `transactions` |
| `/admin/templates` | `templateCatalog` |

Workspace discovery listens to `tenants`; each selected resource has its own listener per workspace. Added/removed workspaces dynamically attach/detach listeners. Unmount, signout and identity changes release every listener. Full Firestore paths identify records, avoiding collisions between tenants. Errors show incomplete-data status and disable export. Empty databases remain empty; no admin demo/localStorage records are promoted to production.

Owner attribution comes from the tenant/asset owner ID and USER profiles, with IDs retained when an owner profile cannot be resolved. Booking hosts join calendars within the same workspace. Product pricing retains its actual currency; order and payment histories are separate immutable monitoring tabs. Filters operate on the admin result set only.

All tenant resources are read-only in this module. Existing tenant permission rules are unchanged. Booking controls provide search, filtering, details and export; they do not cancel or reschedule customer appointments. Existing wider platform-admin grants are not revoked by this frontend monitoring change.

Master template create/edit/delete and visibility changes persist to `templateCatalog`, with admin-only validated writes in `firestore.rules`. Existing catalog entries without visibility fields remain active until explicitly deactivated. The user template hub filters inactive entries. Page galleries add active catalog templates alongside their existing defaults. Installing a page design clones the builder document and resets publication to Draft. Existing tenant copies, route definitions and workspace state remain independent.

Page templates reuse the actual `BuilderWorkspace` component with a supplied document and an in-memory change callback. The outer template Save commits to the catalog; no tenant asset is created and no Hosting publish callback is supplied. Other categories use the structured content editor used by the user template hub. Preview is inert and does not submit forms, book appointments or invoke checkout.

## Validation and release

- `node --test tests/admin-management.test.mjs tests/admin-safety.test.mjs functions/impersonation.test.js`
- `node tests/admin-management-browser.test.mjs` (`PLAYWRIGHT_MODULE` can point to an external `playwright-core` installation).
- Browser artifacts are saved under `artifacts/admin-management-polish`, including module tables, structured details, page/device previews and mobile English/Arabic views in both themes. The browser suite uses a test-only backend adapter; it does not read or write production data.
- With Java and Firebase Auth/Firestore emulators installed: `firebase emulators:exec --only auth,firestore --project demo-gos-admin-management "node tests/admin-management-rules-emulator.test.mjs"`.
- `npm run build` for the full repository compilation and bundle.

Deploy the reviewed Firestore rules together with the frontend. No new collection-group indexes, Cloud Functions, production seeding or migrations are required. This implementation does not deploy automatically. The former browser-local admin template library is not uploaded; the existing shared production catalog remains the source of truth.

The UI refinement passes 29 unit/regression checks. The initial full browser suite passed across all five modules, themes, specialized filters, details, previews, presets and CRUD. Final browser reruns after visual refinements were interrupted by navigation failures/browser termination while the host was reporting memory/pagefile exhaustion. Full repository type checking reports existing missing-state declarations in `src/pages/crm/CRMRecord.tsx`; that tenant file is unchanged by this task. Production bundling also encountered host memory/pagefile exhaustion during this validation. Firestore emulator rules checks still require Java. Treat those release checks as outstanding, and do not infer production deployment or a complete end-to-end production audit from fixture-based UI checks. Set `ADMIN_UI_SCREENSHOTS=0` to run the browser interaction suite without screenshot capture on constrained hosts.
