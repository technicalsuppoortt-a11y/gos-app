import { readEntity } from './workspace';
export type ApiRecord = Record<string, any>;
export const gosRequest = async () => ({});
export const gosApi: Record<string, (...args: any[]) => Promise<any>> = new Proxy({}, { get: (_target, key) => async (id?: string) => {
  switch (key) {
    case 'me': return { user: { id: 'landing-demo-user' } };
    case 'leads': return { leads: readEntity('leads') };
    case 'pipelines': return { pipelines: readEntity('pipelines') };
    case 'sources': return { sources: [] };
    case 'training': return { embedding_percent: 0, files: { ready: 0, limit: 10, items: [] }, links: { ready: 0, limit: 50, items: [] } };
    case 'channels': return { channels: [] };
    case 'inboxSummary': return { conversations_today: 0, needed_team: 0, conversations: readEntity('conversations') };
    case 'assistant': return { assistant: { live_enabled: false, channels: {} } };
    case 'playground': return { tests: [] };
    case 'conversations': return { conversations: readEntity('conversations') };
    case 'conversation': { const conversation = readEntity('conversations').find(row => row.id === id); return { conversation, messages: conversation?.messages ?? [] }; }
    case 'presets': return { presets: [] };
    default: throw new Error('This is a read-only demonstration.');
  }
} });
