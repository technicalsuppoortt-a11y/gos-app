import { useUILanguage, localizeNode } from '../i18n/display';
import React, {createContext,useContext} from 'react';
import type {BuilderSection} from './BuilderWorkspace';
import {partElement} from './composite-elements';
import type {ElementPart} from './composite-elements';
import {deviceElement,elementHidden,elementStyle,textStyle} from './element-properties';

export const ElementSelectionContext=createContext<{selected:string|null;select:(id:string)=>void;device:string}|null>(null);
export function EditableElementPart({item,part,tag,children,device='desktop',...props}:{item:BuilderSection;part:ElementPart;tag:string;device?:string;children?:React.ReactNode}&React.HTMLAttributes<HTMLElement>&{src?:string;alt?:string}) {
  useUILanguage();
  const context=useContext(ElementSelectionContext);
  const element=deviceElement(partElement(item,part),context?.device??device);
  const actualTag=part==='title'?element.content.headingTag.toLowerCase():tag;
  return <>{React.createElement(actualTag,{...props,'data-element-part':element.id,'data-element-type':element.type,
    ...(tag==='img'?{src:element.content.src||props.src,alt:element.content.alt||props.alt}:{}),
    id:element.content.trackingId||undefined,
    className:[props.className,element.content.htmlClass,context?.selected===element.id?'pf-part-selected':'',element.styles.animation!=='None'?'anim-'+element.styles.animation.toLowerCase():''].filter(Boolean).join(' '),
    style:{...props.style,...elementStyle(element,context?.device??device),...textStyle(element,context?.device??device),textAlign:element.styles.textAlign.toLowerCase(),...(element.styles.backgroundColor!=='transparent'?{backgroundColor:element.styles.backgroundColor}:{}),display:elementHidden(element,context?.device??device)?'none':props.style?.display},
    onClick:(event:React.MouseEvent<HTMLElement>)=>{if(context){event.stopPropagation();context.select(element.id);}else if(element.content.destinationType==='External URL'&&/^https?:\/\//i.test(element.content.destination||'')){window.open(element.content.destination,'_blank','noopener,noreferrer');}else props.onClick?.(event);},
    onFocus:(event:React.FocusEvent<HTMLElement>)=>{if(context&&event.target===event.currentTarget){event.stopPropagation();context.select(element.id);}props.onFocus?.(event);}
  },children)}{localizeNode(element.styles.customCss&&<style>{`[data-element-part="${element.id}"]{${element.styles.customCss}}`}</style>)}</>;
}
