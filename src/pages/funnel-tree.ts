import type { BuilderSection } from './BuilderWorkspace';
export type DropTarget = { parentId?: string; column?: number; beforeId?: string };
export function findSection(sections: BuilderSection[],id:string|null):BuilderSection|undefined {
 for(const section of sections){if(section.id===id)return section;for(const column of section.children??[]){const found=findSection(column,id);if(found)return found;}}return undefined;
}
export function changeSection(sections:BuilderSection[],id:string,change:(section:BuilderSection)=>BuilderSection[]):BuilderSection[]{
 return sections.flatMap(section=>section.id===id?change(section):{...section,...(section.children?{children:section.children.map(column=>changeSection(column,id,change))}:{})});
}
export function insertSection(sections:BuilderSection[],block:BuilderSection,target:DropTarget):BuilderSection[]{
 const insert=(items:BuilderSection[])=>{const result=[...items],index=target.beforeId?result.findIndex(item=>item.id===target.beforeId):result.length;result.splice(index<0?result.length:index,0,block);return result;};
 if(!target.parentId)return insert(sections);
 return changeSection(sections,target.parentId,parent=>{const count=parent.content.columnLayout?.startsWith('3')?3:parent.content.columnLayout?.startsWith('1')?1:2;const children=Array.from({length:count},(_,index)=>parent.children?.[index]??[]);const column=Math.min(count-1,Math.max(0,target.column??0));children[column]=insert(children[column]);return [{...parent,children}];});
}
export function moveSection(sections:BuilderSection[],id:string,target:DropTarget):BuilderSection[]{
 const block=findSection(sections,id);if(!block||id===target.beforeId||id===target.parentId||target.parentId&&findSection(block.children?.flat()??[],target.parentId))return sections;
 return insertSection(changeSection(sections,id,()=>[]),block,target);
}
