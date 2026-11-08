import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from 'react-redux';
import type { RootState } from '../store';
import { readWorkspaceView, workspaceSearch, workspaceViewFromState, workspaceViews } from '../data/workspaceNavigation';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { actions } from '../store/brandSlice';

/** Run after draft hydration. URLs restore views; workspace actions create history entries. */
export function useWorkspaceNavigation() {
  const { mode, activeStep } = useAppSelector(state => state.brand);
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const location = useLocation();
  const navigate = useNavigate();
  const lastSearch = useRef<string | null>(null);

  useLayoutEffect(() => {
    const requested = readWorkspaceView(location.search);
    // Layout effects can run twice in Strict Mode. Read the latest Redux state
    // so a second pass cannot replace a deep link with the pre-hydration view.
    const current = workspaceViewFromState(store.getState().brand);
    if (lastSearch.current !== location.search) {
      lastSearch.current = location.search;
      if (requested && requested !== current) {
        const target = workspaceViews[requested];
        dispatch(actions.setStep(target.step));
        dispatch(actions.setMode(target.mode));
        return;
      }
    }
    if (requested !== current) {
      void navigate({ pathname: location.pathname, search: workspaceSearch(location.search, current), hash: location.hash }, {
        replace: requested === null,
      });
    }
  }, [location.pathname, location.search, location.hash, mode, activeStep, dispatch, navigate, store]);
}
