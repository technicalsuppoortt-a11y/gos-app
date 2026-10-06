import React from 'react';
import { Clock3, Copy, CreditCard, Download, Eye, FileDown, Layers3, Link2, LockKeyhole, Package, Plus, ShieldCheck, Sparkles, Trash2, X } from 'lucide-react';
import { Card, Field, Select, Status, Toggle } from './primitives';
import { DigitalFiles, IncludedItems, MediaCard } from './TypeForms';
import { DigitalDescription } from './DigitalDescription';
import type { FormProps } from './TypeForms';
import type { Billing, CommerceConfig } from './model';

export function DigitalWorkspace(props: FormProps & { onStatus: (active: boolean) => void; onSalesPage: () => void; onCopy: () => void; onDuplicate: () => void; onDelete: () => void; onFunnel: () => void; onAutomation: () => void; disabled: boolean }) {
  const { product: p, config: c, experience: e, editing, update, configure, customize } = props;
  const [addingTag, setAddingTag] = React.useState(false), [tag, setTag] = React.useState('');
  function addTag(event: React.FormEvent) { event.preventDefault(); const next = tag.trim(); if (next && !e.tags.includes(next)) customize({ tags: [...e.tags, next] }); setTag(''); setAddingTag(false); }
  function billing(value: Billing) {
    configure({ billing: value, amount: value === 'One-time' ? e.oneTimeAmount : value === 'Payment plan' ? e.installmentAmount : e.recurringAmount });
    if (value === 'Payment plan') customize({ planEnabled: true });
    if (value === 'Subscription') customize({ recurringEnabled: true });
  }
  function amount(value: number) { configure({ amount: value }); customize(c.billing === 'One-time' ? { oneTimeAmount: value } : c.billing === 'Payment plan' ? { installmentAmount: value } : { recurringAmount: value }); }
  const money = (amount: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: c.currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
  return <div className="min-w-0"><div className="dw-grid">
    <div className="dw-column dw-left">
      <Card title="Product Information" className="dw-information">
        <Field label="Product Name *"><input disabled={!editing} maxLength={140} value={p.name} onChange={event => update({ name: event.target.value })} placeholder="Enter your product name"/></Field>
        <Field label="Short Description"><input disabled={!editing} maxLength={300} value={e.shortDescription} onChange={event => customize({ shortDescription: event.target.value })} placeholder="A short introduction to your product"/></Field>
        <div className="tw-field-heading">Full Description</div>
        <DigitalDescription value={p.description} editing={editing} onChange={description => update({ description })}/>
      </Card>
      <DigitalFiles {...props} compact paginate={false}/>
      <Card title="Pricing & Payment" className="dw-pricing">
        <div className="dw-pricing-options">{(['One-time', 'Payment plan', 'Subscription'] as const).map((value, index) => <button key={value} disabled={!editing} aria-pressed={c.billing === value} className={c.billing === value ? 'selected' : ''} onClick={() => billing(value)}>{index === 0 ? <span className="dw-radio"/> : index === 1 ? <CreditCard className="dw-billing-icon" size={13}/> : <Package className="dw-billing-icon" size={13}/>}<span><b>{['One-time Payment', 'Payment Plan', 'Subscription'][index]}</b><small>{['Single payment', 'Multiple payments', 'Recurring payment'][index]}</small><strong>{index === 0 ? money(e.oneTimeAmount) : index === 1 ? `${money(e.installmentAmount)} × ${c.installments}` : `${money(e.recurringAmount)} / ${c.frequency === 'Yearly' ? 'year' : c.frequency === 'Quarterly' ? 'quarter' : 'month'}`}</strong></span></button>)}</div>
        <div className="cw-form-grid"><Field label="Price *"><div className="dw-money"><input type="number" min="0" step="0.01" disabled={!editing} value={c.amount} onChange={event => amount(Number(event.target.value))}/><Select disabled={!editing} value={c.currency} options={['EUR', 'USD', 'GBP']} onChange={currency => configure({ currency: currency as CommerceConfig['currency'] })}/></div></Field><Field label="Compare Price (Optional)"><div className="dw-money"><input type="number" min="0" step="0.01" disabled={!editing} value={e.comparePrice || ''} onChange={event => customize({ comparePrice: Number(event.target.value), showComparePrice: !!event.target.value })}/><Select disabled={!editing} value={c.currency} options={['EUR', 'USD', 'GBP']} onChange={currency => configure({ currency: currency as CommerceConfig['currency'] })}/></div></Field></div>
      </Card>
    </div>
    <div className="dw-column dw-middle">
      <div className="dw-image-group"><MediaCard {...props} compact/>
      <Card title="Product Tags" className="dw-tags-card"><div className="dw-tags">{e.tags.filter(Boolean).map((value, index) => <span key={index}>{value}{editing && <button aria-label={`Remove tag ${value}`} onClick={() => customize({ tags: e.tags.filter((_, i) => i !== index) })}><X size={10}/></button>}</span>)}{editing && <button className="cw-icon-button" aria-label="Add tag" onClick={() => setAddingTag(!addingTag)}><Plus size={12}/></button>}</div>{addingTag && <form onSubmit={addTag} className="dw-tag-form"><input aria-label="New tag" autoFocus value={tag} onChange={event => setTag(event.target.value)}/><button type="submit">Add</button></form>}</Card></div>
      <Card title="Access & Download Settings" className="dw-access">
        <Toggle icon={FileDown} label="Allow direct download after purchase" checked={e.directDownload} disabled={!editing} onChange={directDownload => customize({ directDownload })}/>
        <div className="dw-limit"><Toggle icon={Download} label="Download limit" checked={e.downloadLimitEnabled ?? true} disabled={!editing} onChange={downloadLimitEnabled => customize({ downloadLimitEnabled })}/>{(e.downloadLimitEnabled ?? true) && <input aria-label="Download limit per customer" type="number" min="1" disabled={!editing} value={c.downloadLimit} onChange={event => configure({ downloadLimit: Number(event.target.value) })}/>}</div>
        <Field icon={Clock3} label="Access duration"><Select disabled={!editing} value={c.access === 'Lifetime access' ? 'Lifetime Access' : c.access} options={['Lifetime Access', '12 months', 'While subscribed']} onChange={access => configure({ access: (access === 'Lifetime Access' ? 'Lifetime access' : access) as CommerceConfig['access'] })}/></Field>
        <Toggle icon={LockKeyhole} label="Require account login" checked={e.requireLogin} disabled={!editing} onChange={requireLogin => customize({ requireLogin })}/>
        <Toggle icon={ShieldCheck} label="Watermark files" checked={e.watermark} disabled={!editing} onChange={watermark => customize({ watermark })}/>
      </Card>
      <IncludedItems {...props} compact paginate={false}/>
    </div>
    <aside className="dw-column dw-sidebar">
      <Card title="Product Status" className="dw-status-card" action={<div className="dw-status"><Status status={p.status}/><Toggle label="Product active" checked={p.status === 'Active'} disabled={!editing} onChange={props.onStatus}/></div>}>
        <div className="dw-visibility"><span>Visibility</span><div>{(['Published', 'Private', 'Unlisted'] as const).map((visibility, index) => <label key={visibility}><input type="radio" name="digital-visibility" checked={e.visibility === visibility} disabled={!editing} onChange={() => customize({ visibility })}/><span>{visibility}<small>{['Visible to everyone', 'Only people with link', 'Only existing customers'][index]}</small></span></label>)}</div></div>
      </Card>
      <Card title="Product Details" className="dw-details-card"><div className="cw-form-grid">
        <Field label="Category"><Select disabled={!editing} value={e.category} options={Array.from(new Set([e.category, 'Design Templates', 'E-books', 'Software', 'Media', 'Other']))} onChange={category => customize({ category })}/></Field>
        <Field label="Language"><Select disabled={!editing} value={e.language} options={['English', 'Arabic', 'French', 'German', 'Spanish']} onChange={language => customize({ language })}/></Field>
        <Field label="File Type"><Select disabled={!editing} value={e.fileType ?? ''} options={Array.from(new Set([e.fileType ?? '', 'Canva Template', 'ZIP Archive', 'PDF Document', 'Video', 'Image', 'Other']))} onChange={fileType => customize({ fileType })}/></Field>
        <Field label="File Size"><input readOnly value={c.assets[0]?.size ? `${Number((c.assets[0].size / 1024 / 1024).toFixed(1))} MB` : '—'}/></Field>
        <Field label="Version"><input type="number" min="1" step="0.1" disabled={!editing} defaultValue={e.version.toFixed(1)} onChange={event => { const version = Number(event.target.value); if (version >= 1) customize({ version }); }} onBlur={event => { event.currentTarget.value = e.version.toFixed(1); }}/></Field>
        <Field label="Tags/Keywords"><input disabled={!editing} value={e.tags.join(', ')} onChange={event => customize({ tags: event.target.value.split(',').map(tag => tag.trim()) })}/></Field>
      </div></Card>
      <Card title="Connected Tools" className="dw-tools-card"><div className="dw-tools">{[{ title: 'Funnel', icon: Layers3, description: 'Product sales funnel', connected: !!e.funnelUrl, action: props.onFunnel }, { title: 'Automation', icon: Sparkles, description: 'Product delivery automation', connected: c.automations.confirmation || c.automations.grantAccess, action: props.onAutomation }].map(({ title, icon: Icon, description, connected, action }) => <div key={title}><Icon size={18}/><span><b>{title}</b><small>{description}</small></span><em className={connected ? 'connected' : ''}>{connected ? 'Connected' : 'Connect'}</em><button onClick={action}>{connected ? 'Edit' : 'Set up'}</button></div>)}</div></Card>
      <Card title="Quick Actions" className="dw-actions-card"><div className="dw-actions"><button onClick={props.onSalesPage}><Eye size={14}/>View Product Page</button><button onClick={props.onCopy}><Link2 size={14}/>Copy Product Link</button><button disabled={props.disabled} onClick={props.onDuplicate}><Copy size={14}/>Duplicate Product</button><button className="dw-delete" disabled={!p.id || props.disabled} onClick={props.onDelete}><Trash2 size={14}/>Delete Product</button></div></Card>
    </aside>
  </div></div>;
}
