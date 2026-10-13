import { useUILanguage, localizeNode, translateText } from '../i18n/display';
import {elementParts} from './composite-elements';
import {elementLabel} from './element-properties';
import { useState } from 'react';
import { ChevronDown, ChevronRight, Columns2, FileText, Layers, Plus, Search } from 'lucide-react';
import type { BuilderPage, BuilderSection } from './BuilderWorkspace';
import type { DropTarget } from './funnel-tree';

export function PageContentTree({ page, selected, select, add, drop }: { page: BuilderPage; selected: string | null; select: (id: string) => void; add: () => void; drop: (event: React.DragEvent, target: DropTarget) => void }) {
  useUILanguage();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const toggle = (id: string) => setCollapsed(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const matches = (item: BuilderSection): boolean => `${item.type} ${elementLabel(item)} ${item.content.title || ''}`.toLowerCase().includes(query.toLowerCase()) || elementParts(item).some(matches) || Boolean(item.children?.some(column => column.some(matches)));
  const render = (items: BuilderSection[], depth = 0, parentId?: string, column?: number): React.ReactNode => items.filter(matches).map(item => <div key={item.id} role="treeitem" aria-selected={selected === item.id} aria-expanded={item.children ? !collapsed.has(item.id) : undefined}>
    <div className={'pf-tree-row' + (selected === item.id ? ' selected' : '')} style={{ paddingInlineStart: 8 + depth * 13 }} onDragOver={event => { if (event.dataTransfer.types.some(type => type === 'text/gos-block' || type === 'text/gos-section')) { event.preventDefault(); event.stopPropagation(); } }} onDrop={event => { event.preventDefault(); event.stopPropagation(); drop(event, { parentId, column, beforeId: item.id.split('::')[0] }); }}>
      {localizeNode(item.children || elementParts(item).length ? <button aria-label={translateText((collapsed.has(item.id) ? 'Expand ' : 'Collapse ') + elementLabel(item))} onClick={() => toggle(item.id)}>{localizeNode(collapsed.has(item.id) ? <ChevronRight size={11}/> : <ChevronDown size={11}/>)}</button> : <span className="pf-tree-indent"/>)}
      <button className="pf-tree-select" draggable={!item.id.includes('::')} onDragStart={event => { event.dataTransfer.setData('text/gos-section', item.id); event.dataTransfer.effectAllowed = 'move'; }} onClick={() => select(item.id)} title={translateText(elementLabel(item))}>{localizeNode(item.type === 'Columns' ? <Columns2 size={12}/> : ['Section', 'Hero'].includes(item.type) ? <Layers size={12}/> : <FileText size={12}/>)}<span>{localizeNode(elementLabel(item,item.type === 'Columns' ? 'Flex block' : item.type === 'Section' ? 'Flex section' : item.type))}</span></button>
    </div>
    {localizeNode(elementParts(item).length>0 && (!collapsed.has(item.id)||query) && <div role="group">{localizeNode(render(elementParts(item),depth+1,parentId,column))}</div>)}
    {localizeNode(item.children && (!collapsed.has(item.id) || query) && <div role="group">{localizeNode(item.children.map((children, index) => <div key={index}><div className="pf-tree-column" style={{ paddingInlineStart: 23 + depth * 13 }}>{translateText("Column ")}{localizeNode(index + 1)}</div>{localizeNode(render(children, depth + 2, item.id, index))}<div className="pf-tree-drop" style={{ marginInlineStart: 23 + depth * 13 }} onDragOver={event => { event.preventDefault(); event.stopPropagation(); }} onDrop={event => { event.preventDefault(); event.stopPropagation(); drop(event, { parentId: item.id, column: index }); }}>{translateText("Drop element here")}</div></div>))}</div>)}
  </div>);
  return <div className="pf-content-tree"><label className="pf-tree-search"><Search size={12}/><input aria-label={translateText("Search page content")} placeholder={translateText("Search page content")} value={query} onChange={event => setQuery(event.target.value)}/></label><div className="pf-body-label"><Layers size={12}/>{translateText("Page body")}</div><div role="tree" aria-label={translateText("Page content")}>{localizeNode(render(page.sections))}</div>{localizeNode(!page.sections.length && <p className="pf-empty-copy">{translateText("Your page is empty. Add a section or drag an element onto the canvas.")}</p>)}<button className="pf-add-section" onClick={add}><Plus size={12}/>{translateText("Add section")}</button><div className="pf-tree-theme">{translateText("Header ")}<span>{localizeNode(page.showHeader ? page.header : 'Hidden')}</span></div><div className="pf-tree-theme">{translateText("Footer ")}<span>{localizeNode(page.showFooter ? page.footer : 'Hidden')}</span></div></div>;
}
