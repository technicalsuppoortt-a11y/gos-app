import { useEffect, useState } from 'react';
import { gosApi, type ApiRecord } from './gosApi';
import { store } from '../store';
import { hydrateCRM, addLead, updateLead, savePipeline, deleteLeads, type CanonicalLead } from '../store/slices/crmSlice';
import type { Pipeline } from '../pages/crm/model';
import { normalizeCRMLead, mergeCRMLeads, exportCSV as exportLocalCSV } from '../pages/crm/model';
import { showToast } from '../utils/toast';
import { GosApiError } from './gosTransport';
import { doc, getDoc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { moveLead } from '../store/slices/crmSlice';

const missingApiLead = (error: unknown) => error instanceof GosApiError &&
  (error.code === 'lead_not_found' || error.status === 404 && /lead.*not.found|lead_not_found/i.test(error.message));

async function moveWorkspaceLead(id: string, stage: string) {
  const state = store.getState();
  const scope = state.auth.tenant?.id;
  if (!scope || !state.crm.leads.some(lead => lead.id === id)) throw new Error('This lead is no longer available in your workspace.');
  // Await the canonical write before reporting success. Keep the booking ID and all
  // consent/booking metadata; creating a new API ID would duplicate this contact.
  const ref = doc(db, 'tenants', scope, 'leads', id);
  if (!(await getDoc(ref)).exists()) throw new Error('This lead is no longer available in your workspace.');
  await updateDoc(ref, { stage, lifecycleStage: stage, lastActivity: new Date().toISOString() });
  if (store.getState().auth.tenant?.id !== scope) return;
  store.dispatch({ type: 'crm/setLeadBackend', payload: { scope, id, backend: 'firestore' } });
  store.dispatch(moveLead({ id, stage: stage as CanonicalLead['lifecycleStage'] }));
  return store.getState().crm.leads.find(lead => lead.id === id);
}

export function normalizeLead(row: ApiRecord): CanonicalLead {
  const existing = store.getState().crm.leads.find(lead => lead.id === row.id);
  const normalized = normalizeCRMLead(row, existing);
  return mergeCRMLeads([normalized], existing ? [existing] : [])[0];
}
export function leadPayload(row: Partial<CanonicalLead>) {
  const body: ApiRecord = {};
  for (const field of ['name', 'email', 'phone', 'company', 'source', 'owner', 'value', 'tags'] as const) if (row[field] !== undefined) body[field] = row[field];
  if (row.pipelineId !== undefined) body.pipeline_id = row.pipelineId;
  if (row.lifecycleStage !== undefined) body.lifecycle_stage = row.lifecycleStage;
  return body;
}
function hydrateAPILeadList(rows: ApiRecord[], scope: string, pipelines = store.getState().crm.pipelines) {
  if (store.getState().auth.tenant?.id !== scope) return;
  const current = store.getState().crm;
  const apiLeads = rows.map(normalizeLead);
  const ids = new Set(apiLeads.map(lead => lead.id));
  // API mirrors deduplicate by native ID; independent workspace captures stay visible.
  store.dispatch(hydrateCRM({
    leads: mergeCRMLeads(apiLeads, current.leads), pipelines,
    apiLeadIds: [...ids], apiLeadScope: scope,
  }));
}
export async function refreshGosCRM(signal?: AbortSignal) {
  const scope = store.getState().auth.tenant?.id;
  const [leads, pipelines] = await Promise.all([gosApi.leads(undefined, signal), gosApi.pipelines(signal)]);
  if (signal?.aborted || !scope || store.getState().auth.tenant?.id !== scope) return;
  if (!Array.isArray(leads.leads) || !Array.isArray(pipelines.pipelines)) throw new Error('The GOS API returned invalid CRM data.');
  const current = store.getState().crm;
  const apiPipelines = (pipelines.pipelines as Pipeline[]).map(pipeline => {
    const existing = current.pipelines.find(item => item.id === pipeline.id);
    return existing?.archived ? { ...pipeline, archived: true, archivedAt: existing.archivedAt } : pipeline;
  });
  const apiPipelineIds = new Set(apiPipelines.map(p => p.id));
  hydrateAPILeadList(leads.leads, scope, [...current.pipelines.filter(p => !apiPipelineIds.has(p.id)), ...apiPipelines]);
}
async function updateWorkspaceLead(id: string, changes: Partial<CanonicalLead>) {
  const scope = store.getState().auth.tenant?.id;
  const lead = store.getState().crm.leads.find(item => item.id === id);
  if (!scope || !lead) throw new Error('This contact is no longer available. Refresh the pipeline.');
  const ref = doc(db, 'tenants', scope, 'leads', id);
  if (!(await getDoc(ref)).exists()) throw new Error('This contact is no longer available. Refresh the pipeline.');
  const saved = { ...changes, lastActivity: new Date().toISOString() };
  await updateDoc(ref, JSON.parse(JSON.stringify(saved)));
  if (store.getState().auth.tenant?.id !== scope) return undefined;
  store.dispatch({ type: 'crm/setLeadBackend', payload: { scope, id, backend: 'firestore' } });
  store.dispatch(updateLead({ id, changes: saved }));
  return { ...lead, ...saved };
}
function isWorkspaceOnlyLead(id: string) {
  const state = store.getState();
  const scope = state.auth.tenant?.id;
  const backend = scope && state.crm.leadBackends?.[scope]?.[id];
  return backend ? backend === 'firestore' : state.crm.apiLeadScope === scope && !state.crm.apiLeadIds.includes(id);
}
export async function bulkGosCRM(ids: string[], action: 'tag' | 'owner' | 'stage' | 'delete', value?: string) {
  const scope = store.getState().auth.tenant?.id;
  if (!scope) throw new Error('Sign in to update contacts.');
  const unique = [...new Set(ids)];
  const workspaceIds = unique.filter(isWorkspaceOnlyLead), apiIds = unique.filter(id => !isWorkspaceOnlyLead(id));
  if (apiIds.length) {
    await gosApi.bulkLeads(apiIds, action, value);
    if (store.getState().auth.tenant?.id !== scope) return;
    if (action === 'delete') store.dispatch(deleteLeads(apiIds));
  }
  for (const id of workspaceIds) {
    if (store.getState().auth.tenant?.id !== scope) return;
    const lead = store.getState().crm.leads.find(item => item.id === id);
    if (!lead) continue;
    if (action === 'delete') {
      const ref = doc(db, 'tenants', scope, 'leads', id);
      if ((await getDoc(ref)).exists()) await deleteDoc(ref);
      if (store.getState().auth.tenant?.id !== scope) return;
      store.dispatch(deleteLeads([id]));
    } else if (action === 'stage') await moveWorkspaceLead(id, value!);
    else await updateWorkspaceLead(id, action === 'owner' ? { owner: value! } : { tags: [...new Set([...lead.tags, value!])] });
  }
  if (apiIds.length && action !== 'delete') await refreshGosCRM();
}
// Pipeline DELETE is not in the GOS contract. Persist a reversible workspace archive.
export async function archiveGosPipeline(pipelineId: string) {
  const state = store.getState(); const scope = state.auth.tenant?.id;
  const pipeline = state.crm.pipelines.find(item => item.id === pipelineId && !item.archived);
  if (!scope || !pipeline) throw new Error('This pipeline is no longer available.');
  if (state.crm.pipelines.filter(item => !item.archived).length <= 1) throw new Error('Keep at least one active pipeline.');
  if (state.crm.leads.some(lead => (lead.pipelineId || 'main') === pipelineId)) throw new Error('Move this pipeline’s contacts before archiving it.');
  const archived = { ...pipeline, archived: true, archivedAt: new Date().toISOString() };
  await setDoc(doc(db, 'tenants', scope, 'pipelines', pipelineId), archived, { merge: true });
  if (store.getState().auth.tenant?.id !== scope) return undefined;
  store.dispatch(savePipeline(archived));
  return archived;
}
export async function attachGosProduct(leadId: string, product: { id: string; name: string }) {
  const lead = store.getState().crm.leads.find(item => item.id === leadId);
  if (!lead || !product.id || !product.name.trim()) throw new Error('Choose an available contact and product.');
  if (lead.attachedProducts?.some(item => item.productId === product.id)) return lead;
  return dispatchGosCRM(updateLead({ id: leadId, changes: { attachedProducts: [...(lead.attachedProducts ?? []), { productId: product.id, productName: product.name, attachedAt: new Date().toISOString() }] } }));
}
export async function exportGosCRM(leads: CanonicalLead[], pipelineId: string) {
  const state = store.getState();
  const pipelineLeads = state.crm.leads.filter(lead => (lead.pipelineId || 'main') === pipelineId &&
    (state.crm.apiLeadScope !== state.auth.tenant?.id || state.crm.apiLeadIds.includes(lead.id)));
  if (leads.some(lead => isWorkspaceOnlyLead(lead.id))) return exportLocalCSV(leads);
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
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    gosApi.me(controller.signal).then(() => refreshGosCRM(controller.signal)).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);
  return { loading, error, retry: () => setRevision(v => v + 1) };
}
export async function resolveGosLead(id: string, signal?: AbortSignal, preferWorkspace = false): Promise<{ lead: CanonicalLead; backend: 'api' | 'firestore' } | undefined> {
  const scope = store.getState().auth.tenant?.id;
  if (!scope) throw new Error('Sign in to open this contact.');
  const currentScope = () => !signal?.aborted && store.getState().auth.tenant?.id === scope;
  const commitSource = (lead: CanonicalLead, backend: 'api' | 'firestore') => {
    if (!currentScope()) return undefined;
    store.dispatch({ type: 'crm/setLeadBackend', payload: { scope, id, backend } });
    return { lead, backend };
  };
  async function workspace() {
    const snapshot = await getDoc(doc(db, 'tenants', scope!, 'leads', id));
    if (!currentScope() || !snapshot.exists()) return undefined;
    // The document ID is authoritative, even if a legacy embedded id is stale.
    return normalizeCRMLead({ ...snapshot.data(), id }, store.getState().crm.leads.find(lead => lead.id === id));
  }
  const useWorkspace = preferWorkspace || isWorkspaceOnlyLead(id);
  if (useWorkspace) {
    const lead = await workspace();
    if (!currentScope()) return undefined;
    if (lead) return commitSource(lead, 'firestore');
    if (preferWorkspace) throw new Error('This contact is no longer available in your workspace.');
  }
  try {
    const result = await gosApi.lead(id, signal);
    if (!currentScope()) return undefined;
    if (result.lead) return commitSource(normalizeLead(result.lead), 'api');
  } catch (error) { if (!missingApiLead(error)) throw error; }
  const lead = useWorkspace ? undefined : await workspace();
  if (!currentScope()) return undefined;
  if (lead) return commitSource(lead, 'firestore');
  throw new Error('This contact is no longer available in your workspace.');
}
// Poll the owning store after resolution; a Firestore fallback never clears the board.
export function useGosLead(leadId?: string) {
  const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!leadId) { setLoading(false); return; }
    const controller = new AbortController(); const scope = store.getState().auth.tenant?.id;
    let timer: ReturnType<typeof setTimeout>; let workspaceOnly = false;
    async function load() {
      setLoading(true); setError('');
      try {
        const result = await resolveGosLead(leadId!, controller.signal, workspaceOnly);
        if (!result || controller.signal.aborted || store.getState().auth.tenant?.id !== scope) return;
        workspaceOnly = result.backend === 'firestore';
        store.dispatch(store.getState().crm.leads.some(lead => lead.id === result.lead.id)
          ? updateLead({ id: result.lead.id, changes: result.lead }) : addLead(result.lead));
      } catch (err) { if (!controller.signal.aborted) setError((err as Error).message); }
      finally { if (!controller.signal.aborted) { setLoading(false); timer = setTimeout(load, 10000); } }
    }
    void load(); return () => { controller.abort(); clearTimeout(timer); };
  }, [leadId, revision]);
  return { error, loading, retry: () => setRevision(value => value + 1) };
}
// Server responses supply IDs. Only commit canonical CRM fields after API success.
export async function dispatchGosCRM(action: { type: string; payload?: any }): Promise<any> {
  const p = action.payload;
  if (action.type === addLead.type) {
    const data = await gosApi.createLead(leadPayload(p)) as { lead: ApiRecord };
    const lead = normalizeLead(data.lead);
    const current = store.getState().crm; const scope = store.getState().auth.tenant?.id;
    store.dispatch(hydrateCRM({ leads: [lead, ...current.leads.filter(item => item.id !== lead.id)], pipelines: current.pipelines, apiLeadIds: [...(current.apiLeadIds ?? []), lead.id], apiLeadScope: scope })); return lead;
  }
  if (action.type === 'crm/moveLead') {
    if (isWorkspaceOnlyLead(p.id)) return moveWorkspaceLead(p.id, p.stage);
    try {
      const existing = await gosApi.lead(p.id) as { lead?: ApiRecord | null; leads?: ApiRecord[] };
      const scope = store.getState().auth.tenant?.id;
      if (existing.leads && scope) hydrateAPILeadList(existing.leads, scope);
      if (!existing.lead) return await moveWorkspaceLead(p.id, p.stage);
    } catch (error) {
      if (!missingApiLead(error)) throw error;
      return await moveWorkspaceLead(p.id, p.stage);
    }
    let data: { lead: ApiRecord };
    try { data = await gosApi.moveLead(p.id, p.stage) as { lead: ApiRecord }; }
    catch (error) {
      // The record may have disappeared between the lookup and the stage write.
      if (!missingApiLead(error)) throw error;
      return await moveWorkspaceLead(p.id, p.stage);
    }
    store.dispatch(updateLead({ id: p.id, changes: normalizeLead(data.lead) })); return data.lead;
  }
  if (action.type === 'crm/addLeadNote') {
    const saveNoteToWorkspace = () => {
      const lead = store.getState().crm.leads.find(item => item.id === p.id);
      if (!lead) throw new Error('This contact is no longer available.');
      return updateWorkspaceLead(p.id, { notes: [p.note, ...lead.notes], activities: [{ id: crypto.randomUUID(), type: 'note', title: 'Internal note added', detail: p.note, at: new Date().toISOString() }, ...lead.activities] });
    };
    if (isWorkspaceOnlyLead(p.id)) return saveNoteToWorkspace();
    try {
      const data = await gosApi.addNote(p.id, p.note) as { lead: ApiRecord };
      store.dispatch(updateLead({ id: p.id, changes: normalizeLead(data.lead) })); return data.lead;
    } catch (error) {
      if (!missingApiLead(error)) throw error;
      return saveNoteToWorkspace();
    }
  }
  if (action.type === updateLead.type || action.type === 'crm/setLeadConsent' || action.type === 'crm/setLeadFollowUpState') {
    const changes = action.type === updateLead.type ? p.changes : action.type === 'crm/setLeadConsent' ? p.consent : { followUpState: p.followUpState };
    const scope = store.getState().auth.tenant?.id;
    const existing = store.getState().crm.leads.find(lead => lead.id === p.id);
    if (!scope || !existing) throw new Error('This lead is no longer available in your workspace.');
    if (isWorkspaceOnlyLead(p.id)) return updateWorkspaceLead(p.id, changes);
    const body = leadPayload(changes); delete body.lifecycle_stage;
    let canonical = existing;
    if (Object.keys(body).length) {
      try {
        const data = await gosApi.updateLead(p.id, body) as { lead: ApiRecord };
        canonical = normalizeLead(data.lead);
      } catch (error) {
        if (!missingApiLead(error)) throw error;
        return updateWorkspaceLead(p.id, changes);
      }
    }
    if (changes.lifecycleStage !== undefined) {
      const data = await gosApi.moveLead(p.id, changes.lifecycleStage) as { lead: ApiRecord };
      canonical = normalizeLead(data.lead);
    }
    // Tasks, consent and follow-up fields are not in the Laravel contract.
    // Await their tenant-scoped Firestore write before reporting a successful save.
    const local = Object.fromEntries(Object.entries(changes).filter(([key]) => !(key in body) && key !== 'pipelineId' && key !== 'lifecycleStage' && key !== 'stage'));
    if (Object.keys(local).length) {
      const activity = { id: crypto.randomUUID(), type: 'system' as const, title: 'Contact updated', detail: Object.keys(local).join(', '), at: new Date().toISOString() };
      const next = { ...canonical, ...changes, activities: [activity, ...canonical.activities] };
      await setDoc(doc(db, 'tenants', scope, 'leads', p.id), JSON.parse(JSON.stringify(next)), { merge: true });
      canonical = next;
    }
    if (store.getState().auth.tenant?.id !== scope) return undefined;
    store.dispatch(updateLead({ id: p.id, changes: canonical })); return canonical;
  }
  if (action.type === deleteLeads.type) {
    await bulkGosCRM(p, 'delete'); return p;
  }
  if (action.type === savePipeline.type) {
    const body = { name: p.name, stages: p.stages };
    const data = await (store.getState().crm.pipelines.some(row => row.id === p.id) ? gosApi.updatePipeline(p.id, body) : gosApi.createPipeline(body)) as { pipeline: Pipeline };
    store.dispatch(savePipeline(data.pipeline)); return data.pipeline;
  }
  return store.dispatch(action);
}
