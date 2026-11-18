import { store } from "@/modules/brand-engine/store";
import { serializeBrandPages } from "@/modules/brand-engine/data/brandPages";
import { catalogOrStarter } from "@/modules/brand-engine/configuration/catalog";
import questionnaire from "@/modules/brand-engine/configuration/discoveryQuestionnaire.json";
import brandPrompt from "@/modules/brand-engine/configuration/prompts/brandIdentity.json";
import {
  brandBrief,
  normalizeElementAnswers,
  themeFromCoreColors,
  adaptDirectionResult,
  validateElementSuggestions,
  validateCandidates,
  brandElementPromptVersion,
} from "@/modules/brand-engine/data/ai/brandStudioCore.js";
import {
  buildFallbackElementSuggestions,
  buildFallbackBrandDirections,
  buildFallbackDiscoveryAnalysis,
} from "@/modules/brand-engine/data/ai/aiResilientFallbacks.js";
import * as discoveryCore from "@/modules/brand-engine/data/ai/discoveryAnalysisCore.js";
import { normalizeDiscoveryCatalog } from "@/modules/brand-engine/data/ai/discoveryCore.js";

export async function invokeLocalPreviewAI(name, input = {}) {
  await new Promise((resolve) => setTimeout(resolve, 1350));
  const brandState = store.getState().brand;
  const serialized = serializeBrandPages(brandState);
  const discoveryParams = serialized.find((p) => p.pageId === "business_discovery")?.parameters ?? {};
  const brandingParams = serialized.find((p) => p.pageId === "branding")?.parameters ?? {};
  const requestId = String(input.requestId || crypto.randomUUID());

  if (name === "generateBrandElement") {
    const element = String(input.element || "name");
    const answers = normalizeElementAnswers(input.answers ?? {});
    const brief = brandBrief(discoveryParams, brandingParams, questionnaire);
    if (element === "name" && ["Arabic", "English"].includes(answers.preference)) {
      brief.language = answers.preference;
    }
    const prev =
      brandingParams.choices?.elementGenerations?.[element]?.suggestions ?? [];
    const fb = buildFallbackElementSuggestions(element, requestId, brief, answers, prev);
    const suggestions = validateElementSuggestions({ suggestions: fb }, element, requestId, brief, answers);
    return {
      suggestions,
      element,
      ...(element === "logo" ? { qualityStatus: "approved" } : {}),
      sourceRevision: null,
      discoveryRevision: null,
      inputFingerprint: input.inputFingerprint,
      promptVersion: brandElementPromptVersion,
      provider: "gemini",
      model: "gemini-2.5-flash",
    };
  }

  if (name === "generateBrandIdentity") {
    const brief = brandBrief(discoveryParams, brandingParams, questionnaire);
    const fb = buildFallbackBrandDirections(requestId, brief, themeFromCoreColors);
    const candidates = validateCandidates(
      adaptDirectionResult({ candidates: fb }, requestId, brief),
      requestId,
      { requireDesign: true, brief },
    );
    return {
      candidates,
      sourceRevision: "dev-preview",
      provider: "gemini",
      model: "gemini-2.5-flash",
      inputFingerprint: input.inputFingerprint,
      promptVersion: brandPrompt.version,
    };
  }

  if (name === "analyzeDiscoveryProfile") {
    const catalogRaw = catalogOrStarter(undefined, undefined);
    const catalog = catalogRaw
      ? normalizeDiscoveryCatalog(catalogRaw, { publishing: true })
      : { version: "starter-v1", subNiches: [] };
    const draftProfile =
      input.profile ||
      discoveryParams.choices?.discoverDraft?.profile ||
      {};
    let candidates = [];
    try {
      const normalizedProfile = discoveryCore.normalizeProfile(draftProfile);
      candidates = discoveryCore.eligibleCandidates(catalog, normalizedProfile);
    } catch {
      candidates = catalog.subNiches ?? [];
    }
    return buildFallbackDiscoveryAnalysis(
      requestId,
      draftProfile,
      candidates,
      catalog,
      String(input.language || "en"),
    );
  }

  return {};
}
