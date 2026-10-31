import { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import type { CanonicalLead } from '../../store/slices/crmSlice';
import { QuickDetails } from '../../components/ui/QuickDetails';
import { CRMRouting, type CRMRoute } from '../CRMRouting';

export function LeadQuickView({ lead, close, save, fullRecord, busy }: { lead: CanonicalLead; close: () => void; save: (changes: Partial<CanonicalLead>) => Promise<unknown>; fullRecord: () => void; busy: boolean }) {
  const [note, setNote] = useState('');
  const [route, setRoute] = useState<CRMRoute>({ pipelineId: lead.pipelineId || 'main', stageId: lead.stage });
  const [saving, setSaving] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const pipelines = useSelector((s: RootState) => s.crm.pipelines);
  const target = pipelines.find(p => p.id === (route.pipelineId || 'main') && !p.archived);
  const changed = (route.pipelineId || 'main') !== (lead.pipelineId || 'main') || route.stageId !== lead.stage;
  const fields = lead as CanonicalLead & { customFields?: Record<string, unknown>; customFieldLabels?: Record<string, string> };
  const persist = async (changes: Partial<CanonicalLead>, success: string) => {
    setSaving(true); setError(''); setMessage('');
    try { const result = await save(changes); if (!result) throw new Error('Changes could not be saved. Please try again.'); setMessage(success); return true; }
    catch (err) { setError(err instanceof Error ? err.message : 'Changes could not be saved. Please try again.'); return false; }
    finally { setSaving(false); }
  };
  return <QuickDetails title={lead.name || 'Lead details'} close={close}>
    <section><h3>Contact info</h3><dl>{Object.entries({ Email: lead.email, Phone: lead.phone, Company: lead.company, Source: lead.source, Owner: lead.owner, Value: lead.value, Created: lead.createdAt }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{String(value ?? '—')}</dd></div>)}</dl></section>
    <section><h3>Pipeline routing</h3><p className="detail-muted">Transfer this lead to an active pipeline and choose its destination stage.</p><CRMRouting disabled={busy || saving} value={route} onChange={next => { setRoute(next); setMessage(''); setError(''); }}/><button type="button" className="detail-primary" disabled={busy || saving || !changed || !target?.stages.some(s => s.id === route.stageId)} onClick={() => void persist({ pipelineId: target!.id, stage: route.stageId as CanonicalLead['stage'], lifecycleStage: route.stageId as CanonicalLead['stage'] }, 'Pipeline routing saved.')}>{saving ? 'Saving…' : 'Save pipeline routing'}</button></section>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <section><h3>Custom fields</h3>{Object.keys(fields.customFields ?? {}).length ? <dl>{Object.entries(fields.customFields ?? {}).map(([key, value]) => <div key={key}><dt>{fields.customFieldLabels?.[key] || key}</dt><dd>{String(value)}</dd></div>)}</dl> : <p className="detail-muted">No custom fields added.</p>}</section>
    <section><h3>Notes</h3>{lead.notes?.map((n, i) => <p key={i}>{n}</p>)}<form onSubmit={async e => { e.preventDefault(); if (note.trim() && await persist({ notes: [...(lead.notes ?? []), note.trim()] }, 'Note added.')) setNote(''); }}><textarea aria-label="New note" value={note} onChange={e => setNote(e.target.value)}/><button disabled={busy || saving || !note.trim()} className="detail-primary">Add note</button></form></section>
    <section><h3>Activity</h3>{lead.activities?.length ? lead.activities.map((a, i) => <article key={a.id || i}><b>{a.title}</b><p>{a.detail}</p><small>{a.at}</small></article>) : <p className="detail-muted">No activity yet.</p>}</section>
    <button className="detail-primary" onClick={fullRecord}>Open full record</button>
  </QuickDetails>;
}
