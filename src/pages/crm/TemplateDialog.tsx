import { cloudStorage } from '../../backend/workspace';
import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Dialog } from './CRMDialogs';

import { loadCustomTemplates, storageKey, type CustomTemplate } from './templateStorage';

export function TemplateDialog({ close, created, existingNames }: { close: () => void; created: (template: CustomTemplate) => void; existingNames: string[] }) {
  useUILanguage();
  const [name, setName] = useState(''); const [description, setDescription] = useState('');
  const [stages, setStages] = useState(['New inquiry', 'Qualified', 'Won']); const [error, setError] = useState('');
  const move = (index: number, offset: number) => { const next = [...stages]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; setStages(next); };
  return <Dialog title={translateText("Create pipeline template")} close={close}><form onSubmit={e => {
    e.preventDefault(); const labels = stages.map(s => s.trim());
    if (!name.trim() || labels.some(s => !s)) return setError('Enter a name and a label for every stage.');
    if (existingNames.some(n => n.toLowerCase() === name.trim().toLowerCase())) return setError('Choose a unique template name.');
    if (new Set(labels.map(s => s.toLowerCase())).size !== labels.length) return setError('Stage names must be unique.');
    const template = { name: name.trim(), description: description.trim() || 'A custom pipeline for your team.', stages: labels };
    try { cloudStorage.setItem(storageKey, JSON.stringify([...loadCustomTemplates(), template])); } catch { return setError('Template could not be saved. Check available browser storage and try again.'); }
    created(template);
  }}><div className="crm-dialog-content crm-template-form"><label className="crm-field">{translateText("Template name")}<input aria-label={translateText("Template name")} maxLength={70} value={name} onChange={e => setName(e.target.value)} required/></label><label className="crm-field">{translateText("Description")}<input aria-label={translateText("Template description")} maxLength={160} value={description} onChange={e => setDescription(e.target.value)}/></label><p className="crm-muted">{translateText("Define 2–10 stages in order. The final stage represents a won deal.")}</p><div className="crm-template-stage-list">{localizeNode(stages.map((stage, index) => <div className="crm-template-stage-row" key={index}><span>{localizeNode(index + 1)}</span><input aria-label={translateText(`Stage ${index + 1} name`)} maxLength={40} value={stage} onChange={e => setStages(stages.map((s, i) => i === index ? e.target.value : s))} required/><button type="button" className="crm2-btn-secondary" aria-label={translateText(`Move stage ${index + 1} up`)} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={14}/></button><button type="button" className="crm2-btn-secondary" aria-label={translateText(`Move stage ${index + 1} down`)} disabled={index === stages.length - 1} onClick={() => move(index, 1)}><ArrowDown size={14}/></button><button type="button" className="crm2-btn-secondary" aria-label={translateText(`Remove stage ${index + 1}`)} disabled={stages.length <= 2} onClick={() => setStages(stages.filter((_, i) => i !== index))}><Trash2 size={14}/></button></div>))}</div><button type="button" className="crm2-btn-secondary" disabled={stages.length >= 10} onClick={() => setStages([...stages, ''])}><Plus size={14}/>{translateText("Add stage")}</button>{localizeNode(error && <p className="crm-error" role="alert">{localizeNode(error)}</p>)}</div><div className="crm-dialog-footer"><button type="button" className="crm2-btn-secondary" onClick={close}>{translateText("Cancel")}</button><button className="crm2-btn-primary">{translateText("Save template")}</button></div></form></Dialog>;
}
