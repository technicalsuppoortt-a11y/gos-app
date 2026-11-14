# Domain wiring snippets

## Provider usage

```js
import { NamecheapService, getNamecheapConfig } from '@/lib/domains/namecheap';

const cfg = getNamecheapConfig();
const result = await NamecheapService.checkDomains(['example.com']);
```

## Frontend client

```js
import { authFetch } from '@/lib/domains/client';

const data = await authFetch('/api/domains/check', {
  method: 'POST',
  body: { domains: ['example.com'] }
});
```

## Typical flow

1. `POST /api/domains/check` — availability
2. `GET /api/domains/pricing` — prices
3. `POST /api/domains/checkout` — pay
4. `fulfillOrder` → Namecheap `domains.create`
5. Manage via `/api/domains/[id]/dns` and `nameservers`
