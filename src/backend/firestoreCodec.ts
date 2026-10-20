// Firestore forbids arrays directly inside arrays. Builder columns use exactly
// that shape. Tag inner arrays at the persistence boundary, keeping editor trees
// unchanged and existing documents without tags readable.
const arrayTag = 'gosNestedArrayV1';
export function encodeFirestoreValue(value: unknown, inArray = false): any {
  if (Array.isArray(value)) {
    // Serialize an inner array so arbitrarily deep builder columns do not also
    // consume Firestore's map/array nesting depth at every editor tree level.
    if (inArray) return { [arrayTag]: JSON.stringify(value) };
    return value.map(item => encodeFirestoreValue(item, true));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).map(([key, item]) => [key, encodeFirestoreValue(item)]));
  }
  return value === undefined ? null : value;
}
export function decodeFirestoreValue(value: any): any {
  if (Array.isArray(value)) return value.map(decodeFirestoreValue);
  if (value && typeof value === 'object') {
    if (Object.keys(value).length === 1 && Array.isArray(value[arrayTag])) return value[arrayTag].map(decodeFirestoreValue);
    if (Object.keys(value).length === 1 && typeof value[arrayTag] === 'string') {
      try { const items = JSON.parse(value[arrayTag]); if (Array.isArray(items)) return items; } catch { /* Preserve malformed legacy data for error reporting. */ }
    }
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, decodeFirestoreValue(item)]));
  }
  return value;
}
