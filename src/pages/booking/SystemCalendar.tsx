import { InviteeFields } from './InviteeFields';
import type { Dispatch, SetStateAction } from 'react';
import { BookingSelect } from './BookingSelect';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Video } from 'lucide-react';
import { COLORS, availableSlots, dateKey, formatTime, hostInstant, parseDate, uid } from './model';
import type { Appointment, BookingPage } from './model';
import { Empty, Modal } from './ui';

export function SystemCalendar({ pages, bookings, onEdit, onNew }: { pages: BookingPage[]; bookings: Appointment[]; onEdit: (b: Appointment) => void; onNew: (date?: string, time?: string) => void }) {
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
  return <section className="bk-calendar-section"><div className="bk-calendar-title"><div><h2>System Calendar</h2><span>{timezone}</span></div><button className="bk-button primary" onClick={() => onNew()}><Plus size={14}/>Add event</button></div><div className="bk-card bk-calendar-panel"><div className="bk-calendar-toolbar"><button className="bk-button" onClick={() => setFocus(new Date())}>Today</button><button className="bk-icon" aria-label={`Previous ${view.toLowerCase()}`} onClick={() => navigate(-1)}><ChevronLeft size={16}/></button><button className="bk-icon" aria-label={`Next ${view.toLowerCase()}`} onClick={() => navigate(1)}><ChevronRight size={16}/></button><b>{focus.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</b><div className="bk-segmented" aria-label="Calendar view">{(['Week', 'Month'] as const).map(v => <button key={v} aria-pressed={view === v} className={view === v ? 'active' : ''} onClick={() => setView(v)}>{v}</button>)}</div><BookingSelect className="bk-filter" aria-label="Calendars" value={pageId} onChange={e => setPageId(e.target.value)}><option value="">All calendars</option>{pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</BookingSelect></div>
      {view === 'Month' ? <div className="bk-calendar-month custom-scrollbar"><div className="bk-month-days">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <b key={day}>{day}</b>)}</div><div className="bk-month-cells">{monthDays.map(day => <div key={dateKey(day)} className={day.getMonth() !== focus.getMonth() ? 'other-month' : ''}><button className={dateKey(day) === dateKey(new Date()) ? 'today' : ''} aria-label={'Add event on ' + dateKey(day)} onClick={() => onNew(dateKey(day))}>{day.getDate()}</button>{rows(day).map(b => <button className="bk-month-event" style={{ '--booking-color': COLORS[pages.find(p => p.id === b.calendarId)?.color || 'violet'] } as React.CSSProperties} key={b.id} onClick={() => onEdit(b)}><span>{formatTime(b.start, timezone)}</span>{b.name}</button>)}</div>)}</div></div> : <div className="bk-calendar-week-scroll custom-scrollbar" ref={scroll}><div className="bk-calendar-week"><div className="bk-week-head"><div className="bk-week-time-head"/>{days.map(day => <div key={dateKey(day)}><small>{day.toLocaleDateString('en-US', { weekday: 'short' })}</small><b className={dateKey(day) === dateKey(new Date()) ? 'today' : ''}>{day.getDate()}</b></div>)}</div><div className="bk-week-body"><div className="bk-calendar-hours">{Array.from({ length: 24 }, (_, i) => <span key={i}>{formatTime(hostInstant(dateKey(focus), String(i).padStart(2, '0') + ':00', timezone), timezone)}</span>)}</div>{days.map(day => <div className="bk-week-column" key={dateKey(day)}>{Array.from({ length: 24 }, (_, hour) => <button key={hour} aria-label={`Add event on ${dateKey(day)} at ${hour}:00`} onClick={() => onNew(dateKey(day), String(hour).padStart(2, '0') + ':00')}/>)}{rows(day).map(b => {
        const parts = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(b.start));
        const minute = Number(parts.find(p => p.type === 'hour')?.value) * 60 + Number(parts.find(p => p.type === 'minute')?.value);
        const neighbors = rows(day).filter(v => Date.parse(v.start) < Date.parse(b.start) + b.duration * 60000 && Date.parse(v.start) + v.duration * 60000 > Date.parse(b.start));
        const index = neighbors.findIndex(v => v.id === b.id);
        return <button className={`bk-calendar-event ${b.status === 'Pending' ? 'pending' : ''}`} key={b.id} style={{ top: minute * .8, height: Math.max(30, b.duration * .8), left: `calc(${index * 100 / neighbors.length}% + 3px)`, width: `calc(${100 / neighbors.length}% - 6px)` }} onClick={() => onEdit(b)} title={b.name + ' · ' + b.serviceName}><b>{b.name}</b><small>{formatTime(b.start, timezone)} · {b.serviceName}</small></button>;
      })}</div>)}</div></div></div>}
      <footer className="bk-calendar-legend"><span><i/>Confirmed</span><span><i className="pending"/>Pending approval</span><span>Click a time slot to add an appointment</span></footer></div></section>;
}


export function AppointmentEditor({ pages, bookings, value, save, close }: { pages: BookingPage[]; bookings: Appointment[]; value: Appointment | { date?: string; time?: string }; save: (b: Appointment) => void; close: () => void }) {
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
  return <Modal title={existing?'Appointment details / reschedule':'Add appointment'} close={close}><form className="bk-form bk-dialog-body" onSubmit={e=>{
    e.preventDefault();
    if(!page){setError('Choose a booking page.');return}
    const missing=page.questions.find(q=>q.active!==false&&q.type!=='text-block'&&q.required&&!answers[q.id]?.trim());
    if(missing){setError('Please answer: '+missing.label);return}
    if(page.formSettings.guestsActive&&page.formSettings.guestsRequired&&!guests.length){setError('Add at least one guest.');return}
    const selected=slots.find(s=>s.time===time);
    if(!selected&&status!=='Canceled'&&!(past&&existing.date===date&&existing.time===time&&existing.duration===duration&&existing.calendarId===pageId)){setError('Choose an available time. Availability, notice and buffers apply.');return}
    save({id:existing?.id||uid(),calendarId:page.id,serviceName:page.name,name:(answers.name||'').trim(),email:(answers.email||'').trim().toLowerCase(),whatsapp:answers.whatsapp||'',date,time,start:selected?.start||existing?.start||hostInstant(date,time,page.hostTimezone).toISOString(),duration,location,timezone:page.hostTimezone,status,source:existing?.source||'',fromAd:existing?.fromAd??null,customAnswers:{...answers},guests:page.formSettings.guestsActive?guests:[],...(existing?.payment?{payment:existing.payment}:{})});
  }}>
    {!pages.length?<Empty title="Create a booking page first" detail="Appointments need a page with availability rules."/>:<>
      <label>Booking page<BookingSelect value={pageId} onChange={e=>changePage(e.target.value)}>{pages.map(p=><option key={p.id} value={p.id}>{p.name}{p.active?'':' (turned off)'}</option>)}</BookingSelect></label>
      {page&&<section className="bk-appointment-questions bk-form" key={page.id}><div className="bk-appointment-form-heading"><b>Client details &amp; booking questions</b><small>{page.name}</small></div><InviteeFields page={page} answers={answers} setAnswers={setAnswers} guests={guests} setGuests={setGuests}/></section>}
      <div className="bk-form-grid"><label>Date<input type="date" required value={date} onChange={e=>{setDate(e.target.value);setTime('');setError('')}}/></label><label>Time ({page?.hostTimezone})<BookingSelect required value={time} onChange={e=>setTime(e.target.value)}><option value="">Select a time</option>{existing&&existing.calendarId===pageId&&existing.date===date&&existing.duration===duration&&!slots.some(s=>s.time===existing.time)&&<option value={existing.time}>{existing.time} (existing)</option>}{slots.map(s=><option key={s.time} value={s.time}>{formatTime(s.start,page!.hostTimezone)}</option>)}</BookingSelect></label></div>
      <div className="bk-form-grid"><label>Duration<BookingSelect value={duration} onChange={e=>{setDuration(Number(e.target.value));setTime('')}}>{[...new Set([duration,...(page?.durationOptions||[30])])].map(n=><option key={n} value={n}>{n} min</option>)}</BookingSelect></label><label>Status<BookingSelect value={status} onChange={e=>setStatus(e.target.value as Appointment['status'])}>{['Confirmed','Pending','Canceled'].map(s=><option key={s}>{s}</option>)}</BookingSelect></label></div>
      <label><span><Video size={13}/>Location</span><input required value={location} onChange={e=>setLocation(e.target.value)}/></label>
      {!slots.length&&!past&&<p className="bk-tip">There are no bookable times on this day. Choose another date.</p>}{error&&<p className="bk-error" role="alert">{error}</p>}
    </>}
    <div className="bk-dialog-footer"><button type="button" className="bk-button" onClick={close}>Close</button><button className="bk-button primary" disabled={!page}>Save appointment</button></div>
  </form></Modal>;
}

