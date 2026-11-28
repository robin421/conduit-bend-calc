/**
 * 首页「新手示例」卡（纯逻辑，可 node 单测）。
 *
 * Amplitude 2026-11（真实用户口径）：26 个未激活用户里 15 个停在 CalcHome 就离开；
 * 首会话完成 ≥3 次计算的用户 D1 留存 22.7%，其余 8.9%。卡片让首次打开的用户
 * 一键进入预填示例的 Offset，立刻看到结果，再改成自己的尺寸。
 */
import { parseReviewState, REVIEW_STORAGE_KEY } from './inAppReviewStore.ts';
import type { HistoryParams, HistoryStorage } from './historyStore.ts';
import type { UnitSystem } from './units.ts';

export const HOME_STARTER_STORAGE_KEY = 'bendcalc:homeStarter:v1';

/** 示例：越过 6"（公制 150 mm）障碍的 30° offset，最常见的现场场景。 */
export function homeStarterOffsetParams(unit: UnitSystem): HistoryParams {
  return { unit, heightText: unit === 'metric' ? '150' : '6', angle: 30 };
}

export function homeStarterHeightLabel(unit: UnitSystem): string {
  return unit === 'metric' ? '150 mm' : '6"';
}

export interface HomeStarterInput {
  hasRecentHistory: boolean;
  starterUsed: boolean;
  successfulCalcCount: number;
}

/** 只给真正的新用户看：没有历史、没点过示例、也没有完成过计算。 */
export function shouldShowHomeStarter(input: HomeStarterInput): boolean {
  return !input.hasRecentHistory && !input.starterUsed && input.successfulCalcCount <= 0;
}

type StarterStorage = Pick<HistoryStorage, 'getItem' | 'setItem'>;

export async function loadHomeStarterState(
  storage: StarterStorage,
): Promise<{ starterUsed: boolean; successfulCalcCount: number }> {
  try {
    const [used, review] = await Promise.all([
      storage.getItem(HOME_STARTER_STORAGE_KEY),
      storage.getItem(REVIEW_STORAGE_KEY),
    ]);
    return {
      starterUsed: used === '1',
      successfulCalcCount: parseReviewState(review).successfulCalcCount,
    };
  } catch {
    // 读失败时不打扰用户：当作已用过。
    return { starterUsed: true, successfulCalcCount: 0 };
  }
}

export async function markHomeStarterUsed(storage: StarterStorage): Promise<void> {
  try {
    await storage.setItem(HOME_STARTER_STORAGE_KEY, '1');
  } catch {
    /* ignore */
  }
}
