import type { HistoryStorage } from './historyStore.ts';
import {
  parseReviewState, REVIEW_STORAGE_KEY, serializeReviewState, shouldRequestInAppReview,
  withReviewRequested, withSuccessfulCalc, type InAppReviewState,
} from './inAppReviewStore.ts';
import type { GrowthEvent, GrowthEventParams } from './growthEvents.ts';

export type ReviewRequestResult = 'ineligible' | 'blocked' | 'unavailable' | 'attempted' | 'failed';
export interface ReviewGateway {
  isAvailable(): Promise<boolean>;
  request(): Promise<void>;
}

/** 展示单位不是新的计算，物理输入和弯管器仍参与去重。 */
export function reviewSignature(signature: string): string {
  return signature.replace(/\|(fractional|decimal|metric)$/, '');
}

export function createReviewCoordinator(
  storage: HistoryStorage,
  gateway: ReviewGateway,
  options: { now?: () => number; onEvent?: (name: GrowthEvent, params: GrowthEventParams) => void } = {},
) {
  const now = options.now ?? Date.now;
  let state: InAppReviewState | null = null;
  let queue: Promise<void> = Promise.resolve();
  let attemptedThisSession = false;
  let newCalculation = false;
  const seen = new Set<string>();

  function serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation);
    queue = result.then(() => undefined, () => undefined);
    return result;
  }
  function emit(name: GrowthEvent, params: GrowthEventParams): void {
    try { options.onEvent?.(name, params); } catch { /* no effect on the user task */ }
  }
  async function persist(): Promise<void> {
    try { await storage.setItem(REVIEW_STORAGE_KEY, serializeReviewState(state!)); } catch { /* best effort */ }
  }
  async function load(): Promise<InAppReviewState> {
    if (!state) {
      let raw: string | null = null;
      try { raw = await storage.getItem(REVIEW_STORAGE_KEY); } catch { /* use first-open timestamp */ }
      state = parseReviewState(raw, now());
      await persist();
    }
    return state;
  }
  return {
    initialize: () => serialize(load),
    noteCalculation(signature: string, status?: string | null): Promise<boolean> {
      return serialize(async () => {
        if (!signature || status === 'impossible') return false;
        const key = reviewSignature(signature);
        if (seen.has(key)) return false;
        await load();
        seen.add(key);
        state = withSuccessfulCalc(state!, true);
        newCalculation = true;
        await persist();
        return true;
      });
    },
    requestWhenIdle(isIdle: () => boolean): Promise<ReviewRequestResult> {
      return serialize(async () => {
        const current = await load();
        if (attemptedThisSession || !newCalculation || !shouldRequestInAppReview(current, now())) return 'ineligible';
        if (!isIdle()) return 'blocked';
        try {
          const available = await gateway.isAvailable();
          if (!isIdle()) return 'blocked';
          if (!available) { attemptedThisSession = true; emit('review_request_result', { outcome: 'unavailable' }); return 'unavailable'; }
          const previous = current;
          state = withReviewRequested(current, now());
          await persist();
          if (!isIdle()) { state = previous; await persist(); return 'blocked'; }
          attemptedThisSession = true;
          newCalculation = false;
          emit('review_request_attempted', { source: 'calculator_home' });
          await gateway.request();
          emit('review_request_result', { outcome: 'request_returned' });
          return 'attempted'; // The API does not report whether the card was shown.
        } catch {
          attemptedThisSession = true;
          emit('review_request_result', { outcome: 'failed' });
          return 'failed';
        }
      });
    },
  };
}
