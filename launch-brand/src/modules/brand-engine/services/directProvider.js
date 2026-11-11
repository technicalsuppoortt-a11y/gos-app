import { detectKeyProvider } from "./providerKey.js";
export const aiFailure = (code, message) => Object.assign(new Error(message), { code: `ai/${code}` });
const providerFailure = (code, diagnostic) => Object.assign(aiFailure(code, "AI provider request failed."), { diagnostic });
// Providers answer 500/502/503/504 when a model is briefly overloaded. Those
// requests produced nothing (and are not billed), so they are retried twice.
const TRANSIENT_STATUSES = [500, 502, 503, 504];
const RETRY_DELAYS = [1500, 4000];
async function providerRequest(url, init, fetcher = fetch) {
  let response;
  for (let attempt = 0; ; attempt++) {
    try { response = await fetcher(url, { ...init, signal: AbortSignal.timeout(85000) }); }
    catch (error) { throw providerFailure("unavailable", error?.name === "TimeoutError" ? "provider-timeout" : "provider-network"); }
    if (!TRANSIENT_STATUSES.includes(response.status) || attempt >= RETRY_DELAYS.length) break;
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
  }
  if (!response.ok) {
    // Classify the response locally; never expose the provider's raw message or key.
    const body = typeof response.json === "function" ? await response.json().catch(() => ({})) : {};
    const reasons = (body.error?.details || []).map(item => item.reason);
    const message = String(body.error?.message || "");
    const diagnostic = response.status === 429 ? "provider-quota"
      : response.status === 401 || reasons.includes("API_KEY_INVALID") || /API key not valid|API key expired/i.test(message) ? "provider-key"
      : reasons.some(reason => ["API_KEY_SERVICE_BLOCKED", "API_KEY_HTTP_REFERRER_BLOCKED", "SERVICE_DISABLED"].includes(reason)) ? "provider-restriction"
      : response.status === 403 ? "provider-permission"
      : response.status === 404 ? "provider-model"
      : response.status === 400 ? "provider-request"
      : "provider-unavailable";
    throw providerFailure(response.status === 429 ? "resource-exhausted" : [400, 401, 403, 404].includes(response.status) ? "failed-precondition" : "unavailable", diagnostic);
  }
  try { return await response.json(); }
  catch (error) {
    throw providerFailure("unavailable", ["TimeoutError", "AbortError"].includes(error?.name) ? "provider-timeout" : "provider-invalid-response");
  }
}
export async function providerModels(connection, fetcher = fetch) {
  const key = typeof connection.apiKey === "string" ? connection.apiKey.trim() : "";
  if (/^key_|[•…]|\.{3}/.test(key)) throw providerFailure("invalid-argument", "provider-key-copy");
  const detected = detectKeyProvider(key);
  if (detected && detected !== connection.provider) throw providerFailure("invalid-argument", detected === "openai" ? "provider-use-openai" : "provider-use-gemini");
  if (!["gemini", "openai"].includes(connection.provider) || typeof connection.apiKey !== "string" || connection.apiKey.trim().length < 15 || /[\r\n\x00]/.test(connection.apiKey)) throw aiFailure("invalid-argument", "Enter a supported provider and API key.");
  const result = await providerRequest(connection.provider === "openai" ? "https://api.openai.com/v1/models" : "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000", { headers: connection.provider === "openai" ? { Authorization: `Bearer ${connection.apiKey}` } : { "x-goog-api-key": connection.apiKey } }, fetcher);
  const models = connection.provider === "openai" ? (result.data || []).map((item) => item.id).filter((id) => /^gpt-|^o[1-9]/.test(id) && !/image|audio|realtime|transcrib|tts|search|codex|embedding/.test(id)) : (result.models || []).filter((item) => item.supportedGenerationMethods?.includes("generateContent")).map((item) => item.name.replace(/^models\//, "")).filter((id) => !/image|tts|audio|robotic|embedding/.test(id));
  if (!models.length) throw aiFailure("failed-precondition", "No text models are available to this key.");
  const preferred = connection.provider === "openai" ? ["gpt-4o-mini", "gpt-4.1-mini"] : ["gemini-2.5-flash", "gemini-2.0-flash"];
  const model = connection.model || preferred.find((item) => models.includes(item)) || [...models].sort()[0];
  if (!models.includes(model) || !/^[a-zA-Z0-9._-]{1,120}$/.test(model)) throw aiFailure("failed-precondition", "The chosen model is not available to this key.");
  return { model, models: models.sort().slice(0, 60) };
}
export async function generateProviderText(connection, { instruction, contents, schema, maxTokens = 5000, mode = "standard", connectionTest = false, thinkingBudget, constrainSchema = false, requireSearch = false, allowTruncatedResearch = false }, fetcher = fetch) {
  const provider = connection.provider;
  const request = (url, init, fetcher) => connection.request ? connection.request(url, init, fetcher, providerRequest) : providerRequest(url, init, fetcher);
  const system = `${connection.systemInstructions || ""}\n\n${instruction}${schema ? `\nReturn valid JSON matching this schema exactly: ${JSON.stringify(schema)}` : ""}`;
  const tokens = Math.min(maxTokens, connection.maxOutputTokens || 5000);
  let result;
  if (provider === "gemini") {
    // Keep the full contract in the prompt and validate it locally. Gemini's
    // constrained schema decoder rejects the nested brand/logo contract (400).
    // Thinking consumes the output budget too. Reserve room for the answer,
    // including when the user's configured token ceiling is below our request.
    const requestedThinking = connectionTest ? 0 : thinkingBudget ?? (requireSearch ? 256 : undefined);
    const thinkingConfig = /^gemini-2\.5-flash(?:-lite)?$/.test(connection.model) && requestedThinking !== undefined
      ? { thinkingConfig: { thinkingBudget: Math.max(0, Math.min(requestedThinking, tokens - 768)) } } : {};
    result = await request(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(connection.model)}:generateContent`, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": connection.apiKey }, body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { maxOutputTokens: tokens, ...thinkingConfig, ...(schema ? { responseMimeType: "application/json", ...(constrainSchema ? { responseJsonSchema: schema } : {}) } : {}) }, ...(!schema && mode !== "standard" ? { tools: [{ google_search: {} }] } : {}) }) }, fetcher);
    const candidate = result.candidates?.[0];
    const text = candidate?.content?.parts?.filter((part) => !part.thought).map((part) => part.text || "").join("").trim();
    const sources = (candidate?.groundingMetadata?.groundingChunks || []).flatMap(chunk => {
      try {
        const url = new URL(chunk.web?.uri);
        return url.protocol === "https:" && !url.username && !url.password ? [{ title: chunk.web.title || url.hostname, url: url.href }] : [];
      } catch { return []; }
    });
    const truncated = candidate?.finishReason === "MAX_TOKENS";
    // A prose research brief can still supply usable cited evidence. JSON and
    // uncited partial answers must never bypass output validation.
    if (truncated && !(allowTruncatedResearch && mode === "research" && !schema && text && sources.length)) throw providerFailure("unavailable", "provider-output-limit");
    if (!text) throw providerFailure("unavailable", result.promptFeedback?.blockReason || candidate?.finishReason === "SAFETY" ? "provider-blocked" : "provider-empty");
    return { text, sources, ...(truncated ? { truncated: true } : {}), usage: result.usageMetadata || {} };
  }
  if (provider !== "openai") throw aiFailure("invalid-argument", "Unsupported AI provider.");
  if (mode !== "standard" && !schema) {
    const input = contents.map((message) => ({ role: message.role === "model" ? "assistant" : "user", content: message.parts.map((part) => part.inlineData ? { type: "input_image", image_url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` } : { type: message.role === "model" ? "output_text" : "input_text", text: part.text || "" }) }));
    result = await request("https://api.openai.com/v1/responses", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${connection.apiKey}` }, body: JSON.stringify({ model: connection.model, instructions: system, input, store: false, max_output_tokens: tokens, tools: [{ type: "web_search" }], ...(requireSearch ? { tool_choice: "required" } : {}), include: ["web_search_call.action.sources"] }) }, fetcher);
    const parts = (result.output || []).flatMap((item) => item.content || []);
    const text = parts.filter((part) => part.type === "output_text").map((part) => part.text).join("\n").trim();
    if (result.status === "incomplete") throw providerFailure("unavailable", result.incomplete_details?.reason === "max_output_tokens" ? "provider-output-limit" : "provider-invalid-response");
    if (!text) throw providerFailure("unavailable", parts.some(part => part.type === "refusal") ? "provider-blocked" : "provider-empty");
    const citations = parts.flatMap(part => part.annotations || []).filter(item => item.type === "url_citation");
    const searched = (result.output || []).filter(item => item.type === "web_search_call").flatMap(item => item.action?.sources || []);
    const seen = new Set();
    const sources = [...citations, ...searched].flatMap(item => {
      try {
        const url = new URL(item.url);
        if (url.protocol !== "https:" || url.username || url.password || seen.has(url.href)) return [];
        seen.add(url.href);
        return [{ title: item.title || url.hostname, url: url.href }];
      } catch { return []; }
    });
    return { text, sources, usage: result.usage || {} };
  }
  const messages = [{ role: "system", content: system }, ...contents.map((message) => ({ role: message.role === "model" ? "assistant" : "user", content: message.parts.some((part) => part.inlineData) ? message.parts.map((part) => part.inlineData ? { type: "image_url", image_url: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` } } : { type: "text", text: part.text || "" }) : message.parts.map((part) => part.text || "").join("\n") }))];
  result = await request("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${connection.apiKey}` }, body: JSON.stringify({ model: connection.model, messages, max_completion_tokens: tokens, ...(schema ? { response_format: { type: "json_object" } } : {}) }) }, fetcher);
  const choice = result.choices?.[0];
  if (choice?.finish_reason === "length") throw providerFailure("unavailable", "provider-output-limit");
  if (choice?.finish_reason === "content_filter" || choice?.message?.refusal) throw providerFailure("unavailable", "provider-blocked");
  if (typeof choice?.message?.content !== "string" || !choice.message.content.trim()) throw providerFailure("unavailable", "provider-empty");
  return { text: choice.message.content.trim(), sources: [], usage: result.usage || {} };
}
