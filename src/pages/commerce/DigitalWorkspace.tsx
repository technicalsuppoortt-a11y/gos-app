import { TagManager } from './TagManager';
import { DigitalAccessSettings } from './DigitalAccessSettings';
import { useDigitalFieldError } from './DigitalValidation';
import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import React from 'react';
import { Copy, CreditCard, Eye, Layers3, Link2, Package, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { Card, Field, Select, Status, Toggle } from './primitives';
import { DigitalFiles, IncludedItems, MediaCard } from './TypeForms';
import { DigitalDescription } from './DigitalDescription';
import type { FormProps } from './TypeForms';
import { PricingForm } from './PricingForms';
import type { Billing, CommerceConfig } from './model';

export function DigitalWorkspace(props: FormProps & { onStatus: (active: boolean) => void; onSalesPage: () => void; onCopy: () => void; onDuplicate: () => void; onDelete: () => void; onFunnel: () => void; onAutomation: () => void; disabled: boolean }) {
  useUILanguage();
  const { product: p, config: c, experience: e, editing, update, configure, customize } = props;
  const descriptionError = useDigitalFieldError('description');
  function billing(value: Billing) {
    configure({ billing: value, amount: value === 'One-time' ? e.oneTimeAmount : value === 'Payment plan' ? e.installmentAmount : e.recurringAmount });
    customize({ planEnabled: value === 'Payment plan', recurringEnabled: value === 'Subscription' });
  }
  function amount(value: number) { configure({ amount: value }); customize(c.billing === 'One-time' ? { oneTimeAmount: value } : c.billing === 'Payment plan' ? { installmentAmount: value } : { recurringAmount: value }); }
  const money = (amount: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: c.currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
  return <div className="min-w-0"><div className="dw-grid">
    <div className="dw-column dw-left">
      <Card title={translateText("Product Information")} className="dw-information">
        <Field label="Product Name *"><input disabled={!editing} maxLength={140} value={p.name} onChange={event => update({ name: event.target.value })} placeholder={translateText("Enter your product name")}/></Field>
        <Field label="Short Description"><input disabled={!editing} maxLength={300} value={e.shortDescription} onChange={event => customize({ shortDescription: event.target.value })} placeholder={translateText("A short introduction to your product")}/></Field>
        <div data-validation-field="description" className={descriptionError ? 'dv-invalid' : ''}><div className="tw-field-heading">{translateText("Full Description")} <span className="dv-required text-red-500">*</span></div>
        <DigitalDescription value={p.description} editing={editing} onChange={description => update({ description })}/>{descriptionError && <small className="dv-error">{descriptionError}</small>}</div>
      </Card>
      <DigitalFiles {...props} compact paginate={false}/>
      <Card title={translateText("Pricing & Payment")} className="dw-pricing">
        <div className="dw-pricing-options">{localizeNode((['One-time', 'Payment plan', 'Subscription'] as const).map((value, index) => <button key={value} disabled={!editing} aria-pressed={c.billing === value} className={c.billing === value ? 'selected' : ''} onClick={() => billing(value)}>{localizeNode(index === 0 ? <span className="dw-radio"/> : index === 1 ? <CreditCard className="dw-billing-icon" size={13}/> : <Package className="dw-billing-icon" size={13}/>)}<span><b>{localizeNode(['One-time Payment', 'Payment Plan', 'Subscription'][index])}</b><small>{localizeNode(['Single payment', 'Multiple payments', 'Recurring payment'][index])}</small><strong>{localizeNode(index === 0 ? money(e.oneTimeAmount) : index === 1 ? `${money(e.installmentAmount)} × ${c.installments}` : `${money(e.recurringAmount)} / ${c.frequency === 'Yearly' ? 'year' : c.frequency === 'Quarterly' ? 'quarter' : 'month'}`)}</strong></span></button>))}</div>
        <div className="cw-form-grid"><Field label="Price *"><div className="dw-money"><input type="number" min="0" step="0.01" disabled={!editing} value={Number.isFinite(c.amount) ? c.amount : ''} onChange={event => amount(event.target.value === '' ? NaN : Number(event.target.value))}/><Select disabled={!editing} value={c.currency} options={['EUR', 'USD', 'GBP']} onChange={currency => configure({ currency: currency as CommerceConfig['currency'] })}/></div></Field><Field label="Compare Price (Optional)"><div className="dw-money"><input type="number" min="0" step="0.01" disabled={!editing} value={e.comparePrice || ''} onChange={event => customize({ comparePrice: Number(event.target.value), showComparePrice: !!event.target.value })}/><Select disabled={!editing} value={c.currency} options={['EUR', 'USD', 'GBP']} onChange={currency => configure({ currency: currency as CommerceConfig['currency'] })}/></div></Field></div>
      </Card>
      {localizeNode(c.billing !== 'One-time' && <PricingForm {...props}/>)}
    </div>
    <div className="dw-column dw-middle">
      <div className="dw-image-group"><MediaCard {...props} compact/>
      <Card title={translateText("Product Tags")} className="dw-tags-card"><TagManager tags={e.tags} disabled={!editing} onChange={tags => customize({ tags })}/></Card></div>
      <Card title={translateText("Access & Download Settings")} className="dw-access">
        <DigitalAccessSettings {...props}/>
      </Card>
      <IncludedItems {...props} compact paginate={false}/>
    </div>
    <aside className="dw-column dw-sidebar">
      <Card title={translateText("Product Status")} className="dw-status-card" action={<div className="dw-status"><Status status={p.status}/><Toggle label="Product active" checked={p.status === 'Active'} disabled={!editing} onChange={props.onStatus}/></div>}>
        <div className="dw-visibility"><span>{translateText("Visibility")}</span><div>{localizeNode((['Published', 'Private', 'Unlisted'] as const).map((visibility, index) => <label key={visibility}><input type="radio" name="digital-visibility" checked={e.visibility === visibility} disabled={!editing} onChange={() => customize({ visibility })}/><span>{localizeNode(visibility)}<small>{localizeNode(['Visible to everyone', 'Only people with link', 'Only existing customers'][index])}</small></span></label>))}</div></div>
      </Card>
      <Card title={translateText("Product Details")} className="dw-details-card"><div className="cw-form-grid">
        <Field label="Category"><Select disabled={!editing} value={e.category} options={Array.from(new Set([e.category, 'Design Templates', 'E-books', 'Software', 'Media', 'Other']))} onChange={category => customize({ category })}/></Field>
        <Field label="Language"><Select disabled={!editing} value={e.language} options={['English', 'Arabic', 'French', 'German', 'Spanish']} onChange={language => customize({ language })}/></Field>
        <Field label="File Type"><Select disabled={!editing} value={e.fileType ?? ''} options={Array.from(new Set([e.fileType ?? '', 'Canva Template', 'ZIP Archive', 'PDF Document', 'Video', 'Image', 'Other']))} onChange={fileType => customize({ fileType })}/></Field>
        <Field label="File Size"><input readOnly value={c.assets[0]?.size ? `${Number((c.assets[0].size / 1024 / 1024).toFixed(1))} MB` : '—'}/></Field>
        <Field label="Version"><input type="number" min="1" step="0.1" disabled={!editing} defaultValue={e.version.toFixed(1)} onChange={event => { const version = Number(event.target.value); if (version >= 1) customize({ version }); }} onBlur={event => { event.currentTarget.value = e.version.toFixed(1); }}/></Field>
        <div className="cw-field"><span>{translateText("Tags / Keywords")}</span><TagManager tags={e.tags} disabled={!editing} onChange={tags => customize({ tags })}/></div>
      </div></Card>
      <Card title={translateText("Connected Tools")} className="dw-tools-card"><div className="dw-tools">{localizeNode([{ title: 'Funnel', icon: Layers3, description: 'Product sales funnel', connected: !!e.funnelUrl, action: props.onFunnel }, { title: 'Automation', icon: Sparkles, description: 'Product delivery automation', connected: c.automations.confirmation || c.automations.grantAccess, action: props.onAutomation }].map(({ title, icon: Icon, description, connected, action }) => <div key={title}><Icon size={18}/><span><b>{localizeNode(title)}</b><small>{localizeNode(description)}</small></span><em className={connected ? 'connected' : ''}>{localizeNode(connected ? 'Connected' : 'Connect')}</em><button onClick={action}>{localizeNode(connected ? 'Edit' : 'Set up')}</button></div>))}</div></Card>
      <Card title={translateText("Quick Actions")} className="dw-actions-card"><div className="dw-actions"><button onClick={props.onSalesPage}><Eye size={14}/>{translateText("View Product Page")}</button><button onClick={props.onCopy}><Link2 size={14}/>{translateText("Copy Product Link")}</button><button disabled={props.disabled} onClick={props.onDuplicate}><Copy size={14}/>{translateText("Duplicate Product")}</button><button className="dw-delete" disabled={!p.id || props.disabled} onClick={props.onDelete}><Trash2 size={14}/>{translateText("Delete Product")}</button></div></Card>
    </aside>
  </div></div>;
}
