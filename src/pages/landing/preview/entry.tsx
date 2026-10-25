import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { store } from '../../../store';
import { loginSuccess } from '../../../store/slices/authSlice';
import { hydrateCRM } from '../../../store/slices/crmSlice';
import { setLanguage, toggleTheme } from '../../../store/slices/uiSlice';
import { NativeWorkspace } from './NativeWorkspace';
import { DashboardPage } from '../../DashboardPage';
import { AICopilot } from '../../AICopilot';
import { MarketingTracking } from '../../MarketingTracking';
import { SettingsWorkspace } from '../../settings/SettingsWorkspace';
import { makeLead, mainPipeline } from '../../crm/model';
import { newProduct, formatPrice } from '../../commerce/model';
import { blankPage } from '../../booking/model';
import { createBuilderDocument } from '../../BuilderWorkspace';
import { seedDemo } from './adapters/workspace';
import { previewScreens } from './screens';
import i18n from '../../../i18n/i18n';
import '../../../index.css';
import '../../../layout-shell.css';
import '../../../global-controls.css';
import '../../../i18n/rtl.css';
import '../../../theme-surfaces.css';
import '../../../theme-controls.css';
import '../../../module-updates.css';
import './frame.css';

// The Vite ?landing-demo graph uses only the read-only adapters in this folder.
// These are the production page components, not separate preview renderers.
store.dispatch(loginSuccess({ user: { id: 'landing-demo-user', name: 'Mohamed Joe', email: 'demo@example.com' }, tenant: { id: 'landing-demo', name: 'GOS Demo Workspace' }, role: 'USER', token: 'demo-only' }));
const daysAgo = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
const leads = ['Sarah Ahmed', 'Omar Khaled', 'Lina Hassan', 'Adam Ali', 'Mona Samir', 'Youssef Adel'].map((name, i) => makeLead({
  id: `demo-lead-${i}`, name, email: `contact${i + 1}@example.com`, source: ['Instagram', 'WhatsApp', 'Website'][i % 3],
  lifecycleStage: ['LEAD_CAPTURED', 'CONTACT_CREATED', 'QUALIFIED', 'CONVERSATION', 'PAYMENT_COMPLETED', 'ACTIVE_CUSTOMER'][i] as ReturnType<typeof makeLead>['lifecycleStage'],
  stage: ['LEAD_CAPTURED', 'CONTACT_CREATED', 'QUALIFIED', 'CONVERSATION', 'PAYMENT_COMPLETED', 'ACTIVE_CUSTOMER'][i] as ReturnType<typeof makeLead>['stage'],
  value: (i + 1) * 149, pipelineId: 'main', createdAt: daysAgo(i + 1), lastActivity: daysAgo(i / 24),
  activities: [{ id: `demo-activity-${i}`, type: i % 2 ? 'message' : 'capture', title: i % 2 ? 'Follow-up sent' : 'Lead captured', detail: 'Demo activity', at: daysAgo(i / 24) }],
}));
store.dispatch(hydrateCRM({ leads, pipelines: [mainPipeline] }));
seedDemo('entity:leads', leads); seedDemo('entity:pipelines', [mainPipeline]);
const products = ['Growth Strategy Session', 'AI Business Toolkit', 'Client Follow-Up Course'].map((name, i) => {
  const p = newProduct(); p.id = `demo-product-${i}`; p.name = name; p.status = 'Active'; p.description = 'Sample product in the demonstration workspace.';
  p.config!.amount = [149, 79, 199][i]; p.price = formatPrice(p.config!); p.image = ['/dashboard/funnel-consultation.png', '/dashboard/funnel-nutrition.png', '/dashboard/funnel-fitness.png'][i]; return p;
});
seedDemo('gos-commerce-products-v1:landing-demo', products);
const calendar = blankPage(); Object.assign(calendar, { id: 'demo-calendar', name: 'Free Discovery Call', slug: 'demo-discovery', hostName: 'Mohamed Joe', duration: 30 });
seedDemo('entity:calendars', [calendar]);
seedDemo('entity:bookings', leads.slice(0, 3).map((lead, i) => ({ id: `demo-booking-${i}`, calendarId: calendar.id, serviceName: calendar.name, name: lead.name, email: lead.email, whatsapp: '', date: daysAgo(-i).slice(0, 10), time: '10:00', start: daysAgo(-i), duration: 30, timezone: 'Africa/Cairo', location: 'Online', status: 'Confirmed', source: lead.source, fromAd: false, customAnswers: {}, guests: [] })));
const transactions = Array.from({ length: 18 }, (_, i) => ({ id: `demo-order-${i}`, status: 'Paid', amount: [149, 79, 199][i % 3], currency: 'USD', createdAt: daysAgo(i * 1.5), productId: products[i % 3].id, productName: products[i % 3].name, customerName: leads[i % leads.length].name, customerEmail: leads[i % leads.length].email, method: 'Card' }));
seedDemo('entity:transactions', transactions);
seedDemo('entity:events', Array.from({ length: 24 }, (_, i) => ({ id: `demo-event-${i}`, type: ['workspace.updated', 'booking.saved', 'copilot.responded', 'settings.updated'][i % 4], resource: ['products', 'calendars', 'crm', 'settings'][i % 4], createdAt: daysAgo(i / 2), actorId: 'landing-demo-user' })));
seedDemo('entity:conversations', leads.slice(0, 3).map((lead, i) => ({ id: `demo-conversation-${i}`, name: lead.name, customer_name: lead.name, channel: ['whatsapp', 'instagram', 'email'][i], last_message_body: ['Hi, can you tell me about your services?', 'I’d like to book a discovery call.', 'Thank you for the details!'][i], status: 'open', unread_count: i === 0 ? 2 : 0, updated_at: daysAgo(i / 24), messages: [{ id: `demo-message-${i}`, body: 'Hi, I’d like to learn more about your services.', role: 'customer', created_at: daysAgo(i / 24) }] })));
const document = createBuilderDocument('funnel', 'Discovery Call Funnel', '/dashboard/funnel-consultation.png', 3);
seedDemo('gos.assets.workspace.v1', { assets: [{ id: 'demo-funnel', kind: 'funnel', name: 'Discovery Call Funnel', domain: '', image: '/dashboard/funnel-consultation.png', updated: daysAgo(1), document, description: 'Demo funnel', settings: { seo: 'Discovery Call', navigation: '', color: '#7546f5' } }], domains: [] });
seedDemo('entity:assets', [{ id: 'demo-funnel', name: 'Discovery Call Funnel', kind: 'funnel', document }]);

const router = createMemoryRouter([{ element: <NativeWorkspace/>, children: previewScreens.map(screen => ({ path: screen.path, element: screen.id === 'settings' ? <SettingsWorkspace/> : screen.id === 'marketing-tracking' ? <MarketingTracking/> : screen.id === 'copilot' ? <AICopilot/> : <DashboardPage page={screen.page!}/> })) }], { initialEntries: ['/dashboard'] });
window.addEventListener('message', event => {
  if (event.source !== parent || event.origin !== window.location.origin || event.data?.type !== 'gos-demo-view') return;
  const screen = previewScreens.find(item => item.id === event.data.screen);
  if (!screen) return;
  const lang = event.data.language === 'ar' ? 'ar' : 'en';
  if (store.getState().ui.language !== lang) store.dispatch(setLanguage(lang));
  void i18n.changeLanguage(lang);
  const dark = event.data.theme === 'dark';
  if ((store.getState().ui.theme === 'dark') !== dark) store.dispatch(toggleTheme());
  window.document.documentElement.classList.toggle('dark', dark);
  window.document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  if (router.state.location.pathname !== screen.path) void router.navigate(screen.path);
});
createRoot(window.document.getElementById('root')!).render(<Provider store={store}><RouterProvider router={router}/></Provider>);
