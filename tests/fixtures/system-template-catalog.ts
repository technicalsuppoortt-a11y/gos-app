import { useSyncExternalStore } from 'react';
import { useUILanguage } from '../../src/i18n/display';
import { localizeManagedTemplate } from '../../src/pages/admin/managed-template';
import source from '../../functions/seed-data/system-templates.json';
const listeners = new Set<() => void>();
const designs = (window as Window & { __seedTemplateDesigns?: Record<string, object> }).__seedTemplateDesigns || {};
let templates: any[] = structuredClone(source).map(item => ({ ...item, ...designs[item.id] })), revision = 0;
const publish = () => { revision++; listeners.forEach(fn => fn()); };
const observe = () => useSyncExternalStore(fn => { listeners.add(fn); return () => listeners.delete(fn); }, () => revision);
(window as any).__systemCatalog = { rows: () => templates, hide: (id: string) => { templates = templates.map(t => t.id === id ? { ...t, active: false, status: 'Draft' } : t); publish(); }, translate: (id: string, fields: object) => { templates = templates.map(t => t.id === id ? { ...t, ...fields } : t); publish(); }, remove: (id: string) => { templates = templates.filter(t => t.id !== id); publish(); } };
export function useTemplateCatalogState(language?: string, selection?: { id: string; source: string | null }) {
  observe();
  const uiLanguage = useUILanguage();
  const matches = templates.filter(t => t.active !== false && t.status !== 'Draft' && (!selection || (t.id === selection.id && selection.source !== 'admin')));
  return { templates: matches.map(t => ({ ...localizeManagedTemplate(t, (language || uiLanguage).startsWith('ar')), previewSource: 'catalog' })), loading: false, error: '' };
}
export function useManagedTemplatePreview(id: string, source: string | null) {
  observe();
  return { key: JSON.stringify([id, source]), template: templates.find(t => t.id === id && (source === 'admin' ? t.ownerUid === 'fixture' : !t.ownerUid)), loading: false, error: '' };
}
export function useTemplateCatalog() { return useTemplateCatalogState().templates; }
export function useAdminManagement() { observe(); return { templates, records: [], users: {}, tenants: {}, sourceErrors: {}, loading: false, error: '' }; }
export function useTemplateLibrary(scope?: string | null) { observe(); return { templates: templates.filter(t => scope === 'mine' ? t.ownerUid === 'fixture' : scope === 'client' ? !!t.ownerUid : !t.ownerUid), hidden: [], loading: false, error: '' }; }
export async function saveManagedTemplate(template: any) { templates = [...templates.filter(t => t.id !== template.id), structuredClone(template)]; publish(); }
export async function deleteManagedTemplate(id: string) { templates = templates.filter(t => t.id !== id); publish(); }
export async function saveAdminTemplate(template: any) { return saveManagedTemplate({ ...template, ownerUid: 'fixture' }); }
export async function deleteAdminTemplate(id: string) { return deleteManagedTemplate(id); }
export async function setGeneralTemplateHidden() {}
export async function duplicateToMyTemplates() {}
export async function uploadTemplateThumbnail() { return ''; }
