import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Bold, Bot, Camera, Check, CheckCheck, ChevronDown, Clock3, FileText, Filter, Image, Italic, Mail, MessageCircle, Mic, MoreHorizontal, Paperclip, Pause, Play, Plus, Search, Send, ShieldCheck, Users, X } from 'lucide-react';
import { channels, initialsColor, stageLabel } from '../data/mockData';
import type { Lead } from '../data/mockData';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { addLeadActivity } from '../store/slices/crmSlice';
import './inbox.css';

type Attachment = { id: string; file: File; url: string; isImage: boolean };
type VoiceNote = { url: string; duration: number };
type SentMessage = { id: string; text: string; attachments: Attachment[]; voice?: VoiceNote; time: string };
type Props = { selected: Lead; activeChannel: string; setActiveChannel: (value: string) => void; activeConversation: string; setActiveConversation: (value: string) => void; aiMode: boolean; setAiMode: (value: boolean) => void; sent: boolean; setSent: (value: boolean) => void };

const initials = (lead: Pick<Lead, 'avatar' | 'color'>, size: 'normal' | 'small' | 'large' = 'normal') => <span className={`avatar ${initialsColor(lead.color)}${size === 'small' ? ' avatar-small' : ''}${size === 'large' ? ' avatar-large' : ''}`}>{lead.avatar}</span>;
const bytesLabel = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
const money = (value: number) => `$${value.toLocaleString('en-US')}`;
const leadChannels: Record<string, string> = { 'ld-101': 'whatsapp', 'ld-102': 'instagram', 'ld-103': 'whatsapp', 'ld-104': 'messenger', 'ld-105': 'email', 'ld-106': 'messenger', 'ld-107': 'email', 'ld-108': 'whatsapp' };
const leadChannelId = (lead: Pick<Lead, 'id' | 'source'>) => leadChannels[lead.id] ?? (lead.source.toLowerCase().includes('instagram') ? 'instagram' : lead.source.toLowerCase().includes('email') ? 'email' : 'whatsapp');
const channelLabel = (id: string) => channels.find(channel => channel.id === id)?.name ?? 'Messenger';
type ConversationView = 'channel' | 'all' | 'assigned' | 'resolved';

export const Inbox: React.FC<Props> = ({ selected, activeChannel, setActiveChannel, activeConversation, setActiveConversation, aiMode, setAiMode, setSent }) => {
  const leads = useSelector((state: RootState) => state.crm.leads);
  const dispatch = useDispatch<AppDispatch>();
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, SentMessage[]>>({});
  const [search, setSearch] = useState('');
  const [conversationView, setConversationView] = useState<ConversationView>('channel');
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [newRecipientId, setNewRecipientId] = useState(activeConversation);
  const [newChannel, setNewChannel] = useState(activeChannel);
  const [newMessageText, setNewMessageText] = useState('');
  const [recipientOpen, setRecipientOpen] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [channelOpen, setChannelOpen] = useState(false);
  const [sendingNewMessage, setSendingNewMessage] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingReady, setRecordingReady] = useState<VoiceNote | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [dropActive, setDropActive] = useState(false);
  const [notice, setNotice] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const cancelRecordingRef = useRef(false);
  const elapsedRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const objectUrlsRef = useRef(new Set<string>());
  const threadRef = useRef<HTMLDivElement>(null);
  const recipientMenuRef = useRef<HTMLDivElement>(null);
  const channelMenuRef = useRef<HTMLDivElement>(null);
  const newMessageTextareaRef = useRef<HTMLTextAreaElement>(null);
  const messages = messagesByConversation[activeConversation] ?? [];
  const visibleConversations = useMemo(() => leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(search.toLowerCase()) || lead.company.toLowerCase().includes(search.toLowerCase());
    const matchesChannel = conversationView !== 'channel' || leadChannelId(lead) === activeChannel;
    const matchesAssigned = conversationView !== 'assigned' || lead.owner === 'Alex Morgan';
    const matchesResolved = conversationView !== 'resolved' || ['CUSTOMER', 'CLOSED', 'ACTIVE_CUSTOMER', 'CLOSED_LOST'].includes(lead.stage);
    return matchesSearch && matchesChannel && matchesAssigned && matchesResolved;
  }), [activeChannel, conversationView, search]);

  const makeObjectUrl = (blob: Blob) => { const url = URL.createObjectURL(blob); objectUrlsRef.current.add(url); return url; };
  const showNotice = (text: string) => { setNotice(text); window.setTimeout(() => setNotice(''), 2800); };
  useEffect(() => () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(track => track.stop());
    objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
  }, []);
  useEffect(() => { threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, recordingReady]);
  useEffect(() => {
    if (!visibleConversations.length) return;
    if (!visibleConversations.some(lead => lead.id === activeConversation)) setActiveConversation(visibleConversations[0].id);
  }, [activeConversation, setActiveConversation, visibleConversations]);

  const addFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (!files.length) return;
    const next = files.map(file => ({ id: `${file.name}-${file.lastModified}-${Math.random()}`, file, url: makeObjectUrl(file), isImage: file.type.startsWith('image/') }));
    setAttachments(current => [...current, ...next]);
  };
  const removeAttachment = (id: string) => {
    const removed = attachments.find(item => item.id === id);
    if (removed) { URL.revokeObjectURL(removed.url); objectUrlsRef.current.delete(removed.url); }
    setAttachments(current => current.filter(item => item.id !== id));
  };
  const clearDraftMedia = () => {
    attachments.forEach(item => { URL.revokeObjectURL(item.url); objectUrlsRef.current.delete(item.url); });
    if (recordingReady) { URL.revokeObjectURL(recordingReady.url); objectUrlsRef.current.delete(recordingReady.url); }
    setAttachments([]); setRecordingReady(null);
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { showNotice('Voice recording is not supported in this browser.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      cancelRecordingRef.current = false;
      recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        if (!cancelRecordingRef.current && chunksRef.current.length) {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          setRecordingReady({ url: makeObjectUrl(blob), duration: Math.max(1, elapsedRef.current) });
        }
        setRecording(false);
        if (timerRef.current !== null) window.clearInterval(timerRef.current);
        timerRef.current = null;
      };
      recorder.start();
      setElapsed(0);
      elapsedRef.current = 0;
      setRecording(true);
      timerRef.current = window.setInterval(() => { elapsedRef.current += 1; setElapsed(elapsedRef.current); }, 1000);
    } catch {
      showNotice('Microphone access was not granted. Check your browser permissions and try again.');
    }
  };
  const stopRecording = () => { if (recorderRef.current?.state === 'recording') recorderRef.current.stop(); };
  const cancelRecording = () => {
    cancelRecordingRef.current = true;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
    setRecording(false);
    if (recordingReady) { URL.revokeObjectURL(recordingReady.url); objectUrlsRef.current.delete(recordingReady.url); }
    setRecordingReady(null); setElapsed(0); elapsedRef.current = 0;
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };
  const sendMessage = () => {
    if (!message.trim() && !attachments.length && !recordingReady) return;
    setMessagesByConversation(current => ({ ...current, [activeConversation]: [...(current[activeConversation] ?? []), { id: `${Date.now()}`, text: message.trim(), attachments, voice: recordingReady ?? undefined, time: 'Just now' }] }));
    dispatch(addLeadActivity({ leadId: activeConversation, activity: { type: 'message', title: `Message sent via ${channelLabel(activeChannel)}`, detail: message.trim() || (recordingReady ? 'Voice message sent' : `${attachments.length} attachment${attachments.length === 1 ? '' : 's'} sent`) } }));
    setMessage(''); setAttachments([]); setRecordingReady(null); setElapsed(0); setSent(true);
  };
  const sendNewMessage = (event: React.FormEvent) => {
    event.preventDefault();
    const text = newMessageText.trim();
    if (!text || !newRecipientId || sendingNewMessage) return;
    setSendingNewMessage(true);
    window.setTimeout(() => {
      setMessagesByConversation(current => ({ ...current, [newRecipientId]: [...(current[newRecipientId] ?? []), { id: `${Date.now()}`, text, attachments: [], time: 'Just now' }] }));
      dispatch(addLeadActivity({ leadId: newRecipientId, activity: { type: 'message', title: `Message sent via ${channelLabel(newChannel)}`, detail: text } }));
      setActiveChannel(newChannel);
      setConversationView('channel');
      setActiveConversation(newRecipientId);
      setSent(true);
      setMessage('');
      setNewMessageOpen(false);
      setNewMessageText('');
      setSendingNewMessage(false);
      showNotice(`Message sent to ${leads.find(lead => lead.id === newRecipientId)?.name ?? 'contact'} via ${channelLabel(newChannel)}.`);
    }, 450);
  };
  const openNewMessage = () => { setNewRecipientId(activeConversation); setNewChannel(activeChannel); setNewMessageText(''); setRecipientSearch(''); setRecipientOpen(false); setChannelOpen(false); setSendingNewMessage(false); setNewMessageOpen(true); };
  const insertMessageFormatting = (before: string, after = before) => {
    const textarea = newMessageTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = newMessageText.slice(start, end);
    const insertion = `${before}${selectedText || 'text'}${after}`;
    const nextText = `${newMessageText.slice(0, start)}${insertion}${newMessageText.slice(end)}`;
    setNewMessageText(nextText);
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + (selectedText || 'text').length);
    });
  };
  const selectedRecipient = leads.find(lead => lead.id === newRecipientId) ?? leads[0];
  const filteredRecipients = leads.filter(lead => `${lead.name} ${lead.company} ${lead.owner}`.toLowerCase().includes(recipientSearch.toLowerCase()));
  const renderChannelIcon = (channelId: string, size = 15) => channelId === 'instagram' ? <Camera size={size}/> : channelId === 'email' ? <Mail size={size}/> : <MessageCircle size={size}/>;
  useEffect(() => {
    if (!recipientOpen && !channelOpen) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (recipientOpen && !recipientMenuRef.current?.contains(target)) setRecipientOpen(false);
      if (channelOpen && !channelMenuRef.current?.contains(target)) setChannelOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setRecipientOpen(false); setChannelOpen(false); } };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeOnEscape); };
  }, [channelOpen, recipientOpen]);
  const handleComposerKey = (event: React.KeyboardEvent<HTMLTextAreaElement>) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); } };
  const handleDrop = (event: React.DragEvent) => { event.preventDefault(); setDropActive(false); addFiles(event.dataTransfer.files); };

  return <section className="inbox-page">
    <header className="inbox-page-heading"><div><h1>Inbox</h1><p>Every customer conversation, together in one place.</p></div><button onClick={openNewMessage}><Plus size={14}/> New message</button></header>
    <div className="inbox-layout panel">
      <aside className="inbox-rail"><span className="inbox-rail-title">CHANNELS</span>{channels.map(channel => <button key={channel.id} onClick={() => { setActiveChannel(channel.id); setConversationView('channel'); }} className={`channel-item ${conversationView === 'channel' && activeChannel === channel.id ? 'active' : ''}`}><span className={`channel-icon ${channel.color}`}>{channel.id === 'instagram' ? <Camera size={16}/> : channel.id === 'email' ? <Mail size={16}/> : <MessageCircle size={16}/>}</span><span>{channel.name}</span>{channel.id === 'whatsapp' && <i className="unread-count">3</i>}</button>)}<div className="rail-divider"/><button className={`channel-item ${conversationView === 'all' ? 'active' : ''}`} onClick={() => setConversationView('all')}><span className="all-inbox-icon"><Users size={16}/></span><span>All conversations</span></button><button className={`channel-item ${conversationView === 'assigned' ? 'active' : ''}`} onClick={() => setConversationView('assigned')}><span className="all-inbox-icon"><Clock3 size={16}/></span><span>Assigned to me</span></button><button className={`channel-item ${conversationView === 'resolved' ? 'active' : ''}`} onClick={() => setConversationView('resolved')}><span className="all-inbox-icon"><Check size={16}/></span><span>Resolved</span></button></aside>
      <section className="conversation-list"><div className="conversation-list-head"><h2>Messages <span>{visibleConversations.length}</span></h2><button className="subtle-icon" aria-label="More message options"><MoreHorizontal size={17}/></button></div><label className="conversation-search"><Search size={14}/><input placeholder="Search conversations" value={search} onChange={event => setSearch(event.target.value)}/></label><div className="conversation-sort"><span>{conversationView === 'channel' ? channelLabel(activeChannel) : conversationView === 'assigned' ? 'Assigned to me' : conversationView === 'resolved' ? 'Resolved' : 'All'} <ChevronDown size={13}/></span><button aria-label="Filter conversations"><Filter size={14}/></button></div>{visibleConversations.map((lead, index) => { const channelId = leadChannelId(lead); const channelName = channelLabel(channelId); return <button key={lead.id} className={`conversation-item ${activeConversation === lead.id ? 'active' : ''}`} onClick={() => { setActiveConversation(lead.id); setSent(false); setMessage(''); clearDraftMedia(); }}>
        {initials(lead)}<div className="conversation-preview"><div><b>{lead.name}</b><time>{['10:42 AM', '9:18 AM', 'Yesterday', 'Yesterday', 'Mon', 'Mon'][index % 6]}</time></div><p>{messagesByConversation[lead.id]?.at(-1)?.text || ['Hey! I saw your brand session...', 'Thanks so much, that sounds great!', 'Do you have availability next week?', 'Just booked, looking forward to it!', 'Can you send over the details?', 'Perfect, let’s get started.'][leads.indexOf(lead) % 6]}</p><small><span className={`mini-channel channel-${channelId === 'instagram' ? 'purple' : channelId === 'email' ? 'orange' : channelId === 'messenger' ? 'blue' : 'green'}`}>{channelId === 'instagram' ? <Camera size={10}/> : channelId === 'email' ? <Mail size={10}/> : <MessageCircle size={10}/>}</span>{channelName}</small></div>{index === 0 && <i className="conversation-unread"/>}
      </button>; })}</section>
      <section className={`thread-panel ${dropActive ? 'is-drop-active' : ''}`} onDragEnter={event => { event.preventDefault(); setDropActive(true); }} onDragOver={event => event.preventDefault()} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropActive(false); }} onDrop={handleDrop}>
        <div className="thread-head"><div className="thread-person">{initials(selected)}<span><b>{selected.name}</b><small><i className="live-dot"/> Online · {selected.company}</small></span></div><div className="thread-actions"><button aria-label="Search thread"><Search size={16}/></button><button aria-label="More thread actions"><MoreHorizontal size={18}/></button></div></div>
        <div className="thread-context"><span className="thread-context-icon"><MessageCircle size={13}/></span> Conversation started from <b>{selected.source}</b><button onClick={() => showNotice(`${selected.name}'s lead profile is open.`)}>View lead <ArrowRight size={12}/></button></div>
        <div className="thread-messages" ref={threadRef}><div className="message-date">TODAY · OCTOBER 14</div>
          <div className="message-row received">{initials(selected, 'small')}<div><span className="message-sender">{selected.name}</span><div className="message-bubble">Hi! I came across your work and I’m really interested in learning more about your brand strategy sessions. ✨</div><time>10:42 AM</time></div></div>
          <div className="message-row sent"><div><div className="message-bubble">Hey {selected.name.split(' ')[0]}! Thanks so much for reaching out — I’d love to help. What are you hoping to work on with your brand?</div><time>10:44 AM <CheckCheck size={12}/></time></div><span className="avatar avatar-lilac avatar-small">AM</span></div>
          {messages.map(item => <div className="message-row sent" key={item.id}><div>{item.text && <div className="message-bubble">{item.text}</div>}{item.attachments.map(file => <a className="message-attachment" key={file.id} href={file.url} target="_blank" rel="noreferrer">{file.isImage ? <img src={file.url} alt={file.file.name}/> : <span className="message-file-icon"><FileText size={18}/></span>}<span><b>{file.file.name}</b><small>{bytesLabel(file.file.size)}</small></span></a>)}{item.voice && <VoicePlayer note={item.voice}/>}<time>{item.time} <CheckCheck size={12}/></time></div><span className="avatar avatar-lilac avatar-small">AM</span></div>)}
        </div>
        {dropActive && <div className="inbox-drop-overlay"><Image size={22}/><b>Drop files to attach</b><span>Images and documents are supported</span></div>}
        <div className="thread-composer">
          <div className="composer-mode"><span className="mode-label">REPLYING AS</span><button onClick={() => setAiMode(!aiMode)} className={`takeover-toggle ${aiMode ? 'is-ai' : ''}`}><span className="toggle-knob"/><Bot size={13}/>{aiMode ? 'AI Copilot' : 'Human'}<ChevronDown size={12}/></button><span className="mode-explain">{aiMode ? 'AI can reply automatically' : 'AI replies are paused'}</span></div>
          <input ref={fileInputRef} hidden type="file" multiple onChange={event => { if (event.target.files) addFiles(event.target.files); event.target.value = ''; }}/>
          {attachments.length > 0 && <div className="inbox-attachment-previews" aria-label="Attachments ready to send">{attachments.map(file => <div className="inbox-attachment-preview" key={file.id}>{file.isImage ? <img src={file.url} alt=""/> : <span className="inbox-file-preview-icon"><FileText size={16}/></span>}<span><b>{file.file.name}</b><small>{bytesLabel(file.file.size)}</small></span><button onClick={() => removeAttachment(file.id)} aria-label={`Remove ${file.file.name}`}><X size={13}/></button></div>)}</div>}
          {recording ? <div className="inbox-recording-bar"><span className="recording-pulse"/><b>Recording</b><time>{formatTime(elapsed)}</time><span className="recording-wave" aria-label="Recording audio"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></span><button onClick={cancelRecording} aria-label="Cancel recording"><X size={15}/></button><button className="inbox-record-stop" onClick={stopRecording} aria-label="Stop recording"><span/></button></div> : recordingReady ? <div className="inbox-ready-voice"><VoicePlayer note={recordingReady}/><button onClick={cancelRecording} aria-label="Discard recording"><X size={14}/></button><button className="inbox-voice-send" onClick={sendMessage} aria-label="Send voice note"><Send size={15}/></button></div> : <div className="message-input"><button aria-label="Attach files" onClick={() => fileInputRef.current?.click()}><Plus size={17}/></button><textarea placeholder="Write a reply..." value={message} onChange={event => setMessage(event.target.value)} onKeyDown={handleComposerKey}/><button aria-label="Record voice message" onClick={startRecording}><Mic size={16}/></button><button className="send-message" aria-label="Send message" onClick={sendMessage}><Send size={15}/></button></div>}
          <div className="composer-foot"><span>↵ to send · shift + ↵ for new line</span><div><button onClick={() => fileInputRef.current?.click()}><Paperclip size={13}/> Attach</button><button onClick={() => showNotice('AI reply suggestions are ready to review.')}><Bot size={13}/> Write with AI</button></div></div>
        </div>
      </section>
      <aside className="contact-panel"><div className="contact-panel-head"><b>Contact details</b><button aria-label="More contact actions"><MoreHorizontal size={16}/></button></div><div className="contact-profile">{initials(selected, 'large')}<h3>{selected.name}</h3><p>{selected.company}</p><div className="inbox-contact-actions"><button onClick={() => { setNewRecipientId(selected.id); setNewChannel('email'); setNewMessageText(''); setNewMessageOpen(true); }}><Mail size={13}/><span>Email</span></button><button onClick={() => { setNewRecipientId(selected.id); setNewChannel(leadChannelId(selected)); setNewMessageText(''); setNewMessageOpen(true); }}><MessageCircle size={13}/><span>Message</span></button></div></div><div className="contact-details"><h4>LEAD INFORMATION</h4><div><span>Email</span><b title={selected.email}>{selected.email}</b></div><div><span>Source</span><b>{selected.source}</b></div><div><span>Stage</span><b className="inbox-stage-pill">{stageLabel[selected.stage]}</b></div><div><span>Owner</span><b>{selected.owner}</b></div></div><div className="contact-details"><h4>INTERESTED IN</h4><div className="interest-card"><span className="interest-icon"><Bot size={14}/></span><span><b>{selected.interest}</b><small>{money(selected.value)} · {selected.stage === 'BOOKED' || selected.stage === 'BOOKING' ? 'Booking in progress' : 'Service'}</small></span></div></div><div className="ai-ownership"><div><span className="ownership-icon"><Bot size={15}/></span><span><b>AI takeover</b><small>{aiMode ? 'Copilot can respond to this conversation' : 'Replies handled by your team'}</small></span></div><button className={`switch ${aiMode ? 'on' : ''}`} onClick={() => setAiMode(!aiMode)} aria-label="Toggle AI takeover"><i/></button></div><div className="human-tip"><ShieldCheck size={14}/><span>Human takeover pauses automated replies for this conversation.</span></div></aside>
    </div>
    {newMessageOpen && <div className="inbox-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !sendingNewMessage) setNewMessageOpen(false); }}><form className="inbox-new-message-modal" role="dialog" aria-modal="true" aria-labelledby="inbox-new-message-title" onSubmit={sendNewMessage}>
      <header><div><span className="inbox-new-message-icon"><Send size={17}/></span><div><h2 id="inbox-new-message-title">New message</h2><p>Choose a contact and channel to start a conversation.</p></div></div><button type="button" aria-label="Close new message" onClick={() => !sendingNewMessage && setNewMessageOpen(false)}><X size={16}/></button></header>
      <div className="inbox-modal-field" ref={recipientMenuRef}><span className="inbox-modal-label">Recipient</span><button type="button" className={`inbox-select-trigger ${recipientOpen ? 'is-open' : ''}`} role="combobox" aria-expanded={recipientOpen} aria-controls="recipient-options" onClick={() => { setRecipientOpen(open => !open); setChannelOpen(false); }}>
        {selectedRecipient ? <>{initials(selectedRecipient, 'small')}<span className="inbox-select-value"><b>{selectedRecipient.name}</b><small>{selectedRecipient.company} · {selectedRecipient.owner}</small></span></> : <span className="inbox-select-placeholder">Choose a contact</span>}<ChevronDown size={16}/>
      </button>
      {recipientOpen && <div className="inbox-select-menu inbox-recipient-menu" id="recipient-options" role="listbox"><label className="inbox-recipient-search"><Search size={14}/><input autoFocus value={recipientSearch} onChange={event => setRecipientSearch(event.target.value)} placeholder="Search contacts..." aria-label="Search contacts"/></label><div className="inbox-recipient-options">{filteredRecipients.length ? filteredRecipients.map(lead => <button type="button" role="option" aria-selected={newRecipientId === lead.id} key={lead.id} className="inbox-recipient-option" onClick={() => { setNewRecipientId(lead.id); setRecipientOpen(false); setRecipientSearch(''); }}>
        {initials(lead, 'small')}<span className="inbox-select-value"><b>{lead.name}</b><small>{lead.company} · {lead.owner}</small></span>{newRecipientId === lead.id && <Check size={15}/>}</button>) : <div className="inbox-select-empty">No contacts found</div>}</div></div>}
      </div>
      <div className="inbox-modal-field" ref={channelMenuRef}><span className="inbox-modal-label">Send via</span><button type="button" className={`inbox-select-trigger ${channelOpen ? 'is-open' : ''}`} aria-haspopup="listbox" aria-expanded={channelOpen} onClick={() => { setChannelOpen(open => !open); setRecipientOpen(false); }}>
        <span className={`inbox-modal-channel-icon ${newChannel}`}>{renderChannelIcon(newChannel, 16)}</span><span className="inbox-select-value"><b>{channelLabel(newChannel)}</b><small>Send using {channelLabel(newChannel)}</small></span><ChevronDown size={16}/>
      </button>
      {channelOpen && <div className="inbox-select-menu inbox-channel-menu" role="listbox" aria-label="Choose sending channel">{channels.map(channel => <button type="button" role="option" aria-selected={newChannel === channel.id} key={channel.id} className="inbox-channel-option" onClick={() => { setNewChannel(channel.id); setChannelOpen(false); }}><span className={`inbox-modal-channel-icon ${channel.id}`}>{renderChannelIcon(channel.id, 16)}</span><span className="inbox-select-value"><b>{channel.name}</b><small>{channel.id === 'email' ? 'Send an email' : `Send via ${channel.name}`}</small></span>{newChannel === channel.id && <Check size={15}/>}</button>)}</div>}
      </div>
      <label className="inbox-modal-field inbox-message-field"><span className="inbox-modal-label">Message</span><textarea ref={newMessageTextareaRef} autoFocus value={newMessageText} onChange={event => setNewMessageText(event.target.value)} placeholder="Write your message..." rows={5}/><div className="inbox-message-toolbar"><span><button type="button" aria-label="Bold" title="Bold" onClick={() => insertMessageFormatting('**')}><Bold size={14}/></button><button type="button" aria-label="Italic" title="Italic" onClick={() => insertMessageFormatting('_')}><Italic size={14}/></button><i/><button type="button" aria-label="Insert bullet" title="Insert bullet" onClick={() => insertMessageFormatting('\n• ', '')}><span className="inbox-bullet-icon">•</span></button></span><small>Enter a clear, friendly message</small></div></label>
      <footer><button type="button" onClick={() => setNewMessageOpen(false)} disabled={sendingNewMessage}>Cancel</button><button type="submit" disabled={!newMessageText.trim() || !newRecipientId || sendingNewMessage}>{sendingNewMessage ? <span className="inbox-send-spinner"/> : <Send size={14}/>} {sendingNewMessage ? 'Sending...' : 'Send message'}<ArrowRight size={13}/></button></footer>
    </form></div>}
    {notice && <div className="inbox-toast"><Check size={14}/>{notice}</div>}
  </section>;
};

function formatTime(seconds: number) { return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }

function VoicePlayer({ note }: { note: VoiceNote }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  return <div className="inbox-audio-message"><audio ref={audioRef} src={note.url} onEnded={() => setPlaying(false)}/><button onClick={() => { const audio = audioRef.current; if (!audio) return; if (audio.paused) { void audio.play(); setPlaying(true); } else { audio.pause(); setPlaying(false); } }} aria-label={playing ? 'Pause voice message' : 'Play voice message'}>{playing ? <Pause size={13}/> : <Play size={13}/>}</button><span className="audio-waveform">{Array.from({ length: 25 }, (_, i) => <i key={i} style={{ height: `${6 + ((i * 7) % 12)}px` }}/>)}</span><small>{formatTime(note.duration)}</small></div>;
}

export default Inbox;
