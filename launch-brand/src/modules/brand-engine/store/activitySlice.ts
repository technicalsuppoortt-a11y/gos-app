import type { SavedChange } from "@/modules/brand-engine/data/saveChanges";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
export type SaveActivity = {
  id: string;
  type: "saved" | "error";
  timestamp: number;
  pageIds: string[];
  read: boolean;
  changes?: SavedChange[];
  errorCode?: string;
};
type ActivityState = {
  owner: string | null;
  status: "idle" | "saving" | "saved" | "error";
  events: SaveActivity[];
  toastId: string | null;
  toastStartedAt: number;
  retry: number;
  historyError: boolean;
  saveErrorCode: string | null;
  historyErrorCode: string | null;
  syncErrorCode: string | null;
};
const initialState: ActivityState = {
  owner: null,
  status: "idle",
  events: [],
  toastId: null,
  toastStartedAt: 0,
  retry: 0,
  historyError: false,
  saveErrorCode: null,
  historyErrorCode: null,
  syncErrorCode: null,
};
const slice = createSlice({
  name: "activity",
  initialState,
  reducers: {
    setOwner: (_state, action: PayloadAction<{ uid: string | null; events: SaveActivity[] }>) => ({
      ...initialState,
      owner: action.payload.uid,
      events: action.payload.events,
    }),
    historyError: (state, action: PayloadAction<boolean>) => {
      state.historyError = action.payload;
      if (!action.payload) state.historyErrorCode = null;
    },
    historyFailed: (state, action: PayloadAction<string>) => {
      state.historyError = true;
      state.historyErrorCode = action.payload;
    },
    saveFailed: (state, action: PayloadAction<string>) => {
      state.status = "error";
      state.saveErrorCode = action.payload;
    },
    syncError: (state, action: PayloadAction<string | null>) => {
      state.syncErrorCode = action.payload;
    },
    hydrateEvents: (state, action: PayloadAction<SaveActivity[]>) => {
      state.events = [
        ...action.payload,
        ...state.events.filter((event) => !action.payload.some((saved) => saved.id === event.id)),
      ]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 20);
    },
    setStatus: (state, action: PayloadAction<ActivityState["status"]>) => {
      state.status = action.payload;
      if (action.payload !== "error") state.saveErrorCode = null;
    },
    record: (state, action: PayloadAction<SaveActivity>) => {
      const event = action.payload;
      const latest = state.events[0];
      if (
        latest?.type === event.type &&
        !event.changes &&
        event.timestamp - latest.timestamp < 20000
      ) {
        latest.timestamp = event.timestamp;
        latest.pageIds = [...new Set([...latest.pageIds, ...event.pageIds])];
        latest.read = false;
        if (event.errorCode) latest.errorCode = event.errorCode;
      } else state.events.unshift(event);
      state.events = state.events.slice(0, 20);
      if (
        event.type === "error" ||
        !state.toastStartedAt ||
        event.timestamp - state.toastStartedAt >= 60000
      ) {
        state.toastId = state.events[0]?.id ?? null;
        state.toastStartedAt = event.timestamp;
      }
    },
    markRead: (state) => {
      state.events.forEach((event) => {
        event.read = true;
      });
    },
    dismissToast: (state) => {
      state.toastId = null;
    },
    retrySave: (state) => {
      state.retry++;
    },
  },
});
export const activityActions = slice.actions;
export default slice.reducer;
