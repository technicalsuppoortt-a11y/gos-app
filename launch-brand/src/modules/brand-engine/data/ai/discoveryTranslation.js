export const translationSchema = {
  type: "object", additionalProperties: false,
  required: ["reasons", "tradeoffs", "problemSignals", "clarification"],
  properties: {
    reasons: { type: "array", items: { type: "string" }, maxItems: 3 },
    tradeoffs: { type: "array", items: { type: "string" }, maxItems: 3 },
    problemSignals: { type: "array", items: { type: "string" }, maxItems: 3 },
    clarification: { type: "string" },
  },
};
export function analysisText(analysis) {
  return { reasons: analysis.reasons, tradeoffs: analysis.tradeoffs, problemSignals: analysis.problemSignals, clarification: analysis.clarification };
}
export function analysisLanguage(analysis) {
  const text = [...analysis.reasons, ...analysis.tradeoffs, ...analysis.problemSignals, analysis.clarification].join(" ");
  if (/[\u0600-\u06ff]/.test(text)) return "ar";
  if (/[a-z]/i.test(text)) return "en";
  return analysis.language || "en";
}
export function validateTranslation(value, original, language) {
  const validText = text => typeof text === "string" && text.length <= 1500 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text);
  if (!value || Object.keys(value).length !== 4 || Object.keys(value).some(key => !Object.hasOwn(translationSchema.properties, key))) throw new Error("Invalid translation fields.");
  for (const key of ["reasons", "tradeoffs", "problemSignals"]) {
    if (!Array.isArray(value[key]) || value[key].length !== original[key].length || value[key].length > 3 || !value[key].every(text => validText(text) && text.trim())) throw new Error("Translation must preserve every explanation.");
  }
  if (!validText(value.clarification) || Boolean(value.clarification.trim()) !== Boolean(original.clarification.trim())) throw new Error("Translation must preserve clarification.");
  const text = [...value.reasons, ...value.tradeoffs, ...value.problemSignals, value.clarification].join(" ");
  if (language === "ar" && text.trim() && !/[\u0600-\u06ff]/.test(text)) throw new Error("Arabic translation is missing.");
  return analysisText(value);
}
