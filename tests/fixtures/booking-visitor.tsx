import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { store } from '../../src/store';
import PublicBookingPage from '../../src/pages/booking/PublicBookingPage';
import { BookingLivePreview } from '../../src/pages/booking/BookingLivePreview';
import { BookingBuilder } from '../../src/pages/booking/BookingBuilder';
import { blankPage } from '../../src/pages/booking/model';
import i18n from '../../src/i18n/i18n';
import '../../src/index.css';
import '../../src/i18n/rtl.css';

const options = new URLSearchParams(location.search);
const page = blankPage();
if (options.has('arabic-calendar')) page.language = 'ar';
Object.assign(page, { id: options.get('page') || 'visitor-calendar', slug: 'visitor', name: 'Visitor test', hostName: 'Booking host', minNotice: 0, bufferTime: 0 });
page.availability.forEach(day => { day.enabled = true; });
page.afterBooking = { ...page.afterBooking, scheduleAnother: options.get('another') !== 'off', prefill: options.get('prefill') !== 'off', allowCancelReschedule: false };
page.questions.push({ id:'company', label:'Company', type:'text', required:false, options:[] });
if (options.has('split')) page.formSettings.nameType = 'firstlast';
if (options.has('phone')) { page.locations = [{id:'phone',type:'phone',label:'Phone call',address:'',customLabel:'',linked:false}]; page.locationOptions = ['Phone call']; }
if (options.has('screening')) page.qualificationQuestions = [
  { id: 'budget', label: 'Project budget in USD', type: 'minimum', minimum: 1500 },
  { id: 'scope', label: 'Project scope', type: 'choice', options: ['Strategy', 'One-off task'], accepted: ['Strategy'] },
];
Object.assign(window, { __bookingPage: page, __bookings: [], __bookMeetingCount: 0, __failBooking: options.has('fail'), __setBookingLanguage: (lang: 'ar' | 'en') => i18n.changeLanguage(lang) });
createRoot(document.getElementById('root')!).render(<Provider store={store}><MemoryRouter initialEntries={['/book/visitor']}>{options.has('builder')
  ? <BookingBuilder page={page} pages={[page]} close={() => {}} save={draft => { window.__bookingPage = draft; }}/>
  : options.has('preview') ? <div className="bk-editor-page" style={{height:'100vh',display:'flex'}}><BookingLivePreview page={page}/></div> : <Routes><Route path="/book/:slug" element={<PublicBookingPage/>}/></Routes>}</MemoryRouter></Provider>);
