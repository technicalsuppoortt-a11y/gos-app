import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/modules/brand-engine/firebase";
import { store } from "@/modules/brand-engine/store";
import { activityActions, type SaveActivity } from "@/modules/brand-engine/store/activitySlice";
import { describeChanges } from "@/modules/brand-engine/data/saveChanges";
import { saveFailureCode } from "@/modules/brand-engine/data/saveFailure";
import { savedActivity } from "@/modules/brand-engine/data/saveActivity";
export async function persistSaveNotification(
  uid: string,
  revision: string,
  previous: string,
  current: string,
) {
  const changes = describeChanges(previous, current);
  if (!changes.length) return;
  const event: SaveActivity = {
    id: revision,
    type: "saved",
    timestamp: Date.now(),
    pageIds: [...new Set(changes.map((change) => change.pageId))],
    changes,
    read: false,
  };
  if (store.getState().activity.owner === uid) store.dispatch(activityActions.record(event));
  try {
    await setDoc(doc(db, "users", uid, "notifications", revision), {
      ...event,
      createdAt: serverTimestamp(),
    });
    if (store.getState().activity.owner === uid)
      store.dispatch(activityActions.historyError(false));
  } catch (error) {
    // A notification permission/network failure must not undo successfully saved choices.
    if (store.getState().activity.owner === uid)
      store.dispatch(activityActions.historyFailed(saveFailureCode(error)));
  }
}
export function subscribeSaveNotifications(uid: string) {
  return onSnapshot(
    query(collection(db, "users", uid, "notifications"), orderBy("timestamp", "desc"), limit(20)),
    (snapshot) => {
      if (store.getState().activity.owner !== uid) return;
      store.dispatch(
        activityActions.hydrateEvents(
          snapshot.docs.map((item) => savedActivity(item.id, item.data())),
        ),
      );
      store.dispatch(activityActions.historyError(false));
    },
    (error) => {
      if (store.getState().activity.owner === uid)
        store.dispatch(activityActions.historyFailed(saveFailureCode(error)));
    },
  );
}
export async function markNotificationsRead(uid: string, events: SaveActivity[]) {
  const batch = writeBatch(db);
  events
    .filter((event) => event.type === "saved" && !event.read)
    .forEach((event) =>
      batch.update(doc(db, "users", uid, "notifications", event.id), { read: true }),
    );
  try {
    await batch.commit();
    if (store.getState().activity.owner === uid) store.dispatch(activityActions.markRead());
  } catch (error) {
    if (store.getState().activity.owner === uid)
      store.dispatch(activityActions.historyFailed(saveFailureCode(error)));
  }
}
