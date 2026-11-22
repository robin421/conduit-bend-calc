import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PRO_SKU } from './iap.ts';
import {
  buildPaywallBuyTapParams,
  buildPaywallDismissParams,
  buildPaywallRetryTapParams,
  buildPaywallSkuLoadedParams,
  buildPaywallViewedExtra,
  isPaywallSkuPending,
  shouldEmitPaywallDismiss,
  shouldEmitPaywallSkuLoaded,
} from './paywallTelemetry.ts';

test('shouldEmitPaywallDismiss：未解锁时仅允许上报一次，已解锁不上报', () => {
  assert.equal(shouldEmitPaywallDismiss({ alreadyDismissed: false, access: 'locked' }), true);
  assert.equal(shouldEmitPaywallDismiss({ alreadyDismissed: true, access: 'locked' }), false);
  assert.equal(shouldEmitPaywallDismiss({ alreadyDismissed: false, access: 'unlocked' }), false);
});

test('shouldEmitPaywallSkuLoaded：从 loading/unknown 变为 available/unavailable 时触发一次', () => {
  assert.equal(
    isPaywallSkuPending({
      initialized: false,
      phase: 'loading',
      skuAvailability: 'unknown',
      productPrice: null,
    }),
    true,
  );
  assert.equal(
    shouldEmitPaywallSkuLoaded({
      alreadyReported: false,
      sawPendingOrUnknown: true,
      snapshot: {
        initialized: true,
        phase: 'idle',
        skuAvailability: 'available',
        productPrice: '$4.99',
      },
    }),
    true,
  );
  assert.equal(
    shouldEmitPaywallSkuLoaded({
      alreadyReported: false,
      sawPendingOrUnknown: true,
      snapshot: {
        initialized: true,
        phase: 'idle',
        skuAvailability: 'unavailable',
        productPrice: null,
      },
    }),
    true,
  );
  // 已经上报过不再重复触发
  assert.equal(
    shouldEmitPaywallSkuLoaded({
      alreadyReported: true,
      sawPendingOrUnknown: true,
      snapshot: {
        initialized: true,
        phase: 'idle',
        skuAvailability: 'available',
        productPrice: '$4.99',
      },
    }),
    false,
  );
  // 挂载时已就绪（从未经历 loading/unknown）不重复补发
  assert.equal(
    shouldEmitPaywallSkuLoaded({
      alreadyReported: false,
      sawPendingOrUnknown: false,
      snapshot: {
        initialized: true,
        phase: 'idle',
        skuAvailability: 'available',
        productPrice: '$4.99',
      },
    }),
    false,
  );
  // 仍在加载或状态未知时不触发
  assert.equal(
    shouldEmitPaywallSkuLoaded({
      alreadyReported: false,
      sawPendingOrUnknown: true,
      snapshot: {
        initialized: true,
        phase: 'loading',
        skuAvailability: 'available',
        productPrice: '$4.99',
      },
    }),
    false,
  );
});

test('Paywall 事件参数构造：包含完整诊断字段与 product_id', () => {
  assert.deepEqual(
    buildPaywallViewedExtra({
      scene: 'calibration',
      skuAvailability: 'available',
      productPrice: '$4.99',
    }),
    { scene: 'calibration', sku_status: 'available', price_loaded: true },
  );

  assert.deepEqual(
    buildPaywallSkuLoadedParams({
      source: 'calibration',
      scene: 'calibration',
      skuAvailability: 'unavailable',
      productPrice: null,
    }),
    {
      source: 'calibration',
      scene: 'calibration',
      sku_status: 'unavailable',
      price_loaded: false,
    },
  );

  assert.deepEqual(
    buildPaywallDismissParams({
      source: 'calibration',
      scene: 'calibration',
      skuAvailability: 'available',
      dismissMethod: 'back',
    }),
    {
      source: 'calibration',
      scene: 'calibration',
      sku_status: 'available',
      dismiss_method: 'back',
    },
  );

  assert.deepEqual(
    buildPaywallBuyTapParams({
      source: 'calibration',
      scene: 'calibration',
      skuAvailability: 'available',
      productPrice: '$4.99',
    }),
    {
      source: 'calibration',
      scene: 'calibration',
      sku_status: 'available',
      price_loaded: true,
      product_id: PRO_SKU,
    },
  );

  assert.deepEqual(
    buildPaywallRetryTapParams({
      source: 'calibration',
      scene: 'calibration',
      skuAvailability: 'unknown',
    }),
    {
      source: 'calibration',
      scene: 'calibration',
      sku_status: 'unknown',
    },
  );
});

test('Paywall 事件参数构造：透传 has_personal_data 与 has_hidden_history 布尔维度', () => {
  assert.deepEqual(
    buildPaywallViewedExtra({
      scene: 'calibration',
      skuAvailability: 'available',
      productPrice: '$4.99',
      hasPersonalData: true,
      hasHiddenHistory: false,
    }),
    {
      scene: 'calibration',
      sku_status: 'available',
      price_loaded: true,
      has_personal_data: true,
      has_hidden_history: false,
    },
  );

  assert.deepEqual(
    buildPaywallBuyTapParams({
      source: 'offset_calibration',
      scene: 'calibration',
      skuAvailability: 'available',
      productPrice: '$4.99',
      hasPersonalData: true,
      hasHiddenHistory: true,
    }),
    {
      source: 'offset_calibration',
      scene: 'calibration',
      sku_status: 'available',
      price_loaded: true,
      product_id: PRO_SKU,
      has_personal_data: true,
      has_hidden_history: true,
    },
  );

  assert.deepEqual(
    buildPaywallDismissParams({
      source: 'history_limit',
      scene: 'history',
      skuAvailability: 'available',
      dismissMethod: 'button',
      hasPersonalData: false,
      hasHiddenHistory: true,
    }),
    {
      source: 'history_limit',
      scene: 'history',
      sku_status: 'available',
      dismiss_method: 'button',
      has_personal_data: false,
      has_hidden_history: true,
    },
  );
});
