/**
 * 每屏输入记忆：只保存原始文本输入与角度选择，重新进入时恢复。
 * 派生值（*Inches）不持久化，恢复后由各屏现有的文本解析逻辑重算。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import type { HistoryStorage } from './historyStore.ts';

/** AsyncStorage 存储键前缀。 */
export const SCREEN_MEMORY_KEY_PREFIX = '@cbc:screen:';

export function screenMemoryStorageKey(key: string): string {
  return `${SCREEN_MEMORY_KEY_PREFIX}${key}`;
}

/** 解析存储字符串：损坏数据或非对象回退 initial，合法对象与 initial 合并。 */
export function parseScreenMemory<T extends Record<string, unknown>>(
  raw: string | null,
  initial: T,
): T {
  if (!raw) {
    return initial;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return initial;
    }
    return { ...initial, ...(parsed as Partial<T>) };
  } catch {
    return initial;
  }
}

export function serializeScreenMemory<T extends Record<string, unknown>>(
  value: T,
): string {
  return JSON.stringify(value);
}

export interface ScreenMemoryStore {
  load<T extends Record<string, unknown>>(key: string, initial: T): Promise<T>;
  save<T extends Record<string, unknown>>(key: string, value: T): Promise<void>;
  clear(key: string): Promise<void>;
}

export function createScreenMemoryStore(
  storage: HistoryStorage,
): ScreenMemoryStore {
  return {
    async load<T extends Record<string, unknown>>(
      key: string,
      initial: T,
    ): Promise<T> {
      const raw = await storage.getItem(screenMemoryStorageKey(key));
      return parseScreenMemory(raw, initial);
    },
    async save<T extends Record<string, unknown>>(
      key: string,
      value: T,
    ): Promise<void> {
      await storage.setItem(
        screenMemoryStorageKey(key),
        serializeScreenMemory(value),
      );
    },
    async clear(key: string): Promise<void> {
      await storage.removeItem(screenMemoryStorageKey(key));
    },
  };
}

const store = createScreenMemoryStore(AsyncStorage);

/**
 * 屏幕输入记忆 hook：挂载时恢复，之后每次状态变化立即落盘。
 * 返回值与 useState 一致，便于直接替换原有 useState。
 */
export function useScreenMemory<T extends Record<string, unknown>>(
  key: string,
  initial: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(initial);
  const initialRef = useRef(initial);
  const loadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadedRef.current = false;
    void store
      .load(key, initialRef.current)
      .then((restored) => {
        if (!cancelled) {
          setState(restored);
          loadedRef.current = true;
        }
      })
      .catch(() => {
        if (!cancelled) {
          loadedRef.current = true;
        }
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  useEffect(() => {
    if (!loadedRef.current) {
      return;
    }
    void store.save(key, state).catch(() => undefined);
  }, [key, state]);

  return [state, setState];
}
