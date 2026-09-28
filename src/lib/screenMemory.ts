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
 * 恢复写入守卫：记录异步恢复完成前用户是否已改动状态。
 * 若 setter 在恢复完成前被调用，迟到的恢复值不得覆盖当前状态
 * （例如从 History 回填输入，或用户在加载完成前手动输入）。
 */
export interface ScreenMemoryRestoreGuard {
  markModified(): void;
  isLoaded(): boolean;
  shouldApplyRestored(): boolean;
  markLoaded(): void;
  reset(): void;
}

export function createScreenMemoryRestoreGuard(): ScreenMemoryRestoreGuard {
  let loaded = false;
  let modified = false;
  return {
    markModified(): void {
      if (!loaded) {
        modified = true;
      }
    },
    isLoaded(): boolean {
      return loaded;
    },
    shouldApplyRestored(): boolean {
      return !modified;
    },
    markLoaded(): void {
      loaded = true;
    },
    reset(): void {
      loaded = false;
      modified = false;
    },
  };
}

/** 恢复完成时：未被本地修改则写入 restored，随后标记已加载。 */
export function settleRestoredMemory<T>(
  guard: ScreenMemoryRestoreGuard,
  restored: T,
  apply: (value: T) => void,
): void {
  if (guard.shouldApplyRestored()) {
    apply(restored);
  }
  guard.markLoaded();
}

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
  const guardRef = useRef<ScreenMemoryRestoreGuard | null>(null);
  if (guardRef.current === null) {
    guardRef.current = createScreenMemoryRestoreGuard();
  }

  useEffect(() => {
    const guard = guardRef.current as ScreenMemoryRestoreGuard;
    let cancelled = false;
    guard.reset();
    void store
      .load(key, initialRef.current)
      .then((restored) => {
        if (!cancelled) {
          settleRestoredMemory(guard, restored, setState);
        }
      })
      .catch(() => {
        if (!cancelled) {
          guard.markLoaded();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  useEffect(() => {
    if (!(guardRef.current as ScreenMemoryRestoreGuard).isLoaded()) {
      return;
    }
    void store.save(key, state).catch(() => undefined);
  }, [key, state]);

  const setMemory = useCallback<Dispatch<SetStateAction<T>>>(
    (action) => {
      (guardRef.current as ScreenMemoryRestoreGuard).markModified();
      setState(action);
    },
    [],
  );

  return [state, setMemory];
}
