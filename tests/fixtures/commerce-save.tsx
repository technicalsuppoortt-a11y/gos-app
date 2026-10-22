import { ProductLivePreview } from '../../src/pages/commerce/ProductLivePreview';
import { ProductPublicPreview } from '../../src/pages/commerce/ProductPublicPreview';
import { CommercePolicyPage } from '../../src/pages/commerce/CommercePolicyPage';
import { createBuilderDocument } from '../../src/pages/BuilderWorkspace';
import { writePreview } from '../../src/pages/commerce/previewSnapshot';
import { Toaster } from 'sonner';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider, useSearchParams } from 'react-router-dom';
import { store } from '../../src/store';
import { loginSuccess } from '../../src/store/slices/authSlice';
import { ProductsPayments } from '../../src/pages/ProductsPayments';
import { ProductWorkspace } from '../../src/pages/commerce/ProductWorkspace';
import { ProductTemplateLibrary } from '../../src/pages/commerce/ProductTemplateLibrary';
import { newProduct, defaultConfig } from '../../src/pages/commerce/model';
import { seed } from './commerce-save-workspace';
import '../../src/i18n/i18n';
import '../../src/index.css';

(window as any).__writes = []; (window as any).__messages = [];
(window as any).__seed = seed;
(window as any).__newProduct = newProduct;
(window as any).__defaultConfig = defaultConfig;
(window as any).__writePreview = writePreview;
(window as any).__createBuilderDocument = createBuilderDocument;
store.dispatch(loginSuccess({ user: { id: 'qa', name: 'QA', email: 'qa@example.com' }, role: 'ADMIN', tenant: { id: 'tenant-qa', name: 'QA' }, token: '' }));
seed('gos-commerce-products-v1:tenant-qa', [{ ...newProduct(), id: 'product-qa', name: 'QA Service', type: 'Service', config: defaultConfig('Service', '€50') }]);
const notify = (message: string) => (window as any).__messages.push(message);
function PreviewRoute() { const [params] = useSearchParams(); return params.has('workspace') ? <ProductPublicPreview/> : <ProductLivePreview/>; }
const router = createMemoryRouter([
  { path: '/product-preview/:token', element: <PreviewRoute/> },
  { path: '/commerce/policies/:kind', element: <CommercePolicyPage/> },
  { path: '/dashboard/products', element: <ProductTemplateLibrary/> },
  { path: '/dashboard/products-payments', element: <ProductsPayments notify={notify}/> },
  { path: '/dashboard/products-payments/products/new', element: <ProductWorkspace mode="create"/> },
  { path: '/dashboard/products-payments/products/:id/edit', element: <ProductWorkspace mode="edit"/> },
], { initialEntries: ['/dashboard/products-payments?tab=settings'] });
(window as any).__router = router;
createRoot(document.getElementById('root')!).render(<Provider store={store}><main style={{ height: '100vh', display: 'flex', padding: 16 }}><RouterProvider router={router}/><Toaster/></main></Provider>);
