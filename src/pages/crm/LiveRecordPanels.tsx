import { CalendarDays, MessageCircle, Package } from 'lucide-react';
import { useEntities } from '../../backend/workspace';
import type { CanonicalLead } from '../../store/slices/crmSlice';
import { translateText } from '../../i18n/display';
type Record = { id: string; leadId?: string; email?: string; customerEmail?: string; channel?: string; messages?: { id: string; text?: string; time?: string }[]; serviceName?: string; productName?: string; start?: string; status?: string; createdAt?: string };
export function LiveConversations({ lead }: { lead: CanonicalLead }) {
  const rows = useEntities<Record>('conversations').filter(row => row.leadId === lead.id || row.email === lead.email);
  return rows.length ? <div className="crm-conversation-grid">{rows.map(row => <article className="crm-thread" key={row.id}><header><MessageCircle size={16}/><b>{row.channel}</b></header>{(row.messages ?? []).map(message => <div className="crm-thread-message" key={message.id}><p>{message.text}</p><small>{message.time}</small></div>)}</article>)}</div> : <p className="crm-empty">{translateText('No conversations recorded for this contact.')}</p>;
}
export function LiveAppointments({ lead }: { lead: CanonicalLead }) {
  const rows = useEntities<Record>('bookings').filter(row => row.leadId === lead.id || row.email === lead.email);
  return rows.length ? <div>{rows.map(row => <div className="crm-feed-item" key={row.id}><CalendarDays size={20}/><div><b>{row.serviceName}</b><p>{row.start ? new Date(row.start).toLocaleString() : ''}</p></div><span>{row.status}</span></div>)}</div> : <p className="crm-empty">{translateText('No appointments recorded for this contact.')}</p>;
}
export function LiveOrders({ lead }: { lead: CanonicalLead }) {
  const rows = useEntities<Record>('orders').filter(row => row.leadId === lead.id || row.customerEmail === lead.email);
  return rows.length ? <div>{rows.map(row => <div className="crm-feed-item" key={row.id}><Package size={20}/><div><b>{row.productName}</b><p>{row.createdAt ? new Date(row.createdAt).toLocaleString() : ''}</p></div><span>{row.status}</span></div>)}</div> : <p className="crm-empty">{translateText('No orders recorded for this contact.')}</p>;
}
