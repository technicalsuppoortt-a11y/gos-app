import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { store } from '../../src/store';
import { FormsWorkspace } from '../../src/pages/FormsWorkspace';
import { BuilderWorkspace, createBuilderDocument } from '../../src/pages/BuilderWorkspace';
import { createPageAsset } from '../../src/pages/page-templates';
import { AssetDialog } from '../../src/pages/AssetDialog';
import type { Workspace } from '../../src/pages/asset-model';
import '../../src/i18n/i18n';
import '../../src/index.css';
import '../../src/pages/asset-workspace.css';
import '../../src/pages/funnel-polish.css';

const form = createPageAsset('form', 'Mode retention form');
// An advanced layout can put the form inside a container after other content.
const canonical = form.document.pages[0].sections[0];
const funnel = createPageAsset('funnel', 'Custom step fixture');
form.document.pages[0].sections = [{ ...canonical, id: 'container', type: 'Section', content: {}, children: [[canonical]] }];
function Harness() {
  const [workspace, setWorkspace] = useState<Workspace>({ assets: [form, funnel], domains: [] });
  const [document, setDocument] = useState(() => createBuilderDocument('funnel', 'Step fixture', ''));
  const picker = new URLSearchParams(location.search).has('picker');
  const steps = new URLSearchParams(location.search).has('steps');
  return <Provider store={store}><MemoryRouter><div className="aw-workspace">
    {steps ? <AssetDialog dialog={{ type: 'add', assetId: funnel.id }} kind="funnel" section="funnels" workspace={workspace} setWorkspace={async update => { setWorkspace(update); }}
      updateAsset={async (id, update) => { setWorkspace(current => { const next = { ...current, assets: current.assets.map(asset => asset.id === id ? update(asset) : asset) }; (window as any).__document = next.assets.find(asset => asset.id === id)?.document; return next; }); }} close={() => {}} go={() => {}} selected={() => {}} /> : picker ? <BuilderWorkspace mode="funnel" document={document} selectedPageId={document.pages[1].id} availableForms={[]}
      onDocumentChange={async next => { setDocument(next); (window as any).__document = next; }}
      onCreateForm={connect => { (window as any).__created = true; connect(form); }} /> :
      <FormsWorkspace initialSelected={form.id} workspace={workspace} save={async update => { setWorkspace(current => { const next = update(current); (window as any).__workspace = next; return next; }); }} go={() => {}} />}
  </div></MemoryRouter></Provider>;
}
createRoot(document.getElementById('root')!).render(<Harness />);
