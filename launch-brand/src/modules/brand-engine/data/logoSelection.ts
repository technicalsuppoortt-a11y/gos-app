// A later manual choice always wins over an earlier automatic logo save.
const selections = new Map<string, number>();
export const logoSelectionVersion = (uid: string) => selections.get(uid) ?? 0;
export function beginLogoSelection(uid: string) {
  const version = logoSelectionVersion(uid) + 1;
  selections.set(uid, version);
  return version;
}
