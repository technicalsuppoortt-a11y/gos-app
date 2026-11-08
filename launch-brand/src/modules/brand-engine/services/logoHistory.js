const marks = new Set(['prism', 'flow', 'serif', 'nodes', 'bilingual', 'burst']);

export function isLogoJob(job) {
  if (job?.kind !== 'generateBrandElement') return false;
  if (job.result?.element === 'logo') return true;
  try { return JSON.parse(job.inputFingerprint).element === 'logo'; }
  catch { return false; }
}

// Job results survive failed draft saves, cleared drafts and interrupted tabs.
export function readLogoHistory(jobs) {
  const logoJobs = jobs.filter(({ data }) => isLogoJob(data))
    .sort((a, b) => (a.data.startedAt || 0) - (b.data.startedAt || 0));
  const suggestions = logoJobs.flatMap(({ data }) => data.status === 'complete'
    && Array.isArray(data.result?.suggestions) ? data.result.suggestions : [])
    .filter(candidate => typeof candidate?.id === 'string' && marks.has(candidate.mark)
      && Array.isArray(candidate.logo?.paths) && candidate.logo.paths.length <= 8
      && candidate.logo.paths.every(path => typeof path?.d === 'string' && typeof path.fill === 'boolean' && Number.isFinite(path.strokeWidth))
      && typeof candidate.logo?.wordmark?.font === 'string'
      && typeof candidate.logo.wordmark.descriptor === 'string'
      && typeof candidate.logo.wordmark.separator === 'boolean'
      && Number.isFinite(candidate.logo.wordmark.letterSpacing)
      && [400, 500, 600, 700, 800].includes(candidate.logo.wordmark.weight)
      && ['original', 'uppercase', 'lowercase'].includes(candidate.logo.wordmark.casing));
  return { requestIds: logoJobs.filter(({ data }) => data.status === 'complete'
    && !['pending', 'rejected'].includes(data.result?.qualityStatus)
    && data.result?.suggestions?.length).map(({ id }) => id), suggestions: mergeLogoSuggestions(suggestions) };
}

export function mergeLogoSuggestions(...groups) {
  const unique = new Map();
  for (const group of groups) for (const candidate of group || []) unique.set(candidate.id, candidate);
  return [...unique.values()];
}

export function usedLogoAttempts(slots, requestIds) {
  return new Set([...slots.filter(slot => slot.status === 'complete').map(slot => slot.requestId), ...requestIds]).size;
}
