import { WorkspacePagePreview } from './WorkspacePagePreview';
import { PolicyPreviewLink } from './PolicyPreview';
import type { Product } from './model';
import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react';
import { CommerceSelect } from '../../components/ui/CommerceSelect';
import { translateText, useUILanguage } from '../../i18n/display';
import { checkoutFieldList, type CheckoutField, type CommerceConfig, type ProductExperience } from './model';
import { Field } from './primitives';
import './dynamic-checkout.css';

export function SlotChips({ values, onChange, disabled }: { values: string[]; onChange: (values: string[]) => void; disabled?: boolean }) {
  useUILanguage();
  const [value, setValue] = useState('');
  const add = () => { const next = value.trim(); if (next && !values.includes(next)) { onChange([...values, next]); setValue(''); } };
  return <div className="cx-slots"><span className="cx-label">{translateText('Preview scheduling slots')}</span><div className="cx-chips">{values.map((slot, index) => <span key={index}><input disabled={disabled} aria-label={translateText(`Time slot ${index + 1}`)} value={slot} onChange={event => onChange(values.map((item, i) => i === index ? event.target.value : item))}/><button type="button" disabled={disabled} aria-label={translateText(`Delete time slot ${index + 1}`)} onClick={() => onChange(values.filter((_, i) => i !== index))}><X size={12}/></button></span>)}</div><div className="cx-add-row"><input disabled={disabled} aria-label={translateText('New time slot')} value={value} placeholder={translateText('e.g. Mon 10:00')} onChange={event => setValue(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); add(); } }}/><button type="button" className="cw-button small" disabled={disabled || !value.trim()} onClick={add}><Plus size={12}/>{translateText('Add slot')}</button></div><small>{translateText(disabled ? 'Availability is managed by your connected calendar.' : 'Preview labels only. Reservations use the connected calendar.')}</small></div>;
}

export function CustomFieldsEditor({ config, configure, disabled }: { config: CommerceConfig; configure: (patch: Partial<CommerceConfig>) => void; disabled?: boolean }) {
  useUILanguage();
  const fields = checkoutFieldList(config);
  const [label, setLabel] = useState('');
  const change = (next: CheckoutField[]) => configure({ customCheckoutFields: next, checkoutFields: '' });
  const move = (index: number, direction: number) => { const next = [...fields]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; change(next); };
  return <div className="cx-fields"><span className="cx-label">{translateText('Custom checkout fields')}</span>{fields.map((field, index) => <div className="cx-field-row" key={field.id}><input disabled={disabled} aria-label={translateText(`Field label ${index + 1}`)} value={field.label} onChange={event => change(fields.map(item => item.id === field.id ? { ...item, label: event.target.value } : item))}/><label><input type="checkbox" disabled={disabled} checked={field.required} onChange={event => change(fields.map(item => item.id === field.id ? { ...item, required: event.target.checked } : item))}/>{translateText('Required')}</label><button type="button" disabled={disabled || index === 0} aria-label={translateText(`Move field ${index + 1} up`)} onClick={() => move(index, -1)}><ArrowUp size={13}/></button><button type="button" disabled={disabled || index === fields.length - 1} aria-label={translateText(`Move field ${index + 1} down`)} onClick={() => move(index, 1)}><ArrowDown size={13}/></button><button type="button" disabled={disabled} aria-label={translateText(`Delete field ${index + 1}`)} onClick={() => change(fields.filter(item => item.id !== field.id))}><Trash2 size={13}/></button></div>)}<div className="cx-add-row"><input disabled={disabled} aria-label={translateText('New checkout field label')} value={label} placeholder={translateText('Company Name, Tax ID…')} onChange={event => setLabel(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') event.preventDefault(); }}/><button type="button" disabled={disabled || !label.trim()} className="cw-button small" onClick={() => { change([...fields, { id: crypto.randomUUID(), label: label.trim(), required: false }]); setLabel(''); }}><Plus size={12}/>{translateText('Add field')}</button></div></div>;
}

export const thankYouOptions = [{ value: 'confirmation', label: 'Template 1 · Confirmation details' }, { value: 'onboarding', label: 'Template 2 · Next steps & onboarding' }, { value: 'community', label: 'Template 3 · Video greeting & community' }, { value: 'external', label: 'Custom External URL' }];
export const salesOptions = [{ value: 'hero', label: 'High-Converting Hero Sales Page' }, { value: 'vsl', label: 'Video Sales Letter (VSL) Layout' }, { value: 'minimal', label: 'Minimalist Clean Layout' }, { value: 'external', label: 'Custom External URL' }];
export function PageSelector({ product, config, configure, editing, kind }: { product: Product; config: CommerceConfig; configure: (patch: Partial<CommerceConfig>) => void; editing: boolean; kind: 'sales' | 'thankYou' }) {
  useUILanguage();
  const field = kind === 'sales' ? 'salesTemplate' : 'thankYouTemplate', url = kind === 'sales' ? 'salesUrl' : 'thankYouUrl';
  const value = config[field] ?? (config[url] ? 'external' : kind === 'sales' ? 'hero' : 'confirmation');
  return <><Field label={kind === 'sales' ? 'Sales page' : 'Thank-you page'}><CommerceSelect disabled={!editing} label={kind === 'sales' ? 'Sales page template' : 'Thank-you page template'} value={value} options={kind === 'sales' ? salesOptions : thankYouOptions} onChange={value => configure({ [field]: value, [url]: '' })}/></Field>{value === 'external' && <Field label={kind === 'sales' ? 'Custom sales page URL' : 'Custom thank-you URL'}><input disabled={!editing} type="url" value={config[url]} placeholder="https://" onChange={event => configure({ [url]: event.target.value })}/></Field>}{kind === 'sales' && value === 'vsl' && <Field label="Sales video URL"><input disabled={!editing} type="url" value={config.salesVideoUrl || ''} onChange={event => configure({salesVideoUrl: event.target.value})}/></Field>}{kind === 'thankYou' && value === 'community' && <Field label="Welcome video URL"><input disabled={!editing} type="url" value={config.thankYouVideoUrl || ''} onChange={event => configure({thankYouVideoUrl: event.target.value})}/></Field>}{kind === 'thankYou' && value === 'community' && <Field label="Community link"><input disabled={!editing} type="url" value={config.communityUrl} onChange={event => configure({communityUrl: event.target.value})}/></Field>}<WorkspacePagePreview product={{...product, config}} kind={kind}/></>;
}

export function PolicyControls({ checkout, onChange }: { checkout: ProductExperience['checkout']; onChange: (patch: Partial<ProductExperience['checkout']>) => void }) {
  useUILanguage();
  return <>{(['terms', 'privacy'] as const).map(kind => {
    const url = kind === 'terms' ? 'termsUrl' : 'privacyUrl', mode = kind === 'terms' ? 'termsMode' : 'privacyMode';
    const selected = checkout[mode] ?? (checkout[url] ? 'custom' : 'default');
    return <div key={kind}><Field label={kind === 'terms' ? 'Terms of Service' : 'Privacy Policy'}><CommerceSelect label={kind === 'terms' ? 'Terms policy source' : 'Privacy policy source'} value={selected} options={[{ value: 'default', label: 'Default platform policy' }, { value: 'custom', label: 'Custom Policy URL' }]} onChange={value => onChange({ [mode]: value, [url]: '' })}/></Field>{selected === 'custom' ? <Field label={kind === 'terms' ? 'Terms URL' : 'Privacy policy URL'}><input type="url" value={checkout[url] || ''} onChange={event => onChange({ [url]: event.target.value })}/></Field> : null}<PolicyPreviewLink kind={kind} custom={selected === 'custom'} url={checkout[url]}/></div>;
  })}</>;
}
