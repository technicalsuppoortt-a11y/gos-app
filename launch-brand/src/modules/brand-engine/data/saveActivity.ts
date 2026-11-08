import type { SaveActivity } from "@/modules/brand-engine/store/activitySlice";

// Firestore snapshots include SDK objects. Only UI fields enter Redux.
export function savedActivity(id: string, data: Record<string, unknown>): SaveActivity {
  const createdAt = data["createdAt"] as { toMillis?: () => number } | undefined;
  const timestamp =
    typeof data["timestamp"] === "number" ? data["timestamp"] : (createdAt?.toMillis?.() ?? 0);
  return {
    id,
    type: data["type"] === "error" ? "error" : "saved",
    timestamp: Number.isFinite(timestamp) ? timestamp : 0,
    pageIds: Array.isArray(data["pageIds"])
      ? data["pageIds"].filter((page): page is string => typeof page === "string")
      : [],
    read: data["read"] === true,
    ...(typeof data["errorCode"] === "string" ? { errorCode: data["errorCode"] } : {}),
    ...(Array.isArray(data["changes"])
      ? {
          changes: data["changes"]
            .filter(
              (change) =>
                change &&
                typeof change === "object" &&
                ["pageId", "field", "label", "labelAr", "value"].every(
                  (key) => typeof change[key] === "string",
                ),
            )
            .map((change) => ({
              pageId: change.pageId,
              field: change.field,
              label: change.label,
              labelAr: change.labelAr,
              value: change.value,
            })),
        }
      : {}),
  };
}
