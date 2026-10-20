import type { BuilderPage } from './BuilderWorkspace';

/** Duplicated pages need unique route paths as well as unique record IDs. */
export function duplicateBuilderPage(page: BuilderPage, pages: BuilderPage[]): BuilderPage {
  const copy = structuredClone(page);
  copy.id = crypto.randomUUID();
  copy.status = 'Draft';
  const pathBase = page.path.replace(/\/+$/, '') + (page.path === '/' ? '/copy' : '-copy');
  let index = 1;
  copy.path = pathBase;
  while (pages.some(item => item.path.replace(/\/+$/, '') === copy.path)) copy.path = `${pathBase}-${++index}`;
  index = 1;
  copy.name = `${page.name} (Copy)`;
  while (pages.some(item => item.name.toLowerCase() === copy.name.toLowerCase())) copy.name = `${page.name} (Copy ${++index})`;
  return copy;
}
