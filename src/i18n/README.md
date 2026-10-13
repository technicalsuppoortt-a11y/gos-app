# Interface localization

Arabic and English use the existing i18next language setting. The language switcher persists `i18nextLng`; the document `lang` and `dir` update on every language change.

Components call `useUILanguage()` to subscribe without changing their identity or remounting. Translate presentation strings with `translateText(copy)`; `localizeNode(children)` translates strings and arrays while preserving React elements, keys, handlers, numbers and other values. English returns the original string, including whitespace. Unknown text remains unchanged so user-authored content, personal names, URLs and technical values are preserved.

Keep model values, routes, identifiers, enum members, field names, input values, API payloads and persisted data in their original form. For options, always specify the original `value` separately from the translated label. Shared Radix selects pass the active direction explicitly, including their portals.

Add reviewed English/Arabic pairs to the TSV catalogs in `locales/`, then run `node scripts/build-display-catalog.mjs`. Add interpolated display messages to `locales/patterns-ar.json`, using `{{0}}`, `{{1}}`, etc. Placeholder values remain intact; known status labels are localized for display. Do not use word-by-word translation or DOM mutation.

Use CSS logical properties (`margin-inline-start`, `padding-inline-end`, `text-align: start`) for interface layout. Physical chart coordinates, authored canvas geometry and centering transforms remain physical. Arabic direction overrides apply only when Arabic is active.

Validation:

- `node scripts/verify-localization.mjs`: catalog validation, grammatical patterns, interpolation, technical values and i18next resource parity.
- `node scripts/audit-localization.mjs`: static copy and data-driven labels requiring review; candidates include authored content and technical examples and are not all translation omissions.
- `node scripts/verify-booking-model.mjs`: existing booking behavior checks.
- `node scripts/verify-localization-ui.mjs`: browser checks against a Vite server at port 5173, including language switching, field-value preservation, desktop/mobile overflow and page errors. Set `PLAYWRIGHT_MODULE_PATH` to an installed Playwright package and optionally `PLAYWRIGHT_BROWSER_CHANNEL` to `chrome` or `msedge`.
- `npm run build`: TypeScript and production bundling.
