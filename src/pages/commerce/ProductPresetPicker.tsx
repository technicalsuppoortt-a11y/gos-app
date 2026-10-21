import { ArrowRight, BookOpen, CheckCircle2, GraduationCap, Video } from 'lucide-react';
import { translateText, useUILanguage } from '../../i18n/display';
import { productPresets, type ProductPreset } from './productPresets';
import type { ProductKind } from './model';

export function ProductPresetPicker({ kind, currency, onSelect }: { kind?: ProductKind; currency: string; onSelect: (preset: ProductPreset) => void }) {
  useUILanguage();
  return <div className="cw-preset-grid">{productPresets.filter(preset => !kind || preset.kind === kind).map(preset => {
    const Icon = preset.kind === 'course' ? GraduationCap : preset.kind === 'service' ? Video : BookOpen;
    const price = new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(preset.amount);
    return <div key={preset.id} className="cw-preset-card"><div>
      <div className="cw-preset-card-top"><span className="cw-preset-icon"><Icon size={18}/></span><span className="cw-preset-price">{price}{preset.recurring ? '/mo' : ''}</span></div>
      <span className="cw-preset-badge">{translateText('Ready to customize')}</span><h4 className="cw-preset-title">{translateText(preset.label)}</h4><p className="cw-preset-desc">{translateText(preset.description)}</p>
      <ul className="cw-preset-features">{preset.features.map(feature => <li key={feature}><CheckCircle2 size={13}/><span>{translateText(feature)}</span></li>)}</ul>
    </div><button type="button" className="cw-preset-cta" aria-label={translateText(`Use ${preset.label} template`)} onClick={() => onSelect(preset)}><span>{translateText('Use Template')}</span><ArrowRight size={12}/></button></div>;
  })}</div>;
}
