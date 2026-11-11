import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { callBackend } from '../../backend/firebase';
import { Tracking } from '../../backend/marketingTracking';
import { useCurrency } from '../../context/CurrencyContext';
import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import type {
  PublicQualificationResult,
  ScreeningQuestion,
} from '../../../functions/booking-qualification.js';
import {
  evaluateQualification,
  extractCalendarQualificationRules,
  publicScreeningQuestions,
  validQualificationQuestions,
} from '../../../functions/booking-qualification.js';
import { BookingConfirmationView } from './BookingConfirmationView';
import { BookingPageView } from './BookingPageView';
import { BookingScreeningExit, bookingLocale, screeningText } from './BookingScreeningView';
import { BookingDirectionContext } from './BookingSelect';
import { recordPendingScreeningLead } from './pendingLeadSync';
import {
  KEYS,
  availableSlots,
  blankPage,
  bookingColor,
  dateKey,
  displayedSlots,
  firstAvailableDate,
  normalizeBookingPage,
  parseDate,
  readAppointments,
  readPages,
  remainingSpots,
  uid,
  useStored,
} from './model';
import type { Appointment, BookingPage } from './model';
import './booking-workspace.css';

type EmbeddedAvailability = {
  page: BookingPage;
  bookings: Appointment[];
  screeningQuestions?: ScreeningQuestion[];
};

type BookingSubmission =
  | { booking: Appointment }
  | { qualification: Exclude<PublicQualificationResult, { status: 'qualified' }> };

export interface LandingBookingSectionLike {
  id: string;
  content: Record<string, string>;
  styles?: {
    backgroundColor?: string;
    color?: string;
  };
}

function isDarkColorValue(color?: string): boolean {
  if (!color) return false;
  const c = color.trim().toLowerCase();
  if (
    c.includes('#090d16') ||
    c.includes('#0b0f19') ||
    c.includes('#0f172a') ||
    c.includes('#111827') ||
    c.includes('#18181b') ||
    c.includes('#1e293b')
  ) {
    return true;
  }
  const hex = c.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const r = parseInt(hex[1].slice(0, 2), 16);
    const g = parseInt(hex[1].slice(2, 4), 16);
    const b = parseInt(hex[1].slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.35;
  }
  return false;
}

function buildFallbackDemoPage(content: Record<string, string>): BookingPage {
  const demo = blankPage();
  const label = content.serviceType || content.calendar || 'Strategy Consultation';
  return normalizeBookingPage({
    ...demo,
    id: 'landing-demo-calendar',
    name: label,
    titleOverride: content.calendarTitle || label,
    description:
      content.body ||
      'Choose a convenient date and time below to book your session instantly.',
    duration: 30,
    durationOptions: [30],
    location: 'Google Meet',
    locationOptions: ['Google Meet'],
    minNotice: 0,
    bufferTime: 0,
    availability: Array.from({ length: 7 }, (_, day) => ({
      day,
      enabled: day >= 1 && day <= 6,
      start: '09:00',
      end: '17:30',
    })),
  });
}

export function LandingBookingWidget({
  item,
  device,
  onCompleted,
}: {
  item: LandingBookingSectionLike;
  device: string;
  onCompleted?: () => void;
}) {
  const uiLanguage = useUILanguage();
  const { formatCheckoutPrice } = useCurrency();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isPublicAsset, setIsPublicAsset] = useState(false);
  const [darkContext, setDarkContext] = useState(false);

  const [storedPages] = useStored(KEYS.pages, readPages);
  const [storedAppointments] = useStored(KEYS.appointments, readAppointments);

  const calendarId = item.content.calendarId || '';
  const calendarSlug = item.content.calendarSlug || '';
  const calendarLabel = item.content.calendar || '';

  const localMatchedPage = useMemo(() => {
    const match = storedPages.find(
      p =>
        (calendarId && p.id === calendarId) ||
        (calendarSlug && p.slug === calendarSlug) ||
        (calendarLabel && p.name.toLowerCase() === calendarLabel.toLowerCase())
    );
    return match ? normalizeBookingPage(match) : undefined;
  }, [storedPages, calendarId, calendarSlug, calendarLabel]);

  const effectiveSlug = calendarSlug || localMatchedPage?.slug || '';
  const [remoteData, setRemoteData] = useState<EmbeddedAvailability | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const inPublic = Boolean(el.closest('[data-public-asset="true"]'));
    setIsPublicAsset(inPublic);
    const parentSection = el.closest('.fb-canvas-section') as HTMLElement | null;
    const parentMain = el.closest('.fb-site-frame, .fb-site-window, .fn-focused-canvas') as HTMLElement | null;
    const isDark =
      Boolean(el.closest('.dark, .dark-form, [data-form-theme="dark"]')) ||
      isDarkColorValue(item.styles?.backgroundColor) ||
      isDarkColorValue(parentSection?.style.background) ||
      isDarkColorValue(parentMain?.style.background);
    setDarkContext(isDark);
  }, [item.styles?.backgroundColor]);

  useEffect(() => {
    if (!isPublicAsset || !effectiveSlug) {
      setRemoteData(null);
      return;
    }
    let active = true;
    callBackend<EmbeddedAvailability>('publicBooking', { slug: effectiveSlug })
      .then(res => {
        if (active && res?.page) {
          setRemoteData({
            ...res,
            page: normalizeBookingPage(res.page),
          });
        }
      })
      .catch(() => {
        // Fallback to local snapshot if previewing locally without cloud function
      });
    return () => {
      active = false;
    };
  }, [isPublicAsset, effectiveSlug]);

  const basePage = useMemo(() => {
    if (remoteData?.page) return remoteData.page;
    if (localMatchedPage) return localMatchedPage;
    return buildFallbackDemoPage(item.content);
  }, [remoteData, localMatchedPage, item.content]);

  const locale = bookingLocale(uiLanguage, basePage.language);
  const page = useMemo(() => ({ ...basePage, language: locale.lang }), [basePage, locale.lang]);
  const bookings = remoteData?.bookings ?? storedAppointments;

  const [date, setDate] = useState(() => firstAvailableDate(page, bookings));
  const [month, setMonth] = useState(() => {
    const initial = parseDate(date || dateKey(new Date(), page.hostTimezone));
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });

  useEffect(() => {
    const nextDate = firstAvailableDate(page, bookings);
    setDate(nextDate);
    const d = parseDate(nextDate || dateKey(new Date(), page.hostTimezone));
    setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    setDuration(page.duration || 30);
    setLocation(page.locationOptions[0] || page.location || 'Google Meet');
    setSlot('');
    setStep('select-slot');
    setConfirmedBooking(null);
    setDisqualified(false);
  }, [page.id]);

  const [slot, setSlot] = useState('');
  const [step, setStep] = useState<'select-slot' | 'confirm-form'>('select-slot');
  const [duration, setDuration] = useState(page.duration || 30);
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [location, setLocation] = useState(page.locationOptions[0] || page.location || 'Google Meet');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [guests, setGuests] = useState<{ name: string; email: string }[]>([]);
  const [inviteeLocation, setInviteeLocation] = useState('');
  const [source, setSource] = useState('');
  const [fromAd, setFromAd] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Appointment | null>(null);
  const [disqualified, setDisqualified] = useState(false);

  const rules = useMemo(() => {
    const raw = extractCalendarQualificationRules(page as unknown as Record<string, unknown>);
    return validQualificationQuestions(raw) ? raw : [];
  }, [page]);
  const screeningQuestions = useMemo(
    () => remoteData?.screeningQuestions ?? publicScreeningQuestions(rules),
    [remoteData?.screeningQuestions, rules]
  );

  const displayTimezone = page.timezoneDisplay === 'locked' ? page.hostTimezone : timezone;
  const firstOffset = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const days = Array.from(
    { length: Math.ceil((firstOffset + total) / 7) * 7 },
    (_, i) => i - firstOffset + 1
  );

  const slots = useMemo(() => {
    if (!date) return [];
    return displayedSlots(page, date, duration, bookings).map(s => ({
      ...s,
      spotsLeft: remainingSpots(page, s.start, duration, bookings),
      detail: '',
    }));
  }, [date, page, duration, bookings]);

  const changeMonth = (by: number) => {
    setMonth(d => new Date(d.getFullYear(), d.getMonth() + by, 1));
    setDate('');
    setSlot('');
  };

  const resetWidget = () => {
    const nextDate = firstAvailableDate(page, bookings);
    setDate(nextDate);
    const d = parseDate(nextDate || dateKey(new Date(), page.hostTimezone));
    setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    setSlot('');
    setStep('select-slot');
    setConfirmedBooking(null);
    setDisqualified(false);
    setError('');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const selected = availableSlots(page, date, duration, bookings).find(s => s.start === slot);
      if (!selected) {
        throw new Error('This time slot is no longer available. Please choose another time.');
      }
      const missing = page.questions.find(
        q => q.active !== false && q.type !== 'text-block' && q.required && !answers[q.id]?.trim()
      );
      if (missing) throw new Error('Please answer: ' + missing.label);

      const screeningIds = new Set<string>([
        ...screeningQuestions.map(q => q.id),
        ...page.questions.filter(q => q.active !== false && q.isScreening).map(q => q.id),
      ]);
      const submittedScreening = Object.fromEntries(
        [...screeningIds].map(id => [id, answers[id] ?? ''])
      );

      const meetingLocation = page.locations.find(l => l.label === location);
      const draftBooking: Appointment = {
        id: uid(),
        calendarId: page.id,
        serviceName: page.name,
        name: (
          answers.name ||
          [answers.firstName, answers.lastName].filter(Boolean).join(' ')
        ).trim(),
        email: (answers.email || '').trim().toLowerCase(),
        whatsapp: answers.whatsapp || (meetingLocation?.type === 'phone' ? inviteeLocation : ''),
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
        status: page.requireApproval || !page.free ? 'Pending' : 'Confirmed',
        source: source || 'Landing Page',
        fromAd,
        customAnswers: answers,
        guests: page.formSettings.guestsActive ? guests : [],
      };

      if (rules.length > 0) {
        const localEval = evaluateQualification(rules, submittedScreening);
        if (localEval.status === 'incomplete') {
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
            page,
            booking: draftBooking,
            answers,
            screeningQuestions,
          });
          setDisqualified(true);
          return;
        }
      }

      if (isPublicAsset && effectiveSlug && page.id !== 'landing-demo-calendar') {
        const token = crypto.randomUUID();
        sessionStorage.setItem('gos.booking.token.' + draftBooking.id, token);
        const result = await callBackend<BookingSubmission>('publicBooking', {
          slug: effectiveSlug,
          operation: 'create',
          booking: draftBooking,
          token,
          screeningAnswers: submittedScreening,
        });
        if ('qualification' in result) {
          if (result.qualification.status === 'ineligible') {
            await recordPendingScreeningLead({
              page,
              booking: draftBooking,
              answers,
              screeningQuestions,
            });
            setDisqualified(true);
            return;
          }
          setError(
            screeningText(
              page.language,
              'Please check your answers and complete every screening question.'
            )
          );
          return;
        }
        Tracking.bookMeeting({ calendarId: page.id, status: result.booking.status });
        setConfirmedBooking(result.booking);
        onCompleted?.();
        return;
      }

      setConfirmedBooking(draftBooking);
      onCompleted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not complete booking.');
    } finally {
      setSaving(false);
    }
  };

  const themeMode = item.content.bookingThemeMode || 'page';
  const resolvedBrandColor =
    themeMode === 'calendar'
      ? bookingColor(page.color)
      : 'var(--fb-accent, ' + bookingColor(page.color) + ')';

  const sectionTitle = item.content.title?.trim();
  const sectionSubtitle = item.content.sectionSubtitle?.trim();

  return (
    <div
      ref={rootRef}
      {...locale}
      className={[
        'fb-embedded-booking',
        device === 'mobile' ? 'is-force-mobile' : '',
        darkContext ? 'dark' : '',
        themeMode === 'minimal' ? 'is-minimal-surface' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {(sectionTitle || sectionSubtitle) && (
        <header className="fb-embedded-booking-head">
          <span className="fb-embedded-booking-kicker">
            <CalendarDays size={13} />
            {translateText('Book Your Session')}
          </span>
          {sectionTitle && <h2>{localizeNode(sectionTitle)}</h2>}
          {sectionSubtitle && <p>{localizeNode(sectionSubtitle)}</p>}
        </header>
      )}

      <BookingDirectionContext.Provider value={locale.dir}>
        <div
          className="bk-public fb-embedded-booking-frame"
          style={
            {
              '--booking-color': resolvedBrandColor,
            } as React.CSSProperties
          }
        >
          <div className="bk-public-shell fb-embedded-booking-shell">
            {disqualified ? (
              <BookingScreeningExit language={page.language} restart={!isPublicAsset ? resetWidget : undefined} />
            ) : confirmedBooking ? (
              <BookingConfirmationView
                formatPrice={formatCheckoutPrice}
                success={confirmedBooking}
                page={page}
                error=""
              >
                <button type="button" className="bk-button primary" onClick={resetWidget}>
                  {translateText('Book another appointment')}
                </button>
              </BookingConfirmationView>
            ) : (
              <BookingPageView
                formatPrice={formatCheckoutPrice}
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
                rescheduleId={undefined}
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
                screeningQuestions={screeningQuestions}
                hideTroubleshoot={true}
              />
            )}
          </div>
        </div>
      </BookingDirectionContext.Provider>
    </div>
  );
}
