import assert from 'node:assert/strict';
import { test } from 'node:test';

import { dispatchAnalyticsEvent, trackEvent } from './analytics.ts';

test('dispatchAnalyticsEvent: 非 Web 直接 no-op', () => {
  let called = 0;
  const target = {
    gtag: () => {
      called += 1;
    },
  };
  assert.equal(
    dispatchAnalyticsEvent(false, target, 'calculator_open', {
      calculator: 'offset',
    }),
    false,
  );
  assert.equal(called, 0);
});

test('dispatchAnalyticsEvent: Web 且 gtag 可用时发送', () => {
  const calls: unknown[][] = [];
  const target = {
    gtag: (...args: unknown[]) => {
      calls.push(args);
    },
  };
  assert.equal(
    dispatchAnalyticsEvent(true, target, 'calculator_open', {
      calculator: 'offset',
    }),
    true,
  );
  assert.deepEqual(calls, [
    ['event', 'calculator_open', { calculator: 'offset' }],
  ]);
});

test('dispatchAnalyticsEvent: params 缺省时传空对象', () => {
  const calls: unknown[][] = [];
  const target = {
    gtag: (...args: unknown[]) => {
      calls.push(args);
    },
  };
  assert.equal(dispatchAnalyticsEvent(true, target, 'unit_changed'), true);
  assert.deepEqual(calls, [['event', 'unit_changed', {}]]);
});

test('dispatchAnalyticsEvent: target 缺失或 gtag 不可调用时 no-op', () => {
  assert.equal(dispatchAnalyticsEvent(true, undefined, 'x'), false);
  assert.equal(dispatchAnalyticsEvent(true, null, 'x'), false);
  assert.equal(dispatchAnalyticsEvent(true, {}, 'x'), false);
  assert.equal(
    dispatchAnalyticsEvent(true, { gtag: 'not-a-function' }, 'x'),
    false,
  );
});

test('dispatchAnalyticsEvent: gtag 抛异常时吞掉并返回 false', () => {
  const target = {
    gtag: () => {
      throw new Error('boom');
    },
  };
  assert.equal(dispatchAnalyticsEvent(true, target, 'x'), false);
});

test('trackEvent: Node 环境（无 window）静默 no-op 不抛异常', () => {
  assert.doesNotThrow(() => {
    trackEvent('google_play_click', { source: 'banner' });
  });
});
