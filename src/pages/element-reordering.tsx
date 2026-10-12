import React from 'react';
import type {ReactNode,ReactElement} from 'react';
import type {BuilderSection} from './BuilderWorkspace';
import {elementParts} from './composite-elements';
import {changeSection,findSection,moveSection} from './funnel-tree';

export function partOrder(item:BuilderSection):string[] {
  const defaults=elementParts(item).map(part=>part.id.split('::')[1]).filter(part=>['title','body','button'].includes(part)&&!(part==='button'&&['Form','Contact Form'].includes(item.type)));
  try {const saved:unknown=JSON.parse(item.content.partOrder||'[]');if(Array.isArray(saved))return [...new Set([...saved.filter(part=>defaults.includes(part)),...defaults])];}catch{/* Use the original order. */}
  return defaults;
}
function siblings(sections:BuilderSection[],id:string,parentId?:string,column?:number):{items:BuilderSection[];parentId?:string;column?:number}|undefined {
  if(sections.some(item=>item.id===id))return {items:sections,parentId,column};
  for(const section of sections)for(const [index,children]of (section.children??[]).entries()){const found=siblings(children,id,section.id,index);if(found)return found;}
}
export function canReorderElement(sections:BuilderSection[],id:string|null,step:-1|1):boolean {
  if(!id)return false;
  const [owner,part]=id.split('::');
  if(part){const parent=findSection(sections,owner);if(!parent)return false;const order=partOrder(parent),index=order.indexOf(part);return index>=0&&index+step>=0&&index+step<order.length;}
  const group=siblings(sections,id),index=group?.items.findIndex(item=>item.id===id)??-1;
  return !!group&&index+step>=0&&index+step<group.items.length;
}
export function reorderElement(sections:BuilderSection[],id:string,step:-1|1):BuilderSection[] {
  if(!canReorderElement(sections,id,step))return sections;
  const [owner,part]=id.split('::');
  if(part)return changeSection(sections,owner,parent=>{const order=partOrder(parent),index=order.indexOf(part);[order[index],order[index+step]]=[order[index+step],order[index]];return [{...parent,content:{...parent.content,partOrder:JSON.stringify(order)}}];});
  const group=siblings(sections,id)!,index=group.items.findIndex(item=>item.id===id);
  return moveSection(sections,id,{parentId:group.parentId,column:group.column,beforeId:step===-1?group.items[index-1].id:group.items[index+2]?.id});
}
// Sort semantic field elements at their existing sibling positions, including CTA wrappers.
export function orderedCompositeOutput(item:BuilderSection,output:ReactNode):ReactNode {
  if(!item.content.partOrder)return output;
  const order=partOrder(item);
  const marker=(node:ReactNode):string|undefined=>{
    if(!React.isValidElement(node))return;
    const props=node.props as {item?:BuilderSection;part?:string;children?:ReactNode;'data-element-part'?:string};
    if(props.item?.id===item.id&&props.part&&order.includes(props.part))return props.part;
    const explicit=props['data-element-part']?.split('::');
    if(explicit?.[0]===item.id&&order.includes(explicit[1]))return explicit[1];
    const markers=[...new Set(React.Children.toArray(props.children).map(marker).filter((part):part is string=>!!part))];
    return markers.length===1?markers[0]:undefined;
  };
  const visit=(node:ReactNode):ReactNode=>{
    if(Array.isArray(node))return sort(node.map(visit));
    if(!React.isValidElement(node))return node;
    const props=node.props as {children?:ReactNode};
    if(props.children===undefined)return node;
    return React.cloneElement(node as ReactElement<{children?:ReactNode}>,{children:sort(React.Children.toArray(props.children).map(visit))});
  };
  const sort=(children:ReactNode[])=>{const positions=children.map((child,index)=>marker(child)?index:-1).filter(index=>index>=0);const sorted=positions.map(index=>children[index]).sort((a,b)=>order.indexOf(marker(a)!)-order.indexOf(marker(b)!));const result=[...children];positions.forEach((index,i)=>{result[index]=sorted[i];});return result;};
  return visit(output);
}
export function OrderedElementParts({item,children}:{item:BuilderSection;children:ReactNode}) {return <>{orderedCompositeOutput(item,children)}</>;}
