export type CountryRegion = {
  id: "middle-east" | "africa" | "europe" | "asia" | "americas" | "oceania";
  label: string;
  labelAr: string;
  codes: readonly string[];
};

// ISO 3166-1 alpha-2 codes. Names are resolved in the UI through Intl.DisplayNames,
// while FlagCDN provides a consistent flag image for every code.
export const countryRegions: readonly CountryRegion[] = [
  {
    id: "middle-east",
    label: "Middle East",
    labelAr: "الشرق الأوسط",
    codes: ["AE", "BH", "CY", "IR", "IQ", "IL", "JO", "KW", "LB", "OM", "PS", "QA", "SA", "SY", "TR", "YE"],
  },
  {
    id: "africa",
    label: "Africa",
    labelAr: "أفريقيا",
    codes: ["DZ", "AO", "BJ", "BW", "BF", "BI", "CV", "CM", "CF", "TD", "KM", "CD", "CG", "CI", "DJ", "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW", "KE", "LS", "LR", "LY", "MG", "MW", "ML", "MR", "MU", "MA", "MZ", "NA", "NE", "NG", "RW", "ST", "SN", "SC", "SL", "SO", "ZA", "SS", "SD", "TZ", "TG", "TN", "UG", "ZM", "ZW"],
  },
  {
    id: "europe",
    label: "Europe",
    labelAr: "أوروبا",
    codes: ["AL", "AD", "AT", "BY", "BE", "BA", "BG", "HR", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IS", "IE", "IT", "LV", "LI", "LT", "LU", "MT", "MD", "MC", "ME", "NL", "MK", "NO", "PL", "PT", "RO", "RU", "SM", "RS", "SK", "SI", "ES", "SE", "CH", "UA", "GB", "VA"],
  },
  {
    id: "asia",
    label: "Asia",
    labelAr: "آسيا",
    codes: ["AF", "AM", "AZ", "BD", "BT", "BN", "KH", "CN", "GE", "IN", "ID", "JP", "KZ", "KP", "KR", "KG", "LA", "MY", "MV", "MN", "MM", "NP", "PK", "PH", "SG", "LK", "TW", "TJ", "TH", "TL", "TM", "UZ", "VN"],
  },
  {
    id: "americas",
    label: "Americas",
    labelAr: "الأمريكيتان",
    codes: ["AG", "AR", "BS", "BB", "BZ", "BO", "BR", "CA", "CL", "CO", "CR", "CU", "DM", "DO", "EC", "SV", "GD", "GT", "GY", "HT", "HN", "JM", "MX", "NI", "PA", "PY", "PE", "KN", "LC", "VC", "SR", "TT", "US", "UY", "VE"],
  },
  {
    id: "oceania",
    label: "Oceania",
    labelAr: "أوقيانوسيا",
    codes: ["AU", "FJ", "KI", "MH", "FM", "NR", "NZ", "PW", "PG", "WS", "SB", "TO", "TV", "VU"],
  },
];

export const presetCountryCodes = ["SA", "AE", "EG", "QA", "KW", "OM", "JO"] as const;
