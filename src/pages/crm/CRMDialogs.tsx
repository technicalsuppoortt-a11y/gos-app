import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react';
import { X, Upload } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { addLead, updateLead, savePipeline } from '../../store/slices/crmSlice';
import { colors, makeLead, owners, parseCSV, sources, stageIds, type Pipeline } from './model';
import { CustomSelect } from './CRMPrimitives';

export function Dialog({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const onEscape = useEffectEvent(close);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () => [...(ref.current?.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href]') ?? [])].filter(el => !el.hasAttribute('disabled'));
    focusable()[0]?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape();
      if (e.key === 'Tab') { const items = focusable(); const first = items[0], last = items.at(-1); if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } }
    };
    document.addEventListener('keydown', handler);
    return () => { document.removeEventListener('keydown', handler); previous?.focus(); };
  }, []);
  return <div className="crm2-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) close(); }}><div className="crm-dialog" ref={ref} role="dialog" aria-modal="true" aria-label={title}><div className="crm-dialog-head"><h2>{title}</h2><button onClick={close} aria-label="Close dialog"><X size={18}/></button></div>{children}</div></div>;
}

export function AddLeadDialog({ pipeline, initialStage, close, created }: { pipeline: Pipeline; initialStage: string; close: () => void; created: (id: string) => void }) {
  const dispatch = useDispatch<AppDispatch>(); const [error, setError] = useState(''); const leads = useSelector((s: RootState) => s.crm.leads);
  return <Dialog title="Add a new lead" close={close}><form onSubmit={e => {
    e.preventDefault(); const data = new FormData(e.currentTarget); const name = String(data.get('name')).trim(), email = String(data.get('email')).trim();
    if (!name) return setError('Enter a contact name.');
    if (leads.some(l => l.email.toLowerCase() === email.toLowerCase())) return setError('A contact with this email already exists.');
    const stage = pipeline.stages.find(s => s.id === data.get('stage'))!.id;
    const lead = makeLead({ name, email, phone: String(data.get('phone')), company: String(data.get('company')), owner: String(data.get('owner')), source: String(data.get('source')), value: Number(data.get('value')), pipelineId: pipeline.id, stage, lifecycleStage: stage, tags: String(data.get('tags')).split(',').map(s => s.trim()).filter(Boolean) });
    dispatch(addLead(lead)); created(lead.id);
  }}><div className="crm-form-grid"><label>Name<input name="name" required placeholder="Sarah Chen"/></label><label>Email<input name="email" type="email" required placeholder="sarah@company.com"/></label><label>Phone<input name="phone" type="tel" placeholder="+20 …"/></label><label>Company<input name="company" placeholder="Company name"/></label><label>Source<CustomSelect name="source" options={sources.map(s => ({ value: s, label: s }))} /></label><label>Owner<CustomSelect name="owner" options={owners.map(s => ({ value: s, label: s }))} /></label><label>Stage<CustomSelect name="stage" defaultValue={initialStage} options={pipeline.stages.map(s => ({ value: s.id, label: s.label }))} /></label><label>Deal value (€)<input name="value" type="number" min="0" step="0.01" defaultValue="0" required/></label><label className="crm-span">Tags<input name="tags" placeholder="Coaching, High Intent"/></label>{error && <p className="crm-error crm-span" role="alert">{error}</p>}</div><div className="crm-dialog-footer"><button type="button" className="crm2-btn-secondary" onClick={close}>Cancel</button><button className="crm2-btn-primary">Create lead</button></div></form></Dialog>;
}

export function SettingsDialog({ pipeline, close, notify }: { pipeline: Pipeline; close: () => void; notify: (text: string) => void }) {
  const dispatch = useDispatch<AppDispatch>(); const [draft, setDraft] = useState<Pipeline>(structuredClone(pipeline));
  return <Dialog title="Pipeline settings" close={close}><form onSubmit={e => { e.preventDefault(); dispatch(savePipeline({ ...draft, name: draft.name.trim(), stages: draft.stages.map(s => ({ ...s, label: s.label.trim() })) })); notify('Pipeline settings saved.'); close(); }}><div className="crm-dialog-content"><label className="crm-field">Pipeline name<input required value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}/></label><p className="crm-muted">Customize your stages, colors and order. Removed stages use the closest available stage.</p><div className="crm-stage-settings">{draft.stages.map((stage, i) => <div key={stage.id}><input aria-label={`Color for ${stage.label}`} type="color" value={stage.color} onChange={e => setDraft({ ...draft, stages: draft.stages.map((s, n) => n === i ? { ...s, color: e.target.value } : s) })}/><input required aria-label={`Stage ${i + 1} name`} value={stage.label} onChange={e => setDraft({ ...draft, stages: draft.stages.map((s, n) => n === i ? { ...s, label: e.target.value } : s) })}/><button type="button" disabled={i === 0} aria-label={`Move ${stage.label} up`} onClick={() => { const stages = [...draft.stages]; [stages[i - 1], stages[i]] = [stages[i], stages[i - 1]]; setDraft({ ...draft, stages }); }}>↑</button><button type="button" disabled={i === draft.stages.length - 1} aria-label={`Move ${stage.label} down`} onClick={() => { const stages = [...draft.stages]; [stages[i + 1], stages[i]] = [stages[i], stages[i + 1]]; setDraft({ ...draft, stages }); }}>↓</button><button type="button" disabled={draft.stages.length === 1} aria-label={`Remove ${stage.label}`} onClick={() => setDraft({ ...draft, stages: draft.stages.filter(s => s.id !== stage.id) })}><X size={14}/></button></div>)}</div><button type="button" className="crm2-btn-secondary" disabled={draft.stages.length === stageIds.length} onClick={() => { const id = stageIds.find(id => !draft.stages.some(s => s.id === id))!; setDraft({ ...draft, stages: [...draft.stages, { id, label: 'New stage', color: colors[draft.stages.length] }] }); }}>+ Add stage</button></div><div className="crm-dialog-footer"><button type="button" className="crm2-btn-secondary" onClick={close}>Cancel</button><button className="crm2-btn-primary" disabled={!draft.name.trim() || draft.stages.some(s => !s.label.trim())}>Save changes</button></div></form></Dialog>;
}

export function ImportDialog({ pipeline, close, notify }: { pipeline: Pipeline; close: () => void; notify: (text: string) => void }) {
  const dispatch = useDispatch<AppDispatch>(); const leads = useSelector((s: RootState) => s.crm.leads);
  const [rows, setRows] = useState<string[][]>([]); const [mapping, setMapping] = useState<Record<string, string>>({}); const [duplicates, setDuplicates] = useState('skip'); const [error, setError] = useState(''); const [fileName, setFileName] = useState('');
  const fields = ['name', 'email', 'phone', 'company', 'source', 'owner', 'value', 'tags'];
  function runImport() {
    if (mapping.name === undefined || mapping.email === undefined || mapping.name === '' || mapping.email === '') return setError('Map both name and email fields.');
    const emails = new Set(leads.map(l => l.email.toLowerCase())); let added = 0, updated = 0, skipped = 0;
    for (const row of rows.slice(1)) {
      const get = (field: string) => mapping[field] === '' || mapping[field] === undefined ? '' : row[Number(mapping[field])] ?? '';
      const name = get('name').trim(), email = get('email').trim(); const value = get('value').trim() ? Number(get('value')) : 0;
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !Number.isFinite(value) || value < 0) { skipped++; continue; }
      const existing = leads.find(l => l.email.toLowerCase() === email.toLowerCase());
      if (emails.has(email.toLowerCase())) {
        if (duplicates === 'update' && existing) { const changes: Record<string, string | number | string[]> = { name, email }; for (const field of fields.slice(2)) if (mapping[field] !== undefined && mapping[field] !== '') changes[field] = field === 'value' ? value : field === 'tags' ? get(field).split(/[;,]/).map(t => t.trim()).filter(Boolean) : get(field); dispatch(updateLead({ id: existing.id, changes })); updated++; } else skipped++;
      } else { dispatch(addLead(makeLead({ name, email, phone: get('phone'), company: get('company'), source: get('source') || 'Website', owner: get('owner') || owners[0], value, tags: get('tags').split(/[;,]/).map(t => t.trim()).filter(Boolean), pipelineId: pipeline.id, stage: pipeline.stages[0].id, lifecycleStage: pipeline.stages[0].id }))); emails.add(email.toLowerCase()); added++; }
    }
    notify(`Import complete: ${added} added, ${updated} updated, ${skipped} duplicate or invalid rows skipped.`); close();
  }
  return <Dialog title="Import contacts from CSV" close={close}><div className="crm-dialog-content"><label className="crm-upload"><Upload size={24}/><b>{fileName || 'Choose a CSV file'}</b><span>Name and email are required. Maximum 5 MB.</span><input type="file" accept=".csv,text/csv" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; setError(''); setRows([]); if (file.size > 5 * 1024 * 1024) return setError('Choose a file smaller than 5 MB.'); try { const data = parseCSV(await file.text()); if (data.length < 2) return setError('The CSV needs a header and at least one contact.'); setRows(data); setFileName(file.name); const next: Record<string, string> = {}; fields.forEach(field => { const index = data[0].findIndex(h => h.trim().toLowerCase().replace(/[ _]/g, '') === field); next[field] = index < 0 ? '' : String(index); }); setMapping(next); } catch (err) { setError((err as Error).message); } }}/></label>{rows.length > 0 && <><p>{rows.length - 1} rows · Map your columns</p><div className="crm-form-grid">{fields.map(field => <label key={field}>{field}{['name', 'email'].includes(field) && ' *'}<CustomSelect value={mapping[field] ?? ''} onChange={val => setMapping({ ...mapping, [field]: val })} options={[{ value: '', label: 'Ignore column' }, ...rows[0].map((header, i) => ({ value: String(i), label: header || `Column ${i + 1}` }))]}/></label>)}</div><label className="crm-field">Duplicate email handling<CustomSelect value={duplicates} onChange={val => setDuplicates(val)} options={[{ value: 'skip', label: 'Skip existing contacts' }, { value: 'update', label: 'Update mapped fields of existing contacts' }]} /></label><p className="crm-muted">Invalid names, emails and deal values are skipped. New contacts enter {pipeline.name}.</p></>}{error && <p className="crm-error" role="alert">{error}</p>}</div><div className="crm-dialog-footer"><button className="crm2-btn-secondary" onClick={close}>Cancel</button><button className="crm2-btn-primary" disabled={rows.length < 2} onClick={runImport}>Import contacts</button></div></Dialog>;
}
