import { useEffect, useState } from 'react';
import { localizeNode } from '../../i18n/display';
import { ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Globe2, MapPin, Video } from 'lucide-react';
import type { ScreeningQuestion } from '../../../functions/booking-qualification.js';
import { TroubleshootControls, TroubleshootTimeSlots } from './BookingTroubleshoot';
import { BookingSelect } from './BookingSelect';
import { screeningText } from './BookingScreeningView';
import { Avatar, Empty } from './ui';
import { InviteeFields } from './InviteeFields';
import { availableSlots, dateKey, formatDay, formatTime, TIMEZONES } from './model';
import type { Appointment, BookingPage, TroubleshootSlot } from './model';

// Shared Koalendar-style presentation. Each caller owns availability, form state and submission.
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
  changeMonth: (by: number) => void;
  days: number[];
  total: number;
  date: string;
  rescheduleId: string | undefined;
  setDate: React.Dispatch<React.SetStateAction<string>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
  slots: TroubleshootSlot[];
  slot: string;
  setStep: React.Dispatch<React.SetStateAction<'select-slot' | 'confirm-form'>>;
  submit: (event: React.FormEvent) => void;
  answers: Record<string, string>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  guests: { name: string; email: string }[];
  setGuests: React.Dispatch<React.SetStateAction<{ name: string; email: string }[]>>;
  inviteeLocation: string;
  setInviteeLocation: React.Dispatch<React.SetStateAction<string>>;
  source: string;
  setSource: React.Dispatch<React.SetStateAction<string>>;
  fromAd: boolean | null;
  setFromAd: React.Dispatch<React.SetStateAction<boolean | null>>;
  saving: boolean;
  enabledDates?: Set<string>;
  screeningQuestions?: ScreeningQuestion[];
  formatPrice?: (amount: number, currency: string) => string;
  hideTroubleshoot?: boolean;
};

function formatTimezoneNow(timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());
  } catch {
    return '';
  }
}

function formatSlotRange(startIso: string, durationMinutes: number, timezone: string): string {
  if (!startIso) return '';
  const startDate = new Date(startIso);
  if (Number.isNaN(startDate.getTime())) return '';
  const endDate = new Date(startDate.getTime() + durationMinutes * 60_000);
  const dayPart = startDate.toLocaleDateString('en-US', {
    timeZone: timezone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return `${dayPart} · ${formatTime(startIso, timezone)} - ${formatTime(endDate.toISOString(), timezone)}`;
}

export function BookingPageView({
  page,
  bookings,
  showTroubleshoot,
  setShowTroubleshoot,
  duration,
  setDuration,
  setSlot,
  location,
  setLocation,
  displayTimezone,
  setTimezone,
  step,
  error,
  month,
  changeMonth,
  days,
  total,
  date,
  rescheduleId,
  setDate,
  setError,
  slots,
  slot,
  setStep,
  submit,
  answers,
  setAnswers,
  guests,
  setGuests,
  inviteeLocation,
  setInviteeLocation,
  source,
  setSource,
  fromAd,
  setFromAd,
  saving,
  enabledDates,
  screeningQuestions,
  formatPrice,
  hideTroubleshoot = false,
}: Props) {
  const translateText = (copy: string) => screeningText(page.language, copy);
  const [mobileSlotsOpen, setMobileSlotsOpen] = useState(false);

  useEffect(() => {
    if (!date) setMobileSlotsOpen(false);
  }, [date]);

  const todayKey = dateKey(new Date(), page.hostTimezone);
  const tzNow = formatTimezoneNow(displayTimezone);
  const price =
    page.priceType === 'hourly'
      ? (page.price * duration) / 60
      : page.priceType === 'per_attendee'
        ? page.price * ((page.formSettings.guestsActive ? guests.length : 0) + 1)
        : page.price;

  const gridStateClass =
    step === 'confirm-form'
      ? 'is-confirm-step'
      : mobileSlotsOpen
        ? 'is-mobile-slots'
        : 'is-mobile-calendar';

  const handleMonthChange = (delta: number) => {
    setMobileSlotsOpen(false);
    changeMonth(delta);
  };

  const canContinue = Boolean(slot && slots.some(s => s.start === slot && !s.busy));

  return (
    <div className={`bk-public-grid bk-koalendar-grid ${gridStateClass}`}>
      <aside className="bk-public-details bk-koalendar-brand-panel">
        {!hideTroubleshoot && (
          <TroubleshootControls
            page={page}
            bookings={bookings}
            checked={showTroubleshoot}
            change={setShowTroubleshoot}
          />
        )}

        <div className="bk-brand-profile">
          {localizeNode(
            page.image ? (
              <div className={`bk-public-media ${page.imageRound !== false ? 'is-round' : ''}`}>
                {localizeNode(
                  page.mediaType === 'video' ? (
                    <video
                      src={page.image}
                      controls
                      playsInline
                      style={{ borderRadius: page.imageRound !== false ? '50%' : 14 }}
                    />
                  ) : (
                    <img
                      src={page.image}
                      alt={translateText(page.titleOverride || page.name)}
                      style={{ borderRadius: page.imageRound !== false ? '50%' : 14 }}
                    />
                  )
                )}
              </div>
            ) : (
              <Avatar name={page.hostName} />
            )
          )}
          {page.hostName && <span className="bk-brand-host">{localizeNode(page.hostName)}</span>}
          <h1>{localizeNode(page.titleOverride || page.name)}</h1>
          <div className="bk-brand-badges">
            <span>
              <Clock3 size={13} />
              {localizeNode(duration)}
              {translateText(' min')}
            </span>
            <span>
              {location.toLowerCase().includes('person') ? <MapPin size={13} /> : <Video size={13} />}
              {localizeNode(location)}
            </span>
          </div>
        </div>

        {step === 'select-slot' && (
          <div className="bk-brand-calendar">
            <div className="bk-month-nav">
              <button
                type="button"
                className="bk-icon bk-brand-nav-btn"
                aria-label={translateText('Previous month')}
                onClick={() => handleMonthChange(-1)}
              >
                <ChevronLeft size={18} />
              </button>
              <b>
                {localizeNode(
                  month.toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })
                )}
              </b>
              <button
                type="button"
                className="bk-icon bk-brand-nav-btn"
                aria-label={translateText('Next month')}
                onClick={() => handleMonthChange(1)}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="bk-date-grid">
              {localizeNode(
                ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                  <small key={d}>{localizeNode(d)}</small>
                ))
              )}
              {localizeNode(
                days.map((d, i) => {
                  const validDay = d > 0 && d <= total;
                  const key = validDay
                    ? dateKey(new Date(month.getFullYear(), month.getMonth(), d))
                    : `empty-${i}`;
                  const available =
                    validDay &&
                    (showTroubleshoot ||
                      (enabledDates
                        ? enabledDates.has(key)
                        : availableSlots(page, key, duration, bookings, new Date(), rescheduleId).length > 0));
                  const isSelected = validDay && date === key;
                  const isToday = validDay && key === todayKey;

                  return (
                    <button
                      type="button"
                      key={i}
                      aria-label={validDay ? translateText(formatDay(key)) : undefined}
                      aria-pressed={validDay ? isSelected : undefined}
                      disabled={!available}
                      className={[
                        !validDay ? 'is-empty' : '',
                        isSelected ? 'selected' : '',
                        isToday ? 'is-today' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => {
                        if (!validDay) return;
                        setDate(key);
                        setSlot('');
                        setError('');
                        setMobileSlotsOpen(true);
                      }}
                    >
                      {localizeNode(validDay ? d : '')}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </aside>

      <section className="bk-public-wizard bk-koalendar-wizard">
        <nav className="bk-wizard-steps" aria-label={translateText('Booking steps')}>
          <span className={step === 'select-slot' ? 'active' : ''} aria-current={step === 'select-slot' ? 'step' : undefined}>
            <i>1</i>
            {translateText('Date & time')}
          </span>
          <span className={step === 'confirm-form' ? 'active' : ''} aria-current={step === 'confirm-form' ? 'step' : undefined}>
            <i>2</i>
            {translateText('Your details')}
          </span>
          <span>
            <i>3</i>
            {translateText('Confirmation')}
          </span>
        </nav>

        {localizeNode(error && <p className="bk-error" role="alert">{localizeNode(error)}</p>)}

        {localizeNode(
          step === 'select-slot' ? (
            <div className="bk-slot-layout bk-koalendar-slots-panel">
              {date && (
                <div className="bk-mobile-date-banner">
                  {localizeNode(formatDay(date))}
                </div>
              )}

              {page.description && (
                <p className="bk-wizard-description">{localizeNode(page.description)}</p>
              )}

              {(page.durationOptions.length > 1 || page.locationOptions.length > 1) && (
                <div className="bk-wizard-options-row">
                  {page.durationOptions.length > 1 && (
                    <label>
                      <span>{translateText('Meeting duration')}</span>
                      <BookingSelect
                        value={duration}
                        onChange={e => {
                          setDuration(Number(e.target.value));
                          setSlot('');
                        }}
                      >
                        {localizeNode(
                          page.durationOptions.map(n => (
                            <option key={n} value={n}>
                              {localizeNode(n)}
                              {translateText(' minutes')}
                            </option>
                          ))
                        )}
                      </BookingSelect>
                    </label>
                  )}
                  {page.locationOptions.length > 1 && (
                    <label>
                      <span>{translateText('Meeting location')}</span>
                      <BookingSelect value={location} onChange={e => setLocation(e.target.value)}>
                        {localizeNode(
                          page.locationOptions.map(l => (
                            <option key={l} value={l}>
                              {localizeNode(l)}
                            </option>
                          ))
                        )}
                      </BookingSelect>
                    </label>
                  )}
                </div>
              )}

              <div className="bk-time-header">
                <div className="bk-time-header-top">
                  <b>{translateText('Time')}</b>
                  {date && <span className="bk-desktop-date-label">{localizeNode(formatDay(date))}</span>}
                </div>
                {page.showTimezone ? (
                  <div className="bk-timezone-bar">
                    <Globe2 size={13} />
                    <BookingSelect
                      value={displayTimezone}
                      disabled={page.timezoneDisplay === 'locked'}
                      onChange={e => setTimezone(e.target.value)}
                    >
                      {localizeNode(
                        [...new Set([displayTimezone, ...TIMEZONES])].map(t => (
                          <option key={t} value={t}>
                            {localizeNode(t)}
                          </option>
                        ))
                      )}
                    </BookingSelect>
                    {tzNow && <small>({localizeNode(tzNow)})</small>}
                  </div>
                ) : (
                  <small className="bk-muted">
                    {localizeNode(displayTimezone)}
                    {tzNow ? ` (${tzNow})` : ''}
                  </small>
                )}
              </div>

              <div
                className="bk-slot-list"
                onDoubleClick={e => {
                  if ((e.target as HTMLElement).closest('button:not(:disabled)') && canContinue) {
                    setStep('confirm-form');
                  }
                }}
              >
                {localizeNode(
                  date ? (
                    slots.length ? (
                      <TroubleshootTimeSlots
                        slots={slots}
                        checked={showTroubleshoot}
                        selected={slot}
                        select={setSlot}
                        timezone={displayTimezone}
                        date={date}
                        showSpots={page.displaySpotsLeft && page.groupCapacity > 1}
                      />
                    ) : (
                      <Empty title={translateText('No available times')} detail="Try another day." />
                    )
                  ) : (
                    <p className="bk-muted">
                      {translateText('Choose a highlighted date to see available times.')}
                    </p>
                  )
                )}
              </div>

              <div className="bk-slot-actions">
                <button
                  type="button"
                  className="bk-button bk-mobile-back"
                  onClick={() => setMobileSlotsOpen(false)}
                >
                  <ChevronLeft size={15} />
                  <span>{translateText('Back')}</span>
                </button>
                <button
                  type="button"
                  className="bk-button primary bk-next"
                  disabled={!canContinue}
                  onClick={() => setStep('confirm-form')}
                >
                  {translateText('Continue')}
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          ) : (
            <form className="bk-form bk-confirm-form" onSubmit={submit}>
              <div className="bk-confirm-head">
                <h2>{translateText('Your details')}</h2>
                <div className="bk-selected-slot bk-koalendar-selected-slot">
                  <div className="bk-selected-slot-primary">
                    <CalendarDays size={15} />
                    <span>
                      {localizeNode(formatSlotRange(slot, duration, displayTimezone))} ({localizeNode(displayTimezone)})
                    </span>
                  </div>
                  <div className="bk-selected-slot-meta">
                    <span>
                      <Clock3 size={14} />
                      {localizeNode(duration)}
                      {translateText(' min')}
                    </span>
                    <span>
                      <Video size={14} />
                      {localizeNode(location)}
                    </span>
                  </div>
                </div>
              </div>

              {localizeNode(
                !page.free && (
                  <div className="bk-tip">
                    {translateText('Price: ')}
                    {formatPrice ? formatPrice(price, page.currency) : `${price.toFixed(2)} ${page.currency}`}
                    {localizeNode(page.priceType === 'per_attendee' ? ' · Includes your guests' : '')}
                    {translateText('. Payment will be arranged with the host.')}
                  </div>
                )
              )}

              <InviteeFields
                page={page}
                answers={answers}
                setAnswers={setAnswers}
                guests={guests}
                setGuests={setGuests}
                screeningQuestions={screeningQuestions}
              />

              {localizeNode(
                ['ask-invitee', 'phone'].includes(page.locations.find(l => l.label === location)?.type || '') && (
                  <label>
                    {localizeNode(
                      page.locations.find(l => l.label === location)?.type === 'phone'
                        ? 'Phone number for this call'
                        : 'Your meeting address'
                    )}
                    <input
                      required
                      value={inviteeLocation}
                      onChange={e => setInviteeLocation(e.target.value)}
                    />
                  </label>
                )
              )}

              <details className="bk-extra-details">
                <summary>{translateText('Additional details')}</summary>
                <div className="bk-form">
                  <label>
                    {translateText('How did you hear about us?')}
                    <input value={source} onChange={e => setSource(e.target.value)} />
                  </label>
                  <fieldset>
                    <legend>{translateText('Did you find us through an advertisement?')}</legend>
                    <div className="bk-radio-options">
                      {localizeNode(
                        [true, false].map(v => (
                          <label key={String(v)}>
                            <input
                              type="radio"
                              name="from-ad"
                              checked={fromAd === v}
                              onChange={() => setFromAd(v)}
                            />
                            {localizeNode(v ? 'Yes' : 'No')}
                          </label>
                        ))
                      )}
                    </div>
                  </fieldset>
                </div>
              </details>

              <div className="bk-wizard-footer">
                <button
                  type="button"
                  className="bk-button bk-back-btn"
                  aria-label={translateText('Change date or time')}
                  onClick={() => setStep('select-slot')}
                >
                  <ChevronLeft size={15} />
                  <span>{translateText('Back')}</span>
                </button>
                <button type="submit" className="bk-button primary bk-confirm-btn" disabled={saving}>
                  {localizeNode(
                    saving
                      ? 'Saving…'
                      : page.requireApproval || !page.free
                        ? 'Request booking'
                        : rescheduleId
                          ? 'Confirm new time'
                          : 'Confirm booking'
                  )}
                  <Check size={15} />
                </button>
              </div>
            </form>
          )
        )}
      </section>
    </div>
  );
}
