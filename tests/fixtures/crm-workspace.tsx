import { hydrateCRM } from '../../src/store/slices/crmSlice';
import { mainPipeline, makeLead } from '../../src/pages/crm/model';
import { refreshGosCRM } from '../../src/backend/gosCRM';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { store } from '../../src/store';
import { loginSuccess } from '../../src/store/slices/authSlice';
import { CRMLeads } from '../../src/pages/CRMLeads';
import { CRMRecord } from '../../src/pages/crm/CRMRecord';
import '../../src/i18n/i18n';
import '../../src/index.css';

store.dispatch(loginSuccess({ user: { id: 'qa', name: 'QA', email: 'qa@example.com' }, role: 'ADMIN', tenant: { id: 'tenant-qa', name: 'QA' }, token: '' }));
const captures = [
  makeLead({ id: 'capture-funnel', name: 'Funnel contact', email: 'funnel@capture.test', source: 'Funnel', pipelineId: 'main', activities: [{ id: 'form-event', type: 'capture', title: 'Form submitted', detail: 'Website inquiry', at: '2026-10-21T12:00:00Z' }] }),
  makeLead({ id: 'capture-booking', name: 'Booking contact', email: 'booking@capture.test', source: 'Booking', bookingId: 'booking-native', bookingStatus: 'Booked', lifecycleStage: 'BOOKING', pipelineId: 'main' }),
  makeLead({ id: 'capture-order', name: 'Checkout contact', email: 'checkout@capture.test', source: 'Checkout', orderId: 'order-native', lifecycleStage: 'PAYMENT_COMPLETED', pipelineId: 'main' }),
];
store.dispatch(hydrateCRM({ leads: captures, pipelines: [mainPipeline] }));
(window as any).__documents = Object.fromEntries(captures.map(lead => ['tenants/tenant-qa/leads/' + lead.id, { ...lead, company: 'Complete ' + lead.source + ' company' }]));
(window as any).__store = store;
(window as any).__refreshCRM = refreshGosCRM;
(window as any).__entities = { products: [{ id: 'product-qa', name: 'Strategy Session', status: 'Active', type: 'Service', config: { amount: 200, currency: 'USD', experience: { directCheckoutUrl: 'https://checkout.example.com/strategy' } } }], bookings: [{ id: 'booking-native', serviceName: 'Booked consultation', status: 'Confirmed', date: '2026-11-01', time: '10:00' }], orders: [{ id: 'order-native', productName: 'Captured checkout order', status: 'Paid', amount: 200, currency: 'USD' }], transactions: [] };
createRoot(document.getElementById('root')!).render(<Provider store={store}><div style={{ display: 'flex', height: '100vh' }}><aside data-testid="dashboard-sidebar" style={{ width: 224, flexShrink: 0 }}>Workspace sidebar</aside><main style={{ flex: 1, minWidth: 0, height: '100%' }}><MemoryRouter initialEntries={['/dashboard/crm']}><Routes><Route path="/dashboard/crm" element={<CRMLeads notify={() => {}}/>}/><Route path="/dashboard/crm/:view" element={<CRMLeads notify={() => {}}/>}/><Route path="/dashboard/crm/contacts/:id" element={<CRMRecord/>}/><Route path="/dashboard/crm/opportunities/:id" element={<CRMRecord/>}/></Routes></MemoryRouter></main></div><Toaster/></Provider>);
