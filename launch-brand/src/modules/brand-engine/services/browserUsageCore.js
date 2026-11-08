const number = (value) => (Number.isSafeInteger(value) && value >= 0 ? value : null);
export function normalizeUsage(provider, raw = {}) {
  const inputTokens = number(
    provider === "gemini" ? raw.promptTokenCount : (raw.input_tokens ?? raw.prompt_tokens),
  );
  const outputTokens = number(
    provider === "gemini" ? raw.candidatesTokenCount : (raw.output_tokens ?? raw.completion_tokens),
  );
  return {
    inputTokens,
    outputTokens,
    totalTokens: number(provider === "gemini" ? raw.totalTokenCount : raw.total_tokens),
    cachedTokens: number(
      provider === "gemini"
        ? raw.cachedContentTokenCount
        : (raw.input_tokens_details?.cached_tokens ?? raw.prompt_tokens_details?.cached_tokens),
    ),
    reasoningTokens: number(
      provider === "gemini"
        ? raw.thoughtsTokenCount
        : (raw.output_tokens_details?.reasoning_tokens ??
            raw.completion_tokens_details?.reasoning_tokens),
    ),
  };
}
export function addUsage(old = {}, event) {
  const next = {
    ...old,
    calls: (old.calls || 0) + 1,
    [event.status]: (old[event.status] || 0) + 1,
    firstTrackedAt: old.firstTrackedAt ?? event.startedAt,
    updatedAt: event.completedAt,
  };
  for (const field of [
    "inputTokens",
    "outputTokens",
    "totalTokens",
    "cachedTokens",
    "reasoningTokens",
  ])
    next[field] = (old[field] || 0) + (event[field] ?? 0);
  next.unmeasuredCalls = (old.unmeasuredCalls || 0) + (event.totalTokens === null ? 1 : 0);
  for (const dimension of ["operation", "provider", "source"]) {
    const groups = { ...(old[dimension] || {}) };
    const value = groups[event[dimension]] || {};
    groups[event[dimension]] = {
      calls: (value.calls || 0) + 1,
      totalTokens: (value.totalTokens || 0) + (event.totalTokens ?? 0),
      unmeasuredCalls: (value.unmeasuredCalls || 0) + (event.totalTokens === null ? 1 : 0),
    };
    next[dimension] = groups;
  }
  return next;
}
