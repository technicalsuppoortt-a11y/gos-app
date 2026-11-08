import { createBrandElementContracts } from "./brandElementsShared.js";
import brandElementPrompt from "@/modules/brand-engine/configuration/prompts/brandElements.json" with { type: "json" };
// Browser-compatible AI schemas and validation; no credentials or Node runtime.
import brandIdentityPrompt from "@/modules/brand-engine/configuration/prompts/brandIdentity.json" with { type: "json" };
import fontCatalog from "@/modules/brand-engine/configuration/brandFontCatalog.json" with { type: "json" };

const arabicFonts = Object.keys(fontCatalog.arabic);
const fonts = [...Object.keys(fontCatalog.latin), ...arabicFonts];
const colorKeys = [
  "primary",
  "buttonBackground",
  "onPrimary",
  "secondary",
  "background",
  "surface",
  "text",
  "mutedText",
  "border",
  "footerBackground",
  "headerBackground",
  "success",
  "warning",
  "error",
  "focus",
];
const obj = (properties) => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});
const str = { type: "string" };
const choice = (values) => ({ type: "string", enum: values });
const normalizeMark = (mark) => mark === "geometric" ? "prism" : mark;
const colors = obj(
  Object.fromEntries(
    colorKeys.map((key) => [key, { type: "string", pattern: "^#[0-9a-fA-F]{6}$" }]),
  ),
);
const themeSchema = obj({
  version: { type: "integer", enum: [1] },
  paletteId: str,
  light: colors,
  dark: colors,
  typography: obj({
    heading: choice(fonts),
    body: choice(fonts),
    arabic: choice(arabicFonts),
  }),
  buttons: obj({
    variant: choice(["solid", "outline"]),
    shape: choice(["square", "rounded", "pill"]),
  }),
  appearance: obj({
    radius: { type: "number", minimum: 0, maximum: 32 },
    shadow: choice(["none", "soft"]),
    density: choice(["comfortable", "compact"]),
  }),
});
const candidateSchema = obj({
  name: str,
  arabicName: str,
  tagline: str,
  rationale: str,
  description: str,
  logo: obj({
    concept: { type: "string", maxLength: 400 },
    wordmark: obj({
      font: choice(fonts),
      weight: { type: "integer", enum: [400, 500, 600, 700, 800] },
      letterSpacing: { type: "number", minimum: -1, maximum: 4 },
      casing: choice(["original", "uppercase", "lowercase"]),
      separator: { type: "boolean" },
      descriptor: { type: "string", maxLength: 60 },
    }),
    paths: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: obj({
        d: { type: "string", maxLength: 1800 },
        fill: { type: "boolean" },
        strokeWidth: { type: "number", minimum: 0, maximum: 12 },
      }),
    },
  }),
  imageDirection: str,
  mark: choice(["prism", "flow", "serif", "nodes", "bilingual", "burst"]),
  theme: themeSchema,
});
const brandIdentitySchema = obj({
  candidates: { type: "array", minItems: 3, maxItems: 3, items: candidateSchema },
});
function validateConnection(input) {
  if (
    !input ||
    !["openai", "gemini"].includes(input.provider) ||
    typeof input.apiKey !== "string" ||
    input.apiKey.trim().length < 15 ||
    input.apiKey.length > 500 ||
    /[\r\n\x00]/.test(input.apiKey)
  )
    throw new Error("Invalid AI connection.");
  const model = String(input.model || "").replace(/^models\//, "");
  if (model && !/^[a-zA-Z0-9._-]{1,120}$/.test(model)) throw new Error("Invalid model.");
  return { provider: input.provider, apiKey: input.apiKey.trim(), model };
}
const bounded = (value, max = 2000) => (typeof value === "string" ? value.slice(0, max) : "");
const list = (value) =>
  Array.isArray(value)
    ? value
        .filter((v) => typeof v === "string")
        .slice(0, 15)
        .map((v) => bounded(v, 120))
    : [];
function discoveryContext(discovery = {}, configuration) {
  const selection = discovery.choices?.nicheSelection;
  const draft = discovery.choices?.discoverDraft || {};
  const profile = draft.profile;
  const fields = [
    "interests",
    "exclusions",
    "industries",
    "skills",
    "experience",
    "network",
    "market",
    "customMarket",
    "language",
    "selling",
    "time",
    "budget",
    "currency",
    "revision",
    "questionnaireVersion",
  ];
  const answers = profile
    ? Object.fromEntries(
        fields.filter((key) => profile[key] !== undefined).map((key) => [key, profile[key]]),
      )
    : null;
  if (profile && configuration && profile.questionnaireVersion !== configuration.version)
    throw new Error("The Discovery questionnaire version is unavailable.");
  const labels = {};
  if (answers && configuration)
    for (const key of fields) {
      if (!Array.isArray(configuration[key])) continue;
      const resolve = (id) => {
        const option = configuration[key].find((option) => option.id === id);
        return option ? { id, en: option.en, ar: option.ar } : { id, en: id, ar: id };
      };
      labels[key] = Array.isArray(answers[key])
        ? answers[key].map(resolve)
        : resolve(answers[key] || "");
    }
  const analysis =
    profile && draft.analysis?.profileRevision === profile.revision ? draft.analysis : null;
  const qualification =
    selection && draft.qualificationAnswers?.subNicheId === selection.subNicheId
      ? draft.qualificationAnswers
      : null;
  const catalogFields = [
    "buyerProfileEn",
    "buyerProfileAr",
    "dayToDayPainEn",
    "dayToDayPainAr",
    "coreProblemsEn",
    "coreProblemsAr",
    "desiredOutcomeEn",
    "desiredOutcomeAr",
    "goal",
    "gosSolutionEn",
    "gosSolutionAr",
    "whyEn",
    "whyAr",
    "ageRange",
  ];
  return {
    confirmedSelection: selection
      ? Object.fromEntries(
          [
            "nicheId",
            "subNicheId",
            "nicheNameEn",
            "nicheNameAr",
            "subNicheNameEn",
            "subNicheNameAr",
            "catalogVersion",
          ].map((key) => [key, selection[key] || ""]),
        )
      : null,
    catalogProfile: Object.fromEntries(
      catalogFields
        .filter((key) => selection?.profileSnapshot?.[key] !== undefined)
        .map((key) => [key, selection.profileSnapshot[key]]),
    ),
    profile: answers,
    optionLabels: labels,
    qualificationAnswers: qualification,
    analysis: analysis
      ? Object.fromEntries(
          [
            "status",
            "nicheId",
            "subNicheId",
            "profileRevision",
            "catalogVersion",
            "configurationVersion",
            "reasons",
            "tradeoffs",
            "problemSignals",
            "competition",
            "confidence",
            "sources",
          ]
            .filter((key) => analysis[key] !== undefined)
            .map((key) => [key, analysis[key]]),
        )
      : null,
  };
}
function effectiveBrandLocks(branding = {}) {
  const locks = { ...(branding.brandLocks || {}) };
  const placeholder =
    !branding.brandName?.trim() ||
    /^(brand name|your brand|اسم العلامة التجارية|اسم البراند)$/i.test(branding.brandName.trim());
  if (placeholder) {
    locks.name = false;
    const uploaded = branding.choices?.uploadedLogo;
    if (!uploaded || uploaded.origin === "generated_logo") locks.logo = false;
  }
  if (!placeholder) locks.name = true;
  locks.tagline = Boolean(branding.tagline?.trim());
  return locks;
}
function resolveIdentityLanguage(discovery = {}, branding = {}) {
  const requested = discovery.choices?.discoverDraft?.profile?.language;
  const normalize = (value) => {
    if (typeof value !== "string") return "";
    if (/^(ar|arabic|العربية|عربي)$/i.test(value.trim())) return "Arabic";
    if (/^(en|english|الإنجليزية|انجليزي)$/i.test(value.trim())) return "English";
    if (/^(bilingual|both|en-ar|عربي وإنجليزي)$/i.test(value.trim())) return "Bilingual";
    return "";
  };
  return (branding.choices?.brandLanguageConfirmed ? normalize(branding.brandLanguage) : "") || normalize(requested) || normalize(branding.brandLanguage) || "English";
}
function brandBrief(discovery = {}, branding = {}, configuration) {
  const selection = discovery.choices?.nicheSelection;
  const profile = selection?.profileSnapshot || {};
  const uploaded = branding.choices?.uploadedLogo;
  const brief = {
    niche: bounded(selection?.nicheNameEn || selection?.nicheNameAr || discovery.business),
    subNiche: bounded(selection?.subNicheNameEn || selection?.subNicheNameAr || discovery.subNiche),
    businessDescription: discovery.businessDescription || "",
    audience: discovery.targetAudience || branding.targetAudience || "",
    coreProblems: profile.coreProblemsEn || "",
    desiredOutcome: profile.desiredOutcomeEn || "",
    salesGoal: profile.goal || "",
    name: branding.brandName?.trim() || discovery.brandName?.trim() || "",
    arabicName: branding.selectedBrandIdentity?.arabicName || "",
    tagline: branding.tagline || "",
    language: resolveIdentityLanguage(discovery, branding),
    keywords: branding.brandKeywords || [],
    voices: branding.brandVoices || [],
    logoStyles: branding.logoStyles || [],
    theme: branding.brandTheme || null,
    palette: branding.brandPalette || "",
    font: branding.fontPersonality || "",
    // AI directions always generate fresh names, taglines, and typography;
    // visual locks remain application preferences for colors and logos.
    locks: effectiveBrandLocks(branding),
    uploadedLogo: Boolean(uploaded),
    manualLogo:
      uploaded && uploaded.origin !== "generated_logo"
        ? { assetId: uploaded.assetId || "", origin: uploaded.origin || "manual" }
        : null,
    selectedMark: branding.selectedBrandIdentity?.mark || "",
    previousDirections: (Array.isArray(branding.brandCandidates) ? branding.brandCandidates : [])
      .slice(0, 3)
      .map((candidate) => ({
        name: bounded(candidate?.name),
        tagline: bounded(candidate?.tagline),
        mark: bounded(candidate?.mark),
        primary: bounded(candidate?.theme?.light?.primary),
        font: bounded(candidate?.theme?.typography?.heading),
      })),
    discovery: discoveryContext(discovery, configuration),
    promptVersion: brandIdentityPrompt.version,
  };
  // Preserve complete answers; reject oversized inputs instead of silently truncating them.
  if (JSON.stringify(brief).length > 80000)
    throw new Error("The business brief exceeds the supported size.");
  return brief;
}
function brandGenerationFingerprint(discovery, branding, language, connectionRevision) {
  return JSON.stringify(
    {
      brief: brandBrief(discovery, branding),
      language,
      connectionRevision,
      promptVersion: brandIdentityPrompt.version,
    },
    (_key, value) =>
      value && typeof value === "object" && !Array.isArray(value)
        ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
        : value,
  );
}
function validateCandidates(result, requestId, { requireDesign = false, brief } = {}) {
  if (!result || !Array.isArray(result.candidates) || result.candidates.length !== 3)
    throw new Error("Expected three brand directions.");
  const candidates = result.candidates.map((c, index) => {
    if (
      !c ||
      typeof c.name !== "string" ||
      !c.name.trim() ||
      c.name.length > 160 ||
      typeof c.arabicName !== "string" ||
      c.arabicName.length > 160 ||
      typeof c.tagline !== "string" ||
      c.tagline.length > 300 ||
      typeof c.rationale !== "string" ||
      !c.rationale.trim() ||
      c.rationale.length > 2000 ||
      typeof c.imageDirection !== "string" ||
      c.imageDirection.length > 1000 ||
      !candidateSchema.properties.mark.enum.includes(normalizeMark(c.mark))
    )
      throw new Error("Invalid brand direction.");
    if (/^(brand name|your brand|اسم العلامة التجارية|اسم البراند)$/i.test(c.name.trim()))
      throw new Error("AI returned a placeholder brand name.");
    if (requireDesign && (!c.logo || typeof c.description !== "string" || !c.description.trim()))
      throw new Error("AI did not return a complete brand design.");
    if (requireDesign && brief && (!c.logo.wordmark || typeof c.logo.concept !== "string" || !c.logo.concept.trim()))
      throw new Error("AI did not return a complete logo lockup.");
    if (
      c.description !== undefined &&
      (typeof c.description !== "string" || c.description.length > 600)
    )
      throw new Error("Invalid brand description.");
    let logo;
    if (c.logo) {
      if (!Array.isArray(c.logo.paths) || (!c.logo.paths.length && !c.logo.wordmark) || c.logo.paths.length > 8)
        throw new Error("Invalid generated logo.");
      if (c.logo.wordmark !== undefined) {
        const w = c.logo.wordmark;
        if (!w || !fonts.includes(w.font) || ![400, 500, 600, 700, 800].includes(w.weight) ||
            !Number.isFinite(w.letterSpacing) || w.letterSpacing < -1 || w.letterSpacing > 4 ||
            !["original", "uppercase", "lowercase"].includes(w.casing) || typeof w.separator !== "boolean" ||
            typeof w.descriptor !== "string" || w.descriptor.length > 60)
          throw new Error("Invalid logo wordmark.");
      }
      if (c.logo.concept !== undefined && (typeof c.logo.concept !== "string" || c.logo.concept.length > 400))
        throw new Error("Invalid logo concept.");
      logo = {
        ...(c.logo.concept ? { concept: c.logo.concept.trim() } : {}),
        ...(c.logo.wordmark ? { wordmark: { ...c.logo.wordmark, descriptor: c.logo.wordmark.descriptor.trim() } } : {}),
        paths: c.logo.paths.map((path) => {
          if (
            !path ||
            typeof path.d !== "string" ||
            path.d.length > 1800 ||
            !/^[Mm][MmLlHhVvCcSsQqTtAaZz0-9eE,.+\s-]+$/.test(path.d) ||
            typeof path.fill !== "boolean" ||
            !Number.isFinite(path.strokeWidth) ||
            path.strokeWidth < 0 ||
            path.strokeWidth > 12 ||
            (!path.fill && !path.strokeWidth)
          )
            throw new Error("Invalid generated logo path.");
          const numbers = path.d.match(/[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?/g) || [];
          if (
            !numbers.length ||
            numbers.some(
              (value) => !Number.isFinite(Number(value)) || Math.abs(Number(value)) > 500,
            )
          )
            throw new Error("Invalid generated logo coordinates.");
          return { d: path.d, fill: path.fill, strokeWidth: path.strokeWidth };
        }),
      };
    }
    if (brief) {
      if (brief.locks?.name && brief.name.trim() && c.name.trim() !== brief.name.trim())
        throw new Error("AI changed the protected brand name.");
      if (brief.locks?.tagline && c.tagline.trim() !== brief.tagline.trim()) throw new Error("AI changed the protected tagline.");
      if (!brief.locks?.name && brief.language === "Arabic" && !/[\u0600-\u06ff]/.test(c.name))
        throw new Error("AI returned a name in the wrong brand language.");
      if (!brief.locks?.name && brief.language === "English" && /[\u0600-\u06ff]/.test(c.name))
        throw new Error("AI returned a name in the wrong brand language.");
      if (brief.language === "Arabic" && logo?.wordmark && !arabicFonts.includes(logo.wordmark.font))
        throw new Error("AI returned an unsuitable Arabic logo font.");
    }
    const t = c.theme && {
      ...c.theme,
      ...Object.fromEntries(["light", "dark"].map((mode) => [mode, {
        ...c.theme[mode],
        buttonBackground: c.theme[mode]?.buttonBackground ?? c.theme[mode]?.primary,
        onPrimary: "#11152D",
      }])),
    };
    if (!t || t.version !== 1 || typeof t.paletteId !== "string" || t.paletteId.length > 39)
      throw new Error("Invalid theme.");
    for (const mode of ["light", "dark"])
      for (const key of colorKeys)
        if (!/^#[0-9a-f]{6}$/i.test(t[mode]?.[key] || "")) throw new Error("Invalid theme color.");
    for (const mode of ["light", "dark"]) {
      t[mode].buttonBackground = "#FFFFFF";
      t[mode].onPrimary = "#11152D";
    }
    if (
      !fonts.includes(t.typography?.heading) ||
      !fonts.includes(t.typography?.body) ||
      !arabicFonts.includes(t.typography?.arabic) ||
      !["solid", "outline"].includes(t.buttons?.variant) ||
      !["square", "rounded", "pill"].includes(t.buttons?.shape) ||
      !Number.isFinite(t.appearance?.radius) ||
      t.appearance.radius < 0 ||
      t.appearance.radius > 32 ||
      !["none", "soft"].includes(t.appearance?.shadow) ||
      !["comfortable", "compact"].includes(t.appearance?.density)
    )
      throw new Error("Invalid theme controls.");
    return {
      id: `${requestId}-${index}`,
      name: c.name.trim(),
      arabicName: c.arabicName.trim(),
      tagline: c.tagline.trim(),
      rationale: c.rationale.trim(),
      ...(c.description ? { description: c.description.trim() } : {}),
      ...(logo ? { logo } : {}),
      imageDirection: c.imageDirection.trim(),
      mark: normalizeMark(c.mark),
      theme: t,
    };
  });
  if (brief && !brief.locks?.name && new Set(candidates.map((c) => c.name.toLocaleLowerCase())).size !== 3)
    throw new Error("AI returned repeated brand names; three distinct names are required.");
  if (brief && !brief.locks?.tagline && new Set(candidates.map((c) => c.tagline.trim().replace(/\s+/g, " ").toLocaleLowerCase())).size !== 3)
    throw new Error("AI returned repeated taglines; three distinct taglines are required.");
  if (brief && (
    new Set(candidates.map((c) => c.theme.paletteId)).size !== 3 ||
    new Set(candidates.map((c) => c.theme.light.primary.toLowerCase())).size !== 3
  )) throw new Error("AI returned repeated colors; three distinct color recommendations are required.");
  return candidates;
}
const generationInstruction = brandIdentityPrompt.instructions.join("\n");
const elementContracts = createBrandElementContracts({ fonts, obj, str, candidateSchema, themeSchema, validateCandidates, prompt: brandElementPrompt });
const { brandElementSchema, brandDirectionSchema, normalizeElementAnswers, themeFromCoreColors, validateElementSuggestions, adaptDirectionResult, elementInstruction, brandElementFingerprint, brandElementPromptVersion } = elementContracts;
export {
  brandElementSchema, brandDirectionSchema, normalizeElementAnswers, themeFromCoreColors, validateElementSuggestions, adaptDirectionResult, elementInstruction, brandElementFingerprint, brandElementPromptVersion,
  fonts,
  colorKeys,
  brandIdentitySchema,
  validateConnection,
  effectiveBrandLocks,
  resolveIdentityLanguage,
  brandBrief,
  brandGenerationFingerprint,
  validateCandidates,
  generationInstruction,
};
