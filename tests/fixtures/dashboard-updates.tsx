import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from '../../src/store';
import { hydrateCRM } from '../../src/store/slices/crmSlice';
import { mainPipeline } from '../../src/pages/crm/model';
import { FormsWorkspace } from '../../src/pages/FormsWorkspace';
import { createPageAsset } from '../../src/pages/page-templates';
import type { Workspace } from '../../src/pages/asset-model';
import { SectionPreview } from '../../src/pages/BuilderWorkspace';
import { BuilderFormCaptureContext } from '../../src/pages/builder-form-capture';
import '../../src/i18n/i18n';
import '../../src/index.css';
import '../../src/pages/asset-workspace.css';
import '../../src/pages/asset-controls.css';
import '../../src/light-contrast.css';
store.dispatch(hydrateCRM({ leads: [], pipelines: [mainPipeline, { ...mainPipeline, id: 'sales', name: 'Sales pipeline' }] }));
function Fixture() {
  const [workspace, setWorkspace] = useState<Workspace>(() => ({ assets: [createPageAsset('funnel', 'Target funnel')], domains: [] }));
  const asset = workspace.assets.find(a => a.formAsset);
  (window as any).__workspace = workspace;
  (window as any).__makePublished = () => setWorkspace(w => ({ ...w, assets: w.assets.map(a => a.formAsset ? { ...a, publishedUrl: 'https://form-fixture.web.app', document: { ...a.document, funnel: { ...a.document.funnel, status: 'Published' } } } : a) }));
  return <main className="layout-dashboard-shell" style={{ padding: 32, display: 'block', height: 'auto' }}><FormsWorkspace workspace={workspace} save={async update => setWorkspace(update)} go={() => {}}/>{asset && <section aria-label="Published form preview" style={{ marginTop: 32, maxWidth: 600 }}><BuilderFormCaptureContext.Provider value={async data => { (window as any).__submission = data; }}><SectionPreview item={asset.document.pages[0].sections[0]} onAction={() => {}} onImagePick={() => {}} onImageDrop={() => {}} onNotify={() => {}}/></BuilderFormCaptureContext.Provider></section>}</main>;
}
createRoot(document.getElementById('root')!).render(<Provider store={store}><Fixture/></Provider>);
