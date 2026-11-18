export const PAGE_IDS = ['vision_journey', 'business_discovery', 'branding', 'template_builder', 'dashboard', 'integrations', 'ai_center', 'content_planner', 'marketing', 'deployment'];
export const WORKSPACE_PAGE_IDS = ['business_discovery', 'branding', 'dashboard', 'template_builder', 'deployment'];
export function decodeValue(value) {
  if ('nullValue' in value) return null;
  if ('mapValue' in value) return decodeFields(value.mapValue.fields);
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeValue);
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  return value.stringValue ?? value.timestampValue ?? value.referenceValue ?? value.bytesValue ?? null;
}
export function decodeFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}
export function validateLaunch(manifest, preparation, pages) {
  const required = pages.length === WORKSPACE_PAGE_IDS.length ? WORKSPACE_PAGE_IDS : PAGE_IDS;
  if (preparation.state !== 'prepared' || !preparation.snapshotId || manifest.revision !== preparation.snapshotId ||
      pages.length !== required.length || !required.every(id => pages.some(page => page.pageId === id && page.revision === manifest.revision && page.schemaVersion === 1 && page.parameters))) {
    throw new Error('Complete deployment in Phoenix before opening your platform.');
  }
}
export function collectAssetIds(value, ids = new Set()) {
  if (Array.isArray(value)) value.forEach(item => collectAssetIds(item, ids));
  else if (value && typeof value === 'object') {
    if (typeof value.assetId === 'string') {
      if (!/^[a-z0-9-]{1,100}$/i.test(value.assetId)) throw new Error('Invalid brand asset.');
      ids.add(value.assetId);
    }
    Object.values(value).forEach(item => collectAssetIds(item, ids));
  }
  return ids;
}

// Current workspaces publish only their five visible screens. Legacy partial
// refreshes retain older screens and their source revision for provenance.
export function mergePublishedPages(previous, saved, revision, pageIds) {
  if (!Array.isArray(pageIds) || !pageIds.length || new Set(pageIds).size !== pageIds.length ||
      pageIds.some(id => !PAGE_IDS.includes(id)) || saved.length !== pageIds.length ||
      pageIds.some(id => !saved.some(page => page.pageId === id && page.revision === revision && page.schemaVersion === 1 && page.parameters))) {
    throw new Error('Your saved Phoenix configuration is incomplete. Retry after saving.');
  }
  const workspaceOnly = pageIds.length === WORKSPACE_PAGE_IDS.length && WORKSPACE_PAGE_IDS.every(id => pageIds.includes(id));
  const required = !workspaceOnly && [...previous, ...saved].some(page => page && !WORKSPACE_PAGE_IDS.includes(page.pageId)) ? PAGE_IDS : WORKSPACE_PAGE_IDS;
  return required.map(id => {
    const fresh = saved.find(page => page.pageId === id);
    if (fresh) return fresh;
    const old = previous.find(page => page?.pageId === id);
    if (!old?.parameters || old.schemaVersion !== 1) throw new Error('Your published configuration is incomplete. Deploy again from Phoenix.');
    return { ...old, inheritedFromRevision: old.inheritedFromRevision || old.revision, revision };
  });
}
