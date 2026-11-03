import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, BookOpen, Check, CheckCircle2, FileText, Globe2, Layers, Loader2, Plus, Radio, RefreshCw, Sparkles, Trash2, UploadCloud, X } from 'lucide-react';
import { gosApi, type GosAssistant, type GosSource, type GosSourceInput } from '../backend/gosApi';
import { translateText as t } from '../i18n/display';
import { showToast } from '../utils/toast';
import { Select } from '../components/ui/Select';
import { KnowledgeCycleDemo } from './KnowledgeCycleDemo';
import { GosPlayground } from './GosPlayground';
import type { Conversation } from './inbox/inboxData';
import { ProductionKnowledgeOrb, ProductionChannelNetwork, ProductionLiveMonitor } from './KnowledgeProductionViews';
import './knowledge-workflow.css';
import './knowledge-production.css';

type Props = {
  sources: GosSource[]; loading: boolean; error: string; refresh: () => void;
  assistant: GosAssistant; saving: boolean;
  updateAssistant: (changes: Partial<GosAssistant>) => Promise<boolean>;
  onTest: () => void; onConnect: () => void;
  assistantName?: string; conversations?: readonly Conversation[];
};
type PendingSource = { id: string; name: string; file?: File; url?: string; content?: string; kind?: 'text' | 'instructions'; error?: string };
const steps = ['UPLOAD', 'TRAIN', 'TEST', 'CONNECT', 'LIVE'];
const categoryOf = (name: string) => /^\[([^\]]+)\] /.exec(name)?.[1] || 'General';
const displayName = (name: string) => name.replace(/^\[[^\]]+\] /, '');
const isPending = (source: GosSource) => ['queued', 'processing'].includes(source.status);

/** Source creation is additive. Categories are persisted in the source name so
 * they survive reloads without claiming unsupported vector/model isolation. */
export function KnowledgeWorkflow({ sources, loading, error, refresh, assistant, saving, updateAssistant, onTest, onConnect, assistantName = 'Your AI', conversations = [] }: Props) {
  const [step, setStep] = useState(0);
  const [demo, setDemo] = useState(false);
  const [reportedProgress, setReportedProgress] = useState<number | null>(null);
  const [sourceDetails, setSourceDetails] = useState<Record<string, GosSource>>({});
  const [channelFlags, setChannelFlags] = useState<Record<string, boolean> | null>(null);
  const [cycleError, setCycleError] = useState('');
  const [pending, setPending] = useState<PendingSource[]>([]);
  const [url, setUrl] = useState('');
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState('');
  const [choice, setChoice] = useState(false);
  const [mode, setMode] = useState<'new' | 'append'>('append');
  const [category, setCategory] = useState('');
  const [target, setTarget] = useState('General');
  const [filter, setFilter] = useState('All categories');
  const [batch, setBatch] = useState<GosSource[]>([]);
  const [search, setSearch] = useState('');
  const [textOpen, setTextOpen] = useState(false);
  const [textName, setTextName] = useState('');
  const [textContent, setTextContent] = useState('');
  const [textKind, setTextKind] = useState<'text' | 'instructions'>('text');
  const fileInput = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const choiceTrigger = useRef<HTMLButtonElement>(null);
  const mutation = useRef(false);
  const categories = Array.from(new Set(['General', ...sources.map(s => categoryOf(s.name))]));
  const liveBatch = batch.map(source => sources.find(s => s.id === source.id) || source);
  const trainingSources = (liveBatch.length ? liveBatch : sources).map(source => sourceDetails[source.id] || source);
  const ready = trainingSources.filter(s => s.status === 'ready').length;
  const progress = reportedProgress ?? (trainingSources.length ? Math.round(ready / trainingSources.length * 100) : 0);
  const processing = trainingSources.some(isPending);
  const canTest = trainingSources.length > 0 && trainingSources.every(s => s.status === 'ready') && !busy;
  const hasReady = sources.some(s => s.status === 'ready');
  const cycleAssistant = { ...assistant, channels: channelFlags ?? assistant.channels };
  const connected = Object.values(cycleAssistant.channels).some(Boolean);
  const visible = sources.filter(s => (filter === 'All categories' || categoryOf(s.name) === filter) && s.name.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    if (demo || (step !== 1 && step !== 3 && step !== 4)) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function syncCycle() {
      try {
        if (step === 1) {
          const result = await gosApi.training(controller.signal);
          const training = result.training ?? result;
          const percent = training.embedding_percentage ?? training.progress;
          if (percent !== undefined && (typeof percent !== 'number' || !Number.isFinite(percent))) throw new Error('The API returned invalid training progress.');
          const details = await Promise.all((batch.length ? batch : sources).map(source => gosApi.source(source.id, controller.signal)));
          if (controller.signal.aborted) return;
          setReportedProgress(percent === undefined ? null : Math.max(0, Math.min(100, percent)));
          setSourceDetails(Object.fromEntries(details.map(({ source }) => [source.id, source])));
        } else {
          const { channels } = await gosApi.channels(controller.signal);
          if (!channels || typeof channels !== 'object') throw new Error('The API returned invalid channel data.');
          const entries = Array.isArray(channels) ? channels.map(row => [row.channel, row.enabled] as const) : Object.entries(channels).map(([key, value]) => [key, typeof value === 'boolean' ? value : value.enabled] as const);
          if (entries.some(([key, value]) => !key || typeof value !== 'boolean')) throw new Error('The API returned invalid channel settings.');
          if (!controller.signal.aborted) setChannelFlags(Object.fromEntries(entries));
        }
        if (!controller.signal.aborted) { setCycleError(''); timer = setTimeout(syncCycle, step === 1 ? 4000 : 15000); }
      } catch (e) {
        if (!controller.signal.aborted) { setCycleError((e as Error).message); timer = setTimeout(syncCycle, 15000); }
      }
    }
    void syncCycle();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [step, demo, batch, sources]);

  async function updateChannel(channel: string, enabled: boolean) {
    try {
      await gosApi.updateChannel(channel, enabled);
      setChannelFlags(previous => ({ ...(previous ?? assistant.channels), [channel]: enabled }));
      setCycleError('');
    } catch (e) { setCycleError((e as Error).message); }
  }

  useEffect(() => {
    if (choice && dialog.current && !dialog.current.open) dialog.current.showModal();
    if (!choice && dialog.current?.open) dialog.current.close();
  }, [choice]);

  function addFiles(files: FileList | File[]) {
    if (busy) return;
    const accepted: PendingSource[] = [];
    for (const file of Array.from(files)) {
      if (!/\.(pdf|docx|csv|md|txt)$/i.test(file.name)) { showToast.error(`${file.name}: ${t('Choose a PDF, DOCX, CSV, MD or TXT file.')}`); continue; }
      if (!file.size || file.size > 20 * 1024 * 1024) { showToast.error(`${file.name}: ${t('Choose a non-empty file up to 20 MB.')}`); continue; }
      accepted.push({ id: crypto.randomUUID(), name: file.name, file });
    }
    if (accepted.length) {
      setPending(previous => [...previous, ...accepted.filter(item => !previous.some(p => p.file?.name === item.file?.name && p.file?.size === item.file?.size && p.file?.lastModified === item.file?.lastModified))]);
      setChoice(true);
    }
  }

  function addUrl(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    try {
      const parsed = new URL(url.trim());
      if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error();
      parsed.hash = '';
      const value = parsed.href;
      setPending(previous => previous.some(p => p.url === value) ? previous : [...previous, { id: crypto.randomUUID(), name: value, url: value }]);
      setUrl(''); setChoice(true);
    } catch { showToast.error(t('Enter a valid public HTTP or HTTPS website URL.')); }
  }

  async function train() {
    if (mutation.current || loading || error || !pending.length) return;
    const selected = mode === 'new' ? category.trim() : target;
    if (!selected || /[\[\]\r\n]/.test(selected) || selected.length > 60) { showToast.error(t('Enter a category name of up to 60 characters without brackets.')); return; }
    if (mode === 'new' && categories.some(c => c.toLowerCase() === selected.toLowerCase())) { showToast.error(t('This category already exists. Choose append or use a new name.')); return; }
    mutation.current = true; setBusy(true); setChoice(false); setStep(1);
    setBatch(previous => previous.filter(s => categoryOf(s.name) === selected));
    const failures: PendingSource[] = [];
    const created: GosSource[] = [];
    // Upload sequentially so individual failures can be retried without duplicating
    // successful uploads or replacing any existing source.
    for (const item of pending) {
      try {
        const name = selected === 'General' ? item.name : `[${selected}] ${item.name}`;
        let body: FormData | GosSourceInput;
        if (item.file) {
          body = new FormData(); body.append('name', name); body.append('type', 'file'); body.append('file', item.file);
        } else body = item.url ? { name, type: 'url', url: item.url } : { name, type: 'text', content: item.content || '' };
        const result = await gosApi.createSource(body);
        if (!result.source?.id) throw new Error(t('The server did not confirm this source. Refresh sources before retrying.'));
        created.push(result.source);
        setBatch(previous => [...previous.filter(s => s.id !== result.source.id), result.source]);
      } catch (e) { failures.push({ ...item, error: (e as Error).message }); }
    }
    setPending(failures); setBusy(false); mutation.current = false; refresh();
    if (created.length) { setMode('append'); setTarget(selected); }
    if (created.length) showToast.success(`${created.length} ${t('sources submitted for indexing.')}`);
    if (failures.length) showToast.error(t('Some sources could not be submitted. Review the errors and retry those sources.'));
  }

  async function remove(source: GosSource) {
    if (mutation.current) return;
    mutation.current = true; setDeleting(source.id);
    try { await gosApi.deleteSource(source.id); setBatch(previous => previous.filter(s => s.id !== source.id)); refresh(); showToast.success(t('Source removed.')); }
    catch (e) { showToast.error((e as Error).message); }
    finally { mutation.current = false; setDeleting(''); }
  }

  function progressPane(title: string, list: GosSource[], link = false) {
    return <section className="kw-progress-pane">
      <div className="kw-pane-title"><span>{link ? <Globe2 size={15}/> : <FileText size={15}/>} {t(title)}</span><b>{list.filter(s => s.status === 'ready').length} / {list.length}</b></div>
      {!list.length && <p className="kw-muted kw-empty">{t(link ? 'No websites in this training batch.' : 'No files in this training batch.')}</p>}
      {list.map(source => <div className="kw-processing-row" key={source.id}>
        <div><span title={source.name}>{displayName(source.name)}</span>{source.status === 'ready' ? <CheckCircle2 size={15} className="text-violet-600 dark:text-violet-300"/> : isPending(source) ? <Loader2 size={14} className="motion-safe:animate-spin"/> : null}</div>
        <div className={`kw-source-track ${isPending(source) ? 'is-pending' : ''}`} role="progressbar" aria-label={source.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={isPending(source) ? undefined : source.status === 'ready' ? 100 : 0} aria-valuetext={source.status}><i style={{ width: source.status === 'ready' ? '100%' : undefined }}/></div>
        <small className={source.status === 'failed' ? 'kw-error-text' : 'kw-muted'}>{source.error || t(source.status)}{source.status === 'ready' ? ' · 100%' : ''}</small>
      </div>)}
    </section>;
  }

  const studioHeader = <header className="kw-heading">
    <div><span className="kw-eyebrow"><Sparkles size={13}/> {t('INTELLIGENCE STUDIO')}</span><h2>{t('Your knowledge. Your AI.')}</h2><p>{t('Turn business knowledge into answers your customers can trust.')}</p></div>
    <div className="kw-heading-actions">
      <button type="button" className="kw-button primary kw-demo-toggle" aria-pressed={demo} disabled={busy || !!deleting || choice} onClick={() => setDemo(value => !value)}><Sparkles size={15}/>{t(demo ? 'Exit demo' : 'Cycle Demo Mode')}</button>
      {!demo && <span className="kw-pill"><span className="kw-dot"/>{sources.filter(s => s.status === 'ready').length} {t('sources ready')}</span>}
    </div>
  </header>;
  if (demo) return <section className="kw-root text-slate-900 dark:text-slate-100" aria-label={t('Knowledge studio demo')}>{studioHeader}<KnowledgeCycleDemo onExit={() => setDemo(false)}/></section>;
  return <section className="kw-root kw-production text-slate-900 dark:text-slate-100" aria-label={t('Knowledge training workflow')}>
    {studioHeader}
    <nav className="kw-stepper" aria-label={t('Knowledge workflow steps')}>{steps.map((label, index) => <button key={label} type="button" aria-current={step === index ? 'step' : undefined} disabled={busy || (index === 2 && !canTest) || (index >= 3 && !hasReady)} onClick={() => setStep(index)} className={`${step === index ? 'active' : ''} ${index < step ? 'completed' : ''}`}><span>{index + 1}</span><b>{t(label)}</b>{index < 4 && <ArrowRight className="kw-step-arrow" size={13}/>}</button>)}</nav>

    <div className="kp-workspace"><div className="kp-main">
    {error && <div className="kw-error" role="alert">{error}<button type="button" className="kw-button secondary" onClick={refresh} disabled={loading}>{t('Retry connection')}</button></div>}
    {cycleError && <div className="kw-error" role="alert">{cycleError}</div>}
    {step === 0 && <div className="kw-upload-panel">
      <div className={`kw-dropzone ${dragging ? 'dragging' : ''}`} onDragOver={e => { e.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }} onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}>
        <span className="kw-upload-icon"><UploadCloud size={34} strokeWidth={1.4}/></span><h3>{t('Drop your knowledge')}</h3><p>{t('Drag files here, or browse your device')}</p>
        <button type="button" className="kw-button primary" disabled={busy} onClick={() => fileInput.current?.click()}><Plus size={15}/>{t('Choose files')}</button>
        <input ref={fileInput} type="file" aria-label={t('Upload knowledge files')} accept=".pdf,.docx,.csv,.md,.txt" multiple hidden onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}/>
        <div className="kw-formats">{['PDF', 'DOCX', 'CSV', 'MD', 'TXT'].map(format => <span key={format}>{format}</span>)}<small>{t('Up to 20 MB per file')}</small></div>
      </div>
      <form className="kw-url-form" onSubmit={addUrl}><Globe2 size={18}/><label className="sr-only" htmlFor="kw-url">{t('Website URL')}</label><input id="kw-url" type="url" placeholder="https://your-website.com" value={url} onChange={e => setUrl(e.target.value)} disabled={busy} required/><button type="submit" className="kw-button secondary" disabled={busy || !url.trim()}><Plus size={14}/>{t('Add website')}</button></form>
      <p className="kw-helper">{t('Website crawling and document extraction depend on server support. Unsupported sources show an error and can be retried.')}</p>
      <div className="kw-upload-footer"><span><Layers size={14}/>{t('Existing knowledge stays intact with every upload.')}</span><button className="kw-text-button" type="button" onClick={() => setTextOpen(value => !value)} aria-expanded={textOpen} aria-controls="kw-text-form">{t('Add text or instructions')}<ArrowRight size={13}/></button></div>
      {textOpen && <form id="kw-text-form" className="kw-text-form" onSubmit={e => {
        e.preventDefault();
        if (busy || !textContent.trim()) return;
        setPending(previous => [...previous, { id: crypto.randomUUID(), name: textName.trim() || 'Text snippet', content: textContent.trim(), kind: textKind }]);
        setTextName(''); setTextContent(''); setTextOpen(false); setChoice(true);
      }}>
        <label htmlFor="kw-text-name">{t('Source name')}</label>
        <input id="kw-text-name" value={textName} onChange={e => setTextName(e.target.value)} maxLength={160} placeholder={t('e.g. Support guidelines')} disabled={busy}/>
        <label htmlFor="kw-text-kind">{t('Source type')}</label>
        <Select id="kw-text-kind" label="Source type" value={textKind} onChange={value => setTextKind(value as 'text' | 'instructions')} disabled={busy} options={[{value:'text',label:'Text snippet'},{value:'instructions',label:'Instructions'}]}/>
        <label htmlFor="kw-text-content">{t('Knowledge content')}</label>
        <textarea id="kw-text-content" rows={5} value={textContent} onChange={e => setTextContent(e.target.value)} maxLength={100000} required disabled={busy}/>
        <button type="submit" className="kw-button secondary" disabled={busy || !textContent.trim()}>{t('Add text source')}<Plus size={14}/></button>
      </form>}
    </div>}

    {pending.length > 0 && <div className="kw-pending"><div className="kw-section-title"><h3>{t('Ready to upload')} <span>{pending.length}</span></h3><button type="button" ref={choiceTrigger} className="kw-button primary" disabled={busy || loading || !!error} onClick={() => setChoice(true)}>{busy ? <Loader2 size={14} className="motion-safe:animate-spin"/> : <Sparkles size={14}/>} {t(busy ? 'Submitting sources…' : 'Choose training mode')}</button></div><div className="kw-chips">{pending.map(item => <div className={`kw-file-chip ${item.error ? 'has-error' : ''}`} key={item.id}><span>{item.url ? <Globe2 size={14}/> : <FileText size={14}/>}<b title={item.name}>{item.name}</b><button type="button" aria-label={`${t('Remove pending source')} ${item.name}`} disabled={busy} onClick={() => setPending(previous => previous.filter(p => p.id !== item.id))}><X size={13}/></button></span>{item.error && <small role="alert">{item.error}</small>}</div>)}</div></div>}

    {step === 1 && <div className="kw-training">
      <div className="kw-section-title">
        <div><h3>{t('Building your knowledge')}</h3><p className="kw-muted">{t('Live source status from the indexing service.')}</p></div>
        <span className="kw-pill">{busy ? t('Uploading') : processing ? t('Training in progress') : canTest ? t('Training complete') : t('Awaiting sources')}</span>
      </div>
      <div className="kw-training-panes">
        {progressPane('FILES & TEXT', trainingSources.filter(s => s.type !== 'url'))}
        {progressPane('CRAWLING LINKS', trainingSources.filter(s => s.type === 'url'), true)}
      </div>
      <div className="kw-training-bottom">
        <div className="kw-ring" role="progressbar" aria-label={t('Sources indexed')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <ProductionKnowledgeOrb progress={progress} active={busy || processing} label={t(canTest ? 'Ready' : busy ? 'Uploading' : processing ? 'Indexing' : 'Knowledge')} caption={t('SOURCES INDEXED')}/>
        </div>
        <div className="kw-training-copy">
          <h3>{t(canTest ? 'Ready for a test drive' : 'A smarter assistant starts here')}</h3>
          <p>{ready} / {trainingSources.length} {t(reportedProgress === null ? 'sources indexed. Percentages reflect completed sources.' : 'sources indexed. Overall embedding progress is reported by the server.')}</p>
          <div className="kw-phases">
            {['Reading', 'Embedding', 'Tuning'].map((phase, index) => <span key={phase}>
              <i className={canTest && index < 2 ? 'done' : ''}/>{t(phase)}
              <small>{t(index === 2 ? 'Not reported' : canTest ? 'Complete' : processing ? 'In progress' : index === 0 && busy ? 'Uploading' : 'Waiting')}</small>
            </span>)}
          </div>
          <p className="kw-helper">{t('Source status and overall training progress refresh automatically.')}</p>
          <button type="button" className="kw-button primary" disabled={!canTest || loading || !!error} onClick={() => setStep(2)}>{t('Continue to test')}<ArrowRight size={14}/></button>
        </div>
      </div>
    </div>}

    {step === 2 && <section className="kp-test">
      <header className="kp-view-heading"><div><span className="kp-eyebrow">{t('TEST YOUR KNOWLEDGE')}</span><h3>{t('Put your knowledge to the test')}</h3></div><button type="button" className="kw-button secondary" disabled={loading || !!error} onClick={onTest}>{t('Open test playground')}<ArrowRight size={14}/></button></header>
      <GosPlayground/>
      <button type="button" className="kw-text-button kp-continue" onClick={() => setStep(3)}>{t('Continue to connect')}<ArrowRight size={14}/></button>
    </section>}
    {step === 3 && <><ProductionChannelNetwork assistant={cycleAssistant} assistantName={assistantName} disabled={loading || !!error || saving} updateChannel={updateChannel} onManage={onConnect}/><button type="button" className="kw-text-button kp-continue" onClick={() => setStep(4)}>{t('Continue to live')}<ArrowRight size={14}/></button></>}
    {step === 4 && <ProductionLiveMonitor assistant={cycleAssistant} conversations={conversations} readySources={sources.filter(source => source.status === 'ready').length} disabled={loading || !!error || saving || (!assistant.live_enabled && (!hasReady || !connected))} onToggle={() => void updateAssistant({ live_enabled: !assistant.live_enabled, channels: cycleAssistant.channels })}/>}


    </div>
    <section className="kw-library"><div className="kw-section-title"><div><h3>{t('Knowledge library')} <span>{sources.length}</span></h3><p className="kw-muted">{t('Manage the sources behind your assistant’s answers.')}</p></div><button className="kw-button secondary" type="button" onClick={refresh} disabled={loading || busy || !!deleting}><RefreshCw size={13} className={loading ? 'motion-safe:animate-spin' : ''}/>{t('Refresh')}</button></div><div className="kw-library-filters"><input aria-label={t('Search knowledge sources')} placeholder={t('Search sources…')} value={search} onChange={e => setSearch(e.target.value)}/><Select className="kw-library-category" label="Filter knowledge category" value={filter} onChange={setFilter} options={['All categories', ...categories]}/></div>{loading && <p className="kw-muted" role="status">{t('Refreshing sources…')}</p>}{!loading && !visible.length && <div className="kw-library-empty"><BookOpen size={22}/><p>{t(sources.length ? 'No sources match your search.' : 'Your knowledge starts here. Add your first source above.')}</p></div>}<div className="kw-library-list">{visible.map(source => <article key={source.id} className="kw-library-row"><span className="kw-source-icon">{source.type === 'url' ? <Globe2 size={18}/> : <FileText size={18}/>}</span><div className="kw-source-copy"><b title={source.name}>{displayName(source.name)}</b><small>{categoryOf(source.name)} · {source.chunk_count || 0} {t('indexed chunks')}</small>{source.error && <small className="kw-error-text">{source.error}</small>}</div><span className={`kw-status status-${source.status === 'ready' ? 'ready' : source.status === 'failed' ? 'failed' : 'pending'}`}>{source.status === 'ready' && <CheckCircle2 size={12}/>} {t(source.status)}</span><button type="button" className="kw-delete" aria-label={`${t('Remove source')} ${source.name}`} disabled={loading || busy || !!deleting} onClick={() => void remove(source)}>{deleting === source.id ? <Loader2 size={15} className="motion-safe:animate-spin"/> : <Trash2 size={15}/>}</button></article>)}</div></section>

    </div>

    {choice && createPortal(<dialog ref={dialog} className="kw-dialog text-slate-900 dark:text-slate-100" onCancel={() => { setChoice(false); choiceTrigger.current?.focus(); }} aria-labelledby="kw-choice-title"><form onSubmit={e => { e.preventDefault(); void train(); }}><div className="kw-dialog-heading"><span className="kw-upload-icon"><Sparkles size={24}/></span><button type="button" className="kw-delete" aria-label={t('Close training options')} onClick={() => setChoice(false)}><X size={20}/></button></div><span className="kw-eyebrow">{pending.length} {t('SOURCES SELECTED')}</span><h2 id="kw-choice-title">{t('How should your AI learn?')}</h2><p className="kw-muted">{t('Choose a new category or build on the knowledge you already have.')}</p><div className="kw-mode-options" role="radiogroup" aria-label={t('Training mode')}><label className={`kw-mode ${mode === 'new' ? 'selected' : ''}`}><input type="radio" name="training-mode" value="new" checked={mode === 'new'} onChange={() => setMode('new')}/><Plus size={21}/><span><b>{t('Train on Something New')}</b><small lang="ar" dir="rtl">تدريب على حاجة جديدة</small><p>{t('Organize these sources in a distinct, named category.')}</p></span></label><label className={`kw-mode ${mode === 'append' ? 'selected' : ''}`}><input type="radio" name="training-mode" value="append" checked={mode === 'append'} onChange={() => setMode('append')}/><Layers size={21}/><span><b>{t('Enhance / Append to Existing Data')}</b><small lang="ar" dir="rtl">تعزيز أو زيادة داتا على القديم</small><p>{t('Add sources to an existing category. Previous sources are preserved.')}</p></span></label></div><label className="kw-field-label" htmlFor="kw-category">{t(mode === 'new' ? 'New category name' : 'Append to category')}</label>{mode === 'new' ? <input id="kw-category" className="kw-category-input" value={category} onChange={e => setCategory(e.target.value)} maxLength={60} placeholder={t('e.g. Product launch')} required/> : <Select id="kw-category" label="Append to category" value={target} onChange={setTarget} options={categories}/>}<p className="kw-helper">{t('Categories organize sources in the shared assistant knowledge base.')}</p><div className="kw-dialog-actions"><button type="button" className="kw-button secondary" onClick={() => setChoice(false)}>{t('Review sources')}</button><button type="submit" className="kw-button primary" disabled={busy || loading || !!error || !pending.length || (mode === 'new' && !category.trim())}>{t('Start training')}<ArrowRight size={14}/></button></div></form></dialog>, document.body)}
  </section>;
}
