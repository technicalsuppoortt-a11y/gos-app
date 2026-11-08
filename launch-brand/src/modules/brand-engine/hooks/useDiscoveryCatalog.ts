import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/modules/brand-engine/firebase";
import type { DiscoveryCatalog } from "@/modules/brand-engine/data/discovery";
import { subscribeDiscoveryCatalog } from "@/modules/brand-engine/services/discoveryCatalog";

/** Only the published catalog reaches business owners. Drafts are admin-only. */
export function useDiscoveryCatalog() {
  const [catalog, setCatalog] = useState<DiscoveryCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let stopCatalog: (() => void) | undefined;
    const stopAuth = onAuthStateChanged(auth, (user) => {
      stopCatalog?.();
      setCatalog(null);
      setError(null);
      setLoading(Boolean(user));
      if (!user) return;
      stopCatalog = subscribeDiscoveryCatalog(
        (value) => {
          setCatalog(value);
          setLoading(false);
          setError(null);
        },
        (cause) => {
          setCatalog(null);
          setLoading(false);
          setError(cause.message);
        },
      );
    });
    return () => {
      stopAuth();
      stopCatalog?.();
    };
  }, [attempt]);
  useEffect(() => {
    if (!error) return;
    const reconnect = () => {
      if (auth.currentUser) setAttempt((value) => value + 1);
    };
    window.addEventListener("focus", reconnect);
    window.addEventListener("online", reconnect);
    return () => {
      window.removeEventListener("focus", reconnect);
      window.removeEventListener("online", reconnect);
    };
  }, [error]);
  return {
    catalog,
    loading,
    error,
    source: error ? ("error" as const) : catalog ? ("published" as const) : ("missing" as const),
    retry: () => setAttempt((value) => value + 1),
  };
}
