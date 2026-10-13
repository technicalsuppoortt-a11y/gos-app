import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import { TroubleshootControls, TroubleshootTimeSlots } from './BookingTroubleshoot';
import { BookingBrandingFooter } from './BookingBrandingFooter';
import { BookingSelect } from './BookingSelect';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Globe2, Video } from 'lucide-react';
import { Avatar, Empty } from './ui';
import { InviteeFields } from './InviteeFields';
import { safeHttpUrl } from './booking-section-schema';
import { availableSlots, firstAvailableDate, parseDate, displayedSlots, troubleshootSlots, remainingSpots, bookingColor, load, dateKey, formatDay, formatTime, KEYS, readAppointments, readContacts, readPages, TIMEZONES, uid, useStored, write, persistAppointment } from './model';
import type { Appointment } from './model';
import './booking-workspace.css';

export default function PublicBookingPage() {
  useUILanguage();
  const { slug } = useParams();
  return <PublicBookingFlow key={slug}/>;
}

function PublicBookingFlow() {
  useUILanguage();
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const [pages] = useStored(KEYS.pages, readPages);
  const [bookings] = useStored(KEYS.appointments, readAppointments);
  const page = pages.find(p => p.slug === slug);
  const [date, setDate] = useState(() => page ? firstAvailableDate(page, bookings) : '');
  const [month, setMonth] = useState(() => {
    const initial = date || (page ? dateKey(new Date(), page.hostTimezone) : dateKey(new Date()));
    const d = parseDate(initial);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [slot, setSlot] = useState('');
  const [step, setStep] = useState<'select-slot' | 'confirm-form'>('select-slot');
  const [duration, setDuration] = useState(page?.duration || 30);
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [location, setLocation] = useState(page?.locationOptions[0] || 'Google Meet');
  const [answers, setAnswers] = useState<Record<string, string>>(() => page?.afterBooking.prefill ? load<Record<string,string>>('gos.booking.prefill.' + page.id, {}) : {});
  const [guests, setGuests] = useState<{ name: string; email: string }[]>([]);
  const [source, setSource] = useState('');
  const [fromAd, setFromAd] = useState<boolean | null>(null);
  const [inviteeLocation, setInviteeLocation] = useState('');
  const [rescheduleId, setRescheduleId] = useState<string>();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const displayTimezone = page?.timezoneDisplay === 'locked' ? page.hostTimezone : timezone;
  const success = bookings.find(b => b.id === params.get('bookingId') && b.calendarId === page?.id);
  const changeMonth = (by: number) => { setMonth(d => new Date(d.getFullYear(), d.getMonth() + by, 1)); setDate(''); setSlot(''); };
  const reset = () => {
    setStep('select-slot'); setSlot(''); setDate(''); setError(''); setRescheduleId(undefined);
    const now = new Date(); setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setDuration(page?.duration || 30); setLocation(page?.locationOptions[0] || 'None');
    setGuests([]); setSource(''); setFromAd(null); setInviteeLocation('');
    setAnswers(page?.afterBooking.prefill ? load<Record<string,string>>('gos.booking.prefill.' + page.id, {}) : {});
  };
  if (!page) return <main className="bk-public"><div className="bk-public-shell"><Empty title={translateText("Booking page not found")} detail="Check the booking URL or ask the host for a new link."/></div></main>;
  if (page.passwordProtect && !authorized) return <main className="bk-public"><div className="bk-public-scroll"><section className="bk-public-shell bk-password-gate"><h1>{translateText("Password-protected booking preview")}</h1><form className="bk-form" onSubmit={e => { e.preventDefault(); if (passwordInput === page.password) { setAuthorized(true); setError(''); } else setError('Incorrect password. Try again.'); }}><label>{translateText("Page password")}<input autoFocus type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)}/></label>{localizeNode(error && <p className="bk-error" role="alert">{localizeNode(error)}</p>)}<button className="bk-button primary">{translateText("Continue")}</button></form></section></div></main>;
  const slots = date ? showTroubleshoot
    ? troubleshootSlots(page,date,duration,bookings,new Date(),rescheduleId,answers.email||'')
    : displayedSlots(page,date,duration,bookings,new Date(),rescheduleId).map(s=>({...s,spotsLeft:remainingSpots(page,s.start,duration,bookings,rescheduleId),detail:''}))
    : [];
  const firstOffset = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: Math.ceil((firstOffset + total) / 7) * 7 }, (_, i) => i - firstOffset + 1);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const confirm = () => {
        const currentPage = readPages().find(p => p.id === page.id);
        const current = readAppointments();
        const selected = currentPage && availableSlots(currentPage, date, duration, current, new Date(), rescheduleId, answers.email || '').find(s => s.start === slot);
        if (!selected || !currentPage || !currentPage.durationOptions.includes(duration) || !currentPage.locationOptions.includes(location)) throw new Error('This time or meeting option is no longer available. Choose another time.');
        const missing = currentPage.questions.find(q => q.active !== false && q.type !== 'text-block' && q.required && !answers[q.id]?.trim());
        if (missing) throw new Error('Please answer: ' + missing.label);
        if (currentPage.formSettings.guestsActive && currentPage.formSettings.guestsRequired && !guests.length) throw new Error('Add at least one guest.');
        const meetingLocation = currentPage.locations.find(l => l.label === location);
        const booking: Appointment = {
          id: rescheduleId || uid(), calendarId: page.id, serviceName: currentPage.name,
          name: (answers.name || '').trim(), email: (answers.email || '').trim().toLowerCase(), whatsapp: answers.whatsapp || (meetingLocation?.type === 'phone' ? inviteeLocation : ''),
          date, time: selected.time, start: selected.start, duration, timezone: displayTimezone, location: meetingLocation?.type === 'ask-invitee' ? inviteeLocation : meetingLocation?.address ? location + ' · ' + meetingLocation.address : location,
          status: currentPage.requireApproval || !currentPage.free ? 'Pending' : 'Confirmed', source, fromAd, customAnswers: answers, guests: currentPage.formSettings.guestsActive ? guests : [],
          ...(!currentPage.free ? { payment: { amount: currentPage.priceType === 'hourly' ? currentPage.price * duration / 60 : currentPage.priceType === 'per_attendee' ? currentPage.price * ((currentPage.formSettings.guestsActive ? guests.length : 0) + 1) : currentPage.price, currency: currentPage.currency, status: 'Pending' as const } } : {}),
        };

        // The appointment is the authoritative record: publish it before optional auxiliary writes.
        persistAppointment(booking);
        setParams({ bookingId: booking.id }); setRescheduleId(undefined);
        try {
          const contacts = readContacts();
          const existing = contacts.find(c => booking.email ? c.email.toLowerCase() === booking.email : booking.whatsapp && c.phone === booking.whatsapp);
          write(KEYS.contacts, existing ? contacts.map(c => c.id === existing.id ? { ...c, name: booking.name, phone: booking.whatsapp || c.phone } : c) : [...contacts, { id: uid(), name: booking.name, email: booking.email, phone: booking.whatsapp, company: '' }]);
          if (currentPage.afterBooking.prefill) localStorage.setItem('gos.booking.prefill.' + currentPage.id, JSON.stringify(answers));
        } catch {
          // Contact enrichment or prefill must not report failure after a booking was saved.
        }
        const redirect = currentPage.templateSettings.redirectUrl || currentPage.afterBooking.redirectUrl;
        if (currentPage.templateSettings.postBookingMode === 'custom_url' && safeHttpUrl(redirect)) window.location.assign(redirect);
      };
      if (navigator.locks) await navigator.locks.request('gos-booking-appointments', confirm); else confirm();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save your booking. Please try again.'); }
    finally { setSaving(false); }
  };
  const cancel = () => {
    try { write(KEYS.appointments, readAppointments().map(b => b.id === success?.id ? { ...b, status: 'Canceled' as const } : b)); }
    catch { setError('Could not cancel your appointment. Please try again.'); }
  };
  return <main className="bk-public h-screen overflow-hidden flex flex-col" style={{'--booking-color':bookingColor(page.color)} as React.CSSProperties} dir={page.language === 'ar' ? 'rtl' : 'ltr'}><header className="bk-public-brand"><CalendarDays size={21}/><b>{translateText("GOS")}</b><span>{translateText("Booking")}</span></header><div className="bk-public-scroll custom-scrollbar"><div className="bk-public-shell">
    {localizeNode(success ? <section className="bk-public-success"><span className={`bk-success-orb ${success.status === 'Canceled' ? 'canceled' : ''}`}><Check size={30}/></span><h1>{localizeNode(success.status === 'Canceled' ? 'Booking canceled' : success.payment?.status === 'Pending' ? 'Payment pending' : success.status === 'Pending' ? 'Booking request received' : 'You’re booked!')}</h1><p>{localizeNode(success.status === 'Canceled' ? 'This time has been released for other appointments.' : success.payment?.status === 'Pending' ? 'Your request is recorded. Contact the host to arrange payment.' : success.status === 'Pending' ? 'Your host will review your request before confirming.' : page.afterBooking.confirmationBody)}</p><div className="bk-success-summary"><Avatar name={success.name}/><div><b>{localizeNode(success.name)}</b><small>{success.email}</small></div></div><dl><div><dt>{translateText("Meeting")}</dt><dd>{localizeNode(success.serviceName)}</dd></div><div><dt>{translateText("Date & time")}</dt><dd>{localizeNode(new Date(success.start).toLocaleDateString('en-US', { timeZone: success.timezone, weekday: 'long', month: 'long', day: 'numeric' }))} · {localizeNode(formatTime(success.start, success.timezone))}</dd></div><div><dt>{translateText("Duration")}</dt><dd>{localizeNode(success.duration)}{translateText(" minutes")}</dd></div><div><dt>{translateText("Location")}</dt><dd>{localizeNode(success.location)}</dd></div><div><dt>{translateText("Timezone")}</dt><dd>{localizeNode(success.timezone)}</dd></div>{localizeNode(success.payment && <div><dt>{translateText("Payment")}</dt><dd>{localizeNode(success.payment.amount)} {localizeNode(success.payment.currency)}{translateText(" · Pending")}</dd></div>)}<div><dt>{translateText("Booking ID")}</dt><dd>{localizeNode(success.id)}</dd></div></dl>{localizeNode(error && <p className="bk-error" role="alert">{localizeNode(error)}</p>)}<div className="bk-public-success-actions">{page.afterBooking.allowCancelReschedule && success.status !== 'Canceled' && <><button className="bk-button" onClick={() => { setAnswers({ ...success.customAnswers, name: success.name, email: success.email, whatsapp: success.whatsapp }); setGuests(success.guests); setDuration(success.duration); setLocation(page.locationOptions.includes(success.location) ? success.location : page.locationOptions[0]); setRescheduleId(success.id); setParams({}); setSlot(''); setDate(''); setStep('select-slot'); }}>{translateText("Reschedule")}</button><button className="bk-button danger" onClick={cancel}>{translateText("Cancel appointment")}</button></>}<Link className="bk-button primary" to={"/book/" + encodeURIComponent(page.slug)} onClick={reset}>{translateText("Book another appointment")}</Link><Link className="bk-button" to="/dashboard/booking?tab=bookings">{translateText("Go to Dashboard")}</Link></div></section> : !page.active ? <Empty title={translateText("This booking page is turned off")} detail="Please contact the host to arrange an appointment."/> : <div className="bk-public-grid"><aside className="bk-public-details"><TroubleshootControls page={page} bookings={bookings} checked={showTroubleshoot} change={setShowTroubleshoot}/>{localizeNode(page.image ? <div className="bk-public-media">{localizeNode(page.mediaType === 'video' ? <video src={page.image} controls playsInline style={{borderRadius:page.imageRound?'50%':12}}/> : <img src={page.image} alt={translateText(page.titleOverride || page.name)} style={{borderRadius:page.imageRound?'50%':12}}/>)}</div> : <Avatar name={page.hostName}/>)}<span className="bk-muted">{localizeNode(page.hostName)}</span><h1>{localizeNode(page.titleOverride || page.name)}</h1><div className="bk-public-meta"><span><Clock3 size={16}/>{localizeNode(duration)}{translateText(" minutes")}</span><span><Video size={16}/>{localizeNode(location)}</span></div><p>{localizeNode(page.description)}</p><label>{translateText("Meeting duration")}<BookingSelect value={duration} onChange={e => { setDuration(Number(e.target.value)); setSlot(''); }}>{localizeNode(page.durationOptions.map(n => <option key={n} value={n}>{localizeNode(n)}{translateText(" minutes")}</option>))}</BookingSelect></label><label>{translateText("Meeting location")}<BookingSelect value={location} onChange={e => setLocation(e.target.value)}>{localizeNode(page.locationOptions.map(l => <option key={l} value={l}>{localizeNode(l)}</option>))}</BookingSelect></label>{localizeNode(page.showTimezone && <label><span><Globe2 size={13}/>{translateText(" Your timezone")}</span><BookingSelect value={displayTimezone} disabled={page.timezoneDisplay === 'locked'} onChange={e => setTimezone(e.target.value)}>{localizeNode([...new Set([displayTimezone, ...TIMEZONES])].map(t => <option key={t} value={t}>{localizeNode(t)}</option>))}</BookingSelect></label>)}<div className="bk-tip">{translateText("Dates follow the host’s calendar in ")}{localizeNode(page.hostTimezone)}{translateText(". Times are shown in your chosen timezone.")}</div></aside>
      <section className="bk-public-wizard"><nav className="bk-wizard-steps" aria-label={translateText("Booking steps")}><span className={step === 'select-slot' ? 'active' : ''}><i>1</i>{translateText("Date & time")}</span><span className={step === 'confirm-form' ? 'active' : ''}><i>2</i>{translateText("Your details")}</span><span><i>3</i>{translateText("Confirmation")}</span></nav>{localizeNode(error && <p className="bk-error" role="alert">{localizeNode(error)}</p>)}
      {localizeNode(step === 'select-slot' ? <><h2>{translateText("Select a date & time")}</h2><div className="bk-slot-layout"><div><div className="bk-month-nav"><button className="bk-icon" aria-label={translateText("Previous month")} onClick={() => changeMonth(-1)}><ChevronLeft size={17}/></button><b>{localizeNode(month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))}</b><button className="bk-icon" aria-label={translateText("Next month")} onClick={() => changeMonth(1)}><ChevronRight size={17}/></button></div><div className="bk-date-grid">{localizeNode(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <small key={d}>{localizeNode(d)}</small>))}{localizeNode(days.map((d, i) => { const key = dateKey(new Date(month.getFullYear(), month.getMonth(), d)); const available = d > 0 && d <= total && (showTroubleshoot || availableSlots(page, key, duration, bookings, new Date(), rescheduleId).length > 0); return <button key={i} aria-label={translateText(formatDay(key))} aria-pressed={date === key} disabled={!available} className={date === key ? 'selected' : ''} onClick={() => { setDate(key); setSlot(''); setError(''); }}>{localizeNode(d > 0 && d <= total ? d : '')}</button>; }))}</div></div><div className="bk-slot-list"><b>{localizeNode(date ? formatDay(date) : 'Available times')}</b>{localizeNode(date ? slots.length ? <TroubleshootTimeSlots slots={slots} checked={showTroubleshoot} selected={slot} select={setSlot} timezone={displayTimezone} date={date} showSpots={page.displaySpotsLeft && page.groupCapacity > 1}/> : <Empty title={translateText("No available times")} detail="Try another day."/> : <p className="bk-muted">{translateText("Choose a highlighted date to see available times.")}</p>)}</div></div><button className="bk-button primary bk-next" disabled={!slot || !slots.some(s=>s.start===slot && !s.busy)} onClick={() => setStep('confirm-form')}>{translateText("Continue ")}<ArrowRight size={15}/></button></> : <form className="bk-form" onSubmit={submit}><button type="button" className="bk-back" onClick={() => setStep('select-slot')}><ArrowLeft size={14}/>{translateText("Change date or time")}</button><h2>{translateText("Your details")}</h2><p className="bk-selected-slot"><CalendarDays size={15}/>{localizeNode(slot && new Date(slot).toLocaleDateString('en-US', { timeZone: displayTimezone, month: 'long', day: 'numeric' }))} · {localizeNode(slot && formatTime(slot, displayTimezone))} · {localizeNode(duration)}{translateText(" min")}</p>
        {localizeNode(!page.free && <div className="bk-tip">{translateText("Price: ")}{localizeNode(page.priceType === 'hourly' ? (page.price * duration / 60).toFixed(2) : page.priceType === 'per_attendee' ? (page.price * ((page.formSettings.guestsActive ? guests.length : 0) + 1)).toFixed(2) : page.price.toFixed(2))} {localizeNode(page.currency)}{localizeNode(page.priceType === 'per_attendee' ? ' · Includes your guests' : '')}{translateText(". Payment will be arranged with the host.")}</div>)}
        <InviteeFields page={page} answers={answers} setAnswers={setAnswers} guests={guests} setGuests={setGuests}/>
        {localizeNode(['ask-invitee', 'phone'].includes(page.locations.find(l => l.label === location)?.type || '') && <label>{localizeNode(page.locations.find(l => l.label === location)?.type === 'phone' ? 'Phone number for this call' : 'Your meeting address')}<input required value={inviteeLocation} onChange={e => setInviteeLocation(e.target.value)}/></label>)}
        <details className="bk-extra-details"><summary>{translateText("Additional details")}</summary><div className="bk-form"><label>{translateText("How did you hear about us?")}<input value={source} onChange={e=>setSource(e.target.value)}/></label><fieldset><legend>{translateText("Did you find us through an advertisement?")}</legend><div className="bk-radio-options">{localizeNode([true,false].map(v=><label key={String(v)}><input type="radio" name="from-ad" checked={fromAd===v} onChange={()=>setFromAd(v)}/>{localizeNode(v?'Yes':'No')}</label>))}</div></fieldset></div></details><button className="bk-button primary bk-next" disabled={saving}>{localizeNode(saving ? 'Saving…' : page.requireApproval || !page.free ? 'Request booking' : rescheduleId ? 'Confirm new time' : 'Confirm booking')}<Check size={15}/></button></form>)}
      </section></div>)}
    <BookingBrandingFooter hostName={page.hostName} visible={page.displayBranding}/></div></div></main>;
}



