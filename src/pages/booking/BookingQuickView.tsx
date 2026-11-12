import { QuickDetails } from '../../components/ui/QuickDetails';
import { translateText, useUILanguage } from '../../i18n/display';
import type { Appointment, BookingPage } from './model';

export function BookingQuickView({ booking, page, close, edit }: { booking: Appointment; page?: BookingPage; close: () => void; edit: () => void }) {
  useUILanguage();
  return <QuickDetails title={booking.serviceName || translateText('Booking details')} close={close}>
    <div><span className="detail-badge">{translateText(booking.status)}</span></div>
    <section><h3>{translateText("Customer details")}</h3><dl><div><dt>{translateText("Name")}</dt><dd>{booking.name}</dd></div><div><dt>{translateText("Email")}</dt><dd>{booking.email}</dd></div></dl></section>
    <section><h3>{translateText('Date & time')}</h3><dl>{Object.entries({ Date: booking.date, Time: booking.time, Timezone: booking.timezone, Duration: translateText(`${booking.duration} minutes`) }).map(([label, value]) => <div key={label}><dt>{translateText(label)}</dt><dd>{value}</dd></div>)}</dl></section>
    <section><h3>{translateText("Location")}</h3><p>{booking.location || translateText("No location provided")}</p></section>
    <section><h3>{translateText("Question answers")}</h3>{Object.keys(booking.customAnswers ?? {}).length ? <dl>{Object.entries(booking.customAnswers ?? {}).map(([key, value]) => <div key={key}><dt>{page?.questions.find(q => q.id === key)?.label || key}</dt><dd>{value}</dd></div>)}</dl> : <p className="detail-muted">{translateText("No additional answers provided.")}</p>}</section>
    {!!booking.qualificationResponses?.length && <section><h3>{translateText('Screening answers')}</h3><dl>{booking.qualificationResponses.map(({ id, label, answer }) => <div key={id}><dt>{label}</dt><dd>{answer}</dd></div>)}</dl></section>}
    <section><h3>{translateText("Reference")}</h3><dl><div><dt>{translateText("Booking ID")}</dt><dd>{booking.id}</dd></div></dl></section>
    <button className="detail-primary" onClick={edit}>{translateText("Edit booking")}</button>
  </QuickDetails>;
}

