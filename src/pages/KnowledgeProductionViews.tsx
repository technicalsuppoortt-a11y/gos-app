import { useRef, useState } from 'react';
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

export function ProductionChannelNetwork({ assistant, assistantName, disabled, updateChannel, onManage }: {
  assistant: GosAssistant; assistantName: string; disabled: boolean;
  updateChannel: (channel: string, enabled: boolean) => Promise<void>; onManage: () => void;
}) {
  const [pending, setPending] = useState(false);
  const mutation = useRef(false);
  const locked = disabled || pending;
  async function toggle(id: string) {
    if (mutation.current || disabled) return;
    mutation.current = true; setPending(true);
    try { await updateChannel(id, !assistant.channels[id]); }
    finally { mutation.current = false; setPending(false); }
  }
  return <section className="kp-connect">
    <header className="kp-view-heading"><div><span className="kp-eyebrow">{t('CONNECT')}</span><h3>{t('Meet customers where they are')}</h3></div><button type="button" className="kw-button secondary" disabled={locked} onClick={onManage}>{t('Manage channels')}<ArrowRight size={14}/></button></header>
    <div className="kp-network">
      <svg viewBox="0 0 600 430" preserveAspectRatio="none" className="kp-node-wires" aria-hidden="true">{['M300 215 L120 60', 'M300 215 L480 60', 'M300 215 L120 370', 'M300 215 L480 370'].map((d, index) => <g key={d} className={assistant.channels[channelDefinitions[index].id] ? 'connected' : ''}><path d={d} className="kp-wire-base"/><path d={d} className="kp-wire-pulse"/></g>)}</svg>
      <div className="kp-network-hub"><ProductionKnowledgeOrb network active={assistant.live_enabled} label={assistantName} caption={t('YOUR AI')}/></div>
      {channelDefinitions.map((channel, index) => {
        const enabled = !!assistant.channels[channel.id];
        return <button key={channel.id} type="button" className={`kp-network-card kp-position-${index} ${enabled ? 'connected' : ''}`} aria-label={`${t(enabled ? 'Pause' : 'Enable')} ${channel.label}`} aria-pressed={enabled} disabled={locked} onClick={() => void toggle(channel.id)}>
          <ProductionChannelMark channel={channel.id}/><b>{channel.label}</b><span><i/>{t(enabled ? 'ENABLED' : 'PAUSED')}</span>
        </button>;
      })}
    </div>
    <p className="kp-connection-note"><ShieldCheck size={14}/>{t('Channel changes are saved to your active assistant.')}</p>
  </section>;
}

export function ProductionLiveMonitor({ assistant, conversations, readySources, disabled, onToggle }: {
  assistant: GosAssistant; conversations: readonly Conversation[]; readySources: number; disabled: boolean; onToggle: () => void;
}) {
  const connected = Object.values(assistant.channels).filter(Boolean).length;
  const [message, setMessage] = useState('');
  const [channel, setChannel] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState('');
  const [sendError, setSendError] = useState('');
  const threadId = useRef(`knowledge-test-${crypto.randomUUID()}`);
  const messageId = useRef<string | null>(null);
  const sendingRef = useRef(false);
  const enabledChannels = Object.keys(assistant.channels).filter(key => assistant.channels[key]);
  const selectedChannel = enabledChannels.includes(channel) ? channel : enabledChannels[0] || '';
  async function sendCustomerMessage(event: React.FormEvent) {
    event.preventDefault();
    if (sendingRef.current || !message.trim() || !assistant.live_enabled || !selectedChannel) return;
    sendingRef.current = true; setSending(true); setSendError(''); setResult('');
    // Retain the event ID after a network failure so retrying cannot duplicate ingestion.
    messageId.current ??= crypto.randomUUID();
    try {
      const response = await gosApi.receiveMessage({ channel: selectedChannel, external_thread_id: threadId.current, external_message_id: messageId.current, customer_name: 'Knowledge studio test customer', body: message.trim() });
      setResult(`${response.outcome}${typeof response.reply?.body === 'string' ? ` · ${response.reply.body}` : ''}`);
      messageId.current = null; setMessage('');
    } catch (e) { setSendError((e as Error).message); }
    finally { sendingRef.current = false; setSending(false); }
  }
  return <section className="kp-live">
    <header className="kp-view-heading"><div><span className="kp-eyebrow">{t('LIVE MONITOR')}</span><h3>{t(assistant.live_enabled ? 'Your assistant is live' : 'Ready when you are')}</h3></div><button type="button" className="kw-button primary" disabled={disabled} onClick={onToggle}><Radio size={14}/>{t(assistant.live_enabled ? 'Pause assistant' : 'Go live')}</button></header>
    <div className={`kp-signal-bar ${assistant.live_enabled ? 'active' : ''}`}><span><i/>{t(assistant.live_enabled ? 'LIVE' : 'PAUSED')} · {conversations.length} {t('CONVERSATIONS')}</span><b>{connected} {t('CHANNELS ENABLED')}</b></div>
    <form className="kp-customer-form" onSubmit={event => void sendCustomerMessage(event)}>
      <label htmlFor="kp-live-channel">{t('Test customer channel')}</label>
      <select id="kp-live-channel" value={selectedChannel} disabled={sending} onChange={event => { setChannel(event.target.value); messageId.current = null; }}>{enabledChannels.map(key => <option key={key} value={key}>{key}</option>)}</select>
      <label htmlFor="kp-live-message">{t('Simulate a live customer')}</label>
      <textarea id="kp-live-message" value={message} disabled={sending} onChange={event => { setMessage(event.target.value); messageId.current = null; }} required maxLength={10000} rows={3}/>
      <small>{t('Sends a real customer message to your workspace inbox.')}</small>
      <button type="submit" className="kw-button primary" disabled={disabled || sending || !assistant.live_enabled || !selectedChannel || !message.trim()}>{t(sending ? 'Sending…' : 'Send customer message')}</button>
      {result && <p role="status">{result}</p>}{sendError && <p role="alert" className="kw-error-text">{sendError}</p>}
    </form>
    <div className="kp-live-streams">
      {!conversations.length && <div className="kp-monitor-empty"><MessageSquare size={30}/><h4>{t('Your conversation monitor is ready')}</h4><p>{t('Customer conversations will appear here as they reach your workspace.')}</p></div>}
      {conversations.slice(0, 3).map(thread => {
        const messages = (thread.messages || []).filter(message => message.text && message.sender !== 'note').slice(-3);
        return <article className="kp-stream" key={thread.id}>
          <ProductionChannelMark channel={thread.channel}/><div className="kp-stream-content"><header><b>{thread.name}</b><time>{thread.time}</time></header>
            <div className="kp-stream-messages">{messages.length ? messages.map(message => <p key={message.id} className={message.sender === 'ai' || message.sender === 'agent' ? 'ai' : 'customer'}>{message.text}</p>) : <p className="customer">{thread.preview || t('Waiting for messages')}</p>}</div>
            <span className="kp-outcome">{thread.stage || t(thread.takenOver ? 'TEAM HANDLING' : thread.aiAutoReply ? 'AI ENABLED' : 'AWAITING TEAM')}</span>
          </div>
        </article>;
      })}
    </div>
    <div className="kp-live-stats"><span><b>{conversations.length}</b>{t('CONVERSATIONS')}</span><span><b>{conversations.filter(thread => thread.takenOver).length}</b>{t('NEEDED YOUR TEAM')}</span><span><b>{readySources}</b>{t('SOURCES READY')}</span></div>
    {!connected && <p className="kp-connection-note">{t('Connect and enable at least one channel before going live.')}</p>}
  </section>;
}
