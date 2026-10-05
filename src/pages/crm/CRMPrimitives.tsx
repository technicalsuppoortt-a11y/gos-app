import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Clock3, Flame, Globe, Mail, MessageCircle, MoreHorizontal, MoreVertical, Phone, Sparkles, ChevronDown, Check, Calendar } from 'lucide-react';
import { InstagramLogo as Instagram, LinkedinLogo as Linkedin } from '@phosphor-icons/react';
import type { CanonicalLead } from '../../store/slices/crmSlice';
import type { LeadStage } from '../../data/mockData';
import { displayStage, euro, type Pipeline } from './model';
import sarah from '../../assets/inbox/sarah.jpg';
import marcus from '../../assets/inbox/omar.jpg';
import priya from '../../assets/inbox/lina.jpg';
import david from '../../assets/inbox/ahmed.jpg';
import olivia from '../../assets/inbox/diana.jpg';
import ethan from '../../assets/inbox/karim.jpg';
import amara from '../../assets/inbox/nour.jpg';
import noah from '../../assets/inbox/youssef.jpg';

const demoPhotos: Record<string, string> = {
  'ld-101': sarah, 'ld-102': marcus, 'ld-103': priya, 'ld-104': david,
  'ld-105': olivia, 'ld-106': ethan, 'ld-107': amara, 'ld-108': noah,
};

export function CRMAvatar({ lead }: { lead: CanonicalLead }) {
  const [failed, setFailed] = useState(false);
  const photo = lead.photoUrl || demoPhotos[lead.id];
  return photo && !failed
    ? <img className="crm-person-avatar crm-person-photo w-8 h-8 rounded-full" src={photo} alt="" onError={() => setFailed(true)} />
    : <span className={`crm-person-avatar crm-person-${lead.color}`}>{lead.avatar}</span>;
}

export function SourceBadge({ source }: { source: string }) {
  const normalized = source.toLowerCase();
  const channel = normalized.includes('instagram') ? { tone: 'instagram', label: 'Instagram', icon: Instagram }
    : normalized.includes('whatsapp') ? { tone: 'whatsapp', label: 'WhatsApp', icon: MessageCircle }
    : normalized.includes('email') ? { tone: 'email', label: 'Email', icon: Mail }
    : normalized.includes('linkedin') ? { tone: 'linkedin', label: 'LinkedIn', icon: Linkedin }
    : normalized.includes('call') ? { tone: 'call', label: 'Call', icon: Phone }
    : normalized.includes('referral') ? { tone: 'referral', label: 'Referral', icon: BadgeCheck }
    : { tone: 'website', label: /website|funnel|landing/i.test(source) ? 'Website' : source, icon: Globe };
  return <span className={`crm-source crm-source-${channel.tone}`}><span className="crm-source-symbol"><channel.icon size={10} strokeWidth={2}/></span>{channel.label}</span>;
}

export function TagBadge({ tag }: { tag: string }) {
  const text = tag.toLowerCase();
  const tone = /high.?intent|qualified|priority/.test(text) && !text.includes('unqualified') ? 'green'
    : /interested|warm/.test(text) ? 'orange'
    : /hot|unqualified/.test(text) ? 'red'
    : /coaching|consultation/.test(text) ? 'purple' : 'neutral';
  return <span className={`crm-tag crm-tag-${tone}`}>{tone === 'green' && <BadgeCheck size={9}/>} {tone === 'orange' && <Phone size={9}/>} {tone === 'red' && <Flame size={9}/>} {tag}</span>;
}

function followUp(lead: CanonicalLead): { label: string; tone: string } {
  if (!lead.nextFollowUp && !lead.nextFollowUpAt) return { label: 'No follow-up', tone: 'none' };
  if (/tomorrow/i.test(lead.nextFollowUp ?? '')) return { label: 'Follow up tomorrow', tone: 'tomorrow' };
  if (/today/i.test(lead.nextFollowUp ?? '')) return { label: 'Follow up today', tone: 'today' };
  if (lead.nextFollowUpAt) {
    const due = new Date(lead.nextFollowUpAt), now = new Date(), tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    if (due.toDateString() === now.toDateString()) return { label: 'Follow up today', tone: 'today' };
    if (due.toDateString() === tomorrow.toDateString()) return { label: 'Follow up tomorrow', tone: 'tomorrow' };
    if (due < now) return { label: 'Follow-up overdue', tone: 'today' };
  }
  return { label: 'Follow-up scheduled', tone: 'scheduled' };
}

function compactActivity(activity: string) {
  return activity.replace(/(\d+)\s*min(?:ute)?s? ago/i, '$1m ago')
    .replace(/(\d+)\s*hours? ago/i, '$1h ago')
    .replace(/(\d+)\s*days? ago/i, '$1d ago')
    .replace('Yesterday', '1d ago');
}

export function OptionsMenu({ label, actions }: { label: string; actions: { label: string; onSelect: () => void }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); ref.current?.querySelector('button')?.focus(); } };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  return <div className="crm-options" ref={ref}><button className="crm-options-trigger" aria-label={label} aria-expanded={open} onClick={() => setOpen(!open)}><MoreHorizontal size={16}/></button>{open && <div className="crm-options-popup" aria-label={label}>{actions.map(action => <button key={action.label} onClick={() => { setOpen(false); action.onSelect(); }}>{action.label}</button>)}</div>}</div>;
}

export function LeadCard({ lead, pipeline, base, dragging, onDragStart, onDragEnd, onMove }: {
  lead: CanonicalLead; pipeline: Pipeline; base: string; dragging: boolean;
  onDragStart: (id: string) => void; onDragEnd: () => void; onMove: (id: string, stage: LeadStage) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const status = followUp(lead);
  useEffect(() => {
    if (!menuOpen) return;
    const dismiss = (e: PointerEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMenuOpen(false); menuRef.current?.querySelector('button')?.focus(); } };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
  }, [menuOpen]);
  return <article className={`crm-lead-card ${dragging ? 'crm-is-dragging' : ''}`} draggable={!menuOpen}
    onDragStart={e => { e.dataTransfer.setData('text/plain', lead.id); e.dataTransfer.effectAllowed = 'move'; onDragStart(lead.id); }} onDragEnd={onDragEnd}>
    <Link className="crm-card-link" draggable={false} to={`${base}/opportunities/${encodeURIComponent(lead.id)}`} aria-label={`Open opportunity for ${lead.name}`}/>
    <div className="crm-card-content">
      <div className="crm-card-person"><CRMAvatar lead={lead}/><div><b>{lead.name}</b><small>{lead.company || 'Independent contact'}</small><SourceBadge source={lead.source}/></div></div>
      <div className="crm-card-tags">{lead.tags.slice(0, 2).map(tag => <TagBadge key={tag} tag={tag}/>)}</div>
      <div className="crm-card-bottom"><strong>{euro(lead.value)}</strong>{status.tone !== 'none' && <Sparkles className="crm-card-sparkle" size={13}/>}</div>
      <div className="crm-card-footer"><small className="crm-card-time"><Clock3 size={11}/>{compactActivity(lead.lastActivity)}</small><span className={`crm-followup crm-followup-${status.tone}`} title={lead.nextFollowUp}>{status.label}</span></div>
    </div>
    <div className="crm-card-options" ref={menuRef}>
      <button className="crm-card-menu-button" aria-label={`Options for ${lead.name}`} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><MoreVertical size={15}/></button>
      {menuOpen && <div className="crm-card-menu"><Link to={`${base}/contacts/${encodeURIComponent(lead.id)}`}>Open contact</Link><label>Move to stage<CustomSelect aria-label={`Move ${lead.name} to stage`} value={displayStage(lead, pipeline)} onChange={val => { onMove(lead.id, pipeline.stages.find(s => s.id === val)!.id); setMenuOpen(false); }} options={pipeline.stages.map(s => ({ value: s.id, label: s.label }))} /></label></div>}
    </div>
  </article>;
}

export function CustomSelect({ value: propValue, onChange: propOnChange, defaultValue, options, placeholder, className = "", 'aria-label': ariaLabel, icon: Icon, name }: {
  value?: string;
  onChange?: (val: string) => void;
  defaultValue?: string;
  options: { value: string; label: React.ReactNode }[];
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
  icon?: React.ElementType;
  name?: string;
}) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? options[0]?.value ?? "");
  const value = propValue !== undefined ? propValue : internalValue;
  const onChange = propOnChange || setInternalValue;
  
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);

  const selected = options.find(o => o.value === value);

  return (
    <div className={`crm-custom-select ${className}`} ref={ref}>
      {name && <input type="hidden" name={name} value={value} />}
      <button 
        type="button" 
        className="crm-custom-select-trigger" 
        aria-label={ariaLabel} 
        aria-expanded={open} 
        onClick={() => setOpen(!open)}
      >
        {Icon && <Icon size={14} className="crm-custom-select-icon"/>}
        <span>{selected ? selected.label : (placeholder || 'Select...')}</span>
        <ChevronDown size={14} className="crm-custom-select-chevron"/>
      </button>
      {open && (
        <div className="crm-custom-select-popup">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={opt.value === value ? "active" : ""}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              <span>{opt.label}</span>
              {opt.value === value && <Check size={14}/>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CustomDatePicker({ value, onChange, placeholder = "Select date...", className = "", name, type = "date" }: { value: string, onChange: (v: string) => void, placeholder?: string, className?: string, name?: string, type?: "date" | "datetime-local" }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className={`crm-custom-select crm-custom-date ${className}`} onClick={() => { try { (ref.current as any)?.showPicker?.() } catch(e){} }}>
      <button type="button" className="crm-custom-select-trigger" onClick={e => e.preventDefault()}>
        <Calendar size={14} className="crm-custom-select-icon"/>
        <span>{value || placeholder}</span>
      </button>
      <input 
        ref={ref}
        type={type} 
        name={name}
        value={value} 
        onChange={e => onChange(e.target.value)} 
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: '10px', height: '10px', bottom: 0, left: 0 }}
      />
    </div>
  );
}
