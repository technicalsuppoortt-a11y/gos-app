import { callBackend } from './firebase';
export const getFunctions = () => ({});
export const httpsCallable = (_functions: unknown, name: string) => async (data: unknown) => ({ data: await callBackend(name, data) });
