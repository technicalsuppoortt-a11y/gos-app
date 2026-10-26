import { useCallback, useEffect, useState } from 'react';
import { gosApi, type ApiRecord } from './gosApi';
import type { Conversation } from '../pages/inbox/inboxData';

export function normalizeConversation(row: ApiRecord, messages: ApiRecord[] = row.messages ?? []): Conversation {
  const name = row.customer_name || row.name || 'Customer';
  return {
    id: row.id, name, initials: name.split(/\s+/).slice(0, 2).map((v: string) => v[0]).join(''),
    channel: ['instagram', 'facebook', 'whatsapp', 'messenger', 'webchat', 'email'].includes(row.channel) ? row.channel : 'webchat',
    preview: row.last_message?.body || row.last_message_body || messages.at(-1)?.body || '',
    time: row.updated_at || row.created_at || '', unread: row.unread_count ?? 0,
    tags: [], stage: row.status || '', source: row.channel || '', phone: row.phone || '', email: row.email || '',
    location: '', assignee: row.assignee || '', aiAutoReply: row.status !== 'handoff', takenOver: row.status === 'handoff',
    followUp: false, followUpRules: [], starred: false, activity: [],
    messages: messages.map(message => ({ id: message.id, text: message.body || '', time: message.created_at || '', sender: message.role === 'assistant' || ['ai', 'assistant'].includes(message.sender) || ['ai', 'assistant'].includes(message.sender_type) || message.direction === 'outbound' ? 'ai' : 'customer' })),
  };
}
export function useGosInbox(enabled: boolean, selectedId: string) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision(v => v + 1), []);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    setLoading(true); setError('');
    const load = async () => {
      try {
        const result = await gosApi.conversations(controller.signal);
        if (!Array.isArray(result.conversations)) throw new Error('The Upclick API returned an invalid conversation list.');
        const target = result.conversations.find(row => row.id === selectedId)?.id || result.conversations[0]?.id;
        const detail = target && result.conversations.some(row => row.id === target) ? await gosApi.conversation(target, controller.signal) : null;
        if (controller.signal.aborted) return;
        setConversations(result.conversations.map(row => detail && detail.conversation.id === row.id ? normalizeConversation(detail.conversation, detail.messages) : normalizeConversation(row)));
        setLoading(false); timer = setTimeout(load, 10000);
      } catch (e) { if (!controller.signal.aborted) { setLoading(false); setError((e as Error).message); } }
    };
    void load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [enabled, selectedId, revision]);
  return { conversations, loading, error, retry };
}
