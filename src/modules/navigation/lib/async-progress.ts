type Listener = () => void;

type ProgressOp = { id: number; label: string };

let nextOpId = 1;
const activeOps: ProgressOp[] = [];
let navigationActive = false;
const listeners = new Set<Listener>();
let cachedMessages: string[] = [];
let cachedMessagesKey = "";

function rebuildMessageCache() {
  const messages: string[] = [];
  if (navigationActive) messages.push("Opening page…");
  const seen = new Set<string>();
  for (const op of activeOps) {
    if (!seen.has(op.label)) {
      seen.add(op.label);
      messages.push(op.label);
    }
  }
  const key = messages.join("\0");
  if (key !== cachedMessagesKey) {
    cachedMessagesKey = key;
    cachedMessages = messages;
  }
}

function notify() {
  rebuildMessageCache();
  for (const listener of listeners) {
    listener();
  }
}

rebuildMessageCache();

export function subscribeGlobalProgress(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isGlobalProgressActive() {
  return activeOps.length > 0 || navigationActive;
}

/** Distinct user-facing messages for in-flight work (navigation + API). */
export function getGlobalProgressMessages(): readonly string[] {
  return cachedMessages;
}

/** Tracks in-flight admin API / async DB operations. Returns a token for `endAsyncProgress`. */
export function beginAsyncProgress(label?: string): number {
  const id = nextOpId++;
  activeOps.push({ id, label: label ?? "Syncing with database…" });
  notify();
  return id;
}

export function endAsyncProgress(token: number) {
  const idx = activeOps.findIndex((op) => op.id === token);
  if (idx >= 0) activeOps.splice(idx, 1);
  notify();
}

export async function withAsyncProgress<T>(
  fn: () => Promise<T>,
  label?: string,
): Promise<T> {
  const token = beginAsyncProgress(label);
  try {
    return await fn();
  } finally {
    endAsyncProgress(token);
  }
}

export function setNavigationProgressActive(active: boolean) {
  if (navigationActive === active) return;
  navigationActive = active;
  notify();
}
