import type { EmtTakeUpSize, OffsetAngle } from '../constants.ts';

/** 历史记录最多保留条数（PRD FR7 / 边界情况）。 */
export const HISTORY_LIMIT = 20;

/** AsyncStorage 存储键。 */
export const HISTORY_STORAGE_KEY = 'bendcalc:history:v1';

export type HistoryKind =
  | 'offset'
  | 'stub'
  | 'threePointSaddle'
  | 'fourPointSaddle';

/** 回填到计算器的原始输入参数。 */
export interface HistoryParams {
  heightText?: string;
  widthText?: string;
  takeUpText?: string;
  selectedSize?: EmtTakeUpSize | null;
  angle?: OffsetAngle;
}

export interface HistoryEntry {
  /** 唯一 ID（时间戳 + 随机串）。 */
  id: string;
  kind: HistoryKind;
  /** 计算类型显示名，如 "Offset Bend"。 */
  title: string;
  /** 关键输入摘要。 */
  inputSummary: string;
  /** 结果摘要。 */
  resultSummary: string;
  /** 计算时间（毫秒时间戳）。 */
  timestamp: number;
  /** 点击回填所需参数。 */
  params: HistoryParams;
  /** 去重标识：相同计算参数视为同一条。 */
  signature: string;
}

/** 最小存储接口，便于在测试中注入内存实现。 */
export interface HistoryStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export function createHistoryId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 只保留最新的前 limit 条。 */
export function capHistory(
  entries: readonly HistoryEntry[],
  limit: number = HISTORY_LIMIT,
): HistoryEntry[] {
  if (limit <= 0) {
    return [];
  }
  return entries.slice(0, limit);
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === 'string' &&
    typeof entry.kind === 'string' &&
    typeof entry.title === 'string' &&
    typeof entry.inputSummary === 'string' &&
    typeof entry.resultSummary === 'string' &&
    typeof entry.timestamp === 'number' &&
    typeof entry.signature === 'string' &&
    typeof entry.params === 'object' &&
    entry.params !== null
  );
}

/** 解析存储字符串，非法/损坏数据返回空数组，不抛异常。 */
export function parseHistory(raw: string | null): HistoryEntry[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return capHistory(parsed.filter(isHistoryEntry));
  } catch {
    return [];
  }
}

export function serializeHistory(entries: readonly HistoryEntry[]): string {
  return JSON.stringify(entries);
}

export interface HistoryStore {
  load(): Promise<HistoryEntry[]>;
  add(entry: HistoryEntry): Promise<HistoryEntry[]>;
  clear(): Promise<void>;
}

/**
 * 基于注入存储的历史记录仓库。
 * add 会把新记录放到最前，超过 HISTORY_LIMIT 自动挤掉最旧一条；
 * 与当前最新一条 signature 相同的记录视为重复，不重复写入。
 */
export function createHistoryStore(storage: HistoryStorage): HistoryStore {
  async function load(): Promise<HistoryEntry[]> {
    const raw = await storage.getItem(HISTORY_STORAGE_KEY);
    return parseHistory(raw);
  }

  return {
    load,
    async add(entry: HistoryEntry): Promise<HistoryEntry[]> {
      const current = await load();
      if (current[0]?.signature === entry.signature) {
        return current;
      }
      const next = capHistory([entry, ...current]);
      await storage.setItem(HISTORY_STORAGE_KEY, serializeHistory(next));
      return next;
    },
    async clear(): Promise<void> {
      await storage.removeItem(HISTORY_STORAGE_KEY);
    },
  };
}
