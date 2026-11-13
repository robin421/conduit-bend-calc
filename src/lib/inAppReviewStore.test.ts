import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveCustomCreateMode } from '../components/benderPickerGating.ts';
import {
  FREE_CORE_CALC_KEYS,
  MIN_DAYS_BETWEEN_REQUESTS,
  MIN_DAYS_SINCE_FIRST_SEEN,
  MIN_SUCCESSFUL_CALCS,
  parseReviewState,
  shouldRequestInAppReview,
  withReviewRequested,
  withSuccessfulCalc,
} from './inAppReviewStore.ts';

const DAY = 24 * 60 * 60 * 1000;

test('parseReviewState seeds firstSeenAt when empty', () => {
  const now = Date.UTC(2026, 10, 4);
  const state = parseReviewState(null, now);
  assert.equal(state.firstSeenAt, now);
  assert.equal(state.successfulCalcCount, 0);
  assert.equal(state.lastRequestedAt, null);
});

test('shouldRequestInAppReview needs 3 successes, 3 days, 90-day cool-down', () => {
  const now = Date.UTC(2026, 10, 4);
  const base = {
    firstSeenAt: now - MIN_DAYS_SINCE_FIRST_SEEN * DAY,
    successfulCalcCount: MIN_SUCCESSFUL_CALCS,
    lastRequestedAt: null,
  };
  assert.equal(shouldRequestInAppReview(base, now), true);
  assert.equal(
    shouldRequestInAppReview({ ...base, successfulCalcCount: MIN_SUCCESSFUL_CALCS - 1 }, now),
    false,
  );
  assert.equal(
    shouldRequestInAppReview(
      { ...base, firstSeenAt: now - (MIN_DAYS_SINCE_FIRST_SEEN - 1) * DAY },
      now,
    ),
    false,
  );
  assert.equal(
    shouldRequestInAppReview(
      { ...base, lastRequestedAt: now - (MIN_DAYS_BETWEEN_REQUESTS - 1) * DAY },
      now,
    ),
    false,
  );
  assert.equal(
    shouldRequestInAppReview(
      { ...base, lastRequestedAt: now - MIN_DAYS_BETWEEN_REQUESTS * DAY },
      now,
    ),
    true,
  );
});

test('withSuccessfulCalc only increments on new signatures', () => {
  const state = parseReviewState(null, 1);
  assert.equal(withSuccessfulCalc(state, false).successfulCalcCount, 0);
  assert.equal(withSuccessfulCalc(state, true).successfulCalcCount, 1);
  assert.equal(withReviewRequested(state, 99).lastRequestedAt, 99);
});

test('free-core calculators stay ungated; only custom create is Pro', () => {
  assert.deepEqual([...FREE_CORE_CALC_KEYS], [
    'Offset',
    'Stub',
    'ThreePointSaddle',
    'FourPointSaddle',
    'RollingOffset',
    'Kicked90',
  ]);
  assert.equal(resolveCustomCreateMode('locked', true), 'locked');
  assert.equal(resolveCustomCreateMode('unlocked', true), 'form');
});
