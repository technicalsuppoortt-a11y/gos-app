import type { CanonicalLead } from '../../store/slices/crmSlice';
import type { LeadStage } from '../../types/business';

export type PipelineStage = { id: LeadStage; label: string; color: string };
export type Pipeline = { id: string; name: string; stages: PipelineStage[]; archived?: boolean; archivedAt?: string };
export const stageIds: LeadStage[] = ['LEAD_CAPTURED', 'CONTACT_CREATED', 'QUALIFIED', 'CONVERSATION', 'PAYMENT_COMPLETED', 'BOOKING', 'CLOSED_LOST', 'FOLLOW_UP_NEEDED', 'ACTIVE_CUSTOMER', 'RENEWAL_UPSELL'];
export const colors = ['#2396ef', '#7C5CFC', '#10b981', '#f59e0b', '#22c55e', '#ec4899', '#ef4444', '#64748b', '#6366f1', '#14b8a6'];
export const templates = [
  { name: 'New Lead Pipeline', description: 'Turn a first hello into a lasting customer.', stages: ['New Lead', 'Contacted', 'Qualified', 'Interested', 'Closed'] },
  { name: 'Service Business Pipeline', description: 'From inquiry to proposal and successful delivery.', stages: ['Inquiry', 'Discovery Call', 'Proposal Sent', 'Contracted', 'Delivered'] },
  { name: 'Consultation / Booking Pipeline', description: 'Keep every consultation moving toward a booking.', stages: ['New Inquiry', 'Contacted', 'Qualified', 'Booking Offered', 'Completed'] },
  { name: 'Sales & High-Ticket Pipeline', description: 'A considered journey for your highest value offers.', stages: ['New Lead', 'Discovery', 'Qualified', 'Proposal', 'Negotiation', 'Won'] },
  { name: 'Follow-Up & Re-engagement Pipeline', description: 'Reconnect with cold leads and restart conversations.', stages: ['Cold Lead', 'Re-engaged', 'Qualified', 'Interested Again', 'Converted'] },
];
export const mainPipeline: Pipeline = { id: 'main', name: 'Main Pipeline', stages: templates[0].stages.map((label, i) => ({ id: stageIds[i], label, color: colors[i] })) };
export const templateStages = (labels: string[]): PipelineStage[] => labels.map((label, i) => ({ id: i === labels.length - 1 ? 'PAYMENT_COMPLETED' : stageIds.filter(id => id !== 'PAYMENT_COMPLETED')[i], label, color: colors[i] }));
export const owners = ['Unassigned'];
export const sources = ['Website', 'Instagram', 'WhatsApp', 'Referral', 'LinkedIn', 'Facebook', 'Email'];
export const euro = (value: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
export function activityTime(at: string): number {
  const parsed = Date.parse(at);
  if (!Number.isNaN(parsed)) return parsed;
  if (at === 'Just now') return Date.now();
  if (at === 'Yesterday') return Date.now() - 86400000;
  const relative = at.match(/(\d+)\s*(min|hour|day)/i);
  return relative ? Date.now() - Number(relative[1]) * ({ min: 60000, hour: 3600000, day: 86400000 }[relative[2].toLowerCase()] ?? 0) : 0;
}
export function displayStage(lead: CanonicalLead, pipeline: Pipeline): LeadStage {
  if (pipeline.stages.some(s => s.id === lead.lifecycleStage)) return lead.lifecycleStage;
  const aliases: Partial<Record<LeadStage, LeadStage>> = { NEW: 'LEAD_CAPTURED', CONTACTED: 'CONTACT_CREATED', BOOKED: 'CONVERSATION', BOOKING: 'CONVERSATION', BOOKING_OFFERED: 'CONVERSATION', ACTIVE_CUSTOMER: 'PAYMENT_COMPLETED', CUSTOMER: 'PAYMENT_COMPLETED', CLOSED: 'PAYMENT_COMPLETED', CLOSED_LOST: 'PAYMENT_COMPLETED', FOLLOW_UP_NEEDED: 'CONTACT_CREATED', RENEWAL_UPSELL: 'CONVERSATION' };
  const mapped = aliases[lead.lifecycleStage];
  return pipeline.stages.find(s => s.id === mapped)?.id ?? pipeline.stages[0].id;
}
export function makeLead(values: Partial<CanonicalLead> & { name: string; email: string }): CanonicalLead {
  const id = values.id ?? crypto.randomUUID();
  const name = values.name || 'Unnamed contact';
  const avatar = values.avatar || (name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase()) || 'L';
  const base = {
    id,
    company: '',
    source: 'Website',
    owner: owners[0],
    value: 0,
    stage: 'LEAD_CAPTURED' as const,
    lifecycleStage: 'LEAD_CAPTURED' as const,
    lastActivity: 'Just now',
    avatar,
    color: 'lilac',
    interest: '',
    bookingStatus: 'Not Scheduled' as const,
    qualificationStatus: 'Pending' as const,
    followUpState: 'NEW' as const,
    hasWhatsAppConsent: false,
    hasMessagingConsent: false,
    hasEmailConsent: false,
    createdAt: new Date().toISOString(),
  };
  return {
    ...base,
    ...values,
    tags: Array.isArray(values.tags) ? values.tags : [],
    notes: Array.isArray(values.notes) ? values.notes : [],
    activities: Array.isArray(values.activities) ? values.activities : [{ id: crypto.randomUUID(), type: 'capture', title: 'Lead captured', detail: 'Added to CRM', at: new Date().toISOString() }],
  };
}
// Both stores keep their native IDs. Matching IDs are mirrored records; matching
// emails with different IDs are separate captures and must not be re-keyed.
export function normalizeCRMLead(row: Record<string, any>, existing?: Partial<CanonicalLead>): CanonicalLead {
  if (typeof row.id !== 'string' || !row.id.trim()) throw new Error('The contact has no valid ID.');
  const instant = (value: any): string | undefined => typeof value?.toDate === 'function' ? value.toDate().toISOString() : typeof value === 'string' ? value : undefined;
  const stage = row.lifecycleStage ?? row.lifecycle_stage ?? row.stage ?? existing?.lifecycleStage ?? 'LEAD_CAPTURED';
  return makeLead({ ...existing, ...row, id: row.id, name: row.name ?? row.customerName ?? row.customer_name ?? row.customer?.name ?? existing?.name ?? '', email: row.email ?? row.customerEmail ?? row.customer_email ?? row.customer?.email ?? existing?.email ?? '',
    phone: row.phone ?? row.customerPhone ?? row.customer_phone ?? row.customer?.phone ?? existing?.phone,
    bookingId: row.bookingId ?? row.booking_id ?? existing?.bookingId, orderId: row.orderId ?? row.order_id ?? existing?.orderId,
    source: row.source || (row.bookingId || row.booking_id ? 'Booking' : row.orderId || row.order_id ? 'Checkout' : existing?.source || 'Website'),
    interest: row.interest ?? row.message ?? existing?.interest ?? '',
    pipelineId: row.pipelineId ?? row.pipeline_id ?? existing?.pipelineId ?? 'main', stage, lifecycleStage: stage,
    value: Number.isFinite(Number(row.value ?? existing?.value)) ? Number(row.value ?? existing?.value) : 0,
    qualificationStatus: row.qualificationStatus ?? row.qualification_status ?? existing?.qualificationStatus ?? (stage === 'QUALIFIED' ? 'Qualified' : 'Pending'),
    bookingStatus: row.bookingStatus ?? row.booking_status ?? existing?.bookingStatus ?? 'Not Scheduled',
    followUpState: row.followUpState ?? row.follow_up_state ?? existing?.followUpState ?? 'NEW',
    hasWhatsAppConsent: row.hasWhatsAppConsent ?? row.has_whatsapp_consent ?? existing?.hasWhatsAppConsent ?? false,
    hasMessagingConsent: row.hasMessagingConsent ?? row.has_messaging_consent ?? existing?.hasMessagingConsent ?? false,
    hasEmailConsent: row.hasEmailConsent ?? row.has_email_consent ?? existing?.hasEmailConsent ?? false,
    nextFollowUpAt: instant(row.nextFollowUpAt ?? row.next_follow_up_at) ?? existing?.nextFollowUpAt,
    nextFollowUp: row.nextFollowUp ?? row.next_follow_up ?? existing?.nextFollowUp,
    photoUrl: row.photoUrl ?? row.photo_url ?? existing?.photoUrl,
    lastActivity: instant(row.lastActivity ?? row.last_activity) ?? existing?.lastActivity ?? 'Just now',
    createdAt: instant(row.createdAt ?? row.created_at) ?? existing?.createdAt ?? '',
    tags: row.tags ?? existing?.tags ?? [], notes: row.notes ?? existing?.notes ?? [],
    activities: (row.activities ?? existing?.activities ?? []).map((item: Record<string, any>) => ({ ...item,
      type: item.type || 'system', title: item.title || item.type || 'Activity', detail: item.detail || item.description || '',
      at: instant(item.at ?? item.created_at) ?? '',
    })),
  });
}
export function mergeCRMLeads(apiRows: Partial<CanonicalLead>[], workspaceRows: Partial<CanonicalLead>[]): CanonicalLead[] {
  const records = new Map<string, CanonicalLead>();
  const modified = (lead: CanonicalLead) => Math.max(0, ...[lead.lastActivity, (lead as any).updatedAt, (lead as any).updated_at].map(value => Date.parse(value || '') || 0));
  for (const row of workspaceRows) if (typeof row.id === 'string' && row.id.trim()) records.set(row.id, normalizeCRMLead(row));
  for (const row of apiRows) {
    if (typeof row.id !== 'string' || !row.id.trim()) continue;
    const api = normalizeCRMLead(row), workspace = records.get(api.id);
    if (!workspace) { records.set(api.id, api); continue; }
    const [primary, secondary] = modified(workspace) > modified(api) ? [workspace, api] : [api, workspace];
    const activities = [...new Map([...secondary.activities, ...primary.activities].map(item => [item.id, item])).values()]
      .sort((a, b) => (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0));
    records.set(api.id, { ...secondary, ...primary, activities, notes: [...new Set([...primary.notes, ...secondary.notes])],
      // These existing CRM controls persist in Firestore rather than Laravel.
      tasks: workspace.tasks ?? api.tasks, attachedProducts: workspace.attachedProducts ?? api.attachedProducts,
      nextFollowUpAt: workspace.nextFollowUpAt ?? api.nextFollowUpAt, nextFollowUp: workspace.nextFollowUp ?? api.nextFollowUp,
    });
  }
  return [...records.values()];
}
export function exportCSV(leads: CanonicalLead[]) {
  const fields = ['name', 'email', 'phone', 'company', 'source', 'owner', 'lifecycleStage', 'value', 'tags', 'createdAt'] as const;
  const quote = (v: unknown) => { const text = String(v ?? ''); return `"${(/^[=+@\-\t\r]/.test(text) ? "'" : '') + text.replaceAll('"', '""')}"`; };
  const csv = [fields.join(','), ...leads.map(l => fields.map(f => quote(Array.isArray(l[f]) ? l[f].join(';') : l[f])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = 'upclick-contacts.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// Handles quoted commas, escaped quotes, CRLF and multiline CSV cells.
export function parseCSV(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false;
  const input = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') { if (quoted && input[i + 1] === '"') { cell += '"'; i++; } else if (!cell || quoted) quoted = !quoted; else cell += c; }
    else if (c === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) { if (c === '\r' && input[i + 1] === '\n') i++; row.push(cell); if (row.some(v => v.trim())) rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (quoted) throw new Error('Unclosed quoted field. Please check your CSV file.');
  row.push(cell); if (row.some(v => v.trim())) rows.push(row);
  return rows;
}
