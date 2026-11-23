import { useCallback, useEffect, useState } from 'react';
import { gosApi, type ApiRecord } from './gosApi';
import type { Attachment, Conversation } from '../pages/inbox/inboxData';

const MEDIA_LABEL = /^\[(Image|Video|Voice message|Document|Sticker|Media)\]$/;

function mediaAttachment(message: ApiRecord): Attachment {
  const mime = String(message.media.mime || '');
  return {
    id: `${message.id}-media`,
    name: MEDIA_LABEL.test(message.body || '') || !message.body ? (mime.split('/')[0] || 'file') : String(message.body).slice(0, 60),
    size: Number(message.media.size) || 0,
    url: '',
    isImage: mime.startsWith('image/'),
    remote: String(message.media.url),
    mime,
  };
}

export function normalizeConversation(row: ApiRecord, messages: ApiRecord[] = row.messages ?? []): Conversation {
  const name = row.customer_name || row.name || 'Customer';
  const aiState = String(row.ai_state || row.status || 'paused');
  const aiPaused = Boolean(row.ai_paused) || aiState === 'human_takeover';
  const takenOver = aiPaused || aiState === 'handoff';
  return {
    id: row.id, name, initials: name.split(/\s+/).slice(0, 2).map((v: string) => v[0]).join(''),
    channel: ['instagram', /* 'facebook', */ 'whatsapp', 'messenger', 'webchat', 'email'].includes(row.channel) ? row.channel : 'webchat',
    preview: row.last_message?.body || row.last_message_body || (typeof row.last_message === 'string' ? row.last_message : '') || messages.at(-1)?.body || '',
    time: row.updated_at || row.created_at || '', unread: row.unread_count ?? 0,
    tags: [], stage: row.stage || '', source: row.channel || '', phone: row.phone || '', email: row.email || '',
    location: '', assignee: row.assignee || '',
    aiState,
    aiAutoReply: !aiPaused && aiState !== 'handoff' && aiState !== 'paused',
    takenOver,
    followUp: !aiPaused && aiState !== 'paused', followUpRules: [true, true, true], starred: false, activity: [],
    messages: messages.map(message => ({
      id: message.id,
      // A media label such as "[Image]" only stands in for the file; hide it once the file is there.
      text: message.media?.url && MEDIA_LABEL.test(message.body || '') ? '' : message.body || '',
      ...(message.media?.url ? { attachments: [mediaAttachment(message)] } : {}),
      time: message.created_at || '',
      sender: message.actor === 'agent' ? 'agent' : message.role === 'assistant' || ['ai', 'assistant'].includes(message.sender) || ['ai', 'assistant'].includes(message.sender_type) || message.direction === 'outbound' ? 'ai' : 'customer',
      citationsCount: Array.isArray(message.citations) ? message.citations.length : 0,
      ...(message.delivery_status === 'failed'
        ? { status: 'failed' as const, error: message.delivery_error || 'Meta rejected this reply.' }
        : message.delivery_status === 'unknown'
          ? { status: 'unconfirmed' as const, error: message.delivery_error || 'Meta did not confirm this message.' }
          : {}),
    })),
  };
}
export function useGosInbox(enabled: boolean, selectedId: string) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [settledOnce, setSettledOnce] = useState(!enabled);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => {
    setLoading(true);
    setError('');
    setRevision(v => v + 1);
  }, []);
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setSettledOnce(false);
      return;
    }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    setLoading(true); setError('');
    let running = false;
    const schedule = (ms: number) => { clearTimeout(timer); timer = setTimeout(load, ms); };
    const load = async () => {
      if (running || controller.signal.aborted) return;
      running = true;
      try {
        // The open conversation is fetched alongside the list instead of after it.
        const [result, early] = await Promise.all([
          gosApi.conversations(controller.signal),
          selectedId ? gosApi.conversation(selectedId, controller.signal).catch(() => null) : Promise.resolve(null),
        ]);
        if (!Array.isArray(result.conversations)) throw new Error('The Upklick API returned an invalid conversation list.');
        const target = result.conversations.find(row => row.id === selectedId)?.id || result.conversations[0]?.id;
        const detail = early && early.conversation.id === target
          ? early
          : target ? await gosApi.conversation(target, controller.signal) : null;
        if (controller.signal.aborted) return;
        setConversations(result.conversations.map(row => detail && detail.conversation.id === row.id ? normalizeConversation(detail.conversation, detail.messages) : normalizeConversation(row)));
        setSettledOnce(true);
        setLoading(false);
        setError('');
        schedule(document.hidden ? 15000 : 3000);
      } catch (e) {
        if (!controller.signal.aborted) {
          setSettledOnce(true);
          setLoading(false);
          setError((e as Error).message);
          // A failed refresh no longer stops the inbox: try again shortly.
          schedule(document.hidden ? 15000 : 5000);
        }
      } finally {
        running = false;
      }
    };
    // Coming back to the tab refreshes at once instead of waiting out the 15s background interval.
    const onVisible = () => { if (!document.hidden) { schedule(0); } };
    document.addEventListener('visibilitychange', onVisible);
    void load();
    return () => { controller.abort(); clearTimeout(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [enabled, selectedId, revision]);
  const initialLoading = enabled && (!settledOnce || (loading && conversations.length === 0));
  return { conversations, loading, initialLoading, error, retry };
}
