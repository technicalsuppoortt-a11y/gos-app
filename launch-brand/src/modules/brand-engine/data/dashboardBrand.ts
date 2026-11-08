import type { BrandState } from "@/modules/brand-engine/store/brandSlice";
import { brandPaletteColors } from "./brandPages.ts";
import { resolveBrandTheme } from "./brandTheme.ts";
import { isBrandFont } from "./brandFonts.ts";

export const dashboardLayoutVersion = "copilot-v1";

export function readableForeground(hex: string) {
  const rgb = hex
    .replace("#", "")
    .match(/.{2}/g)
    ?.map((value) => {
      const channel = Number.parseInt(value, 16) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    }) ?? [0, 0, 0];
  const luminance = (rgb[0] ?? 0) * 0.2126 + (rgb[1] ?? 0) * 0.7152 + (rgb[2] ?? 0) * 0.0722;
  return luminance > 0.179 ? "#11152d" : "#ffffff";
}

export function dashboardBrand(state: BrandState) {
  const theme = resolveBrandTheme(state);
  const colors = theme[state.theme === "dark" ? "dark" : "light"];
  const primary = state.brandTheme ? colors.primary : brandPaletteColors[state.brandPalette] ?? "#6835cf";
  const selectedFont = state.brandTheme ? theme.typography.body : state.fontPersonality.split(" + ")[0]?.trim() ?? "IBM Plex Sans Arabic";
  const font = isBrandFont(selectedFont)
    ? selectedFont
    : "IBM Plex Sans Arabic";
  return {
    name: state.brandName.trim() || state.selectedBrandIdentity.name,
    tagline: state.tagline.trim(),
    primary,
    buttonBackground: state.brandTheme ? colors.buttonBackground : primary,
    onPrimary: state.brandTheme ? colors.onPrimary : readableForeground(primary),
    // Light brand colors need a darker related color for text and focus indicators.
    textAccent:
      readableForeground(primary) === "#ffffff"
        ? primary
        : `color-mix(in srgb, ${primary} 55%, #11152d)`,
    font: `"${font}", "IBM Plex Sans Arabic", sans-serif`,
    identity: {
      ...state.selectedBrandIdentity,
      name: state.brandName.trim() || state.selectedBrandIdentity.name,
      palette: state.brandPalette,
      typography: state.fontPersonality,
      tagline: state.tagline,
    },
    context: {
      name: state.brandName,
      tagline: state.tagline,
      business: state.business,
      subNiche: state.subNiche,
      description: state.brandDescription || state.businessDescription,
      audience: state.targetAudience,
      keywords: state.brandKeywords,
      voice: state.brandVoices,
      language: state.brandLanguage,
    },
    theme,
  };
}

export function conversationDateGroup(timestamp: number, now = Date.now()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const yesterday = new Date(start);
  yesterday.setDate(yesterday.getDate() - 1);
  const week = new Date(start);
  week.setDate(week.getDate() - ((week.getDay() + 6) % 7));
  const lastWeek = new Date(week);
  lastWeek.setDate(lastWeek.getDate() - 7);
  if (timestamp >= start.getTime()) return "today";
  if (timestamp >= yesterday.getTime()) return "yesterday";
  if (timestamp >= week.getTime()) return "week";
  if (timestamp >= lastWeek.getTime()) return "lastWeek";
  return "older";
}
