import { brandFonts, defaultBrandFont, isArabicBrandFont, type BrandFont, type ArabicBrandFont } from "./brandFonts.ts";
export { brandFonts, arabicBrandFonts } from "./brandFonts.ts";
export type { BrandFont, ArabicBrandFont } from "./brandFonts.ts";

/** Versioned visual identity. Legacy page envelopes remain compatible. */
export type BrandElement = "name" | "tagline" | "colors" | "typography" | "logo";
export type BrandCoreColors = Pick<BrandColors, "primary" | "secondary" | "buttonBackground">;
export type BrandElementAnswers = { preference: string; detail: string; interest?: string; nameLength?: "one" | "two" };
export type BrandElementCandidate = {
  qualityStatus?: 'approved' | 'pending' | 'rejected';
  id: string;
  rationale: string;
  name?: string;
  arabicName?: string;
  tagline?: string;
  coreColors?: BrandCoreColors;
  typography?: BrandTheme["typography"];
  mark?: BrandCandidate["mark"];
  logo?: BrandCandidate["logo"];
};
export type BrandElementGeneration = {
  answers: BrandElementAnswers;
  suggestions: BrandElementCandidate[];
  batches?: {
    answers: BrandElementAnswers;
    suggestionIds: string[];
    inputFingerprint: string;
    promptVersion: string;
    generatedAt: number;
  }[];
  inputFingerprint: string;
  promptVersion: string;
};
export type BrandDirectionParts = { name: boolean; colors: boolean; typography: boolean; logo: boolean };
export type BrandColors = {
  primary: string;
  buttonBackground: string;
  onPrimary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  mutedText: string;
  border: string;
  footerBackground: string;
  headerBackground: string;
  success: string;
  warning: string;
  error: string;
  focus: string;
};
export type BrandTheme = {
  version: 1;
  paletteId: string;
  light: BrandColors;
  dark: BrandColors;
  typography: { heading: BrandFont; body: BrandFont; arabic: ArabicBrandFont };
  buttons: { variant: "solid" | "outline"; shape: "square" | "rounded" | "pill" };
  appearance: { radius: number; shadow: "none" | "soft"; density: "comfortable" | "compact" };
};
export type BrandLocks = {
  name: boolean;
  tagline: boolean;
  colors: boolean;
  typography: boolean;
  logo: boolean;
};
export type BrandCandidate = {
  id: string;
  name: string;
  arabicName: string;
  tagline: string;
  rationale: string;
  description?: string;
  logo?: import("./types").BrandVectorLogo;
  imageDirection: string;
  mark: "prism" | "flow" | "serif" | "nodes" | "bilingual" | "burst";
  theme: BrandTheme;
};
export const defaultBrandLocks: BrandLocks = {
  name: false,
  tagline: true,
  colors: false,
  typography: true,
  logo: true,
};
export const brandPalettes = [
  {
    id: "evergreen",
    name: "Emerald",
    nameAr: "زمردي",
    primary: "#00C19A",
    secondary: "#0F172A",
    background: "#F0FDF4",
  },
  {
    id: "midnight",
    name: "Navy",
    nameAr: "كحلي",
    primary: "#071B38",
    secondary: "#0F766E",
    background: "#F8FAFC",
  },
  {
    id: "purple",
    name: "Violet",
    nameAr: "بنفسجي",
    primary: "#6835CF",
    secondary: "#0F172A",
    background: "#FAF5FF",
  },
  {
    id: "noir",
    name: "Graphite",
    nameAr: "جرافيت",
    primary: "#111111",
    secondary: "#475569",
    background: "#F8FAFC",
  },
  {
    id: "blanc",
    name: "Pearl",
    nameAr: "لؤلؤي",
    primary: "#F7F7F7",
    secondary: "#334155",
    background: "#FFFFFF",
  },
  {
    id: "sunset",
    name: "Sunset",
    nameAr: "غروب",
    primary: "#ED7544",
    secondary: "#292524",
    background: "#FFF7ED",
  },
  {
    id: "electric",
    name: "Electric",
    nameAr: "فيروزي",
    primary: "#009CB1",
    secondary: "#164E63",
    background: "#ECFEFF",
  },
  {
    id: "ocean",
    name: "Ocean",
    nameAr: "محيطي",
    primary: "#1D4ED8",
    secondary: "#0F766E",
    background: "#F8FAFC",
  },
  {
    id: "indigo",
    name: "Indigo",
    nameAr: "نيلي",
    primary: "#4338CA",
    secondary: "#0891B2",
    background: "#EEF2FF",
  },
  {
    id: "teal",
    name: "Teal",
    nameAr: "بترولي",
    primary: "#0F766E",
    secondary: "#1E293B",
    background: "#F0FDFA",
  },
  {
    id: "rose",
    name: "Rose",
    nameAr: "وردي",
    primary: "#BE123C",
    secondary: "#4C0519",
    background: "#FFF1F2",
  },
  {
    id: "amber",
    name: "Amber",
    nameAr: "كهرماني",
    primary: "#B45309",
    secondary: "#1C1917",
    background: "#FFFBEB",
  },
  {
    id: "forest",
    name: "Forest",
    nameAr: "أخضر غابات",
    primary: "#14532D",
    secondary: "#92400E",
    background: "#F7FEE7",
  },
  {
    id: "plum",
    name: "Plum",
    nameAr: "برقوقي",
    primary: "#7E22CE",
    secondary: "#831843",
    background: "#FDF4FF",
  },
  {
    id: "coffee",
    name: "Coffee",
    nameAr: "قهوة",
    primary: "#92400E",
    secondary: "#44403C",
    background: "#FAF7F2",
  },
  {
    id: "slate",
    name: "Slate",
    nameAr: "رمادي أزرق",
    primary: "#334155",
    secondary: "#0F172A",
    background: "#F8FAFC",
  },
] as const;
export const isHexColor = (value: unknown): value is string =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((v) => {
      const c = parseInt(v, 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}
export function contrastRatio(a: string, b: string) {
  if (!isHexColor(a) || !isHexColor(b)) return 0;
  const left = luminance(a),
    right = luminance(b);
  return (Math.max(left, right) + 0.05) / (Math.min(left, right) + 0.05);
}
export const readableBrandForeground = (color: string) =>
  contrastRatio(color, "#11152D") > contrastRatio(color, "#FFFFFF") ? "#11152D" : "#FFFFFF";
function defaultFooterBackground(secondary: string) {
  return `#${[0, 2, 4]
    .map((offset) => {
      const channel = parseInt(secondary.slice(offset + 1, offset + 3), 16);
      const target = parseInt("#081021".slice(offset + 1, offset + 3), 16);
      return Math.round(channel * 0.2 + target * 0.8).toString(16).padStart(2, "0");
    })
    .join("")}`.toUpperCase();
}
export function createBrandTheme(paletteId = "evergreen", font: string = defaultBrandFont): BrandTheme {
  const palette = brandPalettes.find((p) => p.id === paletteId) ?? brandPalettes[0];
  const heading = brandFonts.includes(font as BrandFont) ? (font as BrandFont) : defaultBrandFont;
  const common = {
    primary: palette.primary,
    buttonBackground: "#FFFFFF",
    onPrimary: readableBrandForeground("#FFFFFF"),
    secondary: palette.secondary,
    success: "#047857",
    warning: "#B45309",
    error: "#BE123C",
    focus: palette.primary,
    footerBackground: defaultFooterBackground(palette.secondary),
  };
  return {
    version: 1,
    paletteId: palette.id,
    light: {
      ...common,
      background: palette.background,
      headerBackground: palette.background,
      surface: "#FFFFFF",
      text: "#11152D",
      mutedText: "#596579",
      border: "#CBD5E1",
    },
    dark: {
      ...common,
      background: "#08131F",
      headerBackground: "#08131F",
      surface: "#101E2E",
      text: "#EDF2FA",
      mutedText: "#A5B3C7",
      border: "#334155",
      success: "#34D399",
      warning: "#FBBF24",
      error: "#FB7185",
    },
    typography: {
      heading,
      body: heading === "Playfair Display" ? "Manrope" : heading,
      arabic: isArabicBrandFont(heading) ? heading : defaultBrandFont,
    },
    buttons: { variant: "solid", shape: "rounded" },
    appearance: { radius: 14, shadow: "soft", density: "comfortable" },
  };
}
/** Never consume arbitrary saved CSS or AI-generated font names. */
export function normalizeBrandTheme(value: unknown, fallback = createBrandTheme()): BrandTheme {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const v = value as Partial<BrandTheme>;
  if (v.version !== 1) return fallback;
  const colors = (input: unknown, base: BrandColors) => {
    const saved = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
    const resolved = Object.fromEntries(
      Object.entries(base).map(([key, initial]) => {
        const color =
          input && typeof input === "object" ? (input as Record<string, unknown>)[key] : null;
        return [key, isHexColor(color) ? color.toUpperCase() : initial];
      }),
    ) as BrandColors;
    // Keep the Studio's selected action color and derive readable button text.
    resolved.onPrimary = readableBrandForeground(resolved.buttonBackground);
    // Preserve the original landing appearance for themes saved before these roles existed.
    if (!isHexColor(saved["headerBackground"])) resolved.headerBackground = resolved.background;
    if (!isHexColor(saved["footerBackground"]))
      resolved.footerBackground = defaultFooterBackground(resolved.secondary);
    return resolved;
  };
  const font = (input: unknown, initial: BrandFont) =>
    brandFonts.includes(input as BrandFont) ? (input as BrandFont) : initial;
  return {
    version: 1,
    paletteId:
      typeof v.paletteId === "string" && v.paletteId.length < 40 ? v.paletteId : fallback.paletteId,
    light: colors(v.light, fallback.light),
    dark: colors(v.dark, fallback.dark),
    typography: {
      heading: font(v.typography?.heading, fallback.typography.heading),
      body: font(v.typography?.body, fallback.typography.body),
      arabic: isArabicBrandFont(v.typography?.arabic) ? v.typography.arabic : fallback.typography.arabic,
    },
    buttons: {
      variant: v.buttons?.variant === "outline" ? "outline" : "solid",
      shape: ["square", "pill"].includes(v.buttons?.shape ?? "") ? v.buttons!.shape : "rounded",
    },
    appearance: {
      radius:
        typeof v.appearance?.radius === "number" && Number.isFinite(v.appearance.radius)
          ? Math.max(0, Math.min(32, v.appearance.radius))
          : fallback.appearance.radius,
      shadow: v.appearance?.shadow === "none" ? "none" : "soft",
      density: v.appearance?.density === "compact" ? "compact" : "comfortable",
    },
  };
}
export function resolveBrandTheme(state: {
  brandTheme?: unknown;
  brandPalette: string;
  fontPersonality: string;
}) {
  return normalizeBrandTheme(
    state.brandTheme,
    createBrandTheme(state.brandPalette, state.fontPersonality?.split(" + ")[0]?.trim()),
  );
}
export function brandContrastIssues(theme: BrandTheme, mode: "light" | "dark") {
  const c = theme[mode];
  return [
    ["button", c.buttonBackground, readableBrandForeground(c.buttonBackground)],
    ["text", c.background, c.text],
    ["surfaceText", c.surface, c.text],
    ["mutedText", c.surface, c.mutedText],
  ]
    .filter(([, bg, fg]) => contrastRatio(bg!, fg!) < 4.5)
    .map(([role]) => role!);
}
