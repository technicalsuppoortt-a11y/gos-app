import type { BrandState } from "@/modules/brand-engine/store/brandSlice";
import { resolveBrandTheme } from "./brandTheme.ts";

// Stable identifiers are independent of translations and wizard step numbers.
export const brandPages = [
  { id: "vision_journey", name: "Vision & Journey Overview", fields: ["business", "language", "theme", "activeStep", "completedSteps"] },
  { id: "business_discovery", name: "AI Business Discovery", fields: ["business", "subNiche", "businessDescription", "targetAudience", "brandKeywords"] },
  { id: "branding", name: "AI Branding Studio", fields: ["brandName", "tagline", "brandDescription", "brandKeywords", "targetAudience", "brandPalette", "brandTheme", "brandCandidates", "brandLocks", "logoStyles", "fontPersonality", "brandLanguage", "brandVoices", "selectedBrandIdentity"] },
  { id: "template_builder", name: "Website & Funnel", fields: ["builderBrandLinked", "selectedTemplate", "readySaasSelection", "builderBlocks", "hiddenBlocks", "builderPalette", "builderHeadingFont", "builderBodyFont", "builderButtonStyle", "builderPublished", "device", "zoom", "platformBlueprint", "platformBuilderMessages"] },
  { id: "dashboard", name: "Live Dashboard Review", fields: ["dashboardSetupMode", "dashboardBundle", "dashboardWidgets", "dashboardModuleOrder", "dashboardModuleSections"] },
  { id: "integrations", name: "Integration Tools & Setup", fields: ["modules"] },
  { id: "ai_center", name: "AI Center Chat", fields: ["messages"] },
  { id: "content_planner", name: "AI Content Planner", fields: [] },
  { id: "marketing", name: "Marketing Strategy", fields: [] },
  { id: "deployment", name: "Platform Deployment", fields: ["deployed"] },
] as const;

export type BrandPageId = typeof brandPages[number]["id"];
// The five screens currently exposed in the Phoenix workspace.
export const workspacePageIds: readonly BrandPageId[] = [
  'business_discovery', 'branding', 'dashboard', 'template_builder', 'deployment',
];
export type SavedBrandPage = {
  pageId: BrandPageId;
  pageName: string;
  schemaVersion: 1;
  parameters: Record<string, unknown>;
};

export const brandPaletteColors: Record<string, string> = {
  evergreen: "#00C19A", midnight: "#071B38", purple: "#6835CF",
  noir: "#111111", blanc: "#F7F7F7", sunset: "#ED7544", electric: "#009CB1",
};

export function serializeBrandPages(state: BrandState): SavedBrandPage[] {
  return brandPages.map((page) => {
    const values = Object.fromEntries(page.fields.map((field) => [field, state[field as keyof BrandState]]));
    return {
      pageId: page.id, pageName: page.name, schemaVersion: 1,
      parameters: {
        ...values,
        choices: state.pageParameters[page.id] ?? {},
        ...(page.id === "dashboard" ? { layoutVersion: "copilot-v1" } : {}),
        ...(page.id === "branding" ? {
          brandTheme: resolveBrandTheme(state),
          colors: { paletteId: state.brandPalette, primary: state.brandTheme && typeof state.brandTheme === "object" ? resolveBrandTheme(state).light.primary : brandPaletteColors[state.brandPalette] ?? null },
          logo: state.pageParameters["branding"]?.["uploadedLogo"] ?? { kind: "generated_mark", identity: state.selectedBrandIdentity },
        } : {}),
      },
    };
  });
}

export function hydrateBrandPages(pages: SavedBrandPage[]): Partial<BrandState> {
  const draft: Record<string, unknown> = {};
  const pageParameters: BrandState["pageParameters"] = {};
  for (const spec of brandPages) {
    const saved = pages.find((page) => page.pageId === spec.id && page.schemaVersion === 1);
    if (!saved?.parameters) continue;
    for (const field of spec.fields) {
      if (Object.hasOwn(saved.parameters, field)) draft[field] = saved.parameters[field];
    }
    const choices = saved.parameters["choices"];
    if (choices && typeof choices === "object" && !Array.isArray(choices)) {
      // Compatibility normalization must not mutate the saved pages or revision baseline.
      pageParameters[spec.id] = { ...choices };
    }
  }
  // Existing saved choices are conservative imports, never silently reset or replaced.
  if (draft["brandTheme"] && typeof draft["brandTheme"] === "object" && !pageParameters["branding"]?.["elementSources"]) {
    const choices = pageParameters["branding"] ??= {};
    choices["elementSources"] = { name: "imported", tagline: "imported", colors: "imported", typography: "imported", logo: "imported" };
    draft["brandLocks"] = { ...(typeof draft["brandLocks"] === "object" ? draft["brandLocks"] as object : {}), name: true, tagline: true, colors: true, typography: true, logo: true };
  }
  // An older Builder document has its own intentional styling. Retain it until
  // the user explicitly reconnects it to the kit; new documents inherit it.
  const builder = pages.find(page => page.pageId === "template_builder");
  if (builder && !Object.hasOwn(builder.parameters, "builderBrandLinked")) draft["builderBrandLinked"] = false;
  return { ...draft, pageParameters } as Partial<BrandState>;
}

export function fingerprintPages(pages: SavedBrandPage[]) {
  return JSON.stringify(pages, (_key, value) => value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))) : value);
}
export function fingerprintBrandPages(state: BrandState) {
  return fingerprintPages(serializeBrandPages(state));
}
