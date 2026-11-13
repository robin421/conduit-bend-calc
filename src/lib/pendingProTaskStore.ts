import type { HistoryStorage } from './historyStore.ts';
import { parseProIntent, type ProIntent } from './proFlow.ts';

export const PENDING_PRO_TASK_KEY = '@cbc:pending-pro-intent-v1';
export interface PendingProTask { id: string; intent: ProIntent }

export function parsePendingProTask(raw: string | null): PendingProTask | null {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (value && typeof value.id === 'string' && value.id.length > 0 && value.id.length <= 128) {
      const intent = parseProIntent(JSON.stringify(value.intent));
      return intent ? { id: value.id, intent } : null;
    }
    const legacy = parseProIntent(raw);
    return legacy ? { id: 'legacy-pro-task', intent: legacy } : null;
  } catch { return null; }
}

export function createPendingProTaskStore(storage: HistoryStorage, createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`) {
  let cached: PendingProTask | null | undefined;
  let writes: Promise<void> = Promise.resolve();
  function serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = writes.then(operation);
    writes = result.then(() => undefined, () => undefined);
    return result;
  }
  async function read(): Promise<PendingProTask | null> {
    if (cached !== undefined) return cached;
    let parsed: PendingProTask | null = null;
    try { parsed = parsePendingProTask(await storage.getItem(PENDING_PRO_TASK_KEY)); } catch { /* no persisted task */ }
    if (cached === undefined) cached = parsed;
    return cached;
  }
  return {
    async load(): Promise<PendingProTask | null> { await writes; return read(); },
    begin(intent: ProIntent): { task: PendingProTask; persisted: Promise<void> } {
      const task = { id: createId(), intent };
      cached = task; // reserve ownership before any await
      const persisted = serialize(async () => {
        try { await storage.setItem(PENDING_PRO_TASK_KEY, JSON.stringify(task)); } catch { /* session resume still works */ }
      });
      return { task, persisted };
    },
    clearIfCurrent(id: string): Promise<boolean> {
      return serialize(async () => {
        const task = await read();
        if (task?.id !== id || cached?.id !== id) return false;
        cached = null;
        try { await storage.removeItem(PENDING_PRO_TASK_KEY); } catch { /* no impact on entitlement */ }
        return true;
      });
    },
  };
}
