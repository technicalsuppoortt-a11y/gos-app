// Firestore forbids arrays directly inside arrays. Builder columns use exactly
// that shape. Tag inner arrays at the persistence boundary, keeping editor trees
// unchanged and existing documents without tags readable.
const arrayTag = '__gos_nested_array_v1__';
export function encodeFirestoreValue(value: unknown, inArray = false): any {
  if (Array.isArray(value)) {
    const items = value.map(item => encodeFirestoreValue(item, true));
    return inArray ? { [arrayTag]: items } : items;
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
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, decodeFirestoreValue(item)]));
  }
  return value;
}
