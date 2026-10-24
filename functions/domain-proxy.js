import { normalizeHost, isPlatformHostname } from './domain-verification.js';

export function pickPublishedStep(site, path = '/') {
  const steps = site?.steps || site?.pages || [];
  if (!steps.length) return null;
  const rawWanted = String(path || '').trim() || '/';
  const cleanWanted = rawWanted.toLowerCase().replace(/^\//, '');

  if (cleanWanted) {
    // 1. Exact match on path
    let match = steps.find(s => s.path && s.path.toLowerCase().replace(/^\//, '') === cleanWanted);
    if (match) return match;

    // 2. Match slug or name or id
    match = steps.find(s => {
      const sSlug = String(s.slug || s.path || '').toLowerCase().replace(/^\//, '');
      const sName = String(s.name || s.title || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const sId = String(s.id || '').trim().toLowerCase();
      return sSlug === cleanWanted || sName === cleanWanted || sId === cleanWanted;
    });
    if (match) return match;
  }

  // Fallback to root step or first published step
  return steps.find(s => s.path === '/' || s.published) || steps[0] || null;
}

export async function handleDomainProxy(req, res, { db, appOrigin = 'https://gos-app-3c7fb.web.app' }) {
  const hostHeader = req.headers['x-forwarded-host'] || req.headers.host || '';
  const host = normalizeHost(hostHeader);

  // Platform root hostnames and localhost bypass custom domain mapping
  if (isPlatformHostname(host)) {
    if (req.path === '/health') return res.status(200).send('OK');
    return res.status(200).json({ platformHost: true, host, bypassed: true });
  }

  try {
    // 1. Look up custom domain in site_domains
    let domainDoc = await db.collection('site_domains').doc(host).get();
    if (!domainDoc.exists && host.startsWith('www.')) {
      domainDoc = await db.collection('site_domains').doc(host.replace(/^www\./, '')).get();
    } else if (!domainDoc.exists && !host.startsWith('www.')) {
      domainDoc = await db.collection('site_domains').doc(`www.${host}`).get();
    }

    if (!domainDoc.exists) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Domain Not Connected</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
              .box { text-align: center; max-width: 480px; padding: 32px; background: #1e293b; border-radius: 16px; border: 1px solid #334155; }
              h1 { font-size: 24px; margin-bottom: 8px; color: #f8fafc; }
              p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
              .badge { display: inline-block; padding: 4px 12px; background: rgba(56,189,248,0.1); color: #38bdf8; border-radius: 999px; font-weight: 700; font-size: 12px; margin-bottom: 16px; }
            </style>
          </head>
          <body>
            <div class="box">
              <div class="badge">${host}</div>
              <h1>Domain Not Configured</h1>
              <p>This domain is pointed to our servers but has not been connected to an active site in the dashboard. If this is your domain, log in to your dashboard to complete connection.</p>
            </div>
          </body>
        </html>
      `);
    }

    const domainData = domainDoc.data();
    const funnelId = domainData.funnelId;
    if (!funnelId) {
      return res.status(404).send('Domain found but no site or funnel is assigned.');
    }

    // 2. Fetch published website content
    let siteDoc = await db.collection('published_sites').doc(funnelId).get();
    let site = siteDoc.exists ? siteDoc.data() : null;

    // Fallback: check tenant assets if published_sites doc not yet populated
    if (!site && domainData.tenantId) {
      const assetDoc = await db.collection('tenants').doc(domainData.tenantId).collection('assets').doc(funnelId).get();
      if (assetDoc.exists) {
        const rawAsset = assetDoc.data();
        site = {
          funnelId,
          name: rawAsset.name || 'Site',
          steps: rawAsset.document?.pages || [],
          domain: host
        };
      }
    }

    if (!site) {
      return res.status(404).send('Website content is not published yet.');
    }

    // 3. Match step/page against path
    const requestPath = req.path || '/';
    const step = pickPublishedStep(site, requestPath);

    // If client requested JSON (API / fetch check)
    if (req.headers.accept?.includes('application/json') || req.query.format === 'json') {
      return res.status(200).json({
        ok: true,
        host,
        funnelId,
        siteName: site.name,
        step: step ? { id: step.id, name: step.name, path: step.path } : null,
        status: domainData.status
      });
    }

    // 4. Server-Side Interception: Serve published HTML pre-injected with published data
    // The visitor stays on https://talk.com/path with full SSL and no URL alteration!
    const title = step?.name || site.name || 'Website';
    const description = step?.page?.metaDescription || site.settings?.seo || `${title} - Live Website`;

    const publicationPayload = {
      asset: {
        id: funnelId,
        name: site.name,
        domain: host,
        document: {
          pages: site.steps || site.pages || [],
          funnel: { name: site.name, status: 'Published', pagesFlow: (site.steps || site.pages || []).map(s => s.id) },
          steps: site.steps || site.pages || []
        },
        settings: site.settings || { seo: title, color: '#2563eb' }
      },
      pageId: step?.id || site.steps?.[0]?.id || '',
      host,
      path: requestPath
    };

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="https://${host}${requestPath === '/' ? '' : requestPath}" />
    <link rel="stylesheet" href="${appOrigin}/assets/index.css" />
  </head>
  <body>
    <div id="root"></div>
    <script id="gos-publication-data" type="application/json">${JSON.stringify(publicationPayload)}</script>
    <script type="module" src="${appOrigin}/src/published.tsx"></script>
  </body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
    res.setHeader('X-Custom-Domain', host);
    res.setHeader('X-Custom-Path', requestPath);
    return res.status(200).send(html);
  } catch (error) {
    console.error('[domain-proxy] Error routing custom domain:', error);
    return res.status(500).send('Internal Server Error while loading custom domain');
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
