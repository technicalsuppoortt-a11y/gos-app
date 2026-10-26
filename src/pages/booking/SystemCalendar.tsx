import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import { InviteeFields } from './InviteeFields';
import type { Dispatch, SetStateAction } from 'react';
import { BookingSelect } from './BookingSelect';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Video, X } from 'lucide-react';
import { bookingColor, availableSlots, dateKey, formatTime, hostInstant, parseDate, readContacts, uid } from './model';
import type { Appointment, BookingPage } from './model';
import { Empty } from './ui';

export function SystemCalendar({ pages, bookings, onEdit, onNew }: { pages: BookingPage[]; bookings: Appointment[]; onEdit: (b: Appointment) => void; onNew: (date?: string, time?: string) => void }) {
  useUILanguage();
  const [view, setView] = useState<'Week' | 'Month'>('Week');
  const [focus, setFocus] = useState(() => new Date());
  const [pageId, setPageId] = useState('');
  const timezone = 'Africa/Cairo';
  const weekStart = parseDate(dateKey(focus)); weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => { const day = new Date(weekStart); day.setDate(day.getDate() + i); return day; });
  const monthStart = new Date(focus.getFullYear(), focus.getMonth(), 1);
  const monthOffset = (monthStart.getDay() + 6) % 7;
  const monthDays = Array.from({ length: 42 }, (_, i) => new Date(focus.getFullYear(), focus.getMonth(), i - monthOffset + 1));
  const visible = bookings.filter(b => b.status !== 'Canceled' && (!pageId || b.calendarId === pageId));
  const rows = (day: Date) => visible.filter(b => dateKey(new Date(b.start), timezone) === dateKey(day));
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scroll.current && view === 'Week') scroll.current.scrollTop = 8 * 48; }, [view]);
  const navigate = (by: number) => setFocus(d => view === 'Month' ? new Date(d.getFullYear(), d.getMonth() + by, 1) : new Date(d.getFullYear(), d.getMonth(), d.getDate() + by * 7));
  return <section className="bk-calendar-section"><div className="bk-calendar-title"><div><h2>{translateText("System Calendar")}</h2><span>{localizeNode(timezone)}</span></div></div><div className="bk-card bk-calendar-panel"><div className="bk-calendar-toolbar"><button className="bk-button" onClick={() => setFocus(new Date())}>{translateText("Today")}</button><button className="bk-icon" aria-label={translateText(`Previous ${view.toLowerCase()}`)} onClick={() => navigate(-1)}><ChevronLeft size={16}/></button><button className="bk-icon" aria-label={translateText(`Next ${view.toLowerCase()}`)} onClick={() => navigate(1)}><ChevronRight size={16}/></button><b>{localizeNode(focus.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))}</b><div className="bk-segmented" aria-label={translateText("Calendar view")}>{localizeNode((['Week', 'Month'] as const).map(v => <button key={v} aria-pressed={view === v} className={view === v ? 'active' : ''} onClick={() => setView(v)}>{localizeNode(v)}</button>))}</div><BookingSelect className="bk-filter" aria-label={translateText("Calendars")} value={pageId} onChange={e => setPageId(e.target.value)}><option value="">{translateText("All calendars")}</option>{localizeNode(pages.map(p => <option key={p.id} value={p.id}>{localizeNode(p.name)}</option>))}</BookingSelect></div>
      {localizeNode(view === 'Month' ? <div className="bk-calendar-month custom-scrollbar"><div className="bk-month-days">{localizeNode(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <b key={day}>{localizeNode(day)}</b>))}</div><div className="bk-month-cells">{localizeNode(monthDays.map(day => <div key={dateKey(day)} className={day.getMonth() !== focus.getMonth() ? 'other-month' : ''}><button className={dateKey(day) === dateKey(new Date()) ? 'today' : ''} aria-label={translateText('Add event on ' + dateKey(day))} onClick={() => onNew(dateKey(day))}>{localizeNode(day.getDate())}</button>{localizeNode(rows(day).map(b => <button className="bk-month-event" style={{ '--booking-color': bookingColor(pages.find(p => p.id === b.calendarId)?.color || 'violet') } as React.CSSProperties} key={b.id} onClick={() => onEdit(b)}><span>{localizeNode(formatTime(b.start, timezone))}</span>{localizeNode(b.name)}</button>))}</div>))}</div></div> : <div className="bk-calendar-week-scroll custom-scrollbar" ref={scroll}><div className="bk-calendar-week"><div className="bk-week-head"><div className="bk-week-time-head"/>{localizeNode(days.map(day => <div key={dateKey(day)}><small>{localizeNode(day.toLocaleDateString('en-US', { weekday: 'short' }))}</small><b className={dateKey(day) === dateKey(new Date()) ? 'today' : ''}>{localizeNode(day.getDate())}</b></div>))}</div><div className="bk-week-body"><div className="bk-calendar-hours">{localizeNode(Array.from({ length: 24 }, (_, i) => <span key={i}>{localizeNode(formatTime(hostInstant(dateKey(focus), String(i).padStart(2, '0') + ':00', timezone), timezone))}</span>))}</div>{localizeNode(days.map(day => <div className="bk-week-column" key={dateKey(day)}>{localizeNode(Array.from({ length: 24 }, (_, hour) => <button key={hour} aria-label={translateText(`Add event on ${dateKey(day)} at ${hour}:00`)} onClick={() => onNew(dateKey(day), String(hour).padStart(2, '0') + ':00')}/>))}{localizeNode(rows(day).map(b => {
        const parts = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(b.start));
        const minute = Number(parts.find(p => p.type === 'hour')?.value) * 60 + Number(parts.find(p => p.type === 'minute')?.value);
        const neighbors = rows(day).filter(v => Date.parse(v.start) < Date.parse(b.start) + b.duration * 60000 && Date.parse(v.start) + v.duration * 60000 > Date.parse(b.start));
        const index = neighbors.findIndex(v => v.id === b.id);
        return <button className={`bk-calendar-event ${b.status === 'Pending' ? 'pending' : ''}`} key={b.id} style={{ top: minute * .8, height: Math.max(30, b.duration * .8), left: `calc(${index * 100 / neighbors.length}% + 3px)`, width: `calc(${100 / neighbors.length}% - 6px)` }} onClick={() => onEdit(b)} title={translateText(b.name + ' · ' + b.serviceName)}><b>{localizeNode(b.name)}</b><small>{localizeNode(formatTime(b.start, timezone))} · {localizeNode(b.serviceName)}</small></button>;
      }))}</div>))}</div></div></div>)}
      <footer className="bk-calendar-legend"><span><i/>{translateText("Confirmed")}</span><span><i className="pending"/>{translateText("Pending approval")}</span><span>{translateText("Click a time slot to add an appointment")}</span></footer></div></section>;
}


export function AppointmentEditor({ pages, bookings, value, save, close }: { pages: BookingPage[]; bookings: Appointment[]; value: Appointment | { date?: string; time?: string }; save: (b: Appointment) => void; close: () => void }) {
  useUILanguage();
  const existing = 'id' in value ? value : undefined;
  const [pageId,setPageId] = useState(existing?.calendarId||pages.find(p=>p.active)?.id||'');
  const page = pages.find(p=>p.id===pageId);
  const [date,setDate] = useState(value.date||dateKey(new Date()));
  const [time,setTime] = useState(value.time||'');
  const [responses,setResponses] = useState<Record<string,Record<string,string>>>(()=>({[pageId]:{...existing?.customAnswers,name:existing?.name||'',email:existing?.email||'',whatsapp:existing?.whatsapp||''}}));
  const answers = responses[pageId]||{};
  const setAnswers:Dispatch<SetStateAction<Record<string,string>>> = update=>setResponses(current=>({...current,[pageId]:typeof update==='function'?update(current[pageId]||{}):update}));
  const [guests,setGuests] = useState(existing?.guests||[]);
  const [duration,setDuration] = useState(existing?.duration||page?.duration||30);
  const [location,setLocation] = useState(existing?.location||page?.location||'');
  const [status,setStatus] = useState<Appointment['status']>(existing?.status||'Confirmed');
  const [error,setError] = useState('');
  const slots = page?availableSlots(page,date,duration,bookings,new Date(),existing?.id,answers.email):[];
  const past = existing&&Date.parse(existing.start)<Date.now();
  const changePage = (nextId:string)=>{
    const next = pages.find(p=>p.id===nextId);
    if(!next)return;
    setResponses(current=>current[nextId]?current:{...current,[nextId]:{name:answers.name||'',email:answers.email||'',whatsapp:answers.whatsapp||'',firstName:answers.firstName||'',lastName:answers.lastName||''}});
    setPageId(nextId);setDuration(next.duration);setLocation(next.location);setTime('');setError('');
  };
  return <main className="bk-editor-page bk-appointment-page flex flex-col"><header className="bk-editor-header"><button type="button" className="bk-button" onClick={close}><ArrowLeft size={15}/>{translateText("Back")}</button><div><span className="bk-eyebrow">{translateText("Upclick / BOOKING WORKSPACE")}</span><h1>{localizeNode(existing?'Appointment details / reschedule':'Add appointment')}</h1></div><button className="bk-icon" type="button" onClick={close} aria-label={translateText("Close appointment editor")}><X size={19}/></button></header><form className="bk-appointment-form" onSubmit={e=>{
    e.preventDefault();
    if(!page){setError('Choose a booking page.');return}
    const missing=page.questions.find(q=>q.active!==false&&q.type!=='text-block'&&q.required&&!answers[q.id]?.trim());
    if(missing){setError('Please answer: '+missing.label);return}
    if(page.formSettings.guestsActive&&page.formSettings.guestsRequired&&!guests.length){setError('Add at least one guest.');return}
    const selected=slots.find(s=>s.time===time);
    if(!selected&&status!=='Canceled'&&!(past&&existing.date===date&&existing.time===time&&existing.duration===duration&&existing.calendarId===pageId)){setError('Choose an available time. Availability, notice and buffers apply.');return}
    save({id:existing?.id||uid(),calendarId:page.id,serviceName:page.name,name:(answers.name||'').trim(),email:(answers.email||'').trim().toLowerCase(),whatsapp:answers.whatsapp||'',date,time,start:selected?.start||existing?.start||hostInstant(date,time,page.hostTimezone).toISOString(),duration,location,timezone:page.hostTimezone,status,source:existing?.source||'',fromAd:existing?.fromAd??null,customAnswers:{...answers},guests:page.formSettings.guestsActive?guests:[],...(existing?.payment?{payment:existing.payment}:{})});
  }}>
    <div className="bk-appointment-fields bk-form custom-scrollbar">{localizeNode(!pages.length?<Empty title={translateText("Create a booking page first")} detail="Appointments need a page with availability rules."/>:<>
      <label>{translateText("Booking page")}<BookingSelect value={pageId} onChange={e=>changePage(e.target.value)}>{localizeNode(pages.map(p=><option key={p.id} value={p.id}>{localizeNode(p.name)}{localizeNode(p.active?'':' (turned off)')}</option>))}</BookingSelect></label>
      {localizeNode(readContacts().length > 0 && <label>{translateText("Select existing contact (optional)")}<BookingSelect value="" onChange={e => {
        const c = readContacts().find(item => item.id === e.target.value);
        if (c) {
          setAnswers(a => ({ ...a, name: c.name, email: c.email, whatsapp: c.phone || a.whatsapp || '' }));
        }
      }}><option value="">{translateText("Choose from saved contacts...")}</option>{localizeNode(readContacts().map(c => <option key={c.id} value={c.id}>{localizeNode(c.name)}{localizeNode(c.email ? ' (' + c.email + ')' : c.phone ? ' (' + c.phone + ')' : '')}</option>))}</BookingSelect></label>)}
      {localizeNode(page&&<section className="bk-appointment-questions bk-form" key={page.id}><div className="bk-appointment-form-heading"><b>{translateText("Client details & booking questions")}</b><small>{localizeNode(page.name)}</small></div><div className="bk-appointment-question-grid"><InviteeFields page={page} answers={answers} setAnswers={setAnswers} guests={guests} setGuests={setGuests}/></div></section>)}
      <div className="bk-form-grid"><label>{translateText("Date")}<input type="date" required value={date} onChange={e=>{setDate(e.target.value);setTime('');setError('')}}/></label><label>{translateText("Time (")}{localizeNode(page?.hostTimezone)})<BookingSelect required value={time} onChange={e=>setTime(e.target.value)}><option value="">{translateText("Select a time")}</option>{localizeNode(existing&&existing.calendarId===pageId&&existing.date===date&&existing.duration===duration&&!slots.some(s=>s.time===existing.time)&&<option value={existing.time}>{localizeNode(existing.time)}{translateText(" (existing)")}</option>)}{localizeNode(slots.map(s=><option key={s.time} value={s.time}>{localizeNode(formatTime(s.start,page!.hostTimezone))}</option>))}</BookingSelect></label></div>
      <div className="bk-form-grid"><label>{translateText("Duration")}<BookingSelect value={duration} onChange={e=>{setDuration(Number(e.target.value));setTime('')}}>{localizeNode([...new Set([duration,...(page?.durationOptions||[30])])].map(n=><option key={n} value={n}>{localizeNode(n)}{translateText(" min")}</option>))}</BookingSelect></label><label>{translateText("Status")}<BookingSelect value={status} onChange={e=>setStatus(e.target.value as Appointment['status'])}>{localizeNode(['Confirmed','Pending','Canceled'].map(s=><option key={s} value={s}>{localizeNode(s)}</option>))}</BookingSelect></label></div>
      <label><span><Video size={13}/>{translateText("Location")}</span><input required value={location} onChange={e=>setLocation(e.target.value)}/></label>
      {localizeNode(!slots.length&&!past&&<p className="bk-tip">{translateText("There are no bookable times on this day. Choose another date.")}</p>)}{localizeNode(error&&<p className="bk-error" role="alert">{localizeNode(error)}</p>)}
    </>)}</div>
    <div className="bk-dialog-footer"><button type="button" className="bk-button" onClick={close}>{translateText("Close")}</button><button className="bk-button primary" disabled={!page}>{translateText("Save appointment")}</button></div>
  </form></main>;
}

