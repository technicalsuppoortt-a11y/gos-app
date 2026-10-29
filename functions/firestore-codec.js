// Keep the persisted builder representation compatible with the client codec.
export function encodeFirestoreValue(value, inArray = false) {
  if (Array.isArray(value)) return inArray
    ? { gosNestedArrayV1: JSON.stringify(value) }
    : value.map(item => encodeFirestoreValue(item, true));
  if (value && Object.getPrototypeOf(value) === Object.prototype)
    return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).map(([key, item]) => [key, encodeFirestoreValue(item)]));
  return value === undefined ? null : value;
}
