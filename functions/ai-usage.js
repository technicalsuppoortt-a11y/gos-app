/** Record provider-reported tokens once per response. No prompts or API secrets. */
export async function recordAIUsage(root, response, feature) {
  const usage = response?.usage;
  if (!usage || !response.id) return;
  const count = value => Number.isFinite(value) && value >= 0 ? value : 0;
  await root.collection('aiUsage').doc(response.id).set({
    model: String(response.model ?? 'Unspecified'), feature,
    inputTokens: count(usage.input_tokens), outputTokens: count(usage.output_tokens),
    totalTokens: count(usage.total_tokens) || count(usage.input_tokens) + count(usage.output_tokens),
    createdAt: new Date().toISOString(),
  });
}
