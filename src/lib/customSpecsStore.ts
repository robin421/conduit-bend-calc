/**
 * Custom 弯管机规格仓库：用户自填 / 校准流程写入的规格。
 * 存储方式沿用历史记录的 AsyncStorage 模式（key 独立）。
 */

import type { BenderSpec } from '../constants.ts';
import type { HistoryStorage } from './historyStore.ts';

/** AsyncStorage 存储键。 */
export const CUSTOM_SPECS_STORAGE_KEY = 'bendcalc:customSpecs:v1';

/** Custom 规格最多保留条数。 */
export const CUSTOM_SPECS_LIMIT = 20;

function isBenderSpec(value: unknown): value is BenderSpec {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const spec = value as Record<string, unknown>;
  return (
    spec.brand === 'Custom' &&
    typeof spec.model === 'string' &&
    typeof spec.conduit === 'string' &&
    typeof spec.centerlineRadius === 'number' &&
    Number.isFinite(spec.centerlineRadius) &&
    spec.centerlineRadius > 0 &&
    typeof spec.takeUp === 'number' &&
    Number.isFinite(spec.takeUp) &&
    spec.takeUp > 0
  );
}

/** 解析存储字符串，非法/损坏数据返回空数组，不抛异常。 */
export function parseCustomSpecs(raw: string | null): BenderSpec[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isBenderSpec).slice(0, CUSTOM_SPECS_LIMIT);
  } catch {
    return [];
  }
}

export function serializeCustomSpecs(specs: readonly BenderSpec[]): string {
  return JSON.stringify(specs);
}

export interface CustomSpecsStore {
  load(): Promise<BenderSpec[]>;
  /** 新增或按 customName 覆盖，返回更新后的列表（最新在前）。 */
  upsert(spec: BenderSpec): Promise<BenderSpec[]>;
  clear(): Promise<void>;
}

export function createCustomSpecsStore(
  storage: HistoryStorage,
): CustomSpecsStore {
  async function load(): Promise<BenderSpec[]> {
    const raw = await storage.getItem(CUSTOM_SPECS_STORAGE_KEY);
    return parseCustomSpecs(raw);
  }

  return {
    load,
    async upsert(spec: BenderSpec): Promise<BenderSpec[]> {
      if (!isBenderSpec(spec)) {
        return load();
      }
      const current = await load();
      const name = spec.customName ?? spec.conduit;
      const rest = current.filter(
        (item) => (item.customName ?? item.conduit) !== name,
      );
      const next = [spec, ...rest].slice(0, CUSTOM_SPECS_LIMIT);
      await storage.setItem(CUSTOM_SPECS_STORAGE_KEY, serializeCustomSpecs(next));
      return next;
    },
    async clear(): Promise<void> {
      await storage.removeItem(CUSTOM_SPECS_STORAGE_KEY);
    },
  };
}
