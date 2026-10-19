import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react';
import { X, Upload } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { addLead, updateLead, savePipeline } from '../../store/slices/crmSlice';
import { colors, makeLead, owners, parseCSV, sources, stageIds, type Pipeline } from './model';
import { dispatchGosCRM, refreshGosCRM } from '../../backend/gosCRM';
import { gosApi } from '../../backend/gosApi';
import { CustomSelect } from './CRMPrimitives';

export function Dialog({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  useUILanguage();
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
  return <div className="crm2-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) close(); }}><div className="crm-dialog" ref={ref} role="dialog" aria-modal="true" aria-label={translateText(title)}><div className="crm-dialog-head"><h2>{localizeNode(title)}</h2><button onClick={close} aria-label={translateText("Close dialog")}><X size={18}/></button></div>{localizeNode(children)}</div></div>;
}

export function AddLeadDialog({ pipeline, initialStage, close, created }: { pipeline: Pipeline; initialStage: string; close: () => void; created: (id: string) => void }) {
  useUILanguage();
  const dispatch = (action: Parameters<typeof dispatchGosCRM>[0]) => dispatchGosCRM(action); const [error, setError] = useState(''); const [saving, setSaving] = useState(false); const leads = useSelector((s: RootState) => s.crm.leads);
  return <Dialog title={translateText("Add a new lead")} close={close}><form onSubmit={async e => {
    e.preventDefault(); if (saving) return; const data = new FormData(e.currentTarget); const name = String(data.get('name')).trim(), email = String(data.get('email')).trim();
    if (!name) return setError('Enter a contact name.');
    if (leads.some(l => l.email.toLowerCase() === email.toLowerCase())) return setError('A contact with this email already exists.');
    const stage = pipeline.stages.find(s => s.id === data.get('stage'))!.id;
    const lead = makeLead({ name, email, phone: String(data.get('phone')), company: String(data.get('company')), owner: String(data.get('owner')), source: String(data.get('source')), value: Number(data.get('value')), pipelineId: pipeline.id, stage, lifecycleStage: stage, tags: String(data.get('tags')).split(',').map(s => s.trim()).filter(Boolean) });
    setSaving(true); try { const saved = await dispatch(addLead(lead)); created(saved.id); } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  }}><div className="crm-form-grid"><label>{translateText("Name")}<input name="name" required placeholder={translateText("Sarah Chen")}/></label><label>{translateText("Email")}<input name="email" type="email" required placeholder={translateText("sarah@company.com")}/></label><label>{translateText("Phone")}<input name="phone" type="tel" placeholder={translateText("+20 …")}/></label><label>{translateText("Company")}<input name="company" placeholder={translateText("Company name")}/></label><label>{translateText("Source")}<CustomSelect name="source" options={sources.map(s => ({ value: s, label: s }))} /></label><label>{translateText("Owner")}<CustomSelect name="owner" options={owners.map(s => ({ value: s, label: s }))} /></label><label>{translateText("Stage")}<CustomSelect name="stage" defaultValue={initialStage} options={pipeline.stages.map(s => ({ value: s.id, label: s.label }))} /></label><label>{translateText("Deal value (€)")}<input name="value" type="number" min="0" step="0.01" defaultValue="0" required/></label><label className="crm-span">{translateText("Tags")}<input name="tags" placeholder={translateText("Coaching, High Intent")}/></label>{localizeNode(error && <p className="crm-error crm-span" role="alert">{localizeNode(error)}</p>)}</div><div className="crm-dialog-footer"><button type="button" className="crm2-btn-secondary" onClick={close}>{translateText("Cancel")}</button><button className="crm2-btn-primary" disabled={saving}>{saving ? "Creating…" : translateText("Create lead")}</button></div></form></Dialog>;
}

export function SettingsDialog({ pipeline, close, notify }: { pipeline: Pipeline; close: () => void; notify: (text: string) => void }) {
  useUILanguage();
  const dispatch = (action: Parameters<typeof dispatchGosCRM>[0]) => dispatchGosCRM(action); const [draft, setDraft] = useState<Pipeline>(structuredClone(pipeline));
  return <Dialog title={translateText("Pipeline settings")} close={close}><form onSubmit={async e => { e.preventDefault(); try { await dispatch(savePipeline({ ...draft, name: draft.name.trim(), stages: draft.stages.map(s => ({ ...s, label: s.label.trim() })) })); notify('Pipeline settings saved.'); close(); } catch {} }}><div className="crm-dialog-content"><label className="crm-field">{translateText("Pipeline name")}<input required value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}/></label><p className="crm-muted">{translateText("Customize your stages, colors and order. Removed stages use the closest available stage.")}</p><div className="crm-stage-settings">{localizeNode(draft.stages.map((stage, i) => <div key={stage.id}><input aria-label={translateText(`Color for ${stage.label}`)} type="color" value={stage.color} onChange={e => setDraft({ ...draft, stages: draft.stages.map((s, n) => n === i ? { ...s, color: e.target.value } : s) })}/><input required aria-label={translateText(`Stage ${i + 1} name`)} value={stage.label} onChange={e => setDraft({ ...draft, stages: draft.stages.map((s, n) => n === i ? { ...s, label: e.target.value } : s) })}/><button type="button" disabled={i === 0} aria-label={translateText(`Move ${stage.label} up`)} onClick={() => { const stages = [...draft.stages]; [stages[i - 1], stages[i]] = [stages[i], stages[i - 1]]; setDraft({ ...draft, stages }); }}>↑</button><button type="button" disabled={i === draft.stages.length - 1} aria-label={translateText(`Move ${stage.label} down`)} onClick={() => { const stages = [...draft.stages]; [stages[i + 1], stages[i]] = [stages[i], stages[i + 1]]; setDraft({ ...draft, stages }); }}>↓</button><button type="button" disabled={draft.stages.length === 1} aria-label={translateText(`Remove ${stage.label}`)} onClick={() => setDraft({ ...draft, stages: draft.stages.filter(s => s.id !== stage.id) })}><X size={14}/></button></div>))}</div><button type="button" className="crm2-btn-secondary" disabled={draft.stages.length === stageIds.length} onClick={() => { const id = stageIds.find(id => !draft.stages.some(s => s.id === id))!; setDraft({ ...draft, stages: [...draft.stages, { id, label: 'New stage', color: colors[draft.stages.length] }] }); }}>{translateText("+ Add stage")}</button></div><div className="crm-dialog-footer"><button type="button" className="crm2-btn-secondary" onClick={close}>{translateText("Cancel")}</button><button className="crm2-btn-primary" disabled={!draft.name.trim() || draft.stages.some(s => !s.label.trim())}>{translateText("Save changes")}</button></div></form></Dialog>;
}

export function ImportDialog({ pipeline, close, notify }: { pipeline: Pipeline; close: () => void; notify: (text: string) => void }) {
  useUILanguage();
  const dispatch = (action: Parameters<typeof dispatchGosCRM>[0]) => dispatchGosCRM(action); const leads = useSelector((s: RootState) => s.crm.leads);
  const [rows, setRows] = useState<string[][]>([]); const [mapping, setMapping] = useState<Record<string, string>>({}); const [duplicates, setDuplicates] = useState('skip'); const [error, setError] = useState(''); const [fileName, setFileName] = useState('');
  const fields = ['name', 'email', 'phone', 'company', 'source', 'owner', 'value', 'tags'];
  async function runImport() {
    if (mapping.name === undefined || mapping.name === '' || mapping.email === undefined || mapping.email === '') return setError('Map both name and email fields.');
    try {
      const csv = rows.map(row => row.map(value => '"' + value.replaceAll('"', '""') + '"').join(',')).join('\n');
      const result = await gosApi.importLeads({ pipeline_id: pipeline.id, duplicates, mapping: Object.fromEntries(Object.entries(mapping).filter(([,value]) => value !== '').map(([key,value]) => [key, Number(value)])), csv }) as { import: { added: number; updated: number; skipped: number } };
      await refreshGosCRM(); notify('Import complete: ' + result.import.added + ' added.'); close();
    } catch (e) { setError((e as Error).message); }
  }
  return <Dialog title={translateText("Import contacts from CSV")} close={close}><div className="crm-dialog-content"><label className="crm-upload"><Upload size={24}/><b>{localizeNode(fileName || 'Choose a CSV file')}</b><span>{translateText("Name and email are required. Maximum 5 MB.")}</span><input type="file" accept=".csv,text/csv" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; setError(''); setRows([]); if (file.size > 5 * 1024 * 1024) return setError('Choose a file smaller than 5 MB.'); try { const data = parseCSV(await file.text()); if (data.length < 2) return setError('The CSV needs a header and at least one contact.'); setRows(data); setFileName(file.name); const next: Record<string, string> = {}; fields.forEach(field => { const index = data[0].findIndex(h => h.trim().toLowerCase().replace(/[ _]/g, '') === field); next[field] = index < 0 ? '' : String(index); }); setMapping(next); } catch (err) { setError((err as Error).message); } }}/></label>{localizeNode(rows.length > 0 && <><p>{localizeNode(rows.length - 1)}{translateText(" rows · Map your columns")}</p><div className="crm-form-grid">{localizeNode(fields.map(field => <label key={field}>{localizeNode(field)}{localizeNode(['name', 'email'].includes(field) && ' *')}<CustomSelect value={mapping[field] ?? ''} onChange={val => setMapping({ ...mapping, [field]: val })} options={[{ value: '', label: 'Ignore column' }, ...rows[0].map((header, i) => ({ value: String(i), label: header || `Column ${i + 1}` }))]}/></label>))}</div><label className="crm-field">{translateText("Duplicate email handling")}<CustomSelect value={duplicates} onChange={val => setDuplicates(val)} options={[{ value: 'skip', label: 'Skip existing contacts' }, { value: 'update', label: 'Update mapped fields of existing contacts' }]} /></label><p className="crm-muted">{translateText("Invalid names, emails and deal values are skipped. New contacts enter ")}{localizeNode(pipeline.name)}.</p></>)}{localizeNode(error && <p className="crm-error" role="alert">{localizeNode(error)}</p>)}</div><div className="crm-dialog-footer"><button className="crm2-btn-secondary" onClick={close}>{translateText("Cancel")}</button><button className="crm2-btn-primary" disabled={rows.length < 2} onClick={runImport}>{translateText("Import contacts")}</button></div></Dialog>;
}
