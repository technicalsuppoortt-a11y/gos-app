import type { ComboOption } from '../../components/ui/Combobox';

// ISO 3166-1 country codes; display names come from the browser's localized CLDR data.
const regionCodes = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');

export function countryOptions(language: string): ComboOption[] {
  const names = new Intl.DisplayNames([language], { type: 'region' });
  const english = new Intl.DisplayNames(['en'], { type: 'region' });
  return regionCodes.map(code => {
    const regionName = names.of(code) || code;
    const engName = english.of(code) || code;
    return {
      value: engName,
      label: regionName,
      badge: code,
      search: `${code} ${engName} ${regionName}`,
    };
  }).sort((a, b) => a.label.localeCompare(b.label, language));
}

export function currencyOptions(language: string): ComboOption[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (type: string) => string[] };
  const names = new Intl.DisplayNames([language], { type: 'currency' });
  return (intl.supportedValuesOf?.('currency') || ['AED', 'EGP', 'EUR', 'GBP', 'SAR', 'USD']).map(code => {
    const symbol = code === 'EGP' ? 'E£' : new Intl.NumberFormat('en', { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' }).formatToParts(0).find(p => p.type === 'currency')?.value || code;
    const name = names.of(code) || code;
    return {
      value: code,
      badge: code,
      label: `${name} (${symbol})`,
      search: `${code} ${name} ${symbol}`,
    };
  });
}

export function timezoneOptions(): ComboOption[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (type: string) => string[] };
  return [...new Set(['UTC', ...intl.supportedValuesOf?.('timeZone') || ['Africa/Cairo', 'Asia/Riyadh', 'Europe/London', 'America/New_York']])].map(zone => ({
    value: zone,
    label: zone.replaceAll('_', ' '),
    search: zone.replaceAll('_', ' '),
  }));
}

export const countryDefaults: Record<string, { timezone: string; currency: string }> = {
  Egypt: { timezone: 'Africa/Cairo', currency: 'EGP' },
  'Saudi Arabia': { timezone: 'Asia/Riyadh', currency: 'SAR' },
  'United Arab Emirates': { timezone: 'Asia/Dubai', currency: 'AED' },
  'United States': { timezone: 'America/New_York', currency: 'USD' },
  'United Kingdom': { timezone: 'Europe/London', currency: 'GBP' },
  India: { timezone: 'Asia/Kolkata', currency: 'INR' },
  Germany: { timezone: 'Europe/Berlin', currency: 'EUR' },
  France: { timezone: 'Europe/Paris', currency: 'EUR' },
  Canada: { timezone: 'America/Toronto', currency: 'CAD' },
  Australia: { timezone: 'Australia/Sydney', currency: 'AUD' },
  Japan: { timezone: 'Asia/Tokyo', currency: 'JPY' },
  Jordan: { timezone: 'Asia/Amman', currency: 'JOD' },
  Qatar: { timezone: 'Asia/Qatar', currency: 'QAR' },
  Kuwait: { timezone: 'Asia/Kuwait', currency: 'KWD' },
  Bahrain: { timezone: 'Asia/Bahrain', currency: 'BHD' },
  Oman: { timezone: 'Asia/Muscat', currency: 'OMR' },
  Morocco: { timezone: 'Africa/Casablanca', currency: 'MAD' },
  Tunisia: { timezone: 'Africa/Tunis', currency: 'TND' },
  Algeria: { timezone: 'Africa/Algiers', currency: 'DZD' },
  'South Africa': { timezone: 'Africa/Johannesburg', currency: 'ZAR' },
  Brazil: { timezone: 'America/Sao_Paulo', currency: 'BRL' },
  China: { timezone: 'Asia/Shanghai', currency: 'CNY' },
  Turkey: { timezone: 'Europe/Istanbul', currency: 'TRY' },
  Switzerland: { timezone: 'Europe/Zurich', currency: 'CHF' },
  'New Zealand': { timezone: 'Pacific/Auckland', currency: 'NZD' },
};
