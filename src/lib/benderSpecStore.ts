/**
 * 全局弯管机规格仓库：所有计算器屏幕共用一个当前规格。
 * 存储方式沿用 customSpecsStore 的 AsyncStorage 模式（key 独立），
 * 并额外维护进程内缓存，使 setSpec 后各已挂载屏幕立即同步。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';

import { defaultBenderSpec } from '../calculators/geometry/benderSpecs.ts';
import type { BenderSpec } from '../constants.ts';
import type { HistoryStorage } from './historyStore.ts';
import {
  activeSpec,
  selectSpecByValue,
  useBenderProfiles,
} from './benderProfileStore.ts';

/** AsyncStorage 存储键。 */
export const BENDER_SPEC_STORAGE_KEY = '@cbc:bender-spec-v1';

/** 校验最小必要字段：brand / conduit 非空字符串，centerlineRadius 为正有限数。 */
export function isValidBenderSpec(value: unknown): value is BenderSpec {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const spec = value as Record<string, unknown>;
  return (
    typeof spec.brand === 'string' &&
    spec.brand.trim() !== '' &&
    typeof spec.conduit === 'string' &&
    spec.conduit.trim() !== '' &&
    typeof spec.centerlineRadius === 'number' &&
    Number.isFinite(spec.centerlineRadius) &&
    spec.centerlineRadius > 0
  );
}

/** 解析存储字符串，非法/损坏数据回退到 defaultBenderSpec()，不抛异常。 */
export function parseBenderSpec(raw: string | null): BenderSpec {
  if (!raw) {
    return defaultBenderSpec();
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return isValidBenderSpec(parsed) ? parsed : defaultBenderSpec();
  } catch {
    return defaultBenderSpec();
  }
}

export function serializeBenderSpec(spec: BenderSpec): string {
  return JSON.stringify(spec);
}

export interface BenderSpecStore {
  load(): Promise<BenderSpec>;
  save(spec: BenderSpec): Promise<void>;
}

export function createBenderSpecStore(storage: HistoryStorage): BenderSpecStore {
  return {
    async load(): Promise<BenderSpec> {
      const raw = await storage.getItem(BENDER_SPEC_STORAGE_KEY);
      return parseBenderSpec(raw);
    },
    async save(spec: BenderSpec): Promise<void> {
      await storage.setItem(BENDER_SPEC_STORAGE_KEY, serializeBenderSpec(spec));
    },
  };
}

const store = createBenderSpecStore(AsyncStorage);

/** 进程内缓存：多个屏幕共享同一份当前规格。 */
let cachedSpec: BenderSpec | null = null;
let cacheLoaded = false;
const listeners = new Set<(spec: BenderSpec) => void>();

function notify(spec: BenderSpec): void {
  for (const listener of listeners) {
    listener(spec);
  }
}

function publish(spec: BenderSpec): void {
  cachedSpec = spec;
  cacheLoaded = true;
  notify(spec);
}

async function ensureLoaded(): Promise<BenderSpec> {
  if (cachedSpec) {
    return cachedSpec;
  }
  const loaded = await store.load();
  if (!cachedSpec) {
    cachedSpec = loaded;
    cacheLoaded = true;
  }
  return cachedSpec;
}

/** 读取当前全局规格（缓存优先）。 */
export function loadBenderSpec(): Promise<BenderSpec> {
  return ensureLoaded();
}

/** 立即写入缓存并持久化。 */
export function saveBenderSpec(spec: BenderSpec): void {
  publish(spec);
  void store.save(spec).catch(() => undefined);
}

/**
 * 全局规格 hook（P0-2）：由 BenderProfile 仓库驱动。
 * 返回 activeProfile 映射出的 BenderSpec；setSpec 会匹配/新建档案并选中。
 */
export function useBenderSpec(): {
  spec: BenderSpec;
  setSpec: (spec: BenderSpec) => void;
  loaded: boolean;
} {
  const { activeProfile, ready } = useBenderProfiles();
  const spec = activeSpec(activeProfile);
  const setSpec = useCallback((next: BenderSpec) => {
    selectSpecByValue(next);
  }, []);
  return { spec, setSpec, loaded: ready };
}
