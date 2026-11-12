import { formatDisplayMessage, translateText, useUILanguage } from '../i18n/display';
import type { PageTemplate } from './page-template-data';
import './form-template-preview.css';

/** Gallery-only pure-SVG artwork matching the official curated Form templates. */
export function FormTemplatePreview({ template }: { template: PageTemplate }) {
  useUILanguage();
  const idLower = template.id.toLowerCase();
  const nameLower = template.name.toLowerCase();
  const isFlooring = idLower.includes('flooring') || nameLower.includes('flooring');
  const isTrainer = idLower.includes('trainer') || nameLower.includes('trainer');
  const isArchitecture = idLower.includes('architecture') || nameLower.includes('architecture');

  if (isFlooring) {
    return (
      <div className="pf-form-wireframe" data-form-preview={template.id}>
        <svg viewBox="0 0 480 280" role="img" aria-label={formatDisplayMessage('{{0}} form layout preview', template.name)}>
          <rect width="480" height="280" fill="#EAE4DC" />
          <circle cx="455" cy="18" r="70" fill="#A78BFA" opacity=".06" />
          <circle cx="22" cy="262" r="55" fill="#7C3AED" opacity=".05" />
          <rect x="64" y="12" width="352" height="256" rx="8" fill="#FFFFFF" stroke="#DDD6CC" />
          <text x="88" y="37" fill="#1E293B" fontSize="14.5" fontWeight="700">Get Your Free Flooring Quote</text>
          <text x="88" y="50" fill="#64748B" fontSize="7.5">Complete the form below for a customized, no-obligation flooring estimate.</text>

          <text x="88" y="67" fill="#1E293B" fontSize="7.5" fontWeight="600">Full Name *</text>
          <rect x="88" y="71" width="304" height="17" rx="3.5" fill="#F8FAFC" stroke="#CBD5E1" />
          <rect x="95" y="78" width="76" height="3" rx="1.5" fill="#94A3B8" opacity=".55" />

          <text x="88" y="100" fill="#1E293B" fontSize="7.5" fontWeight="600">Email * &amp; Phone *</text>
          <rect x="88" y="104" width="147" height="17" rx="3.5" fill="#F8FAFC" stroke="#CBD5E1" />
          <rect x="245" y="104" width="147" height="17" rx="3.5" fill="#F8FAFC" stroke="#CBD5E1" />
          <rect x="95" y="111" width="64" height="3" rx="1.5" fill="#94A3B8" opacity=".55" />
          <rect x="252" y="111" width="58" height="3" rx="1.5" fill="#94A3B8" opacity=".55" />

          <text x="88" y="133" fill="#1E293B" fontSize="7.5" fontWeight="600">City &amp; State / Province</text>
          <rect x="88" y="137" width="147" height="17" rx="3.5" fill="#F8FAFC" stroke="#CBD5E1" />
          <rect x="245" y="137" width="147" height="17" rx="3.5" fill="#F8FAFC" stroke="#CBD5E1" />

          <text x="88" y="167" fill="#1E293B" fontSize="7.5" fontWeight="600">What Type of Flooring Are You Interested In?</text>
          {['Hardwood', 'Luxury Vinyl Plank (LVP)', 'Laminate', 'Porcelain Tile'].map((opt, idx) => {
            const col = idx % 2;
            const row = Math.floor(idx / 2);
            const cx = 93 + col * 156;
            const cy = 179 + row * 15;
            return (
              <g key={opt}>
                <circle cx={cx} cy={cy} r="4.2" fill="#FFFFFF" stroke={idx === 0 ? '#1E293B' : '#94A3B8'} strokeWidth="1.2" />
                {idx === 0 && <circle cx={cx} cy={cy} r="2" fill="#1E293B" />}
                <text x={cx + 9} y={cy + 2.6} fill="#334155" fontSize="7.3">{opt}</text>
              </g>
            );
          })}

          <text x="88" y="216" fill="#1E293B" fontSize="7.5" fontWeight="600">Approximate Project Size (Sq. Ft.)</text>
          <rect x="88" y="220" width="304" height="16" rx="3.5" fill="#F8FAFC" stroke="#CBD5E1" />
          <path d="m380 226 3.5 3.5 3.5-3.5" stroke="#64748B" strokeWidth="1.3" fill="none" strokeLinecap="round" />

          <rect x="88" y="242" width="158" height="19" rx="4" fill="#1E293B" />
          <text x="102" y="254" fill="#FFFFFF" fontSize="8" fontWeight="700">Get My Free Flooring Quote</text>
        </svg>
      </div>
    );
  }

  if (isTrainer) {
    return (
      <div className="pf-form-wireframe" data-form-preview={template.id}>
        <svg viewBox="0 0 480 280" role="img" aria-label={formatDisplayMessage('{{0}} form layout preview', template.name)}>
          <defs>
            <linearGradient id="ptGold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="100%" stopColor="#EAB308" />
            </linearGradient>
          </defs>
          <rect width="480" height="280" fill="#F8FAFC" />
          <circle cx="24" cy="24" r="45" fill="#A78BFA" opacity=".05" />
          <rect x="24" y="12" width="432" height="256" rx="10" fill="#FFFFFF" stroke="#E2E8F0" />

          <rect x="302" y="12" width="154" height="256" rx="0" fill="url(#ptGold)" />
          <path d="M302 36h42M302 52h28M302 68h36M302 214h34" stroke="#FEF9C3" strokeWidth="3" strokeLinecap="round" opacity=".75" />
          <circle cx="384" cy="116" r="44" fill="#111827" opacity=".12" />
          <circle cx="384" cy="86" r="16" fill="#1F2937" />
          <path d="M356 146c6-24 18-36 28-36s22 12 28 36v32h-56z" fill="#111827" />
          <g transform="translate(322 142) rotate(-18)">
            <rect x="10" y="9" width="42" height="5" rx="2" fill="#374151" />
            <rect x="3" y="2" width="9" height="19" rx="3" fill="#0F172A" stroke="#FACC15" strokeWidth="1" />
            <rect x="50" y="2" width="9" height="19" rx="3" fill="#0F172A" stroke="#FACC15" strokeWidth="1" />
          </g>
          <text x="330" y="232" fill="#111827" fontSize="20" fontWeight="900" letterSpacing="1.5">FITNESS</text>
          <text x="348" y="246" fill="#1F2937" fontSize="9.5" fontStyle="italic" fontWeight="700">level up</text>

          <text x="44" y="36" fill="#111827" fontSize="13.5" fontWeight="900">LET&apos;S BUILD</text>
          <text x="44" y="51" fill="#EAB308" fontSize="13.5" fontWeight="900">YOUR WORKOUT</text>
          <text x="44" y="66" fill="#111827" fontSize="13.5" fontWeight="900">BLUEPRINT.</text>
          <text x="44" y="79" fill="#DC2626" fontSize="7.2" fontWeight="700">✕ No generic templates — 100% custom coaching</text>

          <rect x="44" y="90" width="238" height="18" rx="4" fill="#FFFFFF" stroke="#CBD5E1" />
          <text x="51" y="101.5" fill="#94A3B8" fontSize="7.2">Full Name</text>

          <rect x="44" y="114" width="114" height="18" rx="4" fill="#FFFFFF" stroke="#CBD5E1" />
          <text x="51" y="125.5" fill="#94A3B8" fontSize="7.2">+1 (555) 000-0000</text>
          <rect x="168" y="114" width="114" height="18" rx="4" fill="#FFFFFF" stroke="#CBD5E1" />
          <text x="175" y="125.5" fill="#94A3B8" fontSize="7.2">Email Address</text>

          <rect x="44" y="138" width="238" height="28" rx="4" fill="#FFFFFF" stroke="#CBD5E1" />
          <text x="51" y="149.5" fill="#94A3B8" fontSize="6.8">Any current injuries, joint pain, or training goals?</text>

          <rect x="44" y="174" width="9" height="9" rx="2" fill="#FFFFFF" stroke="#7C3AED" strokeWidth="1" />
          <rect x="58" y="176" width="198" height="3" rx="1.5" fill="#64748B" opacity=".55" />
          <rect x="58" y="182" width="154" height="3" rx="1.5" fill="#64748B" opacity=".4" />

          <rect x="44" y="194" width="9" height="9" rx="2" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1" />
          <rect x="58" y="196" width="190" height="3" rx="1.5" fill="#64748B" opacity=".55" />
          <rect x="58" y="202" width="136" height="3" rx="1.5" fill="#64748B" opacity=".4" />

          <rect x="52" y="220" width="218" height="22" rx="11" fill="#FACC15" />
          <text x="77" y="234" fill="#111827" fontSize="8" fontWeight="800">REQUEST MY BASELINE ASSESSMENT</text>
        </svg>
      </div>
    );
  }

  if (isArchitecture) {
    return (
      <div className="pf-form-wireframe" data-form-preview={template.id}>
        <svg viewBox="0 0 480 280" role="img" aria-label={formatDisplayMessage('{{0}} form layout preview', template.name)}>
          <rect width="480" height="280" fill="#F4F1EA" />
          <circle cx="458" cy="258" r="50" fill="#A78BFA" opacity=".05" />
          <rect x="24" y="12" width="432" height="256" rx="10" fill="#FFFFFF" stroke="#E5E0D8" />

          <rect x="24" y="12" width="142" height="256" fill="#EAE4DA" />
          <path d="M36 40h118M36 72h118M36 104h118M64 26v228M98 26v228M132 26v228" stroke="#D6CFC2" strokeWidth="0.7" strokeDasharray="3 3" />
          <polygon points="62,216 86,88 118,102 126,216" fill="#C29B61" opacity=".88" stroke="#5C4728" strokeWidth="1.2" />
          <path d="M70 198l44-22M73 176l42-21M77 154l38-19M81 132l34-17M84 110l30-12" stroke="#5C4728" strokeWidth="1" opacity=".7" />
          <rect x="46" y="216" width="96" height="14" rx="2" fill="#DDD5C7" stroke="#A89F91" />
          <rect x="54" y="32" width="4" height="16" rx="2" fill="#7C3AED" opacity=".35" />

          <text x="311" y="34" textAnchor="middle" fill="#111111" fontSize="11.5" fontWeight="800">Every great space starts</text>
          <text x="311" y="47" textAnchor="middle" fill="#111111" fontSize="11.5" fontWeight="800">with a conversation.</text>
          <text x="311" y="59" textAnchor="middle" fill="#6B7280" fontSize="6.8">Tell us about your site, scope, and architectural vision.</text>

          <text x="182" y="75" fill="#111111" fontSize="7" fontWeight="600">Full name</text>
          <rect x="182" y="78" width="122" height="16" rx="3.5" fill="#FAFAF9" stroke="#D6D3D1" />
          <text x="316" y="75" fill="#111111" fontSize="7" fontWeight="600">City / Location</text>
          <rect x="316" y="78" width="122" height="16" rx="3.5" fill="#FAFAF9" stroke="#D6D3D1" />

          <text x="182" y="105" fill="#111111" fontSize="7" fontWeight="600">Phone *</text>
          <rect x="182" y="108" width="122" height="16" rx="3.5" fill="#FAFAF9" stroke="#D6D3D1" />
          <text x="316" y="105" fill="#111111" fontSize="7" fontWeight="600">Email *</text>
          <rect x="316" y="108" width="122" height="16" rx="3.5" fill="#FAFAF9" stroke="#D6D3D1" />

          <text x="182" y="135" fill="#111111" fontSize="7" fontWeight="600">Project type</text>
          <rect x="182" y="138" width="256" height="16" rx="3.5" fill="#FAFAF9" stroke="#D6D3D1" />
          <path d="m426 144 3.5 3.5 3.5-3.5" stroke="#57534E" strokeWidth="1.2" fill="none" strokeLinecap="round" />

          <text x="182" y="165" fill="#111111" fontSize="7" fontWeight="600">Approximate budget</text>
          <rect x="182" y="168" width="256" height="16" rx="3.5" fill="#FAFAF9" stroke="#D6D3D1" />
          <path d="m426 174 3.5 3.5 3.5-3.5" stroke="#57534E" strokeWidth="1.2" fill="none" strokeLinecap="round" />

          <text x="182" y="195" fill="#111111" fontSize="7" fontWeight="600">Describe your project</text>
          <rect x="182" y="198" width="256" height="26" rx="3.5" fill="#FAFAF9" stroke="#D6D3D1" />

          <rect x="182" y="234" width="256" height="21" rx="4.5" fill="#111111" />
          <text x="310" y="247.5" textAnchor="middle" fill="#FFFFFF" fontSize="7.8" fontWeight="700" letterSpacing="0.6">START THE CONVERSATION</text>
        </svg>
      </div>
    );
  }

  const seed = Array.from(template.id).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0);
  const fields = (template.fields?.length ? template.fields : [
    { id: 'name', label: 'Full name', type: 'text' },
    { id: 'email', label: 'Email address', type: 'email' },
    { id: 'topic', label: 'Choose a topic', type: 'select' }
  ]).slice(0, 4);
  const split = fields.length > 3 && seed % 2 === 0;
  const title = template.name;
  const shorten = (text: string, limit: number) => text.length > limit ? text.slice(0, limit - 1) + '…' : text;
  return <div className="pf-form-wireframe" data-form-preview={template.id}>
    <svg viewBox="0 0 480 280" role="img" aria-label={formatDisplayMessage('{{0}} form layout preview', template.name)}>
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
            <text x={x + 20} y={y + 13} fill="var(--fp-muted)" fontSize="9">{shorten(field.label, split ? 24 : 52)}</text>
          </> : <>
            <text x={x} y={y - 4} fill="var(--fp-ink)" fontSize="8" fontWeight="600">{shorten(field.label, split ? 26 : 58)}</text>
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
