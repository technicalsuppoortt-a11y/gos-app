# Builder storage and Firebase Hosting

The red browser-storage warning was a catch-all around Firestore writes. Column
trees contain arrays directly within arrays, which the Firebase client serializer
rejects. These trees now cross the Firestore boundary through a reversible codec;
the editor's document structure and existing layout classes remain unchanged.

`browserStorage` and `sessionStorageFallback` mirror values in memory when browser
storage access, writes or removals are blocked. Failed writes and removals cannot
resurrect stale persisted values. The fallback survives SPA navigation within the
current page lifetime. Memory cannot survive a full reload or browser shutdown;
workspace durability comes from confirmed Firestore saves, independently of browser
storage availability. Backend failures remain visible and retain dirty drafts.

Asset/domain mutations commit atomically. Saves are serialized and pending edits
overlay older listener snapshots. Unrelated remote changes still arrive while a
save is pending. A failed write is retried with the next save, including previously
unconfirmed changes. Navigation and manual save await pending writes. Publishing
captures a stored document under a server lease; newer edits remain drafts.

## Deployment

1. Keep `APP_ORIGIN` pointed at the dashboard's HTTPS Hosting origin, currently
   `https://gos-app-3c7fb.web.app`. The publisher loads its built `published.html`
   entry and runtime manifest, then copies the runtime and relative media files
   into each dedicated site's immutable release. Later dashboard builds cannot
   remove files required by an already-published customer page.
2. `HOSTING_PROJECT_ID` defaults to `gos-app-3c7fb`. Enable the Firebase Hosting API
   and grant the functions runtime service account
   `gos-app-3c7fb@appspot.gserviceaccount.com` the Firebase Hosting Admin role on
   that project. No Google access tokens are sent to the browser.
3. Run `npm run build`, then deploy functions, Firestore rules and Hosting together:

   ```powershell
   firebase deploy --project gos-app-3c7fb --only functions,firestore:rules,hosting
   ```

   The new callables are `publishAsset`, `hostingDomain` and `deleteWorkspaceAsset`.
   Deploy `published.html` and `hosting-manifest.json` with the dashboard.
   This change has not been deployed by the coding task.
4. Publish a test funnel and website. Each asset gets a deterministic, dedicated
   Hosting site in the existing project. The dashboard's primary Hosting site is
   never overwritten. A release is created only after all required files upload
   and the version is finalized. The root aliases the first flow page if no page
   uses `/`; each configured page also has its own direct URL and reloadable file.
5. Connect a test domain through the existing dialog. Copy the actual records
   returned by Firebase into the DNS provider, including ownership/TXT records
   where requested. Use **Check DNS & SSL** again while propagation is pending.
   A domain is Connected only when host and ownership are active and Firebase
   reports a certificate that provides SSL coverage. No arbitrary waiting period
   or successful CNAME lookup alone marks a domain connected.
6. Verify root/deep links, next-step navigation, a subsequent draft edit and publish,
   and deletion. Deletion removes the dedicated live site before the workspace
   record and detaches domain records. Existing domains with no provider binding
   must be connected through the dialog to obtain verified status.

Provider quotas and IAM failures are reported without marking publication
successful. Connected domains can be reassigned within a workspace; Firebase
must verify the new site's ownership and certificate before that mapping is live.
Forms do not manufacture successful submissions: live capture, booking and
checkout require a configured destination/service. Unconfigured form submission
is intercepted on published pages; existing editor preview behavior is preserved.

The integration follows the official [Hosting release API](https://firebase.google.com/docs/hosting/api-deploy)
and [custom-domain status API](https://firebase.google.com/docs/reference/hosting/rest/v1beta1/projects.sites.customDomains).

## Verification

```powershell
npm run test:storage
npm test --prefix functions
npm run test:gos-api
npm run test:builder-storage
npm run build
npm run test:published-hosting
```

Browser tests require `playwright-core` and Edge, or `PLAYWRIGHT_MODULE` and
`FUNNEL_BROWSER_PATH` overrides. Builder tests exercise real components and the
Firebase serializer with throwing storage getters and quota errors, and compare
header/canvas bounds before and after saves. The public-page test intercepts the
Hosting origins locally and exercises built assets, root/deep links and reloads.
Provider unit tests use mock responses; they do not create production sites or
alter real DNS. The real-world domain/certificate checks in steps 4–6 still need
an authenticated deployed workspace and control of the domain's DNS.

On this Windows machine the parallel native bundler exhausted available memory.
The final TypeScript check and production bundle passed with this equivalent
low-memory invocation after generating the theme/brand styles:

```powershell
node node_modules/typescript/bin/tsc -b
$env:RAYON_NUM_THREADS='1'
node --max-old-space-size=1536 node_modules/vite/bin/vite.js build
```

`tests/firebase-rules-emulator.test.mjs` also covers server-owned domain status,
binding protection and managed asset deletion. Run it through Auth/Firestore
emulators using project `demo-gos-user-dashboard`. The current environment lacks
the emulator CLI/Java runtime, so this emulator test was not run here.
