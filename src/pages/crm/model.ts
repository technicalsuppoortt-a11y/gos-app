import type { CanonicalLead } from '../../store/slices/crmSlice';
import type { LeadStage } from '../../data/mockData';

export type PipelineStage = { id: LeadStage; label: string; color: string };
export type Pipeline = { id: string; name: string; stages: PipelineStage[] };
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
export const owners = ['Mohamed Joe', 'Alex Morgan', 'Jamie Park', 'Taylor Reed'];
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
  const id = crypto.randomUUID();
  return { id, company: '', source: 'Website', owner: owners[0], value: 0, stage: 'LEAD_CAPTURED', lifecycleStage: 'LEAD_CAPTURED', lastActivity: 'Just now', tags: [], avatar: values.name.split(/\s+/).slice(0, 2).map(s => s[0]).join('').toUpperCase(), color: 'lilac', interest: '', bookingStatus: 'Not Scheduled', qualificationStatus: 'Pending', followUpState: 'NEW', hasWhatsAppConsent: false, hasMessagingConsent: false, hasEmailConsent: false, notes: [], createdAt: new Date().toISOString(), activities: [{ id: crypto.randomUUID(), type: 'capture', title: 'Lead captured', detail: 'Added to CRM', at: new Date().toISOString() }], ...values };
}
export function exportCSV(leads: CanonicalLead[]) {
  const fields = ['name', 'email', 'phone', 'company', 'source', 'owner', 'lifecycleStage', 'value', 'tags', 'createdAt'] as const;
  const quote = (v: unknown) => { const text = String(v ?? ''); return `"${(/^[=+@\-\t\r]/.test(text) ? "'" : '') + text.replaceAll('"', '""')}"`; };
  const csv = [fields.join(','), ...leads.map(l => fields.map(f => quote(Array.isArray(l[f]) ? l[f].join(';') : l[f])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = 'gos-contacts.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
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
