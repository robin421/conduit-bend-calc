export interface AppToastPayload {
  id: number;
  message: string;
  durationMs: number;
}

type ToastListener = (toast: AppToastPayload | null) => void;

const DEFAULT_TOAST_DURATION_MS = 2600;
const listeners = new Set<ToastListener>();
let nextId = 1;

export function showAppToast(message: string, durationMs = DEFAULT_TOAST_DURATION_MS): void {
  const trimmed = message.trim();
  if (!trimmed) return;
  const payload: AppToastPayload = {
    id: nextId++,
    message: trimmed,
    durationMs: durationMs > 0 ? durationMs : DEFAULT_TOAST_DURATION_MS,
  };
  for (const listener of listeners) {
    listener(payload);
  }
}

export function subscribeAppToast(listener: ToastListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
