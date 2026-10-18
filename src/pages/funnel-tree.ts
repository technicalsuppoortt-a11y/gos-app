import { columnCount } from './element-properties';
import { changePart, partElement } from './composite-elements';
import type { ElementPart } from './composite-elements';
import type { BuilderSection } from './BuilderWorkspace';
export type DropTarget = { parentId?: string; column?: number; beforeId?: string };
const isSectionContainer = (section: BuilderSection) => section.type === 'Section' || section.type === 'Columns';
/** Insert into a selected container, or beside a selected child in its own container. */
export function sectionPlacement(sections: BuilderSection[], selectedId: string | null, parentId?: string, column?: number): DropTarget | undefined {
 for (const section of sections) {
  if (section.id === selectedId) return isSectionContainer(section) ? { parentId: section.id, column: 0 } : { parentId, column };
  for (const [index, children] of (section.children ?? []).entries()) {
   const target = sectionPlacement(children, selectedId, section.id, index);
   if (target) return target;
  }
 }
 return undefined;
}
export function findSection(sections: BuilderSection[],id:string|null):BuilderSection|undefined {
 if(id?.includes('::')){const [parentId,part]=id.split('::');const parent=findSection(sections,parentId);return parent?partElement(parent,part as ElementPart):undefined;}
 for(const section of sections){if(section.id===id)return section;for(const column of section.children??[]){const found=findSection(column,id);if(found)return found;}}return undefined;
}
export function changeSection(sections:BuilderSection[],id:string,change:(section:BuilderSection)=>BuilderSection[]):BuilderSection[]{
 if(id.includes('::')){const [parentId,part]=id.split('::');return changeSection(sections,parentId,parent=>[changePart(parent,part as ElementPart,change)]);}
 return sections.flatMap(section=>section.id===id?change(section):{...section,...(section.children?{children:section.children.map(column=>changeSection(column,id,change))}:{})});
}
export function insertSection(sections:BuilderSection[],block:BuilderSection,target:DropTarget):BuilderSection[]{
 const insert=(items:BuilderSection[])=>{const result=[...items],index=target.beforeId?result.findIndex(item=>item.id===target.beforeId):result.length;result.splice(index<0?result.length:index,0,block);return result;};
 if(!target.parentId)return insert(sections);
 const parent = findSection(sections, target.parentId);
 if (!parent || !isSectionContainer(parent)) return sections;
 return changeSection(sections,target.parentId,parent=>{const count=columnCount(parent);const children=Array.from({length:count},(_,index)=>parent.children?.[index]??[]);const column=Math.min(count-1,Math.max(0,target.column??0));children[column]=insert(children[column]);return [{...parent,children}];});
}
export function moveSection(sections:BuilderSection[],id:string,target:DropTarget):BuilderSection[]{
 const block=findSection(sections,id);if(!block||id===target.beforeId||id===target.parentId||target.parentId&&findSection(block.children?.flat()??[],target.parentId))return sections;
 if (target.parentId) { const parent = findSection(sections, target.parentId); if (!parent || !isSectionContainer(parent)) return sections; }
 return insertSection(changeSection(sections,id,()=>[]),block,target);
}
