import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { store } from '../../src/store';
import PublicBookingPage from '../../src/pages/booking/PublicBookingPage';
import { blankPage } from '../../src/pages/booking/model';
import '../../src/index.css';

const options = new URLSearchParams(location.search);
const page = blankPage();
Object.assign(page, { id: options.get('page') || 'visitor-calendar', slug: 'visitor', name: 'Visitor test', hostName: 'Booking host', minNotice: 0, bufferTime: 0 });
page.availability.forEach(day => { day.enabled = true; });
page.afterBooking = { ...page.afterBooking, scheduleAnother: options.get('another') !== 'off', prefill: options.get('prefill') !== 'off', allowCancelReschedule: false };
page.questions.push({ id:'company', label:'Company', type:'text', required:false, options:[] });
if (options.has('split')) page.formSettings.nameType = 'firstlast';
if (options.has('phone')) { page.locations = [{id:'phone',type:'phone',label:'Phone call',address:'',customLabel:'',linked:false}]; page.locationOptions = ['Phone call']; }
Object.assign(window, { __bookingPage: page, __bookings: [], __failBooking: options.has('fail') });
createRoot(document.getElementById('root')!).render(<Provider store={store}><MemoryRouter initialEntries={['/book/visitor']}><Routes><Route path="/book/:slug" element={<PublicBookingPage/>}/></Routes></MemoryRouter></Provider>);
