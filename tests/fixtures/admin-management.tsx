import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { store } from '../../src/store';
import { AdminLiveManagement } from '../../src/pages/admin/AdminLiveManagement';
import '../../src/i18n/i18n';
import i18n from 'i18next';
import '../../src/index.css';
import '../../src/pages/admin/admin-workspace.css';
const params = new URLSearchParams(location.search);
const moduleId = params.get('module') || 'funnels-websites';
if (params.get('language') === 'ar') { void i18n.changeLanguage('ar'); document.documentElement.dir = 'rtl'; }
if (params.get('theme') === 'dark') document.documentElement.classList.add('dark');
createRoot(document.getElementById('root')!).render(<Provider store={store}><MemoryRouter><div className="adm-shell" style={{ padding: 24, overflow: 'auto', display: 'block' }}><AdminLiveManagement moduleId={moduleId}/></div></MemoryRouter></Provider>);
