import { cloudStorage } from '../../backend/workspace';
export type CustomTemplate = { name: string; description: string; stages: string[] };
export const storageKey = 'gos-crm-custom-templates-v1';
export function loadCustomTemplates(): CustomTemplate[] {
  try {
    const saved: unknown = JSON.parse(cloudStorage.getItem(storageKey) || '[]');
    return Array.isArray(saved) ? saved.filter((t): t is CustomTemplate => typeof t?.name === 'string' && typeof t.description === 'string' && Array.isArray(t.stages) && t.stages.length >= 2 && t.stages.length <= 10 && t.stages.every((s: unknown) => typeof s === 'string' && s.trim())) : [];
  } catch { return []; }
}

