import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, BarChart3, CalendarDays, Check, CheckCircle2, ChevronRight, FileText, FileUp, Globe2, GraduationCap, History, LoaderCircle, Megaphone, MessageSquare, Mic, Pause, Play, Plus, Search, Send, ShieldCheck, SlidersHorizontal, Sparkles, Users, WandSparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import type { RootState } from '../store';
import { bookings, calendars, leads, products, stageLabel } from '../data/mockData';
import './ai-copilot.css';

type Kind = 'landing' | 'leads' | 'campaign' | 'booking' | 'product' | 'analytics' | 'question';
type MediaAttachment = { id: string; name: string; type: string; size: number; url: string; kind: 'image' | 'file' | 'audio'; };
type Message = { id: string; role: 'user' | 'assistant'; text: string; kind?: Kind; leads?: typeof leads; draftId?: string; href?: string; hrefLabel?: string; media?: MediaAttachment; };
type Draft = { id: string; kind: 'landing' | 'booking' | 'product' | 'campaign'; name: string; price: string; duration: string; channel: string; content: string; status: 'draft' | 'executing' | 'published' | 'failed'; };
type ToolResult<T> = { status: 'success'; statusCode: 200; data: T } | { status: 'error'; statusCode: number; error: string };
type ToolContext = { tenantId: string; userRole: string };

const pause = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms));

// Local demo adapters use the same explicit success contract expected from a backend.
const demoTools = {
  async fetchLeads(context: ToolContext, canonicalLeads: typeof leads): Promise<ToolResult<typeof leads>> {
    await pause(480);
    if (!context.tenantId) return { status: 'error', statusCode: 403, error: 'Workspace context is missing.' };
    return { status: 'success', statusCode: 200, data: canonicalLeads.filter(lead => !['CLOSED', 'CLOSED_LOST', 'CUSTOMER', 'ACTIVE_CUSTOMER'].includes(lead.stage)) };
  },
  async createDraft(context: ToolContext, draft: Draft): Promise<ToolResult<{ id: string; name: string }>> {
    await pause(700);
    if (!context.tenantId) return { status: 'error', statusCode: 403, error: 'Workspace context is missing.' };
    if (!draft.name.trim()) return { status: 'error', statusCode: 422, error: 'A name is required.' };
    if ((draft.kind === 'booking' || draft.kind === 'product') && (!draft.price.trim() || !draft.duration.trim() && draft.kind === 'booking')) {
      return { status: 'error', statusCode: 422, error: 'Required service details are incomplete.' };
    }
    // Demo execution is scoped to the current tenant and intentionally does not mutate shared fixtures.
    return { status: 'success', statusCode: 200, data: { id: `demo-${draft.kind}-${Date.now()}`, name: draft.name.trim() } };
  },
};

const suggestions = [
  { title: 'Create a landing page', description: 'Build a high-converting page for your offer', icon: FileText, color: 'violet', prompt: 'Create a landing page for my offer' },
  { title: 'Show my hot leads', description: 'Find leads that need follow-up', icon: Users, color: 'green', prompt: 'Show my hot leads' },
  { title: 'Create a campaign', description: 'Generate messages for WhatsApp, Email, or Instagram', icon: Megaphone, color: 'orange', prompt: 'Create a campaign' },
  { title: 'Set up a booking flow', description: 'Create services and available times', icon: CalendarDays, color: 'blue', prompt: 'Set up a booking flow' },
  { title: 'Create a course or product', description: 'Build and sell your content', icon: GraduationCap, color: 'pink', prompt: 'Create a course or product' },
  { title: 'Analyze my performance', description: 'Get insights and recommendations', icon: BarChart3, color: 'purple', prompt: 'Analyze my performance' },
];

const starterHistory = [
  { id: 'hist-0', title: 'Create a Ramadan campaign', group: 'Today', category: 'Campaigns', time: '10:24 AM', prompt: 'Create a campaign for Ramadan' },
  { id: 'hist-1', title: 'Show my hot leads', group: 'Today', category: 'Leads', time: '09:15 AM', prompt: 'Show my hot leads' },
  { id: 'hist-2', title: 'Build a landing page for my offer', group: 'Yesterday', category: 'Landing Pages', time: '04:32 PM', prompt: 'Create a landing page for my offer' },
  { id: 'hist-3', title: 'Analyze last week performance', group: 'Yesterday', category: 'Leads', time: '05:21 PM', prompt: 'Analyze my performance' },
  { id: 'hist-4', title: 'Write follow-up messages', group: 'Yesterday', category: 'Campaigns', time: '03:10 PM', prompt: 'Create a follow-up campaign' },
  { id: 'hist-5', title: 'Set up booking for consultations', group: 'This week', category: 'General', time: 'Mon', prompt: 'Set up a booking flow' },
  { id: 'hist-6', title: 'Improve my website', group: 'This week', category: 'Landing Pages', time: 'Mon', prompt: 'Create a landing page to improve my website' },
  { id: 'hist-7', title: 'Create an email campaign', group: 'This month', category: 'Campaigns', time: 'Apr 20', prompt: 'Create an email campaign' },
];

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
  const navigate = useNavigate();
  const { role, tenant } = useSelector((state: RootState) => state.auth);
  const leads = useSelector((state: RootState) => state.crm.leads);
  const tenantId = tenant?.id ?? (role === 'SUPER_ADMIN' ? 'platform-demo' : '');
  const context: ToolContext = { tenantId, userRole: role ?? 'USER' };
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
  const [toast, setToast] = useState('');
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
  }, [historySearch, dateFilter, categoryFilter, sortOrder]);

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
  const flash = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
  const chooseHistory = (item: typeof starterHistory[number]) => {
    setActiveConversation(item.id);
    setShowWelcome(false);
    const response = item.category === 'Leads' ? 'I can review the lead records currently available in your workspace. No customer messages have been sent.' : item.category === 'Landing Pages' ? 'I can prepare a page draft for your review. It remains unpublished until you confirm.' : 'I can prepare a campaign draft for your review. Nothing has been sent.';
    setMessages([{ id: `h-${item.id}`, role: 'user', text: item.prompt }, { id: `a-${item.id}`, role: 'assistant', text: response }]);
  };

  async function runPrompt(rawPrompt: string) {
    const attachmentToSend = pendingMedia;
    const text = rawPrompt.trim() || (attachmentToSend ? `Review the attached file: ${attachmentToSend.name}` : '');
    if (!text || busy) return;
    setPrompt(''); setPendingMedia(null); setShowWelcome(false); setActiveConversation(null); setBusy(true);
    pushMessage({ id: `u-${Date.now()}`, role: 'user', text, media: attachmentToSend ?? undefined });
    const kind = classifyIntent(text);
    await pause(300); setStatusText('Understanding your request…');
    await pause(350); setStatusText('Resolving workspace and permissions…');
    if (!tenantId && role !== 'SUPER_ADMIN') {
      pushMessage({ id: `a-${Date.now()}`, role: 'assistant', text: 'I can’t access workspace data because no tenant is available in this session. Please sign in to a workspace and try again.' });
      setStatusText(''); setBusy(false); return;
    }
    if (kind === 'analytics' && role === 'USER' && /revenue|payment|financial/i.test(text)) {
      pushMessage({ id: `a-${Date.now()}`, role: 'assistant', text: 'Your current role does not have permission to view financial data. Ask a workspace admin to grant access.' });
      setStatusText(''); setBusy(false); return;
    }
    await pause(320); setStatusText('Checking approved business context…');
    await pause(320);
    if (kind === 'leads') {
      setStatusText('Checking lead records…');
      const result = await demoTools.fetchLeads(context, leads);
      if (result.status !== 'success' || result.statusCode !== 200) {
        pushMessage({ id: `a-${Date.now()}`, role: 'assistant', text: result.status === 'error' ? `I couldn’t fetch leads: ${result.error}` : 'I could not verify the lead records.' });
      } else {
        const matches = result.data;
        const names = matches.slice(0, 3).map(lead => lead.name).join(', ');
        pushMessage({ id: `a-${Date.now()}`, role: 'assistant', kind, leads: matches, text: `I found ${matches.length} leads in active follow-up stages: ${names}${matches.length > 3 ? ', and more' : ''}. These are existing CRM records; I have not sent any messages.`, href: '/dashboard/crm', hrefLabel: 'Open CRM' });
      }
    } else if (kind === 'analytics') {
      const activeLeads = leads.filter(lead => !['CLOSED', 'CUSTOMER'].includes(lead.stage)).length;
      const upcomingBookings = bookings.filter(booking => booking.status === 'Confirmed').length;
      const catalogValue = products.reduce((sum, product) => sum + product.price * product.sales, 0);
      const canReadRevenue = role === 'ADMIN' || role === 'SUPER_ADMIN';
      pushMessage({ id: `a-${Date.now()}`, role: 'assistant', kind, text: `From the current demo records, ${activeLeads} leads are in open pipeline stages and ${upcomingBookings} bookings are confirmed. ${canReadRevenue ? `The catalog's listed prices multiplied by recorded sales total ${catalogValue.toLocaleString()} ${products[0]?.currency ?? ''}; this is a catalog calculation, not verified revenue.` : 'I have not included financial data because your role does not have financial access.'}`, href: '/dashboard/analytics', hrefLabel: 'Open Analytics' });
    } else if (kind === 'question') {
      const knownService = products.find(product => product.type === 'Service');
      pushMessage({ id: `a-${Date.now()}`, role: 'assistant', text: `I can help with that. I’m using the available workspace context: ${products.length} listed products and ${calendars.length} calendars. Tell me which outcome you want, and I’ll prepare a reviewable draft or inspect a specific record. ${knownService ? `Known service: ${knownService.name}.` : ''}` });
    } else {
      const draftKind: Draft['kind'] = kind;
      const draft = makeDraft(draftKind, text);
      setDrafts(current => ({ ...current, [draft.id]: draft }));
      const clarification = kind === 'booking' ? 'A service name, price, and appointment duration are needed before I can create this service. Enter those values in the draft.' : kind === 'product' ? 'A product name and price are needed before I can create this product. Enter those values in the draft.' : kind === 'campaign' ? 'Review the message and delivery channel before confirming. Nothing will be sent until you confirm.' : 'Review the page name and copy before publishing. Nothing will be published until you confirm.';
      setStatusText(kind === 'booking' || kind === 'product' ? 'Checking required service details…' : 'Preparing a reviewable draft…');
      await pause(350);
      pushMessage({ id: `a-${Date.now()}`, role: 'assistant', kind, draftId: draft.id, text: `${clarification} I have not invented any pricing, availability, or customer details.` });
    }
    setStatusText(''); setBusy(false);
    window.setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }), 50);
  }

  async function confirmDraft(draftId: string) {
    const draft = drafts[draftId];
    if (!draft || busy) return;
    const serviceNeeds = draft.kind === 'booking' && (!draft.name.trim() || !draft.price.trim() || !draft.duration.trim());
    const productNeeds = draft.kind === 'product' && (!draft.name.trim() || !draft.price.trim());
    const campaignNeeds = draft.kind === 'campaign' && (!draft.name.trim() || !draft.content.trim());
    const pageNeeds = draft.kind === 'landing' && !draft.name.trim();
    if (serviceNeeds || productNeeds || campaignNeeds || pageNeeds) {
      flash(serviceNeeds ? 'Add a service name, price, and duration first.' : productNeeds ? 'Add a product name and price first.' : campaignNeeds ? 'Add a campaign name and message first.' : 'Add a page name first.');
      return;
    }
    if ((draft.kind === 'booking' || draft.kind === 'product') && role === 'USER') {
      flash('Only workspace admins can publish services or products.'); return;
    }
    setBusy(true); setStatusText('Executing the confirmed demo tool…');
    setDrafts(current => ({ ...current, [draftId]: { ...current[draftId], status: 'executing' } }));
    const result = await demoTools.createDraft(context, draft);
    await pause(200);
    if (result.status === 'success' && result.statusCode === 200) {
      setDrafts(current => ({ ...current, [draftId]: { ...current[draftId], status: 'published' } }));
      const destination = draft.kind === 'booking' ? '/dashboard/booking' : draft.kind === 'product' ? '/dashboard/products' : '/dashboard/funnels';
      pushMessage({ id: `result-${Date.now()}`, role: 'assistant', text: `Demo tool confirmed the ${draft.kind === 'booking' ? 'service' : draft.kind} “${result.data.name}” was created successfully (200 OK). This prototype confirms the local demo action only; canonical production records were not changed.`, href: destination, hrefLabel: draft.kind === 'booking' ? 'View booking services' : draft.kind === 'product' ? 'View products' : 'View funnels' });
      flash('Demo action confirmed');
    } else {
      setDrafts(current => ({ ...current, [draftId]: { ...current[draftId], status: 'failed' } }));
      pushMessage({ id: `error-${Date.now()}`, role: 'assistant', text: result.status === 'error' ? `The demo tool did not confirm this action: ${result.error}. Nothing was published.` : 'The demo tool returned an unverified result. Nothing was published.' });
    }
    setBusy(false); setStatusText('');
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

  return <div className={`ai-copilot-page ${historyOpen ? '' : 'history-collapsed'}`}>
    <section className="ai-copilot-main">
      <div className="ai-copilot-toolbar"><div><span className="ai-status-dot"/> Business context connected</div><button onClick={() => { setMessages([]); setShowWelcome(true); setActiveConversation(null); setPrompt(''); }}><Plus size={14}/> New chat</button></div>
      <div className="ai-copilot-thread" ref={listRef}>
        {showWelcome && messages.length === 0 ? <div className="ai-copilot-welcome">
          <div className="ai-copilot-badge"><Sparkles size={16}/> AI Business Copilot</div>
          <h1>How can I help you grow<br className="ai-heading-break"/> <span>your business today?</span></h1>
          <p>Your AI Business Copilot knows your business and can help you create,<br className="ai-subtitle-break"/> analyze, and take action across your entire system.</p>
          <div className="ai-suggestion-grid">{suggestions.map(item => <button className="ai-suggestion-card" key={item.title} onClick={() => startSuggestion(item.prompt)}><span className={`ai-suggestion-icon ${item.color}`}><item.icon size={21}/></span><ChevronRight className="ai-suggestion-arrow" size={17}/><strong>{item.title}</strong><small>{item.description}</small></button>)}</div>
        </div> : <div className="ai-message-list">
          {messages.map(message => <div className={`ai-message ${message.role}`} key={message.id}>
            {message.role === 'assistant' && <span className="ai-message-avatar"><Sparkles size={14}/></span>}
            <div className="ai-message-content"><p>{message.text}</p>{message.media && <MessageMedia media={message.media}/>}
              {message.leads && <div className="ai-lead-results">{message.leads.slice(0, 4).map(lead => <div key={lead.id}><span className="ai-lead-avatar">{lead.avatar}</span><b>{lead.name}</b><span>{lead.company}</span><em>{stageLabel[lead.stage]}</em><small>{lead.lastActivity}</small></div>)}</div>}
              {message.draftId && drafts[message.draftId] && <DraftPreview draft={drafts[message.draftId]} update={(key, value) => updateDraft(message.draftId!, key, value)} confirm={() => void confirmDraft(message.draftId!)} busy={busy}/>}
              {message.href && <button className="ai-result-link" onClick={() => navigate(message.href!)}>{message.hrefLabel}<ArrowUpRight size={14}/></button>}
              {message.role === 'assistant' && <div className="ai-source-note"><ShieldCheck size={12}/> Uses current workspace demo records</div>}
            </div>
          </div>)}
          {busy && <div className="ai-thinking"><span className="ai-message-avatar"><Sparkles size={14}/></span><div><LoaderCircle size={14} className="ai-spinner"/>{statusText || 'Copilot is working…'}</div></div>}
        </div>}
      </div>
      {showWelcome && messages.length === 0 && <div className="ai-trust-note"><ShieldCheck size={13}/> You review and confirm actions before anything is published.</div>}
      <div className="ai-composer-wrap"><div className="ai-composer">
        {pendingMedia && <AttachmentPreview media={pendingMedia} remove={removePendingMedia}/>}
        <textarea value={prompt} onChange={event => setPrompt(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void runPrompt(prompt); } }} placeholder="Ask me anything about your business..." aria-label="Ask the AI Copilot"/>
        {recording && <div className="ai-recording-state" role="status"><span className="ai-recording-dot"/><strong>Recording voice note</strong><span className="ai-wave" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i key={index} style={{ animationDelay: `${index * 45}ms` }}/>)}</span><time>{formatTime(recordingSeconds)}</time><small>Click the microphone to stop</small></div>}
        <div className="ai-composer-tools"><div className="ai-tool-group"><input ref={fileRef} type="file" hidden accept="image/*,.pdf,.csv,.doc,.docx,.txt,.xlsx" onChange={event => selectAttachment(event.target.files?.[0])}/><button className="ai-tool-icon" onClick={() => fileRef.current?.click()} aria-label="Attach a file"><Plus size={18}/></button><button className={`ai-tool-pill ${webSearch ? 'selected' : ''}`} onClick={() => setWebSearch(value => !value)}><Globe2 size={14}/> Search</button><button className={`ai-tool-pill ${deepResearch ? 'selected' : ''}`} onClick={() => setDeepResearch(value => !value)}><WandSparkles size={14}/> Deep Research</button></div><div className="ai-tool-actions"><button className={`ai-tool-icon ai-mic-button ${recording ? 'recording' : ''}`} aria-label={recording ? 'Stop voice recording' : 'Start voice recording'} aria-pressed={recording} onClick={() => void toggleRecording()}><Mic size={17}/></button><button className="ai-send-button" onClick={() => void runPrompt(prompt)} disabled={busy || recording || (!prompt.trim() && !pendingMedia)} aria-label="Send prompt"><Send size={17}/></button></div></div>
      </div><div className="ai-composer-caption">{webSearch ? 'Web search enabled · ' : ''}{deepResearch ? 'Deep research enabled · ' : ''}Copilot can make mistakes. Review drafts before confirming.</div></div>
    </section>
    <aside className={`ai-history-panel ${historyOpen ? '' : 'collapsed'}`}>
      <div className="ai-history-header"><div><span className="ai-history-mark"><History size={15}/></span><h2>Chat History</h2></div><div className="ai-history-controls"><button onClick={() => { setHistorySearchOpen(value => !value); setFilterOpen(false); }} aria-label="Search conversation history"><Search size={15}/></button><button onClick={() => setFilterOpen(value => !value)} aria-label="Filter conversations" aria-expanded={filterOpen}><SlidersHorizontal size={15}/></button><button className="ai-history-collapse" onClick={() => setHistoryOpen(value => !value)} aria-label={historyOpen ? 'Collapse chat history' : 'Expand chat history'}><ChevronRight size={14}/></button></div></div>
      {historyOpen && <><AnimatePresence initial={false}>{historySearchOpen && <motion.label className="ai-history-search" initial={{ opacity: 0, y: -5, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: .98 }} transition={{ duration: .16 }}><Search size={14}/><input autoFocus value={historySearch} onChange={event => setHistorySearch(event.target.value)} placeholder="Search conversations"/></motion.label>}</AnimatePresence>
        <AnimatePresence initial={false}>{filterOpen && <motion.div className="ai-history-filter-menu" initial={{ opacity: 0, y: -7, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: .98 }} transition={{ duration: .18, ease: 'easeOut' }}>
          <div className="ai-filter-heading"><b>Conversation filters</b><button onClick={() => { setDateFilter('All dates'); setCategoryFilter('All categories'); setSortOrder('Most Recent'); }}>Reset</button></div>
          <FilterGroup title="Sort by" options={['Most Recent', 'Oldest', 'Unread']} selected={sortOrder} onSelect={setSortOrder}/>
          <FilterGroup title="Filter by date" options={['All dates', 'Today', 'Yesterday', 'This week', 'This month']} selected={dateFilter} onSelect={setDateFilter}/>
          <FilterGroup title="Filter by category" options={['All categories', 'Campaigns', 'Landing Pages', 'Leads', 'General']} selected={categoryFilter} onSelect={setCategoryFilter}/>
        </motion.div>}</AnimatePresence>
        <div className="ai-history-list">{['Today', 'Yesterday', 'This week', 'This month'].map(group => { const items = visibleHistory.filter(item => item.group === group); return items.length ? <section key={group}><h3>{group}</h3>{items.map(item => <button className={`ai-history-item ${activeConversation === item.id ? 'active' : ''}`} key={item.id} onClick={() => chooseHistory(item)}><MessageSquare size={14}/><span>{item.title}</span><small>{item.time}</small></button>)}</section> : null; })}{visibleHistory.length === 0 && <div className="ai-history-empty">No conversations match these filters.</div>}</div>
        <button className="ai-history-all" onClick={() => setShowAllHistory(true)}>View all conversations <ArrowRight size={14}/></button><div className="ai-history-security"><ShieldCheck size={14}/><span>Private to <b>{tenant?.name ?? 'your workspace'}</b></span></div></>}
    </aside>
    <AnimatePresence>{showAllHistory && <motion.div className="ai-history-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowAllHistory(false); }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}><motion.section className="ai-history-modal" role="dialog" aria-modal="true" aria-labelledby="ai-history-modal-title" initial={{ opacity: 0, y: 12, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: .97 }} transition={{ type: 'spring', stiffness: 360, damping: 28 }}><header><div><span className="ai-history-mark"><History size={16}/></span><div><h2 id="ai-history-modal-title">All conversations</h2><p>{starterHistory.length} demo conversations · Private to your workspace</p></div></div><button onClick={() => setShowAllHistory(false)} aria-label="Close all conversations"><X size={17}/></button></header><div className="ai-history-modal-list">{starterHistory.map(item => <button key={item.id} onClick={() => { chooseHistory(item); setShowAllHistory(false); }}><MessageSquare size={15}/><span><b>{item.title}</b><small>{item.group} · {item.category}</small></span><time>{item.time}</time><ChevronRight size={15}/></button>)}</div></motion.section></motion.div>}</AnimatePresence>
    {toast && <div className="ai-toast"><CheckCircle2 size={15}/>{toast}</div>}
  </div>;
};

function FilterGroup({ title, options, selected, onSelect }: { title: string; options: string[]; selected: string; onSelect: (value: string) => void }) {
  return <section className="ai-filter-group"><h3>{title}</h3>{options.map(option => <button key={option} className={selected === option ? 'selected' : ''} onClick={() => onSelect(option)}><span>{option}</span>{selected === option && <Check size={13}/>}</button>)}</section>;
}

function AttachmentPreview({ media, remove }: { media: MediaAttachment; remove: () => void }) {
  if (media.kind === 'image') return <div className="ai-attachment-preview image"><a href={media.url} target="_blank" rel="noreferrer" aria-label={`Preview ${media.name}`}><img src={media.url} alt={media.name}/></a><span><b>{media.name}</b><small>{formatBytes(media.size)}</small></span><button onClick={remove} aria-label="Remove attachment"><X size={13}/></button></div>;
  return <div className={`ai-attachment-preview ${media.kind}`}><span className="ai-attachment-type-icon">{media.kind === 'audio' ? <Mic size={17}/> : <FileUp size={17}/>}</span><span><b>{media.name}</b><small>{media.kind === 'audio' ? `Recorded audio · ${formatBytes(media.size)}` : `${media.type || 'Document'} · ${formatBytes(media.size)}`}</small></span><button onClick={remove} aria-label="Remove attachment"><X size={13}/></button></div>;
}

function MessageMedia({ media }: { media: MediaAttachment }) {
  if (media.kind === 'audio') return <AudioMessage media={media}/>;
  if (media.kind === 'image') return <a className="ai-message-image" href={media.url} target="_blank" rel="noreferrer" aria-label={`Open uploaded image ${media.name}`}><img src={media.url} alt={media.name}/><span>{media.name}</span></a>;
  return <a className="ai-message-file" href={media.url} target="_blank" rel="noreferrer" download={media.name}><span><FileUp size={18}/></span><span><b>{media.name}</b><small>{formatBytes(media.size)} · Document</small></span><ArrowUpRight size={14}/></a>;
}

function AudioMessage({ media }: { media: MediaAttachment }) {
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
  return <div className="ai-audio-message"><audio ref={audioRef} src={media.url} preload="metadata" onLoadedMetadata={event => setDuration(event.currentTarget.duration || 0)} onTimeUpdate={event => setCurrentTime(event.currentTarget.currentTime)} onEnded={() => setPlaying(false)}/><button className="ai-audio-play" onClick={() => void togglePlayback()} aria-label={playing ? 'Pause voice note' : 'Play voice note'}>{playing ? <Pause size={15} fill="currentColor"/> : <Play size={15} fill="currentColor"/>}</button><div className="ai-audio-track"><div className="ai-audio-wave">{Array.from({ length: 32 }, (_, index) => <i key={index} className={index / 32 * 100 <= progress ? 'played' : ''} style={{ height: `${5 + ((index * 17 + 11) % 13)}px` }}/>)}</div><div className="ai-audio-progress"><i style={{ width: `${progress}%` }}/></div></div><span className="ai-audio-time">{formatTime(Math.floor(currentTime))} / {formatTime(Math.floor(duration))}</span></div>;
}

function DraftPreview({ draft, update, confirm, busy }: { draft: Draft; update: (key: keyof Draft, value: string) => void; confirm: () => void; busy: boolean }) {
  const title = draft.kind === 'booking' ? 'Service draft' : draft.kind === 'product' ? 'Product draft' : draft.kind === 'campaign' ? 'Campaign draft' : 'Landing page draft';
  return <div className="ai-draft-card"><div className="ai-draft-title"><span><span className="ai-draft-icon"><Sparkles size={15}/></span><b>{title}</b></span><span className={`ai-draft-status ${draft.status}`}>{draft.status === 'published' ? <><Check size={12}/> Confirmed</> : draft.status === 'executing' ? 'Processing…' : draft.status === 'failed' ? 'Not published' : 'Needs review'}</span></div>
    <label>{draft.kind === 'landing' ? 'Page name' : draft.kind === 'campaign' ? 'Campaign name' : draft.kind === 'booking' ? 'Service name' : 'Product name'}<input value={draft.name} onChange={event => update('name', event.target.value)} placeholder={draft.kind === 'booking' ? 'e.g. Strategy consultation' : draft.kind === 'campaign' ? 'e.g. October launch' : draft.kind === 'landing' ? 'e.g. Brand strategy offer' : 'e.g. New course'}/></label>
    {(draft.kind === 'booking' || draft.kind === 'product') && <div className="ai-draft-fields"><label>Price<input value={draft.price} onChange={event => update('price', event.target.value)} placeholder="Enter price" inputMode="decimal"/></label>{draft.kind === 'booking' && <label>Duration<input value={draft.duration} onChange={event => update('duration', event.target.value)} placeholder="Minutes" inputMode="numeric"/></label>}</div>}
    {draft.kind === 'campaign' && <><label>Channel<select value={draft.channel} onChange={event => update('channel', event.target.value)}><option>WhatsApp</option><option>Email</option><option>Instagram</option></select></label><label>Message<textarea value={draft.content} onChange={event => update('content', event.target.value)} placeholder="Write and review your message"/></label></>}
    {draft.kind === 'landing' && <div className="ai-draft-preview"><div className="ai-preview-top"><span>PAGE PREVIEW</span><span><span/>Draft</span></div><strong>{draft.name || 'Your offer headline'}</strong><p>Page content remains a draft until you review and confirm it in Funnel & Website.</p><div><i/><i/><i/></div></div>}
    <div className="ai-draft-footer"><span><ShieldCheck size={12}/> Nothing publishes without confirmation</span><button onClick={confirm} disabled={busy || draft.status === 'published' || draft.status === 'executing'}>{draft.status === 'published' ? 'Confirmed' : draft.status === 'executing' ? <><LoaderCircle size={13} className="ai-spinner"/> Processing</> : draft.kind === 'campaign' ? 'Confirm & send' : draft.kind === 'landing' ? 'Publish draft' : 'Confirm & create'}<ArrowRight size={13}/></button></div>
  </div>;
}
