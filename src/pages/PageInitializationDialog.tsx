import {useState} from 'react';
import {ArrowRight,File,LayoutGrid} from 'lucide-react';
import {Modal} from './settings/kit';
import {createPageAsset} from './page-templates';
import {PageTemplateLibrary} from './PageTemplateLibrary';
import type {PageTemplate} from './page-templates';
import type {Asset,BuilderMode} from './asset-model';
import './pagefly-editor.css';
export function PageInitializationDialog({kind,close,create}:{kind:BuilderMode;close:()=>void;create:(asset:Asset)=>void}) {
  const [choice,setChoice]=useState<'blank'|'template'>('blank');
  const [name,setName]=useState('');
  const install=(template?:PageTemplate)=>create(createPageAsset(kind,name,template));
  return <Modal title="Create a new page" close={close}><div className="pf-initialization"><p>Start fresh or choose a professionally designed template.</p><label className="pf-page-name">{kind==='funnel'?'Funnel name':'Page name'}<input maxLength={100} value={name} onChange={e=>setName(e.target.value)} placeholder={kind==='funnel'?'Untitled funnel':'Untitled page'}/></label><div className="pf-start-options" role="tablist" aria-label="Page starting point"><button role="tab" aria-label="Blank page" aria-selected={choice==='blank'} className={choice==='blank'?'selected':''} onClick={()=>setChoice('blank')}><File size={24}/><b>Blank page</b><span>Build from a clean canvas.</span></button><button role="tab" aria-label="Template" aria-selected={choice==='template'} className={choice==='template'?'selected':''} onClick={()=>setChoice('template')}><LayoutGrid size={24}/><b>Template</b><span>Start with a ready-to-edit design.</span></button></div>{choice==='blank'?<footer><button className="aw-secondary" onClick={close}>Cancel</button><button className="aw-primary" onClick={()=>install()}>Create blank page <ArrowRight size={14}/></button></footer>:<PageTemplateLibrary initialCategory={kind==='funnel'?'Funnels':'Websites'} install={install}/>}</div></Modal>;
}
