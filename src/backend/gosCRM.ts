import { useEffect, useState } from 'react';
import { gosApi, type ApiRecord } from './gosApi';
import { store } from '../store';
import { hydrateCRM, addLead, updateLead, savePipeline, deleteLeads, type CanonicalLead } from '../store/slices/crmSlice';
import type { Pipeline } from '../pages/crm/model';
import { makeLead, exportCSV as exportLocalCSV } from '../pages/crm/model';
import { showToast } from '../utils/toast';

export function normalizeLead(row: ApiRecord): CanonicalLead {
  const existing = store.getState().crm.leads.find(lead => lead.id === row.id);
  return makeLead({ ...existing, ...row, name: row.name || '', email: row.email || '', id: row.id,
    pipelineId: row.pipeline_id || 'main', lifecycleStage: row.lifecycle_stage || 'LEAD_CAPTURED', stage: row.lifecycle_stage || 'LEAD_CAPTURED',
    tags: row.tags || [], notes: row.notes || [], activities: row.activities?.map((item: ApiRecord) => ({ id: item.id, type: item.type || 'system', title: item.title || item.type || 'Activity', detail: item.detail || item.description || '', at: item.at || item.created_at || '' })) || [],
    createdAt: row.created_at || existing?.createdAt || '',
  });
}
export function leadPayload(row: Partial<CanonicalLead>) {
  const body: ApiRecord = {};
  for (const field of ['name', 'email', 'phone', 'company', 'source', 'owner', 'value', 'tags'] as const) if (row[field] !== undefined) body[field] = row[field];
  if (row.pipelineId !== undefined) body.pipeline_id = row.pipelineId;
  if (row.lifecycleStage !== undefined) body.lifecycle_stage = row.lifecycleStage;
  return body;
}
export async function refreshGosCRM(signal?: AbortSignal) {
  const [leads, pipelines] = await Promise.all([gosApi.leads(undefined, signal), gosApi.pipelines(signal)]);
  if (signal?.aborted) return;
  if (!Array.isArray(leads.leads) || !Array.isArray(pipelines.pipelines)) throw new Error('The GOS API returned invalid CRM data.');
  store.dispatch(hydrateCRM({ leads: leads.leads.map(normalizeLead), pipelines: pipelines.pipelines as Pipeline[] }));
}
export async function exportGosCRM(leads: CanonicalLead[], pipelineId: string) {
  const pipelineLeads = store.getState().crm.leads.filter(lead => (lead.pipelineId || 'main') === pipelineId);
  // The collection only supports pipeline-wide server exports. Keep filtered exports precise.
  if (leads.length !== pipelineLeads.length || !pipelineLeads.every(lead => leads.some(row => row.id === lead.id))) return exportLocalCSV(leads);
  try {
    const csv = await gosApi.exportLeads(pipelineId);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'gos-contacts.csv'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) { showToast.error((e as Error).message); }
}
export async function installGosPreset(key: string) {
  try {
    // Confirm the preset catalog is accessible before installing a server-defined preset.
    await gosApi.presets();
    const result = await gosApi.installPreset(key) as { pipeline: Pipeline };
    store.dispatch(savePipeline(result.pipeline)); return result.pipeline;
  } catch (e) { showToast.error((e as Error).message); return undefined; }
}
export function useGosCRM() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    gosApi.me(controller.signal)
      .then(() => refreshGosCRM(controller.signal))
      .catch(e => {
        if (!controller.signal.aborted) {
          console.warn('GOS API unavailable, using live Firestore data:', (e as Error).message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);
  return { loading, error, retry: () => setRevision(v => v + 1) };
}
// Server responses supply IDs. Only commit canonical CRM fields after API success.
export async function dispatchGosCRM(action: { type: string; payload?: any }): Promise<any> {
  const p = action.payload;
  try {
    if (action.type === addLead.type) {
      const data = await gosApi.createLead(leadPayload(p)) as { lead: ApiRecord };
      const lead = normalizeLead(data.lead); store.dispatch(addLead(lead)); return lead;
    }
    if (action.type === 'crm/moveLead') {
      const data = await gosApi.moveLead(p.id, p.stage) as { lead: ApiRecord };
      store.dispatch(updateLead({ id: p.id, changes: normalizeLead(data.lead) })); return data.lead;
    }
    if (action.type === 'crm/addLeadNote') {
      const data = await gosApi.addNote(p.id, p.note) as { lead: ApiRecord };
      store.dispatch(updateLead({ id: p.id, changes: normalizeLead(data.lead) })); return data.lead;
    }
    if (action.type === updateLead.type) {
      const body = leadPayload(p.changes); delete body.lifecycle_stage;
      if (Object.keys(body).length) {
        const data = await gosApi.updateLead(p.id, body) as { lead: ApiRecord };
        store.dispatch(updateLead({ id: p.id, changes: { ...p.changes, ...normalizeLead(data.lead) } })); return data.lead;
      }
    }
    if (action.type === deleteLeads.type) {
      await gosApi.bulkLeads(p, 'delete'); store.dispatch(action); return p;
    }
    if (action.type === savePipeline.type) {
      const body = { name: p.name, stages: p.stages };
      const data = await (store.getState().crm.pipelines.some(row => row.id === p.id) ? gosApi.updatePipeline(p.id, body) : gosApi.createPipeline(body)) as { pipeline: Pipeline };
      store.dispatch(savePipeline(data.pipeline)); return data.pipeline;
    }
    return store.dispatch(action);
  } catch (e) {
    console.warn('GOS API sync failed, persisting locally to workspace Firestore:', (e as Error).message);
    return store.dispatch(action);
  }
}
