import '../components/ui/quick-details.css';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
export type CRMRoute = { pipelineId?: string; stageId?: string };
export function CRMRouting({ value = {}, onChange, disabled = false, defaultStage = 'LEAD_CAPTURED' }: { defaultStage?: string; value?: CRMRoute; onChange: (value: CRMRoute) => void; disabled?: boolean }) {
  const pipelines = useSelector((s: RootState) => s.crm.pipelines).filter(p => !p.archived);
  const pipeline = pipelines.find(p => p.id === (value.pipelineId || 'main'));
  const stages = pipeline?.stages ?? [{ id: 'LEAD_CAPTURED', label: 'Lead captured' }];
  return <fieldset className="crm-routing" disabled={disabled}><legend>CRM lead routing</legend><label>Pipeline<select aria-label="Pipeline" value={value.pipelineId ?? ''} onChange={e => { const p = pipelines.find(p => p.id === e.target.value); onChange(p ? { pipelineId: p.id, stageId: p.stages[0]?.id } : {}); }}><option value="">Default · Main Pipeline</option>{value.pipelineId && !pipeline && <option value={value.pipelineId}>Unavailable pipeline · choose another</option>}{pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Initial stage<select aria-label="Initial stage" value={value.stageId ?? (value.pipelineId ? stages[0]?.id : defaultStage)} onChange={e => onChange({ pipelineId: pipeline?.id || 'main', stageId: e.target.value })}>{stages.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label></fieldset>;
}
