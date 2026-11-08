import { subscribeSaveNotifications } from "@/modules/brand-engine/services/saveNotifications";
import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/modules/brand-engine/store/hooks";
import { fingerprintBrandPages } from "@/modules/brand-engine/data/brandPages";
import { saveBrandDraft } from "@/modules/brand-engine/services/brandDraft";
import { activityActions } from "@/modules/brand-engine/store/activitySlice";
import { SaveToast } from "./SaveNotifications";
import { subscribeBrandDraft } from "@/modules/brand-engine/services/brandDraftRealtime";
import { saveFailureCode } from "@/modules/brand-engine/data/saveFailure";
function changedPages(previous: string, current: string): string[] {
  try {
    const before = JSON.parse(previous) as { pageId: string; parameters: unknown }[];
    const after = JSON.parse(current) as { pageId: string; parameters: unknown }[];
    return after
      .filter(
        (page) =>
          page.pageId !== "vision_journey" &&
          JSON.stringify(before.find((old) => old.pageId === page.pageId)?.parameters) !==
            JSON.stringify(page.parameters),
      )
      .map((page) => page.pageId);
  } catch {
    return [];
  }
}
export function DraftSync() {
  const dispatch = useAppDispatch();
  const brand = useAppSelector((state) => state.brand);
  const activity = useAppSelector((state) => state.activity);
  const uid = brand.userProfile?.uid || null;
  const content = fingerprintBrandPages(brand);
  const acknowledged = useRef({ uid, content });
  useEffect(() => {
    if (!uid) {
      return;
    }
    return subscribeBrandDraft(uid, true);
  }, [uid, activity.retry]);
  useEffect(() => {
    acknowledged.current = { uid, content };
    dispatch(activityActions.setOwner({ uid, events: [] }));
  }, [uid, dispatch]);
  useEffect(() => {
    if (uid) return subscribeSaveNotifications(uid);
    return undefined;
  }, [uid, activity.retry]);
  useEffect(() => {
    if (!uid) return;
    const reconnect = () => dispatch(activityActions.retrySave());
    window.addEventListener("online", reconnect);
    return () => window.removeEventListener("online", reconnect);
  }, [uid, dispatch]);
  useEffect(() => {
    if (!uid) return;
    let active = true;
    dispatch(activityActions.setStatus("saving"));
    const timer = window.setTimeout(() => {
      saveBrandDraft()
        .then(() => {
          if (!active) return;
          acknowledged.current = { uid, content };
          dispatch(activityActions.setStatus("saved"));
        })
        .catch((error: unknown) => {
          if (!active) return;
          const errorCode = saveFailureCode(error);
          dispatch(activityActions.saveFailed(errorCode));
          dispatch(
            activityActions.record({
              id: crypto.randomUUID(),
              type: "error",
              timestamp: Date.now(),
              pageIds: changedPages(acknowledged.current.content, content),
              read: false,
              errorCode,
            }),
          );
        });
    }, 700);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [content, uid, activity.retry, dispatch]);
  return (
    <>
      <SaveToast />
    </>
  );
}
