import { NextResponse } from 'next/server';
import { verifyUserRequest } from '@/lib/auth/verifyUserRequest';
import { parseDomainInput, SUGGESTED_TLDS } from '@/lib/domains/constants';
import { NamecheapError, NamecheapService } from '@/lib/domains/namecheap';
import { customerPriceFor, getPricingMap, getSettings } from '@/lib/domains/pricing';
import { publicRegistrarError } from '@/lib/domains/xml';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const checkCache = new Map();
const CHECK_CACHE_TTL_MS = 45 * 1000; // 45 seconds cache for identical availability lookups

export async function GET(req) {
  try {
    const auth = await verifyUserRequest(req);
    if (!auth.ok) return auth.response;

    const domainParam = req.nextUrl.searchParams.get('domain') || '';
    const parsed = parseDomainInput(domainParam);
    if (!parsed) {
      return NextResponse.json({ error: 'Enter a domain like mycompany.com' }, { status: 400 });
    }

    const settings = await getSettings(auth.adminDb);
    const tlds = Array.from(new Set([parsed.tld, ...(settings.suggested_tlds || SUGGESTED_TLDS)]));
    const fqdns = tlds.map((tld) => `${parsed.sld}.${tld}`);

    if (!NamecheapService.isConfigured()) {
      return NextResponse.json({
        error: 'Domain search is not available yet. The registrar is not configured.',
        query: parsed.fqdn,
        results: []
      }, { status: 503 });
    }

    const cacheKey = fqdns.sort().join(',');
    const cached = checkCache.get(cacheKey);
    let checks;

    if (cached && (Date.now() - cached.timestamp < CHECK_CACHE_TTL_MS)) {
      checks = cached.data;
    } else {
      try {
        checks = await NamecheapService.checkDomainAvailability(fqdns);
        checkCache.set(cacheKey, { timestamp: Date.now(), data: checks });
      } catch (err) {
        const message = err instanceof NamecheapError
          ? (err.publicMessage || publicRegistrarError(err.errors || [{ message: err.message }]))
          : 'Could not check availability. Please try again.';
        console.error('[domains/check]', err);
        return NextResponse.json({ error: message, query: parsed.fqdn, results: [] }, { status: 502 });
      }
    }

    // Single fast in-memory batch lookup for all TLD pricing
    const pricingMap = await getPricingMap(auth.adminDb);

    const results = [];
    for (const check of checks) {
      const item = parseDomainInput(check.domain);
      if (!item) continue;
      const pricing = pricingMap.get(item.tld.toLowerCase());
      if (!pricing || pricing.enabled === false) {
        results.push({
          domain: check.domain,
          extension: item.tld,
          available: false,
          unsupported: true,
          status: 'unsupported'
        });
        continue;
      }
      const premium = check.isPremium ? check.premiumRegistrationPrice : 0;
      results.push({
        domain: check.domain,
        extension: item.tld,
        available: Boolean(check.available),
        isPremium: Boolean(check.isPremium),
        status: check.available ? 'available' : 'unavailable',
        registration_price: customerPriceFor(pricing, 'registration', premium),
        renewal_price: customerPriceFor(pricing, 'renewal', check.isPremium ? check.premiumRenewalPrice : 0),
        transfer_price: customerPriceFor(pricing, 'transfer', check.isPremium ? check.premiumTransferPrice : 0),
        currency: pricing.currency || 'USD'
      });
    }

    return NextResponse.json({
      query: parsed.fqdn,
      sld: parsed.sld,
      results
    });
  } catch (err) {
    console.error('[domains/check]', err);
    return NextResponse.json({ error: 'Could not check this domain' }, { status: 500 });
  }
}

