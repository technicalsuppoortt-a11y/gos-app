import type { Asset } from './asset-model';
import type { BusinessEvent } from '../backend/metrics';
import type { CanonicalLead } from '../store/slices/crmSlice';
import { showToast } from '../utils/toast';
export type FunnelRange = { start: string; end: string };
export function rangeFor(days: number): FunnelRange {
 const end=new Date().toISOString().slice(0,10), start=new Date(end+'T00:00:00Z');
 start.setUTCDate(start.getUTCDate()-days+1); return {start:start.toISOString().slice(0,10),end};
}
// Funnel analytics are derived only from recorded tenant events (tenants/{id}/events) and CRM leads.
// Events must carry resourceId === asset.id to be attributed to a funnel/website.
export const VIEW_EVENTS = ['page.viewed', 'funnel.viewed', 'asset.viewed'];
export const LEAD_EVENTS = ['lead.captured', 'form.submitted'];
export const BOOKING_EVENTS = ['booking.saved'];
const inRange = (iso: string, range: FunnelRange) => { const day = (iso ?? '').slice(0, 10); return day >= range.start && day <= range.end; };
export function assetEvents(asset: Asset, events: BusinessEvent[], range?: FunnelRange) {
 return events.filter(event => event.resourceId === asset.id && (!range || inRange(event.createdAt, range)));
}
export function funnelSeries(asset: Asset, events: BusinessEvent[], range: FunnelRange) {
 const start=Date.parse(range.start+'T00:00:00Z'),end=Date.parse(range.end+'T00:00:00Z');
 const days=Math.min(366,Math.max(1,Math.round((end-start)/86400000)+1));
 const scoped = assetEvents(asset, events, range);
 return Array.from({length:days},(_,index)=>{
  const date=new Date(start+index*86400000).toISOString().slice(0,10);
  const daily=scoped.filter(event=>event.createdAt.slice(0,10)===date);
  return {date,views:daily.filter(event=>VIEW_EVENTS.includes(event.type)).length,conversions:daily.filter(event=>LEAD_EVENTS.includes(event.type)).length,bookings:daily.filter(event=>BOOKING_EVENTS.includes(event.type)).length};
 });
}
export function breakdown(events: BusinessEvent[], key: 'source' | 'device') {
 const counts = new Map<string, number>();
 events.forEach(event => { const value = event[key]; if (value) counts.set(value, (counts.get(value) ?? 0) + 1); });
 const total = [...counts.values()].reduce((sum, value) => sum + value, 0);
 return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count, percent: total ? Math.round(count / total * 100) : 0 }));
}
export type FunnelLeadRow = { id: string; name: string; email: string; phone: string; step: string; source: string; date: string; tag: string };
export function funnelLeads(asset: Asset, leads: CanonicalLead[], events: BusinessEvent[]): FunnelLeadRow[] {
 const captures = new Map(assetEvents(asset, events).filter(event => LEAD_EVENTS.includes(event.type) && event.leadId).map(event => [event.leadId!, event]));
 const fallbackStep = asset.document.pages.find(page=>page.sections.some(section=>section.type==='Form'))?.name ?? asset.document.pages[0]?.name ?? 'Landing Page';
 return leads.filter(lead => captures.has(lead.id) || (lead as CanonicalLead & { sourceAssetId?: string }).sourceAssetId === asset.id).map(lead => {
  const capture = captures.get(lead.id);
  const tag = lead.bookingStatus === 'Booked' ? 'Booked' : lead.qualificationStatus === 'Qualified' ? 'Qualified' : 'New lead';
  return { id: lead.id, name: lead.name, email: lead.email, phone: lead.phone ?? '', step: capture?.step ?? fallbackStep, source: capture?.source ?? lead.source ?? 'Direct', date: (capture?.createdAt ?? lead.createdAt ?? lead.lastActivity ?? '').slice(0, 10), tag };
 });
}
export function downloadLeads(rows: FunnelLeadRow[],assetId:string) {
 const cell=(value:string)=>'"'+(/^[\s]*[=+@-]/.test(value)?"'":'')+String(value ?? '').replaceAll('"','""')+'"';
 const csv='\uFEFF'+[['Name','Email','Phone','Step Captured','Source','Date','Tag'],...rows.map(row=>[row.name,row.email,row.phone,row.step,row.source,row.date,row.tag])].map(row=>row.map(cell).join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');
 link.href=url;link.download=assetId+'-leads.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
 showToast.success('Leads exported');
}
