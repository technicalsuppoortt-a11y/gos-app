import { combineReducers, configureStore } from "@reduxjs/toolkit";
import brand from "./brandSlice";
import activity from "./activitySlice";
const createStore = () => configureStore({
  reducer: { brand, activity },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Undo/redo snapshots come from the already checked current document.
        // Avoid traversing every historical copy on each editor action; incoming
        // action payloads and the current builderBlocks remain checked.
        ignoredPaths: ["brand.builderPast", "brand.builderFuture"],
      },
    }),
});
// Services and the React Provider must retain the same account-scoped store
// when Vite reloads this module after an editor change.
export const store: ReturnType<typeof createStore> = import.meta.hot?.data.brandStore ?? createStore();
if (import.meta.hot) {
  import.meta.hot.data.brandStore = store;
  store.replaceReducer(combineReducers({ brand, activity }));
}
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
