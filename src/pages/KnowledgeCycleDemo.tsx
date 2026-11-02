import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, FileText, Globe2, Layers, Pause, Play, RotateCcw, Send, Sparkles, UploadCloud, X } from 'lucide-react';
import { translateText as t } from '../i18n/display';
import { Select } from '../components/ui/Select';
import { ChatScene, ConnectScene, LiveScene, TrainingScene, sampleFiles, type DemoChannel, type DemoSource } from './KnowledgeDemoScenes';
import './knowledge-demo.css';

const steps = ['UPLOAD', 'TRAIN', 'TEST', 'CONNECT', 'LIVE'];
const starts = [0, 2000, 12000, 20000, 26000];
const end = 34000;
const samples: DemoSource[] = [...sampleFiles.map(name => ({ name, type: 'file' as const })), { name: 'https://example.com/support', type: 'url' }];

/** This preview imports no API or workspace services; all playback state is local. */
export function KnowledgeCycleDemo({ onExit }: { onExit: () => void }) {
  const [sources, setSources] = useState<DemoSource[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [choice, setChoice] = useState(false);
  const [mode, setMode] = useState<'new' | 'append'>('new');
  const [category, setCategory] = useState('Product knowledge');
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [question, setQuestion] = useState('What services do you offer?');
  const [asked, setAsked] = useState('');
  const [channels, setChannels] = useState<Partial<Record<DemoChannel, boolean>>>({});
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const playButton = useRef<HTMLButtonElement>(null);
  const reducedMotion = !!useReducedMotion();
  const step = starts.reduce((current, start, index) => elapsed >= start ? index : current, 0);
  const percent = Math.min(100, Math.round(Math.max(0, elapsed - starts[1]) / (starts[2] - starts[1]) * 100));
  const complete = elapsed >= end;
  const sceneTime = Math.max(0, elapsed - starts[step]);

  useEffect(() => {
    if (!running) return;
    let previous = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      const delta = now - previous;
      previous = now;
      setElapsed(value => Math.min(end, value + delta));
    }, 80);
    return () => clearInterval(timer);
  }, [running]);
  useEffect(() => { if (complete) setRunning(false); }, [complete]);
  useEffect(() => { if (choice) dialog.current?.showModal(); }, [choice]);

  function stage(next: DemoSource[]) {
    if (!next.length) return;
    setSources(previous => Array.from(new Map([...previous, ...next].map(source => [source.name, source])).values()));
    setElapsed(0); setRunning(false); setChoice(true); setAsked(''); setChannels({});
  }
  function restart() {
    setElapsed(0); setAsked(''); setChannels({});
    if (sources.length) setRunning(true);
    else stage(samples);
  }
  function togglePlay() {
    if (!sources.length) { stage(samples); return; }
    if (complete) restart();
    else setRunning(value => !value);
  }

  return <div className="kd-scene" data-playing={running} data-reduced-motion={reducedMotion}>
    <div className="kd-ambient" aria-hidden="true"/>
    <div className="kd-stage">
      <div className="kd-playback-dock" role="group" aria-label={t('Demo playback controls')}>
        <button type="button" className="kd-dock-secondary" onClick={restart} aria-label={t('Restart')} title={t('Restart')}><RotateCcw size={16}/></button>
        <button ref={playButton} type="button" className="kd-dock-main" onClick={togglePlay} aria-label={t(running ? 'Pause demo' : complete ? 'Replay demo' : 'Play demo')} title={t(running ? 'Pause demo' : 'Play demo')}>{running ? <Pause size={22} fill="currentColor" strokeWidth={0}/> : <Play size={22} fill="currentColor" strokeWidth={0}/>}</button>
        <button type="button" className="kd-dock-secondary" onClick={onExit} aria-label={t('Exit')} title={t('Exit')}><X size={17}/></button>
      </div>
      <nav className="kd-stepper" aria-label={t('Demo cycle steps')}>{steps.map((label, index) => <button type="button" key={label} disabled={index > 0 && !sources.length} aria-current={index === step ? 'step' : undefined} className={`${index === step ? 'active' : ''} ${index < step ? 'completed' : ''}`} onClick={() => { setElapsed(starts[index]); setRunning(false); }}><span>{index + 1}</span><b>{t(label)}</b></button>)}</nav>
      <div className="kd-stage-body">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step} className={`kd-view kd-view-${step}`} initial={reducedMotion ? false : { opacity: 0, y: 12, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, filter: 'blur(3px)' }} transition={{ duration: reducedMotion ? 0 : .32, ease: [.22, 1, .36, 1] }}>
            {step === 0 && <section className="kd-upload" aria-label={t('Demo upload')}>
              <div className={`kd-dropzone ${dragging ? 'dragging' : ''}`} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); stage(Array.from(e.dataTransfer.files).map(file => ({ name: file.name, type: 'file' as const }))); }}>
                <span className="kd-upload-symbol"><UploadCloud size={44} strokeWidth={1.2}/></span><h3>{t('Drop your knowledge')}</h3><p>PDF · DOCX · CSV · MD</p>
                <button type="button" className="kw-button primary" onClick={() => input.current?.click()}>{t('Choose demo files')}<ArrowRight size={14}/></button>
                <button type="button" className="kd-sample-button" onClick={() => stage(samples)}>{t('Use sample sources')}</button>
                <input ref={input} type="file" multiple hidden aria-label={t('Demo knowledge files')} onChange={e => { stage(Array.from(e.target.files || []).map(file => ({ name: file.name, type: 'file' as const }))); e.target.value = ''; }}/>
              </div>
              <form className="kd-website" onSubmit={e => {
                e.preventDefault();
                try {
                  const value = new URL(url);
                  if (!['http:', 'https:'].includes(value.protocol) || value.username || value.password) throw new Error();
                  stage([{ name: value.href, type: 'url' }]); setUrl(''); setUrlError('');
                } catch { setUrlError(t('Enter a valid HTTP or HTTPS URL.')); }
              }}><Globe2 size={16}/><input type="url" aria-label={t('Demo website URL')} placeholder="+ website  your-website.com" value={url} onChange={e => setUrl(e.target.value)} required/><button type="submit" aria-label={t('Preview website')} title={t('Preview website')}><ArrowRight size={18}/></button></form>
              {urlError && <p className="kw-error-text" role="alert">{urlError}</p>}
              {sources.length > 0 && <div className="kd-source-chips">{sources.slice(0, 4).map(source => <span key={source.name}>{source.type === 'url' ? <Globe2 size={12}/> : <FileText size={12}/>}<b title={source.name}>{source.name}</b></span>)}{sources.length > 4 && <span>+{sources.length - 4}</span>}</div>}
            </section>}
            {step === 1 && <TrainingScene sources={sources} percent={percent}/>}
            {step === 2 && <ChatScene time={sceneTime} asked={asked} reducedMotion={reducedMotion}/>}
            {step === 3 && <ConnectScene time={sceneTime} channels={channels} toggle={(channel, enabled) => setChannels(previous => ({ ...previous, [channel]: enabled }))}/>}
            {step === 4 && <LiveScene time={sceneTime} channels={channels} reducedMotion={reducedMotion}/>}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="kd-playback-track" role="progressbar" aria-label={t('Demo cycle progress')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(elapsed / end * 100)}><i style={{ width: `${elapsed / end * 100}%` }}/></div>
    </div>
    <footer className="kd-preview-footer"><span><i/>{t('FRONTEND DEMO')} · {t('No live data changes')}</span><span role="status">{t(complete ? 'Cycle complete' : running ? 'Playing' : 'Paused')} · {t(steps[step])}{sources.length ? ` · ${category}` : ''}</span></footer>
    {step === 2 && <form className="kd-question-composer" onSubmit={e => { e.preventDefault(); if (question.trim()) setAsked(question.trim()); }}><input aria-label={t('Demo question')} value={question} onChange={e => setQuestion(e.target.value)} maxLength={1000}/><button type="submit" disabled={!question.trim()}><Send size={14}/>{t('Try question')}</button></form>}
    {step === 4 && <button type="button" className="kd-return" onClick={onExit}>{t('Return to my knowledge')}<ArrowRight size={14}/></button>}

    {choice && <dialog ref={dialog} className="kw-dialog" aria-labelledby="kw-demo-choice-title" onCancel={() => { setChoice(false); playButton.current?.focus(); }}>
      <form onSubmit={e => { e.preventDefault(); if (!category.trim()) return; setChoice(false); setElapsed(0); setRunning(true); }}>
        <div className="kw-dialog-heading"><span className="kw-upload-icon"><Sparkles size={24}/></span><button type="button" className="kw-delete" aria-label={t('Close demo training options')} onClick={() => setChoice(false)}><X size={20}/></button></div>
        <span className="kw-eyebrow">{t('DEMO TRAINING')}</span><h2 id="kw-demo-choice-title">{t('How should your AI learn?')}</h2><p className="kw-muted">{t('Preview either path using sample data.')}</p>
        <div className="kw-mode-options" role="radiogroup" aria-label={t('Demo training mode')}>
          <label className={`kw-mode ${mode === 'new' ? 'selected' : ''}`}><input type="radio" name="demo-mode" checked={mode === 'new'} onChange={() => { setMode('new'); setCategory('Product knowledge'); }}/><Sparkles size={20}/><span><b>{t('Train on Something New')}</b><small lang="ar" dir="rtl">تدريب على حاجة جديدة</small><p>{t('Preview a distinct training category.')}</p></span></label>
          <label className={`kw-mode ${mode === 'append' ? 'selected' : ''}`}><input type="radio" name="demo-mode" checked={mode === 'append'} onChange={() => { setMode('append'); setCategory('Customer support'); }}/><Layers size={20}/><span><b>{t('Enhance / Append to Existing Data')}</b><small lang="ar" dir="rtl">تعزيز أو زيادة داتا على القديم</small><p>{t('Preview adding sources while retaining previous knowledge.')}</p></span></label>
        </div>
        {mode === 'new' ? <><label className="kw-field-label" htmlFor="kw-demo-category">{t('New demo category')}</label><input id="kw-demo-category" className="kw-category-input" value={category} onChange={e => setCategory(e.target.value)} maxLength={60} required/></> : <Select label="Append to demo category" value={category} onChange={setCategory} options={['Customer support', 'Product knowledge']}/>}
        <div className="kw-dialog-actions"><button className="kw-button secondary" type="button" onClick={() => setChoice(false)}>{t('Review sources')}</button><button className="kw-button primary" type="submit" disabled={!category.trim()}>{t('Start demo cycle')}<Play size={14}/></button></div>
      </form>
    </dialog>}
  </div>;
}