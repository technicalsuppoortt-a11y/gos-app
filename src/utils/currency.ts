export const SUPPORTED_CURRENCIES = [
  { code: 'USD', flag: 'us', symbol: '$', name: 'US Dollar', ar: 'دولار أمريكي', rate: 1 },
  { code: 'EUR', flag: 'eu', symbol: '€', name: 'Euro', ar: 'يورو', rate: 0.897 },
  { code: 'EGP', flag: 'eg', symbol: 'E£', name: 'Egyptian Pound', ar: 'جنيه مصري', rate: 54.03 },
  { code: 'GBP', flag: 'gb', symbol: '£', name: 'British Pound', ar: 'جنيه إسترليني', rate: 0.748 },
  { code: 'AED', flag: 'ae', symbol: 'د.إ', name: 'UAE Dirham', ar: 'درهم إماراتي', rate: 3.6725 },
  { code: 'SAR', flag: 'sa', symbol: '﷼', name: 'Saudi Riyal', ar: 'ريال سعودي', rate: 3.75 },
  { code: 'KWD', flag: 'kw', symbol: 'د.ك', name: 'Kuwaiti Dinar', ar: 'دينار كويتي', rate: 0.31, decimals: 3 },
  { code: 'QAR', flag: 'qa', symbol: 'ر.ق', name: 'Qatari Riyal', ar: 'ريال قطري', rate: 3.64 },
  { code: 'BHD', flag: 'bh', symbol: 'د.ب', name: 'Bahraini Dinar', ar: 'دينار بحريني', rate: 0.376, decimals: 3 },
  { code: 'OMR', flag: 'om', symbol: 'ر.ع', name: 'Omani Rial', ar: 'ريال عماني', rate: 0.3845, decimals: 3 },
  { code: 'JOD', flag: 'jo', symbol: 'د.أ', name: 'Jordanian Dinar', ar: 'دينار أردني', rate: 0.709, decimals: 3 },
  { code: 'LBP', flag: 'lb', symbol: 'ل.ل', name: 'Lebanese Pound', ar: 'ليرة لبنانية', rate: 89500 },
  { code: 'MAD', flag: 'ma', symbol: 'د.م', name: 'Moroccan Dirham', ar: 'درهم مغربي', rate: 9.76 },
  { code: 'TND', flag: 'tn', symbol: 'د.ت', name: 'Tunisian Dinar', ar: 'دينار تونسي', rate: 2.988, decimals: 3 },
  { code: 'DZD', flag: 'dz', symbol: 'د.ج', name: 'Algerian Dinar', ar: 'دينار جزائري', rate: 136.35 },
  { code: 'IQD', flag: 'iq', symbol: 'د.ع', name: 'Iraqi Dinar', ar: 'دينار عراقي', rate: 1518.72, decimals: 3 },
] as const;

export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number]['code'];
export type ExchangeRates = Readonly<Record<string, number>>;

// USD anchors from 2026-11-09 for first launch without a network connection.
export const fallbackRates: ExchangeRates = Object.fromEntries(SUPPORTED_CURRENCIES.map(item => [item.code, item.rate]));

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && Object.hasOwn(fallbackRates, value);
}

export function currencyOptions(language: string) {
  return SUPPORTED_CURRENCIES.map(item => ({
    value: item.code,
    label: `${item.symbol} · ${item.code} (${language === 'ar' ? item.ar : item.name})`,
  }));
}

export function convertCurrency(amount: number, source: string, target: string, rates: ExchangeRates) {
  const sourceRate = rates[source];
  const targetRate = rates[target];
  return source === target ? amount : sourceRate > 0 && targetRate > 0 ? amount / sourceRate * targetRate : null;
}

const formatters = new Map<string, Intl.NumberFormat>();

export function formatCurrencyAmount(amount: number, currency: string, locale: string, extraPrecision = 0) {
  if (!Number.isFinite(amount)) return '—';
  if (!/^[A-Z]{3}$/.test(currency)) return new Intl.NumberFormat(locale).format(amount);
  const item = SUPPORTED_CURRENCIES.find(item => item.code === currency);
  const decimals = item && 'decimals' in item ? item.decimals : item ? 2 : undefined;
  const key = `${locale}:${currency}:${extraPrecision}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: 'currency', currency, minimumFractionDigits: decimals,
      maximumFractionDigits: extraPrecision ? Math.max(decimals ?? 0, extraPrecision) : decimals,
    });
    formatters.set(key, formatter);
  }
  return formatter.format(amount);
}
