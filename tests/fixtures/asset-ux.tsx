import { PageTemplateCards } from '../../src/pages/PageTemplateLibrary';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { store } from '../../src/store';
import { AssetAsyncButton } from '../../src/pages/AssetAsyncButton';
import { AssetStandalonePreview } from '../../src/pages/AssetStandalonePreview';
import { PublishedAssetLink } from '../../src/pages/PublishedAssetLink';
import { createPageAsset } from '../../src/pages/page-templates';
import { pageTemplates } from '../../src/pages/page-templates';
import '../../src/i18n/i18n';
import '../../src/index.css';
import '../../src/pages/asset-workspace.css';

const asset = createPageAsset('website', 'Preview UX fixture', pageTemplates.find(template => template.mode === 'website'));
asset.publishedUrl = 'https://published-fixture.web.app';
asset.document.pages[0].sections[0].content.title = 'Exact visitor content';
const next = structuredClone(asset.document.pages[0]);
next.id = 'thanks'; next.name = 'Thanks'; next.path = '/thanks';
next.sections[0].content.title = 'Second visitor page';
asset.document.pages.push(next);
asset.settings.navigation = asset.document.pages[0].name + ', Thanks';
asset.document.pages[0].showHeader = true;

function Builder() {
  const navigate = useNavigate();
  return <div className="aw-workspace"><aside data-testid="dashboard-sidebar">Workspace sidebar</aside><header data-testid="workspace-header">Workspace header</header>
    <AssetAsyncButton busyText="Publishing..." onClick={async () => {
      (window as any).__publishCount = ((window as any).__publishCount ?? 0) + 1;
      await new Promise(resolve => setTimeout(resolve, 700));
    }}>Publish</AssetAsyncButton>
    <AssetAsyncButton busyText="Saving..." onClick={async () => { throw new Error('Expected fixture failure'); }}>Fail save</AssetAsyncButton>
    <PublishedAssetLink asset={asset}/>
    <PageTemplateCards templates={[pageTemplates[0]]} install={async () => { await new Promise(resolve => setTimeout(resolve, 700)); }}/>
    <button onClick={() => navigate(`/asset-preview/${asset.id}/${asset.document.pages[0].id}`, { state: { asset, returnTo: '/builder' } })}>Preview</button>
  </div>;
}
createRoot(document.getElementById('root')!).render(<Provider store={store}><MemoryRouter initialEntries={['/builder']}><Routes><Route path="/builder" element={<Builder/>}/><Route path="/asset-preview/:assetId/:pageId?" element={<AssetStandalonePreview/>}/></Routes></MemoryRouter></Provider>);
