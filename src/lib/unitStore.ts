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

/** 美制默认地区码（仅在用户从未保存单位偏好时生效）。 */
const IMPERIAL_REGIONS = new Set(['US', 'LR', 'MM']);

/**
 * 根据系统 locale 推断首次使用的默认单位系统：
 * - 无明确地区码（如 `'en'` / `'es'` / `null`）或美制地区（`US`, `LR`, `MM`）→ `'fractional'`；
 * - 其他明确公制地区（如 `MX`, `ES`, `CO`, `AR`, `CL`, `PE`, `419`, `GB`, `CA`, `AU`, `DE`, `FR`, `CN`, `JP` 等）→ `'metric'`。
 */
export function defaultUnitForLocale(locale?: string | null): UnitSystem {
  if (!locale) {
    return 'fractional';
  }
  const parts = locale.trim().split(/[-_]/).filter((part) => part.length > 0);
  if (parts.length < 2) {
    return 'fractional';
  }
  // 跳过第 0 段语言码，查找 BCP 47 地区码（2 位字母或 3 位 UN M.49 数字，忽略 4 位文字脚本如 Hans/Latn）。
  for (let i = 1; i < parts.length; i += 1) {
    const subtag = parts[i];
    if (/^[a-zA-Z]{2}$/.test(subtag) || /^[0-9]{3}$/.test(subtag)) {
      const region = subtag.toUpperCase();
      return IMPERIAL_REGIONS.has(region) ? 'fractional' : 'metric';
    }
  }
  return 'fractional';
}

function resolveRuntimeLocale(): string | null {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return typeof locale === 'string' && locale.trim().length > 0 ? locale : null;
  } catch {
    return null;
  }
}

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

function syncAmplitudeUnitSystem(unit: UnitSystem): void {
  try {
    const mod = require('./amplitude') as {
      setAmplitudeUserProperties?: (props: { unit_system: UnitSystem }) => void;
    };
    mod.setAmplitudeUserProperties?.({ unit_system: unit });
  } catch {
    /* best-effort in non-RN / test environments */
  }
}

function notify(unit: UnitSystem): void {
  for (const listener of listeners) {
    listener(unit);
  }
}

async function ensureLoaded(): Promise<UnitSystem> {
  if (cachedUnit) {
    return cachedUnit;
  }
  let loaded: UnitSystem = defaultUnitForLocale(resolveRuntimeLocale());
  try {
    const raw = await storage.getItem(UNIT_SYSTEM_STORAGE_KEY);
    loaded = raw === null ? defaultUnitForLocale(resolveRuntimeLocale()) : parseUnitSystem(raw);
  } catch {
    loaded = defaultUnitForLocale(resolveRuntimeLocale());
  }
  if (!cachedUnit) {
    cachedUnit = loaded;
  }
  syncAmplitudeUnitSystem(cachedUnit);
  return cachedUnit;
}

/** 读取当前单位系统（缓存优先）。 */
export function loadUnitSystem(): Promise<UnitSystem> {
  return ensureLoaded();
}

/** 立即写入缓存并持久化。 */
export function saveUnitSystem(unit: UnitSystem): void {
  cachedUnit = unit;
  syncAmplitudeUnitSystem(unit);
  notify(unit);
  void storage.setItem(UNIT_SYSTEM_STORAGE_KEY, serializeUnitSystem(unit)).catch(() => undefined);
}

/** 全局单位系统 hook。 */
export function useUnitSystem(): {
  unit: UnitSystem;
  setUnit: (unit: UnitSystem) => void;
  loaded: boolean;
} {
  const [unit, setUnitState] = useState<UnitSystem>(
    () => cachedUnit ?? defaultUnitForLocale(resolveRuntimeLocale()),
  );
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
