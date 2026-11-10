import { useEffect, useRef, useState } from 'react';
import { WhatsappLogo, MessengerLogo, InstagramLogo, ChatDots, FacebookLogo, EnvelopeSimple } from '@phosphor-icons/react';
import { ArrowRight, MessageSquare, Radio, ShieldCheck } from 'lucide-react';
import { gosApi, type GosAssistant } from '../backend/gosApi';
import type { Conversation } from './inbox/inboxData';
import { translateText as t } from '../i18n/display';

const channelDefinitions = [
  { id: 'whatsapp', label: 'WhatsApp', Icon: WhatsappLogo },
  { id: 'messenger', label: 'Messenger', Icon: MessengerLogo },
  { id: 'instagram', label: 'Instagram', Icon: InstagramLogo },
  { id: 'webchat', label: 'Web Chat', Icon: ChatDots },
] as const;

function ProductionChannelMark({ channel }: { channel: string }) {
  const Icon = channelDefinitions.find(item => item.id === channel)?.Icon || (channel === 'facebook' ? FacebookLogo : channel === 'email' ? EnvelopeSimple : ChatDots);
  return <span className={`kp-brand kp-brand-${channel}`} aria-hidden="true"><Icon size={22} weight={['messenger', 'webchat', 'facebook'].includes(channel) ? 'fill' : 'regular'}/></span>;
}

/** The orbit animates only while real work is pending; the meter uses server-ready counts. */
export function ProductionKnowledgeOrb({ progress = 0, active = false, label, caption, network = false }: { progress?: number; active?: boolean; label: string; caption: string; network?: boolean }) {
  return <div className={`kp-orb ${network ? 'network' : ''}`} data-active={active}>
    <svg viewBox="0 0 200 200" fill="none" aria-hidden="true">
      <circle cx="100" cy="100" r="91" className="kp-orb-guide"/>
      <circle cx="100" cy="100" r="79" className="kp-orb-guide dashed"/>
      <g className="kp-orbit outer"><circle cx="100" cy="100" r="88" pathLength="100" strokeDasharray="29 71"/><circle cx="188" cy="100" r="2.7" className="kp-orbit-dot"/></g>
      <g className="kp-orbit inner"><circle cx="100" cy="100" r="81" pathLength="100" strokeDasharray="21 79"/><circle cx="100" cy="181" r="2.3" className="kp-orbit-dot"/></g>
      {!network && <circle cx="100" cy="100" r="61" pathLength="100" className="kp-orb-meter" strokeDasharray={`${progress} 100`} transform="rotate(-90 100 100)"/>}
    </svg>
    <div className="kp-orb-core"><strong title={label}>{label}</strong><small>{caption}</small>{!network && <b>{progress}%</b>}<i aria-hidden="true">•••</i></div>
  </div>;
}

type ChannelLink = { channel: string; status?: string; enabled?: boolean; external_id?: string | null; name?: string | null };

function readChannelLinks(payload: unknown): ChannelLink[] {
  if (Array.isArray(payload)) {
    return payload.flatMap(row => row && typeof row === 'object' && 'channel' in row && typeof row.channel === 'string'
      ? [{ channel: row.channel, status: typeof row.status === 'string' ? row.status : undefined, enabled: Boolean(row.enabled), external_id: typeof row.external_id === 'string' ? row.external_id : null, name: typeof row.name === 'string' ? row.name : null }]
      : []);
  }
  if (!payload || typeof payload !== 'object') return [];
  return Object.entries(payload).map(([channel, value]) => {
    if (typeof value === 'boolean') return { channel, enabled: value };
    const row: Partial<ChannelLink> = value && typeof value === 'object' ? value as Partial<ChannelLink> : {};
    return { channel, status: row.status, enabled: Boolean(row.enabled), external_id: row.external_id ?? null, name: row.name ?? null };
  });
}

export function ProductionChannelNetwork({ assistant, assistantName, disabled, updateChannel, onManage }: {
  assistant: GosAssistant; assistantName: string; disabled: boolean;
  updateChannel: (channel: string, enabled: boolean) => Promise<void>; onManage: (channel?: string) => void;
}) {
  const [pendingId, setPendingId] = useState('');
  const [links, setLinks] = useState<ChannelLink[]>([]);
  const [burst, setBurst] = useState('');
  const mutation = useRef(false);
  const locked = disabled || !!pendingId;
  useEffect(() => {
    const controller = new AbortController();
    gosApi.channels(controller.signal).then(result => { if (!controller.signal.aborted) setLinks(readChannelLinks(result.channels)); }).catch(() => {});
    return () => controller.abort();
  }, [assistant.channels, assistant.live_enabled]);
  async function press(id: string) {
    if (mutation.current || disabled) return;
    const link = links.find(item => item.channel === id);
    const linked = id === 'webchat' || Boolean(link?.external_id);
    if (!linked) { onManage(id); return; }
    const next = !assistant.channels[id];
    mutation.current = true; setPendingId(id);
    try {
      await updateChannel(id, next);
      if (next) { setBurst(id); window.setTimeout(() => setBurst(current => current === id ? '' : current), 900); }
    } finally { mutation.current = false; setPendingId(''); }
  }
  const listening = channelDefinitions.filter(channel => assistant.channels[channel.id]).length;
  return <section className="kp-connect">
    <header className="kp-view-heading"><div><span className="kp-eyebrow">{t('CONNECT')}</span><h3>{t('Meet customers where they are')}</h3><p className="kp-lead">{t('Web chat turns on here. WhatsApp, Messenger and Instagram open the real account connection.')}</p></div><button type="button" className="kw-button secondary" disabled={locked} onClick={() => onManage()}>{t('Manage channels')}<ArrowRight size={14}/></button></header>
    <div className={`kp-network ${listening ? 'is-awake' : ''}`}>
      <svg viewBox="0 0 600 430" preserveAspectRatio="none" className="kp-node-wires" aria-hidden="true">{['M300 215 L120 60', 'M300 215 L480 60', 'M300 215 L120 370', 'M300 215 L480 370'].map((d, index) => <g key={d} className={assistant.channels[channelDefinitions[index].id] ? 'connected' : ''}><path d={d} className="kp-wire-base"/><path d={d} className="kp-wire-pulse"/></g>)}</svg>
      <div className="kp-network-hub"><ProductionKnowledgeOrb network active={listening > 0 || assistant.live_enabled} label={assistantName} caption={t('YOUR AI')}/></div>
      {channelDefinitions.map((channel, index) => {
        const enabled = !!assistant.channels[channel.id];
        const link = links.find(item => item.channel === channel.id);
        const linked = channel.id === 'webchat' || Boolean(link?.external_id);
        const account = link?.name || (link?.external_id ? link.external_id : '');
        const label = !linked ? 'CONNECT' : enabled ? 'LISTENING' : 'PAUSED';
        return <button key={channel.id} type="button" className={`kp-network-card kp-position-${index} ${enabled ? 'connected' : ''} ${burst === channel.id ? 'kp-burst' : ''} ${pendingId === channel.id ? 'is-pending' : ''}`} style={{ animationDelay: `${index * 80}ms` }} aria-label={linked ? `${t(enabled ? 'Pause' : 'Enable')} ${channel.label}` : `${t('Connect')} ${channel.label}`} aria-pressed={linked ? enabled : undefined} disabled={locked} onClick={() => void press(channel.id)}>
          <ProductionChannelMark channel={channel.id}/><span className="kp-card-copy"><b>{channel.label}</b><small>{account || t(channel.id === 'webchat' ? 'Ready on your site' : linked ? 'Account linked' : 'Needs an account')}</small></span><span><i/>{t(label)}</span>
        </button>;
      })}
    </div>
    <p className="kp-connection-note"><ShieldCheck size={14}/>{listening ? `${listening} ${t('channels are listening for customers.')}` : t('Turn on web chat, or connect a Meta account, before you go live.')}</p>
  </section>;
}

export function ProductionLiveMonitor({ assistant, conversations, readySources, disabled, onToggle }: {
  assistant: GosAssistant; conversations: readonly Conversation[]; readySources: number; disabled: boolean; onToggle: () => void;
}) {
  const connected = Object.values(assistant.channels).filter(Boolean).length;
  const [message, setMessage] = useState('');
  const [channel, setChannel] = useState('webchat');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [turns, setTurns] = useState<{ id: string; role: 'customer' | 'assistant' | 'note'; text: string }[]>([]);
  const [liveThreads, setLiveThreads] = useState<Conversation[]>([]);
  const [summaryCounts, setSummaryCounts] = useState<{ today: number; needed: number } | null>(null);
  const activeConversations = conversations.length ? conversations : liveThreads;
  const threadId = useRef(`knowledge-test-${crypto.randomUUID()}`);
  const messageId = useRef<string | null>(null);
  const sendingRef = useRef(false);
  const enabledChannels = Object.keys(assistant.channels).filter(key => assistant.channels[key]);
  const selectedChannel = enabledChannels.includes(channel) ? channel : enabledChannels[0] || '';
  useEffect(() => {
    if (conversations.length || typeof gosApi.inboxSummary !== 'function') return;
    const controller = new AbortController();
    gosApi.inboxSummary(controller.signal).then(async summary => {
      if (controller.signal.aborted || !Array.isArray(summary?.conversations)) return;
      setSummaryCounts({ today: Number(summary.conversations_today || 0), needed: Number(summary.needed_team || 0) });
      const top = summary.conversations.slice(0, 3);
      const details = await Promise.all(top.map(item => typeof gosApi.conversation === 'function' && item?.id ? gosApi.conversation(String(item.id), controller.signal).catch(() => ({ conversation: item, messages: [] })) : Promise.resolve({ conversation: item, messages: [] })));
      if (controller.signal.aborted) return;
      setLiveThreads(details.map(({ conversation: conv, messages: msgs }) => ({
        id: String(conv?.id || crypto.randomUUID()), name: String(conv?.customer_name || 'Customer'), initials: String(conv?.customer_name || 'CU').slice(0, 2).toUpperCase(),
        channel: (conv?.channel || 'whatsapp') as Conversation['channel'], preview: String(conv?.last_message || ''), time: conv?.updated_at ? new Date(conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        unread: 0, tags: [], stage: String(conv?.last_action?.label || (conv?.ai_state === 'handoff' ? 'NEEDED YOUR TEAM' : conv?.ai_state === 'answered' ? 'AI ANSWERED' : String(conv?.ai_state || 'LIVE').toUpperCase())),
        source: 'Inbox', phone: String(conv?.phone || ''), email: '', location: '', assignee: '', aiAutoReply: conv?.ai_state === 'answered', takenOver: conv?.ai_state === 'handoff', followUp: false, followUpRules: [], starred: false,
        messages: Array.isArray(msgs) ? msgs.map((m, idx) => ({ id: String(m?.id || idx), sender: (m?.actor === 'assistant' ? 'ai' : 'customer') as 'ai' | 'customer', text: String(m?.body || ''), time: '' })) : [], activity: [],
      })));
    }).catch(() => {});
    return () => controller.abort();
  }, [conversations.length]);
  async function sendCustomerMessage(event: React.FormEvent) {
    event.preventDefault();
    if (sendingRef.current || !message.trim() || !assistant.live_enabled || !selectedChannel) return;
    sendingRef.current = true; setSending(true); setSendError('');
    // Retain the event ID after a network failure so retrying cannot duplicate ingestion.
    messageId.current ??= crypto.randomUUID();
    try {
      const sentText = message.trim();
      setTurns(previous => [...previous, { id: crypto.randomUUID(), role: 'customer', text: sentText }]);
      const response = await gosApi.simulateCustomer({ channel: selectedChannel, external_thread_id: threadId.current, external_message_id: messageId.current, customer_name: 'Studio visitor', body: sentText });
      const reply = typeof response.reply?.body === 'string' ? response.reply.body : '';
      const note = response.outcome === 'answered' ? '' : response.outcome === 'handoff' ? t('A teammate should take this one.') : response.outcome === 'paused' ? t('Go live, and keep this channel listening, before the assistant can reply.') : response.outcome === 'knowledge_not_ready' ? t('The knowledge base is not ready yet.') : response.outcome;
      setTurns(previous => [...previous, ...(reply ? [{ id: crypto.randomUUID(), role: 'assistant' as const, text: reply }] : []), ...(note ? [{ id: crypto.randomUUID(), role: 'note' as const, text: note }] : [])]);
      if (!conversations.length) {
        const convId = String(response.conversation?.id || threadId.current);
        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const actionLabel = response.action?.label || response.conversation?.last_action?.label;
        const stageLabel = String(actionLabel || (response.outcome === 'handoff' ? 'NEEDED YOUR TEAM' : response.outcome === 'answered' ? 'AI ANSWERED' : response.outcome.toUpperCase()));
        setLiveThreads(prev => {
          const existing = prev.find(item => item.id === convId);
          const nextMsgs = [...(existing?.messages || []), { id: String(response.inbound?.id || crypto.randomUUID()), sender: 'customer' as const, text: sentText, time: nowTime }, ...(typeof response.reply?.body === 'string' ? [{ id: String(response.reply.id || crypto.randomUUID()), sender: 'ai' as const, text: response.reply.body, time: nowTime }] : [])];
          const updated: Conversation = { id: convId, name: String(response.conversation?.customer_name || 'Knowledge studio test customer'), initials: 'KS', channel: selectedChannel as Conversation['channel'], preview: typeof response.reply?.body === 'string' ? response.reply.body : sentText, time: nowTime, unread: 0, tags: [], stage: stageLabel, source: 'Inbox', phone: String(response.conversation?.phone || ''), email: '', location: '', assignee: '', aiAutoReply: response.outcome === 'answered', takenOver: response.outcome === 'handoff', followUp: false, followUpRules: [], starred: false, messages: nextMsgs, activity: [] };
          return [updated, ...prev.filter(item => item.id !== convId)];
        });
      }
      messageId.current = null; setMessage('');
    } catch (e) { setSendError((e as Error).message); }
    finally { sendingRef.current = false; setSending(false); }
  }
  const readyToLaunch = connected > 0 && readySources > 0;
  return <section className={`kp-live ${assistant.live_enabled ? 'is-live' : ''}`}>
    <header className="kp-view-heading"><div><span className="kp-eyebrow">{t('LIVE MONITOR')}</span><h3>{t(assistant.live_enabled ? 'Your assistant is live' : 'Ready when you are')}</h3><p className="kp-lead">{t(assistant.live_enabled ? 'Customers on listening channels get answers from this knowledge.' : 'Go live after a channel is listening and the knowledge is ready.')}</p></div><button type="button" className={`kw-button primary kp-launch ${assistant.live_enabled ? 'is-on' : ''}`} disabled={disabled || (!assistant.live_enabled && !readyToLaunch)} onClick={onToggle}><Radio size={14}/>{t(assistant.live_enabled ? 'Pause assistant' : 'Go live')}</button></header>
    <ol className="kp-checklist">{[[readySources > 0, `${readySources} ${t('sources ready')}`], [connected > 0, connected ? `${connected} ${t('channels listening')}` : t('No channel is listening yet')], [assistant.live_enabled, t(assistant.live_enabled ? 'Assistant is answering' : 'Assistant is paused')]].map(([done, label]) => <li key={String(label)} className={done ? 'done' : ''}><i/>{label}</li>)}</ol>
    <div className={`kp-signal-bar ${assistant.live_enabled ? 'active' : ''}`}><span><i/>{t(assistant.live_enabled ? 'LIVE' : 'PAUSED')} · {activeConversations.length} {t('CONVERSATIONS')}</span><b>{connected} {t('CHANNELS ENABLED')}</b></div>
    <form className="kp-customer-form kp-console" onSubmit={event => void sendCustomerMessage(event)}>
      <div className="kp-console-head"><label htmlFor="kp-live-channel">{t('Talk to the assistant as a customer')}</label><select id="kp-live-channel" value={selectedChannel} disabled={sending || !enabledChannels.length} onChange={event => { setChannel(event.target.value); messageId.current = null; threadId.current = `knowledge-test-${crypto.randomUUID()}`; setTurns([]); }}>{enabledChannels.map(key => <option key={key} value={key}>{key}</option>)}{!enabledChannels.length && <option value="">{t('Choose a channel first')}</option>}</select></div>
      <div className="kp-thread" aria-live="polite">
        {!turns.length && !sending && <p className="kp-thread-empty">{t('Send a question. The reply is saved in your inbox.')}</p>}
        {turns.map(turn => <p key={turn.id} className={turn.role}>{turn.text}</p>)}
        {sending && <p className="assistant kp-typing" aria-label={t('Assistant is replying')}><i/><i/><i/></p>}
      </div>
      <div className="kp-composer">
        <textarea id="kp-live-message" value={message} disabled={sending} placeholder={t('Ask something a customer would ask…')} onChange={event => { setMessage(event.target.value); messageId.current = null; }} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} maxLength={4000} rows={2}/>
        <button type="submit" className="kw-button primary" disabled={disabled || sending || !assistant.live_enabled || !selectedChannel || !message.trim()}>{t(sending ? 'Replying…' : 'Send')}</button>
      </div>
      {sendError && <p role="alert" className="kw-error-text">{sendError}</p>}
    </form>
    <div className="kp-live-streams">
      {!activeConversations.length && <div className="kp-monitor-empty"><MessageSquare size={30}/><h4>{t('Your conversation monitor is ready')}</h4><p>{t('Customer conversations will appear here as they reach your workspace.')}</p></div>}
      {activeConversations.slice(0, 3).map(thread => {
        const messages = (thread.messages || []).filter(message => message.text && message.sender !== 'note').slice(-3);
        return <article className="kp-stream" key={thread.id}>
          <ProductionChannelMark channel={thread.channel}/><div className="kp-stream-content"><header><b>{thread.name}</b><time>{thread.time}</time></header>
            <div className="kp-stream-messages">{messages.length ? messages.map(message => <p key={message.id} className={message.sender === 'ai' || message.sender === 'agent' ? 'ai' : 'customer'}>{message.text}</p>) : <p className="customer">{thread.preview || t('Waiting for messages')}</p>}</div>
            <span className="kp-outcome">{thread.stage || t(thread.takenOver ? 'TEAM HANDLING' : thread.aiAutoReply ? 'AI ENABLED' : 'AWAITING TEAM')}</span>
          </div>
        </article>;
      })}
    </div>
    <div className="kp-live-stats"><span><b>{summaryCounts && !conversations.length ? Math.max(summaryCounts.today, activeConversations.length) : activeConversations.length}</b>{t('CONVERSATIONS')}</span><span><b>{summaryCounts && !conversations.length ? Math.max(summaryCounts.needed, activeConversations.filter(thread => thread.takenOver).length) : activeConversations.filter(thread => thread.takenOver).length}</b>{t('NEEDED YOUR TEAM')}</span><span><b>{readySources}</b>{t('SOURCES READY')}</span></div>
    {!connected && <p className="kp-connection-note">{t('Connect and enable at least one channel before going live.')}</p>}
  </section>;
}
