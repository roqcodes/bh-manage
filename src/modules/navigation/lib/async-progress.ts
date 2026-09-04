type Listener = () => void;

let inFlightCount = 0;
let navigationActive = false;
const listeners = new Set<Listener>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeGlobalProgress(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isGlobalProgressActive() {
  return inFlightCount > 0 || navigationActive;
}

/** Tracks in-flight admin API / async DB operations. */
export function beginAsyncProgress() {
  inFlightCount += 1;
  notify();
}

export function endAsyncProgress() {
  inFlightCount = Math.max(0, inFlightCount - 1);
  notify();
}

export async function withAsyncProgress<T>(fn: () => Promise<T>): Promise<T> {
  beginAsyncProgress();
  try {
    return await fn();
  } finally {
    endAsyncProgress();
  }
}

export function setNavigationProgressActive(active: boolean) {
  if (navigationActive === active) return;
  navigationActive = active;
  notify();
}
