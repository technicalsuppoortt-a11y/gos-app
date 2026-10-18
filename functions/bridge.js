export const PAGE_IDS = ['vision_journey', 'business_discovery', 'branding', 'template_builder', 'dashboard', 'integrations', 'ai_center', 'content_planner', 'marketing', 'deployment'];
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
  if (preparation.state !== 'prepared' || !preparation.snapshotId || manifest.revision !== preparation.snapshotId ||
      pages.length !== PAGE_IDS.length || !PAGE_IDS.every(id => pages.some(page => page.pageId === id && page.revision === manifest.revision && page.schemaVersion === 1 && page.parameters))) {
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
