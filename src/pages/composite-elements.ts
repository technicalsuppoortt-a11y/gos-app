import type { BuilderSection } from './BuilderWorkspace';

export type ElementPart = 'title' | 'body' | 'button' | 'src' | 'image';
const atomic = ['Heading','Paragraph','Text','Image','Button','Columns','Section','Layouts','HTML/Liquid','Tabs','Accordion'];
export function elementParts(item:BuilderSection):BuilderSection[] {
  if(atomic.includes(item.type)) return [];
  const parts:ElementPart[]=[];
  if(item.content.title) parts.push('title');
  if(item.content.body) parts.push('body');
  if(item.content.button) parts.push('button');
  if(item.type==='Hero'||item.content.src) parts.push('src');
  if(item.content.image) parts.push('image');
  let order:string[]=[];
  try {const saved=JSON.parse(item.content.partOrder||'[]');if(Array.isArray(saved))order=saved;}catch{/* Use the original order. */}
  const defaults=[...parts];
  return parts.sort((a,b)=>(order.includes(a)?order.indexOf(a):defaults.length+defaults.indexOf(a))-(order.includes(b)?order.indexOf(b):defaults.length+defaults.indexOf(b))).map(part=>partElement(item,part));
}
export function partElement(item:BuilderSection,part:ElementPart):BuilderSection {
  let saved:Partial<BuilderSection>={};
  try {saved=JSON.parse(item.content['part:'+part]||'{}');} catch { /* Use existing content. */ }
  const type=part==='title'?'Heading':part==='body'?'Paragraph':part==='button'?'Button':'Image';
  return {id:item.id+'::'+part,type,styles:{backgroundColor:'transparent',padding:'0',textAlign:item.styles.textAlign,typography:'Default',customCss:'',visibility:'All devices',animation:'None',...saved.styles},content:{...saved.content,
    ...(part==='title'?{title:item.content.title,headingTag:saved.content?.headingTag || (item.type==='Hero'?'H1':'H2')}:
      part==='body'?{body:item.content.body}:part==='button'?{button:item.content.button,destinationType:saved.content?.destinationType??item.content.destinationType??'Open Booking Modal',destination:saved.content?.destination??item.content.destination??''}:
      {src:item.content[part]??'',alt:saved.content?.alt??item.content.alt??'',aspectRatio:saved.content?.aspectRatio??'Auto'})}};
}
export function changePart(parent:BuilderSection,part:ElementPart,change:(item:BuilderSection)=>BuilderSection[]):BuilderSection {
  const next=change(partElement(parent,part))[0];
  const key=part==='title'?'title':part==='body'?'body':part==='button'?'button':'src';
  return {...parent,content:{...parent.content,[part]:next?.content[key]??'',['part:'+part]:JSON.stringify(next?{content:next.content,styles:next.styles}:{})}};
}
