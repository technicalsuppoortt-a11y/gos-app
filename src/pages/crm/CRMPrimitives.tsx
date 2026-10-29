import { useCRMBusy } from './useCRMActions';
import { useUILanguage, translateText, localizeNode, uiDirection } from '../../i18n/display';
import { useEffect, useRef, useState } from 'react';
import * as Select from '@radix-ui/react-select';
import { Link } from 'react-router-dom';
import { BadgeCheck, Clock3, Flame, Globe, Mail, MessageCircle, MoreHorizontal, MoreVertical, Phone, Sparkles, ChevronDown, Check, Calendar } from 'lucide-react';
import { InstagramLogo as Instagram, LinkedinLogo as Linkedin } from '@phosphor-icons/react';
import type { CanonicalLead } from '../../store/slices/crmSlice';
import type { LeadStage } from '../../types/business';
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
  useUILanguage();
  const [failed, setFailed] = useState(false);
  const photo = lead.photoUrl || demoPhotos[lead.id];
  const avatarText = lead.avatar || (lead.name ? lead.name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase() : 'L');
  return photo && !failed
    ? <img className="crm-person-avatar crm-person-photo w-8 h-8 rounded-full" src={photo} alt={translateText("")} onError={() => setFailed(true)} />
    : <span className={`crm-person-avatar crm-person-${lead.color || 'lilac'}`}>{localizeNode(avatarText)}</span>;
}

export function SourceBadge({ source }: { source?: string }) {
  useUILanguage();
  const safeSource = source || 'Website';
  const normalized = safeSource.toLowerCase();
  const channel = normalized.includes('instagram') ? { tone: 'instagram', label: 'Instagram', icon: Instagram }
    : normalized.includes('whatsapp') ? { tone: 'whatsapp', label: 'WhatsApp', icon: MessageCircle }
    : normalized.includes('email') ? { tone: 'email', label: 'Email', icon: Mail }
    : normalized.includes('linkedin') ? { tone: 'linkedin', label: 'LinkedIn', icon: Linkedin }
    : normalized.includes('call') ? { tone: 'call', label: 'Call', icon: Phone }
    : normalized.includes('referral') ? { tone: 'referral', label: 'Referral', icon: BadgeCheck }
    : { tone: 'website', label: /website|funnel|landing/i.test(safeSource) ? 'Website' : safeSource, icon: Globe };
  return <span className={`crm-source crm-source-${channel.tone}`}><span className="crm-source-symbol"><channel.icon size={10} strokeWidth={2}/></span>{localizeNode(channel.label)}</span>;
}

export function TagBadge({ tag }: { tag: string }) {
  useUILanguage();
  const text = tag.toLowerCase();
  const tone = /high.?intent|qualified|priority/.test(text) && !text.includes('unqualified') ? 'green'
    : /interested|warm/.test(text) ? 'orange'
    : /hot|unqualified/.test(text) ? 'red'
    : /coaching|consultation/.test(text) ? 'purple' : 'neutral';
  return <span className={`crm-tag crm-tag-${tone}`}>{localizeNode(tone === 'green' && <BadgeCheck size={9}/>)} {localizeNode(tone === 'orange' && <Phone size={9}/>)} {localizeNode(tone === 'red' && <Flame size={9}/>)} {localizeNode(tag)}</span>;
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

function compactActivity(activity?: string) {
  if (!activity) return 'Recently';
  return String(activity).replace(/(\d+)\s*min(?:ute)?s? ago/i, '$1m ago')
    .replace(/(\d+)\s*hours? ago/i, '$1h ago')
    .replace(/(\d+)\s*days? ago/i, '$1d ago')
    .replace('Yesterday', '1d ago');
}

export function OptionsMenu({ label, actions }: { label: string; actions: { label: string; onSelect: () => void }[] }) {
  useUILanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); ref.current?.querySelector('button')?.focus(); } };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  return <div className="crm-options" ref={ref}><button className="crm-options-trigger" aria-label={translateText(label)} aria-expanded={open} onClick={() => setOpen(!open)}><MoreHorizontal size={16}/></button>{localizeNode(open && <div className="crm-options-popup" aria-label={translateText(label)}>{localizeNode(actions.map(action => <button key={action.label} onClick={() => { setOpen(false); action.onSelect(); }}>{localizeNode(action.label)}</button>))}</div>)}</div>;
}

export function LeadCard({ lead, pipeline, base, dragging, onDragStart, onDragEnd, onMove, onOpen }: {
  onOpen?: () => void; lead: CanonicalLead; pipeline: Pipeline; base: string; dragging: boolean;
  onDragStart: (id: string) => void; onDragEnd: () => void; onMove: (id: string, stage: LeadStage) => void;
}) {
  useUILanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const status = followUp(lead);
  useEffect(() => {
    if (!menuOpen) return;
    const dismiss = (e: PointerEvent) => { if (!(e.target instanceof Element && e.target.closest('.crm-select-content')) && !menuRef.current?.contains(e.target as Node)) setMenuOpen(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMenuOpen(false); menuRef.current?.querySelector('button')?.focus(); } };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
  }, [menuOpen]);
  return <article className={`crm-lead-card ${dragging ? 'crm-is-dragging' : ''}`} draggable={!menuOpen}
    onDragStart={e => { e.dataTransfer.setData('text/plain', lead.id); e.dataTransfer.effectAllowed = 'move'; onDragStart(lead.id); }} onDragEnd={onDragEnd}>
    <button className="crm-card-link" type="button" onClick={onOpen} aria-label={translateText(`Quick details for ${lead.name || 'contact'}`)}/>
    <div className="crm-card-content">
      <div className="crm-card-person"><CRMAvatar lead={lead}/><div><b>{localizeNode(lead.name || 'Unnamed contact')}</b><small>{localizeNode(lead.company || 'Independent contact')}</small><SourceBadge source={lead.source}/></div></div>
      <div className="crm-card-tags">{localizeNode((lead.tags || []).slice(0, 2).map(tag => <TagBadge key={tag} tag={tag}/>))}</div>
      <div className="crm-card-bottom"><strong>{localizeNode(euro(lead.value || 0))}</strong>{localizeNode(status.tone !== 'none' && <Sparkles className="crm-card-sparkle" size={13}/>)}</div>
      <div className="crm-card-footer"><small className="crm-card-time"><Clock3 size={11}/>{localizeNode(compactActivity(lead.lastActivity))}</small><span className={`crm-followup crm-followup-${status.tone}`} title={translateText(lead.nextFollowUp)}>{localizeNode(status.label)}</span></div>
    </div>
    <div className="crm-card-options" ref={menuRef}>
      <button className="crm-card-menu-button" aria-label={translateText(`Options for ${lead.name || 'contact'}`)} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><MoreVertical size={15}/></button>
      {localizeNode(menuOpen && <div className="crm-card-menu"><Link to={`${base}/contacts/${encodeURIComponent(lead.id)}`}>{translateText("Open contact")}</Link><label>{translateText("Move to stage")}<CustomSelect aria-label={translateText(`Move ${lead.name || 'contact'} to stage`)} value={displayStage(lead, pipeline)} onChange={val => { onMove(lead.id, pipeline.stages.find(s => s.id === val)!.id); setMenuOpen(false); }} options={pipeline.stages.map(s => ({ value: s.id, label: s.label }))} /></label></div>)}
    </div>
  </article>;
}

export function CustomSelect({ value: propValue, onChange: propOnChange, defaultValue, options, placeholder, className = "", 'aria-label': ariaLabel, icon: Icon, name, disabled }: {
  value?: string;
  onChange?: (val: string) => void;
  defaultValue?: string;
  options: { value: string; label: React.ReactNode }[];
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
  icon?: React.ElementType;
  name?: string;
  disabled?: boolean;
}) {
  useUILanguage();
  const busy = useCRMBusy();
  const [internalValue, setInternalValue] = useState(defaultValue ?? options[0]?.value ?? "");
  const value = propValue !== undefined ? propValue : internalValue;
  const onChange = propOnChange || setInternalValue;
  
  // Radix portals prevent menus from being clipped by the fixed CRM viewport.
  const encode = (v: string) => 'crm:' + v;
  return <div className={`crm-custom-select ${className}`}>
    {localizeNode(name && <input type="hidden" name={name} value={value}/>)}
    <Select.Root disabled={busy || disabled} dir={uiDirection()} value={encode(value)} onValueChange={v => onChange(v.slice(4))}>
      <Select.Trigger className="crm-custom-select-trigger" aria-label={translateText(ariaLabel)} disabled={busy || disabled}>
        {localizeNode(Icon && <Icon size={14} className="crm-custom-select-icon"/>)}
        <Select.Value placeholder={translateText(placeholder || 'Select…')}/><Select.Icon asChild><ChevronDown size={14} className="crm-custom-select-chevron"/></Select.Icon>
      </Select.Trigger>
      <Select.Portal><Select.Content className="crm-select-content" position="popper" sideOffset={6} collisionPadding={10}>
        <Select.ScrollUpButton className="crm-select-scroll"><ChevronDown size={14} style={{ transform: 'rotate(180deg)' }}/></Select.ScrollUpButton>
        <Select.Viewport>{localizeNode(options.map(opt => <Select.Item className="crm-select-item" key={opt.value} value={encode(opt.value)}><Select.ItemText>{localizeNode(opt.label)}</Select.ItemText><Select.ItemIndicator><Check size={14}/></Select.ItemIndicator></Select.Item>))}</Select.Viewport>
        <Select.ScrollDownButton className="crm-select-scroll"><ChevronDown size={14}/></Select.ScrollDownButton>
      </Select.Content></Select.Portal>
    </Select.Root>
  </div>;
}

export function CustomDatePicker({ value, onChange, placeholder = "Select date...", className = "", name, type = "date", 'aria-label': ariaLabel }: { 'aria-label'?: string, value: string, onChange: (v: string) => void, placeholder?: string, className?: string, name?: string, type?: "date" | "datetime-local" }) {
  useUILanguage();
  const busy = useCRMBusy();
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className={`crm-custom-select crm-custom-date ${className}`} onClick={() => { try { if (!busy) ref.current?.showPicker?.() } catch { /* Native picker may be unavailable in this browser. */ } }}>
      <button disabled={busy} type="button" className="crm-custom-select-trigger" aria-label={translateText(ariaLabel || placeholder)} onClick={e => e.preventDefault()}>
        <Calendar size={14} className="crm-custom-select-icon"/>
        <span>{localizeNode(value || placeholder)}</span>
      </button>
      <input 
        ref={ref}
        aria-label={translateText(ariaLabel || placeholder)}
        type={type} 
        name={name}
        value={value} 
        onChange={e => onChange(e.target.value)} 
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: '10px', height: '10px', bottom: 0, left: 0 }}
      />
    </div>
  );
}
