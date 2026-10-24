# Custom Domain Architecture & Integration Guide

This package contains the complete, production-ready implementation of **Custom Domain Routing, Verification, and Auto-Provisioning** for funnels and websites built with **Next.js** and **Firebase Firestore**.

---

## 📁 Package Contents

```
├── .env.example                               # Required environment variables
├── firestore.rules                            # Firestore security rules for domains & sites
├── README.md                                  # This guide
└── src/
    ├── proxy.js                               # Edge proxy / middleware for transparent domain rewriting
    ├── app/
    │   ├── api/sites/verify-domain/route.js   # DNS verification, Vercel & Firebase Auth provisioning API
    │   └── preview-site/page.js               # Receiving route that renders the custom domain website
    ├── components/sites/
    │   ├── DomainSettings.js                  # Complete React UI for domain management & DNS instructions
    │   └── LiveSiteView.js                    # Runtime resolver that maps Host -> Funnel -> Step
    └── lib/sites/
        └── publicSite.js                      # Core Firestore domain mapping helpers & URL generators
```

---

## ⚡ How It Works (Step-by-Step Architecture)

### 1. User Connects a Domain in the UI (`DomainSettings.js`)
* The user enters their custom domain (e.g. `offers.brand.com` or `brand.com`).
* The UI displays specific DNS records to add:
  * **Subdomain (e.g. `offers` or `www`):** CNAME record pointing to `cname.vercel-dns.com`.
  * **Apex/Root (`@`):** A-record pointing to `76.76.21.21`.
* Saving calls `connectFunnelDomain()` in `publicSite.js`.

### 2. Firestore Mapping (`publicSite.js`)
* Stores mapping in the `site_domains` collection:
  * Document ID: `offers.brand.com`
  * Fields: `{ host, funnelId, ownerUid, status: 'pending' | 'connected', updatedAt }`
  * Automatically maps both `domain.com` and `www.domain.com` to prevent collisions.

### 3. Server-side Verification & SSL Auto-Provisioning (`/api/sites/verify-domain`)
* Verifies real-time DNS using Node.js `dns.promises.resolveCname` and `dns.promises.resolve4`.
* Calls **Vercel API** to automatically attach the domain to your deployment project for free SSL generation.
* Calls **Google Identity Toolkit API** to whitelist the domain in Firebase Authentication `authorizedDomains`.
* Returns DNS status to the client and updates Firestore status to `connected`.

### 4. Edge Request Interception (`proxy.js`)
* Every incoming HTTP request passes through `proxy.js`.
* Checks if the `Host` header is a platform host (`upklick.net`, `localhost`, etc.).
* If it is a **Custom Domain**, it performs an internal Next.js rewrite:
  ```javascript
  url.pathname = '/preview-site';
  url.searchParams.set('host', host);
  url.searchParams.set('path', request.nextUrl.pathname || '/');
  return NextResponse.rewrite(url, { headers: requestHeaders });
  ```
  *The user's browser stays on `https://offers.brand.com` with full SSL.*

### 5. Runtime Resolution & Rendering (`LiveSiteView.js`)
* Reads `host` and `path`.
* Looks up `site_domains/{host}` to get the `funnelId`.
* Fetches the published website data from `published_sites/{funnelId}`.
* Matches the URL path to the corresponding step/page and renders the canvas!

---

## 🚀 How to Integrate into Another Project

1. Copy the files in `src/` to your Next.js project matching the folder structure.
2. Add the environment variables from `.env.example` to your `.env.local` and hosting provider.
3. Update `firestore.rules` to permit public reading of `site_domains` and `published_sites`.
4. Ensure your project has `lucide-react` and `firebase` installed.
5. In your funnel or site settings modal, import and render:
   ```jsx
   import DomainSettings from '@/components/sites/DomainSettings';

   <DomainSettings
     funnel={activeFunnel}
     ownerUid={currentUser.uid}
     isRtl={false}
     onSaveFunnel={(updates) => handleSaveFunnel(updates)}
     showToast={(msg) => notify(msg)}
   />
   ```
