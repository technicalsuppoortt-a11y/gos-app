// Reconnect failed listeners without involving the user or repeating AI requests.
export function retrySubscription(subscribe, onValue, onError, clock = globalThis) {
  let active = true, stop, timer, delay = 1000, generation = 0;
  const connect = () => {
    if (!active) return;
    const current = ++generation;
    stop = subscribe(value => {
      if (!active || current !== generation) return;
      if (timer != null) { clock.clearTimeout(timer); timer = undefined; }
      delay = 1000;
      onValue(value);
    }, error => {
      if (!active || current !== generation) return;
      onError(error);
      if (timer != null) return;
      timer = clock.setTimeout(() => {
        timer = undefined;
        stop?.();
        connect();
      }, delay);
      timer?.unref?.();
      delay = Math.min(delay * 2, 30000);
    });
  };
  connect();
  return () => { active = false; if (timer != null) clock.clearTimeout(timer); stop?.(); };
}
