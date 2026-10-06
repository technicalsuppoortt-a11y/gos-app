import React from 'react';
import * as RadixSelect from '@radix-ui/react-select';
import { AppleLogo } from '@phosphor-icons/react';
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, CreditCard, ImagePlus, MapPin, Monitor, Pencil, Plus, ShieldCheck, Sparkles, Star, Trash2, UserRound } from 'lucide-react';
import type { FormProps } from './TypeForms';
import type { WorkspaceTab } from './views';
import { Card, Description, Dialog, Field, RichDescription, Select, Status, Toggle } from './primitives';

export function ServiceInformation({ product: p, experience: e, editing, update, customize }: FormProps) {
  return <Card title="Basic Information" className="sw-information"><div className="cw-form-grid"><Field label="Service Name *"><input disabled={!editing} value={p.name} maxLength={140} placeholder="General Consultation" onChange={event => update({ name: event.target.value })}/></Field><Field label="Category"><Select disabled={!editing} value={e.category} options={['', 'Consulting', 'Coaching', 'Medical Consultation', 'Strategy', 'Professional Services', ...(!['', 'Consulting', 'Coaching', 'Medical Consultation', 'Strategy', 'Professional Services'].includes(e.category) ? [e.category] : [])]} onChange={category => customize({ category })}/></Field></div><Field label="Short Description"><textarea disabled={!editing} rows={2} maxLength={300} value={e.shortDescription} placeholder="Book a consultation with our specialist" onChange={event => customize({ shortDescription: event.target.value })}/></Field><small className="sw-count">{e.shortDescription.length}/300</small></Card>;
}

export function ServiceDescription({ product, editing, update }: Pick<FormProps, 'product' | 'editing' | 'update'>) {
  return <Card title="Description" className="sw-description">{editing ? <RichDescription value={product.description} maxLength={2000} onChange={description => update({ description: description.slice(0, 2000) })}/> : <Description text={product.description || 'No description added yet.'}/>}</Card>;
}

export function ProviderSelect({ experience: e, editing, customize }: Pick<FormProps, 'experience' | 'editing' | 'customize'>) {
  const [manual, setManual] = React.useState(false);
  const providers = Array.from(new Set(['Dr. Ahmed Nasser', 'Mohamed Joe', ...(e.provider ? [e.provider] : [])]));
  const avatar = (name: string) => <span className="sw-provider-avatar" aria-hidden="true">{e.instructor.name === name && e.instructor.image ? <img src={e.instructor.image} alt=""/> : name.replace(/^Dr\.\s*/, '').split(' ').map(word => word[0]).slice(0, 2).join('') || <UserRound size={12}/>}</span>;
  return <><Field label="Team Member / Provider"><RadixSelect.Root disabled={!editing} value={manual ? '__custom' : e.provider || '__unassigned'} onValueChange={value => { setManual(value === '__custom'); if (value !== '__custom') customize({ provider: value === '__unassigned' ? '' : value }); }}><RadixSelect.Trigger className="commerce-select-trigger sw-provider-trigger" aria-label="Team Member / Provider">{avatar(e.provider)}<RadixSelect.Value><span className="sw-provider-copy"><b>{manual ? 'Custom provider…' : e.provider || 'Assign a provider'}</b>{e.provider && <small>{e.provider.startsWith('Dr.') ? 'Service specialist' : 'Team member'}</small>}</span></RadixSelect.Value><RadixSelect.Icon><ChevronDown size={12}/></RadixSelect.Icon></RadixSelect.Trigger><RadixSelect.Portal><RadixSelect.Content className="commerce-select-content" position="popper" sideOffset={4}><RadixSelect.Viewport>{[{ value: '__unassigned', name: 'Assign a provider' }, ...providers.map(name => ({ value: name, name })), { value: '__custom', name: 'Custom provider…' }].map(({ value, name }) => <RadixSelect.Item className="commerce-select-item sw-provider-option" key={value} value={value} textValue={name}>{avatar(name)}<RadixSelect.ItemText>{name}</RadixSelect.ItemText><RadixSelect.ItemIndicator><Check size={12}/></RadixSelect.ItemIndicator></RadixSelect.Item>)}</RadixSelect.Viewport></RadixSelect.Content></RadixSelect.Portal></RadixSelect.Root></Field>{manual && <Field label="Provider name"><input value={e.provider} placeholder="Enter provider name" onChange={event => customize({ provider: event.target.value })}/></Field>}</>;
}

export function ServiceGallery({ product: p, experience: e, editing, update, customize, error, busy }: Pick<FormProps, 'product' | 'experience' | 'editing' | 'update' | 'customize' | 'error' | 'busy'>) {
  const images = [p.image, ...e.gallery].filter((value): value is string => !!value);
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    busy(true);
    try {
      const uploaded = await Promise.all(Array.from(files).slice(0, 7 - images.length).map(file => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) throw new Error('Choose JPG, PNG or WebP images under 2 MB.');
        return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Could not read image.')); reader.readAsDataURL(file); });
      }));
      if (!p.image) { update({ image: uploaded[0] }); customize({ gallery: [...e.gallery, ...uploaded.slice(1)].slice(0, 6) }); }
      else customize({ gallery: [...e.gallery, ...uploaded].slice(0, 6) });
    } catch (cause) { error(cause instanceof Error ? cause.message : 'Image upload failed.'); }
    finally { busy(false); }
  }
  function remove(index: number) {
    if (index === 0 && p.image) { update({ image: e.gallery[0] }); customize({ gallery: e.gallery.slice(1) }); }
    else customize({ gallery: e.gallery.filter((_, i) => i !== index - (p.image ? 1 : 0)) });
  }
  function cover(index: number) {
    if (!editing || index === 0) return;
    update({ image: images[index] }); customize({ gallery: images.filter((_, i) => i !== index) });
  }
  return <Card title="Images" subtitle="Add a main image and optional gallery images." className="sw-images"><div className="sw-gallery">{images.map((src, index) => <div key={`${index}-${src.slice(-30)}`} className={index === 0 ? 'sw-main-image' : ''}><button disabled={!editing} aria-label={index === 0 ? 'Main image' : `Set image ${index + 1} as main image`} onClick={() => cover(index)}><img src={src} alt={`${p.name || 'Service'} image ${index + 1}`}/>{index === 0 && <span>Main image</span>}</button>{editing && <button className="sw-remove" aria-label={`Remove image ${index + 1}`} onClick={() => remove(index)}><Trash2 size={11}/></button>}</div>)}{editing && images.length < 7 && <label className="sw-add-image"><Plus size={18}/><span>Add Image</span><input aria-label="Add service images" type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={event => { void upload(event.target.files); event.target.value = ''; }}/></label>}{!editing && !images.length && <span className="sw-empty-media"><ImagePlus size={20}/> No images added</span>}</div></Card>;
}

export function ServiceCustomerPreview({ product: p, config: c, experience: e, onBook }: FormProps & { onBook: () => void }) {
  const [index, setIndex] = React.useState(0);
  const images = [p.image, ...e.gallery].filter((value): value is string => !!value);
  const current = Math.min(index, Math.max(0, images.length - 1));
  const reviews = e;
  return <Card title="Service Preview" className="tw-service-preview"><div className="sw-preview-media">{images.length ? <img className="tw-service-image" src={images[current]} alt={`${p.name || 'Service'} preview ${current + 1}`}/> : <div className="sw-preview-empty"><ImagePlus size={28}/><span>Your service image</span></div>}<button disabled={images.length < 2} aria-label="Previous preview image" onClick={() => setIndex((current - 1 + images.length) % images.length)}><ChevronLeft size={14}/></button><button disabled={images.length < 2} aria-label="Next preview image" onClick={() => setIndex((current + 1) % images.length)}><ChevronRight size={14}/></button></div><h3>{p.name || 'Your service name'}</h3><div className="sw-rating"><Star size={12} fill="currentColor"/><b>{reviews.rating?.toFixed(1) || 'New'}</b><span>{reviews.reviewCount ? `(${reviews.reviewCount} reviews)` : '(No reviews yet)'}</span></div><div className="tw-service-meta"><span><Clock3 size={12}/>{c.duration} minutes</span><span>{e.serviceMode === 'Online' ? <Monitor size={12}/> : <MapPin size={12}/>}<span title={e.location}>{e.serviceMode}</span></span><span><UserRound size={12}/>{e.provider || 'Provider unassigned'}</span></div><p>{e.shortDescription || p.description || 'Your service introduction appears here.'}</p><button className="cw-button primary cw-wide sw-book" onClick={onBook}>Book Now</button><div className="sw-payments"><span><ShieldCheck size={11}/>Secure payment</span><div aria-label="Accepted payment methods">{e.paymentMethods.map(method => <span key={method} title={method} aria-label={method} className={`sw-payment sw-payment-${method.toLowerCase().replaceAll(' ', '-')}`}>{method === 'Visa' ? <i>VISA</i> : method === 'Mastercard' ? <><i/><i/></> : method === 'Apple Pay' ? <><AppleLogo size={9} weight="fill"/> Pay</> : method === 'Google Pay' ? <><b>G</b> Pay</> : <i>PayPal</i>}</span>)}</div></div></Card>;
}

export function ServiceSidebar(props: FormProps & { onTab: (tab: WorkspaceTab) => void; onStatus: (active: boolean) => void }) {
  const { product: p, config: c, experience: e, editing, onTab, onStatus } = props;
  const [includedOpen, setIncludedOpen] = React.useState(false);
  const settings = [
    { tab: 'booking', Icon: CalendarDays, title: 'Booking Calendar', detail: c.bookingUrl ? 'Calendar connected' : 'Connect your calendar', status: c.bookingUrl ? 'Connected' : 'Not connected' },
    { tab: 'pricing', Icon: CreditCard, title: 'Pricing & Payment', detail: `${p.price} · ${c.billing} payment` },
    { tab: 'checkout', Icon: Monitor, title: 'Checkout Page', detail: 'Use system checkout' },
    { tab: 'automation', Icon: Sparkles, title: 'Automation', detail: c.automations.confirmation ? 'Confirmation message' : 'Configure automation' },
  ] as const;
  return <><Card title="Status" className="sw-status" action={<><Status status={p.status}/><Toggle label="Active service" checked={p.status === 'Active'} disabled={!editing} onChange={onStatus}/></>}><p>{p.status === 'Active' ? 'Your service is live and ready to accept bookings.' : 'Your service stays private until you publish.'}</p></Card><Card title="Quick Settings" className="sw-quick-settings"><div>{settings.map(({ tab, Icon, title, detail, ...setting }) => <button key={tab} onClick={() => onTab(tab)}><span className="sw-setting-icon"><Icon size={17}/></span><span><b>{title}</b>{tab !== 'booking' && <small>{detail}</small>}</span>{'status' in setting && <em className={c.bookingUrl ? 'connected' : ''}>{setting.status}</em>}<ChevronRight size={13}/></button>)}</div></Card><Card title="What's Included" className="sw-included"><div className="tw-included-list">{e.included.filter(item => item.enabled).map(item => <div key={item.id}><span><Check size={11}/></span><b>{item.title}</b></div>)}{!e.included.some(item => item.enabled) && <p>Add the benefits included in your service.</p>}</div><button className="cw-button cw-wide" onClick={() => setIncludedOpen(true)}><Pencil size={12}/>{editing ? 'Edit Details' : 'View Details'}</button></Card>{includedOpen && <Dialog title="What's Included" onClose={() => setIncludedOpen(false)}><div className="tw-included-list">{e.included.map(item => <div key={item.id}>{editing ? <><input type="checkbox" checked={item.enabled} aria-label={`Include ${item.title || 'item'}`} onChange={event => props.customize({ included: e.included.map(entry => entry.id === item.id ? { ...entry, enabled: event.target.checked } : entry) })}/><input aria-label="Included item title" value={item.title} onChange={event => props.customize({ included: e.included.map(entry => entry.id === item.id ? { ...entry, title: event.target.value } : entry) })}/><button className="cw-icon-button" aria-label={`Remove ${item.title || 'item'}`} onClick={() => props.customize({ included: e.included.filter(entry => entry.id !== item.id) })}><Trash2 size={12}/></button></> : <b>{item.title}</b>}</div>)}</div>{editing && <button className="cw-button" onClick={() => props.customize({ included: [...e.included, { id: crypto.randomUUID(), title: '', enabled: true }] })}><Plus size={12}/>Add Item</button>}<button className="cw-button primary" onClick={() => setIncludedOpen(false)}>Done</button></Dialog>}</>;
}
