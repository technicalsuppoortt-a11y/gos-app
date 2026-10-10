import { BookingBrandingFooter } from './BookingBrandingFooter';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Clock3, Monitor, Smartphone, Video } from 'lucide-react';
import { availableSlots, COLORS, dateKey, displayedSlots, formatDay, formatTime, KEYS, readAppointments, remainingSpots, TIMEZONES, useStored } from './model';
import type { BookingPage } from './model';
import { Avatar, Empty } from './ui';
import { BookingSelect } from './BookingSelect';
import { InviteeFields } from './InviteeFields';

export function BookingLivePreview({page}:{page:BookingPage}) {
  const [device,setDevice] = useState<'desktop'|'mobile'>('desktop');
  const [month,setMonth] = useState(()=>new Date(new Date().getFullYear(),new Date().getMonth(),1));
  const [date,setDate] = useState('');
  const [slot,setSlot] = useState('');
  const [choice,setChoice] = useState(page.duration);
  const [meeting,setMeeting] = useState(page.location);
  const [timezone,setTimezone] = useState(page.hostTimezone);
  const [step,setStep] = useState<'time'|'details'|'done'>('time');
  const [answers,setAnswers] = useState<Record<string,string>>({});
  const [guests,setGuests] = useState<{name:string;email:string}[]>([]);
  const [bookings] = useStored(KEYS.appointments,readAppointments);
  const duration = page.durationOptions.includes(choice)?choice:page.duration;
  const location = page.locationOptions.includes(meeting)?meeting:page.location;
  const zone = page.timezoneDisplay==='locked'?page.hostTimezone:timezone;
  const first = (new Date(month.getFullYear(),month.getMonth(),1).getDay()+6)%7;
  const count = new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
  const days = Array.from({length:Math.ceil((first+count)/7)*7},(_,i)=>i-first+1);
  const slots = date?displayedSlots(page,date,duration,bookings):[];
  const selected = slots.find(s=>s.start===slot&&!s.busy);
  const advance = (n:number)=>{setMonth(m=>new Date(m.getFullYear(),m.getMonth()+n,1));setDate('');setSlot('');setStep('time')};
  return <aside className="bk-editor-preview"><header className="bk-preview-heading"><div><b>Live preview</b><small>Changes appear as you edit.</small></div><div className="bk-segmented" aria-label="Preview device"><button aria-label="Desktop preview" aria-pressed={device==='desktop'} className={device==='desktop'?'active':''} onClick={()=>setDevice('desktop')}><Monitor size={16}/></button><button aria-label="Mobile preview" aria-pressed={device==='mobile'} className={device==='mobile'?'active':''} onClick={()=>setDevice('mobile')}><Smartphone size={16}/></button></div></header>
    <div className="bk-preview-scroll custom-scrollbar"><div className={'bk-preview-frame '+device} style={{'--booking-color':COLORS[page.color]||COLORS.violet} as React.CSSProperties} dir={page.language==='ar'?'rtl':'ltr'}>
      <div className="bk-preview-banner"><CalendarDays size={13}/><span>Preview · Appointments are not saved here</span></div>
      <div className="bk-preview-public"><section className="bk-preview-profile">
        {page.image?<div className="bk-public-media">{page.mediaType==='video'?<video src={page.image} controls playsInline/>:<img src={page.image} alt={page.hostName} style={{borderRadius:page.imageRound?'50%':12}}/>}</div>:<Avatar name={page.hostName}/>}
        <small>{page.hostName}</small><h2>{page.titleOverride||page.name||'Your booking page'}</h2><p>{page.description}</p><div className="bk-public-meta"><span><Clock3 size={14}/>{duration} minutes</span><span><Video size={14}/>{location}</span></div>
        <div className="bk-form"><label>Duration<BookingSelect value={duration} onChange={e=>{setChoice(Number(e.target.value));setSlot('')}}>{page.durationOptions.map(d=><option key={d} value={d}>{d} minutes</option>)}</BookingSelect></label><label>Location<BookingSelect value={location} onChange={e=>setMeeting(e.target.value)}>{page.locationOptions.map(l=><option key={l}>{l}</option>)}</BookingSelect></label>{page.showTimezone&&<label>Timezone<BookingSelect value={zone} disabled={page.timezoneDisplay==='locked'} onChange={e=>setTimezone(e.target.value)}>{[...new Set([page.hostTimezone,Intl.DateTimeFormat().resolvedOptions().timeZone,...TIMEZONES])].map(z=><option key={z}>{z}</option>)}</BookingSelect></label>}</div>
      </section><section className="bk-preview-calendar">
        {!page.active?<Empty title="This page is turned off" detail="Turn it on to accept bookings."/>:step==='done'?<div className="bk-confirm-preview"><CalendarDays size={25}/><h3>{page.requireApproval?'Booking request received':'You’re booked!'}</h3><p>{page.afterBooking.confirmationBody}</p><button className="bk-button" onClick={()=>setStep('time')}>Back to calendar</button></div>:step==='details'?<form className="bk-form" onSubmit={e=>{e.preventDefault();setStep('done')}}><button type="button" className="bk-back" onClick={()=>setStep('time')}><ArrowLeft size={13}/>Change time</button><h3>Your details</h3>{selected&&<p>{formatDay(date)} · {formatTime(selected.start,zone)}</p>}<InviteeFields page={page} answers={answers} setAnswers={setAnswers} guests={guests} setGuests={setGuests}/>{["phone","ask-invitee"].includes(page.locations.find(l=>l.label===location)?.type||"")&&<label>{page.locations.find(l=>l.label===location)?.type==="phone"?"Phone number for this call":"Your meeting address"}<input required/></label>}{!page.free&&<p className="bk-tip">{page.price} {page.currency} · {page.priceType.replace("_"," ")} · Payment arranged with the host.</p>}<button className="bk-button primary" disabled={!selected}>Preview confirmation</button></form>:<>
          <h3>Select a date &amp; time</h3><div className="bk-month-nav"><button className="bk-icon" aria-label="Previous preview month" onClick={()=>advance(-1)}><ChevronLeft size={16}/></button><b>{month.toLocaleDateString(page.language==='ar'?'ar':'en-US',{month:'long',year:'numeric'})}</b><button className="bk-icon" aria-label="Next preview month" onClick={()=>advance(1)}><ChevronRight size={16}/></button></div>
          <div className="bk-date-grid">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=><small key={d}>{d}</small>)}{days.map((d,i)=>{const key=dateKey(new Date(month.getFullYear(),month.getMonth(),d));const enabled=d>0&&d<=count&&availableSlots(page,key,duration,bookings).length>0;return <button key={i} disabled={!enabled} aria-label={formatDay(key)} aria-pressed={key===date} className={key===date?'selected':''} onClick={()=>{setDate(key);setSlot('')}}>{d>0&&d<=count?d:''}</button>})}</div>
          <div className="bk-slot-list"><b>{date?formatDay(date):'Choose a date to see available times'}</b>{slots.map(s=><button key={s.start} disabled={s.busy} className={selected?.start===s.start?'selected':''} aria-pressed={selected?.start===s.start} onClick={()=>setSlot(s.start)}>{formatTime(s.start,zone)}{page.groupCapacity>1&&page.displaySpotsLeft&&!s.busy&&<small>{remainingSpots(page,s.start,duration,bookings)} spots left</small>}</button>)}{date&&!slots.length&&<p className="bk-muted">No available times for this date.</p>}</div><button className="bk-button primary" disabled={!selected} onClick={()=>setStep('details')}>Continue<ArrowRight size={13}/></button>
        </>}
      </section></div><BookingBrandingFooter hostName={page.hostName} visible={page.displayBranding}/>
    </div></div>
  </aside>;
}



