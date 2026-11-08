import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/modules/brand-engine/firebase";
import { useAppSelector } from "@/modules/brand-engine/store/hooks";
import type { AIConnection } from "@/modules/brand-engine/services/aiConnection";
import type { AISettings } from "@/modules/brand-engine/services/userAI";
import { removeLegacyPersonalAI } from "@/modules/brand-engine/services/browserAIConnections.js";
import { retrySubscription } from '../services/retrySubscription.js';
import type { DocumentSnapshot, DocumentData } from 'firebase/firestore';
type State = {
  uid: string;
  platform: AIConnection | null;
  settings: AISettings;
  ready: number;
  error: boolean;
  platformError: boolean;
};
export function useAIConnection() {
  const uid = useAppSelector((s) => s.brand.userProfile?.uid);
  const [state, setState] = useState<State | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    setState(null);
    if (!uid) return;
    void removeLegacyPersonalAI(uid).catch(() => {});
    const initial: State = {
      uid,
      platform: null,
      settings: { source: "platform" },
      ready: 0,
      error: false,
      platformError: false,
    };
    const targets = [
      ["platform", doc(db, "aiConnections", "default")],
      ["settings", doc(db, "users", uid, "aiSettings", "default")],
    ] as const;
    const resolved = new Set<string>();
    const failures = new Set<string>();
    let active = true;
    const stops = targets.map(([key, ref]) =>
      retrySubscription<DocumentSnapshot<DocumentData>>(
        (success, failure) => onSnapshot(ref, success, failure),
        (snapshot) => update(key, snapshot.exists() ? snapshot.data() : null),
        () => update(key, null, true),
      ),
    );
    return () => { active = false; stops.forEach((stop) => stop()); };
    function update(key: string, value: unknown, error = false) {
      if (!active) return;
      resolved.add(key);
      if (error) failures.add(key); else failures.delete(key);
      setState((old) => {
        const next = { ...(old && old.uid === uid ? old : initial), ready: resolved.size,
          error: failures.size > 0, platformError: failures.has('platform') };
        if (key === "platform") next.platform = error ? null : value as AIConnection | null;
        else if (key === "settings")
          next.settings = (value as AISettings) || { source: "platform" };
        return next;
      });
    }
  }, [uid, revision]);
  const current = state && state.uid === uid ? state : null;
  const settings = current?.settings || { source: "platform" as const };
  const connection = current?.platform || null;
  return {
    connection: connection?.aiPaused ? null : connection,
    platform: current?.platform || null,
    settings,
    loading: Boolean(uid && current?.ready !== 2),
    error: current?.error || false,
    platformError: current?.platformError || false,
    retry: () => setRevision(value => value + 1),
  };
}
