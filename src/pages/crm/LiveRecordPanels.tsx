import { CRMActionBoundary } from './CRMActions';
export { LiveOrders } from './LiveOrders';
import { useEffect, useState } from 'react';
import { CalendarDays, MessageCircle } from 'lucide-react';
import { useEntities } from '../../backend/workspace';
import { gosApi, type ApiRecord } from '../../backend/gosApi';
import type { CanonicalLead } from '../../store/slices/crmSlice';
import { translateText } from '../../i18n/display';
import { linkedToLead } from './recordLinks';

const date = (value?: string) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString() : value || '';

export function LiveConversations({ lead }: { lead: CanonicalLead }) {
  const local = useEntities<ApiRecord>('conversations').filter(row => linkedToLead(row, lead));
  const [remote, setRemote] = useState<ApiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const leadId = lead.id, leadEmail = lead.email, leadPhone = lead.phone;
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    setRemote([]); setLoading(true); setError('');
    async function load() {
      setLoading(true);
      try {
        const list = await gosApi.conversations(controller.signal);
        const linked = list.conversations.filter(row => linkedToLead(row, { id: leadId, email: leadEmail, phone: leadPhone }));
        const details = await Promise.all(linked.map(row => gosApi.conversation(row.id, controller.signal)));
        if (!controller.signal.aborted) { setRemote(details.map(item => ({ ...item.conversation, messages: item.messages }))); setError(''); }
      } catch (err) { if (!controller.signal.aborted) setError((err as Error).message); }
      finally { if (!controller.signal.aborted) { setLoading(false); timer = setTimeout(load, 10000); } }
    }
    void load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [leadId, leadEmail, leadPhone, revision]);
  const ids = new Set(remote.map(row => row.id));
  const rows = [...remote, ...local.filter(row => !ids.has(row.id))];
  return <CRMActionBoundary busy={loading}>{error && <p className="crm-error" role="alert">{error} <button disabled={loading} onClick={() => setRevision(value => value + 1)}>Retry</button></p>}
    {rows.length ? <div className="crm-conversation-grid">{rows.map(row => <article className="crm-thread" key={row.id}><header><MessageCircle size={16}/><b>{row.channel}</b><span>{row.status}</span></header>{(row.messages ?? []).slice().sort((a: ApiRecord, b: ApiRecord) => Date.parse(a.created_at || a.time || '') - Date.parse(b.created_at || b.time || '')).map((message: ApiRecord) => <div className="crm-thread-message" key={message.id}><b>{message.role || message.sender || message.sender_type}</b><p>{message.body || message.text}</p><small>{date(message.created_at || message.time)}</small></div>)}</article>)}</div> : !loading && <p className="crm-empty">{translateText('No conversations linked to this contact.')} Threads require a matching contact ID, email or phone.</p>}</CRMActionBoundary>;
}

export function LiveAppointments({ lead }: { lead: CanonicalLead }) {
  const rows = useEntities<ApiRecord>('bookings').filter(row => linkedToLead(row, lead, 'booking'));
  return rows.length ? <div>{rows.slice().sort((a, b) => Date.parse(b.start || b.date || '') - Date.parse(a.start || a.date || '')).map(row => <div className="crm-feed-item" key={row.id}><CalendarDays size={20}/><div><b>{row.serviceName || row.title || 'Appointment'}</b><p>{date(row.start || row.date)} {row.time || ''}</p></div><span>{row.status}</span></div>)}</div> : <p className="crm-empty">{translateText('No appointments recorded for this contact.')}</p>;
}

export function LiveAutomation({ lead }: { lead: CanonicalLead }) {
  const workflows = useEntities<ApiRecord>('workflows').filter(row => linkedToLead(row, lead) || row.leadIds?.includes(lead.id));
  const [loading, setLoading] = useState(true);
  const [assistant, setAssistant] = useState<{ live_enabled: boolean; channels: Record<string, boolean> }>();
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;
    async function load() { setLoading(true); try { const data = await gosApi.assistant(controller.signal); if (!controller.signal.aborted) { setAssistant(data.assistant); setError(''); } } catch (err) { if (!controller.signal.aborted) setError((err as Error).message); } finally { if (!controller.signal.aborted) { setLoading(false); timer = setTimeout(load, 10000); } } }
    void load(); return () => { controller.abort(); clearTimeout(timer); };
  }, []);
  return <CRMActionBoundary busy={loading}><div>{error ? <p className="crm-error" role="alert">{error}</p> : assistant ? <><p>Live AI replies: <b>{assistant.live_enabled ? 'Enabled' : 'Paused'}</b></p><p className="crm-muted">{Object.entries(assistant.channels).map(([channel, enabled]) => channel + ': ' + (enabled ? 'enabled' : 'paused')).join(' · ')}</p></> : <p className="crm-muted">Loading automation status…</p>}{workflows.map(row => <div className="crm-feed-item" key={row.id}><b>{row.name || 'Follow-up sequence'}</b><span>{row.status || (row.enabled ? 'Enabled' : 'Paused')}</span></div>)}{!workflows.length && <p className="crm-muted">No automated sequences linked to this contact.</p>}</div></CRMActionBoundary>;
}
