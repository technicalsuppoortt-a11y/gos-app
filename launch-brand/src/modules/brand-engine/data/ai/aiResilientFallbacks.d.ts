export function extractJsonPayload(rawText: string): any;
export function normalizeLogoPathsToViewport(
  rawPaths: Array<{ d: string; fill?: boolean; strokeWidth?: number }>,
): Array<{ d: string; fill: boolean; strokeWidth: number }>;
export function buildBespokeVectorLogo(
  variantIndex?: number,
  stylePref?: string,
  nicheLabel?: string,
): {
  mark: "prism" | "flow" | "serif" | "nodes" | "bilingual" | "burst";
  concept: string;
  paths: Array<{ d: string; fill: boolean; strokeWidth: number }>;
};
export function buildFallbackElementSuggestions(
  element: string,
  requestId: string,
  brief?: Record<string, any>,
  answers?: Record<string, any>,
  previousSuggestions?: Array<Record<string, any>>,
): Array<Record<string, any>>;
export function repairElementSuggestionsPayload(
  rawParsed: any,
  element: string,
  requestId: string,
  brief?: Record<string, any>,
  answers?: Record<string, any>,
  previousSuggestions?: Array<Record<string, any>>,
): { suggestions: Array<Record<string, any>> };
export function buildFallbackBrandDirections(
  requestId: string,
  brief?: Record<string, any>,
  themeFromCoreColors?: (value: any, base?: any, paletteId?: string) => any,
): Array<Record<string, any>>;
export function repairDirectionCandidatesPayload(
  rawParsed: any,
  requestId: string,
  brief?: Record<string, any>,
  themeFromCoreColors?: (value: any, base?: any, paletteId?: string) => any,
): { candidates: Array<Record<string, any>> };
export function buildFallbackDiscoveryAnalysis(
  requestId: string,
  profile?: Record<string, any>,
  candidates?: Array<Record<string, any>>,
  catalog?: Record<string, any>,
  language?: string,
  promptVersion?: string,
  configVersion?: string,
): Record<string, any>;
export function repairOrFallbackDiscoveryContent(
  rawParsed: any,
  brief: Record<string, any>,
  language?: string,
): {
  blocks: Array<{ id: string; title: string; body: string; ctaLabel: string }>;
  followUpMessages: string[];
  qualificationQuestions: string[];
};
