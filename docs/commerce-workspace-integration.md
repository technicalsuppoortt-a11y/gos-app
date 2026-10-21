# Product workspace integration

Product drafts remain in component state while switching tabs. Save Changes / Save as Draft / Publish await Firestore, reject duplicate mutations and preserve failed drafts. Concurrent enrollment progress is merged when unrelated fields are saved. Route and tenant changes create independent editors. No stylesheet or existing grid/action-bar classes were changed for this integration.

| Tabs | Source and behavior |
| --- | --- |
| Overview / Information / Content | Product document: content, images, instructor, locale, tags and stable module/lesson IDs. Preview progress stays separate from enrolled learner progress. |
| Pricing / Offers / Checkout | One-time, installment and recurring amounts share one state mapping. Preview applies automatic discounts, entered coupons, tax, one-off bumps and required terms acceptance. Checkout remains a preview; verified payment-provider records drive fulfillment. |
| Funnel & Pages | Workspace funnel/page IDs, published domain/page URL, sales URL and redirect settings. |
| Students / Customer Access | Saved enrollments, manual status/revocation, expiring access links, download limits and saved delivery rules. Manage access uses the saved product, not unsaved settings. |
| Orders / Analytics | Exact product IDs link live workspace orders and transactions; order-linked transactions are deduplicated. Progress comes from enrollments; lesson views come from backend access events. |
| Booking | Live workspace calendar and member selection. The calendar handles actual availability/reservations. Sync saved calendar settings explicitly applies saved duration, buffers and cancellation notice, with both products and booking permission required. |
| Automation / Settings | CRM tags, confirmation/file-delivery notifications, calendar invitations, visibility, community URL, certificates, buffers/cancellation policy and webhook settings. Additional controls use card-header actions and existing dialogs. |

## Backend deployment and configuration

The new handlers are code changes, not an already deployed service:

- Deploy `commerceService`, `productAccess`, `fulfillProductOrder`, `fulfillProductTransaction` and `processCommerceDeliveries`, plus the updated public booking handler.
- Configure Secret Manager `RESEND_API_KEY`, a verified sender at `tenants/{tenantId}/integrations/email.from`, and the correct `APP_ORIGIN`. No emails were sent during automated checks.
- The service account needs permission to sign reads for objects in the configured Firebase Storage bucket. Signed URLs last one minute; every new download checks grant status, expiration, enrollment, release date and limits.
- Grants/tokens/certificates/receipts/delivery jobs are backend-owned collections; no new client Firestore write permissions are granted. Customer links use `/product-access?tenant=…&token=…`. Login-required products check the authenticated customer's email.
- Paid order/transaction triggers are idempotent across records linked by order ID. Refunds suspend affected enrollments and revoke grants. Preview interactions never create paid orders or fulfillment jobs.
- Delivery jobs expose `queued`, `processing`, `delivered` or `failed` status and errors in `commerceDeliveries`. Provider failures never report delivery success. Jobs in `processing` after an interrupted worker need operator review before retrying; outbound provider idempotency keys are stable per job.
- Webhooks require public HTTPS on port 443; DNS results are checked and pinned, redirects are not followed. Consumers should deduplicate `X-GOS-Delivery-ID`.
- Watermarking remains a stored delivery preference; the current download service does not transform PDF/video content. Payment collection, provider-specific coupon eligibility and subscription execution remain the connected payment provider's responsibility.

## Verification

`node --test tests/commerce-model.test.cjs tests/commerce-save-regressions.test.mjs tests/commerce-upload-presets.test.mjs tests/commerce-workspace-logic.test.mjs tests/products-payments-audit.test.mjs`

`node --test functions/policy.test.js functions/tests/commerce-service.test.mjs functions/tests/delivery.test.mjs`

`node tests/commerce-save-browser.test.mjs` (installed Edge and `PLAYWRIGHT_MODULE` required). The browser harness uses mocked workspace writes and upload failures. It checks cross-tab drafts, explicit save failures/retries, duplicate clicks, per-product live orders, enrollments/analytics and advanced settings in all three workspaces. Production provider delivery and deployed IAM have not been replayed.
