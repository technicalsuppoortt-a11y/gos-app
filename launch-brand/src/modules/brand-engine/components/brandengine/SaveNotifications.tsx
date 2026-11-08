import { markNotificationsRead } from "@/modules/brand-engine/services/saveNotifications";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, Check, Cloud, LoaderCircle, TriangleAlert, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from "@/modules/brand-engine/store/hooks";
import { activityActions, type SaveActivity } from "@/modules/brand-engine/store/activitySlice";
import { saveFailureMessage } from "@/modules/brand-engine/data/saveFailure";
import { brandPages } from "@/modules/brand-engine/data/brandPages";
import "./SaveNotifications.css";
const arabic: Record<string, string> = {
  business_discovery: "اكتشاف المشروع",
  branding: "هوية البراند",
  template_builder: "القالب والمنصة",
  dashboard: "لوحة التحكم",
  integrations: "التكاملات",
  ai_center: "مركز الذكاء الاصطناعي",
  content_planner: "خطة المحتوى",
  marketing: "التسويق",
  deployment: "الإطلاق",
};
function description(event: SaveActivity, ar: boolean) {
  const names = event.pageIds.map((id) =>
    ar ? arabic[id] || id : brandPages.find((page) => page.id === id)?.name || id,
  );
  if (event.changes?.length)
    return event.pageIds
      .map((id) => {
        const name = ar ? arabic[id] || id : brandPages.find((page) => page.id === id)?.name || id;
        return (
          name +
          ": " +
          event
            .changes!.filter((change) => change.pageId === id)
            .map(
              (change) =>
                (ar ? change.labelAr : change.label) + (change.value ? ` (${change.value})` : ""),
            )
            .join(ar ? "، " : ", ")
        );
      })
      .join(" • ");
  return (
    names.slice(0, 2).join(ar ? "، " : ", ") + (names.length > 2 ? ` +${names.length - 2}` : "")
  );
}
export function SaveToast() {
  const dispatch = useAppDispatch();
  const { toastId, toastStartedAt, events } = useAppSelector((state) => state.activity);
  const ar = useAppSelector((state) => state.brand.language) === "ar";
  const event = events.find((item) => item.id === toastId);
  useEffect(() => {
    if (!toastId) return;
    const timer = window.setTimeout(
      () => dispatch(activityActions.dismissToast()),
      event?.type === "error" ? 7000 : 2000,
    );
    return () => window.clearTimeout(timer);
  }, [toastId, toastStartedAt, event?.type, dispatch]);
  if (!event || typeof document === "undefined") return null;
  return createPortal(
    <div
      className={`save-toast ${event.type}`}
      role="status"
      aria-live="polite"
      dir={ar ? "rtl" : "ltr"}
    >
      <span className="save-event-icon">
        {event.type === "saved" ? <Check size={16} /> : <TriangleAlert size={16} />}
      </span>
      <div>
        <strong>
          {event.type === "saved"
            ? ar
              ? "تم حفظ اختياراتك"
              : "Changes saved"
            : ar
              ? "تعذّر حفظ التغييرات"
              : "Changes could not be saved"}
        </strong>
        <small>
          {event.type === "saved"
            ? description(event, ar) ||
              (ar ? "محفوظة بأمان في حسابك" : "Safely saved to your account")
            : saveFailureMessage(event.errorCode, ar)}
        </small>
      </div>
      {event.type === "error" && (
        <button
          onClick={() => {
            dispatch(activityActions.dismissToast());
            dispatch(activityActions.retrySave());
          }}
        >
          {ar ? "إعادة" : "Retry"}
        </button>
      )}
      <button
        className="save-dismiss"
        aria-label={ar ? "إغلاق الإشعار" : "Dismiss notification"}
        onClick={() => dispatch(activityActions.dismissToast())}
      >
        <X size={14} />
      </button>
    </div>,
    (document.querySelector<HTMLElement>(".brand-engine-module") ?? document.body),
  );
}
export function SaveNotificationBell() {
  const dispatch = useAppDispatch();
  const activity = useAppSelector((state) => state.activity);
  const ar = useAppSelector((state) => state.brand.language) === "ar";
  const [open, setOpen] = useState(false);
  const [top, setTop] = useState(70);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const unread = activity.events.filter((event) => !event.read).length;
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (
        !panel.current?.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  const needsRetry =
    activity.status === "error" || activity.historyError || !!activity.syncErrorCode;
  const status =
    activity.status === "saving"
      ? ar
        ? "جارٍ حفظ اختياراتك"
        : "Saving your choices"
      : activity.status === "error"
        ? ar
          ? "تعذّر الحفظ"
          : "Save needs attention"
        : ar
          ? "كل التغييرات محفوظة"
          : "All changes saved";
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="header-control save-bell"
        aria-label={`${ar ? "الإشعارات" : "Notifications"}${unread ? ` (${unread})` : ""}`}
        aria-expanded={open}
        aria-controls="save-notifications"
        aria-haspopup="dialog"
        title={status}
        onClick={() => {
          setTop((trigger.current?.getBoundingClientRect().bottom || 58) + 10);
          setOpen((value) => !value);
        }}
      >
        <Bell size={17} />
        {(unread > 0 || needsRetry) && (
          <span className={`save-bell-dot ${needsRetry ? "error" : ""}`} aria-hidden="true" />
        )}
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panel}
            id="save-notifications"
            role="dialog"
            aria-labelledby="save-notification-title"
            className="save-notification-panel"
            style={{ top }}
            dir={ar ? "rtl" : "ltr"}
          >
            <header>
              <h2 id="save-notification-title">{ar ? "الإشعارات" : "Notifications"}</h2>
              <button
                aria-label={ar ? "إغلاق الإشعارات" : "Close notifications"}
                onClick={() => {
                  setOpen(false);
                  trigger.current?.focus();
                }}
              >
                <X size={15} />
              </button>
            </header>
            <div className={`save-current-status ${activity.status}`} role="status">
              {activity.status === "saving" ? (
                <LoaderCircle className="save-spin" size={15} />
              ) : activity.status === "error" ? (
                <TriangleAlert size={15} />
              ) : (
                <Cloud size={15} />
              )}
              <span>{status}</span>
              {needsRetry && (
                <button onClick={() => dispatch(activityActions.retrySave())}>
                  {ar ? "إعادة المحاولة" : "Retry"}
                </button>
              )}
            </div>
            {activity.status === "error" && (
              <p className="save-history-error" role="status">
                {saveFailureMessage(activity.saveErrorCode, ar)}
              </p>
            )}
            {activity.syncErrorCode && (
              <p className="save-history-error" role="status">
                {ar
                  ? "تعذّرت مزامنة التغييرات من الأجهزة الأخرى. "
                  : "Could not sync changes from other devices. "}
                {saveFailureMessage(activity.syncErrorCode, ar)}
              </p>
            )}
            {activity.historyError && (
              <p className="save-history-error" role="status">
                {ar
                  ? "تعذّرت مزامنة سجل الإشعارات مع Firebase."
                  : "Notification history could not sync with Firebase."}{" "}
                {saveFailureMessage(activity.historyErrorCode, ar)}
              </p>
            )}
            <div className="save-notification-list">
              {activity.events.length ? (
                activity.events.map((event) => (
                  <article key={event.id} className={event.read ? "" : "unread"}>
                    <span className={`save-event-icon ${event.type}`}>
                      {event.type === "saved" ? <Check size={14} /> : <TriangleAlert size={14} />}
                    </span>
                    <div>
                      <strong>
                        {event.type === "saved"
                          ? ar
                            ? "تم حفظ اختياراتك"
                            : "Choices saved"
                          : ar
                            ? "محاولة حفظ لم تكتمل"
                            : "Save attempt failed"}
                      </strong>
                      <p>{description(event, ar)}</p>
                      {event.type === "error" && <p>{saveFailureMessage(event.errorCode, ar)}</p>}
                      <time dateTime={new Date(event.timestamp).toISOString()}>
                        {new Intl.DateTimeFormat(ar ? "ar-EG" : "en", {
                          hour: "numeric",
                          minute: "2-digit",
                          month: "short",
                          day: "numeric",
                        }).format(event.timestamp)}
                      </time>
                    </div>
                    {!event.read && <i aria-label={ar ? "غير مقروء" : "Unread"} />}
                  </article>
                ))
              ) : (
                <div className="save-empty">
                  <Bell size={22} />
                  <strong>{ar ? "كل شيء هادئ هنا" : "You're all caught up"}</strong>
                  <p>
                    {ar
                      ? "ستظهر تأكيدات حفظ اختياراتك هنا."
                      : "Your save confirmations will appear here."}
                  </p>
                </div>
              )}
            </div>
            {unread > 0 && (
              <footer>
                <button
                  onClick={() => {
                    if (activity.owner) void markNotificationsRead(activity.owner, activity.events);
                  }}
                >
                  {ar ? "تحديد الكل كمقروء" : "Mark all as read"}
                </button>
              </footer>
            )}
          </div>,
          (document.querySelector<HTMLElement>(".brand-engine-module") ?? document.body),
        )}
    </>
  );
}
