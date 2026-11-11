import type { Appointment, BookingPage } from '../../src/pages/booking/model';
import {
  evaluateQualification,
  extractCalendarQualificationRules,
  publicScreeningQuestions,
  sanitizePublicFormQuestions,
  validQualificationQuestions,
} from '../../functions/booking-qualification.js';

declare global {
  interface Window {
    __bookingPage: BookingPage;
    __bookings: Appointment[];
    __pendingLeads: Array<{ email: string; name: string; bookingStatus: string; qualificationStatus: string }>;
    __failBooking: boolean;
    __bookMeetingCount: number;
  }
}

export const Tracking = {
  bookMeeting() {
    window.__bookMeetingCount++;
  },
};

export async function callBackend(
  _name: string,
  input: { operation?: string; booking?: Appointment; screeningAnswers?: Record<string, string> }
) {
  const rawRules = extractCalendarQualificationRules(window.__bookingPage as unknown as Record<string, unknown>);
  const rules = validQualificationQuestions(rawRules) ? rawRules : [];
  const { qualificationQuestions: _stripRules, ...rawPage } = window.__bookingPage;
  const page = {
    ...rawPage,
    questions: sanitizePublicFormQuestions(rawPage.questions),
  };
  const screeningQuestions = publicScreeningQuestions(rules);

  if (input.operation === 'qualify' || input.operation === 'create') {
    const mergedAnswers = {
      ...(input.booking?.customAnswers && typeof input.booking.customAnswers === 'object'
        ? input.booking.customAnswers
        : {}),
      ...(input.screeningAnswers && typeof input.screeningAnswers === 'object'
        ? input.screeningAnswers
        : {}),
    };
    const result = evaluateQualification(rules, mergedAnswers);
    const qualification =
      result.status === 'incomplete'
        ? { status: result.status, screeningQuestions }
        : { status: result.status };
    if (input.operation === 'qualify') return qualification;
    if (result.status === 'ineligible') {
      window.__pendingLeads ??= [];
      if (input.booking?.email || input.booking?.name) {
        window.__pendingLeads.push({
          email: input.booking.email,
          name: input.booking.name,
          bookingStatus: 'Pending Booking',
          qualificationStatus: 'Unqualified',
        });
      }
      return { qualification };
    }
    if (result.status !== 'qualified') return { qualification };
  }

  if (input.operation) {
    if (window.__failBooking) throw new Error('Booking was rejected.');
    window.__bookings.push(input.booking!);
    return { booking: input.booking };
  }

  return { page, bookings: window.__bookings, screeningQuestions };
}
