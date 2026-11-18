import { loadBrowserConnection, loadSavedPlatformCredential, browserConnectionActions, browserConnectionAction } from "./browserAIConnections.js";
import { trackedBrowserConnection, recordBrowserOperation } from "./browserUsage.js";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "@/modules/brand-engine/firebase";
import { catalogOrStarter } from '../configuration/catalog';
import { isActivePlatformMember, isPlatformAdmin } from '../data/platformAccess';
import { aiFailure, providerModels, generateProviderText } from "./directProvider.js";
import { validateBrandLogoArtwork, validateBrandLogoDiversity } from "./brandLogo.ts";
import { reviewBrandLogoQuality } from "./logoQualityReview.js";
import { logoAttemptLimit, reserveLogoAttempt, finishLogoAttempt } from "./logoAttempts.js";
import { readLogoHistory } from "./logoHistory.js";
import { where } from "firebase/firestore";
import { generateRasterLogo } from "./logoImageWorkflow.js";
// Logos are generated as vectors (SVG paths) so they can draw themselves in the
// chosen identity colors. The raster image workflow is kept intact; set this to
// "raster" to switch back to it.
const LOGO_OUTPUT = "vector";
import { logoImageModelFor } from "./logoImageProvider.js";
import {
  brandBrief,
  brandGenerationFingerprint,
  brandIdentitySchema,
  generationInstruction,
  validateCandidates,
  brandElementSchema,
  brandDirectionSchema,
  normalizeElementAnswers,
  themeFromCoreColors,
  validateElementSuggestions,
  adaptDirectionResult,
  elementInstruction,
  brandElementFingerprint,
  brandElementPromptVersion,
} from "@/modules/brand-engine/data/ai/brandStudioCore.js";
import {
  extractJsonPayload,
  repairElementSuggestionsPayload,
  repairDirectionCandidatesPayload,
  buildFallbackElementSuggestions,
  buildFallbackBrandDirections,
  repairOrFallbackDiscoveryContent,
} from "@/modules/brand-engine/data/ai/aiResilientFallbacks.js";
import {
  normalizeDiscoveryCatalog,
  resolveDiscoveryBrief,
  discoveryContentSchema,
  validateDiscoveryContent,
  discoveryContentInstruction,
} from "@/modules/brand-engine/data/ai/discoveryCore.js";
import {
  brandContext,
  workspaceContext,
  workspacePageIds,
  systemInstruction,
  validateRequest,
} from "@/modules/brand-engine/data/ai/copilotCore.js";
import questionnaire from "@/modules/brand-engine/configuration/discoveryQuestionnaire.json";
import brandPrompt from "@/modules/brand-engine/configuration/prompts/brandIdentity.json";
import logoReferences from "@/modules/brand-engine/configuration/prompts/brandLogoReferences.json";
import { logoDesignReferences } from "../data/ai/logoDesignReferences.js";
import { createLogoReferenceParts, logoReferenceIdentities } from "./logoReferenceBoard.ts";
import { discoveryActions, discoveryAction } from "./directDiscovery.js";

const current = () => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw aiFailure("unauthenticated", "Sign in to use AI.");
  return uid;
};
const unchanged = (uid) => {
  if (current() !== uid) throw aiFailure("unauthenticated", "The signed-in account changed.");
};
async function account(adminOnly = false) {
  const uid = current(),
    profile = (await getDoc(doc(db, "users", uid))).data();
  unchanged(uid);
  if (
    !isActivePlatformMember(profile) ||
    (adminOnly && !isPlatformAdmin(profile))
  )
    throw aiFailure("permission-denied", "Your account cannot perform this action.");
  return uid;
}
async function savedConnection(uid, context = {}) {
  return loadBrowserConnection(uid, context);
}
async function checked(input, uid) {
  let connection = {
    ...input,
    apiKey: input.apiKey.trim(),
    model: String(input.model || "").replace(/^models\//, ""),
  };
  const available = await providerModels(connection);
  connection.model = available.model;
  connection = trackedBrowserConnection({ ...connection, source: "platform" }, uid);
  await generateProviderText(
    { ...connection, systemInstructions: "" },
    {
      instruction: "Reply with OK only.",
      contents: [{ role: "user", parts: [{ text: "Connection test" }] }],
      maxTokens: 1024,
      connectionTest: true,
    },
  );
  return { connection, models: available.models };
}
function settings(input) {
  const value = {
    systemInstructions: input.systemInstructions ?? "You are an expert AI business builder.",
    maxOutputTokens: input.maxOutputTokens ?? 5000,
    dailyUserLimit: input.dailyUserLimit ?? 50,
    dailyGlobalLimit: input.dailyGlobalLimit ?? 500,
  };
  if (typeof value.systemInstructions !== "string" || value.systemInstructions.length > 8000)
    throw aiFailure("invalid-argument", "Invalid system instructions.");
  for (const [field, min, max] of [
    ["maxOutputTokens", 128, 16384],
    ["dailyUserLimit", 1, 500],
    ["dailyGlobalLimit", 1, 10000],
  ])
    if (!Number.isInteger(value[field]) || value[field] < min || value[field] > max)
      throw aiFailure("invalid-argument", "Invalid usage limits.");
  return value;
}
async function pages(uid, ids = ["business_discovery", "branding"]) {
  const results = await Promise.all(ids.map((id) => getDoc(doc(db, "users", uid, "pages", id))));
  unchanged(uid);
  return results.map((item, index) => ({
    pageId: ids[index],
    parameters: item.data()?.parameters || {},
    revision: item.data()?.revision,
    exists: item.exists(),
  }));
}
async function task(uid, id, kind, connection, operation, inputFingerprint = null, logoAttempt = false) {
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(id || "")) throw aiFailure("invalid-argument", "Invalid request identifier.");
  const job = doc(db, "users", uid, "aiJobs", id), lease = crypto.randomUUID(), startedAt = Date.now();
  const historicalRequestIds = logoAttempt ? readLogoHistory((await getDocs(query(
    collection(db, "users", uid, "aiJobs"), where("kind", "==", "generateBrandElement"),
  ))).docs.map(item => ({ id: item.id, data: item.data() }))).requestIds : [];
  unchanged(uid);
  let logoSlot;
  const cached = await runTransaction(db, async tx => {
    const previous = (await tx.get(job)).data(); unchanged(uid);
    if (previous && (previous.kind !== kind || (previous.inputFingerprint ?? null) !== inputFingerprint)) throw aiFailure("invalid-argument", "Request identifier already used for other inputs.");
    if (previous?.status === "complete") return previous.result;
    if (["running", "unknown"].includes(previous?.status)) throw Object.assign(aiFailure("already-exists", "The outcome is pending or unknown. Do not automatically regenerate."), { diagnostic: "provider-timeout" });
    if (logoAttempt) {
      const slots = Array.from({ length: logoAttemptLimit }, (_, i) => doc(db, "users", uid, "logoGenerationCredits", String(i + 1)));
      logoSlot = await reserveLogoAttempt(tx, slots, id, serverTimestamp(), historicalRequestIds, lease);
      unchanged(uid);
    }
    tx.set(job, { kind, lease, inputFingerprint, status: "running", stage: "profile", startedAt }); return null;
  });
  if (cached) return cached;
  let result;
  const progress = async (stage, preview) => {
    await runTransaction(db, async tx => {
      const saved = (await tx.get(job)).data(); unchanged(uid);
      if (saved?.lease !== lease || saved.status !== "running") return;
      // A validated vector draft may be shown while quality review runs. Only
      // status=complete exposes final suggestions to history/attempt accounting.
      tx.set(job, { ...saved, stage,
        ...(preview ? { result: { element: 'logo', preview } }
          : stage === 'generating' && saved.result?.preview ? { result: null } : {}),
      });
    });
  };
  try { result = await operation(progress); unchanged(uid); }
  catch (error) {
    const status = ["provider-timeout", "provider-network", "usage-persistence", "provider-invalid-response"].includes(error.diagnostic) ? "unknown" : "failed";
    if (auth.currentUser?.uid === uid) await runTransaction(db, async tx => {
      const saved = (await tx.get(job)).data(); if (saved?.lease !== lease) return;
      if (logoSlot) await finishLogoAttempt(tx, logoSlot, lease, false);
      tx.set(job, { ...saved, status, completedAt: Date.now() });
    }).catch(() => {});
    await recordBrowserOperation(uid, id, kind, status, startedAt).catch(() => {});
    throw error;
  }
  await runTransaction(db, async tx => {
    const previous = await tx.get(job); unchanged(uid);
    if (previous.data()?.lease !== lease) throw aiFailure("already-exists", "The request changed.");
    if (logoSlot) await finishLogoAttempt(tx, logoSlot, lease, !['pending', 'rejected'].includes(result.qualityStatus));
    tx.set(job, { ...previous.data(), status: "complete", stage: "complete", result, completedAt: Date.now() });
  });
  await recordBrowserOperation(uid, id, kind, "complete", startedAt).catch(() => {});
  return result;
}
async function copilot(uid, input, connection) {
  validateRequest(input);
  const conversation = doc(db, "users", uid, "conversations", input.conversationId),
    reply = doc(
      db,
      "users",
      uid,
      "conversations",
      input.conversationId,
      "messages",
      `reply-${input.messageId}`,
    );
  const existing = await getDoc(reply);
  if (existing.exists()) return { messageId: existing.id };
  const [contextPages, history] = await Promise.all([
    pages(uid, workspacePageIds),
    getDocs(
      query(
        collection(db, "users", uid, "conversations", input.conversationId, "messages"),
        orderBy("createdAt", "desc"),
        limit(30),
      ),
    ),
  ]);
  const ordered = history.docs.reverse(),
    index = ordered.findIndex((item) => item.id === input.messageId);
  if (index < 0 || ordered[index].data().role !== "user")
    throw aiFailure("failed-precondition", "Conversation message not found.");
  const contents = ordered
    .slice(0, index + 1)
    .map((item) => ({
      role: item.data().role === "assistant" ? "model" : "user",
      parts: [{ text: String(item.data().content || "Review the attachment.").slice(0, 24000) }],
    }));
  const attachments = ordered[index].data().attachments || [];
  if (attachments.length > 3) throw aiFailure("invalid-argument", "Too many attachments.");
  for (const attachment of attachments) {
    if (!/^[a-zA-Z0-9-]{1,80}$/.test(attachment.assetId || ""))
      throw aiFailure("invalid-argument", "Invalid attachment.");
    const asset = (await getDoc(doc(db, "users", uid, "assets", attachment.assetId))).data();
    if (
      !asset ||
      !["image/png", "image/jpeg", "image/webp"].includes(asset.contentType) ||
      typeof asset.dataUrl !== "string" ||
      asset.dataUrl.length > 420000
    )
      throw aiFailure("invalid-argument", "Attachment unavailable.");
    contents
      .at(-1)
      .parts.push({
        inlineData: { mimeType: asset.contentType, data: asset.dataUrl.split(",")[1] },
      });
  }
  const context = {
    ...brandContext(
      contextPages.find((p) => p.pageId === "branding")?.parameters,
      contextPages.find((p) => p.pageId === "business_discovery")?.parameters,
    ),
    workspace: workspaceContext(contextPages),
  };
  const result = await task(uid, input.messageId, "copilot", connection, async () => {
    const generated = await generateProviderText(connection, {
      instruction: systemInstruction(context, input.language, input.mode),
      contents,
      mode: input.mode,
      maxTokens: input.mode === "research" ? 4000 : 2000,
    });
    return {
      content:
        `${generated.text}${generated.sources.length ? `\n\nSources:\n${generated.sources.map((source) => `${source.title}\n${source.url}`).join("\n\n")}` : ""}`.slice(
          0,
          24000,
        ),
    };
  });
  unchanged(uid);
  const batch = writeBatch(db);
  batch.set(reply, {
    role: "assistant",
    content: result.content,
    attachments: [],
    createdAt: serverTimestamp(),
    requestId: input.messageId,
  });
  batch.update(conversation, { updatedAt: serverTimestamp() });
  await batch.commit();
  return { messageId: reply.id };
}
export async function invokeDirectAI(name, input) {
  const uid = await account(
    [
      "testAIConnection",
      "saveAIConnection",
      "disconnectAIConnection",
      "saveDiscoveryConfiguration",
      "publishDiscoveryConfiguration",
      "getDiscoveryActivity",
      "setPlatformAIPaused",
    ].includes(name) ||
      (name === "getDiscoveryConfiguration" && input.draft) ||
      (name === "analyzeDiscoveryProfile" && input.preview),
  );
  if (browserConnectionActions.includes(name)) return browserConnectionAction(name, input, uid);
  if (discoveryActions.includes(name) && !["analyzeDiscoveryProfile", "translateDiscoveryAnalysis"].includes(name))
    return discoveryAction(name, input, uid);
  if (name === "disconnectAIConnection") {
    const batch = writeBatch(db);
    batch.delete(doc(db, "tenants", "global"));
    batch.delete(doc(db, "aiConnections", "default"));
    batch.set(doc(db, "aiAdminAudit", crypto.randomUUID()), { uid, action: "disconnect-platform", createdAt: serverTimestamp() });
    await batch.commit();
    return { disconnected: true };
  }
  if (["testAIConnection", "saveAIConnection"].includes(name)) {
    const options = settings(input);
    let apiKey = (input.apiKey || "").trim();
    if (!apiKey) {
      apiKey = await loadSavedPlatformCredential(uid, input.provider);
    }
    const { connection, models } = await checked({ ...input, ...options, apiKey }, uid);
    unchanged(uid);
    const metadata = {
      ...options,
      provider: connection.provider,
      models,
      model: connection.model,
      keyLast4: apiKey.slice(-4),
      status: "connected",
      revision: crypto.randomUUID(),
      capabilities: { text: true, images: true },
      testedAt: serverTimestamp(),
      aiPaused: false,
    };
    {
      const batch = writeBatch(db);
      batch.set(doc(db, "tenants", "global"), {
        ...metadata,
        openaiApiKey: connection.provider === "openai" ? apiKey : "",
        geminiApiKey: connection.provider === "gemini" ? apiKey : "",
      });
      batch.set(doc(db, "aiConnections", "default"), metadata);
      batch.set(doc(db, "aiAdminAudit", crypto.randomUUID()), { uid, action: "save-platform", provider: connection.provider, model: connection.model, createdAt: serverTimestamp() });
      await batch.commit();
    }
    return { ...metadata, models };
  }
  const operationNames = { analyzeDiscoveryProfile: "discovery_analysis", translateDiscoveryAnalysis: "translation", brandCopilot: "copilot", generateBrandIdentity: "branding", generateBrandElement: "branding", generateDiscoveryContent: "discovery_content", aiCenterChat: "chat" };
  const connection = await savedConnection(
    uid,
    { operation: operationNames[name] || name, requestId: input.requestId || input.messageId || input.analysisId },
  );
  if (["analyzeDiscoveryProfile", "translateDiscoveryAnalysis"].includes(name))
    return discoveryAction(name, input, uid, connection, task);
  if (name === "brandCopilot") return copilot(uid, input, connection);
  if (name === "generateBrandIdentity" || name === "generateBrandElement") {
    const [discovery, branding] = await pages(uid);
    if (!discovery.exists || !branding.exists)
      throw aiFailure("failed-precondition", "Save your business brief and brand first.");
    const element = name === "generateBrandElement" ? input.element : null;
    const answers = element ? normalizeElementAnswers(input.answers) : null;
    const baseFingerprint = brandGenerationFingerprint(
      discovery.parameters,
      branding.parameters,
      input.language,
      connection.revision,
    );
    const fingerprint = element ? brandElementFingerprint(baseFingerprint, element, answers) : baseFingerprint;
    if (input.inputFingerprint !== fingerprint)
      throw aiFailure(
        "failed-precondition",
        "Your brand or Discovery answers changed. Save and generate again.",
      );
    const version = discovery.parameters.choices?.discoverDraft?.profile?.questionnaireVersion;
    let configuration = questionnaire;
    if (version && version !== questionnaire.version) {
      if (!/^[a-zA-Z0-9._-]{1,80}$/.test(version))
        throw aiFailure("invalid-argument", "Invalid questionnaire version.");
      const release = await getDoc(doc(db, "discoverySettingsVersions", version));
      if (!release.exists())
        throw aiFailure(
          "failed-precondition",
          "The Discovery questionnaire version is unavailable.",
        );
      configuration = release.data();
    }
    const brief = brandBrief(discovery.parameters, branding.parameters, configuration);
    // The generator's current selection takes precedence over saved Discovery language.
    if (element === "name" && ["Arabic", "English"].includes(answers.preference))
      brief.language = answers.preference;
    if (element === "logo" && (!brief.name?.trim() || /^(brand name|your brand|اسم البراند|اسم العلامة التجارية)$/i.test(brief.name.trim())))
      throw aiFailure("failed-precondition", "Choose your brand name before generating a logo.");
    const previousElementSuggestions = element
      ? (branding.parameters.choices?.elementGenerations?.[element]?.suggestions || [])
      : [];
    const logoPalette = [
      brief.theme?.light?.primary,
      brief.theme?.light?.secondary,
      brief.theme?.light?.buttonBackground,
    ].filter(color => /^#[0-9a-f]{6}$/i.test(color || ""));

    return task(
      uid,
      input.requestId,
      name,
      connection,
      async (progress) => {
        await progress("generating");
        const logoReferenceParts = element === "logo" ? await createLogoReferenceParts(brief) : [];
        if (element === "logo" && LOGO_OUTPUT === "raster" && ["gemini", "openai"].includes(connection.provider)) {
          const imageConnection = trackedBrowserConnection({ ...connection, model: logoImageModelFor(connection.provider), request: undefined }, uid,
            { requestId: input.requestId, operation: "branding" });
          const result = await generateRasterLogo({ uid, requestId: input.requestId, brief, answers,
            imageConnection, reviewConnection: connection, referenceParts: logoReferenceParts,
            previousSuggestions: previousElementSuggestions,
            progress, generateReview: generateProviderText,
          });
          return { ...result, element, sourceRevision: branding.revision || null,
            discoveryRevision: discovery.revision || null, inputFingerprint: fingerprint,
            promptVersion: brandElementPromptVersion };
        }
        const generationOptions = {
          instruction: element ? elementInstruction : generationInstruction,
          contents: [
            {
              role: "user",
              parts: [
                ...logoReferenceParts,
                ...(!element ? logoReferences.images : []).flatMap((reference) => [
                  { text: `Visual style reference: ${reference.label}. Do not copy this brand.` },
                  { inlineData: { mimeType: reference.mimeType, data: reference.data } },
                ]),
                {
                  text: JSON.stringify({
                    uiLanguage: input.language === "ar" ? "Arabic" : "English",
                    brief,
                    ...(element ? {
                      element,
                      elementAnswers: answers,
                      ...(element === "logo" ? { logoRequirements: {
                        userInstructions: answers.detail,
                        priority: "Create exactly ONE finished logo. Apply the user's composition, symbol ideas and exclusions. For name-only requests return paths: [] and resolved lettering; do not add any symbol, monogram, separator or descriptor.",
                        outputTokenLimit: Math.min(16384, Math.max(connection.maxOutputTokens || 5000, 12288)),
                        maxPathsPerLogo: 8,
                        maxPathCharacters: 1800,
                        guidance: "Spend the entire design budget on ONE finished business identity, matching the supplied alternatives board's craft. Use as many paths as the construction needs; never simplify to a stock primitive. Rendered results undergo visual art-direction review and weak designs are rejected.",
                      } } : {}),
                      ...(element === "logo" ? { designReferences: logoDesignReferences(answers.preference) } : {}),
                      ...(element === "name" ? (() => {
                        const discoveryInterests = Array.isArray(brief.discovery?.optionLabels?.interests)
                          ? brief.discovery.optionLabels.interests
                              .map((item) => (brief.language === "Arabic" ? item.ar || item.en : item.en || item.ar))
                              .filter(Boolean)
                          : [];
                        const autoBusinessField = [brief.subNiche, brief.niche, ...discoveryInterests].filter(Boolean).join(" · ");
                        return {
                          nameRequirements: {
                            count: 3,
                            language: brief.language,
                            exactWordCount: answers.nameLength === "one" ? 1 : 2,
                            businessField: answers.interest || autoBusinessField,
                            selectedMarket: brief.niche || "",
                            selectedSpecialization: brief.subNiche || "",
                            selectedInterests: discoveryInterests,
                            style: answers.detail,
                          },
                        };
                      })() : {}),
                      previousSuggestions: element === "name"
                        ? previousElementSuggestions.slice(-100).map(({ name }) => ({ name }))
                        : previousElementSuggestions,
                    } : {}),
                    metadata: {
                      discoveryRevision: discovery.revision || null,
                      brandingRevision: branding.revision || null,
                      promptVersion: element ? brandElementPromptVersion : brandPrompt.version,
                    },
                  }),
                },
              ],
            },
          ],
          schema: element ? brandElementSchema(element) : brandDirectionSchema,
          maxTokens: element === "name" ? 5000 : element && element !== "logo" ? 4096 : 16384,
          thinkingBudget: element === "logo" ? 1536 : 768,
        };

        let requestOptions = generationOptions;
        let candidates, suggestions, qualityStatus = "approved";

        for (let attempt = 0; attempt < 2; attempt++) {
          let generated;
          try {
            generated = await generateProviderText(connection, requestOptions);
            await progress("validating");
            const rawParsed = extractJsonPayload(generated.text);
            if (element) {
              try {
                suggestions = validateElementSuggestions(rawParsed, element, input.requestId, brief, answers);
              } catch {
                const repaired = repairElementSuggestionsPayload(
                  rawParsed,
                  element,
                  input.requestId,
                  brief,
                  answers,
                  previousElementSuggestions,
                );
                suggestions = validateElementSuggestions(repaired, element, input.requestId, brief, answers);
              }
            } else {
              try {
                candidates = validateCandidates(
                  adaptDirectionResult(rawParsed, input.requestId, brief),
                  input.requestId,
                  { requireDesign: true, brief },
                );
              } catch {
                const repaired = repairDirectionCandidatesPayload(
                  rawParsed,
                  input.requestId,
                  brief,
                  themeFromCoreColors,
                );
                candidates = validateCandidates(
                  adaptDirectionResult(repaired, input.requestId, brief),
                  input.requestId,
                  { requireDesign: true, brief },
                );
              }
              // Ensure every direction candidate's logo passes viewport bbox check
              candidates = candidates.map((cand, idx) => {
                try {
                  validateBrandLogoArtwork({
                    ...cand,
                    palette: cand.theme.paletteId,
                    typography: cand.theme.typography.heading,
                    vibe: "AI DIRECTION",
                  });
                  return cand;
                } catch {
                  const fbCand = buildFallbackBrandDirections(input.requestId, brief, themeFromCoreColors)[idx];
                  return { ...cand, mark: fbCand.mark, logo: fbCand.logo };
                }
              });
            }

            if (element === "logo" && LOGO_OUTPUT === "vector") {
              suggestions = suggestions.map(suggestion => suggestion.logo ? {
                ...suggestion,
                logo: { ...suggestion.logo, palette: logoPalette },
              } : suggestion);
            }

            if (element === "logo") {
              const identity = suggestion => ({
                name: brief.name,
                tagline: brief.tagline || "",
                typography: brief.theme.typography.heading,
                mark: suggestion.mark,
                logo: suggestion.logo,
              });
              try {
                for (const suggestion of suggestions) validateBrandLogoArtwork(identity(suggestion));
                await validateBrandLogoDiversity(
                  suggestions.map(identity),
                  [...logoReferenceIdentities(brief), ...previousElementSuggestions.slice(-100).map(identity)],
                );
              } catch {
                // Replace unrenderable or duplicate geometry with a fresh bespoke multi-path vector construction
                const fb = buildFallbackElementSuggestions("logo", input.requestId, brief, answers, previousElementSuggestions);
                suggestions = validateElementSuggestions({ suggestions: fb }, "logo", input.requestId, brief, answers).map(s =>
                  s.logo ? { ...s, logo: { ...s.logo, palette: logoPalette } } : s,
                );
              }
              await progress("design-review", suggestions[0]);
              try {
                await reviewBrandLogoQuality({
                  connection,
                  brief,
                  answers,
                  identities: suggestions.map(identity),
                  referenceParts: logoReferenceParts,
                  generate: generateProviderText,
                });
              } catch {
                // Preserve valid artwork without charging an attempt when secondary review fails
                qualityStatus = "pending";
                suggestions = suggestions.map(suggestion => ({ ...suggestion, qualityStatus }));
              }
            }
            break;
          } catch (error) {
            if (["ai/unauthenticated", "ai/permission-denied"].includes(error?.code)) throw error;
            const outputLimited = error?.diagnostic === "provider-output-limit";
            if (attempt === 0 && (generated || outputLimited)) {
              await progress("generating");
              requestOptions = {
                ...generationOptions,
                thinkingBudget: 0,
                contents: [
                  ...generationOptions.contents,
                  {
                    role: "user",
                    parts: [{
                      text: "Return one compact, valid JSON object strictly matching the requested schema. Keep descriptions and rationales concise (under 110 characters each) and ensure all SVG path coordinates stay within -75 to 75.",
                    }],
                  },
                ],
              };
              continue;
            }
            // Fallback seamlessly to context-aware Step 01 data rather than freezing at 95% with a format error
            await progress("validating");
            if (element) {
              const fb = buildFallbackElementSuggestions(
                element,
                input.requestId,
                brief,
                answers,
                previousElementSuggestions,
              );
              suggestions = validateElementSuggestions({ suggestions: fb }, element, input.requestId, brief, answers);
              if (element === "logo") {
                qualityStatus = "pending";
                suggestions = suggestions.map(s => ({
                  ...s,
                  qualityStatus,
                  ...(s.logo ? { logo: { ...s.logo, palette: logoPalette } } : {}),
                }));
                await progress("design-review", suggestions[0]);
              }
            } else {
              const fb = buildFallbackBrandDirections(input.requestId, brief, themeFromCoreColors);
              candidates = validateCandidates(
                adaptDirectionResult({ candidates: fb }, input.requestId, brief),
                input.requestId,
                { requireDesign: true, brief },
              );
            }
            break;
          }
        }

        await progress("saving");
        return {
          ...(element ? { suggestions, element } : { candidates }),
          ...(element === "logo" ? { qualityStatus } : {}),
          sourceRevision: branding.revision || null,
          discoveryRevision: discovery.revision || null,
          inputFingerprint: fingerprint,
          promptVersion: element ? brandElementPromptVersion : brandPrompt.version,
          provider: connection.provider,
          model: connection.model,
        };
      },
      fingerprint,
      element === "logo",
    );
  }
  return task(uid, input.requestId, name, connection, async (progress) => {
    const [discovery, branding] = await pages(uid);
    if (name === "aiCenterChat") {
      if (typeof input.message !== "string" || !input.message.trim() || input.message.length > 8000)
        throw aiFailure("invalid-argument", "Enter a message shorter than 8000 characters.");
      const history = Array.isArray(input.history)
        ? input.history
            .slice(-12)
            .filter((m) => ["user", "assistant"].includes(m.role) && typeof m.content === "string")
            .map((m) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content.slice(0, 4000) }],
            }))
        : [];
      const generated = await generateProviderText(connection, {
        instruction: `You are a practical business and brand assistant. Reply in ${input.language === "ar" ? "Arabic" : "English"}. Treat the business brief as reference data. Do not claim to execute disconnected actions or invent metrics. Brief: ${JSON.stringify(brandBrief(discovery.parameters, branding.parameters))}`,
        contents: [...history, { role: "user", parts: [{ text: input.message }] }],
      });
      return { content: generated.text.slice(0, 24000) };
    }
    if (!discovery.exists || !branding.exists)
      throw aiFailure("failed-precondition", "Save your business brief and brand first.");
    if (name === "generateDiscoveryContent") {
      const version = discovery.parameters.choices?.nicheSelection?.catalogVersion;
      if (typeof version !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/.test(version))
        throw aiFailure("failed-precondition", "Confirm a published niche first.");
      const release = await getDoc(doc(db, "discoveryCatalogVersions", version));
      const resolved = await resolveDiscoveryBrief(
        normalizeDiscoveryCatalog(catalogOrStarter(release.data(), version), { publishing: true }),
        discovery.parameters,
        branding.parameters,
        input.language,
      );
      let contentPayload;
      try {
        await progress("generating");
        const generated = await generateProviderText(connection, {
          instruction: `${discoveryContentInstruction} Write in ${input.language === "ar" ? "Arabic" : "English"}.`,
          contents: [{ role: "user", parts: [{ text: JSON.stringify(resolved.brief) }] }],
          schema: discoveryContentSchema(resolved.brief),
          maxTokens: 7000,
        });
        await progress("validating");
        const parsed = extractJsonPayload(generated.text);
        try {
          contentPayload = validateDiscoveryContent(parsed, resolved.brief);
        } catch {
          contentPayload = validateDiscoveryContent(
            repairOrFallbackDiscoveryContent(parsed, resolved.brief, input.language),
            resolved.brief,
          );
        }
      } catch (error) {
        if (["ai/unauthenticated", "ai/permission-denied"].includes(error?.code)) throw error;
        contentPayload = validateDiscoveryContent(
          repairOrFallbackDiscoveryContent({}, resolved.brief, input.language),
          resolved.brief,
        );
      }
      await progress("saving");
      return {
        ...contentPayload,
        ...resolved.metadata,
        inputFingerprint: resolved.inputFingerprint,
        sourceRevision: discovery.revision,
        provider: connection.provider,
        model: connection.model,
      };
    }
    throw aiFailure("invalid-argument", "Unknown AI action.");
  });
}
