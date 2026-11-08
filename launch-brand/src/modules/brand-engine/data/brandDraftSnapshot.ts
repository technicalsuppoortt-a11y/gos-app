import { brandPages, type BrandPageId, type SavedBrandPage } from './brandPages';

type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export function draftFailure(code: string, message: string) {
  return Object.assign(new Error(message), { code });
}

const ids = brandPages.map(page => page.id);
const knownId = (value: unknown): value is SavedBrandPage['pageId'] =>
  typeof value === 'string' && ids.includes(value as SavedBrandPage['pageId']);

// Read the schema-1 layouts used before the unified manifest was introduced.
// A declared page must still exist, and conflicting revisions are never guessed.
export function validateDraftSnapshot(manifest: unknown, records: unknown[], selectedIds?: readonly BrandPageId[]) {
  if (manifest === undefined && records.every(value => value === undefined))
    return { pages: [] as SavedBrandPage[], revision: null, needsUpgrade: false };
  if (manifest !== undefined && (!record(manifest) ||
      (manifest['schemaVersion'] !== undefined && manifest['schemaVersion'] !== 1)))
    throw draftFailure('invalid-draft', 'The saved workspace is incomplete or uses an unsupported version.');
  const metadata = record(manifest) ? manifest : {};
  const revision = metadata['revision'];
  if (revision !== undefined && (typeof revision !== 'string' || !revision))
    throw draftFailure('invalid-draft', 'The saved workspace manifest is incomplete.');
  const declared = metadata['pageIds'];
  if (declared !== undefined && (!Array.isArray(declared) || !declared.length ||
      !declared.every(knownId) || new Set(declared).size !== declared.length))
    throw draftFailure('invalid-draft', 'The saved workspace lists unsupported or duplicate pages.');
  const present = records.filter(value => value !== undefined);
  if (!present.length)
    throw draftFailure('invalid-draft', 'The saved workspace pages are missing.');
  const pages = present.map(value => {
    if (!record(value) || !knownId(value['pageId']) || value['schemaVersion'] !== 1 ||
        !record(value['parameters']) ||
        (value['pageName'] !== undefined && typeof value['pageName'] !== 'string'))
      throw draftFailure('invalid-draft', 'A saved page is invalid or uses an unsupported version.');
    const spec = brandPages.find(page => page.id === value['pageId'])!;
    return { pageId: spec.id, pageName: spec.name, schemaVersion: 1 as const, parameters: value['parameters'] };
  });
  const found = new Set(pages.map(page => page.pageId));
  const expected = Array.isArray(declared) && selectedIds
    ? declared.filter(id => selectedIds.includes(id)) : declared;
  if (found.size !== pages.length ||
      (selectedIds && pages.some(page => !selectedIds.includes(page.pageId))) ||
      (Array.isArray(expected) && (expected.length !== pages.length || !expected.every(id => found.has(id)))))
    throw draftFailure('invalid-draft', 'The saved workspace has missing or duplicate declared pages.');
  const revisions = present.map(value => (value as RecordValue)['revision']);
  const unversioned = revisions.every(value => value === undefined);
  const versioned = revisions.every(value => typeof value === 'string' && value && value === revisions[0]);
  if ((!unversioned && !versioned) || (versioned && revision !== undefined && revisions[0] !== revision))
    throw draftFailure('invalid-draft', 'The saved workspace contains conflicting page revisions.');
  const needsUpgrade = metadata['schemaVersion'] !== 1 || !Array.isArray(declared) ||
    declared.length !== ids.length || !versioned || revision === undefined;
  return {
    pages: brandPages.flatMap(spec => pages.filter(page => page.pageId === spec.id)),
    revision: typeof revision === 'string' ? revision : null,
    needsUpgrade,
  };
}

export function validateDraftPages(records: unknown[], revision: string, selectedIds?: readonly BrandPageId[]): SavedBrandPage[] {
  const specs = selectedIds ? brandPages.filter(page => selectedIds.includes(page.id)) : brandPages;
  if (records.length !== specs.length)
    throw draftFailure('invalid-draft', 'The saved workspace does not contain all ten pages.');
  return specs.map(spec => {
    const matching = records.filter(value => record(value) && value['pageId'] === spec.id);
    const value = matching[0];
    if (matching.length !== 1 || !record(value) || value['schemaVersion'] !== 1 ||
        value['revision'] !== revision ||
        (value['pageName'] !== undefined && typeof value['pageName'] !== 'string') ||
        !record(value['parameters']))
      throw draftFailure('invalid-draft', 'The saved workspace has missing, unsupported or inconsistent pages.');
    return { pageId: spec.id, pageName: spec.name, schemaVersion: 1, parameters: value['parameters'] };
  });
}

// Persist a bounded fingerprint: the combined page JSON can exceed one document.
export async function hashDraftFingerprint(serialized: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(serialized));
  return `sha256:${Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')}`;
}
