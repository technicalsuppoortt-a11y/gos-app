import { useUILanguage, translateText } from '../../i18n/display';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { showToast } from '../../utils/toast';
import { AppointmentEditor } from './SystemCalendar';
import { KEYS, readAppointments, readContacts, readPages, uid, useStored } from './model';
import { Empty } from './ui';
import './booking-workspace.css';

export default function AppointmentEditorPage() {
  useUILanguage();
  const { appointmentId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [pages] = useStored(KEYS.pages, readPages);
  const [bookings, saveBookings] = useStored(KEYS.appointments, readAppointments);
  const [, saveContacts] = useStored(KEYS.contacts, readContacts);
  const appointment = bookings.find(item => item.id === appointmentId);
  const close = () => navigate('/dashboard/booking?tab=' + (params.get('returnTo') === 'bookings' ? 'bookings' : 'calendar'));
  if (appointmentId && !appointment) return <main className="bk-workspace"><Empty title={translateText("Appointment not found")} detail="This appointment may have been removed."/><button className="bk-button" onClick={close}>{translateText("Back to bookings")}</button></main>;
  return <AppointmentEditor key={appointmentId || 'new'} pages={pages} bookings={bookings} value={appointment || {date:params.get('date') || undefined,time:params.get('time') || undefined}} close={close} save={value => {
    try {
      saveBookings([...readAppointments().filter(item => item.id !== value.id), value]);
      const contacts = readContacts();
      if (!contacts.some(item => item.email.toLowerCase() === value.email.toLowerCase())) saveContacts([...contacts, {id:uid(),name:value.name,email:value.email,phone:value.whatsapp,company:''}]);
      showToast.success('Appointment saved.');
      close();
    } catch { showToast.error('Could not save changes. Browser storage may be full or unavailable.'); }
  }}/>;
}
