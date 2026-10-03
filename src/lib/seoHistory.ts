/**
 * SEO 工具页「最近计算」历史（纯逻辑，可被 node --test 直接 import）。
 *
 * 设计要点（T62 需求：最近 5 次计算，一点回填）：
 * - 每个工具页独立存储键（`bendcalc:seo-history:<kind>:v1`），互不污染；
 * - 只保留最新 5 条，超出自动挤掉最旧一条；
 * - 相同 signature 视为重复，不重复写入；
 * - 损坏 / 非法数据回退空数组，绝不抛异常；
 * - 存储经注入接口，测试用内存实现，生产在 useSeoHistory.ts 注入 AsyncStorage
 *   （Web 端即 localStorage，工地上断网也能读上次算过的数）。
 */

import type { EmtTakeUpSize, OffsetAngle } from '../constants.ts';
import type { UnitSystem } from './units.ts';

/** 每个 SEO 工具页保留的历史条数。 */
export const SEO_HISTORY_LIMIT = 5;

export type SeoHistoryKind = 'offset' | 'saddle4' | 'shrink' | 'stubUp';

export type ShrinkMode = 'offset' | 'saddle';

/** 回填到计算器所需的原始输入参数。 */
export interface SeoHistoryParams {
  heightText?: string;
  widthText?: string;
  startText?: string;
  angle?: OffsetAngle;
  size?: EmtTakeUpSize;
  mode?: ShrinkMode;
  unit?: UnitSystem;
  /** 可选输入区（如 offset 的起点）在记录时是否展开，回填时一并恢复。 */
  startTextOpen?: boolean;
}

export interface SeoHistoryEntry {
  id: string;
  kind: SeoHistoryKind;
  /** 输入摘要，如 `6" @ 30°`。 */
  inputSummary: string;
  /** 结果摘要，如 `spacing 12", shrink 1.5"`。 */
  summary: string;
  params: SeoHistoryParams;
  /** 毫秒时间戳。 */
  timestamp: number;
  /** 去重标识：相同计算参数视为同一条。 */
  signature: string;
}

/** 最小存储接口，便于在测试中注入内存实现。 */
export interface SeoHistoryStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export function seoHistoryStorageKey(kind: SeoHistoryKind): string {
  return `bendcalc:seo-history:${kind}:v1`;
}

export function createSeoHistoryId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 构造一条历史记录（id / timestamp 由本函数生成，调用方只给业务字段）。 */
export function createSeoHistoryEntry(input: {
  kind: SeoHistoryKind;
  inputSummary: string;
  summary: string;
  params: SeoHistoryParams;
  signature: string;
}): SeoHistoryEntry {
  return {
    id: createSeoHistoryId(),
    kind: input.kind,
    inputSummary: input.inputSummary,
    summary: input.summary,
    params: input.params,
    timestamp: Date.now(),
    signature: input.signature,
  };
}

/** 只保留最新的前 limit 条。 */
export function capSeoHistory(
  entries: readonly SeoHistoryEntry[],
  limit: number = SEO_HISTORY_LIMIT,
): SeoHistoryEntry[] {
  if (limit <= 0) {
    return [];
  }
  return entries.slice(0, limit);
}

function isSeoHistoryEntry(value: unknown): value is SeoHistoryEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === 'string' &&
    typeof entry.kind === 'string' &&
    typeof entry.inputSummary === 'string' &&
    typeof entry.summary === 'string' &&
    typeof entry.timestamp === 'number' &&
    typeof entry.signature === 'string' &&
    typeof entry.params === 'object' &&
    entry.params !== null
  );
}

/** 解析存储字符串，非法 / 损坏数据返回空数组，不抛异常。 */
export function parseSeoHistory(raw: string | null): SeoHistoryEntry[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return capSeoHistory(parsed.filter(isSeoHistoryEntry));
  } catch {
    return [];
  }
}

export function serializeSeoHistory(entries: readonly SeoHistoryEntry[]): string {
  return JSON.stringify(entries);
}

export interface SeoHistoryStore {
  load(): Promise<SeoHistoryEntry[]>;
  add(entry: SeoHistoryEntry): Promise<SeoHistoryEntry[]>;
  clear(): Promise<void>;
}

/**
 * 基于注入存储的历史仓库。
 * add 把新记录放到最前，超过 SEO_HISTORY_LIMIT 自动挤掉最旧一条；
 * 与当前最新一条 signature 相同的记录视为重复，不重复写入。
 */
export function createSeoHistoryStore(
  storage: SeoHistoryStorage,
  kind: SeoHistoryKind,
): SeoHistoryStore {
  const key = seoHistoryStorageKey(kind);

  async function load(): Promise<SeoHistoryEntry[]> {
    return parseSeoHistory(await storage.getItem(key));
  }

  return {
    load,
    async add(entry: SeoHistoryEntry): Promise<SeoHistoryEntry[]> {
      const current = await load();
      if (current[0]?.signature === entry.signature) {
        return current;
      }
      const next = capSeoHistory([entry, ...current]);
      await storage.setItem(key, serializeSeoHistory(next));
      return next;
    },
    async clear(): Promise<void> {
      await storage.removeItem(key);
    },
  };
}
