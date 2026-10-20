import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { store } from '../../src/store';
import { BuilderWorkspace, createBuilderDocument, type BuilderDocument } from '../../src/pages/BuilderWorkspace';
import { encodeFirestoreValue } from '../../src/backend/firestoreCodec';
import { writeBatch, doc } from 'firebase/firestore';
import { db } from '../../src/backend/firebase';
import '../../src/i18n/i18n';
import '../../src/index.css';
import '../../src/pages/asset-workspace.css';
import '../../src/pages/funnel-polish.css';

function Harness() {
  const mode = new URLSearchParams(location.search).get('mode') === 'website' ? 'website' : 'funnel';
  const [document, setDocument] = useState(() => createBuilderDocument(mode, 'Storage resilience fixture', '/pagefly/coach-portrait.png'));
  const [selected, setSelected] = useState(document.pages[0].id);
  const save = async (next: BuilderDocument) => {
    // Exercise Firebase's real serializer, without committing fixture data to a
    // live project. The actual asynchronous write lifecycle is unit-tested.
    writeBatch(db).set(doc(db, 'tenants', 'fixture', 'assets', 'fixture'), encodeFirestoreValue({ id: 'fixture', document: next }));
    setDocument(next);
    (window as any).__lastDocument = structuredClone(next);
    await new Promise(resolve => setTimeout(resolve, 30));
    (window as any).__savedDocument = structuredClone(next);
  };
  return <Provider store={store}><MemoryRouter><div className={'aw-editor-host' + (mode === 'funnel' ? ' fn-focused-editor' : '')} style={{ height: '100vh' }}><BuilderWorkspace key={selected} mode={mode} document={document} selectedPageId={selected} onDocumentChange={save} onStepChange={setSelected}/></div><Toaster/></MemoryRouter></Provider>;
}
createRoot(document.getElementById('root')!).render(<Harness/>);
