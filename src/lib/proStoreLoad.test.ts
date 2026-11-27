import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { HistoryStorage } from './historyStore.ts';
import {
  PRO_SKU,
  SKU_UNAVAILABLE_MESSAGE,
  type IapGateway,
  type IapPurchaseError,
  type IapPurchaseInfo,
} from './iap.ts';
import type { GrowthEvent, GrowthEventParams } from './growthEvents.ts';
import { createProStore } from './proStore.ts';
import { buildPaywallPriceStatusParams } from './paywallTelemetry.ts';

function memoryStorage(): HistoryStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => Promise.resolve(data.get(key) ?? null),
    setItem: (key, value) => { data.set(key, value); return Promise.resolve(); },
    removeItem: (key) => { data.delete(key); return Promise.resolve(); },
  };
}

type Step = 'ok' | 'throw' | 'hang';

class ScriptedGateway implements IapGateway {
  /** 每次 init 依次取一个行为；用完后取最后一个。 */
  initScript: Step[] = ['ok'];
  fetchScript: Step[] = ['ok'];
  product: { productId: string; localizedPrice: string } | null = { productId: PRO_SKU, localizedPrice: '$9.99' };
  initCalls = 0;
  fetchCalls = 0;
  endCalls = 0;
  errorCb: ((e: IapPurchaseError) => void) | null = null;
  requestThrows: unknown;

  private step(script: Step[], index: number): Step {
    return script[Math.min(index, script.length - 1)];
  }
  private run<T>(step: Step, value: () => T): Promise<T> {
    if (step === 'hang') return new Promise<T>(() => undefined);
    if (step === 'throw') return Promise.reject(Object.assign(new Error('billing down'), { code: 'E_SERVICE_ERROR' }));
    return Promise.resolve(value());
  }
  init(): Promise<void> { return this.run(this.step(this.initScript, this.initCalls++), () => undefined); }
  end(): Promise<void> { this.endCalls++; return Promise.resolve(); }
  fetchProduct(): Promise<{ productId: string; localizedPrice: string } | null> {
    return this.run(this.step(this.fetchScript, this.fetchCalls++), () => this.product);
  }
  async requestPurchase(): Promise<void> { if (this.requestThrows !== undefined) throw this.requestThrows; }
  async finishPurchase(): Promise<void> { /* noop */ }
  async getPurchasedSkus(): Promise<string[]> { return []; }
  getPurchases(): Promise<IapPurchaseInfo[]> { return Promise.resolve([]); }
  onPurchaseUpdate(): () => void { return () => undefined; }
  onPurchaseError(cb: (e: IapPurchaseError) => void): () => void { this.errorCb = cb; return () => { this.errorCb = null; }; }
}

function setup(gateway: ScriptedGateway) {
  const events: Array<[GrowthEvent, GrowthEventParams]> = [];
  const store = createProStore(memoryStorage(), () => Promise.resolve(gateway), {
    onEvent: (name, params) => events.push([name, params]),
    timings: { loadTimeoutMs: 30, autoRetryDelayMs: 0, sleep: () => Promise.resolve() },
  });
  return { store, events };
}

test('initConnection 挂起 → 超时结束加载，reason=timeout，不再卡在 loading', async () => {
  const gw = new ScriptedGateway();
  gw.initScript = ['hang'];
  const { store } = setup(gw);
  await store.init();
  const snap = store.snapshot();
  assert.equal(snap.initialized, true);
  assert.notEqual(snap.phase, 'loading');
  assert.equal(snap.skuAvailability, 'unknown');
  assert.equal(snap.skuFailureReason, 'timeout');
  // 超时不自动重试，避免长时间 Loading。
  assert.equal(gw.initCalls, 1);
});

test('getProducts 挂起 → 超时；重试会先 endConnection 再重新连接并成功', async () => {
  const gw = new ScriptedGateway();
  gw.fetchScript = ['hang', 'ok'];
  const { store } = setup(gw);
  await store.init();
  assert.equal(store.snapshot().skuFailureReason, 'timeout');
  await store.refresh();
  const snap = store.snapshot();
  assert.equal(gw.endCalls, 1);
  assert.equal(snap.skuAvailability, 'available');
  assert.equal(snap.productPrice, '$9.99');
  assert.equal(snap.skuFailureReason, null);
});

test('连接失败 → 自动重连一次；第二次成功则价格可用', async () => {
  const gw = new ScriptedGateway();
  gw.initScript = ['throw', 'ok'];
  const { store } = setup(gw);
  await store.init();
  const snap = store.snapshot();
  assert.equal(gw.initCalls, 2);
  assert.equal(gw.endCalls, 1);
  assert.equal(snap.skuAvailability, 'available');
  assert.equal(snap.skuFailureReason, null);
});

test('连接持续失败 → reason=connection_failed，并记录低基数错误码', async () => {
  const gw = new ScriptedGateway();
  gw.initScript = ['throw'];
  const { store } = setup(gw);
  await store.init();
  const snap = store.snapshot();
  assert.equal(gw.initCalls, 2);
  assert.equal(snap.skuFailureReason, 'connection_failed');
  assert.equal(snap.skuErrorCode, 'E_SERVICE_ERROR');
});

test('getProducts 抛错 → query_failed；返回空 → product_empty；价格为空 → price_blank', async () => {
  const a = new ScriptedGateway();
  a.fetchScript = ['throw'];
  const sa = setup(a).store;
  await sa.init();
  assert.equal(sa.snapshot().skuFailureReason, 'query_failed');

  const b = new ScriptedGateway();
  b.product = null;
  const sb = setup(b).store;
  await sb.init();
  assert.equal(sb.snapshot().skuAvailability, 'unavailable');
  assert.equal(sb.snapshot().skuFailureReason, 'product_empty');

  const c = new ScriptedGateway();
  c.product = { productId: PRO_SKU, localizedPrice: '  ' };
  const sc = setup(c).store;
  await sc.init();
  assert.equal(sc.snapshot().skuAvailability, 'available');
  assert.equal(sc.snapshot().productPrice, null);
  assert.equal(sc.snapshot().skuFailureReason, 'price_blank');
});

test('无价格时 buy 上报 blocked_no_price；重试成功后清除旧的不可用提示', async () => {
  const gw = new ScriptedGateway();
  gw.fetchScript = ['throw', 'ok'];
  const { store, events } = setup(gw);
  await store.init();
  const result = await store.buy({ source: 'history_export', scene: 'history' });
  assert.equal(result.ok, false);
  const blocked = events.find(([name, p]) => name === 'pro_purchase_result' && p.outcome === 'blocked_no_price');
  assert.ok(blocked);
  assert.equal(blocked[1].failure_reason, 'query_failed');
  assert.equal(blocked[1].source, 'history_export');
  assert.equal(store.snapshot().lastError, SKU_UNAVAILABLE_MESSAGE);

  await store.refresh();
  assert.equal(store.snapshot().productPrice, '$9.99');
  assert.equal(store.snapshot().lastError, null);
});

test('同一次结账的取消：reject 与 errorListener 双发只上报一次', async () => {
  const gw = new ScriptedGateway();
  gw.requestThrows = { code: 'E_USER_CANCELLED' };
  const { store, events } = setup(gw);
  await store.init();
  await store.buy({ source: 'direct', scene: 'calibration' });
  gw.errorCb?.({ code: 'E_USER_CANCELLED', message: 'cancelled' });
  const cancels = events.filter(([name, p]) => name === 'pro_purchase_result' && p.outcome === 'cancelled');
  assert.equal(cancels.length, 1);
  // 下一次结账仍能上报自己的取消。
  await store.buy({ source: 'direct', scene: 'calibration' });
  assert.equal(events.filter(([name, p]) => name === 'pro_purchase_result' && p.outcome === 'cancelled').length, 2);
});

test('restore 时 init 挂起 → 超时返回 failed，不永久挂起', async () => {
  const gw = new ScriptedGateway();
  const { store, events } = setup(gw);
  await store.init();
  gw.initScript = ['hang'];
  const result = await store.restore();
  assert.equal(result.ok, false);
  assert.ok(events.some(([name, p]) => name === 'pro_restore_result' && p.outcome === 'failed'));
});

test('buildPaywallPriceStatusParams：成功不带 failure_reason，失败一定带原因', () => {
  const ok = buildPaywallPriceStatusParams({
    source: 'history_export', scene: 'history', action: 'open', loadMs: 120.4,
    snapshot: { skuAvailability: 'available', productPrice: '$9.99', skuFailureReason: null, skuErrorCode: null },
  });
  assert.equal(ok.price_loaded, true);
  assert.equal(ok.failure_reason, undefined);
  assert.equal(ok.load_ms, 120);
  assert.equal(ok.product_id, PRO_SKU);

  const failed = buildPaywallPriceStatusParams({
    source: 'stub_calibration', scene: 'calibration', action: 'retry', loadMs: -5,
    snapshot: { skuAvailability: 'unknown', productPrice: null, skuFailureReason: 'connection_failed', skuErrorCode: 'E_SERVICE_ERROR' },
  });
  assert.equal(failed.price_loaded, false);
  assert.equal(failed.failure_reason, 'connection_failed');
  assert.equal(failed.error_code, 'E_SERVICE_ERROR');
  assert.equal(failed.load_ms, 0);
  assert.equal(failed.action, 'retry');

  const unexplained = buildPaywallPriceStatusParams({
    source: 'direct', scene: 'history', action: 'open', loadMs: 0,
    snapshot: { skuAvailability: 'unknown', productPrice: null, skuFailureReason: null, skuErrorCode: null },
  });
  assert.equal(unexplained.failure_reason, 'unknown');
});
