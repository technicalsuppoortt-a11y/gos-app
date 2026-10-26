import { linkedToLead } from './recordLinks';
import { selectUnifiedCRMLeads } from '../../store/crmSelectors';
import { CRMActionBoundary } from './CRMActions';
import { useCRMActions } from './useCRMActions';
import { Dialog } from './CRMDialogs';
import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import { useId, useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowLeft, ArrowRight, CalendarDays, CheckSquare, Clock3, Mail, MessageCircle, Phone, Plus, Sparkles, Users, LayoutDashboard, Activity, MessageSquare, Calendar, Briefcase, Package, MoreHorizontal, Check, Loader2 } from 'lucide-react';
import type { RootState } from '../../store';
import { addLeadNote, moveLead, setLeadConsent, setLeadFollowUpState, updateLead, FOLLOW_UP_LIFECYCLE, type CanonicalLead, type FollowUpLifecycleState } from '../../store/slices/crmSlice';
import { useBusinessMetrics } from '../../backend/metrics';
import { CRMAvatar, SourceBadge } from '../CRMLeads';
import { CustomSelect, CustomDatePicker } from './CRMPrimitives';
import { displayStage, euro, owners, activityTime } from './model';
import { readMembers } from '../booking/model';
import { LiveConversations, LiveAppointments, LiveOrders, LiveAutomation } from './LiveRecordPanels';
import { dispatchGosCRM, useGosCRM, useGosLead } from '../../backend/gosCRM';
import { showToast } from '../../utils/toast';
import '../crm-leads.css';
import './crm-workspace.css';

const recordTabs = [
  { id: 'Overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'Activity Timeline', label: 'Activity timeline', icon: Activity },
  { id: 'Conversation History', label: 'Conversation history', icon: MessageSquare },
  { id: 'Appointments', label: 'Appointments', icon: Calendar },
  { id: 'Deals/Opportunities', label: 'Deals/Opportunities', icon: Briefcase },
  { id: 'Products/Orders', label: 'Products & Orders', icon: Package },
  { id: 'Notes/Tasks', label: 'Notes & Tasks', icon: CheckSquare },
  { id: 'AI Automation Status', label: 'AI Automation', icon: Sparkles }
];

/** WhatsApp outline glyph (speech bubble + handset), stroke-based to match Lucide weight. */
function WhatsAppIcon({ size = 18 }: { size?: number }) {
  useUILanguage();
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/></svg>;
}

/** Instagram outline glyph with the official brand gradient stroke. */
function InstagramIcon({ size = 18 }: { size?: number }) {
  useUILanguage();
  const gid = `ig-grad-${useId().replace(/:/g, '')}`;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={`url(#${gid})`} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><defs><linearGradient id={gid} gradientUnits="userSpaceOnUse" x1="4" y1="20" x2="20" y2="4"><stop offset="0" stopColor="#FEDA75"/><stop offset=".25" stopColor="#FA7E1E"/><stop offset=".5" stopColor="#E1306C"/><stop offset=".75" stopColor="#C13584"/><stop offset="1" stopColor="#7C3AED"/></linearGradient></defs><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/></svg>;
}

const tileClass = 'crm-record-action w-16 h-16 flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-100 bg-white shadow-sm hover:shadow hover:-translate-y-px transition-all cursor-pointer aria-disabled:opacity-50 aria-disabled:pointer-events-none';
const tileLabel = 'text-[11px] font-medium leading-none text-slate-600';

export function CRMRecord() {
  const api = useGosCRM();
  const actions = useCRMActions();
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpDraft, setFollowUpDraft] = useState('');
  const metrics = useBusinessMetrics();
  const products = metrics.products.map(product => ({ id: product.id, name: product.name, type: product.type, price: product.config?.amount ?? 0, currency: product.config?.currency ?? 'USD' }));
  const bookings = metrics.bookings as (typeof metrics.bookings[number] & { leadId?: string; productId?: string })[];
  useUILanguage();
  const { id } = useParams(); const detail = useGosLead(id); const location = useLocation(); const dispatch = (action: Parameters<typeof dispatchGosCRM>[0]) => actions.run(() => dispatchGosCRM(action)); const [params, setParams] = useSearchParams();
  const leads = useSelector(selectUnifiedCRMLeads); const { pipelines: storedPipelines } = useSelector((s: RootState) => s.crm); const pipelines = storedPipelines.filter(p => !p.archived); const lead = leads.find(l => l.id === id);
  const [note, setNote] = useState(''); const [tag, setTag] = useState(''); const [taskTitle, setTaskTitle] = useState(''); const [due, setDue] = useState('');
  const base = location.pathname.startsWith('/dashboard') ? '/dashboard/crm' : '/crm';
  const tab = recordTabs.some(t => t.id === params.get('tab')) ? params.get('tab')! : 'Overview';

  const [contactForm, setContactForm] = useState({
    name: lead?.name ?? '',
    email: lead?.email ?? '',
    phone: lead?.phone ?? '',
    company: lead?.company ?? '',
    owner: lead?.owner ?? '',
    source: lead?.source ?? '',
    interest: lead?.interest ?? '',
  });
  const [isSavingContact, setIsSavingContact] = useState(false);

  const contactBaseline = useRef({ id: lead?.id, fields: contactForm });
  useEffect(() => {
    if (!lead) return;
    const fields = { name: lead.name ?? '', email: lead.email ?? '', phone: lead.phone ?? '', company: lead.company ?? '', owner: lead.owner ?? '', source: lead.source ?? '', interest: lead.interest ?? '' };
    const previous = contactBaseline.current;
    contactBaseline.current = { id: lead.id, fields };
    setContactForm(current => {
      if (previous.id !== lead.id) return fields;
      // Hydrated details fill untouched fields while preserving explicit unsaved edits.
      const next = { ...current };
      for (const key of Object.keys(fields) as (keyof typeof fields)[]) if (current[key] === previous.fields[key]) next[key] = fields[key];
      return (Object.keys(fields) as (keyof typeof fields)[]).some(key => next[key] !== current[key]) ? next : current;
    });
  }, [lead]);

  const isContactDirty = useMemo(() => {
    if (!lead) return false;
    return (
      contactForm.name !== (lead.name ?? '') ||
      contactForm.email !== (lead.email ?? '') ||
      contactForm.phone !== (lead.phone ?? '') ||
      contactForm.company !== (lead.company ?? '') ||
      contactForm.owner !== (lead.owner ?? '') ||
      contactForm.source !== (lead.source ?? '') ||
      contactForm.interest !== (lead.interest ?? '')
    );
  }, [contactForm, lead]);

  const handleDiscardContact = () => {
    if (!lead) return;
    setContactForm({
      name: lead.name ?? '',
      email: lead.email ?? '',
      phone: lead.phone ?? '',
      company: lead.company ?? '',
      owner: lead.owner ?? '',
      source: lead.source ?? '',
      interest: lead.interest ?? '',
    });
  };

  const handleSaveContact = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!lead || !isContactDirty || isSavingContact) return;

    const trimmedName = contactForm.name.trim();
    const trimmedEmail = contactForm.email.trim();
    const trimmedPhone = contactForm.phone.trim();
    const trimmedCompany = contactForm.company.trim();
    const trimmedInterest = contactForm.interest.trim();

    if (!trimmedName) {
      showToast.error(translateText('Contact name is required.'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      showToast.error(translateText('Enter a valid, unique contact value.'));
      return;
    }

    const isDuplicate = leads.some(
      l => l.id !== lead.id && l.email.toLowerCase() === trimmedEmail.toLowerCase()
    );
    if (isDuplicate) {
      showToast.error(translateText('Enter a valid, unique contact value.'));
      return;
    }

    setIsSavingContact(true);
    try {
      const changes: Partial<CanonicalLead> = {
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        company: trimmedCompany,
        owner: contactForm.owner,
        source: contactForm.source,
        interest: trimmedInterest,
        avatar: trimmedName.split(/\s+/).filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase() || lead.avatar,
      };

      const saved = await dispatch(updateLead({ id: lead.id, changes }));
      if (saved) {
        showToast.success(translateText('Contact details updated successfully'));
        setContactForm({
          name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone,
          company: trimmedCompany,
          owner: contactForm.owner,
          source: contactForm.source,
          interest: trimmedInterest,
        });
      }
    } catch (error) {
      showToast.error((error as Error).message || translateText('Failed to update contact details'));
    } finally {
      setIsSavingContact(false);
    }
  };

  if (!lead && (api.loading || detail.loading || api.error || detail.error)) return <CRMActionBoundary busy={api.loading || detail.loading}><div className="crm2-page crm-workspace"><div className="crm-empty" role="status">{!api.loading && !detail.loading && (api.error || detail.error)}{(api.error || detail.error) && <button className="crm2-btn-secondary" onClick={() => { api.retry(); detail.retry(); }}>Retry</button>}</div></div></CRMActionBoundary>;
  if (!lead) return <div className="crm2-page crm-workspace"><div className="crm-empty"><Users size={36}/><h1>{translateText("Contact not found")}</h1><p>{translateText("This contact may have been deleted.")}</p><Link className="crm2-btn-primary" to={`${base}/contacts`}>{translateText("Back to contacts")}</Link></div></div>;
  const pipeline = pipelines.find(p => p.id === (lead.pipelineId ?? 'main')) ?? pipelines[0];
  const stage = pipeline.stages.find(s => s.id === displayStage(lead, pipeline))!;
  const contactBookings = bookings.filter(b => linkedToLead(b, lead, 'booking'));
  async function save(changes: Partial<CanonicalLead>) { const saved = await dispatch(updateLead({ id: lead!.id, changes })); if (saved) showToast.success('Contact updated.'); return saved; }

  const timeline = (type?: string) => {
    const items = lead.activities.filter(a => !type || a.type === type).slice().sort((a, b) => activityTime(b.at) - activityTime(a.at));
    return items.length ? items.map(a => <div className="crm-feed-item" key={a.id}><span className="crm-feed-icon"><Clock3 size={16}/></span><div><b>{localizeNode(a.title)}</b><p>{localizeNode(a.detail)}</p></div><small>{localizeNode(a.at.includes('T') ? new Date(a.at).toLocaleString() : a.at)}</small></div>) : [<div key="empty" className="crm-empty"><MessageCircle size={30}/><h3>{translateText("No ")}{localizeNode(type === 'message' ? 'conversations' : 'activities')}{translateText(" recorded yet")}</h3></div>];
  };
  return <CRMActionBoundary busy={actions.busy || api.loading || detail.loading}><div className="crm2-page crm-workspace crm-record">{api.error && <p className="crm-error" role="alert">{api.error} <button onClick={api.retry}>Retry</button></p>}{detail.error && <p className="crm-error" role="alert">{detail.error} <button onClick={detail.retry}>Retry</button></p>}<div className="crm-record-breadcrumb"><Link to={`${base}/pipeline?pipeline=${pipeline.id}`}><ArrowLeft size={14}/>{translateText("Back to pipeline")}</Link><span>/</span><Link to={`${base}/contacts?pipeline=${pipeline.id}`}>{translateText("Contacts")}</Link><span>/</span><b>{localizeNode(lead.name)}</b></div><header className="crm-record-header"><CRMAvatar lead={lead}/><div><h1>{localizeNode(lead.name)}<span className="crm-stage-pill" style={{ color: stage.color }}>{localizeNode(lead.archived ? 'Archived' : stage.label)}</span></h1><p>{localizeNode(lead.company || 'Independent contact')}{translateText(" · Assigned to ")}{localizeNode(lead.owner)}</p></div><div className="ms-auto flex flex-wrap items-center gap-2 max-[1100px]:ms-0">
    <a id="crm-record-action-call" aria-disabled={!lead.phone} className={tileClass} href={lead.phone ? `tel:${lead.phone.replace(/[^+\d]/g, '')}` : undefined} title={translateText("Call")}><span className="text-emerald-500 bg-emerald-50/50 p-2 rounded-lg"><Phone size={18} strokeWidth={2}/></span><span className={tileLabel}>{translateText("Call")}</span></a>
    <a id="crm-record-action-whatsapp" aria-disabled={!lead.phone} className={tileClass} href={lead.phone ? `https://wa.me/${lead.phone.replace(/\D/g, '')}` : undefined} target="_blank" rel="noreferrer" title={translateText("WhatsApp")}><span className="text-[#25D366] bg-green-50/50 p-2 rounded-lg"><WhatsAppIcon/></span><span className={tileLabel}>{translateText("WhatsApp")}</span></a>
    <a id="crm-record-action-email" className={tileClass} href={`mailto:${lead.email}`} title={translateText("Email")}><span className="text-purple-600 bg-purple-50/50 p-2 rounded-lg"><Mail size={18} strokeWidth={2}/></span><span className={tileLabel}>{translateText("Email")}</span></a>
    <Link id="crm-record-action-instagram" className={tileClass} to={`/dashboard/inbox?leadId=${encodeURIComponent(lead.id)}&channel=instagram`} title={translateText("Instagram")}><span className="text-[#E1306C] bg-pink-50/50 p-2 rounded-lg"><InstagramIcon/></span><span className={tileLabel}>{translateText("Instagram")}</span></Link>
    <button id="crm-record-action-archive" type="button" className={tileClass} onClick={() => save({ archived: !lead.archived })} title={translateText(lead.archived ? 'Restore contact' : 'Archive contact')}><span className="text-slate-400 bg-slate-50 p-2 rounded-lg"><MoreHorizontal size={18}/></span><span className={tileLabel}>{localizeNode(lead.archived ? 'Restore' : 'Archive')}</span></button>
  </div></header><nav className="flex-none bg-white px-5 border-b border-slate-200" aria-label={translateText("Contact record tabs")}><div className="-mb-px flex gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{localizeNode(recordTabs.map(t => { const active = tab === t.id; return <button key={t.id} id={`crm-record-tab-${t.id.toLowerCase().replace(/[^a-z]+/g, '-')}`} type="button" className={`inline-flex items-center gap-1.5 whitespace-nowrap bg-transparent pt-3 pb-2.5 text-[13px] border-b-2 transition-colors duration-150 cursor-pointer ${active ? 'text-purple-600 font-semibold border-purple-600' : 'text-slate-500 font-medium border-transparent hover:text-slate-800 hover:border-slate-300'}`} aria-current={active ? 'page' : undefined} onClick={() => setParams({ tab: t.id })}><t.icon size={16} className={active ? 'text-purple-600' : 'text-slate-400'}/>{localizeNode(t.label)}</button>; }))}</div></nav><div className="crm-scroll-content crm-record-content">
    {localizeNode(tab === 'Overview' && <div className="crm-record-grid"><section className="crm-record-panel"><h2>{translateText("Contact information")}</h2><p className="crm-muted">{translateText("Update contact details and click Save Changes.")}</p><form onSubmit={handleSaveContact}><div className="crm-form-grid"><label className="crm-field">{translateText("Name")}<input aria-label={translateText("Name")} type="text" value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} disabled={isSavingContact} placeholder={translateText("Full name")} required /></label><label className="crm-field">{translateText("Email")}<input aria-label={translateText("Email")} type="email" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} disabled={isSavingContact} placeholder="name@company.com" required /></label><label className="crm-field">{translateText("Phone")}<input aria-label={translateText("Phone")} type="tel" value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} disabled={isSavingContact} placeholder="+1 555 0100" /></label><label className="crm-field">{translateText("Company")}<input aria-label={translateText("Company")} type="text" value={contactForm.company} onChange={e => setContactForm(f => ({ ...f, company: e.target.value }))} disabled={isSavingContact} placeholder={translateText("Company name")} /></label><label className="crm-field">{translateText("Owner")}<CustomSelect aria-label={translateText("Assigned owner")} value={contactForm.owner} onChange={val => setContactForm(f => ({ ...f, owner: val }))} disabled={isSavingContact} options={[...new Set([...owners, ...readMembers().map(m => m.name), ...leads.map(l => l.owner)])].filter(Boolean).map(o => ({ value: o, label: o }))} /></label><label className="crm-field">{translateText("Source")}<CustomSelect aria-label={translateText("Contact source")} value={contactForm.source} onChange={val => setContactForm(f => ({ ...f, source: val }))} disabled={isSavingContact} options={[...new Set(['Website', 'Instagram', 'WhatsApp', 'Referral', 'LinkedIn', lead.source, contactForm.source])].filter(Boolean).map(s => ({ value: s, label: s }))} /></label><label className="crm-field">{translateText("Interest")}<input aria-label={translateText("Interest")} type="text" value={contactForm.interest} onChange={e => setContactForm(f => ({ ...f, interest: e.target.value }))} disabled={isSavingContact} placeholder={translateText("Main interest or program")} /></label></div><div className="crm-contact-form-actions"><span className={`crm-contact-form-status ${isContactDirty ? 'is-dirty' : ''}`}>{localizeNode(isContactDirty ? translateText("Unsaved changes") : translateText("All changes saved"))}</span><div className="crm-contact-form-buttons">{isContactDirty && !isSavingContact && <button type="button" className="crm2-btn-secondary" onClick={handleDiscardContact} disabled={isSavingContact}>{translateText("Discard")}</button>}<button type="submit" id="crm-contact-save-button" className="crm2-btn-primary" disabled={!isContactDirty || isSavingContact}>{isSavingContact ? <><Loader2 size={13} className="animate-spin"/><span>{translateText("Saving...")}</span></> : <><Check size={13}/><span>{translateText("Save Changes")}</span></>}</button></div></div></form><h3>{translateText("Tags")}</h3><div className="crm-record-tags">{localizeNode((lead.tags || []).map(t => <button key={t} aria-label={translateText(`Remove tag ${t}`)} onClick={() => save({ tags: (lead.tags || []).filter(v => v !== t) })}>{localizeNode(t)} ×</button>))}</div><form className="crm-inline-form" onSubmit={async e => { e.preventDefault(); if (tag.trim() && await save({ tags: [...new Set([...(lead.tags || []), tag.trim()])] })) setTag(''); }}><input aria-label={translateText("New tag")} placeholder={translateText("Add a tag")} value={tag} onChange={e => setTag(e.target.value)} disabled={isSavingContact}/><button className="crm2-btn-secondary" disabled={!tag.trim() || isSavingContact}><Plus size={14}/>{translateText("Add")}</button></form></section><section className="crm-record-panel"><h2>{translateText("Relationship summary")}</h2><div className="crm-record-summary"><SourceBadge source={lead.source}/><b>{localizeNode(euro(lead.value))}</b><span>{translateText("Opportunity value")}</span></div><label className="crm-field">{translateText("Pipeline")}<CustomSelect aria-label={translateText("Contact pipeline")} value={pipeline.id} onChange={val => { const next = pipelines.find(p => p.id === val)!; save({ pipelineId: next.id, stage: next.stages[0].id, lifecycleStage: next.stages[0].id }); }} options={pipelines.map(p => ({ value: p.id, label: p.name }))} /></label><label className="crm-field">{translateText("Pipeline stage")}<CustomSelect aria-label={translateText("Contact pipeline stage")} value={stage.id} onChange={val => dispatch(moveLead({ id: lead.id, stage: pipeline.stages.find(s => s.id === val)!.id }))} options={pipeline.stages.map(s => ({ value: s.id, label: s.label }))} /></label><label className="crm-field">{translateText("Qualification")}<CustomSelect value={lead.qualificationStatus} onChange={val => save({ qualificationStatus: val as CanonicalLead['qualificationStatus'] })} options={['Pending', 'Qualified', 'Unqualified'].map(s => ({ value: s, label: s }))} /></label><label className="crm-field">{translateText("Next follow-up")}<button type="button" aria-label="Schedule next follow-up" className="crm2-btn-secondary" onClick={() => { setFollowUpDraft(lead.nextFollowUpAt?.slice(0, 16) ?? ''); setFollowUpOpen(true); }}><CalendarDays size={14}/>{lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toLocaleString() : 'Schedule follow-up'}</button></label>{localizeNode(lead.nextFollowUp && <p className="crm-muted">{translateText("Scheduled: ")}{localizeNode(lead.nextFollowUp)}</p>)}<h3>{translateText("Recent activity")}</h3>{localizeNode(timeline().slice(0, 3))}</section></div>)}
    {localizeNode(tab === 'Activity Timeline' && <section className="crm-record-panel"><h2>{translateText("Activity timeline")}</h2>{localizeNode(timeline())}</section>)}
    {localizeNode(tab === 'Conversation History' && <section className="crm-record-panel"><div className="crm-section-heading"><h2>{translateText("Conversation history")}</h2><Link className="crm2-btn-primary" to={`/dashboard/inbox?leadId=${lead.id}`}><MessageCircle size={14}/>{translateText("Open inbox")}</Link></div>{localizeNode((lead.activities || []).some(a => a.type === 'message') && timeline('message'))}<LiveConversations lead={lead}/></section>)}
    {localizeNode(tab === 'Appointments' && <section className="crm-record-panel"><div className="crm-section-heading"><h2>{translateText("Appointments")}</h2><Link className="crm2-btn-primary" to="/dashboard/booking"><CalendarDays size={14}/>{translateText("Manage bookings")}</Link></div><label className="crm-field">{translateText("Booking status")}<CustomSelect value={lead.bookingStatus} onChange={val => save({ bookingStatus: val as CanonicalLead['bookingStatus'] })} options={['Not Scheduled', 'Offer Sent', 'Booked', 'Completed'].map(s => ({ value: s, label: s }))} /></label><LiveAppointments lead={lead}/></section>)}
    {localizeNode(tab === 'Deals/Opportunities' && <section className="crm-record-panel"><div className="crm-section-heading"><div><h2>{localizeNode(lead.interest || `${lead.name}'s opportunity`)}</h2><p>{localizeNode(pipeline.name)}</p></div><b className="crm-deal-value">{localizeNode(euro(lead.value))}</b></div><div className="crm-form-grid"><label>{translateText("Deal value (€)")}<input aria-label={translateText("Deal value")} key={`${lead.id}-${lead.value}`} type="number" min="0" step="0.01" defaultValue={lead.value} onBlur={e => { const value = Number(e.target.value); if (Number.isFinite(value) && value >= 0 && e.target.value !== '') { if (value !== lead.value) { const input = e.currentTarget; void save({ value }).then(saved => { if (!saved) input.value = String(lead.value); }); } } else e.target.value = String(lead.value); }}/></label><label>{translateText("Stage")}<CustomSelect aria-label={translateText("Opportunity stage")} value={stage.id} onChange={val => dispatch(moveLead({ id: lead.id, stage: pipeline.stages.find(s => s.id === val)!.id }))} options={pipeline.stages.map(s => ({ value: s.id, label: s.label }))} /></label><label className="crm-field">{translateText("Opportunity name")}<input key={`opp-${lead.id}-${lead.interest}`} aria-label={translateText("Opportunity name")} defaultValue={lead.interest ?? ''} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} onBlur={e => { const val = e.currentTarget.value.trim(); if (val !== (lead.interest ?? '')) void save({ interest: val }); }} /></label></div><div className="crm-deal-stages">{localizeNode(pipeline.stages.map(s => <button key={s.id} className={s.id === stage.id ? 'active' : ''} onClick={() => dispatch(moveLead({ id: lead.id, stage: s.id }))}><i style={{ background: s.color }}/>{localizeNode(s.label)}<ArrowRight size={12}/></button>))}</div>{localizeNode(timeline('stage'))}</section>)}
    {tab === 'Products/Orders' && <section className="crm-record-panel"><div className="crm-section-heading"><h2>{translateText("Products & orders")}</h2><Link className="crm2-btn-secondary" to="/dashboard/products">{translateText("Manage products ")}<ArrowRight size={14}/></Link></div>{localizeNode((lead.activities || []).some(a => a.type === 'payment') && timeline('payment'))}<LiveOrders lead={lead}/>{contactBookings.map(b => { const product = products.find(p => p.id === b.productId); return product && <div className="crm-feed-item" key={b.id}><div><b>{product.name}</b><p>{translateText("Linked through appointment · ")}{localizeNode(product.type)}</p></div><span>{localizeNode(product.currency)} {localizeNode(product.price.toLocaleString())}</span></div>; })}</section>}
    {localizeNode(tab === 'Notes/Tasks' && <div className="crm-record-grid"><section className="crm-record-panel"><h2>{translateText("Internal notes")}</h2><form onSubmit={async e => { e.preventDefault(); if (!note.trim()) return; if (await dispatch(addLeadNote({ id: lead.id, note: note.trim() }))) { setNote(''); showToast.success('Note saved.'); } }}><textarea aria-label={translateText("New note")} className="crm-note-input" rows={4} placeholder={translateText("Add context for your team…")} value={note} onChange={e => setNote(e.target.value)}/><button className="crm2-btn-primary" disabled={!note.trim()}><Plus size={14}/>{translateText("Save note")}</button></form>{localizeNode((lead.notes || []).map((n, i) => <div className="crm-note" key={`${i}-${n}`}>{localizeNode(n)}</div>))}</section><section className="crm-record-panel"><h2>{translateText("Contact tasks")}</h2><form className="crm-contact-task-form" onSubmit={async e => { e.preventDefault(); if (!taskTitle.trim() || !due) return; if (await save({ tasks: [...(lead.tasks ?? []), { id: crypto.randomUUID(), title: taskTitle.trim(), due, done: false }] })) setTaskTitle(''); }}><input aria-label={translateText("Contact task title")} placeholder={translateText("Task title")} value={taskTitle} onChange={e => setTaskTitle(e.target.value)} required/><CustomDatePicker aria-label={translateText("Contact task due date")} value={due} onChange={val => setDue(val)} placeholder={translateText("Due date")} /><button className="crm2-btn-primary" disabled={!taskTitle.trim() || !due}><CheckSquare size={14}/>{translateText("Add task")}</button></form>{localizeNode((lead.tasks ?? []).map(t => <div className="crm-task-row" key={t.id}><input type="checkbox" aria-label={translateText(`Complete ${t.title}`)} checked={t.done} onChange={() => save({ tasks: lead.tasks!.map(task => task.id === t.id ? { ...task, done: !task.done } : task) })}/><span className={t.done ? 'crm-task-done' : ''}>{localizeNode(t.title)}</span><small>{localizeNode(t.due)}</small><button className="crm-danger" onClick={() => save({ tasks: lead.tasks!.filter(task => task.id !== t.id) })}>{translateText("Remove")}</button></div>))}</section></div>)}
    {localizeNode(tab === 'AI Automation Status' && <section className="crm-record-panel"><div className="crm-section-heading"><div><h2><Sparkles size={18}/>{translateText("AI automation status")}</h2><p>{translateText("Control this contact’s consent and follow-up lifecycle.")}</p></div><Link className="crm2-btn-primary" to={`/dashboard/follow-up?leadId=${lead.id}`}>{translateText("Open AI Follow-Up ")}<ArrowRight size={14}/></Link></div><LiveAutomation lead={lead}/><label className="crm-field">{translateText("Follow-up lifecycle")}<CustomSelect aria-label={translateText("Follow-up lifecycle")} value={lead.followUpState} onChange={val => dispatch(setLeadFollowUpState({ id: lead.id, followUpState: val as FollowUpLifecycleState }))} options={FOLLOW_UP_LIFECYCLE.map(s => ({ value: s.state, label: s.label }))} /></label><p className="crm-muted">{localizeNode(FOLLOW_UP_LIFECYCLE.find(s => s.state === lead.followUpState)?.description)}</p><div className="crm-consents">{localizeNode((['hasWhatsAppConsent', 'hasMessagingConsent', 'hasEmailConsent'] as const).map((key, i) => <label key={key}><input type="checkbox" checked={lead[key]} onChange={e => dispatch(setLeadConsent({ id: lead.id, consent: { [key]: e.target.checked } }))}/>{localizeNode(['WhatsApp consent', 'Social messaging consent', 'Email consent'][i])}</label>))}</div><p className="crm-muted">{translateText("Lifecycle and consent preferences are saved to this workspace. Channel delivery uses the integrations configured in Upclick.")}</p></section>)}
  </div>{followUpOpen && <Dialog title="Schedule next follow-up" close={() => { if (!actions.busy) setFollowUpOpen(false); }}><form onSubmit={async event => { event.preventDefault(); if (await save({ nextFollowUpAt: followUpDraft, nextFollowUp: followUpDraft ? new Date(followUpDraft).toLocaleString() : '' })) setFollowUpOpen(false); }}><div className="crm-dialog-content"><label className="crm-field">Next follow-up date and time<input aria-label="Follow-up date and time" type="datetime-local" value={followUpDraft} onChange={event => setFollowUpDraft(event.target.value)}/></label><p className="crm-muted">Use your local time. Clear the date to remove this follow-up.</p></div><div className="crm-dialog-footer"><button type="button" className="crm2-btn-secondary" onClick={() => setFollowUpOpen(false)}>Cancel</button><button className="crm2-btn-primary">Save</button></div></form></Dialog>}</div></CRMActionBoundary>;
}


