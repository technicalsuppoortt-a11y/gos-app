import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ArrowDownUp, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown, Clock3, FileText, LayoutGrid, Mail, MessageCircle, MoreHorizontal, Plus, Search, SlidersHorizontal, Sparkles, UserRound, Users, X } from 'lucide-react';
import { addLead, addLeadNote, moveLead, updateLead, type CanonicalLead } from '../store/slices/crmSlice';
import type { RootState, AppDispatch } from '../store';
import type { LeadStage } from '../data/mockData';
import { stageLabel } from '../data/mockData';
import './crm-leads.css';

const stages: { id: LeadStage; label: string; hint: string }[] = [
  { id: 'LEAD_CAPTURED', label: 'Lead captured', hint: 'New from a funnel or source' },
  { id: 'CONTACT_CREATED', label: 'Contact created', hint: 'Contact details confirmed' },
  { id: 'QUALIFIED', label: 'Qualified / unqualified', hint: 'Qualification decision' },
  { id: 'CONVERSATION', label: 'Conversation', hint: 'In active discussion' },
  { id: 'BOOKING', label: 'Booking offered / booked', hint: 'Scheduling in progress' },
  { id: 'PAYMENT_COMPLETED', label: 'Payment completed', hint: 'Payment recorded' },
  { id: 'ACTIVE_CUSTOMER', label: 'Active customer', hint: 'Customer relationship active' },
  { id: 'FOLLOW_UP_NEEDED', label: 'Follow-up needed', hint: 'Needs a personal touch' },
  { id: 'RENEWAL_UPSELL', label: 'Renewal / upsell', hint: 'Ready for the next offer' },
  { id: 'CLOSED_LOST', label: 'Closed / lost', hint: 'No longer in the pipeline' },
];
const sourceOptions = ['Website Funnel', 'Organic Search', 'Instagram', 'Paid Ad', 'Referral', 'Website', 'Landing page', 'LinkedIn'];
const owners = ['Alex Morgan', 'Jamie Park', 'Taylor Reed'];
const toneForStage = (stage: LeadStage) => ['QUALIFIED', 'PAYMENT_COMPLETED', 'ACTIVE_CUSTOMER'].includes(stage) ? 'mint' : stage === 'FOLLOW_UP_NEEDED' ? 'peach' : stage === 'CLOSED_LOST' ? 'rose' : stage === 'BOOKING' ? 'lilac' : 'blue';
const avatarClass = (color: string) => `avatar avatar-${color}`;
const money = (value: number) => `$${value.toLocaleString('en-US')}`;
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('') || 'NL';
type DropdownOption = { value: string; label: string; description?: string };
type DropdownProps = { value: string; options: DropdownOption[]; onChange: (value: string) => void; placeholder?: string; name?: string; searchable?: boolean; compact?: boolean; ariaLabel?: string; className?: string };

function Dropdown({ value, options, onChange, placeholder = 'Select an option', name, searchable, compact, ariaLabel, className = '' }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = options.find(option => option.value === value);
  const showSearch = searchable ?? options.length > 6;
  const filteredOptions = options.filter(option => `${option.label} ${option.description ?? ''}`.toLowerCase().includes(query.toLowerCase()));
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); setQuery(''); } };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', onKeyDown);
    if (showSearch) window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', onKeyDown); };
  }, [open, showSearch]);
  return <div className={`crm-dropdown relative ${compact ? 'compact' : ''} ${open ? 'is-open' : ''} ${className}`} ref={rootRef}>
    {name && <input type="hidden" name={name} value={value}/>}
    <button type="button" className="crm-dropdown-trigger" aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel} onClick={() => setOpen(current => !current)}>
      <span className="crm-dropdown-current">{selected?.label ?? placeholder}</span><ChevronDown size={14}/>
    </button>
    {open && (
      <div className="absolute z-50 top-full left-0 mt-1 w-full min-w-[200px] shadow-xl border border-gray-100 bg-white rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100" role="listbox" aria-label={ariaLabel ?? placeholder}>
        {showSearch && <label className="crm-dropdown-search"><Search size={13}/><input ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search options..." aria-label="Search dropdown options"/></label>}
        <div className="crm-dropdown-options max-h-[228px] overflow-auto overscroll-contain p-1">{filteredOptions.length ? filteredOptions.map(option => <button type="button" role="option" aria-selected={value === option.value} key={option.value || '__empty'} className={`crm-dropdown-option w-full flex items-center justify-between px-2 py-2 mb-0.5 text-left rounded-lg transition-colors hover:bg-gray-50 focus:bg-gray-50 outline-none ${value === option.value ? 'bg-gray-50 text-indigo-700 font-medium' : 'text-gray-700'}`} onClick={() => { onChange(option.value); setOpen(false); setQuery(''); }}><span><b className={`block text-[11px] truncate ${value === option.value ? 'font-bold text-indigo-700' : 'font-medium text-gray-700'}`}>{option.label}</b>{option.description && <small className="block text-[10px] text-gray-500 mt-0.5">{option.description}</small>}</span>{value === option.value && <Check size={14} className="text-indigo-600"/>}</button>) : <div className="crm-dropdown-empty p-3 text-center text-xs text-gray-500">No options found</div>}</div>
      </div>
    )}
  </div>;
}

export const CRMLeads: React.FC<{ notify: (message: string) => void }> = ({ notify }) => {
  const dispatch = useDispatch<AppDispatch>();
  const leads = useSelector((state: RootState) => state.crm.leads);
  const [view, setView] = useState<'board' | 'table'>('board');
  const [query, setQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [stageFilters, setStageFilters] = useState<LeadStage[]>([]);
  const [tagFilter, setTagFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [bookingFilter, setBookingFilter] = useState('');
  const [interestFilter, setInterestFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newSource, setNewSource] = useState('Website Funnel');
  const [newOwner, setNewOwner] = useState(owners[0]);
  const [newStage, setNewStage] = useState<LeadStage>('LEAD_CAPTURED');
  const [noteDraft, setNoteDraft] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'value'>('recent');
  const allTags = useMemo(() => [...new Set(leads.flatMap(lead => lead.tags))].sort(), [leads]);
  const interests = useMemo(() => [...new Set(leads.map(lead => lead.interest))].sort(), [leads]);
  const selectedLead = leads.find(lead => lead.id === selectedId) ?? null;
  const normalizedQuery = query.trim().toLowerCase();
  const visible = useMemo(() => leads.filter(lead => {
    const searchMatch = !normalizedQuery || [lead.name, lead.email, lead.company, ...lead.tags].some(value => value.toLowerCase().includes(normalizedQuery));
    return searchMatch && (!stageFilters.length || stageFilters.includes(lead.lifecycleStage)) && (!tagFilter || lead.tags.includes(tagFilter)) && (!sourceFilter || lead.source === sourceFilter) && (!ownerFilter || lead.owner === ownerFilter) && (!bookingFilter || lead.bookingStatus === bookingFilter) && (!interestFilter || lead.interest === interestFilter);
  }).sort((left, right) => sortBy === 'name' ? left.name.localeCompare(right.name) : sortBy === 'value' ? right.value - left.value : (left.lastActivity === 'Just now' ? -1 : right.lastActivity === 'Just now' ? 1 : 0)), [bookingFilter, interestFilter, leads, normalizedQuery, ownerFilter, sortBy, sourceFilter, stageFilters, tagFilter]);
  const followUpCount = leads.filter(lead => lead.lifecycleStage === 'FOLLOW_UP_NEEDED' || Boolean(lead.nextFollowUp)).length;
  const pipelineValue = leads.filter(lead => lead.lifecycleStage !== 'CLOSED_LOST').reduce((sum, lead) => sum + lead.value, 0);
  const activeFilterCount = stageFilters.length + Number(Boolean(tagFilter)) + Number(Boolean(sourceFilter)) + Number(Boolean(ownerFilter)) + Number(Boolean(bookingFilter)) + Number(Boolean(interestFilter));
  const clearFilters = () => { setStageFilters([]); setTagFilter(''); setSourceFilter(''); setOwnerFilter(''); setBookingFilter(''); setInterestFilter(''); };
  const toggleStage = (stage: LeadStage) => setStageFilters(current => current.includes(stage) ? current.filter(item => item !== stage) : [...current, stage]);
  const createLead = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    if (!name || !email) return;
    const id = `ld-${Date.now()}`;
    const source = String(data.get('source') || 'Website Funnel');
    const stage = String(data.get('stage') || 'LEAD_CAPTURED') as LeadStage;
    const lead: CanonicalLead = { id, name, email, company: String(data.get('company') || 'New contact'), source, stage, lifecycleStage: stage, owner: String(data.get('owner') || owners[0]), value: Number(data.get('value') || 0), lastActivity: 'Just now', nextFollowUp: undefined, tags: [], avatar: initials(name), color: 'lilac', interest: String(data.get('interest') || 'Not specified'), bookingStatus: 'Not Scheduled', qualificationStatus: 'Pending', activities: [{ id: `${id}-capture`, type: 'capture', title: 'Lead captured', detail: `Added to CRM · ${source}`, at: 'Just now' }], notes: [] };
    dispatch(addLead(lead)); setAddOpen(false); setSelectedId(id); setNewSource('Website Funnel'); setNewOwner(owners[0]); setNewStage('LEAD_CAPTURED'); notify(`${name} added to the CRM.`);
  };
  const saveNote = () => { if (!selectedLead || !noteDraft.trim()) return; dispatch(addLeadNote({ id: selectedLead.id, note: noteDraft.trim() })); setNoteDraft(''); notify('Internal note saved to the lead record.'); };
  const changeStage = (lead: CanonicalLead, stage: LeadStage) => dispatch(moveLead({ id: lead.id, stage }));
  const exportCsv = () => {
    const rows = [['Name', 'Email', 'Company', 'Stage', 'Source', 'Owner', 'Booking status', 'Interest', 'Value'], ...visible.map(lead => [lead.name, lead.email, lead.company, stageLabel[lead.lifecycleStage], lead.source, lead.owner, lead.bookingStatus, lead.interest, String(lead.value)])];
    const csv = rows.map(row => row.map(cell => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'gos-crm-leads.csv'; anchor.click(); URL.revokeObjectURL(url);
    notify(`Exported ${visible.length} lead${visible.length === 1 ? '' : 's'}.`);
  };

  return <div className="crm-leads-page">
    <div className="crm-leads-heading"><div><span className="crm-eyebrow">RELATIONSHIPS</span><h1>CRM &amp; leads</h1><p>Your canonical contact records, from first touch through renewal.</p></div><div><button className="crm-secondary-action" onClick={exportCsv}><FileText size={15}/> Export</button><button className="button-primary" onClick={() => setAddOpen(true)}><Plus size={15}/> Add a lead</button></div></div>
    <div className="crm-kpis"><div><span>Total leads</span><b>{leads.length.toLocaleString()}</b><small><Users size={13}/> All lifecycle stages</small></div><div><span>Need follow-up</span><b>{followUpCount}</b><small><Clock3 size={13}/> Includes scheduled reminders</small></div><div><span>Pipeline value</span><b>{money(pipelineValue)}</b><small><ArrowUpRight size={13}/> Open pipeline</small></div><div className="crm-kpi-insight"><span><Sparkles size={16}/></span><div><b>Keep every record connected</b><small>Inbox, bookings, and follow-ups use the same lead ID.</small></div><button onClick={() => { setBookingFilter('Offer Sent'); setFilterOpen(true); }}>Review pipeline <ArrowRight size={13}/></button></div></div>
    <div className="crm-toolbar"><label className="crm-search"><Search size={15}/><input aria-label="Search leads" placeholder="Search name, email, company, or tag..." value={query} onChange={event => setQuery(event.target.value)}/>{query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={13}/></button>}</label><div className="crm-filter-wrap"><button className={`crm-filter-button ${filterOpen || activeFilterCount ? 'active' : ''}`} onClick={() => setFilterOpen(open => !open)}><SlidersHorizontal size={15}/> Filters{activeFilterCount > 0 && <i>{activeFilterCount}</i>}<ChevronDown size={13}/></button>{filterOpen && <div className="crm-filter-popover"><div className="crm-filter-popover-head"><div><b>Filter leads</b><small>Refine your pipeline view</small></div><button onClick={clearFilters}>Clear all</button></div><div className="crm-filter-stage-list"><span className="crm-filter-label">LIFECYCLE STAGE</span>{stages.map(stage => <label key={stage.id}><input type="checkbox" checked={stageFilters.includes(stage.id)} onChange={() => toggleStage(stage.id)}/><span>{stage.label}</span></label>)}</div><div className="crm-filter-grid">
      <label>Tag<Dropdown value={tagFilter} onChange={setTagFilter} placeholder="All tags" options={[{ value: '', label: 'All tags' }, ...allTags.map(tag => ({ value: tag, label: tag }))]} searchable ariaLabel="Filter by tag"/></label>
      <label>Source<Dropdown value={sourceFilter} onChange={setSourceFilter} placeholder="All sources" options={[{ value: '', label: 'All sources' }, ...[...new Set([...sourceOptions, ...leads.map(lead => lead.source)])].map(source => ({ value: source, label: source }))]} searchable ariaLabel="Filter by source"/></label>
      <label>Assigned to<Dropdown value={ownerFilter} onChange={setOwnerFilter} placeholder="Anyone" options={[{ value: '', label: 'Anyone' }, ...[...new Set([...owners, ...leads.map(lead => lead.owner)])].map(owner => ({ value: owner, label: owner }))]} ariaLabel="Filter by owner"/></label>
      <label>Booking status<Dropdown value={bookingFilter} onChange={setBookingFilter} placeholder="Any status" options={[{ value: '', label: 'Any status' }, ...['Not Scheduled', 'Offer Sent', 'Booked', 'Completed'].map(status => ({ value: status, label: status }))]} ariaLabel="Filter by booking status"/></label>
      <label className="crm-filter-wide">Product interest<Dropdown value={interestFilter} onChange={setInterestFilter} placeholder="Any product or service" options={[{ value: '', label: 'Any product or service' }, ...interests.map(interest => ({ value: interest, label: interest }))]} searchable ariaLabel="Filter by product interest"/></label>
      </div><button className="crm-apply-filters" onClick={() => setFilterOpen(false)}>Show {visible.length} results</button></div>}</div><div className="crm-sort-select"><ArrowDownUp size={14}/><Dropdown value={sortBy} onChange={value => setSortBy(value as typeof sortBy)} options={[{ value: 'recent', label: 'Recent activity' }, { value: 'name', label: 'Name A–Z' }, { value: 'value', label: 'Highest value' }]} ariaLabel="Sort leads"/></div><div className="crm-toolbar-spacer"/><div className="crm-view-toggle"><button className={view === 'board' ? 'selected' : ''} onClick={() => setView('board')}><LayoutGrid size={15}/> Board</button><button className={view === 'table' ? 'selected' : ''} onClick={() => setView('table')}><FileText size={15}/> Table</button></div></div>
    <div className="crm-result-summary">Showing <b>{visible.length}</b> of <b>{leads.length}</b> leads{activeFilterCount > 0 && <button onClick={clearFilters}>Clear filters <X size={12}/></button>}</div>
    {view === 'board' ? <div className="crm-board" aria-label="Lead lifecycle board">{stages.map(stage => {
      const items = visible.filter(lead => lead.lifecycleStage === stage.id);
      return <section key={stage.id} className={`crm-stage-column ${draggedId ? 'is-dragging' : ''}`} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (draggedId) { changeStage(leads.find(lead => lead.id === draggedId)!, stage.id); setDraggedId(null); notify(`Lead moved to ${stage.label}.`); } }}>
        <header><span className={`crm-stage-dot stage-tone-${toneForStage(stage.id)}`}/><span><b>{stage.label}</b><small>{stage.hint}</small></span><i>{items.length}</i><button title={`Add lead to ${stage.label}`} onClick={() => setAddOpen(true)}><Plus size={14}/></button></header>
        <div className="crm-stage-cards">{items.map(lead => <article key={lead.id} className="crm-lead-card" draggable onDragStart={event => { setDraggedId(lead.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', lead.id); }} onDragEnd={() => setDraggedId(null)} onClick={() => setSelectedId(lead.id)}>
          <div className="crm-lead-card-head"><span className={`${avatarClass(lead.color)}`}>{lead.avatar}</span><button aria-label={`Open actions for ${lead.name}`} onClick={event => { event.stopPropagation(); setSelectedId(lead.id); }}><MoreHorizontal size={16}/></button></div><b className="crm-lead-card-name">{lead.name}</b><span className="crm-lead-company">{lead.company} · {lead.email}</span><div className="crm-tag-row">{lead.tags.slice(0, 3).map(tag => <span key={tag} className="crm-tag">{tag}</span>)}</div><div className="crm-lead-card-foot"><span><Clock3 size={12}/>{lead.lastActivity}</span><b>{money(lead.value)}</b></div><div className="crm-quick-move" onClick={event => event.stopPropagation()}><span>Move to</span><Dropdown compact value={lead.lifecycleStage} onChange={nextStage => { changeStage(lead, nextStage as LeadStage); notify(`${lead.name} moved to ${stageLabel[nextStage as LeadStage]}.`); }} options={stages.map(next => ({ value: next.id, label: next.label }))} ariaLabel={`Move ${lead.name} to a stage`}/></div>
        </article>)}{!items.length && <div className="crm-stage-empty">Drop a lead here</div>}</div>
      </section>;
    })}</div> : <div className="crm-table-wrap"><table className="crm-table"><thead><tr><th>Contact</th><th>Lifecycle stage</th><th>Source</th><th>Assigned to</th><th>Booking</th><th>Product interest</th><th>Next follow-up</th><th>Value</th></tr></thead><tbody>{visible.map(lead => <tr key={lead.id} onClick={() => setSelectedId(lead.id)}><td><div className="crm-table-contact"><span className={`${avatarClass(lead.color)} avatar-small`}>{lead.avatar}</span><span><b>{lead.name}</b><small>{lead.email} · {lead.company}</small></span></div></td><td><span className={`crm-stage-pill ${toneForStage(lead.lifecycleStage)}`}>{stageLabel[lead.lifecycleStage]}</span></td><td>{lead.source}</td><td>{lead.owner}</td><td>{lead.bookingStatus}</td><td>{lead.interest}</td><td>{lead.nextFollowUp ?? '—'}</td><td><b>{money(lead.value)}</b></td></tr>)}</tbody></table>{visible.length === 0 && <div className="crm-no-results"><Search size={20}/><b>No leads match these filters</b><button onClick={clearFilters}>Reset filters</button></div>}</div>}
    {selectedLead && <LeadDrawer lead={selectedLead} close={() => setSelectedId(null)} notify={notify} noteDraft={noteDraft} setNoteDraft={setNoteDraft} saveNote={saveNote}/>}
    {addOpen && <div className="crm-drawer-scrim" onMouseDown={event => { if (event.target === event.currentTarget) setAddOpen(false); }}><form className="crm-add-modal" onSubmit={createLead}><header><div><span className="crm-drawer-icon"><Plus size={17}/></span><span><b>Add a lead</b><small>Create a canonical contact record</small></span></div><button type="button" onClick={() => setAddOpen(false)} aria-label="Close"><X size={17}/></button></header><div className="crm-add-grid"><label>Full name<input name="name" placeholder="e.g. Jordan Lee" required autoFocus/></label><label>Email address<input type="email" name="email" placeholder="name@company.com" required/></label><label>Company<input name="company" placeholder="Company or studio"/></label><label>Source<Dropdown name="source" value={newSource} options={sourceOptions.map(source => ({ value: source, label: source }))} onChange={setNewSource} ariaLabel="Lead source"/></label><label>Assigned owner<Dropdown name="owner" value={newOwner} options={owners.map(owner => ({ value: owner, label: owner }))} onChange={setNewOwner} ariaLabel="Assigned owner"/></label><label>Lifecycle stage<Dropdown name="stage" value={newStage} options={stages.map(stage => ({ value: stage.id, label: stage.label }))} onChange={value => setNewStage(value as LeadStage)} ariaLabel="Lifecycle stage"/></label><label>Product interest<input name="interest" placeholder="Service or product"/></label><label>Pipeline value<input name="value" type="number" min="0" placeholder="0"/></label></div><footer><button type="button" className="crm-cancel" onClick={() => setAddOpen(false)}>Cancel</button><button type="submit" className="button-primary"><Plus size={14}/> Create lead</button></footer></form></div>}
  </div>;
};

function LeadDrawer({ lead, close, notify, noteDraft, setNoteDraft, saveNote }: { lead: CanonicalLead; close: () => void; notify: (message: string) => void; noteDraft: string; setNoteDraft: (value: string) => void; saveNote: () => void }) {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'overview' | 'activity' | 'notes'>('overview');
  const update = (changes: Partial<CanonicalLead>) => dispatch(updateLead({ id: lead.id, changes }));
  const patch = (field: keyof CanonicalLead, value: string | number | string[]) => update({ [field]: value } as Partial<CanonicalLead>);
  const updateTags = (value: string) => patch('tags', value.split(',').map(tag => tag.trim()).filter(Boolean));
  return <div className="crm-drawer-scrim" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}><aside className="crm-lead-drawer" aria-label={`${lead.name} lead details`}><header className="crm-drawer-top"><div><span className="crm-eyebrow">CANONICAL LEAD RECORD</span><small>{lead.id}</small></div><button onClick={close} aria-label="Close lead details"><X size={17}/></button></header><div className="crm-drawer-profile"><span className={`${avatarClass(lead.color)} avatar-large`}>{lead.avatar}</span><div><h2>{lead.name}</h2><p>{lead.company}</p></div><span className={`crm-stage-pill ${toneForStage(lead.lifecycleStage)}`}>{stageLabel[lead.lifecycleStage]}</span></div>
    <div className="crm-drawer-actions"><button onClick={() => navigate(`/dashboard/booking?leadId=${encodeURIComponent(lead.id)}&create=link`)}><CalendarDays size={14}/> Book</button><button onClick={() => navigate(`/dashboard/inbox?leadId=${encodeURIComponent(lead.id)}`)}><MessageCircle size={14}/> Conversation</button><button onClick={() => { setTab('overview'); window.setTimeout(() => document.querySelector<HTMLInputElement>('.crm-edit-grid input[type="datetime-local"]')?.focus(), 30); notify('Set a date and time in Next follow-up to save a reminder.'); }}><Clock3 size={14}/> Reminder</button></div>
    <nav className="crm-drawer-tabs"><button className={tab === 'overview' ? 'selected' : ''} onClick={() => setTab('overview')}>Overview</button><button className={tab === 'activity' ? 'selected' : ''} onClick={() => setTab('activity')}>Activity <i>{lead.activities.length}</i></button><button className={tab === 'notes' ? 'selected' : ''} onClick={() => setTab('notes')}>Notes <i>{lead.notes.length}</i></button></nav>
    <div className="crm-drawer-scroll">
      {tab === 'overview' && <><section className="crm-drawer-section"><h3>Contact information</h3><div className="crm-edit-grid"><label>Full name<input value={lead.name} onChange={event => patch('name', event.target.value)}/></label><label>Avatar initials<input value={lead.avatar} maxLength={3} onChange={event => patch('avatar', event.target.value.toUpperCase())}/></label><label>Company / role<input value={lead.company} onChange={event => patch('company', event.target.value)}/></label><label>Email address<input type="email" value={lead.email} onChange={event => patch('email', event.target.value)}/></label><label>Phone number<input value={lead.phone ?? ''} placeholder="Add phone number" onChange={event => patch('phone', event.target.value)}/></label><label>Source<Dropdown value={lead.source} onChange={value => patch('source', value)} options={[...new Set([...sourceOptions, lead.source])].map(source => ({ value: source, label: source }))} searchable ariaLabel="Lead source"/></label><label>Assigned owner<Dropdown value={lead.owner} onChange={value => patch('owner', value)} options={[...new Set([...owners, lead.owner])].map(owner => ({ value: owner, label: owner }))} ariaLabel="Assigned owner"/></label><label>Lifecycle stage<Dropdown value={lead.lifecycleStage} onChange={value => dispatch(moveLead({ id: lead.id, stage: value as LeadStage }))} options={stages.map(stage => ({ value: stage.id, label: stage.label }))} searchable ariaLabel="Lifecycle stage"/></label><label>Qualification status<Dropdown value={lead.qualificationStatus} onChange={value => patch('qualificationStatus', value as CanonicalLead['qualificationStatus'])} options={['Pending', 'Qualified', 'Unqualified'].map(status => ({ value: status, label: status }))} ariaLabel="Qualification status"/></label><label>Booking status<Dropdown value={lead.bookingStatus} onChange={value => patch('bookingStatus', value)} options={['Not Scheduled', 'Offer Sent', 'Booked', 'Completed'].map(status => ({ value: status, label: status }))} ariaLabel="Booking status"/></label><label>Product interest<input value={lead.interest} onChange={event => patch('interest', event.target.value)}/></label><label>Pipeline value<input type="number" min="0" value={lead.value} onChange={event => patch('value', Number(event.target.value))}/></label><label className="crm-edit-wide">Tags <small>Comma separated</small><input value={lead.tags.join(', ')} onChange={event => updateTags(event.target.value)}/></label><label className="crm-edit-wide">Next follow-up date / time<input type="datetime-local" value={lead.nextFollowUpAt ?? ''} onChange={event => dispatch(updateLead({ id: lead.id, changes: { nextFollowUpAt: event.target.value, nextFollowUp: event.target.value ? new Date(event.target.value).toLocaleString() : '' } }))}/></label></div></section><section className="crm-drawer-section"><h3>Recent journey</h3><Timeline lead={lead} limit={4}/></section></>}
      {tab === 'activity' && <><section className="crm-drawer-section"><h3>Activity &amp; system events</h3><Timeline lead={lead}/></section><section className="crm-drawer-section"><h3>Unified conversation history</h3><div className="crm-conversation-link"><span><MessageCircle size={15}/></span><div><b>Messages are attached to this lead ID</b><small>WhatsApp · Email · Instagram · AI Copilot</small></div><button onClick={() => notify(`Conversation lookup uses canonical lead ${lead.id}.`)}><ArrowRight size={14}/></button></div>{lead.activities.filter(item => item.type === 'message').map(item => <div className="crm-message-event" key={item.id}><span><Mail size={12}/></span><div><b>{item.title}</b><p>{item.detail}</p><small>{item.at}</small></div></div>)}</section></>}
      {tab === 'notes' && <section className="crm-drawer-section"><h3>Internal notes</h3><p className="crm-notes-caption">Private to your team. Notes are saved on this canonical contact.</p><textarea className="crm-note-input" placeholder="Add context for your team..." value={noteDraft} onChange={event => setNoteDraft(event.target.value)}/><button className="crm-save-note" onClick={saveNote} disabled={!noteDraft.trim()}><Plus size={13}/> Save note</button><div className="crm-note-list">{lead.notes.map((note, index) => <article key={`${index}-${note}`}><b>Alex Morgan</b><small>{index === 0 ? 'Just now' : 'Earlier'}</small><p>{note}</p></article>)}</div></section>}
    </div></aside></div>;
}

function Timeline({ lead, limit }: { lead: CanonicalLead; limit?: number }) {
  const activities = limit ? lead.activities.slice(0, limit) : lead.activities;
  return <div className="crm-activity-timeline">{activities.map(activity => <div className="crm-timeline-item" key={activity.id}><span className={`crm-timeline-icon ${activity.type}`}>{activity.type === 'booking' ? <CalendarDays size={13}/> : activity.type === 'message' ? <MessageCircle size={13}/> : activity.type === 'payment' ? <Check size={13}/> : activity.type === 'note' ? <FileText size={13}/> : <UserRound size={13}/>}</span><div><b>{activity.title}</b><p>{activity.detail}</p><small>{activity.at}</small></div></div>)}{!activities.length && <div className="crm-no-activity">Activity will appear here as this lead moves through your workspace.</div>}</div>;
}

export default CRMLeads;
