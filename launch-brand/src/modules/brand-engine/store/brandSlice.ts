import { themeFromCoreColors } from "@/modules/brand-engine/data/ai/brandStudioCore.js";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { getWizardStepId, initialMessages, initialModules, wizardOrder } from "@/modules/brand-engine/data/mockData";
import type {
  AiMessage,
  AppMode,
  BrandIdentity,
  BuilderBlock,
  DashboardBundle,
  DashboardSection,
  DashboardSetupMode,
  DashboardWidgetId,
  Device,
  Language,
  Module,
  PlatformBlueprint,
  PlatformBuilderMessage,
  Theme,
} from "@/modules/brand-engine/data/types";
import { builderTemplates } from "@/modules/brand-engine/data/builderTemplates";
import { studioPresetTheme } from "@/modules/brand-engine/data/studioColorPresets";
import { readySaasCatalog, readySaasBrand, type ReadySaasSelection } from "@/modules/brand-engine/data/readySaas";
import { integrationModuleIds, isCoreModule } from "@/modules/brand-engine/data/moduleCategories";
import {
  coreLayoutOrder,
  coreLayoutSections,
  dashboardAIInput,
  validateDashboardAIResult,
  type DashboardAIPlan,
} from "@/modules/brand-engine/data/dashboardLayout";
import {
  createBrandTheme,
  normalizeBrandTheme,
  defaultBrandLocks,
  type BrandTheme,
  type BrandCandidate,
  type BrandLocks,
  type BrandElement,
  type BrandElementCandidate,
  type BrandDirectionParts,
} from "@/modules/brand-engine/data/brandTheme";
import {
  getDiscoverySelection,
  type DiscoverySelection,
  type cloneDiscoveryWorkspace,
} from "@/modules/brand-engine/data/discovery";
import {
  applyDiscoveryCopy,
  mergeActiveFunnelBlocks,
  type DiscoveryContent,
} from "@/modules/brand-engine/data/discoveryWorkspace";

export interface BrandState {
  phoenixPreparation: {
    state: "idle" | "transferring" | "prepared" | "failed";
    fingerprint: string | null;
    snapshotId: string | null;
    error: string | null;
    progress?: number;
    stage?: string;
    phoenixUid?: string;
    phoenixOrigin?: string;
  };
  pageParameters: Record<string, Record<string, unknown>>;
  mode: AppMode;
  language: Language;
  theme: Theme;
  activeStep: number;
  completedSteps: number[];
  business: string;
  subNiche: string;
  businessDescription: string;
  brandTheme: BrandTheme | null;
  brandCandidates: BrandCandidate[];
  brandLocks: BrandLocks;
  builderBrandLinked: boolean;
  brandName: string;
  tagline: string;
  brandDescription: string;
  brandKeywords: string[];
  targetAudience: string;
  brandPalette: string;
  logoStyles: string[];
  fontPersonality: string;
  brandLanguage: string;
  brandVoices: string[];
  selectedBrandIdentity: BrandIdentity;
  selectedTemplate: string;
  readySaasSelection: ReadySaasSelection | null;
  modules: Module[];
  messages: AiMessage[];
  platformBuilderMessages: PlatformBuilderMessage[];
  platformBlueprint: PlatformBlueprint | null;
  device: Device;
  zoom: number;
  deployed: boolean;
  selectedBlock: string;
  hiddenBlocks: string[];
  builderBlocks: BuilderBlock[];
  builderPast: BuilderBlock[][];
  builderFuture: BuilderBlock[][];
  builderPublished: boolean;
  builderPalette: "evergreen" | "ocean" | "sunset" | "mono";
  builderHeadingFont: "Manrope" | "Sora" | "DM Sans";
  builderBodyFont: "Manrope" | "Inter" | "Work Sans";
  builderButtonStyle: "solid" | "outline" | "glass" | "pill";
  dashboardSetupMode: DashboardSetupMode;
  dashboardBundle: DashboardBundle | null;
  dashboardWidgets: DashboardWidgetId[];
  dashboardModuleOrder: string[];
  dashboardModuleSections: Record<string, DashboardSection>;
  userProfile: { uid: string; displayName: string; email: string; tier?: string } | null;
}
const initialIdentity: BrandIdentity = {
  id: "geometric",
  name: "Northstar",
  tagline: "Clarity that moves business forward.",
  palette: "dashboard-default",
  typography: "IBM Plex Sans Arabic",
  mark: "prism",
  vibe: "SIGNATURE",
};
const initialState: BrandState = {
  phoenixPreparation: { state: "idle", fingerprint: null, snapshotId: null, error: null },
  pageParameters: { branding: { elementSources: { name: "default", tagline: "default", colors: "default", typography: "default", logo: "default" } } },
  mode: "wizard",
  language: "en",
  theme: "light",
  //   activeStep: 1,
  activeStep: 13,
  completedSteps: [],
  business: "coaching",
  subNiche: "",
  businessDescription: "",
  brandTheme: studioPresetTheme("dashboard-default", createBrandTheme()),
  brandCandidates: [],
  brandLocks: defaultBrandLocks,
  builderBrandLinked: true,
  brandName: "",
  tagline: "",
  brandDescription: "",
  brandKeywords: ["Modern", "AI-first"],
  targetAudience:
    "Ambitious founders who want a clear, credible brand and a faster path to market.",
  brandPalette: initialIdentity.palette,
  logoStyles: ["Abstract Mark", "Geometric Symbol"],
  fontPersonality: "IBM Plex Sans Arabic",
  brandLanguage: "English",
  brandVoices: ["Professional", "Bold & Energetic"],
  selectedBrandIdentity: { ...initialIdentity, name: "", tagline: "" },
  selectedTemplate: "procoach",
  readySaasSelection: null,
  modules: initialModules,
  messages: initialMessages,
  platformBuilderMessages: [],
  platformBlueprint: null,
  device: "desktop",
  zoom: 86,
  deployed: false,
  selectedBlock: "hero",
  hiddenBlocks: [],
  builderBlocks: builderTemplates[0]?.blocks ?? [],
  builderPast: [],
  builderFuture: [],
  builderPublished: false,
  builderPalette: "evergreen",
  builderHeadingFont: "Manrope",
  builderBodyFont: "Manrope",
  builderButtonStyle: "solid",
  dashboardSetupMode: "recommended",
  dashboardBundle: "agency",
  dashboardWidgets: ["profile", "growth", "summary", "revenue", "performance", "actions"],
  dashboardModuleOrder: ["crm", "analytics", "calendar", "assistant", "mail"],
  dashboardModuleSections: {
    crm: "top",
    analytics: "top",
    calendar: "middle",
    assistant: "middle",
    mail: "bottom",
    payments: "bottom",
    community: "bottom",
    courses: "middle",
    whatsapp: "bottom",
    landing: "bottom",
  },
  userProfile: null,
};
const dashboardBundles: Record<
  DashboardBundle,
  { widgets: DashboardWidgetId[]; modules: string[] }
> = {
  ecommerce: {
    widgets: ["profile", "growth", "summary", "revenue", "performance", "actions"],
    modules: ["crm", "analytics", "landing"],
  },
  agency: {
    widgets: ["profile", "growth", "summary", "revenue", "performance", "actions"],
    modules: ["crm", "calendar", "analytics"],
  },
  creator: {
    widgets: ["profile", "growth", "summary", "audience", "performance", "actions"],
    modules: ["courses", "calendar", "community"],
  },
};
function confirmElement(s: BrandState, element: BrandElement, source: "manual" | "generated") {
  const choices = s.pageParameters["branding"] ??= {};
  choices["elementSources"] = { ...(choices["elementSources"] as Record<string, string> || {}), [element]: source };
  s.brandLocks[element] = true;
  choices["selectedDirectionId"] = null;
}
const slice = createSlice({
  name: "brand",
  initialState,
  reducers: {
    setPhoenixPreparation: (state, action: PayloadAction<BrandState["phoenixPreparation"]>) => {
      state.phoenixPreparation = action.payload;
    },
    resetUserDraft: () => initialState,
    resetBrandStudio: (s) => {
      s.brandName = initialState.brandName;
      s.tagline = initialState.tagline;
      s.brandDescription = initialState.brandDescription;
      s.brandKeywords = initialState.brandKeywords;
      s.targetAudience = initialState.targetAudience;
      s.brandPalette = initialState.brandPalette;
      s.brandTheme = initialState.brandTheme;
      s.brandCandidates = [];
      s.brandLocks = initialState.brandLocks;
      s.logoStyles = initialState.logoStyles;
      s.fontPersonality = initialState.fontPersonality;
      s.brandLanguage = initialState.brandLanguage;
      s.brandVoices = initialState.brandVoices;
      s.selectedBrandIdentity = initialState.selectedBrandIdentity;
      s.builderBrandLinked = initialState.builderBrandLinked;
      s.pageParameters["branding"] = { ...initialState.pageParameters["branding"], favoriteIdentities: [] };
    },
    hydrateUserDraft: (state, action: PayloadAction<Partial<BrandState>>) => {
      Object.assign(state, action.payload);
      state.activeStep = getWizardStepId(state.activeStep);
    },
    setPageParameter: (
      state,
      action: PayloadAction<{ pageId: string; key: string; value: unknown }>,
    ) => {
      const { pageId, key, value } = action.payload;
      (state.pageParameters[pageId] ??= {})[key] = value;
    },
    setMode: (s, a: PayloadAction<AppMode>) => {
      s.mode = a.payload;
    },
    toggleLanguage: (s) => {
      s.language = s.language === "en" ? "ar" : "en";
    },
    setLanguage: (s, a: PayloadAction<Language>) => {
      s.language = a.payload;
    },
    toggleTheme: (s) => {
      s.theme = s.theme === "light" ? "dark" : "light";
    },
    setStep: (s, a: PayloadAction<number>) => {
      s.activeStep = s.mode === "wizard" ? getWizardStepId(a.payload) : a.payload;
    },
    completeStep: (s, a: PayloadAction<number>) => {
      const step = a.payload;
      if (!s.completedSteps.includes(step)) s.completedSteps.push(step);
    },
    nextStep: (s) => {
      if (
        s.activeStep === 13 &&
        !getDiscoverySelection(s.pageParameters["business_discovery"]?.["nicheSelection"])
      )
        return;
      const i = wizardOrder.indexOf(getWizardStepId(s.activeStep));
      const next = wizardOrder[i + 1];
      const completedStep = getWizardStepId(s.activeStep);
      if (!s.completedSteps.includes(completedStep)) s.completedSteps.push(completedStep);
      if (next !== undefined) s.activeStep = next;
    },
    previousStep: (s) => {
      const i = wizardOrder.indexOf(getWizardStepId(s.activeStep));
      const previous = wizardOrder[i - 1];
      if (previous !== undefined) s.activeStep = previous;
    },
    setBusiness: (s, a: PayloadAction<string>) => {
      s.business = a.payload;
      s.subNiche = "";
      if (s.pageParameters["business_discovery"]) {
        delete s.pageParameters["business_discovery"]["nicheSelection"];
        delete s.pageParameters["business_discovery"]["nicheWorkspace"];
      }
    },
    confirmDiscovery: (
      s,
      a: PayloadAction<{
        selection: DiscoverySelection;
        workspace: ReturnType<typeof cloneDiscoveryWorkspace>;
      }>,
    ) => {
      const { selection, workspace } = a.payload;
      const previous = getDiscoverySelection(
        s.pageParameters["business_discovery"]?.["nicheSelection"],
      );
      const choices = (s.pageParameters["business_discovery"] ??= {});
      if (choices["nicheWorkspace"]) {
        const history = Array.isArray(choices["nicheWorkspaceHistory"])
          ? choices["nicheWorkspaceHistory"]
          : [];
        choices["nicheWorkspaceHistory"] = [
          ...history.slice(-4),
          {
            selection: choices["nicheSelection"],
            workspace: choices["nicheWorkspace"],
            builderBlocks: s.builderBlocks,
          },
        ];
      }
      choices["nicheSelection"] = selection;
      choices["nicheWorkspace"] = {
        ...workspace,
        subNicheId: selection.subNicheId,
        steps: workspace.funnelSteps,
      };
      s.business = selection.profileSnapshot.platformPresetId;
      s.subNiche = selection.subNicheNameEn;
      if (
        !s.businessDescription ||
        (previous &&
          [
            `${previous.subNicheNameEn}: ${previous.profileSnapshot.desiredOutcomeEn}`,
            `${previous.subNicheNameAr}: ${previous.profileSnapshot.desiredOutcomeAr}`,
          ].includes(s.businessDescription))
      )
        s.businessDescription =
          s.language === "ar"
            ? `${selection.subNicheNameAr}: ${selection.profileSnapshot.desiredOutcomeAr}`
            : `${selection.subNicheNameEn}: ${selection.profileSnapshot.desiredOutcomeEn}`;
      if (
        !s.targetAudience ||
        s.targetAudience === initialState.targetAudience ||
        s.targetAudience === previous?.profileSnapshot.buyerProfileEn ||
        s.targetAudience === previous?.profileSnapshot.buyerProfileAr
      )
        s.targetAudience =
          s.language === "ar"
            ? selection.profileSnapshot.buyerProfileAr
            : selection.profileSnapshot.buyerProfileEn;
      s.builderPast.push(s.builderBlocks);
      s.builderFuture = [];
      s.builderBlocks = workspace.builderBlocks;
      s.selectedBlock = workspace.builderBlocks[0]?.id ?? "";
      s.selectedTemplate = workspace.selectedTemplate;
      s.builderBrandLinked = true;
      s.builderPublished = false;
      s.readySaasSelection = null;
      s.platformBlueprint = null;
      s.dashboardWidgets = workspace.dashboardWidgets;
      s.dashboardSetupMode = "custom";
      s.dashboardBundle = null;
      s.dashboardModuleOrder = workspace.dashboardModuleOrder;
      s.dashboardModuleSections = workspace.dashboardModuleSections;
      s.modules = s.modules.map((module) => ({
        ...module,
        active: module.active || selection.profileSnapshot.moduleIds.includes(module.id),
      }));
      const dashboardChoices = (s.pageParameters["dashboard"] ??= {});
      dashboardChoices["nichePipelineStages"] = workspace.pipelineStages;
      dashboardChoices["nicheMetrics"] = workspace.dashboardMetrics;
      dashboardChoices["nicheSetupVersion"] = {
        subNicheId: selection.subNicheId,
        templateVersion: workspace.templateVersion,
        catalogVersion: workspace.catalogVersion,
      };
      s.phoenixPreparation = { state: "idle", fingerprint: null, snapshotId: null, error: null };
    },
    applyDiscoveryContent: (s, a: PayloadAction<DiscoveryContent>) => {
      const selection = getDiscoverySelection(
        s.pageParameters["business_discovery"]?.["nicheSelection"],
      );
      const workspace = s.pageParameters["business_discovery"]?.["nicheWorkspace"] as
        | {
            templateVersion?: number;
            clonedBlocks?: BuilderBlock[];
            activePageId?: string;
            funnelTemplateId?: string;
            funnelPages?: Array<{ id: string; blockIds: string[] }>;
          }
        | undefined;
      const result = a.payload;
      if (
        !selection ||
        !workspace ||
        s.selectedTemplate !== workspace.funnelTemplateId ||
        result.sourceSubNicheId !== selection.subNicheId ||
        result.catalogVersion !== selection.catalogVersion ||
        result.templateVersion !== workspace.templateVersion
      )
        return;
      let blocks: BuilderBlock[];
      try {
        const activeIds = workspace.funnelPages?.find(
          (page) => page.id === workspace.activePageId,
        )?.blockIds;
        const base = activeIds
          ? mergeActiveFunnelBlocks(workspace.clonedBlocks ?? [], activeIds, s.builderBlocks)
          : s.builderBlocks;
        blocks = applyDiscoveryCopy(base, result);
      } catch {
        return;
      }
      s.builderPast.push(s.builderBlocks);
      s.builderFuture = [];
      const activeIds = workspace.funnelPages?.find(
        (page) => page.id === workspace.activePageId,
      )?.blockIds;
      s.builderBlocks = activeIds
        ? activeIds.flatMap((id) => blocks.filter((block) => block.id === id))
        : blocks;
      s.builderPublished = false;
      (s.pageParameters["business_discovery"] ??= {})["nicheWorkspace"] = {
        ...workspace,
        clonedBlocks: blocks,
        followUpMessages: result.followUpMessages,
        qualificationQuestions: result.qualificationQuestions,
        contentProvider: result.provider ?? null,
        contentModel: result.model ?? null,
      };
      (s.pageParameters["ai_center"] ??= {})["discoveryContentActivity"] = {
        subNicheId: selection.subNicheId,
        catalogVersion: selection.catalogVersion,
        provider: result.provider ?? null,
        model: result.model ?? null,
      };
    },
    switchDiscoveryFunnelPage: (s, a: PayloadAction<string>) => {
      const workspace = s.pageParameters["business_discovery"]?.["nicheWorkspace"] as
        | {
            funnelTemplateId: string;
            activePageId: string;
            funnelPages: Array<{ id: string; blockIds: string[] }>;
            clonedBlocks: BuilderBlock[];
          }
        | undefined;
      if (!workspace || s.selectedTemplate !== workspace.funnelTemplateId) return;
      const nextPage = workspace.funnelPages.find((page) => page.id === a.payload);
      const currentPage = workspace.funnelPages.find((page) => page.id === workspace.activePageId);
      if (!nextPage || !currentPage || currentPage.id === nextPage.id) return;
      const blocks = new Map(workspace.clonedBlocks.map((block) => [block.id, block]));
      const otherPageIds = new Set(
        workspace.funnelPages
          .filter((page) => page.id !== currentPage.id)
          .flatMap((page) => page.blockIds),
      );
      for (const id of currentPage.blockIds) if (!otherPageIds.has(id)) blocks.delete(id);
      for (const block of s.builderBlocks) blocks.set(block.id, block);
      currentPage.blockIds = s.builderBlocks.map((block) => block.id);
      workspace.clonedBlocks = [...blocks.values()];
      workspace.activePageId = nextPage.id;
      s.builderBlocks = nextPage.blockIds.flatMap((id) =>
        blocks.has(id) ? [blocks.get(id)!] : [],
      );
      s.selectedBlock = s.builderBlocks[0]?.id ?? "";
      s.builderPast = [];
      s.builderFuture = [];
    },
    setSubNiche: (s, a: PayloadAction<string>) => {
      s.subNiche = a.payload;
    },
    setBusinessDescription: (s, a: PayloadAction<string>) => {
      s.businessDescription = a.payload;
    },
    setBrandTheme: (s, a: PayloadAction<BrandTheme>) => {
      const previous = normalizeBrandTheme(s.brandTheme, createBrandTheme(s.brandPalette, s.fontPersonality));
      s.brandTheme = normalizeBrandTheme(a.payload);
      if (JSON.stringify([previous.light, previous.dark]) !== JSON.stringify([s.brandTheme.light, s.brandTheme.dark])) confirmElement(s, "colors", "manual");
      if (JSON.stringify(previous.typography) !== JSON.stringify(s.brandTheme.typography)) confirmElement(s, "typography", "manual");
      s.brandPalette = s.brandTheme.paletteId;
      s.fontPersonality = s.brandTheme.typography.heading;
      s.builderBrandLinked = true;
    },
    setBrandCandidates: (s, a: PayloadAction<BrandCandidate[]>) => {
      s.brandCandidates = a.payload.slice(0, 3);
    },
    appendBrandCandidates: (s, a: PayloadAction<BrandCandidate[]>) => {
      const seen = new Set(s.brandCandidates.map((candidate) => candidate.id));
      for (const candidate of a.payload) {
        if (seen.has(candidate.id)) continue;
        seen.add(candidate.id);
        s.brandCandidates.push(candidate);
      }
    },
    setBrandLocks: (s, a: PayloadAction<BrandLocks>) => {
      s.brandLocks = a.payload;
    },
    setBuilderBrandLinked: (s, a: PayloadAction<boolean>) => {
      s.builderBrandLinked = a.payload;
    },
    // A deliberate ready-made selection applies the visual kit in full.
    // AI preservation preferences do not veto this explicit manual choice.
    applyReadyMadeIdentity: (s, a: PayloadAction<BrandCandidate>) => {
      const c = a.payload;
      const theme = normalizeBrandTheme(c.theme);
      s.brandTheme = theme;
      s.brandPalette = theme.paletteId;
      s.fontPersonality = theme.typography.heading;
      s.builderBrandLinked = true;
      s.selectedBrandIdentity = {
        id: c.id,
        name: s.brandName || c.name,
        tagline: s.tagline,
        ...(c.arabicName ? { arabicName: c.arabicName } : {}),
        palette: theme.paletteId,
        typography: theme.typography.heading,
        mark: c.mark,
        vibe: "READY-MADE",
      };
      (s.pageParameters["branding"] ??= {})["uploadedLogo"] = null;
    },
    applyBrandCandidate: (s, a: PayloadAction<{ candidate: BrandCandidate; parts: BrandDirectionParts }>) => {
      const { candidate: c, parts } = a.payload;
      const candidateTheme = normalizeBrandTheme(c.theme);
      const current = normalizeBrandTheme(s.brandTheme, createBrandTheme(s.brandPalette, s.fontPersonality));
      if (parts.name || !s.brandName.trim() || /^(brand name|your brand|اسم البراند|اسم العلامة التجارية)$/i.test(s.brandName.trim())) {
        s.brandName = c.name;
        if (c.arabicName) s.selectedBrandIdentity.arabicName = c.arabicName;
        confirmElement(s, "name", "generated");
      }
      if (!s.tagline.trim()) {
        s.tagline = c.tagline;
        confirmElement(s, "tagline", "generated");
      }
      s.brandTheme = { ...current,
        ...(parts.colors ? { light: candidateTheme.light, dark: candidateTheme.dark, paletteId: candidateTheme.paletteId } : {}),
        ...(parts.typography ? { typography: candidateTheme.typography } : {}),
      };
      s.brandPalette = s.brandTheme.paletteId;
      s.fontPersonality = s.brandTheme.typography.heading;
      s.selectedBrandIdentity = { ...s.selectedBrandIdentity, name: s.brandName, tagline: s.tagline, palette: s.brandPalette, typography: s.fontPersonality,
        ...(parts.logo ? { id: c.id, mark: c.mark, vibe: "AI DIRECTION", ...(c.logo ? { logo: { ...c.logo, ...(c.logo.wordmark ? { wordmark: { ...c.logo.wordmark, font: s.brandLanguage === "Arabic" ? s.brandTheme.typography.arabic : s.brandTheme.typography.heading } } : {}) } } : {}) } : {}),
      };
      if (parts.logo) {
        if ((s.pageParameters["branding"] ??= {})["uploadedLogo"]) s.pageParameters["branding"]["customLogo"] = s.pageParameters["branding"]["uploadedLogo"];
        s.pageParameters["branding"]["uploadedLogo"] = null;
        confirmElement(s, "logo", "generated");
      }
      if (parts.colors) confirmElement(s, "colors", "generated");
      if (parts.typography) confirmElement(s, "typography", "generated");
      if (!s.brandDescription) s.brandDescription = c.description || "";
      if (parts.colors || parts.typography) s.builderBrandLinked = true;
    },
    applyBrandElement: (s, a: PayloadAction<{ element: BrandElement; candidate: BrandElementCandidate }>) => {
      const { element, candidate: c } = a.payload;
      const current = normalizeBrandTheme(s.brandTheme, createBrandTheme(s.brandPalette, s.fontPersonality));
      if (element === "name" && c.name) {
        s.brandName = c.name;
        s.selectedBrandIdentity.name = c.name;
        delete s.selectedBrandIdentity.arabicName;
      } else if (element === "tagline" && typeof c.tagline === "string") {
        s.tagline = c.tagline;
        s.selectedBrandIdentity.tagline = c.tagline;
      } else if (element === "colors" && c.coreColors) {
        s.brandTheme = themeFromCoreColors(c.coreColors, current);
        s.brandPalette = s.brandTheme.paletteId;
        s.selectedBrandIdentity.palette = s.brandPalette;
        s.builderBrandLinked = true;
      } else if (element === "typography" && c.typography) {
        s.brandTheme = normalizeBrandTheme({ ...current, typography: c.typography });
        s.fontPersonality = s.brandTheme.typography.heading;
        s.selectedBrandIdentity.typography = s.fontPersonality;
        s.builderBrandLinked = true;
      } else if (element === "logo" && c.logo && c.mark) {
        const choices = s.pageParameters["branding"] ??= {};
        if (choices["uploadedLogo"]) choices["customLogo"] = choices["uploadedLogo"];
        choices["uploadedLogo"] = null;
        s.selectedBrandIdentity = { ...s.selectedBrandIdentity, id: c.id, name: s.brandName, tagline: s.tagline, palette: s.brandPalette, typography: s.fontPersonality, mark: c.mark, logo: { ...c.logo, ...(c.logo.wordmark ? { wordmark: { ...c.logo.wordmark, font: s.brandLanguage === "Arabic" ? current.typography.arabic : current.typography.heading } } : {}) }, vibe: "AI LOGO" };
      } else return;
      confirmElement(s, element, "generated");
    },
    setBrandName: (s, a: PayloadAction<string>) => {
      s.brandName = a.payload;
      s.selectedBrandIdentity.name = a.payload;
      delete s.selectedBrandIdentity.arabicName;
      confirmElement(s, "name", "manual");
    },
    setTagline: (s, a: PayloadAction<string>) => {
      s.tagline = a.payload;
      s.selectedBrandIdentity.tagline = a.payload;
      confirmElement(s, "tagline", "manual");
    },
    setBrandKeywords: (s, a: PayloadAction<string[]>) => {
      s.brandKeywords = a.payload;
    },
    setTargetAudience: (s, a: PayloadAction<string>) => {
      s.targetAudience = a.payload;
    },
    setBrandPalette: (s, a: PayloadAction<string>) => {
      s.brandPalette = a.payload;
      const next = createBrandTheme(a.payload, s.fontPersonality);
      if (s.brandTheme) {
        next.typography = s.brandTheme.typography;
        next.buttons = s.brandTheme.buttons;
        next.appearance = s.brandTheme.appearance;
      }
      s.brandTheme = next;
      s.builderBrandLinked = true;
    },
    setLogoStyles: (s, a: PayloadAction<string[]>) => {
      s.logoStyles = a.payload;
    },
    setFontPersonality: (s, a: PayloadAction<string>) => {
      s.fontPersonality = a.payload;
      confirmElement(s, "typography", "manual");
      const next = s.brandTheme ?? createBrandTheme(s.brandPalette, a.payload);
      next.typography = createBrandTheme(s.brandPalette, a.payload).typography;
      s.brandTheme = next;
      s.builderBrandLinked = true;
    },
    setBrandLanguage: (s, a: PayloadAction<string>) => {
      s.brandLanguage = a.payload;
      (s.pageParameters["branding"] ??= {})["brandLanguageConfirmed"] = true;
    },
    setBrandVoices: (s, a: PayloadAction<string[]>) => {
      s.brandVoices = a.payload;
    },
    selectBrandIdentity: (s, a: PayloadAction<BrandIdentity>) => {
      s.selectedBrandIdentity = { ...a.payload, name: s.brandName, tagline: s.tagline, palette: s.brandPalette, typography: s.fontPersonality };
      confirmElement(s, "logo", "manual");
    },
    setTemplate: (s, a: PayloadAction<string>) => {
      s.selectedTemplate = a.payload;

      const map: Record<string, string> = {
        procoach: "creator-hub",
        omnistore: "storefront",
        velocity: "saas-launch",
        lumina: "agency-studio",
      };

      const targetBuilderId = map[a.payload] || builderTemplates[0]?.id;
      const builderTpl =
        builderTemplates.find((t) => t.id === targetBuilderId) || builderTemplates[0];

      if (builderTpl) {
        s.builderPast = [];
        s.builderFuture = [];
        s.builderBlocks = builderTpl.blocks.map((block) => ({ ...block }));
      }
    },
    useReadySaas: (s, a: PayloadAction<string>) => {
      const item = readySaasCatalog.find((entry) => entry.id === a.payload);
      if (!item) return;
      s.readySaasSelection = { id: item.id, brand: readySaasBrand(s) };
      s.selectedTemplate = `ready:${item.id}`;
      const included = [...item.core, ...item.integrations];
      s.modules.forEach((module) => {
        module.active = included.includes(module.id);
      });
      s.dashboardModuleOrder = included;
      item.core.forEach((id, index) => {
        s.dashboardModuleSections[id] = index < 2 ? "top" : "middle";
      });
      item.integrations.forEach((id) => {
        s.dashboardModuleSections[id] = "bottom";
      });
      s.dashboardBundle = null;
      s.dashboardSetupMode = "custom";
      s.deployed = false;
      s.builderPublished = false;
      if (!s.completedSteps.includes(4)) s.completedSteps.push(4);
      s.activeStep = 18;
      s.mode = "wizard";
    },
    toggleModule: (s, a: PayloadAction<string>) => {
      const module = s.modules.find((item) => item.id === a.payload);
      if (!module) return;
      module.active = !module.active;
      if (module.active && !s.dashboardModuleOrder.includes(module.id)) {
        s.dashboardModuleOrder.push(module.id);
        s.dashboardModuleSections[module.id] ??= "middle";
      } else if (!module.active) {
        s.dashboardModuleOrder = s.dashboardModuleOrder.filter((id) => id !== module.id);
      }
      s.dashboardSetupMode = "custom";
      s.dashboardBundle = null;
    },
    activateModules: (s, a: PayloadAction<string[]>) => {
      s.modules.forEach((module) => {
        if (!a.payload.includes(module.id)) return;
        module.active = true;
        if (!s.dashboardModuleOrder.includes(module.id)) s.dashboardModuleOrder.push(module.id);
        s.dashboardModuleSections[module.id] ??= "middle";
      });
      s.dashboardSetupMode = "custom";
      s.dashboardBundle = null;
    },
    applyDashboardBundle: (s, a: PayloadAction<DashboardBundle>) => {
      const bundle = dashboardBundles[a.payload];
      s.dashboardSetupMode = "recommended";
      s.dashboardBundle = a.payload;
      s.dashboardWidgets = [...bundle.widgets];
      s.modules.filter(isCoreModule).forEach((module) => {
        module.active = bundle.modules.includes(module.id);
      });
      s.dashboardModuleOrder = [
        ...bundle.modules.filter((id) => s.modules.some((module) => module.id === id)),
        ...s.dashboardModuleOrder.filter((id) => integrationModuleIds.has(id)),
      ];
      bundle.modules.forEach((id, index) => {
        s.dashboardModuleSections[id] = index < 2 ? "top" : "middle";
      });
    },
    startCustomDashboard: (s) => {
      s.dashboardSetupMode = "custom";
      s.dashboardBundle = null;
      s.dashboardWidgets = [];
      s.dashboardModuleOrder = s.dashboardModuleOrder.filter((id) => integrationModuleIds.has(id));
      s.modules.filter(isCoreModule).forEach((module) => {
        module.active = false;
      });
    },
    toggleDashboardWidget: (s, a: PayloadAction<DashboardWidgetId>) => {
      s.dashboardSetupMode = "custom";
      s.dashboardBundle = null;
      s.dashboardWidgets = s.dashboardWidgets.includes(a.payload)
        ? s.dashboardWidgets.filter((widget) => widget !== a.payload)
        : [...s.dashboardWidgets, a.payload];
    },
    toggleDashboardModule: (s, a: PayloadAction<string>) => {
      const module = s.modules.find((item) => item.id === a.payload);
      if (!module) return;
      module.active = !module.active;
      s.dashboardSetupMode = "custom";
      s.dashboardBundle = null;
      if (module.active && !s.dashboardModuleOrder.includes(module.id)) {
        s.dashboardModuleOrder.push(module.id);
        s.dashboardModuleSections[module.id] ??= "middle";
      } else if (!module.active) {
        s.dashboardModuleOrder = s.dashboardModuleOrder.filter((id) => id !== module.id);
      }
    },
    reorderDashboardModules: (s, a: PayloadAction<{ activeId: string; overId: string }>) => {
      const from = s.dashboardModuleOrder.indexOf(a.payload.activeId);
      const to = s.dashboardModuleOrder.indexOf(a.payload.overId);
      if (from < 0 || to < 0 || from === to) return;
      const [moved] = s.dashboardModuleOrder.splice(from, 1);
      if (moved) s.dashboardModuleOrder.splice(to, 0, moved);
      s.dashboardSetupMode = "custom";
      s.dashboardBundle = null;
    },
    setDashboardModuleSection: (s, a: PayloadAction<{ id: string; section: DashboardSection }>) => {
      s.dashboardModuleSections[a.payload.id] = a.payload.section;
      s.dashboardSetupMode = "custom";
      s.dashboardBundle = null;
    },
    resetDashboardLayout: (s) => {
      s.dashboardModuleOrder = [
        ...coreLayoutOrder.filter((id) =>
          s.modules.some((module) => module.id === id && module.active),
        ),
        ...s.dashboardModuleOrder.filter((id) => integrationModuleIds.has(id)),
      ];
      Object.assign(s.dashboardModuleSections, coreLayoutSections);
      s.dashboardSetupMode = "custom";
      s.dashboardBundle = null;
    },
    loadDashboardTemplate: (s, a: PayloadAction<DashboardBundle | undefined>) => {
      const bundleId = a.payload ?? "agency";
      const bundle = dashboardBundles[bundleId];
      const ids = bundle.modules;
      s.modules.filter(isCoreModule).forEach((module) => {
        module.active = ids.includes(module.id);
      });
      s.dashboardModuleOrder = [
        ...ids,
        ...s.dashboardModuleOrder.filter((id) => integrationModuleIds.has(id)),
      ];
      ids.forEach((id, index) => {
        s.dashboardModuleSections[id] = index < 2 ? "top" : "middle";
      });
      s.dashboardWidgets = [...bundle.widgets];
      s.dashboardSetupMode = "recommended";
      s.dashboardBundle = bundleId;
    },
    optimizeDashboardLayout: (s, a: PayloadAction<DashboardAIPlan>) => {
      const input = dashboardAIInput(s);
      if (!a.payload || a.payload.sourceKey !== JSON.stringify(input)) return;
      let plan;
      try {
        plan = validateDashboardAIResult(
          { summary: a.payload.summary, layout: a.payload.layout },
          input,
        );
      } catch {
        return;
      }
      s.dashboardModuleOrder = [
        ...plan.layout.map((item) => item.id),
        ...s.dashboardModuleOrder.filter((id) => integrationModuleIds.has(id)),
      ];
      plan.layout.forEach((item) => {
        s.dashboardModuleSections[item.id] = item.section;
      });
      s.dashboardSetupMode = "custom";
      s.dashboardBundle = null;
    },
    addMessage: (s, a: PayloadAction<AiMessage>) => {
      s.messages.push(a.payload);
    },
    setPlatformBuilderState: (
      s,
      a: PayloadAction<{ messages: PlatformBuilderMessage[]; blueprint: PlatformBlueprint | null }>,
    ) => {
      s.platformBuilderMessages = a.payload.messages;
      s.platformBlueprint = a.payload.blueprint;
    },
    addPlatformBuilderMessage: (s, a: PayloadAction<PlatformBuilderMessage>) => {
      s.platformBuilderMessages.push(a.payload);
    },
    setPlatformBlueprint: (s, a: PayloadAction<PlatformBlueprint>) => {
      s.platformBlueprint = a.payload;
    },
    setDevice: (s, a: PayloadAction<Device>) => {
      s.device = a.payload;
    },
    setZoom: (s, a: PayloadAction<number>) => {
      s.zoom = a.payload;
    },
    setSelectedBlock: (s, a: PayloadAction<string>) => {
      s.selectedBlock = a.payload;
    },
    toggleBlock: (s, a: PayloadAction<string>) => {
      s.hiddenBlocks = s.hiddenBlocks.includes(a.payload)
        ? s.hiddenBlocks.filter((x) => x !== a.payload)
        : [...s.hiddenBlocks, a.payload];
    },
    loadBuilderTemplate: (s, a: PayloadAction<{ templateId: string; blocks: BuilderBlock[] }>) => {
      s.builderPast.push(s.builderBlocks);
      s.builderBlocks = a.payload.blocks;
      s.builderFuture = [];
      s.selectedTemplate = a.payload.templateId;
      s.selectedBlock = a.payload.blocks[0]?.id ?? "";
    },
    restoreBuilderDocument: (s, a: PayloadAction<BuilderBlock[]>) => {
      s.builderBlocks = a.payload;
      s.builderPast = [];
      s.builderFuture = [];
      s.selectedBlock = a.payload[0]?.id ?? "";
    },
    addBuilderBlock: (s, a: PayloadAction<BuilderBlock>) => {
      s.builderPast.push(s.builderBlocks);
      s.builderBlocks.push(a.payload);
      s.builderFuture = [];
      s.selectedBlock = a.payload.id;
    },
    insertBuilderBlock: (s, a: PayloadAction<{ block: BuilderBlock; index: number }>) => {
      s.builderPast.push(s.builderBlocks);
      const index = Math.max(0, Math.min(a.payload.index, s.builderBlocks.length));
      s.builderBlocks.splice(index, 0, a.payload.block);
      s.builderFuture = [];
      s.selectedBlock = a.payload.block.id;
    },
    updateBuilderBlock: (s, a: PayloadAction<{ id: string; changes: Partial<BuilderBlock> }>) => {
      const block = s.builderBlocks.find((item) => item.id === a.payload.id);
      if (!block) return;
      s.builderPast.push(s.builderBlocks.map((item) => ({ ...item })));
      Object.assign(block, a.payload.changes);
      if (
        !Object.hasOwn(a.payload.changes, "brandStyleLinked") &&
        ["fontFamily", "radius", "buttonStyle", "buttonShape"].some((key) =>
          Object.hasOwn(a.payload.changes, key),
        )
      )
        block.brandStyleLinked = false;
      s.builderFuture = [];
    },
    reorderBuilderBlocks: (s, a: PayloadAction<BuilderBlock[]>) => {
      s.builderPast.push(s.builderBlocks);
      s.builderBlocks = a.payload;
      s.builderFuture = [];
    },
    removeBuilderBlock: (s, a: PayloadAction<string>) => {
      s.builderPast.push(s.builderBlocks);
      const index = s.builderBlocks.findIndex((item) => item.id === a.payload);
      s.builderBlocks = s.builderBlocks.filter((item) => item.id !== a.payload);
      s.builderFuture = [];
      s.selectedBlock = s.builderBlocks[Math.max(0, index - 1)]?.id ?? "";
    },
    duplicateBuilderBlock: (s, a: PayloadAction<string>) => {
      const index = s.builderBlocks.findIndex((item) => item.id === a.payload);
      const block = s.builderBlocks[index];
      if (!block) return;
      s.builderPast.push(s.builderBlocks);
      const duplicate = {
        ...block,
        id: `${block.id}-copy-${Date.now()}`,
        label: `${block.label} copy`,
      };
      s.builderBlocks.splice(index + 1, 0, duplicate);
      s.builderFuture = [];
      s.selectedBlock = duplicate.id;
    },
    moveBuilderBlock: (s, a: PayloadAction<{ id: string; direction: -1 | 1 }>) => {
      const index = s.builderBlocks.findIndex((item) => item.id === a.payload.id);
      const destination = index + a.payload.direction;
      if (index < 0 || destination < 0 || destination >= s.builderBlocks.length) return;
      s.builderPast.push(s.builderBlocks);
      const [block] = s.builderBlocks.splice(index, 1);
      if (block) s.builderBlocks.splice(destination, 0, block);
      s.builderFuture = [];
    },
    undoBuilder: (s) => {
      const previous = s.builderPast.pop();
      if (!previous) return;
      s.builderFuture.unshift(s.builderBlocks);
      s.builderBlocks = previous;
      s.selectedBlock = previous[0]?.id ?? "";
    },
    redoBuilder: (s) => {
      const next = s.builderFuture.shift();
      if (!next) return;
      s.builderPast.push(s.builderBlocks);
      s.builderBlocks = next;
      s.selectedBlock = next[0]?.id ?? "";
    },
    setBuilderPublished: (s, a: PayloadAction<boolean>) => {
      s.builderPublished = a.payload;
    },
    setBuilderPalette: (s, a: PayloadAction<BrandState["builderPalette"]>) => {
      s.builderPalette = a.payload;
      s.builderBrandLinked = false;
    },
    setBuilderHeadingFont: (s, a: PayloadAction<BrandState["builderHeadingFont"]>) => {
      s.builderHeadingFont = a.payload;
      s.builderBrandLinked = false;
    },
    setBuilderBodyFont: (s, a: PayloadAction<BrandState["builderBodyFont"]>) => {
      s.builderBodyFont = a.payload;
      s.builderBrandLinked = false;
    },
    setBuilderButtonStyle: (s, a: PayloadAction<BrandState["builderButtonStyle"]>) => {
      s.builderButtonStyle = a.payload;
      s.builderBrandLinked = false;
    },
    deploy: (s) => {
      s.deployed = true;
      s.mode = "dashboard";
    },
    setDashboardModuleSections: (
      state,
      action: PayloadAction<Record<string, DashboardSection>>,
    ) => {
      state.dashboardModuleSections = action.payload;
    },
    setUserProfile: (
      state,
      action: PayloadAction<{
        uid: string;
        displayName: string;
        email: string;
        tier?: string;
      } | null>,
    ) => {
      state.userProfile = action.payload;
    },
  },
});

export const { actions } = slice;
export default slice.reducer;
