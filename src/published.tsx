import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import { PublishedPage } from './pages/PublishedPage';
import './i18n/i18n';
import './index.css';
import './pages/asset-workspace.css';

const data = JSON.parse(document.getElementById('gos-publication-data')?.textContent || '{}');
createRoot(document.getElementById('root')!).render(<Provider store={store}>{data.asset ? <PublishedPage asset={data.asset} pageId={data.pageId}/> : <p>This page has not been published.</p>}</Provider>);
