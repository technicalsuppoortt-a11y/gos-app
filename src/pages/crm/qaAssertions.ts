// Explicit checks for the collection's asynchronous and idempotency scenarios.
// Never evaluate JavaScript taken from a Postman document in the dashboard.
export function qaAssertions(name: string, data: any): string[] {
  const failures: string[] = [];
  const check = (valid: unknown, message: string) => { if (!valid) failures.push(message); };
  if (name === 'Health') check(data?.status === 'ok', 'Health status must be ok.');
  if (name === 'Current user') check(data?.user_id && data?.tenant_id && ['USER', 'ADMIN'].includes(data?.role), 'Expected an authenticated workspace user.');
  if (name === 'Get source') {
    check(data?.source?.status === 'ready', 'Source is not ready. Run the indexing worker and retry.');
    check(data?.source?.chunk_count > 0, 'Expected at least one indexed chunk.');
  }
  if (name === 'Ask playground') {
    check(data?.test?.outcome === 'answered', 'Expected an answered playground test.');
    check(data?.test?.answer?.trim(), 'Expected a nonempty answer.');
    check(data?.test?.citations?.length > 0, 'Expected citations from indexed knowledge.');
  }
  if (name === 'Grade playground answer') check(data?.test?.verdict === 'correct', 'Expected verdict correct.');
  const outcomes: Record<string, string> = { 'Inbox while live is off': 'paused', 'Inbox answer': 'answered', 'Duplicate inbox message': 'duplicate', 'Inbox handoff': 'handoff' };
  if (outcomes[name]) check(data?.outcome === outcomes[name], 'Expected outcome ' + outcomes[name] + '.');
  if (name === 'Inbox answer') check(data?.reply?.body?.trim(), 'Expected an assistant reply body.');
  if (['Inbox while live is off', 'Inbox handoff'].includes(name)) check(data?.reply === null, 'Expected no automated reply.');
  if (name === 'Export leads') check(typeof data === 'string' && /name.*email/i.test(data.split(/\r?\n/)[0]), 'Expected CSV contact headers.');
  return failures;
}
