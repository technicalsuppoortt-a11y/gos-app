import { QuickDetails } from '../../components/ui/QuickDetails';
import type { Appointment, BookingPage } from './model';

export function BookingQuickView({ booking, page, close, edit }: { booking: Appointment; page?: BookingPage; close: () => void; edit: () => void }) {
  return <QuickDetails title={booking.serviceName || 'Booking details'} close={close}>
    <div><span className="detail-badge">{booking.status}</span></div>
    <section><h3>Customer details</h3><dl><div><dt>Name</dt><dd>{booking.name}</dd></div><div><dt>Email</dt><dd>{booking.email}</dd></div></dl></section>
    <section><h3>Date &amp; time</h3><dl>{Object.entries({ Date: booking.date, Time: booking.time, Timezone: booking.timezone, Duration: `${booking.duration} minutes` }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
    <section><h3>Location</h3><p>{booking.location || 'No location provided'}</p></section>
    <section><h3>Question answers</h3>{Object.keys(booking.customAnswers ?? {}).length ? <dl>{Object.entries(booking.customAnswers ?? {}).map(([key, value]) => <div key={key}><dt>{page?.questions.find(q => q.id === key)?.label || key}</dt><dd>{value}</dd></div>)}</dl> : <p className="detail-muted">No additional answers provided.</p>}</section>
    <section><h3>Reference</h3><dl><div><dt>Booking ID</dt><dd>{booking.id}</dd></div></dl></section>
    <button className="detail-primary" onClick={edit}>Edit booking</button>
  </QuickDetails>;
}

