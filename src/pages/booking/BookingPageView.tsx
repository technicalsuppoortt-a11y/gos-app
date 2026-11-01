import { translateText, localizeNode } from '../../i18n/display';
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Globe2, Video } from 'lucide-react';
import { TroubleshootControls, TroubleshootTimeSlots } from './BookingTroubleshoot';
import { BookingSelect } from './BookingSelect';
import { Avatar, Empty } from './ui';
import { InviteeFields } from './InviteeFields';
import { availableSlots, dateKey, formatDay, formatTime, TIMEZONES } from './model';
import type { Appointment, BookingPage, TroubleshootSlot } from './model';

// Shared presentation only. Each caller owns availability, form state and submission.
type Props = {
  page: BookingPage;
  bookings: Appointment[];
  showTroubleshoot: boolean;
  setShowTroubleshoot: React.Dispatch<React.SetStateAction<boolean>>;
  duration: number;
  setDuration: React.Dispatch<React.SetStateAction<number>>;
  setSlot: React.Dispatch<React.SetStateAction<string>>;
  location: string;
  setLocation: React.Dispatch<React.SetStateAction<string>>;
  displayTimezone: string;
  setTimezone: React.Dispatch<React.SetStateAction<string>>;
  step: 'select-slot' | 'confirm-form';
  error: string;
  month: Date;
  changeMonth: (by:number)=>void;
  days: number[];
  total: number;
  date: string;
  rescheduleId: string | undefined;
  setDate: React.Dispatch<React.SetStateAction<string>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
  slots: TroubleshootSlot[];
  slot: string;
  setStep: React.Dispatch<React.SetStateAction<'select-slot' | 'confirm-form'>>;
  submit: (event:React.FormEvent)=>void;
  answers: Record<string,string>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string,string>>>;
  guests: {name:string;email:string}[];
  setGuests: React.Dispatch<React.SetStateAction<{name:string;email:string}[]>>;
  inviteeLocation: string;
  setInviteeLocation: React.Dispatch<React.SetStateAction<string>>;
  source: string;
  setSource: React.Dispatch<React.SetStateAction<string>>;
  fromAd: boolean | null;
  setFromAd: React.Dispatch<React.SetStateAction<boolean | null>>;
  saving: boolean;
  enabledDates?: Set<string>;
};
export function BookingPageView({page, bookings, showTroubleshoot, setShowTroubleshoot, duration, setDuration, setSlot, location, setLocation, displayTimezone, setTimezone, step, error, month, changeMonth, days, total, date, rescheduleId, setDate, setError, slots, slot, setStep, submit, answers, setAnswers, guests, setGuests, inviteeLocation, setInviteeLocation, source, setSource, fromAd, setFromAd, saving, enabledDates}:Props) {
  return <div className="bk-public-grid"><aside className="bk-public-details"><TroubleshootControls page={page} bookings={bookings} checked={showTroubleshoot} change={setShowTroubleshoot}/>{localizeNode(page.image ? <div className="bk-public-media">{localizeNode(page.mediaType === 'video' ? <video src={page.image} controls playsInline style={{borderRadius:page.imageRound?'50%':12}}/> : <img src={page.image} alt={translateText(page.titleOverride || page.name)} style={{borderRadius:page.imageRound?'50%':12}}/>)}</div> : <Avatar name={page.hostName}/>)}<span className="bk-muted">{localizeNode(page.hostName)}</span><h1>{localizeNode(page.titleOverride || page.name)}</h1><div className="bk-public-meta"><span><Clock3 size={16}/>{localizeNode(duration)}{translateText(" minutes")}</span><span><Video size={16}/>{localizeNode(location)}</span></div><p>{localizeNode(page.description)}</p><label>{translateText("Meeting duration")}<BookingSelect value={duration} onChange={e => { setDuration(Number(e.target.value)); setSlot(''); }}>{localizeNode(page.durationOptions.map(n => <option key={n} value={n}>{localizeNode(n)}{translateText(" minutes")}</option>))}</BookingSelect></label><label>{translateText("Meeting location")}<BookingSelect value={location} onChange={e => setLocation(e.target.value)}>{localizeNode(page.locationOptions.map(l => <option key={l} value={l}>{localizeNode(l)}</option>))}</BookingSelect></label>{localizeNode(page.showTimezone && <label><span><Globe2 size={13}/>{translateText(" Your timezone")}</span><BookingSelect value={displayTimezone} disabled={page.timezoneDisplay === 'locked'} onChange={e => setTimezone(e.target.value)}>{localizeNode([...new Set([displayTimezone, ...TIMEZONES])].map(t => <option key={t} value={t}>{localizeNode(t)}</option>))}</BookingSelect></label>)}<div className="bk-tip">{translateText("Dates follow the host’s calendar in ")}{localizeNode(page.hostTimezone)}{translateText(". Times are shown in your chosen timezone.")}</div></aside>
      <section className="bk-public-wizard"><nav className="bk-wizard-steps" aria-label={translateText("Booking steps")}><span className={step === 'select-slot' ? 'active' : ''}><i>1</i>{translateText("Date & time")}</span><span className={step === 'confirm-form' ? 'active' : ''}><i>2</i>{translateText("Your details")}</span><span><i>3</i>{translateText("Confirmation")}</span></nav>{localizeNode(error && <p className="bk-error" role="alert">{localizeNode(error)}</p>)}
      {localizeNode(step === 'select-slot' ? <><h2>{translateText("Select a date & time")}</h2><div className="bk-slot-layout"><div><div className="bk-month-nav"><button className="bk-icon" aria-label={translateText("Previous month")} onClick={() => changeMonth(-1)}><ChevronLeft size={17}/></button><b>{localizeNode(month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))}</b><button className="bk-icon" aria-label={translateText("Next month")} onClick={() => changeMonth(1)}><ChevronRight size={17}/></button></div><div className="bk-date-grid">{localizeNode(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <small key={d}>{localizeNode(d)}</small>))}{localizeNode(days.map((d, i) => { const key = dateKey(new Date(month.getFullYear(), month.getMonth(), d)); const available = d > 0 && d <= total && (showTroubleshoot || (enabledDates ? enabledDates.has(key) : availableSlots(page, key, duration, bookings, new Date(), rescheduleId).length > 0)); return <button key={i} aria-label={translateText(formatDay(key))} aria-pressed={date === key} disabled={!available} className={date === key ? 'selected' : ''} onClick={() => { setDate(key); setSlot(''); setError(''); }}>{localizeNode(d > 0 && d <= total ? d : '')}</button>; }))}</div></div><div className="bk-slot-list"><b>{localizeNode(date ? formatDay(date) : 'Available times')}</b>{localizeNode(date ? slots.length ? <TroubleshootTimeSlots slots={slots} checked={showTroubleshoot} selected={slot} select={setSlot} timezone={displayTimezone} date={date} showSpots={page.displaySpotsLeft && page.groupCapacity > 1}/> : <Empty title={translateText("No available times")} detail="Try another day."/> : <p className="bk-muted">{translateText("Choose a highlighted date to see available times.")}</p>)}</div></div><button className="bk-button primary bk-next" disabled={!slot || !slots.some(s=>s.start===slot && !s.busy)} onClick={() => setStep('confirm-form')}>{translateText("Continue ")}<ArrowRight size={15}/></button></> : <form className="bk-form" onSubmit={submit}><button type="button" className="bk-back" onClick={() => setStep('select-slot')}><ArrowLeft size={14}/>{translateText("Change date or time")}</button><h2>{translateText("Your details")}</h2><p className="bk-selected-slot"><CalendarDays size={15}/>{localizeNode(slot && new Date(slot).toLocaleDateString('en-US', { timeZone: displayTimezone, month: 'long', day: 'numeric' }))} · {localizeNode(slot && formatTime(slot, displayTimezone))} · {localizeNode(duration)}{translateText(" min")}</p>
        {localizeNode(!page.free && <div className="bk-tip">{translateText("Price: ")}{localizeNode(page.priceType === 'hourly' ? (page.price * duration / 60).toFixed(2) : page.priceType === 'per_attendee' ? (page.price * ((page.formSettings.guestsActive ? guests.length : 0) + 1)).toFixed(2) : page.price.toFixed(2))} {localizeNode(page.currency)}{localizeNode(page.priceType === 'per_attendee' ? ' · Includes your guests' : '')}{translateText(". Payment will be arranged with the host.")}</div>)}
        <InviteeFields page={page} answers={answers} setAnswers={setAnswers} guests={guests} setGuests={setGuests}/>
        {localizeNode(['ask-invitee', 'phone'].includes(page.locations.find(l => l.label === location)?.type || '') && <label>{localizeNode(page.locations.find(l => l.label === location)?.type === 'phone' ? 'Phone number for this call' : 'Your meeting address')}<input required value={inviteeLocation} onChange={e => setInviteeLocation(e.target.value)}/></label>)}
        <details className="bk-extra-details"><summary>{translateText("Additional details")}</summary><div className="bk-form"><label>{translateText("How did you hear about us?")}<input value={source} onChange={e=>setSource(e.target.value)}/></label><fieldset><legend>{translateText("Did you find us through an advertisement?")}</legend><div className="bk-radio-options">{localizeNode([true,false].map(v=><label key={String(v)}><input type="radio" name="from-ad" checked={fromAd===v} onChange={()=>setFromAd(v)}/>{localizeNode(v?'Yes':'No')}</label>))}</div></fieldset></div></details><button className="bk-button primary bk-next" disabled={saving}>{localizeNode(saving ? 'Saving…' : page.requireApproval || !page.free ? 'Request booking' : rescheduleId ? 'Confirm new time' : 'Confirm booking')}<Check size={15}/></button></form>)}
      </section></div>;
}
