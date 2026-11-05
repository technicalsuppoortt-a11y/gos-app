import { useUILanguage, translateText } from '../../i18n/display';
import { BookingBrandingFooter } from './BookingBrandingFooter';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Monitor, Smartphone } from 'lucide-react';
import { availableSlots, bookingColor, dateKey, displayedSlots, firstAvailableDate, parseDate, troubleshootSlots, KEYS, readAppointments, remainingSpots, useStored } from './model';
import type { BookingPage } from './model';
import { Empty } from './ui';
import { BookingPageView } from './BookingPageView';
import { BookingScreeningExit, BookingScreeningView, bookingLocale, screeningText } from './BookingScreeningView';
import { evaluateQualification, publicScreeningQuestions } from '../../../functions/booking-qualification.js';
import { BookingPreviewViewport } from './BookingPreviewViewport';
import { BookingConfirmationView } from './BookingConfirmationView';
import type { Appointment } from './model';
import { BookingDirectionContext } from './BookingSelect';
import { InviteeFields } from './InviteeFields';

export function BookingLivePreview({page: draft}:{page:BookingPage}) {
  const locale = bookingLocale(useUILanguage(), draft.language);
  const page = { ...draft, language: locale.lang };
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
  const [bookings] = useStored(KEYS.appointments,readAppointments);
  const [date,setDate] = useState(()=>firstAvailableDate(page,bookings));
  const [month,setMonth] = useState(()=>{
    const initial=parseDate(date||dateKey(new Date(),page.hostTimezone));
    return new Date(initial.getFullYear(),initial.getMonth(),1);
  });
  const [slot,setSlot] = useState('');
  const [choice,setChoice] = useState(page.duration);
  const [meeting,setMeeting] = useState(page.locationOptions[0]||page.location);
  const [timezone,setTimezone] = useState(()=>Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [step,setStep] = useState<'time'|'details'|'done'>('time');
  const [screeningAnswers, setScreeningAnswers] = useState<Record<string, string>>({});
  const [checkedScreening, setCheckedScreening] = useState<{ rules: string; status: 'qualified' | 'ineligible' }>();
  const [screeningError, setScreeningError] = useState('');
  const rules = page.qualificationQuestions ?? [];
  const screeningKey = JSON.stringify(rules);
  const screeningStatus = checkedScreening?.rules === screeningKey ? checkedScreening.status : undefined;
  const editScreening = () => { setCheckedScreening(undefined); setScreeningError(''); setSlot(''); setStep('time'); };
  const [answers,setAnswers] = useState<Record<string,string>>({});
  const [guests,setGuests] = useState<{name:string;email:string}[]>([]);
  const [inviteeLocation,setInviteeLocation] = useState('');
  const [source,setSource] = useState('');
  const [fromAd,setFromAd] = useState<boolean|null>(null);
  const [showTroubleshoot,setShowTroubleshoot] = useState(false);
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
  const advance = (n:number)=>{setMonth(m=>new Date(m.getFullYear(),m.getMonth()+n,1));setDate('');setSlot('');setStep('time')};
  const confirmation: Appointment = {
    id:'preview',calendarId:page.id,serviceName:page.name,name:answers.name||'',email:answers.email||'',whatsapp:answers.whatsapp||'',
    date,time:slots.find(s=>s.start===slot)?.time||'',start:slot,duration,timezone:zone,location,
    status:page.requireApproval||!page.free?'Pending':'Confirmed',source,fromAd,customAnswers:answers,guests,
    ...(!page.free?{payment:{amount:page.priceType==='hourly'?page.price*duration/60:page.priceType==='per_attendee'?page.price*(guests.length+1):page.price,currency:page.currency,status:'Pending' as const}}:{}),
  };
  return <aside className="bk-editor-preview"><header className="bk-preview-heading"><div><b>{translateText("Live preview")}</b><small>{translateText("Changes appear as you edit.")}</small></div><div className="bk-segmented" aria-label={translateText("Preview device")}><button aria-label={translateText("Desktop preview")} aria-pressed={device==='desktop'} className={device==='desktop'?'active':''} onClick={()=>setDevice('desktop')}><Monitor size={16}/></button><button aria-label={translateText("Mobile preview")} aria-pressed={device==='mobile'} className={device==='mobile'?'active':''} onClick={()=>setDevice('mobile')}><Smartphone size={16}/></button></div></header>
    <div className="bk-preview-banner"><CalendarDays size={13}/><span>{translateText("Preview · Appointments are not saved here")}</span></div>
    <div className="bk-preview-scroll" ref={viewportRef}><div className="bk-preview-fit" style={{height:fit.height*fit.scale}}><div ref={frameRef} className={'bk-preview-frame '+device} style={{width:device==='mobile'?390:1040,maxWidth:'none',transform:`translateX(-50%) scale(${fit.scale})`}}>
      <BookingPreviewViewport mobile={device==='mobile'}>
        <BookingDirectionContext.Provider value={locale.dir}>
        <main {...locale} className="bk-public h-screen overflow-hidden flex flex-col" style={{'--booking-color':bookingColor(page.color)} as React.CSSProperties}>
          <header className="bk-public-brand"><CalendarDays size={21}/><b>{translateText("Upclick")}</b><span>{translateText("Booking")}</span></header>
          <div className="bk-public-scroll custom-scrollbar"><div className="bk-public-shell">
            {!page.active ? <Empty title={translateText("This booking page is turned off")} detail="Please contact the host to arrange an appointment."/>
            : rules.length > 0 && screeningStatus === 'ineligible' ? <BookingScreeningExit language={page.language} restart={editScreening}/>
            : rules.length > 0 && screeningStatus !== 'qualified' ? <BookingScreeningView
              page={page} questions={publicScreeningQuestions(rules)} answers={screeningAnswers} error={screeningError} saving={false} focusOnMount={false}
              setAnswer={(id, answer) => setScreeningAnswers(current => ({ ...current, [id]: answer }))}
              submit={event => {
                event.preventDefault();
                const result = evaluateQualification(rules, screeningAnswers);
                if (result.status === 'incomplete') {
                  setScreeningError(screeningText(page.language, 'Please check your answers and complete every screening question.'));
                } else {
                  setCheckedScreening({ rules: screeningKey, status: result.status });
                  setScreeningError(''); setStep('time');
                }
              }}/>
            : step==='done' ? <BookingConfirmationView success={confirmation} page={page} error=""><button className="bk-button" onClick={()=>setStep('time')}>{translateText("Back to calendar")}</button></BookingConfirmationView> : <BookingPageView
              page={page} bookings={bookings} showTroubleshoot={showTroubleshoot} setShowTroubleshoot={setShowTroubleshoot} enabledDates={enabledDates}
              duration={duration} setDuration={setChoice} location={location} setLocation={setMeeting}
              displayTimezone={zone} setTimezone={setTimezone} step={step==='details'?'confirm-form':'select-slot'}
              setStep={next=>setStep(current=>{const value=typeof next==='function'?next(current==='details'?'confirm-form':'select-slot'):next;return value==='confirm-form'?'details':'time';})}
              error="" setError={()=>{}} month={month} changeMonth={advance} days={days} total={count}
              date={date} setDate={setDate} slot={slot} setSlot={setSlot} rescheduleId={undefined}
              slots={showTroubleshoot&&date?troubleshootSlots(page,date,duration,bookings):slots.map(s=>({...s,spotsLeft:remainingSpots(page,s.start,duration,bookings),detail:''}))}
              submit={e=>{e.preventDefault();setStep('done')}} answers={answers} setAnswers={setAnswers}
              guests={guests} setGuests={setGuests} inviteeLocation={inviteeLocation} setInviteeLocation={setInviteeLocation}
              source={source} setSource={setSource} fromAd={fromAd} setFromAd={setFromAd} saving={false}
              editScreening={rules.length > 0 ? editScreening : undefined}
            />}
            <BookingBrandingFooter hostName={page.hostName} visible={page.displayBranding}/>
          </div></div>
        </main>
        </BookingDirectionContext.Provider>
      </BookingPreviewViewport>
    </div></div></div>
  </aside>;
}
