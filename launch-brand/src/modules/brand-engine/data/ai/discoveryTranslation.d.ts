import type { DiscoveryAnalysis } from "../discoveryProfile";
export type AnalysisTranslation = Pick<DiscoveryAnalysis, "reasons" | "tradeoffs" | "problemSignals" | "clarification">;
export const translationSchema: Record<string, unknown>;
export function analysisText(analysis: AnalysisTranslation): AnalysisTranslation;
export function analysisLanguage(analysis: AnalysisTranslation & { language?: "ar" | "en" }): "ar" | "en";
export function validateTranslation(value: unknown, original: AnalysisTranslation, language: "ar" | "en"): AnalysisTranslation;
