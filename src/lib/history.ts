import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef } from 'react';

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

/** 读取历史记录（最新在前）。 */
export function loadHistory(): Promise<HistoryEntry[]> {
  return store.load();
}

/** 写入一条历史记录，返回更新后的列表。 */
export function saveHistory(entry: HistoryEntry): Promise<HistoryEntry[]> {
  return store.add(entry);
}

/** 清空全部历史记录。 */
export function clearHistory(): Promise<void> {
  return store.clear();
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
export function useHistoryAutoSave(entry: HistoryEntry | null, delayMs = 800): void {
  const lastSaved = useRef<string | null>(null);

  useEffect(() => {
    if (!entry || lastSaved.current === entry.signature) {
      return;
    }
    const timer = setTimeout(() => {
      lastSaved.current = entry.signature;
      void saveHistory(entry).catch(() => undefined);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [entry, delayMs]);
}
