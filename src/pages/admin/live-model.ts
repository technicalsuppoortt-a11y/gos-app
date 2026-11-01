export type LiveRecord = { id: string; path: string; workspaceId: string; data: Record<string, any> };
export type Directory = Record<string, Record<string, any>>;
export const managementResources = ['assets', 'leads', 'pipelines', 'calendars', 'bookings', 'products', 'orders', 'transactions'] as const;
export type ManagementResource = typeof managementResources[number];
export function assetSubtype(data: Record<string, any>): 'Funnels' | 'Websites' | 'Forms' {
  if (data.formAsset || /^(form|forms)$/i.test(data.kind || data.type || '')) return 'Forms';
  return /^(funnel|funnels)$/i.test(data.kind || data.type || '') ? 'Funnels' : 'Websites';
}
export const referenceKey = (workspaceId: string, resource: string, id: string) => id ? `tenants/${workspaceId}/${resource}/${id}` : '';
function instant(value: any): string {
  if (typeof value === 'string') return value;
  const seconds = value?.seconds ?? value?._seconds;
  if (typeof seconds === 'number' && Number.isFinite(seconds)) {
    const date = new Date(seconds * 1000);
    if (Number.isFinite(date.getTime())) return date.toISOString();
  }
  return '';
}
export function managementRow(record: LiveRecord, tenants: Directory, users: Directory, calendars: LiveRecord[] = [], pipelines: LiveRecord[] = []) {
  const d = record.data, tenant = tenants[record.workspaceId] ?? {};
  const resource = record.path.split('/').at(-2);
  const ownerId = d.ownerUid || d.ownerId || tenant.ownerUid || tenant.ownerId || '';
  const owner = users[ownerId] ?? {};
  const calendar = calendars.find(c => c.workspaceId === record.workspaceId && c.id === d.calendarId)?.data;
  const pipelineId = resource === 'leads' ? String(d.pipelineId || d.pipeline_id || 'main') : resource === 'pipelines' ? record.id : '';
  const pipeline = pipelines.find(p => p.workspaceId === record.workspaceId && p.id === pipelineId)?.data;
  const status = resource === 'assets' ? d.document?.funnel?.status ?? d.status ?? 'Draft'
    : resource === 'calendars' ? (d.active ? 'Published' : 'Inactive')
    : resource === 'products' ? (d.status === 'Active' ? d.config?.experience?.visibility ?? 'Published' : d.status ?? 'Draft') : d.status ?? d.lifecycleStage ?? d.stage ?? (resource === 'pipelines' ? d.archived ? 'Archived' : 'Active' : '—');
  return {
    id: record.path, name: String(d.name || d.serviceName || d.customerName || d.customer?.name || (typeof d.customer === 'string' ? d.customer : '') || d.productName || record.id),
    tenant: String(tenant.name || record.workspaceId), workspaceId: record.workspaceId,
    owner: String(owner.name || tenant.ownerName || ownerId || 'Unattributed'), ownerId: String(ownerId),
    email: String(d.email || d.customerEmail || d.customer_email || d.customer?.email || ''), status: String(status),
    type: resource === 'assets' ? assetSubtype(d) : String(d.type || d.kind || ''), source: String(d.source || ''),
    recordId: record.id,
    pipelineKey: referenceKey(record.workspaceId, 'pipelines', pipelineId), pipeline: pipelineId ? String(pipeline?.name || d.pipelineName || (pipelineId === 'main' ? 'Main Pipeline' : pipelineId)) : '',
    calendarKey: referenceKey(record.workspaceId, 'calendars', resource === 'calendars' ? record.id : resource === 'bookings' ? String(d.calendarId || '') : ''), calendar: String(calendar?.name || d.calendarName || d.calendarId || (resource === 'calendars' ? d.name : '') || ''),
    host: String(d.hostName || calendar?.hostName || d.host || ''),
    date: instant(d.start) || [instant(d.date), d.time].filter(Boolean).join(' ') || instant(d.at) || instant(d.createdAt || d.created_at),
    amount: String(d.config?.amount ?? d.total ?? d.amount ?? d.price ?? ''), currency: String(d.config?.currency || d.currency || ''),
    product: String(d.productName || d.productId || ''), domain: String(d.publishedUrl || d.domain || ''),
  };
}
