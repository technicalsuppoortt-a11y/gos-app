import { readSettings } from './settings/data';
import { callBackend, backendError } from '../backend/firebase';
import { useEntities } from '../backend/workspace';
import { useProducts } from './commerce/repository';
import { newProduct, defaultConfig, formatPrice } from './commerce/model';
import { createBuilderDocument } from './BuilderWorkspace';
import { useUILanguage, translateText, localizeNode } from '../i18n/display';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, BarChart3, CalendarDays, Check, ChevronRight, FileText, FileUp, Globe2, GraduationCap, History, LoaderCircle, Megaphone, MessageSquare, Mic, Pause, Play, Plus, Search, Send, ShieldCheck, SlidersHorizontal, Sparkles, Users, WandSparkles, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import type { RootState } from '../store';
import { stageLabel } from '../types/business';
import type { CanonicalLead } from '../store/slices/crmSlice';
import { showToast } from '../utils/toast';
import { TemplatesWorkspace } from './TemplatesWorkspace';
import { Select } from '../components/ui/Select';
import './ai-copilot.css';

type Kind = 'landing' | 'leads' | 'campaign' | 'booking' | 'product' | 'analytics' | 'question';
type MediaAttachment = { id: string; name: string; type: string; size: number; url: string; kind: 'image' | 'file' | 'audio'; };
type Message = { id: string; role: 'user' | 'assistant'; text: string; kind?: Kind; leads?: CanonicalLead[]; draftId?: string; href?: string; hrefLabel?: string; media?: MediaAttachment; };
type Draft = { id: string; kind: 'landing' | 'booking' | 'product' | 'campaign'; name: string; price: string; duration: string; channel: string; content: string; status: 'draft' | 'executing' | 'published' | 'failed'; };
type ToolResult<T> = { status: 'success'; statusCode: 200; data: T } | { status: 'error'; statusCode: number; error: string };
type ToolContext = { tenantId: string; userRole: string };

// Responses are produced by the `copilot` Cloud Function using approved tenant records.


const suggestions = [
  { title: 'Create a landing page', description: 'Build a high-converting page for your offer', icon: FileText, color: 'violet', prompt: 'Create a landing page for my offer' },
  { title: 'Show my hot leads', description: 'Find leads that need follow-up', icon: Users, color: 'green', prompt: 'Show my hot leads' },
  { title: 'Create a campaign', description: 'Generate messages for WhatsApp, Email, or Instagram', icon: Megaphone, color: 'orange', prompt: 'Create a campaign' },
  { title: 'Set up a booking flow', description: 'Create services and available times', icon: CalendarDays, color: 'blue', prompt: 'Set up a booking flow' },
  { title: 'Create a course or product', description: 'Build and sell your content', icon: GraduationCap, color: 'pink', prompt: 'Create a course or product' },
  { title: 'Analyze my performance', description: 'Get insights and recommendations', icon: BarChart3, color: 'purple', prompt: 'Analyze my performance' },
];

const starterHistory = [] as { id: string; title: string; group: string; category: string; time: string; prompt: string; messages: Message[] }[];

function classifyIntent(prompt: string): Kind {
  const text = prompt.toLowerCase();
  if (/lead|pipeline|follow.?up|crm/.test(text)) return 'leads';
  if (/campaign|message|whatsapp|email|instagram/.test(text)) return 'campaign';
  if (/book|booking|service|appointment|calendar/.test(text)) return 'booking';
  if (/course|product|price|sell/.test(text)) return 'product';
  if (/landing|funnel|page|website/.test(text)) return 'landing';
  if (/performance|revenue|analytics|conversion|report/.test(text)) return 'analytics';
  return 'question';
}

function makeDraft(kind: Draft['kind'], prompt: string): Draft {
  const nameMatch = prompt.match(/(?:called|named|for)\s+["“]?([^"”.,]+)["”]?/i);
  return { id: `draft-${Date.now()}`, kind, name: nameMatch?.[1]?.trim() || '', price: '', duration: '', channel: 'WhatsApp', content: '', status: 'draft' };
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

export const AICopilot: React.FC = () => {
  useUILanguage();
  const navigate = useNavigate(), location = useLocation();
  const { role, tenant } = useSelector((state: RootState) => state.auth);
  const leads = useSelector((state: RootState) => state.crm.leads);
  const tenantId = tenant?.id ?? (role === 'SUPER_ADMIN' ? 'platform-demo' : '');
  const context: ToolContext = { tenantId, userRole: role ?? 'USER' };
  const starterHistory = useEntities<{ id: string; title: string; group: string; category: string; time: string; prompt: string; messages: Message[] }>('copilotConversations');
  const [messages, setMessages] = useState<Message[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [historyOpen, setHistoryOpen] = useState(true);
  const [historySearch, setHistorySearch] = useState('');
  const [historySearchOpen, setHistorySearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState('All dates');
  const [categoryFilter, setCategoryFilter] = useState('All categories');
  const [sortOrder, setSortOrder] = useState('Most Recent');
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [deepResearch, setDeepResearch] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<MediaAttachment | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const [showWelcome, setShowWelcome] = useState(true);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef(0);
  const objectUrlsRef = useRef<string[]>([]);
  const visibleHistory = useMemo(() => {
    const filtered = starterHistory.filter(item => item.title.toLowerCase().includes(historySearch.toLowerCase()) && (dateFilter === 'All dates' || item.group === dateFilter) && (categoryFilter === 'All categories' || item.category === categoryFilter));
    if (sortOrder === 'Oldest') return [...filtered].reverse();
    if (sortOrder === 'Unread') return [...filtered].sort((a, b) => Number(b.id === 'hist-0') - Number(a.id === 'hist-0'));
    return filtered;
  }, [starterHistory, historySearch, dateFilter, categoryFilter, sortOrder]);

  useEffect(() => () => {
    if (recordingTimerRef.current !== null) window.clearInterval(recordingTimerRef.current);
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    recordingStreamRef.current?.getTracks().forEach(track => track.stop());
    objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
  }, []);

  const pushMessage = (message: Message) => setMessages(current => [...current, message]);
  const flash = (message: string) => { showToast.success(message); };
  const chooseHistory = (item: typeof starterHistory[number]) => {
    setActiveConversation(item.id);
    setShowWelcome(false);
    setMessages(item.messages ?? []);
  };

  async function runPrompt(rawPrompt: string) {
    const text = rawPrompt.trim();
    if (!text || busy) return;
    if (pendingMedia) { showToast.info('Upload this file to Knowledge before asking the assistant to use it.'); return; }
    const conversationId = activeConversation || crypto.randomUUID();
    setActiveConversation(conversationId); setPrompt(''); setShowWelcome(false); setBusy(true); setStatusText('Reviewing your workspace…');
    pushMessage({ id: crypto.randomUUID(), role: 'user', text });
    try {
      const answer = await callBackend<{ text: string; draft?: Omit<Draft, 'id' | 'status'> }>('copilot', { text, conversationId });
      const draftId = answer.draft ? crypto.randomUUID() : undefined;
      if (answer.draft && draftId) setDrafts(current => ({ ...current, [draftId]: { ...answer.draft!, id: draftId, status: 'draft' } }));
      pushMessage({ id: crypto.randomUUID(), role: 'assistant', text: answer.text, draftId });
      showToast.success('Assistant response received');
    } catch (error) { showToast.error(backendError(error)); pushMessage({ id: crypto.randomUUID(), role: 'assistant', text: backendError(error) }); }
    finally { setBusy(false); setStatusText(''); }
  }

  async function confirmDraft(draftId: string) {
    const draft = drafts[draftId];
    if (!draft || busy) return;
    if (!draft.name?.trim()) { showToast.error('Enter a name first.'); return; }
    setBusy(true); setStatusText('Saving your draft…');
    try {
      let record: Record<string, unknown>;
      if (draft.kind === 'product' || draft.kind === 'booking') {
        if (!draft.price?.trim() || !Number.isFinite(Number(draft.price)) || Number(draft.price) < 0) throw new Error('Enter a valid numeric price.');
        const product = newProduct(); product.name = draft.name; product.description = draft.content || ''; product.type = draft.kind === 'booking' ? 'Service' : 'Digital Product'; product.config = defaultConfig(product.type); product.config.amount = Number(draft.price); product.config.currency = readSettings().business.currency; if (product.config.experience) product.config.experience.visibility = 'Private'; if (draft.kind === 'booking') product.config.duration = Number(draft.duration); product.price = formatPrice(product.config); product.tag = product.type;
        if (draft.kind === 'booking' && (!Number.isFinite(Number(draft.duration)) || Number(draft.duration) <= 0)) throw new Error('Enter the service duration in minutes.');
        record = { ...product };
      } else if (draft.kind === 'landing') {
        const document = createBuilderDocument('funnel', draft.name, '', 1);
        document.funnel.status = 'Draft'; document.pages.forEach(page => { page.status = 'Draft'; });
        record = { id: draftId, name: draft.name, kind: 'funnel', domain: '', image: '', updated: new Date().toISOString(), document, description: draft.content || '', settings: { seo: draft.name, navigation: '', color: '#7C3AED' } };
      } else record = { name: draft.name, title: draft.name, description: draft.content || '', prompt: draft.content || '', iconKey: 'message', custom: true, category: 'Campaign', status: 'Draft' };
      await callBackend('createCopilotDraft', { draft, record, requestId: draftId });
      setDrafts(current => ({ ...current, [draftId]: { ...draft, status: 'published' } }));
      pushMessage({ id: crypto.randomUUID(), role: 'assistant', text: 'Your draft was saved. Open the workspace to review it before publishing.', href: draft.kind === 'landing' ? '/dashboard/funnels' : draft.kind === 'campaign' ? '/dashboard/ai-followup' : '/dashboard/products', hrefLabel: 'Review draft' });
      showToast.success('Draft saved');
    } catch (error) { setDrafts(current => ({ ...current, [draftId]: { ...draft, status: 'failed' } })); showToast.error(backendError(error)); }
    finally { setBusy(false); setStatusText(''); }
  }

  function updateDraft(id: string, key: keyof Draft, value: string) {
    setDrafts(current => ({ ...current, [id]: { ...current[id], [key]: value } }));
  }

  const startSuggestion = (value: string) => { setPrompt(value); void runPrompt(value); };

  const selectAttachment = (file?: File) => {
    if (!file) return;
    if (pendingMedia) URL.revokeObjectURL(pendingMedia.url);
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.push(url);
    const kind = file.type.startsWith('image/') ? 'image' : 'file';
    setPendingMedia({ id: `media-${Date.now()}`, name: file.name, type: file.type || 'application/octet-stream', size: file.size, url, kind });
    if (fileRef.current) fileRef.current.value = '';
  };

  const removePendingMedia = () => {
    if (pendingMedia) URL.revokeObjectURL(pendingMedia.url);
    setPendingMedia(null);
  };

  const stopRecording = () => {
    if (recordingTimerRef.current !== null) window.clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = null;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    setRecording(false);
  };

  const toggleRecording = async () => {
    if (recording) { stopRecording(); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      flash('Voice recording is not supported by this browser.'); return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: BlobPart[] = [];
      recorderRef.current = recorder;
      recorder.ondataavailable = event => { if (event.data.size > 0) chunks.push(event.data); };
      recorder.onerror = () => { stream.getTracks().forEach(track => track.stop()); recordingStreamRef.current = null; setRecording(false); flash('Recording stopped because the browser reported an audio error.'); };
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        recordingStreamRef.current = null;
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size) {
          const url = URL.createObjectURL(blob);
          objectUrlsRef.current.push(url);
          if (pendingMedia) URL.revokeObjectURL(pendingMedia.url);
          const elapsed = Math.max(1, Math.round((Date.now() - recordingStartedAtRef.current) / 1000));
          setPendingMedia({ id: `voice-${Date.now()}`, name: `Voice note · ${formatTime(elapsed)}`, type: blob.type, size: blob.size, url, kind: 'audio' });
          flash('Voice note ready to send.');
        }
      };
      setRecordingSeconds(0);
      recordingStartedAtRef.current = Date.now();
      setRecording(true);
      recordingTimerRef.current = window.setInterval(() => setRecordingSeconds(seconds => seconds + 1), 1000);
      recorder.start();
    } catch (error) {
      const reason = error instanceof DOMException && error.name === 'NotAllowedError' ? 'Microphone access was denied. Allow access in your browser settings to record a voice note.' : 'Could not start microphone recording.';
      flash(reason);
    }
  };

  if (new URLSearchParams(location.search).get('tab') === 'templates') return <><div className="native-template-nav"><button onClick={() => navigate('/dashboard/copilot')}>{translateText("Back to AI Copilot")}</button></div><TemplatesWorkspace scope="copilot" onInstall={template => setPrompt(template.content.headline)}/></>;
  return <div className={`ai-copilot-page ${historyOpen ? '' : 'history-collapsed'}`}>
    <section className="ai-copilot-main">
      <div className="ai-copilot-toolbar"><button onClick={() => navigate('/dashboard/copilot?tab=templates')}><Sparkles size={14}/>{translateText("Assistant templates")}</button><div><span className="ai-status-dot"/>{translateText(" Business context connected")}</div><button onClick={() => { setMessages([]); setShowWelcome(true); setActiveConversation(null); setPrompt(''); }}><Plus size={14}/>{translateText(" New chat")}</button></div>
      <div className="ai-copilot-thread" ref={listRef}>
        {localizeNode(showWelcome && messages.length === 0 ? <div className="ai-copilot-welcome">
          <div className="ai-copilot-badge"><Sparkles size={16}/>{translateText(" AI Business Copilot")}</div>
          <h1>{translateText("How can I help you grow")}<br className="ai-heading-break"/> <span>{translateText("your business today?")}</span></h1>
          <p>{translateText("Your AI Business Copilot knows your business and can help you create,")}<br className="ai-subtitle-break"/>{translateText(" analyze, and take action across your entire system.")}</p>
          <div className="ai-suggestion-grid">{localizeNode(suggestions.map(item => <button className="ai-suggestion-card" key={item.title} onClick={() => startSuggestion(item.prompt)}><span className={`ai-suggestion-icon ${item.color}`}><item.icon size={21}/></span><ChevronRight className="ai-suggestion-arrow" size={17}/><strong>{localizeNode(item.title)}</strong><small>{localizeNode(item.description)}</small></button>))}</div>
        </div> : <div className="ai-message-list">
          {messages.map(message => <div className={`ai-message ${message.role}`} key={message.id}>
            {localizeNode(message.role === 'assistant' && <span className="ai-message-avatar"><Sparkles size={14}/></span>)}
            <div className="ai-message-content"><p>{message.text}</p>{localizeNode(message.media && <MessageMedia media={message.media}/>)}
              {localizeNode(message.leads && <div className="ai-lead-results">{localizeNode(message.leads.slice(0, 4).map(lead => <div key={lead.id}><span className="ai-lead-avatar">{localizeNode(lead.avatar)}</span><b>{localizeNode(lead.name)}</b><span>{localizeNode(lead.company)}</span><em>{localizeNode(stageLabel[lead.stage])}</em><small>{localizeNode(lead.lastActivity)}</small></div>))}</div>)}
              {localizeNode(message.draftId && drafts[message.draftId] && <DraftPreview draft={drafts[message.draftId]} update={(key, value) => updateDraft(message.draftId!, key, value)} confirm={() => void confirmDraft(message.draftId!)} busy={busy}/>)}
              {localizeNode(message.href && <button className="ai-result-link" onClick={() => navigate(message.href!)}>{localizeNode(message.hrefLabel)}<ArrowUpRight size={14}/></button>)}
              {localizeNode(message.role === 'assistant' && <div className="ai-source-note"><ShieldCheck size={12}/>{translateText(" Grounded in approved workspace records")}</div>)}
            </div>
          </div>)}
          {localizeNode(busy && <div className="ai-thinking"><span className="ai-message-avatar"><Sparkles size={14}/></span><div><LoaderCircle size={14} className="ai-spinner"/>{localizeNode(statusText || 'Copilot is working…')}</div></div>)}
        </div>)}
      </div>
      {localizeNode(showWelcome && messages.length === 0 && <div className="ai-trust-note"><ShieldCheck size={13}/>{translateText(" You review and confirm actions before anything is published.")}</div>)}
      <div className="ai-composer-wrap"><div className="ai-composer">
        {localizeNode(pendingMedia && <AttachmentPreview media={pendingMedia} remove={removePendingMedia}/>)}
        <textarea value={prompt} onChange={event => setPrompt(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void runPrompt(prompt); } }} placeholder={translateText("Ask me anything about your business...")} aria-label={translateText("Ask the AI Copilot")}/>
        {localizeNode(recording && <div className="ai-recording-state" role="status"><span className="ai-recording-dot"/><strong>{translateText("Recording voice note")}</strong><span className="ai-wave" aria-hidden="true">{localizeNode(Array.from({ length: 18 }, (_, index) => <i key={index} style={{ animationDelay: `${index * 45}ms` }}/>))}</span><time>{localizeNode(formatTime(recordingSeconds))}</time><small>{translateText("Click the microphone to stop")}</small></div>)}
        <div className="ai-composer-tools"><div className="ai-tool-group"><input ref={fileRef} type="file" hidden accept="image/*,.pdf,.csv,.doc,.docx,.txt,.xlsx" onChange={event => selectAttachment(event.target.files?.[0])}/><button className="ai-tool-icon" onClick={() => fileRef.current?.click()} aria-label={translateText("Attach a file")}><Plus size={18}/></button><button className={`ai-tool-pill ${webSearch ? 'selected' : ''}`} onClick={() => setWebSearch(value => !value)}><Globe2 size={14}/>{translateText(" Search")}</button><button className={`ai-tool-pill ${deepResearch ? 'selected' : ''}`} onClick={() => setDeepResearch(value => !value)}><WandSparkles size={14}/>{translateText(" Deep Research")}</button></div><div className="ai-tool-actions"><button className={`ai-tool-icon ai-mic-button ${recording ? 'recording' : ''}`} aria-label={translateText(recording ? 'Stop voice recording' : 'Start voice recording')} aria-pressed={recording} onClick={() => void toggleRecording()}><Mic size={17}/></button><button className="ai-send-button" onClick={() => void runPrompt(prompt)} disabled={busy || recording || (!prompt.trim() && !pendingMedia)} aria-label={translateText("Send prompt")}><Send size={17}/></button></div></div>
      </div><div className="ai-composer-caption">{localizeNode(webSearch ? 'Web search enabled · ' : '')}{localizeNode(deepResearch ? 'Deep research enabled · ' : '')}{translateText("Copilot can make mistakes. Review drafts before confirming.")}</div></div>
    </section>
    <aside className={`ai-history-panel ${historyOpen ? '' : 'collapsed'}`}>
      <div className="ai-history-header"><div><span className="ai-history-mark"><History size={15}/></span><h2>{translateText("Chat History")}</h2></div><div className="ai-history-controls"><button onClick={() => { setHistorySearchOpen(value => !value); setFilterOpen(false); }} aria-label={translateText("Search conversation history")}><Search size={15}/></button><button onClick={() => setFilterOpen(value => !value)} aria-label={translateText("Filter conversations")} aria-expanded={filterOpen}><SlidersHorizontal size={15}/></button><button className="ai-history-collapse" onClick={() => setHistoryOpen(value => !value)} aria-label={translateText(historyOpen ? 'Collapse chat history' : 'Expand chat history')}><ChevronRight size={14}/></button></div></div>
      {localizeNode(historyOpen && <><AnimatePresence initial={false}>{localizeNode(historySearchOpen && <motion.label className="ai-history-search" initial={{ opacity: 0, y: -5, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: .98 }} transition={{ duration: .16 }}><Search size={14}/><input autoFocus value={historySearch} onChange={event => setHistorySearch(event.target.value)} placeholder={translateText("Search conversations")}/></motion.label>)}</AnimatePresence>
        <AnimatePresence initial={false}>{localizeNode(filterOpen && <motion.div className="ai-history-filter-menu" initial={{ opacity: 0, y: -7, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: .98 }} transition={{ duration: .18, ease: 'easeOut' }}>
          <div className="ai-filter-heading"><b>{translateText("Conversation filters")}</b><button onClick={() => { setDateFilter('All dates'); setCategoryFilter('All categories'); setSortOrder('Most Recent'); }}>{translateText("Reset")}</button></div>
          <FilterGroup title={translateText("Sort by")} options={['Most Recent', 'Oldest', 'Unread']} selected={sortOrder} onSelect={setSortOrder}/>
          <FilterGroup title={translateText("Filter by date")} options={['All dates', 'Today', 'Yesterday', 'This week', 'This month']} selected={dateFilter} onSelect={setDateFilter}/>
          <FilterGroup title={translateText("Filter by category")} options={['All categories', 'Campaigns', 'Landing Pages', 'Leads', 'General']} selected={categoryFilter} onSelect={setCategoryFilter}/>
        </motion.div>)}</AnimatePresence>
        <div className="ai-history-list">{localizeNode(['Today', 'Yesterday', 'This week', 'This month'].map(group => { const items = visibleHistory.filter(item => item.group === group); return items.length ? <section key={group}><h3>{localizeNode(group)}</h3>{localizeNode(items.map(item => <button className={`ai-history-item ${activeConversation === item.id ? 'active' : ''}`} key={item.id} onClick={() => chooseHistory(item)}><MessageSquare size={14}/><span>{localizeNode(item.title)}</span><small>{localizeNode(item.time)}</small></button>))}</section> : null; }))}{localizeNode(visibleHistory.length === 0 && <div className="ai-history-empty">{translateText("No conversations match these filters.")}</div>)}</div>
        <button className="ai-history-all" onClick={() => setShowAllHistory(true)}>{translateText("View all conversations ")}<ArrowRight size={14}/></button><div className="ai-history-security"><ShieldCheck size={14}/><span>{translateText("Private to ")}<b>{localizeNode(tenant?.name ?? 'your workspace')}</b></span></div></>)}
    </aside>
    <AnimatePresence>{localizeNode(showAllHistory && <motion.div className="ai-history-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowAllHistory(false); }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}><motion.section className="ai-history-modal" role="dialog" aria-modal="true" aria-labelledby="ai-history-modal-title" initial={{ opacity: 0, y: 12, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: .97 }} transition={{ type: 'spring', stiffness: 360, damping: 28 }}><header><div><span className="ai-history-mark"><History size={16}/></span><div><h2 id="ai-history-modal-title">{translateText("All conversations")}</h2><p>{localizeNode(starterHistory.length)}{translateText(" demo conversations · Private to your workspace")}</p></div></div><button onClick={() => setShowAllHistory(false)} aria-label={translateText("Close all conversations")}><X size={17}/></button></header><div className="ai-history-modal-list">{localizeNode(starterHistory.map(item => <button key={item.id} onClick={() => { chooseHistory(item); setShowAllHistory(false); }}><MessageSquare size={15}/><span><b>{localizeNode(item.title)}</b><small>{localizeNode(item.group)} · {localizeNode(item.category)}</small></span><time>{localizeNode(item.time)}</time><ChevronRight size={15}/></button>))}</div></motion.section></motion.div>)}</AnimatePresence>
  </div>;
};

function FilterGroup({ title, options, selected, onSelect }: { title: string; options: string[]; selected: string; onSelect: (value: string) => void }) {
  useUILanguage();
  return <section className="ai-filter-group"><h3>{localizeNode(title)}</h3>{localizeNode(options.map(option => <button key={option} className={selected === option ? 'selected' : ''} onClick={() => onSelect(option)}><span>{localizeNode(option)}</span>{localizeNode(selected === option && <Check size={13}/>)}</button>))}</section>;
}

function AttachmentPreview({ media, remove }: { media: MediaAttachment; remove: () => void }) {
  useUILanguage();
  if (media.kind === 'image') return <div className="ai-attachment-preview image"><a href={media.url} target="_blank" rel="noreferrer" aria-label={translateText(`Preview ${media.name}`)}><img src={media.url} alt={translateText(media.name)}/></a><span><b>{localizeNode(media.name)}</b><small>{localizeNode(formatBytes(media.size))}</small></span><button onClick={remove} aria-label={translateText("Remove attachment")}><X size={13}/></button></div>;
  return <div className={`ai-attachment-preview ${media.kind}`}><span className="ai-attachment-type-icon">{localizeNode(media.kind === 'audio' ? <Mic size={17}/> : <FileUp size={17}/>)}</span><span><b>{localizeNode(media.name)}</b><small>{localizeNode(media.kind === 'audio' ? `Recorded audio · ${formatBytes(media.size)}` : `${media.type || 'Document'} · ${formatBytes(media.size)}`)}</small></span><button onClick={remove} aria-label={translateText("Remove attachment")}><X size={13}/></button></div>;
}

function MessageMedia({ media }: { media: MediaAttachment }) {
  useUILanguage();
  if (media.kind === 'audio') return <AudioMessage media={media}/>;
  if (media.kind === 'image') return <a className="ai-message-image" href={media.url} target="_blank" rel="noreferrer" aria-label={translateText(`Open uploaded image ${media.name}`)}><img src={media.url} alt={translateText(media.name)}/><span>{localizeNode(media.name)}</span></a>;
  return <a className="ai-message-file" href={media.url} target="_blank" rel="noreferrer" download={media.name}><span><FileUp size={18}/></span><span><b>{localizeNode(media.name)}</b><small>{localizeNode(formatBytes(media.size))}{translateText(" · Document")}</small></span><ArrowUpRight size={14}/></a>;
}

function AudioMessage({ media }: { media: MediaAttachment }) {
  useUILanguage();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) { try { await audio.play(); setPlaying(true); } catch { setPlaying(false); } }
    else { audio.pause(); setPlaying(false); }
  };
  const progress = duration ? Math.min(100, (currentTime / duration) * 100) : 0;
  return <div className="ai-audio-message"><audio ref={audioRef} src={media.url} preload="metadata" onLoadedMetadata={event => setDuration(event.currentTarget.duration || 0)} onTimeUpdate={event => setCurrentTime(event.currentTarget.currentTime)} onEnded={() => setPlaying(false)}/><button className="ai-audio-play" onClick={() => void togglePlayback()} aria-label={translateText(playing ? 'Pause voice note' : 'Play voice note')}>{localizeNode(playing ? <Pause size={15} fill="currentColor"/> : <Play size={15} fill="currentColor"/>)}</button><div className="ai-audio-track"><div className="ai-audio-wave">{localizeNode(Array.from({ length: 32 }, (_, index) => <i key={index} className={index / 32 * 100 <= progress ? 'played' : ''} style={{ height: `${5 + ((index * 17 + 11) % 13)}px` }}/>))}</div><div className="ai-audio-progress"><i style={{ width: `${progress}%` }}/></div></div><span className="ai-audio-time">{localizeNode(formatTime(Math.floor(currentTime)))} / {localizeNode(formatTime(Math.floor(duration)))}</span></div>;
}

function DraftPreview({ draft, update, confirm, busy }: { draft: Draft; update: (key: keyof Draft, value: string) => void; confirm: () => void; busy: boolean }) {
  useUILanguage();
  const title = draft.kind === 'booking' ? 'Service draft' : draft.kind === 'product' ? 'Product draft' : draft.kind === 'campaign' ? 'Campaign draft' : 'Landing page draft';
  return <div className="ai-draft-card"><div className="ai-draft-title"><span><span className="ai-draft-icon"><Sparkles size={15}/></span><b>{localizeNode(title)}</b></span><span className={`ai-draft-status ${draft.status}`}>{localizeNode(draft.status === 'published' ? <><Check size={12}/>{translateText(" Confirmed")}</> : draft.status === 'executing' ? 'Processing…' : draft.status === 'failed' ? 'Not published' : 'Needs review')}</span></div>
    <label>{localizeNode(draft.kind === 'landing' ? 'Page name' : draft.kind === 'campaign' ? 'Campaign name' : draft.kind === 'booking' ? 'Service name' : 'Product name')}<input value={draft.name} onChange={event => update('name', event.target.value)} placeholder={translateText(draft.kind === 'booking' ? 'e.g. Strategy consultation' : draft.kind === 'campaign' ? 'e.g. October launch' : draft.kind === 'landing' ? 'e.g. Brand strategy offer' : 'e.g. New course')}/></label>
    {localizeNode((draft.kind === 'booking' || draft.kind === 'product') && <div className="ai-draft-fields"><label>{translateText("Price")}<input value={draft.price} onChange={event => update('price', event.target.value)} placeholder={translateText("Enter price")} inputMode="decimal"/></label>{localizeNode(draft.kind === 'booking' && <label>{translateText("Duration")}<input value={draft.duration} onChange={event => update('duration', event.target.value)} placeholder={translateText("Minutes")} inputMode="numeric"/></label>)}</div>)}
    {localizeNode(draft.kind === 'campaign' && <><label className="flex flex-col gap-1.5">{translateText("Channel")}<Select value={draft.channel} onChange={value => update('channel', value)} options={['WhatsApp', 'Email', 'Instagram']} /></label><label>{translateText("Message")}<textarea value={draft.content} onChange={event => update('content', event.target.value)} placeholder={translateText("Write and review your message")}/></label></>)}
    {localizeNode(draft.kind === 'landing' && <div className="ai-draft-preview"><div className="ai-preview-top"><span>{translateText("PAGE PREVIEW")}</span><span><span/>{translateText("Draft")}</span></div><strong>{localizeNode(draft.name || 'Your offer headline')}</strong><p>{translateText("Page content remains a draft until you review and confirm it in Funnel & Website.")}</p><div><i/><i/><i/></div></div>)}
    <div className="ai-draft-footer"><span><ShieldCheck size={12}/>{translateText(" Nothing publishes without confirmation")}</span><button onClick={confirm} disabled={busy || draft.status === 'published' || draft.status === 'executing'}>{localizeNode(draft.status === 'published' ? 'Confirmed' : draft.status === 'executing' ? <><LoaderCircle size={13} className="ai-spinner"/>{translateText(" Processing")}</> : draft.kind === 'campaign' ? 'Confirm & send' : draft.kind === 'landing' ? 'Publish draft' : 'Confirm & create')}<ArrowRight size={13}/></button></div>
  </div>;
}
