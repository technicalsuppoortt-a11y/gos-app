import fontCatalog from "@/modules/brand-engine/configuration/brandFontCatalog.json" with { type: "json" };

export type ArabicBrandFont = keyof typeof fontCatalog.arabic;
export type BrandFont = keyof typeof fontCatalog.latin | ArabicBrandFont;
export const defaultBrandFont: BrandFont & ArabicBrandFont = "IBM Plex Sans Arabic";
export const arabicBrandFonts = Object.keys(fontCatalog.arabic) as ArabicBrandFont[];
export const brandFonts = [...Object.keys(fontCatalog.latin), ...arabicBrandFonts] as BrandFont[];

export function isBrandFont(font: unknown): font is BrandFont {
  return typeof font === "string" && brandFonts.includes(font as BrandFont);
}

export function isArabicBrandFont(font: unknown): font is ArabicBrandFont {
  return typeof font === "string" && arabicBrandFonts.includes(font as ArabicBrandFont);
}

/** Request only supported weights; one invalid weight can reject the entire stylesheet. */
export function brandFontStylesheet(fonts: readonly string[], requestedWeights?: readonly number[]) {
  const weights = { ...fontCatalog.latin, ...fontCatalog.arabic };
  const families = [...new Set(fonts)].filter(isBrandFont).map((font) => {
    const selected = requestedWeights
      ? weights[font].filter(weight => requestedWeights.includes(weight))
      : weights[font];
    const supported = selected.length ? selected : weights[font];
    return `family=${encodeURIComponent(font).replaceAll("%20", "+")}:wght@${supported.join(";")}`;
  });
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}
