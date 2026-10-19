import { useCallback, useEffect, useRef, useState } from 'react';
import { gosApi, type GosAssistant, type GosSource } from './gosApi';
import { showToast } from '../utils/toast';

export function useGosAI() {
  const [sources, setSources] = useState<GosSource[]>([]);
  const [assistant, setAssistant] = useState<GosAssistant>({ live_enabled: false, channels: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const mutation = useRef(false);
  const retry = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let polls = 0;
    setLoading(true); setError('');
    async function load() {
      try {
        await gosApi.me(controller.signal);
        const [knowledge, config] = await Promise.all([gosApi.sources(controller.signal), gosApi.assistant(controller.signal)]);
        if (controller.signal.aborted) return;
        if (!Array.isArray(knowledge.sources) || !config.assistant?.channels) throw new Error('The GOS API returned invalid knowledge or assistant data.');
        setSources(knowledge.sources); setAssistant(config.assistant); setLoading(false);
        if (knowledge.sources.some(source => ['queued', 'processing'].includes(source.status))) timer = setTimeout(poll, 3000);
      } catch (e) { if (!controller.signal.aborted) { setError((e as Error).message); setLoading(false); } }
    }
    async function poll() {
      try {
        const result = await gosApi.sources(controller.signal);
        if (controller.signal.aborted) return;
        if (!Array.isArray(result.sources)) throw new Error('The GOS API returned an invalid source list.');
        setSources(previous => {
          result.sources.forEach(source => {
            if (source.status === 'ready' && previous.some(old => old.id === source.id && old.status !== 'ready')) showToast.success(`${source.name} is ready.`);
          });
          return result.sources;
        });
        if (result.sources.some(source => ['queued', 'processing'].includes(source.status))) {
          if (++polls < 60) timer = setTimeout(poll, 5000);
          else setError('Indexing is still pending. Refresh to check again; the server queue worker may need attention.');
        }
      } catch (e) { if (!controller.signal.aborted) setError((e as Error).message); }
    }
    void load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [revision]);
  const updateAssistant = async (changes: Partial<GosAssistant>) => {
    if (mutation.current || loading || error) return false;
    mutation.current = true; setSaving(true);
    try { const result = await gosApi.updateAssistant(changes); setAssistant(result.assistant); return true; }
    catch (e) { showToast.error((e as Error).message); return false; }
    finally { mutation.current = false; setSaving(false); }
  };
  return { sources, loading, saving, error, retry, assistant, updateAssistant };
}
