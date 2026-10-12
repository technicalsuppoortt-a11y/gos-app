import type { CSSProperties } from 'react';
import type { BuilderSection } from './BuilderWorkspace';

export type ElementItem = { id: string; title: string; body: string };
export function elementLabel(item:BuilderSection,fallback:string=item.type):string {
  return item.content.elementName?.trim() || fallback;
}
export function deviceElement(item:BuilderSection,device:string):BuilderSection {
  try {const saved=JSON.parse(item.content['device:'+device.toLowerCase()]||'{}');return {...item,content:{...item.content,...saved.content},styles:{...item.styles,...saved.styles}};}catch{return item;}
}
export const layoutVariants = ['Blank section', 'Blank block', '1/2 + 1/2', '1/3 + 1/3 + 1/3', '1/4 + 1/4 + 1/4 + 1/4', '1/3 + 2/3'];
export function columnCount(item: BuilderSection) {
  return item.type === 'Section' ? 1 : Number(item.content.columnLayout?.match(/^([1-4])/)?.[1] ?? 2);
}
export function columnGrid(item: BuilderSection) {
  return /30\/70|33\/67/.test(item.content.columnLayout ?? '') ? '1fr 2fr' : `repeat(${columnCount(item)},minmax(0,1fr))`;
}
export function elementHidden(item: BuilderSection, device: string) {
  const visibility = item.styles.visibility;
  return visibility === 'Hidden' || (/only$/.test(visibility) && visibility.toLowerCase() !== `${device} only`) || item.content[`hide_${device}`] === 'true' || (device==='desktop'&&item.content.hide_laptop==='true'&&typeof window!=='undefined'&&window.innerWidth>=1024&&window.innerWidth<1440);
}
export function elementStyle(source: BuilderSection,device='desktop'): CSSProperties {
  const item=deviceElement(source,device);
  if(item.content.enableStyle==='No') return {};
  const c=item.content;
  const length=(value:string|undefined)=>value===undefined||value===''?undefined:/^-?\d+(\.\d+)?$/.test(value)?value+'px':value;
  const scrolling=c.animationScroll&&c.animationScroll!=='None';
  const motion=scrolling?c.animationScroll:c.animationLoad&&c.animationLoad!=='None'?c.animationLoad:c.animationVisible;
  return {
    ...textStyle(item,device),
    ...(c['device:'+device] ? {textAlign:item.styles.textAlign.toLowerCase() as CSSProperties['textAlign'],backgroundColor:item.styles.backgroundColor}:{}),
    width:length(c.width),height:length(c.height),minWidth:length(c.minWidth),maxWidth:length(c.maxWidth),minHeight:length(c.minHeight),maxHeight:length(c.maxHeight),
    marginTop:length(c.marginTop??c.margin),marginRight:length(c.marginRight??c.margin),marginBottom:length(c.marginBottom??c.margin),marginLeft:length(c.marginLeft??c.margin),
    borderStyle:c.borderStyle&&c.borderStyle!=='None'?c.borderStyle as CSSProperties['borderStyle']:undefined,borderWidth:length(c.borderWidth),borderColor:c.borderColor,borderRadius:length(c.borderRadius),
    opacity:c.opacity?Number(c.opacity)/100:undefined,
    boxShadow:c.enableShadow==='true'?`${c.shadowX||0}px ${c.shadowY||4}px ${c.shadowBlur||12}px ${c.shadowSpread||0}px ${c.shadowColor||'#000000'}`:undefined,
    animation:motion==='Fade'?'fb-section-fade .5s ease both':motion==='Rise'?'fb-section-rise .5s ease both':motion==='Zoom'?'pf-zoom .5s ease both':motion==='Slide left'?'pf-slide .5s ease both':undefined,
    ...(scrolling?{animationTimeline:'view()',animationRange:'entry 0% cover 35%'}:{}),
    transition:'transform .2s ease, opacity .2s ease',
    ...({'--pf-hover-transform':c.animationHover==='Grow'?'scale(1.03)':c.animationHover==='Lift'?'translateY(-4px)':'none','--pf-hover-opacity':c.animationHover==='Fade'?'.7':'1','--pf-click-transform':c.animationClick==='Pulse'?'scale(.97)':'none'} as CSSProperties),
    ...(c.backgroundImage||c.backgroundGradient ? {backgroundImage:[c.backgroundGradient,c.backgroundImage?`url("${c.backgroundImage}")`:null].filter(Boolean).join(','),backgroundSize:c.backgroundSize||'cover'} : {}),
    ...(c.paddingTop !== undefined ? {paddingTop:length(c.paddingTop)} : {}),
    ...(c.paddingRight !== undefined ? {paddingRight:length(c.paddingRight)} : {}),
    ...(c.paddingBottom !== undefined ? {paddingBottom:length(c.paddingBottom)} : {}),
    ...(c.paddingLeft !== undefined ? {paddingLeft:length(c.paddingLeft)} : {}),
  };
}
export function textStyle(source: BuilderSection,device='desktop'): CSSProperties {
  const item=deviceElement(source,device);
  if(item.content.enableStyle==='No') return {};
  const c=item.content;
  return {color:c.textColor,fontWeight:c.fontWeight&&c.fontWeight!=='Default'?Number(c.fontWeight):c.bold==='true'?'bold':c.bold==='false'?'normal':undefined,fontStyle:c.italic==='true'?'italic':c.italic==='false'?'normal':undefined,
    fontFamily:c.fontFamily&&c.fontFamily!=='Default'?c.fontFamily:c.globalStyle==='Brand heading'?'var(--fb-heading-font)':c.globalStyle==='Brand body'?'var(--fb-body-font, Inter)':undefined,
    fontSize:c.fontSize?c.fontSize+'px':undefined,lineHeight:c.lineHeight||undefined,letterSpacing:c.letterSpacing?c.letterSpacing+'px':undefined,textTransform:c.textTransform&&c.textTransform!=='None'?c.textTransform as CSSProperties['textTransform']:undefined,
    textDecoration:[c.underline==='true'?'underline':'',c.strikethrough==='true'?'line-through':''].filter(Boolean).join(' ')||undefined};
}
