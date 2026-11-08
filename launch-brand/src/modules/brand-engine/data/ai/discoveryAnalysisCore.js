
import defaults from "@/modules/brand-engine/configuration/discoveryQuestionnaire.json" with { type: "json" };
import discoveryPrompt from "@/modules/brand-engine/configuration/prompts/businessDiscovery.json" with { type: "json" };
const PROMPT_VERSION = discoveryPrompt.version;
const fail = (condition, message) => { if (!condition) throw new Error(message); };
const text = (value, max = 400) => typeof value === "string" && value.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
function normalizeProfile(value) {
  fail(value?.schemaVersion === 1, "Invalid profile version.");
  const result = { schemaVersion: 1 };
  for (const key of ["interests", "exclusions", "industries", "skills"]) {
    fail(Array.isArray(value[key]) && value[key].length <= 20 && value[key].every(item => text(item, 100) && item.trim()), `Invalid ${key}.`);
    result[key] = [...new Set(value[key].map(item => item.trim()))];
  }
  for (const key of ["revision", "questionnaireVersion", "experience", "network", "market", "language", "selling", "time", "budget", "currency"])
    { fail(text(value[key], ["experience", "network"].includes(key) ? 400 : 120), `Invalid ${key}.`); result[key] = value[key].trim(); }
  fail(result.interests.length && result.skills.length && result.market && result.time && result.budget, "Complete your profile first.");
  if (result.market === "custom") { fail(text(value.customMarket, 100) && value.customMarket.trim(), "Name your custom market."); result.market = value.customMarket.trim(); }
  fail(["ar", "en", "both"].includes(result.language) && ["b2b", "b2c", "both"].includes(result.selling), "Choose languages and selling preference.");
  if (value.defaultLanguage !== undefined && value.defaultLanguage !== "") {
    fail(["ar", "en"].includes(value.defaultLanguage), "Choose a default language.");
    result.defaultLanguage = result.language === "both" ? value.defaultLanguage : result.language;
  }
  fail(/^[A-Z]{3}$/.test(result.currency), "Choose a currency.");
  fail(!result.interests.some(item => result.exclusions.includes(item)), "An interest is also excluded.");
  return result;
}
function validateConfiguration(value) {
  fail(value?.schemaVersion === 1 && text(value.version, 80) && /^[a-zA-Z0-9._-]+$/.test(value.version), "Invalid configuration version.");
  fail(typeof value.researchEnabled === "boolean" && Number.isInteger(value.dailyLimit) && value.dailyLimit >= 1 && value.dailyLimit <= 100, "Invalid research policy.");
  fail(text(value.instruction, 6000) && value.instruction.trim(), "Provide an AI instruction.");
  const result = { schemaVersion: 1, version: value.version, researchEnabled: value.researchEnabled, dailyLimit: value.dailyLimit, instruction: value.instruction };
  for (const key of ["interests", "skills", "markets", "timeRanges", "budgetRanges"]) {
    fail(Array.isArray(value[key]) && value[key].length >= 1 && value[key].length <= 30, `Invalid ${key}.`);
    const ids = new Set();
    result[key] = value[key].map(option => {
      fail(text(option?.id, 80) && option.id && text(option.en, 100) && option.en.trim() && text(option.ar, 100) && option.ar.trim() && !ids.has(option.id), `Invalid ${key} option.`);
      ids.add(option.id); return { id: option.id, en: option.en, ar: option.ar };
    });
  }
  return result;
}
const exclusionTerms = { health: ["clinic", "dental", "physiotherapy"], fitness: ["fitness", "gym"], education: ["education"], "real-estate": ["real estate", "property"], professional: ["consulting", "professional"], ecommerce: ["e-commerce", "product brands"], beauty: ["beauty", "aesthetic", "skincare"], finance: ["finance", "investment"], coaching: ["coaching", "consulting"], hospitality: ["restaurant", "hospitality"], local: ["local services"] };
function eligibleCandidates(catalog, profile) {
  return catalog.subNiches.filter(sub => sub.status === "active" && catalog.niches.some(niche => niche.id === sub.nicheId && niche.status === "active"))
    .filter(sub => {
      const haystack = `${sub.nameEn} ${sub.nameAr} ${catalog.niches.find(niche => niche.id === sub.nicheId)?.nameEn || ""}`.toLowerCase();
      return !profile.exclusions.some(exclusion => (exclusionTerms[exclusion] || [exclusion.toLowerCase()]).some(term => haystack.includes(term)));
    }).map(sub => ({ id: sub.id, nicheId: sub.nicheId, name: sub.nameEn, niche: catalog.niches.find(n => n.id === sub.nicheId).nameEn, audience: sub.targetAudienceEn, buyer: sub.buyerProfileEn, problem: sub.coreProblemsEn, outcome: sub.desiredOutcomeEn, goal: sub.goal }));
}
const recommendationSchema = {
  type: "object", additionalProperties: false,
  required: ["status", "nicheId", "subNicheId", "reasons", "tradeoffs", "problemSignals", "competition", "confidence", "clarification"],
  properties: {
    status: { type: "string", enum: ["recommended", "needs_clarification"] },
    nicheId: { type: ["string", "null"] }, subNicheId: { type: ["string", "null"] },
    reasons: { type: "array", items: { type: "string" }, maxItems: 3 },
    tradeoffs: { type: "array", items: { type: "string" }, maxItems: 3 },
    problemSignals: { type: "array", items: { type: "string" }, maxItems: 3 },
    competition: { type: "string", enum: ["low", "medium", "high", "unknown"] },
    confidence: { type: "string", enum: ["low", "medium", "high"] }, clarification: { type: "string" },
    audienceSources: { type: "array", maxItems: 8, items: {
      type: "object", additionalProperties: false,
      required: ["title", "sourceIndex", "kind", "country", "reason"],
      properties: {
        title: { type: "string" }, url: { type: "string" },
        sourceIndex: { type: "integer", minimum: 0 },
        kind: { type: "string", enum: ["company", "group"] },
        country: { type: "string" }, reason: { type: "string" },
      },
    } },
  },
};
function validateRecommendation(value, candidates, researched) {
  fail(value && Object.keys(value).every(key => Object.hasOwn(recommendationSchema.properties, key)), "Invalid recommendation fields.");
  fail(["recommended", "needs_clarification"].includes(value.status), "Invalid recommendation status.");
  for (const field of ["reasons", "tradeoffs", "problemSignals"])
    fail(Array.isArray(value[field]) && value[field].length <= 3 && value[field].every(item => text(item, 500)), "Invalid recommendation explanation.");
  fail(["low", "medium", "high", "unknown"].includes(value.competition) && ["low", "medium", "high"].includes(value.confidence) && text(value.clarification, 500), "Invalid recommendation evidence.");
  if (value.status === "recommended") {
    fail(candidates.some(item => item.id === value.subNicheId && item.nicheId === value.nicheId) && value.reasons.length, "AI returned an unavailable market or wrong parent niche.");
  } else fail(value.nicheId === null && value.subNicheId === null && value.clarification.trim(), "Invalid clarification.");
  return { ...value, competition: researched ? value.competition : "unknown", confidence: researched ? value.confidence : "low", problemSignals: researched ? value.problemSignals : [] };
}
async function recommendFromCatalog(generate, request, candidates, researched) {
  const contract = "This is the final selection step, not a research report. Select exactly one supplied candidates entry. Copy its nicheId to nicheId and its id to subNicheId exactly; never use display names as IDs. Return only one JSON object with status, nicheId, subNicheId, reasons, tradeoffs, problemSignals, competition, confidence, clarification and audienceSources. Explanations are arrays with at most 3 strings, each under 350 characters. Use an empty clarification string for recommended. Extract up to 8 audienceSources from researchEvidence for ONLY the selected candidate and requested geography, each with title, sourceIndex, kind (company/group), country and reason under 120 characters. Omit url: the app attaches the original citation URL using sourceIndex; omit uncertain matches, unrelated references or unsupported geography. Never invent links or buying intent. If no choice is justified, use needs_clarification, null IDs, empty audienceSources and one clarification question.";
  let diagnostic = "discovery-invalid-response";
  for (let attempt = 0; attempt < 2; attempt++) {
    let response;
    try {
      response = await generate({ ...request, instruction: `${request.instruction}\n${contract}${attempt ? "\nThe previous answer failed validation (" + diagnostic + "). Return compact JSON: at most 2 short reasons, one tradeoff, one problemSignal and 3 audienceSources. Use sourceIndex without URLs. Copy the exact approved parent/child IDs from candidates." : ""}` });
    } catch (error) {
      if (error?.diagnostic !== "provider-output-limit" || attempt) throw error;
      diagnostic = "provider-output-limit";
      continue;
    }
    let value;
    try { value = JSON.parse(response.text); }
    catch { diagnostic = "discovery-invalid-json"; }
    if (value !== undefined) {
      try { return validateRecommendation(value, candidates, researched); }
      catch (error) { diagnostic = /unavailable market|wrong parent/.test(error.message) ? "discovery-invalid-market" : "discovery-invalid-response"; }
    }
  }
  throw Object.assign(new Error("Discovery recommendation failed validation after correction."), { code: "ai/unavailable", diagnostic });
}
function safeSources(sources = []) {
  const seen = new Set();
  return sources.filter(source => {
    try { const url = new URL(source.url); if (url.protocol !== "https:" || url.username || url.password || seen.has(url.href)) return false; seen.add(url.href); return true; } catch { return false; }
  }).slice(0, 10).map(source => ({ title: String(source.title || "Source").slice(0, 200), url: source.url.slice(0, 2000) }));
}
const instruction = discoveryPrompt.instructions.join(" ");
const researchInstruction = discoveryPrompt.researchInstructions.join(" ");
function audienceSources(response) {
  const cited = new Set(safeSources(response.sources).map(source => new URL(source.url).href));
  let parsed;
  try { parsed = JSON.parse(response.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")); }
  catch { return []; }
  if (!Array.isArray(parsed?.sources)) return [];
  // Use the provider citation index when present. Models may otherwise rewrite
  // a grounding redirect into a canonical URL that cannot be matched exactly.
  parsed.sources = parsed.sources.map(source => {
    if (!source || source.sourceIndex === undefined) return source;
    const citation = Number.isInteger(source.sourceIndex) && response.sources?.[source.sourceIndex];
    return citation ? { ...source, url: citation.url } : null;
  });
  const valid = parsed.sources.filter(source => {
    try {
      return ["company", "group"].includes(source?.kind) && text(source.title, 200) && source.title.trim()
        && text(source.country, 120) && source.country.trim() && text(source.reason, 500) && source.reason.trim()
        && cited.has(new URL(source.url).href);
    } catch { return false; }
  });
  return safeSources(valid).slice(0, 8).map(source => {
    const detail = valid.find(item => item.url === source.url);
    return { ...source, kind: detail.kind, country: detail.country, reason: detail.reason };
  });
}
const fingerprint = async (value) => Array.from(new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value))))).map(byte => byte.toString(16).padStart(2,"0")).join("");
export { defaults, PROMPT_VERSION, normalizeProfile, validateConfiguration, eligibleCandidates, recommendationSchema, validateRecommendation, recommendFromCatalog, safeSources, instruction, researchInstruction, audienceSources, fingerprint };
