import { useUILanguage, translateText, localizeNode } from '../i18n/display';
import {useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowDown,ArrowUp,Copy,Settings,Trash2} from 'lucide-react';
import type {BuilderSection} from './BuilderWorkspace';

export function CanvasPartToolbar({selected,label,revision,canUp,canDown,reorder,duplicate,remove,settings}:{selected:string|null;label?:string;revision:BuilderSection[];canUp:boolean;canDown:boolean;reorder:(id:string,step:-1|1)=>void;duplicate:(id:string)=>void;remove:(id:string)=>void;settings:(id:string)=>void}) {
  useUILanguage();
  const toolbar=useRef<HTMLDivElement>(null);
  const [position,setPosition]=useState<{left:number;top:number;type:string}|null>(null);
  useLayoutEffect(()=>{
    if(!selected?.includes('::')){setPosition(null);return;}
    const element=document.querySelector<HTMLElement>(`[data-element-part="${CSS.escape(selected)}"]`);
    const viewport=element?.closest<HTMLElement>('.fb-site-frame');
    if(!element||!viewport){setPosition(null);return;}
    const update=()=>{const bounds=element.getBoundingClientRect(),clip=viewport.getBoundingClientRect();if(bounds.bottom<=clip.top||bounds.top>=clip.bottom||!bounds.width||!bounds.height){setPosition(null);return;}const width=toolbar.current?.offsetWidth||150,height=toolbar.current?.offsetHeight||30;setPosition({left:Math.max(clip.left+4,Math.min(bounds.right-width,clip.right-width-4)),top:bounds.top-height-5>=clip.top?bounds.top-height-5:Math.min(bounds.bottom+5,clip.bottom-height-4),type:element.dataset.elementType||'Element'});};
    update();const observer=new ResizeObserver(update);observer.observe(element);observer.observe(viewport);
    window.addEventListener('scroll',update,true);window.addEventListener('resize',update);
    return()=>{observer.disconnect();window.removeEventListener('scroll',update,true);window.removeEventListener('resize',update);};
  },[selected,label,revision]);
  if(!position||!selected)return null;
  const name=label||position.type;
  return createPortal(<div ref={toolbar} className="pf-part-toolbar" role="toolbar" aria-label={translateText(name+' selection actions')} data-selected-element={selected} style={{left:position.left,top:position.top}} onPointerDown={e=>e.preventDefault()} onClick={e=>e.stopPropagation()}><b title={translateText(name)}>{localizeNode(name)}</b><button aria-label={translateText('Move selected '+name+' up')} disabled={!canUp} onClick={()=>reorder(selected,-1)}><ArrowUp size={13}/></button><button aria-label={translateText('Move selected '+name+' down')} disabled={!canDown} onClick={()=>reorder(selected,1)}><ArrowDown size={13}/></button><button aria-label={translateText('Duplicate selected '+name)} onClick={()=>duplicate(selected)}><Copy size={13}/></button><button aria-label={translateText('Settings for selected '+name)} onClick={()=>settings(selected)}><Settings size={13}/></button><button aria-label={translateText('Delete selected '+name)} onClick={()=>remove(selected)}><Trash2 size={13}/></button></div>,document.body);
}
