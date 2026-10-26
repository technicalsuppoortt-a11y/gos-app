import { useEffect, useRef, useState } from 'react';
import { backendError, callBackend } from './firebase';

export type AgentProfile = { name: string; role: string; language: string; goal: string };
const defaults: AgentProfile = { name: 'Upclick Assistant', role: 'Business assistant', language: 'Auto-detect Arabic / English', goal: 'Appointments' };

export function useAgentConfiguration() {
  const [profile, setProfile] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const mutation = useRef(false);
  useEffect(() => {
    let active = true;
    callBackend<{ agent: AgentProfile }>('agentConfiguration', { operation: 'get' })
      .then(result => { if (active) setProfile(result.agent); })
      .catch(error => {
        if (active) {
          const isDev = import.meta.env.DEV;
          const msg = String(error?.message || '');
          const isNetworkOrCORS = msg.includes('CORS') || msg.includes('Failed to fetch') || msg.includes('network') || msg.includes('internal');
          if (isDev && isNetworkOrCORS) {
            console.warn('[useAgentConfiguration] Remote function not reachable; using defaults for local development.');
            setProfile(defaults);
          } else {
            setError(backendError(error));
          }
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);
  return { profile, loading, saving, error, retry: () => { setLoading(true); setError(''); setRevision(value => value + 1); },
    save: async (agent: AgentProfile) => {
      if (loading || error || mutation.current) return false;
      mutation.current = true; setSaving(true);
      try {
        const result = await callBackend<{ agent: AgentProfile }>('agentConfiguration', { operation: 'save', agent });
        setProfile(result.agent); return true;
      } catch (error) { setError(backendError(error)); return false; }
      finally { mutation.current = false; setSaving(false); }
    },
  };
}
