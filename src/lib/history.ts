import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef } from 'react';

import {
  createHistoryStore,
  HISTORY_LIMIT,
  HISTORY_STORAGE_KEY,
} from './historyStore';
import type { HistoryEntry } from './historyStore';

export {
  createHistoryId,
  HISTORY_LIMIT,
  HISTORY_STORAGE_KEY,
} from './historyStore';
export type {
  HistoryEntry,
  HistoryKind,
  HistoryParams,
  HistoryStorage,
} from './historyStore';

const store = createHistoryStore(AsyncStorage);
const listeners = new Set<(entries: HistoryEntry[]) => void>();

/** 首页在导航切换完成前也能接收刚落盘的计算结果。 */
export function subscribeHistory(listener: (entries: HistoryEntry[]) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** 读取历史记录（最新在前）。 */
export function loadHistory(): Promise<HistoryEntry[]> {
  return store.load();
}

/** 写入一条历史记录，返回更新后的列表。 */
export async function saveHistory(entry: HistoryEntry): Promise<HistoryEntry[]> {
  const entries = await store.add(entry);
  for (const listener of listeners) listener(entries);
  try {
    (require('./growth') as typeof import('./growth')).trackGrowthEvent('history_saved', {
      bend_type: entry.kind,
      unit_system: entry.params.unit === 'metric' ? 'metric' : 'imperial',
    });
  } catch { /* best-effort */ }
  return entries;
}

/** 清空全部历史记录。 */
export async function clearHistory(): Promise<void> {
  await store.clear();
  for (const listener of listeners) listener([]);
}

/** 将时间戳格式化为 `MM-DD HH:mm`。 */
export function formatHistoryTime(timestamp: number): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * 计算结果出现后延迟写入历史，避免实时计算过程中频繁落盘。
 * 相同 signature 只写一次。
 */
export function useHistoryAutoSave(entry: HistoryEntry | null, delayMs = 800, active = true): void {
  const lastSaved = useRef<string | null>(null);
  const pending = useRef<HistoryEntry | null>(null);
  const flush = useCallback(() => {
    const next = pending.current;
    if (!next || lastSaved.current === next.signature) return;
    pending.current = null;
    lastSaved.current = next.signature;
    void saveHistory(next).catch(() => {
      if (lastSaved.current === next.signature) lastSaved.current = null;
    });
  }, []);

  useEffect(() => {
    if (!active) {
      flush();
      return;
    }
    pending.current = entry;
    if (!entry || lastSaved.current === entry.signature) return;
    const timer = setTimeout(flush, delayMs);
    return () => clearTimeout(timer);
  }, [entry, delayMs, flush, active]);

  // 返回首页时立即落盘，让“继续上次计算”包含刚完成的结果。
  useEffect(() => () => flush(), [flush]);
}
