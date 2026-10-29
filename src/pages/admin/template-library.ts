import { storageGet, storageSet } from '../../utils/browserStorage';
import { pageTemplates, type PageTemplate } from '../page-template-data';
import { legacyWebTemplateRows, seedRows, templateCategories, type RecordRow } from './catalog';
import { MASTER_TEMPLATES, systemAssetCategory, type Template } from '../system-template-data';

const key = 'gos.system.templates.v2';
export const isWebTemplate = (row: RecordRow) => ['Funnel', 'Website', 'Form'].includes(row.category);
function storedRows(key: string): RecordRow[] | null {
 try {
  const rows = JSON.parse(storageGet(key) ?? 'null');
  if (Array.isArray(rows) && rows.every(row => row && typeof row.id === 'string' && typeof row.name === 'string' && typeof row.status === 'string')) return rows;
 } catch { /* Recover from malformed storage. */ }
 return null;
}
export function readSystemTemplates(): RecordRow[] {
 const saved = storedRows(key);
 if (saved) return saved;
 const legacy = [
  ...(storedRows('gos.admin.v1.templates.0') ?? seedRows('templates', 0)),
  ...(storedRows('gos.admin.v1.funnels-websites.1') ?? legacyWebTemplateRows),
 ];
 const defaults: RecordRow[] = pageTemplates.map(template => ({
  id: `system-page-${template.id}`, name: template.name, tenant: 'Platform', status: 'Published',
  category: template.mode === 'funnel' ? 'Funnel' : template.mode === 'form' ? 'Form' : 'Website', content: template.body, pageTemplateId: template.id,
 }));
 const masters: RecordRow[] = MASTER_TEMPLATES.map(template => ({id:`system-${template.id}`,name:template.name,tenant:'Platform',status:'Published',category:systemAssetCategory(template),content:JSON.stringify(template.content,null,2),blueprintId:template.id}));
 const rows: RecordRow[] = [...legacy, ...defaults, ...masters].map(row => ({ ...row, tenant: 'Platform', category: row.category === 'AI Prompt' ? 'AI Assistant' : row.category }));
 for (const category of templateCategories) {
  if (!rows.some(row => row.category === category)) rows.push({id:`system-${category.toLowerCase().replaceAll(' ','-')}`, name:`${category} starter`, tenant:'Platform', status:'Draft', category, content:''});
 }
 storageSet(key, JSON.stringify(rows));
 return rows;
}
export function saveSystemTemplates(rows: RecordRow[]): boolean {
 if (rows.some(row => !templateCategories.includes(row.category) || !['Published','Draft'].includes(row.status))) return false;
 return storageSet(key, JSON.stringify(rows.map(row => ({...row, tenant:'Platform'}))));
}
export function publishedSystemTemplates(category?: string): RecordRow[] {
 return readSystemTemplates().filter(row => row.status === 'Published' && (!category || row.category === category));
}
export function publishedWorkspaceTemplates(): Template[] {
 return publishedSystemTemplates().map(row => {
  const base = MASTER_TEMPLATES.find(template=>template.id===row.blueprintId) ?? MASTER_TEMPLATES.find(template=>systemAssetCategory(template)===row.category)!;
  let content = {...structuredClone(base.content), headline:row.content || row.name};
  try {
   const parsed=JSON.parse(row.content);
   if(typeof parsed.headline==='string' && Array.isArray(parsed.steps) && parsed.steps.every((step:unknown)=>typeof step==='string') && typeof parsed.settings?.enabled==='boolean' && typeof parsed.settings.language==='string') content=parsed;
  } catch { /* Plain text is valid template content. */ }
  return {...base,id:row.id,name:row.name,description:row.blueprintId?base.description:row.content,source:'official',content};
 });
}
/** Published defaults are consumed by tenant galleries; drafts never appear there. */
export function publishedPageTemplates(): PageTemplate[] {
 return publishedSystemTemplates().filter(isWebTemplate).map(row => {
  const mode = row.category === 'Funnel' ? 'funnel' : row.category === 'Form' ? 'form' : 'website';
  const base = pageTemplates.find(template => template.id === row.pageTemplateId) ?? pageTemplates.find(template => template.mode === mode)!;
  let body=row.content || base.body;
  try {const content=JSON.parse(body);if(typeof content.headline==='string')body=content.headline;} catch { /* Plain text content. */ }
  return {...base, id:row.pageTemplateId || row.id, mode, name:row.name, title:row.name===base.name?base.title:row.name, body};
 });
}
