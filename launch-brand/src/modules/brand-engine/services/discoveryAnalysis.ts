import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { auth, db } from "@/modules/brand-engine/firebase";
import { catalogOrStarter } from '../configuration/catalog';
import { invokeAI } from "./aiBackend";
import {
  defaultDiscoveryConfiguration,
  type DiscoveryAnalysis,
  type DiscoveryConfiguration,
} from "@/modules/brand-engine/data/discoveryProfile";
import { validateDiscoveryCatalog, type DiscoveryCatalog } from "@/modules/brand-engine/data/discovery";
export const analyzeDiscoveryProfile = (
  requestId: string,
  profileRevision: string,
  language: string,
) =>
  invokeAI<DiscoveryAnalysis>("analyzeDiscoveryProfile", { requestId, profileRevision, language });
type AnalysisTranslation = Pick<DiscoveryAnalysis, "reasons" | "tradeoffs" | "problemSignals" | "clarification">;
const translationRequests = new Map<string, Promise<AnalysisTranslation>>();
export function translateDiscoveryAnalysis(requestId: string, analysisId: string, language: "ar" | "en") {
  const key = `${auth.currentUser?.uid}:${analysisId}:${language}`;
  const existing = translationRequests.get(key);
  if (existing) return existing;
  const request = invokeAI<AnalysisTranslation>("translateDiscoveryAnalysis", { requestId, analysisId, language });
  translationRequests.set(key, request);
  request.catch(() => { if (translationRequests.get(key) === request) translationRequests.delete(key); });
  return request;
}
export function subscribeDiscoveryConfiguration(
  callback: (value: DiscoveryConfiguration) => void,
  onError: () => void,
) {
  return onSnapshot(
    doc(db, "discoverySettings", "current"),
    (snapshot) =>
      callback(
        snapshot.exists()
          ? (snapshot.data() as DiscoveryConfiguration)
          : defaultDiscoveryConfiguration,
      ),
    onError,
  );
}
export function subscribeDiscoveryAnalysis(
  requestId: string,
  callback: (value: { status: string; stage: string; result?: DiscoveryAnalysis; persisted?: boolean }) => void,
  onError: (cause: Error) => void = () => {},
) {
  const uid = auth.currentUser?.uid;
  if (!uid) return () => {};
  return onSnapshot(
    doc(db, "users", uid, "aiJobs", requestId),
    { includeMetadataChanges: true },
    (snapshot) => {
      if (snapshot.exists())
        callback({ ...snapshot.data(), persisted: !snapshot.metadata.hasPendingWrites && !snapshot.metadata.fromCache } as { status: string; stage: string; result?: DiscoveryAnalysis; persisted: boolean });
    },
    onError,
  );
}
// Published releases are immutable. Keep the last release across page remounts
// and reloads, without sharing cached data between signed-in accounts.
const catalogCache = new Map<string, DiscoveryCatalog>();
const catalogRequests = new Map<string, Promise<DiscoveryCatalog>>();
const catalogCacheKey = () => `discovery-release:${auth.currentUser?.uid || "anonymous"}`;
export function getCachedAnalysisCatalog(version: string): DiscoveryCatalog | null {
  const key = `${catalogCacheKey()}:${version}`;
  const cached = catalogCache.get(key);
  if (cached) return cached;
  try {
    const value = JSON.parse(sessionStorage.getItem(catalogCacheKey()) || "null");
    if (value?.version === version && !validateDiscoveryCatalog(value, { publishing: true }).length) {
      catalogCache.set(key, value);
      return value as DiscoveryCatalog;
    }
  } catch {
    // Storage may be disabled or contain an interrupted/invalid write.
  }
  return null;
}
export async function loadAnalysisCatalog(version: string): Promise<DiscoveryCatalog> {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/.test(version))
    throw new Error("Invalid catalog version");
  const cached = getCachedAnalysisCatalog(version);
  if (cached) return cached;
  const storageKey = catalogCacheKey();
  const key = `${storageKey}:${version}`;
  const pending = catalogRequests.get(key);
  if (pending) return pending;
  const request = (async () => {
    const snapshot = await getDoc(doc(db, "discoveryCatalogVersions", version));
    const value = catalogOrStarter(snapshot.data(), version) as DiscoveryCatalog | undefined;
    if (!value) throw new Error("This catalog release is unavailable.");
    if (value.version !== version || validateDiscoveryCatalog(value, { publishing: true }).length)
      throw new Error("This catalog release is invalid.");
    if (catalogCache.size >= 8) catalogCache.delete(catalogCache.keys().next().value!);
    catalogCache.set(key, value);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // The in-memory cache still works if browser storage is unavailable/full.
    }
    return value;
  })();
  catalogRequests.set(key, request);
  try {
    return await request;
  } finally {
    catalogRequests.delete(key);
  }
}
export const getDiscoveryConfiguration = () =>
  invokeAI<DiscoveryConfiguration>("getDiscoveryConfiguration", { draft: true });
export const saveDiscoveryConfiguration = (
  configuration: DiscoveryConfiguration,
  expectedRevision: string | null,
) =>
  invokeAI<{ revision: string }>("saveDiscoveryConfiguration", { configuration, expectedRevision });
export const publishDiscoveryConfiguration = (expectedRevision: string) =>
  invokeAI<{ version: string; revision: string }>("publishDiscoveryConfiguration", {
    expectedRevision,
  });
export const getDiscoveryActivity = (page: number) =>
  invokeAI<
    Array<{
      id: string;
      status: string;
      stage: string;
      startedAt: number;
      completedAt: number | null;
      provider: string;
      subNicheId: string;
    }>
  >("getDiscoveryActivity", { page });
