# Pixel & Tracking Feature — البيكسل والتتبع

Standalone export of the UpKlick **Pixel & Tracking** feature (admin nav item #6).

## Core files (copied as-is)

| File | Role |
|---|---|
| `src/app/admin/TrackingSettingsPage.js` | Admin UI for Meta Pixel + GA4 setup, wizard, realtime logs, custom events |
| `src/lib/tracking.js` | Client SDK: `Tracking.page / lead / purchase / identify / track / custom` |
| `src/components/TrackingScripts.js` | Injects Meta Pixel (`fbq`) + Google Analytics (`gtag`) scripts |
| `src/components/GlobalTracking.js` | Loads `tenants/global.trackingCenter` from Firestore and fires page views |
| `src/app/route.js` | Server route that injects pixel/GA into `public/landing-page.html` |
| `marketing-tracking-center-module.html` | Original standalone HTML/JS marketing & tracking center module |

## Where config lives

Firestore document: `tenants/global`  
Field: `trackingCenter`

```js
{
  meta: { connected, business, page, pixel: { id, name } },
  google: { connected, property: { name, measurementId } },
  advancedMode: false,
  customEvents: []
}
```

Local cache key: `upklick_tracking_center` (localStorage)

## Wiring points (snippets in `/integration-snippets`)

These stay inside the main app — copy the patterns when integrating elsewhere:

1. **Admin nav** — `admin/layout.js` tab `tracking` labeled `البيكسل والتتبع`
2. **Admin render** — `admin/page.js` shows `<TrackingSettingsPage />`
3. **Root layout** — mounts `<GlobalTracking />`
4. **Public profile** — `[username]/page.js` uses `TrackingScripts` + `Tracking.*`
5. **Auth pages** — login/register fire Lead / CompleteRegistration / custom events
6. **Default state** — `BusinessContext` `trackingCenter` defaults
7. **i18n** — `adminTranslations.js` keys for AR/EN

## Dependencies used by these files

- `firebase/firestore` (`doc`, `getDoc`, `setDoc`, `onSnapshot`)
- `@/lib/firebase` → `db`
- `@/utils/firebaseAdmin` → `adminDb` (for `route.js` only)
- `next/script`, `next/navigation` (`usePathname`)
- `../../hooks/useTranslation` (admin page)

## Not included (related but separate)

- `ActiveSessionTracker.js` — dashboard usage-time analytics, not Meta/GA pixel
