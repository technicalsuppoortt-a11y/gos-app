import type { BrandElementCandidate } from '../data/brandTheme';

export function isLogoJob(job: unknown): boolean;
export function readLogoHistory(jobs: { id: string; data: Record<string, unknown> }[]): {
  requestIds: string[]; suggestions: BrandElementCandidate[];
};
export function mergeLogoSuggestions(...groups: (readonly BrandElementCandidate[] | undefined)[]): BrandElementCandidate[];
export function usedLogoAttempts(slots: readonly { requestId: string; status?: string }[], requestIds: readonly string[]): number;
