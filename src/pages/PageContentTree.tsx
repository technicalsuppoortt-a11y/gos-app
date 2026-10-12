import {elementParts} from './composite-elements';
import {elementLabel} from './element-properties';
import { useState } from 'react';
import { ChevronDown, ChevronRight, Columns2, FileText, Layers, Plus, Search } from 'lucide-react';
import type { BuilderPage, BuilderSection } from './BuilderWorkspace';
import type { DropTarget } from './funnel-tree';

export function PageContentTree({ page, selected, select, add, drop }: { page: BuilderPage; selected: string | null; select: (id: string) => void; add: () => void; drop: (event: React.DragEvent, target: DropTarget) => void }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const toggle = (id: string) => setCollapsed(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const matches = (item: BuilderSection): boolean => `${item.type} ${elementLabel(item)} ${item.content.title || ''}`.toLowerCase().includes(query.toLowerCase()) || elementParts(item).some(matches) || Boolean(item.children?.some(column => column.some(matches)));
  const render = (items: BuilderSection[], depth = 0, parentId?: string, column?: number): React.ReactNode => items.filter(matches).map(item => <div key={item.id} role="treeitem" aria-selected={selected === item.id} aria-expanded={item.children ? !collapsed.has(item.id) : undefined}>
    <div className={'pf-tree-row' + (selected === item.id ? ' selected' : '')} style={{ paddingLeft: 8 + depth * 13 }} onDragOver={event => { if (event.dataTransfer.types.some(type => type === 'text/gos-block' || type === 'text/gos-section')) { event.preventDefault(); event.stopPropagation(); } }} onDrop={event => { event.preventDefault(); event.stopPropagation(); drop(event, { parentId, column, beforeId: item.id.split('::')[0] }); }}>
      {item.children || elementParts(item).length ? <button aria-label={(collapsed.has(item.id) ? 'Expand ' : 'Collapse ') + elementLabel(item)} onClick={() => toggle(item.id)}>{collapsed.has(item.id) ? <ChevronRight size={11}/> : <ChevronDown size={11}/>}</button> : <span className="pf-tree-indent"/>}
      <button className="pf-tree-select" draggable={!item.id.includes('::')} onDragStart={event => { event.dataTransfer.setData('text/gos-section', item.id); event.dataTransfer.effectAllowed = 'move'; }} onClick={() => select(item.id)} title={elementLabel(item)}>{item.type === 'Columns' ? <Columns2 size={12}/> : ['Section', 'Hero'].includes(item.type) ? <Layers size={12}/> : <FileText size={12}/>}<span>{elementLabel(item,item.type === 'Columns' ? 'Flex block' : item.type === 'Section' ? 'Flex section' : item.type)}</span></button>
    </div>
    {elementParts(item).length>0 && (!collapsed.has(item.id)||query) && <div role="group">{render(elementParts(item),depth+1,parentId,column)}</div>}
    {item.children && (!collapsed.has(item.id) || query) && <div role="group">{item.children.map((children, index) => <div key={index}><div className="pf-tree-column" style={{ paddingLeft: 23 + depth * 13 }}>Column {index + 1}</div>{render(children, depth + 2, item.id, index)}<div className="pf-tree-drop" style={{ marginLeft: 23 + depth * 13 }} onDragOver={event => { event.preventDefault(); event.stopPropagation(); }} onDrop={event => { event.preventDefault(); event.stopPropagation(); drop(event, { parentId: item.id, column: index }); }}>Drop element here</div></div>)}</div>}
  </div>);
  return <div className="pf-content-tree"><label className="pf-tree-search"><Search size={12}/><input aria-label="Search page content" placeholder="Search page content" value={query} onChange={event => setQuery(event.target.value)}/></label><div className="pf-body-label"><Layers size={12}/>Page body</div><div role="tree" aria-label="Page content">{render(page.sections)}</div>{!page.sections.length && <p className="pf-empty-copy">Your page is empty. Add a section or drag an element onto the canvas.</p>}<button className="pf-add-section" onClick={add}><Plus size={12}/>Add section</button><div className="pf-tree-theme">Header <span>{page.showHeader ? page.header : 'Hidden'}</span></div><div className="pf-tree-theme">Footer <span>{page.showFooter ? page.footer : 'Hidden'}</span></div></div>;
}
