/** Retain record identity while disambiguating malformed or legacy duplicate IDs. */
export function withUniqueListIds<T extends { id?: unknown }>(items: readonly T[]): (T & { id: string })[] {
  const reserved = new Set(items.map(item => typeof item.id === 'string' ? item.id : '').filter(Boolean));
  const used = new Set<string>();
  return items.map((item, index) => {
    const original = typeof item.id === 'string' ? item.id : '';
    let id = original;
    if (!id || used.has(id)) {
      id = `${original || 'item'}:occurrence:${index}`;
      while (reserved.has(id) || used.has(id)) id += ':';
    }
    used.add(id);
    return { ...item, id };
  });
}
