import type { Appointment, BookingPage } from '../../src/pages/booking/model';
declare global { interface Window { __bookingPage: BookingPage; __bookings: Appointment[]; __failBooking: boolean } }
export const Tracking = { bookMeeting() {} };
export async function callBackend(_name: string, input: { operation?:string; booking?:Appointment }) {
  if (input.operation) {
    if(window.__failBooking) throw new Error('Booking was rejected.');
    window.__bookings.push(input.booking!);
    return { booking: input.booking };
  }
  return { page: window.__bookingPage, bookings: window.__bookings };
}
