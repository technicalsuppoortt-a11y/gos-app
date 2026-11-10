import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { isDemoAccount } from '../backend/demoContext';
import { storageGet, storageSet } from '../utils/browserStorage';
import { convertCurrency, fallbackRates, formatCurrencyAmount, type CurrencyCode, type ExchangeRates } from '../utils/currency';

const RATE_KEY = 'gos-usd-exchange-rates-v1';
const HOUR = 60 * 60 * 1000;
type RateCache = { rates: ExchangeRates; refreshAt: number };

function parseRates(value: unknown): ExchangeRates | null {
  if (!value || typeof value !== 'object') return null;
  const rates = Object.fromEntries(Object.entries(value).filter(([code, rate]) =>
    /^[A-Z]{3}$/.test(code) && typeof rate === 'number' && Number.isFinite(rate) && rate > 0));
  return rates.USD === 1 && Object.keys(fallbackRates).every(code => rates[code] > 0) ? rates : null;
}

function readRates(): RateCache {
  try {
    const cache = JSON.parse(storageGet(RATE_KEY) ?? 'null');
    const rates = parseRates(cache?.rates);
    if (rates && Number.isFinite(cache.refreshAt)) return { rates, refreshAt: cache.refreshAt };
  } catch { /* Use the bundled rates if the cache cannot be read. */ }
  return { rates: fallbackRates, refreshAt: 0 };
}

function useExchangeRates(enabled: boolean) {
  const [rates, setRates] = useState(() => readRates().rates);
  useEffect(() => {
    if (!enabled || isDemoAccount) return;
    let active = true;
    let timer: number | undefined;
    let request: AbortController | undefined;
    const schedule = (delay: number) => { timer = window.setTimeout(refresh, delay); };
    async function refresh() {
      const cached = readRates();
      if (cached.refreshAt > Date.now()) {
        setRates(cached.rates);
        schedule(cached.refreshAt - Date.now());
        return;
      }
      request = new AbortController();
      const timeout = window.setTimeout(() => request?.abort(), 10000);
      let refreshAt = Date.now() + HOUR;
      try {
        const response = await fetch('https://open.er-api.com/v6/latest/USD', { signal: request.signal, credentials: 'omit' });
        if (!response.ok) throw new Error('Exchange rates unavailable');
        const result = await response.json();
        const rates = result.result === 'success' && result.base_code === 'USD' ? parseRates(result.rates) : null;
        if (rates && active) {
          const next = Number(result.time_next_update_unix) * 1000;
          if (Number.isFinite(next)) refreshAt = Math.max(refreshAt, next);
          storageSet(RATE_KEY, JSON.stringify({ rates, refreshAt }));
          setRates(rates);
        }
      } catch { /* Keep the previous rate table and retry on schedule or reconnect. */ }
      finally {
        window.clearTimeout(timeout);
        request = undefined;
        if (active) schedule(refreshAt - Date.now());
      }
    }
    const reconnect = () => {
      if (request) return;
      window.clearTimeout(timer);
      void refresh();
    };
    void refresh();
    window.addEventListener('online', reconnect);
    return () => {
      active = false;
      window.clearTimeout(timer);
      request?.abort();
      window.removeEventListener('online', reconnect);
    };
  }, [enabled]);
  return rates;
}

function currencyHelpers(currency: CurrencyCode, locale: string, rates: ExchangeRates, enabled: boolean) {
  const convert = (amount: number, source: string) => enabled ? convertCurrency(amount, source, currency, rates) : null;
  const compact = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 });
  const formatOriginal = (amount: number, source = 'USD', extraPrecision = 0) =>
    formatCurrencyAmount(amount, source, locale, extraPrecision);
  const formatPrice = (amount: number, source = 'USD', extraPrecision = 0) => {
    const converted = convert(amount, source);
    return converted === null ? formatOriginal(amount, source, extraPrecision) : formatOriginal(converted, currency, extraPrecision);
  };
  return {
    currency,
    convertPrice: (amountInUSD: number) => amountInUSD * rates[currency],
    convertAmount: (amount: number, source = 'USD', target: string = currency) =>
      convertCurrency(amount, source, target, rates) ?? amount,
    formatPrice,
    formatCompactPrice: (amount: number, source = 'USD') => compact.format(convert(amount, source) ?? amount),
    formatCheckoutPrice: (amount: number, source = 'USD') => {
      const original = formatOriginal(amount, source);
      const display = formatPrice(amount, source);
      return display === original ? original : `≈ ${display} (${original})`;
    },
  };
}

const CurrencyContext = createContext(currencyHelpers('USD', 'en-US', fallbackRates, false));
export const useCurrency = () => useContext(CurrencyContext);

export function CurrencyProvider({ currency, language: _language, enabled, children }: {
  currency: CurrencyCode; language: string; enabled: boolean; children: ReactNode;
}) {
  const rates = useExchangeRates(enabled);
  const locale = 'en-US';
  const value = useMemo(() => currencyHelpers(currency, locale, rates, enabled), [currency, locale, rates, enabled]);
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}
