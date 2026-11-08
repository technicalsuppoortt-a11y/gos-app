export function brandGenerationFingerprint(
  discovery: Record<string, unknown> | undefined,
  branding: Record<string, unknown> | undefined,
  language: string,
  connectionRevision: string | undefined,
): string;
export function effectiveBrandLocks(
  branding: Record<string, unknown>,
): Partial<import("../brandTheme").BrandLocks>;
export function resolveIdentityLanguage(
  discovery?: unknown,
  branding?: unknown,
): "Arabic" | "English" | "Bilingual";
export function brandElementFingerprint(base: string, element: import("../brandTheme").BrandElement, answers: import("../brandTheme").BrandElementAnswers): string;
export function normalizeElementAnswers(answers: unknown): import("../brandTheme").BrandElementAnswers;
export function themeFromCoreColors(colors: import("../brandTheme").BrandCoreColors, base?: import("../brandTheme").BrandTheme, paletteId?: string): import("../brandTheme").BrandTheme;
export const brandElementPromptVersion: string;
export const elementInstruction: string;
export const brandDirectionSchema: unknown;
export function brandElementSchema(element: string): unknown;
export function validateElementSuggestions(result: unknown, element: string, requestId: string, brief: unknown, answers?: Partial<import("../brandTheme").BrandElementAnswers>): import("../brandTheme").BrandElementCandidate[];
export function adaptDirectionResult(result: unknown, requestId: string, brief: unknown): unknown;
