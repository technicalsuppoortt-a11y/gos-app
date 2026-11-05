import type { Appointment, BookingPage } from '../../src/pages/booking/model';
import { evaluateQualification, publicScreeningQuestions } from '../../functions/booking-qualification.js';
declare global { interface Window { __bookingPage: BookingPage; __bookings: Appointment[]; __failBooking: boolean; __bookMeetingCount: number } }
export const Tracking = { bookMeeting() { window.__bookMeetingCount++; } };
export async function callBackend(_name: string, input: { operation?:string; booking?:Appointment; screeningAnswers?: Record<string, string> }) {
  const { qualificationQuestions = [], ...page } = window.__bookingPage;
  const screeningQuestions = publicScreeningQuestions(qualificationQuestions);
  if (input.operation === 'qualify' || input.operation === 'create') {
    const result = evaluateQualification(qualificationQuestions, input.screeningAnswers);
    const qualification = result.status === 'incomplete' ? { status: result.status, screeningQuestions } : { status: result.status };
    if (input.operation === 'qualify') return qualification;
    if (result.status !== 'qualified') return { qualification };
  }
  if (input.operation) {
    if(window.__failBooking) throw new Error('Booking was rejected.');
    window.__bookings.push(input.booking!);
    return { booking: input.booking };
  }
  return { page, bookings: window.__bookings, screeningQuestions };
}
