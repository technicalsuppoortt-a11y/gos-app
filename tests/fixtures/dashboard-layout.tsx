import { createRoot } from 'react-dom/client';
import { Provider, useSelector } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { store } from '../../src/store';
import { loginSuccess } from '../../src/store/slices/authSlice';
import { setLanguage, setTheme } from '../../src/store/slices/uiSlice';
import { NotificationCenter } from '../../src/components/layout/NotificationCenter';
import { HomeDashboard } from '../../src/pages/dashboard/HomeDashboard';
import { NativeDashboardPreview } from '../../src/pages/landing/NativeDashboardPreview';
import type { RootState } from '../../src/store';
import { seedDemo } from '../../src/pages/landing/preview/adapters/workspace';
import i18n from '../../src/i18n/i18n';
import '../../src/index.css';
import '../../src/layout-shell.css';
import '../../src/global-controls.css';
import '../../src/i18n/rtl.css';
import '../../src/theme-surfaces.css';
import '../../src/theme-controls.css';

store.dispatch(loginSuccess({ user: { id: 'layout-test', name: 'mahmoud ali', email: 'layout@example.com' }, tenant: { id: 'layout-test', name: 'Layout test' }, role: 'USER', token: 'test-only' }));
seedDemo('entity:events', Array.from({ length: 100 }, (_, index) => ({ id: `layout-event-${index}`, type: ['booking.saved', 'lead.created', 'conversation.handoff', 'payment.completed'][index % 4], resource: 'products', createdAt: new Date(Date.now() - index * 60000).toISOString() })));
Object.assign(window, { setLayoutMode: async (language: 'ar' | 'en', theme: 'light' | 'dark') => {
  store.dispatch(setLanguage(language));
  store.dispatch(setTheme(theme));
  await i18n.changeLanguage(language);
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.dataset.theme = theme;
} });
function Preview() {
  const ar = useSelector((state: RootState) => state.ui.language === 'ar');
  return <div style={{ width: 'min(100%, 700px)', margin: '20px auto' }}><NativeDashboardPreview tab={1} ar={ar} title="Dashboard layout preview" /></div>;
}
createRoot(document.getElementById('root')!).render(
  <Provider store={store}><MemoryRouter initialEntries={['/dashboard']}>
    {new URLSearchParams(location.search).has('preview') ? <Preview /> : <div className="layout-dashboard-shell is-dashboard-route"><div className="layout-workspace">
      <header className="layout-header" style={{ justifyContent: 'flex-end' }}><NotificationCenter /></header>
      <main className="layout-main"><div className="layout-route-content"><HomeDashboard /></div></main>
    </div></div>}
  </MemoryRouter></Provider>,
);
