/** Platform configuration supplements workspace permissions; it never replaces them. */
export function unavailableToolPolicy(error: unknown) {
  const code = String((error as { code?: string })?.code ?? '').replace(/^firestore\//, '');
  return ['permission-denied', 'unavailable', 'not-found'].includes(code);
}

export function toolPolicyAllows(tool: { enabled?: boolean; status?: string; accessTier?: string } | undefined, plan = '') {
  if (!tool) return true;
  if (tool.enabled === false || ['Disabled', 'Maintenance'].includes(tool.status ?? '')) return false;
  // Legacy workspaces do not all have a subscription projection. Their verified
  // membership remains authoritative until a plan is actually available.
  if (!plan || !tool.accessTier || tool.accessTier === 'all') return true;
  const tier = plan.toLowerCase();
  return tool.accessTier === 'pro_agency' && ['pro', 'agency'].includes(tier) || tool.accessTier === 'agency_only' && tier === 'agency';
}
