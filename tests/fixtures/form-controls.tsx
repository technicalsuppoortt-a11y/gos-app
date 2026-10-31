import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { useState } from 'react';
import { store } from '../../src/store';
import { BuilderWorkspace } from '../../src/pages/BuilderWorkspace';
import { createPageAsset } from '../../src/pages/page-templates';
import { pageTemplates } from '../../src/pages/page-template-data';
import { PageTemplateLibrary } from '../../src/pages/PageTemplateLibrary';
import { FunnelBuilder } from '../../src/pages/FunnelBuilder';
import { FormsWorkspace } from '../../src/pages/FormsWorkspace';
import { PublishedPage } from '../../src/pages/PublishedPage';
import type { Workspace } from '../../src/pages/asset-model';
import '../../src/i18n/i18n';
import '../../src/index.css';
import '../../src/pages/asset-workspace.css';
import '../../src/theme-controls.css';
import '../../src/light-contrast.css';
import '../../src/control-polish.css';
const form = createPageAsset('form','Workspace inquiry');
form.id = 'theme-form';
form.document.funnel.status = 'Published';
form.publishedUrl = 'https://form-fixture.web.app';
const draftForm = createPageAsset('form', 'Draft inquiry');
const archivedForm = { ...structuredClone(form), id: 'archived-form', name: 'Archived inquiry', archived: true };
// Persisted catalogs can still supply the same legacy photo for every form.
pageTemplates.filter(template => template.mode === 'form').forEach(template => { template.image = '/dashboard/product-consultation.png'; });
const target = createPageAsset('website','Embed test');
target.document.pages[0].sections = [{ id:'embed-form',type:'Form',content:{title:'Form',fields:'["Name","Email"]',button:'Send'},styles:{backgroundColor:'#fff',padding:'24',textAlign:'Left',typography:'Default',customCss:'',visibility:'All devices',animation:'None'} }];
function Fixture() {
 const [view,setView] = useState('templates');
 return <div className="layout-dashboard-shell aw-workspace"><button onClick={()=>setView('builder')}>Open embed builder</button><button onClick={()=>document.documentElement.classList.toggle('dark')}>Toggle theme</button>{view==='templates'?<PageTemplateLibrary initialCategory="Forms" install={()=>{}}/>:<BuilderWorkspace mode="website" document={target.document} selectedPageId={target.document.pages[0].id} availableForms={[form,draftForm,archivedForm]} onDocumentChange={document=>{(window as any).__document = document;}}/>}<output hidden>{pageTemplates.length}</output></div>;
}
function ThemeFixture() {
 const [workspace, setWorkspace] = useState<Workspace>({assets:[structuredClone(form)], domains:[]});
 const asset = workspace.assets[0];
 return <div className="layout-dashboard-shell aw-workspace"><FormsWorkspace workspace={workspace} save={async update => { setWorkspace(update); }} go={()=>{}}/><PublishedPage asset={asset} pageId={asset.document.pages[0].id}/></div>;
}
createRoot(document.getElementById('root')!).render(<Provider store={store}><MemoryRouter initialEntries={['/dashboard/funnels?tab=templates&sub=forms']}>{new URLSearchParams(location.search).has('theme') ? <ThemeFixture/> : new URLSearchParams(location.search).has('gallery') ? <FunnelBuilder/> : <Fixture/>}</MemoryRouter></Provider>);
