export function retrySubscription<T>(
  subscribe: (success: (value: T) => void, failure: (error: { code: string }) => void) => () => void,
  onValue: (value: T) => void,
  onError: (error: { code: string }) => void,
): () => void;
