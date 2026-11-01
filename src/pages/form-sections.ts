import type { BuilderSection } from './BuilderWorkspace';

export function findFormSection(sections: BuilderSection[]): BuilderSection | undefined {
  let fallback: BuilderSection | undefined;
  for (const section of sections) {
    if (section.type === 'Form' || section.type === 'Contact Form') {
      if (section.content.customFields) return section;
      fallback ??= section;
    }
    const nested = findFormSection(section.children?.flat() ?? []);
    if (nested?.content.customFields) return nested;
    fallback ??= nested;
  }
  return fallback;
}
