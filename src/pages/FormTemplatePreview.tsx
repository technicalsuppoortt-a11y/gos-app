import { translateText } from '../i18n/display';
import type { PageTemplate } from './page-template-data';
import './form-template-preview.css';

/** Gallery-only artwork: never consumes a saved website/funnel photograph. */
export function FormTemplatePreview({ template }: { template: PageTemplate }) {
  const seed = Array.from(template.id).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0);
  const fields = (template.fields?.length ? template.fields : [
    { id: 'name', label: 'Full name', type: 'text' },
    { id: 'email', label: 'Email address', type: 'email' },
    { id: 'topic', label: 'Choose a topic', type: 'select' }
  ]).slice(0, 4);
  const split = fields.length > 3 && seed % 2 === 0;
  const title = translateText(template.name);
  const shorten = (text: string, limit: number) => text.length > limit ? text.slice(0, limit - 1) + '…' : text;
  return <div className="pf-form-wireframe" data-form-preview={template.id}>
    <svg viewBox="0 0 480 280" role="img" aria-label={translateText(`${template.name} form layout preview`)}>
      <rect width="480" height="280" fill="var(--fp-canvas)"/>
      <circle cx={420 - seed % 60} cy="25" r="125" fill="#A78BFA" opacity=".12"/>
      <circle cx="30" cy="275" r="100" fill="#7C3AED" opacity=".08"/>
      <rect x="53" y="19" width="374" height="242" rx="15" fill="var(--fp-card)" stroke="var(--fp-border)"/>
      <rect x="75" y="39" width="24" height="24" rx="7" fill="#7C3AED"/>
      <path d="M82 46h10m-10 5h10m-10 5h6" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
      <text x="110" y="49" fill="var(--fp-ink)" fontSize="12" fontWeight="700">{shorten(title, 34)}</text>
      <text x="110" y="63" fill="var(--fp-muted)" fontSize="9">{translateText(template.goal)} · {template.fields?.length || fields.length} {translateText('fields')}</text>
      {fields.map((field, index) => {
        const x = split ? 75 + (index % 2) * 168 : 75;
        const y = 91 + (split ? Math.floor(index / 2) * 53 : index * 32);
        const width = split ? 154 : 330;
        const choice = field.type === 'checkbox' || field.type === 'radio';
        return <g key={field.id}>
          {choice ? <>
            <rect x={x} y={y + 3} width="12" height="12" rx={field.type === 'radio' ? 6 : 3} fill="var(--fp-input)" stroke="#A78BFA"/>
            <text x={x + 20} y={y + 13} fill="var(--fp-muted)" fontSize="9">{shorten(translateText(field.label), split ? 24 : 52)}</text>
          </> : <>
            <text x={x} y={y - 4} fill="var(--fp-ink)" fontSize="8" fontWeight="600">{shorten(translateText(field.label), split ? 26 : 58)}</text>
            <rect x={x} y={y} width={width} height={field.type === 'textarea' && split ? 32 : 21} rx="5" fill="var(--fp-input)" stroke="var(--fp-border)"/>
            <rect x={x + 9} y={y + 9} width={Math.min(width - 40, 44 + (seed + index * 17) % 70)} height="3" rx="1.5" fill="var(--fp-muted)" opacity=".45"/>
            {field.type === 'select' && <path d={`m${x + width - 18} ${y + 8} 4 4 4-4`} stroke="#A78BFA" strokeWidth="1.7" fill="none" strokeLinecap="round"/>}
          </>}
        </g>;
      })}
      <rect x="75" y="226" width={160 + seed % 40} height="23" rx="6" fill="#7C3AED"/>
      <text x="87" y="241" fill="#ffffff" fontSize="9" fontWeight="600">{shorten(translateText(template.cta || 'Submit'), 28)}</text>
      <path d="M378 237h15m-5-5 5 5-5 5" stroke="#A78BFA" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
    </svg>
  </div>;
}
