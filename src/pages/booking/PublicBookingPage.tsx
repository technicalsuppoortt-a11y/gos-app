import { BookingConfirmationView } from './BookingConfirmationView';
import { BookingPageView } from './BookingPageView';
import { BookingDirectionContext } from './BookingSelect';
import { BookingScreeningExit, bookingLocale, screeningText } from './BookingScreeningView';
import {
  evaluateQualification,
  extractCalendarQualificationRules,
  publicScreeningQuestions,
  validQualificationQuestions,
  type PublicQualificationResult,
  type ScreeningQuestion,
} from '../../../functions/booking-qualification.js';
import { Tracking } from '../../backend/marketingTracking';
import { useUILanguage, translateText } from '../../i18n/display';
import { BookingBrandingFooter } from './BookingBrandingFooter';
import { callBackend } from '../../backend/firebase';
import type { BookingPage, Appointment } from './model';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, CalendarX2, Lock, RefreshCw } from 'lucide-react';
import { Empty } from './ui';
import { safeHttpUrl } from './booking-section-schema';
import { readVisitorAnswers, readVisitorPhone, saveVisitorAnswers } from './visitorPrefill';
import { recordPendingScreeningLead } from './pendingLeadSync';
import {
  BookingTemplateShell,
  resolveBookingDesign,
  useBookingWebsiteAndTemplateCatalog,
} from './BookingTemplateShell';
import {
  normalizeBookingPage,
  availableSlots,
  firstAvailableDate,
  parseDate,
  displayedSlots,
  troubleshootSlots,
  remainingSpots,
  bookingColor,
  dateKey,
  readPages as readWorkspaceBookingPages,
  uid,
} from './model';
import './booking-workspace.css';

type PublicAvailability = { page: BookingPage; bookings: Appointment[]; screeningQuestions?: ScreeningQuestion[] };
type BookingSubmission =
  | { booking: Appointment }
  | { qualification: Exclude<PublicQualificationResult, { status: 'qualified' }> };

export function PublicBookingSkeleton() {
  const locale = bookingLocale(useUILanguage());
  return (
    <main
      {...locale}
      className="bk-public h-screen overflow-hidden flex flex-col"
      style={{ '--booking-color': '#2563EB' } as React.CSSProperties}
    >
      <header className="bk-public-brand">
        <CalendarDays size={21} className="bk-brand-pulse" />
        <b>Upclick</b>
        <span>{translateText('Booking')}</span>
        <div className="bk-loading-indicator" role="status" aria-live="polite">
          <i aria-hidden="true" />
          <span>{translateText('Loading booking availability…')}</span>
        </div>
      </header>
      <div className="bk-public-scroll custom-scrollbar">
        <div className="bk-public-shell bk-skeleton-shell">
          <div className="bk-public-grid bk-koalendar-grid bk-skeleton-grid">
            <aside className="bk-public-details bk-skeleton-details">
              <div className="bk-skeleton bk-skeleton-avatar" style={{ margin: '8px auto 0', width: 68, height: 68 }} />
              <div className="bk-skeleton bk-skeleton-line" style={{ width: '44%', margin: '0 auto' }} />
              <div className="bk-skeleton bk-skeleton-title" style={{ margin: '0 auto' }} />
              <div className="bk-skeleton-calendar" style={{ width: '100%', marginTop: 12 }}>
                <div className="bk-skeleton-month-bar">
                  <div className="bk-skeleton" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                  <div className="bk-skeleton" style={{ width: 130, height: 18 }} />
                  <div className="bk-skeleton" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                </div>
                <div className="bk-date-grid">
                  {Array.from({ length: 7 }, (_, i) => (
                    <div key={`head-${i}`} className="bk-skeleton" style={{ height: 12, margin: '2px 0' }} />
                  ))}
                  {Array.from({ length: 35 }, (_, i) => (
                    <div key={`day-${i}`} className="bk-skeleton" style={{ height: 34, borderRadius: '50%' }} />
                  ))}
                </div>
              </div>
            </aside>
            <section className="bk-public-wizard bk-skeleton-wizard">
              <div className="bk-wizard-steps">
                <div className="bk-skeleton bk-skeleton-step" />
                <div className="bk-skeleton bk-skeleton-step" />
                <div className="bk-skeleton bk-skeleton-step" />
              </div>
              <div className="bk-skeleton bk-skeleton-line" style={{ width: '88%', marginTop: 18 }} />
              <div className="bk-skeleton bk-skeleton-line" style={{ width: '70%' }} />
              <div className="bk-skeleton" style={{ width: 140, height: 16, margin: '18px 0 10px' }} />
              <div className="bk-slot-list">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={`slot-${i}`} className="bk-skeleton" style={{ height: 42, borderRadius: 8 }} />
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function PublicBookingPage() {
  const uiLanguage = useUILanguage();
  const { slug } = useParams();
  const [data, setData] = useState<PublicAvailability>();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const locale = bookingLocale(uiLanguage, data?.page.language);

  useEffect(() => {
    let active = true;
    setData(undefined);
    const bookingId = new URLSearchParams(window.location.search).get('bookingId');
    const token = bookingId ? sessionStorage.getItem('gos.booking.token.' + bookingId) : null;
    callBackend<PublicAvailability>('publicBooking', { slug, password, bookingId, token })
      .then(result => {
        if (active) {
          setData({ ...result, page: normalizeBookingPage(result.page) });
          setError('');
        }
      })
      .catch(e => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [slug, retry]);

  if (!data) {
    if (!error) return <PublicBookingSkeleton />;

    const isPasswordRequired =
      error.toLowerCase().includes('password') || error.includes('Enter the page password');
    if (isPasswordRequired) {
      return (
        <main
          {...locale}
          className="bk-public h-screen overflow-hidden flex flex-col"
          style={{ '--booking-color': '#2563EB' } as React.CSSProperties}
        >
          <header className="bk-public-brand">
            <CalendarDays size={21} />
            <b>Upclick</b>
            <span>{translateText('Booking')}</span>
          </header>
          <div className="bk-public-scroll custom-scrollbar">
            <div className="bk-public-shell">
              <div className="bk-state-card">
                <div className="bk-state-orb">
                  <Lock size={26} />
                </div>
                <h2>{translateText('Password Protected')}</h2>
                <p>
                  {translateText(
                    'This booking calendar requires a password to view available times and confirm an appointment.'
                  )}
                </p>
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    setError('');
                    setRetry(v => v + 1);
                  }}
                  className="bk-state-form"
                >
                  <label className="bk-state-input-wrap">
                    <span className="sr-only">{translateText('Password')}</span>
                    <input
                      type="password"
                      autoFocus
                      required
                      placeholder={translateText('Enter calendar password…')}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="bk-state-input"
                    />
                  </label>
                  {error && error !== 'Enter the page password.' && (
                    <p className="bk-error" role="alert">
                      {error}
                    </p>
                  )}
                  <button type="submit" className="bk-button primary bk-state-btn">
                    {translateText('Unlock Calendar')}
                    <ArrowRight size={15} />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </main>
      );
    }

    return (
      <main
        {...locale}
        className="bk-public h-screen overflow-hidden flex flex-col"
        style={{ '--booking-color': '#2563EB' } as React.CSSProperties}
      >
        <header className="bk-public-brand">
          <CalendarDays size={21} />
          <b>Upclick</b>
          <span>{translateText('Booking')}</span>
        </header>
        <div className="bk-public-scroll custom-scrollbar">
          <div className="bk-public-shell">
            <div className="bk-state-card">
              <div className="bk-state-orb danger">
                <CalendarX2 size={26} />
              </div>
              <h2>{translateText('Booking Page Unavailable')}</h2>
              <p>
                {error === 'Booking page not found.'
                  ? translateText('We couldn’t find an active calendar matching ') +
                    `"${slug}". ` +
                    translateText('It may have been renamed, turned off, or removed.')
                  : error}
              </p>
              <div className="bk-state-actions">
                <button
                  type="button"
                  className="bk-button primary"
                  onClick={() => {
                    setError('');
                    setRetry(v => v + 1);
                  }}
                >
                  <RefreshCw size={14} />
                  {translateText('Try again')}
                </button>
                <Link className="bk-button" to="/dashboard/booking">
                  {translateText('Go to Booking Hub')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <BookingDirectionContext.Provider value={locale.dir}>
      <PublicBookingFlow key={slug} initial={data} password={password} locale={locale} />
    </BookingDirectionContext.Provider>
  );
}

function PublicBookingFlow({
  initial,
  password,
  locale,
}: {
  initial: PublicAvailability;
  password: string;
  locale: ReturnType<typeof bookingLocale>;
}) {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const { allDesigns } = useBookingWebsiteAndTemplateCatalog();
  const localPageOverride = useMemo(() => {
    try {
      return readWorkspaceBookingPages().find(
        p => p.id === initial.page.id || p.slug === initial.page.slug || p.slug === slug
      );
    } catch {
      return undefined;
    }
  }, [initial.page.id, initial.page.slug, slug]);
  const mergedInitialPage = useMemo(
    () =>
      normalizeBookingPage({
        ...initial.page,
        ...(localPageOverride
          ? {
              questions: localPageOverride.questions,
              qualificationQuestions: localPageOverride.qualificationQuestions,
              templateSettings: localPageOverride.templateSettings,
              crmRouting: localPageOverride.crmRouting,
            }
          : {}),
      }),
    [initial.page, localPageOverride]
  );
  const pages = [{ ...mergedInitialPage, language: locale.lang }];
  const [bookings, setBookings] = useState(initial.bookings);
  const readPages = () => pages;
  const readAppointments = () => bookings;
  const managementToken = (id: string) => {
    const key = 'gos.booking.token.' + id;
    let token = sessionStorage.getItem(key);
    if (!token) {
      token = crypto.randomUUID();
      sessionStorage.setItem(key, token);
    }
    return token;
  };
  const page = pages.find(p => p.slug === slug) || pages[0];
  const localRules = useMemo(() => {
    if (!page) return [];
    const raw = extractCalendarQualificationRules(page as unknown as Record<string, unknown>);
    return validQualificationQuestions(raw) ? raw : [];
  }, [page]);
  const [date, setDate] = useState(() => (page ? firstAvailableDate(page, bookings) : ''));
  const [month, setMonth] = useState(() => {
    const initialDate = date || (page ? dateKey(new Date(), page.hostTimezone) : dateKey(new Date()));
    const d = parseDate(initialDate);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [slot, setSlot] = useState('');
  const [step, setStep] = useState<'select-slot' | 'confirm-form'>('select-slot');
  const [duration, setDuration] = useState(page?.duration || 30);
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [location, setLocation] = useState(page?.locationOptions[0] || 'Google Meet');
  const returningVisitor = () => readVisitorAnswers(page?.id, page?.afterBooking.prefill === true);
  const [answers, setAnswers] = useState<Record<string, string>>(returningVisitor);
  const [guests, setGuests] = useState<{ name: string; email: string }[]>([]);
  const [source, setSource] = useState('');
  const [fromAd, setFromAd] = useState<boolean | null>(null);
  const [inviteeLocation, setInviteeLocation] = useState(() =>
    page?.locations.find(item => item.label === location)?.type === 'phone'
      ? readVisitorPhone(page.id, page.afterBooking.prefill)
      : ''
  );
  const [rescheduleId, setRescheduleId] = useState<string>();
  const bookingAttempt = useRef<string | null>(null);
  const [screeningQuestions, setScreeningQuestions] = useState<ScreeningQuestion[]>(() =>
    initial.screeningQuestions?.length
      ? initial.screeningQuestions
      : publicScreeningQuestions(localRules)
  );
  const [disqualified, setDisqualified] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const displayTimezone = page?.timezoneDisplay === 'locked' ? page.hostTimezone : timezone;
  const success = bookings.find(
    b => b.id === params.get('bookingId') && b.calendarId === page?.id && !!b.email
  );
  const changeMonth = (by: number) => {
    setMonth(d => new Date(d.getFullYear(), d.getMonth() + by, 1));
    setDate('');
    setSlot('');
  };
  const reset = () => {
    setStep('select-slot');
    setSlot('');
    const nextDate = page ? firstAvailableDate(page, bookings) : '';
    setDate(nextDate);
    setError('');
    setRescheduleId(undefined);
    bookingAttempt.current = null;
    setDisqualified(false);
    const d = parseDate(nextDate || (page ? dateKey(new Date(), page.hostTimezone) : dateKey(new Date())));
    setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    setDuration(page?.duration || 30);
    setLocation(page?.locationOptions[0] || 'None');
    const savedAnswers = returningVisitor();
    setGuests([]);
    setSource('');
    setFromAd(null);
    setInviteeLocation(
      page?.locations.find(item => item.label === page.locationOptions[0])?.type === 'phone'
        ? readVisitorPhone(page.id, page.afterBooking.prefill)
        : ''
    );
    setAnswers(savedAnswers);
  };

  if (!page) {
    return (
      <main
        {...locale}
        className="bk-public h-screen overflow-hidden flex flex-col"
        style={{ '--booking-color': '#2563EB' } as React.CSSProperties}
      >
        <header className="bk-public-brand">
          <CalendarDays size={21} />
          <b>{translateText('Upclick')}</b>
          <span>{translateText('Booking')}</span>
        </header>
        <div className="bk-public-scroll custom-scrollbar">
          <div className="bk-public-shell">
            <div className="bk-state-card">
              <div className="bk-state-orb danger">
                <CalendarX2 size={26} />
              </div>
              <h2>{translateText('Booking page not found')}</h2>
              <p>{translateText('Check the booking URL or ask the host for a new link.')}</p>
              <div className="bk-state-actions">
                <Link className="bk-button primary" to="/">
                  {translateText('Return home')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const slots = date
    ? showTroubleshoot
      ? troubleshootSlots(page, date, duration, bookings, new Date(), rescheduleId, answers.email || '')
      : displayedSlots(page, date, duration, bookings, new Date(), rescheduleId).map(s => ({
          ...s,
          spotsLeft: remainingSpots(page, s.start, duration, bookings, rescheduleId),
          detail: '',
        }))
    : [];
  const firstOffset = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const days = Array.from(
    { length: Math.ceil((firstOffset + total) / 7) * 7 },
    (_, i) => i - firstOffset + 1
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const confirm = async () => {
        const currentPage = readPages().find(p => p.id === page.id);
        const current = readAppointments();
        const selected =
          currentPage &&
          availableSlots(
            currentPage,
            date,
            duration,
            current,
            new Date(),
            rescheduleId,
            answers.email || ''
          ).find(s => s.start === slot);
        if (
          !selected ||
          !currentPage ||
          !currentPage.durationOptions.includes(duration) ||
          !currentPage.locationOptions.includes(location)
        ) {
          throw new Error('This time or meeting option is no longer available. Choose another time.');
        }

        const missing = currentPage.questions.find(
          q => q.active !== false && q.type !== 'text-block' && q.required && !answers[q.id]?.trim()
        );
        if (missing) throw new Error('Please answer: ' + missing.label);

        if (!rescheduleId) {
          const existingQuestionIds = new Set(
            currentPage.questions.filter(q => q.active !== false).map(q => q.id)
          );
          const missingScreening = screeningQuestions.find(
            sq => !existingQuestionIds.has(sq.id) && !answers[sq.id]?.trim()
          );
          if (missingScreening) throw new Error('Please answer: ' + missingScreening.label);
        }

        if (currentPage.formSettings.guestsActive && currentPage.formSettings.guestsRequired && !guests.length) {
          throw new Error('Add at least one guest.');
        }

        const screeningIds = new Set<string>([
          ...screeningQuestions.map(q => q.id),
          ...currentPage.questions
            .filter(q => q.active !== false && q.isScreening)
            .map(q => q.id),
        ]);
        const submittedScreening = Object.fromEntries(
          [...screeningIds].map(id => [id, answers[id] ?? ''])
        );

        const meetingLocation = currentPage.locations.find(l => l.label === location);
        const resolvedInviteeName = (
          answers.name ||
          [answers.firstName, answers.lastName].filter(Boolean).join(' ')
        ).trim();
        const booking: Appointment = {
          id: rescheduleId || (bookingAttempt.current ??= uid()),
          calendarId: page.id,
          serviceName: currentPage.name,
          name: resolvedInviteeName,
          email: (answers.email || '').trim().toLowerCase(),
          whatsapp:
            answers.whatsapp || (meetingLocation?.type === 'phone' ? inviteeLocation : ''),
          date,
          time: selected.time,
          start: selected.start,
          duration,
          timezone: displayTimezone,
          location:
            meetingLocation?.type === 'ask-invitee'
              ? inviteeLocation
              : meetingLocation?.address
                ? location + ' · ' + meetingLocation.address
                : location,
          status: currentPage.requireApproval || !currentPage.free ? 'Pending' : 'Confirmed',
          source,
          fromAd,
          customAnswers: answers,
          guests: currentPage.formSettings.guestsActive ? guests : [],
          ...(!currentPage.free
            ? {
                payment: {
                  amount:
                    currentPage.priceType === 'hourly'
                      ? (currentPage.price * duration) / 60
                      : currentPage.priceType === 'per_attendee'
                        ? currentPage.price *
                          ((currentPage.formSettings.guestsActive ? guests.length : 0) + 1)
                        : currentPage.price,
                  currency: currentPage.currency,
                  status: 'Pending' as const,
                },
              }
            : {}),
        };

        if (!rescheduleId && localRules.length > 0) {
          const localEval = evaluateQualification(localRules, submittedScreening);
          if (localEval.status === 'incomplete') {
            setScreeningQuestions(publicScreeningQuestions(localRules));
            setError(
              screeningText(
                page.language,
                'Please check your answers and complete every screening question.'
              )
            );
            return;
          }
          if (localEval.status === 'ineligible') {
            await recordPendingScreeningLead({
              page: currentPage,
              booking,
              answers,
              screeningQuestions,
            });
            setDisqualified(true);
            return;
          }
        }

        const result = await callBackend<BookingSubmission>('publicBooking', {
          slug,
          password,
          operation: rescheduleId ? 'reschedule' : 'create',
          booking,
          token: managementToken(booking.id),
          screeningAnswers: submittedScreening,
        });

        if ('qualification' in result) {
          if (result.qualification.status === 'ineligible') {
            await recordPendingScreeningLead({
              page: currentPage,
              booking,
              answers,
              screeningQuestions,
            });
            setDisqualified(true);
            return;
          }
          setScreeningQuestions(result.qualification.screeningQuestions);
          setError(
            screeningText(
              page.language,
              'Please check your answers and complete every screening question.'
            )
          );
          return;
        }

        Tracking.bookMeeting({ calendarId: page.id, status: result.booking.status });
        setBookings(current => [...current.filter(b => b.id !== booking.id), result.booking]);
        setParams({ bookingId: booking.id });
        setRescheduleId(undefined);
        try {
          const prefillAnswers = Object.fromEntries(
            Object.entries(answers).filter(([id]) => !screeningIds.has(id))
          );
          saveVisitorAnswers(
            currentPage.id,
            currentPage.afterBooking.prefill,
            prefillAnswers,
            meetingLocation?.type === 'phone' ? inviteeLocation : undefined
          );
        } catch {
          // Contact enrichment or prefill must not report failure after a booking was saved.
        }
        const redirect =
          currentPage.templateSettings.redirectUrl || currentPage.afterBooking.redirectUrl;
        if (currentPage.templateSettings.postBookingMode === 'custom_url' && safeHttpUrl(redirect)) {
          window.location.assign(redirect);
        }
      };

      if (navigator.locks) await navigator.locks.request('gos-booking-appointments', confirm);
      else await confirm();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your booking. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const cancel = async () => {
    if (!success) return;
    try {
      const result = await callBackend<{ booking: Appointment }>('publicBooking', {
        slug,
        password,
        operation: 'cancel',
        booking: success,
        token: managementToken(success.id),
      });
      setBookings(current => current.map(b => (b.id === success.id ? result.booking : b)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not cancel your appointment.');
    }
  };

  const activeDesign = resolveBookingDesign(page, allDesigns);
  const effectiveBrandColor = activeDesign?.color || bookingColor(page.color);

  const shellContent = (
    <div className="bk-public-shell">
      {success ? (
        <BookingConfirmationView success={success} page={page} error={error}>
          {page.afterBooking.allowCancelReschedule && success.status !== 'Canceled' && (
            <>
              <button
                className="bk-button"
                onClick={() => {
                  setAnswers({
                    ...success.customAnswers,
                    name: success.name,
                    email: success.email,
                    whatsapp: success.whatsapp,
                  });
                  setGuests(success.guests);
                  setDuration(success.duration);
                  setLocation(
                    page.locationOptions.includes(success.location)
                      ? success.location
                      : page.locationOptions[0]
                  );
                  setRescheduleId(success.id);
                  setParams({});
                  setSlot('');
                  setDate('');
                  setStep('select-slot');
                }}
              >
                {translateText('Reschedule')}
              </button>
              <button className="bk-button danger" onClick={cancel}>
                {translateText('Cancel appointment')}
              </button>
            </>
          )}
          {page.afterBooking.scheduleAnother && (
            <Link
              className="bk-button primary"
              to={'/book/' + encodeURIComponent(page.slug)}
              onClick={reset}
            >
              {translateText('Book another appointment')}
            </Link>
          )}
          <Link className="bk-button" to="/dashboard/booking?tab=bookings">
            {translateText('Go to Dashboard')}
          </Link>
        </BookingConfirmationView>
      ) : !page.active ? (
        <Empty
          title={translateText('This booking page is turned off')}
          detail="Please contact the host to arrange an appointment."
        />
      ) : !rescheduleId && disqualified ? (
        <BookingScreeningExit language={page.language} />
      ) : (
        <BookingPageView
          page={page}
          bookings={bookings}
          showTroubleshoot={showTroubleshoot}
          setShowTroubleshoot={setShowTroubleshoot}
          duration={duration}
          setDuration={setDuration}
          setSlot={setSlot}
          location={location}
          setLocation={setLocation}
          displayTimezone={displayTimezone}
          setTimezone={setTimezone}
          step={step}
          error={error}
          month={month}
          changeMonth={changeMonth}
          days={days}
          total={total}
          date={date}
          rescheduleId={rescheduleId}
          setDate={setDate}
          setError={setError}
          slots={slots}
          slot={slot}
          setStep={setStep}
          submit={submit}
          answers={answers}
          setAnswers={setAnswers}
          guests={guests}
          setGuests={setGuests}
          inviteeLocation={inviteeLocation}
          setInviteeLocation={setInviteeLocation}
          source={source}
          setSource={setSource}
          fromAd={fromAd}
          setFromAd={setFromAd}
          saving={saving}
          screeningQuestions={!rescheduleId ? screeningQuestions : undefined}
        />
      )}
      <BookingBrandingFooter hostName={page.hostName} visible={page.displayBranding} />
    </div>
  );

  return (
    <main
      {...locale}
      className={
        'bk-public h-screen overflow-hidden flex flex-col' +
        (activeDesign ? ' is-template-framed' : '')
      }
      style={{ '--booking-color': effectiveBrandColor } as React.CSSProperties}
    >
      {!activeDesign && (
        <header className="bk-public-brand">
          <CalendarDays size={21} />
          <b>{translateText('Upclick')}</b>
          <span>{screeningText(locale.lang, 'Booking')}</span>
        </header>
      )}
      <div className="bk-public-scroll custom-scrollbar">
        {activeDesign ? (
          <BookingTemplateShell page={page} design={activeDesign}>
            {shellContent}
          </BookingTemplateShell>
        ) : (
          shellContent
        )}
      </div>
    </main>
  );
}
