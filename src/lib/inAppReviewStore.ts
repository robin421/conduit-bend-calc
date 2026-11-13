/**
 * Play / App Store in-app review eligibility (pure, node-testable).
 *
 * Play policy: no star pre-prompt, no rewards, no gating features behind a
 * rating. We only decide *when* to call the API. Callers must also skip when
 * the bend is marked impossible.
 */

export const REVIEW_STORAGE_KEY = 'bendcalc:inAppReview:v1';

/** Parent / ASO P0: after 3 successful free-core calculations. */
export const MIN_SUCCESSFUL_CALCS = 3;
/** Installed / first seen at least this many days. */
export const MIN_DAYS_SINCE_FIRST_SEEN = 3;
/** At most one request every 90 days. */
export const MIN_DAYS_BETWEEN_REQUESTS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface InAppReviewState {
  /** Epoch ms of first app open we know of. */
  firstSeenAt: number;
  /** Distinct successful calc signatures counted toward the gate. */
  successfulCalcCount: number;
  /** Epoch ms of the last StoreReview.requestReview call, if any. */
  lastRequestedAt: number | null;
}

export const DEFAULT_REVIEW_STATE: InAppReviewState = {
  firstSeenAt: 0,
  successfulCalcCount: 0,
  lastRequestedAt: null,
};

export function parseReviewState(raw: string | null, now = Date.now()): InAppReviewState {
  if (!raw) {
    return { ...DEFAULT_REVIEW_STATE, firstSeenAt: now };
  }
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...DEFAULT_REVIEW_STATE, firstSeenAt: now };
    const parsed = value as Partial<InAppReviewState>;
    return {
      firstSeenAt:
        typeof parsed.firstSeenAt === 'number' && Number.isFinite(parsed.firstSeenAt) && parsed.firstSeenAt > 0
          ? Math.min(parsed.firstSeenAt, now)
          : now,
      successfulCalcCount:
        typeof parsed.successfulCalcCount === 'number' && Number.isFinite(parsed.successfulCalcCount) && parsed.successfulCalcCount >= 0
          ? Math.floor(parsed.successfulCalcCount)
          : 0,
      lastRequestedAt:
        typeof parsed.lastRequestedAt === 'number' && Number.isFinite(parsed.lastRequestedAt) && parsed.lastRequestedAt > 0
          ? parsed.lastRequestedAt
          : null,
    };
  } catch {
    return { ...DEFAULT_REVIEW_STATE, firstSeenAt: now };
  }
}

export function serializeReviewState(state: InAppReviewState): string {
  return JSON.stringify(state);
}

function daysBetween(fromMs: number, toMs: number): number {
  return (toMs - fromMs) / DAY_MS;
}

/**
 * True when a successful, non-impossible calc may trigger a review request.
 * `coreSuccessJustRecorded` means the caller already counted this success.
 */
export function shouldRequestInAppReview(
  state: InAppReviewState,
  now = Date.now(),
): boolean {
  if (state.successfulCalcCount < MIN_SUCCESSFUL_CALCS) return false;
  if (!state.firstSeenAt || daysBetween(state.firstSeenAt, now) < MIN_DAYS_SINCE_FIRST_SEEN) {
    return false;
  }
  if (
    state.lastRequestedAt != null &&
    daysBetween(state.lastRequestedAt, now) < MIN_DAYS_BETWEEN_REQUESTS
  ) {
    return false;
  }
  return true;
}

/**
 * Records one successful calc signature. Same signature is not double-counted
 * within the returned `seenSignatures` set the caller keeps in memory for the
 * session; persistent count only increments when `isNew` is true.
 */
export function withSuccessfulCalc(
  state: InAppReviewState,
  isNewSignature: boolean,
): InAppReviewState {
  if (!isNewSignature) return state;
  return {
    ...state,
    successfulCalcCount: state.successfulCalcCount + 1,
  };
}

export function withReviewRequested(state: InAppReviewState, now = Date.now()): InAppReviewState {
  return { ...state, lastRequestedAt: now };
}

/** Free-core calculators must stay ungated — regression helper for tests. */
export const FREE_CORE_CALC_KEYS = [
  'Offset',
  'Stub',
  'ThreePointSaddle',
  'FourPointSaddle',
  'RollingOffset',
  'Kicked90',
] as const;
