# Launch Brand (moved from Joe Academy)

Launch Brand used to live in Joe Academy (`phoenix-app`, `/launch-brand`). It now runs on
gos-app at `https://gos-app-3c7fb.web.app/launch-brand`, with its data in gos-app's Firebase.

## Why a separate folder
Launch Brand is built with Tailwind 4 and its own app shell; gos-app uses Tailwind 3. Building it
on its own keeps both designs exactly as they are. `npm run build` in gos-app builds gos-app
first, then this folder into `dist/launch-brand`. Firebase Hosting serves it at `/launch-brand`.

First time only: `npm --prefix launch-brand install`

## What was copied unchanged
Every file under `src/` that `/launch-brand` uses, copied byte for byte from phoenix-app
(`src/pages/LaunchBrandPage.tsx`, `src/modules/brand-engine/**`, store, i18n, styles...).

## The only changed or new files
| File | Why |
|---|---|
| `src/lib/firebase.ts` | Uses gos-app's project, Launch Brand's own Firestore database `launch-brand`, and a separate app name so its sign-in doesn't mix with the gos dashboard's |
| `src/main.tsx`, `src/host/*` | Small host instead of Joe Academy's App shell: signs in with the one-time ticket from Joe Academy, then shows the original page |
| `gos-preview/GosPreviewBridge.tsx`, `landing-preview/LandingPreviewBridge.tsx`, `gos-live/*` | Dashboard and website previews now show gos-app's real pages live (Demo Account mode) instead of frozen copies |
| `services/phoenixTransfer.ts` | "/dashboard" meant Joe Academy's dashboard; it now links there by full address |
| `firebase/firestore.rules` | Joe Academy's rules, unchanged except every sign-in check also requires the `launchBrand` claim |

## How access works
Joe Academy `/launch-brand` (the "Build brand" button) → gos function `phoenixPlatform`
(`launch-brand-ticket`) checks the Joe Academy login and makes a ticket valid for 60 seconds, usable once →
`/launch-brand#ticket=…` → `launch-brand-exchange` signs the user in for this tab only.
A copied link shows "Open Launch Brand from Joe Academy".

## GOS admin settings

GOS **Settings → Launch Brand Settings** (after Transactions) contains AI Center
and Business Discovery tabs. The Phoenix page wrappers, console components,
styles and authentication hook are copied unchanged. They run in the existing
Tailwind 4 app, embedded in the GOS dashboard, and use GOS's `launch-brand`
database and its saved AI Center provider connection.

Shared configuration requires an active GOS `SUPER_ADMIN`; tenant `ADMIN`
accounts cannot change the provider or discovery configuration for every student.
The server verifies the GOS token and current profile before issuing a separate,
memory-only Launch Brand admin session. Student sessions and profiles are separate.

Deploy using `npm run deploy:launch-brand`. This builds both apps and deploys
Hosting plus `phoenixPlatform` through an isolated function package. Launch Brand
uses the key saved by AI Center; this deployment does not need Copilot's
`OPENAI_API_KEY` Secret Manager parameter. It does not deploy or change Copilot.

Checks: production build; 19 bridge/admin authorization tests; exact source-file
hash comparison for the imported consoles and their services. The isolated UI
test is `tests/launch-brand-settings-browser.test.mjs`; set `PLAYWRIGHT_MODULE`
to an installed `playwright-core` module if it is not installed in this checkout.
The UI fixture blocks all external requests and never calls a live AI provider.

Verified on 8 November 2026: both app builds, all 19 bridge/admin tests and the
local browser check passed. Hosting and the bridge were deployed successfully.
The new settings routes serve the current build; unauthenticated admin-session
requests return HTTP 401. GOS's saved Gemini connection is present and marked
connected; its key was neither printed nor sent to a provider during verification.
Focused lint of the new integration files has no errors (two effect warnings).
Repository-wide lint still reports preexisting errors outside this change.

## Old data
`scripts/migrate-from-joe-academy.mjs` copies all existing Launch Brand data (same IDs and
structure) from `phoenix-app-8bc7b` to the `launch-brand` database. Run it with `--dry-run` first.
Re-run with `--globals-only` after changing AI or discovery settings in Joe Academy's admin.
