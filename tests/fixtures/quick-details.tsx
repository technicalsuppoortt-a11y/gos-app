import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { Provider } from 'react-redux';
import { store } from '../../src/store';
import { BookingQuickView } from '../../src/pages/booking/BookingQuickView';
import { BookingBrandingFooter } from '../../src/pages/booking/BookingBrandingFooter';
import { ProductCardActions } from '../../src/pages/commerce/ProductCardActions';
import { newProduct } from '../../src/pages/commerce/model';
import { seed } from './commerce-save-workspace';
import '../../src/i18n/i18n';
import '../../src/index.css';
import '../../src/pages/booking/booking-workspace.css';
import '../../src/pages/products-payments.css';
import '../../src/pages/commerce/commerce-enhancements.css';
const product = { ...newProduct(), id: 'product-1', name: 'Design toolkit', description: 'Files for designers', status: 'Active' as const };
seed('entity:orders', [{ id: 'order-1', productId: product.id, customerName: 'Ada Buyer', customerEmail: 'ada@example.test', status: 'Paid' }, { id: 'unrelated', productId: 'other', customerName: 'Other Buyer' }]);
function App() {
  const [booking, setBooking] = useState(false);
  return <><button onClick={() => setBooking(true)}>Booking details</button><article onClick={() => { throw Error('Product card click leaked'); }}><ProductCardActions product={product} onEdit={() => {}} notify={() => {}}/></article>{booking && <BookingQuickView booking={{ id: 'booking-1', calendarId: 'calendar-1', serviceName: 'Design consultation', name: 'Ada Buyer', email: 'ada@example.test', whatsapp: '', date: '2026-11-01', time: '10:00', start: '2026-11-01T08:00:00Z', duration: 30, timezone: 'Africa/Cairo', location: 'Online', status: 'Confirmed', source: 'Website', fromAd: null, customAnswers: { Goal: 'Improve conversion' }, guests: [] }} close={() => setBooking(false)} edit={() => setBooking(false)}/>}<div className="bk-workspace"><BookingBrandingFooter hostName="QA"/><p className="bk-tip">Times are shown in your timezone.</p><small className="bk-muted">Africa/Cairo</small></div></>;
}
createRoot(document.getElementById('root')!).render(<Provider store={store}><App/></Provider>);
