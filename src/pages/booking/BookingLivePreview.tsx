import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import { BookingBrandingFooter } from './BookingBrandingFooter';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Clock3, Monitor, Smartphone, Video } from 'lucide-react';
import { availableSlots, bookingColor, dateKey, displayedSlots, formatDay, formatTime, KEYS, readAppointments, remainingSpots, TIMEZONES, useStored } from './model';
import type { BookingPage } from './model';
import { Avatar, Empty } from './ui';
import { BookingSelect } from './BookingSelect';
import { InviteeFields } from './InviteeFields';

export function BookingLivePreview({page}:{page:BookingPage}) {
  useUILanguage();
  const [device,setDevice] = useState<'desktop'|'mobile'>('desktop');
  const viewportRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [fit,setFit] = useState({scale:1,height:0});
  useLayoutEffect(()=>{
    const viewport=viewportRef.current,frame=frameRef.current;
    if(!viewport||!frame)return;
    let pending=0;
    const measure=()=>{
      cancelAnimationFrame(pending);
      pending=requestAnimationFrame(()=>{
        const width=frame.offsetWidth,height=frame.offsetHeight;
        if(!width||!height)return;
        const scale=Math.min(1,Math.max(1,viewport.clientWidth-8)/width,Math.max(1,viewport.clientHeight-8)/height);
        setFit(current=>Math.abs(current.scale-scale)<.001&&current.height===height?current:{scale,height});
      });
    };
    const observer=new ResizeObserver(measure);
    observer.observe(viewport);observer.observe(frame);measure();
    return()=>{observer.disconnect();cancelAnimationFrame(pending);};
  },[device]);
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
  const { days, count } = useMemo(() => {
    const first = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
    const totalCount = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const daysArr = Array.from({ length: Math.ceil((first + totalCount) / 7) * 7 }, (_, i) => i - first + 1);
    return { days: daysArr, count: totalCount };
  }, [month]);

  const enabledDates = useMemo(() => {
    if (!page.active) return new Set<string>();
    const set = new Set<string>();
    for (let d = 1; d <= count; d++) {
      const key = dateKey(new Date(month.getFullYear(), month.getMonth(), d));
      if (availableSlots(page, key, duration, bookings).length > 0) {
        set.add(key);
      }
    }
    return set;
  }, [
    page.active,
    page.hostTimezone,
    page.availability,
    page.additionalWeekdayAvailability,
    page.specificDateAvailability,
    page.breaks,
    page.minNotice,
    page.maxAdvanceBooking,
    page.bufferTime,
    page.startIncrement,
    page.groupCapacity,
    page.dailyLimit,
    page.fixedDateRange.start,
    page.fixedDateRange.end,
    page.lookBusy.enabled,
    page.lookBusy.min,
    page.lookBusy.max,
    page.bookingLimits,
    duration,
    bookings,
    month,
    count
  ]);

  const slots = useMemo(() => {
    return date ? displayedSlots(page, date, duration, bookings) : [];
  }, [
    date,
    page.active,
    page.hostTimezone,
    page.availability,
    page.additionalWeekdayAvailability,
    page.specificDateAvailability,
    page.breaks,
    page.minNotice,
    page.maxAdvanceBooking,
    page.bufferTime,
    page.startIncrement,
    page.groupCapacity,
    page.dailyLimit,
    page.fixedDateRange.start,
    page.fixedDateRange.end,
    page.lookBusy.enabled,
    page.lookBusy.min,
    page.lookBusy.max,
    page.bookingLimits,
    page.grayOutBusy,
    duration,
    bookings
  ]);
  const selected = slots.find(s=>s.start===slot&&!s.busy);
  const advance = (n:number)=>{setMonth(m=>new Date(m.getFullYear(),m.getMonth()+n,1));setDate('');setSlot('');setStep('time')};
  return <aside className="bk-editor-preview"><header className="bk-preview-heading"><div><b>{translateText("Live preview")}</b><small>{translateText("Changes appear as you edit.")}</small></div><div className="bk-segmented" aria-label={translateText("Preview device")}><button aria-label={translateText("Desktop preview")} aria-pressed={device==='desktop'} className={device==='desktop'?'active':''} onClick={()=>setDevice('desktop')}><Monitor size={16}/></button><button aria-label={translateText("Mobile preview")} aria-pressed={device==='mobile'} className={device==='mobile'?'active':''} onClick={()=>setDevice('mobile')}><Smartphone size={16}/></button></div></header>
    <div className="bk-preview-scroll" ref={viewportRef}><div className="bk-preview-fit" style={{height:fit.height*fit.scale}}><div ref={frameRef} className={'bk-preview-frame '+device} style={{'--booking-color':bookingColor(page.color),transform:`translateX(-50%) scale(${fit.scale})` } as React.CSSProperties} dir={page.language==='ar'?'rtl':'ltr'}>
      <div className="bk-preview-banner"><CalendarDays size={13}/><span>{translateText("Preview · Appointments are not saved here")}</span></div>
      <div className="bk-preview-public"><section className="bk-preview-profile">
        {localizeNode(page.image?<div className="bk-public-media">{localizeNode(page.mediaType==='video'?<video src={page.image} controls playsInline/>:<img src={page.image} alt={translateText(page.hostName)} style={{borderRadius:page.imageRound?'50%':12}}/>)}</div>:<Avatar name={page.hostName}/>)}
        <small>{localizeNode(page.hostName)}</small><h2>{localizeNode(page.titleOverride||page.name||'Your booking page')}</h2><p>{localizeNode(page.description)}</p><div className="bk-public-meta"><span><Clock3 size={14}/>{localizeNode(duration)}{translateText(" minutes")}</span><span><Video size={14}/>{localizeNode(location)}</span></div>
        <div className="bk-form"><label>{translateText("Duration")}<BookingSelect value={duration} onChange={e=>{setChoice(Number(e.target.value));setSlot('')}}>{localizeNode(page.durationOptions.map(d=><option key={d} value={d}>{localizeNode(d)}{translateText(" minutes")}</option>))}</BookingSelect></label><label>{translateText("Location")}<BookingSelect value={location} onChange={e=>setMeeting(e.target.value)}>{localizeNode(page.locationOptions.map(l=><option key={l} value={l}>{localizeNode(l)}</option>))}</BookingSelect></label>{localizeNode(page.showTimezone&&<label>{translateText("Timezone")}<BookingSelect value={zone} disabled={page.timezoneDisplay==='locked'} onChange={e=>setTimezone(e.target.value)}>{localizeNode([...new Set([page.hostTimezone,Intl.DateTimeFormat().resolvedOptions().timeZone,...TIMEZONES])].map(z=><option key={z} value={z}>{localizeNode(z)}</option>))}</BookingSelect></label>)}</div>
      </section><section className="bk-preview-calendar">
        {localizeNode(!page.active?<Empty title={translateText("This page is turned off")} detail="Turn it on to accept bookings."/>:step==='done'?<div className="bk-confirm-preview"><CalendarDays size={25}/><h3>{localizeNode(page.requireApproval?'Booking request received':'You’re booked!')}</h3><p>{localizeNode(page.afterBooking.confirmationBody)}</p><button className="bk-button" onClick={()=>setStep('time')}>{translateText("Back to calendar")}</button></div>:step==='details'?<form className="bk-form" onSubmit={e=>{e.preventDefault();setStep('done')}}><button type="button" className="bk-back" onClick={()=>setStep('time')}><ArrowLeft size={13}/>{translateText("Change time")}</button><h3>{translateText("Your details")}</h3>{localizeNode(selected&&<p>{localizeNode(formatDay(date))} · {localizeNode(formatTime(selected.start,zone))}</p>)}<InviteeFields page={page} answers={answers} setAnswers={setAnswers} guests={guests} setGuests={setGuests}/>{localizeNode(["phone","ask-invitee"].includes(page.locations.find(l=>l.label===location)?.type||"")&&<label>{localizeNode(page.locations.find(l=>l.label===location)?.type==="phone"?"Phone number for this call":"Your meeting address")}<input required/></label>)}{localizeNode(!page.free&&<p className="bk-tip">{localizeNode(page.price)} {localizeNode(page.currency)} · {localizeNode(page.priceType.replace("_"," "))}{translateText(" · Payment arranged with the host.")}</p>)}<button className="bk-button primary" disabled={!selected}>{translateText("Preview confirmation")}</button></form>:<>
          <h3>{translateText("Select a date & time")}</h3><div className="bk-month-nav"><button className="bk-icon" aria-label={translateText("Previous preview month")} onClick={()=>advance(-1)}><ChevronLeft size={16}/></button><b>{localizeNode(month.toLocaleDateString(page.language==='ar'?'ar':'en-US',{month:'long',year:'numeric'}))}</b><button className="bk-icon" aria-label={translateText("Next preview month")} onClick={()=>advance(1)}><ChevronRight size={16}/></button></div>
          <div className="bk-date-grid">{localizeNode(['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=><small key={d}>{localizeNode(d)}</small>))}{localizeNode(days.map((d,i)=>{const key=dateKey(new Date(month.getFullYear(),month.getMonth(),d));const enabled=d>0&&d<=count&&enabledDates.has(key);return <button key={i} disabled={!enabled} aria-label={translateText(formatDay(key))} aria-pressed={key===date} className={key===date?'selected':''} onClick={()=>{setDate(key);setSlot('')}}>{localizeNode(d>0&&d<=count?d:'')}</button>}))}</div>
          <div className="bk-slot-list"><b>{localizeNode(date?formatDay(date):'Choose a date to see available times')}</b>{localizeNode(slots.map(s=><button key={s.start} disabled={s.busy} className={selected?.start===s.start?'selected':''} aria-pressed={selected?.start===s.start} onClick={()=>setSlot(s.start)}>{localizeNode(formatTime(s.start,zone))}{localizeNode(page.groupCapacity>1&&page.displaySpotsLeft&&!s.busy&&<small>{localizeNode(remainingSpots(page,s.start,duration,bookings))}{translateText(" spots left")}</small>)}</button>))}{localizeNode(date&&!slots.length&&<p className="bk-muted">{translateText("No available times for this date.")}</p>)}</div><button className="bk-button primary" disabled={!selected} onClick={()=>setStep('details')}>{translateText("Continue")}<ArrowRight size={13}/></button>
        </>)}
      </section></div><BookingBrandingFooter hostName={page.hostName} visible={page.displayBranding}/>
    </div></div></div>
  </aside>;
}



