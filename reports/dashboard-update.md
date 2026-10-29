# Dashboard update

Implemented in the workspace; deployment has not been performed.

- Publishing encodes decoded canvases before both server and browser Firestore writes, using the existing `gosNestedArrayV1` representation. Custom-domain rendering decodes that representation. Hosting HTML retains normal editor arrays.
- Forms use the existing tenant assets collection with an optional `formAsset` flag. The Forms tab offers templates, configurable text/email/phone/textarea/select/checkbox fields, required validation, publication/unpublication, share links, embed code, and direct embedding into a selected funnel/website page.
- Funnel, website, form, booking and product configurations support optional `crmRouting` settings. Public submissions use the published routing snapshot; bookings and paid orders use their saved tenant configuration. Missing/archived destinations fall back safely. Paid buyers create CRM records even without a CRM automation tag.
- Lead quick views include contact details, custom fields, notes, activity and pipeline/stage movement. Kanban drag targets support transfers to another pipeline. Source filters normalize existing source labels without migrating stored leads.
- Booking quick views show answers, schedule and status. Commerce quick views show customer information, purchased products and associated payments.
- Pixel is available in Settings; the former user tracking URL redirects there. Settings displays its own navigation with a persistent return link.
- The reproducible light-mode audit covers 74 stylesheets, corrects 860 neutral text declarations and 12 text tokens, and inventories 108 low/muted Tailwind utility occurrences. Generated corrections are scoped to light app UI. Dark themes and authored customer previews are excluded. The detailed JSON records source locations and contrast against white; this automated audit is not a certification of every rendered foreground/background combination.

## Validation

- TypeScript and production build.
- 59 backend/CRM tests covering publication arrays, release/unpublish behavior, capture validation/idempotency, configured routing, paid fulfillment, and CRM persistence.
- CRM browser suite: quick views, full records, linked bookings/orders, filters, exports, imports, tasks, and pipeline management.
- Forms browser suite: templates, field editing, required checkbox, routing, actual submission payload, direct embedding, and mobile overflow.
- `git diff --check`.

## Release requirements

Deploy the frontend and updated Cloud Functions, including the new `unpublishAsset` callable. Existing documents remain readable; rules and authentication were not changed. New form submissions and routing settings are additive. Republish assets after deployment to include the updated public runtime and release routing snapshot. The isolated landing-preview session adapter also includes the missing activation exports required by the production bundle.
