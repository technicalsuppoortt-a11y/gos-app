import type { CSSProperties } from 'react';
import type { BuilderPage, BuilderSection } from './BuilderWorkspace';
import { FORM_BACKGROUND_PRESETS } from './page-template-data';
import './form-theme.css';

/** Resolve saved form appearance independently of the dashboard's light/dark mode. */
export function resolveFormTheme(page: Pick<BuilderPage, 'backgroundColor'>, block?: BuilderSection) {
  const content = block?.content ?? {};
  const preset = FORM_BACKGROUND_PRESETS.find(preset => preset.id === content.themeBackgroundId);
  const background = page.backgroundColor || preset?.background || '#ffffff';
  // Older theme changes wrote only styles; prefer that value when it matches the selected preset.
  const cardBackground = (preset && block?.styles.backgroundColor === preset.cardBackground ? preset.cardBackground : content.themeCardBg)
    || preset?.cardBackground || block?.styles.backgroundColor || '#ffffff';
  const dark = preset?.isDark ?? /#(?:090d16|0b0f19|0f172a|111827|1e1b4b)\b/i.test(background);
  const text = content.themeTextColor || preset?.textColor || (dark ? '#f8fafc' : '#0f172a');
  const border = content.themeCardBorder || preset?.cardBorder || `1px solid ${dark ? '#475569' : '#e2e8f0'}`;
  const radius = content.themeCardRadius || '24px';
  const shadow = dark ? '0 24px 60px #00000045' : '0 20px 50px #17102e12';
  const variables = {
    '--form-text': text, '--form-text-muted': dark ? '#cbd5e1' : '#475569',
    '--form-bg': dark ? '#1e293b' : '#ffffff', '--form-surface': dark ? '#1e293b' : '#f8fafc',
    '--form-border': dark ? '#475569' : '#cbd5e1', '--form-card-bg': cardBackground,
    '--form-card-border': border, '--form-card-radius': radius, '--form-card-shadow': shadow,
    '--form-accent-text': dark ? '#A78BFA' : '#7C3AED'
  } as CSSProperties;
  return { background, dark, text, variables, cardStyle: { background: cardBackground, color: text, border, borderRadius: radius, boxShadow: shadow } as CSSProperties };
}
