import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { HistoryStorage } from './historyStore.ts';
import {
  PRO_ENTITLEMENT_STORAGE_KEY,
  PRO_SKU,
  serializeProEntitlement,
  type IapGateway,
  type IapPurchaseError,
  type IapPurchaseInfo,
} from './iap.ts';
import { createProStore, type ProStore } from './proStore.ts';

function createMemoryStorage(): HistoryStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => Promise.resolve(data.get(key) ?? null),
    setItem: (key: string, value: string) => {
      data.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key: string) => {
      data.delete(key);
      return Promise.resolve();
    },
  };
}

interface FakeGatewayOptions {
  /** undefined = 默认返回可用商品；null = SKU 解析不到（商品未建）。 */
  product?: { productId: string; localizedPrice: string } | null;
  initThrows?: boolean;
  fetchThrows?: boolean;
  purchasedSkus?: string[];
  purchasesThrows?: boolean;
  requestThrows?: unknown;
}

class FakeGateway implements IapGateway {
  private opts: FakeGatewayOptions;
  updateCb: ((p: IapPurchaseInfo) => void) | null = null;
  errorCb: ((e: IapPurchaseError) => void) | null = null;
  finishedPurchases: IapPurchaseInfo[] = [];
  requestedSkus: string[] = [];

  constructor(opts: FakeGatewayOptions = {}) {
    this.opts = opts;
  }

  async init(): Promise<void> {
    if (this.opts.initThrows) {
      throw new Error('network down');
    }
  }

  async fetchProduct(sku: string): Promise<{ productId: string; localizedPrice: string } | null> {
    if (this.opts.fetchThrows) {
      throw new Error('network down');
    }
    if (this.opts.product === null) {
      return null;
    }
    return this.opts.product ?? { productId: sku, localizedPrice: '$4.99' };
  }

  async requestPurchase(sku: string): Promise<void> {
    this.requestedSkus.push(sku);
    if (this.opts.requestThrows !== undefined) {
      throw this.opts.requestThrows;
    }
  }

  async finishPurchase(purchase: IapPurchaseInfo): Promise<void> {
    this.finishedPurchases.push(purchase);
  }

  async getPurchasedSkus(): Promise<string[]> {
    if (this.opts.purchasesThrows) {
      throw new Error('network down');
    }
    return this.opts.purchasedSkus ?? [];
  }

  onPurchaseUpdate(cb: (purchase: IapPurchaseInfo) => void): () => void {
    this.updateCb = cb;
    return () => {
      this.updateCb = null;
    };
  }

  onPurchaseError(cb: (error: IapPurchaseError) => void): () => void {
    this.errorCb = cb;
    return () => {
      this.errorCb = null;
    };
  }

  emitPurchase(purchase: IapPurchaseInfo): void {
    if (this.updateCb) {
      this.updateCb(purchase);
    }
  }

  emitError(error: IapPurchaseError): void {
    if (this.errorCb) {
      this.errorCb(error);
    }
  }
}

function createStore(
  gateway: FakeGateway,
  storage?: HistoryStorage & { data: Map<string, string> },
): { store: ProStore; storage: HistoryStorage & { data: Map<string, string> } } {
  const mem = storage ?? createMemoryStorage();
  return { store: createProStore(mem, () => Promise.resolve(gateway)), storage: mem };
}

const tick = () => new Promise((resolve) => setImmediate(resolve));

test('SKU 不可用（商品未建/已下架）→ 保持 locked，购买入口不可用', async () => {
  const gateway = new FakeGateway({ product: null });
  const { store } = createStore(gateway);
  await store.init();
  assert.equal(store.getAccess(), 'locked');
  const snap = store.snapshot();
  assert.equal(snap.skuAvailability, 'unavailable');
  assert.equal(snap.initialized, true);
  // buy() 直接拒绝，不调 requestPurchase
  const result = await store.buy();
  assert.equal(result.ok, false);
  assert.equal(result.message, 'Purchase temporarily unavailable. Please check your connection and try again.');
  assert.deepEqual(gateway.requestedSkus, []);
  assert.equal(store.getAccess(), 'locked');
});

test('SKU 可用但未购买 → 锁定，价格来自 localizedPrice', async () => {
  const gateway = new FakeGateway({
    product: { productId: PRO_SKU, localizedPrice: 'US$4.99' },
  });
  const { store } = createStore(gateway);
  await store.init();
  assert.equal(store.getAccess(), 'locked');
  assert.equal(store.snapshot().skuAvailability, 'available');
  assert.equal(store.snapshot().productPrice, 'US$4.99');
});

test('商店已有购买记录 → 全解锁并持久化 entitlement', async () => {
  const gateway = new FakeGateway({ purchasedSkus: [PRO_SKU] });
  const { store, storage } = createStore(gateway);
  await store.init();
  assert.equal(store.getAccess(), 'unlocked');
  assert.equal(
    storage.data.get(PRO_ENTITLEMENT_STORAGE_KEY),
    serializeProEntitlement({ purchased: true }),
  );
});

test('离线/连接异常 → fail-closed 保持 locked', async () => {
  const gateway = new FakeGateway({ initThrows: true });
  const { store } = createStore(gateway);
  await store.init();
  assert.equal(store.getAccess(), 'locked');
  assert.equal(store.snapshot().skuAvailability, 'unknown');
  assert.equal(store.snapshot().initialized, true);
});

test('fetchProduct 查询失败 → fail-closed 保持 locked', async () => {
  const gateway = new FakeGateway({ fetchThrows: true });
  const { store } = createStore(gateway);
  await store.init();
  assert.equal(store.getAccess(), 'locked');
  assert.equal(store.snapshot().skuAvailability, 'unknown');
});

test('SKU 未知（离线）时 buy() 直接拒绝，不调 requestPurchase', async () => {
  const gateway = new FakeGateway({ initThrows: true });
  const { store } = createStore(gateway);
  const result = await store.buy();
  assert.equal(result.ok, false);
  assert.equal(result.message, 'Purchase temporarily unavailable. Please check your connection and try again.');
  assert.deepEqual(gateway.requestedSkus, []);
  assert.equal(store.getAccess(), 'locked');
  assert.equal(store.snapshot().lastError, 'Purchase temporarily unavailable. Please check your connection and try again.');
});

test('getPurchasedSkus 返回空列表 → 保持 locked（无购买证据不解锁）', async () => {
  const gateway = new FakeGateway({ purchasedSkus: [] });
  const { store } = createStore(gateway);
  await store.init();
  assert.equal(store.snapshot().skuAvailability, 'available');
  assert.equal(store.getAccess(), 'locked');
});

test('损坏的存储数据 → 安全回退，不崩溃、不误授权', async () => {
  const storage = createMemoryStorage();
  storage.data.set(PRO_ENTITLEMENT_STORAGE_KEY, 'not-json{');
  const gateway = new FakeGateway();
  const { store } = createStore(gateway, storage);
  await store.init();
  // 解析失败回退为未购买；SKU 可用 → 锁定（而非误解锁）
  assert.equal(store.getAccess(), 'locked');
});

test('本地 entitlement=true 且离线 → 保持解锁（沿用上次已知）', async () => {
  const storage = createMemoryStorage();
  storage.data.set(
    PRO_ENTITLEMENT_STORAGE_KEY,
    serializeProEntitlement({ purchased: true }),
  );
  const gateway = new FakeGateway({ initThrows: true });
  const { store } = createStore(gateway, storage);
  await store.init();
  assert.equal(store.getAccess(), 'unlocked');
});

test('restore 找到购买 → entitlement 置 true 并持久化', async () => {
  const { store, storage } = createStore(new FakeGateway({ purchasedSkus: [] }));
  await store.init();
  assert.equal(store.getAccess(), 'locked');
  // 换一张"已购买"的账号再恢复
  store.setGateway(new FakeGateway({ purchasedSkus: [PRO_SKU] }));
  const result = await store.restore();
  assert.deepEqual(result, { ok: true, found: true, message: null });
  assert.equal(store.getAccess(), 'unlocked');
  assert.equal(
    storage.data.get(PRO_ENTITLEMENT_STORAGE_KEY),
    serializeProEntitlement({ purchased: true }),
  );
});

test('restore 无购买记录 → found=false + "No previous purchase found."', async () => {
  const gateway = new FakeGateway({ purchasedSkus: [] });
  const { store } = createStore(gateway);
  await store.init();
  const result = await store.restore();
  assert.equal(result.ok, true);
  assert.equal(result.found, false);
  assert.equal(result.message, 'No previous purchase found.');
  assert.equal(store.getAccess(), 'locked');
});

test('restore 网络异常 → ok=false + 网络文案', async () => {
  const gateway = new FakeGateway({ purchasesThrows: true });
  const { store } = createStore(gateway);
  await store.init();
  const result = await store.restore();
  assert.equal(result.ok, false);
  assert.equal(result.found, false);
  assert.equal(result.message, 'Network unavailable. Your previous purchase status is kept.');
});

test('buy 成功 → 经购买更新监听授权并 finish（非消耗）', async () => {
  const gateway = new FakeGateway();
  const { store, storage } = createStore(gateway);
  await store.init();
  assert.equal(store.getAccess(), 'locked');

  const buyResult = await store.buy();
  assert.deepEqual(buyResult, { ok: true, message: null });
  assert.deepEqual(gateway.requestedSkus, [PRO_SKU]);

  // 商店经由 listener 送达购买成功
  gateway.emitPurchase({ productId: PRO_SKU, purchaseToken: 'tok-1', isPending: false });
  await tick();

  assert.equal(store.getAccess(), 'unlocked');
  assert.equal(gateway.finishedPurchases.length, 1);
  assert.equal(gateway.finishedPurchases[0]?.productId, PRO_SKU);
  assert.equal(
    storage.data.get(PRO_ENTITLEMENT_STORAGE_KEY),
    serializeProEntitlement({ purchased: true }),
  );
});

test('buy 被用户取消 → "Purchase cancelled."', async () => {
  const gateway = new FakeGateway({
    requestThrows: { code: 'E_USER_CANCELLED', message: 'cancelled' },
  });
  const { store } = createStore(gateway);
  await store.init();
  const result = await store.buy();
  assert.equal(result.ok, false);
  assert.equal(result.message, 'Purchase cancelled.');
  assert.equal(store.snapshot().lastError, 'Purchase cancelled.');
  assert.equal(store.getAccess(), 'locked');
});

test('购买错误监听收到取消 → lastError 为取消文案', async () => {
  const gateway = new FakeGateway();
  const { store } = createStore(gateway);
  await store.init();
  gateway.emitError({ code: 'E_USER_CANCELLED', message: 'cancelled' });
  assert.equal(store.snapshot().lastError, 'Purchase cancelled.');
});

test('pending 的购买不解锁；支付完成后解锁', async () => {
  const gateway = new FakeGateway();
  const { store } = createStore(gateway);
  await store.init();
  gateway.emitPurchase({ productId: PRO_SKU, purchaseToken: 'tok-p', isPending: true });
  assert.equal(store.getAccess(), 'locked');
  assert.equal(store.snapshot().pendingPurchase, true);
  assert.equal(gateway.finishedPurchases.length, 0);

  gateway.emitPurchase({ productId: PRO_SKU, purchaseToken: 'tok-p', isPending: false });
  await tick();
  assert.equal(store.getAccess(), 'unlocked');
  assert.equal(store.snapshot().pendingPurchase, false);
});

test('非 PRO SKU 的购买更新被忽略', async () => {
  const gateway = new FakeGateway();
  const { store } = createStore(gateway);
  await store.init();
  gateway.emitPurchase({ productId: 'some_other_sku', isPending: false });
  await tick();
  assert.equal(store.getAccess(), 'locked');
  assert.equal(gateway.finishedPurchases.length, 0);
});

test('setGateway 替换网关后可重新 init', async () => {
  const storage = createMemoryStorage();
  const unavailable = new FakeGateway({ product: null });
  const store = createProStore(storage, () => Promise.resolve(unavailable));
  await store.init();
  // 商品未建 → fail-closed 保持 locked
  assert.equal(store.getAccess(), 'locked');
  assert.equal(store.snapshot().skuAvailability, 'unavailable');

  const available = new FakeGateway();
  store.setGateway(available);
  await store.init();
  assert.equal(store.snapshot().skuAvailability, 'available');
  assert.equal(store.getAccess(), 'locked');
});

test('buy 时网关不可用 → 不可用文案且不抛异常', async () => {
  const storage = createMemoryStorage();
  const store = createProStore(storage, () => Promise.reject(new Error('no module')));
  const result = await store.buy();
  assert.equal(result.ok, false);
  // fail-fast：sku 未知时直接拒绝，不走到 requestPurchase
  assert.equal(result.message, 'Purchase temporarily unavailable. Please check your connection and try again.');
  assert.equal(store.getAccess(), 'locked');
});
