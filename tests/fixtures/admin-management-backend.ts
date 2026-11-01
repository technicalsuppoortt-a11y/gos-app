import { useSyncExternalStore } from 'react';
import { createBuilderDocument } from '../../src/pages/BuilderWorkspace';
const subscribers = new Set<() => void>();
let templates: any[] = [{ id: 'master', name: 'Production template', category: 'Funnels', industry: 'Fitness/Coaching', goal: 'Lead Generation', description: 'Turn new visitors into booked discovery calls with a focused experience.', source: 'official', tags: [], color: '#7C3AED', updated: '2026-11-01', popularity: 0, active: true, status: 'Published', content: { headline: 'A better first impression', steps: ['Welcome', 'Discover your offer', 'Book a call'], settings: { enabled: false, language: 'en' } } }];
let revision = 0, name = 'Production asset', error = '', extra = 0;
const publish = () => { revision++; subscribers.forEach(fn => fn()); };
(window as any).__adminLive = {
  updateName: () => { name = 'Updated production asset'; publish(); },
  fail: () => { error = 'Permission denied'; publish(); },
  grow: () => { extra = 23; publish(); },
};
const tenants = { a: { name: 'Workspace Alpha', ownerUid: 'owner' }, b: { name: 'Workspace Beta', ownerUid: 'second' } };
const document = createBuilderDocument('website', 'Production asset', '', 2);
document.pages[0].headline = 'A precise preview of your saved design';
document.pages[0].sections[0].content.title = 'A precise preview of your saved design';
document.pages[1].name = 'About the team';
export function useAdminManagement(resources: string[], isTemplates: boolean) {
  useSyncExternalStore(fn => { subscribers.add(fn); return () => subscribers.delete(fn); }, () => revision);
  const records = resources.flatMap(resource => ['a', 'b'].flatMap(workspaceId => {
    const data: any = {
      name: resource === 'assets' ? name : resource === 'pipelines' ? 'Sales pipeline' : resource === 'calendars' ? 'Discovery calendar' : `${resource} record`,
      description: 'A live workspace record ready for a closer look.', kind: 'website', pipelineId: 'main', lifecycleStage: 'QUALIFIED',
      source: workspaceId === 'a' ? 'Website' : 'Instagram', email: 'lead@example.com', type: 'Course',
      config: { amount: 299, currency: 'EGP' }, status: resource === 'products' ? 'Active' : 'Confirmed', active: true,
      hostName: 'Calendar host', calendarId: 'shared-id', date: '2026-11-01', time: '14:00', duration: 30, hostTimezone: 'Africa/Cairo',
      document: { ...document, funnel: { ...document.funnel, status: workspaceId === 'a' ? 'Published' : 'Draft' } },
      stages: resource === 'pipelines' ? [{ id: 'new', label: 'New lead' }, { id: 'qualified', label: 'Qualified' }] : undefined,
    };
    const id = resource === 'pipelines' ? 'main' : 'shared-id';
    const result = [{ id, workspaceId, path: `tenants/${workspaceId}/${resource}/${id}`, data }];
    if (resource === 'assets') {
      result.push({ id: 'form', workspaceId, path: `tenants/${workspaceId}/assets/form`, data: { ...data, name: 'Contact form', formAsset: true, kind: 'website' } });
      result.push({ id: 'funnel', workspaceId, path: `tenants/${workspaceId}/assets/funnel`, data: { ...data, name: 'Lead generation funnel', kind: 'funnel' } });
    }
    if (workspaceId === 'a' && resource === resources[0]) for (let i = 0; i < extra; i++) result.push({ id: `extra-${i}`, workspaceId, path: `tenants/a/${resource}/extra-${i}`, data: { ...data, name: `Extra record ${i}` } });
    return result;
  }));
  return { loading: false, error, templates, tenants, users: { owner: { name: 'Sara Owner' }, second: { name: 'Omar Owner' } }, records: isTemplates ? [] : records };
}
export async function saveManagedTemplate(template: any) { templates = [...templates.filter(item => item.id !== template.id), { ...template, updated: new Date().toISOString() }]; publish(); }
export async function deleteManagedTemplate(id: string) { templates = templates.filter(item => item.id !== id); publish(); }
