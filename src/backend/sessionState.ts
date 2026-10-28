import { createContext, useContext } from 'react';
// Demo and isolated UI harnesses supply their own session; live startup provides readiness.
export const SessionReadyContext = createContext(true);
export const useSessionReady = () => useContext(SessionReadyContext);
