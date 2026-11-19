import { persistSaveNotification } from "./saveNotifications";
import {
  doc,
  collection,
  getDoc,
  getDocFromServer,
  getDocsFromServer,
  query,
  where,
  documentId,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { mergeBrandDraft } from "@/modules/brand-engine/data/mergeBrandDraft";
import { hasWorkspaceBookingConflict, type WorkspaceBooking } from "@/modules/brand-engine/data/dashboardWorkspace";
import { auth, db } from "@/modules/brand-engine/firebase";
import { store } from "@/modules/brand-engine/store";
import { actions } from "@/modules/brand-engine/store/brandSlice";
import { saveFailureCode } from "../data/saveFailure";

import { ensureBrandLogoSaved } from "./brandLogoPersistence";
import { draftFailure, hashDraftFingerprint, validateDraftSnapshot } from '../data/brandDraftSnapshot';
import {
  fingerprintBrandPages,
  fingerprintPages,
  hydrateBrandPages,
  serializeWorkspacePages,
  type SavedBrandPage,
  workspacePageIds,
} from "@/modules/brand-engine/data/brandPages";

let writes: Promise<unknown> = Promise.resolve();
type DraftSaveRequest = {
  uid: string;
  captured: ReturnType<typeof store.getState>["brand"];
  fingerprint: string;
  requestedBase: string | null;
  promise: Promise<string>;
};
const queuedSaves = new Map<string, DraftSaveRequest>();
let activeSave: DraftSaveRequest | null = null;
const quotaFailures = new Map<string, unknown>();
export const isBrandDraftSavePaused = (uid: string) => quotaFailures.has(uid);
// Only an explicit Retry resumes writes after a quota error. Editing, reconnecting,
// realtime reconciliation and lifecycle flushes must not create another retry loop.
export function retryBrandDraftSave(uid: string) {
  if (auth.currentUser?.uid === uid) quotaFailures.delete(uid);
}
let lastSaved: { uid: string; serialized: string; revision: string } | null = null;
let loadedBaseline: { uid: string; serialized: string; revision: string | null; needsUpgrade: boolean } | null = null;
let loadSequence = 0;
const localRevisions = new Map<string, Set<string>>();
export const isLocalDraftRevision = (uid: string, revision: string) =>
  localRevisions.get(uid)?.has(revision) ?? false;
export const getLastSavedDraft = () => lastSaved;
export const isLegacyBrandDraft = (uid: string) =>
  loadedBaseline?.uid === uid && loadedBaseline.needsUpgrade && lastSaved?.uid !== uid;
export function acknowledgeRemoteDraft(saved: NonNullable<typeof lastSaved>) {
  lastSaved = saved;
  if (prefetchedDraft?.uid === saved.uid) prefetchedDraft = null;
}

// Local preview (`?devpreview=1`, see host/session.ts): no Firestore, empty draft.
export const isDevPreview = () => import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true'
  && new URLSearchParams(window.location.search).get('devpreview') === '1';

async function readDraft(uid: string) {
  if (isDevPreview()) return { pages: [], revision: null, needsUpgrade: false } as ReturnType<typeof validateDraftSnapshot>;
  // Read the selected screens in one consistent collection snapshot instead of
  // individual transaction reads (and a transaction commit) to open the UI.
  // The manifest may straddle a concurrent save, so retry mismatched revisions.
  let saved: ReturnType<typeof validateDraftSnapshot> | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    const [manifest, pages] = await Promise.all([
      getDocFromServer(doc(db, 'users', uid, 'brandEngine', 'draft')),
      getDocsFromServer(query(collection(db, 'users', uid, 'pages'), where(documentId(), 'in', workspacePageIds))),
    ]);
    if (auth.currentUser?.uid !== uid)
      throw new Error('The signed-in account changed.');
    try {
      saved = validateDraftSnapshot(manifest.data(), pages.docs.map(page => page.data()),
        workspacePageIds);
      break;
    } catch (error) {
      if (attempt === 2 || (error as { code?: string }).code !== 'invalid-draft') throw error;
    }
  }
  if (!saved) throw draftFailure('invalid-draft', 'The saved workspace could not be loaded.');
  return saved;
}

let prefetchedDraft: { uid: string; expires: number; promise: ReturnType<typeof readDraft> } | null = null;
export function clearPrefetchedBrandDraft() { prefetchedDraft = null; }
export function prefetchBrandDraft(uid: string) {
  if (auth.currentUser?.uid !== uid) return Promise.reject(new Error('The signed-in account changed.'));
  if (prefetchedDraft?.uid === uid && prefetchedDraft.expires > Date.now()) return prefetchedDraft.promise;
  const entry = { uid, expires: Date.now() + 300_000, promise: writes.catch(() => undefined).then(() => readDraft(uid)) };
  prefetchedDraft = entry;
  void entry.promise.catch(() => { if (prefetchedDraft === entry) prefetchedDraft = null; });
  return entry.promise;
}

export async function loadBrandDraft(uid: string, options: {
  workspaceOnly?: boolean; progress?: { activeStep?: number; completedSteps?: number[] };
} = {}) {
  const sequence = ++loadSequence;
  const initial = store.getState().brand;
  if (auth.currentUser?.uid !== uid) throw new Error('The signed-in account changed.');
  await writes.catch(() => undefined);
  if (sequence !== loadSequence || auth.currentUser?.uid !== uid)
    throw new Error('The signed-in account changed.');
  lastSaved = null;
  loadedBaseline = null;
  const saved = await prefetchBrandDraft(uid);
  if (sequence !== loadSequence || auth.currentUser?.uid !== uid)
    throw new Error('The signed-in account changed.');
  const draft: Partial<typeof initial> = saved.pages.length ? hydrateBrandPages(saved.pages) : {};
  if (options.workspaceOnly && saved.pages.length && options.progress) {
    if (draft.activeStep === undefined && Number.isInteger(options.progress.activeStep)) draft.activeStep = options.progress.activeStep;
    if (draft.completedSteps === undefined && Array.isArray(options.progress.completedSteps))
      draft.completedSteps = options.progress.completedSteps.filter(Number.isInteger);
  }
  const serialized = fingerprintBrandPages({ ...initial, ...draft });
  loadedBaseline = { uid, serialized, revision: saved.revision, needsUpgrade: saved.needsUpgrade };
  lastSaved = saved.revision && !saved.needsUpgrade ? { uid, serialized, revision: saved.revision } : null;
  return draft;
}

export function saveBrandDraft() {
  const uid = auth.currentUser?.uid;
  if (!uid || store.getState().brand.userProfile?.uid !== uid) {
    return Promise.reject(new Error("Please sign in again before saving."));
  }
  // Capture when requested, including the last edit before React unmounts.
  const captured = store.getState().brand;
  const fingerprint = fingerprintBrandPages(captured);
  const requestedBase = lastSaved?.uid === uid ? lastSaved.serialized
    : loadedBaseline?.uid === uid ? loadedBaseline.serialized : null;
  const queued = queuedSaves.get(uid);
  if (queued) {
    // Keep one waiting snapshot containing the latest edits, rather than replaying
    // every intermediate state after a slow connection recovers.
    Object.assign(queued, { captured, fingerprint, requestedBase });
    return queued.promise;
  }
  if (activeSave?.uid === uid && activeSave.fingerprint === fingerprint) return activeSave.promise;
  const request: DraftSaveRequest = {
    uid, captured, fingerprint, requestedBase, promise: Promise.resolve(""),
  };
  const operation = writes
    .catch(() => undefined)
    .then(async () => {
      if (queuedSaves.get(uid) === request) queuedSaves.delete(uid);
      activeSave = request;
      const { captured, requestedBase } = request;
      if (auth.currentUser?.uid !== uid) throw new Error("The signed-in account changed.");
      let pages = serializeWorkspacePages(captured);
      if (requestedBase && lastSaved?.uid === uid && lastSaved.serialized !== requestedBase)
        pages = mergeBrandDraft(JSON.parse(requestedBase) as SavedBrandPage[], pages, JSON.parse(lastSaved.serialized) as SavedBrandPage[]);
      const serialized = fingerprintPages(pages);
      if (lastSaved?.uid === uid && lastSaved.serialized === serialized) return lastSaved.revision;
      if (quotaFailures.has(uid)) throw quotaFailures.get(uid);
      if (typeof navigator !== "undefined" && navigator.onLine === false)
        throw draftFailure("unavailable", "Could not connect. Check your internet connection, then retry.");
      if (prefetchedDraft?.uid === uid) prefetchedDraft = null;
      const revision = crypto.randomUUID();
      const revisions = localRevisions.get(uid) ?? new Set<string>();
      revisions.add(revision);
      if (revisions.size > 50) revisions.delete(revisions.values().next().value!);
      localRevisions.set(uid, revisions);
      const baseline = lastSaved?.uid === uid ? lastSaved : loadedBaseline?.uid === uid ? loadedBaseline : null;
      const previous = baseline?.serialized ?? null;
      const expectedRevision = baseline?.revision ?? null;
      const previousPages = previous ? JSON.parse(previous) as SavedBrandPage[] : [];
      let committedPages = pages;
      await runTransaction(db, async (batch) => {
        const manifestReference = doc(db, "users", uid, "brandEngine", "draft");
        const manifest = await batch.get(manifestReference);
        const upgrading = Boolean(baseline && 'needsUpgrade' in baseline && baseline.needsUpgrade);
        const canReusePages = Boolean(!upgrading && expectedRevision && manifest.data()?.["revision"] === expectedRevision);
        committedPages = pages;
        if (!canReusePages) {
          const snapshots = await Promise.all(
            workspacePageIds.map((pageId) => batch.get(doc(db, "users", uid, "pages", pageId))),
          );
          const remote = validateDraftSnapshot(manifest.data(), snapshots.map(snapshot => snapshot.data()), workspacePageIds);
          if (upgrading && !remote.pages.length)
            throw draftFailure('draft-changed', 'The saved workspace changed before its upgrade. Reload before saving.');
          if (remote.revision !== expectedRevision || upgrading) {
            if (!baseline || (!remote.revision && !upgrading))
              throw draftFailure('draft-changed', 'Reload the saved workspace before saving these changes.');
            const incoming = { ...captured, ...hydrateBrandPages(remote.pages) };
            const merged = mergeBrandDraft(JSON.parse(previous!) as SavedBrandPage[], pages, serializeWorkspacePages(incoming));
            committedPages = serializeWorkspacePages({ ...captured, ...hydrateBrandPages(merged) });
          }
        }
        const choices = committedPages.find((page) => page.pageId === "dashboard")?.parameters[
          "choices"
        ] as Record<string, unknown> | undefined;
        const appointments = choices?.["workspaceBookings"];
        if (
          Array.isArray(appointments) &&
          hasWorkspaceBookingConflict(appointments as WorkspaceBooking[])
        )
          throw new Error(
            "Two workspace bookings overlap. Cancel one or change its time before saving.",
          );
        for (const page of committedPages) {
          const reference = doc(db, "users", uid, "pages", page.pageId);
          const metadata = { revision, updatedAt: serverTimestamp() };
          // Keep the common revision without uploading unchanged page content again.
          // A concurrent remote edit still takes the full reconciliation path below.
          const previousPage = previousPages.find((old) => old.pageId === page.pageId);
          if (canReusePages && previousPage && fingerprintPages([previousPage]) === fingerprintPages([page])) {
            batch.update(reference, metadata);
            continue;
          }
          if (new TextEncoder().encode(JSON.stringify(page)).length > 900000)
            throw new Error(
              `The ${page.pageName} page is too large to save. Save images as assets.`,
            );
          // Replace the page to remove choices the user deleted; retain the user profile.
          batch.set(reference, {
            ...JSON.parse(JSON.stringify(page)),
            ...metadata,
          });
        }
        const committedState = { ...captured, ...hydrateBrandPages(committedPages) };
        batch.set(doc(db, "users", uid), {
          isBrandEngineProvisioned: true,
          brandEngineProgress: {
            activeStep: committedState.activeStep, completedSteps: committedState.completedSteps,
            deployed: committedState.deployed,
          },
          brandMetadata: { name: committedState.brandName, niche: committedState.business, subNiche: committedState.subNiche, description: committedState.businessDescription },
          updatedAt: serverTimestamp(),
        }, { merge: true });
        batch.set(doc(db, "users", uid, "brandEngine", "draft"), {
          schemaVersion: 1,
          revision,
          pageIds: pages.map((page) => page.pageId),
          updatedAt: serverTimestamp(),
        });
      });
      const committed = fingerprintPages(committedPages);
      if (auth.currentUser?.uid === uid && store.getState().brand.userProfile?.uid === uid) {
        lastSaved = { uid, serialized: committed, revision };
        const latest = store.getState().brand;
        const rebased = mergeBrandDraft(pages, serializeWorkspacePages(latest), committedPages);
        if (fingerprintPages(rebased) !== fingerprintBrandPages(latest))
          store.dispatch(actions.hydrateUserDraft(hydrateBrandPages(rebased)));
      }
      if (previous) void persistSaveNotification(uid, revision, previous, committed);
      return revision;
    })
    .catch((error: unknown) => {
      if (saveFailureCode(error) === "resource-exhausted") quotaFailures.set(uid, error);
      throw error;
    })
    .finally(() => {
      if (activeSave === request) activeSave = null;
    });
  request.promise = operation;
  queuedSaves.set(uid, request);
  writes = operation;
  return operation;
}

export async function preparePhoenixConfiguration() {
  const uid = auth.currentUser?.uid;
  if (!uid || store.getState().brand.userProfile?.uid !== uid) throw new Error("Please sign in again.");
  const fingerprint = fingerprintBrandPages(store.getState().brand);
  store.dispatch(actions.setPhoenixPreparation({ state: "transferring", fingerprint, snapshotId: null, error: null, progress: 10, stage: "logo" }));
  try {
    await ensureBrandLogoSaved();
    if (auth.currentUser?.uid !== uid || store.getState().brand.userProfile?.uid !== uid)
      throw new Error("The signed-in account changed.");
    store.dispatch(actions.setPhoenixPreparation({ state: 'transferring', fingerprint, snapshotId: null, error: null, progress: 30, stage: 'pages' }));
    store.dispatch(actions.completeStep(18));
    const revision = await saveBrandDraft();
    if (auth.currentUser?.uid !== uid) throw new Error("The signed-in account changed.");
    const saved = lastSaved;
    if (!saved || saved.uid !== uid || saved.revision !== revision)
      throw draftFailure('draft-changed', 'Your workspace changed during preparation. Please retry.');
    const savedFingerprint = saved.serialized;
    store.dispatch(actions.setPhoenixPreparation({ state: 'transferring', fingerprint: savedFingerprint, snapshotId: revision, error: null, progress: 65, stage: 'verification' }));
    const persistedFingerprint = await hashDraftFingerprint(savedFingerprint);
    if (auth.currentUser?.uid !== uid || store.getState().brand.userProfile?.uid !== uid)
      throw new Error('The signed-in account changed.');
    store.dispatch(actions.setPhoenixPreparation({ state: 'transferring', fingerprint: savedFingerprint, snapshotId: revision, error: null, progress: 90, stage: 'confirmation' }));
    const prepared = { state: "prepared" as const, fingerprint: savedFingerprint, snapshotId: revision, error: null, progress: 100, stage: "done", phoenixUid: uid, phoenixOrigin: window.location.origin };
    await runTransaction(db, async transaction => {
      const manifest = await transaction.get(doc(db, 'users', uid, 'brandEngine', 'draft'));
      if (manifest.data()?.['revision'] !== revision || auth.currentUser?.uid !== uid ||
          fingerprintBrandPages(store.getState().brand) !== savedFingerprint)
        throw draftFailure('draft-changed', 'Your workspace changed during preparation. Please retry.');
      transaction.set(doc(db, 'users', uid, 'brandEngine', 'phoenixPreparation'), {
        ...prepared, fingerprint: persistedFingerprint, updatedAt: serverTimestamp(),
      });
    });
    if (auth.currentUser?.uid !== uid || store.getState().brand.userProfile?.uid !== uid)
      throw new Error('The signed-in account changed.');
    if (fingerprintBrandPages(store.getState().brand) !== savedFingerprint)
      throw draftFailure('draft-changed', 'Your workspace changed during preparation. Please retry.');
    store.dispatch(actions.setPhoenixPreparation(prepared));
    return { status: "prepared" as const, snapshotId: revision, phoenixUid: uid };
  } catch (error) {
    if (auth.currentUser?.uid === uid) store.dispatch(actions.setPhoenixPreparation({ state: "failed", fingerprint, snapshotId: null, error: error instanceof Error ? error.message : "Could not save your configuration." }));
    throw error;
  }
}

export async function loadPhoenixPreparation(uid: string) {
  if (isDevPreview()) return null;
  const snapshot = await getDoc(doc(db, "users", uid, "brandEngine", "phoenixPreparation"));
  if (auth.currentUser?.uid !== uid) throw new Error('The signed-in account changed.');
  const saved = lastSaved;
  const preparation = snapshot.data();
  if (!saved || saved.uid !== uid || preparation?.['state'] !== 'prepared' ||
      preparation['phoenixUid'] !== uid || preparation['snapshotId'] !== saved.revision) return null;
  // Retain read support for preparations saved before bounded fingerprints.
  if (preparation['fingerprint'] !== saved.serialized &&
      preparation['fingerprint'] !== await hashDraftFingerprint(saved.serialized)) return null;
  if (auth.currentUser?.uid !== uid || lastSaved !== saved) return null;
  return { state: 'prepared' as const, fingerprint: saved.serialized, snapshotId: saved.revision,
    error: null, progress: 100, stage: 'done', phoenixUid: uid,
    phoenixOrigin: typeof preparation['phoenixOrigin'] === 'string' ? preparation['phoenixOrigin'] : undefined };
}

export function hasUnsavedBrandDraft(uid: string) {
  return auth.currentUser?.uid === uid && store.getState().brand.userProfile?.uid === uid &&
    (lastSaved?.uid !== uid || lastSaved.serialized !== fingerprintBrandPages(store.getState().brand));
}
