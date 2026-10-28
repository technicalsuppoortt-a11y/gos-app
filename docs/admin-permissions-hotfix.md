# Permissions, support CORS and gateway hotfix — 2026-10-28

## Confirmed causes

Live inspection found that `supportChat` had never been deployed: its URL returned HTTP 404 and no CORS headers. The deployed Firestore rules also lacked both `/settings/platformTools` and `/supportRooms`. All six real account profiles already had active, valid roles and tenant IDs; changing their claims or weakening account authorization was unnecessary.

The new frontend incorrectly made an optional tool-policy lookup a prerequisite for loading existing workspaces. A denied read of that new document therefore replaced working funnel and other dashboard routes with an authorization error.

## Changes

- Optional tool-policy reads no longer replace authenticated workspace routes while loading or when unavailable. External GOS API calls retain their original authentication and tenant authorization when that auxiliary policy cannot be read. Explicit, successfully loaded disabled/maintenance policies still apply.
- Missing legacy subscription metadata does not remove otherwise authorized workspace access. Known plan restrictions remain enforced.
- Removed the newly introduced operational-policy checks from canonical Firestore writes, restoring the original membership/module rules. Admin configuration and chat have their own narrowly scoped rules; private merchant credentials and chat-message writes remain server-controlled.
- Tool saves wait for Firebase Auth readiness and write the actual authenticated UID. Published rules permit active admins and super admins to manage tool settings without requiring redundant custom claims.
- Support uses Firebase's [official callable CORS handling](https://firebase.google.com/docs/functions/callable#configure_cors_cross-origin_resource_sharing), with public transport invocation and authenticated application authorization. Preflight runs before role checks. No second raw-HTTP transport or extra CORS wrapper was introduced.
- Payment Methods renders exactly four gateway cards, in this order: Stripe, Paddle, Fawry / Kashier, Paymob. Existing responsive grid CSS, colors and manual transfer methods are unchanged. Previously stored gateway records were not deleted.

User dashboard page source, session/authentication implementation, original role guards and the external hybrid API URLs/payloads are unchanged.

## Validation

- TypeScript project check passed.
- Production Vite build passed.
- 27 targeted tests passed, including policy fallback, GOS transport/authentication, callable preflight, admin safety, impersonation, support-team isolation and credential handling.
- Browser checks passed for navigation, tool saves and failed saves, exactly four gateway cards, secret inputs, image loading, support send/retry, and responsive conversation switching.
- Firebase remotely compiled both Firestore and Storage rule files successfully.
- Live disposable-account checks passed for user funnel create/read in their own workspace, admin tool-configuration writes without custom claims, assigned support message exchange and reads, and all four gateway configuration reads. They also confirmed denial of cross-workspace access, unrelated room reads, direct client message writes, user policy writes and user gateway-credential reads.
- The policy-write test saved identical feature values and used an update-time precondition for cleanup. It did not toggle real features. All disposable accounts, workspace documents and chat messages were removed; a final profile inventory returned the original six active accounts.
- Live `OPTIONS` requests to `supportChat`, `configurePaymentMethods` and `publishAsset` returned HTTP 204, `Access-Control-Allow-Origin: http://localhost:5173` and POST allowance.

Firestore/Storage rules and `user-dashboard:supportChat` / `user-dashboard:configurePaymentMethods` were deployed successfully. The verified frontend build was also deployed to `https://gos-app-3c7fb.web.app` through Firebase Hosting.

This hotfix supersedes the earlier permissions/deployment limitations in `admin-dashboard-updates.md`. Advanced engine-configuration and live payment-processing limitations described there are outside this permissions/CORS hotfix.
