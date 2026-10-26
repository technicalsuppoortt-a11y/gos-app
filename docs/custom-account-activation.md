# Custom Upclick account activation

The public React route is `/onboarding/activate-account`. It uses the dashboard's Upclick rocket wordmark, DM Sans/Manrope typography, purple primary color, card surfaces, dark mode and Arabic layout. The page checks the Firebase link before showing the password form, displays confirmation after setup, and sends the user to `/dashboard` through the Continue button.

## Exact source changes

| File | Change |
| --- | --- |
| `src/pages/onboarding/ActivateAccountPage.tsx` | New centered setup card; trusted email lookup with `verifyPasswordResetCode`; password confirmation; `confirmPasswordReset`; password sign-in and server activation; success confirmation and dashboard navigation. |
| `src/pages/onboarding/activate-account.css` | Scoped dashboard colors, typography, logo/card/input/button styling, responsive layout, dark mode and RTL. |
| `src/router/index.tsx` | Lazy-loaded public `/onboarding/activate-account` route, outside the authenticated dashboard guard. |
| `functions/activation-links.js` | Copies all query parameters from the genuine Firebase-generated action URL onto the custom React route. |
| `functions/index.js` | Both `manageUser` create and activation-link operations call `buildActivationLink`. `APP_ORIGIN` defaults to `https://gos-app-3c7fb.web.app`. |
| `src/backend/adminUsers.ts` | Deduplicates concurrent secure-link requests; retains the server-generated link and its real action code. |
| `src/pages/onboarding/AdminUsers.tsx` | Copy/Preview and the link field resolve genuine links from `manageUser`, instead of constructing token-free fallback URLs. |
| `src/pages/auth/ActivationLinkPage.tsx` | Legacy `/activate` URLs containing a real `oobCode` redirect to the new route with the query intact. |
| `firebase.json` | Includes `/onboarding/**` in the existing no-cache Hosting route headers. The SPA rewrite already serves the public React route. |

The route is registered as:

```tsx
const ActivateAccountPage = lazy(() => import('../pages/onboarding/ActivateAccountPage'));
// Public router entry:
{ path: '/onboarding/activate-account', element: <Suspended><ActivateAccountPage/></Suspended> }
```

The backend generates a real Firebase action code, then changes the handler URL:

```js
const appOrigin = defineString('APP_ORIGIN', {
  default: 'https://gos-app-3c7fb.web.app',
});
const link = buildActivationLink(
  await auth.generatePasswordResetLink(account.email),
  appOrigin.value(),
);
```

`buildActivationLink` preserves `mode`, `oobCode`, `apiKey`, `lang`, `continueUrl`, and any other Firebase action parameters. It requires a password-reset action and HTTPS (localhost HTTP is allowed for development). The app origin is server configuration, never supplied by the inviting browser.

Example URL shape, using a placeholder code:

```text
https://gos-app-3c7fb.web.app/onboarding/activate-account?mode=resetPassword&oobCode=ONE_TIME_CODE&apiKey=PROJECT_API_KEY
```

## Setup sequence

1. An admin creates an invite or requests its setup link through `manageUser`.
2. The invitee opens the custom URL. The page validates `oobCode` and obtains the account email from Firebase; it does not trust an email query parameter.
3. Save calls `confirmPasswordReset(auth, code, password)`.
4. The existing `activateInvitedUser` signs in with the saved password and calls `activateUser`, which atomically sets the profile and membership to Active.
5. The page shows “You’re all set.” Continue replaces the route with `/dashboard`; existing role guards still apply.

If password saving succeeds but activation encounters a network error, Finish activation retries sign-in/activation without consuming the one-time code again. Missing, expired and used codes receive a clear recovery message. Passwords are never persisted in browser storage. Redirect query parameters cannot override the fixed dashboard destination.

## Build and deploy

Run from the repository root with an authenticated Firebase CLI:

Set the non-secret app origin in `functions/.env.gos-app-3c7fb` (already configured in this workspace):

```dotenv
APP_ORIGIN=https://gos-app-3c7fb.web.app
```

```sh
npm test --prefix functions
node tests/activation-page-browser.test.mjs
node tests/onboarding-browser.test.mjs
npm run build
firebase deploy --project gos-app-3c7fb --only hosting
firebase deploy --project gos-app-3c7fb --only functions:user-dashboard:manageUser
node scripts/smoke-onboarding.mjs /absolute/path/to/.config/configstore/firebase-tools.json
```

Deploy Hosting before changing generated links, so the handler is available when new links are issued. For a custom app domain, set `APP_ORIGIN` in `functions/.env.gos-app-3c7fb` to the deployed HTTPS origin and redeploy `manageUser`.

Request a new link in `/admin/users` to use the custom experience. An already issued URL pointing to Firebase's reserved `/__/auth/action` page cannot be retroactively changed by React routing.

Tests cover query-parameter preservation, invalid links, password mismatch, activation retries, success navigation, desktop/mobile, Arabic and dark mode. Browser screenshots are written to `artifacts/firebase-ui/activation-desktop.png` and `activation-mobile-ar-dark.png`. The live smoke test uses disposable accounts and confirms the custom URL contains a working Firebase code and the onboarding lifecycle remains correct.

Release verification: Hosting and `manageUser` were deployed successfully. The custom route served HTTP 200 with the current production bundle and no-cache headers. All 22 backend tests, both focused browser tests, the production build and the live onboarding smoke test passed. The live check verified both create and regenerated invitation URLs use the custom route, then successfully consumed the real action code and activated both Firestore records. All disposable accounts and records were removed.
