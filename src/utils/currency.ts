export const SUPPORTED_CURRENCIES = [
  { code: 'USD', flag: 'us', symbol: '$', name: 'US Dollar', ar: 'US Dollar', rate: 1 },
  { code: 'EUR', flag: 'eu', symbol: '€', name: 'Euro', ar: 'Euro', rate: 0.897 },
  { code: 'EGP', flag: 'eg', symbol: 'EGP', name: 'Egyptian Pound', ar: 'Egyptian Pound', rate: 54.03 },
  { code: 'GBP', flag: 'gb', symbol: '£', name: 'British Pound', ar: 'British Pound', rate: 0.748 },
  { code: 'AED', flag: 'ae', symbol: 'AED', name: 'UAE Dirham', ar: 'UAE Dirham', rate: 3.6725 },
  { code: 'SAR', flag: 'sa', symbol: 'SAR', name: 'Saudi Riyal', ar: 'Saudi Riyal', rate: 3.75 },
  { code: 'KWD', flag: 'kw', symbol: 'KWD', name: 'Kuwaiti Dinar', ar: 'Kuwaiti Dinar', rate: 0.31, decimals: 3 },
  { code: 'QAR', flag: 'qa', symbol: 'QAR', name: 'Qatari Riyal', ar: 'Qatari Riyal', rate: 3.64 },
  { code: 'BHD', flag: 'bh', symbol: 'BHD', name: 'Bahraini Dinar', ar: 'Bahraini Dinar', rate: 0.376, decimals: 3 },
  { code: 'OMR', flag: 'om', symbol: 'OMR', name: 'Omani Rial', ar: 'Omani Rial', rate: 0.3845, decimals: 3 },
  { code: 'JOD', flag: 'jo', symbol: 'JOD', name: 'Jordanian Dinar', ar: 'Jordanian Dinar', rate: 0.709, decimals: 3 },
  { code: 'LBP', flag: 'lb', symbol: 'LBP', name: 'Lebanese Pound', ar: 'Lebanese Pound', rate: 89500 },
  { code: 'MAD', flag: 'ma', symbol: 'MAD', name: 'Moroccan Dirham', ar: 'Moroccan Dirham', rate: 9.76 },
  { code: 'TND', flag: 'tn', symbol: 'TND', name: 'Tunisian Dinar', ar: 'Tunisian Dinar', rate: 2.988, decimals: 3 },
  { code: 'DZD', flag: 'dz', symbol: 'DZD', name: 'Algerian Dinar', ar: 'Algerian Dinar', rate: 136.35 },
  { code: 'IQD', flag: 'iq', symbol: 'IQD', name: 'Iraqi Dinar', ar: 'Iraqi Dinar', rate: 1518.72, decimals: 3 },
] as const;

export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number]['code'];
export type ExchangeRates = Readonly<Record<string, number>>;

/** Normalize any Arabic-Indic or Eastern Arabic digits/separators to Western 0-9. */
export function toWesternDigits(text: string): string {
  return text
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, '.')
    .replace(/٬/g, ',');
}

// USD anchors from 2026-11-09 for first launch without a network connection.
export const fallbackRates: ExchangeRates = Object.fromEntries(SUPPORTED_CURRENCIES.map(item => [item.code, item.rate]));

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && Object.hasOwn(fallbackRates, value);
}

export function currencyOptions(_language?: string) {
  return SUPPORTED_CURRENCIES.map(item => ({
    value: item.code,
    label: item.symbol === item.code ? `${item.code} (${item.name})` : `${item.symbol} · ${item.code} (${item.name})`,
  }));
}

export function convertCurrency(amount: number, source: string, target: string, rates: ExchangeRates) {
  const sourceRate = rates[source];
  const targetRate = rates[target];
  return source === target ? amount : sourceRate > 0 && targetRate > 0 ? amount / sourceRate * targetRate : null;
}

const formatters = new Map<string, Intl.NumberFormat>();
const STANDARD_LOCALE = 'en-US';

export function formatCurrencyAmount(amount: number, currency: string, _locale = STANDARD_LOCALE, extraPrecision = 0) {
  if (!Number.isFinite(amount)) return '—';
  const normalizedCurrency = String(currency || '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
    return toWesternDigits(new Intl.NumberFormat(STANDARD_LOCALE).format(amount));
  }
  const item = SUPPORTED_CURRENCIES.find(item => item.code === normalizedCurrency);
  const decimals = item && 'decimals' in item ? item.decimals : item ? 2 : undefined;
  const key = `${STANDARD_LOCALE}:${normalizedCurrency}:${extraPrecision}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(STANDARD_LOCALE, {
      style: 'currency',
      currency: normalizedCurrency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: extraPrecision ? Math.max(decimals ?? 0, extraPrecision) : decimals,
    });
    formatters.set(key, formatter);
  }
  return toWesternDigits(formatter.format(amount).replace(/\u00A0/g, ' '));
}
