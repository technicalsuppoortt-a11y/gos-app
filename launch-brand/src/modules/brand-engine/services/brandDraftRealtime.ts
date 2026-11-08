import { collection, onSnapshot, query, where, documentId } from "firebase/firestore";
import { auth, db } from "@/modules/brand-engine/firebase";
import { store } from "@/modules/brand-engine/store";
import { actions } from "@/modules/brand-engine/store/brandSlice";
import {
  fingerprintBrandPages,
  fingerprintPages,
  serializeBrandPages,
  hydrateBrandPages,
  type SavedBrandPage,
  workspacePageIds,
} from "@/modules/brand-engine/data/brandPages";
import {
  acknowledgeRemoteDraft,
  getLastSavedDraft,
  saveBrandDraft,
  isLocalDraftRevision,
  isLegacyBrandDraft,
} from "./brandDraft";
import { mergeBrandDraft } from "@/modules/brand-engine/data/mergeBrandDraft";
import { activityActions } from "@/modules/brand-engine/store/activitySlice";
import { saveFailureCode } from "@/modules/brand-engine/data/saveFailure";
import { validateDraftPages } from '../data/brandDraftSnapshot';

export function subscribeBrandDraft(uid: string, workspaceOnly = false) {
  return onSnapshot(
    workspaceOnly
      ? query(collection(db, "users", uid, "pages"), where(documentId(), 'in', workspacePageIds))
      : collection(db, "users", uid, "pages"),
    (snapshot) => {
      if (
        snapshot.metadata.hasPendingWrites || snapshot.metadata.fromCache ||
        auth.currentUser?.uid !== uid ||
        store.getState().brand.userProfile?.uid !== uid
      )
        return;
      const records = snapshot.docs.map((item) => item.data());
      if (!records.length && !getLastSavedDraft()) return;
      // The next transaction upgrades the validated legacy pages as one batch.
      // Do not treat their old, per-page layout as a corrupt modern snapshot.
      if (isLegacyBrandDraft(uid)) return;
      const revision = records[0]?.["revision"];
      // A saved configuration is one batch; never hydrate a partial revision.
      if (typeof revision !== 'string') {
        store.dispatch(activityActions.syncError('invalid-draft'));
        return;
      }
      let pages: SavedBrandPage[];
      try { pages = validateDraftPages(records, revision, workspaceOnly ? workspacePageIds : undefined); }
      catch { store.dispatch(activityActions.syncError('invalid-draft')); return; }
      store.dispatch(activityActions.syncError(null));
      // An acknowledgement of this session's autosave is not a remote edit.
      if (isLocalDraftRevision(uid, revision)) return;
      const hydrated = hydrateBrandPages(pages);
      // A scoped snapshot must preserve choices belonging to older hidden screens.
      if (workspaceOnly) hydrated.pageParameters = { ...store.getState().brand.pageParameters, ...hydrated.pageParameters };
      const {
        activeStep: _step,
        completedSteps: _completed,
        ...incoming
      } = hydrated;
      const serialized = fingerprintBrandPages({ ...store.getState().brand, ...incoming });
      const saved = getLastSavedDraft();
      const local = fingerprintBrandPages(store.getState().brand);
      if (saved?.uid === uid && saved.revision === revision) return;
      const localPages = serializeBrandPages(store.getState().brand);
      const remotePages = JSON.parse(serialized) as SavedBrandPage[];
      const base =
        saved?.uid === uid ? (JSON.parse(saved.serialized) as SavedBrandPage[]) : localPages;
      const merged = mergeBrandDraft(base, localPages, remotePages);
      acknowledgeRemoteDraft({ uid, serialized, revision, ...(workspaceOnly ? { workspaceOnly: true } : {}) });
      if (fingerprintPages(merged) !== local)
        store.dispatch(actions.hydrateUserDraft(hydrateBrandPages(merged)));
      // Resolve concurrency without a banner: current edits win, unrelated remote edits merge.
      if (fingerprintBrandPages(store.getState().brand) !== serialized)
        void saveBrandDraft().catch((error: unknown) => {
          if (auth.currentUser?.uid === uid)
            store.dispatch(activityActions.saveFailed(saveFailureCode(error)));
        });
    },
    (error) => {
      if (auth.currentUser?.uid === uid)
        store.dispatch(activityActions.syncError(saveFailureCode(error)));
    },
  );
}
