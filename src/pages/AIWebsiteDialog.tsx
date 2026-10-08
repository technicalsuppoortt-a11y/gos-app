import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { Modal } from './settings/kit';
import { AssetSelect } from './AssetControls';
import { createBuilderDocument } from './BuilderWorkspace';
import { images } from './asset-model';
import type { Asset, Workspace } from './asset-model';

const palettes = [
  { name: 'Indigo', colors: ['#4f46e5', '#818cf8', '#eef2ff'] },
  { name: 'Ocean', colors: ['#0369a1', '#38bdf8', '#f0f9ff'] },
  { name: 'Forest', colors: ['#15803d', '#4ade80', '#f0fdf4'] },
  { name: 'Rose', colors: ['#be185d', '#f472b6', '#fdf2f8'] },
];
export function AIWebsiteDialog({ setWorkspace, close, go }: { setWorkspace: Dispatch<SetStateAction<Workspace>>; close: () => void; go: (path: string) => void }) {
  const [step, setStep] = useState(0), [name, setName] = useState(''), [niche, setNiche] = useState(''), [goal, setGoal] = useState('Generate leads'), [palette, setPalette] = useState(palettes[0]), [error, setError] = useState('');
  const create = () => {
    const title = name.trim(), industry = niche.trim();
    if (!title || !industry) { setStep(0); setError('Enter your business name and niche.'); return; }
    const image = /clinic|health|nutrition/i.test(industry) ? images.nutrition : images.agency;
    const document = createBuilderDocument('website', title, image, 7, industry);
    const cta = goal === 'Sell products' ? 'Explore products' : goal === 'Book appointments' ? 'Book an appointment' : goal === 'Build brand awareness' ? 'Discover our story' : 'Get in touch';
    document.theme = { color: palette.colors[0], font: 'Manrope', corners: 'Rounded' };
    document.funnel = { ...document.funnel, goal, audience: industry, offer: title + ' · ' + industry };
    document.pages.forEach(page => {
      page.seoTitle = page.name + ' | ' + title;
      page.seoDescription = 'Discover ' + title + ', your partner for ' + industry.toLowerCase() + '.';
      page.backgroundColor = palette.colors[2]; page.cta = cta;
      page.sections.forEach(section => { if (section.content.button) section.content.button = cta; });
    });
    const home = document.pages[0];
    home.headline = title + ': ' + industry + ' made personal';
    home.subheadline = 'Discover ' + industry.toLowerCase() + ' services designed around your goals. Connect with ' + title + ' and take your next step.';
    const hero = home.sections.find(section => section.type === 'Hero');
    if (hero) { hero.content.title = home.headline; hero.content.body = home.subheadline; hero.content.button = cta; }
    const created: Asset = { id: crypto.randomUUID(), kind: 'website', name: title, domain: '', image, document, updated: new Date().toISOString(), description: industry + ' · ' + goal, settings: { seo: title, navigation: document.pages.map(page => page.name).join(', '), color: palette.colors[0] } };
    setWorkspace(current => ({ ...current, assets: [created, ...current.assets] }));
    close(); go('websites/' + created.id);
  };
  return <Modal title="AI Website Generator" close={close}><div className="aw-modal-body aw-ai-generator">
    <p className="aw-ai-notice">Create a personalized starter from your business brief. Live AI generation is not connected.</p>
    <ol className="aw-ai-progress" aria-label="Creation progress">{['Business', 'Goal & brand', 'Review'].map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined} className={step >= index ? 'active' : ''}><span>{step > index ? <Check size={13}/> : index + 1}</span>{label}</li>)}</ol>
    <form onSubmit={event => { event.preventDefault(); if (step === 0 && (!name.trim() || !niche.trim())) { setError('Enter your business name and niche.'); return; } setError(''); if (step < 2) setStep(step + 1); else create(); }}>
      {step === 0 && <><h3>Tell us about your business</h3><label>Business Name<input autoFocus required maxLength={100} value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Studio North"/></label><label>Niche<input required maxLength={150} value={niche} onChange={event => setNiche(event.target.value)} placeholder="e.g. Interior design for modern homes"/></label></>}
      {step === 1 && <><h3>Make it yours</h3><label>Primary Goal<AssetSelect label="Primary Goal" value={goal} onChange={setGoal} options={['Generate leads', 'Sell products', 'Book appointments', 'Build brand awareness']}/></label><fieldset className="aw-ai-palettes"><legend>Brand Color Palette</legend>{palettes.map(item => <button type="button" key={item.name} aria-pressed={palette.name === item.name} onClick={() => setPalette(item)}><span className="aw-ai-swatches">{item.colors.map(color => <i key={color} style={{ background: color }}/>)}</span><span>{item.name}</span>{palette.name === item.name && <Check size={14}/>}</button>)}</fieldset></>}
      {step === 2 && <><h3>Your website brief</h3><dl className="aw-ai-review"><dt>Business Name</dt><dd>{name.trim()}</dd><dt>Niche</dt><dd>{niche.trim()}</dd><dt>Primary Goal</dt><dd>{goal}</dd><dt>Brand Color Palette</dt><dd>{palette.name}<span className="aw-ai-swatches">{palette.colors.map(color => <i key={color} style={{ background: color }}/>)}</span></dd></dl><p>We’ll create seven editable pages with your business copy, goal and brand colors. Review your website before publishing.</p></>}
      {error && <p className="aw-error" role="alert">{error}</p>}
      <footer><button type="button" className="aw-secondary" onClick={() => { setError(''); if (step) setStep(step - 1); else close(); }}>{step ? 'Back' : 'Cancel'}</button><button className="aw-primary">{step === 2 ? <>Create Website <Sparkles size={15}/></> : <>Continue <ArrowRight size={15}/></>}</button></footer>
    </form>
  </div></Modal>;
}
