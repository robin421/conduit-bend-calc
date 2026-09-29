/**
 * 单位系统仓库：全局单例，AsyncStorage + 进程内缓存 + listeners。
 * 默认 fractional（美国工地口径：分数英寸）。
 * 迁移：老版本存的 'imperial' 映射为 'fractional'；非法/损坏/未知值回退 'fractional'。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import type { HistoryStorage } from './historyStore.ts';
import type { UnitSystem } from './units.ts';

/** AsyncStorage 存储键。 */
export const UNIT_SYSTEM_STORAGE_KEY = 'bendcalc:unit-system:v1';

/** 解析存储字符串：'imperial'（老版本）→ 'fractional'；非法/损坏/未知值回退 'fractional'，不抛异常。 */
export function parseUnitSystem(raw: string | null): UnitSystem {
  if (raw === 'metric') {
    return 'metric';
  }
  if (raw === 'decimal') {
    return 'decimal';
  }
  // 'fractional' 与老版本 'imperial' 都映射为 fractional；其余回退 fractional。
  return 'fractional';
}

export function serializeUnitSystem(unit: UnitSystem): string {
  return unit;
}

const storage: HistoryStorage = AsyncStorage;

let cachedUnit: UnitSystem | null = null;
const listeners = new Set<(unit: UnitSystem) => void>();

function notify(unit: UnitSystem): void {
  for (const listener of listeners) {
    listener(unit);
  }
}

async function ensureLoaded(): Promise<UnitSystem> {
  if (cachedUnit) {
    return cachedUnit;
  }
  let loaded: UnitSystem = 'fractional';
  try {
    const raw = await storage.getItem(UNIT_SYSTEM_STORAGE_KEY);
    loaded = parseUnitSystem(raw);
  } catch {
    loaded = 'fractional';
  }
  if (!cachedUnit) {
    cachedUnit = loaded;
  }
  return cachedUnit;
}

/** 读取当前单位系统（缓存优先）。 */
export function loadUnitSystem(): Promise<UnitSystem> {
  return ensureLoaded();
}

/** 立即写入缓存并持久化。 */
export function saveUnitSystem(unit: UnitSystem): void {
  cachedUnit = unit;
  notify(unit);
  void storage.setItem(UNIT_SYSTEM_STORAGE_KEY, serializeUnitSystem(unit)).catch(() => undefined);
}

/** 全局单位系统 hook。 */
export function useUnitSystem(): {
  unit: UnitSystem;
  setUnit: (unit: UnitSystem) => void;
  loaded: boolean;
} {
  const [unit, setUnitState] = useState<UnitSystem>(() => cachedUnit ?? 'fractional');
  const [loaded, setLoaded] = useState(cachedUnit !== null);

  useEffect(() => {
    let cancelled = false;
    const listener = (next: UnitSystem) => {
      if (!cancelled) {
        setUnitState(next);
      }
    };
    listeners.add(listener);
    void ensureLoaded()
      .then((value) => {
        if (!cancelled) {
          setUnitState(value);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
      listeners.delete(listener);
    };
  }, []);

  const setUnit = useCallback((next: UnitSystem) => {
    saveUnitSystem(next);
  }, []);

  return { unit, setUnit, loaded };
}
