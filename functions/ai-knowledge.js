// The indexed GOS source store is authoritative. Both AI entry points use its
// grounded query endpoint instead of reading the unrelated tenant/knowledge list.
export async function queryIndexedKnowledge({ authorization, question, baseUrl = 'https://gos-api.vercel.app', fetcher = fetch }) {
  if (!/^Bearer \S+$/i.test(authorization ?? '')) throw new Error('Sign in to query workspace knowledge.');
  const response = await fetcher(`${baseUrl.replace(/\/$/, '')}/api/v1/ai/playground`, {
    method: 'POST', headers: { Authorization: authorization, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(45000), body: JSON.stringify({ question }),
  });
  const payload = await response.json();
  if (!response.ok || payload.success === false || typeof payload.data?.test?.answer !== 'string') {
    throw new Error('Workspace knowledge retrieval failed. Please try again.');
  }
  const { answer, citations = [], outcome } = payload.data.test;
  return { answer, citations, outcome };
}

export const defaultAgent = { name: 'GOS Assistant', role: 'Business assistant', language: 'Auto-detect Arabic / English', goal: 'Appointments' };

export function validateAgent(value) {
  const agent = {};
  for (const key of Object.keys(defaultAgent)) {
    if (typeof value?.[key] !== 'string' || !value[key].trim() || value[key].length > 500) throw new Error('Enter a valid assistant name, role, language and goal (up to 500 characters each).');
    agent[key] = value[key].trim();
  }
  return agent;
}

export async function readAgent(root) {
  const config = await root.collection('configuration').doc('agent').get();
  if (config.exists) return validateAgent(config.data());
  // Migrate the existing tenant-scoped compatibility document, never an
  // unscoped browser profile that could belong to another workspace.
  const legacy = await root.collection('workspaceState').doc(encodeURIComponent('gos.ai-followup.assistant.v1')).get();
  if (!legacy.exists) return { ...defaultAgent };
  try { return validateAgent(legacy.data().value); } catch { return { ...defaultAgent }; }
}
