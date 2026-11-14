# Domain Provider Feature — Namecheap

Standalone export of UpKlick domain registration / DNS / pricing (Namecheap provider).

## Provider & core libs

| Path | Role |
|---|---|
| `src/lib/domains/namecheap.js` | Namecheap API client (check, create, renew, DNS, NS) |
| `src/lib/domains/xml.js` | XML response parsing helpers |
| `src/lib/domains/pricing.js` | Pricing fetch/markup |
| `src/lib/domains/fulfillOrder.js` | Order fulfillment after payment |
| `src/lib/domains/constants.js` | Order types/statuses |
| `src/lib/domains/client.js` | Frontend authenticated fetch helper |

## User APIs (`/api/domains`)

- `route.js` — list / owned domains
- `check` — availability check
- `pricing` — public pricing
- `checkout` / `orders` / `contact`
- `[id]` — domain details
- `[id]/dns` — DNS hosts
- `[id]/nameservers` — custom NS
- `[id]/renew` / `[id]/autorenew`

## Admin APIs (`/api/admin/domains`)

- list domains, logs, orders, retry order, pricing config

## Related verify routes

- `src/app/api/sites/verify-domain/route.js` — site custom domain verify
- `src/app/api/email/verify-domain/route.js` — email domain verify (uses Namecheap DNS helpers)

## UI

| Path | Role |
|---|---|
| `src/components/Views/DomainsView.js` | Customer domains dashboard |
| `src/components/sites/DomainSettings.js` | Site domain settings |
| `src/app/admin/DomainsPage.js` | Admin domains management |

## Env vars

```env
NAMECHEAP_API_USER=...
NAMECHEAP_API_KEY=...
NAMECHEAP_USERNAME=...          # optional, defaults to API_USER
NAMECHEAP_CLIENT_IP=...         # must be whitelisted in Namecheap
NAMECHEAP_ENVIRONMENT=sandbox   # or production / prod
```

- Sandbox: `https://api.sandbox.namecheap.com/xml.response`
- Production: `https://api.namecheap.com/xml.response`

## Notes

- Imports use `@/lib/domains/...` and Firebase auth helpers — adapt aliases/auth in the new project.
- Checkout/orders may depend on Stripe / payment helpers outside this pack.
- No extra npm packages required for Namecheap XML API beyond Node `fetch`.
