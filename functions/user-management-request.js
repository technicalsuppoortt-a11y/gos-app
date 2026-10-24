import { HttpsError } from 'firebase-functions/v2/https';

const switchOperations = new Set(['switch', 'impersonate']);
function identifier(value, label) {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim() || value.includes('/')) throw new HttpsError('invalid-argument', `Provide a valid ${label}.`);
  return value;
}
export function userManagementRequest(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpsError('invalid-argument', 'Provide user management parameters.');
  const operation = data.operation ?? data.action;
  if (!switchOperations.has(operation)) return { ...data, operation };
  if (data.operation !== undefined && data.action !== undefined && !switchOperations.has(data.action)) throw new HttpsError('invalid-argument', 'Conflicting account actions.');
  const id = identifier(data.id ?? data.targetUid, 'target user ID');
  if (data.targetUid !== undefined && data.targetUid !== id) throw new HttpsError('invalid-argument', 'Conflicting target user IDs.');
  const tenantId = data.tenantId ?? data.workspaceId;
  if (tenantId !== undefined) identifier(tenantId, 'workspace ID');
  if (data.workspaceId !== undefined && data.workspaceId !== tenantId) throw new HttpsError('invalid-argument', 'Conflicting workspace IDs.');
  return { ...data, operation: 'impersonate', id, tenantId };
}
